/* adaptar-three.test.js — a malha da cena carrega de qual vértice neutro cada
   posição veio, que é o que permite a edição devolver o movimento à malha. */
import { describe, expect, it } from 'vitest';
import { adaptarThree } from './adaptar-three.js';

describe('adaptarThree — identidade transitória de face', () => {
  it('carrega em cada triângulo o id da face neutra que o originou', () => {
    const neutro = {
      V: new Map([
        [10, [0, 0, 0]], [11, [1, 0, 0]], [12, [1, 1, 0]], [13, [0, 1, 0]],
      ]),
      F: new Map([[42, { id: 42, parte: 'chapa', vs: [10, 11, 12, 13] }]]),
      partes: { chapa: {} },
      orfaos: [],
    };

    const { partes } = adaptarThree(neutro);
    const malha = partes.get('chapa').children[0];
    const origem = malha.geometry.getAttribute('origemFace');
    const vertices = malha.geometry.getAttribute('origemVertice');

    expect(origem).toBeDefined();
    expect([...origem.array]).toEqual([42, 42, 42, 42, 42, 42]);
    expect(vertices.count).toBe(6);
    expect(new Set(vertices.array)).toEqual(new Set([10, 11, 12, 13]));
    expect(malha.userData.faces).toEqual([42]);
  });
});
