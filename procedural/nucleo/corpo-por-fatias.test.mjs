/* corpo-por-fatias.test.mjs — o corpo por fatias de contorno livre: volumes de casos de conta fechada, posições de vértice, as réguas de malha e cada recusa. */
import { describe, expect, it } from 'vitest';
import { corpoPorFatias, SEGMENTO_MEDIO_MINIMO_MM, TOLERANCIA_DA_REAMOSTRAGEM_MM } from './corpo-por-fatias.js';
import { medirPeca } from '../../tools/fixtures/costuras-e-furos/medir.mjs';
import { lascasDoNeutro } from '../../tools/modelar/lasca.mjs';

const circ = (r, n, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
const quadrado = (l) => [[0, 0], [l, 0], [l, l], [0, l]];
const marcado = (c, nomes) => c.map((p, k) => (nomes[k] ? { nome: nomes[k], ponto: p } : p));
const receitaDe = (g, niveis = 1) => ({
  PASSOS: [['subdivisao', { origemId: 1, ...g.passo, niveis }], ['parte', { nome: 'corpo', sel: { origem: { op: 'subdivisao', id: 1 } } }]],
  PARAMS: {}, TOPO: { ...g.pontos }, MATERIAIS: {}, ALIASES: [],
});
/* o volume do poliedro da gaiola, em mm³, pelos pontos em mm e as faces por nome */
function volumeDaGaiola(g) {
  let v = 0;
  for (const f of g.passo.faces) {
    const P = f.map((n) => g.pontosMm[n]);
    for (let k = 1; k + 1 < P.length; k++) {
      const [a, b, c] = [P[0], P[k], P[k + 1]];
      v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    }
  }
  return Math.abs(v / 6);
}
const corpo = (extra = {}) => corpoPorFatias({
  nome: 'corpo', eixo: 'x', passo: 10,
  fatias: [
    { em: 0, contorno: [{ nome: 'borda', ponto: [0, -4] }, [5, -3], [6, 0], [4, 4], [0, 5], [-4, 4], [-6, 0], [-5, -3]] },
    { em: 80, contorno: [{ nome: 'borda', ponto: [0, -12] }, [14, -8], [18, 0], [14, 10], [0, 14], [-14, 10], [-18, 0], [-14, -8]] },
    { em: 140, contorno: [{ nome: 'borda', ponto: [0, -7] }, [8, -5], [10, 0], [7, 6], [0, 8], [-7, 6], [-10, 0], [-8, -5]] }],
  vivos: ['borda'], ...extra,
});
const duas = (c0, c1, extra = {}) => corpoPorFatias({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: c0 }, { em: 40, contorno: c1 }], ...extra });

describe('corpoPorFatias: a malha', () => {
  const g = corpo();
  const m = medirPeca(receitaDe(g, 2));

  it('o exemplo da ficha fecha, sem órfão, aresta solta, face degenerada nem face fina, sem aviso, e o corpo vai de uma ponta à outra', () => {
    expect(m.orfaos).toEqual([]);
    expect(m.arestasSoltas).toBe(0);
    expect(m.facesDegeneradas).toBe(0);
    expect(lascasDoNeutro(m.neutro)).toEqual([]);
    expect(g.avisos).toEqual([]);
    expect(g.corpo.planos[0]).toBe(0);
    expect(g.corpo.planos.at(-1)).toBe(140);
    expect(g.corpo.planos).toContain(80);
  });

  it('a malha de contornos muito diferentes, com a ponta pequena, o contorno côncavo no meio e a placa fina, fecha limpa', () => {
    const U = [[0, 0], [30, 0], [30, 20], [20, 20], [20, 5], [10, 5], [10, 20], [0, 20]];
    const casos = [
      corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 24, fatias: [{ em: 0, contorno: circ(80, 24) }, { em: 10, contorno: circ(0.3, 24) }] }),
      corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: quadrado(30).slice(0, 4) }, { em: 20, contorno: U }, { em: 40, contorno: quadrado(30) }] }),
      corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 64, fatias: [{ em: 0, contorno: [[0, 0], [300, 0], [300, 0.3], [0, 0.3]] }, { em: 2.5, contorno: [[0, 0], [300, 0], [300, 0.3], [0, 0.3]] }] }),
    ];
    for (const c of casos) {
      const r = medirPeca(receitaDe(c, 2));
      expect(r.arestasSoltas).toBe(0);
      expect(r.facesDegeneradas).toBe(0);
      expect(lascasDoNeutro(r.neutro)).toEqual([]);
    }
  });

  it('a tampa de um contorno de lados retos com pontos de sobra sobre eles (o heptágono em 40 pontos, o retângulo em 24) fecha sem face fina', () => {
    for (const [c, n] of [[circ(30, 7), 40], [quadrado(30), 24]]) {
      const r = medirPeca(receitaDe(corpoPorFatias({ nome: 'c', eixo: 'x', pontos: n, fatias: [{ em: 0, contorno: c }, { em: 20, contorno: c }] }), 2));
      expect(r.arestasSoltas).toBe(0);
      expect(r.facesDegeneradas).toBe(0);
      expect(lascasDoNeutro(r.neutro)).toEqual([]);
    }
  });

  it('o corpo com os eixos y e z também fecha', () => {
    for (const eixo of ['y', 'z']) {
      const r = medirPeca(receitaDe(corpoPorFatias({ nome: 'c', eixo, fatias: [{ em: 0, contorno: circ(5, 12) }, { em: 20, contorno: circ(7, 12, 1, 0) }] }), 1));
      expect(r.arestasSoltas, eixo).toBe(0);
      expect(r.facesDegeneradas, eixo).toBe(0);
    }
  });

  it('é determinístico, bit a bit', () => {
    expect(JSON.stringify(corpo().pontos)).toBe(JSON.stringify(g.pontos));
    expect(JSON.stringify(corpo().passo)).toBe(JSON.stringify(g.passo));
  });
});

