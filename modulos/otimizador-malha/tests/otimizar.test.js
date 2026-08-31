/* otimizar.test.js — o invariante é a coisa a provar, não o ganho.
 *
 * Um otimizador que reduz muito e muda a forma é pior que nenhum. Então o teste
 * central não é "reduziu": é "reduziu SEM mexer na silhueta", e há um caso que
 * força a guarda a disparar, para que ela seja vista funcionando. */
import { describe, expect, it } from 'vitest';
import { otimizarMalha, medirMalha, conferirInvariante, ErroOtimizacao } from '../src/otimizar.js';

/* Quadrado 2x1 partido em dois quadrados 1x1 coplanares: a redução óbvia é
   fundir os dois numa face só, e a área tem de sobreviver intacta. */
function doisCoplanares() {
  return {
    vertices: new Map([
      [0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 1, 0]],
      [4, [2, 0, 0]], [5, [2, 1, 0]],
    ]),
    faces: new Map([
      [0, { vs: [0, 1, 2, 3], parte: 'chapa' }],
      [1, { vs: [1, 4, 5, 2], parte: 'chapa' }],
    ]),
  };
}

function cuboSao() {
  return {
    vertices: new Map([
      [0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 1, 0]],
      [4, [0, 0, 1]], [5, [1, 0, 1]], [6, [1, 1, 1]], [7, [0, 1, 1]],
    ]),
    faces: new Map([
      [0, { vs: [0, 3, 2, 1], parte: 'c' }], [1, { vs: [4, 5, 6, 7], parte: 'c' }],
      [2, { vs: [0, 1, 5, 4], parte: 'c' }], [3, { vs: [1, 2, 6, 5], parte: 'c' }],
      [4, { vs: [2, 3, 7, 6], parte: 'c' }], [5, { vs: [3, 0, 4, 7], parte: 'c' }],
    ]),
  };
}

describe('otimizador de malha', () => {
  it('funde duas faces coplanares numa só, com área idêntica', () => {
    const antes = medirMalha(doisCoplanares());
    const r = otimizarMalha(doisCoplanares());
    expect(r.depois.faces).toBe(1);
    expect(r.operacoes.fundidas).toBe(1);
    expect(r.depois.area).toBeCloseTo(antes.area, 12);
    expect(r.depois.caixa).toEqual(antes.caixa);
  });

  it('não funde faces de partes diferentes, mesmo coplanares e adjacentes', () => {
    const m = doisCoplanares();
    m.faces.get(1).parte = 'outra';
    const r = otimizarMalha(m);
    expect(r.depois.faces).toBe(2);
    expect(r.operacoes.fundidas).toBe(0);
  });

  it('não funde faces de materiais diferentes', () => {
    const m = doisCoplanares();
    m.faces.get(0).material = 'aco';
    m.faces.get(1).material = 'madeira';
    expect(otimizarMalha(m).operacoes.fundidas).toBe(0);
  });

  it('não toca num cubo já mínimo: seis faces entram, seis saem', () => {
    const r = otimizarMalha(cuboSao());
    expect(r.depois.faces).toBe(6);
    expect(r.depois.vertices).toBe(8);
    expect(r.ganho.triangulos).toBe(0);
  });

  it('solda vértices coincidentes da mesma parte e descarta o que sobra', () => {
    const m = doisCoplanares();
    m.vertices.set(9, [1, 0, 0]);            // duplicata exata do vértice 1
    m.faces.get(1).vs = [9, 4, 5, 2];
    const r = otimizarMalha(m);
    expect(r.operacoes.soldados).toBe(1);
    expect(r.operacoes.descartados).toBeGreaterThanOrEqual(1);
    expect(r.depois.area).toBeCloseTo(medirMalha(doisCoplanares()).area, 12);
  });

  it('não solda vértices coincidentes de partes diferentes: peça encostada não é peça fundida', () => {
    const m = doisCoplanares();
    m.faces.get(1).parte = 'outra';
    m.vertices.set(9, [1, 0, 0]);
    m.faces.get(1).vs = [9, 4, 5, 2];
    expect(otimizarMalha(m).operacoes.soldados).toBe(0);
  });

  it('a guarda de silhueta dispara quando a fusão mudaria a forma', () => {
    /* Duas faces com a MESMA normal e planos DIFERENTES não podem virar uma;
       se a comparação de plano fosse frouxa, a fusão achataria um degrau. Com
       a comparação correta elas nem são candidatas — o que este caso prova é
       que o degrau sobrevive, e portanto a guarda não precisou disparar. */
    const m = doisCoplanares();
    m.vertices.set(4, [2, 0, 0.5]);
    m.vertices.set(5, [2, 1, 0.5]);
    const r = otimizarMalha(m);
    expect(r.operacoes.fundidas).toBe(0);
    expect(r.depois.faces).toBe(2);
  });

  it('a guarda é vista REPROVANDO área perdida', () => {
    const antes = medirMalha(doisCoplanares());
    const depois = { ...antes, area: antes.area * 0.99 };
    expect(() => conferirInvariante(antes, depois)).toThrow(ErroOtimizacao);
    expect(() => conferirInvariante(antes, depois)).toThrow(/mudou a forma/);
  });

  it('a guarda é vista REPROVANDO caixa encolhida', () => {
    const antes = medirMalha(doisCoplanares());
    const depois = { ...antes, caixa: { min: antes.caixa.min, max: [1.5, 1, 0] } };
    expect(() => conferirInvariante(antes, depois)).toThrow(ErroOtimizacao);
  });

  it('a guarda aceita a saída idêntica', () => {
    const antes = medirMalha(doisCoplanares());
    expect(conferirInvariante(antes, antes).deltaCaixa).toBe(0);
  });

  it('recusa malha sem vertices ou faces', () => {
    expect(() => otimizarMalha({})).toThrow(ErroOtimizacao);
  });
});
