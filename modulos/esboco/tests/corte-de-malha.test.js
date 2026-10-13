/* A seção de corte de uma forma cuja superfície é uma malha de pedaços convexos (a asa e a pá da família `superficie-aerodinamica`)
   com um vão recortado. A parede do vão é cortada pelo casco convexo de cada pedaço, e a superfície pela própria malha; as duas
   diferem de décimos de milímetro (mais que a tolerância de junção de 1e-3 mm), e as pontas da seção que chegam à parede e à
   superfície não se encontravam. O encadeamento partia do meio da cadeia, deixava um trecho para cada lado e cada trecho virava um
   laço de fio, sem área: a seção saía só como contorno, sem hachura, com um buraco na linha de baixo (o corte z=4522 da asa do
   avião, segunda rodada). A prova aqui é o laço único, o desenho preenchido e a área da seção. */
import { describe, expect, it } from 'vitest';
import { lacosDoPlano } from '../src/corte.js';

/* uma parede vertical (retângulo de z -1 a 1) sobre o segmento a-b do plano z=0 */
const parede = (a, b) => ({ pts: [[a[0], a[1], -1], [b[0], b[1], -1], [b[0], b[1], 1], [a[0], a[1], 1]] });
const area = (laco) => Math.abs(laco.reduce((s, p, i) => s + p[0] * laco[(i + 1) % laco.length][1] - laco[(i + 1) % laco.length][0] * p[1], 0)) / 2;

describe('lacosDoPlano: cadeia com uma folga entre as pontas', () => {
  const cantos = [[0, 0], [10, 0], [10, 10], [0, 10]];
  /* o quadrado de 10 mm com a quarta parede 0,02 mm curta do começo: a ponta do fim da cadeia não cai na do começo (1e-3 mm) */
  const quadrado = (folga) => [parede(cantos[0], cantos[1]), parede(cantos[1], cantos[2]), parede(cantos[2], cantos[3]), parede(cantos[3], [0, folga])];
  const ordens = [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2], [2, 0, 3, 1]];

  for (const ordem of ordens) {
    it(`sai um laço só, com a área do quadrado, qualquer que seja a parede por onde a cadeia começa (${ordem.join(' ')})`, () => {
      const faces = quadrado(0.02);
      const lacos = lacosDoPlano(ordem.map((i) => faces[i]), { eixo: 'z', valor: 0 });
      expect(lacos).toHaveLength(1);
      expect(area(lacos[0])).toBeGreaterThan(99.5);
      expect(area(lacos[0])).toBeLessThan(100.5);
    });
  }

  it('a folga que fecha com a tolerância de junção continua sendo um laço de quatro pontas', () => {
    const lacos = lacosDoPlano(quadrado(0.0005), { eixo: 'z', valor: 0 });
    expect(lacos).toHaveLength(1);
    expect(lacos[0]).toHaveLength(4);
  });

  it('a cadeia aberta que não acha par no fecho é fechada na mesma, num laço só', () => {
    /* o quadrado de 10 mm sem a quarta parede: as duas pontas abertas distam 10 mm, muito mais que o fecho (2% da diagonal) */
    const lacos = lacosDoPlano(quadrado(0.02).slice(0, 3).reverse(), { eixo: 'z', valor: 0 });
    expect(lacos).toHaveLength(1);
    expect(area(lacos[0])).toBeCloseTo(100, 0);
  });

  it('dois quadrados separados saem em dois laços, e uma cadeia não se liga à ponta de outra longe dela', () => {
    const outro = quadrado(0.02).map((f) => ({ pts: f.pts.map(([x, y, z]) => [x + 50, y, z]) }));
    const lacos = lacosDoPlano([...quadrado(0.02), ...outro], { eixo: 'z', valor: 0 });
    expect(lacos).toHaveLength(2);
    for (const l of lacos) expect(area(l)).toBeGreaterThan(99.5);
  });
});
