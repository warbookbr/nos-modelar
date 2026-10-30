/* moldura-do-vao.js — a conferência geral da moldura em volta de um vão de uma chapa.
 *
 * Função pura, sem Three.js e sem domínio: diz, para uma borda declarada (a volta de pontos de uma chapa que um vão deixa) e os
 * frisos que a contornam, se a borda inteira está coberta e se as emendas entre os frisos têm o mesmo perfil. O núcleo não sabe
 * de carro nem de janela: a borda é uma polilinha sobre a chapa, e o friso uma faixa que a varredura deixou nela.
 *
 * A MEDIDA. A faixa de um friso é a pegada dele na chapa: em cada seção da varredura, os dois pontos do anel mais para a esquerda e
 * para a direita da linha, levados ao plano da chapa; entre duas seções seguidas a pegada são dois triângulos. Um ponto da borda
 * está coberto quando a distância dele a algum triângulo é de até `tolerancia`. A borda é percorrida de `passoDaAmostra` em
 * `passoDaAmostra`, e o trecho descoberto é a sequência de pontos sem cobertura, com o comprimento, a posição e a distância a que a
 * faixa mais perto passa do meio dele (a moldura que fica a 3 mm da borda não a cobre).
 *
 * A EMENDA. As pontas abertas de dois frisos que se encontram (os centros das pontas a até 2 × `tolerancia`) são uma emenda. Se a
 * linha segue reta (o giro menor que GIRO_DO_CANTO), os dois anéis das pontas precisam ser o mesmo perfil, e a distância de
 * Hausdorff entre eles acima de `tolerancia` é o degrau, com as duas larguras. Se a linha vira, as duas pontas são cortes retos e
 * deixam o quadrante de fora do canto sem material (a meia-esquadria de um friso só, `variacao` do `friso`, não deixa ponta ali):
 * a conferência põe pontos num leque de raio igual à menor extensão de fora das duas pontas e mede a distância de cada um à
 * faixa, e o entalhe é a maior delas quando passa da tolerância. Um terceiro friso que preenche o canto o fecha.
 *
 * O que sai é dado: nada aqui decide a forma, e o motivo declarado de uma aba parcial é assunto de quem chama. */

export const TOLERANCIA_DA_MOLDURA = 5e-4;
export const PASSO_DA_AMOSTRA = 1e-3;
/** Giro da linha, em graus, a partir do qual a emenda de duas pontas é um canto e não uma continuação. */
export const GIRO_DO_CANTO = 10;
const PASSOS_DO_LEQUE = 12;
/** Até onde se procura a faixa mais perto de um ponto descoberto, para dizer a que distância ela passa. */
const ALCANCE_DA_BUSCA = 0.05;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const tam = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const t = tam(a); return t > 0 ? mult(a, 1 / t) : [0, 0, 0]; };
const dist = (a, b) => tam(sub(a, b));

/* Distância de um ponto a um triângulo no espaço (Ericson, Real-Time Collision Detection, 5.1.5). */
function distanciaAoTriangulo(p, a, b, c) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return tam(ap);
  const bp = sub(p, b); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return tam(bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return tam(sub(p, soma(a, mult(ab, d1 / (d1 - d3)))));
  const cp = sub(p, c); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return tam(cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return tam(sub(p, soma(a, mult(ac, d2 / (d2 - d6)))));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return tam(sub(p, soma(b, mult(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))))));
  const n = (1 / (va + vb + vc));
  const proj = soma(a, soma(mult(ab, vb * n), mult(ac, vc * n)));
  return tam(sub(p, proj));
}

/* Os triângulos da pegada de um friso, cada um com a caixa dele; a faixa de uma seção que afinou até um ponto vira triângulo. */
function triangulosDaPegada(friso) {
  const { secoes, fechada } = friso;
  const n = secoes.length; const trechos = fechada ? n : n - 1;
  const lista = [];
  for (let j = 0; j < trechos; j++) {
    const a = secoes[j]; const b = secoes[(j + 1) % n];
    for (const t of [[a.e, a.d, b.d], [a.e, b.d, b.e]]) {
      lista.push({ t, min: [0, 1, 2].map((k) => Math.min(t[0][k], t[1][k], t[2][k])), max: [0, 1, 2].map((k) => Math.max(t[0][k], t[1][k], t[2][k])), friso: friso.nome });
    }
  }
  return lista;
}

