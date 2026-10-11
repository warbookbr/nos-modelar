/* arredondar-canto.test.ts — o vértice onde duas ou três arestas arredondadas (ou chanfradas) se encontram.

   O defeito que este arquivo pega: o segundo arredondarAresta num canto já arredondado passava numa face inteira e
   deixava o painel do primeiro empenado (a face de ponta da aresta nova era o painel da faixa antiga e ganhava os pontos
   do arco novo, que não estão no plano dela), e numa tampa partida em faces coplanares ele era recusado. O remate
   (operacoes/cantos-arredondados.js) junta as faixas pela esquadria. As expectativas vêm de medidas sobre a malha que o
   núcleo devolve: planaridade de TODA face depois de cada passo, distância de cada ponto de painel ao eixo do cilindro,
   os planos dos painéis contra os calculados à mão, volume retirado pela soma dos prismas menos a sobreposição dos
   cantos, fechamento da casca e a mesma malha em ordens diferentes de aplicação. */
import { describe, expect, it } from 'vitest';
import { arestasSemPar, conferirMalha, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';

type Passo = [string, Record<string, unknown>];

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const pontosDe = (n: any, face: any): number[][] => face.vs.map((v: number) => n.V.get(v));

/* normal de Newell (módulo = 2 × área) */
function newell(P: number[][]) {
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < P.length; k++) {
    const c = P[k], d = P[(k + 1) % P.length];
    nx += (c[1] - d[1]) * (c[2] + d[2]); ny += (c[2] - d[2]) * (c[0] + d[0]); nz += (c[0] - d[0]) * (c[1] + d[1]);
  }
  return [nx, ny, nz];
}
/* maior distância de um canto ao plano médio da face, em milímetro */
function desvioDePlano(n: any, face: any) {
  const P = pontosDe(n, face);
  const nn = newell(P);
  const l = Math.hypot(nn[0], nn[1], nn[2]);
  if (!(l > 0)) return 0;
  return Math.max(...P.map((p) => Math.abs(((p[0] - P[0][0]) * nn[0] + (p[1] - P[0][1]) * nn[1] + (p[2] - P[0][2]) * nn[2]) / l))) * 1000;
}
const todasPlanas = (n: any) => [...n.F.values()].filter((f: any) => desvioDePlano(n, f) > 1e-6).map((f: any) => f.id);

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
/* a malha como conjunto de polígonos de cantos arredondados em 1e-9: não depende de id nem de ordem de aplicação */
const canonica = (n: any) => [...n.F.values()]
  .map((f: any) => pontosDe(n, f).map((p) => p.map((c) => (Math.round(c * 1e9) / 1e9 + 0).toFixed(9)).join(',')).sort().join('|'))
  .sort();
const fechada = (n: any) => {
  expect(n.orfaos).toEqual([]);
  expect(arestasSemPar(n)).toEqual([]);
  expect(vinculosNaoManifold(n)).toEqual([]);
};

/* ------------------------------------------------------------------------------------------------------------------ */
/* a caixa de 100 mm de lado com as 12 arestas arredondadas por sel.onde, uma por chamada */

const H = 0.05, R = 0.01;
type Aresta = { face: string; eixo: 'x' | 'z'; lado: 'max' | 'min' };
/* a aresta é a que a face tem no extremo pedido; faces: direita x+, esquerda x−, topo y+, fundo y−, frente z+, tras z− */
const ARESTAS: Aresta[] = [
  ...(['topo', 'fundo'] as const).flatMap((face) => (['x', 'z'] as const).flatMap((eixo) => (['max', 'min'] as const).map((lado) => ({ face, eixo, lado })))),
  ...(['direita', 'esquerda'] as const).flatMap((face) => (['max', 'min'] as const).map((lado) => ({ face, eixo: 'z' as const, lado }))),
];
/* o eixo do cilindro de cada aresta: o índice da coordenada ao longo dela e o centro nas outras duas, em ordem de índice */
function eixoDe(a: Aresta) {
  const s = (lado: string) => (lado === 'max' ? 1 : -1);
  if (a.face === 'topo' || a.face === 'fundo') {
    const sy = a.face === 'topo' ? 1 : -1;
    return a.eixo === 'x'
      ? { ao: 2, outros: [0, 1], c: [s(a.lado) * (H - R), sy * (H - R)], sinais: [s(a.lado), sy] }
      : { ao: 0, outros: [1, 2], c: [sy * (H - R), s(a.lado) * (H - R)], sinais: [sy, s(a.lado)] };
  }
  const sx = a.face === 'direita' ? 1 : -1;
  return { ao: 1, outros: [0, 2], c: [sx * (H - R), s(a.lado) * (H - R)], sinais: [sx, s(a.lado)] };
}
const CAIXA: Passo = ['cubo', { larg: 2 * H, alt: 2 * H, prof: 2 * H, origemId: 1, em: [0, -H, 0] }];
const arredondaCaixa = (a: Aresta, k: number, paineis = 6, raio = R): Passo => ['arredondarAresta', {
  origemId: 10 + k, raio, paineis,
  sel: { origem: { op: 'cubo', id: 1, face: a.face }, onde: { alvo: 'aresta', extremo: { eixo: a.eixo, lado: a.lado } } },
}];
const receitaCaixa = (ordem: number[], paineis = 6): Passo[] => [CAIXA, ...ordem.map((idx) => arredondaCaixa(ARESTAS[idx], idx, paineis))];
const TODAS = ARESTAS.map((_, k) => k);

