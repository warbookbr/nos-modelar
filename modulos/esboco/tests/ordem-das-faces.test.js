/* ordem-das-faces.test.js — `ordemDasFaces` com a caixa de cada face na tela dá a mesma ordem que a conta de antes.
 *
 * A função ordena as faces laterais de um perfil côncavo do fundo para a frente, e para isso recortava cada par de faces uma pela
 * outra (n² recortes de polígonos). Duas faces cujas caixas na tela estão separadas por mais de 1e-3 mm não se cobrem, o recorte
 * delas era vazio e o laço o descartava; agora o par nem é recortado. Esta é a conta de antes, copiada, contra a de agora, nas faces
 * de toda forma dos esboços da pasta de fixtures (nas sete vistas, com as fatias do desenho e sem elas), nas faces de polígonos
 * côncavos sorteados e nas de prismas sorteados: a ordem sai igual em todos. */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fatiarForma, ordemDasFaces, resolverOpcao, VISTAS } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalizar = (v) => { const m = Math.hypot(...v) || 1; return v.map((c) => c / m); };

/* a conta de antes, sem a caixa na tela */
function ordemDeAntes(lados, olho) {
  const n = lados.length;
  if (n < 2) return lados.map((_, i) => i);
  const apoio = Math.abs(olho[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const S = normalizar([olho[1] * apoio[2] - olho[2] * apoio[1], olho[2] * apoio[0] - olho[0] * apoio[2], olho[0] * apoio[1] - olho[1] * apoio[0]]);
  const T = [olho[1] * S[2] - olho[2] * S[1], olho[2] * S[0] - olho[0] * S[2], olho[0] * S[1] - olho[1] * S[0]];
  const tela = lados.map((l) => l.pts.map((p) => [dot(p, S), dot(p, T)]));
  const anti = (poli) => (poli.reduce((a, q, i) => a + q[0] * poli[(i + 1) % poli.length][1] - poli[(i + 1) % poli.length][0] * q[1], 0) >= 0 ? poli : [...poli].reverse());
  const polis = tela.map(anti);
  const recortar = (sujeito, clip) => {
    let saida = sujeito;
    for (let i = 0; i < clip.length && saida.length > 0; i++) {
      const a = clip[i]; const b = clip[(i + 1) % clip.length];
      const lado = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const entrada = saida; saida = [];
      for (let j = 0; j < entrada.length; j++) {
        const p = entrada[j]; const q = entrada[(j + 1) % entrada.length];
        const dp = lado(p); const dq = lado(q);
        if (dp >= 0) saida.push(p);
        if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) { const t = dp / (dp - dq); saida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
      }
    }
    return saida;
  };
  const profundidade = (l, q) => {
    const den = dot(l.n, olho);
    return (dot(l.n, l.pts[0]) - q[0] * dot(l.n, S) - q[1] * dot(l.n, T)) / den;
  };
  const antes = Array.from({ length: n }, () => new Set());
  const grau = new Array(n).fill(0);
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const inter = recortar(polis[a], polis[b]);
      if (inter.length < 3) continue;
      const area = Math.abs(inter.reduce((acc, q, i) => acc + q[0] * inter[(i + 1) % inter.length][1] - inter[(i + 1) % inter.length][0] * q[1], 0)) / 2;
      if (area < 1e-6) continue;
      const c = [inter.reduce((acc, q) => acc + q[0], 0) / inter.length, inter.reduce((acc, q) => acc + q[1], 0) / inter.length];
      const d = profundidade(lados[a], c) - profundidade(lados[b], c);
      if (Math.abs(d) < 1e-9) continue;
      const [longe, perto] = d < 0 ? [a, b] : [b, a];
      if (!antes[longe].has(perto)) { antes[longe].add(perto); grau[perto]++; }
    }
  }
  const centro = lados.map((l) => l.pts.reduce((acc, p) => acc + dot(p, olho), 0) / l.pts.length);
  const ordem = [];
  const feito = new Array(n).fill(false);
  for (let k = 0; k < n; k++) {
    let escolha = -1;
    for (let i = 0; i < n; i++) if (!feito[i] && grau[i] === 0 && (escolha < 0 || centro[i] < centro[escolha])) escolha = i;
    if (escolha < 0) for (let i = 0; i < n; i++) if (!feito[i] && (escolha < 0 || centro[i] < centro[escolha])) escolha = i;
    feito[escolha] = true; ordem.push(escolha);
    for (const q of antes[escolha]) grau[q]--;
  }
  return ordem;
}

