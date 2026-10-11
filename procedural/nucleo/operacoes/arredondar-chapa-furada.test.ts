/* arredondar-chapa-furada.test.ts — as três recusas que sobravam ao arredondar as arestas de uma chapa de 6 mm com furos oblongos.

   Cada bloco reproduz uma causa com uma peça mínima, sem depender da receita do suporte de tubo:
   (1) o canto da chapa com furos ao longo da espessura, cuja tampa triangulada em leque deixa o vértice com dezenas de faces;
   (2) a borda lateral da tampa, que recusava ou aceitava conforme `segmentosArco` por uma faceta quase reta que virava côncava;
   (3) a borda livre que termina numa concordância do contorno, cuja face de ponta é quase paralela à aresta.
   As expectativas vêm de medidas sobre a malha: casca fechada, vínculo de cada vértice, planaridade de TODA face, raio do arco
   por três pontos e volume retirado, que nos três casos é a seção do arco vezes o comprimento da aresta. */
import { describe, expect, it } from 'vitest';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';

type Passo = [string, Record<string, unknown>];

const mm = (x: number) => x / 1000;

/* furo oblongo de 8 por 16 mm com o comprimento na vertical, no perfil de uma extrusão em z (v vai para -y) */
const furoOblongo = (cu: number, cv: number) => ({
  contorno: {
    inicio: [mm(cu + 4), mm(cv)],
    trechos: [
      { reto: [mm(cu + 4), mm(cv - 4)] }, { arcoTangente: [mm(cu - 4), mm(cv - 4)] },
      { reto: [mm(cu - 4), mm(cv + 4)] }, { arcoTangente: [mm(cu + 4), mm(cv + 4)] },
    ],
  },
});
/* a aba de parede: 80 por 60 mm, 6 mm de espessura em z, dois furos oblongos; a tampa da frente fica em z = 0,006 */
const abaDeParede = (segmentosArco = 16): Passo => ['extrusao', {
  origemId: 1, eixo: 'z', altura: mm(6), segmentosArco,
  perfil: { retangulo: { largura: mm(80), profundidade: mm(60), centro: [0, mm(-30)] } },
  furos: [furoOblongo(-24, -36), furoOblongo(24, -36)],
}];
const ORIGEM_1 = { op: 'extrusao', id: 1 };
const aresta = (normal: number[], extremo: Record<string, unknown>) => ({
  origem: ORIGEM_1, onde: { alvo: 'aresta', normal: { dir: normal, ate: 5 }, extremo },
});
const arredonda = (origemId: number, sel: unknown, raio = mm(3), paineis = 6): Passo => ['arredondarAresta', { origemId, raio, paineis, sel }];

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const tam = (a: number[]) => Math.hypot(a[0], a[1], a[2]);
const pontosDe = (n: any, face: any): number[][] => face.vs.map((v: number) => n.V.get(v));

/* maior distância de um canto ao plano médio da face, em milímetro */
function desvioDePlano(n: any, face: any) {
  const P = pontosDe(n, face);
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < P.length; k++) {
    const c = P[k], d = P[(k + 1) % P.length];
    nx += (c[1] - d[1]) * (c[2] + d[2]); ny += (c[2] - d[2]) * (c[0] + d[0]); nz += (c[0] - d[0]) * (c[1] + d[1]);
  }
  const l = Math.hypot(nx, ny, nz);
  if (!(l > 0)) return 0;
  return Math.max(...P.map((p) => Math.abs(((p[0] - P[0][0]) * nx + (p[1] - P[0][1]) * ny + (p[2] - P[0][2]) * nz) / l))) * 1000;
}
const raioPorTresPontos = (a: number[], b: number[], c: number[]) =>
  tam(sub(a, b)) * tam(sub(b, c)) * tam(sub(c, a)) / (2 * tam(cruz(sub(b, a), sub(c, a))));

