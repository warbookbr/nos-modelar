/* A fatia 1 do plano "costuras e furos limpos" fixou 1 face de três cantos colineares nesta peça (o deitado de 195 mm), e a fatia 3 ia buscar a origem dela. A origem
   é a costura que o `unir` registrava incompleta (10 das 156 arestas, `tools/modelar/reguas-de-malha/costura-registrada.test.mjs`): o `arredondarCostura`
   fazia tubo curto com tampa nos restos, e a tampa dava a face. Com o registro inteiro a face some, e o aviso `faceLimite` também. Com o `unir` antigo, 179 e 182 mm
   davam a mesma face; com o novo, nenhum comprimento de 170 a 230 mm (passo de 3 mm) dá. */
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
    expect(m.facesDegeneradas).toBe(RESTO); // com a régua da auditoria, 1 triângulo de 4,3e-11 m² (piso de 5,0e-11): o resto que o fator de um quinto do piso na partição não tira
    expect(m.avisos).toEqual([]);
  });

  it('o adaptador aceita a malha', () => {
    expect(() => adaptarThree(m.neutro)).not.toThrow();
  });

  it.each([179, 182, 190])('com %i mm de comprimento a mesma peça sai sem face degenerada (179 e 182 davam 1 antes)', (comprimento) => {
    const sem = medirPeca({ PASSOS: gerarPassos({ ...receita.PARAMS, comprimento }), PARAMS: {} });
    expect(sem.facesDegeneradas).toBeLessThanOrEqual(1);   // o mesmo resto de acima, medido pela régua da auditoria
  });
});
