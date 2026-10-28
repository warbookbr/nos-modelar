/* limpar-contorno.test.mjs — `limparContorno`: tira ponto repetido e, se pedido, ponto colinear, sem mexer na entrada.

   O ATRITO. Seis receitas (`ambulancia`, `caminhao-bombeiro`, `caminhao-entrega`, `carro-policia`, `carro-suv-luxo`, `trator-sirene`)
   copiaram um limpador de contorno para sair da recusa de ponto repetido. A função geral é pura e opt-in: o núcleo não deduplica
   dentro de `extrusao`, porque renumeraria as laterais, que são identidade salva. */
import { describe, expect, it } from 'vitest';
import { areaDoContorno, diagnosticarContorno, ehSimples, limparContorno } from './contorno.js';
import { nucleo } from './entrada.js';

const ESPELHADO = [[0, 0], [0.5, 0.2], [0.4, 0.8], [0, 1], [0, 1], [-0.4, 0.8], [-0.5, 0.2]];

describe('limparContorno', () => {
  it('tira o repetido em seguida e deixa o contorno simples, com a mesma área', () => {
    expect(ehSimples(ESPELHADO)).toBe(false);
    const limpo = limparContorno(ESPELHADO);
    expect(limpo).toHaveLength(6);
    expect(ehSimples(limpo)).toBe(true);
    expect(diagnosticarContorno(limpo)).toBeNull();
    expect(areaDoContorno(limpo)).toBeCloseTo(areaDoContorno([[0, 0], [0.5, 0.2], [0.4, 0.8], [0, 1], [-0.4, 0.8], [-0.5, 0.2]]), 12);
  });

  it('fica com o primeiro de dois pontos em seguida e tira o último igual ao primeiro', () => {
    expect(limparContorno([[0, 0], [1, 0], [1, 0], [1, 1], [0, 1], [0, 0]])).toEqual([[0, 0], [1, 0], [1, 1], [0, 1]]);
  });

  it('o repetido a menos da tolerância sai, e o a mais fica', () => {
    const entrada = [[0, 0], [1, 0], [1, 0.0005], [1, 1], [0, 1]];
    expect(limparContorno(entrada, { tolerancia: 0.001 })).toHaveLength(4);
    expect(limparContorno(entrada, { tolerancia: 0.0001 })).toHaveLength(5);
    expect(limparContorno(entrada)).toHaveLength(5);
  });

  it('o colinear só sai quando pedido, e o mesmo no cascata, o que volta atrás fica', () => {
    const comColineares = [[0, 0], [0.5, 0], [1, 0], [1, 0.4], [0, 0.4]];
    expect(limparContorno(comColineares)).toHaveLength(5);
    expect(limparContorno(comColineares, { colineares: true })).toEqual([[0, 0], [1, 0], [1, 0.4], [0, 0.4]]);
    const cascata = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [0, 1]];
    expect(limparContorno(cascata, { colineares: true })).toEqual([[0, 0], [3, 0], [3, 1], [0, 1]]);
    /* o ponto que passa do vizinho e volta (ponta de agulha) não está entre os vizinhos: fica */
    const agulha = [[0, 0], [2, 0], [1, 0], [1, 1], [0, 1]];
    expect(limparContorno(agulha, { colineares: true })).toHaveLength(5);
  });

  it('desligar repetidos deixa o repetido onde está', () => {
    expect(limparContorno(ESPELHADO, { repetidos: false })).toHaveLength(7);
  });

  it('não altera a entrada e devolve pontos novos', () => {
    const entrada = ESPELHADO.map((p) => [...p]);
    const limpo = limparContorno(entrada);
    expect(entrada).toEqual(ESPELHADO);
    limpo[0][0] = 99;
    expect(entrada[0][0]).toBe(0);
  });

  it('é determinística: a mesma entrada dá a mesma lista', () => {
    expect(JSON.stringify(limparContorno(ESPELHADO, { colineares: true }))).toBe(JSON.stringify(limparContorno(ESPELHADO, { colineares: true })));
  });

  it('recusa entrada ruim, tolerância ruim e contorno que não sobra', () => {
    expect(() => limparContorno([[0, 0], [1, 0]])).toThrow(/3 pontos ou mais/);
    expect(() => limparContorno([[0, 0], [1, NaN], [1, 1]])).toThrow(/ponto 1/);
    expect(() => limparContorno(ESPELHADO, { tolerancia: -1 })).toThrow(/tolerancia/);
    expect(() => limparContorno([[0, 0], [1, 0], [1, 0], [0, 0]])).toThrow(/ficou com 2 ponto/);
  });

  it('o contorno limpo passa na extrusão que o repetido derrubava', () => {
    const bruto = nucleo([['extrusao', { origemId: 1, perfil: ESPELHADO, altura: 0.5 }]], {});
    expect(bruto.orfaos).toHaveLength(1);
    const limpo = nucleo([['extrusao', { origemId: 1, perfil: limparContorno(ESPELHADO), altura: 0.5 }]], {});
    expect(limpo.orfaos).toHaveLength(0);
    expect(limpo.F.size).toBeGreaterThan(0);
  });
});
