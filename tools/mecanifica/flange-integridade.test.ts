/* flange-integridade.test.ts — prova em peça da F1/A-30: uma passagem central
 * e um círculo de parafusos, com raios distintos e nomes estáveis, no mesmo
 * passo. A figura é de tubulação para não congelar vocabulário automotivo. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — peça procedural em JavaScript.
import * as flange from '../../prototipos/procedural/v3/pecas/_flange-de-tubulacao.js';
import { conferirMalha } from '../oficina/conferir-malha.js';

const montar = (topo: any = flange.TOPO) =>
  nucleo(flange.PASSOS, flange.PARAMS, topo, flange.MATERIAIS, null, flange.ALIASES);
const facesDaParte = (n: any, nome: string) => [...n.F.values()].filter((f: any) => f.parte === nome);
const idsDoBloco = (mapa: Map<number, unknown>) => [...mapa.keys()].filter((id) => id >= 1000 && id < 2000);

describe('_flange-de-tubulacao — grupos reais em uma peça neutra', () => {
  it('fecha a casca, não deixa órfão e dá identidade a toda face', () => {
    const n = montar();
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f: any) => !f.parte)).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: '_flange-de-tubulacao' });
  });

  it('preserva a conta fechada da figura: 120 V e 228 F no bloco do corte', () => {
    const n = montar();
    expect(idsDoBloco(n.V)).toHaveLength(120);
    expect(idsDoBloco(n.F)).toHaveLength(228);
  });

  it('expõe somente corpo, passagem e fixação, com as paredes na medida do grupo', () => {
    const n = montar();
    expect([...new Set([...n.F.values()].map((f: any) => f.parte))].sort()).toEqual([
      'bocaDaPassagem', 'corpoDaFlange', 'furosDeParafuso',
    ]);
    expect(facesDaParte(n, 'bocaDaPassagem')).toHaveLength(flange.TOPO.furoLados);
    expect(facesDaParte(n, 'furosDeParafuso')).toHaveLength(flange.TOPO.parafusos * flange.TOPO.furoLados);
  });

  it('a origem por grupo alcança 36 faces da passagem e 144 dos parafusos', () => {
    const n = nucleo([
      ...flange.PASSOS,
      ['pincel', { modo: 'face', cor: '#f00', sel: { origem: { op: 'furo', id: 901, grupo: 'passagem' } } }],
      ['pincel', { modo: 'face', cor: '#0f0', sel: { origem: { op: 'furo', id: 901, grupo: 'parafusos' } } }],
    ] as any, flange.PARAMS, flange.TOPO, flange.MATERIAIS, null, flange.ALIASES);
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f: any) => f.cor === '#f00')).toHaveLength(36);
    expect([...n.F.values()].filter((f: any) => f.cor === '#0f0')).toHaveLength(144);
  });

  it('mudar quatro parafusos para seis não muda a citação semântica', () => {
    const topo = { ...flange.TOPO, parafusos: 6 };
    const n = nucleo([
      ...flange.PASSOS,
      ['pincel', { modo: 'face', cor: '#0f0', sel: { origem: { op: 'furo', id: 901, grupo: 'parafusos' } } }],
    ] as any, flange.PARAMS, topo, flange.MATERIAIS, null, flange.ALIASES);
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'flange com seis parafusos' });
    expect([...n.F.values()].filter((f: any) => f.cor === '#0f0')).toHaveLength(216);
  });

  it('publica as duas interfaces de montagem pelo nome do autor', () => {
    const n = montar();
    expect([...n.portas.keys()]).toEqual(['circuloDeFixacao', 'passagemDaTubulacao']);
    expect(n.portas.get('passagemDaTubulacao').de.grupo).toBe('passagem');
    expect(n.portas.get('circuloDeFixacao').de.grupo).toBe('parafusos');
  });

  it('não contém referência geométrica posicional', () => {
    for (const [op, args] of flange.PASSOS as any[]) {
      for (const chave of ['faces', 'vs', 'pontos']) expect(args?.[chave], `${op}.${chave}`).toBeUndefined();
      expect(Array.isArray(args?.de), `${op}.de como lista de ids`).toBe(false);
      expect(args?.sel?.f, `${op}.sel.f`).toBeUndefined();
      expect(args?.sel?.v, `${op}.sel.v`).toBeUndefined();
    }
  });
});