/* volume da casca fechada: soma dos tetraedros da origem às faces em leque (cada face é plana e convexa) */
function volume(n: any) {
  let v = 0;
  for (const f of n.F.values()) {
    const P = pontosDe(n, f);
    for (let k = 1; k + 1 < P.length; k++) {
      const c = cruz(P[k], P[k + 1]);
      v += (P[0][0] * c[0] + P[0][1] * c[1] + P[0][2] * c[2]) / 6;
    }
  }
  return v;
}
/* área retirada por comprimento de aresta de 90°: o quadrado r×r menos o polígono do centro e dos pontos do arco */
const retiradaDoArco = (r: number, paineis: number) => r * r * (1 - 0.5 * paineis * Math.sin(Math.PI / (2 * paineis)));

/* uma face é convexa quando nenhuma curva dos cantos vai contra a normal dela (o adaptador as desenha em leque) */
function faceConvexa(n: any, face: any) {
  const P = pontosDe(n, face);
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < P.length; k++) {
    const c = P[k], d = P[(k + 1) % P.length];
    nx += (c[1] - d[1]) * (c[2] + d[2]); ny += (c[2] - d[2]) * (c[0] + d[0]); nz += (c[0] - d[0]) * (c[1] + d[1]);
  }
  for (let k = 0; k < P.length; k++) {
    const a = P[k], b = P[(k + 1) % P.length], c = P[(k + 2) % P.length];
    const e1 = sub(b, a), e2 = sub(c, b);
    const t = cruz(e1, e2);
    if (t[0] * nx + t[1] * ny + t[2] * nz < -1e-7 * tam(e1) * tam(e2) * Math.hypot(nx, ny, nz)) return false;
  }
  return true;
}

/* o que toda prova pede: sem órfão, casca fechada, vínculo de cada vértice fechado, toda face plana e convexa */
function conferir(n: any) {
  expect(n.orfaos).toEqual([]);
  expect(arestasSemPar(n)).toEqual([]);
  expect(vinculosNaoManifold(n)).toEqual([]);
  expect([...n.F.values()].filter((f: any) => desvioDePlano(n, f) > 1e-6).map((f: any) => f.id)).toEqual([]);
  expect([...n.F.values()].filter((f: any) => !faceConvexa(n, f)).map((f: any) => f.id)).toEqual([]);
}
/* o raio do arco: o círculo por três pontos consecutivos do anel de uma ponta (a primeira linha de cada painel) */
function raiosDoAnel(n: any, passos: Passo[], id: number) {
  const m = nucleo([...passos, ['parte', { nome: 'faixa', sel: { origem: { op: 'arredondarAresta', id } } }]], {}, {});
  const faixa = [...m.F.values()].filter((f: any) => f.parte === 'faixa').map((f: any) => f.id).sort((a: number, b: number) => a - b);
  const paineis = faixa.slice(0, 6);
  const anel = [pontosDe(n, n.F.get(paineis[0]))[3], ...paineis.map((fid: number) => pontosDe(n, n.F.get(fid))[0])];
  const raios: number[] = [];
  for (let k = 0; k + 2 < anel.length; k++) raios.push(raioPorTresPontos(anel[k], anel[k + 1], anel[k + 2]));
  return raios;
}

