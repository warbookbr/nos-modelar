/* estouro-de-bloco.test.ts — nenhum passo que passa de BLOCO ids lança erro:
   espelha, arranja, furo e os geradores com lados:{desvio} continuam na faixa
   estendida (`idDoPasso`), e as booleanas degeneradas gritam sem apagar a peça. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { BASE_ESTENDIDA, BLOCO, nucleo } from '../entrada.js';
import { conferirMalha, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

const estendidos = (n: any) => [[...n.V.keys()], [...n.F.keys()]].map((ids: number[]) => ids.filter((k) => k >= BASE_ESTENDIDA).length);
const cubo = (id: number, em: number[], lado = 1) => ['cubo', { origemId: id, lado, em }];
const A = { op: 'cubo', id: 1 }, B = { op: 'cubo', id: 2 };

describe('booleana degenerada grita e preserva os operandos', () => {
  it('intersectar de cubos encostados por face com deslocamento: erro claro, 12 faces intactas', () => {
    const n = nucleo([cubo(1, [0, 0, 0]), cubo(2, [1, 0.5, 0.5]), ['intersectar', { origemId: 9, solidos: [{ origem: A }, { origem: B }] }]]);
    expect(n.orfaos.map((o: any) => o.motivo).join()).toMatch(/não têm volume em comum/);
    expect(n.F.size).toBe(12);
    expect(n.V.size).toBe(16);
  });
  it('caso alinhado em:[1,0,0]: diz que não tem volume, não "defeito do cálculo"', () => {
    const n = nucleo([cubo(1, [0, 0, 0]), cubo(2, [1, 0, 0]), ['intersectar', { origemId: 9, solidos: [{ origem: A }, { origem: B }] }]]);
    const m = n.orfaos.map((o: any) => o.motivo).join();
    expect(m).toMatch(/não têm volume em comum/);
    expect(m).not.toMatch(/defeito do cálculo/);
    expect(n.F.size).toBe(12);
  });
});

describe('passo com mais de BLOCO ids não lança', () => {
  it('cilindro com lados:{desvio} que pede mais de BLOCO/2 lados', () => {
    const n = nucleo([['cilindro', { origemId: 1, raio: 1, altura: 1, lados: { desvio: 1e-6 } }]]);
    expect(n.orfaos).toEqual([]);
    expect(n.V.size).toBeGreaterThan(BLOCO);
    expect(estendidos(n)[0]).toBeGreaterThan(0);
    conferirMalha(n, { fechada: true, rotulo: 'cilindro grande' });
  });
  it('cone com lados:{desvio} que pede mais de BLOCO lados', () => {
    const n = nucleo([['cone', { origemId: 1, raio: 1, altura: 1, lados: { desvio: 2e-6 } }]]);
    expect(n.orfaos).toEqual([]);
    expect(n.V.size).toBeGreaterThan(BLOCO);
    expect(vinculosNaoManifold(n)).toEqual([]);   // triângulos de área ínfima são esperados com milhares de lados
  });
  it('espelha com mais de BLOCO vértices e faces novas', () => {
    const n = nucleo([['cilindro', { origemId: 1, raio: 1, altura: 1, lados: 1200 }], ['espelha', { eixo: 'x', pos: 2 }]]);
    expect(n.orfaos).toEqual([]);
    expect(n.F.size).toBe(2 * 1202);
    expect(estendidos(n)[0]).toBeGreaterThan(0);
    expect(estendidos(n)[1]).toBeGreaterThan(0);
  });
  it('arranja com mais de BLOCO vértices novos', () => {
    const n = nucleo([['cilindro', { origemId: 10, raio: 0.4, altura: 1, lados: 100 }],
      ['arranja', { modo: 'linear', d: [2, 0, 0], total: 8, origemId: 20, derivaDe: { op: 'cilindro', id: 10 }, sel: { origem: { op: 'cilindro', id: 10 } } }]]);
    expect(n.orfaos).toEqual([]);
    expect(n.F.size).toBe(102 + 7 * 100);   // a origem `cilindro` sem tampa cita só as laterais
    expect(estendidos(n)[0]).toBeGreaterThan(0);
    const ids = new Set([...n.F.keys()]);
    expect(ids.size).toBe(n.F.size);
  });
  it('furo com lados:{desvio} que passa de BLOCO ids, fechado e determinístico', () => {
    const passos = [['cilindro', { origemId: 1, raio: 0.06, altura: 0.012, lados: 16 }],
      ['furo', { origemId: 9, de: { op: 'cilindro', id: 1, tampa: 'topo' }, saida: { op: 'cilindro', id: 1, tampa: 'fundo' }, raio: 0.005, lados: { desvio: 1e-8 }, orientacao: [1, 0, 0], centros: [[0, 0, 0]] }]];
    const n = nucleo(passos);
    expect(n.orfaos).toEqual([]);
    expect(estendidos(n)[0]).toBeGreaterThan(0);
    conferirMalha(n, { fechada: true, rotulo: 'furo grande' });
    expect(JSON.stringify([...nucleo(passos).F.keys()])).toBe(JSON.stringify([...n.F.keys()]));
  });
});

describe('raio mínimo do arredondarCostura é local à costura', () => {
  it('peça grande com encontro pequeno aceita o raio que a escala do encontro comporta', () => {
    /* placa de 20 x 20 x 0,2 com um pino de lado 0,3 atravessando o topo: a
       costura tem meia-extensão 0,15, e a caixa inteira, 10; 1/64 da caixa
       daria 0,156 e recusaria qualquer raio útil */
    const passos = (raio: number) => [
      ['cubo', { origemId: 1, larg: 20, alt: 0.2, prof: 20 }],
      ['cubo', { origemId: 2, larg: 0.3, alt: 0.4, prof: 0.3, em: [0, 0.2, 0] }],
      ['unir', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
      ['arredondarCostura', { origemId: 10, de: { op: 'unir', id: 9 }, raio }]];
    const ok = nucleo(passos(0.02));
    expect(ok.orfaos.map((o: any) => o.motivo)).toEqual([]);
    const pequeno = nucleo(passos(0.0005));
    expect(pequeno.orfaos.map((o: any) => o.motivo).join()).toMatch(/pequeno demais para esta costura/);
  });
});
