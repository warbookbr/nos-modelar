/* gaiola-aneis-gota.test.mjs — os anéis de gaiola no vão real de uma carroceria: a gota estreita, o recuo por lado e a abertura que é a própria borda
 *
 * A correção da fatia 1 do plano da gaiola que segue as feições. A prova da fatia 1 usava um vão de 900 × 1000 mm numa grade de 100 mm e não
 * pegou o que a prática mostrou: o anel pedia um vão declarado bem maior que a abertura, com folga larga para a transição e um recuo só para
 * todos os lados. Aqui a chapa é de uns 1000 × 500 mm, com uma grade a 38 a 110 mm que acompanha uma gota de 450 mm de comprimento, de 230 mm
 * de altura na estação larga e 10 mm na ponta (`procedural/nucleo/fixtures/gaiola-gota-prova.js`), e o anel faz três coisas: tem recuo diferente em
 * cada lado do vão, sai da própria borda da abertura (recuo 0, com as voltas crescendo para fora, sobre a grade) e aceita o vão que a borda
 * livre das colunas que terminam e começam deixa (`gaiola-borda-livre-prova.js`). A leitura de ondulação das mesmas chapas está em
 * `tools/mecanifica/ondulacao-gota.test.mjs`. Nenhum número vem de referência externa. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { extraordinarios } from './gaiola-aneis.js';
import { enderecosPorIndice, gaiolaDoPasso } from './operacoes/subdivisao.js';
import { subdividirCatmullClark } from './subdivisao.js';
import { sha256Hex } from './sha256.js';
import { META_LARGA, META_PONTA, MARGENS_DE_DENTRO, PLANTA_DE_DENTRO, altura, gota, montagem } from './fixtures/gaiola-gota-prova.js';
import { altura as alturaDoVidro, montagem as montagemDoVidro } from './fixtures/gaiola-borda-livre-prova.js';
import { montagem as montagemDaProvaDaFatia1 } from './fixtures/gaiola-aneis-prova.js';

const MM = 1000;
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const newell = (P) => {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  return n;
};
const unit = (n) => { const l = Math.hypot(...n); return n.map((x) => x / l); };
/* a distância de um ponto a uma poligonal, em 3D */
const distancia = (p, poli) => {
  let m = Infinity;
  for (let i = 0; i + 1 < poli.length; i++) {
    const a = poli[i], b = poli[i + 1]; const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
    if (!(l2 > 0)) continue;
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2));
    m = Math.min(m, d3(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]));
  }
  return m;
};
const circunraio = (a, b, c) => { const ab = d3(a, b), bc = d3(b, c), ca = d3(c, a); const m = (ab + bc + ca) / 2; return ab * bc * ca / (4 * Math.sqrt(m * (m - ab) * (m - bc) * (m - ca))); };
const grito = (fn) => { try { fn(); } catch (e) { return e.message; } throw new Error('não gritou'); };
const impressao = (g) => sha256Hex(JSON.stringify([g.pontos, g.passo, g.aneis]));

/* ---- a gota com o vão maior que a abertura: um recuo para cada lado ---- */

const MARGENS = MARGENS_DE_DENTRO;
const PLANTA = PLANTA_DE_DENTRO;
const nomesDaPlanta = montagem({ margens: MARGENS, ...PLANTA }).nomes;
const RECUOS = { [nomesDaPlanta.baixo]: 60, [nomesDaPlanta.cima]: 80, [nomesDaPlanta.inicio]: 70, [nomesDaPlanta.fim]: 70 };
const dentro = (opcoes = {}) => montagem(gota({ modo: 'dentro', anel: opcoes.anel }));

