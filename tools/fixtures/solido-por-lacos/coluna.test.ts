/* coluna.test.ts — a peça de teste "coluna sobre disco" do plano dos limites do sólido por laços (`coluna.js`): um disco e um cilindro que
   sobe dele, tangente às duas faces, com chanfro de 2 mm, filete no encontro e laços cortados ao longo do eixo do cilindro. Confere o
   gate 2 do plano (a peça sai fechada, sem triângulo sem área nem lasca, com o chanfro e o encontro dentro de 0,5 mm do declarado), a
   separação das duas partes pelos grupos da gaiola, e cada um dos cinco limites do ajudante na própria peça: sem a declaração que o
   corrige, o ajudante recusa ou avisa. Os números estão em `docs/modelar/banco-de-provas/limites-do-solido-por-lacos-2026-11-05/README.md`. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço de autoria em JavaScript.
import { executarReceita } from '../../../src/autoria/executar-receita.js';
// @ts-expect-error — adaptador em JavaScript.
import { adaptarThree } from '../../../src/autoria/adaptar-three.js';
// @ts-expect-error — núcleo em JavaScript.
import { analisarTopologia } from '../../../procedural/nucleo/topologia.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorLacos } from '../../../procedural/nucleo/gaiola-por-lacos.js';
// @ts-expect-error — peça de teste em JavaScript.
import receita from './coluna.js';
// @ts-expect-error — forma em JavaScript.
import { TABELA, argumentosDaGaiola, derivar } from './coluna-forma.js';
// @ts-expect-error — medidas em JavaScript.
import { malhaDaParte } from './medir.mjs';
// @ts-expect-error — medidas em JavaScript.
import { chanfroDoDisco, chanfroDoTopo, extensaoDaMalha, raioDoCilindro, raioDoDisco, recuoDoFilete } from './coluna-medir.mjs';
import { areasDeTriangulo, arestasSemPar, escalaDaPeca, vinculosNaoManifold } from '../../oficina/conferir-malha';

const LENTO = 120_000;
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou'); };
/* a gaiola da peça com uma mudança nos argumentos, para ver o que o ajudante diz sem a declaração que corrige o limite */
const montar = (muda: (a: any) => void) => { const a = argumentosDaGaiola(TABELA); muda(a); return gaiolaPorLacos(a); };
const ruins = (g: any, ref: string) => g.avisos.filter((x: any) => x.ref === ref);

