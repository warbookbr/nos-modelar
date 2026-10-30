/* curvatura-da-lataria.js — a curvatura média da lataria por vértice, a escala e a cor dela, e a faixa junto dos vincos declarados,
 * sobre uma malha de triângulos, em JavaScript e sem Three.js, para a bancada pintá-la na peça depois de cada edição.
 *
 * POR QUE ELE EXISTE. A vista de curvatura que o crítico recebe sai do Blender (`tools/blender/curvatura-da-lataria.py`, com as contas
 * de `tools/blender/superficie.py`), e a pessoa aprova a forma olhando a bancada. Duas réguas da mesma grandeza divergiriam em
 * silêncio e a pessoa aprovaria por uma régua que o crítico não usa (plano das visões de conferência na bancada, fatia 2). Este
 * módulo repete as definições do Python, uma a uma, e o teste roda o próprio script do Blender no python3 do sistema sobre a mesma
 * peça e compara vértice a vértice (`curvatura-da-lataria.test.mjs`): a curvatura fica dentro de 5 % da escala em cada vértice
 * comparável, e a faixa dos vincos cobre os mesmos vértices.
 *
 * AS DEFINIÇÕES, IGUAIS ÀS DO PYTHON. A malha é soldada a 1 µm (`comum.soldar`), e os triângulos que a solda degenera saem. As
 * partes de lataria são as de `lataria` (pelo nome, ou pelo nome antes de `__`, como o OBJ chama o segundo corpo de uma parte); as
 * outras são de borda, ficam em cinza claro e fora da conta, e sem lista a malha inteira é lataria. Na lataria, a curvatura bruta de
 * cada vértice é H = -(Δx · n) / 2, com o laplaciano por cotangentes (limitadas a ±20) dividido por um terço da área dos triângulos
 * do vértice e a normal média pesada pela área; a curvatura publicada é a média dela, pesada pela mesma área, nos vértices a até
 * `raio` que olham para o mesmo lado (produto das normais acima de 0,5). O vértice a até `raio` de uma borda livre, de uma aresta
 * em três faces ou mais ou de uma aresta de diedro acima de `anguloBorda` fica sem dado (NaN), em cinza escuro. A faixa dos vincos
 * são os vértices a menos de `faixa` dos segmentos declarados, amostrados a um décimo da faixa; ela sai em ocre e fora da escala. A
 * escala é o percentil `percentil` de |H| fora da faixa, nunca abaixo do `piso`; a cor vai do branco ao vermelho (abaulado) e ao
 * azul (afundado), saturando em ±escala.
 *
 * A ENTRADA é o que a bancada tem na mão: as posições (m), os triângulos por índice (uma geometria não indexada passa 0, 1, 2, ...),
 * o nome da parte de cada triângulo, as partes de lataria (`PLANO.lataria.partes` ou `partesDaLataria`) e os vincos que a malha
 * publica (`vincosDaMalha`, em `vincos-da-malha.js`). A bancada a tira do estado neutro por `malhaDoNeutro`, com os triângulos do
 * OBJ que o Blender lê, e não da geometria da cena, que triangula de outro jeito (ver `malhaDoNeutro`). A saída vem por vértice da
 * entrada, na ordem dela, e é a mesma para a mesma entrada. */

import { triangularSemDegenerado } from '../../procedural/nucleo/triangulacao-face.js';

export const RAIO_PADRAO = 0.02;           // m: o `--raio-mm 20` do script
export const ANGULO_DA_BORDA = 60;          // graus: a dobra viva acima disto não tem curvatura de superfície
export const PERCENTIL_DA_ESCALA = 99;
export const PISO_DA_ESCALA = 0.1;          // 1/m: a lataria lisa não estica o próprio ruído até a cor cheia
export const COTANGENTE_MAXIMA = 20;
export const TOLERANCIA_DA_SOLDA = 1e-6;    // m: a de `comum.soldar`
export const FAIXA_PADRAO = 2 * RAIO_PADRAO; // m: o dobro do raio, como `--faixa-mm` sem valor