describe('corpoPorFatias: contas fechadas', () => {
  it('o prisma de seção constante tem o volume área vezes comprimento, e o tronco de pirâmide, linear, o de L/3 (A1 + A2 + raiz de A1 A2)', () => {
    const marcos = ['a', 'b', 'c', 'd'];
    const prisma = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, passo: 100, fatias: [{ em: 0, contorno: marcado(quadrado(10), marcos) }, { em: 30, contorno: marcado(quadrado(10), marcos) }] });
    expect(volumeDaGaiola(prisma)).toBeCloseTo(3000, 6);
    const tronco = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, passo: 100, interpolacao: 'linear', fatias: [{ em: 0, contorno: marcado(quadrado(10), marcos) }, { em: 60, contorno: marcado(quadrado(20), marcos) }] });
    expect(volumeDaGaiola(tronco)).toBeCloseTo((60 / 3) * (100 + 400 + 200), 6);
  });

  it('o prisma de contorno côncavo em L tem a área vezes o comprimento, com a tampa em escada cobrindo o L', () => {
    const L = [[20, 0], [20, 10], [10, 10], [10, 20], [0, 20], [0, 0]];
    const nomes = ['a', 'b', 'c', 'd', 'e', 'f'];
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 12, passo: 100, fatias: [{ em: 0, contorno: marcado(L, nomes) }, { em: 40, contorno: marcado(L, nomes) }] });
    expect(volumeDaGaiola(g)).toBeCloseTo(300 * 40, 6);
    const comeco0 = [[0, 0], [20, 0], [20, 10], [10, 10], [10, 20], [0, 20]];
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 12, passo: 100, fatias: [{ em: 0, contorno: comeco0 }, { em: 40, contorno: comeco0 }] })).toThrow(/não cobre o contorno/);
  });

  it('o mesmo quadrado dado com 4 pontos numa fatia e com 8 (os meios dos lados) na outra dá o mesmo prisma: os pontos de menos e de mais não mudam a forma', () => {
    const q8 = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10], [5, 10], [0, 10], [0, 5]];
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, passo: 100, fatias: [{ em: 0, contorno: marcado(quadrado(10), ['a', 'b', 'c', 'd']) }, { em: 30, contorno: marcado(q8, ['a', null, 'b', null, 'c', null, 'd', null]) }] });
    expect(volumeDaGaiola(g)).toBeCloseTo(3000, 6);
    expect(g.avisos.filter((a) => a.ref === 'pontoPerdido')).toEqual([]);
  });

  it('a interpolação suave passa pelo valor de Hermite no meio do vão (5,8333) e a linear por 5, e a suave não passa dos valores das fatias', () => {
    const fatias = [0, 10, 12].map((u, k) => ({ em: k * 50, contorno: marcado([[u, 0], [u + 10, 0], [u + 10, 10], [u, 10]], ['a', 'b', 'c', 'd']) }));
    const suave = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, passo: 25, fatias });
    const linear = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, passo: 25, interpolacao: 'linear', fatias });
    const em25 = (g) => g.pontosMm[g.pontoDe(g.corpo.planos.indexOf(25), 'a')][1];
    expect(em25(suave)).toBeCloseTo(5.8333333, 5);
    expect(em25(linear)).toBeCloseTo(5, 9);
    const mais = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, passo: 2.5, fatias });
    for (const x of mais.corpo.planos) {
      const u = mais.pontosMm[mais.pontoDe(mais.corpo.planos.indexOf(x), 'a')][1];
      expect(u).toBeGreaterThanOrEqual(0 - 1e-9);
      expect(u).toBeLessThanOrEqual(12 + 1e-9);
    }
  });
});

