/* paineis-por-vaos-grande.test.ts — o ajudante numa chapa de mais de 130 mil faces (lento: está em tools/testes-lentos.mjs). O que ele prova: a caixa da chapa lida por laço, e não por
   `Math.min(...lista)`, que estoura a pilha a partir de uns 120 mil vértices; e o mesmo resultado nos dois modos. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { paineisPorVaos } from './paineis-por-vaos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';

const N = 9;
const vertices: number[][] = []; const faces: number[][] = [];
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = -200 + (400 * i) / (N - 1); const z = -200 + (400 * j) / (N - 1); vertices.push([x, -(x * x) / 600, z]); }
for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const a = i * N + j; faces.push([a, a + 1, a + N + 1, a + N]); }
const CHAPA = { passos: [['subdivisao', { origemId: 1, vertices, faces, niveis: 5, espessura: 1 }]], origem: { op: 'subdivisao', id: 1 } };

describe('paineisPorVaos numa chapa de mais de 130 mil faces', () => {
  it('não estoura a pilha e parte a chapa em dois painéis', () => {
    const st = nucleo(CHAPA.passos, {}, {});
    expect(st.F.size).toBeGreaterThan(130000);
    const g = paineisPorVaos({ chapa: CHAPA, vao: 4, linhas: [{ eixo: 'y', pontos: [[0, -300], [0, 300]] }], paineis: [{ nome: 'e', eixo: 'y', ponto: [-100, 0] }, { nome: 'd', eixo: 'y', ponto: [100, 0] }] });
    expect(g.medidas.paineisAchados).toBe(2);
    expect(g.medidas.pedacos).toBe(2);
  }, 600_000);
});
