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
  it('sem mínimo declarado só informa: a espessura por parte sai como número e nenhum aviso', () => {
    const fina = copo(0.0004);
    const { linhas, medidas } = avisosDasReguasDeMalha(fina);
    expect(linhas.filter((l) => l.startsWith('parede fina'))).toEqual([]);
    expect(medidas.paredesDaPeca).toHaveLength(1);
    expect(medidas.paredesDaPeca[0].parte).toBe('copo');
    expect(medidas.paredesDaPeca[0].minima).toBeCloseTo(0.0004, 5);
    expect(medidas.paredesFinas).toEqual([]);
  });

  it('com o mínimo declarado de 1 mm, a peça de 0,4 mm avisa com a parte e a medida', () => {
    const { linhas, medidas } = avisosDasReguasDeMalha(copo(0.0004), { espessuraMinima: { mm: 1 } });
    expect(linhas.some((l) => l.startsWith('parede fina na parte copo: espessura mínima de 0,4 mm, abaixo dos 1 mm que o PLANO declara'))).toBe(true);
    expect(medidas.paredesFinas[0]).toMatchObject({ parte: 'copo' });
  });

  it('o mínimo só vale para as partes listadas, e não avisa o que está acima dele', () => {
    expect(avisosDasReguasDeMalha(copo(0.0004), { espessuraMinima: { mm: 1, partes: ['outra'] } }).linhas.filter((l) => l.startsWith('parede fina'))).toEqual([]);
    expect(avisosDasReguasDeMalha(copo(0.0004), { espessuraMinima: { mm: 1, partes: ['copo'] } }).medidas.paredesFinas).toHaveLength(1);
    expect(avisosDasReguasDeMalha(copo(0.003), { espessuraMinima: { mm: 1 } }).medidas.paredesFinas).toEqual([]);
    expect(avisosDasReguasDeMalha(copo(0.0004), { espessuraMinima: { mm: 0.3 } }).medidas.paredesFinas).toEqual([]);
  });

  it('partesComParedeFina lista as partes abaixo do limite', () => {
    expect(partesComParedeFina(copo(0.0004), { limite: 0.001 })).toHaveLength(1);
    expect(partesComParedeFina(copo(0.003))).toEqual([]);
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

describe('a régua conta só a saída do material', () => {
  function caixa(n, x0, y0, z0, x1, y1, z1, parte) {
    const b = n.V.size;
    [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].forEach((p, k) => n.V.set(b + k, p));
    [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach((f) => { const id = n.F.size; n.F.set(id, { id, vs: f.map((k) => k + b), parte }); });
  }
  it('duas caixas sobrepostas em 0,3 mm não dão parede de 0,3 mm', () => {
    const n = { V: new Map(), F: new Map() };
    caixa(n, 0, 0, 0, 0.1, 0.1, 0.1, 'a'); caixa(n, 0.0997, 0, 0, 0.2, 0.1, 0.1, 'a');
    const [p] = medirEspessuraDaParede(n).partes;
    expect(p.minima).toBeGreaterThan(0.09);
  });
  it('uma caixa sozinha mede a sua espessura menor', () => {
    const n = { V: new Map(), F: new Map() };
    caixa(n, 0, 0, 0, 0.1, 0.02, 0.1, 'a');
    expect(medirEspessuraDaParede(n).partes[0].minima).toBeCloseTo(0.02, 9);
  });
});

describe('a casca de revolução de uma tigela e as recusas que citam o perfil', () => {
  const TIGELA = [[0, -50], [19, -46], [35, -35], [46, -19], [50, 0]].map(([r, y]) => [r / 1000, y / 1000]);
  it('a tigela, com a ponta do perfil no eixo e o trecho inclinado, sai fechada, com a espessura de 2 mm', () => {
    const n = nucleo([['lathe', { origemId: 1, perfil: TIGELA, espessura: 0.002, lados: 32 }], ['parte', { nome: 'tigela', sel: { tudo: true } }]], {}, {});
    expect(n.orfaos).toEqual([]);
    expect(arestasAbertas(n)).toBe(0);
    expect(volume(n)).toBeGreaterThan(0);
    const eixo = [...n.V.values()].filter((p) => Math.hypot(p[0], p[2]) < 1e-9).map((p) => p[1]);
    expect(eixo.length).toBe(2);   // o fundo de fora e o de dentro, os dois no eixo
    expect(Math.abs(medirEspessuraDaParede(n).partes[0].minima - 0.002) / 0.002).toBeLessThan(0.02);
  });
  const motivo = (perfil, espessura) => nucleo([['lathe', { perfil, espessura }]], {}, {}).orfaos[0].motivo;
  it('a espessura maior que o raio cita o ponto do perfil escrito e a causa', () => {
    const m = motivo([[0, 0], [0.01, 0], [0.01, 0.1]], 0.015);
    expect(m).toContain('ponto 1 do perfil');
    expect(m).toContain('maior que o raio');
    expect(m).not.toMatch(/contorno da seção|externo\[/);
  });
  it('a folga que não cabe entre trechos cita os dois trechos', () => {
    const m = motivo([[0, 0], [0.04, 0], [0.04, 0.1], [0.03, 0.1], [0.03, 0.01]], 0.008);
    expect(m).toMatch(/não cabe entre o ponto \d do perfil .* e o trecho entre o ponto \d/);
    expect(m).toContain('a folga ali é');
  });
  it('o perfil que toca o eixo no meio e o de raio negativo dizem a causa', () => {
    expect(motivo([[0.03, 0], [0, 0.05], [0.03, 0.1]], 0.002)).toContain('toca o eixo no ponto 1');
    expect(motivo([[0, 0], [-0.04, 0], [-0.04, 0.1]], 0.002)).toContain('raio negativo no ponto 1');
  });
});
