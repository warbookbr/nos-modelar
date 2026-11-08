/* vinco-oculto-pecas.test.mjs — a régua de vinco e chanfro não declarados (`vinco-oculto.mjs`) contra as peças que a calibram: pega a faixa da peça dos tubos
 * fatiada em y (a costura em y = 39) e a aba da técnica de hoje, e fica quieta na peça fatiada em x, no L, na coluna e na dobra em U. */
import { describe, expect, it } from 'vitest';
import { vincoOcultoDaReceita } from './vinco-oculto.mjs';
import fatiada from '../fixtures/solido-por-lacos/tubos-fatiados.js';
import hoje from '../fixtures/solido-por-lacos/tubos-hoje.js';
import emX from '../fixtures/solido-por-lacos/tubos.js';
import ele from '../fixtures/solido-por-lacos/receita.js';
import coluna from '../fixtures/solido-por-lacos/coluna.js';
import dobraEmU from '../fixtures/solido-por-lacos/dobra-em-u.js';

const LENTO = 120_000;

describe('vinco e chanfro não declarados nas peças de calibração', () => {
  it('a peça fatiada em y: dois vincos não declarados na costura de y = 39, de uns 150 mm, a uns 33 a 39 graus', () => {
    const r = vincoOcultoDaReceita(fatiada);
    expect(r.chanfros).toBe(0);
    const v = r.superficies[0].vincos;
    expect(v).toHaveLength(2);
    expect(v.every((a) => a.parte === 'tuboEmPe' && a.posicaoMm[1] > 39 && a.posicaoMm[1] < 43)).toBe(true);
    expect(v.every((a) => a.comprimentoMm > 120 && a.comprimentoMm < 230)).toBe(true);
    expect(v[0].posicaoMm[0] * v[1].posicaoMm[0]).toBeLessThan(0);
    expect(v.every((a) => a.anguloMedioGraus > 30 && a.anguloMedioGraus < 42)).toBe(true);
  }, LENTO);

  it('a técnica de hoje: um chanfro não declarado, a aba de 7,9 mm de largura, a uns 66 graus, junto da tangente', () => {
    const r = vincoOcultoDaReceita(hoje);
    expect(r.vincos).toBe(0);
    const [c] = r.superficies[0].chanfros;
    expect(r.chanfros).toBe(1);
    expect(c.larguraMm).toBeCloseTo(7.9, 1);
    expect(c.anguloMedioGraus).toBeGreaterThan(60);
    expect(c.posicaoMm[0]).toBeCloseTo(78, 0);
  }, LENTO);

  it('fica quieta na peça fatiada em x, no L, na coluna sobre o disco e na dobra em U', () => {
    for (const peca of [emX, ele, coluna, dobraEmU]) {
      const r = vincoOcultoDaReceita(peca);
      expect([r.vincos, r.chanfros]).toEqual([0, 0]);
    }
  }, LENTO);
});
