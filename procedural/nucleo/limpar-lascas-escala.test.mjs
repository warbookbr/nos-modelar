/* limpar-lascas-escala.test.mjs — o piso de área da limpeza segue a escala da peça, e não a da seleção (atrito 11 do RECEITA.md do sedã).
 *
 * A medida de contatos tria o sólido que mede, e a face abaixo de 1e-9 vezes o quadrado da meia diagonal da caixa dele não tem triangulação: o sólido sai
 * inconclusivo em todo par. A auditoria de uma montagem mede a instância inteira, e o relato por parte mede cada parte; o `aparar` limpava com a caixa da
 * seleção (a travessa de 1,7 m), e uma face de 4,9e-9 m² passava para a instância de 4,8 m, em que o piso é 6e-9. A fixture é a vizinhança de duas voltas dessa
 * face (33 faces da travessa do painel). Sem domínio de objeto: o que se prova é a escala do piso e a face que sai com ele. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { limparLascas } from './limpar-lascas.js';
import { areaMinimaDe, diagonalDaPeca, limparNoEstado } from './operacoes/limpar-lascas.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/lasca-na-escala-da-peca.json', import.meta.url), 'utf8'));
const malha = () => ({ V: new Map(fx.vertices.map((p, i) => [i, p])), F: new Map(fx.faces.map((f, i) => [i, { vs: [...f.vs], parte: f.parte }])) });
const area = (m, f) => { const p = m.F.get(f).vs.map((v) => m.V.get(v)); let n = [0, 0, 0]; for (let k = 0; k < p.length; k++) { const a = p[k]; const b = p[(k + 1) % p.length]; n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])]; } return Math.hypot(...n) / 2; };
const diagonal = (pontos) => { const lo = [Infinity, Infinity, Infinity]; const hi = [-Infinity, -Infinity, -Infinity]; for (const p of pontos) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } return Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); };
const TOLERANCIA = 6e-6 * 1.72;

describe('o piso de área da limpeza é o da peça', () => {
  it('areaMinimaDe lê a caixa de todo vértice do estado, e a seleção não entra na conta', () => {
    const V = new Map([[0, [0, 0, 0]], [1, [0.01, 0, 0]], [2, [0, 0.01, 0]], [3, [4, 1, 2]]]);
    const F = new Map([[0, { vs: [0, 1, 2] }]]);
    const meia = Math.hypot(4, 1, 2) / 2;
    expect(areaMinimaDe({ V, F }, new Set([0]))).toBeCloseTo(4e-9 * meia * meia, 20);
    expect(areaMinimaDe({ V: new Map(), F: new Map() }, new Set())).toBe(0);
  });

  it('o piso com margem de 4 é quatro vezes o da medida de contatos, 1e-9 vezes o quadrado da meia diagonal do sólido, na caixa da vizinhança', () => {
    const m = malha();
    const meia = diagonal([...m.V.values()]) / 2;
    expect(areaMinimaDe({ V: m.V, F: m.F }, new Set()) / (1e-9 * meia * meia)).toBeCloseTo(4, 6);
  });

  it('com a caixa da seleção a face de 4,9e-9 m² fica; com a da peça (4,8 m de diagonal) ela sai, dentro da tolerância e sem lasca nova', () => {
    const alvo = fx.alvos[0];
    expect(area(malha(), alvo)).toBeGreaterThan(4e-9);
    expect(area(malha(), alvo)).toBeLessThan(6e-9);
    const daSelecao = 4e-9 * (diagonal([...malha().V.values()]) / 2) ** 2;
    const daPeca = 4e-9 * (4.77 / 2) ** 2;
    const sem = limparLascas(malha(), { tolerancia: TOLERANCIA, areaMinima: daSelecao });
    expect(sem.facesRemovidas.has(alvo)).toBe(false);
    const m = malha();
    const com = limparLascas(m, { tolerancia: TOLERANCIA, areaMinima: daPeca });
    expect(com.facesRemovidas.has(alvo)).toBe(true);
    expect(com.relatorio.desvioMaximo).toBeLessThan(TOLERANCIA);
    for (const [f, vs] of com.faces) expect(area({ V: m.V, F: new Map([[f, { vs }]]) }, f)).toBeGreaterThan(0);
    expect(com.relatorio.finasDepois).toBeLessThan(sem.relatorio.finasDepois);
  });
});

/* O `aparar` deriva a tolerância da limpeza da diagonal do sólido aparado (6e-6 dela): a travessa de 1,7 m dava 10 µm numa lataria de 4,8 m, e o triângulo de 0,15 mm de aresta
   de um reforço (área 3e-9 m², abaixo do piso de 5,7e-9 da instância) ficava, com a recusa de "passaria da tolerância". A fixture é a vizinhança de duas voltas dele (26 faces). */
describe('a tolerância de limpeza do aparar é a da peça', () => {
  const fx2 = JSON.parse(readFileSync(new URL('./fixtures/lasca-na-tolerancia-da-peca.json', import.meta.url), 'utf8'));
  /* o estado com a vizinhança e um vértice longe, que dá à peça a diagonal de 4,8 m sem tocar a vizinhança; nenhuma face a mais */
  const estado = () => {
    const V = new Map(fx2.vertices.map((p, i) => [i, p]));
    V.set(10_000, [1.4, 0.2, 1.9]); V.set(10_001, [-0.6, 0.2, -2.7]);
    return { V, F: new Map(fx2.faces.map((f, i) => [i, { vs: [...f.vs], parte: f.parte }])), pesos: new Map(), merges: [], consumidas: new Map(), origens: new Map(), avisos: [] };
  };
  const faces = (st) => new Set(st.F.keys());
  const alvo = fx2.alvos[0];
  const TOL_DA_TRAVESSA = 6e-6 * 1.72;

  it('a diagonal da peça é a do estado inteiro', () => {
    expect(diagonalDaPeca(estado())).toBeGreaterThan(4.7);
    expect(diagonalDaPeca({ V: new Map() })).toBe(0);
  });

  it('o aparar limpa com o maior entre a tolerância do sólido e 6e-6 da diagonal da peça, e a face sai; o limparLascas com a tolerância dada não muda', () => {
    const doAparar = estado();
    limparNoEstado(doAparar, faces(doAparar), { tolerancia: TOL_DA_TRAVESSA, areaMinima: areaMinimaDe(doAparar), i: 0, op: 'aparar' });
    expect(doAparar.F.has(alvo)).toBe(false);
    const doLimpar = estado();
    limparNoEstado(doLimpar, faces(doLimpar), { tolerancia: TOL_DA_TRAVESSA, areaMinima: areaMinimaDe(doLimpar), i: 0, op: 'limparLascas' });
    expect(doLimpar.F.has(alvo)).toBe(true);
    expect(doLimpar.avisos.some((a) => a.ref === 'lascasRestantes')).toBe(true);
  });
});
