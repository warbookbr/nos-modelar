/* gaiola-por-rede.test.mjs — o ajudante que monta a gaiola da subdivisão por uma rede de curvas nomeadas e os retalhos que elas fecham
 *
 * Redes pequenas, desenhadas por código, medem uma coisa de cada vez: dois retalhos que dividem um lado, o lado de vários arcos onde uma
 * curva termina em outra, os retalhos de três e de cinco lados com o centro extraordinário, a densidade que sai do passo e a que o retalho
 * declara, o sentido das faces, o vinco, a linha para o friso, o peso da cota e os gritos com os nomes. A chapa de uns 1000 × 600 mm, com a
 * janela em gota, o arco e a coluna, está em `gaiola-por-rede-prova.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from './gaiola-por-rede.js';
import { enderecosPorIndice, gaiolaDoPasso } from './operacoes/subdivisao.js';
import { sha256Hex } from './sha256.js';

const grito = (fn) => { try { fn(); } catch (e) { return e.message; } throw new Error('não gritou'); };
const MM = 1000;
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const newell = (P) => {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
  return n;
};
const normaisDasFaces = (g) => g.passo.faces.map((f) => newell(f.map((v) => g.pontos[v])));

/* duas faixas de 200 × 200 mm lado a lado, no plano y = 0 */
const duasFaixas = (extra = {}) => ({
  passo: 50, fora: [0, 1, 0],
  nos: { A: [0, 0, 0], B: [200, 0, 0], C: [200, 0, 200], D: [0, 0, 200], E: [400, 0, 0], F: [400, 0, 200] },
  curvas: [
    { nome: 'baixo1', pontos: ['A', 'B'] }, { nome: 'baixo2', pontos: ['B', 'E'] }, { nome: 'direita', pontos: ['E', 'F'] },
    { nome: 'cima2', pontos: ['F', 'C'] }, { nome: 'cima1', pontos: ['C', 'D'] }, { nome: 'esquerda', pontos: ['D', 'A'] }, { nome: 'meio', pontos: ['B', 'C'] },
  ],
  retalhos: [
    { nome: 'p1', borda: ['baixo1', 'meio', 'cima1', 'esquerda'] },
    { nome: 'p2', borda: ['baixo2', 'direita', 'cima2', 'meio'] },
  ],
  ...extra,
});

