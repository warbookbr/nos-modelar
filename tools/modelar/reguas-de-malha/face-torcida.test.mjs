/* face-torcida.test.mjs — a régua acha a face em gravata e o triângulo virado, e deixa passar a face convexa e a face côncava boa; e a peça do caso do furo
   cego a 0,78 mm do lado de um disco de 60 lados (a borda 0 saía em gravata) sai limpa. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../../procedural/nucleo/entrada.js';
import { medirFaceTorcida, seCruza } from './face-torcida.mjs';

const neutroDe = (pontos, faces) => ({
  V: new Map(pontos.map((p, i) => [i, p])),
  F: new Map(faces.map((vs, i) => [i, { id: i, vs, cor: null, material: null, parte: 'p', liso: false, solido: false, tinta: [] }])),
  partes: {}, materiais: {},
});
const m = (mm) => mm / 1000;
// os quatro cantos (u, v em mm) da borda 0 do caso, como a refeitura sem a prova os dava: o lado do furo cruza o do apoio
const GRAVATA = [[3.433, 75.973], [6.408, 74.334], [6.814, 74.889], [2.775, 76.17]];
const noTampo = (q) => q.map(([u, v]) => [m(v), 0.02, m(u)]);

describe('régua de face torcida', () => {
  it('acha o quadrilátero em gravata do caso (aresta do furo cruzando a do apoio) e o triângulo virado que o adaptador entrega', () => {
    const r = medirFaceTorcida(neutroDe(noTampo(GRAVATA), [[0, 1, 2, 3]]));
    expect(r.torcidas).toBe(1);
    expect(r.viradas).toBeGreaterThan(0);
    expect(r.faces.map((f) => f.id)).toEqual([0]);
    expect(seCruza(GRAVATA)).toBe(true);
  });

  it('o quadrado passa, e o polígono côncavo bem formado também', () => {
    const bom = medirFaceTorcida(neutroDe(noTampo([[0, 0], [4, 0], [4, 4], [0, 4]]), [[0, 1, 2, 3]]));
    expect(bom).toMatchObject({ torcidas: 0, viradas: 0, faces: [] });
    const ele = medirFaceTorcida(neutroDe(noTampo([[0, 0], [4, 0], [4, 4], [2, 1], [0, 4]]), [[0, 1, 2, 3, 4]]));
    expect(ele).toMatchObject({ torcidas: 0, viradas: 0 });
  });

  it('a peça do caso (disco de 60 lados, furo cego de 5,5 mm a 0,78 mm do lado) sai sem face torcida nem triângulo virado, e com o aviso da repartição antiga', () => {
    const P = [['cilindro', { origemId: 1, raio: 0.077, altura: 0.02, lados: 60 }], ['furo', { origemId: 2, lados: 10, de: { op: 'cilindro', id: 1, tampa: 'topo' }, orientacao: [0.9135567143956582, 0, 0.9746120339735643], centro: [0.07057605148962429, 0.02, 0.0023984993752123062], raio: 0.005495620250701904, profundidade: 0.003 }]];
    const n = nucleo(P, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(n.avisos.map((a) => a.ref)).toEqual(['repartiçãoAntiga']);
    expect(medirFaceTorcida(n)).toMatchObject({ torcidas: 0, viradas: 0 });
  });
});