/* os painéis de cada faixa, por parte */
function faixas(passos: Passo[], ids: number[]) {
  const comPartes: Passo[] = [...passos, ...ids.map((id): Passo => ['parte', { nome: `faixa${id}`, sel: { origem: { op: 'arredondarAresta', id } } }])];
  const n = nucleo(comPartes, {}, {});
  return { n, porFaixa: ids.map((id) => [...n.F.values()].filter((f: any) => f.parte === `faixa${id}`)) };
}

/* os planos que a caixa arredondada deve ter: os 6 da caixa e, por aresta, um por painel (a corda do arco de raio R) */
function planosEsperados(paineis: number) {
  const planos: { nrm: number[]; off: number }[] = [];
  for (const eixo of [0, 1, 2]) for (const s of [1, -1]) planos.push({ nrm: [0, 1, 2].map((i) => (i === eixo ? s : 0)), off: H });
  for (const a of ARESTAS) {
    const { outros, c, sinais } = eixoDe(a);
    const passo = Math.PI / 2 / paineis;
    for (let k = 0; k < paineis; k++) {
      const fi = (k + 0.5) * passo;
      const nrm = [0, 0, 0];
      nrm[outros[0]] = sinais[0] * Math.cos(fi); nrm[outros[1]] = sinais[1] * Math.sin(fi);
      planos.push({ nrm, off: nrm[outros[0]] * c[0] + nrm[outros[1]] * c[1] + R * Math.cos(passo / 2) });
    }
  }
  return planos;
}
function planosDaMalha(n: any) {
  return [...n.F.values()].map((f: any) => {
    const P = pontosDe(n, f);
    const nn = newell(P);
    const l = Math.hypot(nn[0], nn[1], nn[2]);
    const u = nn.map((x) => x / l);
    const g = [0, 1, 2].map((i) => P.reduce((s, p) => s + p[i], 0) / P.length);
    return { nrm: u, off: u[0] * g[0] + u[1] * g[1] + u[2] * g[2] };
  });
}

