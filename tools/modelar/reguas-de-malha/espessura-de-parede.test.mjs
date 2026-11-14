/* espessura-de-parede.test.mjs — a casca de revolução (`lathe` com `espessura`) e a régua de espessura de parede: o copo de prova sai fechado, com a
   espessura pedida medida pela régua, e a régua acusa a parede fina de uma peça feita para isso. */
import { describe, expect, it } from 'vitest';
import { neutroCanonico, nucleo } from '../../../procedural/nucleo/entrada.js';
import { medirEspessuraDaParede, partesComParedeFina } from './espessura-de-parede.mjs';
import { avisosDasReguasDeMalha } from '../descrever-peca.mjs';

function arestasAbertas(neutro) {
  const d = new Map();
  for (const f of neutro.F.values()) f.vs.forEach((a, k) => { const c = `${a}>${f.vs[(k + 1) % f.vs.length]}`; d.set(c, (d.get(c) ?? 0) + 1); });
  let n = 0;
  for (const [c, q] of d) { const [a, b] = c.split('>'); if (q !== 1 || d.get(`${b}>${a}`) !== 1) n += 1; }
  return n;
}
/* o volume com sinal: positivo quando as normais saem do material */
function volume(neutro) {
  let v = 0;
  for (const f of neutro.F.values()) {
    const p = f.vs.map((id) => neutro.V.get(id));
    for (let k = 1; k < p.length - 1; k += 1) v += (p[0][0] * (p[k][1] * p[k + 1][2] - p[k][2] * p[k + 1][1]) - p[0][1] * (p[k][0] * p[k + 1][2] - p[k][2] * p[k + 1][0]) + p[0][2] * (p[k][0] * p[k + 1][1] - p[k][1] * p[k + 1][0])) / 6;
  }
  return v;
}
const COPO = [[0, 0], [0.04, 0], [0.045, 0.1]];   // o fundo, a lateral aberta para cima: [raio, y] em metro
const copo = (espessura, perfil = COPO) => nucleo([
  ['lathe', { origemId: 1, perfil, espessura, lados: 32 }],
  ['parte', { nome: 'copo', sel: { tudo: true } }],
], {}, {});

describe('lathe com espessura: a casca de revolução', () => {
  it('o copo de prova sai fechado, com normais para fora do material', () => {
    const n = copo(0.003);
    expect(n.orfaos).toEqual([]);
    expect(arestasAbertas(n)).toBe(0);
    expect(volume(n)).toBeGreaterThan(0);
  });

  it('o sentido da parede de dentro é decidido pela operação: o perfil de cima para baixo dá o mesmo copo', () => {
    const cima = copo(0.003, COPO);
    const baixo = copo(0.003, [...COPO].reverse());
    expect(baixo.orfaos).toEqual([]);
    expect(arestasAbertas(baixo)).toBe(0);
    expect(volume(baixo)).toBeCloseTo(volume(cima), 9);
    for (const n of [cima, baixo]) {
      const raios = [...n.V.values()].map((p) => Math.hypot(p[0], p[2]));
      expect(Math.min(...raios.filter((r) => r > 1e-9))).toBeLessThan(0.0405);   // a parede de dentro fica entre o eixo e a de fora
      expect(Math.max(...raios)).toBeCloseTo(0.045, 6);
    }
  });

  it('a espessura medida pela régua é a pedida, dentro de 1%', () => {
    for (const espessura of [0.002, 0.003, 0.005]) {
      const { partes } = medirEspessuraDaParede(copo(espessura));
      expect(partes).toHaveLength(1);
      expect(partes[0].parte).toBe('copo');
      expect(Math.abs(partes[0].minima - espessura) / espessura).toBeLessThan(0.01);
    }
  });

  it('o volume do copo é o do sólido de fora menos o de dentro', () => {
    const cheio = nucleo([['lathe', { perfil: [[0, 0], [0.04, 0], [0.045, 0.1], [0, 0.1]], lados: 32 }]], {}, {});
    expect(volume(copo(0.003))).toBeLessThan(volume(cheio));
    expect(volume(copo(0.003))).toBeGreaterThan(0);
  });

  it('é determinístico', () => {
    expect(JSON.stringify(neutroCanonico(copo(0.003)))).toBe(JSON.stringify(neutroCanonico(copo(0.003))));
  });

  it('recusa espessura zero, negativa, com furos e o perfil que não fecha volume', () => {
    const zero = nucleo([['lathe', { perfil: COPO, espessura: 0 }]], {}, {});
    expect(zero.orfaos[0]).toMatchObject({ op: 'lathe', ref: 'espessura' });
    expect(zero.orfaos[0].motivo).toContain("'espessura' vale 0");
    expect(zero.V.size).toBe(0);
    expect(nucleo([['lathe', { perfil: COPO, espessura: -0.003 }]], {}, {}).orfaos[0].motivo).toContain('maior que 0');
    expect(nucleo([['lathe', { perfil: COPO, espessura: 0.003, furos: [] }]], {}, {}).orfaos[0].motivo).toContain('furos nem deslocar');
    const reta = nucleo([['lathe', { perfil: [[0.04, 0], [0.04, 0.1]], espessura: 0.003 }]], {}, {});
    expect(reta.orfaos).toEqual([]);   // uma parede de fora longe do eixo fecha volume com o eixo: é um tubo
    expect(arestasAbertas(reta)).toBe(0);
  });

  it('espessura maior que a parede cabe é recusada com o campo', () => {
    const n = nucleo([['lathe', { perfil: COPO, espessura: 0.05 }]], {}, {});
    expect(n.orfaos.length).toBeGreaterThan(0);
    expect(n.orfaos[0].op).toBe('lathe');
    expect(n.V.size).toBe(0);
  });
});

describe('a régua de espessura de parede', () => {
  it('acusa a parede fina da peça feita para isso, com a parte e a medida', () => {
    const fina = copo(0.0004);
    const achados = partesComParedeFina(fina, { limite: 0.001 });
    expect(achados).toHaveLength(1);
    expect(achados[0].parte).toBe('copo');
    expect(achados[0].minima).toBeCloseTo(0.0004, 5);
    const { linhas, medidas } = avisosDasReguasDeMalha(fina);
    expect(linhas.some((l) => l.startsWith('parede fina na parte copo: espessura mínima de 0,4 mm'))).toBe(true);
    expect(medidas.paredesFinas[0]).toMatchObject({ parte: 'copo' });
  });

  it('não acusa o copo de parede boa', () => {
    expect(partesComParedeFina(copo(0.003))).toEqual([]);
    expect(avisosDasReguasDeMalha(copo(0.003)).linhas.filter((l) => l.startsWith('parede fina'))).toEqual([]);
  });

  it('a parte de uma superfície aberta, sem parede do outro lado, não é medida', () => {
    const n = nucleo([['plano', { largura: 1, profundidade: 1 }], ['parte', { nome: 'chao', sel: { tudo: true } }]], {}, {});
    expect(medirEspessuraDaParede(n).partes).toEqual([]);
  });

  it('o orçamento limita a amostra e a medida segue determinística', () => {
    const n = copo(0.0004);
    const cheia = medirEspessuraDaParede(n).partes[0];
    const curta = medirEspessuraDaParede(n, { orcamento: 2000 }).partes[0];
    expect(curta.amostras).toBeLessThan(cheia.amostras);
    expect(JSON.stringify(medirEspessuraDaParede(n, { orcamento: 2000 }))).toBe(JSON.stringify(medirEspessuraDaParede(n, { orcamento: 2000 })));
  });
});