describe('dois retalhos de quatro lados que dividem um lado', () => {
  const g = gaiolaPorRede(duasFaixas());

  it('o lado compartilhado tem os mesmos pontos nos dois retalhos, e a malha sai só de quadriláteros', () => {
    expect(g.passo.vertices).toHaveLength(9 * 5);
    expect(g.passo.faces).toHaveLength(2 * 16);
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    const meio = g.linha('meio');
    expect(meio).toHaveLength(5);
    for (const v of meio.slice(1, -1)) expect(g.passo.faces.filter((f) => f.includes(v))).toHaveLength(4);
    expect(g.retalhos.p1.divisoes).toEqual([4, 4]);
    expect(g.retalhos.p2.divisoes).toEqual([4, 4]);
  });

  it('as faces saem consistentes, para o lado de `fora`, e cada aresta compartilhada tem duas faces', () => {
    for (const n of normaisDasFaces(g)) expect(n[1]).toBeGreaterThan(0);
    const contagem = new Map();
    for (const f of g.passo.faces) for (let k = 0; k < 4; k++) { const a = f[k], b = f[(k + 1) % 4]; const c = a < b ? `${a}|${b}` : `${b}|${a}`; contagem.set(c, (contagem.get(c) ?? 0) + 1); }
    /* a grade de 8 × 4 faces tem 52 arestas de dentro e 24 de borda */
    expect([...contagem.values()].filter((n) => n === 2)).toHaveLength(52);
    expect([...contagem.values()].filter((n) => n === 1)).toHaveLength(24);
    expect([...contagem.values()].every((n) => n === 1 || n === 2)).toBe(true);
    const virada = gaiolaPorRede(duasFaixas({ fora: [0, -1, 0] }));
    for (const n of normaisDasFaces(virada)) expect(n[1]).toBeLessThan(0);
  });

  it('o sentido que o autor escreve os lados não muda a malha: a borda em outro sentido dá as mesmas faces', () => {
    const outra = gaiolaPorRede(duasFaixas({ retalhos: [{ nome: 'p1', borda: ['esquerda', 'cima1', 'meio', 'baixo1'] }, { nome: 'p2', borda: ['meio', 'cima2', 'direita', 'baixo2'] }] }));
    /* os nomes de dentro do retalho dependem do lado por onde ele começa; a malha, por posição, não */
    const chave = (g) => g.passo.faces.map((f) => { const ps = f.map((v) => g.pontos[v].map((x) => (x * MM).toFixed(3)).join(',')); const m = ps.indexOf([...ps].sort()[0]); return [...ps.slice(m), ...ps.slice(0, m)].join('>'); }).sort();
    expect(chave(outra)).toEqual(chave(g));
  });

  it('o vértice extraordinário só aparece onde a valência pede, e aqui a rede é regular', () => {
    expect(g.extraordinarios).toEqual([]);
  });

  it('só tem nomes: nenhum índice de vértice, face, vinco, canto ou medida', () => {
    expect(enderecosPorIndice(g.passo)).toEqual([]);
    expect(Object.keys(g.nos).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('o passo é aceito pela subdivisão: a gaiola do passo sai sem erro, com a medida exata em todo ponto', () => {
    const vec = (p) => (typeof p === 'string' ? g.pontos[p] : p);
    const r = gaiolaDoPasso({ ...g.passo, niveis: 1 }, { vec, num: (x) => x });
    expect(r.erro).toBeUndefined();
    expect(r.gaiola.vertices).toHaveLength(g.passo.vertices.length);
  });
});

describe('o lado de vários arcos, onde uma curva termina em outra', () => {
  const rede = (extra = {}) => ({
    passo: 50, fora: [0, 1, 0],
    nos: { A: [0, 0, 0], B: [400, 0, 0], M: { curva: 'base', fracao: 0.5 }, Ax: [0, 0, -200], Bx: [400, 0, -200], Mx: [200, 0, -200], F: [400, 0, 200], D: [0, 0, 200] },
    curvas: [
      { nome: 'base', pontos: ['A', 'B'] }, { nome: 'div', pontos: ['M', 'Mx'] }, { nome: 'fundoE', pontos: ['Mx', 'Ax'] }, { nome: 'fundoD', pontos: ['Bx', 'Mx'] },
      { nome: 'ladoE', pontos: ['Ax', 'A'] }, { nome: 'ladoD', pontos: ['B', 'Bx'] }, { nome: 'dirSup', pontos: ['B', 'F'] }, { nome: 'topo', pontos: ['F', 'D'] }, { nome: 'esqSup', pontos: ['D', 'A'] },
    ],
    retalhos: [
      { nome: 'esq', borda: [{ curva: 'base', de: 'A', ate: 'M' }, 'div', 'fundoE', 'ladoE'] },
      { nome: 'dir', borda: [{ curva: 'base', de: 'M', ate: 'B' }, 'ladoD', 'fundoD', 'div'] },
      { nome: 'cima', borda: ['base', 'dirSup', 'topo', 'esqSup'] },
    ],
    ...extra,
  });
  const g = gaiolaPorRede(rede());

  it('o lado de cima tem dois arcos, as divisões dos arcos somam as do lado oposto, e o nó é vértice dos três retalhos', () => {
    expect(g.curvas.base.nos).toEqual(['A', 'M', 'B']);
    expect(g.curvas.base.arcos.map((a) => [a.de, a.ate, a.divisoes, a.retalhos.length])).toEqual([['A', 'M', 4, 2], ['M', 'B', 4, 2]]);
    expect(g.retalhos.cima.divisoes[0]).toBe(8);
    expect(g.densidades['topo:F>D'].divisoes).toBe(8);
    expect(g.passo.faces.filter((f) => f.includes('M'))).toHaveLength(1 + 1 + 2);
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    for (const n of normaisDasFaces(g)) expect(n[1]).toBeGreaterThan(0);
  });

  it('a linha da curva inteira percorre os dois arcos, e a do trecho só o que foi pedido', () => {
    const toda = g.linha('base');
    expect(toda).toHaveLength(9);
    expect(toda[0]).toBe('A'); expect(toda[4]).toBe('M'); expect(toda[8]).toBe('B');
    expect(g.linha('base', 'M', 'B')).toEqual(toda.slice(4));
    expect(g.linha('base', 'B', 'M')).toEqual(toda.slice(4).reverse());
    for (let k = 0; k < toda.length; k++) expect(d3(g.pontos[toda[k]], g.pontoDaCurva('base', k / 8)) * MM).toBeLessThan(1e-9);
  });

  it('o nó dado por fração fica sobre a curva, e o grito diz o que fazer com o nó que não fica', () => {
    expect(d3(g.pontos.M, [0.2, 0, 0])).toBeLessThan(1e-12);
    const fora = grito(() => gaiolaPorRede(rede({ nos: { ...rede().nos, M: [200, 0, 5] } })));
    expect(fora).toMatch(/o nó 'M' do lado 1 do retalho 'esq' não está na curva 'base'/);
    expect(fora).toMatch(/declare-o em nos como \{ curva: 'base', fracao \}/);
  });

  it('uma fração no lugar do nome acha o mesmo nó que a curva já tem, e uma fração nova parte o arco', () => {
    const r1 = rede(); r1.retalhos[0].borda[0] = { curva: 'base', de: 0, ate: 0.5 };
    expect(gaiolaPorRede(r1).passo.vertices).toEqual(g.passo.vertices);
    const r2 = rede({ passo: 100 }); r2.retalhos[2].borda[0] = { curva: 'base', de: 0, ate: 1 };
    const g2 = gaiolaPorRede(r2);
    expect(g2.curvas.base.nos).toEqual(['A', 'M', 'B']);
  });
});

describe('a densidade', () => {
  it('sai do passo, e o passo menor adensa a rede inteira', () => {
    const grosso = gaiolaPorRede(duasFaixas({ passo: 100 }));
    const fino = gaiolaPorRede(duasFaixas({ passo: 25 }));
    expect(grosso.retalhos.p1.divisoes).toEqual([2, 2]);
    expect(fino.retalhos.p1.divisoes).toEqual([8, 8]);
    expect(fino.passo.vertices.length).toBeGreaterThan(grosso.passo.vertices.length * 5);
  });

  it('o retalho que declara divisoes manda nelas, e o vizinho as segue nos lados que dividem', () => {
    const g = gaiolaPorRede(duasFaixas({ retalhos: [{ nome: 'p1', borda: ['baixo1', 'meio', 'cima1', 'esquerda'], divisoes: [6, 3] }, { nome: 'p2', borda: ['baixo2', 'direita', 'cima2', 'meio'] }] }));
    expect(g.retalhos.p1.divisoes).toEqual([6, 3]);
    expect(g.retalhos.p2.divisoes[1]).toBe(3);
    expect(g.curvas.meio.arcos[0].divisoes).toBe(3);
  });

  it('a curva que vira muito ganha divisões pelo desvio de direção, além do comprimento', () => {
    const semiCirculo = Array.from({ length: 5 }, (_, k) => { const a = Math.PI * (k + 1) / 6; return [100 * Math.cos(a), 0, 100 * Math.sin(a)]; });
    const rede = (anguloMax) => ({
      passo: 200, fora: [0, 1, 0], anguloMax,
      nos: { P: [100, 0, 0], Q: [-100, 0, 0], R: [0, 0, -120] },
      curvas: [{ nome: 'arco', pontos: ['P', ...semiCirculo, 'Q'] }, { nome: 'esq', pontos: ['Q', 'R'] }, { nome: 'dir', pontos: ['R', 'P'] }],
      retalhos: [{ nome: 'meia', borda: ['arco', 'esq', 'dir'] }],
    });
    const fino = gaiolaPorRede(rede(30));
    expect(fino.curvas.arco.arcos[0].divisoes).toBeGreaterThanOrEqual(6);
    expect(fino.curvas.esq.arcos[0].divisoes).toBe(fino.curvas.arco.arcos[0].divisoes);
    expect(gaiolaPorRede(rede(90)).curvas.arco.arcos[0].divisoes).toBe(2);
  });

  it('o passo da curva vale no lugar do passo da rede', () => {
    const finas = ['meio', 'esquerda', 'direita'];
    const g = gaiolaPorRede(duasFaixas({ curvas: duasFaixas().curvas.map((c) => (finas.includes(c.nome) ? { ...c, passo: 25 } : c)) }));
    expect(g.curvas.meio.arcos[0].divisoes).toBe(8);
    expect(g.retalhos.p1.divisoes).toEqual([4, 8]);
    /* os três lados que se igualam fazem uma classe: com alvos de 8, 4 e 4 sai 6, porque o custo pesa quatro vezes mais o arco grosso demais que o fino demais */
    const media = gaiolaPorRede(duasFaixas({ curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, passo: 25 } : c)) }));
    expect(media.curvas.meio.arcos[0].divisoes).toBe(6);
    expect(media.curvas.esquerda.arcos[0].divisoes).toBe(6);
  });

  it('grita, com os nomes, quando os retalhos vizinhos pedem divisões diferentes no lado que dividem', () => {
    const m = grito(() => gaiolaPorRede(duasFaixas({ retalhos: [{ nome: 'p1', borda: ['baixo1', 'meio', 'cima1', 'esquerda'], divisoes: [4, 4] }, { nome: 'p2', borda: ['baixo2', 'direita', 'cima2', 'meio'], divisoes: [4, 5] }] })));
    expect(m).toMatch(/as divisões não fecham/);
    expect(m).toMatch(/retalho 'p2'/);
  });

  it('sem passo da rede nem divisoes grita pedindo um dos dois', () => {
    const { passo, ...semPasso } = duasFaixas();
    expect(grito(() => gaiolaPorRede(semPasso))).toMatch(/não declara divisoes e a rede não declara passo/);
  });
});

