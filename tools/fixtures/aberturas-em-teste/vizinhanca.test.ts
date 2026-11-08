/* vizinhanca.test.ts — bateria do plano `docs/modelar/planos/encerrados/2026-11-06-abertura-so-na-vizinhanca.md`: a booleana do vão recebe só o
   trecho da chapa em volta dele, fechado por uma banda que sai da peça depois, e o resto da chapa fica como está.
     - o vão no meio da cúpula de quatro níveis (60 mil faces) recorta a vizinhança: uma fração pequena das faces entra na booleana, a
       malha sai fechada e sem lasca, a borda segue o desenho e as faces longe do vão ficam com o id e os cantos de antes;
     - o recorte é determinístico: duas execuções dão a mesma malha, byte a byte;
     - o vão cuja vizinhança chega à lateral da chapa ou à parede de outro vão (uma volta de borda só, e não as duas das peles) perde as
       faces de parede do trecho, e a banda refaz a parede: recorta, e o corte sai fechado e no desenho;
     - o vão que dobra a quina de uma malha grossa (a banda liga vértices a dezenas de milímetros, mais de um quinto do porte da borda,
       sem que as voltas deixem de se corresponder) recorta;
     - o vão que cobre mais da metade da chapa e a chapa de menos de cinco mil faces não recortam: a booleana vê a chapa inteira, o
       registro diz o motivo e o corte sai igual de correto;
     - o tempo: o vão custa uma fração do que custava a chapa inteira (antes, nove vezes a subdivisão; agora, uma). */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { bandaDaVizinhanca, andaimeDaCaixa } from '../../../procedural/nucleo/operacoes/abertura-por-contorno.js';
import { VAO, domo } from './chapa-grande.js';
import { passosDaCaixa, RETANGULO_DA_QUINA } from './caixa-de-quinas.js';
import { chapaDeGrade, dosPassos, passoDaAbertura, retangulo } from './chapas.js';
import { desvioDoVao, exigirFechada, gate1, piorDesvio, rodar } from './medidas';

const cupula = (niveis: number) => chapaDeGrade({ nx: 12, nz: 12, passo: 70, altura: domo, niveis });
const sem = (niveis: number) => { const c = cupula(niveis); return rodar(c.TOPO, [['subdivisao', { origemId: 1, ...c.passo }]], 'vizinhanca'); };
const com = (niveis: number, contorno: any) => {
  const c = cupula(niveis);
  return rodar(c.TOPO, [['subdivisao', { origemId: 1, ...c.passo }], passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno })], 'vizinhanca');
};
const chave = (neutro: any) => JSON.stringify([...neutro.F].map(([id, f]: any) => [id, f.vs.map((v: number) => neutro.V.get(v))]));

