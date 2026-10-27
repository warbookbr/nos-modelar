/* friso-aba.test.mjs — a aba que dobra a borda livre de um vão (fatia 25, item 6 do plano da carroceria por subdivisão).
   A chapa de referência dobra uns 90 graus para dentro na borda do vão da janela, em poucos milímetros de raio, e forma uma
   aba em que o vidro assenta. O `friso` com perfil declarado à mão não faz essa aba: o perfil precisa ter uma parte acima
   da linha, e a parte de v negativo não pode passar da espessura da chapa, de modo que uma perna de 20 mm é recusada. A
   opção `aba` do friso desenha o perfil em L a partir da espessura da chapa, do raio, do ângulo e da largura declarados, e
   acha sozinha de que lado da borda fica a chapa.

   O gate é a chapa curva de `fixtures/aba-prova.js`, montada por `gaiolaPorEstacoes` com o vão 'janela': a aba de 20 mm a
   90 graus, de raio 2 mm, acompanha a borda do vão a menos de 0,5 mm, tem o ângulo e o raio declarados, nasce na parede da
   borda da chapa, fecha sólida no `conferir-malha` e sai igual em duas execuções. O contato declarado, que leva alguns
   segundos, é medido em `friso-contato.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { ErroDoFriso, cadeiaRefinada, ladoDaBorda, perfilDaAba } from './friso.js';
import { ajustarGaiolaAsMedidas, subdividirCatmullClark } from './subdivisao.js';
import { neutroCanonico, nucleo } from './entrada.js';
import { cruzamentos, triangulos, volume } from './fixtures/medidas-de-malha.js';
import * as prova from './fixtures/aba-prova.js';
import { analisarTopologia } from './topologia.js';

/* O que o motor de micropolígono recusaria: casca aberta, não-manifold, orientação incoerente e triângulo de área nula. */
const RECUSA_DE_SAIDA = ['malha-aberta', 'nao-manifold', 'orientacao-incoerente', 'canto-repetido', 'area-nula', 'triangulo-degenerado'];
const recusasDeSaida = (malha) => analisarTopologia(malha, { triangulacao: true }).achados.filter((a) => RECUSA_DE_SAIDA.includes(a.codigo)).map((a) => a.mensagem);
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return a.map((c) => c / l); };
const dist = (a, b) => Math.hypot(...sub(a, b));
const graus = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * 180) / Math.PI;
const grito = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('não gritou'); };
const topologia = (m) => analisarTopologia(m);

/* As faces e os vértices de uma parte do neutro, por índice local, na ordem dos ids. */
function malhaDaParte(neutro, parte) {
  const faces = [...neutro.F.values()].filter((f) => f.parte === parte);
  const ids = [...new Set(faces.flatMap((f) => f.vs))].sort((a, b) => a - b);
  const indice = new Map(ids.map((id, k) => [id, k]));
  return { ids, vertices: ids.map((id) => neutro.V.get(id)), faces: faces.map((f) => f.vs.map((v) => indice.get(v))), idsDasFaces: faces.map((f) => f.id) };
}

/* Distância de um ponto ao segmento [a, b]. */
function distanciaAoSegmento(p, a, b) {
  const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)));
  return dist(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]);
}

/* Centro e raio do círculo por mínimos quadrados (Kåsa) de pontos num plano, em 3D. */
function ajustarCirculo(pontos) {
  const e1 = unit(sub(pontos[1], pontos[0]));
  const e3 = unit(cruz(e1, sub(pontos[2], pontos[0])));
  const e2 = cruz(e3, e1);
  const q = pontos.map((p) => [dot(sub(p, pontos[0]), e1), dot(sub(p, pontos[0]), e2)]);
  /* x² + y² = 2 a x + 2 b y + c, nas incógnitas (a, b, c) */
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; const B = [0, 0, 0];
  for (const [x, y] of q) { const l = [x, y, 1]; const r = x * x + y * y; for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += l[i] * l[j]; B[i] += l[i] * r; } }
  /* o sistema normal dos mínimos quadrados: A (2a, 2b, c) = B */
  const S = A.map((linha, i) => [...linha, B[i]]);
  for (let c = 0; c < 3; c++) {
    let m = c; for (let r = c + 1; r < 3; r++) if (Math.abs(S[r][c]) > Math.abs(S[m][c])) m = r;
    [S[c], S[m]] = [S[m], S[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = S[r][c] / S[c][c]; for (let k = c; k < 4; k++) S[r][k] -= f * S[c][k]; }
  }
  const [a2, b2, cc] = S.map((l, i) => l[3] / l[i]);
  const a = a2 / 2, b = b2 / 2;
  const centro = [0, 1, 2].map((k) => pontos[0][k] + a * e1[k] + b * e2[k]);
  return { centro, raio: Math.sqrt(cc + a * a + b * b) };
}

