/* caminho-simetrico.test.mjs — testes unitários para a função criarCaminhoSimetrico. */
import { describe, expect, it } from 'vitest';
import { criarCaminhoSimetrico } from './caminho-simetrico.js';

describe('criarCaminhoSimetrico', () => {
  it('espelha simetricamente em torno de X com centro em X=0', () => {
    const meio = [
      { x: 0, y: 1.0, z: 0, raio: 0.05 },
      { x: 0.1, y: 0.95, z: 0.01, raio: 0.04 },
      { x: 0.2, y: 0.90, z: 0.02, raio: 0.03 },
    ];

    const resultado = criarCaminhoSimetrico({ meioPerfil: meio, eixo: 'x' });
    expect(resultado).toHaveLength(5);

    // Pontos ordenados da esquerda negativa para a direita positiva
    expect(resultado[0].pos).toEqual([-0.2, 0.90, 0.02]);
    expect(resultado[0].raio).toBe(0.03);

    expect(resultado[1].pos).toEqual([-0.1, 0.95, 0.01]);
    expect(resultado[1].raio).toBe(0.04);

    expect(resultado[2].pos).toEqual([0, 1.0, 0]);
    expect(resultado[2].raio).toBe(0.05);

    expect(resultado[3].pos).toEqual([0.1, 0.95, 0.01]);
    expect(resultado[3].raio).toBe(0.04);

    expect(resultado[4].pos).toEqual([0.2, 0.90, 0.02]);
    expect(resultado[4].raio).toBe(0.03);
  });

  it('preserva contornos de seção em ambos os lados', () => {
    const contornoBase = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const meio = [
      { pos: [0, 0, 0], contorno: contornoBase },
      { pos: [0.5, 0, 0], contorno: contornoBase },
    ];

    const resultado = criarCaminhoSimetrico({ meioPerfil: meio, eixo: 'x' });
    expect(resultado).toHaveLength(3);
    expect(resultado[0].pos).toEqual([-0.5, 0, 0]);
    expect(resultado[0].contorno).toEqual(contornoBase);
    expect(resultado[1].pos).toEqual([0, 0, 0]);
    expect(resultado[2].pos).toEqual([0.5, 0, 0]);
  });

  it('rejeita meio-perfil cujo primeiro ponto não seja o centro', () => {
    const invalido = [
      { x: 0.05, y: 1.0, z: 0 },
      { x: 0.20, y: 1.0, z: 0 },
    ];
    expect(() => criarCaminhoSimetrico({ meioPerfil: invalido, eixo: 'x' })).toThrow(/centro/);
  });

  it('rejeita array com menos de 2 pontos', () => {
    expect(() => criarCaminhoSimetrico({ meioPerfil: [{ x: 0, y: 0, z: 0 }], eixo: 'x' })).toThrow(/ao menos 2 pontos/);
  });
});
