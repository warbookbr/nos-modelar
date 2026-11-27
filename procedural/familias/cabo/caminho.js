/* caminho.js — do cabo como haste de nós à linha de estações do tubo, em milímetro.

   O caminho é a haste que `curva.js` resolveu, passada a uma curva lisa: um trecho reto curto em cada ponta (o cilindro da porta) e, entre eles,
   a spline cúbica de classe C² pelos nós da haste, engastada na direção de cada ponta. As estações do
   tubo são pontos dessa curva escolhidos pelo desvio máximo da corda: onde a curva é reta as estações são esparsas, onde ela dobra
   são densas, e nenhum trecho passa de 98% do que o `friso` aceita sem dividir. O número de estações vem de uma escada fixa
   (`ESCADA_DE_ESTACOES`), porque a composição tem um número fixo de pontos; o menor degrau que cumpre o desvio é o que vale.

   O quadro do tubo é o transporte paralelo da normal ao longo da curva, que não gira em torno da tangente.

   Lição do plano dos cabos: o raio mínimo se mede e se recusa na curva que vira malha, e não na haste que a gera; uma interpolação
   entre nós (a Hermite antiga) dobrou até um terço do raio da haste nas pontas sem que nenhuma medida da haste acusasse. */
import { TRECHO_MAXIMO_EM_ARESTAS } from '../../nucleo/friso.js';

const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mult = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unitario = (a) => mult(a, 1 / norma(a));

/** Os números de estações que as composições aceitam (uma composição por degrau). */
export const ESCADA_DE_ESTACOES = Object.freeze([6, 8, 10, 13, 17, 22, 29, 38, 50, 66, 87, 115, 152, 200, 265, 350, 460]);
const SUBPASSOS = 32;
const SUBPASSOS_DA_CURVATURA = 24;

/* A curva lisa pelos nós: a spline cúbica de classe C² de cada perna, parametrizada pelo índice do nó (os trechos da perna são iguais) e engastada nas duas pontas dela, com a derivada
   `corda × tangente` (a direção pedida na ponta, a direção de passagem num nó de tangente fixa). A haste já sai da ponta com a curvatura do engaste, sem trecho reto fixo de nós, e por isso a
   spline pelos nós segue a haste: o defeito que a spline e a Hermite tinham, de dobrar três vezes mais fechado na emenda do trecho reto fixo com o primeiro trecho livre, não existe mais.
   Uma perna termina num nó de passagem, em que a tangente é a mesma dos dois lados (C¹) e a curvatura pode saltar. */
function hermite(nos, tA, tB, fixas) {
  const n = nos.length - 1;
  const hh = Array.from({ length: n }, (_, i) => norma(sub(nos[i + 1], nos[i])));
  const fronteiras = [0, ...[...fixas.keys()].filter((j) => j > 0 && j < n).sort((x, y) => x - y), n];
  const m = nos.map(() => [0, 0, 0]);
  const T = nos.map((_, j) => fixas.get(j) ?? (j === 0 ? tA : j === n ? tB : null));
  for (let g = 0; g + 1 < fronteiras.length; g += 1) {
    const j0 = fronteiras[g]; const j1 = fronteiras[g + 1]; const k = j1 - j0;
    const corda = hh.slice(j0, j1).reduce((x, y) => x + y, 0) / k;
    const d0 = mult(T[j0], corda); const d1 = mult(T[j1], corda);
    /* o sistema tridiagonal das segundas derivadas (Thomas), por componente: m[i−1] + 4 m[i] + m[i+1] = 6 Δ²P; nas pontas 2 m[0] + m[1] = 6 (P1 − P0 − d0) */
    const baixa = []; const diag = []; const alta = []; const rhs = [];
    for (let i = 0; i <= k; i += 1) {
      baixa.push(i === 0 ? 0 : 1); alta.push(i === k ? 0 : 1);
      diag.push(i === 0 || i === k ? 2 : 4);
      if (i === 0) rhs.push(mult(sub(sub(nos[j0 + 1], nos[j0]), d0), 6));
      else if (i === k) rhs.push(mult(sub(d1, sub(nos[j1], nos[j1 - 1])), 6));
      else rhs.push(mult(sub(soma(nos[j0 + i + 1], nos[j0 + i - 1]), mult(nos[j0 + i], 2)), 6));
    }
    const c = []; const r = [];
    for (let i = 0; i <= k; i += 1) {
      const den = diag[i] - (i === 0 ? 0 : baixa[i] * c[i - 1]);
      c.push(alta[i] / den);
      r.push(mult(sub(rhs[i], i === 0 ? [0, 0, 0] : mult(r[i - 1], baixa[i])), 1 / den));
    }
    for (let i = k; i >= 0; i -= 1) m[j0 + i] = i === k ? r[i] : sub(r[i], mult(m[j0 + i + 1], c[i]));
  }
  return { n, hh, nos, T, m };
}
/* posição, primeira e segunda derivada (em relação ao comprimento de arco aproximado) no trecho i, em u de 0 a 1 */
function avaliarSpline(S, i, u) {
  const { hh, nos, m } = S; const h = hh[i]; const w = 1 - u;
  const p = []; const d1 = []; const d2 = [];
  for (let q = 0; q < 3; q += 1) {
    const y0 = nos[i][q]; const y1 = nos[i + 1][q]; const m0 = m[i][q]; const m1 = m[i + 1][q];
    p.push(w * y0 + u * y1 + ((w ** 3 - w) * m0 + (u ** 3 - u) * m1) / 6);
    d1.push((y1 - y0 - ((3 * w * w - 1) * m0 - (3 * u * u - 1) * m1) / 6) / h);
    d2.push((w * m0 + u * m1) / (h * h));
  }
  return { p, d1, d2 };
}