describe('perfilDaAba', () => {
  const t = 0.002;
  it('o L de 90 graus: a face de fora e a de dentro começam na borda, giram no mesmo centro e a perna tem a largura declarada', () => {
    const p = perfilDaAba({ espessura: t, raio: 0.002, largura: 0.02, angulo: 90 });
    /* quatro segmentos por quarto de volta: cinco pontos em cada arco, os dois extremos da perna e os cinco de dentro */
    expect(p).toHaveLength(12);
    expect(p[0]).toEqual([0, 0]);
    expect(p[11][0]).toBeCloseTo(0, 15);
    expect(p[11][1]).toBeCloseTo(-t, 15);
    /* o centro das duas faces da dobra é (0, -4 mm); a perna desce 20 mm do fim do arco */
    for (let k = 0; k <= 4; k++) { expect(Math.hypot(p[k][0], p[k][1] + 0.004)).toBeCloseTo(0.004, 14); expect(Math.hypot(p[11 - k][0], p[11 - k][1] + 0.004)).toBeCloseTo(0.002, 14); }
    expect(p[4][0]).toBeCloseTo(0.004, 14);
    expect(p[4][1]).toBeCloseTo(-0.004, 14);
    expect(p[5][0]).toBeCloseTo(p[4][0], 15);
    expect(p[5][1]).toBeCloseTo(p[4][1] - 0.02, 15);
    expect(p[6][0]).toBeCloseTo(0.002, 14);
    expect(p[6][1]).toBeCloseTo(-0.024, 14);
    expect(Math.min(...p.map((q) => q[0]))).toBeGreaterThanOrEqual(0);
  });

  it('o ângulo escolhe o giro do arco e a direção da perna, e o número de segmentos acompanha o ângulo', () => {
    const p45 = perfilDaAba({ espessura: t, raio: 0.003, largura: 0.01, angulo: 45 });
    expect(p45).toHaveLength(2 * 2 + 4);
    /* a perna sai a 45 graus da vertical: o fim do arco de fora e o da perna diferem em (cos 45, -sin 45) × 10 mm */
    const fim = p45[2]; const ponta = p45[3];
    expect(ponta[0] - fim[0]).toBeCloseTo(0.01 * Math.SQRT1_2, 14);
    expect(ponta[1] - fim[1]).toBeCloseTo(-0.01 * Math.SQRT1_2, 14);
    expect(perfilDaAba({ espessura: t, raio: 0.002, largura: 0.01, angulo: 90, segmentosPorQuarto: 8 })).toHaveLength(2 * 8 + 4);
    expect(perfilDaAba({ espessura: t, raio: 0.002, largura: 0.01, angulo: 100, segmentosPorQuarto: 4 })).toHaveLength(2 * 5 + 4);
  });

  it('grita com o motivo no valor inválido e na aba que volta por baixo da chapa', () => {
    const base = { espessura: t, raio: 0.002, largura: 0.02, angulo: 90 };
    const motivo = (extra) => grito(() => perfilDaAba({ ...base, ...extra })).motivo;
    expect(grito(() => perfilDaAba({ ...base, raio: 0 }))).toBeInstanceOf(ErroDoFriso);
    expect(motivo({ raio: 0 })).toBe('o raio da dobra precisa ser maior que zero, e veio 0');
    expect(motivo({ largura: -1 })).toBe('a largura da aba precisa ser maior que zero, e veio -1');
    expect(motivo({ angulo: 180 })).toBe('o ângulo da aba precisa ficar entre 0 e 180 graus, e veio 180');
    expect(motivo({ angulo: 0 })).toMatch(/entre 0 e 180/);
    expect(motivo({ espessura: 0 })).toBe('a espessura da chapa precisa ser maior que zero, e veio 0');
    expect(motivo({ angulo: 150, largura: 0.02 })).toMatch(/^a aba de 150 graus com perna de 0\.02 passa 0\.0\d* por baixo da chapa/);
    /* com perna curta ela não passa */
    expect(perfilDaAba({ ...base, angulo: 150, largura: 0.001 }).length).toBeGreaterThan(0);
  });
});

