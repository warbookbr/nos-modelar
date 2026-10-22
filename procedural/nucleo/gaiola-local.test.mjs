/* gaiola-local.test.mjs — a gaiola por estações adensada só num trecho (fatia 12 do plano de carroceria por subdivisão):
   a região com estações parciais e colunas extras, ligada ao resto por pentágonos; a coluna que termina ou começa na
   borda antes da última estação; o eixo por curva nomeada, aberta ou fechada em anel em volta de um vão; e a borda
   enrolada desenhada por código, que sai sem face dobrada, sem auto-interseção e com os vértices novos só em volta da
   região. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { definicaoLisa, definicaoLocal, definicaoInteira, enrolamento, RAIO } from './fixtures/borda-enrolada.js';
import { subdividirCatmullClark } from './subdivisao.js';
import { enderecosPorIndice } from './operacoes/subdivisao.js';
import { nucleo } from './entrada.js';
import { sha256Hex } from './sha256.js';
import { cruzamentos } from './fixtures/medidas-de-malha.js';

const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const cruz = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const unit = (u) => { const l = Math.hypot(u[0], u[1], u[2]); return [u[0] / l, u[1] / l, u[2] / l]; };
const graus = (u, v) => Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * 180 / Math.PI;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const newell = (P) => {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  return unit(n);
};
/* O maior ângulo entre a normal de um canto da face e a normal dela, sem os cantos quase rasos (seno abaixo de 0,05),
   em que a normal do canto não tem direção: num polígono sem dobra fica bem abaixo de 90 graus. */
const dobraDoCanto = (P) => {
  const N = newell(P); let maior = 0;
  for (let k = 0; k < P.length; k++) {
    const a = sub(P[(k + 1) % P.length], P[k]), b = sub(P[(k - 1 + P.length) % P.length], P[k]);
    const c = cruz(a, b); const s = Math.hypot(...c) / (Math.hypot(...a) * Math.hypot(...b));
    if (s >= 0.05) maior = Math.max(maior, graus(unit(c), N));
  }
  return maior;
};
/* Faces vizinhas pela aresta, e o maior ângulo entre as normais de duas vizinhas. */
const arestasDe = (faces) => {
  const m = new Map();
  faces.forEach((f, i) => f.forEach((a, j) => { const b = f[(j + 1) % f.length]; const c = a < b ? `${a}|${b}` : `${b}|${a}`; if (!m.has(c)) m.set(c, []); m.get(c).push(i); }));
  return m;
};
const quebraEntreVizinhas = (V, F) => {
  const N = F.map((f) => newell(f.map((i) => V[i]))); let maior = 0;
  for (const fs of arestasDe(F).values()) if (fs.length === 2) maior = Math.max(maior, graus(N[fs[0]], N[fs[1]]));
  return maior;
};
const lados = (faces) => { const r = {}; for (const f of faces) r[f.length] = (r[f.length] ?? 0) + 1; return r; };
const grito = (definicao) => { try { gaiolaPorEstacoes(definicao); } catch (e) { return e.message; } throw new Error('não gritou'); };
const col = (nome, u, v, extra) => ({ nome, em: [u, v], ...extra });
const est = (nome, z, colunas, extra) => ({ nome, em: z, colunas: colunas.map(([n, y, e]) => col(n, 1, y, e)), ...extra });
const ABCD = [['a', 0], ['b', 1], ['c', 2], ['d', 3]];
const malha = (g, niveis = 2) => {
  const k = new Map(g.passo.vertices.map((n, i) => [n, i]));
  return subdividirCatmullClark({ vertices: g.passo.vertices.map((n) => g.pontos[n]), faces: g.passo.faces.map((f) => f.map((n) => k.get(n))), niveis });
};