/** O caminho de uma haste resolvida: posição, tangente e curvatura por comprimento de arco. `nos` são os M nós da haste, de `ponta A + trechoA·dA` a `ponta B + trechoB·dB`;
    `dA` e `dB` as direções de saída; `trechoA` e `trechoB` os trechos retos de cada ponta (0 sem eles); `tangentesFixas` os nós (índice e direção unitária de passagem) em que o cabo passa numa direção dada. */
export function criarCaminho({ nos, dA, dB, trechoA = 0, trechoB = 0, tangentesFixas = [] }) {
  const M = nos.length;
  const tA = unitario(dA); const tB = mult(unitario(dB), -1);
  const S = hermite(nos, tA, tB, new Map(tangentesFixas.map(({ indice, t }) => [indice, unitario(t)])));
  /* a curvatura de cada nó da haste, do ângulo entre os dois trechos que ele une; nas pontas e nas passagens, a do engaste (o desvio do trecho para a tangente, que o nó fantasma mede em dobro) */
  const curvaturaDoNo = nos.map((q, j) => {
    const engaste = (e, t) => (4 * Math.sin(Math.atan2(norma(cruz(t, e)), dot(t, e)) / 2)) / norma(e);
    if (j === 0) return engaste(sub(nos[1], q), tA);
    if (j === M - 1) return engaste(sub(q, nos[M - 2]), tB);
    if (S.T[j]) return Math.max(engaste(sub(nos[j + 1], q), S.T[j]), engaste(sub(q, nos[j - 1]), S.T[j]));
    const a = sub(q, nos[j - 1]); const b = sub(nos[j + 1], q);
    const giro = Math.atan2(norma(cruz(a, b)), dot(a, b));
    return (2 * Math.sin(giro / 2)) / (0.5 * (norma(a) + norma(b)));
  });
  const curvaturaMaxima = Math.max(...curvaturaDoNo);
  /* a curvatura analítica da curva lisa que vira malha, amostrada em cada trecho da Hermite (a da haste mede o ângulo entre os trechos e não a vê) */
  let curvaturaLisaMaxima = 0;
  for (let i = 0; i < S.n; i += 1) {
    for (let j = 0; j <= SUBPASSOS_DA_CURVATURA; j += 1) {
      const { d1, d2 } = avaliarSpline(S, i, j / SUBPASSOS_DA_CURVATURA);
      curvaturaLisaMaxima = Math.max(curvaturaLisaMaxima, norma(cruz(d1, d2)) / (norma(d1) ** 3));
    }
  }
  const tabela = [{ s: 0, tau: 0, p: nos[0], k: curvaturaDoNo[0] }];
  let acumulado = 0; let anterior = nos[0];
  for (let i = 0; i < S.n; i += 1) {
    for (let j = 1; j <= SUBPASSOS; j += 1) {
      const u = j / SUBPASSOS; const { p } = avaliarSpline(S, i, u);
      acumulado += norma(sub(p, anterior)); anterior = p;
      tabela.push({ s: acumulado, tau: i + u, p, k: (1 - u) * curvaturaDoNo[i] + u * curvaturaDoNo[i + 1] });
    }
  }
  const comprimentoDoMiolo = acumulado;
  const comprimento = trechoA + comprimentoDoMiolo + trechoB;
  const pontaA = sub(nos[0], mult(tA, trechoA)); const pontaB = sub(nos[M - 1], mult(tB, -trechoB));

  function noMiolo(s) {
    let a = 0; let b = tabela.length - 1;
    while (b - a > 1) { const c = (a + b) >> 1; if (tabela[c].s <= s) a = c; else b = c; }
    const A = tabela[a]; const B = tabela[b];
    const f = B.s > A.s ? (s - A.s) / (B.s - A.s) : 0;
    const tau = A.tau + f * (B.tau - A.tau);
    const i = Math.min(S.n - 1, Math.floor(tau));
    return avaliarSpline(S, i, tau - i);
  }
  /** Posição e tangente unitária na distância `s` desde a ponta A. */
  function em(s) {
    if (trechoA > 0 && s <= trechoA) return { p: soma(pontaA, mult(tA, s)), t: tA, k: 0 };
    if (trechoB > 0 && s >= comprimento - trechoB) { const resto = comprimento - s; return { p: soma(pontaB, mult(mult(tB, -1), resto)), t: tB, k: 0 }; }
    const { p, d1, d2 } = noMiolo(Math.max(0, Math.min(comprimentoDoMiolo, s - trechoA)));
    const v = norma(d1);
    return { p, t: mult(d1, 1 / v), k: norma(cruz(d1, d2)) / (v ** 3) };
  }
  return { comprimento, trechoA, trechoB, comprimentoDoMiolo, curvaturaMaxima, raioMinimo: curvaturaMaxima > 0 ? 1 / curvaturaMaxima : Infinity, curvaturaLisaMaxima, raioLiso: curvaturaLisaMaxima > 0 ? 1 / curvaturaLisaMaxima : Infinity, tabela, em };
}