describe('coluna sobre disco: um disco, um cilindro que sobe dele, chanfro de 2 mm e filete, por laços cortados ao longo do eixo do cilindro', () => {
  const { neutro } = executarReceita(receita);
  const malha = malhaDaParte(neutro, null);

  it('gate 2: sai fechada, sem triângulo sem área nem lasca, sem órfão e sem aviso do ajudante', () => {
    expect(neutro.orfaos).toEqual([]);
    const { raiz } = adaptarThree(neutro, { nome: 'coluna-sobre-disco' });
    const areas = areasDeTriangulo(raiz, escalaDaPeca(neutro));
    const topologia = analisarTopologia({ vertices: neutro.V, faces: neutro.F }, { triangulacao: true });
    const contagem: Record<string, number> = {};
    for (const a of topologia.achados) contagem[`${a.severidade}:${a.codigo}`] = (contagem[`${a.severidade}:${a.codigo}`] ?? 0) + 1;
    let razaoMinima = Infinity;
    for (const f of neutro.F.values()) {
      const q = f.vs.map((v: string) => neutro.V.get(v));
      let nx = 0; let ny = 0; let nz = 0; let maior = 0;
      q.forEach((a: number[], k: number) => { const b = q[(k + 1) % q.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); maior = Math.max(maior, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); });
      razaoMinima = Math.min(razaoMinima, Math.hypot(nx, ny, nz) / 2 / (maior * maior));
    }
    console.log(JSON.stringify({ vertices: neutro.V.size, faces: neutro.F.size, menorTriangulo: areas.menor, piso: areas.piso, razaoMinimaDaFace: razaoMinima, topologia: contagem }));
    expect(arestasSemPar(neutro)).toHaveLength(0);
    expect(vinculosNaoManifold(neutro)).toHaveLength(0);
    expect(areas.abaixo).toEqual([]);
    expect(topologia.achados.filter((a: any) => a.severidade === 'reprova')).toEqual([]);
    expect(razaoMinima).toBeGreaterThan(0.003);
    expect(derivar(TABELA).avisos).toEqual([]);
  }, LENTO);

  it('gate 2: o chanfro de 2 mm, o filete do encontro, o cilindro e a altura saem a menos de 0,5 mm do declarado', () => {
    for (const y of [-50, -30, -10]) {
      const c = chanfroDoDisco(malha, y);
      expect(Math.abs(c.radialMm - TABELA.chanfro), `chanfro radial do disco em y = ${y}`).toBeLessThan(0.5);
      expect(Math.abs(c.axialMm - TABELA.chanfro), `chanfro axial do disco em y = ${y}`).toBeLessThan(0.5);
    }
    const topo = chanfroDoTopo(malha);
    expect(Math.abs(topo.topoMm - (TABELA.alturaTotal - TABELA.raio))).toBeLessThan(0.5);
    expect(Math.abs(topo.radialMm - TABELA.chanfro)).toBeLessThan(0.5);
    expect(Math.abs(topo.axialMm - TABELA.chanfro)).toBeLessThan(0.5);
    const filetes = [13.5, 26.7, 39, 50.1, 59.8, 67.5].map((y) => recuoDoFilete(malha, y));
    for (const f of filetes) expect(Math.abs(f.recuoMm - f.esperadoMm), `recuo do filete em y = ${f.y}`).toBeLessThan(0.5);
    for (const y of [120, 250, 380, 396]) {
      const r = raioDoCilindro(malha, y);
      expect(r.minimo).toBeGreaterThan(TABELA.raio - 0.5); expect(r.maximo).toBeLessThan(TABELA.raio + 0.5);
    }
    for (const z of [20, 78, 130]) {
      const r = raioDoDisco(malha, z);
      expect(r.minimo).toBeGreaterThan(TABELA.raio - 0.5); expect(r.maximo).toBeLessThan(TABELA.raio + 0.5);
    }
    const [x, y, z] = extensaoDaMalha(malha);
    console.log(JSON.stringify({ extensao: [x, y, z], filetes, topo, chanfroDoDisco: chanfroDoDisco(malha, -30) }));
    expect(y[0]).toBeGreaterThan(-TABELA.raio - 0.5); expect(y[1]).toBeCloseTo(TABELA.alturaTotal - TABELA.raio, 1);
    expect(x[0]).toBeGreaterThan(-TABELA.raio - 0.5); expect(x[1]).toBeLessThan(TABELA.raio + 0.5);
    /* a compensação junto da face não empurra a peça para fora dela (limite 5): antes eram 0,5 mm */
    expect(z[0]).toBeGreaterThan(-0.25); expect(z[1]).toBeLessThan(2 * TABELA.raio + 0.25);
  }, LENTO);

  it('o disco e o cilindro saem pelos grupos de faces da gaiola, e a parede do cilindro abaixo do topo do disco fica no cilindro', () => {
    const porParte = (p: string) => [...neutro.F.values()].filter((f: any) => f.parte === p);
    const pe = porParte('pe'); const coluna = porParte('coluna');
    expect(pe.length + coluna.length).toBe(neutro.F.size);
    expect(pe.length).toBeGreaterThan(0); expect(coluna.length).toBeGreaterThan(0);
    const centro = (f: any) => f.vs.map((v: string) => neutro.V.get(v).map((c: number) => c * 1000)).reduce((s: number[], p: number[]) => s.map((c, i) => c + p[i] / f.vs.length), [0, 0, 0]);
    /* a parede do cilindro a meio caminho do topo do disco: (x = 78, y = 40, z = 78), fora do disco */
    const naParede = (f: any) => { const c = centro(f); return Math.abs(c[1] - 40) < 6 && Math.abs(c[0] - 77.5) < 3 && Math.abs(c[2] - 78) < 8; };
    expect(coluna.filter(naParede).length).toBeGreaterThan(0);
    expect(pe.filter(naParede)).toEqual([]);
    /* a face de baixo do disco é do disco */
    expect(coluna.filter((f: any) => centro(f)[2] < 0.5 && Math.abs(centro(f)[0]) > 10)).toEqual([]);
    expect(pe.filter((f: any) => centro(f)[2] < 0.5 && Math.abs(centro(f)[0]) > 10).length).toBeGreaterThan(0);
  }, LENTO);

  it('a mesma receita dá a mesma gaiola e a mesma malha', () => {
    const impressao = (n: any) => createHash('sha1').update(JSON.stringify([...n.V.entries(), ...[...n.F.entries()].map(([k, f]: any) => [k, f.vs, f.parte])])).digest('hex');
    expect(JSON.stringify(derivar(TABELA).passo)).toBe(JSON.stringify(derivar(TABELA).passo));
    expect(impressao(executarReceita(receita).neutro)).toBe(impressao(neutro));
  }, LENTO);
});

