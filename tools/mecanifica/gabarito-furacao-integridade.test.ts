/* gabarito-furacao-integridade.test.ts — prova geral do A-34 nas três ops com
 * raio escalar: cilindro, cone e furo usam a mesma tolerância em metros. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { flechaDoAnel, ladosPorDesvio, nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça procedural em JavaScript.
import * as gabarito from '../../prototipos/fps/v3/pecas/_gabarito-de-furacao.js';
import { conferirMalha } from '../oficina/conferir-malha.js';

const montar = (params: any = gabarito.PARAMS, topo: any = gabarito.TOPO) =>
  nucleo(gabarito.PASSOS, params, topo, gabarito.MATERIAIS, null, gabarito.ALIASES);

describe('_gabarito-de-furacao — tolerância circular numa peça neutra', () => {
  it('fecha três corpos, não deixa órfão e dá identidade a toda face', () => {
    const n = montar();
    expect(n.orfaos).toEqual([]);
    expect([...n.F.values()].filter((f: any) => !f.parte)).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: '_gabarito-de-furacao' });
  });

  it('cada operação deriva a menor contagem para o próprio raio', () => {
    const d = gabarito.TOPO.acabamentoCircular;
    const esperadoFuro = ladosPorDesvio(gabarito.PARAMS.furoRaio, d);
    const esperadoBucha = ladosPorDesvio(gabarito.PARAMS.buchaRaio, d);
    const esperadoPino = ladosPorDesvio(gabarito.PARAMS.pinoRaio, d);
    const n = montar();

    expect([...n.V.keys()].filter((id: number) => id >= 1000 && id < 2000)).toHaveLength(2 * esperadoFuro);
    expect([...n.V.keys()].filter((id: number) => id >= 2000 && id < 3000)).toHaveLength(2 * esperadoBucha);
    expect([...n.V.keys()].filter((id: number) => id >= 4000 && id < 5000)).toHaveLength(esperadoPino + 1);
    for (const [raio, lados] of [
      [gabarito.PARAMS.furoRaio, esperadoFuro],
      [gabarito.PARAMS.buchaRaio, esperadoBucha],
      [gabarito.PARAMS.pinoRaio, esperadoPino],
    ]) {
      expect(flechaDoAnel(raio, lados)).toBeLessThanOrEqual(d);
      if (lados > 3) expect(flechaDoAnel(raio, lados - 1)).toBeGreaterThan(d);
    }
  });

  it('publica interfaces pelo significado e não por ids crus', () => {
    const n = montar();
    expect([...n.portas.keys()]).toEqual(['apoioDaBucha', 'apoioDoPino', 'canalDeFuracao']);
    expect(n.portas.get('canalDeFuracao').de.op).toBe('furo');
    expect(n.portas.get('apoioDaBucha').de.tampa).toBe('fundo');
  });

  it('mudar a tolerância refaz as contagens e conserva o contrato semântico', () => {
    const n = montar(gabarito.PARAMS, { acabamentoCircular: 0.00010 });
    expect(n.orfaos).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'gabarito mais fino' });
    expect([...n.portas.keys()]).toEqual(['apoioDaBucha', 'apoioDoPino', 'canalDeFuracao']);
  });

  it('não contém referência geométrica posicional', () => {
    for (const [op, args] of gabarito.PASSOS as any[]) {
      for (const chave of ['faces', 'vs', 'pontos']) expect(args?.[chave], `${op}.${chave}`).toBeUndefined();
      expect(args?.sel?.f, `${op}.sel.f`).toBeUndefined();
      expect(args?.sel?.v, `${op}.sel.v`).toBeUndefined();
    }
  });
});