export const CINZA_DA_BORDA = 0.45;
export const CINZA_SEM_DADO = 0.25;
export const COR_CONVEXA = Object.freeze([0.85, 0.10, 0.10]);
export const COR_CONCAVA = Object.freeze([0.10, 0.25, 0.85]);
export const COR_DA_FAIXA = Object.freeze([0.80, 0.68, 0.30]);

/** O que cada vértice da saída é, em `estado`. */
export const ESTADO = Object.freeze({ COM_VALOR: 0, SEM_DADO: 1, BORDA: 2, FAIXA: 3 });

const COS_DO_MESMO_LADO = 0.5;

/* ---------- a malha que o Blender lê ---------- */

/* A altura do triângulo sobre o maior lado, e a fração da tolerância de exportação abaixo da qual ela conta como zero: o critério
   com que `validarMalhaObj` (modulos/exportador-obj) escolhe a triangulação de cada face, e o teste confere que os triângulos
   saem iguais aos dele. */
const FRACAO_DA_TOLERANCIA_PARA_DEGENERADO = 1e-6;
function alturaMinima(a, b, c) {
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  const maior = Math.max(Math.hypot(ux, uy, uz), Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]), Math.hypot(vx, vy, vz));
  return maior > 0 ? (2 * area) / maior : 0;
}

/**
 * A malha do estado neutro (`neutro.V`, `neutro.F`) com os triângulos que o OBJ exportado leva ao Blender: o leque do canto 0, ou,
 * quando ele tem triângulo sem área, o outro leque ou as orelhas de `triangularSemDegenerado`. A triangulação da cena da bancada é
 * outra (`triangularConvexa`, pela qualidade do triângulo), e a diagonal trocada num quadrilátero que não é plano muda a superfície:
 * medido em 2026-10-30, a curvatura dela se afasta da do Blender até 115 % da escala fora da faixa dos vincos na carenagem de prova
 * e 146 % dentro dela na peça de prova com vinco. Com estes triângulos a conta é a mesma do Blender, a menos do arredondamento a
 * 1 µm do OBJ. Devolve `{ posicoes, triangulos, partes, ids }`: as
 * posições (Float64Array, m) na ordem dos ids de vértice, os triângulos por índice, o nome da parte de cada triângulo e o id do
 * vértice neutro de cada posição, que liga a saída aos cantos da cena pelo atributo `origemVertice`.
 */
export function malhaDoNeutro(neutro, { tolerancia = 0.001 } = {}) {
  const ids = [...neutro.V.keys()].sort((a, b) => a - b);
  const indice = new Map(ids.map((id, i) => [id, i]));
  const posicoes = new Float64Array(3 * ids.length);
  ids.forEach((id, i) => { const p = neutro.V.get(id); posicoes[3 * i] = p[0]; posicoes[3 * i + 1] = p[1]; posicoes[3 * i + 2] = p[2]; });
  const limite = tolerancia * FRACAO_DA_TOLERANCIA_PARA_DEGENERADO;
  const degenerado = (a, b, c) => alturaMinima(a, b, c) <= limite;
  const triangulos = [];
  const partes = [];
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    const tris = triangularSemDegenerado(face.vs.map((id) => neutro.V.get(id)), degenerado);
    if (!tris) continue;
    for (const [i, j, k] of tris) {
      triangulos.push(indice.get(face.vs[i]), indice.get(face.vs[j]), indice.get(face.vs[k]));
      partes.push(typeof face.parte === 'string' ? face.parte.trim() : null);
    }
  }
  return { posicoes, triangulos: Int32Array.from(triangulos), partes, ids };
}

/* ---------- a solda ---------- */

/**
 * Funde os vértices que caem no mesmo ponto da grade de `tol` (m) e tira os triângulos que ficam degenerados, como `comum.soldar`.
 * Devolve `{ V, F, deEntrada, triangulo }`: as posições soldadas (Float64Array, 3 por vértice), os triângulos que ficam (Int32Array),
 * o vértice soldado de cada vértice da entrada e o triângulo da entrada de cada um que ficou.
 */