/* a calota de raio 3 m, y = -(x² + z²) / 6000, e o polígono regular de n lados de raio 150 mm sobre ela */
const calota = (x, z) => -(x * x + z * z) / 6000;
const P3 = (x, z) => [x, calota(x, z), z];
function poligono(n, raio = 150, extra = {}) {
  const canto = (k) => { const a = Math.PI / 2 + 2 * Math.PI * k / n; return [raio * Math.cos(a), raio * Math.sin(a)]; };
  const nos = {}; const curvas = [];
  for (let k = 0; k < n; k++) nos[`v${k}`] = P3(...canto(k));
  for (let k = 0; k < n; k++) {
    const [x0, z0] = canto(k); const [x1, z1] = canto((k + 1) % n);
    curvas.push({ nome: `l${k}`, pontos: [`v${k}`, P3(0.75 * x0 + 0.25 * x1, 0.75 * z0 + 0.25 * z1), P3((x0 + x1) / 2, (z0 + z1) / 2), P3(0.25 * x0 + 0.75 * x1, 0.25 * z0 + 0.75 * z1), `v${(k + 1) % n}`] });
  }
  return { passo: 40, fora: [0, 1, 0], nos, curvas, retalhos: [{ nome: 'poli', borda: curvas.map((c) => c.nome) }], ...extra };
}

