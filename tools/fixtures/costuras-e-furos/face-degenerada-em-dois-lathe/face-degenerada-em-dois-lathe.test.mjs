/* A fatia 1 do plano "costuras e furos limpos" fixou 1 face de três cantos colineares nesta peça (o deitado de 195 mm), e a fatia 3 ia buscar a origem dela. A origem
   é a costura que o `unir` registrava incompleta (10 das 156 arestas, `tools/modelar/reguas-de-malha/costura-registrada.test.mjs`): o `arredondarCostura`
   fazia tubo curto com tampa nos restos, e a tampa dava a face. Com o registro inteiro a face some, e o aviso `faceLimite` também. Com o `unir` antigo, 179 e 182 mm
   davam a mesma face colinear; com o novo, ela some, e sobra 1 triângulo fino pelo piso da auditoria (defeito conhecido, medido em 179, 182, 190 e 195 mm). */
import { describe, expect, it } from 'vitest';
import { adaptarThree } from '../../../../src/autoria/adaptar-three.js';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { gerarPassos } from '../tubos-em-t.js';

const RESTO = 1;

describe('face degenerada no unir com arredondarCostura de dois lathe', () => {
  const m = medirPeca(receita);

  it('com o deitado de 195 mm a malha fecha sem face de três cantos colineares', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.faces).toBe(3503);
    expect(m.facesDegeneradas).toBe(RESTO); // defeito conhecido: 1 triângulo de dobro de área 4,3e-11 contra o limite de 5,0e-11 (área de 2,1e-11 m²), que já existia na main; o fator de um quinto do piso na partição não o tira
    expect(m.avisos).toEqual([]);
  });

  it('o adaptador aceita a malha', () => {
    expect(() => adaptarThree(m.neutro)).not.toThrow();
  });

  it.each([179, 182, 190])('com %i mm de comprimento sobra a mesma 1 face degenerada (defeito conhecido, anterior ao registro inteiro da costura)', (comprimento) => {
    const sem = medirPeca({ PASSOS: gerarPassos({ ...receita.PARAMS, comprimento }), PARAMS: {} });
    expect(sem.facesDegeneradas).toBe(RESTO);   // medido em 179, 182, 190 e 195 mm: sempre 1, de dobro de área entre 4,28e-11 e 4,33e-11
  });
});