describe('região adensada só num trecho', () => {
  const regiao = { nome: 'r', estacoes: ['e0', 'e1'], colunas: ['b', null] };

  it('a estação parcial cobre só a faixa de colunas e a face de fora fecha um pentágono na coluna da borda', () => {
    const g = gaiolaPorEstacoes({ eixo: 'z', regioes: [regiao], estacoes: [est('e0', 0, ABCD), est('m', 0.5, ABCD.slice(1), { regiao: 'r' }), est('e1', 1, ABCD)] });
    expect(g.passo.faces).toEqual([
      ['e0_b', 'e0_c', 'm_c', 'm_b'], ['e0_c', 'e0_d', 'm_d', 'm_c'],
      ['e0_a', 'e0_b', 'm_b', 'e1_b', 'e1_a'], ['m_b', 'm_c', 'e1_c', 'e1_b'], ['m_c', 'm_d', 'e1_d', 'e1_c'],
    ]);
    expect(g.regioes).toEqual({ r: ['m_b', 'm_c', 'm_d'] });
    for (const f of g.passo.faces) expect(newell(f.map((n) => g.pontos[n]))[0]).toBeGreaterThan(0.99);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 1 }]], g.pontos);
    expect(neutro.orfaos).toEqual([]);
  });

  it('as estações parciais em escada adensam o trecho, e as colunas extras da região começam e terminam dentro dele', () => {
    const cinco = [...ABCD, ['e', 4]];
    const g = gaiolaPorEstacoes({
      eixo: 'z', regioes: [{ nome: 'r', estacoes: ['e0', 'e1'], colunas: ['a', 'e'] }],
      estacoes: [
        est('e0', 0, cinco),
        est('m1', 0.3, cinco, { regiao: 'r' }),
        est('m2', 0.5, [['b', 1], ['bc', 1.5], ['c', 2], ['d', 3]], { regiao: 'r' }),
        est('e1', 1, cinco),
      ],
    });
    expect(lados(g.passo.faces)).toEqual({ 4: 6, 5: 4 });
    expect(g.regioes.r).toEqual(['m1_a', 'm1_b', 'm1_c', 'm1_d', 'm1_e', 'm2_b', 'm2_bc', 'm2_c', 'm2_d']);
    expect(g.passo.faces).toContainEqual(['m1_a', 'm1_b', 'm2_b', 'e1_b', 'e1_a']);
    expect(g.passo.faces).toContainEqual(['m2_b', 'm2_bc', 'm2_c', 'e1_c', 'e1_b']);
    expect(enderecosPorIndice(g.passo)).toEqual([]);
  });

  it('o vão encostado na região tira também o pentágono que a estação parcial deixou na borda dele', () => {
    const cinco = [...ABCD, ['e', 4]];
    const g = gaiolaPorEstacoes({
      eixo: 'z', regioes: [{ nome: 'r', estacoes: ['e0', 'e1'], colunas: [null, 'c'] }],
      estacoes: [est('e0', 0, cinco), est('m', 0.5, cinco.slice(0, 3), { regiao: 'r' }), est('e1', 1, cinco)],
      vaos: [{ nome: 'janela', estacoes: ['e0', 'e1'], colunas: ['c', 'd'] }],
    });
    expect(g.passo.faces).toEqual([
      ['e0_a', 'e0_b', 'm_b', 'm_a'], ['e0_b', 'e0_c', 'm_c', 'm_b'],
      ['m_a', 'm_b', 'e1_b', 'e1_a'], ['m_b', 'm_c', 'e1_c', 'e1_b'], ['e0_d', 'e0_e', 'e1_e', 'e1_d'],
    ]);
  });

  it('duas estações parciais que tocam a mesma coluna de borda entre duas inteiras gritam pela face de seis lados', () => {
    expect(grito({ eixo: 'z', regioes: [regiao], estacoes: [est('e0', 0, ABCD), est('m', 0.3, ABCD.slice(1), { regiao: 'r' }), est('n', 0.6, ABCD.slice(1), { regiao: 'r' }), est('e1', 1, ABCD)] }))
      .toBe("gaiola por estações: transição impossível entre as estações 'n' e 'e1': a face ['e0_a', 'e0_b', 'm_b', 'n_b', 'e1_b', 'e1_a'] tem 6 lados; funda, divida, comece ou termine uma coluna por vez entre colunas que seguem, para a transição dar triângulo ou pentágono; numa região, só uma estação parcial por vez toca cada coluna de borda, e as seguintes ficam mais estreitas");
  });

  it('grita com os nomes a região que não fecha', () => {
    const base = (extra) => ({ eixo: 'z', regioes: [regiao], estacoes: [est('e0', 0, ABCD), est('m', 0.5, ABCD.slice(1), { regiao: 'r' }), est('e1', 1, ABCD)], ...extra });
    expect(grito(base({ estacoes: [est('e0', 0, ABCD), est('m', 0.5, ABCD, { regiao: 'r' }), est('e1', 1, ABCD)] })))
      .toBe("gaiola por estações: a estação 'm' da região 'r' vai da coluna 'a' à 'd', fora da faixa de colunas de 'b' à borda da região");
    expect(grito(base({ regioes: [{ ...regiao, estacoes: ['m', 'e1'] }] }))).toBe("gaiola por estações: a região 'r' vai até a estação 'm', que é parcial; as pontas da faixa de uma região são estações inteiras");
    expect(grito({ eixo: 'z', regioes: [{ ...regiao, estacoes: ['e1', 'e2'] }], estacoes: [est('e0', 0, ABCD), est('m', 0.5, ABCD.slice(1), { regiao: 'r' }), est('e1', 1, ABCD), est('e2', 2, ABCD)] }))
      .toBe("gaiola por estações: a estação 'm' é da região 'r', mas fica fora das estações 'e1' a 'e2' dela");
    expect(grito(base({ estacoes: [est('e0', 0, ABCD), est('m', 0.5, ABCD.slice(1), { regiao: 'q' }), est('e1', 1, ABCD)] }))).toBe("gaiola por estações: a estação 'm' cita a região 'q', que não existe");
    expect(grito({ eixo: 'z', regioes: [regiao], estacoes: [est('e0', 0, ABCD), est('e1', 1, ABCD)] })).toMatch(/a região 'r' não tem estação nem coluna/);
    expect(grito({ eixo: 'z', regioes: [{ nome: 'r', estacoes: ['e0', 'e1'], colunas: ['b', 'd'] }], estacoes: [est('e0', 0, ABCD), est('e1', 1, [['a', 0], ['x', 0.5, { regiao: 'r' }], ['b', 1], ['c', 2], ['d', 3]]), est('e2', 2, ABCD)] }))
      .toBe("gaiola por estações: a coluna 'x' da estação 'e1' é da região 'r', mas fica fora da faixa de colunas de 'b' a 'd' dela");
  });
});