export function soldar(posicoes, triangulos, tol = TOLERANCIA_DA_SOLDA) {
  const n = Math.floor(posicoes.length / 3);
  const deEntrada = new Int32Array(n);
  const indice = new Map();
  const V = [];
  for (let i = 0; i < n; i++) {
    const x = posicoes[3 * i];
    const y = posicoes[3 * i + 1];
    const z = posicoes[3 * i + 2];
    const chave = `${Math.round(x / tol)},${Math.round(y / tol)},${Math.round(z / tol)}`;
    let k = indice.get(chave);
    if (k === undefined) {
      k = V.length / 3;
      indice.set(chave, k);
      V.push(x, y, z);
    }
    deEntrada[i] = k;
  }
  const m = Math.floor(triangulos.length / 3);
  const F = new Int32Array(3 * m);
  const triangulo = new Int32Array(m);
  let t = 0;
  for (let j = 0; j < m; j++) {
    const a = deEntrada[triangulos[3 * j]];
    const b = deEntrada[triangulos[3 * j + 1]];
    const c = deEntrada[triangulos[3 * j + 2]];
    if (a === b || b === c || a === c) continue;
    F[3 * t] = a; F[3 * t + 1] = b; F[3 * t + 2] = c;
    triangulo[t++] = j;
  }
  return { V: Float64Array.from(V), F: F.slice(0, 3 * t), deEntrada, triangulo: triangulo.slice(0, t) };
}

/* ---------- a grade de vizinhança ---------- */

const DESLOCAMENTO_DA_CELULA = 2 ** 15;
const LADO_DA_CHAVE = 2 ** 16;
const chaveDaCelula = (i, j, k) => ((i + DESLOCAMENTO_DA_CELULA) * LADO_DA_CHAVE + (j + DESLOCAMENTO_DA_CELULA)) * LADO_DA_CHAVE + (k + DESLOCAMENTO_DA_CELULA);

/* Os pontos de P (3 por ponto) agrupados em células de lado `passo`: `{ celulas: Map(chave → [início, fim)), ordem, cantos, passo }`,
   com `ordem` os índices dos pontos agrupados por célula e `cantos` as coordenadas inteiras de cada célula, na ordem de `celulas`. */
function grade(P, passo) {
  const n = P.length / 3;
  const chaves = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    chaves[i] = chaveDaCelula(Math.floor(P[3 * i] / passo), Math.floor(P[3 * i + 1] / passo), Math.floor(P[3 * i + 2] / passo));
  }
  const ordem = new Int32Array(n);
  for (let i = 0; i < n; i++) ordem[i] = i;
  ordem.sort((a, b) => chaves[a] - chaves[b] || a - b);
  const celulas = new Map();
  const cantos = [];
  for (let s = 0; s < n;) {
    const chave = chaves[ordem[s]];
    let e = s + 1;
    while (e < n && chaves[ordem[e]] === chave) e++;
    celulas.set(chave, [s, e]);
    const q = ordem[s];
    cantos.push([Math.floor(P[3 * q] / passo), Math.floor(P[3 * q + 1] / passo), Math.floor(P[3 * q + 2] / passo)]);
    s = e;
  }
  return { celulas, ordem, cantos, passo };
}

/* Para cada célula da grade `gP` (de P), chama `visitar(inicio, fim, candidatos, nc)`: os pontos de P da célula são
   `gP.ordem[inicio..fim)` e os de Q nas 27 células em volta dela são `candidatos[0..nc)`, um vetor que se reaproveita. As duas
   grades têm o mesmo passo, e todo ponto de Q a até um passo de um ponto de P está entre os candidatos dele. */