describe('ladoDaBorda', () => {
  /* duas faces anti-horárias vistas de cima, lado a lado: (0 1 4 3) e (1 2 5 4) numa grade 3 × 2 */
  const faces = [[0, 1, 4, 3], [1, 2, 5, 4]];
  it('dá o lado livre pelo sentido em que a face percorre a aresta, em qualquer sentido da cadeia', () => {
    expect(ladoDaBorda(faces, [0, 1, 2])).toBe(-1);
    expect(ladoDaBorda(faces, [2, 1, 0])).toBe(1);
    expect(ladoDaBorda(faces, [3, 4, 5])).toBe(1);
  });
  it('grita com o índice do trecho que não é borda livre e no que troca de lado', () => {
    const interna = grito(() => ladoDaBorda(faces, [0, 1, 4]));
    expect(interna).toBeInstanceOf(ErroDoFriso);
    expect(interna.indice).toBe(1);
    expect(interna.motivo).toBe('este trecho da linha não é borda livre da chapa: 2 faces o têm');
    expect(grito(() => ladoDaBorda(faces, [0, 5])).motivo).toMatch(/nenhuma face o tem/);
    /* duas faces que só se tocam num vértice e se percorrem em sentidos opostos: a linha passa de uma à outra */
    const troca = grito(() => ladoDaBorda([[0, 1, 2, 3], [2, 6, 5, 4]], [0, 1, 2, 4]));
    expect(troca.indice).toBe(2);
    expect(troca.motivo).toBe('a chapa passa de um lado da linha ao outro neste trecho');
  });
});