describe('anel no vão da gota, com o vão maior que a abertura e um recuo para cada lado', () => {
  const sem = montagem({ margens: MARGENS, ...PLANTA });
  const g = dentro();
  const P = g.pontos;
  const n = g.nomes;
  const borda = sem.bordaDoVao('gota').map((p) => sem.pontos[p]);

  it('a grade acompanha a gota e a chapa tem a escala de uma carroceria', () => {
    const aberta = montagem({});
    const pontos = aberta.pontos;
    const xs = aberta.passo.vertices.map((p) => pontos[p][0] * MM), zs = aberta.passo.vertices.map((p) => pontos[p][2] * MM);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(900);
    expect(Math.max(...zs) - Math.min(...zs)).toBeLessThan(1100);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(400);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(600);
    /* a gota da abertura: 450 mm de comprimento e 230 mm de altura na estação larga, 10 mm na ponta */
    expect(d3(pontos[`${aberta.nomes.inicio}_baixo`], pontos[`${aberta.nomes.inicio}_cima`]) * MM).toBeGreaterThan(229.9);
    expect(d3(pontos[`${aberta.nomes.inicio}_baixo`], pontos[`${aberta.nomes.inicio}_cima`]) * MM).toBeLessThan(231);
    expect(d3(pontos[`${aberta.nomes.fim}_baixo`], pontos[`${aberta.nomes.fim}_cima`]) * MM).toBeGreaterThan(9.9);
    expect(d3(pontos[`${aberta.nomes.fim}_baixo`], pontos[`${aberta.nomes.fim}_cima`]) * MM).toBeLessThan(10.1);
    expect((pontos[`${aberta.nomes.fim}_baixo`][2] - pontos[`${aberta.nomes.inicio}_baixo`][2]) * MM).toBeGreaterThan(449);
    expect(2 * META_LARGA * MM).toBe(230);
    expect(2 * META_PONTA * MM).toBe(10);
    /* o espaçamento da grade fica quase todo entre 35 e 80 mm, e a planta com os cantos largos (salto e uma só coluna do meio) abre as arestas junto das esquinas */
    const vistas = new Set(); const comp = [];
    for (const f of aberta.passo.faces) for (let k = 0; k < f.length; k++) { const a = f[k], b = f[(k + 1) % f.length]; const c = a < b ? `${a}|${b}` : `${b}|${a}`; if (!vistas.has(c)) { vistas.add(c); comp.push(d3(pontos[a], pontos[b]) * MM); } }
    comp.sort((a, b) => a - b);
    expect(comp[Math.floor(comp.length * 0.05)]).toBeGreaterThan(35);
    expect(comp[Math.floor(comp.length * 0.95)]).toBeLessThan(80);
  });

  it('a malha sai só de quadriláteros, e os vértices extraordinários são os declarados', () => {
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    const todos = extraordinarios(g.passo.vertices, g.passo.faces);
    const declarados = new Set(g.aneis.g.extraordinarios.map((e) => e.ponto));
    expect(new Set(todos.map((e) => e.ponto))).toEqual(declarados);
    expect(todos.every((e) => [3, 5, 6].includes(e.valencia) || e.borda)).toBe(true);
  });

  it('os pontos têm nomes derivados da borda do vão, e nenhum endereço é índice', () => {
    expect(enderecosPorIndice(g.passo)).toEqual([]);
    for (const volta of g.aneis.g.voltas) for (const nm of volta) expect(nm).toMatch(/^g_a[1-3]_e\d+_(baixo|cima|m1)(_arco\d)?$/);
    expect(g.aneis.g.voltas).toHaveLength(3);
    expect(g.aneis.g.costuras.every((c) => c.every((nm) => /^g_c\d_e\d+_(baixo|cima|m1)(_arco\d)?$/.test(nm)))).toBe(true);
  });

  it('os pontos dos anéis ficam sobre a chapa desenhada', () => {
    let pior = 0;
    for (const volta of [...g.aneis.g.voltas, ...g.aneis.g.costuras]) for (const nm of volta) pior = Math.max(pior, Math.abs(P[nm][1] - altura(P[nm][0], P[nm][2])));
    expect(pior * MM).toBeLessThan(0.05);
  });

  it('a abertura recua da borda do vão o que cada lado pede: 60 mm embaixo, 80 mm em cima, 70 mm nas pontas, medidos sobre a chapa', () => {
    const lados = { baixo: [], cima: [], inicio: [] };
    for (const nm of g.aneis.g.voltas[0]) {
      if (/_arco\d+$/.test(nm)) continue;
      const doVao = nm.replace(/^g_a1_/, '');
      const d = distancia(P[nm], borda) * MM;
      if (doVao.startsWith(`${n.inicio}_`)) lados.inicio.push(d);
      else if (doVao.endsWith('_baixo') && !doVao.startsWith(`${n.fim}_`)) lados.baixo.push(d);
      else if (doVao.endsWith('_cima') && !doVao.startsWith(`${n.fim}_`)) lados.cima.push(d);
    }
    expect(lados.baixo.length).toBeGreaterThan(5);
    expect(lados.cima.length).toBeGreaterThan(5);
    for (const d of lados.baixo) expect(Math.abs(d - 60)).toBeLessThan(0.5);
    for (const d of lados.cima) expect(Math.abs(d - 80)).toBeLessThan(0.5);
    for (const d of lados.inicio) expect(Math.abs(d - 70)).toBeLessThan(0.5);
  });

  it('as voltas seguem a borda da abertura a 10 e 20 mm, e os cantos arredondados de 50 mm têm o raio pedido mais a distância', () => {
    const v1 = [...g.aneis.g.voltas[0], g.aneis.g.voltas[0][0]].map((nm) => P[nm]);
    for (const [k, afastamento] of [[1, 10], [2, 20]]) {
      for (const nm of g.aneis.g.voltas[k]) {
        if (/_arco\d+$/.test(nm)) continue;
        /* a ponta tem o canto vivo, em esquadria, a 10 e 20 mm vezes a secante do meio ângulo */
        if (nm.includes(`_${n.fim}_`)) continue;
        expect(Math.abs(distancia(P[nm], v1) * MM - afastamento)).toBeLessThan(0.5);
      }
      for (const canto of [`${n.inicio}_baixo`, `${n.inicio}_cima`]) {
        const arco = g.aneis.g.voltas[k].filter((nm) => nm.includes(`_${canto}_arco`)).map((nm) => P[nm]);
        expect(arco.length).toBeGreaterThan(4);
        const meio = Math.floor(arco.length / 2);
        expect(Math.abs(circunraio(arco[0], arco[meio], arco[arco.length - 1]) * MM - (50 + afastamento))).toBeLessThan(0.5);
      }
    }
    /* a ponta é viva: nenhum arco nos cantos dela */
    expect(g.aneis.g.voltas.flat().some((nm) => nm.includes(`_${n.fim}_baixo_arco`) || nm.includes(`_${n.fim}_cima_arco`))).toBe(false);
  });

  it('bordaDoVao passa a dar a volta 1, fechada, e a aba do friso segue por ela', () => {
    const volta = g.bordaDoVao('gota');
    expect(volta).toEqual(g.aneis.g.borda);
    expect(volta[0]).toBe(volta[volta.length - 1]);
    expect(volta.slice(0, -1)).toEqual(g.aneis.g.voltas[0]);
  });

  it('duas execuções dão a mesma malha, bit a bit', () => {
    expect(impressao(dentro())).toBe(impressao(dentro()));
    expect(impressao(dentro())).toBe('59125e0da5cf59bc35c01471ab41b6e87a9a2a9f8742116be1e3b484c9cd0fee');
  });

  describe('grita com os nomes e diz o que mudar', () => {
    it('o recuo que não diz um lado, que cita um lado que não é do vão ou que não passa das voltas', () => {
      expect(grito(() => dentro({ anel: { recuo: { [n.baixo]: 60, [n.cima]: 80 } } }))).toMatch(/o recuo não diz o lado 'e\d+' do vão 'gota'; declare recuo: \{ baixo: mm, cima: mm, e\d+: mm, e\d+: mm \} ou acrescente padrao/);
      expect(grito(() => dentro({ anel: { recuo: { ...RECUOS, c0: 50 } } }))).toMatch(/o recuo cita o lado 'c0', que não é limite do vão 'gota'; os lados são as colunas 'baixo', 'cima' e as estações 'e\d+', 'e\d+', mais padrao/);
      expect(grito(() => dentro({ anel: { recuo: { ...RECUOS, [n.baixo]: 15 } } }))).toMatch(/recua 15 mm da borda do vão no lado 'baixo' e as 3 voltas ocupam 20 mm da abertura/);
      expect(dentro({ anel: { recuo: { padrao: 70, [n.baixo]: 60, [n.cima]: 80 } } }).aneis.g.voltas).toHaveLength(3);
    });

    it('a transição que não cabe diz o lado, o que sobra, o que a grade pede e que coluna ou estação acrescentar', () => {
      /* o caso da prática: recuo curto num vão afilado, com voltas de 6 mm */
      const m = grito(() => dentro({ anel: { recuo: 20, voltas: 2, largura: 6, raio: 0, raios: {} } }));
      expect(m).toMatch(/^gaiola por estações: o anel 'g': com o recuo de 20 mm da borda do vão 'gota', a transição das voltas até a grade não fecha: /);
      expect(m).toMatch(/ao longo da coluna '(baixo|cima)', entre as estações 'e\d+' e 'e\d+'/);
      expect(m).toMatch(/sobram 14\.0 mm entre a última volta \(a 6\.0 mm da abertura\) e a borda do vão \(recuo de 20\.0 mm\)/);
      expect(m).toMatch(/aumente o recuo desse lado para pelo menos \d+\.\d mm, ou acrescente uma coluna entre 'cima' e 'd0', nas estações 'e\d+' e 'e\d+': a aresta da grade precisa medir \d+\.\d mm ou menos ali, e mede \d+\.\d mm/);
      expect(m).toMatch(/acrescente uma estação entre 'e\d+' e 'e\d+', nas colunas 'm1' e 'cima'/);
    });

    it('o raio que não cabe entre a esquina e o primeiro ponto do lado diz o raio que cabe, e esse raio cabe', () => {
      const m = grito(() => dentro({ anel: { raio: 80 } }));
      expect(m).toMatch(/o raio dos cantos não cabe entre 'e\d+_(baixo|cima)' e 'e\d+_(baixo|cima|m1)'/);
      const [, cabe] = m.match(/reduza o raio do anel para (\d+) mm ou menos \(raio: \d+\)/);
      expect(Number(cabe)).toBeGreaterThan(40);
      expect(Number(cabe)).toBeLessThan(80);
      expect(dentro({ anel: { raio: Number(cabe) } }).aneis.g.voltas).toHaveLength(3);
      expect(() => dentro({ anel: { raio: Number(cabe) + 1 } })).toThrow(/o raio dos cantos não cabe/);
      /* na ponta de 10 mm o raio de 50 mm não existe: o anel diz os dois cantos da ponta e o raio que cabe entre eles */
      const ponta = grito(() => dentro({ anel: { raios: {} } }));
      expect(ponta).toMatch(new RegExp(`entre '${n.fim}_(baixo|cima)' e '${n.fim}_(baixo|cima)': os dois cantos pedem [\\d.]+ e [\\d.]+ mm de lado e o lado entre eles tem [\\d.]+ mm; reduza o raio dos cantos '${n.fim}_cima' e '${n.fim}_baixo' para \\d+ mm ou menos`));
    });
  });

  describe('a superfície', () => {
    const limite = (gg, niveis) => {
      const r = gaiolaDoPasso({ ...gg.passo, borda: 'cantos' }, { vec: (p) => (typeof p === 'string' ? gg.pontos[p] : p), num: (x) => x });
      return subdividirCatmullClark({ ...r.gaiola, niveis, borda: 'cantos', aoLimite: true, comVincos: true });
    };
    const viradas = (s) => s.faces.filter((f) => newell(f.map((i) => s.vertices[i]))[1] < -2e-9).length;

    it('sai sem face virada nos níveis 1 e 3', () => {
      for (const niveis of [1, 3]) expect(viradas(limite(g, niveis))).toBe(0);
    });
  });
});

