/* face-degenerada.test.mjs — a régua acha tudo o que o `adaptarThree` recusa como "é degenerada" e o que a auditoria de interseções acha sem área (piso relativo ao tamanho da peça). */
import { describe, expect, it } from 'vitest';
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { prepararSolido } from '../../../src/autoria/contato-de-solidos.js';
import { LIMITE_DA_NORMAL, limiteRelativo, medirFaceDegenerada, normalDeNewell } from './face-degenerada.mjs';

const neutroDe = (pontos, faces) => ({
  V: new Map(pontos.map((p, i) => [i, p])),
  F: new Map(faces.map((vs, i) => [i, { id: i, vs, cor: null, material: null, parte: 'p', liso: false, solido: false, tinta: [] }])),
  partes: {}, materiais: {},
});
const recusadas = (neutro) => {
  const ids = [];
  for (const id of neutro.F.keys()) {
    const so = { ...neutro, F: new Map([[id, neutro.F.get(id)]]) };
    try { adaptarThree(so); } catch (e) { if (/é degenerada/.test(e.message)) ids.push(id); else throw e; }
  }
  return ids;
};

describe('régua de face degenerada', () => {
  it('acha a face de cantos colineares, a de área quase zero e a de cantos coincidentes, e deixa passar a face boa', () => {
    const p = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [0, 0, 1e-7], [1, 0, 1e-7], [0.5, 1e-7, 1e-7], [0.5, 0, 5e-13]];
    const neutro = neutroDe(p, [[0, 1, 2], [0, 1, 3], [0, 0, 1], [0, 1, 2, 2], [0, 1, 6], [0, 1, 7]]);
    const m = medirFaceDegenerada(neutro);
    expect(m.faces.map((f) => f.id)).toEqual([0, 2, 3, 5]);
    expect(m.total).toBe(4);
  });

  it('recusa tudo o que o adaptador recusa, face a face, na vizinhança do limite dele (módulo da normal de Newell de 1e-12); o piso relativo recusa além disso', () => {
    const lado = (m) => [[0, 0, 0], [m, 0, 0], [0, 1, 0]]; // triângulo de catetos m e 1: o módulo é m
    const neutros = [0.5e-12, 0.99e-12, 1.01e-12].map((m) => neutroDe(lado(m), [[0, 1, 2]]));
    for (const n of neutros) {
      const dela = medirFaceDegenerada(n).faces.map((f) => f.id);
      for (const id of recusadas(n)) expect(dela).toContain(id);
    }
    expect(medirFaceDegenerada(neutros[0]).total).toBe(1);
    expect(normalDeNewell(lado(2e-12))).toBeCloseTo(2e-12, 20);
    expect(LIMITE_DA_NORMAL).toBe(1e-12);
  });

  it('devolve todas as faces que o adaptador recusa, e não só a primeira', () => {
    const p = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [0, 1, 0]];
    const neutro = neutroDe(p, [[0, 1, 4], [0, 1, 2], [1, 2, 3], [0, 3, 4]]);
    expect(medirFaceDegenerada(neutro).faces.map((f) => f.id)).toEqual([1, 2]);
    expect(recusadas(neutro)).toEqual([1, 2]);
  });

  /* o piso relativo da auditoria: a caixa fixa por dois vértices sem face (diagonal de raiz de 3, limite de 1,5e-9), e o triângulo de catetos 2m e 0,5 tem módulo m */
  const ancoras = [[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, -0.5]];
  /* os três âncoras formam uma face boa da mesma parte, para a caixa da parte (a escala da auditoria) ser a fixa */
  const comAncoras = (pontos, faces) => neutroDe([...pontos, ...ancoras], [...faces, [pontos.length, pontos.length + 1, pontos.length + 2]]);
  const triangulo = (modulo) => comAncoras([[0, 0, 0], [2 * modulo, 0, 0], [0, 0.5, 0]], [[0, 1, 2]]);

  it('na fronteira do piso relativo: o triângulo de módulo igual ao limite é recusado, e o logo acima passa', () => {
    const limite = limiteRelativo(triangulo(1e-9), 'p');
    expect(limite).toBeCloseTo(1.5e-9, 20);
    const logoAcima = limite * (1 + 1e-9);
    expect(medirFaceDegenerada(triangulo(limite)).total).toBe(1);
    expect(medirFaceDegenerada(triangulo(limite * (1 - 1e-9))).total).toBe(1);
    expect(medirFaceDegenerada(triangulo(logoAcima)).total).toBe(0);
    expect(medirFaceDegenerada(triangulo(2 * limite)).total).toBe(0);
    expect(LIMITE_DA_NORMAL).toBeLessThan(limite);
  });

  it('o piso é relativo ao tamanho: o mesmo triângulo passa numa peça pequena e é recusado numa grande', () => {
    const t = [[0, 0, 0], [1e-9, 0, 0], [0, 1, 0]];
    expect(medirFaceDegenerada(neutroDe(t, [[0, 1, 2]])).total).toBe(0);   // diagonal 1: limite de 5e-10, e o módulo é 1e-9: passa
    expect(medirFaceDegenerada(comAncoras(t, [[0, 1, 2]])).total).toBe(1);   // diagonal de raiz de 3: limite de 1,5e-9: recusado
    const pequena = [[0, 0, 0], [1e-9, 0, 0], [0, 1e-3, 0]];
    expect(medirFaceDegenerada(neutroDe(pequena, [[0, 1, 2]])).total).toBe(0);
  });

  it('o triângulo de uma face de quatro cantos conta pelo mesmo piso: a orelha sem área é tirada e a face fica, mas se nada sobra ela é recusada', () => {
    /* quadrado de lado 0,1 com um canto a mais no meio de uma aresta: a orelha colinear sai da triangulação e a face passa */
    const comColinear = comAncoras([[0, 0, 0], [0.05, 0, 0], [0.1, 0, 0], [0.1, 0.1, 0], [0, 0.1, 0]], [[0, 1, 2, 3, 4]]);
    expect(medirFaceDegenerada(comColinear).total).toBe(0);
    /* o retângulo de 1 por e: a normal de Newell dele tem módulo 2e e cada triângulo da triangulação, e; a face é recusada quando e passa da normal e não passa do triângulo */
    const fino = (e) => comAncoras([[0, 0, 0], [1, 0, 0], [1, e, 0], [0, e, 0]], [[0, 1, 2, 3]]);
    const limite = limiteRelativo(fino(1e-9), 'p');   // a caixa agora vai a x = 1
    expect(medirFaceDegenerada(fino(limite / 2 * (1 - 1e-6))).total).toBe(1);   // a normal já não passa
    expect(medirFaceDegenerada(fino(limite)).total).toBe(1);                    // o triângulo de módulo igual ao piso é recusado
    expect(medirFaceDegenerada(fino(limite * (1 - 1e-6))).total).toBe(1);       // a normal passa e nenhum triângulo passa
    expect(medirFaceDegenerada(fino(limite * (1 + 1e-6))).total).toBe(0);       // o triângulo logo acima do piso
  });

  it('a face com menos de três cantos, ou sem lista, é recusada', () => {
    const neutro = comAncoras([[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1], [0], [], [0, 1, 2]]);
    neutro.F.get(0).vs = [0, 1]; neutro.F.set(9, { id: 9, vs: null, parte: 'p' });
    const m = medirFaceDegenerada(neutro);
    expect(m.faces.map((f) => f.id)).toEqual([0, 1, 2, 9]);
    expect(m.faces.every((f) => f.normal === null)).toBe(true);
  });

  it('o piso de cada face é o mais alto entre o da parte e o da peça inteira: o triângulo que passa no piso da parte pequena é recusado quando a peça inteira é grande', () => {
    /* triângulo de catetos 3e-6 e 1e-3 (módulo de 3e-9) e, na outra parte, um triângulo de catetos 3 e 4 (meia diagonal de 2,5, piso de 1,25e-8) */
    const neutro = neutroDe([[0, 0, 0], [3e-6, 0, 0], [0, 1e-3, 0], [0, 0, 0], [3, 0, 0], [0, 4, 0]], [[0, 1, 2], [3, 4, 5]]);
    neutro.F.get(0).parte = 'pequena'; neutro.F.get(1).parte = 'grande';
    expect(limiteRelativo(neutro, 'pequena')).toBeLessThan(3e-9);
    expect(limiteRelativo(neutro, 'grande')).toBeCloseTo(1.25e-8, 15);
    expect(limiteRelativo(neutro)).toBeCloseTo(1.25e-8, 15);
    expect(medirFaceDegenerada(neutro).faces.map((f) => f.id)).toEqual([0]);
    neutro.F.get(0).parte = 'grande';
    expect(medirFaceDegenerada(neutro).faces.map((f) => f.id)).toEqual([0]);
  });

  it('a parte de nome vazio conta como face sem parte', () => {
    const neutro = neutroDe([[0, 0, 0], [3e-6, 0, 0], [0, 1e-3, 0], [0, 0, 0], [3, 0, 0], [0, 4, 0]], [[0, 1, 2], [3, 4, 5]]);
    neutro.F.get(0).parte = ''; neutro.F.get(1).parte = 'grande';
    expect(limiteRelativo(neutro, null)).toBeLessThan(3e-9);
    expect(medirFaceDegenerada(neutro).faces.map((f) => [f.id, f.parte])).toEqual([[0, null]]);
  });

  /* o que a régua aprova a auditoria da montagem (a peça inteira) e a dos contatos (cada parte) não acham sem área: duas partes de escalas muito diferentes, a pequena com um triângulo de dobro de área 3e-11 */
  const tetra = (V, F, base, pontos, parte, id0) => {
    pontos.forEach((p, i) => V.set(base + i, p));
    [[0, 2, 1], [0, 1, 3], [1, 2, 3], [0, 3, 2]].forEach((f, i) => F.set(id0 + i, { id: id0 + i, vs: f.map((x) => base + x), parte }));
  };
  const pecaDeDuasEscalas = (parteDaPequena) => {
    const V = new Map(), F = new Map();
    const e = 3e-11 / 0.01;
    tetra(V, F, 0, [[0, 0, 0], [0.01, 0, 0], [0.005, e, 0], [0.005, e / 2, 0.005]], parteDaPequena, 0);
    tetra(V, F, 10, [[2, 0, 0], [3, 0, 0], [2, 1, 0], [2, 0, 1]], 'grande', 10);
    return { V, F };
  };
  it.each([['com parte', 'pequena'], ['sem parte', undefined], ['parte vazia', '']])('a régua concorda com a auditoria da montagem na peça de duas escalas (%s)', (_, parte) => {
    const neutro = pecaDeDuasEscalas(parte);
    const montagem = prepararSolido(neutro, undefined, 'peca');
    expect(montagem.inconclusivo).toMatch(/triangulo-degenerado/);
    expect(medirFaceDegenerada(neutro).total).toBeGreaterThan(0);
    /* e a peça sem a face fina, ou com a face engrossada, passa nas duas */
    const grossa = pecaDeDuasEscalas(parte);
    grossa.V.set(2, [0.005, 0.005, 0]);
    expect(medirFaceDegenerada(grossa).total).toBe(0);
    expect(prepararSolido(grossa, undefined, 'peca').inconclusivo ?? null).toBe(null);
  });
});
