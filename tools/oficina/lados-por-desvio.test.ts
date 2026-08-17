/* lados-por-desvio.test.ts — A-34: a IA declara uma tolerância geométrica e
   o núcleo deriva a menor contagem circular, sem adivinhar números sem unidade. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { BLOCO, flechaDoAnel, ladosPorDesvio, neutroCanonico, nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
import { conferirMalha } from './conferir-malha.js';

const idsDoBloco = (mapa: Map<number, unknown>, passo: number) => {
  const inicio = passo * BLOCO;
  return [...mapa.keys()].filter((id) => id >= inicio && id < inicio + BLOCO).sort((a, b) => a - b);
};

const CILINDRO = (lados: any, raio: any = 0.052) => [
  ['cilindro', { origemId: 1, raio, altura: 0.012, lados }],
];

const CONE = (lados: any, raio: any = 0.052) => [
  ['cone', { origemId: 1, raio, altura: 0.08, lados }],
];

const FURO = (lados: any, centros: any = [[0, 0, 0]], raio: any = 0.0065) => [
  ['cilindro', { origemId: 1, raio: 0.08, altura: 0.012, lados: 64 }],
  ['furo', {
    origemId: 2,
    de: { op: 'cilindro', id: 1, tampa: 'topo' },
    saida: { op: 'cilindro', id: 1, tampa: 'fundo' },
    centros,
    raio,
    lados,
    orientacao: [1, 0, 0],
  }],
];

describe('A-34 — derivação pura da contagem por desvio', () => {
  it('faz o round-trip da flecha exata sem devolver L+1 na fronteira', () => {
    let casos = 0;
    for (const raio of [0.0005, 0.0065, 0.052, 0.5, 10]) {
      for (let lados = 3; lados <= 400; lados++) {
        expect(ladosPorDesvio(raio, flechaDoAnel(raio, lados))).toBe(lados);
        casos++;
      }
    }
    expect(casos).toBe(1990);
  });

  it('devolve a menor contagem: L cabe e L-1 não cabe', () => {
    let casos = 0;
    for (const raio of [0.0065, 0.052, 1]) {
      for (const fracao of [0.49, 0.2, 0.05, 0.01, 0.001, 0.00001]) {
        const desvio = raio * fracao;
        const lados = ladosPorDesvio(raio, desvio);
        expect(flechaDoAnel(raio, lados)).toBeLessThanOrEqual(desvio);
        if (lados > 3) expect(flechaDoAnel(raio, lados - 1)).toBeGreaterThan(desvio);
        casos++;
      }
    }
    expect(casos).toBe(18);
  });

  it('recusa unidades e domínios que não descrevem um círculo', () => {
    expect(() => ladosPorDesvio(0, 0.001)).toThrow(/raio/);
    expect(() => ladosPorDesvio(1, 0)).toThrow(/desvio/);
    expect(() => ladosPorDesvio(Infinity, 0.001)).toThrow(/raio/);
  });
});

describe('A-34 — cilindro, cone e furo aceitam lados:{desvio}', () => {
  it.each([
    ['cilindro', CILINDRO],
    ['cone', CONE],
  ])('%s derivado é byte-idêntico à mesma contagem explícita', (nome, figura) => {
    const raio = 0.052;
    const desvio = 0.00025;
    const lados = ladosPorDesvio(raio, desvio);
    expect(lados).toBe(33);
    const derivado = nucleo(figura({ desvio }) as any, {}, {});
    const explicito = nucleo(figura(lados) as any, {}, {});
    expect(derivado.orfaos).toEqual([]);
    conferirMalha(derivado, { fechada: true, rotulo: `${nome} por desvio` });
    expect(JSON.stringify(neutroCanonico(derivado))).toBe(JSON.stringify(neutroCanonico(explicito)));
  });

  it('furo derivado mede a mesma malha da contagem explícita', () => {
    const desvio = 0.00025;
    const lados = ladosPorDesvio(0.0065, desvio);
    expect(lados).toBe(12);
    const derivado = nucleo(FURO({ desvio }) as any, {}, {});
    const explicito = nucleo(FURO(lados) as any, {}, {});
    expect(derivado.orfaos).toEqual([]);
    conferirMalha(derivado, { fechada: true, rotulo: 'furo por desvio' });
    expect(JSON.stringify(neutroCanonico(derivado))).toBe(JSON.stringify(neutroCanonico(explicito)));
  });

  it('mede na malha que L atende à tolerância e L-1 não', () => {
    const raio = 0.052;
    const desvio = 0.00025;
    const lados = ladosPorDesvio(raio, desvio);
    const n = nucleo(CILINDRO({ desvio }) as any, {}, {});
    const p0 = n.V.get(0), p1 = n.V.get(1);
    const meio = [(p0[0] + p1[0]) / 2, (p0[2] + p1[2]) / 2];
    const medido = raio - Math.hypot(meio[0], meio[1]);
    expect(medido).toBeCloseTo(flechaDoAnel(raio, lados), 14);
    expect(medido).toBeLessThanOrEqual(desvio);
    expect(flechaDoAnel(raio, lados - 1)).toBeGreaterThan(desvio);
  });

  it('um furo com raios mistos usa o maior raio do passo', () => {
    const desvio = 0.00025;
    const centros = [
      { nome: 'passagem', centro: [0, 0, 0], raio: 0.025 },
      { nome: 'fixacao', distancia: 0.052, total: 4, volta: 360, raio: 0.004 },
    ];
    const esperado = ladosPorDesvio(0.025, desvio);
    const n = nucleo(FURO({ desvio }, centros, null) as any, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(idsDoBloco(n.V, 1)).toHaveLength(2 * esperado * 5);
    conferirMalha(n, { fechada: true, rotulo: 'furo por maior raio' });
  });

  it('o modo numérico mantém ids sob mudança de raio; o automático conserva a tolerância', () => {
    const ids = (n: any) => idsDoBloco(n.F, 0);
    expect(ids(nucleo(CILINDRO(16, 0.03) as any, {}, {})))
      .toEqual(ids(nucleo(CILINDRO(16, 0.08) as any, {}, {})));
    expect(ids(nucleo(CILINDRO({ desvio: 0.00025 }, 0.03) as any, {}, {})))
      .not.toEqual(ids(nucleo(CILINDRO({ desvio: 0.00025 }, 0.08) as any, {}, {})));
  });

  it('duas execuções automáticas são byte-idênticas', () => {
    const passos = FURO({ desvio: 'acabamento' });
    const a = neutroCanonico(nucleo(passos as any, {}, { acabamento: 0.00025 }));
    const b = neutroCanonico(nucleo(passos as any, {}, { acabamento: 0.00025 }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('A-34 — recusas automáticas são fechadas', () => {
  it.each([
    ['forma desconhecida', { erro: 1 }, /número ou \{desvio\}/],
    ['desvio zero', { desvio: 0 }, /desvio precisa ser finito e > 0/],
    ['parâmetro ausente', { desvio: 'inexistente' }, /desvio não resolve/],
  ])('%s grita antes do primeiro id', (_nome, lados, motivo) => {
    const n = nucleo(CILINDRO(lados) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(motivo);
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
  });

  it('estouro derivado grita e recomenda aumentar o desvio', () => {
    const n = nucleo(CILINDRO({ desvio: 1e-9 }, 1) as any, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/estoura o bloco.*aumente o desvio/);
    expect(n.V.size).toBe(0);
    expect(n.F.size).toBe(0);
  });

  it('estouro numérico conserva o throw histórico', () => {
    expect(() => nucleo(CILINDRO(BLOCO) as any, {}, {})).toThrow(/estoura o bloco de ids/);
  });

  it('furo derivado que excede o bloco preserva as faces de entrada e saída', () => {
    const n = nucleo(FURO({ desvio: 1e-9 }) as any, {}, {});
    expect(n.orfaos.some((o: any) => /no mínimo .* estouram o bloco/.test(o.motivo))).toBe(true);
    expect(idsDoBloco(n.V, 1)).toEqual([]);
    expect(idsDoBloco(n.F, 1)).toEqual([]);
    expect(n.F.has(64)).toBe(true);
    expect(n.F.has(65)).toBe(true);
  });
});
