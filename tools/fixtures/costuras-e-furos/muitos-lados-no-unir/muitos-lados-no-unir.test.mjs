/* A fatia 1 do plano "costuras e furos limpos" fixou a recusa ("não cabe no vértice 2048 da costura") e 1 órfão com 224 lados. A causa era o registro da costura
   do `unir`, que perdia 16 das 242 arestas (`tools/modelar/reguas-de-malha/costura-registrada.test.mjs`); com a costura inteira o arredondamento fecha. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { medirCosturaRegistrada } from '../../../modelar/reguas-de-malha/costura-registrada.mjs';

describe('dois lathe de muitos lados no unir com arredondarCostura', () => {
  it('com 224 lados o arredondamento fecha, sem órfão, sem aresta solta e sem face degenerada', () => {
    const m = medirPeca(receita);
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.faces).toBe(5197);
    expect(m.facesDeCostura).toBe(2537);
    expect(m.facesDegeneradas).toBe(0);
    expect(m.pontasDeSerra).toBe(8);
  });

  it('o unir registra as 242 arestas da costura (registrava 226)', () => {
    const passos = receita.PASSOS;
    const fim = passos.findIndex((p) => p[0] === 'arredondarCostura');
    const { neutro } = executarReceita({ ...receita, PASSOS: passos.slice(0, fim) });
    const c = medirCosturaRegistrada(neutro, passos[fim][1].de.id);
    expect(c.geometricas).toBe(242);
    expect(c.perdidas).toEqual([]);
  });
});