describe('corpoPorFatias: posições e nomes', () => {
  it('o marco fica exato em todas as fatias e nos planos de fora, com u e v nos eixos certos para x, y e z', () => {
    for (const [eixo, monta] of [['x', (em, u, v) => [em, u, v]], ['y', (em, u, v) => [u, em, v]], ['z', (em, u, v) => [u, v, em]]]) {
      const g = corpoPorFatias({
        nome: 'c', eixo, passo: 10,
        fatias: [{ nome: 'raiz', em: 0, contorno: marcado(circ(10, 12), ['bordo']) }, { nome: 'ponta', em: 50, contorno: marcado(circ(6, 20, 3, 1), ['bordo']) }],
      });
      const k = g.pontoDe('raiz', 'bordo');
      expect(g.pontosMm[k]).toEqual(monta(0, 10, 0));
      expect(g.pontosMm[g.pontoDe('ponta', 'bordo')].map((x) => Number(x.toFixed(9)))).toEqual(monta(50, 9, 1));
      const meio = g.pontosMm[g.pontoDe(`${eixo}20`, 'bordo')];
      expect(meio[{ x: 0, y: 1, z: 2 }[eixo]]).toBe(20);
    }
  });

  it('pontoDe devolve o nome do ponto de cada índice, que existe na gaiola, e o marco é o do índice dele; a âncora sem nome é inicio', () => {
    const g = corpo();
    const N = g.corpo.pontosPorVolta;
    const todos = new Set(Object.keys(g.pontos));
    for (let i = 0; i < N; i++) expect(todos.has(g.pontoDe('f1', i)), `índice ${i}`).toBe(true);
    expect(new Set(Array.from({ length: N }, (_, i) => g.pontoDe('f1', i))).size).toBe(N);
    expect(g.pontoDe('f1', 'borda')).toBe(g.pontoDe('f1', g.corpo.marcos.borda));
    expect(g.corpo.marcos.borda).toBe(0);
    expect(g.pontosMm[g.pontoDe('f1', 'borda')]).toEqual([80, 0, -12]);
    expect(corpoPorFatias({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: circ(5, 8) }, { em: 20, contorno: circ(5, 8) }] }).corpo.marcos).toEqual({ inicio: 0 });
    expect(g.pontoDe(0, 0)).toBe(g.pontoDe('f0', 0));
    expect(g.pontoDe('x10', 3)).toMatch(/^corpo_x10_p3_0$/);
  });

  it('os marcos recebem os pontos pela fração do perímetro de cada volta, em média nas fatias, no mínimo um cada, e o total é o pedido', () => {
    const oct = (k) => marcado(circ(10, 8), circ(10, 8).map((_, i) => (i === k ? 'B' : null)));
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, passo: 100, fatias: [{ em: 0, contorno: oct(4) }, { em: 30, contorno: oct(2) }] });
    expect(g.corpo.marcos).toEqual({ inicio: 0, B: 6 });
    const miudos = (n) => corpoPorFatias({ nome: 'c', eixo: 'x', pontos: n, passo: 100, fatias: [0, 30].map((em) => ({ em, contorno: marcado(circ(60, 120), circ(60, 120).map((_, i) => ({ 10: 'a', 11: 'b', 12: 'c', 13: 'd' })[i] ?? null)) })) });
    const m16 = miudos(16);
    expect(Object.values(m16.corpo.marcos)).toEqual([0, 1, 2, 3, 4]);
    expect(Object.keys(m16.pontosMm).filter((k) => k.startsWith('c_f0_')).length).toBe(16);
    /* a volta grande ficou com 12 segmentos (14 menos os 2 que o mínimo de um por volta pequena tomou), e o último ponto cai a 11/12 dela, perto de 333 graus; com 14 cairia a 291 */
    const ultimo = m16.pontosMm[m16.pontoDe(0, 15)];
    const graus = ((Math.atan2(ultimo[2], ultimo[1]) * 180) / Math.PI + 360) % 360;
    expect(graus).toBeGreaterThan(320);
    expect(graus).toBeLessThan(335);
    const m8 = miudos(8);
    expect(Object.values(m8.corpo.marcos)).toEqual([0, 1, 2, 3, 4]);
    expect(Object.keys(m8.pontosMm).filter((k) => k.startsWith('c_f0_')).length).toBe(8);
  });

  it('a grade de planos tem as fatias e os pontos do passo, sem nenhum a menos de um passo de outro, e as fatias a menos de um passo entram', () => {
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', passo: 10, fatias: [{ em: 0, contorno: circ(5, 8) }, { em: 14, contorno: circ(5, 8) }, { em: 40, contorno: circ(5, 8) }] });
    expect(g.corpo.planos).toEqual([0, 14, 30, 40]);
    const padrao = corpoPorFatias({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: circ(5, 8) }, { em: 400, contorno: circ(5, 8) }] });
    expect(padrao.corpo.planos[1] - padrao.corpo.planos[0]).toBe(10);
  });

  it('o laço de um plano que não é fatia se chama pelo eixo e a posição, com o ponto decimal em _ e o sinal de menos em m', () => {
    const g = corpoPorFatias({ nome: 'c', eixo: 'y', passo: 12.5, fatias: [{ em: -30, contorno: circ(5, 8) }, { em: 10, contorno: circ(5, 8) }] });
    expect(g.lacos.map((l) => l.nome)).toEqual(['f0', 'ym17_5', 'ym5', 'f1']);
  });

  it('o ponto de índice 0 é a âncora e os marcos de ordem trocada recebem os índices na ordem da volta', () => {
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [0, 30].map((em) => ({ em, contorno: marcado(circ(10, 16), [null, null, 'cima', null, null, null, 'lado']) })) });
    expect(g.corpo.marcos.inicio).toBe(0);
    expect(g.corpo.marcos.cima).toBe(2);
    expect(g.corpo.marcos.lado).toBe(6);
    expect(g.pontosMm[g.pontoDe(0, 'cima')]).toEqual([0, ...circ(10, 16)[2]]);
  });

  it('os pontos da volta, por padrão, são os do maior contorno em par, no mínimo 16 e no máximo 64', () => {
    const com = (n) => corpoPorFatias({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: circ(30, n) }, { em: 20, contorno: circ(30, n) }] }).corpo.pontosPorVolta;
    expect(com(5)).toBe(16);
    expect(com(40)).toBe(40);
    expect(com(41)).toBe(42);
    expect(com(100)).toBe(64);
  });

  it('os grupos tampaInicio, tampaFim e entre_<a>_<b> vão no passo, e as tampas têm as faces da escada', () => {
    const g = corpo();
    expect(g.passo.grupos.map((x) => x.nome)).toEqual(['tampaInicio', 'tampaFim', 'entre_f0_f1', 'entre_f1_f2']);
    const ini = g.passo.grupos[0].pontos;
    expect(ini.length).toBe(g.corpo.pontosPorVolta);
    expect(ini.every((n) => n.startsWith('corpo_f0_'))).toBe(true);
    expect(g.passo.grupos[1].pontos.every((n) => n.startsWith('corpo_f2_'))).toBe(true);
    expect(g.passo.grupos[2].pontos.every((n) => /^corpo_(f0|f1|x\d+)_/.test(n))).toBe(true);
    const m = medirPeca({ ...receitaDe(g, 1), PASSOS: [['subdivisao', { origemId: 1, ...g.passo, niveis: 1 }], ['parte', { nome: 'ponta', sel: { origem: { op: 'subdivisao', id: 1, grupo: 'tampaFim' } } }]] });
    expect(m.arestasSoltas).toBe(0);
  });

  it('com vivos, o passo traz o vinco vivo entre os trechos do marco, e sem vivos não traz nenhum', () => {
    const g = corpo();
    expect(g.passo.vincos.map((v) => [v.nome, v.nitidez])).toEqual([['vivo_borda', 'viva']]);
    expect(corpo({ vivos: undefined }).passo.vincos ?? []).toEqual([]);
    const inicio = corpoPorFatias({ nome: 'c', eixo: 'x', vivos: ['inicio'], fatias: [{ em: 0, contorno: circ(5, 8) }, { em: 20, contorno: circ(5, 8) }] });
    expect(inicio.passo.vincos.length).toBe(1);
    expect(medirPeca(receitaDe(inicio, 1)).arestasSoltas).toBe(0);
  });
});

