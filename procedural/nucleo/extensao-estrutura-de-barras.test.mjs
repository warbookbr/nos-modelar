/* estrutura-de-barras.test.mjs — a extensão estruturaDeBarras: quadro plano, treliça triangular, cubo de 12 barras, juntas sem fresta,
   comprimentos de corte, peso por metro, determinismo e recusas. */
import { describe, expect, it } from 'vitest';
import { BASE_ESTENDIDA, REGISTRO_OPERACOES, criarRegistroComExtensoes, nucleo } from './entrada.js';
import { descreverEstrutura, construirEstrutura } from '../extensoes/estrutura-de-barras/estrutura.js';
import { secao, normalizarPerfil } from '../extensoes/estrutura-de-barras/perfis.js';
import { MANIFESTO } from '../extensoes/estrutura-de-barras/manifesto.js';
import { implementar } from '../extensoes/estrutura-de-barras/implementacao.js';
import { PASSOS } from '../extensoes/estrutura-de-barras/fixture.js';

const registro = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [{ manifesto: MANIFESTO, implementacao: implementar }] });
const N = (nome, x, y, z) => ({ nome, posicao: [x, y, z] });
const B = (de, para, extra = {}) => ({ nome: `${de}-${para}`, de, para, ...extra });
const QUADRADO = { tipo: 'tubo-quadrado', lado: 40 };
const QUADRADO_OCO = { tipo: 'tubo-quadrado', lado: 40, parede: 3 };

/* ---------- conferências independentes da biblioteca de sólidos ---------- */

function arestasFechadas({ vertices, triangulos }) {
  const dirigidas = new Map();
  for (const t of triangulos) for (let k = 0; k < 3; k++) { const chave = `${t[k]}>${t[(k + 1) % 3]}`; dirigidas.set(chave, (dirigidas.get(chave) ?? 0) + 1); }
  let abertas = 0;
  for (const [chave, n] of dirigidas) { const [a, b] = chave.split('>'); if (n !== 1 || dirigidas.get(`${b}>${a}`) !== 1) abertas += 1; }
  return { abertas, vertices: vertices.length };
}
function volumeAssinado({ vertices, triangulos }) {
  let v = 0;
  for (const [i, j, k] of triangulos) { const a = vertices[i], b = vertices[j], c = vertices[k]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; }
  return v;
}
/* ponto dentro do sólido por paridade de um raio (Möller–Trumbore) */
function dentro(malha, p) {
  const d = [0.5773502691, 0.3217505543, 0.7499999999];
  let cruzamentos = 0;
  for (const [i, j, k] of malha.triangulos) {
    const a = malha.vertices[i], b = malha.vertices[j], c = malha.vertices[k];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-14) continue;
    const s = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < 0 || u + v > 1) continue;
    if ((e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det > 0) cruzamentos += 1;
  }
  return cruzamentos % 2 === 1;
}
function sorteador(semente) { let s = semente >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; }; }