describe.each([3, 5])('o retalho de %i lados', (n) => {
  const g = gaiolaPorRede(poligono(n));
  const m = g.retalhos.poli.divisoes / 2;

  it('sai só de quadriláteros, n quadriláteros de m × m em volta de um centro de valência n, declarado', () => {
    expect(g.passo.faces.every((f) => f.length === 4)).toBe(true);
    expect(g.passo.faces).toHaveLength(n * m * m);
    expect(g.retalhos.poli.lados).toBe(n);
    expect(g.retalhos.poli.divisoes % 2).toBe(0);
    const centro = g.extraordinarios.filter((e) => !e.borda);
    expect(centro).toEqual([{ ponto: 'poli.centro', valencia: n, borda: false, retalho: 'poli' }]);
    expect(g.retalhos.poli.centro).toBe('poli.centro');
    for (const f of normaisDasFaces(g)) expect(f[1]).toBeGreaterThan(0);
  });

  it('todos os lados têm as mesmas divisões, par, e o interior fica perto da calota de onde as curvas saíram', () => {
    const lados = g.curvas;
    for (const k of Object.keys(lados)) expect(lados[k].arcos[0].divisoes).toBe(2 * m);
    let pior = 0;
    for (const nome of g.passo.vertices) { const p = g.pontos[nome].map((x) => x * MM); pior = Math.max(pior, Math.abs(p[1] - calota(p[0], p[2]))); }
    expect(pior).toBeLessThan(0.1);
  });

  it('o centro segue a curvatura: cai ao nível da calota a menos de 0,001 mm, e o alisamento do miolo não mexe no retalho de n lados', () => {
    const c = g.pontos['poli.centro'].map((x) => x * MM);
    expect(Math.abs(c[1] - calota(c[0], c[2]))).toBeLessThan(0.001);
    const crua = gaiolaPorRede(poligono(n, 150, { liso: false }));
    expect(g.pontos).toEqual(crua.pontos);
  });

  it('o divisoes par declarado vale, e o ímpar grita', () => {
    const d = gaiolaPorRede(poligono(n, 150, { retalhos: [{ nome: 'poli', borda: poligono(n).curvas.map((c) => c.nome), divisoes: 4 }] }));
    expect(d.retalhos.poli.divisoes).toBe(4);
    expect(d.passo.faces).toHaveLength(n * 4);
    expect(grito(() => gaiolaPorRede(poligono(n, 150, { retalhos: [{ nome: 'poli', borda: poligono(n).curvas.map((c) => c.nome), divisoes: 5 }] })))).toMatch(/precisa ser um número par/);
  });
});

