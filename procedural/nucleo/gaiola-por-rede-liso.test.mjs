/* gaiola-por-rede-liso.test.mjs — o alisamento do miolo dá o MESMO resultado de antes de a montagem do sistema e o gradiente
   conjugado passarem a trabalhar sobre vetores de números e uma matriz de acumulação densa (2026-10-28).

   O bloco "REFERÊNCIA" é a cópia literal do que o módulo tinha: o laço do gradiente conjugado com listas e `map`/`reduce`, e
   `alisarMioloNaNormal` inteira, com a montagem em mapas. O teste monta sistemas esparsos simétricos sorteados e malhas de
   quadriláteros sorteadas (grades com ponto deslocado, faces tiradas, pontos livres e pulados sorteados, as duas energias e de uma
   a três voltas), e exige que cada componente da solução e cada posição sejam idênticos, bit a bit (`Object.is`), nos dois
   caminhos da função nova: a montagem densa e a por mapas (`limiteDenso: 0`). */
import { describe, expect, it } from 'vitest';
import { alisarMioloNaNormal, gradienteConjugado } from './gaiola-por-rede-liso.js';

/* ===== REFERÊNCIA: o código anterior, sem alteração ===== */
const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const norma = (u) => Math.hypot(u[0], u[1], u[2]);
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