describe('causa 1: os quatro cantos da aba com furos, ao longo da espessura', () => {
  const CANTOS: [string, number[], Record<string, unknown>][] = [
    ['cima à direita', [0, 1, 0], { eixo: 'x', lado: 'max' }],
    ['cima à esquerda', [0, 1, 0], { eixo: 'x', lado: 'min' }],
    ['baixo à direita', [0, -1, 0], { eixo: 'x', lado: 'max' }],
    ['baixo à esquerda', [0, -1, 0], { eixo: 'x', lado: 'min' }],
  ];
  const passosDosCantos = (segmentosArco = 16): Passo[] => [
    abaDeParede(segmentosArco),
    ...CANTOS.map(([, normal, extremo], k) => arredonda(2 + k, aresta(normal, extremo))),
  ];

  it('a tampa com furos é uma tampa partida e o vértice do canto fica com muitas faces', () => {
    const n = nucleo([abaDeParede()], {}, {});
    const canto = [...n.V.entries()].find(([, p]: any) => Math.abs(p[0] - 0.04) < 1e-12 && Math.abs(p[1]) < 1e-12 && Math.abs(p[2] - 0.006) < 1e-12);
    expect(canto).toBeTruthy();
    const faces = [...n.F.values()].filter((f: any) => f.vs.includes(canto![0]));
    expect(faces.length).toBeGreaterThan(8);
  });

  it.each(CANTOS.map(([nome], k) => [nome, k] as const))('o canto %s arredonda sozinho: casca fechada, faces planas e o volume do arco', (_, k) => {
    const [, normal, extremo] = CANTOS[k];
    const passos: Passo[] = [abaDeParede(), arredonda(2, aresta(normal, extremo))];
    const n = nucleo(passos, {}, {});
    conferir(n);
    expect(volume(nucleo([abaDeParede()], {}, {})) - volume(n)).toBeCloseTo(retiradaDoArco(mm(3), 6) * mm(6), 14);
  });

  it('os quatro cantos juntos: casca fechada, faces planas, raio de 3 mm e volume retirado igual à soma', () => {
    const passos = passosDosCantos();
    const n = nucleo(passos, {}, {});
    conferir(n);
    for (let k = 0; k < 4; k++) for (const r of raiosDoAnel(n, passos, 2 + k)) expect(r).toBeCloseTo(0.003, 9);
    expect(volume(nucleo([abaDeParede()], {}, {})) - volume(n)).toBeCloseTo(4 * retiradaDoArco(mm(3), 6) * mm(6), 14);
  });

  it('não depende de segmentosArco: a mesma chapa fecha com 4, 8, 12 e 24 segmentos por quarto de volta', () => {
    for (const seg of [4, 8, 12, 24]) {
      const n = nucleo(passosDosCantos(seg), {}, {});
      conferir(n);
      expect(volume(nucleo([abaDeParede(seg)], {}, {})) - volume(n)).toBeCloseTo(4 * retiradaDoArco(mm(3), 6) * mm(6), 14);
    }
  });

  it('é determinístico: a mesma receita dá a mesma malha', () => {
    const a = nucleo(passosDosCantos(), {}, {}), b = nucleo(passosDosCantos(), {}, {});
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F.values()].map((f: any) => f.vs))).toBe(JSON.stringify([...b.F.values()].map((f: any) => f.vs)));
  });

  it('a aresta sem furo continua como era: o canto de uma chapa lisa dá a mesma malha de antes', () => {
    const lisa: Passo = ['extrusao', { origemId: 1, eixo: 'z', altura: mm(6), perfil: { retangulo: { largura: mm(80), profundidade: mm(60), centro: [0, mm(-30)] } } }];
    const n = nucleo([lisa, arredonda(2, aresta([0, 1, 0], { eixo: 'x', lado: 'max' }))], {}, {});
    conferir(n);
    expect(n.F.size).toBe(nucleo([lisa], {}, {}).F.size + 6);
  });
});

describe('causa 2: a borda lateral da tampa não depende de segmentosArco', () => {
  const passos = (seg: number, lado: 'min' | 'max'): Passo[] => [abaDeParede(seg), arredonda(2, aresta([0, 0, 1], { eixo: 'x', lado }))];

  it.each([4, 6, 8, 10, 12, 16, 24])('com %i segmentos por quarto de volta a borda lateral esquerda da frente arredonda', (seg) => {
    const n = nucleo(passos(seg, 'min'), {}, {});
    conferir(n);
    expect(volume(nucleo([abaDeParede(seg)], {}, {})) - volume(n)).toBeCloseTo(retiradaDoArco(mm(3), 6) * mm(60), 13);
  });

  it.each([4, 10, 16, 24])('a lateral direita também, com %i segmentos', (seg) => {
    const n = nucleo(passos(seg, 'max'), {}, {});
    conferir(n);
    expect(volume(nucleo([abaDeParede(seg)], {}, {})) - volume(n)).toBeCloseTo(retiradaDoArco(mm(3), 6) * mm(60), 13);
  });

  it('a peça que virava côncava é partida em peças convexas que continuam na tampa da extrusão', () => {
    const n = nucleo([...passos(16, 'min'), ['parte', { nome: 'tampa', sel: { origem: { ...ORIGEM_1, tampa: 'topo' } } }]], {}, {});
    expect(n.orfaos).toEqual([]);
    const tampa = [...n.F.values()].filter((f: any) => f.parte === 'tampa');
    const antes = [...nucleo([abaDeParede(16), ['parte', { nome: 'tampa', sel: { origem: { ...ORIGEM_1, tampa: 'topo' } } }]], {}, {}).F.values()].filter((f: any) => f.parte === 'tampa');
    expect(tampa.length).toBeGreaterThanOrEqual(antes.length);
  });

  it('o raio que passa de verdade do vértice da tampa continua recusado', () => {
    const n = nucleo([abaDeParede(), arredonda(2, aresta([0, 0, 1], { eixo: 'x', lado: 'min' }), mm(14))], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o raio não cabe/);
  });
});