/** Cobertura: uma função (ponto) -> { distancia, friso } com a menor distância à pegada de todos os frisos. */
function cobertura(frisos) {
  const triangulos = frisos.flatMap(triangulosDaPegada);
  return (p, ate = Infinity) => {
    let melhor = Infinity; let quem = null;
    for (const tr of triangulos) {
      /* a caixa do triângulo, afastada da melhor distância até aqui, descarta o que não pode melhorar */
      const limite = Math.min(melhor, ate);
      if (p[0] < tr.min[0] - limite || p[0] > tr.max[0] + limite || p[1] < tr.min[1] - limite || p[1] > tr.max[1] + limite || p[2] < tr.min[2] - limite || p[2] > tr.max[2] + limite) continue;
      const d = distanciaAoTriangulo(p, tr.t[0], tr.t[1], tr.t[2]);
      if (d < melhor) { melhor = d; quem = tr.friso; }
    }
    return { distancia: melhor, friso: quem };
  };
}

/** Distância de Hausdorff entre duas listas de pontos. */
function hausdorff(P, Q) {
  const metade = (A, B) => Math.max(...A.map((a) => Math.min(...B.map((b) => dist(a, b)))));
  return Math.max(metade(P, Q), metade(Q, P));
}

/**
 * conferirMoldura({ borda, fechada, frisos, tolerancia, passoDaAmostra })
 *   borda: [{ nome, p: [x, y, z] }, ...] os pontos da borda na chapa, em sequência, cada um com o nome do ponto declarado a que pertence
 *     (os pontos entre dois nomes herdam o do anterior, e `nome` nulo é um ponto de dentro de um arco); fechada: a borda volta ao
 *     primeiro ponto (que não se repete no fim).
 *   frisos: os registros dos frisos que contornam a borda (`neutro.frisos`): { nome, fechada, secoes: [{ p, e, d }], extremos: [anelDoInicio, anelDoFim] | null }.
 *   -> { comprimento, amostras, cobertas, descobertos: [{ de, ate, comprimento, entre: [nome, nome], posicao, distanciaDaFaixa }],
 *        emendas: [{ frisos: [a, b], posicao, giro, tipo: 'reta' | 'canto', larguras, degrau, entalhe, ok }], tolerancia }
 *   Distâncias em metro (a mesma unidade da malha); `de` e `ate` são posições ao longo da borda, em comprimento de arco.
 */
