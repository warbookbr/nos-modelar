/* arredondar-tampa-partida.test.ts — arredondarAresta e filete numa aresta cujo lado é uma tampa partida.

   A tampa de um perfil com furo, ou de um contorno por trechos com arco, sai da extrusão como várias peças convexas
   coplanares. As expectativas vêm de medidas sobre a malha que o núcleo devolve: casca fechada, vínculo de cada vértice,
   planaridade de toda face fora da faixa arredondada, raio do arco por três pontos, volume retirado e posição dos cantos. */
import { describe, expect, it } from 'vitest';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';

type Passo = [string, Record<string, unknown>];

const FURO_OBLONGO = {
  contorno: {
    inicio: [0.004, -0.014],
    trechos: [
      { reto: [0.004, -0.022] }, { arcoTangente: [-0.004, -0.022] },
      { reto: [-0.004, -0.014] }, { arcoTangente: [0.004, -0.014] },
    ],
  },
};
/* chapa de 80 por 60 mm e 6 mm de espessura, a face de cima em y = 0,006; o furo oblongo de 16 por 8 mm, com o arco de
   cima a 10 mm da borda z = 0 */
const chapa = (altura = 0.006): Passo => ['extrusao', {
  origemId: 1, eixo: 'y', altura, segmentosArco: 16, furos: [FURO_OBLONGO],
  perfil: { retangulo: { largura: 0.08, profundidade: 0.06, centro: [0, -0.03] } },
}];
/* a mesma chapa com uma mordida semicircular de 15 mm de raio na borda z = 0: a tampa vira um contorno por trechos com arco */
const CONTORNO_COM_ARCO = {
  inicio: [-0.04, 0],
  trechos: [
    { reto: [-0.015, 0] }, { arco: { centro: [0, 0], angulo: 180 } }, { reto: [0.04, 0] }, { reto: [0.04, -0.06] }, { reto: [-0.04, -0.06] },
  ],
};
const mordida = (altura = 0.006, segmentosArco = 16): Passo => ['extrusao', { origemId: 1, eixo: 'y', altura, segmentosArco, perfil: { contorno: CONTORNO_COM_ARCO } }];

const ORIGEM_1 = { op: 'extrusao', id: 1 };
const topo = (extremo: Record<string, unknown>) => ({
  origem: ORIGEM_1, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo },
});
/* a borda de cima de UMA lateral, escolhida pelo índice dela no contorno */
const bordaDaLateral = (g: number) => ({
  origem: { ...ORIGEM_1, lado: g }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 } },
});
const arredonda = (origemId: number, sel: unknown, raio = 0.003, paineis = 6): Passo => ['arredondarAresta', { origemId, raio, paineis, sel }];
const chanfra = (origemId: number, sel: unknown, raio = 0.003): Passo => ['filete', { origemId, raio, sel }];

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
const retiradaDoChanfro = (r: number) => r * r / 2;

const faixaDe = (passos: Passo[], op: string, id: number) => {
  const m = nucleo([...passos, ['parte', { nome: 'faixa', sel: { origem: { op, id } } }]], {}, {});
  return [...m.F.values()].filter((f: any) => f.parte === 'faixa').map((f: any) => f.id).sort((a: number, b: number) => a - b);
};

/* o que toda prova pede de uma malha: sem órfão, casca fechada, vínculo de cada vértice fechado, e planas as faces que
   não são da faixa arredondada */
function conferir(n: any, faixa: number[]) {
  expect(n.orfaos).toEqual([]);
  expect(arestasSemPar(n)).toEqual([]);
  expect(vinculosNaoManifold(n)).toEqual([]);
  const tortas = [...n.F.values()].filter((f: any) => !faixa.includes(f.id) && desvioDePlano(n, f) > 1e-6).map((f: any) => f.id);
  expect(tortas).toEqual([]);
}
/* o raio do arco: o círculo por três pontos consecutivos do anel de uma ponta (a primeira linha de cada painel) */
function raiosDoAnel(n: any, passos: Passo[], id: number) {
  const faixa = faixaDe(passos, 'arredondarAresta', id);
  const anel = [pontosDe(n, n.F.get(faixa[0]))[3], ...faixa.map((fid: number) => pontosDe(n, n.F.get(fid))[0])];
  const raios: number[] = [];
  for (let k = 0; k + 2 < anel.length; k++) raios.push(raioPorTresPontos(anel[k], anel[k + 1], anel[k + 2]));
  return raios;
}
/* o índice da lateral cuja borda de cima liga os dois pontos [x, z] (em qualquer ordem) */
function lateralEntre(passos: Passo[], a: number[], b: number[]) {
  const n = nucleo(passos, {}, {});
  const perto = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[2] - q[1]) < 1e-9;
  for (const f of n.F.values()) {
    if (f.vs.length !== 4) continue;
    const P = pontosDe(n, f);
    const cima = P.filter((p) => Math.abs(p[1] - 0.006) < 1e-12);
    if (cima.length === 2 && ((perto(cima[0], a) && perto(cima[1], b)) || (perto(cima[0], b) && perto(cima[1], a)))) return f.id as number;
  }
  throw new Error('lateral não encontrada');
}