describe('a vizinhança do vão numa cúpula de 60 mil faces', () => {
  const base = sem(4);
  const neutro = com(4, VAO);
  const viz = neutro.aberturas[0].vizinhanca;

  it('recorta uma fração pequena da chapa para a booleana', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(viz.recortada).toBe(true);
    expect(viz.daChapa).toBeGreaterThan(50000);
    expect(viz.faces).toBeLessThan(0.1 * viz.daChapa);
  });

  it('sai fechada, sem lasca, com a borda a menos de 0,5 mm do desenho', () => {
    exigirFechada(gate1(neutro, undefined, { adaptador: false }));
    expect(piorDesvio(desvioDoVao(neutro, 0, 'y', VAO))).toBeLessThan(0.5);
  });

  it('as faces longe do vão ficam com o id e os cantos de antes', () => {
    /* longe: toda a face a mais de 150 mm do retângulo do vão (285 a 485 mm), no plano x, z */
    const longe = (n: any, f: any) => f.vs.every((v: number) => { const p = n.V.get(v); return Math.max(285 - p[0] * 1000, p[0] * 1000 - 485, 285 - p[2] * 1000, p[2] * 1000 - 485) > 150; });
    const dadas = [...base.F].filter(([, f]: any) => longe(base, f));
    expect(dadas.length).toBeGreaterThan(30000);
    for (const [id, f] of dadas) {
      const g = neutro.F.get(id);
      expect(g, `a face ${id}`).toBeDefined();
      expect(g.vs).toEqual(f.vs);
    }
    for (const v of new Set(dadas.flatMap(([, f]: any) => f.vs))) expect(neutro.V.get(v as number)).toEqual(base.V.get(v as number));
  });

  it('duas execuções dão a mesma malha, byte a byte', () => {
    expect(chave(com(4, VAO))).toBe(chave(neutro));
  });

  it('o registro do corte guarda a chapa inteira: um segundo vão, longe do primeiro, corta a chapa que o primeiro deixou', () => {
    const c = cupula(4);
    const segundo = retangulo(60, 60, 140, 140);
    const dois = rodar(c.TOPO, [['subdivisao', { origemId: 1, ...c.passo }], passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: VAO }),
      passoDaAbertura(3, dosPassos('aberturaPorContorno', 2), { vista: 'y', contorno: segundo })], 'vizinhanca');
    expect(dois.orfaos).toEqual([]);
    expect(dois.aberturas.map((a: any) => a.vizinhanca.recortada)).toEqual([true, true]);
    expect(dois.aberturas[1].vizinhanca.daChapa).toBeGreaterThan(0.9 * base.F.size);
    exigirFechada(gate1(dois, undefined, { adaptador: false }));
    expect(Math.max(piorDesvio(desvioDoVao(dois, 0, 'y', VAO)), piorDesvio(desvioDoVao(dois, 1, 'y', segundo)))).toBeLessThan(0.5);
  });

  it('o tempo do vão é o de uma fração da chapa: no máximo três vezes o da subdivisão', () => {
    const doVao = neutro.ms - base.ms;
    console.log(JSON.stringify({ vizinhanca: { faces: viz.faces, daChapa: viz.daChapa, msSubdivisao: base.ms, msDoVao: doVao } }));
    expect(doVao).toBeLessThan(3 * base.ms + 500);
  });
});

describe('o vão cuja vizinhança alcança uma parede perde as faces de parede e recorta', () => {
  it('a 1 mm da borda da chapa: o trecho inclui a lateral dela, que sai do trecho, e o corte sai fechado e no desenho', () => {
    const contorno = retangulo(1, 285, 201, 485);
    const neutro = com(3, contorno);
    expect(neutro.orfaos).toEqual([]);
    const viz = neutro.aberturas[0].vizinhanca;
    expect(viz.recortada).toBe(true);
    expect(viz.faces).toBeLessThan(0.2 * viz.daChapa);
    exigirFechada(gate1(neutro));
    expect(piorDesvio(desvioDoVao(neutro, 0, 'y', contorno))).toBeLessThan(0.5);
  });

  /* dois vãos na cúpula de 16 mil faces, o segundo a `folga` mm da parede do primeiro: a malha tem faces de 9 mm, e o trecho do segundo
     inclui as faces de parede do primeiro, que ligam as duas peles e deixam a borda dele com uma volta só */
  const primeiro = retangulo(285, 285, 485, 485);
  const doSegundo = (folga: number) => retangulo(485 + folga, 340, 560, 430);
  const dois = (niveis: number, folga: number) => {
    const c = cupula(niveis);
    return rodar(c.TOPO, [['subdivisao', { origemId: 1, ...c.passo }], passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: primeiro }),
      passoDaAbertura(3, dosPassos('aberturaPorContorno', 2), { vista: 'y', contorno: doSegundo(folga) })], 'vizinhanca');
  };
  for (const folga of [1, 4]) {
    it(`a ${folga} mm da parede de outro vão: recorta, sai fechado, com as duas bordas no desenho e as faces longe dele como estavam`, () => {
      const base = dois(3, 40);
      const neutro = dois(3, folga);
      expect(neutro.orfaos).toEqual([]);
      const viz = neutro.aberturas[1].vizinhanca;
      expect(viz.recortada, JSON.stringify(viz)).toBe(true);
      expect(viz.faces).toBeLessThan(0.1 * viz.daChapa);
      exigirFechada(gate1(neutro, undefined, { adaptador: false }));
      expect(Math.max(piorDesvio(desvioDoVao(neutro, 0, 'y', primeiro)), piorDesvio(desvioDoVao(neutro, 1, 'y', doSegundo(folga))))).toBeLessThan(0.5);
      /* longe: toda a face a mais de 60 mm do retângulo do segundo vão, no plano x, z (o primeiro vão é o mesmo na base) */
      const longe = (n: any, f: any) => f.vs.every((v: number) => { const p = n.V.get(v); return Math.max(486 - p[0] * 1000, p[0] * 1000 - 560, 340 - p[2] * 1000, p[2] * 1000 - 430) > 60; });
      const dadas = [...base.F].filter(([, f]: any) => longe(base, f));
      expect(dadas.length).toBeGreaterThan(5000);
      for (const [id, f] of dadas) expect(neutro.F.get(id)?.vs, `a face ${id}`).toEqual((f as any).vs);
    });
  }
});