function paraCadaCelula(gP, gQ, visitar) {
  let candidatos = new Int32Array(256);
  let k = 0;
  for (const [inicio, fim] of gP.celulas.values()) {
    const [ci, cj, ck] = gP.cantos[k++];
    let nc = 0;
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        for (let d = -1; d <= 1; d++) {
          const faixa = gQ.celulas.get(chaveDaCelula(ci + a, cj + b, ck + d));
          if (!faixa) continue;
          const falta = nc + faixa[1] - faixa[0];
          if (falta > candidatos.length) {
            const maior = new Int32Array(Math.max(falta, 2 * candidatos.length));
            maior.set(candidatos.subarray(0, nc));
            candidatos = maior;
          }
          for (let s = faixa[0]; s < faixa[1]; s++) candidatos[nc++] = gQ.ordem[s];
        }
      }
    }
    visitar(inicio, fim, candidatos, nc);
  }
}

/** A distância de cada ponto de P ao ponto de Q mais perto, até `alcance`; acima disso, o dobro dele (`superficie._distancia_minima`). */
export function distanciaMinima(P, Q, alcance) {
  const out = new Float64Array(P.length / 3).fill(alcance * 2);
  if (!Q.length || !P.length) return out;
  const gP = grade(P, alcance);
  paraCadaCelula(gP, grade(Q, alcance), (inicio, fim, candidatos, nc) => {
    for (let s = inicio; s < fim; s++) {
      const q = gP.ordem[s];
      const x = P[3 * q]; const y = P[3 * q + 1]; const z = P[3 * q + 2];
      let menor = out[q];
      for (let t = 0; t < nc; t++) {
        const c = 3 * candidatos[t];
        const dx = x - Q[c]; const dy = y - Q[c + 1]; const dz = z - Q[c + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < menor) menor = d;
      }
      out[q] = menor;
    }
  });
  return out;
}

/* ---------- a curvatura média ---------- */

/**
 * As normais dos vértices (a soma dos produtos vetoriais dos triângulos, normalizada) e a área de cada triângulo, como
 * `superficie.normais_dos_vertices`: `{ N, nTri, area }`, com `nTri` o produto vetorial de cada triângulo (o dobro da área, na
 * direção da normal).
 */