describe('corpoPorFatias: nada some em silêncio', () => {
  const fatias = (n, pontos) => [{ em: 0, contorno: circ(30, n) }, { em: 50, contorno: circ(30, n) }].map((f) => ({ ...f, contorno: f.contorno }));
  it('os pontos dados que a volta reamostrada deixa longe saem em avisos, com a fatia, a quantidade, o pior e o remédio; a volta que os guarda não avisa', () => {
    const pobre = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, fatias: fatias(40) });
    const aviso = pobre.avisos.find((a) => a.ref === 'pontoPerdido' && a.fatia === 'f0');
    expect(aviso).toBeTruthy();
    expect(aviso.quantos).toBeGreaterThan(0);
    expect(aviso.distanciaMm).toBeGreaterThan(0.1);
    expect(aviso.texto).toMatch(/suba pontos, ou nomeie esse ponto/);
    expect(pobre.corpo.perdas[0].perdidos).toBe(aviso.quantos);
    expect(pobre.corpo.fatias[0]).toMatchObject({ pontosDados: 40, perdidos: aviso.quantos });
    const rica = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 40, fatias: fatias(40) });
    expect(rica.avisos.filter((a) => a.ref === 'pontoPerdido')).toEqual([]);
    expect(rica.corpo.perdas.map((p) => p.perdidos)).toEqual([0, 0]);
  });

  it('tolerancia larga cala o aviso e tolerancia curta o traz; o canto nomeado como marco nunca é perdido', () => {
    expect(corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, tolerancia: 50, fatias: fatias(40) }).avisos.filter((a) => a.ref === 'pontoPerdido')).toEqual([]);
    expect(corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 40, tolerancia: 1e-6, fatias: fatias(40) }).avisos.filter((a) => a.ref === 'pontoPerdido')).toEqual([]);
    const uma = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, tolerancia: 0.001, fatias: fatias(40) });
    expect(uma.avisos.filter((a) => a.ref === 'pontoPerdido').length).toBe(2);
    const pico = [[0, 0], [10, 0], [10.3, 7.7], [10, 10], [0, 10]];
    const comMarco = marcado(pico, [null, null, 'pico']);
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, fatias: [{ em: 0, contorno: comMarco }, { em: 30, contorno: comMarco }] });
    expect(g.pontosMm[g.pontoDe(0, 'pico')]).toEqual([0, 10.3, 7.7]);
    expect(g.avisos.filter((a) => a.ref === 'pontoPerdido')).toEqual([]);
  });

  it('dois vértices a um milímetro um do outro disputam um ponto só: o primeiro fica, e o segundo não o rouba', () => {
    const c = [[0, 0], [50, 0], [50, 1], [100, 3], [100, 10], [0, 10]];
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: c }, { em: 30, contorno: c }] })).not.toThrow();
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: c }, { em: 30, contorno: c }] });
    const pts = Array.from({ length: 16 }, (_, i) => g.pontosMm[g.pontoDe(0, i)]);
    expect(pts.some((p) => Math.abs(p[1] - 50) < 1e-9 && Math.abs(p[2]) < 1e-9)).toBe(true);
  });

  it('o vértice dado cai no lugar de um ponto da volta quando cabe: o quadrado de 4 pontos em 16 não perde um canto', () => {
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: quadrado(10) }, { em: 30, contorno: quadrado(10) }] });
    expect(g.avisos.filter((a) => a.ref === 'pontoPerdido')).toEqual([]);
    const cantos = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const pts = Array.from({ length: 16 }, (_, i) => g.pontosMm[g.pontoDe(0, i)]);
    for (const [u, v] of cantos) expect(pts.some((p) => Math.abs(p[1] - u) < 1e-9 && Math.abs(p[2] - v) < 1e-9)).toBe(true);
  });
});

describe('corpoPorFatias: os cantos', () => {
  const noLaco = (g, r = 0) => Array.from({ length: g.corpo.pontosPorVolta }, (_, i) => g.pontosMm[g.pontoDe(r, i)]);
  const tem = (pts, u, v) => pts.some((p) => Math.abs(p[1] - u) < 1e-9 && Math.abs(p[2] - v) < 1e-9);

  it('todo vértice em que o contorno gira mais que o ângulo de canto é ponto da volta, sem aviso: o retângulo fino e a engrenagem de 12 cantos', () => {
    const r = [[0, 0], [100, 0], [100, 5], [0, 5]];
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: r }, { em: 30, contorno: r }] });
    for (const [u, v] of r) expect(tem(noLaco(g), u, v), `${u},${v}`).toBe(true);
    expect(g.avisos.filter((a) => ['pontoPerdido', 'cantoPerdido'].includes(a.ref))).toEqual([]);
    const estrela = Array.from({ length: 12 }, (_, i) => { const raio = i % 2 ? 6 : 10; const a = (Math.PI * 2 * i) / 12; return [raio * Math.cos(a), raio * Math.sin(a)]; });
    const e = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: estrela }, { em: 30, contorno: estrela }] });
    for (const [u, v] of estrela) expect(tem(noLaco(e), u, v), `${u},${v}`).toBe(true);
    expect(e.avisos.filter((a) => a.ref === 'cantoPerdido')).toEqual([]);
  });

  it('com cantos demais para as amostras o aviso cantoPerdido diz quantos faltam e quantos pontos bastam, e com esse número o aviso some', () => {
    const estrela = Array.from({ length: 10 }, (_, i) => { const raio = i % 2 ? 4 : 10; const a = (Math.PI * 2 * i) / 10; return [raio * Math.cos(a), raio * Math.sin(a)]; });
    const pobre = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, fatias: [{ em: 0, contorno: estrela }, { em: 30, contorno: estrela }] });
    const aviso = pobre.avisos.find((a) => a.ref === 'cantoPerdido' && a.fatia === 'f0');
    expect(aviso).toMatchObject({ quantos: 2, pontosQueBastam: 10 });
    expect(aviso.texto).toMatch(/2 cantos \(giro acima de 20 graus\) ficam sem ponto na volta de 8 pontos; com pontos de 10 para cima todos cabem/);
    const rica = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 10, fatias: [{ em: 0, contorno: estrela }, { em: 30, contorno: estrela }] });
    expect(rica.avisos.filter((a) => a.ref === 'cantoPerdido')).toEqual([]);
    for (const [u, v] of estrela) expect(tem(noLaco(rica), u, v)).toBe(true);
  });

  it('anguloDeCanto declara o giro: com 100 graus o canto de 90 deixa de ser ponto e o retângulo perde cantos com aviso', () => {
    const r = [[0, 0], [100, 0], [100, 5], [0, 5]];
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, anguloDeCanto: 100, fatias: [{ em: 0, contorno: r }, { em: 30, contorno: r }] });
    expect(g.avisos.filter((a) => a.ref === 'pontoPerdido').length).toBe(2);
    for (const v of [0, 180, 'a', -5]) expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', anguloDeCanto: v, fatias: [{ em: 0, contorno: r }, { em: 30, contorno: r }] })).toThrow(/anguloDeCanto é o giro em graus, de 0 a 180/);
  });

  it('a volta entre marcos reserva ao menos um ponto por canto dela, mesmo com pouca fração do perímetro', () => {
    const c = [[0, 0], [100, 0], [100, 10], [60, 10], [60, 12], [58, 12], [58, 10], [0, 10]];
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: c }, { em: 30, contorno: c }] });
    for (const [u, v] of c) expect(tem(noLaco(g), u, v), `${u},${v}`).toBe(true);
  });
});