describe('arredondarAresta numa tampa partida em peças convexas', () => {
  it('a tampa da chapa com furo oblongo é uma face partida em várias peças coplanares', () => {
    const n = nucleo([chapa()], {}, {});
    const cima = [...n.F.values()].filter((f: any) => pontosDe(n, f).every((p) => Math.abs(p[1] - 0.006) < 1e-12));
    expect(cima.length).toBeGreaterThan(3);
  });

  it('duas bordas do topo da chapa com furo, por sel.onde: casca fechada, faces planas, raio de 3 mm e volume retirado', () => {
    const passos: Passo[] = [chapa(), arredonda(2, topo({ eixo: 'x', lado: 'max' })), arredonda(3, topo({ eixo: 'x', lado: 'min' }))];
    const n = nucleo(passos, {}, {});
    const faixa = [...faixaDe(passos, 'arredondarAresta', 2), ...faixaDe(passos, 'arredondarAresta', 3)];
    expect(faixa.length).toBe(12);
    conferir(n, faixa);
    for (const id of [2, 3]) for (const r of raiosDoAnel(n, passos, id)) expect(r).toBeCloseTo(0.003, 9);
    const antes = volume(nucleo([chapa()], {}, {}));
    expect(antes - volume(n)).toBeCloseTo(2 * retiradaDoArco(0.003, 6) * 0.06, 12);
  });

  it('a borda de cima do lado do furo (z máximo), com o arco do furo a 10 mm: arredonda e retira o volume esperado', () => {
    const passos: Passo[] = [chapa(), arredonda(2, topo({ eixo: 'z', lado: 'max' }))];
    const n = nucleo(passos, {}, {});
    conferir(n, faixaDe(passos, 'arredondarAresta', 2));
    for (const r of raiosDoAnel(n, passos, 2)) expect(r).toBeCloseTo(0.003, 9);
    expect(volume(nucleo([chapa()], {}, {})) - volume(n)).toBeCloseTo(retiradaDoArco(0.003, 6) * 0.08, 12);
  });

  it('a borda do furo, a 10 mm da borda livre, também arredonda: a tampa é tratada pelo contorno de dentro', () => {
    const passos: Passo[] = [chapa(0.012), arredonda(2, topo({ eixo: 'z', lado: 'max' }), 0.004)];
    const n = nucleo(passos, {}, {});
    conferir(n, faixaDe(passos, 'arredondarAresta', 2));
  });

  it('o arredondamento mantém a espessura: a face de cima recua só o recuo do raio e a lateral desce o mesmo tanto', () => {
    const passos: Passo[] = [chapa(), arredonda(2, topo({ eixo: 'x', lado: 'max' }))];
    const n = nucleo(passos, {}, {});
    const faixa = faixaDe(passos, 'arredondarAresta', 2);
    const ys = new Set<number>(), xs = new Set<number>();
    for (const id of faixa) for (const p of pontosDe(n, n.F.get(id))) { ys.add(+p[1].toFixed(9)); xs.add(+p[0].toFixed(9)); }
    expect(Math.max(...xs)).toBeCloseTo(0.04, 9);
    expect(Math.min(...xs)).toBeCloseTo(0.037, 9);
    expect(Math.max(...ys)).toBeCloseTo(0.006, 9);
    expect(Math.min(...ys)).toBeCloseTo(0.003, 9);
  });

  it('é determinístico: a mesma receita dá a mesma malha', () => {
    const passos: Passo[] = [chapa(), arredonda(2, topo({ eixo: 'x', lado: 'max' })), arredonda(3, topo({ eixo: 'x', lado: 'min' }))];
    const a = nucleo(passos, {}, {}), b = nucleo(passos, {}, {});
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F.values()].map((f: any) => f.vs))).toBe(JSON.stringify([...b.F.values()].map((f: any) => f.vs)));
  });
});

