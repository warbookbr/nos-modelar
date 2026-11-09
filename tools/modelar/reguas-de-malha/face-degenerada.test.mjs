/* face-degenerada.test.mjs — a régua acha exatamente o que o `adaptarThree` recusa como "é degenerada". */
import { describe, expect, it } from 'vitest';
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
import { LIMITE_DA_NORMAL, medirFaceDegenerada, normalDeNewell } from './face-degenerada.mjs';

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

  it('é a mesma conta do adaptador, face a face, na vizinhança do limite (módulo da normal de Newell de 1e-12)', () => {
    const lado = (m) => [[0, 0, 0], [m, 0, 0], [0, 1, 0]]; // triângulo de catetos m e 1: o módulo é m
    const neutros = [0.5e-12, 0.99e-12, 1.01e-12, 2e-12, 1e-9].map((m) => neutroDe(lado(m), [[0, 1, 2]]));
    for (const n of neutros) {
      const dela = medirFaceDegenerada(n).faces.map((f) => f.id);
      expect(dela).toEqual(recusadas(n));
    }
    expect(medirFaceDegenerada(neutros[0]).total).toBe(1);
    expect(medirFaceDegenerada(neutros[3]).total).toBe(0);
    expect(normalDeNewell(lado(2e-12))).toBeCloseTo(2e-12, 20);
    expect(LIMITE_DA_NORMAL).toBe(1e-12);
  });

  it('devolve todas as faces que o adaptador recusa, e não só a primeira', () => {
    const p = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [0, 1, 0]];
    const neutro = neutroDe(p, [[0, 1, 4], [0, 1, 2], [1, 2, 3], [0, 3, 4]]);
    expect(medirFaceDegenerada(neutro).faces.map((f) => f.id)).toEqual([1, 2]);
    expect(recusadas(neutro)).toEqual([1, 2]);
  });
});