export function normaisDosVertices(V, F) {
  const n = V.length / 3;
  const m = F.length / 3;
  const N = new Float64Array(3 * n);
  const nTri = new Float64Array(3 * m);
  const area = new Float64Array(m);
  for (let t = 0; t < m; t++) {
    const a = 3 * F[3 * t];
    const b = 3 * F[3 * t + 1];
    const c = 3 * F[3 * t + 2];
    const ux = V[b] - V[a]; const uy = V[b + 1] - V[a + 1]; const uz = V[b + 2] - V[a + 2];
    const vx = V[c] - V[a]; const vy = V[c + 1] - V[a + 1]; const vz = V[c + 2] - V[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    nTri[3 * t] = nx; nTri[3 * t + 1] = ny; nTri[3 * t + 2] = nz;
    area[t] = Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
    for (const v of [a, b, c]) { N[v] += nx; N[v + 1] += ny; N[v + 2] += nz; }
  }
  for (let i = 0; i < n; i++) {
    const l = Math.max(Math.hypot(N[3 * i], N[3 * i + 1], N[3 * i + 2]), 1e-30);
    N[3 * i] /= l; N[3 * i + 1] /= l; N[3 * i + 2] /= l;
  }
  return { N, nTri, area };
}

/* Os vértices das arestas que tiram o dado: a borda livre (uma face), a aresta fora de variedade (três ou mais) e a dobra viva
   (diedro acima de `anguloBorda`). */
function verticesDaBorda(V, F, nTri, anguloBorda) {
  const n = V.length / 3;
  const arestas = new Map();
  const m = F.length / 3;
  for (let t = 0; t < m; t++) {
    for (let k = 0; k < 3; k++) {
      const a = F[3 * t + k];
      const b = F[3 * t + ((k + 1) % 3)];
      const chave = a < b ? a * n + b : b * n + a;
      const e = arestas.get(chave);
      if (!e) arestas.set(chave, [1, t, -1]);
      else { if (e[0] === 1) e[2] = t; e[0]++; }
    }
  }
  const limite = Math.cos((anguloBorda * Math.PI) / 180);
  const unidade = (t) => {
    const l = Math.max(Math.hypot(nTri[3 * t], nTri[3 * t + 1], nTri[3 * t + 2]), 1e-30);
    return [nTri[3 * t] / l, nTri[3 * t + 1] / l, nTri[3 * t + 2] / l];
  };
  const ruim = new Uint8Array(n);
  for (const [chave, [contagem, fa, fb]] of arestas) {
    let quebra = contagem !== 2;
    if (!quebra) {
      const p = unidade(fa);
      const q = unidade(fb);
      quebra = p[0] * q[0] + p[1] * q[1] + p[2] * q[2] < limite;
    }
    if (quebra) { ruim[Math.floor(chave / n)] = 1; ruim[chave % n] = 1; }
  }
  const pontos = [];
  for (let i = 0; i < n; i++) if (ruim[i]) pontos.push(V[3 * i], V[3 * i + 1], V[3 * i + 2]);
  return Float64Array.from(pontos);
}

/**
 * A curvatura média (1/m) de cada vértice de uma malha soldada (V com 3 números por vértice, F com 3 índices por triângulo, enrolados
 * para fora), com sinal, como `superficie.curvatura_media`: `{ H, valido }`, com NaN em H e 0 em `valido` nos vértices a até `raio`
 * de uma borda livre, de uma aresta fora de variedade ou de uma dobra acima de `anguloBorda` graus.
 */
export function curvaturaMedia(V, F, raio = RAIO_PADRAO, { anguloBorda = ANGULO_DA_BORDA, cotangenteMaxima = COTANGENTE_MAXIMA } = {}) {
  const n = V.length / 3;
  const m = F.length / 3;
  const { N, nTri, area } = normaisDosVertices(V, F);
  const lap = new Float64Array(3 * n);
  const areaV = new Float64Array(n);
  for (let t = 0; t < m; t++) {
    for (let k = 0; k < 3; k++) {
      const i = 3 * F[3 * t + k];
      const j = 3 * F[3 * t + ((k + 1) % 3)];
      const l = 3 * F[3 * t + ((k + 2) % 3)];
      const ux = V[j] - V[i]; const uy = V[j + 1] - V[i + 1]; const uz = V[j + 2] - V[i + 2];
      const vx = V[l] - V[i]; const vy = V[l + 1] - V[i + 1]; const vz = V[l + 2] - V[i + 2];
      const cx = uy * vz - uz * vy; const cy = uz * vx - ux * vz; const cz = ux * vy - uy * vx;
      let cot = (ux * vx + uy * vy + uz * vz) / Math.max(Math.sqrt(cx * cx + cy * cy + cz * cz), 1e-30);
      cot = Math.min(Math.max(cot, -cotangenteMaxima), cotangenteMaxima);
      /* o canto em i enxerga a aresta (j, l): ela leva peso cot / 2 nos dois extremos */
      const w = 0.5 * cot;
      for (let e = 0; e < 3; e++) {
        const d = V[l + e] - V[j + e];
        lap[j + e] += w * d;
        lap[l + e] -= w * d;
      }
      areaV[i / 3] += area[t] / 3;
    }
  }
  const bruta = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(areaV[i], 1e-30);
    bruta[i] = -0.5 * ((lap[3 * i] / a) * N[3 * i] + (lap[3 * i + 1] / a) * N[3 * i + 1] + (lap[3 * i + 2] / a) * N[3 * i + 2]);
  }

  const valido = new Uint8Array(n).fill(1);
  const ruins = verticesDaBorda(V, F, nTri, anguloBorda);
  if (ruins.length) {
    const d = distanciaMinima(V, ruins, raio);
    for (let i = 0; i < n; i++) valido[i] = d[i] > raio ? 1 : 0;
  }

  /* a média pesada pela área, só entre os vértices a até `raio` que olham para o mesmo lado */
  const soma = new Float64Array(n);
  const peso = new Float64Array(n);
  const r2 = raio * raio;
  const g = grade(V, raio);
  paraCadaCelula(g, g, (inicio, fim, candidatos, nc) => {
    for (let s = inicio; s < fim; s++) {
      const q = g.ordem[s];
      const x = V[3 * q]; const y = V[3 * q + 1]; const z = V[3 * q + 2];
      const nx = N[3 * q]; const ny = N[3 * q + 1]; const nz = N[3 * q + 2];
      let sq = 0;
      let pq = 0;
      for (let t = 0; t < nc; t++) {
        const c = candidatos[t];
        const dx = x - V[3 * c]; const dy = y - V[3 * c + 1]; const dz = z - V[3 * c + 2];
        if (dx * dx + dy * dy + dz * dz > r2) continue;
        if (nx * N[3 * c] + ny * N[3 * c + 1] + nz * N[3 * c + 2] <= COS_DO_MESMO_LADO) continue;
        sq += areaV[c] * bruta[c];
        pq += areaV[c];
      }
      soma[q] = sq;
      peso[q] = pq;
    }
  });
  const H = new Float64Array(n);
  for (let i = 0; i < n; i++) H[i] = valido[i] ? soma[i] / Math.max(peso[i], 1e-30) : NaN;
  return { H, valido };
}