describe('gate: a aba na borda do vão da chapa curva', () => {
  const { pontos, gaiola, passos } = prova.passos();
  const neutro = nucleo(passos, pontos);
  const aba = malhaDaParte(neutro, 'aba');
  const chapa = malhaDaParte(neutro, 'chapa');
  const ro = 0.002 + prova.ESPESSURA; const ri = 0.002;
  const POR_ESTACAO = 12;
  const ESTACOES = 32;
  const QUINAS = [0, 8, 16, 24];

  /* a borda do vão na superfície limite: a gaiola ajustada às medidas, subdividida até o nível 4 e levada ao limite */
  const nomes = gaiola.passo.vertices; const indice = new Map(nomes.map((n, k) => [n, k]));
  const faces = gaiola.passo.faces.map((f) => f.map((n) => indice.get(n)));
  const gaiolaIdx = { vertices: nomes.map((n) => pontos[n]), faces, cantos: gaiola.passo.cantos.map((n) => indice.get(n)), borda: 'cantos' };
  const ajustada = ajustarGaiolaAsMedidas(gaiolaIdx, nomes.map((_, k) => k)).vertices;
  const densa = subdividirCatmullClark({ ...gaiolaIdx, vertices: ajustada, niveis: 4, aoLimite: true });
  const facesDoVertice = new Map();
  densa.faces.forEach((f) => f.forEach((v) => { if (!facesDoVertice.has(v)) facesDoVertice.set(v, []); facesDoVertice.get(v).push(f); }));
  const normalLimite = (v) => unit(facesDoVertice.get(v).reduce((n, f) => { const m = cruz(sub(densa.vertices[f[2]], densa.vertices[f[0]]), sub(densa.vertices[f[3]], densa.vertices[f[1]])); return [n[0] + m[0], n[1] + m[1], n[2] + m[2]]; }, [0, 0, 0]));
  const borda = gaiola.bordaDoVao('janela').map((n) => indice.get(n));
  const cadeiaLimite = cadeiaRefinada(faces, nomes.length, 4, borda).cadeia;
  const linhaLimite = cadeiaLimite.map((v) => ({ p: densa.vertices[v], n: normalLimite(v) }));
  /* a estação j da aba é o anel de 12 vértices j; o ponto da linha da borda no nível 2 é o da cadeia limite a cada 4 */
  const anel = (j) => aba.vertices.slice(POR_ESTACAO * j, POR_ESTACAO * (j + 1));
  const naBorda = (j) => anel(j).reduce((m, q) => (dist(q, linhaLimite[4 * j].p) < dist(m, linhaLimite[4 * j].p) ? q : m));

  it('sai sem grito, com 32 estações de 12 vértices em volta do vão, e a borda do vão pelo nome é a volta de oito pontos', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(gaiola.bordaDoVao('janela')).toEqual(['e3_c3', 'e3_c4', 'e3_c5', 'e4_c5', 'e5_c5', 'e5_c4', 'e5_c3', 'e4_c3', 'e3_c3']);
    expect(aba.vertices).toHaveLength(ESTACOES * POR_ESTACAO);
    expect(linhaLimite).toHaveLength(16 * 8 + 1);
  });

  it('a borda da aba acompanha a borda do vão na superfície limite a menos de 0,5 mm', () => {
    const junta = Array.from({ length: ESTACOES }, (_, j) => naBorda(j));
    let pior = 0;
    for (const { p } of linhaLimite) {
      let d = Infinity;
      for (let j = 0; j < ESTACOES; j++) d = Math.min(d, distanciaAoSegmento(p, junta[j], junta[(j + 1) % ESTACOES]));
      pior = Math.max(pior, d);
    }
    expect(pior).toBeLessThan(0.0005);
  });

  it('a dobra tem o raio e o ângulo declarados: cada anel gira 90 graus em torno do centro, com 2 mm por dentro e 4 mm por fora', () => {
    let maiorErroDeRaio = 0; let maiorErroDeAngulo = 0; let maiorInclinacao = 0; let menorPerna = Infinity; let maiorPerna = 0; let menorDescida = Infinity;
    for (let j = 0; j < ESTACOES; j++) {
      /* nas quatro quinas do vão o anel fica no plano bissetor e se estica pela esquadria; a dobra só é circular fora delas */
      if (QUINAS.includes(j)) continue;
      const q = anel(j); const inicio = naBorda(j);
      /* o perfil sai da borda nos dois sentidos conforme a área dele: o anel começa no ponto de fora ou no de dentro */
      const ordem = q[0] === inicio ? q : [...q].reverse();
      const fora = ordem.slice(0, 5); const dentro = ordem.slice(7).reverse();
      const cf = ajustarCirculo(fora); const cd = ajustarCirculo(dentro);
      maiorErroDeRaio = Math.max(maiorErroDeRaio, Math.abs(cf.raio - ro), Math.abs(cd.raio - ri), dist(cf.centro, cd.centro));
      maiorErroDeAngulo = Math.max(maiorErroDeAngulo, Math.abs(graus(sub(fora[0], cf.centro), sub(fora[4], cf.centro)) - 90), Math.abs(graus(sub(dentro[0], cd.centro), sub(dentro[4], cd.centro)) - 90));
      /* a perna: reta e de 20 mm depois do fim da dobra, perpendicular ao raio do fim */
      const perna = dist(fora[4], ordem[5]);
      menorPerna = Math.min(menorPerna, perna); maiorPerna = Math.max(maiorPerna, perna);
      /* a perna desce 24 mm da face de fora contra a normal da chapa: para dentro */
      menorDescida = Math.min(menorDescida, -dot(sub(ordem[5], inicio), linhaLimite[4 * j].n));
      /* o raio do início da dobra tem a direção da normal da chapa (a dobra nasce tangente a ela) */
      maiorInclinacao = Math.max(maiorInclinacao, graus(sub(fora[0], cf.centro), linhaLimite[4 * j].n));
    }
    expect(maiorErroDeRaio).toBeLessThan(2e-6);
    expect(maiorErroDeAngulo).toBeLessThan(0.02);
    expect(menorPerna).toBeCloseTo(0.02, 4);
    expect(maiorPerna).toBeCloseTo(0.02, 4);
    expect(maiorInclinacao).toBeLessThan(1);
    expect(menorDescida).toBeGreaterThan(0.0235);
  });

  it('nasce na parede da borda da chapa: dos 64 vértices do anel inicial, os 32 de fora coincidem com os da chapa e os de dentro ficam a menos de 0,1 mm', () => {
    const doAnel = aba.vertices.map((q) => Math.min(...chapa.vertices.map((p) => dist(p, q)))).filter((d) => d < 0.0004);
    expect(doAnel).toHaveLength(2 * ESTACOES);
    expect(doAnel.filter((d) => d < 1e-9)).toHaveLength(ESTACOES);
    expect(Math.max(...doAnel)).toBeLessThan(0.0001);
  });

  it('fecha sólida: a chapa e a aba passam no conferir-malha cada uma, a seção da aba tem a área do perfil declarado, e a peça só acusa as duas ilhas', () => {
    expect(topologia(aba).achados).toEqual([]);
    expect(topologia(chapa).achados).toEqual([]);
    expect(topologia(aba).resumo).toMatchObject({ componentes: 1, bordas: 0, reprovas: 0 });
    const todo = topologia({ vertices: neutro.V, faces: neutro.F });
    expect(todo.achados.map((a) => a.codigo)).toEqual(['ilhas']);
    expect(todo.resumo.componentes).toBe(2);
    expect(recusasDeSaida({ vertices: neutro.V, faces: neutro.F })).toEqual([]);
    expect(cruzamentos(aba.vertices, aba.faces, 0.01)).toEqual([]);
    /* a seção da aba numa estação reta (a do meio de um lado do vão) tem a área do perfil declarado, a 0,1%, e o sólido tem volume positivo */
    const perfil = perfilDaAba({ espessura: prova.ESPESSURA, raio: prova.ABA.raio, largura: prova.ABA.largura, angulo: prova.ABA.angulo, segmentosPorQuarto: 4 });
    let A = 0;
    for (let k = 0; k < perfil.length; k++) { const [u0, v0] = perfil[k]; const [u1, v1] = perfil[(k + 1) % perfil.length]; A += (u0 * v1 - u1 * v0) / 2; }
    const secao = anel(4); const soma = [0, 0, 0];
    secao.forEach((q, k) => { const r = secao[(k + 1) % secao.length]; const c = cruz(q, r); soma[0] += c[0]; soma[1] += c[1]; soma[2] += c[2]; });
    expect(Math.abs((Math.hypot(...soma) / 2) / Math.abs(A) - 1)).toBeLessThan(0.001);
    expect(volume(aba.vertices, aba.faces)).toBeGreaterThan(0);
  });

  it('é bit a bit: duas execuções dão a mesma malha, e a aba não muda a malha da chapa', () => {
    const outra = nucleo(prova.passos().passos, pontos);
    expect(JSON.stringify(neutroCanonico(outra))).toBe(JSON.stringify(neutroCanonico(neutro)));
    const so = nucleo(passos.slice(0, 1), pontos);
    for (const [id, p] of so.V) expect(neutro.V.get(id)).toEqual(p);
    for (const [id, f] of so.F) expect(neutro.F.get(id).vs).toEqual(f.vs);
  });
});