describe('corpoPorFatias: o corpo que afina', () => {
  const circ16 = circ(10, 16);
  const girar = (c, g) => { const a = (g * Math.PI) / 180; return c.map(([u, v]) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)]); };
  const com = (g, extra = {}) => corpoPorFatias({ nome: 'c', eixo: 'x', passo: 20, pontos: 16, ...extra, fatias: [{ em: 0, contorno: circ16 }, { em: 40, contorno: girar(circ16, g) }] });

  it('a âncora girada avisa quando a área do meio cai abaixo da fração, com as fatias, a área e o conserto; sem giro não avisa', () => {
    expect(com(0).avisos.filter((a) => a.ref === 'corpoAfina')).toEqual([]);
    expect(com(10).avisos.filter((a) => a.ref === 'corpoAfina')).toEqual([]);
    const a = com(45).avisos.find((x) => x.ref === 'corpoAfina');
    expect(a).toMatchObject({ fatias: ['f0', 'f1'], em: 20, areaMenorDasFatiasMm2: 306.1 });
    expect(a.areaMm2).toBeCloseTo(261.3, 1);
    expect(a.razao).toBeCloseTo(0.854, 2);
    expect(a.texto).toMatch(/entre as fatias 'f0' e 'f1', o plano em 20 mm tem área 261,3 mm², 85% da menor das duas fatias \(306,1 mm²\), abaixo de 90%.*nomeie os marcos que correspondem/);
    expect(com(90).avisos.find((x) => x.ref === 'corpoAfina').areaMm2).toBeCloseTo(153.1, 1);
  });

  it('areaMinimaDoMeio declara a fração: 0 desliga, 0,8 deixa passar os 85%, e fora de 0 a 1 é recusado', () => {
    expect(com(45, { areaMinimaDoMeio: 0 }).avisos.filter((x) => x.ref === 'corpoAfina')).toEqual([]);
    expect(com(45, { areaMinimaDoMeio: 0.8 }).avisos.filter((x) => x.ref === 'corpoAfina')).toEqual([]);
    expect(com(45, { areaMinimaDoMeio: 0.86 }).avisos.filter((x) => x.ref === 'corpoAfina').length).toBe(1);
    for (const v of [-0.1, 1.5, 'a']) expect(() => com(0, { areaMinimaDoMeio: v })).toThrow(/areaMinimaDoMeio é a fração, de 0 a 1/);
  });

  it('o aviso é um por par de fatias, o do plano de menor área, e só conta o par que afina', () => {
    const tres = corpoPorFatias({ nome: 'c', eixo: 'x', passo: 10, pontos: 16, fatias: [{ em: 0, contorno: circ16 }, { em: 40, contorno: girar(circ16, 90) }, { em: 80, contorno: girar(circ16, 90) }] });
    const avisos = tres.avisos.filter((x) => x.ref === 'corpoAfina');
    expect(avisos.length).toBe(1);
    expect(avisos[0].fatias).toEqual(['f0', 'f1']);
    expect(avisos[0].em).toBe(20);
  });
});

describe('corpoPorFatias: o que a gaiola diz, nos termos da operação', () => {
  const tri = circ(10, 3);
  const prisma = (n) => ({ nome: 'c', eixo: 'x', pontos: n, fatias: [{ em: 0, contorno: tri }, { em: 40, contorno: tri }] });

  it('recusa a gaiola com face fina em entradas reais, sem a palavra `some` e com os pontos e o remédio desta operação', () => {
    for (const o of [prisma(32), prisma(48), { nome: 'c', eixo: 'x', pontos: 32, fatias: [{ em: 0, contorno: tri }, { em: 40, contorno: circ(10, 200) }] }]) {
      let msg;
      try { corpoPorFatias(o); } catch (e) { msg = e.message; }
      expect(msg, JSON.stringify(o.pontos)).toMatch(/^corpoPorFatias: a gaiola sai com \d+ faces? finas?, a pior com área de 0,00\d+ vezes o quadrado da maior aresta \(o limite é 0,005\), perto dos pontos de índice [\d, ]+ da volta de \d+ pontos; .*use menos pontos \(o contorno dado tem até \d+\)/);
      expect(msg).not.toMatch(/some|trecho|gaiolaPorLacos/);
    }
    expect(() => corpoPorFatias(prisma(24))).not.toThrow();
  });

  it('o aviso amostragemDesigual sai com o índice do ponto, sem falar de trecho', () => {
    const U = [[0, 0], [30, 0], [30, 20], [20, 20], [20, 5], [10, 5], [10, 20], [0, 20]];
    const Q = [[0, 0], [30, 0], [30, 20], [0, 20]];
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: Q }, { em: 20, contorno: U }, { em: 40, contorno: Q }] });
    const a = g.avisos.find((x) => x.ref === 'amostragemDesigual');
    expect(a).toBeTruthy();
    expect(Number.isInteger(a.indice)).toBe(true);
    expect(a.texto).toMatch(/^amostragem desigual no ponto \d+ da volta do laço '[fx][\w]*': o segmento antes dele e o depois diferem na razão [\d,]+, acima de 4, .*nomeie esse ponto como marco/);
    expect(a.texto).not.toMatch(/trecho|'p\d+_'/);
  });
});