const unit = (a) => { const n = Math.hypot(...a); return a.map((v) => v / n); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/* recuo atrás do nó de uma barra cortada em esquadria, por amostragem da seção: o menor, sobre os pontos da seção, do maior avanço
   exigido pelos planos bissetores com as vizinhas. Só usa as direções e a forma da seção. */
function recuoPorAmostragem(perfil, dir, outras, cima = [0, 1, 0]) {
  const s = secao(normalizarPerfil(perfil, 'perfil', (v) => v));
  const y = unit(cima.map((v, i) => v - dir[i] * dot(cima, dir))), x = [y[1] * dir[2] - y[2] * dir[1], y[2] * dir[0] - y[0] * dir[2], y[0] * dir[1] - y[1] * dir[0]];
  const pontos = [];
  s.externo.forEach((p, i) => { const q = s.externo[(i + 1) % s.externo.length]; for (let k = 0; k < 40; k++) pontos.push([p[0] + (q[0] - p[0]) * k / 40, p[1] + (q[1] - p[1]) * k / 40]); });
  for (let a = -1; a <= 1.0001; a += 0.05) for (let b = -1; b <= 1.0001; b += 0.05) pontos.push([a * s.raioCircunscrito, b * s.raioCircunscrito]);
  let melhor = Infinity;
  for (const [px, py] of pontos) {
    if (!s.contem(px, py)) continue;
    const eps = [0, 1, 2].map((i) => x[i] * px + y[i] * py);
    const avanco = Math.max(...outras.map((o) => dot(eps, o) / (1 - dot(dir, o))));
    melhor = Math.min(melhor, avanco);
  }
  return -melhor;
}

/* ---------- estruturas de prova ---------- */

const quadro = (perfil = QUADRADO_OCO, extra = {}) => ({
  nos: [N('a', 0, 0, 0), N('b', 1000, 0, 0), N('c', 1000, 0, 600), N('d', 0, 0, 600)],
  barras: [B('a', 'b'), B('b', 'c'), B('c', 'd'), B('d', 'a')], perfil, ...extra,
});

const ALTURA = 300 * Math.sqrt(3) / 2;
const trelica = (perfil, extra = {}) => ({
  nos: [N('b0', 0, 0, 0), N('b1', 300, 0, 0), N('b2', 600, 0, 0), N('b3', 900, 0, 0), N('t0', 150, 0, ALTURA), N('t1', 450, 0, ALTURA), N('t2', 750, 0, ALTURA)],
  barras: [B('b0', 'b1'), B('b1', 'b2'), B('b2', 'b3'), B('t0', 't1'), B('t1', 't2'), B('b0', 't0'), B('t0', 'b1'), B('b1', 't1'), B('t1', 'b2'), B('b2', 't2'), B('t2', 'b3')],
  perfil, ...extra,
});

function cubo(perfil, lado = 500, extra = {}) {
  const nos = [];
  for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) nos.push(N(`n${x}${y}${z}`, x * lado, y * lado, z * lado));
  const barras = [];
  for (const a of nos) for (const b of nos) {
    const eixos = [0, 1, 2].filter((i) => a.posicao[i] !== b.posicao[i]);
    if (eixos.length === 1 && a.posicao[eixos[0]] < b.posicao[eixos[0]]) barras.push(B(a.nome, b.nome));
  }
  return { nos, barras, perfil, ...extra };
}

describe('quadro plano de tubos quadrados', () => {
  const r = construirEstrutura(quadro(QUADRADO_OCO, { densidade: 7850 }), undefined, { conferir: true });

  it('corta as quatro barras em esquadria de 45° e dá o comprimento de corte de cada uma', () => {
    const cortes = Object.fromEntries(r.medidas.barras.map((b) => [b.nome, b.comprimentoDeCorte]));
    expect(cortes).toEqual({ 'a-b': 1040, 'b-c': 640, 'c-d': 1040, 'd-a': 640 });
    for (const barra of r.medidas.barras) {
      expect(barra.extremos.map((e) => e.tipo)).toEqual(['esquadria', 'esquadria']);
      expect(barra.extremos[0].angulosDoCorte[0]).toBeCloseTo(45, 6);
    }
    expect(r.medidas.nos.map((n) => n.tipo)).toEqual(['esquadria', 'esquadria', 'esquadria', 'esquadria']);
  });

  it('dá o peso por metro e o do corte quando há densidade', () => {
    const area = 40 * 40 - 34 * 34; // mm²
    for (const barra of r.medidas.barras) {
      expect(barra.area).toBe(area);
      expect(barra.pesoPorMetro).toBeCloseTo(area * 1e-6 * 7850, 6);
      expect(barra.pesoDoCorte).toBeCloseTo(barra.pesoPorMetro * barra.comprimentoDeCorte / 1000, 5);
    }
    expect(r.medidas.massaTotal).toBeCloseTo(r.medidas.volume * 1e-9 * 7850, 6);
    expect(descreverEstrutura(quadro()).barras[0].pesoPorMetro).toBeNull();
  });

  it('une as barras num sólido fechado, com o volume de área vezes comprimento entre nós (o corte plano passa pelo eixo no nó)', () => {
    const area = 40 * 40 - 34 * 34;
    expect(r.medidas.volume).toBeCloseTo(area * (1000 + 600 + 1000 + 600), 3);
    for (const barra of r.medidas.barras) expect(barra.volume).toBeCloseTo(area * barra.comprimentoEntreNos, 3);
    expect(r.medidas.componentes).toBe(1);
    expect(arestasFechadas(r.malha).abertas).toBe(0);
    expect(volumeAssinado(r.malha)).toBeCloseTo(r.medidas.volume, -1);
    expect(volumeAssinado(r.malha)).toBeGreaterThan(0);
    expect(r.medidas.caixa.min[0]).toBeCloseTo(-20, 3); expect(r.medidas.caixa.max[0]).toBeCloseTo(1020, 3);
    expect(r.medidas.caixa.min[2]).toBeCloseTo(-20, 3); expect(r.medidas.caixa.max[2]).toBeCloseTo(620, 3);
  });

  it('não deixa fresta nem ponta nos quatro cantos', () => {
    expect(r.medidas.juntas.filter((j) => j.tipo === 'esquadria').map((j) => j.fresta)).toEqual([0, 0, 0, 0]);
    expect(r.medidas.juntas.filter((j) => j.tipo === 'livre')).toEqual([]);
  });

  it('mede o mesmo em metros: o peso por metro não depende da unidade', () => {
    const emMetros = quadro({ tipo: 'tubo-quadrado', lado: 0.04, parede: 0.003 }, { densidade: 7850, unidade: 'm' });
    emMetros.nos.forEach((n) => { n.posicao = n.posicao.map((v) => v / 1000); });
    const m = descreverEstrutura(emMetros);
    expect(m.barras[0].comprimentoDeCorte).toBeCloseTo(1.04, 6);
    expect(m.barras[0].pesoPorMetro).toBeCloseTo(r.medidas.barras[0].pesoPorMetro, 5);
  });
});