/* As normais que a cena da bancada dá a cada canto de face da malha, achadas pela ordem em que as faces foram trianguladas. */
function normaisDaCena(neutro) {
  const { raiz } = adaptarThree(neutro);
  const porCanto = new Map();
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.getAttribute('position'); const n = o.geometry.getAttribute('normal');
    let i = 0;
    for (const id of o.userData.faces) {
      const vs = neutro.F.get(id).vs;
      for (let fim = i + 3 * (vs.length - 2); i < fim; i += 1) {
        const q = [p.getX(i), p.getY(i), p.getZ(i)];
        const v = vs.reduce((melhor, w) => { const c = neutro.V.get(w); const d = Math.hypot(c[0] - q[0], c[1] - q[1], c[2] - q[2]); return d < melhor.d ? { w, d } : melhor; }, { w: null, d: Infinity }).w;
        porCanto.set(`${id}:${v}`, [n.getX(i), n.getY(i), n.getZ(i)]);
      }
    }
  });
  return porCanto;
}

function normalDaFace(V, vs) {
  const n = [0, 0, 0];
  for (let k = 0; k < vs.length; k++) { const a = V.get(vs[k]), b = V.get(vs[(k + 1) % vs.length]); n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  return unit(n);
}

describe('gate: a sombra da aba respeita a dobra', () => {
  const { pontos, passos } = prova.passos();
  const neutro = nucleo(passos, pontos);
  const arestas = new Map();
  for (const f of neutro.F.values()) {
    if (f.parte !== 'aba') continue;
    const n = normalDaFace(neutro.V, f.vs);
    f.vs.forEach((a, k) => {
      const b = f.vs[(k + 1) % f.vs.length]; const c = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!arestas.has(c)) arestas.set(c, { a, b, faces: [], normais: [] });
      arestas.get(c).faces.push(f.id); arestas.get(c).normais.push(n);
    });
  }
  const internas = [...arestas.values()].filter((e) => e.faces.length === 2).map((e) => ({ ...e, diedro: graus(e.normais[0], e.normais[1]) }));
  const divisao = (cena, e) => Math.max(...[e.a, e.b].map((v) => graus(cena.get(`${e.faces[0]}:${v}`), cena.get(`${e.faces[1]}:${v}`))));

  it('as faces saem lisas a 30 graus: a aresta viva (a ponta, a parede e o canto da perna, de 40 a 101 graus) divide a normal por inteiro e a dobra de 22,5 graus por segmento não divide', () => {
    expect([...neutro.F.values()].filter((f) => f.parte === 'aba').every((f) => f.liso === 30)).toBe(true);
    expect([...neutro.F.values()].filter((f) => f.parte === 'chapa').every((f) => f.liso === 30)).toBe(true);
    const cena = normaisDaCena(neutro);
    /* as quatro quinas vivas de 90 graus do vão: as arestas com uma ponta a menos de 6 mm de uma delas */
    const naQuina = (e) => [e.a, e.b].some((v) => { const [x, , z] = neutro.V.get(v); return [0.3, 0.5].some((qx) => [0.3, 0.5].some((qz) => Math.hypot(x - qx, z - qz) < 0.006)); });
    const vivas = internas.filter((e) => e.diedro > 30); const lisas = internas.filter((e) => e.diedro <= 30 && !naQuina(e));
    expect(vivas.length).toBeGreaterThan(0);
    expect(lisas.length).toBeGreaterThan(0);
    const menorDaViva = Math.min(...vivas.map((e) => divisao(cena, e) / e.diedro));
    const maiorDaLisa = Math.max(...lisas.map((e) => divisao(cena, e)));
    expect(lisas.filter((e) => e.diedro > 20).length).toBeGreaterThan(100);
    expect(menorDaViva).toBeGreaterThan(0.99);
    expect(maiorDaLisa).toBeLessThan(0.001);
    /* nas quinas de 90 graus do vão, quatro faces de 22,5 graus de cada lado ficam a 31 graus umas das outras, no limiar de 30,
       e a sombra do arco se divide por até 13,2 graus: é o preço das quinas vivas; num vão de quina arredondada não ocorre */
    const nasQuinas = internas.filter((e) => e.diedro <= 30 && naQuina(e));
    expect(nasQuinas.length).toBeGreaterThan(0);
    expect(Math.max(...nasQuinas.map((e) => divisao(cena, e)))).toBeLessThan(14);
  });

  it('sem a marca lisa a mesma malha divide a normal em toda aresta, e a dobra vira facetas: a marca é o que suaviza o arco', () => {
    const faces = [...neutro.F.values()].filter((f) => f.parte === 'aba');
    const salvo = faces.map((f) => f.liso);
    for (const f of faces) f.liso = false;
    try {
      const cena = normaisDaCena(neutro);
      const arco = internas.filter((e) => e.diedro > 20 && e.diedro <= 30);
      expect(arco.length).toBeGreaterThan(0);
      expect(Math.min(...arco.map((e) => divisao(cena, e) / e.diedro))).toBeGreaterThan(0.99);
    } finally { faces.forEach((f, k) => { f.liso = salvo[k]; }); }
  });
});