describe('a caixa com as 12 arestas arredondadas por sel.onde', () => {
  it('depois de cada arredondamento, toda face continua plana e a casca fechada', () => {
    for (let q = 1; q <= 12; q++) {
      const n = nucleo(receitaCaixa(TODAS.slice(0, q)), {}, {});
      fechada(n);
      expect(todasPlanas(n), `depois de ${q} aresta(s)`).toEqual([]);
    }
  });

  it('o resultado fecha: 80 vértices e 78 faces, todas planas, e o desenho passa na conferência da malha', () => {
    const n = nucleo(receitaCaixa(TODAS), {}, {});
    fechada(n);
    expect([n.V.size, n.F.size]).toEqual([80, 78]);
    expect(todasPlanas(n)).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'caixa arredondada' });
  });

  it('o raio mede o pedido: cada ponto de painel está a 10 mm do eixo do cilindro da faixa', () => {
    const passos = receitaCaixa(TODAS);
    const { n, porFaixa } = faixas(passos, TODAS.map((k) => 10 + k));
    fechada(n);
    porFaixa.forEach((paineis: any[], k: number) => {
      expect(paineis).toHaveLength(6);
      const { outros, c } = eixoDe(ARESTAS[k]);
      for (const f of paineis) {
        for (const p of pontosDe(n, f)) {
          expect(Math.hypot(p[outros[0]] - c[0], p[outros[1]] - c[1])).toBeCloseTo(R, 12);
        }
      }
    });
  });

  it('os planos da malha são os 6 da caixa mais os 72 das cordas dos arcos, nem um a mais: o sólido é a interseção deles', () => {
    const n = nucleo(receitaCaixa(TODAS), {}, {});
    const esperados = planosEsperados(6);
    const achados = planosDaMalha(n);
    expect(achados).toHaveLength(esperados.length);
    const usados = new Set<number>();
    for (const e of esperados) {
      const k = achados.findIndex((a, idx) => !usados.has(idx)
        && Math.hypot(a.nrm[0] - e.nrm[0], a.nrm[1] - e.nrm[1], a.nrm[2] - e.nrm[2]) < 1e-9 && Math.abs(a.off - e.off) < 1e-12);
      expect(k, `plano ${JSON.stringify(e)}`).toBeGreaterThanOrEqual(0);
      usados.add(k);
    }
    /* todo vértice fica atrás de todo plano: a casca é convexa e as normais saem do sólido */
    const mais = Math.max(...achados.flatMap((a) => [...n.V.values()].map((p: number[]) => a.nrm[0] * p[0] + a.nrm[1] * p[1] + a.nrm[2] * p[2] - a.off)));
    expect(mais).toBeLessThan(1e-12);
  });

  it('a ordem de aplicação não muda a malha: avante, de trás para a frente, verticais primeiro e embaralhada dão os mesmos polígonos', () => {
    const base = nucleo(receitaCaixa(TODAS), {}, {});
    const ordens = [[...TODAS].reverse(), [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7], [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11], [2, 7, 10, 5, 1, 8, 3, 11, 0, 6, 9, 4]];
    for (const ordem of ordens) {
      const n = nucleo(receitaCaixa(ordem), {}, {});
      fechada(n);
      expect(canonica(n), ordem.join(',')).toEqual(canonica(base));
      expect(volume(n)).toBeCloseTo(volume(base), 14);
    }
  });

  it('com 2, 4 e 8 painéis o canto fecha do mesmo jeito, e o volume retirado cresce com o raio e cai com os painéis', () => {
    const volumes = [2, 4, 6, 8].map((p) => {
      const n = nucleo(receitaCaixa(TODAS, p), {}, {});
      fechada(n);
      expect(todasPlanas(n)).toEqual([]);
      return volume(n);
    });
    /* mais painéis aproximam melhor o arco, que fica por fora da corda: o sólido ganha volume */
    for (let k = 1; k < volumes.length; k++) expect(volumes[k]).toBeGreaterThan(volumes[k - 1]);
  });

  it('o chanfro (filete) fecha o canto de duas arestas em esquadria, e o de três recusa porque tem um painel só', () => {
    const chanfra = (a: Aresta, k: number): Passo => ['filete', {
      origemId: 10 + k, raio: R,
      sel: { origem: { op: 'cubo', id: 1, face: a.face }, onde: { alvo: 'aresta', extremo: { eixo: a.eixo, lado: a.lado } } },
    }];
    const oito = nucleo([CAIXA, ...TODAS.slice(0, 8).map((k) => chanfra(ARESTAS[k], k))], {}, {});
    fechada(oito);
    expect(todasPlanas(oito)).toEqual([]);
    expect([oito.V.size, oito.F.size]).toEqual([16, 14]);
    const todas = nucleo([CAIXA, ...TODAS.map((k) => chanfra(ARESTAS[k], k))], {}, {});
    expect(todas.orfaos).toHaveLength(4);
    for (const o of todas.orfaos) expect(o.motivo).toMatch(/número par de painéis/);
    expect(arestasSemPar(todas)).toEqual([]);
    expect(todasPlanas(todas)).toEqual([]);
  });

  it('é determinístico: a mesma receita dá a mesma malha, vértice por vértice', () => {
    const a = nucleo(receitaCaixa(TODAS), {}, {}), b = nucleo(receitaCaixa(TODAS), {}, {});
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F.values()].map((f: any) => f.vs))).toBe(JSON.stringify([...b.F.values()].map((f: any) => f.vs)));
  });

  it('o canto de três arestas pede painéis pares: com 3 a terceira recusa dizendo por quê, e a malha segue fechada e plana', () => {
    const n = nucleo(receitaCaixa(TODAS, 3), {}, {});
    expect(n.orfaos.length).toBeGreaterThan(0);
    for (const o of n.orfaos) expect(o.motivo).toMatch(/número par de painéis/);
    expect(arestasSemPar(n)).toEqual([]);
    expect(vinculosNaoManifold(n)).toEqual([]);
    expect(todasPlanas(n)).toEqual([]);
  });

  it('raio diferente no mesmo canto: a segunda recusa (as retas de vértice não se cruzam) e a malha fica como estava', () => {
    const passos: Passo[] = [CAIXA, arredondaCaixa(ARESTAS[0], 0), arredondaCaixa(ARESTAS[2], 2, 6, 0.006)];
    const n = nucleo(passos, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/não se cruzam/);
    const so1 = nucleo(passos.slice(0, 2), {}, {});
    expect(canonica(n)).toEqual(canonica(so1));
  });

  it('número de painéis diferente no mesmo canto: a segunda recusa', () => {
    const passos: Passo[] = [CAIXA, arredondaCaixa(ARESTAS[0], 0), arredondaCaixa(ARESTAS[2], 2, 4)];
    const n = nucleo(passos, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/mesmo número de painéis/);
  });
});