export function conferirMoldura({ borda, fechada = false, frisos, tolerancia = TOLERANCIA_DA_MOLDURA, passoDaAmostra = PASSO_DA_AMOSTRA }) {
  if (!Array.isArray(borda) || borda.length < 2) throw new TypeError('moldura: a borda precisa de dois pontos ou mais');
  if (!Array.isArray(frisos) || !frisos.length) throw new TypeError('moldura: é preciso ao menos um friso');
  const mede = cobertura(frisos);
  /* a borda amostrada, com a posição em arco e o nome do trecho */
  const pontos = fechada ? [...borda, borda[0]] : borda;
  const amostras = [];
  let arco = 0;
  for (let k = 0; k + 1 < pontos.length; k++) {
    const a = pontos[k].p; const b = pontos[k + 1].p; const L = dist(a, b);
    const partes = Math.max(1, Math.ceil(L / passoDaAmostra));
    for (let j = 0; j < partes; j++) amostras.push({ p: soma(a, mult(sub(b, a), j / partes)), arco: arco + (L * j) / partes, de: k });
    arco += L;
  }
  if (!fechada) amostras.push({ p: [...pontos[pontos.length - 1].p], arco, de: pontos.length - 2 });
  const comprimento = arco;
  const nomeAntes = (k) => { for (let i = k; i >= 0; i--) if (pontos[i].nome != null) return pontos[i].nome; return null; };
  const nomeDepois = (k) => { for (let i = k; i < pontos.length; i++) if (pontos[i].nome != null) return pontos[i].nome; return null; };

  const descobertos = []; let atual = null; let cobertas = 0;
  amostras.forEach((m, idx) => {
    if (mede(m.p, tolerancia).distancia <= tolerancia) {
      cobertas++;
      if (atual) { descobertos.push(atual); atual = null; }
      return;
    }
    const { distancia } = mede(m.p, ALCANCE_DA_BUSCA);
    if (!atual) atual = { de: m.arco, ate: m.arco, primeira: m, ultima: m, meio: [] };
    atual.ate = m.arco; atual.ultima = m; atual.meio.push({ ...m, distancia });
    if (idx === amostras.length - 1) { descobertos.push(atual); atual = null; }
  });
  /* o trecho que passa pelo começo da volta fechada é um só */
  if (fechada && descobertos.length > 1 && descobertos[0].de === 0 && descobertos[descobertos.length - 1].ate >= comprimento - passoDaAmostra * 1.5) {
    const ultimo = descobertos.pop(); const primeiro = descobertos[0];
    primeiro.de = ultimo.de - comprimento; primeiro.primeira = ultimo.primeira; primeiro.meio = [...ultimo.meio, ...primeiro.meio];
  }
  const trechos = descobertos.map((d) => {
    const meio = d.meio[Math.floor(d.meio.length / 2)];
    return {
      de: d.de, ate: d.ate, comprimento: Math.min(comprimento, d.ate - d.de + passoDaAmostra),
      entre: [nomeAntes(d.primeira.de), nomeDepois(d.ultima.de + 1)],
      posicao: meio.p, distanciaDaFaixa: meio.distancia,
    };
  });

  /* as emendas: as pontas abertas que se encontram */
  const pontas = [];
  for (const f of frisos) {
    if (f.fechada || !f.extremos) continue;
    const n = f.secoes.length;
    for (const lado of [0, 1]) {
      const anel = f.extremos[lado];
      if (!anel || anel.length < 2) continue;
      const aqui = f.secoes[lado === 0 ? 0 : n - 1].p; const dentro = f.secoes[lado === 0 ? 1 : n - 2].p;
      pontas.push({ friso: f.nome, lado, p: aqui, sentido: unit(sub(dentro, aqui)), anel, largura: dist(f.secoes[lado === 0 ? 0 : n - 1].e, f.secoes[lado === 0 ? 0 : n - 1].d) });
    }
  }
  const emendas = [];
  for (let i = 0; i < pontas.length; i++) for (let j = i + 1; j < pontas.length; j++) {
    const A = pontas[i]; const B = pontas[j];
    if (dist(A.p, B.p) > 2 * tolerancia) continue;
    const cosGiro = Math.max(-1, Math.min(1, -dot(A.sentido, B.sentido)));
    const giro = (Math.acos(cosGiro) * 180) / Math.PI;
    const larguras = [A.largura, B.largura];
    const registro = { frisos: [A.friso, B.friso], posicao: A.p, giro, larguras, degrau: null, entalhe: null };
    if (giro < GIRO_DO_CANTO) {
      const h = hausdorff(A.anel, B.anel);
      registro.tipo = 'reta'; registro.degrau = h; registro.ok = h <= tolerancia;
    } else {
      /* o leque do quadrante de fora do canto: raio igual à menor extensão de fora das duas pontas */
      const nA = unit(sub(B.sentido, mult(A.sentido, dot(A.sentido, B.sentido)))); // de A para o lado de B (dentro do canto)
      const nB = unit(sub(A.sentido, mult(B.sentido, dot(A.sentido, B.sentido))));
      const fora = (anel, n) => Math.max(0, ...anel.map((q) => -dot(sub(q, A.p), n)));
      const raio = Math.min(fora(A.anel, nA), fora(B.anel, nB));
      let pior = 0;
      if (raio > 2 * tolerancia) {
        const u1 = mult(nA, -1); const u2 = mult(nB, -1); // as normais de fora de A e de B
        const teta = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2))));
        for (let k = 1; k < PASSOS_DO_LEQUE; k++) {
          const f = k / PASSOS_DO_LEQUE;
          const dir = teta < 1e-9 ? u1 : mult(soma(mult(u1, Math.sin((1 - f) * teta)), mult(u2, Math.sin(f * teta))), 1 / Math.sin(teta));
          pior = Math.max(pior, mede(soma(A.p, mult(dir, raio)), tolerancia * 4 + raio).distancia);
        }
      }
      registro.tipo = 'canto'; registro.entalhe = pior; registro.raioDeFora = raio; registro.ok = pior <= tolerancia;
    }
    emendas.push(registro);
  }
  return { comprimento, amostras: amostras.length, cobertas, descobertos: trechos, emendas, tolerancia };
}
