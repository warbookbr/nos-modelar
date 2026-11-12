/* A recusa de casca aberta no `guarda:acervo` (plano "costuras e furos limpos", fatia 3): o critério é o de `analisarTopologia` (`casca-aberta`, `aresta-nao-manifold`), e só o passo que declara
   superfície aberta é dispensado. Também a face de menos de 3 cantos entra na régua de face degenerada, como o adaptador a recusa. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../../procedural/nucleo/nucleo.js';
import { motivoDeCascaAberta, motivoDeFaceDegenerada } from '../guardas/guarda-acervo.mjs';

const executa = (passos) => nucleo(passos, {}, {}, {}, null, []);
const cubo = ['cubo', { origemId: 1, lado: 1 }];
const tira = (extra = {}) => ['lathe', { origemId: 2, lados: 8, perfil: [[0.1, 0], [0.2, 0.3], [0.15, 0.5]], ...extra }];

describe('recusa de casca aberta no guarda:acervo', () => {
  it('o sólido fechado passa', () => {
    expect(motivoDeCascaAberta(executa([cubo]), [cubo])).toBeNull();
  });
  it('a casca aberta de um passo sem declaração é recusada, com a aresta', () => {
    const passos = [cubo, ['apagaFace', { sel: { origem: { op: 'cubo', id: 1, face: 'topo' } } }]];
    const forma = executa(passos);
    expect(forma.orfaos).toEqual([]);
    expect(motivoDeCascaAberta(forma, passos)).toMatch(/ARESTA\(S\) DE CASCA ABERTA/);
  });
  it('o lathe com superficie: true é dispensado, e o mesmo perfil como sólido recusado', () => {
    const aberta = [tira({ superficie: true })];
    expect(motivoDeCascaAberta(executa(aberta), aberta)).toBeNull();
    const semDeclarar = [tira()];
    const forma = executa(semDeclarar);
    expect(forma.orfaos.length).toBeGreaterThan(0);
  });
  it('a dispensa vale só para as faces do passo que declarou: a face do cubo ao lado continua conferida', () => {
    const passos = [tira({ superficie: true }), ['cubo', { origemId: 3, lado: 1, em: [2, 0, 0] }], ['apagaFace', { sel: { origem: { op: 'cubo', id: 3, face: 'topo' } } }]];
    const forma = executa(passos);
    expect(forma.orfaos).toEqual([]);
    expect(motivoDeCascaAberta(forma, passos)).toMatch(/ARESTA\(S\) DE CASCA ABERTA/);
  });
  it('a face de menos de 3 cantos entra na régua de face degenerada, como o adaptador a recusa', () => {
    const V = new Map([[1, [0, 0, 0]], [2, [1, 0, 0]]]);
    expect(motivoDeFaceDegenerada({ V, F: new Map([[1, { id: 1, vs: [1, 2] }]]) })).toMatch(/1 FACE\(S\) DEGENERADA\(S\)/);
  });
});