/* ------------------------------------------------------------------------------------------------------------------ */
/* a chapa com furo oblongo do teste da tampa partida, com as quatro bordas do topo e os cantos */

const FURO_OBLONGO = {
  contorno: {
    inicio: [0.004, -0.014],
    trechos: [
      { reto: [0.004, -0.022] }, { arcoTangente: [-0.004, -0.022] },
      { reto: [-0.004, -0.014] }, { arcoTangente: [0.004, -0.014] },
    ],
  },
};
/* 80 por 60 mm, 6 mm de espessura, topo em y = 0,006, x de -40 a 40 mm e z de -60 a 0 */
const chapa = (): Passo => ['extrusao', {
  origemId: 1, eixo: 'y', altura: 0.006, segmentosArco: 16, furos: [FURO_OBLONGO],
  perfil: { retangulo: { largura: 0.08, profundidade: 0.06, centro: [0, -0.03] } },
}];
const topo = (eixo: string, lado: string) => ({
  origem: { op: 'extrusao', id: 1 }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo, lado } },
});
const BORDAS: [string, string, number][] = [['x', 'max', 0.06], ['x', 'min', 0.06], ['z', 'max', 0.08], ['z', 'min', 0.08]];
const arredondaChapa = (idx: number, raio = 0.003, paineis = 6): Passo => ['arredondarAresta', { origemId: 2 + idx, raio, paineis, sel: topo(BORDAS[idx][0], BORDAS[idx][1]) }];
const chanfraChapa = (idx: number, raio = 0.003): Passo => ['filete', { origemId: 2 + idx, raio, sel: topo(BORDAS[idx][0], BORDAS[idx][1]) }];
const receitaChapa = (ordem: number[], faz = arredondaChapa): Passo[] => [chapa(), ...ordem.map((i) => faz(i))];

/* a área retirada por comprimento de aresta de 90° e a largura dela a cada profundidade, para a sobreposição dos cantos */
const retiradaDoArco = (r: number, p: number) => r * r * (1 - 0.5 * p * Math.sin(Math.PI / (2 * p)));
/* ∫ w(t)² dt da largura w(t) da região retirada, que é linear por trechos entre os pontos do arco */
function sobreposicaoNoCanto(r: number, p: number) {
  const pts: [number, number][] = [];
  for (let k = 0; k <= p; k++) { const fi = (k / p) * Math.PI / 2; pts.push([r - r * Math.cos(fi), r - r * Math.sin(fi)]); }
  let total = 0;
  for (let k = 0; k < p; k++) {
    const [s0, t0] = pts[k], [s1, t1] = pts[k + 1];
    total += Math.abs(t1 - t0) * (s0 * s0 + s0 * s1 + s1 * s1) / 3;
  }
  return total;
}
const retiradoEsperado = (lados: number[], r: number, p: number, cantos: number) =>
  lados.reduce((s, L) => s + retiradaDoArco(r, p) * L, 0) - cantos * sobreposicaoNoCanto(r, p);

