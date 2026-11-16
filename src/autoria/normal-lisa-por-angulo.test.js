/* normal-lisa-por-angulo.test.js — a normal lisa pesa cada face pelo ângulo do canto dela no vértice, nos quatro lugares que a
   calculam (o adaptador do núcleo, a bancada, o exportador glTF e a vista rápida), e por isso não muda quando uma face plana
   vizinha está dividida em mais triângulos. Com o peso igual ou pela área, a faceta refinada de um cilindro puxava a normal das
   arestas dela, e o sombreado mostrava uma faixa clara (a costura refinada da bicicleta, 2026-11-16). */
import { describe, expect, it } from 'vitest';
import { adaptarV3 } from '../../procedural/nucleo/entrada.js';
import { anguloDoCanto, fatorDaFaceLisa } from '../../procedural/nucleo/liso-por-angulo.js';
import { adaptarThree, idsDeOrigem } from './adaptar-three.js';
import { exportarGltf, lerGlb } from '../../modulos/exportador-gltf/src/index.js';
import { normaisDosCantos } from '../../tools/modelar/vista-rapida.mjs';

const LADOS = 12;
const R = 0.05;
const ALTURA = 0.1;

/* O prisma de 12 lados, fechado: as laterais lisas, as tampas chapadas. Com `refinar`, a faceta 0 ganha `refinar` pontos na
   aresta de cima e vira um leque de triângulos a partir do canto de baixo; a tampa de cima recebe os mesmos pontos. */
function prisma(refinar = 0) {
  const V = new Map();
  for (let k = 0; k < LADOS; k++) {
    const a = (2 * Math.PI * k) / LADOS;
    V.set(k, [R * Math.cos(a), 0, R * Math.sin(a)]);
    V.set(100 + k, [R * Math.cos(a), ALTURA, R * Math.sin(a)]);
  }
  const meio = [];
  for (let j = 1; j <= refinar; j++) {
    const t = j / (refinar + 1);
    const A = V.get(100), B = V.get(101);
    V.set(200 + j, A.map((x, i) => x + (B[i] - x) * t));
    meio.push(200 + j);
  }
  const F = new Map();
  let id = 1;
  const face = (vs, liso) => { F.set(id, { id, vs, parte: 'p', material: 'm', liso }); id += 1; };
  for (let k = 0; k < LADOS; k++) {
    const k1 = (k + 1) % LADOS;
    /* para fora: baixo k, cima k, cima k+1, baixo k+1 */
    if (k === 0 && refinar) {
      const cima = [100, ...meio, 101];
      for (let j = 0; j + 1 < cima.length; j++) face([0, cima[j], cima[j + 1]], true);
      face([0, 101, 1], true);
    } else face([k, 100 + k, 100 + k1, k1], true);
  }
  face([...Array(LADOS).keys()], false);
  /* a tampa de cima, para cima: o ângulo descendo de 100 a 101, e os pontos da aresta refinada de 101 de volta a 100 */
  face([100, ...[...Array(LADOS - 1).keys()].map((k) => 100 + LADOS - 1 - k), ...[...meio].reverse()].filter((v, i, l) => l.indexOf(v) === i), false);
  return { V, F, partes: { p: {} }, orfaos: [] };
}

const radial = (p) => { const t = Math.hypot(p[0], p[2]); return [p[0] / t, 0, p[2] / t]; };
const desvio = (n, p) => { const r = radial(p); const t = Math.hypot(...n); return (Math.acos(Math.min(1, (n[0] * r[0] + n[1] * r[1] + n[2] * r[2]) / t)) * 180) / Math.PI; };
/* os cantos das arestas da faceta 0 (os vértices 0, 1, 100 e 101), que ficam na superfície do cilindro */
const NAS_ARESTAS = (p) => Math.abs(Math.hypot(p[0], p[2]) - R) < 1e-9 && Math.abs(p[0] - R * Math.cos(Math.PI / 12)) < 0.03 && p[2] > -1e-9 && p[2] < R * 0.6;