describe('a curva, o vinco, a linha e o peso', () => {
  it('a curva vinco vira vinco nomeado ao longo de todas as arestas dela, e a volta fechada repete o primeiro ponto', () => {
    const g = gaiolaPorRede(duasFaixas({ curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, vinco: 'viva' } : c)) }));
    expect(g.passo.vincos).toEqual([{ nome: 'meio', pontos: g.linha('meio'), nitidez: 'viva' }]);
    const n = gaiolaPorRede(duasFaixas({ curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, vinco: 0.75 } : c)) }));
    expect(n.passo.vincos[0].nitidez).toBe(0.75);
  });

  it('a cota é exata sem peso nem leitura, tem o peso da curva, e o peso da leitura vale onde a curva não diz', () => {
    const exata = gaiolaPorRede(duasFaixas({ interior: false }));
    expect(exata.passo.medidas).toHaveLength(exata.passo.vertices.length - 2 * 9);
    expect(exata.passo.medidas.every((m) => typeof m === 'string')).toBe(true);
    const lida = gaiolaPorRede(duasFaixas({ interior: false, leitura: true, curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, exata: true } : (c.nome === 'esquerda' ? { ...c, peso: 4 } : c))) }));
    const peso = new Map(lida.passo.medidas.map((m) => (typeof m === 'string' ? [m, Infinity] : [m.ponto, m.peso])));
    for (const v of lida.linha('meio')) expect(peso.get(v)).toBe(Infinity);
    for (const v of lida.linha('esquerda').slice(1, -1)) expect(peso.get(v)).toBe(4);
    for (const v of lida.linha('baixo1').slice(1, -1)) expect(peso.get(v)).toBe(1);
    /* no nó A vale o maior peso: baixo1 tem 1 e esquerda 4 */
    expect(peso.get('A')).toBe(4);
    expect(peso.get('B')).toBe(Infinity);
  });

  it('o interior tem o peso declarado, ou nenhuma cota com `interior: false`', () => {
    const g = gaiolaPorRede(duasFaixas());
    const pesos = g.passo.medidas.filter((m) => typeof m !== 'string').map((m) => m.peso);
    expect(new Set(pesos)).toEqual(new Set([1]));
    expect(pesos).toHaveLength(2 * 9);
    const sem = gaiolaPorRede(duasFaixas({ interior: false }));
    expect(sem.passo.medidas.filter((m) => typeof m !== 'string')).toEqual([]);
  });

  it('a leitura avisa dos pontos-chave da mesma curva mais perto do que o erro sustenta, e `estrito` grita', () => {
    const perto = duasFaixas({ leitura: true, curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, pontos: ['B', [200, 0, 10], [200, 0, 20], 'C'] } : c)) });
    const g = gaiolaPorRede(perto);
    expect(g.avisos.filter((a) => a.ref === 'pontosProximos')).toHaveLength(2);
    expect(g.avisos[0].texto).toMatch(/curva 'meio' ficam a 10 mm um do outro, abaixo de 40 mm/);
    expect(grito(() => gaiolaPorRede({ ...perto, leitura: { estrito: true } }))).toMatch(/a leitura é estrita/);
  });

  it('o canto de borda acima do limite de direção sai vivo, e o declarado entra além dos achados', () => {
    const g = gaiolaPorRede(duasFaixas());
    expect(g.passo.cantos).toEqual(expect.arrayContaining(['A', 'D', 'E', 'F']));
    expect(g.passo.cantos).not.toContain('B');
    const com = gaiolaPorRede(duasFaixas({ cantos: ['B'] }));
    expect(com.passo.cantos).toContain('B');
    expect(gaiolaPorRede(duasFaixas({ anguloDeCanto: false })).passo.cantos).toBeUndefined();
  });

  it('a simetria em x passa ao passo, e ponto com x negativo grita', () => {
    expect(gaiolaPorRede(duasFaixas({ simetria: 'x' })).passo.simetria).toBe('x');
    const negativo = duasFaixas({ simetria: 'x', nos: { ...duasFaixas().nos, A: [-5, 0, 0] } });
    expect(grito(() => gaiolaPorRede(negativo))).toMatch(/na simetria em x a rede é a metade x >= 0/);
  });
});