describe('corpoPorFatias: o que os estragos mostraram', () => {
  const dist = (p, a, b) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const q = dx * dx + dy * dy;
    const t = q > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / q)) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  };
  const voltaDe = (g, r = 0) => Array.from({ length: g.corpo.pontosPorVolta }, (_, i) => g.pontosMm[g.pontoDe(r, i)].slice(1));

  it('a fração do perímetro de cada volta é normalizada pelo perímetro da própria fatia: duas escalas, o marco a meia volta e a um quarto, dá 0,375 de 16 = 6', () => {
    const oct = (k, e) => marcado(circ(10 * e, 8), circ(8, 8).map((_, i) => (i === k ? 'B' : null)));
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, passo: 100, fatias: [{ em: 0, contorno: oct(4, 1) }, { em: 30, contorno: oct(2, 3) }] });
    expect(g.corpo.marcos.B).toBe(6);
  });

  it('o ponto dado sobre um segmento da volta, longe dos pontos dela, não é perdido: a distância é ao segmento, e não ao ponto mais perto', () => {
    const c = [[0, 0], [20, 0], [40, 0], [40, 10], [0, 10]];
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 8, fatias: [{ em: 0, contorno: c }, { em: 30, contorno: c }] });
    expect(voltaDe(g).some((p) => Math.hypot(p[0] - 20, p[1]) < 1)).toBe(false);
    expect(g.avisos.filter((a) => a.ref === 'pontoPerdido')).toEqual([]);
  });

  it('o aviso traz o pior ponto perdido (a maior distância e o primeiro índice dela), medida ao polígono da volta', () => {
    const c = circ(30, 40);
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, tolerancia: 0.001, fatias: [{ em: 0, contorno: c }, { em: 30, contorno: c }] });
    const volta = voltaDe(g);
    const d = c.map((p) => Math.min(...volta.map((q, i) => dist(p, q, volta[(i + 1) % volta.length]))));
    const pior = Math.max(...d);
    const aviso = g.avisos.find((a) => a.ref === 'pontoPerdido' && a.fatia === 'f0');
    expect(aviso.distanciaMm).toBeCloseTo(pior, 3);
    expect(aviso.indice).toBe(d.findIndex((x) => Math.abs(x - pior) < 1e-9));
    expect(g.corpo.perdas[0].pior.distanciaMm).toBeCloseTo(pior, 3);
    expect(aviso.quantos).toBe(d.filter((x) => x > 0.001).length);
  });

  it('a tolerância padrão é 0,1 mm: um ponto a 0,3 mm da volta avisa, sem declarar a tolerância', () => {
    expect(TOLERANCIA_DA_REAMOSTRAGEM_MM).toBe(0.1);
    const c = circ(30, 40);
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: c }, { em: 30, contorno: c }] });
    expect(g.corpo.perdas[0].pior.distanciaMm).toBeGreaterThan(0.1);
    expect(g.corpo.perdas[0].pior.distanciaMm).toBeLessThan(1);
    expect(g.avisos.some((a) => a.ref === 'pontoPerdido')).toBe(true);
  });

  it('corpo.fatias[i].laco é a posição do laço da fatia entre todos os planos, e nao o índice da fatia', () => {
    const g = corpoPorFatias({ nome: 'c', eixo: 'x', passo: 10, pontos: 8, fatias: [0, 20, 40].map((em) => ({ em, contorno: circ(5, 8) })) });
    expect(g.corpo.planos).toEqual([0, 10, 20, 30, 40]);
    expect(g.corpo.fatias.map((f) => f.laco)).toEqual([0, 2, 4]);
    expect(g.lacos.map((l) => l.nome)).toEqual(['f0', 'x10', 'f1', 'x30', 'f2']);
  });

  it('um degrau da escada que sai do contorno por 0,05 mm, bem menos que 1% da área, ainda é recusado', () => {
    const c = [[15, 29.95], [0, 30], [0, 0], [30, 0], [30, 30]];
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: c }, { em: 20, contorno: c }] })).toThrow(/o degrau 0 da escada, que liga o ponto 1 ao 0 e o 2 ao 15, sai do contorno/);
  });

  it('o ponto repetido a 0,5 µm do anterior é recusado: o limite é 1 µm, e não um décimo dele', () => {
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: [[0, 0], [4, 0], [4, 0.0005], [4, 4], [0, 4]] }, { em: 20, contorno: quadrado(4) }] })).toThrow(/o ponto 2 repete o ponto 1/);
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: [[0, 0], [4, 0], [4, 0.002], [4, 4], [0, 4]] }, { em: 20, contorno: [[0, 0], [4, 0], [4, 0.002], [4, 4], [0, 4]] }] })).not.toThrow(/repete/);
  });
});

