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
 * A EMENDA. As pontas abertas de dois frisos que se encontram (os centros das pontas a até 2 × `tolerancia`) são uma emenda. O giro
 * é o da linha no plano da chapa: as direções das duas pontas sem a componente da normal, que é a curvatura da própria chapa e não
 * abre nada na pegada. Se a linha segue quase reta (o giro menor que GIRO_DO_CANTO), os dois anéis precisam ser o mesmo perfil, e o
 * degrau é a distância de Hausdorff entre eles, cada um escrito no seu próprio plano de corte (u pela largura, v pela normal), com as
 * duas larguras: comparar os anéis no espaço somaria ao degrau o giro de um corte em relação ao outro, que numa linha curva dá
 * meia largura × giro com dois perfis iguais. Em toda emenda as duas pontas são cortes retos, cada um perpendicular à sua linha, e
 * deixam sem material a cunha de fora da curva (a meia-esquadria de um friso só, `variacao` do `friso`, não deixa ponta ali): a
 * conferência põe pontos num leque de raio igual à menor extensão de fora das duas pontas e mede a distância de cada um à faixa, e o
 * entalhe é a maior delas quando passa da tolerância. Na emenda reta a cunha é estreita e o entalhe, pequeno; no canto, o quadrante
 * de fora inteiro. Um terceiro friso que preenche o canto o fecha.
 *
 * A ABERTURA. `aberturasDaGaiola` acha, pela geometria da gaiola de uma chapa e sem saber de que objeto ela é, as voltas de borda
 * livre que são abertura: a volta é percorrida no sentido em que as faces a percorrem (a chapa à esquerda de quem anda, vista de
 * fora), e a normal de Newell dela aponta para o mesmo lado da chapa em volta no contorno de fora e para o lado contrário no furo,
 * porque o furo anda ao contrário. A normal da chapa em volta é a soma dos vetores de área das faces a até dois anéis da volta. O
 * cosseno entre as duas vai de +1 (contorno) a −1 (furo); na ponta de um tubo as faces em volta olham para todos os lados e a soma
 * delas se anula, e a coerência (o tamanho da soma sobre a soma das áreas) diz isso. A volta fechada com o cosseno abaixo de
 * COSSENO_DA_ABERTURA e a coerência acima de COERENCIA_MINIMA é abertura.
 *
 * O que sai é dado: nada aqui decide a forma, e o motivo declarado de uma aba parcial é assunto de quem chama. */

export const TOLERANCIA_DA_MOLDURA = 5e-4;
export const PASSO_DA_AMOSTRA = 1e-3;
/** Giro da linha, em graus, a partir do qual a emenda de duas pontas é um canto e não uma continuação. */
export const GIRO_DO_CANTO = 10;
const PASSOS_DO_LEQUE = 12;
/** Até onde se procura a faixa mais perto de um ponto descoberto, para dizer a que distância ela passa. */
const ALCANCE_DA_BUSCA = 0.05;
/** Cosseno entre a normal da volta de borda livre e a da chapa em volta dela abaixo do qual a volta é uma abertura (furo) e não o
 *  contorno de fora: −0,5 é a volta cuja normal fica a mais de 120 graus da normal da chapa em volta. */
export const COSSENO_DA_ABERTURA = -0.5;
/** Fração mínima entre a soma das áreas das faces em volta da volta, como vetores, e a soma delas como números, para a normal da chapa
 *  ali valer: na ponta de um tubo as faces em volta olham para todos os lados, a soma das normais se anula e a volta não é abertura. */