describe('coluna que termina ou começa na borda antes da última estação', () => {
  const tampa = () => ({
    eixo: 'z', vincos: [{ nome: 'beiral', coluna: 'c', nitidez: 0.5 }],
    estacoes: [est('e0', 0, ABCD), est('e1', 1, [['a', 0], ['b', 1], ['c', 2, { termina: true }], ['d', 3, { termina: true }]]), est('e2', 2, ABCD.slice(0, 2)), est('e3', 3, ABCD.slice(0, 2))],
  });

  it('termina: a chapa daquele lado acaba na estação, e a aresta até a vizinha vira borda livre', () => {
    const g = gaiolaPorEstacoes(tampa());
    expect(g.passo.faces).toEqual([
      ['e0_a', 'e0_b', 'e1_b', 'e1_a'], ['e0_b', 'e0_c', 'e1_c', 'e1_b'], ['e0_c', 'e0_d', 'e1_d', 'e1_c'],
      ['e1_a', 'e1_b', 'e2_b', 'e2_a'], ['e2_a', 'e2_b', 'e3_b', 'e3_a'],
    ]);
    const arestas = arestasDe(g.passo.faces);
    for (const c of ['e1_b|e1_c', 'e1_c|e1_d', 'e1_b|e2_b']) expect(arestas.get(c)).toHaveLength(1);
    expect(g.passo.vincos).toEqual([{ nome: 'beiral', pontos: ['e0_c', 'e1_c'], nitidez: 0.5 }]);
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 2 }]], g.pontos);
    expect(neutro.orfaos).toEqual([]);
  });

  it('comeca: a coluna nova nasce na borda, e a face dela só aparece depois da estação em que nasce', () => {
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes: [est('e0', 0, ABCD.slice(0, 2)), est('e1', 1, [['a', 0], ['b', 1], ['c', 2, { comeca: true }], ['d', 3, { comeca: true }]]), est('e2', 2, ABCD)] });
    expect(g.passo.faces).toEqual([['e0_a', 'e0_b', 'e1_b', 'e1_a'], ['e1_a', 'e1_b', 'e2_b', 'e2_a'], ['e1_b', 'e1_c', 'e2_c', 'e2_b'], ['e1_c', 'e1_d', 'e2_d', 'e2_c']]);
  });

  it('grita sem a declaração, com a coluna que termina e volta a ligar, e com comeca sobre coluna aberta', () => {
    const sem = tampa(); sem.estacoes[1] = est('e1', 1, ABCD);
    expect(grito(sem)).toBe("gaiola por estações: transição impossível entre as estações 'e1' e 'e2': a última coluna de uma, 'd', precisa se ligar à última da outra, 'b'; declare de: ['d'] na coluna 'b', ou termina: true na coluna 'c' da estação 'e1' se ela termina ali");
    const volta = tampa(); volta.estacoes[2] = est('e2', 2, ABCD);
    expect(grito(volta)).toBe("gaiola por estações: a coluna 'c' termina na estação 'e1', mas a coluna 'c' da estação 'e2' se liga a ela");
    expect(grito({ eixo: 'z', estacoes: [est('e0', 0, ABCD), est('e1', 1, [...ABCD.slice(0, 3), ['d', 3, { comeca: true }]])] }))
      .toBe("gaiola por estações: a coluna 'd' da estação 'e1' declara comeca, mas a coluna 'd' já está aberta desde a estação 'e0'");
  });
});