describe('a chapa com furo: as quatro bordas do topo e os cantos', () => {
  const sem = nucleo([chapa()], {}, {});

  it('depois de cada borda, toda face continua plana, a casca fechada e o raio de 3 mm nos painéis', () => {
    for (let q = 1; q <= 4; q++) {
      const ordem = [0, 1, 2, 3].slice(0, q);
      const passos = receitaChapa(ordem);
      const n = nucleo(passos, {}, {});
      fechada(n);
      expect(todasPlanas(n), `depois de ${q} borda(s)`).toEqual([]);
    }
  });

  it('as quatro bordas: casca fechada, faces planas, raio de 3 mm medido nos painéis e volume retirado exato', () => {
    const passos = receitaChapa([0, 1, 2, 3]);
    const { n, porFaixa } = faixas(passos, [2, 3, 4, 5]);
    fechada(n);
    expect(todasPlanas(n)).toEqual([]);
    conferirMalha(n, { fechada: true, rotulo: 'chapa com as quatro bordas' });
    /* os eixos: x máximo e mínimo correm ao longo de z; z máximo e mínimo, ao longo de x; o centro fica a 3 mm do topo */
    const eixos = [{ ao: 2, outros: [0, 1], c: [0.037, 0.003] }, { ao: 2, outros: [0, 1], c: [-0.037, 0.003] }, { ao: 0, outros: [1, 2], c: [0.003, -0.003] }, { ao: 0, outros: [1, 2], c: [0.003, -0.057] }];
    porFaixa.forEach((paineis: any[], k: number) => {
      expect(paineis).toHaveLength(6);
      for (const f of paineis) for (const p of pontosDe(n, f)) {
        expect(Math.hypot(p[eixos[k].outros[0]] - eixos[k].c[0], p[eixos[k].outros[1]] - eixos[k].c[1])).toBeCloseTo(0.003, 12);
      }
    });
    expect(volume(sem) - volume(n)).toBeCloseTo(retiradoEsperado([0.06, 0.06, 0.08, 0.08], 0.003, 6, 4), 12);
  });

  it('o canto de duas bordas fecha em esquadria: o vértice da quina vertical fica na altura da tangência e a casca é a mesma nas duas ordens', () => {
    const ordens = [[0, 1, 2, 3], [3, 2, 1, 0], [0, 2, 1, 3], [2, 0, 3, 1], [1, 3, 0, 2]];
    const base = nucleo(receitaChapa(ordens[0]), {}, {});
    for (const ordem of ordens) {
      const n = nucleo(receitaChapa(ordem), {}, {});
      fechada(n);
      expect(todasPlanas(n), ordem.join(',')).toEqual([]);
      expect(canonica(n), ordem.join(',')).toEqual(canonica(base));
      expect(volume(sem) - volume(n)).toBeCloseTo(retiradoEsperado([0.06, 0.06, 0.08, 0.08], 0.003, 6, 4), 12);
    }
    /* o ponto da quina vertical no topo: x = 40 mm, z = 0, y = 3 mm (a tangência), onde a esquadria encontra a quina */
    const quina = [...base.V.values()].filter((p: number[]) => Math.abs(p[0] - 0.04) < 1e-9 && Math.abs(p[2]) < 1e-9 && p[1] > 0.0029);
    expect(quina).toHaveLength(1);
    expect(quina[0][1]).toBeCloseTo(0.003, 12);
  });

  it('com um painel só (filete) o canto também fecha: chanfros nas quatro bordas, planos, na esquadria e com o volume exato', () => {
    const passos = receitaChapa([0, 1, 2, 3], chanfraChapa);
    const n = nucleo(passos, {}, {});
    fechada(n);
    expect(todasPlanas(n)).toEqual([]);
    const area = 0.003 * 0.003 / 2, overlap = 0.003 ** 3 / 3;
    expect(volume(sem) - volume(n)).toBeCloseTo(area * (0.06 * 2 + 0.08 * 2) - 4 * overlap, 12);
    const outra = nucleo(receitaChapa([2, 0, 3, 1], chanfraChapa), {}, {});
    expect(canonica(outra)).toEqual(canonica(n));
  });

  it('é determinístico', () => {
    const a = nucleo(receitaChapa([0, 1, 2, 3]), {}, {}), b = nucleo(receitaChapa([0, 1, 2, 3]), {}, {});
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F.values()].map((f: any) => f.vs))).toBe(JSON.stringify([...b.F.values()].map((f: any) => f.vs)));
  });

  it('com painéis ímpares o canto de duas bordas fecha igual: só o canto de três pede par', () => {
    const n = nucleo(receitaChapa([0, 1, 2, 3].map((x) => x), (i) => arredondaChapa(i, 0.003, 5)), {}, {});
    fechada(n);
    expect(todasPlanas(n)).toEqual([]);
    expect(volume(sem) - volume(n)).toBeCloseTo(retiradoEsperado([0.06, 0.06, 0.08, 0.08], 0.003, 5, 4), 12);
  });

  it('raio diferente no canto da chapa: a segunda recusa dizendo que as retas não se cruzam e a malha fica como estava', () => {
    const passos: Passo[] = [chapa(), arredondaChapa(0), arredondaChapa(2, 0.002)];
    const n = nucleo(passos, {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/não se cruzam/);
    expect(canonica(n)).toEqual(canonica(nucleo(passos.slice(0, 2), {}, {})));
  });
});
