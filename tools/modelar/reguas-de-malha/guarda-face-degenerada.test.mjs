/* O `guarda:acervo` recusa a peça com face degenerada (plano "costuras e furos limpos", fatia 3), pelo mesmo critério da régua e do `adaptarThree`. */
import { describe, expect, it } from 'vitest';
import { motivoDeFaceDegenerada } from '../guardas/guarda-acervo.mjs';

const forma = (pontos, vs) => ({ V: new Map(pontos.map((p, i) => [i + 1, p])), F: new Map([[7, { id: 7, vs, parte: 'tubo' }]]) });

describe('recusa de face degenerada no guarda:acervo', () => {
  it('três cantos colineares são recusados, com a face e a parte', () => {
    const motivo = motivoDeFaceDegenerada(forma([[0, 0, 0], [0.1, 0, 0], [0.2, 0, 0]], [1, 2, 3]));
    expect(motivo).toMatch(/1 FACE\(S\) DEGENERADA\(S\)/);
    expect(motivo).toMatch(/face 7 \(tubo, 3 cantos/);
  });
  it('um triângulo com área não é recusado', () => {
    expect(motivoDeFaceDegenerada(forma([[0, 0, 0], [0.1, 0, 0], [0, 0.1, 0]], [1, 2, 3]))).toBeNull();
  });
});