describe('eixo por curva nomeada', () => {
  /* Um retângulo de cantos arredondados no plano x = 0,6, de 0,6 por 0,4 m com raio 6 cm, girando no sentido
     anti-horário visto de +x, com um ponto no meio de cada lado reto. */
  const Y0 = 0.5, Z0 = 1, HZ = 0.3, HY = 0.2, RC = 0.06;
  const contorno = (() => {
    const P = []; const cantos = [[HZ - RC, HY - RC, 0], [-(HZ - RC), HY - RC, 90], [-(HZ - RC), -(HY - RC), 180], [HZ - RC, -(HY - RC), 270]];
    const meios = [[0, HY], [-HZ, 0], [0, -HY], [HZ, 0]];
    cantos.forEach(([cx, cy, a0], i) => {
      for (let j = 0; j <= 3; j++) { const a = (a0 + 30 * j) * Math.PI / 180; P.push([cx + RC * Math.cos(a), cy + RC * Math.sin(a)]); }
      P.push(meios[i]);
    });
    return P.map(([X, Y]) => [0.6, Y0 + Y, Z0 - X]);
  })();
  const fracoes = (() => { const acum = [0]; for (let i = 0; i < contorno.length; i++) acum.push(acum[i] + Math.hypot(...sub(contorno[(i + 1) % contorno.length], contorno[i]))); return acum.slice(0, -1).map((s) => s / acum[acum.length - 1]); })();
  const anel = (extra) => ({
    eixo: { curva: 'vidro', pontos: contorno, normal: [1, 0, 0], fechada: true },
    estacoes: fracoes.map((t, i) => ({ nome: `s${String(i).padStart(2, '0')}`, em: t, colunas: [col('aro', 0, 0), col('friso', 0.012, 0.006), col('fora', 0.04, 0)] })),
    vincos: [{ nome: 'friso', coluna: 'friso', nitidez: 0.8 }],
    ...extra,
  });

  it('o anel fechado em volta do vão liga a última estação à primeira, com a normal declarada e u para fora', () => {
    const g = gaiolaPorEstacoes(anel());
    const n = contorno.length;
    expect(g.passo.vertices).toHaveLength(3 * n);
    expect(g.passo.faces).toHaveLength(2 * n);
    expect(g.passo.faces.slice(-2)).toEqual([['s19_aro', 's19_friso', 's00_friso', 's00_aro'], ['s19_friso', 's19_fora', 's00_fora', 's00_friso']]);
    const arestas = arestasDe(g.passo.faces);
    expect(g.passo.vertices.length - arestas.size + g.passo.faces.length).toBe(0);
    expect([...arestas.values()].filter((fs) => fs.length === 1)).toHaveLength(2 * n);
    // a face do friso sobe 6 mm em 12 mm (26,6 graus da normal declarada), e as outras ficam mais perto dela
    for (const f of g.passo.faces) expect(newell(f.map((p) => g.pontos[p]))[0]).toBeGreaterThan(0.85);
    // no meio do lado de cima a tangente é +z, u = T × V = +y para fora do vão e v = +x
    expect(dist(g.pontos.s04_fora, [0.6, Y0 + HY + 0.04, Z0])).toBeLessThan(1e-12);
    expect(dist(g.pontos.s04_friso, [0.606, Y0 + HY + 0.012, Z0])).toBeLessThan(1e-12);
    expect(g.passo.vincos[0].pontos).toHaveLength(n + 1);
    expect(g.passo.vincos[0].pontos.at(-1)).toBe('s00_friso');
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 2 }]], g.pontos);
    expect(neutro.orfaos).toEqual([]);
    const m = malha(g);
    expect(cruzamentos(m.vertices, m.faces, 0.01)).toEqual([]);
    expect(Math.min(...m.vertices.map((p) => p[0]))).toBeGreaterThan(0.6 - 1e-12);
    expect(enderecosPorIndice(g.passo)).toEqual([]);
  });

  it('a curva aberta pode ir e voltar no espaço, porque a ordem é a fração do comprimento', () => {
    const g = gaiolaPorEstacoes({
      eixo: { curva: 'gancho', pontos: [[0, 0, 0], [0, 0, 1], [0.3, 0, 1], [0.3, 0, 0]], normal: [0, 1, 0] },
      estacoes: [0, 0.25, 0.5, 0.75, 1].map((t, i) => ({ nome: `g${i}`, em: t, colunas: [col('dentro', -0.05, 0), col('fora', 0.05, 0)] })),
    });
    // em 0,5 o ponto é o meio do trecho de cima, a tangente é +x e u = +x × +y = +z
    expect(dist(g.pontos.g2_fora, [0.15, 0, 1.05])).toBeLessThan(1e-12);
    expect(g.pontos.g0_fora[2]).toBeCloseTo(0, 12);
    expect(g.pontos.g4_fora[2]).toBeCloseTo(0, 12);
    for (const f of g.passo.faces) expect(newell(f.map((p) => g.pontos[p]))[1]).toBeGreaterThan(0.99);
  });

  it('grita com os nomes a curva que não serve', () => {
    expect(grito(anel({ estacoes: [...anel().estacoes.slice(0, -1), { ...anel().estacoes.at(-1), em: 1 }] })))
      .toBe("gaiola por estações: a estação 's19' precisa de em: fração do comprimento da curva 'vidro', de 0 a menos de 1, porque a curva é fechada");
    expect(grito({ eixo: { curva: 'reta', pontos: [[0, 0, 0], [1, 0, 0]], normal: [2, 0, 0] }, estacoes: [0, 1].map((t, i) => ({ nome: `r${i}`, em: t, colunas: [col('a', 0, 0), col('b', 1, 0)] })) }))
      .toBe("gaiola por estações: na estação 'r0' a tangente da curva 'reta' é paralela à normal declarada");
    expect(grito({ eixo: { curva: 'reta', pontos: [[0, 0, 0], [0, 0, 0], [1, 0, 0]], normal: [0, 1, 0] }, estacoes: [] })).toBe("gaiola por estações: a curva 'reta' repete o ponto: o 1º e o 2º são iguais");
    expect(grito({ eixo: { curva: 'reta', pontos: [[0, 0, 0], [1, 0, 0]] }, estacoes: [] })).toMatch(/a curva 'reta' precisa de normal/);
  });
});