describe('arredondarAresta numa tampa de contorno por trechos com arco', () => {
  it('a mordida semicircular parte a tampa em peças convexas', () => {
    const n = nucleo([mordida()], {}, {});
    const cima = [...n.F.values()].filter((f: any) => pontosDe(n, f).every((p) => Math.abs(p[1] - 0.006) < 1e-12));
    expect(cima.length).toBeGreaterThan(2);
  });

  it('as duas bordas retas laterais arredondam: casca fechada, faces planas, raio de 3 mm e volume retirado', () => {
    const passos: Passo[] = [mordida(), arredonda(2, topo({ eixo: 'x', lado: 'max' })), arredonda(3, topo({ eixo: 'x', lado: 'min' }))];
    const n = nucleo(passos, {}, {});
    conferir(n, [...faixaDe(passos, 'arredondarAresta', 2), ...faixaDe(passos, 'arredondarAresta', 3)]);
    for (const id of [2, 3]) for (const r of raiosDoAnel(n, passos, id)) expect(r).toBeCloseTo(0.003, 9);
    expect(volume(nucleo([mordida()], {}, {})) - volume(n)).toBeCloseTo(2 * retiradaDoArco(0.003, 6) * 0.06, 12);
  });

  it('a borda livre que termina no arco, onde a lateral vizinha não é perpendicular, continua plana e fechada', () => {
    /* quatro segmentos por quarto de volta: a primeira faceta do arco mede 5,9 mm e a quina com a borda livre é de 78,75 graus */
    const g = lateralEntre([mordida(0.006, 4)], [0.015, 0], [0.04, 0]);
    const passos: Passo[] = [mordida(0.006, 4), arredonda(2, bordaDaLateral(g))];
    const n = nucleo(passos, {}, {});
    conferir(n, faixaDe(passos, 'arredondarAresta', 2));
    const retirado = volume(nucleo([mordida(0.006, 4)], {}, {})) - volume(n);
    expect(retirado / (retiradaDoArco(0.003, 6) * 0.025)).toBeGreaterThan(0.98);
    expect(retirado / (retiradaDoArco(0.003, 6) * 0.025)).toBeLessThan(1.02);
  });

  it('o arco da borda livre que termina no arco recusa quando o raio passa da faceta vizinha, que mede 1,5 mm', () => {
    const g = lateralEntre([mordida()], [0.015, 0], [0.04, 0]);
    const n = nucleo([mordida(), arredonda(2, bordaDaLateral(g))], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o raio não cabe: o vértice \d+ \(face \d+, lado B\)/);
  });

  it('o filete (chanfro de um painel) usa o mesmo caminho: fechado, plano e com o volume do chanfro', () => {
    const passos: Passo[] = [mordida(), chanfra(2, topo({ eixo: 'x', lado: 'max' }))];
    const n = nucleo(passos, {}, {});
    conferir(n, faixaDe(passos, 'filete', 2));
    expect(volume(nucleo([mordida()], {}, {})) - volume(n)).toBeCloseTo(retiradaDoChanfro(0.003) * 0.06, 12);
  });

  it('o filete numa chapa com furo também', () => {
    const passos: Passo[] = [chapa(), chanfra(2, topo({ eixo: 'z', lado: 'max' }))];
    const n = nucleo(passos, {}, {});
    conferir(n, faixaDe(passos, 'filete', 2));
    expect(volume(nucleo([chapa()], {}, {})) - volume(n)).toBeCloseTo(retiradaDoChanfro(0.003) * 0.08, 12);
  });
});

describe('recusas da aresta de uma tampa partida', () => {
  it('raio maior que a espessura da lateral: recusa dizendo qual vértice cai na faixa e não escreve nada', () => {
    const n = nucleo([chapa(), arredonda(2, topo({ eixo: 'z', lado: 'max' }), 0.007)], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o raio não cabe/);
    expect(n.F.size).toBe(nucleo([chapa()], {}, {}).F.size);
  });

  it('raio que alcança o furo: o vértice do furo cai na faixa e a operação recusa', () => {
    const n = nucleo([chapa(0.03), arredonda(2, topo({ eixo: 'z', lado: 'max' }), 0.012)], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o raio não cabe: o vértice \d+ \(face \d+, lado B\)/);
  });

  it('aresta entre duas peças da mesma tampa continua recusada: as faces são coplanares', () => {
    const sel = { origem: ORIGEM_1, onde: { alvo: 'aresta', tipo: 'lisa', angulo: 1, normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } };
    const n = nucleo([chapa(), arredonda(2, sel)], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/coplanares/);
  });

});

describe('o canto de duas bordas da mesma tampa', () => {
  it('duas bordas vizinhas da mesma tampa: a segunda fecha o canto em esquadria com a primeira, e a malha segue fechada e plana', () => {
    /* a esquadria e as medidas do canto estão em arredondar-canto.test.ts; aqui fica a passagem da recusa que existia */
    const passos: Passo[] = [chapa(), arredonda(2, topo({ eixo: 'x', lado: 'max' })), arredonda(3, topo({ eixo: 'z', lado: 'max' }))];
    const n = nucleo(passos, {}, {});
    expect(n.orfaos).toEqual([]);
    expect(arestasSemPar(n)).toEqual([]);
    expect(vinculosNaoManifold(n)).toEqual([]);
    expect([...n.F.values()].filter((f: any) => desvioDePlano(n, f) > 1e-6)).toEqual([]);
  });
});