export const COERENCIA_MINIMA = 0.2;
/** Anéis de faces em volta da volta de borda livre que entram na normal da chapa ali. */
export const ANEIS_DA_VIZINHANCA = 2;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const tam = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const t = tam(a); return t > 0 ? mult(a, 1 / t) : [0, 0, 0]; };
const dist = (a, b) => tam(sub(a, b));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

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
      /* o meio de um trecho longo fica além do alcance da busca: aí a distância se mede sem limite, só para esse ponto */
      posicao: meio.p, distanciaDaFaixa: Number.isFinite(meio.distancia) ? meio.distancia : mede(meio.p).distancia,
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
      const secao = f.secoes[lado === 0 ? 0 : n - 1];
      const aqui = secao.p; const dentro = f.secoes[lado === 0 ? 1 : n - 2].p;
      /* o eixo u do corte: a pegada da ponta, da direita para a esquerda, que já está no plano da chapa */
      pontas.push({ friso: f.nome, lado, p: aqui, sentido: unit(sub(dentro, aqui)), u: unit(sub(secao.e, secao.d)), anel, largura: dist(secao.e, secao.d) });
    }
  }
  const emendas = [];
  for (let i = 0; i < pontas.length; i++) for (let j = i + 1; j < pontas.length; j++) {
    const A = pontas[i]; const B = pontas[j];
    if (dist(A.p, B.p) > 2 * tolerancia) continue;
    /* a normal da chapa em cada corte (u × sentido, no mesmo sentido nas duas pontas) e a média delas na emenda; as direções das
       pontas sem a normal da emenda são o giro no plano da chapa */
    const normalA = unit(cross(A.u, A.sentido));
    const normalB = (() => { const n = unit(cross(B.u, B.sentido)); return dot(n, normalA) < 0 ? mult(n, -1) : n; })();
    const normal = unit(soma(normalA, normalB));
    const noPlano = (v) => (tam(normal) > 0 ? unit(sub(v, mult(normal, dot(v, normal)))) : v);
    const tA = noPlano(A.sentido); const tB = noPlano(B.sentido);
    const cosGiro = Math.max(-1, Math.min(1, -dot(tA, tB)));
    const giro = (Math.acos(cosGiro) * 180) / Math.PI;
    const larguras = [A.largura, B.largura];
    const registro = { frisos: [A.friso, B.friso], posicao: A.p, giro, larguras, degrau: null, entalhe: null };
    /* o leque da cunha de fora: raio igual à menor extensão de fora das duas pontas, entre as normais de fora dos dois cortes */
    const nA = unit(sub(tB, mult(tA, dot(tA, tB)))); // de A para o lado de B (dentro da curva)
    const nB = unit(sub(tA, mult(tB, dot(tA, tB))));
    const fora = (P, anel, n) => Math.max(0, ...anel.map((q) => -dot(sub(q, P.p), n)));
    const raio = Math.min(fora(A, A.anel, nA), fora(B, B.anel, nB));
    let entalhe = 0;
    if (raio > 2 * tolerancia) {
      const u1 = mult(nA, -1); const u2 = mult(nB, -1); // as normais de fora de A e de B
      const teta = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2))));
      for (let k = 1; k < PASSOS_DO_LEQUE; k++) {
        const f = k / PASSOS_DO_LEQUE;
        const dir = teta < 1e-9 ? u1 : mult(soma(mult(u1, Math.sin((1 - f) * teta)), mult(u2, Math.sin(f * teta))), 1 / Math.sin(teta));
        entalhe = Math.max(entalhe, mede(soma(A.p, mult(dir, raio)), tolerancia * 4 + raio).distancia);
      }
    }
    registro.entalhe = entalhe; registro.raioDeFora = raio;
    if (giro < GIRO_DO_CANTO) {
      /* cada anel no seu plano de corte: u pela pegada da ponta (o de B no mesmo sentido do de A) e v pela normal da chapa ali */
      const sinal = dot(A.u, B.u) < 0 ? -1 : 1;
      const noCorte = (P, s, n) => P.anel.map((q) => { const d = sub(q, P.p); return [s * dot(d, P.u), dot(d, n), 0]; });
      const h = hausdorff(noCorte(A, 1, normalA), noCorte(B, sinal, normalB));
      registro.tipo = 'reta'; registro.degrau = h; registro.ok = h <= tolerancia && entalhe <= tolerancia;
    } else {
      registro.tipo = 'canto'; registro.ok = entalhe <= tolerancia;
    }
    emendas.push(registro);
  }
  return { comprimento, amostras: amostras.length, cobertas, descobertos: trechos, emendas, tolerancia };
}

