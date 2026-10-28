/* canto-colinear.test.js — perfil de extrusão com um vértice no meio de uma aresta (caso 2 do plano dos veículos).
   O polígono é válido; o leque do canto 0 o triangulava com um triângulo de área nula e o exportador o recusava. */
import { describe, expect, it } from 'vitest';
import { exportarObj } from '../src/index.js';
import { executarReceita } from '../../../src/autoria/executar-receita.js';

const receita = (perfil) => ({
  PASSOS: [
    ['extrusao', { origemId: 1, altura: 0.3, perfil }],
    ['parte', { nome: 'bloco', sel: { origem: { op: 'extrusao', id: 1 } } }],
  ],
});

describe('exportador OBJ e o canto colinear', () => {
  it('exporta o prisma de perfil com vértice colinear, com todos os triângulos de área positiva', async () => {
    const { neutro } = executarReceita(receita([[0, 0], [0.5, 0], [1, 0], [1, 0.4], [0, 0.4]]));
    const saida = await exportarObj({ nome: 'bloco', neutro, unidade: 'm' });
    expect(saida.diagnostico.totalVertices).toBe(10);
    /* dois pentágonos de 3 triângulos e cinco laterais de 2: 6 + 10 */
    expect(saida.diagnostico.totalTriangulos).toBe(16);

    const linhas = saida.texto.split('\n');
    const vertices = linhas.filter((l) => l.startsWith('v ')).map((l) => l.slice(2).split(' ').map(Number));
    const faces = linhas.filter((l) => l.startsWith('f ')).map((l) => l.slice(2).split(' ').map((t) => Number(t.split('/')[0]) - 1));
    expect(faces).toHaveLength(16);
    for (const [a, b, c] of faces) {
      const u = vertices[b].map((x, i) => x - vertices[a][i]);
      const v = vertices[c].map((x, i) => x - vertices[a][i]);
      const area = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
      expect(area).toBeGreaterThan(1e-6);
    }
  });

  it('o perfil sem vértice colinear continua com a triangulação de sempre', async () => {
    const { neutro } = executarReceita(receita([[0, 0], [1, 0], [1, 0.4], [0, 0.4]]));
    const saida = await exportarObj({ nome: 'bloco', neutro, unidade: 'm' });
    expect(saida.diagnostico.totalTriangulos).toBe(12);
  });

  it('ainda recusa a face que nenhuma triangulação salva', async () => {
    const V = new Map([[0, [0, 0, 0]], [1, [0.5, 0, 0]], [2, [1, 0, 0]]]);
    const F = new Map([[0, { id: 0, vs: [0, 1, 2], parte: 'reta' }]]);
    await expect(exportarObj({ nome: 'reta', neutro: { V, F }, unidade: 'm' })).rejects.toMatchObject({ codigo: 'face-degenerada' });
  });
});
