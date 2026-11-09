/* costura-registrada.test.mjs — a costura que o `unir` registra tem de ser a costura geométrica da malha que ele entrega (plano "costuras e furos limpos").
   Antes da correção o registro perdia as arestas dos diedros em que a sopa de triângulos da Manifold deixa um canto do meio quase colinear: na peça de prova
   dos dentes 145 de 154, e nas partes do braço 50, 66, 40 e 72 arestas a menos. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { receitaDeTubos } from '../../fixtures/costuras-e-furos/tubos-em-t.js';
import { costuraGeometrica, medirCosturaRegistrada } from './costura-registrada.mjs';

/* a peça até o `unir`, sem o `arredondarCostura`: o arredondamento corta as faces e muda as arestas */
function ateOUnir(receita) {
  const passos = receita.PASSOS;
  const fim = passos.findIndex((p) => p[0] === 'arredondarCostura');
  return { ...receita, PASSOS: passos.slice(0, fim), origem: passos[fim][1].de.id };
}

function medir(receita) {
  const { origem, ...cortada } = ateOUnir(receita);
  const { neutro } = executarReceita(cortada);
  return medirCosturaRegistrada(neutro, origem);
}

describe('régua da costura registrada', () => {
  it('a costura geométrica são as arestas entre faces de operandos diferentes', () => {
    const V = new Map([[1, [0, 0, 0]], [2, [1, 0, 0]], [3, [0, 1, 0]], [4, [0, 0, 1]]]);
    const F = new Map([[10, { id: 10, vs: [1, 2, 3] }], [11, { id: 11, vs: [2, 1, 4] }], [12, { id: 12, vs: [1, 3, 4] }]]);
    expect([...costuraGeometrica({ V, F }, { donos: { 10: 0, 11: 1, 12: 1 } })].sort()).toEqual(['1|2', '1|3']);
  });

  it('a peça de prova dos dentes registra as 154 arestas da costura, e nenhuma a mais', () => {
    const m = medir(receitaDeTubos('x', 'x', { avanco: 0.05 }));
    expect(m.geometricas).toBe(154);
    expect(m.perdidas).toEqual([]);
    expect(m.sobras).toEqual([]);
  });

  it.each([2, 3, 10])('o T de tubos de 40 mm com 96 lados registra a costura inteira (raio de arredondamento %i mm, que não entra na união)', (raio) => {
    const m = medir(receitaDeTubos('x', 'x', { raio: 20, alturaDoEixo: 60, comprimento: 40, avanco: 0, chanfro: 0.5, lados: 96, raioDoEncontro: raio, raioMinimo: raio / 3, afinarPontas: 4 * raio }));
    expect(m.perdidas).toEqual([]);
    expect(m.sobras).toEqual([]);
  });

  it.each(['braco', 'antebraco', 'elo-punho-4', 'elo-punho-5'])('a parte %s do braço registra a costura inteira', async (parte) => {
    const { default: receita } = await import(`../../../procedural/pecas/braco-robotico/partes/${parte}/receita.js`);
    const m = medir(receita);
    expect(m.registradas).toBeGreaterThan(100);
    expect(m.perdidas).toEqual([]);
    expect(m.sobras).toEqual([]);
  }, 60_000);
});