describe('corpoPorFatias: as recusas', () => {
  const ok = (f = {}) => ({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: circ(5, 8) }, { em: 20, contorno: circ(5, 8) }], ...f });
  const com = (i, mudanca) => { const o = ok(); o.fatias[i] = { ...o.fatias[i], ...mudanca }; return o; };
  const recusa = (o, re) => expect(() => corpoPorFatias(o)).toThrow(re);

  it('recusa o que não é opção: nome, eixo, fatias, interpolacao, tolerancia, passo e vivos, dizendo o recebido', () => {
    recusa(ok({ nome: '' }), /nome é o prefixo/);
    recusa(ok({ eixo: 'w' }), /^corpoPorFatias: eixo é 'x', 'y' ou 'z', e veio "w"/);
    recusa(ok({ eixo: undefined }), /^corpoPorFatias: eixo é/);
    recusa(ok({ fatias: [ok().fatias[0]] }), /ao menos duas.*1 fatia/);
    recusa(ok({ fatias: undefined }), /ao menos duas/);
    recusa(ok({ interpolacao: 'cubica' }), /'suave' ou 'linear', e veio "cubica"/);
    recusa(ok({ tolerancia: 0 }), /tolerancia é número positivo/);
    recusa(ok({ passo: 1 }), /passo é número em mm de 2,5 para cima.*veio 1/);
    recusa(ok({ vivos: 'borda' }), /vivos é a lista de nomes de marco/);
    recusa(ok({ vivos: ['inicio', 'inicio'] }), /vivos cita o marco 'inicio' mais de uma vez/);
    recusa(ok({ vivos: ['nada'] }), /vivos cita o marco 'nada'.*'inicio'/);
  });

  it('recusa a fatia mal formada: sem em, sem nome, sem contorno, com ponto que não é par finito, e o nome repetido', () => {
    recusa(com(0, { em: 'a' }), /fatias\[0\]\.em é a posição.*veio "a"/);
    recusa(com(1, { nome: '' }), /fatias\[1\]\.nome é texto não vazio/);
    recusa(com(0, { contorno: [[0, 0], [1, 0]] }), /contorno é a lista dos pontos.*2 pontos.*uma fatia de um ponto só não fecha/);
    recusa(com(0, { contorno: [[0, 0]] }), /1 ponto;/);
    recusa(com(0, { contorno: 'x' }), /contorno é a lista dos pontos/);
    recusa(com(0, { contorno: [[0, 0], [1, 0], [1, NaN]] }), /o ponto 2 é \[u, v\]/);
    recusa(com(0, { contorno: [[0, 0], [1, 0], { nome: 'a' }] }), /o ponto 2 é \[u, v\]/);
    recusa(com(0, { contorno: [[0, 0], [1, 0], { nome: '', ponto: [1, 1] }] }), /nome de marco é texto não vazio/);
    recusa(com(0, { contorno: [[0, 0], { nome: 'a', ponto: [4, 0] }, { nome: 'a', ponto: [4, 4] }, [0, 4]] }), /nome de marco 'a' aparece em dois pontos/);
    recusa(com(0, { contorno: [[0, 0], { nome: 'inicio', ponto: [4, 0] }, [4, 4], [0, 4]] }), /'inicio' é o nome da âncora/);
    recusa(com(1, { nome: 'f0' }), /nome de fatia 'f0' aparece duas vezes/);
  });

  it('recusa fatias fora de ordem, na mesma posição ou a menos de 2,5 mm, com a distância', () => {
    recusa(com(1, { em: -5 }), /não está à frente dela \(-5 mm\).*ordem crescente/);
    recusa(com(1, { em: 0 }), /não está à frente dela \(0 mm\)/);
    recusa(com(1, { em: 2 }), /fica a 2 mm da fatia anterior.*mínimo de 2,5 mm/);
    expect(() => corpoPorFatias(com(1, { em: 2.5 }))).not.toThrow();
    recusa(com(1, { em: 1 }), /fica a 1 mm da fatia anterior.*um corpo de 1 mm de comprimento é uma chapa, e chapaDeContorno/);
    expect(() => corpoPorFatias({ ...ok(), fatias: [ok().fatias[0], { em: 2, contorno: circ(5, 8) }, { em: 10, contorno: circ(5, 8) }] })).toThrow(/^(?!.*chapaDeContorno)/);
  });

  it('recusa o ponto repetido, o último igual ao primeiro, a ponta que volta sobre si e a área zero, nomeando o ponto', () => {
    recusa(com(0, { contorno: [[0, 0], [4, 0], [4, 0], [4, 4], [0, 4]] }), /o ponto 2 repete o ponto 1/);
    recusa(com(0, { contorno: [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]] }), /o ponto 0 repete o ponto 4.*não repete o primeiro ponto no fim/);
    recusa(com(0, { contorno: [[0, 0], [4, 0], [0.0004, 0], [4, 4]] }), /ponto 2 repete|volta sobre o lado anterior|se tocam/);
    recusa(com(0, { contorno: [[0, 0], [4, 0], [2, 0]] }), /área 0 mm²|volta sobre o lado anterior/);
    recusa(com(0, { contorno: [[0, 0], [4, 0], [8, 0], [2, 0]] }), /área|volta sobre/);
    recusa(com(0, { contorno: [[0, 0], [4, 0], [4, 4], [4, 0.0005 + 1]].slice(0, 3).concat([[4, 2]]) }), /volta sobre o lado anterior/);
    recusa(com(0, { contorno: [[0, 0], [1, 1], [2, 2], [3, 3]] }), /área 0 mm², os pontos estão numa reta/);
  });

  it('recusa o contorno horário com a área negativa, e o que se cruza ou se toca com os lados', () => {
    recusa(com(0, { contorno: circ(5, 8).reverse() }), /contorno é horário \(área -.*mm², negativa/);
    recusa(com(0, { contorno: [[0, 0], [10, 5], [10, 0], [0, 6]] }), /lado 0 .* e o lado 2 .* se cruzam ou se tocam/);
    recusa(com(0, { contorno: [[0, 0], [10, 0], [10, 10], [5, 10], [5, 0.0005], [4, 10], [0, 10]] }), /se cruzam ou se tocam/);
    recusa(com(0, { contorno: [[0, 0], [10, 0], [10, 10], [5, 0], [0, 10]] }), /se cruzam ou se tocam/);
  });

  it('recusa marcos diferentes de uma fatia a outra, com as duas listas', () => {
    const o = ok();
    o.fatias[0].contorno = marcado(circ(5, 8), [null, 'a', null, 'b']);
    o.fatias[1].contorno = marcado(circ(5, 8), [null, 'a']);
    recusa(o, /fatias\[1\].*tem os marcos \[inicio, a\].*tem \[inicio, a, b\].*mesmos nomes na mesma ordem/);
    o.fatias[1].contorno = marcado(circ(5, 8), [null, 'b', null, 'a']);
    recusa(o, /tem os marcos \[inicio, b, a\]/);
    o.fatias[1].contorno = marcado(circ(5, 8), ['inicio2', 'a', null, 'b']);
    recusa(o, /tem os marcos \[inicio2, a, b\]/);
  });

  it('recusa pontos ímpar, menor que 8 ou sem lugar para os marcos', () => {
    recusa(ok({ pontos: 9 }), /pontos é inteiro par de 8 para cima.*veio 9/);
    recusa(ok({ pontos: 6 }), /veio 6/);
    recusa(ok({ pontos: 8.5 }), /veio 8.5/);
    const o = ok({ pontos: 8 });
    const nomes = Array.from({ length: 9 }, (_, k) => `m${k}`);
    o.fatias.forEach((f) => { f.contorno = marcado(circ(5, 10), [...nomes, null]); });
    recusa({ ...o, pontos: 8 }, /pontos = 8, e o contorno tem 9 marcos/);
    expect(() => corpoPorFatias({ ...o, pontos: 10 })).not.toThrow();
  });

  it('recusa a volta de segmento médio abaixo do mínimo, a ponta de um ponto só (a fatia minúscula), com o perímetro e o conserto', () => {
    expect(SEGMENTO_MEDIO_MINIMO_MM).toBe(0.05);
    recusa({ ...com(1, { contorno: circ(0.05, 8) }), pontos: 8 }, /perímetro 0,306 mm.*segmento médio da volta fica em 0,038 mm, abaixo de 0,05 mm.*ao menos 0,4 mm/);
    recusa(com(1, { contorno: circ(0.3, 64) }), /segmento médio da volta fica em 0,029 mm/);
    expect(() => corpoPorFatias(com(1, { contorno: circ(0.2, 24) }))).not.toThrow();
  });

  it('recusa a volta reamostrada que se cruza e o plano interpolado que se cruza (fatias torcidas), com onde', () => {
    const arco = (r, a0, a1) => Array.from({ length: 100 }, (_, i) => [r * Math.cos(a0 + ((a1 - a0) * i) / 99), r * Math.sin(a0 + ((a1 - a0) * i) / 99)]);
    const aro = [...arco(30, 0.03, 2 * Math.PI - 0.03), ...arco(27, 2 * Math.PI - 0.03, 0.03)];
    recusa({ nome: 'c', eixo: 'x', pontos: 12, fatias: [{ em: 0, contorno: aro }, { em: 20, contorno: aro }] }, /a fatia 'f0' \(em 0 mm\) reamostrada em 12 pontos se cruza \(o lado 1 e o 9 se tocam\).*suba pontos, ou nomeie o canto como marco/);
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: aro }, { em: 20, contorno: aro }] })).not.toThrow();
    const Q = quadrado(10);
    const girado = Q.map(([u, v]) => [10 - u, 10 - v]);
    recusa({ nome: 'c', eixo: 'x', pontos: 8, passo: 5, fatias: [{ em: 0, contorno: Q }, { em: 40, contorno: girado }] }, /o plano em 20 mm, entre as fatias 'f0' e 'f1' se cruza \(o lado .* se tocam\).*comece todas as fatias no mesmo detalhe/);
    const meio = Q.slice(2).concat(Q.slice(0, 2));
    recusa({ nome: 'c', eixo: 'x', pontos: 8, passo: 5, fatias: [{ em: 0, contorno: Q }, { em: 40, contorno: meio }] }, /se cruza|fica com área/);
    const U = [[0, 0], [30, 0], [30, 20], [20, 20], [20, 5], [10, 5], [10, 20], [0, 20]];
    const Ur = U.slice(4).concat(U.slice(0, 4));
    recusa({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: Ur }, { em: 20, contorno: quadrado(30) }] }, /o plano em 5 mm, entre as fatias 'f0' e 'f1' se cruza \(o lado 1 e o 7 se tocam\)/);
  });

  it('recusa a tampa em escada que não cobre o contorno côncavo da ponta, na primeira e na última, e aceita o mesmo contorno no meio', () => {
    const U = [[0, 0], [30, 0], [30, 20], [20, 20], [20, 5], [10, 5], [10, 20], [0, 20]];
    const Q = [[0, 0], [30, 0], [30, 20], [0, 20]];
    recusa({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: U }, { em: 20, contorno: Q }] }, /tampa da primeira fatia \('f0', em 0 mm\) não cobre o contorno.*sai do contorno/);
    recusa({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: Q }, { em: 20, contorno: U }] }, /tampa da última fatia \('f1', em 20 mm\) não cobre o contorno.*comece o contorno em outro vértice, em todas as fatias: o ponto \d+ \(/);
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: Q }, { em: 20, contorno: U }, { em: 40, contorno: Q }] })).not.toThrow();
  });

  it('a tampa recusada diz qual vértice serve de âncora (e com ele passa) ou que nenhum serve e a ponta tem de ser convexa', () => {
    const L = [[0, 0], [20, 0], [20, 10], [10, 10], [10, 20], [0, 20]];
    recusa({ nome: 'c', eixo: 'x', pontos: 12, fatias: [{ em: 0, contorno: L }, { em: 20, contorno: L }] }, /o ponto 1 \(20; 0\), 2 \(20; 10\), 4 \(10; 20\) servem nesta fatia/);
    const girado = L.slice(1).concat(L.slice(0, 1));
    expect(() => corpoPorFatias({ nome: 'c', eixo: 'x', pontos: 12, fatias: [{ em: 0, contorno: girado }, { em: 20, contorno: girado }] })).not.toThrow();
    const estrela = Array.from({ length: 10 }, (_, i) => { const raio = i % 2 ? 3 : 10; const a = (Math.PI * 2 * i) / 10; return [raio * Math.cos(a), raio * Math.sin(a)]; });
    recusa({ nome: 'c', eixo: 'x', pontos: 16, fatias: [{ em: 0, contorno: estrela }, { em: 20, contorno: estrela }] }, /nenhum ponto de partida da volta de 16 pontos serve: a ponta côncava demais não cabe em escada, então a fatia da ponta tem de ser convexa/);
  });

  it('recusa o nome de fatia que colide com o de um plano gerado, e pontoDe com laço ou índice que não existe', () => {
    recusa({ nome: 'c', eixo: 'x', passo: 10, fatias: [{ em: 0, contorno: circ(5, 8) }, { nome: 'x10', em: 25, contorno: circ(5, 8) }, { em: 40, contorno: circ(5, 8) }] }, /laço 'x10'.*repete o nome de outro/);
    const g = corpoPorFatias(ok());
    expect(() => g.pontoDe('nada', 0)).toThrow(/pontoDe: o laço é um nome/);
    expect(() => g.pontoDe(99, 0)).toThrow(/pontoDe: o laço é um nome/);
    expect(() => g.pontoDe('f0', 99)).toThrow(/pontoDe: o ponto é um índice de 0 a 15 ou um marco/);
    expect(() => g.pontoDe('f0', 'nada')).toThrow(/pontoDe: o ponto é um índice/);
    expect(() => g.pontoDe('f0', 1.5)).toThrow(/pontoDe: o ponto é um índice/);
  });
});
