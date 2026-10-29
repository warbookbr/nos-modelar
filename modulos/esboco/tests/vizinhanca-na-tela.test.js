/* O que cada lado de uma linha mostra (`vizinhanca-na-tela.js`): a linha só é aresta onde a superfície que se vê de um lado difere da do
   outro, pela silhueta contra o fundo, pelo vinco (mais de 30 graus) ou pelo degrau de profundidade. */
import { describe, expect, it } from 'vitest';
import { oclusaoExata } from '../src/oclusao-das-linhas.js';
import { COSSENO_DO_VINCO, DEGRAU_DE_PROFUNDIDADE, FOLGA_DO_VINCO } from '../src/limites-do-desenho.js';
import { arestasPelaVizinhanca } from '../src/vizinhanca-na-tela.js';

const V = { p: (q) => [q[0], q[1]] };
const olho = [0, 0, 1];
const opcoes = { delta: 0.01, passo: 10, cosseno: COSSENO_DO_VINCO - FOLGA_DO_VINCO, degrau: DEGRAU_DE_PROFUNDIDADE };

/* dois quadrados lado a lado, [0, 50] e [50, 100] em x, com as normais e a altura dadas */
function dois({ zB = 5, nB = [0, 0, 1], zA = 5, nA = [0, 0, 1] }) {
  const vertices = [[0, 0, zA], [50, 0, zA], [50, 100, zA], [0, 100, zA], [50, 0, zB], [100, 0, zB], [100, 100, zB], [50, 100, zB]];
  const faces = [{ ids: [0, 1, 2], n: nA }, { ids: [0, 2, 3], n: nA }, { ids: [4, 5, 6], n: nB }, { ids: [4, 6, 7], n: nB }];
  return oclusaoExata(faces, V, olho, { vertices }).superficieEm;
}
const emenda = [[[50, 10, 0], [50, 90, 0]]];

describe('arestasPelaVizinhanca', () => {
  it('a emenda de duas faces no mesmo plano não é aresta', () => {
    expect(arestasPelaVizinhanca(emenda, V, dois({}), opcoes)).toEqual([]);
  });

  it('o degrau de profundidade a mais que o limite é aresta, e a menos não é', () => {
    expect(arestasPelaVizinhanca(emenda, V, dois({ zB: 5.2 }), opcoes)).toHaveLength(1);
    expect(arestasPelaVizinhanca(emenda, V, dois({ zB: 5.02 }), opcoes)).toEqual([]);
  });

  it('o vinco passa a ser aresta acima de 30 graus, e o de exatamente 30 não é', () => {
    const inclinada = (graus) => { const t = (graus * Math.PI) / 180; return [Math.sin(t), 0, Math.cos(t)]; };
    /* a face da direita inclinada em torno do eixo y, sem degrau no encontro (a profundidade em x = 50 é a mesma) */
    const com = (graus) => dois({ nB: inclinada(graus) });
    expect(arestasPelaVizinhanca(emenda, V, com(40), opcoes)).toHaveLength(1);
    expect(arestasPelaVizinhanca(emenda, V, com(20), opcoes)).toEqual([]);
    expect(arestasPelaVizinhanca(emenda, V, com(30), opcoes)).toEqual([]);
  });

  it('a silhueta contra o fundo é aresta, e a linha solta no vazio não', () => {
    const sup = dois({});
    expect(arestasPelaVizinhanca([[[0, 10, 0], [0, 90, 0]]], V, sup, opcoes)).toHaveLength(1);
    expect(arestasPelaVizinhanca([[[200, 10, 0], [200, 90, 0]]], V, sup, opcoes)).toEqual([]);
  });

  it('corta a linha onde a decisão muda ao longo dela', () => {
    /* a vizinha só tem metade da altura da emenda: de y = 10 a 40 as duas faces são uma, e acima de y = 40 a linha é o contorno */
    const vertices = [[0, 0, 5], [50, 0, 5], [50, 100, 5], [0, 100, 5], [50, 0, 5], [100, 0, 5], [100, 40, 5], [50, 40, 5]];
    const faces = [{ ids: [0, 1, 2], n: [0, 0, 1] }, { ids: [0, 2, 3], n: [0, 0, 1] }, { ids: [4, 5, 6], n: [0, 0, 1] }, { ids: [4, 6, 7], n: [0, 0, 1] }];
    const { superficieEm } = oclusaoExata(faces, V, olho, { vertices });
    const saida = arestasPelaVizinhanca([[[50, 10, 0], [50, 90, 0]]], V, superficieEm, { ...opcoes, passo: 8 });
    expect(saida).toHaveLength(1);
    expect(saida[0][0][1]).toBeCloseTo(40, 1);
    expect(saida[0][1][1]).toBeCloseTo(90, 9);
  });
});
