/* roda-dianteira-integridade.test.ts — contratos semânticos da roda revisável na bancada.

   O quarto caso deste arquivo — a folga entre a abertura do aro e o cubo do
   freio — saiu daqui e virou `testes/composicao.test.mjs` em
   warbookbr/mecanica. Ele dependia de `src/dominio/mecanica/`, que é registro
   de PRODUTO: onde cada sistema fica no veículo e em que escala. Isto aqui é
   oficina, e oficina não sabe onde o freio mora no carro.

   Lá ele ficou melhor: em vez de ler `PARAMS.aroRaioInterno`, mede o raio
   interno do aro na malha resolvida. Parâmetro declarado e malha construída
   podem divergir, e é essa distância que a op `furo` já cobrou caro aqui. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as roda from '../../prototipos/fps/v3/pecas/roda-dianteira.js';

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

  it('a abertura do aro continua onde o freio a espera', () => {
    /* o que sobrou aqui da composição: a oficina não sabe a escala da cena nem
       onde o freio mora no carro, mas sabe que a abertura do aro é a medida que
       o outro lado usa. Se ela mudar sem intenção, o produto descobre tarde.
       A folga em escala de apresentação é cobrada em
       `testes/composicao.test.mjs` de warbookbr/mecanica. */
    const neutro = montar();
    const aro = [...neutro.F.values()].filter((face: any) => face.parte === 'aro');
    const ids = new Set(aro.flatMap((face: any) => face.vs));
    const menor = Math.min(...[...ids].map((id) => {
      const [, y, z] = neutro.V.get(id);
      return Math.hypot(y, z);
    }));
    expect(menor, 'a abertura do aro mudou; o produto compõe com ela').toBeCloseTo(0.08, 8);
  });
});
