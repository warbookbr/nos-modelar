/* Testes do formato e do validador da cage. Cada caso amarra uma regra do
   contrato de P1 e prova que ela RECUSA, não que ela avisa. */
import { describe, expect, it } from 'vitest';
import { validarCage, exigirCageValida, espelhar, ErroDeCage } from './cage.mjs';
import { subdividir } from './subdividir.mjs';

/* Tira de dois quads em x >= 0, para o espelhamento ter o que espelhar. */
const tira = () => ({
  V: new Map([
    [0, [0, 0, 0]], [1, [100, 0, 0]], [2, [100, 0, 100]], [3, [0, 0, 100]],
    [4, [100, 80, 0]], [5, [100, 80, 100]],
  ]),
  F: new Map([
    [0, { id: 0, vs: [0, 1, 2, 3], parte: 'piso' }],
    [1, { id: 1, vs: [1, 4, 5, 2], parte: 'flanco' }],
  ]),
  vincos: new Map([['1|2', 2]]),
  loops: { cintura: { v: [1, 2], fechado: false } },
});

describe('validador', () => {
  it('aceita uma cage bem formada', () => {
    const { problemas, medidas } = validarCage(tira());
    expect(problemas).toEqual([]);
    expect(medidas.faces).toBe(2);
    expect(medidas.vincos).toBe(1);
  });

  it('recusa face que não é quadrilátero', () => {
    const c = tira();
    c.F.set(2, { id: 2, vs: [0, 1, 2] });
    expect(validarCage(c).problemas.some((p) => p.regra === 'quad')).toBe(true);
  });

  it('recusa face que cita vértice inexistente', () => {
    const c = tira();
    c.F.set(2, { id: 2, vs: [0, 1, 2, 99] });
    expect(validarCage(c).problemas.some((p) => p.regra === 'vertice')).toBe(true);
  });

  it('recusa vinco em aresta que não existe', () => {
    const c = tira();
    c.vincos.set('0|5', 1);
    expect(validarCage(c).problemas.some((p) => p.regra === 'vinco')).toBe(true);
  });

  it('recusa nitidez fora de [0, 3]', () => {
    const c = tira();
    c.vincos.set('1|2', 9);
    expect(validarCage(c).problemas.some((p) => p.regra === 'vinco')).toBe(true);
  });

  it('recusa loop que salta entre vértices sem aresta', () => {
    const c = tira();
    c.loops = { ombro: { v: [0, 5], fechado: false } };
    const p = validarCage(c).problemas.find((x) => x.regra === 'loop');
    expect(p.texto).toMatch(/caminho contínuo/);
  });

  it('recusa aresta não-manifold', () => {
    const c = tira();
    c.V.set(6, [100, -80, 0]);
    c.V.set(7, [100, -80, 100]);
    c.F.set(2, { id: 2, vs: [1, 6, 7, 2] });
    expect(validarCage(c).problemas.some((p) => p.regra === 'manifold')).toBe(true);
  });

  it('recusa cage que estoura o teto de 900 por passo', () => {
    const c = tira();
    for (let i = 10; i < 950; i += 1) c.V.set(i, [i, 0, 0]);
    expect(validarCage(c).problemas.some((p) => p.regra === 'bloco')).toBe(true);
  });

  it('exigirCageValida lança com a lista de problemas', () => {
    const c = tira();
    c.F.set(2, { id: 2, vs: [0, 1] });
    expect(() => exigirCageValida(c)).toThrow(ErroDeCage);
  });
});

describe('seção como conferência', () => {
  const comSecao = (contorno, tol = 8) => {
    const c = tira();
    c.secoes = [{ z: 0, contorno, tolerancia: tol, janela: 1 }];
    return c;
  };

  it('aprova quando os vértices da estação caem sobre o contorno', () => {
    const c = comSecao([[0, 0], [100, 0], [100, 80]]);
    expect(validarCage(c).problemas.filter((p) => p.regra === 'secao')).toEqual([]);
  });

  it('reprova e diz qual vértice e quanto', () => {
    const c = comSecao([[0, 0], [100, 0], [100, 80]], 2);
    c.V.set(4, [100, 200, 0]);
    const p = validarCage(c).problemas.find((x) => x.regra === 'secao');
    expect(p.texto).toMatch(/vértice 4/);
    expect(p.texto).toMatch(/120/);
  });

  it('reprova estação vazia em vez de aprovar por omissão', () => {
    const c = tira();
    c.secoes = [{ z: 9999, contorno: [[0, 0], [1, 1]] }];
    expect(validarCage(c).problemas.some((p) => p.regra === 'secao')).toBe(true);
  });
});

describe('espelhamento', () => {
  it('duplica só o que está fora da costura', () => {
    const m = espelhar(tira());
    /* dois vértices em x = 0 ficam; quatro em x = 100 viram oito */
    expect(m.V.size).toBe(10);
    expect(m.F.size).toBe(4);
  });

  it('não abre fenda no plano de simetria', () => {
    const m = espelhar(tira());
    const { problemas } = validarCage({ ...m, secoes: [] });
    expect(problemas).toEqual([]);
    /* a costura continua com duas faces por aresta: nada de borda no meio */
    const malha = subdividir(m, 1);
    expect(malha.F.size).toBe(16);
  });

  it('inverte a ordem da face espelhada, para não virar do avesso', () => {
    /* Assere a PROPRIEDADE, não a aritmética de id: as posições da face
       espelhada são o espelho das originais, na ordem inversa. A primeira versão
       deste teste chutava `id + 6` e errava, porque o id novo conta só os
       vértices fora da costura. */
    const m = espelhar(tira());
    const pos = (id) => m.V.get(id);
    const original = m.F.get(0).vs.map(pos);
    const espelhada = m.F.get(2).vs.map(pos);
    /* `-0` e `0` são distintos para o comparador, e o vértice da costura não é
       espelhado: normaliza o zero antes de comparar. */
    const semZeroNegativo = (n) => (n === 0 ? 0 : n);
    const esperado = [...original].reverse().map(([x, y, z]) => [semZeroNegativo(-x), y, z]);
    expect(espelhada).toEqual(esperado);
  });

  it('leva o vinco junto', () => {
    const m = espelhar(tira());
    expect(m.vincos.size).toBe(2);
  });

  it('preserva o nome da parte nas duas metades', () => {
    const m = espelhar(tira());
    const pisos = [...m.F.values()].filter((f) => f.parte === 'piso');
    expect(pisos).toHaveLength(2);
  });
});
