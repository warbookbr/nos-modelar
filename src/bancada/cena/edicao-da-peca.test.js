/* edicao-da-peca.test.js — a base do ajuste é uma cópia da malha do arquivo, e a malha só conta como mudada por vértice movido ou por vértice ou face a mais ou a menos. */
import { describe, expect, it } from 'vitest';
import { fotografarMalha, malhaMudouDesdeOArquivo } from './edicao-da-peca.js';

const malha = () => ({
  V: new Map([[1, [0, 0, 0]], [2, [1, 0, 0]], [3, [0, 1, 0]]]),
  F: new Map([[10, { vs: [1, 2, 3], parte: 'chapa' }]]),
  portas: [{ id: 'eixo' }],
});

describe('edição da peça', () => {
  it('a fotografia copia vértices e faces, e leva as portas sem cópia', () => {
    const viva = malha();
    const foto = fotografarMalha(viva);
    viva.V.get(1)[0] = 9;
    viva.F.get(10).vs.push(4);
    expect(foto.V.get(1)).toEqual([0, 0, 0]);
    expect(foto.F.get(10).vs).toEqual([1, 2, 3]);
    expect(foto.portas).toBe(viva.portas);
    expect('portas' in fotografarMalha({ V: new Map(), F: new Map() })).toBe(false);
  });

  it('mudou só com vértice movido além da tolerância, ou com vértice ou face trocados', () => {
    const doArquivo = fotografarMalha(malha());
    const igual = fotografarMalha(malha());
    expect(malhaMudouDesdeOArquivo(doArquivo, igual)).toBe(false);
    igual.V.get(2)[1] = 1e-12;
    expect(malhaMudouDesdeOArquivo(doArquivo, igual)).toBe(false);
    igual.V.get(2)[1] = 1e-6;
    expect(malhaMudouDesdeOArquivo(doArquivo, igual)).toBe(true);

    const outraFace = fotografarMalha(malha());
    outraFace.F.delete(10);
    outraFace.F.set(11, { vs: [1, 2, 3] });
    expect(malhaMudouDesdeOArquivo(doArquivo, outraFace)).toBe(true);
    expect(malhaMudouDesdeOArquivo(null, igual)).toBe(false);
  });
});
