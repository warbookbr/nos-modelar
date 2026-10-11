/* contato-de-solidos-em-milimetro.test.mjs — o contato de sólidos numa peça de milímetros (a metro por unidade).
   Três tolerâncias absolutas do módulo deixavam de separar o que está separado quando os triângulos têm poucos
   milímetros quadrados: o ponto sobre triângulo (produto vetorial não normalizado), o eixo do teste de separação
   (piso sobre o quadrado do eixo) e o raio paralelo ao triângulo (determinante contra uma distância). */
import { describe, expect, it } from 'vitest';
import { auditarParDeSolidos, prepararSolido } from './contato-de-solidos.js';

const MM = 0.001;
/* caixa alinhada aos eixos, em milímetro, como neutro com as seis faces para fora */
function caixa([x0, y0, z0], [x1, y1, z1]) {
  const cantos = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const V = new Map(cantos.map((c, i) => [i, c.map((n) => n * MM)]));
  const quadros = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]];
  return { V, F: new Map(quadros.map((vs, i) => [i, { id: i, vs }])) };
}
/* várias caixas na mesma malha (cascas separadas), para as caixas envolventes dos dois sólidos se cruzarem */
function conjunto(...caixas) {
  const V = new Map(); const F = new Map();
  caixas.forEach((c, k) => {
    for (const [id, p] of c.V) V.set(k * 8 + id, p);
    for (const [id, f] of c.F) F.set(k * 6 + id, { id: k * 6 + id, vs: f.vs.map((v) => k * 8 + v) });
  });
  return { V, F };
}
const estado = (a, b, tolerancia = 1e-9) => auditarParDeSolidos(prepararSolido(a, null, 'a'), prepararSolido(b, null, 'b'), tolerancia).estado;

describe('contato de sólidos com feições de milímetro', () => {
  it('duas chapas afastadas que dividem os planos de espessura estão separadas, e não "sobre a superfície"', () => {
    const a = conjunto(caixa([0, 0, 0], [2, 2, 1]), caixa([6, 0, 0], [8, 2, 1]));
    const b = caixa([3, 0, 0], [5, 2, 1]);
    expect(estado(a, b)).toBe('separadas');
    expect(estado(b, a)).toBe('separadas');
  });

  it('a chapa que entra um milímetro na outra se invade, e a que só encosta numa face encosta', () => {
    const base = caixa([0, 0, 0], [2, 2, 1]);
    expect(estado(base, caixa([1.5, 0, 0], [3.5, 2, 1]))).toBe('interpenetram');
    expect(estado(base, caixa([2, 0, 0], [4, 2, 1]))).toBe('encostam');
  });

  it('dois discos poligonais empilhados em milímetro, como olhais de dobradiça, encostam na face comum e se invadem se um desce', () => {
    /* prisma de 12 lados (raio 9 mm, altura 40 mm) com a face de topo e de base triangulada pelo earcut: o encosto
       entre eles é coplanar, com dezenas de triângulos de poucos mm² dos dois lados */
    const prisma = (y0, y1) => {
      const lados = 12; const V = new Map(); const F = new Map();
      for (let i = 0; i < lados; i += 1) {
        const ang = (2 * Math.PI * i) / lados;
        V.set(i, [9 * Math.cos(ang) * MM, y0 * MM, 9 * Math.sin(ang) * MM]);
        V.set(lados + i, [9 * Math.cos(ang) * MM, y1 * MM, 9 * Math.sin(ang) * MM]);
      }
      F.set('base', { id: 'base', vs: [...Array(lados).keys()] });
      F.set('topo', { id: 'topo', vs: [...Array(lados).keys()].map((i) => lados + (lados - 1 - i)) });
      for (let i = 0; i < lados; i += 1) {
        const j = (i + 1) % lados;
        F.set(`lado${i}`, { id: `lado${i}`, vs: [i, lados + i, lados + j, j] });
      }
      return { V, F };
    };
    const embaixo = prisma(0, 40);
    expect(estado(embaixo, prisma(40, 80))).toBe('encostam');
    expect(estado(prisma(40, 80), embaixo)).toBe('encostam');
    expect(estado(embaixo, prisma(41, 81))).toBe('separadas');
    expect(estado(embaixo, prisma(39, 79))).toBe('interpenetram');
  });

  it('o sólido pequeno dentro de outro pequeno é achado pela contagem de cruzamentos do raio', () => {
    const fora = caixa([0, 0, 0], [0.6, 0.6, 0.6]);
    const dentro = caixa([0.2, 0.2, 0.2], [0.4, 0.4, 0.4]);
    expect(estado(fora, dentro)).toBe('interpenetram');
  });
});
