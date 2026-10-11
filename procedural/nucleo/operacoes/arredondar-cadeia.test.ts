/* arredondar-cadeia.test.ts — `arredondarAresta` com `cadeia`: a aresta escolhida e as que continuam em tangência a partir dela,
   arredondadas como uma varredura só.

   O caso é o do suporte de tubo: a borda livre de cima da aba do tubo é uma reta de 10 mm que continua em tangência por uma
   concordância de 5 mm em 16 facetas, por outro reto e pelo arco do recorte. Arredondar uma faceta por vez termina em degrau
   ou é recusado; a cadeia sai inteira, do canto vivo de um lado ao do outro, ou no laço fechado de um contorno tangente.

   Nenhuma expectativa vem do código que gera a malha. A tampa original e as paredes dão o eixo do cilindro de cada aresta (a r da
   tampa e a r da parede), o desvio de cada vértice do arredondamento é a distância dele a esse eixo contra o raio pedido, e o
   volume retirado vem da seção do arco e do comprimento e das esquadrias da cadeia:
       V = L·A − T·M2,   A = ∫ w dy,   M2 = ∫ w² dy,   T = Σ tan(α/2) nos vértices (positivo no convexo)
   com w(y) a largura retirada na profundidade y, em cima do anel de n painéis.

   TOLERÂNCIA DECLARADA: o desvio de um vértice do arredondamento ao raio pedido tem de ficar abaixo de 1e-9 (1 nanômetro, em
   metro; o raio é 3e-3). O volume confere a 1e-9 relativo. */
import { describe, expect, it } from 'vitest';
import { arestasSemPar, conferirMalha, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';

type Passo = [string, Record<string, unknown>];
type V3 = [number, number, number];

const mm = (x: number) => x / 1000;
const TOLERANCIA_DO_RAIO = 1e-9;
const TOLERANCIA_DO_VOLUME = 1e-9;
/* painéis por aresta em quase todos os casos; os testes que mudam o número o passam por parâmetro */
const PAINEIS = 6;

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: number[], s: number) => [a[0] * s, a[1] * s, a[2] * s];
const ponto = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const tam = (a: number[]) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: number[]) => mul(a, 1 / tam(a));
const pontosDe = (n: any, face: any): number[][] => face.vs.map((v: number) => n.V.get(v));