/* um gerador de números sem acaso: o mesmo sorteio em toda rodada */
function sorteio(semente) {
  let s = semente >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const olhoDe = (nome) => normalizar(VISTAS[nome].olho);
const pasta = new URL('./fixtures/', import.meta.url);
const esbocos = readdirSync(pasta).filter((n) => n.endsWith('.esboco.json')).sort();

describe('a ordem das faces com a caixa na tela', () => {
  it('é a de antes nas faces de toda forma das fixtures, em todas as vistas', () => {
    let comparados = 0; let comMaisDeUma = 0;
    for (const nome of esbocos) {
      const e = expandirEsboco(JSON.parse(readFileSync(new URL(nome, pasta), 'utf8')));
      for (const o of e.opcoes) {
        const formas = resolverOpcao(o, 'opção', e.pontos);
        for (const r of formas) {
          for (const vista of Object.keys(VISTAS)) {
            const olho = olhoDe(vista);
            for (const semFatias of [true, false]) {
              let chunks;
              try { chunks = fatiarForma(r, olho, { semFatias, esquadrar: true }); } catch { continue; }
              const lados = chunks.flatMap((ch) => ch.lados);
              if (lados.length < 2 || lados.length > 400) continue;
              expect(ordemDasFaces(lados, olho), `${nome} ${r.id} ${vista}`).toEqual(ordemDeAntes(lados, olho));
              comparados += 1; if (lados.length > 8) comMaisDeUma += 1;
            }
          }
        }
      }
    }
    expect(comparados).toBeGreaterThan(500);
    expect(comMaisDeUma).toBeGreaterThan(100);
  }, 120_000);

  it('é a de antes em faces sorteadas, com prismas côncavos e conjuntos de quadriláteros soltos', () => {
    const rnd = sorteio(20261028);
    let comparados = 0;
    for (let caso = 0; caso < 400; caso++) {
      const olho = normalizar([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]);
      const n = 2 + Math.floor(rnd() * 40);
      const lados = [];
      if (caso % 2 === 0) {
        /* faces laterais de um prisma de perfil estrelado: côncavo, o caso para o qual a função existe */
        const pontas = 3 + Math.floor(rnd() * 8);
        const perfil = Array.from({ length: 2 * pontas }, (_, k) => { const ang = (Math.PI * k) / pontas; const raio = k % 2 === 0 ? 20 + rnd() * 10 : 8 + rnd() * 6; return [raio * Math.cos(ang), raio * Math.sin(ang)]; });
        const altura = 5 + rnd() * 60;
        for (let k = 0; k < perfil.length; k++) {
          const a = perfil[k]; const d = perfil[(k + 1) % perfil.length];
          const normal = normalizar([d[1] - a[1], -(d[0] - a[0]), 0]);
          if (dot(normal, olho) <= 1e-6) continue;
          lados.push({ pts: [[a[0], a[1], 0], [d[0], d[1], 0], [d[0], d[1], altura], [a[0], a[1], altura]], n: normal });
        }
      } else {
        /* quadriláteros soltos, em posições e inclinações sorteadas: caixas separadas e sobrepostas */
        for (let k = 0; k < n; k++) {
          const c = [rnd() * 200 - 100, rnd() * 200 - 100, rnd() * 200 - 100];
          const u = normalizar([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]);
          const v = normalizar([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]);
          const w = 5 + rnd() * 50; const h = 5 + rnd() * 50;
          const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => [c[0] + s * w * u[0] + t * h * v[0], c[1] + s * w * u[1] + t * h * v[1], c[2] + s * w * u[2] + t * h * v[2]]);
          const normal = normalizar([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
          if (Math.abs(dot(normal, olho)) < 0.05) continue;
          lados.push({ pts, n: normal });
        }
      }
      if (lados.length < 2) continue;
      expect(ordemDasFaces(lados, olho), `caso ${caso}`).toEqual(ordemDeAntes(lados, olho));
      comparados += 1;
    }
    expect(comparados).toBeGreaterThan(300);
  });
});
