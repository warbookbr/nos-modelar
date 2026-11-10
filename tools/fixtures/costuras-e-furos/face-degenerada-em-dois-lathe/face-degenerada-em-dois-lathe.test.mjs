/* Fixa o defeito de hoje (fatia 1 do plano "costuras e furos limpos"); a fatia 3 inverte os números marcados. */
import { describe, expect, it } from 'vitest';
import { adaptarThree } from '../../../../src/autoria/adaptar-three.js';
import { medirFaceDegenerada } from '../../../modelar/reguas-de-malha/face-degenerada.mjs';
import receita from './receita.js';
import { medirPeca } from '../medir.mjs';
import { gerarPassos } from '../tubos-em-t.js';

describe('face degenerada no unir com arredondarCostura de dois lathe', () => {
  const m = medirPeca(receita);

  it('DEFEITO: com o deitado de 195 mm sobra 1 face de três cantos colineares, sem órfão nem aresta solta, que o descrever aceita', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.faces).toBe(3636);
    expect(m.facesDegeneradas).toBe(1);
    const { faces } = medirFaceDegenerada(m.neutro);
    expect(faces[0].cantos).toBe(3);
    expect(faces[0].normal).toBeLessThan(1e-12);
  });

  it('o adaptador recusa justamente a face que a régua achou', () => {
    const { faces } = medirFaceDegenerada(m.neutro);
    expect(() => adaptarThree(m.neutro)).toThrow(new RegExp(`face ${faces[0].id} é degenerada`));
  });

  it('com 190 mm de comprimento a mesma peça sai sem face degenerada', () => {
    const sem = medirPeca({ PASSOS: gerarPassos({ ...receita.PARAMS, comprimento: 190 }), PARAMS: {} });
    expect(sem.facesDegeneradas).toBe(0);
  });
});
