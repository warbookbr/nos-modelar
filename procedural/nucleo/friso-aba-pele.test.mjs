/* friso-aba-pele.test.mjs — a aba numa chapa sem espessura (fatia 3 do plano da gaiola que segue as feições).
   O pacote cego entrega só a pele externa da carroceria, e a opção `aba` exigia espessura na chapa. Sem espessura a aba
   sai como pele: uma superfície aberta que continua a borda do vão, dobra num arco de raio `raio` (o da própria pele) que gira
   `angulo` graus e segue em perna reta de `largura`, sem tampas e sem espessura própria.

   O gate é a chapa curva de `fixtures/aba-prova.js` sem espessura, montada por `gaiolaPorEstacoes` com o vão 'janela': a
   aba de 20 mm a 90 graus de raio 2 mm acompanha a borda do vão a menos de 0,5 mm, tem o raio e o ângulo declarados, é
   contínua com a borda da chapa (os vértices da primeira fileira coincidem com os da borda e as arestas se percorrem em
   sentidos opostos), não tem face dobrada e sai igual em duas execuções. */
import { describe, expect, it } from 'vitest';
import { ErroDoFriso, cadeiaRefinada, perfilDaPeleDaAba } from './friso.js';
import { ajustarGaiolaAsMedidas, subdividirCatmullClark } from './subdivisao.js';
import { neutroCanonico, nucleo } from './entrada.js';
import * as prova from './fixtures/aba-prova.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return a.map((c) => c / l); };
const dist = (a, b) => Math.hypot(...sub(a, b));
const graus = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * 180) / Math.PI;
const grito = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('não gritou'); };

function newell(pontos) {
  const n = [0, 0, 0];
  for (let k = 0; k < pontos.length; k++) {
    const a = pontos[k], b = pontos[(k + 1) % pontos.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return unit(n);
}

/* Centro e raio do círculo por mínimos quadrados (Kåsa) de pontos num plano, em 3D. */
function ajustarCirculo(pontos) {
  const e1 = unit(sub(pontos[1], pontos[0]));
  const e3 = unit(cruz(e1, sub(pontos[2], pontos[0])));
  const e2 = cruz(e3, e1);
  const q = pontos.map((p) => [dot(sub(p, pontos[0]), e1), dot(sub(p, pontos[0]), e2)]);
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; const B = [0, 0, 0];
  for (const [x, y] of q) { const l = [x, y, 1]; const r = x * x + y * y; for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += l[i] * l[j]; B[i] += l[i] * r; } }
  const S = A.map((linha, i) => [...linha, B[i]]);
  for (let c = 0; c < 3; c++) {
    let m = c; for (let r = c + 1; r < 3; r++) if (Math.abs(S[r][c]) > Math.abs(S[m][c])) m = r;
    [S[c], S[m]] = [S[m], S[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = S[r][c] / S[c][c]; for (let k = c; k < 4; k++) S[r][k] -= f * S[c][k]; }
  }
  const [a2, b2, cc] = S.map((l, i) => l[3] / l[i]);
  const a = a2 / 2, b = b2 / 2;
  return { centro: [0, 1, 2].map((k) => pontos[0][k] + a * e1[k] + b * e2[k]), raio: Math.sqrt(cc + a * a + b * b) };
}

function distanciaAoSegmento(p, a, b) {
  const ab = sub(b, a); const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)));
  return dist(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]);
}

describe('perfilDaPeleDaAba', () => {
  it('o arco de raio declarado com centro em (0, -raio), e a perna reta de largura declarada na direção em que o arco acabou', () => {
    const p = perfilDaPeleDaAba({ raio: 0.002, largura: 0.02, angulo: 90 });
    expect(p).toHaveLength(5 + 1);
    expect(p[0]).toEqual([0, 0]);
    for (const q of p.slice(0, 5)) expect(Math.hypot(q[0], q[1] + 0.002)).toBeCloseTo(0.002, 14);
    expect(p[4][0]).toBeCloseTo(0.002, 14);
    expect(p[4][1]).toBeCloseTo(-0.002, 14);
    expect(p[5][0]).toBeCloseTo(0.002, 14);
    expect(p[5][1]).toBeCloseTo(-0.022, 14);
    expect(perfilDaPeleDaAba({ raio: 0.003, largura: 0.01, angulo: 45 })).toHaveLength(2 + 1 + 1);
  });

  it('grita com o motivo no valor inválido e na aba que volta por baixo da chapa', () => {
    const base = { raio: 0.002, largura: 0.02, angulo: 90 };
    const motivo = (extra) => grito(() => perfilDaPeleDaAba({ ...base, ...extra })).motivo;
    expect(grito(() => perfilDaPeleDaAba({ ...base, raio: 0 }))).toBeInstanceOf(ErroDoFriso);
    expect(motivo({ raio: 0 })).toBe('o raio da dobra precisa ser maior que zero, e veio 0');
    expect(motivo({ largura: -1 })).toBe('a largura da aba precisa ser maior que zero, e veio -1');
    expect(motivo({ angulo: 180 })).toBe('o ângulo da aba precisa ficar entre 0 e 180 graus, e veio 180');
    expect(motivo({ angulo: 150 })).toMatch(/^a aba de 150 graus com perna de 0\.02 passa 0\.0\d* por baixo da chapa/);
  });
});