/* ---------- a faixa, a escala e a cor ---------- */

/* Os segmentos `[[p, q], ...]` de uma lista de vincos `[{ segmentos }]` (o que `vincosDaMalha` devolve) ou de segmentos soltos. */
function segmentosDe(vincos) {
  const out = [];
  for (const item of vincos ?? []) {
    if (Array.isArray(item?.segmentos)) out.push(...item.segmentos);
    else if (Array.isArray(item) && item.length === 2) out.push(item);
  }
  return out;
}

/**
 * Os vértices de V (3 números por vértice) a menos de `largura` (m) dos segmentos `[[p, q], ...]`, como `superficie.faixa_dos_vincos`:
 * cada segmento é amostrado a um décimo da largura e a distância é a do ponto amostrado mais perto. Uint8Array com 1 na faixa.
 */
export function faixaDosVincos(V, segmentos, largura) {
  const n = V.length / 3;
  const out = new Uint8Array(n);
  if (!segmentos.length || !(largura > 0) || !n) return out;
  const passo = largura / 10;
  const Q = [];
  for (const [p, q] of segmentos) {
    const k = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / passo));
    for (let s = 0; s <= k; s++) {
      const t = s / k;
      Q.push(p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), p[2] + t * (q[2] - p[2]));
    }
  }
  const d = distanciaMinima(V, Float64Array.from(Q), largura);
  for (let i = 0; i < n; i++) out[i] = d[i] < largura ? 1 : 0;
  return out;
}

/**
 * A curvatura (1/m) que satura a cor, como `superficie.escala_da_curvatura`: o percentil de |H| dos vértices com valor e fora de
 * `fora` (a faixa dos vincos), com a interpolação linear do numpy, nunca abaixo do `piso`.
 */
export function escalaDaCurvatura(H, { percentil = PERCENTIL_DA_ESCALA, piso = PISO_DA_ESCALA, fora = null } = {}) {
  const h = [];
  for (let i = 0; i < H.length; i++) if (Number.isFinite(H[i]) && !(fora && fora[i])) h.push(Math.abs(H[i]));
  if (!h.length) return piso;
  const ordenado = Float64Array.from(h).sort();
  const pos = (percentil / 100) * (ordenado.length - 1);
  const baixo = Math.floor(pos);
  const alto = Math.min(baixo + 1, ordenado.length - 1);
  const valor = ordenado[baixo] + (ordenado[alto] - ordenado[baixo]) * (pos - baixo);
  return Math.max(valor, piso);
}

