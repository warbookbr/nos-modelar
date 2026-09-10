/* setas-por-eixo.test.js — a seta de um eixo não pode mover a peça noutro.
 *
 * O caso guardado é o parâmetro que estica a peça em y e roça x: sem a regra de
 * dominância ele viraria a seta de x, e arrastar para o lado faria a peça
 * subir. É o mesmo defeito de ligar por semelhança de nome, com outra roupa. */
import { describe, expect, it } from 'vitest';
import { escolherSetas, passoDoParametro } from './setas-por-eixo.js';

const alto = { id: 'altura', porEixo: [0.001, 0.4, 0.001], sensibilidade: [0.00001, 0.004, 0.00001] };
const largo = { id: 'largura', porEixo: [0.3, 0.002, 0.001], sensibilidade: [0.003, 0.00002, 0.00001] };
const fundo = { id: 'profundidade', porEixo: [0.001, 0.001, 0.25], sensibilidade: [0, 0, 0.0025] };

describe('setas por eixo', () => {
  it('dá cada eixo ao parâmetro que domina aquele eixo', () => {
    const setas = escolherSetas([alto, largo, fundo]);
    expect(setas.x.id).toBe('largura');
    expect(setas.y.id).toBe('altura');
    expect(setas.z.id).toBe('profundidade');
    expect(setas.y.sensibilidade).toBe(0.004);
  });

  it('RECUSA dar o eixo a quem só o roça de raspão', () => {
    /* `altura` mexe em x, mas mexe quatrocentas vezes mais em y. Se ela virasse
       a seta de x, arrastar para o lado faria a peça subir. */
    expect(escolherSetas([alto]).x).toBe(null);
    expect(escolherSetas([alto]).y.id).toBe('altura');
  });

  it('deixa o eixo vazio quando nenhum parâmetro o move', () => {
    const setas = escolherSetas([{ id: 'so-y', porEixo: [0, 0.2, 0], sensibilidade: [0, 0.002, 0] }]);
    expect(setas.x).toBe(null);
    expect(setas.z).toBe(null);
    expect(setas.y.id).toBe('so-y');
  });

  it('lista vazia e entrada sem medida não viram seta', () => {
    expect(escolherSetas([])).toEqual({ x: null, y: null, z: null });
    expect(escolherSetas([{ id: 'sem-medida' }])).toEqual({ x: null, y: null, z: null });
  });

  it('converte o arrasto em passo de parâmetro pela sensibilidade medida', () => {
    /* Sensibilidade de um milímetro de peça por unidade: arrastar cinco
       centímetros pede cinquenta unidades. */
    expect(passoDoParametro(0.05, 0.001)).toBeCloseTo(50, 6);
    expect(passoDoParametro(-0.02, 0.001)).toBeCloseTo(-20, 6);
  });

  it('sensibilidade nula devolve zero, e não um salto', () => {
    expect(passoDoParametro(0.05, 0)).toBe(0);
    expect(passoDoParametro(0.05, Number.NaN)).toBe(0);
  });
});