/* ---- a peça: a aba do tubo, 60 mm de largura, 6 mm de espessura em y, saída de 50 mm, recorte de 30 mm de diâmetro ---- */
const abaDoTubo = (segmentosArco = 16, altura = mm(6)): Passo => ['extrusao', {
  origemId: 1, altura, segmentosArco,
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
const ORIGEM_1 = { op: 'extrusao', id: 1 };
const aresta = (normal: number[], extremo: Record<string, unknown>, regiao?: unknown) => ({
  ...(regiao ? { regiao } : { origem: ORIGEM_1 }),
  onde: { alvo: 'aresta', normal: { dir: normal, ate: 5 }, extremo },
});
/* a borda livre de cima do trecho da direita (de x = 30 a 20) ou da esquerda */
const regiaoDaBorda = (lado: 1 | -1) => ({ min: [lado * mm(25) - mm(5.5), -mm(0.5), mm(49.5)], max: [lado * mm(25) + mm(5.5), mm(6.5), mm(50.5)] });
const bordaLivre = (lado: 1 | -1) => aresta([0, 1, 0], { eixo: 'z', lado: 'max' }, regiaoDaBorda(lado));
const arredonda = (origemId: number, sel: unknown, extra: Record<string, unknown> = {}): Passo =>
  ['arredondarAresta', { origemId, raio: mm(3), paineis: PAINEIS, sel, ...extra }];

/* ---- medidas sobre a malha ---- */
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
/* o que toda prova pede: sem órfão, sem aviso, casca fechada e orientada (cada aresta tem a volta, o vínculo de cada vértice
   fecha, o volume é positivo), toda face plana e convexa, e a malha atravessa o adaptador */
function conferir(n: any, rotulo: string) {
  expect(n.orfaos.map((o: any) => o.motivo), rotulo).toEqual([]);
  expect(n.avisos, `${rotulo}: aviso`).toEqual([]);
  expect(arestasSemPar(n), `${rotulo}: aresta sem par`).toEqual([]);
  expect(vinculosNaoManifold(n), `${rotulo}: vínculo não manifold`).toEqual([]);
  expect(volume(n), `${rotulo}: casca virada para dentro`).toBeGreaterThan(0);
  expect([...n.F.values()].filter((f: any) => desvioDePlano(n, f) > 1e-6).map((f: any) => f.id), `${rotulo}: face fora do plano`).toEqual([]);
  expect([...n.F.values()].filter((f: any) => !faceConvexa(n, f)).map((f: any) => f.id), `${rotulo}: face côncava`).toEqual([]);
  conferirMalha(n, { fechada: true, rotulo });
}
/* a faixa da origem: os painéis do arredondamento (e qualquer degrau, se houvesse) */
function faixaDe(passos: Passo[], id: number) {
  const n = nucleo([...passos, ['parte', { nome: 'faixa', sel: { origem: { op: 'arredondarAresta', id } } }]], {}, {});
  return [...n.F.values()].filter((f: any) => f.parte === 'faixa').sort((a: any, b: any) => a.id - b.id);
}

/* o laço da borda da tampa (a face de coordenada `valor` no eixo da extrusão), na ordem em que a tampa o percorre. Com `semente`
   (x, y, z) escolhe o laço do vértice mais perto dela, o que separa o contorno externo do de um furo. */
function lacoDaTampa(n: any, valor: number, { eixo = 1, semente }: { eixo?: number; semente?: number[] } = {}) {
  const tampa = [...n.F.values()].filter((f: any) => f.vs.every((v: number) => Math.abs(n.V.get(v)[eixo] - valor) < 1e-9));
  const dentro = new Set<string>();
  for (const f of tampa) for (let k = 0; k < f.vs.length; k++) dentro.add(`${f.vs[k]}>${f.vs[(k + 1) % f.vs.length]}`);
  const proximo = new Map<number, number>();
  for (const chave of dentro) {
    const [a, b] = chave.split('>').map(Number);
    if (!dentro.has(`${b}>${a}`)) proximo.set(a, b);
  }
  const candidatos = [...proximo.keys()].sort((a, b) => a - b);
  const inicio = semente
    ? candidatos.reduce((melhor, v) => (tam(sub(n.V.get(v), semente)) < tam(sub(n.V.get(melhor), semente)) ? v : melhor), candidatos[0])
    : candidatos[0];
  const laco = [inicio];
  for (let v = proximo.get(inicio)!; v !== inicio; v = proximo.get(v)!) laco.push(v);
  return laco.map((v) => n.V.get(v) as V3);
}
const perto = (p: number[], x: number, z: number) => Math.abs(p[0] - x) < 1e-7 && Math.abs(p[2] - z) < 1e-7;
/* o trecho do laço entre dois pontos, na ordem do laço, passando por um terceiro */
function trecho(laco: V3[], de: [number, number], ate: [number, number], por: [number, number]) {
  const a = laco.findIndex((p) => perto(p, ...de)), b = laco.findIndex((p) => perto(p, ...ate));
  const adiante = (i: number, j: number) => { const t: V3[] = []; for (let k = i; ; k = (k + 1) % laco.length) { t.push(laco[k]); if (k === j) break; } return t; };
  /* o ponto de passagem vale dentro de 1 mm: ele só separa os dois caminhos possíveis entre os cantos */
  for (const t of [adiante(a, b), adiante(b, a)]) if (t.some((p) => Math.hypot(p[0] - por[0], p[2] - por[1]) < 1e-3)) return t;
  throw new Error('trecho não encontrado');
}

/* ---- o oráculo: o cilindro de rolamento de cada aresta, a partir da tampa e das paredes ORIGINAIS ----
   Para a aresta P→Q da tampa de normal nA, o eixo passa a r da tampa e a r da parede: P + r·(nA × e + u), com u = −nA. */
function eixosDaCadeia(pts: V3[], r: number, fechada: boolean, nA: number[] = [0, 1, 0]) {
  const m = fechada ? pts.length : pts.length - 1;
  const eixos: { c: number[]; e: number[]; L: number; P: number[] }[] = [];
  for (let j = 0; j < m; j++) {
    const P = pts[j], Q = pts[(j + 1) % pts.length];
    const L = tam(sub(Q, P));
    const e = mul(sub(Q, P), 1 / L);
    eixos.push({ c: soma(P, mul(soma(cruz(nA, e), mul(nA, -1)), r)), e, L, P });
  }
  return eixos;
}
const distanciaAoEixo = (x: number[], eixo: { c: number[]; e: number[] }) => {
  const d = sub(x, eixo.c);
  return tam(sub(d, mul(eixo.e, ponto(d, eixo.e))));
};
/* O maior desvio, entre os painéis, da distância dos vértices ao eixo contra o raio pedido. Cada painel é medido contra o eixo
   da aresta a que pertence: o único eixo da cadeia que serve aos quatro vértices dele (o menor dos máximos). */
function desvioDoRaio(n: any, painelFaces: any[], eixos: ReturnType<typeof eixosDaCadeia>, r: number) {
  let pior = 0;
  const porEixo = new Array(eixos.length).fill(0);
  for (const f of painelFaces) {
    const P = pontosDe(n, f);
    let melhor = Infinity, quem = -1;
    eixos.forEach((eixo, j) => {
      const d = Math.max(...P.map((p) => Math.abs(distanciaAoEixo(p, eixo) - r)));
      if (d < melhor) { melhor = d; quem = j; }
    });
    porEixo[quem]++;
    pior = Math.max(pior, melhor);
  }
  /* os painéis da cadeia são todos medidos: um por aresta e por posição do arco */
  expect(porEixo.reduce((a, b) => a + b, 0)).toBe(painelFaces.length);
  return pior;
}
/* o volume retirado esperado de uma cadeia de arestas de 90° com pontas a 90°: L·A − T·M2 */
function volumeRetirado(pts: V3[], r: number, paineis: number, fechada: boolean, nA: number[] = [0, 1, 0]) {
  const m = fechada ? pts.length : pts.length - 1;
  let L = 0, T = 0;
  for (let j = 0; j < m; j++) L += tam(sub(pts[(j + 1) % pts.length], pts[j]));
  const primeiro = fechada ? 0 : 1, ultimo = fechada ? pts.length : pts.length - 1;
  for (let i = primeiro; i < ultimo; i++) {
    const e1 = unit(sub(pts[i], pts[(i - 1 + pts.length) % pts.length])), e2 = unit(sub(pts[(i + 1) % pts.length], pts[i]));
    const alfa = Math.acos(Math.max(-1, Math.min(1, ponto(e1, e2))));
    T += Math.tan(alfa / 2) * Math.sign(ponto(cruz(e1, e2), nA));
  }
  /* a largura retirada em cada anel: w_k = r·(1 − sen ψ_k) na profundidade y_k = r·(1 − cos ψ_k) */
  let A = 0, M2 = 0;
  for (let k = 0; k < paineis; k++) {
    const y0 = r * (1 - Math.cos((k / paineis) * Math.PI / 2)), y1 = r * (1 - Math.cos(((k + 1) / paineis) * Math.PI / 2));
    const w0 = r * (1 - Math.sin((k / paineis) * Math.PI / 2)), w1 = r * (1 - Math.sin(((k + 1) / paineis) * Math.PI / 2));
    A += (y1 - y0) * (w0 + w1) / 2;
    M2 += (y1 - y0) * (w0 * w0 + w0 * w1 + w1 * w1) / 3;
  }
  return L * A - T * M2;
}

describe('a borda livre de cima da aba do tubo, com 3 mm, em uma chamada', () => {
  const passos: Passo[] = [abaDoTubo(), arredonda(2, bordaLivre(1), { cadeia: true })];
  const n0 = nucleo([abaDoTubo()], {}, {});
  const n = nucleo(passos, {}, {});
  const laco = lacoDaTampa(n0, mm(6));
  /* do canto vivo da direita (x = 30) ao da esquerda, pelo recorte */
  const pts = trecho(laco, [mm(30), mm(50)], [mm(-30), mm(50)], [0, mm(20)]);
  const arestas = pts.length - 1;

  it('a cadeia é a borda inteira, de um canto vivo ao outro: todo o laço da tampa menos a base e as duas laterais retas', () => {
    /* o laço tem a base (dois cantos), as duas laterais (que chegam aos cantos vivos de cima) e a cadeia entre os cantos de cima */
    const base = laco.filter((p) => Math.abs(p[2] - mm(6)) < 1e-9);
    expect(base).toHaveLength(2);
    expect(arestas).toBe(laco.length - base.length - 1);
    expect(perto(pts[0], -mm(30), mm(50)) && perto(pts[pts.length - 1], mm(30), mm(50))).toBe(true);
  });

  it('fecha: sem órfão, sem aviso de degrau, casca orientada, faces planas e convexas, e atravessa o adaptador', () => {
    conferir(n, 'borda livre');
  });

  it('nenhuma face da cadeia é degrau: a faixa tem exatamente 6 painéis por aresta, todos quadriláteros', () => {
    const faixa = faixaDe(passos, 2);
    expect(faixa).toHaveLength(arestas * PAINEIS);
    expect(faixa.every((f: any) => f.vs.length === 4)).toBe(true);
    /* o que a malha ganha além dos painéis são só peças da tampa partidas em convexas, todas no plano dela */
    const naTampa = (m: any) => [...m.F.values()].filter((f: any) => f.vs.every((v: number) => Math.abs(m.V.get(v)[1] - mm(6)) < 1e-12)).length;
    expect(n.F.size - n0.F.size - arestas * PAINEIS).toBe(naTampa(n) - naTampa(n0));
  });

  it(`cada vértice do arredondamento fica a 3 mm do eixo da própria aresta, com desvio abaixo de ${TOLERANCIA_DO_RAIO}`, () => {
    const eixos = eixosDaCadeia(pts, mm(3), false);
    const desvio = desvioDoRaio(n, faixaDe(passos, 2), eixos, mm(3));
    expect(desvio).toBeLessThan(TOLERANCIA_DO_RAIO);
  });

  it('o arco é tangente: todo vértice do anel fica entre a tampa (y = 6 mm) e 3 mm abaixo dela', () => {
    for (const f of faixaDe(passos, 2)) for (const p of pontosDe(n, f)) {
      expect(p[1]).toBeLessThanOrEqual(mm(6) + 1e-12);
      expect(p[1]).toBeGreaterThanOrEqual(mm(3) - 1e-12);
    }
  });

  it('o volume retirado é a seção do arco ao longo da cadeia, com a esquadria de cada junção', () => {
    const esperado = volumeRetirado(pts, mm(3), PAINEIS, false);
    const medido = volume(n0) - volume(n);
    expect(esperado).toBeGreaterThan(0);
    expect(Math.abs(medido - esperado) / esperado).toBeLessThan(TOLERANCIA_DO_VOLUME);
  });

  it('o contorno interno da tampa é o contorno deslocado 3 mm para dentro com esquadria (a CrossSection do deslocamento de contorno)', () => {
    const deslocada = nucleo([['extrusao', {
      ...(abaDoTubo()[1] as any), origemId: 1,
      deslocar: { para: 'dentro', distancia: mm(3), canto: 'esquadria' },
    }]], {}, {});
    const lacoInterno = lacoDaTampa(deslocada, mm(6));
    const distanciaAoLaco = (p: number[]) => {
      let melhor = Infinity;
      for (let k = 0; k < lacoInterno.length; k++) {
        const a = lacoInterno[k], b = lacoInterno[(k + 1) % lacoInterno.length];
        const ab = sub(b, a), t = Math.max(0, Math.min(1, ponto(sub(p, a), ab) / ponto(ab, ab)));
        melhor = Math.min(melhor, tam(sub(p, soma(a, mul(ab, t)))));
      }
      return melhor;
    };
    /* os vértices da tampa que o arredondamento moveu, menos as duas pontas (a ponta escorrega até a parede do canto) */
    const antigos = new Set(n0.V.keys());
    const noTopo = [...n.V.entries()].filter(([id, p]: any) => antigos.has(id) && Math.abs(p[1] - mm(6)) < 1e-12 && n0.V.get(id)[0] !== p[0] || antigos.has(id) && n0.V.get(id)[2] !== n.V.get(id)[2]);
    const movidos = noTopo.map(([, p]: any) => p as number[]).filter((p) => Math.abs(Math.abs(p[0]) - mm(30)) > 1e-9);
    expect(movidos.length).toBeGreaterThan(arestas / 2);
    /* o deslocamento da CrossSection quantiza as coordenadas (Clipper): o desvio pedido aqui é de 1e-7, 0,1 µm */
    for (const p of movidos) expect(distanciaAoLaco(p)).toBeLessThan(1e-7);
  });

  it('a cadeia não depende da aresta escolhida: pela faceta da concordância dá a mesma malha, e a outra reta também', () => {
    const facetaDaConcordancia = aresta([0, 1, 0], { eixo: 'z', lado: 'max' }, {
      min: [mm(19.4), -mm(0.5), mm(49.9)], max: [mm(20.1), mm(6.5), mm(50.1)],
    });
    const porFaceta = nucleo([abaDoTubo(), arredonda(2, facetaDaConcordancia, { cadeia: true })], {}, {});
    const pelaOutraReta = nucleo([abaDoTubo(), arredonda(2, bordaLivre(-1), { cadeia: true })], {}, {});
    for (const outro of [porFaceta, pelaOutraReta]) {
      expect(outro.orfaos).toEqual([]);
      expect(JSON.stringify([...outro.V])).toBe(JSON.stringify([...n.V]));
      expect(JSON.stringify([...outro.F.values()].map((f: any) => f.vs))).toBe(JSON.stringify([...n.F.values()].map((f: any) => f.vs)));
    }
  });

  it('é determinístico', () => {
    const outro = nucleo(passos, {}, {});
    expect(JSON.stringify([...outro.V])).toBe(JSON.stringify([...n.V]));
    expect(JSON.stringify([...outro.F.values()].map((f: any) => [f.id, f.vs]))).toBe(JSON.stringify([...n.F.values()].map((f: any) => [f.id, f.vs])));
  });

  it('os mesmos 3 mm sem a cadeia terminam em degrau e avisam: a cadeia é o que resolve', () => {
    const sozinha = nucleo([abaDoTubo(), arredonda(2, bordaLivre(1))], {}, {});
    expect(sozinha.orfaos).toEqual([]);
    expect(sozinha.avisos).toHaveLength(1);
    expect(sozinha.avisos[0].ref).toBe('degrau');
    expect(n.avisos).toEqual([]);
  });

  it('o resto da tampa depois da cadeia: as duas laterais de cima e os dois cantos livres arredondam, nessa ordem, e a peça fecha', () => {
    const origem = (normal: number[], eixo: string, lado: string) => aresta(normal, { eixo, lado });
    const completa: Passo[] = [
      abaDoTubo(), arredonda(2, bordaLivre(1), { cadeia: true }),
      arredonda(3, origem([0, 1, 0], 'x', 'max')), arredonda(4, origem([0, 1, 0], 'x', 'min')),
      arredonda(5, origem([1, 0, 0], 'z', 'max')), arredonda(6, origem([-1, 0, 0], 'z', 'max')),
    ];
    const todas = nucleo(completa, {}, {});
    conferir(todas, 'aba do tubo com as seis arestas');
  });

  it('as laterais antes da cadeia são recusadas com a causa: a cadeia vem primeiro e o canto depois', () => {
    const origem = (normal: number[], eixo: string, lado: string) => aresta(normal, { eixo, lado });
    const r = nucleo([
      abaDoTubo(), arredonda(3, origem([0, 1, 0], 'x', 'max')), arredonda(4, origem([0, 1, 0], 'x', 'min')),
      arredonda(2, bordaLivre(1), { cadeia: true }),
    ], {}, {});
    expect(r.orfaos).toHaveLength(1);
    expect(r.orfaos[0].motivo).toMatch(/encontra um arredondamento feito antes; arredonde a cadeia primeiro/);
  });

  it.each([2, 4, 6, 8, 12])('com %i painéis por aresta a cadeia fecha e mede o raio', (paineis) => {
    const ps: Passo[] = [abaDoTubo(), arredonda(2, bordaLivre(1), { cadeia: true, paineis })];
    const r = nucleo(ps, {}, {});
    conferir(r, `${paineis} painéis`);
    expect(desvioDoRaio(r, faixaDe(ps, 2), eixosDaCadeia(pts, mm(3), false), mm(3))).toBeLessThan(TOLERANCIA_DO_RAIO);
    const esperado = volumeRetirado(pts, mm(3), paineis, false);
    expect(Math.abs((volume(n0) - volume(r)) - esperado) / esperado).toBeLessThan(TOLERANCIA_DO_VOLUME);
  });

  it.each([4, 8, 24])('com %i segmentos por quarto de volta no contorno', (seg) => {
    const ps: Passo[] = [abaDoTubo(seg), arredonda(2, bordaLivre(1), { cadeia: true })];
    const r = nucleo(ps, {}, {});
    conferir(r, `${seg} segmentos`);
    const antes = nucleo([abaDoTubo(seg)], {}, {});
    const p = trecho(lacoDaTampa(antes, mm(6)), [mm(30), mm(50)], [mm(-30), mm(50)], [0, mm(20)]);
    expect(desvioDoRaio(r, faixaDe(ps, 2), eixosDaCadeia(p, mm(3), false), mm(3))).toBeLessThan(TOLERANCIA_DO_RAIO);
    const esperado = volumeRetirado(p, mm(3), PAINEIS, false);
    expect(Math.abs((volume(antes) - volume(r)) - esperado) / esperado).toBeLessThan(TOLERANCIA_DO_VOLUME);
  });
});

describe('o que a cadeia recusa, com a causa', () => {
  const grossa = abaDoTubo(16, mm(40));
  const borda = (lado: 1 | -1) => aresta([0, 1, 0], { eixo: 'z', lado: 'max' }, { ...regiaoDaBorda(lado), max: [lado * mm(25) + mm(5.5), mm(40.5), mm(50.5)] });
  const lacoGrosso = (() => {
    const g = nucleo([grossa], {}, {});
    return trecho(lacoDaTampa(g, mm(40)), [mm(30), mm(50)], [mm(-30), mm(50)], [0, mm(20)]);
  })();

  it('o raio maior que o de curvatura de um trecho convexo (a concordância de 5 mm) é recusado, e o convexo que cabe passa', () => {
    const recusado = nucleo([grossa, arredonda(2, borda(1), { cadeia: true, raio: mm(6) })], {}, {});
    expect(recusado.orfaos).toHaveLength(1);
    expect(recusado.orfaos[0].motivo).toMatch(/o raio não cabe: a faceta .* some antes de o arredondamento terminar/);
    expect(recusado.orfaos[0].motivo).toMatch(/raio de curvatura do trecho convexo do contorno \(cerca de 0\.0049/);
    expect(recusado.F.size).toBe(nucleo([grossa], {}, {}).F.size);
    const cabe = nucleo([grossa, arredonda(2, borda(1), { cadeia: true, raio: mm(4.5) })], {}, {});
    conferir(cabe, 'raio 4,5 mm numa concordância de 5 mm');
  });

  it('o arco côncavo do recorte (15 mm) não limita: o raio de 10 mm, maior que a concordância, é recusado só por ela', () => {
    const r = nucleo([grossa, arredonda(2, borda(1), { cadeia: true, raio: mm(10) })], {}, {});
    expect(r.orfaos).toHaveLength(1);
    expect(r.orfaos[0].motivo).toMatch(/\(cerca de 0\.0049/);
  });

  it('o arco côncavo sozinho não limita o raio: um recorte semicircular de 5 mm admite 7 mm, com o raio medido e o volume da seção', () => {
    /* placa de 40 mm de altura com um recorte de 5 mm de raio na borda de cima: reto, semicírculo côncavo e reto, entre dois cantos vivos */
    const placa: Passo = ['extrusao', {
      origemId: 1, altura: mm(40), segmentosArco: 16,
      perfil: { contorno: { inicio: [mm(-30), mm(0)], trechos: [
        { reto: [mm(30), mm(0)] }, { reto: [mm(30), mm(40)] }, { reto: [mm(5), mm(40)] }, { reto: [mm(5), mm(35)] },
        { arcoTangente: [mm(-5), mm(35)] }, { reto: [mm(-5), mm(40)] }, { reto: [mm(-30), mm(40)] },
      ] } },
    }];
    const n0 = nucleo([placa], {}, {});
    const laco = lacoDaTampa(n0, mm(40));
    const pts = trecho(laco, [mm(5), mm(40)], [mm(-5), mm(40)], [0, mm(30)]);
    const pontas = [pts[0], pts[pts.length - 1]];
    expect(pontas.some((p) => perto(p, mm(5), mm(40))) && pontas.some((p) => perto(p, -mm(5), mm(40)))).toBe(true);
    const notch = aresta([0, 1, 0], { eixo: 'x', lado: 'max' }, { min: [mm(4.5), -mm(0.5), mm(34.5)], max: [mm(5.5), mm(40.5), mm(40.5)] });
    for (const rmm of [3, 7]) {
      const passos: Passo[] = [placa, arredonda(2, notch, { cadeia: true, raio: mm(rmm) })];
      const r = nucleo(passos, {}, {});
      conferir(r, `recorte côncavo de 5 mm com raio de ${rmm} mm`);
      expect(faixaDe(passos, 2)).toHaveLength((pts.length - 1) * PAINEIS);
      expect(desvioDoRaio(r, faixaDe(passos, 2), eixosDaCadeia(pts, mm(rmm), false), mm(rmm))).toBeLessThan(TOLERANCIA_DO_RAIO);
      const esperado = volumeRetirado(pts, mm(rmm), PAINEIS, false);
      expect(Math.abs((volume(n0) - volume(r)) - esperado) / esperado).toBeLessThan(TOLERANCIA_DO_VOLUME);
    }
  });

  it('o raio que passa da altura da parede é recusado com a altura', () => {
    const r = nucleo([abaDoTubo(), arredonda(2, bordaLivre(1), { cadeia: true, raio: mm(6) })], {}, {});
    expect(r.orfaos).toHaveLength(1);
    expect(r.orfaos[0].motivo).toMatch(/o raio não cabe: a parede da aresta .* tem altura 0\.006 e o raio 0\.006 chega ao fim dela/);
  });

  it('a aresta cuja parede não é perpendicular à tampa é recusada com o diedro (a base de um cone)', () => {
    /* a base do cone é a tampa de 24 lados, de facetas de 15°; a parede é o triângulo inclinado, a 63° da base */
    const triangulo = { min: [-0.01, -0.01, -0.01], max: [0.51, 1.01, 0.14] };
    const base = { regiao: triangulo, onde: { alvo: 'aresta', normal: { dir: [0, -1, 0], ate: 5 } } };
    const r = nucleo([['cone', { origemId: 1, raio: 0.5, altura: 1, lados: 24 }],
      ['arredondarAresta', { origemId: 2, raio: 0.05, paineis: 4, cadeia: true, sel: base }]], {}, {});
    expect(r.orfaos).toHaveLength(1);
    expect(r.orfaos[0].motivo).toMatch(/faz diedro de .*° com a tampa: a cadeia só segue arestas de 90°/);
  });

  it.each([
    ['uma palavra', 'sim', /cadeia precisa ser true ou \{ ate: graus \}/],
    ['uma chave desconhecida', { ate: 30, passos: 2 }, /chave desconhecida 'passos'/],
    ['o ângulo zero', { ate: 0 }, /cadeia\.ate precisa estar entre 0 e 90 graus/],
    ['o ângulo de 90 graus', { ate: 90 }, /cadeia\.ate precisa estar entre 0 e 90 graus/],
  ])('a opção inválida (%s) é recusada', (_, cadeia, mensagem) => {
    const r = nucleo([abaDoTubo(), arredonda(2, bordaLivre(1), { cadeia })], {}, {});
    expect(r.orfaos).toHaveLength(1);
    expect(r.orfaos[0].motivo).toMatch(mensagem as RegExp);
  });

  it('um ângulo menor que a dobra das facetas deixa a cadeia de uma aresta só: o resultado é o de sem cadeia, com o aviso do degrau', () => {
    const com = nucleo([abaDoTubo(), arredonda(2, bordaLivre(1), { cadeia: { ate: 1 } })], {}, {});
    const sem = nucleo([abaDoTubo(), arredonda(2, bordaLivre(1))], {}, {});
    expect(JSON.stringify([...com.V])).toBe(JSON.stringify([...sem.V]));
    expect(com.avisos).toHaveLength(1);
    expect(com.avisos[0].ref).toBe('degrau');
  });

  it('uma aresta de canto vivo dos dois lados (a de uma caixa) com cadeia dá a mesma malha que sem ela', () => {
    const sel = { origem: { op: 'cubo', id: 1 }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } };
    const com = nucleo([['cubo', { origemId: 1, lado: 1 }], ['arredondarAresta', { origemId: 2, raio: 0.1, paineis: 4, cadeia: true, sel }]], {}, {});
    const sem = nucleo([['cubo', { origemId: 1, lado: 1 }], ['arredondarAresta', { origemId: 2, raio: 0.1, paineis: 4, sel }]], {}, {});
    expect(com.orfaos).toEqual([]);
    expect(JSON.stringify([...com.F.values()].map((f: any) => f.vs))).toBe(JSON.stringify([...sem.F.values()].map((f: any) => f.vs)));
    expect(JSON.stringify([...com.V])).toBe(JSON.stringify([...sem.V]));
  });

  void lacoGrosso;
});

describe('a cadeia fechada: o laço inteiro de um contorno tangente', () => {
  /* um estádio de 20 mm por 20 mm de lado: dois retos de 20 mm e dois semicírculos de 10 mm de raio, em 32 facetas cada */
  const estadio = (segmentosArco = 16): Passo => ['extrusao', {
    origemId: 1, altura: mm(20), segmentosArco,
    perfil: { contorno: { inicio: [mm(-10), mm(0)], trechos: [{ reto: [mm(10), mm(0)] }, { arcoTangente: [mm(10), mm(20)] }, { reto: [mm(-10), mm(20)] }, { arcoTangente: [mm(-10), mm(0)] }] } },
  }];
  const reto = aresta([0, 1, 0], { eixo: 'z', lado: 'min' }, { min: [-mm(10.5), -mm(0.5), -mm(0.5)], max: [mm(10.5), mm(20.5), mm(0.5)] });
  const n0 = nucleo([estadio()], {}, {});
  const pts = lacoDaTampa(n0, mm(20));

  it('o laço é o contorno do estádio: os pontos estão nos dois retos ou nos dois semicírculos de 10 mm de raio', () => {
    for (const p of pts) {
      const noReto = (Math.abs(p[2]) < 1e-9 || Math.abs(p[2] - mm(20)) < 1e-9) && Math.abs(p[0]) <= mm(10) + 1e-9;
      const noSemicirculo = [mm(-10), mm(10)].some((cx) => Math.abs(Math.hypot(p[0] - cx, p[2] - mm(10)) - mm(10)) < 1e-7);
      expect(noReto || noSemicirculo).toBe(true);
    }
  });

  it.each([2, 5, 9])('com raio de %i mm: fecha sem ponta, sem degrau, com o raio medido e o volume da seção do arco', (rmm) => {
    const r = mm(rmm);
    const passos: Passo[] = [estadio(), arredonda(2, reto, { cadeia: true, raio: r })];
    const n = nucleo(passos, {}, {});
    conferir(n, `estádio ${rmm} mm`);
    const faixa = faixaDe(passos, 2);
    expect(faixa).toHaveLength(pts.length * PAINEIS);
    expect(faixa.every((f: any) => f.vs.length === 4)).toBe(true);
    expect(desvioDoRaio(n, faixa, eixosDaCadeia(pts, r, true), r)).toBeLessThan(TOLERANCIA_DO_RAIO);
    const esperado = volumeRetirado(pts, r, PAINEIS, true);
    expect(Math.abs((volume(n0) - volume(n)) - esperado) / esperado).toBeLessThan(TOLERANCIA_DO_VOLUME);
  });

  it('a tampa que sobra é o estádio recuado do raio: a área dela é a do contorno deslocado', () => {
    const r = mm(5);
    const n = nucleo([estadio(), arredonda(2, reto, { cadeia: true, raio: r })], {}, {});
    const area = (m: any) => {
      let s = 0;
      for (const f of m.F.values()) {
        const P = pontosDe(m, f);
        if (!P.every((p) => Math.abs(p[1] - mm(20)) < 1e-9)) continue;
        for (let k = 1; k + 1 < P.length; k++) s += tam(cruz(sub(P[k], P[0]), sub(P[k + 1], P[0]))) / 2;
      }
      return s;
    };
    const deslocado = nucleo([['extrusao', { ...(estadio()[1] as any), deslocar: { para: 'dentro', distancia: r, canto: 'esquadria' } }]], {}, {});
    /* a área do deslocamento da CrossSection vem de coordenadas quantizadas (Clipper): a conta confere a 1e-5 relativo */
    expect(Math.abs(area(n) - area(deslocado)) / area(deslocado)).toBeLessThan(1e-5);
  });

  it('o raio de 10,5 mm, maior que o do semicírculo convexo, é recusado com o raio de curvatura', () => {
    const n = nucleo([estadio(), arredonda(2, reto, { cadeia: true, raio: mm(10.5) })], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/passa do raio de curvatura do trecho convexo do contorno \(cerca de 0\.0099/);
  });

  it('a mesma cadeia por outra aresta do laço fecha com a mesma forma (só a numeração dos vértices novos gira)', () => {
    const outra = aresta([0, 1, 0], { eixo: 'z', lado: 'max' }, { min: [-mm(10.5), -mm(0.5), mm(19.5)], max: [mm(10.5), mm(20.5), mm(20.5)] });
    const a = nucleo([estadio(), arredonda(2, reto, { cadeia: true })], {}, {});
    const b = nucleo([estadio(), arredonda(2, outra, { cadeia: true })], {}, {});
    conferir(b, 'estádio pela outra reta');
    expect(b.V.size).toBe(a.V.size);
    expect(b.F.size).toBe(a.F.size);
    expect(volume(b)).toBeCloseTo(volume(a), 15);
  });

  it('um cilindro de 24 lados: a rim de cima é um laço fechado de facetas de 15°', () => {
    const cilindro: Passo = ['extrusao', { origemId: 1, altura: mm(10), perfil: { circulo: { raio: mm(20), centro: [0, 0] } }, segmentosArco: 6 }];
    const n0c = nucleo([cilindro], {}, {});
    const laco = lacoDaTampa(n0c, mm(10));
    expect(laco.length).toBeGreaterThanOrEqual(3);
    const sel = aresta([0, 1, 0], { eixo: 'x', lado: 'max' }, { min: [mm(15), -mm(0.5), -mm(0.0001)], max: [mm(21), mm(10.5), mm(10)] });
    const passos: Passo[] = [cilindro, arredonda(2, sel, { cadeia: true, raio: mm(4) })];
    const n = nucleo(passos, {}, {});
    conferir(n, 'cilindro');
    expect(faixaDe(passos, 2)).toHaveLength(laco.length * PAINEIS);
    expect(desvioDoRaio(n, faixaDe(passos, 2), eixosDaCadeia(laco, mm(4), true), mm(4))).toBeLessThan(TOLERANCIA_DO_RAIO);
  });
});

describe('o aro de um furo e as pontas que não são de 90°', () => {
  const furoOblongo = (cu: number, cv: number) => ({
    contorno: {
      inicio: [mm(cu + 4), mm(cv)],
      trechos: [
        { reto: [mm(cu + 4), mm(cv - 4)] }, { arcoTangente: [mm(cu - 4), mm(cv - 4)] },
        { reto: [mm(cu - 4), mm(cv + 4)] }, { arcoTangente: [mm(cu + 4), mm(cv + 4)] },
      ],
    },
  });
  /* a aba de parede: 80 por 60 mm, 6 mm em z, dois furos oblongos de 8 por 16 mm; a tampa da frente fica em z = 6 mm, e no perfil
     de uma extrusão em z o v vai para -y */
  const abaDeParede: Passo = ['extrusao', {
    origemId: 1, eixo: 'z', altura: mm(6), segmentosArco: 16,
    perfil: { retangulo: { largura: mm(80), profundidade: mm(60), centro: [0, mm(-30)] } },
    furos: [furoOblongo(-24, -36), furoOblongo(24, -36)],
  }];
  const NORMAL_Z = [0, 0, 1];
  /* a parede reta do furo da direita, de x = 28, entre y = 36 e y = 40 */
  const paredeDoFuro = { regiao: { min: [mm(27), mm(35.9), -mm(0.5)], max: [mm(29), mm(40.1), mm(6.5)] }, onde: { alvo: 'aresta', normal: { dir: NORMAL_Z, ate: 5 }, extremo: { eixo: 'x', lado: 'max' } } };

  it.each([1, 3, 4.5])('o aro do furo oblongo (laço fechado côncavo) arredonda com %s mm, inclusive acima do raio de 4 mm do furo', (rmm) => {
    const r = mm(rmm);
    const n0 = nucleo([abaDeParede], {}, {});
    const aro = lacoDaTampa(n0, mm(6), { eixo: 2, semente: [mm(28), mm(38), mm(6)] });
    expect(aro.length).toBeGreaterThanOrEqual(3);
    const passos: Passo[] = [abaDeParede, arredonda(2, paredeDoFuro, { cadeia: true, raio: r })];
    const n = nucleo(passos, {}, {});
    conferir(n, `furo oblongo ${rmm} mm`);
    const faixa = faixaDe(passos, 2);
    expect(faixa).toHaveLength(aro.length * PAINEIS);
    expect(faixa.every((f: any) => f.vs.length === 4)).toBe(true);
    expect(desvioDoRaio(n, faixa, eixosDaCadeia(aro, r, true, NORMAL_Z), r)).toBeLessThan(TOLERANCIA_DO_RAIO);
    const esperado = volumeRetirado(aro, r, PAINEIS, true, NORMAL_Z);
    expect(Math.abs((volume(n0) - volume(n)) - esperado) / esperado).toBeLessThan(TOLERANCIA_DO_VOLUME);
  });

  it('o raio que passa da espessura da chapa recusa o aro do furo', () => {
    const n = nucleo([abaDeParede, arredonda(2, paredeDoFuro, { cadeia: true, raio: mm(6) })], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/a parede da aresta .* tem altura 0\.006/);
  });

  /* o segmento circular: a corda reta e o arco de 20 mm de raio, que se encontram em cantos vivos que não são de 90° */
  const segmento = (graus: number): { passo: Passo; pts: (n: any) => V3[] } => {
    const R = 20, a = (graus / 2) * Math.PI / 180;
    const x = R * Math.sin(a), sag = R - R * Math.cos(a);
    const passo: Passo = ['extrusao', {
      origemId: 1, altura: mm(10), segmentosArco: 16,
      perfil: { contorno: { inicio: [mm(-x), 0], trechos: [{ reto: [mm(x), 0] }, { arco: { por: [0, mm(sag)], ate: [mm(-x), 0] } }] } },
    }];
    return { passo, pts: (n) => trecho(lacoDaTampa(n, mm(10)), [mm(x), 0], [mm(-x), 0], [0, mm(sag)]) };
  };
  const todoOArco = { regiao: { min: [-0.1, -0.1, -0.1], max: [0.1, 0.1, 0.1] }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'x', lado: 'max' } } };

  it.each([[100, 1], [160, 3]])('o arco de um segmento de %i° termina nos cantos da corda, que não são de 90°: com %i mm o anel escorrega até a parede da corda e a peça fecha', (graus, rmm) => {
    const { passo, pts } = segmento(graus);
    const n0 = nucleo([passo], {}, {});
    const arco = pts(n0);
    const passos: Passo[] = [passo, arredonda(2, todoOArco, { cadeia: true, raio: mm(rmm) })];
    const n = nucleo(passos, {}, {});
    conferir(n, `segmento ${graus}°`);
    const faixa = faixaDe(passos, 2);
    expect(faixa).toHaveLength((arco.length - 1) * PAINEIS);
    expect(desvioDoRaio(n, faixa, eixosDaCadeia(arco, mm(rmm), false), mm(rmm))).toBeLessThan(TOLERANCIA_DO_RAIO);
    /* a faixa não passa da parede da corda (z = 0) */
    for (const f of faixa) for (const p of pontosDe(n, f)) expect(p[2]).toBeGreaterThanOrEqual(-1e-12);
  });

  it('o canto agudo da ponta que o raio não comporta é recusado dizendo que a ponta é aguda demais', () => {
    const { passo } = segmento(60);
    const n = nucleo([passo, arredonda(2, todoOArco, { cadeia: true, raio: mm(2) })], {}, {});
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/o raio não cabe: a faceta .* some antes de o arredondamento terminar.*canto vivo da ponta é agudo demais/);
  });
});