describe('o vão que dobra a quina de uma malha grossa', () => {
  const ABERTURA = { vista: [1, 0, 1], sentido: '+', contorno: RETANGULO_DA_QUINA, segmentosArco: 8 };

  it('recorta mesmo com a banda ligando vértices a dezenas de milímetros, e sai fechado e no desenho', () => {
    const { TOPO, PASSOS } = passosDaCaixa(ABERTURA);
    const neutro = rodar(TOPO, PASSOS, 'vizinhanca');
    expect(neutro.orfaos).toEqual([]);
    const viz = neutro.aberturas[0].vizinhanca;
    expect(viz.daChapa).toBeGreaterThan(5000);
    expect(viz.recortada, JSON.stringify(viz)).toBe(true);
    exigirFechada(gate1(neutro));
    expect(piorDesvio(desvioDoVao(neutro, 0, ABERTURA.vista, RETANGULO_DA_QUINA))).toBeLessThan(0.5);
  });
});

describe('o vão que cobre mais da metade da chapa vê a chapa inteira', () => {
  it('não recorta, e o corte sai fechado e no desenho', () => {
    const contorno = retangulo(60, 60, 710, 710);
    const neutro = com(3, contorno);
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.aberturas[0].vizinhanca).toMatchObject({ recortada: false, motivo: expect.stringMatching(/mais que 50%/) });
    exigirFechada(gate1(neutro));
    expect(piorDesvio(desvioDoVao(neutro, 0, 'y', contorno))).toBeLessThan(0.5);
  });
});

describe('a chapa pequena', () => {
  it('não recorta: a booleana vê as poucas faces dela, com a malha de sempre', () => {
    const neutro = com(2, VAO);
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.aberturas[0].vizinhanca).toMatchObject({ recortada: false, motivo: expect.stringMatching(/menos que as 5000/) });
    expect(neutro.aberturas[0].vizinhanca.daChapa).toBeLessThan(5000);
  });
});