/* o maior desvio da radial, em graus, entre as normais de canto liso nos vértices das arestas da faceta 0, por implementação */
const PELO_NUCLEO = (neutro) => {
  const ctx = { tex: { texCanvas: (w, h) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
  let maior = 0;
  for (const lote of adaptarV3(neutro, ctx).lotes) {
    const v = lote.mesh.v;
    for (let k = 0; k < v.length; k += 8) {
      const p = [v[k], v[k + 1], v[k + 2]], n = [v[k + 5], v[k + 6], v[k + 7]];
      if (NAS_ARESTAS(p) && Math.abs(n[1]) < 0.5) maior = Math.max(maior, desvio(n, p));
    }
  }
  return maior;
};
const NA_BANCADA = (neutro) => {
  let maior = 0;
  for (const malha of adaptarThree(neutro).partes.get('p').children) {
    const pos = malha.geometry.getAttribute('position').array, nor = malha.geometry.getAttribute('normal').array;
    for (let i = 0; i < pos.length; i += 3) {
      const p = [pos[i], pos[i + 1], pos[i + 2]], n = [nor[i], nor[i + 1], nor[i + 2]];
      if (NAS_ARESTAS(p) && Math.abs(n[1]) < 0.5) maior = Math.max(maior, desvio(n, p));
    }
  }
  return maior;
};
const NO_GLTF = (neutro) => {
  const r = exportarGltf({ neutro, materiais: { m: { cor: '#888888' } } });
  const { json } = lerGlb(r.bytes);
  const ler = (i) => {
    const a = json.accessors[i]; const v = json.bufferViews[a.bufferView];
    return new Float32Array(r.bin.buffer.slice(r.bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), r.bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0) + a.count * 12));
  };
  let maior = 0;
  for (const prim of json.meshes[0].primitives) {
    const pos = ler(prim.attributes.POSITION), nor = ler(prim.attributes.NORMAL);
    for (let i = 0; i < pos.length; i += 3) {
      const p = [pos[i], pos[i + 1], pos[i + 2]], n = [nor[i], nor[i + 1], nor[i + 2]];
      if (NAS_ARESTAS(p) && Math.abs(n[1]) < 0.5) maior = Math.max(maior, desvio(n, p));
    }
  }
  return maior;
};
const NA_VISTA_RAPIDA = (neutro) => {
  const faces = [...neutro.F.values()].map((f) => ({ pts: f.vs.map((v) => neutro.V.get(v)), parte: 'p', cor: '#888888' }));
  const cantos = normaisDosCantos(faces, 35);
  let maior = 0;
  faces.forEach((f, i) => f.pts.forEach((p, k) => { const n = cantos[i][k]; if (NAS_ARESTAS(p) && Math.abs(n[1]) < 0.5) maior = Math.max(maior, desvio(n, p)); }));
  return maior;
};

/* AS NORMAIS NUM PONTO, por implementação: a lista das normais de canto liso que cada uma põe nos vértices a menos de 1e-6 de `alvo` */
const perto = (p, alvo) => Math.hypot(p[0] - alvo[0], p[1] - alvo[1], p[2] - alvo[2]) < 1e-6;
const NO_PONTO = {
  'adaptador do núcleo': (neutro, alvo) => {
    const ctx = { tex: { texCanvas: (w, h) => ({ width: w, height: h }) }, m4: { ident: () => new Float32Array(16) } };
    const saida = [];
    for (const lote of adaptarV3(neutro, ctx).lotes) { const v = lote.mesh.v; for (let k = 0; k < v.length; k += 8) if (perto([v[k], v[k + 1], v[k + 2]], alvo)) saida.push([v[k + 5], v[k + 6], v[k + 7]]); }
    return saida;
  },
  bancada: (neutro, alvo) => {
    const saida = [];
    for (const malha of adaptarThree(neutro).partes.get('p').children) {
      const pos = malha.geometry.getAttribute('position').array, nor = malha.geometry.getAttribute('normal').array;
      for (let i = 0; i < pos.length; i += 3) if (perto([pos[i], pos[i + 1], pos[i + 2]], alvo)) saida.push([nor[i], nor[i + 1], nor[i + 2]]);
    }
    return saida;
  },
  'exportador glTF': (neutro, alvo) => {
    const r = exportarGltf({ neutro, materiais: { m: { cor: '#888888' } } });
    const { json } = lerGlb(r.bytes);
    const ler = (i) => {
      const a = json.accessors[i]; const v = json.bufferViews[a.bufferView]; const o = r.bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
      return new Float32Array(r.bin.buffer.slice(o, o + a.count * 12));
    };
    const saida = [];
    for (const prim of json.meshes[0].primitives) {
      const pos = ler(prim.attributes.POSITION), nor = ler(prim.attributes.NORMAL);
      for (let i = 0; i < pos.length; i += 3) if (perto([pos[i], pos[i + 1], pos[i + 2]], alvo)) saida.push([nor[i], nor[i + 1], nor[i + 2]]);
    }
    return saida;
  },
  'vista rápida': (neutro, alvo) => {
    const faces = [...neutro.F.values()].map((f) => ({ pts: f.vs.map((v) => neutro.V.get(v)), parte: 'p', cor: '#888888' }));
    const cantos = normaisDosCantos(faces, 180);
    const saida = [];
    faces.forEach((f, i) => f.pts.forEach((p, k) => { if (perto(p, alvo)) saida.push(cantos[i][k]); }));
    return saida;
  },
};
const graus = (a, b) => (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b))))) * 180) / Math.PI;
const neutroDe = (pontos, faces) => ({
  V: new Map(Object.entries(pontos).map(([k, p]) => [Number(k), p])),
  F: new Map(faces.map((vs, i) => [i + 1, { id: i + 1, vs, parte: 'p', material: 'm', liso: true }])),
  partes: { p: {} }, orfaos: [],
});

/* A FACE EM GRAVATA do furgão (o quadrilátero que se cruza, canto de 354°) e a côncava ao lado dela, as duas no plano z = 0 com a
   normal para -z: a triangulação de cada uma tem um triângulo virado, e a bancada e o glTF davam +z no canto 4 */