/* ---- a gota com recuo 0: a abertura é a própria borda do vão, e as voltas crescem para fora, sobre a grade ---- */

const aneisDeFora = (extra = {}) => ({ nome: 'g', vao: 'gota', recuo: 0, voltas: 3, largura: 10, ...extra });
const fora = (opcoes = {}) => montagem({ aneis: [aneisDeFora(opcoes.anel)], ...opcoes.planta });

describe('anel de recuo 0: a abertura é a própria borda do vão, afilada em ponta', () => {
  const aberta = montagem({});
  const g = fora();
  const P = g.pontos;

  it('troca só a faixa de faces em volta do vão, e a volta 1 é a borda do vão, nos pontos da grade', () => {
    expect(g.aneis.g.fora).toBe(true);
    expect(g.aneis.g.fechada).toBe(true);
    expect(g.aneis.g.camadas).toBeGreaterThanOrEqual(1);
    const doVao = aberta.bordaDoVao('gota').slice(0, -1);
    expect(new Set(g.aneis.g.voltas[0])).toEqual(new Set(doVao));
    expect(g.aneis.g.voltas[0]).toHaveLength(doVao.length);
    expect(g.aneis.g.voltas[0].every((nm) => !nm.startsWith('g_'))).toBe(true);
    expect(g.aneis.g.voltas[1].every((nm) => /^g_a2_/.test(nm))).toBe(true);
    /* a faixa de faces em volta do vão saiu, os pontos de dentro dela também, e todo ponto que sobra tem face */
    expect(g.passo.faces.length).toBeGreaterThan(aberta.passo.faces.length - 60);
    const usados = new Set(g.passo.faces.flat());
    expect(g.passo.vertices.every((v) => usados.has(v))).toBe(true);
    expect(g.passo.faces.every((f) => f.every((v) => g.passo.vertices.includes(v)))).toBe(true);
    /* a borda de fora da faixa é da grade, e o resto da grade ficou como estava */
    for (const f of aberta.passo.faces) if (!f.some((v) => g.aneis.g.voltas[0].includes(v) || g.aneis.g.grade.includes(v))) expect(g.passo.faces.some((h) => h.join() === f.join())).toBe(true);
  });

  it('a malha sai só de quadriláteros, com os vértices extraordinários declarados e nenhuma face virada', () => {
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    const todos = extraordinarios(g.passo.vertices, g.passo.faces);
    expect(new Set(todos.map((e) => e.ponto))).toEqual(new Set(g.aneis.g.extraordinarios.map((e) => e.ponto)));
    expect(g.passo.faces.filter((f) => newell(f.map((nm) => P[nm]))[1] <= 0)).toHaveLength(0);
    expect(enderecosPorIndice(g.passo)).toEqual([]);
  });

  it('as voltas seguem a borda da abertura a 10 e 20 mm, e a abertura tem 230 mm na estação larga e 10 mm na ponta', () => {
    const v1 = [...g.aneis.g.voltas[0], g.aneis.g.voltas[0][0]].map((nm) => P[nm]);
    for (const [k, afastamento] of [[1, 10], [2, 20]]) {
      let pior = 0; let contados = 0;
      for (const nm of g.aneis.g.voltas[k]) {
        const d = distancia(P[nm], v1) * MM;
        /* o canto é em esquadria: o ponto dele fica a afastamento / cos(meio ângulo) da quina */
        if (d > afastamento + 0.5) { expect(d).toBeLessThan(afastamento * 1.7); continue; }
        pior = Math.max(pior, Math.abs(d - afastamento)); contados += 1;
      }
      expect(contados).toBeGreaterThan(20);
      expect(pior).toBeLessThan(0.5);
    }
    const vazio = g.nomes;
    expect(d3(P[`${vazio.inicio}_baixo`], P[`${vazio.inicio}_cima`]) * MM).toBeGreaterThan(229.9);
    expect(d3(P[`${vazio.fim}_baixo`], P[`${vazio.fim}_cima`]) * MM).toBeLessThan(10.1);
    /* os pontos novos ficam sobre a chapa */
    let ate = 0;
    for (const volta of [...g.aneis.g.voltas.slice(1), ...g.aneis.g.costuras]) for (const nm of volta) ate = Math.max(ate, Math.abs(P[nm][1] - altura(P[nm][0], P[nm][2])));
    expect(ate * MM).toBeLessThan(0.05);
  });

  it('a faixa de faces é a menor que fecha a transição: com uma camada a menos o anel diz o que falta', () => {
    const c = g.aneis.g.camadas;
    expect(c).toBeGreaterThanOrEqual(1);
    expect(c).toBeLessThanOrEqual(4);
    if (c > 1) expect(grito(() => fora({ anel: { camadas: c - 1 } }))).toMatch(/a transição das voltas até a grade não fecha/);
    expect(fora({ anel: { camadas: c } }).aneis.g.camadas).toBe(c);
  });

  it('o arco opcional contorna o canto com o raio da distância, e cada ponto da volta fica exatamente a afastamento mm da borda', () => {
    const arredondado = fora({ anel: { arredondar: true } });
    const Q = arredondado.pontos;
    const v1 = [...arredondado.aneis.g.voltas[0], arredondado.aneis.g.voltas[0][0]].map((nm) => Q[nm]);
    for (const [k, afastamento] of [[1, 10], [2, 20]]) for (const nm of arredondado.aneis.g.voltas[k]) expect(Math.abs(distancia(Q[nm], v1) * MM - afastamento)).toBeLessThan(0.5 + (afastamento === 20 ? 0.5 : 0.1));
    expect(arredondado.passo.faces.every((f) => f.length === 4)).toBe(true);
  });

  it('a moldura em relevo de 10 mm declarada nas voltas aparece com o diedro pedido', () => {
    const relevo = montagem(gota({ relevo: true }));
    const R = relevo.pontos; const a = relevo.aneis.g;
    /* a crista chega aos 10 mm sobre a chapa, pela normal, nos lados da gota */
    const cristas = a.voltas[1].filter((nm) => !/_arco\d+$/.test(nm));
    let altos = 0;
    for (const nm of cristas) { const alto = (R[nm][1] - altura(R[nm][0], R[nm][2])) * MM; expect(alto).toBeLessThan(10.1); if (alto > 9.8) altos += 1; }
    expect(altos).toBeGreaterThan(cristas.length - 6);
    const pedido = Math.atan2(10, 10) * 180 / Math.PI;
    const k = new Map(relevo.passo.vertices.map((nm, i) => [nm, i]));
    const V = relevo.passo.vertices.map((nm) => R[nm]);
    const F = relevo.passo.faces.map((f) => f.map((nm) => k.get(nm)));
    const angulo = (V2, F2, x, y) => {
      const donas = F2.filter((f) => f.some((v, i) => (v === x && f[(i + 1) % f.length] === y) || (v === y && f[(i + 1) % f.length] === x)));
      if (donas.length !== 2) return null;
      const [n1, n2] = donas.map((f) => unit(newell(f.map((i) => V2[i]))));
      return Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180 / Math.PI;
    };
    /* na gaiola declarada, o diedro do vinco da volta 3 nos lados retos da gota é o pedido a menos de 1,5 grau */
    const lado = a.voltas[2].filter((nm) => /_(baixo|cima)$/.test(nm) && !nm.includes(`_${relevo.nomes.fim}_`));
    const medidos = [];
    for (let i = 0; i + 1 < a.voltas[2].length; i++) {
      const x = a.voltas[2][i], y = a.voltas[2][i + 1];
      if (!(lado.includes(x) && lado.includes(y))) continue;
      const ang = angulo(V, F, k.get(x), k.get(y));
      if (ang !== null) medidos.push(ang);
    }
    expect(medidos.length).toBeGreaterThan(5);
    for (const ang of medidos) expect(Math.abs(ang - pedido)).toBeLessThan(1.5);
    /* na superfície limite o vinco da volta 3 fica a poucos graus mais aberto que o pedido, porque ela passa pela crista */
    const r = gaiolaDoPasso({ ...relevo.passo, borda: 'cantos' }, { vec: (p) => (typeof p === 'string' ? relevo.pontos[p] : p), num: (x) => x });
    const s = subdividirCatmullClark({ ...r.gaiola, niveis: 3, borda: 'cantos', aoLimite: true, comVincos: true });
    const meios = s.vincos.map(([x, y]) => ({ x, y, m: [0, 1, 2].map((i) => (s.vertices[x][i] + s.vertices[y][i]) / 2) }));
    const ao = (nm) => R[nm];
    const noLado = meios.filter(({ m }) => lado.some((nm) => d3(m, ao(nm)) * MM < 14));
    const limites = noLado.map(({ x, y }) => angulo(s.vertices, s.faces, x, y)).filter((v) => v !== null).sort((u, v) => u - v);
    expect(limites.length).toBeGreaterThan(10);
    const mediana = limites[Math.floor(limites.length / 2)];
    expect(mediana - pedido).toBeGreaterThan(0);
    expect(mediana - pedido).toBeLessThan(6);
  });

  it('duas execuções dão a mesma malha, bit a bit', () => {
    expect(impressao(fora())).toBe(impressao(fora()));
    expect(impressao(fora())).toBe('d67cf85e9ea9c521778aed5da0fb7b921a84f02cf67099763b6e5d90e712e330');
    expect(impressao(montagem(gota({ relevo: true })))).toBe('5f9d8e6f83f44cb686ae32bf9d848d5909a94861df35bc03596f5df7761b8d3e');
  });

  describe('grita com os nomes e diz o que mudar', () => {
    it('a declaração que mistura recuo 0 com raio, relevo na volta 1 ou camadas com recuo', () => {
      expect(grito(() => fora({ anel: { raio: 10 } }))).toMatch(/tem recuo 0 e raio: a abertura é a borda do vão, e o canto dela é o da gaiola/);
      expect(grito(() => fora({ anel: { relevo: [5, 0, 0] } }))).toMatch(/tem recuo 0 e relevo 5 na volta 1; a volta 1 é a borda do vão/);
      expect(grito(() => dentro({ anel: { camadas: 2 } }))).toMatch(/declara camadas, que só vale com recuo 0/);
      expect(grito(() => dentro({ anel: { arredondar: true } }))).toMatch(/declara arredondar, que só vale com recuo 0/);
      expect(grito(() => fora({ anel: { recuo: { baixo: 0 } } }))).toMatch(/precisa de recuo por lado com mm maiores que zero em cada lado/);
    });

    it('a faixa que chega a outro anel ou à borda da chapa, nos nomes da face', () => {
      /* dois vãos de uma camada de grade entre eles: os dois anéis de recuo 0 disputam as faces dessa camada */
      const placa = (aneis) => {
        const estacoes = [];
        for (let e = 0; e < 9; e++) {
          const colunas = [];
          for (let c = 0; c < 16; c++) {
            const dentroDeA = e > 2 && e < 6 && c > 2 && c < 6, dentroDeB = e > 2 && e < 6 && c > 8 && c < 12;
            if (dentroDeA || dentroDeB) continue;
            const x = 0.1 * c, z = 0.1 * e;
            colunas.push({ nome: `c${c}`, em: [x, 0.3 - ((x - 0.65) ** 2) / 4 - ((z - 0.4) ** 2) / 6] });
          }
          estacoes.push({ nome: `e${e}`, em: 0.1 * e, colunas });
        }
        return gaiolaPorEstacoes({
          eixo: 'z', virar: true, estacoes,
          vaos: [{ nome: 'a', estacoes: ['e2', 'e6'], colunas: ['c2', 'c6'] }, { nome: 'b', estacoes: ['e2', 'e6'], colunas: ['c8', 'c12'] }],
          aneis, medidas: estacoes.map((e) => ({ estacao: e.nome })),
        });
      };
      const anel = (nome, vao, camadas = 1) => ({ nome, vao, recuo: 0, voltas: 2, larguras: [20], camadas });
      expect(grito(() => placa([anel('a', 'a'), anel('b', 'b', 2)]))).toMatch(/o anel 'b': a faixa de 2 camadas de faces em volta do vão 'b' inclui a face \[.*\], que já é do anel 'a'; afaste os dois vãos, ou dê um recuo a um deles/);
      expect(placa([anel('a', 'a')]).aneis.a.fora).toBe(true);
      /* a faixa de várias camadas que chega à borda livre da chapa */
      const borda = grito(() => fora({ anel: { camadas: 4 } }));
      expect(borda).toMatch(/a faixa de 4 camadas de faces em volta do vão 'gota' chega à borda livre da chapa, ou a outro vão, em 'e\d+_c\d' e 'e\d+_c\d'; afaste o vão dessa borda/);
    });
  });
});

