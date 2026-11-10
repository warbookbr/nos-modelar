/* Fixa o defeito de hoje (fatia 1 do plano "costuras e furos limpos"); a fatia 4 inverte os números marcados. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { medirTrianguloFino } from '../../../modelar/reguas-de-malha/triangulo-fino.mjs';

describe('furo numa face plana', () => {
  const m = medirPeca(receita);

  it('a malha fecha, sem órfão nem face degenerada, com os nove furos (638 faces)', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(m.faces).toBe(638);
  });

  it('DEFEITO: o tampo refeito em leques tem 341 triângulos finos em 2 regiões planas, o pior de razão 5917, e a região do tampo concentra o maior número', () => {
    expect(m.triangulosFinos).toBe(341);
    expect(m.regioesComFinos).toBe(2);
    expect(m.piorRazao).toBeGreaterThan(5900);
    expect(m.piorRazao).toBeLessThan(5930);
    const { porRegiao } = medirTrianguloFino(m.neutro);
    expect(porRegiao[0].faces).toBeGreaterThan(300);
    expect(porRegiao[0].finos).toBeGreaterThan(280);
  });
});
