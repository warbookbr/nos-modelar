/* A fatia 4 do plano "costuras e furos limpos" inverteu o defeito: o `furo` refaz a face plana em anéis, e o tampo sai sem triângulo fino. */
import { describe, expect, it } from 'vitest';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { medirTrianguloFino } from '../../../modelar/reguas-de-malha/triangulo-fino.mjs';

describe('furo numa face plana', () => {
  const m = medirPeca(receita);

  it('a malha fecha, sem órfão nem face degenerada, com os nove furos (1032 faces: o tampo refeito em anéis)', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(m.faces).toBe(1032);
  });

  it('o tampo furado não tem triângulo fino: sobram 52, todos na tampa de trás do cilindro de 144 lados, que o furo não toca (eram 341)', () => {
    expect(m.triangulosFinos).toBe(52);
    expect(m.regioesComFinos).toBe(1);
    expect(m.piorRazao).toBeLessThan(60);
    const { porRegiao } = medirTrianguloFino(m.neutro);
    expect(porRegiao).toHaveLength(1);
    expect(porRegiao[0]).toMatchObject({ faces: 1, triangulos: 142, finos: 52 });
  });
});
