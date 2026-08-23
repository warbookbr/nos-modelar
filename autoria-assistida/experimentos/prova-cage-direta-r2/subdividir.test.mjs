/* Garante que a compilação vem da cage e preserva a semântica das faces. */
import { describe, expect, it } from 'vitest';
import { criarCageDireta, espelharCage } from './cage-direta.mjs';
import { subdividirUmNivel } from './subdividir.mjs';

describe('R2 — Catmull-Clark da cage direta', () => {
  it('produz quatro quads por face e preserva a região semântica', () => {
    const origem = espelharCage(criarCageDireta()); const compilada = subdividirUmNivel(origem);
    expect(compilada.F.size).toBe(origem.F.size * 4);
    expect([...compilada.F.values()].every((face) => face.vs.length === 4)).toBe(true);
    expect(new Set([...compilada.F.values()].map((face) => face.parte))).toEqual(new Set(['capo', 'baseParabrisa', 'teto', 'quedaTraseira', 'linhaDeOmbro', 'faixaVertical', 'flanco', 'assoalho', 'nariz', 'traseira']));
    expect(compilada.V.get(10)).not.toEqual(origem.V.get(10));
  });
  it('o produto compilado, não a cage crua, bate o envelope global P0', () => {
    const compilada = subdividirUmNivel(espelharCage(criarCageDireta())); const pontos = [...compilada.V.values()];
    const faixa = (eixo) => Math.max(...pontos.map((p) => p[eixo])) - Math.min(...pontos.map((p) => p[eixo]));
    expect(faixa(0)).toBeCloseTo(2, 12);
    expect(faixa(2)).toBeCloseTo(4.6, 12);
    expect(Math.max(...pontos.map((p) => p[1]))).toBeCloseTo(1.19, 12);
  });
  it('mantém o ombro como vinco de controle, sem depender de recorte', () => {
    const origem = espelharCage(criarCageDireta());
    const liso = subdividirUmNivel({ ...origem, vincos: new Map() });
    const comVinco = subdividirUmNivel(origem);
    expect(comVinco.V.get(7)).not.toEqual(liso.V.get(7));
  });
});