/* ---- o vão aberto pelas colunas que terminam e começam ---- */

describe('vão de borda livre: a abertura que as colunas que terminam e começam deixam', () => {
  const sem = montagemDoVidro({});
  const aneis = [{ nome: 'v', vao: 'vidro', recuo: 0, voltas: 3, largura: 10 }];
  const g = montagemDoVidro({ aneis });
  const P = g.pontos;

  it('o vão livre não tira face, e a borda dele é a borda livre da chapa entre as colunas c0 a c5 e as estações e6 a e12', () => {
    expect(sem.bordaDoVao('vidro')).toEqual(['e6_c0', 'e6_c1', 'e6_c2', 'e6_c3', 'e6_c4', 'e6_c5', 'e7_c5', 'e8_c5', 'e9_c5', 'e10_c5', 'e11_c5', 'e12_c5', 'e12_c4', 'e12_c3', 'e12_c2', 'e12_c1', 'e12_c0']);
    expect(sem.passo.faces.every((f) => f.length === 4)).toBe(true);
  });

  it('o vão sem livre: true e sem face tirada grita com a dica das colunas que terminam e começam', () => {
    const estacoes = [];
    for (let e = 0; e < 6; e++) {
      const colunas = [];
      for (let c = 0; c < 6; c++) {
        const ponto = { nome: `c${c}`, em: [0.1 * c, alturaDoVidro(0.1 * c, 0.1 * e)] };
        if (c <= 1 && e === 1) ponto.termina = true;
        if (c <= 1 && e === 4) ponto.comeca = true;
        if (c <= 1 && e > 1 && e < 4) continue;
        colunas.push(ponto);
      }
      estacoes.push({ nome: `e${e}`, em: 0.1 * e, colunas });
    }
    const m = grito(() => gaiolaPorEstacoes({ eixo: 'z', virar: true, estacoes, vaos: [{ nome: 'vidro', estacoes: ['e1', 'e4'], colunas: ['c0', 'c2'] }] }));
    expect(m).toMatch(/o vão 'vidro' vai da coluna 'c0' à 'c2', que na estação 'e2' não tem|o vão 'vidro' cita a coluna 'c0', que a estação 'e2' não tem/);
    const ok = gaiolaPorEstacoes({ eixo: 'z', virar: true, estacoes, vaos: [{ nome: 'vidro', estacoes: ['e1', 'e4'], colunas: ['c0', 'c2'], livre: true }] });
    expect(ok.bordaDoVao('vidro')).toEqual(['e1_c0', 'e1_c1', 'e1_c2', 'e2_c2', 'e3_c2', 'e4_c2', 'e4_c1', 'e4_c0']);
  });

  it('o anel de recuo 0 abre na borda livre: as voltas começam e acabam sobre o plano de simetria e seguem a borda a menos de 0,5 mm', () => {
    const a = g.aneis.v;
    expect(a.fechada).toBe(false);
    expect(a.fora).toBe(true);
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    for (const volta of a.voltas) { expect(P[volta[0]][0]).toBe(0); expect(P[volta[volta.length - 1]][0]).toBe(0); }
    const v1 = a.voltas[0].map((nm) => P[nm]);
    for (const [k, afastamento] of [[1, 10], [2, 20]]) {
      for (const nm of a.voltas[k]) {
        const d = distancia(P[nm], v1) * MM;
        if (/e(6|12)_c5$/.test(nm)) { expect(d).toBeLessThan(afastamento * 1.5); continue; }
        expect(Math.abs(d - afastamento)).toBeLessThan(0.5);
      }
    }
    let pior = 0;
    for (const volta of [...a.voltas.slice(1), ...a.costuras]) for (const nm of volta) pior = Math.max(pior, Math.abs(P[nm][1] - alturaDoVidro(P[nm][0], P[nm][2])));
    expect(pior * MM).toBeLessThan(0.05);
  });

  it('os vértices extraordinários são os declarados, nenhuma face fica virada, e a mesma definição dá a mesma malha', () => {
    const todos = extraordinarios(g.passo.vertices, g.passo.faces);
    expect(new Set(todos.map((e) => e.ponto))).toEqual(new Set(g.aneis.v.extraordinarios.map((e) => e.ponto)));
    expect(g.passo.faces.filter((f) => newell(f.map((nm) => P[nm]))[1] <= 0)).toHaveLength(0);
    expect(impressao(montagemDoVidro({ aneis }))).toBe(impressao(g));
    expect(impressao(g)).toBe('7b6d91a4a351e84264f7e40ee6f2945adfbd8f0ea863a9cdb830268e3031bf26');
  });
});
