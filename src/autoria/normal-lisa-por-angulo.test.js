/* normal-lisa-por-angulo.test.js — a normal lisa pesa cada face pelo ângulo do canto dela no vértice, nos quatro lugares que a
   calculam (o adaptador do núcleo, a bancada, o exportador glTF e a vista rápida), e por isso não muda quando uma face plana
   vizinha está dividida em mais triângulos. Com o peso igual ou pela área, a faceta refinada de um cilindro puxava a normal das
   arestas dela, e o sombreado mostrava uma faixa clara (a costura refinada da bicicleta, 2026-11-16). */
import { describe, expect, it } from 'vitest';
import { adaptarV3 } from '../../procedural/nucleo/entrada.js';
import { anguloDoCanto } from '../../procedural/nucleo/liso-por-angulo.js';
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

describe('normal lisa pesada pelo ângulo do canto', () => {
  it('o ângulo do canto: 90° no quadrado, 270° no canto reflexo de um L com a normal, e entre 0 e 180° sem ela', () => {
    /* o quadrado (0,1) (0,0) (1,0) (1,1) gira no sentido anti-horário em volta de +z, que é a normal de Newell dele */
    expect(anguloDoCanto([0, 1, 0], [0, 0, 0], [1, 0, 0], [0, 0, 1])).toBeCloseTo(Math.PI / 2, 12);
    expect(anguloDoCanto([1, 0, 0], [0, 0, 0], [0, 1, 0], [0, 0, 1])).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(anguloDoCanto([1, 0, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(Math.PI / 2, 12);
    expect(anguloDoCanto([0, 0, 0], [0, 0, 0], [1, 0, 0])).toBe(0);
  });

  for (const [nome, medir] of [['adaptador do núcleo', PELO_NUCLEO], ['bancada', NA_BANCADA], ['exportador glTF', NO_GLTF], ['vista rápida', NA_VISTA_RAPIDA]]) {
    it(`${nome}: a faceta de cilindro dividida em leque de 1 a 9 triângulos não desvia a normal das arestas dela`, () => {
      expect(medir(prisma(0))).toBeLessThan(1e-4);
      for (const n of [1, 3, 8]) expect(medir(prisma(n))).toBeLessThan(1e-4);
    });
  }
});
