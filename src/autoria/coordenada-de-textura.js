/* coordenada-de-textura.js — a coordenada de textura (uv) de um relevo, calculada da malha neutra. Função pura, sem Three.js,
 * sem disco, relógio nem acaso: a mesma malha e o mesmo relevo dão sempre os mesmos números.
 *
 * POR QUE ELA EXISTE. O adaptador da bancada não gerava coordenada de textura, e sem ela um mapa de relevo não tem onde se apoiar.
 * A coordenada nasce da posição (e da normal do triângulo), nunca de ilha ou atlas, para sair igual na bancada e no arquivo glTF:
 * o exportador grava este mesmo resultado como `TEXCOORD_0`.
 *
 * ENTRADA. `posicoes`: lista plana x, y, z de triângulos NÃO indexados (9 números por triângulo), em metro. `relevo`: o relevo já
 * normalizado (`projecao` e `eixo`). `metrosPorTile`: o lado do tile do mapa, em metro (`metrosPorTileDoRelevo`). A coordenada sai
 * em unidades de tile (1 = um tile inteiro), duas por vértice.
 *
 * AS PROJEÇÕES. Em todas, o eixo `a` tem o par cíclico (p, q): x -> (y, z), y -> (z, x), z -> (x, y). Visto de fora, com a normal
 * para o observador, o texto lê da esquerda para a direita (u = p) e de baixo para cima (q), e do lado de trás da placa o u
 * troca de sinal, para a letra não sair espelhada. A coordenada segue a convenção do glTF: v = 0 é a primeira linha da imagem, o
 * alto dela, então v CRESCE para baixo e o v de "para cima" entra com sinal trocado (v = -q).
 *  - `plana`: o plano normal a `eixo`. u e v são as duas coordenadas do par cíclico, em metros.
 *  - `caixa`: como a plana, mas o eixo é o dominante da normal de CADA triângulo (empate: x, depois y, depois z). Serve à lente
 *    na quina, que vira duas faces planas sem esticar.
 *  - `cilindrica`: em volta da linha de direção `eixo` que passa pelo centro da caixa da parte; u acompanha o ângulo e v corre ao
 *    longo do eixo (v = -posição, em metros). Para a volta fechar sem emenda o tile precisa caber um número inteiro de vezes na circunferência:
 *    a circunferência de referência (a do maior raio da parte) é dividida em `round(2πR / metrosPorTile)` tiles, no mínimo 1, e
 *    por isso a escala em torno é a de metro com erro de no máximo meio tile na volta. O triângulo que cruza a emenda do ângulo
 *    é desenrolado, para a coordenada correr contínua dentro dele. As faces de topo e fundo do cilindro (normal quase paralela
 *    ao eixo, |n·eixo| > 0,8) não têm "ao longo do eixo": ali o v é o raio (para fora é para cima) e o u segue o mesmo ângulo,
 *    de modo que a linha de texto corre em arco pelo flanco, como a medida na lateral de um pneu. Aí a escala em torno é a do
 *    raio de referência, então a letra fica mais estreita para dentro e mais larga para fora na proporção dos raios. */

const PAR_CICLICO = { x: [1, 2], y: [2, 0], z: [0, 1] };
const INDICE = { x: 0, y: 1, z: 2 };
const LIMITE_AXIAL = 0.8;

function normalDoTriangulo(P, o) {
  const ux = P[o + 3] - P[o]; const uy = P[o + 4] - P[o + 1]; const uz = P[o + 5] - P[o + 2];
  const vx = P[o + 6] - P[o]; const vy = P[o + 7] - P[o + 1]; const vz = P[o + 8] - P[o + 2];
  const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
  const t = Math.hypot(nx, ny, nz) || 1;
  return [nx / t, ny / t, nz / t];
}

/** O centro e o maior raio, em torno do eixo, da caixa de uma lista de posições (o padrão de `centro` e `raio` da cilíndrica). */
export function caixaDaParte(posicoes, eixo = 'y') {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < posicoes.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      if (posicoes[i + k] < min[k]) min[k] = posicoes[i + k];
      if (posicoes[i + k] > max[k]) max[k] = posicoes[i + k];
    }
  }
  const centro = min.map((v, k) => (v + max[k]) / 2);
  const [p, q] = PAR_CICLICO[eixo];
  let raio = 0;
  for (let i = 0; i < posicoes.length; i += 3) raio = Math.max(raio, Math.hypot(posicoes[i + p] - centro[p], posicoes[i + q] - centro[q]));
  return { centro, raio };
}