describe('o friso com perfil em L feito à mão não faz a aba', () => {
  const { pontos, gaiola, passos } = prova.passos();
  const bordaDoVao = gaiola.bordaDoVao('janela');
  const motivo = (perfil) => nucleo([passos[0], ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'abaDaJanela', pontos: bordaDoVao }, perfil }]], pontos).orfaos[0].motivo;
  /* o L de 20 mm a 90 graus com o canto vivo, em metro, com a chapa em u negativo e o vão em u positivo */
  const L = [[0, 0], [0.002, 0], [0.002, -0.02], [0, -0.02]];

  it('o perfil que começa na linha não tem parte acima dela, e o que sobe um pouco atravessaria a face de dentro: a perna de 20 mm é recusada nos dois casos', () => {
    expect(motivo(L)).toBe('o perfil fica todo abaixo da linha (v de -0.02 a 0); o friso sai pela normal, com v > 0');
    expect(motivo(L.map(([u, v]) => [u, v + 1e-5]))).toBe('o perfil entra 0.01999 na chapa, e a espessura é 0.002: ele atravessaria a face de dentro; suba o perfil para entrar menos que a espessura');
  });
});

describe('passo friso com aba: gritos com o nome', () => {
  const orfao = (extra, { espessura } = {}) => {
    const p = prova.passos({ extra, espessura });
    return nucleo(p.passos, p.pontos).orfaos.map((o) => o.motivo)[0];
  };

  it('pede aba e perfil um só, os três campos, a superfície com espessura e a borda livre', () => {
    expect(orfao({ perfil: { circulo: { raio: 0.003 } } })).toBe('aba e perfil se excluem: a aba desenha o próprio perfil em L; declare só um dos dois');
    expect(orfao({ aba: { largura: 0.02, angulo: 90 } })).toMatch(/^a aba precisa de raio, como aba: \{ largura: 0\.02, angulo: 90, raio: 0\.003 \}/);
    expect(orfao({ aba: { largura: 0.02, angulo: 90, raio: 0.002, folga: 1 } })).toBe("a aba tem campo desconhecido 'folga'; os campos são largura, angulo e raio");
    expect(orfao({ aba: 5 })).toMatch(/^aba precisa ser a medida da dobra/);
    /* sem espessura a chapa é só a pele e a aba sai pele (friso-aba-pele.test.mjs), com os mesmos gritos de medida */
    expect(orfao({}, { espessura: null })).toBeUndefined();
    expect(orfao({ aba: { largura: 0.02, angulo: 90, raio: 0 } }, { espessura: null })).toBe('o raio da dobra precisa ser maior que zero, e veio 0');
    expect(orfao({ aba: { largura: 0.02, angulo: 150, raio: 0.002 } }, { espessura: null })).toMatch(/^a aba de 150 graus com perna de 0\.02 passa 0\.0\d* por baixo da chapa/);
    expect(orfao({ aba: { largura: 0.02, angulo: 90, raio: 0 } })).toBe('o raio da dobra precisa ser maior que zero, e veio 0');
    expect(orfao({ aba: { largura: 0.02, angulo: 200, raio: 0.002 } })).toBe('o ângulo da aba precisa ficar entre 0 e 180 graus, e veio 200');
    expect(orfao({ aba: { largura: 0.02, angulo: 150, raio: 0.002 } })).toMatch(/^a aba de 150 graus com perna de 0\.02 passa 0\.0\d* por baixo da chapa/);
  });

  it('a linha que passa por aresta com duas faces grita com o ponto, e a polilinha não tem aba', () => {
    const interior = orfao({ linha: { nome: 'abaDaJanela', pontos: ['e1_c1', 'e1_c2', 'e1_c3'] } });
    expect(interior).toBe("a aba segue a borda livre da chapa, e na linha 'abaDaJanela', perto de 'e1_c1': este trecho da linha não é borda livre da chapa: 2 faces o têm; cite os pontos da borda de um vão ou do contorno (bordaDoVao dá a de um vão)");
    const polilinha = nucleo([['friso', { origemId: 2, linha: { nome: 'l', pontos: [[0, 0, 0], [1, 0, 0]] }, normal: [0, 1, 0], aba: prova.ABA }]]).orfaos[0].motivo;
    expect(polilinha).toBe("a aba dobra a borda da chapa: cite a superfície por superficie: { op: 'subdivisao', id } e a borda de um vão pelos nomes da gaiola");
  });
});