describe('gate: a aba em pele na borda do vão da chapa sem espessura', () => {
  const { pontos, gaiola, passos } = prova.passos({ espessura: null });
  const neutro = nucleo(passos, pontos);
  const faceDe = (parte) => [...neutro.F.values()].filter((f) => f.parte === parte);
  const aba = faceDe('aba'); const chapa = faceDe('chapa');
  const posicao = (id) => neutro.V.get(id);
  const chave = (p) => p.map((x) => Math.round(x * 1e9)).join(',');
  const POR_ESTACAO = 6; const ESTACOES = 32; const QUINAS = [0, 8, 16, 24];

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
  /* a estação j da aba é o anel de 6 vértices j: cinco do arco e a ponta da perna */
  const idsDaAba = [...new Set(aba.flatMap((f) => f.vs))].sort((a, b) => a - b);
  const anel = (j) => idsDaAba.slice(POR_ESTACAO * j, POR_ESTACAO * (j + 1)).map(posicao);
  const naBorda = (j) => anel(j).reduce((m, q) => (dist(q, linhaLimite[4 * j].p) < dist(m, linhaLimite[4 * j].p) ? q : m));

  it('sai sem grito e sem espessura: 32 estações de 6 vértices e 5 quadriláteros cada, uma pele aberta sem tampas', () => {
    expect(neutro.orfaos).toEqual([]);
    expect(idsDaAba).toHaveLength(ESTACOES * POR_ESTACAO);
    expect(aba).toHaveLength(ESTACOES * (POR_ESTACAO - 1));
    expect(aba.every((f) => f.vs.length === 4)).toBe(true);
    expect(aba.every((f) => f.liso === 30)).toBe(true);
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

  it('a dobra tem o raio e o ângulo declarados: cada anel gira 90 graus em torno do centro a 2 mm, com perna reta de 20 mm', () => {
    let erroDeRaio = 0; let erroDeAngulo = 0; let menorPerna = Infinity; let maiorPerna = 0; let menorDescida = Infinity;
    for (let j = 0; j < ESTACOES; j++) {
      /* nas quatro quinas do vão o anel fica no plano bissetor e se estica pela esquadria; a dobra só é circular fora delas */
      if (QUINAS.includes(j)) continue;
      const q = anel(j); const inicio = naBorda(j);
      const ordem = q[0] === inicio ? q : [...q].reverse();
      const arco = ordem.slice(0, 5);
      const c = ajustarCirculo(arco);
      erroDeRaio = Math.max(erroDeRaio, Math.abs(c.raio - prova.ABA.raio));
      erroDeAngulo = Math.max(erroDeAngulo, Math.abs(graus(sub(arco[0], c.centro), sub(arco[4], c.centro)) - 90));
      const perna = dist(arco[4], ordem[5]);
      menorPerna = Math.min(menorPerna, perna); maiorPerna = Math.max(maiorPerna, perna);
      menorDescida = Math.min(menorDescida, -dot(sub(ordem[5], inicio), linhaLimite[4 * j].n));
    }
    expect(erroDeRaio).toBeLessThan(2e-6);
    expect(erroDeAngulo).toBeLessThan(0.02);
    expect(menorPerna).toBeCloseTo(0.02, 4);
    expect(maiorPerna).toBeCloseTo(0.02, 4);
    /* a perna desce os 20 mm dela mais o raio de 2 mm do arco, contra a normal da chapa: para dentro */
    expect(menorDescida).toBeGreaterThan(0.0215);
  });

  it('é contínua com a borda: a primeira fileira coincide com os vértices da borda da chapa e as arestas se percorrem em sentidos opostos', () => {
    const dirigidas = new Set();
    for (const f of chapa) f.vs.forEach((a, k) => dirigidas.add(`${a}>${f.vs[(k + 1) % f.vs.length]}`));
    /* a borda livre da chapa no vão é a aresta que só uma face tem, dentro da caixa do vão */
    const noVao = [...dirigidas].filter((c) => {
      const [a, b] = c.split('>').map(Number);
      return !dirigidas.has(`${b}>${a}`) && [a, b].every((v) => { const q = posicao(v); return q[0] > 0.29 && q[0] < 0.51 && q[2] > 0.29 && q[2] < 0.51; });
    });
    expect(noVao).toHaveLength(ESTACOES);
    const daAba = new Set();
    for (const f of aba) f.vs.forEach((a, k) => daAba.add(`${chave(posicao(a))}>${chave(posicao(f.vs[(k + 1) % f.vs.length]))}`));
    const semPar = noVao.filter((c) => { const [a, b] = c.split('>').map((x) => chave(posicao(Number(x)))); return !daAba.has(`${b}>${a}`); });
    expect(semPar).toEqual([]);
  });

  it('não tem face dobrada: nenhuma aresta é percorrida duas vezes no mesmo sentido, o diedro entre faces vizinhas fica abaixo de 25 graus fora das quinas vivas do vão e de 91 nelas e a pele sai da borda pela mesma normal da chapa', () => {
    const porAresta = new Map();
    for (const f of [...chapa, ...aba]) {
      const normal = newell(f.vs.map(posicao));
      f.vs.forEach((a, k) => {
        const b = f.vs[(k + 1) % f.vs.length]; const ka = chave(posicao(a)), kb = chave(posicao(b));
        const c = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (!porAresta.has(c)) porAresta.set(c, []);
        porAresta.get(c).push({ sentido: ka < kb ? 1 : -1, normal, parte: f.parte, ponto: posicao(a) });
      });
    }
    let mesmoSentido = 0; let maiorDiedro = 0; let maiorForaDasQuinas = 0; let duplas = 0; let costura = 0; let menorCostura = 1; let maisDeDuas = 0;
    for (const l of porAresta.values()) {
      if (l.length > 2) maisDeDuas++;
      if (l.length !== 2) continue;
      duplas++;
      if (l[0].sentido === l[1].sentido) mesmoSentido++;
      const diedro = graus(l[0].normal, l[1].normal);
      maiorDiedro = Math.max(maiorDiedro, diedro);
      /* as quinas vivas do vão: a menos de 12 mm de uma das quatro (x e z em 0,3 ou 0,5 m) */
      const [x, , z] = l[0].ponto;
      if (![0.3, 0.5].some((qx) => [0.3, 0.5].some((qz) => Math.hypot(x - qx, z - qz) < 0.012))) maiorForaDasQuinas = Math.max(maiorForaDasQuinas, diedro);
      if (l[0].parte !== l[1].parte) { costura++; menorCostura = Math.min(menorCostura, dot(l[0].normal, l[1].normal)); }
    }
    expect(maisDeDuas).toBe(0);
    expect(duplas).toBeGreaterThan(1000);
    expect(costura).toBe(ESTACOES);
    expect(mesmoSentido).toBe(0);
    /* fora das quinas a dobra gira 22,5 graus por segmento e a chapa quase nada; nas quatro quinas vivas do vão, que são de 90
       graus, a pele esquadreja e o diedro chega a esses 90 graus, nunca a mais (uma face dobrada para trás passaria de 150) */
    expect(maiorForaDasQuinas).toBeLessThan(25);
    expect(maiorDiedro).toBeLessThan(91);
    expect(menorCostura).toBeGreaterThan(Math.cos((45 * Math.PI) / 180));
  });

  it('é bit a bit: duas execuções dão a mesma malha, e a aba não muda a malha da chapa', () => {
    const outra = nucleo(prova.passos({ espessura: null }).passos, pontos);
    expect(JSON.stringify(neutroCanonico(outra))).toBe(JSON.stringify(neutroCanonico(neutro)));
    const so = nucleo(passos.slice(0, 1), pontos);
    for (const [id, p] of so.V) expect(neutro.V.get(id)).toEqual(p);
    for (const [id, f] of so.F) expect(neutro.F.get(id).vs).toEqual(f.vs);
  });

  it('a linha no sentido contrário dá a mesma pele, dentro do vão', () => {
    const p = prova.passos({ espessura: null });
    p.passos[1][1].linha = { nome: 'abaDaJanela', pontos: [...p.passos[1][1].linha.pontos].reverse() };
    const b = nucleo(p.passos, p.pontos);
    expect(b.orfaos).toEqual([]);
    const caixa = (n) => { const vs = [...new Set([...n.F.values()].filter((f) => f.parte === 'aba').flatMap((f) => f.vs))].map((id) => n.V.get(id)); return [0, 1, 2].map((e) => [Math.min(...vs.map((q) => q[e])), Math.max(...vs.map((q) => q[e]))]); };
    const ca = caixa(neutro); const cb = caixa(b);
    for (let e = 0; e < 3; e++) { expect(cb[e][0]).toBeCloseTo(ca[e][0], 9); expect(cb[e][1]).toBeCloseTo(ca[e][1], 9); }
    expect(ca[0][0]).toBeGreaterThan(0.3 - 1e-9); expect(ca[0][1]).toBeLessThan(0.5 + 1e-9);
    expect(ca[2][0]).toBeGreaterThan(0.3 - 1e-9); expect(ca[2][1]).toBeLessThan(0.5 + 1e-9);
  });
});
