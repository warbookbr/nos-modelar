// Testes da coordenada de textura: faixa contínua num cilindro, grade regular numa placa, caixa num cubo inclinado e determinismo.
import { describe, expect, it } from 'vitest';
import { coordenadasDeTextura } from './coordenada-de-textura.js';
import { normalizarMaterial } from './material-da-receita.js';

const relevo = (tipo, extra = {}) => normalizarMaterial('t', { relevo: { tipo, ...extra } }).relevo;

/* um quadrilátero a, b, c, d (anti-horário visto de fora) em dois triângulos */
const quad = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];

function cilindro(raio, altura, lados, y0 = 0) {
  const t = [];
  for (let i = 0; i < lados; i += 1) {
    const a0 = (i / lados) * 2 * Math.PI;
    const a1 = ((i + 1) / lados) * 2 * Math.PI;
    const p = (a, y) => [raio * Math.cos(a), y, raio * Math.sin(a)];
    /* visto de fora, o ângulo cresce de x para z; o anti-horário vai no sentido contrário */
    t.push(...quad(p(a1, y0), p(a0, y0), p(a0, y0 + altura), p(a1, y0 + altura)));
  }
  return t;
}

const CUBO = [
  [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
  [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
  [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
  [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
  [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]],
  [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
];

function girar(ponto, eixo, ang) {
  const n = Math.hypot(...eixo);
  const [x, y, z] = eixo.map((v) => v / n);
  const c = Math.cos(ang); const s = Math.sin(ang);
  const [px, py, pz] = ponto;
  const d = x * px + y * py + z * pz;
  return [
    px * c + (y * pz - z * py) * s + x * d * (1 - c),
    py * c + (z * px - x * pz) * s + y * d * (1 - c),
    pz * c + (x * py - y * px) * s + z * d * (1 - c),
  ];
}

describe('coordenadasDeTextura', () => {
  it('numa banda de cilindro dá uma faixa contínua: v é a altura em tiles, u corre uma volta inteira de tiles sem salto', () => {
    const tile = 0.12; // 5 tiles na circunferência de 0,628 m
    const lados = 48;
    const P = cilindro(0.1, 0.08, lados);
    const uv = coordenadasDeTextura(P, relevo('bandaDeRodagem'), tile);
    expect(uv.length).toBe((P.length / 3) * 2);
    let menorU = Infinity; let maiorU = -Infinity;
    for (let t = 0; t < P.length / 9; t += 1) {
      const us = [0, 1, 2].map((k) => uv[t * 6 + 2 * k]);
      /* dentro de cada triângulo, mesmo no que cruza a emenda, a coordenada anda pouco: a volta tem 5 tiles em 48 lados */
      expect(Math.max(...us) - Math.min(...us)).toBeLessThan(5 / lados + 1e-6);
      for (let k = 0; k < 3; k += 1) {
        expect(uv[t * 6 + 2 * k + 1]).toBeCloseTo(-P[t * 9 + 3 * k + 1] / tile, 5);
        menorU = Math.min(menorU, us[k]); maiorU = Math.max(maiorU, us[k]);
      }
    }
    /* a volta cobre 5 tiles inteiros (um número inteiro, logo sem emenda) */
    expect(maiorU - menorU).toBeGreaterThan(5 - 5 / lados - 1e-6);
    expect(maiorU - menorU).toBeLessThan(5 + 5 / lados + 1e-6);
    /* a mesma posição no ângulo, uma volta depois, cai no mesmo ponto do tile: u mod 5 do vértice em ângulo 0 e em ângulo 2π */
    const u0 = uv[0] - Math.floor(uv[0] / 5) * 5;
    const uVolta = (uv[0] + 5) - Math.floor((uv[0] + 5) / 5) * 5;
    expect(uVolta).toBeCloseTo(u0, 9);
  });

  it('as faces de topo e fundo do cilindro seguem a volta: v é o raio e o texto corre em arco', () => {
    const tile = 0.05;
    /* um trecho da tampa de cima (normal +y) entre os raios 0,06 e 0,09, de 0 a 10 graus, anti-horário visto de +y */
    const ponto = (r, g) => [r * Math.cos((g * Math.PI) / 180), 0.1, r * Math.sin((g * Math.PI) / 180)];
    const P = [...ponto(0.06, 10), ...ponto(0.06, 0), ...ponto(0.09, 0), ...ponto(0.06, 10), ...ponto(0.09, 0), ...ponto(0.09, 10)];
    const uv = coordenadasDeTextura(P, relevo('letras'), tile, { centro: [0, 0.05, 0], raio: 0.1 });
    const voltas = Math.round((2 * Math.PI * 0.1) / tile);
    for (let k = 0; k < 6; k += 1) {
      const r = Math.hypot(P[3 * k], P[3 * k + 2]);
      expect(uv[2 * k + 1]).toBeCloseTo(-r / tile, 5);
    }
    /* 10 graus de arco são voltas/36 tiles, no mesmo sentido para os dois raios */
    expect(Math.abs(uv[0] - uv[2])).toBeCloseTo(voltas / 36, 5);
    expect(uv[0] - uv[2]).toBeCloseTo(uv[10] - uv[4], 5);
  });

  it('numa placa dá uma grade regular: o passo de u e de v é a aresta dividida pelo tile', () => {
    const tile = 0.024;
    /* a placa de 0,2 x 0,16 m no plano z, normal +z, em 8 x 8 quadradinhos */
    const P = [];
    for (let j = 0; j < 8; j += 1) {
      for (let i = 0; i < 8; i += 1) {
        const x0 = -0.1 + i * 0.025; const x1 = x0 + 0.025; const y0 = j * 0.02; const y1 = y0 + 0.02;
        P.push(...quad([x0, y0, 0.005], [x1, y0, 0.005], [x1, y1, 0.005], [x0, y1, 0.005]));
      }
    }
    const uv = coordenadasDeTextura(P, relevo('prismas', { projecao: 'plana', eixo: 'z' }), tile);
    for (let k = 0; k < P.length / 3; k += 1) {
      expect(uv[2 * k]).toBeCloseTo(P[3 * k] / tile, 5);
      expect(uv[2 * k + 1]).toBeCloseTo(-P[3 * k + 1] / tile, 5);
    }
    /* o passo entre quadradinhos vizinhos é o mesmo em toda a placa */
    const passo = uv[2] - uv[0];
    expect(passo).toBeCloseTo(0.025 / tile, 5);
    /* lado de trás da placa (normal -z) tem u invertido, para o desenho não sair espelhado */
    const trás = coordenadasDeTextura(quad([0.1, 0, 0], [0, 0, 0], [0, 0.1, 0], [0.1, 0.1, 0]), relevo('prismas', { projecao: 'plana', eixo: 'z' }), tile);
    expect(trás[0]).toBeCloseTo(-0.1 / tile, 5);
  });

  it('a caixa escolhe por triângulo o eixo dominante da normal num cubo inclinado, e as duas metades de uma face concordam', () => {
    const tile = 0.01;
    const P = [];
    const eixos = [];
    for (const face of CUBO) {
      const g = face.map((c) => girar(c.map((v) => v * 0.03), [1, 1, 0.3], 0.5));
      P.push(...quad(...g));
    }
    const uv = coordenadasDeTextura(P, relevo('prismas'), tile);
    for (let t = 0; t < P.length / 9; t += 1) {
      const o = t * 9;
      const u = [P[o + 3] - P[o], P[o + 4] - P[o + 1], P[o + 5] - P[o + 2]];
      const v = [P[o + 6] - P[o], P[o + 7] - P[o + 1], P[o + 8] - P[o + 2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      let a = 0;
      for (let k = 1; k < 3; k += 1) if (Math.abs(n[k]) > Math.abs(n[a])) a = k;
      eixos.push(a);
      const [p, q] = [[1, 2], [2, 0], [0, 1]][a];
      const s = n[a] < 0 ? -1 : 1;
      for (let k = 0; k < 3; k += 1) {
        expect(uv[t * 6 + 2 * k]).toBeCloseTo((s * P[o + 3 * k + p]) / tile, 4);
        expect(uv[t * 6 + 2 * k + 1]).toBeCloseTo(-P[o + 3 * k + q] / tile, 4);
      }
    }
    for (let f = 0; f < 6; f += 1) expect(eixos[2 * f]).toBe(eixos[2 * f + 1]);
    expect(new Set(eixos).size).toBe(3);
  });

  it('é determinística e recusa entrada inválida', () => {
    const P = cilindro(0.1, 0.08, 24);
    const a = coordenadasDeTextura(P, relevo('bandaDeRodagem'), 0.12);
    const b = coordenadasDeTextura(P, relevo('bandaDeRodagem'), 0.12);
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
    expect(() => coordenadasDeTextura(P, relevo('bandaDeRodagem'), 0)).toThrow(/metrosPorTile/);
    expect(() => coordenadasDeTextura([1, 2, 3], relevo('prismas'), 1)).toThrow(/9 números/);
  });
});

describe('o relevo normalizado com projeção', () => {
  it('traz os padrões por tipo e recusa valor desconhecido com o nome do campo', () => {
    expect(relevo('prismas')).toMatchObject({ projecao: 'caixa', eixo: 'y' });
    expect(relevo('granulado').projecao).toBe('caixa');
    expect(relevo('bandaDeRodagem').projecao).toBe('cilindrica');
    expect(relevo('letras').projecao).toBe('cilindrica');
    expect(relevo('prismas', { projecao: 'plana', eixo: 'x' })).toMatchObject({ projecao: 'plana', eixo: 'x' });
    expect(() => relevo('prismas', { projecao: 'esferica' })).toThrow(/relevo\.projecao/);
    expect(() => relevo('prismas', { eixo: 'w' })).toThrow(/relevo\.eixo/);
  });
});