/* A borda enrolada: a mesma chapa sem a borda, com a borda numa região e com a borda em estações inteiras, todas em
   nível 2. Os vértices novos são os da saída que não estão, a 1e-9 m, na saída da chapa lisa. */
describe('gate da gaiola local: a borda enrolada desenhada por código', () => {
  const lisa = gaiolaPorEstacoes(definicaoLisa());
  const local = gaiolaPorEstacoes(definicaoLocal());
  const inteira = gaiolaPorEstacoes(definicaoInteira());
  const mLisa = malha(lisa), mLocal = malha(local), mInteira = malha(inteira);
  const chaveDe = (p) => p.map((x) => Math.round(x * 1e9)).join(',');
  const daLisa = new Set(mLisa.vertices.map(chaveDe));
  const novos = (m) => m.vertices.filter((p) => !daLisa.has(chaveDe(p)));
  /* A caixa das faces da gaiola que a região mudou e das vizinhas delas, que é até onde a subdivisão leva a mudança. */
  const caixa = (() => {
    const deLisa = new Set(lisa.passo.faces.map((f) => [...f].sort().join()));
    const mudadas = local.passo.faces.filter((f) => !deLisa.has([...f].sort().join()));
    const tocados = new Set(mudadas.flat());
    const perto = local.passo.faces.filter((f) => f.some((p) => tocados.has(p))).flat().map((p) => local.pontos[p]);
    return [0, 1, 2].map((e) => [Math.min(...perto.map((p) => p[e])), Math.max(...perto.map((p) => p[e]))]);
  })();
  const naCaixa = (p) => p.every((x, e) => x >= caixa[e][0] - 1e-12 && x <= caixa[e][1] + 1e-12);

  it('os pontos extras da gaiola são só os da região, e a transição é de pentágonos', () => {
    expect(lisa.passo.vertices).toHaveLength(55);
    expect(local.passo.vertices).toHaveLength(117);
    expect(inteira.passo.vertices).toHaveLength(129);
    expect(local.regioes.moldura).toHaveLength(62);
    expect(local.passo.vertices.filter((p) => !lisa.pontos[p])).toEqual(local.regioes.moldura);
    for (const p of local.regioes.moldura) { const [, y, z] = local.pontos[p]; expect(z >= 0.3 && z <= 0.7 && y >= 0.3).toBe(true); }
    expect(lados(local.passo.faces)).toEqual({ 4: 82, 5: 8 });
    expect(enderecosPorIndice(local.passo)).toEqual([]);
    expect(nucleo([['subdivisao', { origemId: 1, ...local.passo, niveis: 2 }]], local.pontos).orfaos).toEqual([]);
  });

  it('sai sem face dobrada e sem auto-interseção, e a medida acusa a gaiola dobrada', () => {
    expect(Math.max(...local.passo.faces.map((f) => dobraDoCanto(f.map((p) => local.pontos[p]))))).toBeLessThan(45);
    expect(quebraEntreVizinhas(mLocal.vertices, mLocal.faces)).toBeLessThan(30);
    expect(Math.max(...mLocal.faces.map((f) => dobraDoCanto(f.map((i) => mLocal.vertices[i]))))).toBeLessThan(30);
    expect(cruzamentos(mLocal.vertices, mLocal.faces, 0.004)).toEqual([]);
    // a aba fica atrás da chapa, a duas vezes o raio, no meio do trecho
    const [h4] = enrolamento(0.5).slice(3);
    expect(local.pontos.e05_e[0] - h4[0]).toBeCloseTo(2 * RAIO * Math.cos(Math.atan(0.1)), 9);
    // a coluna d8 posta acima da borda dobra a gaiola: a mesma medida passa de 90 graus e acha cruzamentos
    const def = definicaoLocal();
    for (const e of def.estacoes) for (const c of e.colunas) if (c.nome === 'd8') c.em = [c.em[0], 0.405];
    const dobrada = gaiolaPorEstacoes(def); const m = malha(dobrada);
    expect(quebraEntreVizinhas(m.vertices, m.faces)).toBeGreaterThan(90);
    expect(cruzamentos(m.vertices, m.faces, 0.004).length).toBeGreaterThan(0);
    // e a volta de 1,35 π, que leva a aba através da chapa, também cruza
    const passou = malha(gaiolaPorEstacoes(definicaoLocal(1.35 * Math.PI)));
    expect(cruzamentos(passou.vertices, passou.faces, 0.004).length).toBeGreaterThan(0);
  });

  it('os vértices novos ficam só em volta da região, e o resto da chapa sai igual', () => {
    expect(mLisa.vertices).toHaveLength(697);
    expect(mLocal.vertices).toHaveLength(1561);
    expect(mInteira.vertices).toHaveLength(1745);
    const nLocal = novos(mLocal), nInteira = novos(mInteira);
    expect(nLocal).toHaveLength(1095);
    expect(nLocal.every(naCaixa)).toBe(true);
    const doLocal = new Set(mLocal.vertices.map(chaveDe));
    const foraDaCaixa = mLisa.vertices.filter((p) => !naCaixa(p));
    expect(foraDaCaixa.length).toBeGreaterThan(300);
    expect(foraDaCaixa.every((p) => doLocal.has(chaveDe(p)))).toBe(true);
    // com as estações do meio do passo inteiras, a mudança atravessa a chapa toda
    expect(nInteira.filter((p) => !naCaixa(p)).length).toBeGreaterThan(100);
  });

  it('a saída do ajudante para a borda enrolada está congelada', () => {
    expect(sha256Hex(JSON.stringify([local.pontos, local.passo]))).toBe('4ade4c7a4c4dcd463977f46b0d6f4ab1b2d552d459ff7b50ae41b944e5a1f3dc');
  });
});