describe('a curva poligonal', () => {
  it('toma os pontos como vértices de uma polilinha: os pontos do arco ficam sobre os trechos retos, e o canto pede nó', () => {
    const rede = (poligonal) => ({
      passo: 60, fora: [0, 1, 0],
      nos: { A: [0, 0, 0], B: [200, 0, 0], C: [200, 0, 200], D: [0, 0, 200], K: [100, 0, 60] },
      curvas: [
        { nome: 'baixo', pontos: ['A', 'K', 'B'], poligonal }, { nome: 'dir', pontos: ['B', 'C'] }, { nome: 'cima', pontos: ['C', 'D'] }, { nome: 'esq', pontos: ['D', 'A'] },
      ],
      retalhos: [{ nome: 'p', borda: ['baixo', 'dir', 'cima', 'esq'] }],
    });
    const reta = gaiolaPorRede(rede(true));
    const suave = gaiolaPorRede(rede(false));
    /* o nó K é o canto da poligonal: cada trecho reto fica sobre a reta de A a K e de K a B */
    const dist = (p, a, b) => { const ab = sub3(b, a); const t = Math.max(0, Math.min(1, dot3(sub3(p, a), ab) / dot3(ab, ab))); return d3(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]); };
    const K = [0.1, 0, 0.06];
    for (const nome of reta.linha('baixo')) {
      const p = reta.pontos[nome];
      expect(Math.min(dist(p, [0, 0, 0], K), dist(p, K, [0.2, 0, 0]))).toBeLessThan(1e-9);
    }
    const pior = Math.max(...suave.linha('baixo').map((nome) => Math.min(dist(suave.pontos[nome], [0, 0, 0], K), dist(suave.pontos[nome], K, [0.2, 0, 0]))));
    expect(pior).toBeGreaterThan(1e-4);
    expect(reta.curvas.baixo.comprimentoMm).toBeCloseTo(2 * Math.hypot(100, 60), 1);
    expect(grito(() => gaiolaPorRede({ ...rede(true), curvas: rede(true).curvas.map((c) => (c.nome === 'baixo' ? { ...c, poligonal: 1 } : c)) }))).toMatch(/aceita poligonal só como true ou false/);
  });
});