describe('coluna sobre disco: os cinco limites, cada um na própria peça', () => {
  it('limite 1 e 2: o fundo do disco é uma linha de área zero, com a parede de subida sobre a de descida, e sai sem tampa nem face de área zero', () => {
    const g = derivar(TABELA);
    const zero = g.passo.faces.filter((f: string[]) => {
      let nx = 0; let ny = 0; let nz = 0;
      f.forEach((v, k) => { const [x1, y1, z1] = g.pontosMm[v]; const [x2, y2, z2] = g.pontosMm[f[(k + 1) % f.length]]; nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2); });
      return Math.hypot(nx, ny, nz) / 2 <= 1e-6;
    });
    expect(zero).toEqual([]);
    /* o laço l0 (y = -78) tem as paredes de baixo e de cima, D e E, sobre a mesma linha de x = 0: o ajudante as funde pelos pontos de mesma posição */
    const l0 = g.passo.vertices.filter((v: string) => v.startsWith('c_l0_'));
    const posicoes = new Set(l0.map((v: string) => g.pontosMm[v].map((c: number) => c.toFixed(3)).join(',')));
    expect(l0.length).toBe(posicoes.size);
    expect(l0.every((v: string) => Math.abs(g.pontosMm[v][0]) < 1e-9)).toBe(true);
  });

  it('limite 3: o chanfro de 2 mm do topo, a 2 mm do plano de baixo, é recusado sem o vinco vivo de laço inteiro nos dois planos', () => {
    const m = grito(() => montar((a) => { a.vincos = a.vincos.filter((v: any) => v.laco == null); }));
    expect(m).toMatch(/ficam a 2 mm um do outro, abaixo do mínimo de 2,5 mm/);
    expect(m).toMatch(/vinco 'viva' de laço inteiro/);
    const so1 = grito(() => montar((a) => { a.vincos = a.vincos.filter((v: any) => v.nome !== 'chanfroDoTopo'); }));
    expect(so1).toMatch(/ficam a 2 mm um do outro/);
  });

  it('limite 4: sem some e sem razao, o filete que some entre planos deixa faces finas e a parede deixa amostragem desigual', () => {
    const cru = montar((a) => { a.trechos = a.trechos.map((t: any) => ({ nome: t.nome, pontos: t.pontos })); });
    const finas = ruins(cru, 'facesFinas'); const desiguais = ruins(cru, 'amostragemDesigual');
    console.log(JSON.stringify({ semSomeESemRazao: { facesFinas: finas.map((a: any) => a.quantidade), amostragemDesigual: desiguais.length, razaoMaxima: Math.max(...desiguais.map((a: any) => a.razao)) } }));
    expect(finas.length + desiguais.length).toBeGreaterThan(0);
    expect(Math.max(...desiguais.map((a: any) => a.razao))).toBeGreaterThan(4);
    expect(derivar(TABELA).avisos).toEqual([]);
    const sumiram = derivar(TABELA).lacos.filter((l: any) => l.sumiram.length).map((l: any) => [l.nome, l.sumiram.length]);
    expect(sumiram.length).toBeGreaterThan(0);
  });

  it('limite 5: a compensação dos chanfros e da parede junto das faces não empurra a superfície para fora delas', () => {
    const g = derivar(TABELA);
    expect(g.compensacao.pontos).toBeGreaterThan(500);
    /* os pontos da gaiola vão até 0,6 mm além da face, porque a superfície limite fica por dentro deles; a superfície sai a 0,2 mm (era 0,5 com a normal média) */
    const z = extensaoDaMalha(malhaDaParte(executarReceita(receita).neutro, null))[2];
    expect(z[0]).toBeGreaterThan(-0.25);
    expect(z[1]).toBeLessThan(2 * TABELA.raio + 0.25);
    expect(g.compensacao.residuoMm).toBeLessThan(0.7);
  }, LENTO);
});