function planar(P, o, eixo, sinal, metrosPorTile, saida, s) {
  const [p, q] = PAR_CICLICO[eixo];
  for (let k = 0; k < 3; k += 1) {
    saida[s + 2 * k] = (sinal * P[o + 3 * k + p]) / metrosPorTile;
    saida[s + 2 * k + 1] = -P[o + 3 * k + q] / metrosPorTile;
  }
}

/* Os triângulos de tampa (normal quase paralela ao eixo) e os de lateral, e o que a faixa que leva o relevo mede. */
function mediasDaFaixa(posicoes, relevo, base) {
  const eixo = relevo.eixo ?? 'y';
  const [p, q] = PAR_CICLICO[eixo];
  const a = INDICE[eixo];
  let amin = Infinity; let amax = -Infinity; let rmin = Infinity; let rmax = -Infinity;
  for (let o = 0; o < posicoes.length; o += 9) {
    const axial = Math.abs(normalDoTriangulo(posicoes, o)[a]) > LIMITE_AXIAL;
    for (let k = 0; k < 3; k += 1) {
      if (!axial) {
        amin = Math.min(amin, posicoes[o + 3 * k + a]);
        amax = Math.max(amax, posicoes[o + 3 * k + a]);
      } else {
        const r = Math.hypot(posicoes[o + 3 * k + p] - base.centro[p], posicoes[o + 3 * k + q] - base.centro[q]);
        rmin = Math.min(rmin, r);
        rmax = Math.max(rmax, r);
      }
    }
  }
  return { amin, amax, rmin, rmax };
}

/**
 * As medidas da faixa que leva o relevo, para o mapa nascer do tamanho dela. Só a projeção cilíndrica as tem, e só para dois tipos:
 *  - `bandaDeRodagem`: a largura é a extensão da faixa ao longo do eixo (os triângulos de lateral), e o desenho cobre essa
 *    largura UMA vez, de v = 0 a v = 1, com o meio em v = 0,5; em volta o tile, quadrado, de lado igual à largura, repete um número
 *    inteiro de vezes na circunferência de referência;
 *  - `letras`: a largura é a extensão radial das tampas do cilindro (o flanco), a linha de texto fica no meio dela, e o tile
 *    cobre meia volta (o texto aparece duas vezes na volta, em lados opostos), com comprimento de meia circunferência no raio
 *    médio.
 * Devolve `{ larguraM, comprimentoM, voltas }` ou `null` quando a projeção não é cilíndrica, o tipo não é um desses dois ou a malha não
 * tem a faixa (sem tampa, ou sem lateral).
 */
export function medidasDaProjecao(posicoes, relevo, parte = {}) {
  if (relevo.projecao !== 'cilindrica' || (relevo.tipo !== 'bandaDeRodagem' && relevo.tipo !== 'letras')) return null;
  const eixo = relevo.eixo ?? 'y';
  const base = { ...caixaDaParte(posicoes, eixo), ...parte };
  const f = mediasDaFaixa(posicoes, relevo, base);
  if (relevo.tipo === 'bandaDeRodagem') {
    const larguraM = f.amax - f.amin;
    if (!(larguraM > 0)) return null;
    return {
      larguraM, comprimentoM: larguraM, voltas: Math.max(1, Math.round((2 * Math.PI * base.raio) / larguraM)), inicio: f.amin, tipo: 'banda',
    };
  }
  const larguraM = f.rmax - f.rmin;
  if (!(larguraM > 0)) return null;
  return { larguraM, comprimentoM: (Math.PI * (f.rmax + f.rmin)) / 2, voltas: 2, inicio: f.rmax, tipo: 'letras' };
}