describe('os gritos, com os nomes', () => {
  it('o retalho cujos lados não fecham diz as pontas de cada lado', () => {
    const m = grito(() => gaiolaPorRede(duasFaixas({ retalhos: [{ nome: 'p1', borda: ['baixo1', 'cima1', 'meio', 'esquerda'] }, { nome: 'p2', borda: ['baixo2', 'direita', 'cima2', 'meio'] }] })));
    expect(m).toMatch(/os lados do retalho 'p1' não fecham uma volta/);
    expect(m).toMatch(/'baixo1' de 'A' a 'B'/);
  });

  it('curva, nó e retalho inexistentes, repetidos ou mal escritos', () => {
    expect(grito(() => gaiolaPorRede(duasFaixas({ retalhos: [{ nome: 'p1', borda: ['baixo1', 'meio', 'cima1', 'sumiu'] }] })))).toMatch(/cita a curva 'sumiu', que não existe/);
    expect(grito(() => gaiolaPorRede(duasFaixas({ curvas: [...duasFaixas().curvas, { nome: 'meio', pontos: ['B', 'C'] }] })))).toMatch(/o nome de curva 'meio' aparece mais de uma vez/);
    expect(grito(() => gaiolaPorRede(duasFaixas({ curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, pontos: ['B', 'Z'] } : c)) })))).toMatch(/cita o nó 'Z', que não está em nos/);
    expect(grito(() => gaiolaPorRede(duasFaixas({ retalhos: [...duasFaixas().retalhos, { nome: 'p1', borda: ['baixo1', 'meio', 'cima1', 'esquerda'] }] })))).toMatch(/o nome de retalho 'p1' aparece mais de uma vez/);
    expect(grito(() => gaiolaPorRede(duasFaixas({ curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, extra: 1 } : c)) })))).toMatch(/campo desconhecido 'extra'/);
    expect(grito(() => gaiolaPorRede({ ...duasFaixas(), indices: [1] }))).toMatch(/campo desconhecido 'indices'/);
  });

  it('uma aresta de três retalhos, o ponto-chave repetido e o retalho de nove lados', () => {
    const tres = duasFaixas({ retalhos: [...duasFaixas().retalhos, { nome: 'p3', borda: ['baixo1', 'meio', 'cima1', 'esquerda'] }] });
    expect(grito(() => gaiolaPorRede(tres))).toMatch(/é lado de 3 retalhos/);
    expect(grito(() => gaiolaPorRede(duasFaixas({ curvas: duasFaixas().curvas.map((c) => (c.nome === 'meio' ? { ...c, pontos: ['B', [200, 0, 100], [200, 0, 100], 'C'] } : c)) })))).toMatch(/repete o ponto-chave/);
    expect(grito(() => gaiolaPorRede(duasFaixas({ retalhos: [{ nome: 'grande', borda: Array.from({ length: 9 }, () => 'meio') }] })))).toMatch(/precisa de três a 8 lados/);
  });

  it('o nó que depende da curva que depende dele grita', () => {
    const m = grito(() => gaiolaPorRede(duasFaixas({ nos: { ...duasFaixas().nos, B: { curva: 'meio', fracao: 0 } } })));
    expect(m).toMatch(/depende de si mesm/);
  });

  it('a curva fechada sem de e ate num lado grita pedindo os dois', () => {
    const redonda = { passo: 60, fora: [0, 1, 0], nos: { N: [100, 0, 0] }, curvas: [{ nome: 'volta', fechada: true, pontos: ['N', [0, 0, 100], [-100, 0, 0], [0, 0, -100]] }], retalhos: [{ nome: 'r', borda: ['volta', 'volta', 'volta'] }] };
    expect(grito(() => gaiolaPorRede(redonda))).toMatch(/curva fechada 'volta' e precisa de de e ate/);
  });

  it('o canto quase reto que dobra o preenchimento grita com o nó e o ângulo', () => {
    const quase = {
      passo: 60, fora: [0, 1, 0],
      nos: { A: [0, 0, 0], B: [300, 0, 0], C: [600, 0, 15], D: [300, 0, 300] },
      curvas: [{ nome: 'ab', pontos: ['A', 'B'] }, { nome: 'bc', pontos: ['B', 'C'] }, { nome: 'cd', pontos: ['C', 'D'] }, { nome: 'da', pontos: ['D', 'A'] }],
      retalhos: [{ nome: 'torto', borda: ['ab', 'bc', 'cd', 'da'] }],
    };
    const g = (() => { try { return gaiolaPorRede(quase); } catch (e) { return e.message; } })();
    if (typeof g === 'string') expect(g).toMatch(/o preenchimento do retalho 'torto' dobra \d+ face\(s\) perto do nó 'B', onde os lados formam 17\d/);
    else expect(g.avisos.some((a) => a.ref === 'cantoQuaseReto' && a.no === 'B')).toBe(true);
  });
});

describe('é bit a bit', () => {
  it('duas execuções dão a mesma gaiola, e a ordem dos campos do objeto não muda os pontos', () => {
    const a = gaiolaPorRede(duasFaixas()); const b = gaiolaPorRede(duasFaixas());
    const impressao = (g) => sha256Hex(JSON.stringify([g.pontos, g.passo, g.extraordinarios, g.densidades]));
    expect(impressao(a)).toBe(impressao(b));
    const redonda = gaiolaPorRede(poligono(5)); const outra = gaiolaPorRede(poligono(5));
    expect(impressao(redonda)).toBe(impressao(outra));
  });
});
