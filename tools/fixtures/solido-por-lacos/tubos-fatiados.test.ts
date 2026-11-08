/* tubos-fatiados.test.ts — a peça dos tubos (`tubos.js`) fatiada na horizontal (`tubos-fatiados.js`, laços ao longo de y). Confere o que a construção cumpre: a
   malha fecha, nenhum laço fica a menos de 2,5 mm do vizinho, a base é o círculo inteiro rente ao disco com a parede vertical até o fundo do tubo
   deitado, as tampas do tubo deitado são trechos retos do laço e o topo é uma lâmina. E fixa o que ela ainda não cumpre (a dobra do canto do ouvido, em
   y = 39, e a ondulação), para o número não piorar em silêncio. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — régua em JavaScript.
import { dobraDaReceita } from '../../modelar/dobra-da-superficie.mjs';
// @ts-expect-error — régua em JavaScript.
import { ondulacaoDaReceita } from '../../modelar/ondulacao-da-superficie.mjs';
// @ts-expect-error — peça de teste em JavaScript.
import fatiada from './tubos-fatiados.js';
// @ts-expect-error — forma em JavaScript.
import { TABELA, derivar } from './tubos-fatiados-forma.js';
import { arestasSemPar, vinculosNaoManifold } from '../../oficina/conferir-malha';

const LENTO = 120_000;

describe('tubos fatiados na horizontal', () => {
  const g = derivar(TABELA);
  const { neutro } = executarReceita(fatiada);

  it('nenhum laço a menos de 2,5 mm do vizinho, e a lâmina do topo em y = 195', () => {
    const passos = g.planos.slice(1).map((y: number, k: number) => y - g.planos[k]);
    expect(Math.min(...passos)).toBeGreaterThanOrEqual(2.5 - 1e-9);
    expect(g.planos[g.planos.length - 1]).toBeCloseTo(195, 9);
    expect(g.avisos.filter((a: any) => a.ref === 'facesFinas')).toEqual([]);
  });

  it('a base é o círculo inteiro de raio 76 em y = 0 e 78 acima, e a parede é vertical até o fundo do tubo deitado (y = 39), onde o tubo deitado nasce como uma linha', () => {
    const raios = (laco: string) => Object.entries(g.alvosMm).filter(([n]) => n.startsWith(`k_${laco}_`)).map(([, p]: [string, any]) => Math.hypot(p[0], p[2]));
    const nomes = g.lacos.map((l: any) => l.nome);
    const abaixo = g.lacos.filter((l: any) => l.em < 39 - 1e-9).map((l: any) => l.nome);
    expect(nomes.length).toBeGreaterThan(abaixo.length);
    expect(Math.max(...raios(abaixo[0]))).toBeCloseTo(76, 1);
    for (const l of abaixo.slice(1)) {
      expect(Math.min(...raios(l))).toBeCloseTo(78, 1);
      expect(Math.max(...raios(l))).toBeCloseTo(78, 1);
    }
  });

  it('as tampas do tubo deitado são trechos retos do laço: em x = -78 e x = 97 em todo laço acima de y = 39', () => {
    for (const [nome, x] of [['capTras', -78], ['capFrente', 97]] as const) {
      for (const l of g.lacos.filter((q: any) => q.em > 39 && q.em < 195)) {
        const xs = Object.entries(g.pontosMm).filter(([n]) => n.startsWith(`k_${l.nome}_${nome}`)).map(([, p]: [string, any]) => p[0]);
        expect(xs.length).toBeGreaterThan(1);
        for (const v of xs) expect(v).toBeCloseTo(x, 6);
      }
    }
  });

  it('a malha sai fechada e sem órfão', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(arestasSemPar(neutro)).toHaveLength(0);
    expect(vinculosNaoManifold(neutro)).toHaveLength(0);
  }, LENTO);

  it('limites que a construção ainda não cumpre, fixados: uma dobra no canto do ouvido e a ondulação nas emendas entre planos', () => {
    const d = dobraDaReceita(fatiada);
    expect(d.dobras).toBeLessThanOrEqual(1);
    const o = ondulacaoDaReceita(fatiada).superficies[0];
    expect(o.falhas.length).toBeLessThanOrEqual(70);
    expect(o.desvioMm.maximo).toBeLessThan(2.5);
    expect(o.facesViradas).toBeLessThanOrEqual(2);
  }, LENTO);
});