describe('a aba segue o lado da chapa e a espessura, qualquer que seja o sentido da linha e o lado do material', () => {
  const caixa = (neutro) => {
    const vs = [...new Set([...neutro.F.values()].filter((f) => f.parte === 'aba').flatMap((f) => f.vs))].map((id) => neutro.V.get(id));
    return [0, 1, 2].map((e) => [Math.min(...vs.map((q) => q[e])), Math.max(...vs.map((q) => q[e]))]);
  };
  const executa = (alterar) => { const p = prova.passos(); alterar(p); return nucleo(p.passos, p.pontos); };

  it('a linha no sentido contrário dá a mesma aba, que cai dentro do vão', () => {
    const a = executa(() => {}); const b = executa((p) => { p.passos[1][1].linha = { nome: 'abaDaJanela', pontos: [...p.passos[1][1].linha.pontos].reverse() }; });
    expect(b.orfaos).toEqual([]);
    const ca = caixa(a); const cb = caixa(b);
    for (let e = 0; e < 3; e++) { expect(cb[e][0]).toBeCloseTo(ca[e][0], 9); expect(cb[e][1]).toBeCloseTo(ca[e][1], 9); }
    /* a dobra de 4 mm entra no vão (de 300 a 500 mm) e fica dentro dele */
    expect(ca[0][0]).toBeGreaterThan(0.3 - 1e-9); expect(ca[0][1]).toBeLessThan(0.5 + 1e-9);
    expect(ca[2][0]).toBeGreaterThan(0.3 - 1e-9); expect(ca[2][1]).toBeLessThan(0.5 + 1e-9);
  });

  it('com o material do lado da normal declarada, as faces saem ao contrário e a aba cai na mesma forma', () => {
    const a = executa(() => {});
    const b = executa((p) => {
      /* faces no sentido contrário (normal para baixo), com o material a favor dela: o mesmo sólido */
      p.passos[0][1].faces = p.passos[0][1].faces.map((f) => [...f].reverse());
      p.passos[0][1].lado = 'normal';
    });
    expect(b.orfaos).toEqual([]);
    const ca = caixa(a); const cb = caixa(b);
    for (let e = 0; e < 3; e++) { expect(cb[e][0]).toBeCloseTo(ca[e][0], 6); expect(cb[e][1]).toBeCloseTo(ca[e][1], 6); }
  });
});

