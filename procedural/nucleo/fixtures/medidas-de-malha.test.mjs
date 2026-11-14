/* medidas-de-malha.test.mjs — `distancias` para com erro quando não há triângulo a medir, em vez de abrir anéis de células para sempre. */
import { describe, expect, it } from 'vitest';
import { LIMITE_DE_VOLTAS, distancias } from './medidas-de-malha.js';

const TRI = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];

describe('distancias', () => {
  it('mede a distância de um ponto ao triângulo mais próximo', () => {
    expect(distancias([[0.25, 0.25, 0.5], [0.25, 0.25, 0]], [TRI], 0.1)).toEqual([expect.closeTo(0.5, 12), 0]);
  });

  it('sem triângulo nenhum, recusa na hora', () => {
    expect(() => distancias([[0, 0, 0]], [], 0.01)).toThrow(/sem triângulos para medir/);
  });

  it('o ponto longe demais do único triângulo recusa depois do limite de voltas, e o perto dele mede', () => {
    const celula = 0.01;
    expect(() => distancias([[0, 0, (LIMITE_DE_VOLTAS + 5) * celula]], [TRI], celula)).toThrow(new RegExp(`depois de ${LIMITE_DE_VOLTAS} voltas`));
    expect(distancias([[0, 0, 0.3]], [TRI], celula)[0]).toBeCloseTo(0.3, 12);
  });
});