/** A cor de uma curvatura `h` na escala: branco em zero, vermelho para a positiva e azul para a negativa, como `superficie.cor_divergente`. */
export function corDivergente(h, escala) {
  if (!Number.isFinite(h)) return [NaN, NaN, NaN];
  const t = Math.min(Math.max(h / escala, -1), 1);
  if (t > 0) return COR_CONVEXA.map((c) => (1 - t) + t * c);
  if (t < 0) return COR_CONCAVA.map((c) => (1 + t) - t * c);
  return [1, 1, 1];
}

/* ---------- a vista inteira ---------- */

const nomeBase = (parte) => String(parte).split('__')[0];

/**
 * A vista de curvatura da lataria de uma malha, como `curvatura-da-lataria.py` a pinta.
 *
 * `posicoes` (m, 3 por vértice) e `triangulos` (3 índices por triângulo) são a malha; `partes` (opcional) diz o nome da parte de
 * cada triângulo e `lataria` (opcional) as partes que são a chapa, de modo que as outras são de borda; sem `lataria`, a malha
 * inteira é lataria. `vincos` são os vincos declarados, `[{ nome, segmentos: [[p, q], ...] }]` como `vincosDaMalha` os devolve, e
 * a lataria a menos de `faixa` (m) deles sai da escala. `escala` (1/m) fixa a escala em vez de medi-la.
 *
 * Devolve, por vértice da entrada: `curvatura` (Float64Array, 1/m, NaN onde não há valor ou o vértice é só de borda), `estado`
 * (Uint8Array, `ESTADO`), `naFaixa` (Uint8Array, 1 no vértice com valor junto de um vinco) e `cores` (Float32Array, RGB em 0 a 1);
 * e, da malha, `escala`, `escalaComAFaixa` (a que a faixa daria se contasse, ou null sem vincos), `faixa` (a largura usada, ou
 * null) e `contagens` dos vértices soldados.
 */
