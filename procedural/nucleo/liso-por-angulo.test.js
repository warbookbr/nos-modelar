/* liso-por-angulo.test.js — o valor gravado e a média filtrada por ângulo. */
import { describe, expect, it } from 'vitest';
import { chaveDoCantoLiso, normalLisaDoCanto, valorDoLiso } from './liso-por-angulo.js';
import { adaptarV3, nucleo } from './entrada.js';

describe('liso por ângulo', () => {
  it('grava true sem ângulo e o número com ângulo; recusa ângulo fora de 0 a 180', () => {
    expect(valorDoLiso(undefined)).toBe(true);
    expect(valorDoLiso(30)).toBe(30);
    expect(() => valorDoLiso(0)).toThrow(/entre 0 e 180/);
    expect(() => valorDoLiso(180)).toThrow(/entre 0 e 180/);
    expect(() => valorDoLiso('30')).toThrow(/entre 0 e 180/);
  });

  it('deixa fora da média a face além do limite', () => {
    const cima = { u: [0, 1, 0], n: [0, 1, 0] };
    const lado = { u: [1, 0, 0], n: [1, 0, 0] };
    expect(normalLisaDoCanto([0, 1, 0], 30, [cima, lado])).toEqual([0, 1, 0]);
    const media = normalLisaDoCanto([0, 1, 0], true, [cima, lado]);
    expect(media[0]).toBeCloseTo(Math.SQRT1_2, 6);
  });
});

describe('quebra de sombra', () => {
  /* leque de quatro quads em volta do vértice 0, nas arestas 0-1, 0-2, 0-3 e 0-4 */
  const leque = (quebras = {}) => [
    { id: 10, vs: [0, 1, 5, 2], liso: 30, ...(quebras[10] ? { quebras: quebras[10] } : {}) },
    { id: 11, vs: [0, 2, 6, 3], liso: 30, ...(quebras[11] ? { quebras: quebras[11] } : {}) },
    { id: 12, vs: [0, 3, 7, 4], liso: 30 },
    { id: 13, vs: [0, 4, 8, 1], liso: 30 },
  ];

  it('sem quebra, a chave do canto é o próprio vértice', () => {
    const chave = chaveDoCantoLiso(leque());
    expect(chave({ id: 10 }, 0)).toBe(0);
    expect(chave({ id: 12 }, 3)).toBe(3);
  });

  it('duas quebras pelo vértice separam o leque em dois setores, e uma só não separa', () => {
    /* quebra em 0-2 (declarada pela face 10) e em 0-4 (declarada pela 12, mas vale para a 13 também) */
    const faces = leque({ 10: [[0, 2]] });
    faces[2].quebras = [[0, 4]];
    const chave = chaveDoCantoLiso(faces);
    expect(chave(faces[0], 0)).toBe(chave(faces[3], 0));
    expect(chave(faces[1], 0)).toBe(chave(faces[2], 0));
    expect(chave(faces[0], 0)).not.toBe(chave(faces[1], 0));
    /* o vértice 1 só é tocado por quebra nenhuma: continua com a chave dele */
    expect(chave(faces[0], 1)).toBe(1);
    const umaSo = chaveDoCantoLiso(leque({ 10: [[0, 2]] }));
    expect(new Set(leque().map((f) => umaSo(f, 0))).size).toBe(1);
  });

  it('face chapada não entra nos setores, e a ordem das faces não muda a chave', () => {
    const faces = leque({ 10: [[0, 2]] });
    faces[2].quebras = [[0, 4]];
    const invertida = [...faces].reverse();
    const a = chaveDoCantoLiso(faces); const b = chaveDoCantoLiso(invertida.values());
    for (const f of faces) expect(a(f, 0)).toBe(b(f, 0));
    faces[3].liso = false;
    const c = chaveDoCantoLiso(faces);
    expect(c(faces[0], 0)).not.toBe(c(faces[1], 0));
  });

  it('o adaptador do núcleo respeita a quebra: o aro vivo do cubo subdividido fica nítido com liso de 120 graus', () => {
    const P = { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0], e: [0, 0, 1], f: [1, 0, 1], g: [1, 1, 1], h: [0, 1, 1] };
    const neutro = nucleo([['subdivisao', {
      origemId: 1, vertices: Object.keys(P), niveis: 2, liso: 120,
      faces: [['a', 'd', 'c', 'b'], ['e', 'f', 'g', 'h'], ['a', 'b', 'f', 'e'], ['b', 'c', 'g', 'f'], ['c', 'd', 'h', 'g'], ['d', 'a', 'e', 'h']],
      vincos: [{ nome: 'aro', pontos: ['e', 'f', 'g', 'h', 'e'], nitidez: 'viva' }],
    }]], P);
    const ctx = { tex: { texCanvas: (w, h) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
    /* a normal de cada canto que está no plano do topo, z = 1: com a quebra, a do topo fica (0, 0, 1) e a da lateral fica horizontal */
    const noTopo = () => {
      const v = adaptarV3(neutro, ctx).lotes[0].mesh.v; const n = [];
      for (let k = 0; k < v.length; k += 8) if (Math.abs(v[k + 2] - 1) < 1e-12) n.push(Math.abs(v[k + 7]));
      return n;
    };
    const com = noTopo();
    expect(com.every((z) => z > 1 - 1e-9 || z < 1e-9)).toBe(true);
    for (const f of neutro.F.values()) delete f.quebras;
    expect(noTopo().some((z) => z > 0.1 && z < 0.9)).toBe(true);
  });
});
