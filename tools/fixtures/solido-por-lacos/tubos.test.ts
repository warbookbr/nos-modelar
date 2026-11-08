/* tubos.test.ts — a peça de prova do plano "trecho que some entre laços" (`tubos.js`): dois tubos que se cruzam, o filete do encontro sumindo na
   tangente. A técnica de hoje (`tubos-hoje.js`: dois laços a 0,2 mm, vinco 'viva' de laço inteiro e uma rampa) deixa uma aba torta com uma
   aresta fina, e a medida de dobra a reprova com os mesmos números do caso real (diedro de 91 e de 115 graus); a técnica nova (`encolhe` e `esvai`,
   laços a 2,5 mm) sai fechada, sem face fina e sem dobra. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — núcleo em JavaScript.
import { analisarTopologia } from '../../../procedural/nucleo/topologia.js';
// @ts-expect-error — régua em JavaScript.
import { dobraDaReceita } from '../../modelar/dobra-da-superficie.mjs';
// @ts-expect-error — peça de teste em JavaScript.
import hoje from './tubos-hoje.js';
// @ts-expect-error — peça de teste em JavaScript.
import nova from './tubos.js';
// @ts-expect-error — forma em JavaScript.
import { derivar, tabelaDe } from './tubos-forma.js';
import { arestasSemPar, vinculosNaoManifold } from '../../oficina/conferir-malha';

const LENTO = 120_000;
const razaoMinimaDaFace = (neutro: any) => {
  let minima = Infinity;
  for (const f of neutro.F.values()) {
    const q = f.vs.map((v: string) => neutro.V.get(v));
    let nx = 0; let ny = 0; let nz = 0; let maior = 0;
    q.forEach((a: number[], k: number) => {
      const b = q[(k + 1) % q.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
      maior = Math.max(maior, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    });
    minima = Math.min(minima, Math.hypot(nx, ny, nz) / 2 / (maior * maior));
  }
  return minima;
};
const menorPasso = (g: any) => Math.min(...g.planos.slice(1).map((x: number, k: number) => x - g.planos[k]));

describe('dois tubos que se cruzam: a técnica de hoje deixa a aba torta, e a medida de dobra a reprova', () => {
  const g = derivar(tabelaDe('hoje'), 'hoje');

  it('tem os dois laços a 0,2 mm, o vinco viva de laço inteiro e a rampa, e o ajudante avisa as faces finas', () => {
    expect(menorPasso(g)).toBeCloseTo(0.2, 6);
    expect(g.passo.vincos.filter((v: any) => v.nitidez === 'viva').map((v: any) => v.nome)).toEqual(['recuoA', 'recuoB']);
    expect(g.avisos.find((a: any) => a.ref === 'facesFinas').quantidade).toBeGreaterThan(30);
  });

  it('a medida acusa dobra no pé da faixa, de dois lados, com diedro de 91 e de 115 graus', () => {
    const r = dobraDaReceita(hoje);
    const dobras = r.superficies[0].dobras;
    expect(r.dobras).toBe(4);
    expect(dobras.every((d: any) => d.parte === 'tuboEmPe')).toBe(true);
    expect(dobras.map((d: any) => d.diedroGraus)).toEqual([91.03, 91.03, 115.25, 115.25]);
    /* embaixo da frente, junto da tangente (x = 78 mm), em z = ±3,9 mm */
    expect(dobras.map((d: any) => d.posicaoMm)).toEqual([[77.9, 5, -3.9], [77.9, 5, 3.9], [78, 17.4, -3.9], [78, 17.4, 3.9]]);
  }, LENTO);
});

describe('dois tubos que se cruzam: a técnica nova (encolhe e esvai) sai sem aba, sem face fina e sem dobra', () => {
  const g = derivar(tabelaDe('nova'), 'nova');
  const { neutro } = executarReceita(nova);

  it('os laços ficam a 2,5 mm ou mais um do outro, sem vinco viva e sem o aviso de face fina', () => {
    expect(menorPasso(g)).toBeGreaterThanOrEqual(2.5 - 1e-9);
    expect(g.passo.vincos.filter((v: any) => v.nitidez === 'viva')).toEqual([]);
    expect(g.avisos.filter((a: any) => a.ref === 'facesFinas')).toEqual([]);
    /* os trechos da faixa viram um ponto só no laço em que a faixa acaba (a tangente), o do fundo do círculo, e o vinco do chanfro perde a nitidez */
    const tangente = g.lacos.find((l: any) => l.em === 78).nome;
    const doLaco = g.passo.vertices.filter((v: string) => v.startsWith(`k_${tangente}_`));
    expect(doLaco.filter((v: string) => /lado|chPe|pe\d|fil/.test(v))).toEqual([]);
    expect(doLaco).toHaveLength(37);
    expect(g.passo.vincos.filter((v: any) => /^pe/.test(v.nome)).every((v: any) => v.nitidez <= 0.8)).toBe(true);
    expect(Math.min(...g.passo.vincos.filter((v: any) => /^pe/.test(v.nome)).map((v: any) => v.nitidez))).toBeLessThan(0.2);
  });

  it('a malha sai fechada, sem órfão, sem aresta sem par e sem lasca', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(arestasSemPar(neutro)).toHaveLength(0);
    expect(vinculosNaoManifold(neutro)).toHaveLength(0);
    const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F }, { triangulacao: true });
    expect(topologia.achados.filter((a: any) => a.severidade === 'reprova')).toEqual([]);
    expect(razaoMinimaDaFace(neutro)).toBeGreaterThan(0.003);
  }, LENTO);

  it('a medida de dobra não acha nada', () => {
    const r = dobraDaReceita(nova);
    expect(r.dobras).toBe(0);
    expect(r.superficies[0].dobras).toEqual([]);
  }, LENTO);

  it('a técnica nova recusa passo de faixa menor que o mínimo entre planos', () => {
    expect(() => derivar(tabelaDe('nova', { passoDoEncolhimento: 2 }), 'nova')).toThrow(/passoDoEncolhimento abaixo de 2,5 mm/);
    expect(() => derivar(tabelaDe('nova'), 'antiga' as any)).toThrow(/é 'hoje' ou 'nova'/);
  });
});