describe('a aba na simetria em x e na borda aberta', () => {
  /* uma meia chapa de 5 × 5 pontos a cada 100 mm (x >= 0) com um vão que cruza o plano x = 0: o vão tira as faces das
     colunas 0 e 1 entre as estações 1 e 3 e fica sem os pontos (0, 2) e (1, 2) */
  const nome = (i, j) => `c${i}_${j}`;
  const pontos = {}; const vertices = []; const faces = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    if ((i === 0 || i === 1) && j === 2) continue;
    const x = 0.1 * i, z = 0.1 * j; pontos[nome(i, j)] = [x, 0.2 - (x * x) / 1.2 - ((z - 0.2) ** 2) / 1.8, z]; vertices.push(nome(i, j));
  }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (!(i < 2 && (j === 1 || j === 2))) faces.push([nome(i, j), nome(i, j + 1), nome(i + 1, j + 1), nome(i + 1, j)]);
  const chapa = ['subdivisao', { origemId: 1, vertices, faces, simetria: 'x', medidas: [...vertices], espessura: 0.002, niveis: 2 }];
  const aba = (pts, extra = {}) => ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'borda', pontos: pts }, aba: prova.ABA, ...extra }];
  const executa = (pts, extra) => { const n = nucleo([chapa, aba(pts, extra), ['parte', { nome: 'aba', sel: { origem: { op: 'friso', id: 2 } } }]], pontos); expect(n.orfaos).toEqual([]); return malhaDaParte(n, 'aba'); };
  const espelhado = (m) => m.vertices.every(([x, y, z]) => m.vertices.some((q) => Math.hypot(q[0] + x, q[1] - y, q[2] - z) < 1e-9));

  it('a borda do vão que toca o plano nas duas pontas vira uma volta só, fechada e simétrica', () => {
    const m = executa([nome(0, 1), nome(1, 1), nome(2, 1), nome(2, 2), nome(2, 3), nome(1, 3), nome(0, 3)]);
    expect(topologia(m).achados).toEqual([]);
    expect(topologia(m).resumo.componentes).toBe(1);
    expect(espelhado(m)).toBe(true);
    expect(volume(m.vertices, m.faces)).toBeGreaterThan(0);
    expect(Math.min(...m.vertices.map((q) => q[0]))).toBeLessThan(-0.19);
    expect(executa([nome(0, 3), nome(1, 3), nome(2, 3), nome(2, 2), nome(2, 1), nome(1, 1), nome(0, 1)]).vertices.length).toBe(m.vertices.length);
  });

  it('a borda do contorno, aberta, ganha tampas nas pontas e fecha sólida, com a aba para fora do contorno', () => {
    const m = executa([nome(0, 4), nome(1, 4), nome(2, 4), nome(3, 4), nome(4, 4)]);
    expect(topologia(m).achados).toEqual([]);
    expect(volume(m.vertices, m.faces)).toBeGreaterThan(0);
    /* a chapa acaba em z = 0,4 e a aba sai dela até 4 mm além (a dobra de 4 mm de raio, inclinada pela curvatura da chapa);
       perto das pontas, a borda arredondada do canto da chapa muda a direção da linha e o recorte fica no meio */
    const zs = m.vertices.filter((q) => Math.abs(q[0]) < 0.25).map((q) => q[2]);
    expect(Math.max(...zs)).toBeGreaterThan(0.4 + 0.0035);
    expect(Math.max(...zs)).toBeLessThan(0.4 + 0.0041);
  });
});