/** Distância do ponto ao segmento. */
function distanciaAoSegmento(p, a, b) {
  const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)));
  return norma(sub(p, soma(a, mult(ab, t))));
}

/** Os comprimentos de arco das estações para `estacoes` pontos: as pontas, as junções dos trechos retos e, no miolo, estações a densidades iguais de sqrt(curvatura / 8 desvio), com piso que mantém o trecho abaixo do `maximo`. */
function posicoesDasEstacoes(caminho, estacoes, desvio, maximo) {
  const { trechoA, trechoB, comprimento, comprimentoDoMiolo, tabela } = caminho;
  const partesA = Math.ceil(trechoA / maximo); const partesB = Math.ceil(trechoB / maximo);
  const intervalosDoMiolo = estacoes - 1 - partesA - partesB;
  if (intervalosDoMiolo < 1) return null;
  const k0 = (8 * desvio) / (maximo * maximo);
  /* a densidade acumulada no miolo */
  const phi = [0];
  for (let j = 1; j < tabela.length; j += 1) {
    const d = tabela[j].s - tabela[j - 1].s;
    const k = 0.5 * (tabela[j].k + tabela[j - 1].k);
    phi.push(phi[j - 1] + d * Math.sqrt(Math.max(k, k0) / (8 * desvio)));
  }
  const total = phi[phi.length - 1];
  const posicoes = [];
  for (let i = 0; i < partesA; i += 1) posicoes.push((trechoA * i) / partesA);
  let j = 0;
  for (let i = 0; i <= intervalosDoMiolo; i += 1) {
    const alvo = (total * i) / intervalosDoMiolo;
    while (j < phi.length - 2 && phi[j + 1] < alvo) j += 1;
    const f = (alvo - phi[j]) / Math.max(phi[j + 1] - phi[j], 1e-300);
    posicoes.push(trechoA + tabela[j].s + f * (tabela[j + 1].s - tabela[j].s));
  }
  for (let i = 1; i <= partesB; i += 1) posicoes.push(comprimento - trechoB + (trechoB * i) / partesB);
  posicoes[posicoes.length - 1] = comprimento;
  if (comprimentoDoMiolo <= 0) return null;
  return posicoes;
}