/**
 * @param {ArrayLike<number>} posicoes triângulos não indexados, x y z em metro
 * @param {{projecao: string, eixo: string, tipo?: string}} relevo o relevo normalizado
 * @param {number} metrosPorTile o lado do tile do mapa, em metro (vale onde `medidasDaProjecao` não se aplica)
 * @param {{centro?: number[], raio?: number}} [parte] o centro da caixa e o maior raio da PARTE inteira (a cilíndrica usa a mesma
 *   referência em todas as malhas da parte); sem ele valem os da própria lista
 * @returns {Float32Array} u, v por vértice, em tiles
 */
export function coordenadasDeTextura(posicoes, relevo, metrosPorTile, parte = {}) {
  if (!(metrosPorTile > 0)) throw new Error('coordenadasDeTextura: metrosPorTile precisa ser maior que zero.');
  if (posicoes.length % 9 !== 0) throw new Error('coordenadasDeTextura: as posições precisam ser triângulos de 9 números.');
  const { projecao, eixo = 'y' } = relevo;
  if (!['plana', 'cilindrica', 'caixa'].includes(projecao)) throw new Error(`coordenadasDeTextura: projecao '${projecao}' desconhecida.`);
  if (!Object.hasOwn(PAR_CICLICO, eixo)) throw new Error(`coordenadasDeTextura: eixo '${eixo}' desconhecido.`);
  const saida = new Float32Array((posicoes.length / 3) * 2);
  const base = projecao === 'cilindrica' ? { ...caixaDaParte(posicoes, eixo), ...parte } : null;
  const voltas = base ? Math.max(1, Math.round((2 * Math.PI * base.raio) / metrosPorTile)) : 0;
  const faixa = projecao === 'cilindrica' ? medidasDaProjecao(posicoes, relevo, parte) : null;
  for (let o = 0, s = 0; o < posicoes.length; o += 9, s += 6) {
    const n = normalDoTriangulo(posicoes, o);
    if (projecao === 'plana') {
      planar(posicoes, o, eixo, n[INDICE[eixo]] < 0 ? -1 : 1, metrosPorTile, saida, s);
    } else if (projecao === 'caixa') {
      let a = 0;
      for (let k = 1; k < 3; k += 1) if (Math.abs(n[k]) > Math.abs(n[a])) a = k;
      planar(posicoes, o, 'xyz'[a], n[a] < 0 ? -1 : 1, metrosPorTile, saida, s);
    } else {
      const [p, q] = PAR_CICLICO[eixo];
      const a = INDICE[eixo];
      const axial = Math.abs(n[a]) > LIMITE_AXIAL;
      const sinal = n[a] < 0 ? -1 : 1;
      /* a volta em fração de tile-volta: u = -ângulo visto de fora na lateral; na tampa de cima (normal +eixo) o ângulo entra com o sinal trocado, e o fundo inverte de novo */
      const t = [0, 0, 0];
      const raio = [0, 0, 0];
      for (let k = 0; k < 3; k += 1) {
        const dp = posicoes[o + 3 * k + p] - base.centro[p];
        const dq = posicoes[o + 3 * k + q] - base.centro[q];
        t[k] = ((axial ? sinal : -1) * Math.atan2(dp, dq)) / (2 * Math.PI);
        raio[k] = Math.hypot(dp, dq);
      }
      /* desenrola o triângulo que cruza a emenda do ângulo */
      const maior = Math.max(...t);
      const menor = Math.min(...t);
      if (maior - menor > 0.5) for (let k = 0; k < 3; k += 1) if (maior - t[k] > 0.5) t[k] += 1;
      const naFaixa = faixa !== null && ((faixa.tipo === 'banda' && !axial) || (faixa.tipo === 'letras' && axial));
      for (let k = 0; k < 3; k += 1) {
        if (naFaixa) {
          saida[s + 2 * k] = t[k] * faixa.voltas;
          /* banda: v de 0 a 1 de um ombro ao outro, o meio em 0,5; letras: o raio de fora é o alto do texto */
          saida[s + 2 * k + 1] = faixa.tipo === 'banda' ? (posicoes[o + 3 * k + a] - faixa.inicio) / faixa.larguraM : (faixa.inicio - raio[k]) / faixa.larguraM;
        } else {
          saida[s + 2 * k] = t[k] * voltas;
          saida[s + 2 * k + 1] = -(axial ? raio[k] : posicoes[o + 3 * k + a]) / metrosPorTile;
        }
      }
    }
  }
  return saida;
}