describe('causa 3: a borda livre que termina numa concordância do contorno', () => {
  /* a aba do tubo: 60 mm de largura, 6 mm de espessura (em y), saída de 50 mm, recorte de 30 mm de diâmetro com concordância de 5 mm */
  const abaDoTubo = (segmentosArco = 16): Passo => ['extrusao', {
    origemId: 1, altura: mm(6), segmentosArco,
    perfil: {
      contorno: {
        inicio: [mm(-30), mm(6)],
        trechos: [
          { reto: [mm(30), mm(6)] }, { reto: [mm(30), mm(50)] }, { reto: [mm(15), mm(50)] }, { concordancia: mm(5) },
          { reto: [mm(15), mm(35)] }, { arcoTangente: [mm(-15), mm(35)] }, { reto: [mm(-15), mm(50)] }, { concordancia: mm(5) },
          { reto: [mm(-30), mm(50)] },
        ],
      },
    },
  }];
  /* a borda de cima de cada trecho livre, separados pelo recorte: a região da face de ponta dela escolhe um dos dois */
  const regiao = (lado: 1 | -1) => {
    const a = lado * mm(20), b = lado * mm(30), folga = mm(0.5);
    return { min: [Math.min(a, b) - folga, -folga, mm(50) - folga], max: [Math.max(a, b) + folga, mm(6) + folga, mm(50) + folga] };
  };
  const borda = (lado: 1 | -1) => ({
    regiao: regiao(lado),
    onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } },
  });

  it.each([[1, 'direita'], [-1, 'esquerda']] as const)('a borda livre de cima à %s arredonda: casca fechada, faces planas e o volume do arco nos 10 mm', (lado) => {
    const passos: Passo[] = [abaDoTubo(), arredonda(2, borda(lado))];
    const n = nucleo(passos, {}, {});
    conferir(n);
    expect(volume(nucleo([abaDoTubo()], {}, {})) - volume(n)).toBeCloseTo(retiradaDoArco(mm(3), 6) * mm(10), 14);
  });

  it('as duas bordas livres juntas', () => {
    const passos: Passo[] = [abaDoTubo(), arredonda(2, borda(1)), arredonda(3, borda(-1))];
    const n = nucleo(passos, {}, {});
    conferir(n);
    expect(volume(nucleo([abaDoTubo()], {}, {})) - volume(n)).toBeCloseTo(2 * retiradaDoArco(mm(3), 6) * mm(10), 14);
    for (const id of [2, 3]) for (const r of raiosDoAnel(n, passos, id)) expect(r).toBeCloseTo(0.003, 9);
  });

  it.each([4, 8, 12, 24])('com %i segmentos por quarto de volta nas concordâncias', (seg) => {
    const passos: Passo[] = [abaDoTubo(seg), arredonda(2, borda(1)), arredonda(3, borda(-1))];
    const n = nucleo(passos, {}, {});
    conferir(n);
    expect(volume(nucleo([abaDoTubo(seg)], {}, {})) - volume(n)).toBeCloseTo(2 * retiradaDoArco(mm(3), 6) * mm(10), 14);
  });

  it('é determinístico e a faixa inteira, com o degrau da ponta, entra na parte pela origem do arredondamento', () => {
    const passos: Passo[] = [abaDoTubo(), arredonda(2, borda(1))];
    const a = nucleo(passos, {}, {}), b = nucleo(passos, {}, {});
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F.values()].map((f: any) => f.vs))).toBe(JSON.stringify([...b.F.values()].map((f: any) => f.vs)));
    const comParte = nucleo([...passos, ['parte', { nome: 'faixa', sel: { origem: { op: 'arredondarAresta', id: 2 } } }]], {}, {});
    expect(comParte.orfaos).toEqual([]);
    expect([...comParte.F.values()].filter((f: any) => f.parte === 'faixa').length).toBeGreaterThan(6);
  });

  it('o filete (chanfro de um painel) usa o mesmo degrau: fechado, plano e com o volume do chanfro nos 10 mm', () => {
    const passos: Passo[] = [abaDoTubo(), ['filete', { origemId: 2, raio: mm(3), sel: borda(1) }]];
    const n = nucleo(passos, {}, {});
    conferir(n);
    expect(volume(nucleo([abaDoTubo()], {}, {})) - volume(n)).toBeCloseTo(mm(3) * mm(3) / 2 * mm(10), 14);
  });

  it('o raio que passa da espessura da chapa continua recusado', () => {
    const n = nucleo([abaDoTubo(), arredonda(2, borda(1), mm(7))], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o raio não cabe/);
  });
});

