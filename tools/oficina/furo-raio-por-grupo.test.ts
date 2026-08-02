/* furo-raio-por-grupo.test.ts — contrato da F1: cada grupo de centros pode
   declarar raio e, em furo cego, profundidade próprios, sem mudar a numeração
   nem a ordem semântica dos furos. Nome de grupo pertence à fatia seguinte. */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo, neutroCanonico } from '../../prototipos/fps/v3/motor/oficina.js';
import { conferirMalha } from './conferir-malha.js';

const L = 12;
const PASSANTE = (centros: any, raio: any = 0.0055) => [
  ['cilindro', { id: 0, origemId: 1, raio: 0.060, altura: 0.012, lados: 16 }],
  ['furo', {
    origemId: 9,
    de: { op: 'cilindro', id: 1, tampa: 'topo' },
    saida: { op: 'cilindro', id: 1, tampa: 'fundo' },
    ...(raio == null ? {} : { raio }), lados: L, orientacao: [1, 0, 0], centros,
  }],
];
const CEGO = (centros: any, profundidade: any = 0.006, raio: any = 0.0055) => [
  ['cilindro', { id: 0, origemId: 1, raio: 0.060, altura: 0.012, lados: 16 }],
  ['furo', {
    origemId: 9,
    de: { op: 'cilindro', id: 1, tampa: 'topo' },
    ...(profundidade == null ? {} : { profundidade }),
    ...(raio == null ? {} : { raio }), lados: L, orientacao: [1, 0, 0], centros,
  }],
];

const anel = (n: any, k: number) => Array.from({ length: L }, (_, j) => n.V.get(1000 + 2 * L * k + j));
const raioDoAnel = (n: any, k: number) => {
  const pontos = anel(n, k);
  const centro = pontos.reduce((s: number[], p: number[]) => [s[0] + p[0] / L, s[1] + p[1] / L, s[2] + p[2] / L], [0, 0, 0]);
  return Math.hypot(pontos[0][0] - centro[0], pontos[0][1] - centro[1], pontos[0][2] - centro[2]);
};
const profundidadeDoFuro = (n: any, k: number) => {
  const entrada = n.V.get(1000 + 2 * L * k);
  const fundo = n.V.get(1000 + 2 * L * k + L);
  return Math.hypot(fundo[0] - entrada[0], fundo[1] - entrada[1], fundo[2] - entrada[2]);
};
const idsDoFuro = (n: any) => ({
  V: [...n.V.keys()].filter((id: number) => id >= 1000).sort((a: number, b: number) => a - b),
  F: [...n.F.keys()].filter((id: number) => id >= 1000).sort((a: number, b: number) => a - b),
});