/** A chave de uma aresta sem sentido, pelos dois índices. */
export const chaveDaAresta = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/* Normal de Newell de uma lista de posições, com o comprimento igual ao dobro da área. */
function newell(pontos) {
  const n = [0, 0, 0];
  for (let k = 0; k < pontos.length; k++) {
    const a = pontos[k]; const b = pontos[(k + 1) % pontos.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

/**
 * bordasLivresDaGaiola({ faces }) -> [{ fechada, arestas: [{ a, b, face }] }]: as voltas de arestas que só uma face tem, cada uma no
 * sentido em que a face a percorre, na ordem das faces. A volta que não fecha (malha com orientação trocada ou borda em leque) sai com
 * `fechada: false`.
 */
export function bordasLivresDaGaiola({ faces }) {
  const usos = new Map();
  for (const f of faces) for (let k = 0; k < f.length; k++) { const c = chaveDaAresta(f[k], f[(k + 1) % f.length]); usos.set(c, (usos.get(c) ?? 0) + 1); }
  const saindo = new Map(); const ordem = [];
  faces.forEach((f, face) => {
    for (let k = 0; k < f.length; k++) {
      const a = f[k]; const b = f[(k + 1) % f.length];
      if (usos.get(chaveDaAresta(a, b)) !== 1) continue;
      const e = { a, b, face };
      if (!saindo.has(a)) saindo.set(a, []);
      saindo.get(a).push(e); ordem.push(e);
    }
  });
  const usadas = new Set(); const voltas = [];
  for (const inicio of ordem) {
    if (usadas.has(inicio)) continue;
    const arestas = []; let atual = inicio;
    for (;;) {
      usadas.add(atual); arestas.push(atual);
      if (atual.b === inicio.a) break;
      const proxima = (saindo.get(atual.b) ?? []).find((e) => !usadas.has(e));
      if (!proxima) break;
      atual = proxima;
    }
    voltas.push({ fechada: arestas[arestas.length - 1].b === inicio.a, arestas });
  }
  return voltas;
}

/**
 * aberturasDaGaiola({ vertices, faces }, { aneis }) -> [{ indices, arestas: [chave], fechada, cosseno, coerencia, comprimento, centro,
 * abertura }]: cada volta de borda livre da gaiola, com o cosseno entre a normal de Newell dela (no sentido das faces) e a normal da chapa
 * em volta dela, e `abertura` quando a volta fecha, o cosseno fica abaixo de COSSENO_DA_ABERTURA e a coerência passa de COERENCIA_MINIMA.
 * A normal da chapa em volta é a soma dos vetores de área das faces que tocam a volta e das vizinhas delas, `aneis` anéis de faces
 * (ANEIS_DA_VIZINHANCA): um relevo que sobe e desce em volta do furo, como a moldura em anel da gaiola, se cancela na soma, e só a
 * inclinação de conjunto da chapa conta. A coerência é o tamanho dessa soma sobre a soma das áreas: perto de 1 na chapa que olha para um
 * lado só em volta da volta, e perto de 0 na ponta de um tubo. `indices` são os pontos da volta em sequência, sem repetir o primeiro;
 * `arestas` as chaves (`chaveDaAresta`) dela.
 */
export function aberturasDaGaiola({ vertices, faces }, { aneis = ANEIS_DA_VIZINHANCA } = {}) {
  const facesDoPonto = new Map();
  faces.forEach((f, fi) => { for (const k of f) { if (!facesDoPonto.has(k)) facesDoPonto.set(k, []); facesDoPonto.get(k).push(fi); } });
  const areaDaFace = new Map();
  const vetorDeArea = (fi) => { if (!areaDaFace.has(fi)) areaDaFace.set(fi, mult(newell(faces[fi].map((k) => vertices[k])), 0.5)); return areaDaFace.get(fi); };
  return bordasLivresDaGaiola({ faces }).map(({ fechada, arestas }) => {
    const indices = arestas.map((e) => e.a);
    const pontos = indices.map((k) => vertices[k]);
    const N = unit(newell(pontos));
    /* as faces em volta: as que tocam os pontos da volta e, a cada anel, as que tocam os pontos delas */
    const vistas = new Set(); let frente = new Set(indices);
    for (let anel = 0; anel < aneis; anel++) {
      const novos = new Set();
      for (const k of frente) for (const fi of facesDoPonto.get(k) ?? []) {
        if (vistas.has(fi)) continue;
        vistas.add(fi);
        for (const q of faces[fi]) if (!frente.has(q)) novos.add(q);
      }
      frente = novos;
    }
    let vetor = [0, 0, 0]; let area = 0;
    for (const fi of [...vistas].sort((a, b) => a - b)) { const A = vetorDeArea(fi); vetor = soma(vetor, A); area += tam(A); }
    let comprimento = 0;
    for (const e of arestas) comprimento += dist(vertices[e.a], vertices[e.b]);
    const coerencia = area > 0 ? tam(vetor) / area : 0;
    const cosseno = tam(N) > 0 && tam(vetor) > 0 ? dot(N, unit(vetor)) : 0;
    const centro = mult(pontos.reduce(soma, [0, 0, 0]), 1 / pontos.length);
    return { indices, arestas: arestas.map((e) => chaveDaAresta(e.a, e.b)), fechada, cosseno, coerencia, comprimento, centro, abertura: fechada && cosseno < COSSENO_DA_ABERTURA && coerencia >= COERENCIA_MINIMA };
  });
}
