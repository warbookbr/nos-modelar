/* proximidade.test.mjs — as contas de proximidade do cabo contra um sólido conhecido: um cubo de 20 mm de aresta, de 0 a 20 mm em cada eixo. */
import { describe, expect, it } from 'vitest';
import { amostrarLinha, estaDentro, folgaAoSolido, pontoMaisFundo, pousoDaPonta } from './proximidade.js';

const P = [[0, 0, 0], [20, 0, 0], [20, 20, 0], [0, 20, 0], [0, 0, 20], [20, 0, 20], [20, 20, 20], [0, 20, 20]].map((q) => q.map((v) => v / 1000));
const quad = (a, b, c, d) => [[P[a], P[b], P[c]], [P[a], P[c], P[d]]];
const cubo = { triangulos: [...quad(0, 3, 2, 1), ...quad(4, 5, 6, 7), ...quad(0, 1, 5, 4), ...quad(2, 3, 7, 6), ...quad(1, 2, 6, 5), ...quad(3, 0, 4, 7)] };

describe('proximidade', () => {
  it('estaDentro separa o dentro do fora', () => {
    expect(estaDentro(cubo, [0.01, 0.01, 0.01])).toBe(true);
    expect(estaDentro(cubo, [0.03, 0.01, 0.01])).toBe(false);
  });

  it('o pouso no centro da face +x tem desvio zero, e 3 mm para o lado dá o desvio em z', () => {
    expect(pousoDaPonta(cubo, [0.02, 0.01, 0.01], [1, 0, 0])).toMatchObject({ achou: true, desvioMm: [0, 0, 0], anguloGraus: 0, centroide: [20, 10, 10] });
    expect(pousoDaPonta(cubo, [0.02, 0.01, 0.013], [1, 0, 0]).desvioMm).toEqual([0, 0, 3]);
    expect(pousoDaPonta(cubo, [0.02, 0.01, 0.01], [-1, 0, 0]).anguloGraus).toBe(180);
    expect(pousoDaPonta(cubo, [0.03, 0.01, 0.01], [1, 0, 0]).achou).toBe(false);
  });

  it('a folga é a distância da linha de centro à superfície menos o raio, e o ponto mais fundo sai pela face mais próxima', () => {
    const linha = amostrarLinha([[0.01, 0.01, 0.0095], [0.01, 0.01, 0.0095]], 0.001);
    expect(folgaAoSolido(linha, 0.001, cubo).folga).toBeCloseTo(9.5 - 1, 6);
    const dentro = amostrarLinha([[0.019, 0.01, 0.01], [0.021, 0.01, 0.01]], 0.0005);
    const f = pontoMaisFundo(dentro, 0.001, cubo, 0);
    expect(f.direcao).toEqual([1, 0, 0]);
    expect(f.ponteDaBracadeira[0]).toBeCloseTo(21, 2);
    expect(folgaAoSolido(amostrarLinha([[0.1, 0.1, 0.1], [0.1, 0.1, 0.1]], 0.001), 0.001, cubo, { alcance: 0.01 }).folga).toBe(Infinity);
  });
});
