/* O `guarda:acervo` recusa a peça com face degenerada (plano "costuras e furos limpos", fatia 3), pelo mesmo critério da régua e do `adaptarThree`. */
import { describe, expect, it } from 'vitest';
import { avisoDeFaceSoNaPecaInteira, motivoDeFaceDegenerada } from '../guardas/guarda-acervo.mjs';

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

  it('a peça de duas escalas passa sozinha e sai com aviso, com a face e os dois pisos', () => {
    /* parte pequena com um triângulo de catetos 3e-6 e 1e-3 (dobro da área 3e-9) e parte grande de catetos 3 e 4 */
    const V = new Map([[1, [0, 0, 0]], [2, [3e-6, 0, 0]], [3, [0, 1e-3, 0]], [4, [0, 0, 0]], [5, [3, 0, 0]], [6, [0, 4, 0]]]);
    const F = new Map([[7, { id: 7, vs: [1, 2, 3], parte: 'pequena' }], [8, { id: 8, vs: [4, 5, 6], parte: 'grande' }]]);
    expect(motivoDeFaceDegenerada({ V, F })).toBeNull();
    const aviso = avisoDeFaceSoNaPecaInteira({ V, F });
    expect(aviso).toMatch(/1 FACE\(S\) ABAIXO DO PISO DA PEÇA INTEIRA/);
    expect(aviso).toMatch(/face 7 \(pequena, 3 cantos, dobro da área 3\.00e-9 m², piso da peça inteira 1\.25e-8, piso da parte /);
    expect(aviso).toMatch(/passa sozinha.*inconclusiva/s);
  });
  it('sem face abaixo do piso da peça inteira não há aviso', () => {
    expect(avisoDeFaceSoNaPecaInteira(forma([[0, 0, 0], [0.1, 0, 0], [0, 0.1, 0]], [1, 2, 3]))).toBeNull();
  });
});
