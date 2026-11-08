/* uniao-de-tubos.test.ts — a peça de prova do plano "união de dois tubos com arredondamento" (`receita.js`): dois tubos de 156 mm que se cruzam, unidos
   por `unir` com o encontro arredondado por `arredondarCostura`, sobre um disco. Fatia 1: a prova com as operações como estão. O teste fixa o que a prova
   entregou (a forma, a base redonda inteira rente ao disco, a malha fechada, o arredondamento de 10 mm no encontro da frente) e o que ela mostrou faltar
   (duas dobras de 100 e 107 graus na ponta de trás, onde o arredondamento chega ao plano da tampa do tubo deitado); a fatia 2 corrige a operação e
   inverte a última expectativa. As réguas de superfície só leem passo `subdivisao`, de modo que a medida passa por `medir.mjs`. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — peça de teste em JavaScript.
import receita from './receita.js';
// @ts-expect-error — medida em JavaScript.
import { medirTubos } from './medir.mjs';
import { arestasSemPar, vinculosNaoManifold } from '../../oficina/conferir-malha';

const LENTO = 120_000;
const { neutro } = executarReceita(receita);
const caixa = (nome: string) => {
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const f of neutro.F.values()) if (f.parte === nome) for (const v of f.vs) neutro.V.get(v).forEach((c: number, a: number) => { min[a] = Math.min(min[a], c * 1000); max[a] = Math.max(max[a], c * 1000); });
  return { min, max };
};

describe('dois tubos que se cruzam, unidos e arredondados', () => {
  it('a malha sai fechada, sem órfão e sem aresta sem par, em duas partes', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(arestasSemPar(neutro)).toHaveLength(0);
    expect(vinculosNaoManifold(neutro)).toHaveLength(0);
    expect(new Set([...neutro.F.values()].map((f: any) => f.parte))).toEqual(new Set(['tubos', 'disco']));
  });

  it('as medidas: tubos de 156 mm, tubo deitado de 175 mm com a frente 19 mm além do tubo em pé, e disco de 156 por 25 mm sob a base', () => {
    const t = caixa('tubos'); const d = caixa('disco');
    expect(t.min.map((x) => +x.toFixed(2))).toEqual([-78, 0, -78]);
    expect(t.max.map((x) => +x.toFixed(2))).toEqual([97, 195, 78]);
    expect(t.max[0] - t.min[0]).toBeCloseTo(175, 3);
    expect(d.min.map((x) => +x.toFixed(2))).toEqual([-78, -25, -78]);
    expect(d.max.map((x) => +x.toFixed(2))).toEqual([78, 0, 78]);
    expect(receita.TABELA.alturaDoEixo - receita.TABELA.raio).toBe(39);
  });

  it('o arredondamento do encontro chega a 10 mm abaixo do fundo do tubo deitado, na frente, e não desce até a base', () => {
    let menor = Infinity;
    for (const f of neutro.F.values()) if (f.parte === 'tubos') for (const v of f.vs) { const y = neutro.V.get(v)[1] * 1000; if (y > 0.01) menor = Math.min(menor, y); }
    expect(menor).toBeGreaterThan(39 - 10 - 0.5);
    expect(menor).toBeLessThan(39 - 10 + 0.5);
  });

  const medidas = medirTubos({ ondulacao: false });

  it('a base do tubo em pé é um círculo inteiro de 96 pontos, de raio 78 mm, nos mesmos pontos do topo do disco', () => {
    expect(medidas.base).toEqual({ lados: 96, verticesNoAnel: 96, raioMinimoMm: 78, raioMaximoMm: 78, anelDoDiscoIgual: true, anelCompleto: true });
  }, LENTO);

  it('sem vinco nem chanfro não declarado: as quinas vivas são a borda das tampas, a base e a borda de baixo do disco', () => {
    expect(medidas.vinco.vincos).toEqual([]);
    expect(medidas.vinco.chanfros).toEqual([]);
  }, LENTO);

  it('DEFEITO DA FATIA 1: duas dobras de 100 e 107 graus na ponta de trás, a menos de 6 mm do plano da tampa do tubo deitado', () => {
    const dobras = medidas.dobra.dobras;
    expect(dobras.map((d: any) => d.diedroGraus)).toEqual([100.24, 107.4]);
    expect(dobras.every((d: any) => d.parte === 'tubos' && d.posicaoMm[0] === -78 && d.posicaoMm[1] < 41)).toBe(true);
  }, LENTO);
});