describe('a banda e o andaime', () => {
  /* duas voltas quadradas de 100 mm de lado com 10 pontos por lado, uma sobre a outra a 2 mm: o trecho é a pele de fora e a de dentro
     de uma chapa; os pontos de baixo, na ordem da pele de dentro, que olha para o outro lado */
  const lado = 10; const volta: number[][] = [];
  for (let k = 0; k < lado; k++) volta.push([k * 10, 0]);
  for (let k = 0; k < lado; k++) volta.push([100, k * 10]);
  for (let k = 0; k < lado; k++) volta.push([100 - k * 10, 100]);
  for (let k = 0; k < lado; k++) volta.push([0, 100 - k * 10]);
  const n = volta.length;
  const pontos = new Map<number, number[]>();
  volta.forEach(([x, z], k) => { pontos.set(k, [x, 0, z]); pontos.set(n + k, [x, -2, z]); });
  const pos = (v: number) => pontos.get(v)!;
  const cima = Array.from({ length: n }, (_, k) => n - 1 - k); /* no sentido contrário ao dos pontos: a normal para +y */
  const baixo = Array.from({ length: n }, (_, k) => n + k);

  it('uma banda fecha as duas peles de um trecho, e cada aresta tem a oposta', () => {
    const faces = new Map<number, number[]>([[1000, cima], [1001, baixo]]);
    const r = bandaDaVizinhanca(pos, faces);
    expect(r.motivo).toBeUndefined();
    expect(r.banda).toHaveLength(2 * n);
    const dirigidas = new Set<string>();
    for (const vs of [...faces.values(), ...r.banda]) for (let k = 0; k < vs.length; k++) dirigidas.add(`${vs[k]}>${vs[(k + 1) % vs.length]}`);
    for (const d of dirigidas) { const [a, b] = d.split('>'); expect(dirigidas.has(`${b}>${a}`), d).toBe(true); }
  });

  it('um trecho de uma pele só tem uma volta e a banda recusa', () => {
    const r = bandaDaVizinhanca(pos, new Map([[1000, cima]]));
    expect(r.motivo).toMatch(/1 voltas/);
  });

  it('as duas voltas que andam em sentidos contrários no espaço (a de baixo percorrida ao contrário) recusam a banda torcida', () => {
    const torto = new Map(pontos);
    baixo.forEach((v, k) => torto.set(v, pontos.get(n + ((n - k) % n))!));
    const r = bandaDaVizinhanca((v: number) => torto.get(v)!, new Map([[1000, cima], [1001, baixo]]));
    expect(r.motivo).toMatch(/não se correspondem/);
  });

  it('a malha grossa liga as duas voltas sem torcer: a diagonal passa de um quinto do porte, mas é a aresta com a espessura', () => {
    /* o quadrado de 100 mm de lado com um ponto a cada 50 mm: a diagonal do zíper é a aresta de 50 mm com os 2 mm de espessura */
    const grosso = new Map<number, number[]>();
    const alto = [[0, 0], [50, 0], [100, 0], [100, 50], [100, 100], [50, 100], [0, 100], [0, 50]];
    alto.forEach(([x, z], k) => { grosso.set(k, [x, 0, z]); grosso.set(8 + k, [x, -2, z]); });
    const topo = Array.from({ length: 8 }, (_, k) => 7 - k); const fundo = Array.from({ length: 8 }, (_, k) => 8 + k);
    const r = bandaDaVizinhanca((v: number) => grosso.get(v)!, new Map([[1000, topo], [1001, fundo]]));
    expect(r.motivo).toBeUndefined();
    expect(r.banda).toHaveLength(16);
  });

  it('o andaime só existe quando a caixa do trecho é menor que a da chapa, e fica longe do trecho', () => {
    const velha: any = [[0, 0, 0], [1, 1, 1]];
    expect(andaimeDaCaixa(velha, velha).pontos).toEqual([]);
    const nova: any = [[0.4, 0.4, 0.4], [0.6, 0.6, 0.6]];
    const a = andaimeDaCaixa(nova, velha);
    expect(a.pontos).toHaveLength(8);
    expect(a.faces).toHaveLength(8);
    expect(a.pontos).toContainEqual([0, 0, 0]);
    expect(a.pontos).toContainEqual([1, 1, 1]);
    expect(andaimeDaCaixa([[0.001, 0.001, 0.001], [0.6, 0.6, 0.6]], velha).motivo).toMatch(/junto do trecho/);
  });
});