const MM = (p) => p.map((x) => x / 1000);
const GRAVATA = neutroDe({
  1: MM([748.5149, 2285.5334, -2670]), 2: MM([757.4364, 2288.5114, -2669.9603]), 3: MM([776.0492, 2278.7556, -2670]),
  4: MM([781.0739, 2278.1335, -2670]), 5: MM([814.6138, 2264.5078, -2669.9874]), 6: MM([795.4353, 2274.0223, -2669.9997]),
}, [[1, 2, 3, 4], [5, 4, 3, 6]]);

/* O QUAD TORCIDO: a sela z = x·y/5 em 3 por 3 quadriláteros de 1, nenhum deles plano; no canto do meio (1, 1) a normal da sela é
   (-y, -x, 5)/|.| = (-1, -1, 5)/|.| */
const sela = () => {
  const P = {}; const faces = [];
  for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3; j++) P[10 * i + j] = [i, j, (i * j) / 5];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([10 * i + j, 10 * (i + 1) + j, 10 * (i + 1) + j + 1, 10 * i + j + 1]);
  return neutroDe(P, faces);
};

/* A LASCA NO VINCO: duas faces boas que dobram 60° na aresta x = 0, e no canto (0, 1, 0) uma lasca de 0,0005 de largura (razão
   2,5e-4, abaixo do limite de face fina) torta 45° e com o canto quase raso ali; sem ela, a normal do canto é a média das duas */
const vinco = (comLasca) => {
  const c = Math.cos(Math.PI / 3), s = Math.sin(Math.PI / 3), e = 0.0005 / Math.SQRT2;
  const P = { 1: [0, 0, 0], 2: [0, 1, 0], 3: [-1, 1, 0], 4: [-1, 0, 0], 5: [c, 0, -s], 6: [c, 1, -s] };
  const faces = [[4, 3, 2, 1], [2, 6, 5, 1]];
  if (comLasca) { P[7] = [-0.5, 1, 0]; P[8] = [0.5, 1 + e, e]; faces.push([7, 2, 8]); }
  return neutroDe(P, faces);
};

describe('normal lisa pesada pelo ângulo do canto', () => {
  it('o ângulo do canto: 90° no quadrado, 270° no canto reflexo de um L com a normal, e entre 0 e 180° sem ela', () => {
    /* o quadrado (0,1) (0,0) (1,0) (1,1) gira no sentido anti-horário em volta de +z, que é a normal de Newell dele */
    expect(anguloDoCanto([0, 1, 0], [0, 0, 0], [1, 0, 0], [0, 0, 1])).toBeCloseTo(Math.PI / 2, 12);
    expect(anguloDoCanto([1, 0, 0], [0, 0, 0], [0, 1, 0], [0, 0, 1])).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(anguloDoCanto([1, 0, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(Math.PI / 2, 12);
    expect(anguloDoCanto([0, 0, 0], [0, 0, 0], [1, 0, 0])).toBe(0);
  });

  it('o fator da lasca: 1 na face boa, o piso abaixo do limite de face fina e a rampa até o dobro dele', () => {
    expect(fatorDaFaceLisa([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]])).toBe(1);
    expect(fatorDaFaceLisa([[0, 0, 0], [1, 0, 0], [1, 0.001, 0], [0, 0.001, 0]])).toBeLessThan(1e-5);
    expect(fatorDaFaceLisa([[0, 0, 0], [1, 0, 0], [1, 0.0045, 0], [0, 0.0045, 0]])).toBeCloseTo(0.5, 9);
  });

  for (const [nome, medir] of Object.entries(NO_PONTO)) {
    it(`${nome}: a face em gravata e a côncava ao lado não invertem a normal do canto, que fica com a do plano, -z`, () => {
      const normais = medir(GRAVATA, GRAVATA.V.get(4));
      expect(normais.length).toBeGreaterThan(0);
      for (const n of normais) expect(graus(n, [0, 0, -1])).toBeLessThan(2);
    });
    it(`${nome}: no quad torcido (a sela), a normal do canto do meio fica a menos de 2° da normal da sela`, () => {
      const normais = medir(sela(), [1, 1, 0.2]);
      expect(normais.length).toBeGreaterThan(0);
      for (const n of normais) expect(graus(n, [-1, -1, 5])).toBeLessThan(2);
    });
    it(`${nome}: a lasca torta no vinco não puxa a normal das faces boas vizinhas`, () => {
      const [sem] = medir(vinco(false), [0, 1, 0]);
      const com = medir(vinco(true), [0, 1, 0]);
      expect(com.length).toBeGreaterThan(0);
      for (const n of com) expect(graus(n, sem)).toBeLessThan(0.01);
    });
  }

  for (const [nome, medir] of [['adaptador do núcleo', PELO_NUCLEO], ['bancada', NA_BANCADA], ['exportador glTF', NO_GLTF], ['vista rápida', NA_VISTA_RAPIDA]]) {
    it(`${nome}: a faceta de cilindro dividida em leque de 1 a 9 triângulos não desvia a normal das arestas dela`, () => {
      expect(medir(prisma(0))).toBeLessThan(1e-4);
      for (const n of [1, 3, 8]) expect(medir(prisma(n))).toBeLessThan(1e-4);
    });
  }
});