describe('as duas abas inteiras, com todas as arestas externas do suporte', () => {
  const sel = (normal: number[], eixo: string, lado: string, regiao?: unknown) => ({
    ...(regiao ? { regiao } : { origem: ORIGEM_1 }),
    onde: { alvo: 'aresta', normal: { dir: normal, ate: 5 }, extremo: { eixo, lado } },
  });

  it.each([4, 10, 16, 24])('a aba de parede com furos e as sete arestas (%i segmentos): a tampa da frente primeiro, os quatro cantos por último', (seg) => {
    const passos: Passo[] = [
      abaDeParede(seg),
      arredonda(2, sel([0, 0, 1], 'x', 'max')), arredonda(3, sel([0, 0, 1], 'x', 'min')), arredonda(4, sel([0, 0, 1], 'y', 'max')),
      arredonda(5, sel([0, 1, 0], 'x', 'max')), arredonda(6, sel([0, 1, 0], 'x', 'min')),
      arredonda(7, sel([0, -1, 0], 'x', 'max')), arredonda(8, sel([0, -1, 0], 'x', 'min')),
    ];
    const n = nucleo(passos, {}, {});
    conferir(n);
  });

  it('a aba do tubo com as seis arestas, inclusive as duas bordas livres que terminam na concordância', () => {
    const aba = (): Passo => ['extrusao', {
      origemId: 1, altura: mm(6), segmentosArco: 16,
      perfil: { contorno: { inicio: [mm(-30), mm(6)], trechos: [
        { reto: [mm(30), mm(6)] }, { reto: [mm(30), mm(50)] }, { reto: [mm(15), mm(50)] }, { concordancia: mm(5) },
        { reto: [mm(15), mm(35)] }, { arcoTangente: [mm(-15), mm(35)] }, { reto: [mm(-15), mm(50)] }, { concordancia: mm(5) },
        { reto: [mm(-30), mm(50)] },
      ] } },
    }];
    const regiao = (lado: 1 | -1) => ({ min: [lado * mm(25) - mm(5.5), -mm(0.5), mm(49.5)], max: [lado * mm(25) + mm(5.5), mm(6.5), mm(50.5)] });
    const passos: Passo[] = [
      aba(),
      arredonda(2, sel([1, 0, 0], 'z', 'max')), arredonda(3, sel([-1, 0, 0], 'z', 'max')),
      arredonda(4, sel([0, 1, 0], 'x', 'max')), arredonda(5, sel([0, 1, 0], 'x', 'min')),
      arredonda(6, sel([0, 1, 0], 'z', 'max', regiao(1))), arredonda(7, sel([0, 1, 0], 'z', 'max', regiao(-1))),
    ];
    const n = nucleo(passos, {}, {});
    conferir(n);
  });
});
