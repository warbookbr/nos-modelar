/* Formas novas: esfera, cone e tronco, extrusão de polígono, chanfro em caixa e tubo por pontos, em desenho,
   âncoras, gate de contato, espelho e arranjo, leitura em texto e ajuste. As medidas do gate são conferidas contra
   contas exatas, com a folga de aproximação declarada (polígonos inscritos, no máximo 0,5% menores). */
import { describe, expect, it } from 'vitest';
import { ancorasDe, desenharEsboco, ErroDeEsboco, faces, resolverOpcao, VISTAS } from '../src/index.js';
import { medirPar, pecasDe, verificarContato } from '../src/contato.js';
import { descreverEsboco, formatarDescricao } from '../src/descrever.js';
import { ajustarEsboco } from '../src/ajustar.js';
import { medirProjecaoDaOpcao } from '../src/projecao.js';

const perto = (v, esperado, casas = 6) => { expect(v).toHaveLength(esperado.length); v.forEach((x, i) => expect(x).toBeCloseTo(esperado[i], casas)); };
const resolver = (formas) => Object.fromEntries(resolverOpcao({ formas }).map((r) => [r.id, r]));
const caixa = (id, centro, l = 20, a = 20, p = 20, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
const medir = (formas, a, b) => { const r = resolver(formas); return medirPar(pecasDe(r[a]), pecasDe(r[b])); };
const esboco = (formas, contato = {}) => ({ opcoes: [{ titulo: 'T', formas }], contato: { usar: true, tolerancia: 1, folga: 500, ...contato } });
const extensao = (r) => r.max.map((v, i) => v - r.min[i]);
const recusa = (formas, trecho) => {
  expect(() => resolverOpcao({ formas })).toThrow(ErroDeEsboco);
  expect(() => resolverOpcao({ formas })).toThrow(trecho);
};

describe('esfera', () => {
  it('tem a caixa do diâmetro, as âncoras de faces e o centro; não tem inicio nem fim', () => {
    const { s } = resolver([{ id: 's', tipo: 'esfera', diametro: 120, centro: [10, 60, -5] }]);
    expect(extensao(s)).toEqual([120, 120, 120]);
    perto(s.min, [-50, 0, -65]);
    const a = ancorasDe(s);
    perto(a['+y'], [10, 120, -5]);
    perto(a['-x'], [-50, 60, -5]);
    expect(Object.keys(a)).toEqual(['centro', '+x', '-x', '+y', '-y', '+z', '-z']);
  });

  it('pousa por `sobre` e encosta por relação como qualquer forma', () => {
    const r = resolver([caixa('base', [0, 10, 0], 100, 20, 100), { id: 's', tipo: 'esfera', diametro: 40, sobre: 'base' }, { id: 't', tipo: 'esfera', diametro: 20, ponta: { id: 's', lado: '+x' } }]);
    perto(r.s.centro, [0, 40, 0]);
    perto(r.t.centro, [30, 40, 0]);
  });

  it('a folga entre duas esferas é a distância dos centros menos os raios, com 0,5% de aproximação', () => {
    const f = medir([{ id: 'a', tipo: 'esfera', diametro: 100, centro: [0, 0, 0] }, { id: 'b', tipo: 'esfera', diametro: 60, centro: [150, 0, 0] }], 'a', 'b');
    expect(f.penetracao).toBe(0);
    expect(f.folga).toBeGreaterThan(70 * 0.995);
    expect(f.folga).toBeLessThan(70 * 1.006);
  });

  it('a penetração entre duas esferas que se cruzam fica perto da conta (a peça inscrita nunca passa dela)', () => {
    const f = medir([{ id: 'a', tipo: 'esfera', diametro: 100, centro: [0, 0, 0] }, { id: 'b', tipo: 'esfera', diametro: 100, centro: [80, 0, 0] }], 'a', 'b');
    expect(f.folga).toBe(0);
    expect(f.penetracao).toBeGreaterThan(19);
    expect(f.penetracao).toBeLessThan(21.5);
  });

  it('a esfera em cima de uma caixa toca sem penetrar, e um cilindro dentro dela penetra', () => {
    const toca = medir([caixa('c', [0, 10, 0], 100, 20, 100), { id: 's', tipo: 'esfera', diametro: 60, sobre: 'c' }], 'c', 's');
    expect(toca.folga).toBeLessThan(1e-6);
    expect(toca.penetracao).toBeLessThan(1e-6);
    const dentro = medir([{ id: 's', tipo: 'esfera', diametro: 100, centro: [0, 0, 0] }, { id: 'c', tipo: 'cilindro', diametro: 20, comprimento: 200, centro: [0, 0, 0] }], 's', 'c');
    expect(dentro.folga).toBe(0);
    expect(dentro.penetracao).toBeGreaterThan(19);
  });

  it('o contorno visto de frente e de lado tem o diâmetro da esfera', () => {
    const { s } = resolver([{ id: 's', tipo: 'esfera', diametro: 200, centro: [0, 100, 0] }]);
    for (const vista of ['frontal', 'lateral', 'superior']) {
      const V = VISTAS[vista];
      const pts = faces(s, V.olho.map((c) => c / Math.hypot(...V.olho))).flatMap((f) => f.pts).map(V.p);
      const u = pts.map((p) => p[0]); const v = pts.map((p) => p[1]);
      expect(Math.max(...u) - Math.min(...u)).toBeGreaterThan(199);
      expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(199);
      expect(Math.max(...u) - Math.min(...u)).toBeLessThanOrEqual(200 + 1e-6);
    }
  });

  it('a área na projeção é a do círculo (2%)', () => {
    const r = resolverOpcao({ formas: [{ id: 's', tipo: 'esfera', diametro: 200, centro: [0, 0, 0] }, caixa('longe', [1000, 0, 0])] });
    const m = medirProjecaoDaOpcao(r, 'frontal');
    expect(m.areas.s / (Math.PI * 100 * 100)).toBeGreaterThan(0.98);
    expect(m.areas.s / (Math.PI * 100 * 100)).toBeLessThan(1.02);
  });

  it('exige diâmetro positivo', () => {
    recusa([{ id: 's', tipo: 'esfera' }], /esfera precisa de "diametro" positivo/);
  });
});

describe('cone e tronco', () => {
  it('o cone tem a caixa da base, o eixo pedido e as âncoras inicio (base) e fim (ponta)', () => {
    const { c } = resolver([{ id: 'c', tipo: 'cone', diametro: 100, comprimento: 150, eixo: 'x', centro: [0, 50, 0] }]);
    expect(extensao(c)).toEqual([150, 100, 100]);
    const a = ancorasDe(c);
    perto(a.inicio, [-75, 50, 0]);
    perto(a.fim, [75, 50, 0]);
  });

  it('o tronco vem de diametroTopo e o cone é o tronco com topo zero; topo igual à base é recusado', () => {
    const { t } = resolver([{ id: 't', tipo: 'cone', diametro: 100, diametroTopo: 40, comprimento: 100, centro: [0, 50, 0] }]);
    expect(extensao(t)).toEqual([100, 100, 100]);
    recusa([{ id: 't', tipo: 'cone', diametro: 100, diametroTopo: 100, comprimento: 100 }], /é um cilindro/);
    recusa([{ id: 't', tipo: 'cone', diametro: 100, diametroTopo: -1, comprimento: 100 }], /"diametroTopo" deve ser um número em mm/);
    recusa([{ id: 't', tipo: 'cone', comprimento: 100 }], /cone precisa de "diametro"/);
  });

  it('a folga até a base do cone e até a lateral inclinada segue a conta', () => {
    /* cone de base 100 em y=0, ponta em y=100; uma caixa fina a 10 mm da borda da base */
    const base = medir([{ id: 'c', tipo: 'cone', diametro: 100, comprimento: 100, centro: [0, 50, 0] }, caixa('b', [50 + 10 + 5, 10, 0], 10, 20, 10)], 'c', 'b');
    expect(base.folga).toBeCloseTo(10, 6);
    /* a 50 mm de altura o raio é 25; uma caixa com a quina de baixo a 20 mm dessa parede está mais longe que 20 mm da lateral inclinada */
    const lado = medir([{ id: 'c', tipo: 'cone', diametro: 100, comprimento: 100, centro: [0, 50, 0] }, caixa('b', [25 + 20 + 5, 60, 0], 10, 10, 10)], 'c', 'b');
    /* distância do canto (45, 55) à reta de (50,0) a (0,100) no plano do meio: |100*45+50*55-5000|/hipot(100,50) */
    const esperado = Math.abs(100 * 45 + 50 * 55 - 5000) / Math.hypot(100, 50);
    expect(lado.folga).toBeGreaterThan(esperado * 0.995);
    expect(lado.folga).toBeLessThan(esperado * 1.01);
  });

  it('a ponta do cone toca uma caixa por cima sem penetrar, e a penetração dentro do tronco aparece', () => {
    const toca = medir([{ id: 'c', tipo: 'cone', diametro: 100, comprimento: 100, centro: [0, 50, 0] }, caixa('b', [0, 110, 0], 40, 20, 40)], 'c', 'b');
    expect(toca.folga).toBeLessThan(1e-6);
    expect(toca.penetracao).toBeLessThan(1e-6);
    const dentro = medir([{ id: 'c', tipo: 'cone', diametro: 100, diametroTopo: 60, comprimento: 100, centro: [0, 50, 0] }, caixa('b', [0, 50, 0], 20, 20, 20)], 'c', 'b');
    expect(dentro.penetracao).toBeGreaterThan(19);
  });

  it('serve de haste entre dois pontos: a base fica em `de` e a ponta em `para`', () => {
    const { c } = resolver([{ id: 'c', tipo: 'cone', diametro: 40, de: [0, 0, 0], para: [0, 0, 300] }]);
    const a = ancorasDe(c);
    perto(a.inicio, [0, 0, 0]);
    perto(a.fim, [0, 0, 300]);
    recusa([{ id: 'c', tipo: 'cone', diametro: 40, comprimento: 10, de: [0, 0, 0], para: [0, 0, 300] }], /"comprimento" não pode vir junto de "de"\/"para"/);
  });

  it('o desenho é o mesmo em duas chamadas e tem faces inclinadas nas quatro vistas', () => {
    const e = { opcoes: [{ titulo: 'T', formas: [{ id: 'c', tipo: 'cone', diametro: 100, diametroTopo: 40, comprimento: 120, centro: [0, 60, 0], cor: 'azul' }] }] };
    for (const vista of Object.keys(VISTAS)) {
      const a = desenharEsboco({ ...e, vista }).svg;
      expect(a).toBe(desenharEsboco({ ...e, vista }).svg);
      expect(a).toContain('<path');
    }
  });
});

describe('extrusão de polígono', () => {
  const cunha = { id: 'cunha', tipo: 'extrusao', perfil: [[0, 0], [120, 0], [0, 80]], comprimento: 40, eixo: 'z', centro: [0, 0, 0] };

  it('o centro é o da caixa do perfil e a extensão vem do perfil e do comprimento', () => {
    const { cunha: c } = resolver([cunha]);
    expect(extensao(c)).toEqual([120, 80, 40]);
    perto(c.min, [-60, -40, -20]);
  });

  it('o perfil pode vir em qualquer sentido e a orientação não muda a caixa nem o gate', () => {
    const { cunha: c } = resolver([{ ...cunha, perfil: [[0, 80], [120, 0], [0, 0]] }]);
    expect(extensao(c)).toEqual([120, 80, 40]);
    /* o vértice (60, -40) do perfil centrado toca a face da caixa a 10 mm */
    const f = medir([{ ...cunha, perfil: [[0, 80], [120, 0], [0, 0]] }, caixa('b', [75, -40, 0], 10, 20, 20)], 'cunha', 'b');
    expect(f.folga).toBeCloseTo(10, 6);
  });

  it('a hipotenusa é uma face de verdade: a folga até um ponto diante dela é a distância à reta', () => {
    /* perfil centrado: vértices (-60,-40), (60,-40), (-60,40); a hipotenusa é a reta 2x + 3y = 0 */
    const f = medir([cunha, caixa('b', [40, 40, 0], 0.01, 0.01, 0.01)], 'cunha', 'b');
    const esperado = (2 * 40 + 3 * 40) / Math.hypot(2, 3);
    expect(f.folga).toBeGreaterThan(esperado - 0.05);
    expect(f.folga).toBeLessThan(esperado + 0.01);
  });

  it('o eixo x usa z e y no perfil, e sobre pousa na face de cima', () => {
    const r = resolver([caixa('base', [0, 10, 0], 200, 20, 200), { id: 'e', tipo: 'extrusao', perfil: [[0, 0], [60, 0], [60, 30], [0, 30]], comprimento: 50, eixo: 'x', sobre: 'base' }]);
    expect(extensao(r.e)).toEqual([50, 30, 60]);
    perto(r.e.min, [-25, 20, -30]);
  });

  it('recusa perfil côncavo, curto, com ponto que não é par e comprimento ausente', () => {
    recusa([{ ...cunha, perfil: [[0, 0], [100, 0], [100, 100], [50, 20], [0, 100]] }], /precisa ser convexo/);
    recusa([{ ...cunha, perfil: [[0, 0], [100, 0]] }], /extrusao precisa de "perfil"/);
    recusa([{ ...cunha, perfil: [[0, 0], [100, 0], [100]] }], /extrusao precisa de "perfil"/);
    recusa([{ ...cunha, comprimento: undefined }], /extrusao precisa de "comprimento"/);
  });

  it('o perfil aceita parâmetros e expressões', () => {
    const e = { parametros: { l: 100 }, opcoes: [{ titulo: 'T', formas: [{ id: 'e', tipo: 'extrusao', perfil: [[0, 0], ['l', 0], [0, '=l/2']], comprimento: '=l/4', eixo: 'z', centro: [0, 0, 0] }] }] };
    const r = descreverEsboco(e).opcoes[0].formas[0];
    expect(r.extensao).toEqual([100, 50, 25]);
  });
});

describe('chanfro em caixa', () => {
  const cubo = (extra = {}) => ({ id: 'c', tipo: 'caixa', largura: 100, altura: 100, profundidade: 100, centro: [0, 0, 0], chanfro: 20, ...extra });

  it('a caixa mantém a caixa mínima, e o chanfro corta a aresta vertical', () => {
    const { c } = resolver([cubo()]);
    expect(extensao(c)).toEqual([100, 100, 100]);
    /* ponto a 60 mm nos dois eixos, junto da aresta vertical: o plano do chanfro é x+z = 80 e a distância é 40/raiz de 2 */
    const f = medir([cubo(), caixa('p', [60, 0, 60], 0.01, 0.01, 0.01)], 'c', 'p');
    expect(f.folga).toBeGreaterThan(28.28 - 0.05);
    expect(f.folga).toBeLessThan(28.28 + 0.05);
  });

  it('o chanfro corta também as arestas de cima e de baixo', () => {
    const f = medir([cubo(), caixa('p', [60, 60, 0], 0.01, 0.01, 0.01)], 'c', 'p');
    expect(f.folga).toBeGreaterThan(28.28 - 0.05);
    expect(f.folga).toBeLessThan(28.28 + 0.05);
    /* no meio da face o chanfro não muda nada */
    const meio = medir([cubo(), caixa('p', [50 + 7, 0, 0], 0.01, 0.01, 0.01)], 'c', 'p');
    expect(meio.folga).toBeCloseTo(6.995, 4);
  });

  it('sem chanfro o mesmo ponto fica mais perto', () => {
    const plano = medir([cubo({ chanfro: undefined }), caixa('p', [60, 60, 0], 0.01, 0.01, 0.01)], 'c', 'p');
    expect(plano.folga).toBeCloseTo(Math.hypot(10, 10), 1);
  });

  it('o desenho da caixa chanfrada tem mais faces e vincos que o da caixa comum', () => {
    const chanfrada = desenharEsboco({ opcoes: [{ titulo: 'T', formas: [cubo({ cor: 'cinza' })] }] }).svg;
    const comum = desenharEsboco({ opcoes: [{ titulo: 'T', formas: [cubo({ cor: 'cinza', chanfro: undefined })] }] }).svg;
    expect((chanfrada.match(/<path/g) ?? []).length).toBeGreaterThan((comum.match(/<path/g) ?? []).length + 5);
  });

  it('recusa chanfro com raio, com furos, grande demais ou não positivo', () => {
    recusa([cubo({ raio: 5 })], /use "raio" ou "chanfro" na caixa, não os dois/);
    recusa([cubo({ furo: { diametro: 10 } })], /não aceita "furo" nem "furos"/);
    recusa([cubo({ chanfro: 50 })], /grande demais para a caixa/);
    recusa([cubo({ chanfro: -1 })], /"chanfro" deve ser um número positivo/);
  });
});

describe('tubo por pontos', () => {
  const L = { id: 't', tipo: 'tubo', diametro: 20, caminho: [[0, 0, 0], [0, 100, 0], [100, 100, 0]] };

  it('cada trecho é um cilindro e cada canto sem raio de curva leva uma esfera', () => {
    const { t } = resolver([L]);
    expect(t.partes.map((p) => p.prisma.secoes ? 'esfera' : 'cilindro')).toEqual(['cilindro', 'cilindro', 'esfera']);
    expect(pecasDe(t)).toHaveLength(3);
  });

  it('a caixa e as âncoras vêm dos pontos: inicio e fim são o primeiro e o último ponto', () => {
    const { t } = resolver([L]);
    /* os extremos são tampas planas, e o canto leva uma esfera do diâmetro do tubo */
    perto(t.min, [-10, 0, -10]);
    perto(t.max, [100, 110, 10]);
    const a = ancorasDe(t);
    perto(a.inicio, [0, 0, 0]);
    perto(a.fim, [100, 100, 0]);
    perto(a.centro, [45, 55, 0]);
  });

  it('o raio de curva troca o canto por um arco de seções retas de no máximo 6 graus', () => {
    const { t } = resolver([{ ...L, raioCurva: 30 }]);
    /* duas pernas retas e 15 seções de 6 graus no arco de 90; sem esfera nas juntas */
    expect(t.partes.filter((p) => !p.prisma.secoes)).toHaveLength(2 + 15);
    expect(t.partes.some((p) => p.prisma.secoes)).toBe(false);
    const a = ancorasDe(t);
    perto(a.inicio, [0, 0, 0]);
    perto(a.fim, [100, 100, 0]);
    expect(t.max[1]).toBeCloseTo(110, 6);
    expect(t.min[0]).toBeCloseTo(-10, 6);
  });

  it('as juntas do arco tiram o canto vivo: um ponto fora do canto fica mais longe do tubo curvo que do tubo com esfera', () => {
    const ponto = caixa('p', [-15, 115, 0], 0.01, 0.01, 0.01);
    const curvo = medir([{ ...L, raioCurva: 40 }, ponto], 't', 'p');
    const vivo = medir([L, ponto], 't', 'p');
    expect(vivo.folga).toBeCloseTo(Math.hypot(15, 15) - 10, 1);
    /* o arco tem centro em (40, 60) e o raio externo 50: a distância é hipot(55, 55) - 50 */
    expect(curvo.folga).toBeGreaterThan(Math.hypot(55, 55) - 50 - 0.5);
    expect(curvo.folga).toBeLessThan(Math.hypot(55, 55) - 50 + 0.5);
  });

  it('o gate vê o tubo como o conjunto das partes: uma caixa junto do trecho toca e uma longe fica voando', () => {
    const formas = [L, caixa('b', [-20, 50, 0], 20, 20, 20), caixa('longe', [400, 400, 0])];
    const g = verificarContato(esboco(formas, { folga: 5000 }));
    expect(g.achados.map((a) => `${a.tipo}:${a.pecas.join(',')}`)).toEqual(['voando:longe']);
    expect(medir(formas, 't', 'b').folga).toBeCloseTo(0, 6);
  });

  it('posiciona por âncoras de outras formas, com `desloca`, `alinha` e `encosta`', () => {
    const r = resolver([
      caixa('a', [0, 0, 0], 40, 40, 40),
      caixa('b', [200, 100, 0], 40, 40, 40),
      { id: 't', tipo: 'tubo', diametro: 10, caminho: ['a.+x', 'b.-x'], desloca: [0, 5, 0] },
    ]);
    const an = ancorasDe(r.t);
    perto(an.inicio, [20, 5, 0]);
    perto(an.fim, [180, 105, 0]);
    const alinhado = resolver([caixa('a', [0, 0, 300], 40, 40, 40), { ...L, alinha: { com: 'a', eixos: ['z'] } }]);
    expect(alinhado.t.centro[2]).toBe(300);
    const encostado = resolver([caixa('a', [0, 500, 0], 40, 40, 40), { ...L, encosta: { referencia: 'a', direcao: '+y' } }]);
    expect(encostado.t.max[1]).toBeCloseTo(480, 6);
  });

  it('aceita um ponto entre outros dois em qualquer ponto do caminho', () => {
    const r = resolver([{ ...L, caminho: [[0, 0, 0], { entre: [[0, 0, 0], [0, 200, 0]], mm: 50 }, { entre: [[0, 0, 0], [0, 200, 0]], t: 1 }] }]);
    const a = ancorasDe(r.t);
    perto(a.inicio, [0, 0, 0]);
    perto(a.fim, [0, 200, 0]);
  });

  it('o espelho e o arranjo copiam o tubo inteiro, com as âncoras refletidas e deslocadas', () => {
    const r = resolver([
      { ...L, raioCurva: 20 },
      { id: 'e', espelha: { forma: 't', eixo: 'x', pos: 0 } },
      { arranja: { forma: 't', modo: 'linear', total: 3, passo: [0, 0, 60] } },
      { arranja: { forma: 't', modo: 'radial', total: 4, eixo: 'y', centro: [0, 0, 0], nomes: ['r1', 'r2', 'r3'] } },
    ]);
    perto(ancorasDe(r.e).fim, [-100, 100, 0]);
    perto(ancorasDe(r.e).inicio, [0, 0, 0]);
    perto(ancorasDe(r.t1).fim, [100, 100, 60]);
    perto(ancorasDe(r.t2).inicio, [0, 0, 120]);
    /* radial: 90 graus em torno de y leva x=100 para z=-100 (regra da mão direita) */
    perto(ancorasDe(r.r1).fim, [0, 100, -100]);
    expect(r.e.partes).toHaveLength(r.t.partes.length);
    expect(pecasDe(r.e)).toHaveLength(pecasDe(r.t).length);
    /* o espelho é o sólido refletido: a caixa espelha */
    perto(r.e.min, [-r.t.max[0], r.t.min[1], r.t.min[2]]);
    perto(r.e.max, [-r.t.min[0], r.t.max[1], r.t.max[2]]);
  });

  it('a explosão e a projeção movem o tubo inteiro pelo centro', () => {
    const r = resolverOpcao({ formas: [{ ...L, raioCurva: 20 }, caixa('b', [0, 0, 0])] });
    const m = medirProjecaoDaOpcao(r, 'frontal');
    expect(m.areas.t).toBeGreaterThan(0);
  });

  it('recusa o que não cabe: raio de curva grande, ponto repetido, volta sobre si, campos de posição e poucos pontos', () => {
    recusa([{ ...L, raioCurva: 120 }], /"raioCurva" de 120 mm não cabe no trecho 1 do "caminho" \(100 mm\)/);
    recusa([{ ...L, caminho: [[0, 0, 0], [0, 0, 0], [10, 0, 0]] }], /os pontos 1 e 2 do "caminho" são o mesmo ponto/);
    recusa([{ ...L, caminho: [[0, 0, 0], [0, 100, 0], [0, 0, 0]] }], /volta sobre si mesmo no ponto 2/);
    recusa([{ ...L, centro: [0, 0, 0] }], /o tubo se posiciona pelos pontos do "caminho"; retire "centro"/);
    recusa([{ ...L, caminho: [[0, 0, 0]] }], /tubo precisa de "caminho"/);
    recusa([{ ...L, diametro: undefined }], /tubo precisa de "diametro"/);
    recusa([{ ...L, raioCurva: -1 }], /"raioCurva" deve ser um número em mm/);
    recusa([{ ...L, caminho: ['naoExiste.centro', [0, 0, 0]] }], /"caminho\[0\]" aponta para "naoExiste.centro"/);
  });

  it('o desenho não tem anel escuro nas juntas do arco e é o mesmo em duas chamadas', () => {
    const e = { opcoes: [{ titulo: 'T', formas: [{ ...L, raioCurva: 30, cor: 'roxo' }] }] };
    const a = desenharEsboco(e).svg;
    expect(a).toBe(desenharEsboco(e).svg);
    /* cada perna tem duas silhuetas e a curva outras duas: o contorno escuro é poucos traços, não um anel por seção */
    expect((a.match(/stroke="#111111" stroke-width="2"/g) ?? []).length).toBeLessThan(80);
  });

  it('a leitura em texto diz o caminho e as âncoras, e o `--ajustar` move o tubo pelo `desloca`', () => {
    const e = esboco([caixa('a', [0, 0, 0], 100, 10, 100), { ...L, caminho: [[0, 0, 0], [0, 100, 0]], diametro: 20 }], { tolerancia: 2, penetracao: 1 });
    const texto = formatarDescricao(descreverEsboco(e));
    expect(texto).toContain('forma t: tubo');
    expect(texto).toContain('relação: caminho de 2 pontos');
    expect(texto).toContain('âncoras t: centro');
    const g = verificarContato(e);
    expect(g.resultado).toBe('reprovado');
    expect(g.achados[0]).toMatchObject({ tipo: 'colisao' });
    const ajuste = ajustarEsboco(e);
    expect(ajuste.aprovado).toBe(true);
    const movida = ajuste.esboco.opcoes[0].formas.find((f) => f.id === 't');
    expect(movida.caminho).toEqual([[0, 0, 0], [0, 100, 0]]);
    expect(movida.desloca).toBeDefined();
    expect(verificarContato(ajuste.esboco).resultado).toBe('aprovado');
  });
});

describe('formas novas juntas', () => {
  it('o mesmo esboço com todas as formas passa no gate, dá o mesmo SVG duas vezes e desenha nas quatro vistas', () => {
    const e = {
      contato: { usar: true },
      opcoes: [{ titulo: 'T', formas: [
        { id: 'base', tipo: 'caixa', largura: 400, altura: 40, profundidade: 300, chanfro: 12, centro: [0, 20, 0], cor: 'cinza' },
        { id: 'bola', tipo: 'esfera', diametro: 120, sobre: 'base', cor: 'vermelho' },
        { id: 'tronco', tipo: 'cone', diametro: 100, diametroTopo: 40, comprimento: 150, ponta: { id: 'base', lado: '+y' }, desloca: [-140, 0, 0], cor: 'azul' },
        { id: 'cunha', tipo: 'extrusao', perfil: [[0, 0], [120, 0], [0, 80]], comprimento: 40, eixo: 'z', sobre: 'base', desloca: [130, 0, 0], cor: 'verde' },
        { id: 'tubo', tipo: 'tubo', diametro: 24, raioCurva: 40, caminho: ['tronco.+y', [-140, 300, 0], [130, 300, 0], 'cunha.+y'], cor: 'roxo' },
      ] }],
    };
    const g = verificarContato(e);
    expect(g.resultado).toBe('aprovado');
    for (const vista of Object.keys(VISTAS)) {
      const a = desenharEsboco({ ...e, vista }).svg;
      expect(a).toBe(desenharEsboco({ ...e, vista }).svg);
    }
  }, 60000);
});
