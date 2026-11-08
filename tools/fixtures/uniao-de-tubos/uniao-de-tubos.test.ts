/* uniao-de-tubos.test.ts — a peça de prova do plano "união de dois tubos com arredondamento" (`receita.js`): dois tubos de 156 mm que se cruzam, unidos
   por `unir` com o encontro arredondado por `arredondarCostura`, sobre um disco. Fatia 1: a prova com as operações como estão. O teste fixa o que a prova
   entregou (a forma, a base redonda inteira rente ao disco, a malha fechada, o arredondamento de 10 mm no encontro da frente) e o que ela mostrou faltar
   (duas dobras de 100 e 107 graus na ponta de trás, onde o arredondamento chegava ao plano da tampa do tubo deitado); a fatia 2 corrigiu a operação: o
   raio cai até o maior que cabe antes da borda da tampa e o arredondamento some nela, com 0 dobras e 0 vincos. As réguas de superfície só leem passo `subdivisao`, de modo que a medida passa por `medir.mjs`. */
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

  it('sem dobra: o arredondamento afina até sumir na tampa de trás do tubo deitado, sem aresta aguda nem fatia degenerada no plano dela', () => {
    expect(medidas.dobra.dobras).toEqual([]);
    expect(neutro.avisos.some((a: any) => a.ref === 'faceLimite')).toBe(true);
    let agudas = 0; const nr = new Map<string, number[]>();
    for (const [id, f] of neutro.F) {
      const p = f.vs.map((v: string) => neutro.V.get(v)); const n = [0, 0, 0];
      p.forEach((a: number[], k: number) => { const b = p[(k + 1) % p.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); });
      const l = Math.hypot(n[0], n[1], n[2]); nr.set(id, n.map((x) => x / l));
    }
    const arestas = new Map<string, string[]>();
    for (const [id, f] of neutro.F) f.vs.forEach((a: string, k: number) => { const b = f.vs[(k + 1) % f.vs.length]; const c = a < b ? `${a}|${b}` : `${b}|${a}`; arestas.set(c, [...(arestas.get(c) ?? []), id]); });
    for (const fs of arestas.values()) {
      if (fs.length !== 2) continue;
      const [u, v] = [nr.get(fs[0])!, nr.get(fs[1])!];
      const t = (Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * 180) / Math.PI;
      if (t >= 15 && t < 80) agudas++;
    }
    expect(agudas).toBe(0);
  }, LENTO);
});