export function curvaturaDaLataria({
  posicoes, triangulos, partes = null, lataria = null, vincos = [],
  raio = RAIO_PADRAO, anguloBorda = ANGULO_DA_BORDA, percentil = PERCENTIL_DA_ESCALA, piso = PISO_DA_ESCALA,
  faixa = null, escala = null,
} = {}) {
  if (!(raio > 0)) throw new RangeError('curvaturaDaLataria: o raio precisa ser positivo');
  const largura = faixa ?? 2 * raio;
  if (!(largura > 0)) throw new RangeError('curvaturaDaLataria: a faixa precisa ser positiva');
  const s = soldar(posicoes, triangulos);
  const nS = s.V.length / 3;
  const mS = s.F.length / 3;

  /* as faces de borda: as de parte fora da lista de lataria */
  const deBorda = new Uint8Array(mS);
  if (lataria && lataria.length) {
    if (!partes) throw new TypeError('curvaturaDaLataria: `lataria` diz as partes pelo nome e pede `partes`, o nome da parte de cada triângulo');
    const pedidas = new Set(lataria);
    for (let t = 0; t < mS; t++) {
      const parte = partes[s.triangulo[t]];
      deBorda[t] = pedidas.has(parte) || pedidas.has(nomeBase(parte)) ? 0 : 1;
    }
  }
  let faces = 0;
  for (let t = 0; t < mS; t++) if (!deBorda[t]) faces++;
  if (!faces) throw new Error('curvaturaDaLataria: nenhuma lataria, todas as faces são de peça de borda');

  /* a malha só da lataria, compacta */
  const daLataria = new Int32Array(nS).fill(-1);
  const usados = [];
  const ehBorda = new Uint8Array(nS);
  for (let t = 0; t < mS; t++) {
    for (let k = 0; k < 3; k++) {
      const v = s.F[3 * t + k];
      if (deBorda[t]) { ehBorda[v] = 1; continue; }
      if (daLataria[v] < 0) { daLataria[v] = 0; usados.push(v); }
    }
  }
  usados.sort((a, b) => a - b);
  usados.forEach((v, k) => { daLataria[v] = k; });
  const Vl = new Float64Array(3 * usados.length);
  usados.forEach((v, k) => { Vl[3 * k] = s.V[3 * v]; Vl[3 * k + 1] = s.V[3 * v + 1]; Vl[3 * k + 2] = s.V[3 * v + 2]; });
  const Fl = new Int32Array(3 * faces);
  for (let t = 0, f = 0; t < mS; t++) {
    if (deBorda[t]) continue;
    for (let k = 0; k < 3; k++) Fl[3 * f + k] = daLataria[s.F[3 * t + k]];
    f++;
  }

  const { H } = curvaturaMedia(Vl, Fl, raio, { anguloBorda });
  const segmentos = segmentosDe(vincos);
  const comVincos = segmentos.length > 0;
  const faixaL = comVincos ? faixaDosVincos(Vl, segmentos, largura) : new Uint8Array(usados.length);
  const escalaUsada = escala ?? escalaDaCurvatura(H, { percentil, piso, fora: faixaL });
  if (!(escalaUsada > 0)) throw new RangeError('curvaturaDaLataria: a escala precisa ser positiva');

  /* por vértice soldado, na precedência do script: sem dado, borda, lataria com valor, faixa */
  const estadoS = new Uint8Array(nS).fill(ESTADO.SEM_DADO);
  const HS = new Float64Array(nS).fill(NaN);
  for (let v = 0; v < nS; v++) if (ehBorda[v]) estadoS[v] = ESTADO.BORDA;
  let semDado = 0;
  let naFaixaComValor = 0;
  let minimo = Infinity;
  let maximo = -Infinity;
  usados.forEach((v, k) => {
    if (!Number.isFinite(H[k])) { estadoS[v] = ESTADO.SEM_DADO; semDado++; return; }
    HS[v] = H[k];
    estadoS[v] = faixaL[k] ? ESTADO.FAIXA : ESTADO.COM_VALOR;
    if (faixaL[k]) naFaixaComValor++;
    if (H[k] < minimo) minimo = H[k];
    if (H[k] > maximo) maximo = H[k];
  });
  let deBordaS = 0;
  for (let v = 0; v < nS; v++) if (ehBorda[v]) deBordaS++;

  const nE = s.deEntrada.length;
  const curvatura = new Float64Array(nE);
  const estado = new Uint8Array(nE);
  const naFaixa = new Uint8Array(nE);
  const cores = new Float32Array(3 * nE);
  const corDoSoldado = new Float32Array(3 * nS);
  for (let v = 0; v < nS; v++) {
    let cor;
    if (estadoS[v] === ESTADO.COM_VALOR) cor = corDivergente(HS[v], escalaUsada);
    else if (estadoS[v] === ESTADO.FAIXA) cor = COR_DA_FAIXA;
    else if (estadoS[v] === ESTADO.BORDA) cor = [CINZA_DA_BORDA, CINZA_DA_BORDA, CINZA_DA_BORDA];
    else cor = [CINZA_SEM_DADO, CINZA_SEM_DADO, CINZA_SEM_DADO];
    corDoSoldado[3 * v] = cor[0]; corDoSoldado[3 * v + 1] = cor[1]; corDoSoldado[3 * v + 2] = cor[2];
  }
  for (let i = 0; i < nE; i++) {
    const v = s.deEntrada[i];
    curvatura[i] = HS[v];
    estado[i] = estadoS[v];
    naFaixa[i] = estadoS[v] === ESTADO.FAIXA ? 1 : 0;
    cores[3 * i] = corDoSoldado[3 * v]; cores[3 * i + 1] = corDoSoldado[3 * v + 1]; cores[3 * i + 2] = corDoSoldado[3 * v + 2];
  }
  return {
    curvatura, estado, naFaixa, cores,
    escala: escalaUsada,
    escalaComAFaixa: comVincos ? escalaDaCurvatura(H, { percentil, piso }) : null,
    faixa: comVincos ? largura : null,
    contagens: {
      soldados: nS,
      lataria: usados.length,
      semDado,
      borda: deBordaS,
      faixa: naFaixaComValor,
    },
    curvaturaExtremos: Number.isFinite(minimo) ? { minima: minimo, maxima: maximo } : null,
  };
}
