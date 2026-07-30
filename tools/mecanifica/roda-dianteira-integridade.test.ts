/* roda-dianteira-integridade.test.ts — contratos semânticos da roda revisável na bancada. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as roda from '../../prototipos/fps/v3/pecas/roda-dianteira.js';
// @ts-expect-error — primeiro conjunto mecânico, comparado pela API declarada.
import * as freio from '../../prototipos/fps/v3/pecas/freio-disco.js';
// @ts-expect-error — registros de domínio em JavaScript.
import { FREIO_DIANTEIRO_DIREITO } from '../../src/dominio/mecanica/freio-dianteiro-direito.js';
// @ts-expect-error — registros de domínio em JavaScript.
import { RODA_DIANTEIRA_DIREITA } from '../../src/dominio/mecanica/roda-dianteira-direita.js';

function montar() {
  return nucleo(roda.PASSOS, roda.PARAMS, roda.TOPO, roda.MATERIAIS, null, roda.ALIASES);
}

describe('roda dianteira', () => {
  it('mantém três partes semânticas e nenhuma face órfã', () => {
    const neutro = montar();
    expect(Object.keys(neutro.partes).sort()).toEqual(['aro', 'pneu', 'tampaCentral']);
    expect([...neutro.F.values()].every((face) => typeof face.parte === 'string')).toBe(true);
    expect(neutro.orfaos).toEqual([]);
  });

  it('não duplica o cubo do freio e deixa o centro do aro livre', () => {
    const neutro = montar();
    expect(neutro.partes.cubo).toBeUndefined();
    const aro = [...neutro.F.values()].filter((face) => face.parte === 'aro');
    const verticesDoAro = new Set(aro.flatMap((face) => face.vs));
    const menorRaio = Math.min(...[...verticesDoAro].map((id) => {
      const [, y, z] = neutro.V.get(id);
      return Math.hypot(y, z);
    }));
    expect(menorRaio).toBeCloseTo(roda.PARAMS.aroRaioInterno, 8);
  });

  it('declara origem, aliases e parâmetros sem citar IDs geométricos crus', () => {
    expect(roda.PASSOS.filter(([op]: [string]) => op === 'lathe' || op === 'cilindro')
      .every(([, args]: [string, { origemId: unknown }]) => Number.isInteger(args.origemId))).toBe(true);
    expect(roda.ALIASES.map(([nome]: [string]) => nome)).toEqual(expect.arrayContaining(['pneuInteiro', 'aroInteiro', 'aroAbertura']));
    expect(JSON.stringify(roda.PASSOS)).not.toMatch(/"faces"\s*:\s*\[/);
  });

  it('compõe com o cubo existente, com folga declarada em escala de apresentação', () => {
    const aberturaNaCena = roda.PARAMS.aroRaioInterno * RODA_DIANTEIRA_DIREITA.posicaoNoVeiculo.escala;
    const cuboNaCena = freio.PARAMS.cuboRaio * FREIO_DIANTEIRO_DIREITO.posicaoNoVeiculo.escala;
    expect(RODA_DIANTEIRA_DIREITA.compoeCom).toEqual(['freioDianteiroDireito']);
    expect(aberturaNaCena).toBeGreaterThan(cuboNaCena);
    expect(aberturaNaCena - cuboNaCena).toBeCloseTo(0.0006, 8);
  });
});