describe('treliça triangular', () => {
  const redonda = { tipo: 'tubo-redondo', diametro: 30, parede: 2 };
  const t = construirEstrutura(trelica(redonda), undefined, { conferir: true });
  const porNome = Object.fromEntries(t.medidas.barras.map((b) => [b.nome, b]));

  it('classifica os nós: esquadria nas pontas, barra passante nos nós da corda com diagonais', () => {
    expect(Object.fromEntries(t.medidas.nos.map((n) => [n.nome, n.tipo]))).toEqual({ b0: 'esquadria', b1: 'passante', b2: 'passante', b3: 'esquadria', t0: 'esquadria', t1: 'passante', t2: 'esquadria' });
  });

  it('corta as pontas em esquadria de 60° com o recuo R·cot(30°) e deixa reto o que chega à passante', () => {
    const recuo = 15 / Math.tan(Math.PI / 6);
    expect(porNome['b0-b1'].comprimentoDeCorte).toBeCloseTo(300 + recuo, 6);
    expect(porNome['b2-b3'].comprimentoDeCorte).toBeCloseTo(300 + recuo, 6);
    expect(porNome['b0-t0'].comprimentoDeCorte).toBeCloseTo(300 + recuo + 15 / Math.sqrt(3), 6); // o outro extremo, em t0, é de três barras
    expect(porNome['b1-b2'].comprimentoDeCorte).toBeCloseTo(300, 8);
    expect(porNome['b0-b1'].extremos[0].angulosDoCorte[0]).toBeCloseTo(60, 6);
    expect(porNome['b1-t1'].extremos.map((e) => e.tipo)).toEqual(['encaixe', 'encaixe']);
    expect(porNome['b1-t1'].comprimentoDeCorte).toBeCloseTo(300, 6);
  });

  it('confere o recuo de cada barra em esquadria contra a amostragem da seção, que só usa direções', () => {
    const dir = (a, b) => unit([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const P = Object.fromEntries(trelica(redonda).nos.map((n) => [n.nome, n.posicao]));
    const saem = (no) => trelica(redonda).barras.filter((b) => b.de === no || b.para === no).map((b) => ({ barra: b, d: b.de === no ? dir(P[b.de], P[b.para]) : dir(P[b.para], P[b.de]) }));
    for (const no of ['b0', 'b3', 't0', 't2']) {
      for (const { barra, d } of saem(no)) {
        const outras = saem(no).filter((o) => o.barra.nome !== barra.nome).map((o) => o.d);
        const esperado = recuoPorAmostragem(redonda, d, outras);
        const medido = porNome[barra.nome].comprimentoDeCorte - porNome[barra.nome].comprimentoEntreNos;
        // soma dos dois recuos; o outro extremo desta barra também pode ser esquadria
        const outroNo = barra.de === no ? barra.para : barra.de;
        const outroRecuo = ['b0', 'b3', 't0', 't2'].includes(outroNo)
          ? recuoPorAmostragem(redonda, dir(P[outroNo], P[no]), saem(outroNo).filter((o) => o.barra.nome !== barra.nome).map((o) => o.d)) : 0;
        expect(medido).toBeCloseTo(esperado + outroRecuo, 1);
      }
    }
  });

  it('une tudo num sólido só, fechado, sem fresta e sem ponta nos nós de passagem', () => {
    expect(t.medidas.componentes).toBe(1);
    expect(arestasFechadas(t.malha).abertas).toBe(0);
    expect(volumeAssinado(t.malha)).toBeGreaterThan(0);
    for (const j of t.medidas.juntas) {
      expect(j.fresta).toBeLessThan(0.5); // mm³ de falta de polígono de 24 lados contra o círculo
      if (j.tipo === 'passante') expect(j.excesso).toBeLessThan(1);
    }
    // o eixo de toda barra está dentro do sólido, também onde ela chega à barra passante
    const P = Object.fromEntries(trelica(redonda).nos.map((n) => [n.nome, n.posicao]));
    for (const b of trelica(redonda).barras) {
      for (let k = 0; k <= 20; k++) {
        const p = [0, 1, 2].map((i) => P[b.de][i] + (P[b.para][i] - P[b.de][i]) * k / 20);
        // o eixo de um tubo oco fica no furo; o conferido é o ponto a meia parede do eixo, em y
        expect(dentro(t.malha, [p[0], p[1] + 14, p[2]])).toBe(true);
      }
    }
  });

  it('chega da mesma forma com tubo quadrado, e o corte das diagonais encaixadas é o da superfície da passante', () => {
    const q = descreverEstrutura(trelica({ tipo: 'tubo-quadrado', lado: 30, parede: 2 }), undefined, { conferir: true });
    const diagonal = q.barras.find((b) => b.nome === 'b1-t1');
    expect(diagonal.comprimentoDeCorte).toBeCloseTo(300 - 15 / Math.tan(Math.PI / 3), 6);
    expect(q.componentes).toBe(1);
    for (const j of q.juntas) { expect(j.fresta).toBeLessThan(1e-3); if (j.excesso !== null) expect(j.excesso).toBeLessThan(1e-3); }
  });
});

describe('cubo de 12 barras', () => {
  const maciço = construirEstrutura(cubo(QUADRADO), undefined, { conferir: true });

  it('tem 12 barras de corte 540 e volume igual ao da união de caixas, que é calculado à parte', () => {
    expect(maciço.medidas.barras).toHaveLength(12);
    expect(maciço.medidas.barras.map((b) => b.comprimentoDeCorte)).toEqual(Array(12).fill(540));
    // 12 caixas de 540 × 40 × 40, menos 2 cantos de 40³ repetidos em cada um dos 8 vértices
    expect(maciço.medidas.volume).toBeCloseTo(12 * 540 * 1600 - 8 * 2 * 64000, 2);
    expect(maciço.medidas.componentes).toBe(1);
    expect(maciço.medidas.juntas.map((j) => j.fresta)).toEqual(Array(8).fill(0));
  });

  it('coincide, ponto a ponto, com a união de caixas estendidas (sem fresta, sem ponta, sem canto comido)', () => {
    const caixas = maciço.medidas.barras.map((b) => {
      const P = Object.fromEntries(cubo(QUADRADO).nos.map((n) => [n.nome, n.posicao]));
      const a = P[b.de], c = P[b.para];
      return { min: [0, 1, 2].map((i) => Math.min(a[i], c[i]) - 20), max: [0, 1, 2].map((i) => Math.max(a[i], c[i]) + 20) };
    });
    const margem = (p) => Math.min(...caixas.map((c) => Math.max(...[0, 1, 2].map((i) => Math.max(c.min[i] - p[i], p[i] - c.max[i])))));
    const sorteio = sorteador(7);
    let conferidos = 0, noCanto = 0;
    for (let k = 0; k < 4000; k++) {
      const p = [sorteio() * 580 - 40, sorteio() * 580 - 40, sorteio() * 580 - 40];
      const m = margem(p);
      if (Math.abs(m) < 0.05) continue;
      conferidos += 1;
      if (p.every((v) => v < 60 || v > 440)) noCanto += 1;
      expect(dentro(maciço.malha, p), `ponto ${p.map((v) => v.toFixed(2))} margem ${m.toFixed(3)}`).toBe(m < 0);
    }
    expect(conferidos).toBeGreaterThan(3500);
    expect(noCanto).toBeGreaterThan(100);
    // os 8 cantos de fora, onde uma ponta sobraria ou uma fresta apareceria
    for (const sinal of [[-1, -1, -1], [1, -1, -1], [-1, 1, 1], [1, 1, 1]]) {
      const canto = sinal.map((s) => (s < 0 ? 0 : 500));
      expect(dentro(maciço.malha, canto.map((v, i) => v + sinal[i] * 19))).toBe(true);
      expect(dentro(maciço.malha, canto.map((v, i) => v + sinal[i] * 21))).toBe(false);
    }
  });

  it('com tubo redondo oco o recuo é R/√2 e a malha continua fechada, com ids da faixa estendida no núcleo', () => {
    const perfil = { tipo: 'tubo-redondo', diametro: 40, parede: 3 };
    const r = construirEstrutura(cubo(perfil), undefined, { conferir: true });
    for (const b of r.medidas.barras) expect(b.comprimentoDeCorte).toBeCloseTo(500 + 2 * 20 / Math.SQRT2, 6);
    expect(arestasFechadas(r.malha).abertas).toBe(0);
    expect(r.medidas.componentes).toBe(1);
    expect(r.medidas.juntas.every((j) => j.fresta < 1e-6)).toBe(true);
    expect(r.malha.triangulos.length).toBeGreaterThan(1000);
    const neutro = nucleo([['estruturaDeBarras', cubo(perfil)]], {}, {}, {}, null, [], { registroOperacoes: registro });
    expect(neutro.orfaos).toEqual([]);
    expect(neutro.F.size).toBe(r.malha.triangulos.length);
    expect([...neutro.F.keys()].some((id) => id >= BASE_ESTENDIDA)).toBe(true);
    expect([...neutro.F.values()].every((f) => f.vs.every((v) => neutro.V.has(v)))).toBe(true);
  });

  it('com tubo quadrado oco fecha o cubo sem abrir aresta', () => {
    const r = construirEstrutura(cubo(QUADRADO_OCO, 1000), undefined, { conferir: true });
    expect(arestasFechadas(r.malha).abertas).toBe(0);
    expect(r.medidas.componentes).toBe(1);
    expect(r.medidas.barras.every((b) => Math.abs(b.comprimentoDeCorte - 1040) < 1e-6)).toBe(true);
    expect(volumeAssinado(r.malha)).toBeGreaterThan(0);
  });
});

describe('juntas: o que a conferência acusa e o que ela deixa passar', () => {
  it('encaixa a chegada estreita na passante larga, cortada na superfície dela e sem ponta', () => {
    const T = {
      nos: [N('a', 0, 0, 0), N('b', 500, 0, 0), N('c', 1000, 0, 0), N('d', 500, 0, 300)],
      barras: [B('a', 'b', { perfil: { tipo: 'tubo-quadrado', lado: 60 } }), B('b', 'c', { perfil: { tipo: 'tubo-quadrado', lado: 60 } }), B('b', 'd', { perfil: { tipo: 'tubo-quadrado', lado: 40 } })],
    };
    const r = construirEstrutura(T, undefined, { conferir: true });
    expect(r.medidas.nos.find((n) => n.nome === 'b').tipo).toBe('passante');
    expect(r.medidas.barras.map((b) => b.comprimentoDeCorte)).toEqual([500, 500, 270]);
    expect(r.medidas.volume).toBeCloseTo(1000 * 3600 + 40 * 40 * 270, 2);
    expect(r.medidas.juntas.find((j) => j.no === 'b')).toMatchObject({ fresta: 0, excesso: 0 });
    expect(r.medidas.componentes).toBe(1);
    expect(arestasFechadas(r.malha).abertas).toBe(0);
  });

  it('cantoneira: o volume é a área vezes o comprimento entre nós e o peso por metro sai da área', () => {
    const L = { nos: [N('a', 0, 0, 0), N('b', 500, 0, 0), N('c', 500, 0, 300)], barras: [B('a', 'b'), B('b', 'c')], perfil: { tipo: 'cantoneira', aba: 40, aba2: 30, espessura: 4 }, densidade: 7850 };
    const r = construirEstrutura(L, undefined, { conferir: true });
    expect(r.medidas.volume).toBeCloseTo(264 * 800, 2);
    expect(r.medidas.barras[0].pesoPorMetro).toBeCloseTo(264e-6 * 7850, 6);
    expect(arestasFechadas(r.malha).abertas).toBe(0);
    expect(r.medidas.juntas.find((j) => j.no === 'b').fresta).toBeNull();
  });

  it('o detector de fresta dispara quando a junta é forçada com perfis girados', () => {
    const girado = { nos: [N('a', 0, 0, 0), N('b', 500, 0, 0), N('c', 500, 0, 300)], barras: [B('a', 'b'), B('b', 'c', { orientacao: [1, 0, 0] })], perfil: { tipo: 'tubo-retangular', largura: 60, altura: 30 } };
    expect(() => construirEstrutura(girado)).toThrow(/girado de modo diferente em torno do eixo/);
    const forcado = construirEstrutura(girado, undefined, { conferir: true, verificarSimetria: false });
    expect(forcado.medidas.juntas.find((j) => j.no === 'b').fresta).toBeGreaterThan(1000);
    const certo = construirEstrutura({ ...girado, barras: [B('a', 'b'), B('b', 'c')] }, undefined, { conferir: true });
    expect(certo.medidas.juntas.find((j) => j.no === 'b').fresta).toBe(0);
  });

  it('três barras em 3D com tubo redondo: corte e volume do plano que passa pelo eixo', () => {
    const E = { nos: [N('a', 0, 0, 0), N('b', 400, 300, 200), N('c', 900, 100, -250)], barras: [B('a', 'b'), B('b', 'c')], perfil: { tipo: 'tubo-redondo', diametro: 40, parede: 3 } };
    const m = descreverEstrutura(E);
    const area = (24 / 2) * (20 * 20 - 17 * 17) * Math.sin(2 * Math.PI / 24); // anel de polígonos de 24 lados, raios 20 e 17
    expect(m.barras[0].volume).toBeCloseTo(area * m.barras[0].comprimentoEntreNos, 1);
    expect(m.volume).toBeCloseTo(area * (m.barras[0].comprimentoEntreNos + m.barras[1].comprimentoEntreNos), 1);
  });
});

describe('determinismo', () => {
  it('a mesma chamada dá a mesma malha e as mesmas medidas, byte a byte', () => {
    const a = construirEstrutura(trelica({ tipo: 'tubo-redondo', diametro: 30, parede: 2 }, { densidade: 7850 }), undefined, { conferir: true });
    const b = construirEstrutura(trelica({ tipo: 'tubo-redondo', diametro: 30, parede: 2 }, { densidade: 7850 }), undefined, { conferir: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('o núcleo publica os mesmos vértices e faces, na mesma ordem, em duas execuções', () => {
    const rodar = () => nucleo(PASSOS, {}, {}, {}, null, [], { registroOperacoes: registro });
    const a = rodar(), b = rodar();
    expect(a.orfaos).toEqual([]);
    expect(a.V.size).toBe(112); expect(a.F.size).toBe(224);
    expect(JSON.stringify([...a.V])).toBe(JSON.stringify([...b.V]));
    expect(JSON.stringify([...a.F.values()].map((f) => f.vs))).toBe(JSON.stringify([...b.F.values()].map((f) => f.vs)));
  });
});

describe('nós por nome e posições por parâmetro', () => {
  it('as posições e as medidas vêm de PARAMS e de expressões, e a estrutura segue o parâmetro', () => {
    const passos = [['estruturaDeBarras', {
      nos: [N('a', 0, 0, 0), { nome: 'b', posicao: ['L', 0, 0] }, { nome: 'c', posicao: ['=L/2', 0, 'H'] }],
      barras: [B('a', 'b'), B('b', 'c'), B('c', 'a')], perfil: { tipo: 'tubo-redondo', diametro: 'D', parede: 2 },
    }]];
    const pequeno = nucleo(passos, { L: 600, H: 400, D: 30 }, {}, {}, null, [], { registroOperacoes: registro });
    const grande = nucleo(passos, { L: 1200, H: 800, D: 30 }, {}, {}, null, [], { registroOperacoes: registro });
    expect(pequeno.orfaos).toEqual([]); expect(grande.orfaos).toEqual([]);
    const largura = (n) => { const xs = [...n.V.values()].map((v) => v[0]); return Math.max(...xs) - Math.min(...xs); };
    expect(largura(grande) / largura(pequeno)).toBeGreaterThan(1.9);
    expect(registro.resolver('estruturaDeBarras').uso.exemplo.PASSOS).toEqual(PASSOS);
  });

  it('o contrato publicado recusa campo desconhecido com a lista do que aceita', () => {
    const neutro = nucleo([['estruturaDeBarras', { ...quadro(), tubos: 1 }]], {}, {}, {}, null, [], { registroOperacoes: registro });
    /* a guarda de argumento desconhecido do núcleo vale também para a operação de extensão registrada */
    expect(neutro.orfaos[0].motivo).toContain("argumento desconhecido 'tubos'");
    expect(neutro.orfaos[0].motivo).toContain("'estruturaDeBarras' aceita: nos, barras, perfil, densidade, unidade");
  });
});

describe('recusas dizem o campo, o valor e o que é aceito', () => {
  const recusa = (args, esperado) => {
    let erro;
    try { construirEstrutura(args); } catch (e) { erro = e; }
    expect(erro, 'deveria recusar').toBeDefined();
    for (const trecho of [].concat(esperado)) expect(erro.message).toContain(trecho);
    return erro.message;
  };
  const base = () => quadro(QUADRADO);

  it('nó inexistente, com os nós que existem', () => {
    const args = base(); args.barras[1] = B('b', 'z');
    recusa(args, ['barras[1].para', '"z"', 'nome de um nó declarado em nos (a, b, c, d)']);
    const noutro = base(); noutro.barras[0] = B('x', 'b');
    recusa(noutro, ['barras[0].de', '"x"']);
  });

  it('barra de comprimento zero, por nós de mesma posição ou pelo mesmo nó', () => {
    const args = base(); args.nos[1] = N('b', 0, 0, 0);
    recusa(args, ['barras[0].para', 'comprimento 0']);
    const mesmo = base(); mesmo.barras[0] = B('a', 'a');
    recusa(mesmo, ['barras[0].para', '"a"', 'comprimento 0']);
  });

  it('nó sem barra', () => {
    const args = base(); args.nos.push(N('solto', 5000, 0, 0));
    recusa(args, ['nos[4].nome', '"solto"', 'nó ligado a pelo menos uma barra']);
  });

  it('nome repetido, par de nós repetido, nó no meio da barra e ângulo pequeno demais', () => {
    const nomes = base(); nomes.nos[1] = N('a', 1000, 0, 0);
    recusa(nomes, ['nos[1].nome', '"a"', 'ainda não foi usado']);
    const barra = base(); barra.barras[1].nome = barra.barras[0].nome;
    recusa(barra, ['barras[1].nome', 'ainda não foi usado por outra barra']);
    const par = base(); par.barras.push({ nome: 'dupla', de: 'b', para: 'a' });
    recusa(par, ['dupla', "já liga 'b' e 'a'"]);
    const meio = base(); meio.nos.push(N('m', 500, 0, 0)); meio.barras.push(B('m', 'c'));
    recusa(meio, ["não atravesse o nó 'm'", 'divida-a']);
    const agudo = { nos: [N('a', 0, 0, 0), N('b', 500, 0, 0), N('c', 500, 0, 100)], barras: [B('a', 'b'), B('a', 'c')], perfil: QUADRADO };
    agudo.nos[2] = N('c', 500, 0, 40);
    recusa(agudo, ["nó 'a'", 'pelo menos 15° entre si']);
  });

  it('perfil: tipo, medida ausente, parede grossa demais, campo que o tipo não tem, densidade e unidade', () => {
    recusa({ ...base(), perfil: { tipo: 'viga-i' } }, ['perfil.tipo', '"viga-i"', 'tubo-redondo, tubo-quadrado, tubo-retangular, cantoneira']);
    recusa({ ...base(), perfil: { tipo: 'tubo-quadrado' } }, ['perfil.lado', 'obrigatório']);
    recusa({ ...base(), perfil: { tipo: 'tubo-quadrado', lado: 40, parede: 20 } }, ['perfil.parede', '20', 'menor que a metade da menor medida do perfil (20)']);
    recusa({ ...base(), perfil: { tipo: 'tubo-quadrado', lado: -4 } }, ['perfil.lado', '-4', 'maior que zero']);
    recusa({ ...base(), perfil: { tipo: 'tubo-quadrado', lado: 40, diametro: 3 } }, ['perfil.diametro', 'tubo-quadrado']);
    recusa({ ...base(), perfil: { tipo: 'cantoneira', aba: 40, espessura: 40 } }, ['perfil.espessura', 'menor que a menor aba']);
    recusa({ ...base(), perfil: { tipo: 'tubo-redondo', diametro: 40, lados: 7 } }, ['perfil.lados', 'inteiro par de 8 a 96']);
    const semPerfil = base(); delete semPerfil.perfil;
    recusa(semPerfil, ['barras[0].perfil', 'perfil na barra ou um perfil padrão']);
    recusa({ ...base(), densidade: -1 }, ['densidade', '-1', 'kg/m³']);
    recusa({ ...base(), unidade: 'pol' }, ['unidade', '"pol"', 'mm, cm, m']);
    recusa({ ...base(), orientacao: 1 }, ['orientacao', 'campo da chamada']);
  });

  it('seções diferentes num nó de esquadria e chegada que não cabe na passante', () => {
    const duas = base(); duas.barras[1].perfil = { tipo: 'tubo-quadrado', lado: 50 };
    recusa(duas, ["nó 'b'", 'seções diferentes', 'mesma seção']);
    const grande = {
      nos: [N('a', 0, 0, 0), N('b', 500, 0, 0), N('c', 1000, 0, 0), N('d', 500, 0, 300)],
      barras: [B('a', 'b', { perfil: { tipo: 'tubo-quadrado', lado: 40 } }), B('b', 'c', { perfil: { tipo: 'tubo-quadrado', lado: 40 } }), B('b', 'd', { perfil: { tipo: 'tubo-quadrado', lado: 60 } })],
    };
    recusa(grande, ["nó 'b'", 'b-d', 'inteiro dentro da seção da passante']);
  });

  it('pelo núcleo a recusa vira órfão com a mesma mensagem e nenhuma geometria parcial', () => {
    const args = base(); args.barras[1] = B('b', 'z');
    const neutro = nucleo([['estruturaDeBarras', args]], {}, {}, {}, null, [], { registroOperacoes: registro });
    expect(neutro.V.size).toBe(0); expect(neutro.F.size).toBe(0);
    expect(neutro.orfaos).toHaveLength(1);
    expect(neutro.orfaos[0].motivo).toContain('extensão nativa recusou');
    expect(neutro.orfaos[0].motivo).toContain('barras[1].para = "z"');
  });
});