/** A maior flecha da corda: para cada trecho, a maior distância de oito pontos da curva à corda. */
function desvioDasEstacoes(caminho, posicoes, estacoesP) {
  let maior = 0;
  for (let i = 0; i + 1 < posicoes.length; i += 1) {
    const a = estacoesP[i]; const b = estacoesP[i + 1];
    for (let k = 1; k <= 8; k += 1) maior = Math.max(maior, distanciaAoSegmento(caminho.em(posicoes[i] + ((posicoes[i + 1] - posicoes[i]) * k) / 9).p, a, b));
  }
  return maior;
}

/** O menor passo da escada que cumpre o desvio: as estações, a flecha medida e o comprimento da malha. `piso` é o menor degrau a tentar. */
export function estacoesDoCaminho(caminho, { desvio, maximo, piso = 0 }) {
  for (const estacoes of ESCADA_DE_ESTACOES) {
    if (estacoes < piso) continue;
    const posicoes = posicoesDasEstacoes(caminho, estacoes, desvio, maximo);
    if (!posicoes) continue;
    const pontos = posicoes.map((s) => caminho.em(s));
    const medido = desvioDasEstacoes(caminho, posicoes, pontos.map((e) => e.p));
    if (medido <= desvio * (1 + 1e-9)) {
      let malha = 0; for (let i = 1; i < pontos.length; i += 1) malha += norma(sub(pontos[i].p, pontos[i - 1].p));
      return { estacoes, posicoes, pontos, desvio: medido, comprimentoDaMalha: malha };
    }
  }
  return null;
}

/** O transporte paralelo de uma normal inicial pelas tangentes das estações. */
export function quadroSemTorcao(tangentes) {
  const eixoMenor = [0, 1, 2].reduce((m, q) => (Math.abs(tangentes[0][q]) < Math.abs(tangentes[0][m]) ? q : m), 0);
  const base = [0, 0, 0]; base[eixoMenor] = 1;
  let N = unitario(sub(base, mult(tangentes[0], dot(base, tangentes[0]))));
  const normais = [N];
  for (let i = 1; i < tangentes.length; i += 1) {
    const a = tangentes[i - 1]; const b = tangentes[i];
    const eixo = cruz(a, b); const seno = norma(eixo); const cosseno = dot(a, b);
    if (seno > 1e-14) {
      const k = mult(eixo, 1 / seno);
      N = soma(soma(mult(N, cosseno), mult(cruz(k, N), seno)), mult(k, dot(k, N) * (1 - cosseno)));
    }
    N = unitario(sub(N, mult(b, dot(N, b))));
    normais.push(N);
  }
  return normais;
}

/** A menor distância entre dois pontos da linha cujo comprimento de arco passa de `separacao`: o autocontato do cabo. */
export function distanciaDeAutocontato(caminho, separacao) {
  const { tabela, trechoA } = caminho;
  const passo = Math.max(1, Math.floor(tabela.length / 700));
  const amostras = []; for (let i = 0; i < tabela.length; i += passo) amostras.push({ s: tabela[i].s + trechoA, p: tabela[i].p });
  let menor = Infinity;
  for (let i = 0; i < amostras.length; i += 1) for (let j = i + 1; j < amostras.length; j += 1) {
    if (amostras[j].s - amostras[i].s <= separacao) continue;
    const d = norma(sub(amostras[i].p, amostras[j].p));
    if (d < menor) menor = d;
  }
  return menor;
}

/** O limite de trecho que o `friso` aceita sem dividir, para um tubo de `lados` e raio `r` (mm). */
export function trechoMaximoDoTubo(raio, lados) {
  return 0.98 * TRECHO_MAXIMO_EM_ARESTAS * 2 * raio * Math.sin(Math.PI / lados);
}