describe('A-30/F1 — raio e profundidade por grupo de furo', () => {
  const misto = (raioCentral: any = 0.025) => [
    { centro: [0, 0, 0], raio: raioCentral },
    { distancia: 0.044, total: 4, volta: 360 },
  ];

  it('um disco e um círculo na mesma face usam raios distintos e continuam uma casca fechada', () => {
    const n = nucleo(PASSANTE(misto()) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'passagem central e quatro parafusos' });
    expect(raioDoAnel(n, 0)).toBeCloseTo(0.025, 12);
    for (let k = 1; k <= 4; k++) expect(raioDoAnel(n, k)).toBeCloseTo(0.0055, 12);
    expect(idsDoFuro(n).V).toHaveLength(2 * L * 5);
    expect(idsDoFuro(n).F).toHaveLength(3 * L * 5 + 2 * (16 + 2 * 5 - 2));
  });

  it('o raio do passo é padrão, e o raio declarado no círculo torna a forma antiga byte-idêntica', () => {
    const peloPadrao = nucleo(PASSANTE(misto()) as any, {}, {});
    const peloItem = nucleo(PASSANTE([
      { centro: [0, 0, 0], raio: 0.025 },
      { distancia: 0.044, total: 4, volta: 360, raio: 0.0055 },
    ], null) as any, {}, {});
    expect(JSON.stringify(neutroCanonico(peloItem))).toBe(JSON.stringify(neutroCanonico(peloPadrao)));

    const circuloVelho = nucleo(PASSANTE({ distancia: 0.044, total: 4, volta: 360 }) as any, {}, {});
    const circuloNovo = nucleo(PASSANTE([{ distancia: 0.044, total: 4, volta: 360, raio: 0.0055 }], null) as any, {}, {});
    expect(JSON.stringify(neutroCanonico(circuloNovo))).toBe(JSON.stringify(neutroCanonico(circuloVelho)));
  });

  it('PARAM de raio remodela sem renumerar, mesmo quando muda a ordem de ponte', () => {
    const passos = PASSANTE(misto('central'));
    const grande = nucleo(passos as any, { central: 0.025 }, {});
    const pequeno = nucleo(passos as any, { central: 0.003 }, {});
    expect(grande.orfaos).toEqual([]);
    expect(pequeno.orfaos).toEqual([]);
    expect(idsDoFuro(pequeno)).toEqual(idsDoFuro(grande));
    expect(raioDoAnel(pequeno, 0)).toBeCloseTo(0.003, 12);
  });

  it('item sem raio e passo sem padrão aborta antes de reservar o bloco', () => {
    const n = nucleo(PASSANTE([[0, 0, 0], { centro: [0.04, 0, 0], raio: 0.005 }], null) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o furo 0 não tem raio/);
    expect(idsDoFuro(n)).toEqual({ V: [], F: [] });
    expect(n.F.has(16), 'a tampa de entrada permanece viva').toBe(true);
  });

  it('furo dentro de furo recebe diagnóstico próprio, antes do cruzamento genérico', () => {
    const n = nucleo(PASSANTE([
      { centro: [0, 0, 0], raio: 0.025 },
      { distancia: 0.010, total: 2, volta: 180 },
    ]) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/anel 1 .* DENTRO do anel 0/);
    expect(idsDoFuro(n)).toEqual({ V: [], F: [] });
  });

  it('anéis de raios diferentes que se encostam são recusados, mas uma folga mínima continua fechada', () => {
    const encostado = nucleo(PASSANTE([
      { centro: [0, 0, 0], raio: 0.025 },
      { distancia: 0.0305, total: 2, volta: 180 },
    ]) as any, {}, {});
    expect(encostado.orfaos).toHaveLength(1);
    expect(encostado.orfaos[0].motivo).toMatch(/anéis 0 e 1 se cruzam ou se encostam/);
    expect(idsDoFuro(encostado)).toEqual({ V: [], F: [] });

    const separado = nucleo(PASSANTE([
      { centro: [0, 0, 0], raio: 0.025 },
      { distancia: 0.0306, total: 2, volta: 180 },
    ]) as any, {}, {});
    expect(separado.orfaos).toEqual([]);
    conferirMalha(separado, { fechada: true, rotulo: 'anéis de raios diferentes com folga' });
  });

  it('um furo cego mistura profundidade de disco, círculo e padrão sem alterar ids', () => {
    const passos = CEGO([
      { centro: [0, 0, 0], raio: 0.012, profundidade: 'passagem' },
      { distancia: 0.036, total: 2, volta: 180, profundidade: 'parafusos' },
    ], 'padrao');
    const n = nucleo(passos as any, { passagem: 0.008, parafusos: 0.003, padrao: 0.006 }, {});
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'três fundos em profundidades próprias' });
    expect(profundidadeDoFuro(n, 0)).toBeCloseTo(0.008, 12);
    expect(profundidadeDoFuro(n, 1)).toBeCloseTo(0.003, 12);
    expect(profundidadeDoFuro(n, 2)).toBeCloseTo(0.003, 12);
    const remodelado = nucleo(passos as any, { passagem: 0.005, parafusos: 0.003, padrao: 0.006 }, {});
    expect(idsDoFuro(remodelado)).toEqual(idsDoFuro(n));
    expect(profundidadeDoFuro(remodelado, 0)).toBeCloseTo(0.005, 12);
  });

  it('a profundidade do passo continua padrão e o item pode prescindir dela', () => {
    const peloPadrao = nucleo(CEGO([
      { centro: [0, 0, 0], raio: 0.012 },
      { distancia: 0.036, total: 2, volta: 180 },
    ], 0.006) as any, {}, {});
    const pelosItens = nucleo(CEGO([
      { centro: [0, 0, 0], raio: 0.012, profundidade: 0.006 },
      { distancia: 0.036, total: 2, volta: 180, profundidade: 0.006 },
    ], null) as any, {}, {});
    expect(JSON.stringify(neutroCanonico(pelosItens))).toBe(JSON.stringify(neutroCanonico(peloPadrao)));
  });

  it('profundidade por grupo é recusada no passo passante antes de reservar o bloco', () => {
    const n = nucleo(PASSANTE([{ centro: [0, 0, 0], profundidade: 0.004 }]) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/declara profundidade, mas este passo tem saida/);
    expect(idsDoFuro(n)).toEqual({ V: [], F: [] });
  });

  it('cego sem profundidade em parte dos grupos aborta antes de reservar o bloco', () => {
    const n = nucleo(CEGO([
      { centro: [0, 0, 0], profundidade: 0.004 },
      { distancia: 0.036, total: 2, volta: 180 },
    ], null) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o furo 1 não tem profundidade/);
    expect(idsDoFuro(n)).toEqual({ V: [], F: [] });
  });

  it('profundidade de grupo inválida aborta o passo inteiro', () => {
    const n = nucleo(CEGO([{ centro: [0, 0, 0], profundidade: 0 }], null) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o furo 0 tem profundidade inválida/);
    expect(idsDoFuro(n)).toEqual({ V: [], F: [] });
  });
});