/* Normais dos vértices: a soma das normais de Newell das faces que os tocam, normalizada. */
function normaisDosVertices(P, F) {
  const n = P.map(() => [0, 0, 0]);
  for (const f of F) {
    const m = [0, 0, 0];
    for (let k = 0; k < f.length; k++) {
      const a = P[f[k]]; const b = P[f[(k + 1) % f.length]];
      m[0] += (a[1] - b[1]) * (a[2] + b[2]); m[1] += (a[2] - b[2]) * (a[0] + b[0]); m[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    for (const v of f) { n[v][0] += m[0]; n[v][1] += m[1]; n[v][2] += m[2]; }
  }
  return n.map((m) => { const l = norma(m); return l > 0 ? [m[0] / l, m[1] / l, m[2] / l] : [0, 0, 0]; });
}


function alisarMioloNaNormalAntigo(posicoes, faces, livres, pulados, { iteracoes = 2, energia = 'variacao', ancora = 1e-4 } = {}) {
  const n = posicoes.length;
  const viz = Array.from({ length: n }, () => new Set());
  for (const f of faces) for (let k = 0; k < f.length; k++) { const a = f[k]; const b = f[(k + 1) % f.length]; viz[a].add(b); viz[b].add(a); }
  const vizinhos = viz.map((s) => [...s].sort((a, b) => a - b));
  const lista = [...livres].sort((a, b) => a - b);
  const indiceDoLivre = new Map(lista.map((v, i) => [v, i]));
  let P = posicoes.map((p) => [...p]);
  let maior = 0;
  for (let volta = 0; volta < iteracoes; volta++) {
    const N = normaisDosVertices(P, faces);
    /* o laplaciano de cada ponto que tem um: o valor L0 de agora e o coeficiente de cada ponto livre sobre o seu h */
    const L = new Array(n).fill(null);
    for (let s = 0; s < n; s++) {
      if (pulados.has(s) || !vizinhos[s].length) continue;
      const dists = vizinhos[s].map((j) => norma(sub(P[j], P[s])));
      const pesos = dists.map((d) => 1 / d);
      const total = pesos.reduce((x, y) => x + y, 0);
      /* a escala do ponto: L vale (curvatura / 2) vezes ela numa forma quadrática, qualquer que seja o espaçamento e a valência */
      const escala = energia === 'placa' ? 1 : dists.reduce((x, y) => x + y, 0) / total;
      const L0 = [0, 0, 0]; const coef = new Map();
      vizinhos[s].forEach((j, k) => {
        const a = pesos[k] / total / escala;
        L0[0] += a * (P[j][0] - P[s][0]); L0[1] += a * (P[j][1] - P[s][1]); L0[2] += a * (P[j][2] - P[s][2]);
        if (indiceDoLivre.has(j)) coef.set(indiceDoLivre.get(j), (coef.get(indiceDoLivre.get(j)) ?? 0) + a);
      });
      if (indiceDoLivre.has(s)) coef.set(indiceDoLivre.get(s), (coef.get(indiceDoLivre.get(s)) ?? 0) - 1 / escala);
      L[s] = { L0, coef };
    }
    /* os termos da energia: o próprio L (placa) ou a diferença dos L nas pontas de cada aresta (variação) */
    const termos = [];
    if (energia === 'placa') {
      for (let s = 0; s < n; s++) if (L[s]) termos.push({ peso: 1, L0: L[s].L0, coef: L[s].coef });
    } else {
      for (let s = 0; s < n; s++) {
        if (!L[s]) continue;
        for (const t of vizinhos[s]) {
          if (t < s || !L[t]) continue;
          const peso = 1;
          const coef = new Map(L[s].coef);
          for (const [u, c] of L[t].coef) coef.set(u, (coef.get(u) ?? 0) - c);
          termos.push({ peso, L0: sub(L[s].L0, L[t].L0), coef });
        }
      }
    }
    const linhas = lista.map(() => new Map());
    const b = new Array(lista.length).fill(0);
    for (const { peso, L0, coef } of termos) {
      const itens = [...coef].filter(([, c]) => c !== 0).sort((x, y) => x[0] - y[0]);
      for (const [u, cu] of itens) {
        const nu = N[lista[u]];
        b[u] -= peso * cu * dot(nu, L0);
        for (const [v, cv] of itens) linhas[u].set(v, (linhas[u].get(v) ?? 0) + peso * cu * cv * dot(nu, N[lista[v]]));
      }
    }
    /* gradiente conjugado, com Jacobi, na ordem fixa dos pontos e das colunas */
    const colunas = linhas.map((m) => [...m].sort((x, y) => x[0] - y[0]));
    const escala = colunas.reduce((m, c, i) => Math.max(m, ...c.filter(([j]) => j === i).map(([, v]) => v)), 0) || 1;
    const folga = ancora * escala;
    const diag = colunas.map((c, i) => { const d = c.find(([j]) => j === i); return (d ? d[1] : 0) + folga; });
    const Mv = (v) => colunas.map((c, i) => { let t = folga * v[i]; for (const [j, m] of c) t += m * v[j]; return t; });
    let h = new Array(lista.length).fill(0);
    let r = b.slice();
    let z = r.map((x, i) => x / diag[i]);
    let p = z.slice();
    let rz = r.reduce((x, y, i) => x + y * z[i], 0);
    const limite = 1e-20 * (b.reduce((x, y) => x + y * y, 0) || 1);
    for (let it = 0; it < 8 * lista.length + 100; it++) {
      if (r.reduce((x, y) => x + y * y, 0) <= limite) break;
      const Ap = Mv(p);
      const alfa = rz / p.reduce((x, y, i) => x + y * Ap[i], 0);
      h = h.map((x, i) => x + alfa * p[i]);
      r = r.map((x, i) => x - alfa * Ap[i]);
      z = r.map((x, i) => x / diag[i]);
      const rzNovo = r.reduce((x, y, i) => x + y * z[i], 0);
      p = z.map((x, i) => x + (rzNovo / rz) * p[i]);
      rz = rzNovo;
    }
    const novo = P.map((q) => [...q]);
    lista.forEach((v, i) => {
      novo[v] = [P[v][0] + h[i] * N[v][0], P[v][1] + h[i] * N[v][1], P[v][2] + h[i] * N[v][2]];
      maior = Math.max(maior, norma(sub(novo[v], posicoes[v])));
    });
    P = novo;
  }
  return { posicoes: P, deslocamentoMaximo: maior, iteracoes };
}

/* ===== fim da referência (a do gradiente conjugado vem abaixo) ===== */

function referencia(colunas, diag, folga, b, n) {
  const Mv = (v) => colunas.map((c, i) => { let t = folga * v[i]; for (const [j, m] of c) t += m * v[j]; return t; });
  let h = new Array(n).fill(0);
  let r = b.slice();
  let z = r.map((x, i) => x / diag[i]);
  let p = z.slice();
  let rz = r.reduce((x, y, i) => x + y * z[i], 0);
  const limite = 1e-20 * (b.reduce((x, y) => x + y * y, 0) || 1);
  let voltas = 0;
  for (let it = 0; it < 8 * n + 100; it++) {
    if (r.reduce((x, y) => x + y * y, 0) <= limite) break;
    voltas += 1;
    const Ap = Mv(p);
    const alfa = rz / p.reduce((x, y, i) => x + y * Ap[i], 0);
    h = h.map((x, i) => x + alfa * p[i]);
    r = r.map((x, i) => x - alfa * Ap[i]);
    z = r.map((x, i) => x / diag[i]);
    const rzNovo = r.reduce((x, y, i) => x + y * z[i], 0);
    p = z.map((x, i) => x + (rzNovo / rz) * p[i]);
    rz = rzNovo;
  }
  return { h, voltas };
}

function gerador(semente) {
  let s = semente >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* matriz esparsa simétrica diagonalmente dominante, como linhas de pares [coluna, valor] em ordem de coluna */
function sistema(aleatorio, n) {
  const linhas = Array.from({ length: n }, () => new Map());
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const j = Math.floor(aleatorio() * n);
      if (j === i) continue;
      const v = (aleatorio() - 0.5) * 2;
      linhas[i].set(j, (linhas[i].get(j) ?? 0) + v);
      linhas[j].set(i, (linhas[j].get(i) ?? 0) + v);
    }
  }
  for (let i = 0; i < n; i++) {
    const soma = [...linhas[i]].reduce((s, [, v]) => s + Math.abs(v), 0);
    linhas[i].set(i, soma + aleatorio() + 0.1);
  }
  const colunas = linhas.map((m) => [...m].sort((x, y) => x[0] - y[0]));
  const folga = 1e-4 * (1 + aleatorio());
  const diag = colunas.map((c, i) => c.find(([j]) => j === i)[1] + folga);
  const b = Array.from({ length: n }, () => (aleatorio() - 0.5) * 10 ** Math.floor(aleatorio() * 6 - 3));
  return { colunas, diag, folga, b };
}

describe('gradiente conjugado do alisamento do miolo', () => {
  it('dá a mesma solução de antes, componente a componente e bit a bit, em sistemas sorteados', () => {
    let maiorVoltas = 0;
    for (let semente = 1; semente <= 60; semente++) {
      const aleatorio = gerador(semente);
      const n = [0, 1, 2, 5, 17, 40, 120, 300][semente % 8];
      const { colunas, diag, folga, b } = sistema(aleatorio, n);
      const esperado = referencia(colunas, diag, folga, b, n);
      const obtido = gradienteConjugado(colunas, diag, folga, b);
      expect(obtido.length).toBe(n);
      for (let i = 0; i < n; i++) expect(Object.is(obtido[i], esperado.h[i]), `semente ${semente} componente ${i}: ${obtido[i]} contra ${esperado.h[i]}`).toBe(true);
      maiorVoltas = Math.max(maiorVoltas, esperado.voltas);
    }
    /* o sorteio exercita o laço de verdade, e não só a saída imediata */
    expect(maiorVoltas).toBeGreaterThan(10);
  });

  it('o alisamento do miolo dá as mesmas posições de antes, bit a bit, nos dois caminhos de montagem, em malhas sorteadas', () => {
    let comMovimento = 0; let comLivres = 0; let comPlaca = 0;
    for (let semente = 1; semente <= 36; semente++) {
      const aleatorio = gerador(500 + semente);
      const larg = 4 + (semente % 5); const alt = 4 + ((semente >> 1) % 4);
      const posicoes = [];
      for (let j = 0; j < alt; j++) for (let i = 0; i < larg; i++) {
        const dobra = 0.004 * Math.sin(i * 1.3 + semente) * Math.cos(j * 0.9);
        posicoes.push([i * 0.04 + (aleatorio() - 0.5) * 0.004, j * 0.04 + (aleatorio() - 0.5) * 0.004, dobra + (aleatorio() - 0.5) * 0.003]);
      }
      const faces = [];
      for (let j = 0; j < alt - 1; j++) for (let i = 0; i < larg - 1; i++) {
        if (semente % 3 === 0 && aleatorio() < 0.12) continue; /* tira algumas faces: valência diferente de 4 e bordas novas */
        faces.push([j * larg + i, j * larg + i + 1, (j + 1) * larg + i + 1, (j + 1) * larg + i]);
      }
      const usados = new Set(faces.flat());
      const livres = new Set(); const pulados = new Set();
      for (let v = 0; v < posicoes.length; v++) {
        const i = v % larg; const j = Math.floor(v / larg);
        const borda = i === 0 || j === 0 || i === larg - 1 || j === alt - 1;
        if (borda || !usados.has(v) || aleatorio() < 0.08) pulados.add(v); else if (aleatorio() < 0.9) livres.add(v);
      }
      const energia = semente % 4 === 0 ? 'placa' : 'variacao';
      const opcoes = { iteracoes: 1 + (semente % 3), energia, ...(semente % 5 === 0 ? { ancora: 1e-3 } : {}) };
      const esperado = alisarMioloNaNormalAntigo(posicoes, faces, livres, pulados, opcoes);
      for (const limiteDenso of [undefined, 0]) {
        const obtido = alisarMioloNaNormal(posicoes, faces, livres, pulados, { ...opcoes, ...(limiteDenso === undefined ? {} : { limiteDenso }) });
        expect(Object.is(obtido.deslocamentoMaximo, esperado.deslocamentoMaximo), `semente ${semente} deslocamento máximo`).toBe(true);
        expect(obtido.iteracoes).toBe(esperado.iteracoes);
        esperado.posicoes.forEach((p, v) => p.forEach((x, c) => {
          if (!Object.is(obtido.posicoes[v][c], x)) throw new Error(`semente ${semente} (limiteDenso ${limiteDenso}) ponto ${v} eixo ${c}: ${obtido.posicoes[v][c]} contra ${x}`);
        }));
      }
      if (esperado.deslocamentoMaximo > 0) comMovimento += 1;
      if (livres.size > 3) comLivres += 1;
      if (energia === 'placa') comPlaca += 1;
    }
    /* o sorteio mexe de verdade nos pontos, nas duas energias */
    expect(comMovimento).toBeGreaterThan(25);
    expect(comLivres).toBeGreaterThan(25);
    expect(comPlaca).toBeGreaterThan(5);
  });

  it('o alisamento de uma grade com um calombo continua sem mexer nos pulados e a tirar o calombo', () => {
    /* grade 7x7 plana com o ponto central erguido: os livres são o miolo, e o calombo desce */
    const lado = 7;
    const posicoes = []; const faces = [];
    for (let j = 0; j < lado; j++) for (let i = 0; i < lado; i++) posicoes.push([i * 0.04, j * 0.04, i === 3 && j === 3 ? 0.002 : 0]);
    for (let j = 0; j < lado - 1; j++) for (let i = 0; i < lado - 1; i++) faces.push([j * lado + i, j * lado + i + 1, (j + 1) * lado + i + 1, (j + 1) * lado + i]);
    const livres = new Set(); const pulados = new Set();
    for (let j = 0; j < lado; j++) for (let i = 0; i < lado; i++) { const v = j * lado + i; if (i === 0 || j === 0 || i === lado - 1 || j === lado - 1) pulados.add(v); else livres.add(v); }
    const saida = alisarMioloNaNormal(posicoes, faces, livres, pulados);
    for (const v of pulados) expect(saida.posicoes[v]).toEqual(posicoes[v]);
    expect(Math.abs(saida.posicoes[3 * lado + 3][2])).toBeLessThan(0.002);
  });
});
