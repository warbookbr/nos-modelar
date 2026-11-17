/* gaiola-por-rede-emenda.test.mjs — a emenda com continuidade declarada da gaiola por rede (`continuidade: 'G1' | 'G2'` na curva), na
   gaiola: as recusas, a junção das curvas que atravessam a emenda (a mesma tangente no nó), o relatório `emendas` e o aviso do vértice
   extraordinário na emenda G2. A prova na superfície, medida por `continuidade-nas-emendas.mjs`, está em
   `tools/fixtures/correcao-de-superficie/emendas.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from './gaiola-por-rede.js';

/* duas chapas de 200 por 200 mm emendadas na curva x = 200: a seção em x é um arco com o topo na emenda, de raio `raios[0]` à esquerda e
   `raios[1]` à direita (mm), e a seção em z é reta */
function altura(x, raios) {
  const r = x <= 200 ? raios[0] : raios[1];
  return Math.sqrt(r * r - (x - 200) ** 2) - r;
}
function rede({ raios = [600, 1800], continuidade = null, vinco = null, liso, dobra = 0, emendaNaBorda = false } = {}) {
  const P = (x, z) => [x, altura(x, raios) + (x > 200 ? dobra * (x - 200) : 0), z];
  const nos = { A: P(0, 0), B: P(200, 0), C: P(400, 0), A1: P(0, 200), B1: P(200, 200), C1: P(400, 200) };
  const ao = (x0, x1) => [1, 2, 3].map((k) => x0 + ((x1 - x0) * k) / 4);
  const curvas = [
    { nome: 'baixoE', pontos: ['A', ...ao(0, 200).map((x) => P(x, 0)), 'B'] },
    { nome: 'baixoD', pontos: ['B', ...ao(200, 400).map((x) => P(x, 0)), 'C'] },
    { nome: 'cimaE', pontos: ['A1', ...ao(0, 200).map((x) => P(x, 200)), 'B1'] },
    { nome: 'cimaD', pontos: ['B1', ...ao(200, 400).map((x) => P(x, 200)), 'C1'] },
    { nome: 'ladoE', pontos: ['A', P(0, 100), 'A1'], ...(emendaNaBorda ? { continuidade } : {}) },
    { nome: 'emenda', pontos: ['B', P(200, 100), 'B1'], ...(continuidade && !emendaNaBorda ? { continuidade } : {}), ...(vinco ? { vinco } : {}) },
    { nome: 'ladoD', pontos: ['C', P(400, 100), 'C1'] },
  ];
  return {
    passo: 25, fora: [0, 1, 0], nos, curvas, ...(liso === undefined ? {} : { liso }),
    retalhos: [
      { nome: 'esquerda', borda: ['baixoE', 'emenda', 'cimaE', 'ladoE'] },
      { nome: 'direita', borda: ['baixoD', 'ladoD', 'cimaD', 'emenda'] },
    ],
  };
}

/* o ângulo (graus) entre as direções com que as curvas `a` (que termina no nó) e `b` (que começa nele) passam pelo nó */
function anguloNoNo(g, a, b) {
  const p = g.pontoDaCurva(a, 1); const pa = g.pontoDaCurva(a, 1 - 1e-4); const pb = g.pontoDaCurva(b, 1e-4);
  const u = p.map((x, k) => x - pa[k]); const v = pb.map((x, k) => x - p[k]);
  const c = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.min(1, c)) * 180) / Math.PI;
}

describe('a emenda declarada da gaiola por rede', () => {
  it('sem a declaração a gaiola não muda e não traz emendas', () => {
    const g = gaiolaPorRede(rede());
    expect(g.emendas).toBeUndefined();
    /* a ponta de cada curva usa o ponto refletido: as duas metades da curva de baixo chegam ao nó com tangentes diferentes */
    expect(anguloNoNo(g, 'baixoE', 'baixoD')).toBeGreaterThan(0.5);
  });

  it('recusa a continuidade que não é G1 nem G2, a que vem com vinco, a rede sem liso e a curva que não fica entre dois retalhos', () => {
    expect(() => gaiolaPorRede(rede({ continuidade: 'G3' }))).toThrow(/continuidade "G3".*'G1' ou 'G2'/);
    expect(() => gaiolaPorRede(rede({ continuidade: 'G1', vinco: 0.5 }))).toThrow(/vinco e continuidade/);
    expect(() => gaiolaPorRede(rede({ continuidade: 'G2', liso: false }))).toThrow(/liso: false/);
    expect(() => gaiolaPorRede(rede({ continuidade: 'G1', emendaNaBorda: true }))).toThrow(/nenhum arco dela é lado de dois retalhos/);
  });

  it('as curvas que atravessam a emenda saem do nó com a mesma tangente, e o relatório diz as junções', () => {
    for (const continuidade of ['G1', 'G2']) {
      const g = gaiolaPorRede(rede({ continuidade }));
      expect(anguloNoNo(g, 'baixoE', 'baixoD')).toBeLessThan(0.01);
      expect(anguloNoNo(g, 'cimaE', 'cimaD')).toBeLessThan(0.01);
      const e = g.emendas.emenda;
      expect(e.continuidade).toBe(continuidade);
      expect(e.lados).toEqual(['direita', 'esquerda']);
      expect(e.juncoes).toEqual([{ no: 'B', curvas: ['baixoE', 'baixoD'] }, { no: 'B1', curvas: ['cimaE', 'cimaD'] }]);
      expect(e.extraordinarios).toEqual([]);
      expect(e.pontos).toBeGreaterThan(4);
      /* a faixa: duas fileiras de cada lado, em cada ponto de dentro da curva */
      expect(e.faixa).toBe(4 * e.pontos);
      expect(g.avisos.filter((a) => a.ref.startsWith('emenda'))).toEqual([]);
    }
  });

  it('na gaiola, a G1 deixa a tangente comum com a curvatura de cada lado, e a G2 iguala a curvatura', () => {
    const g1 = gaiolaPorRede(rede({ continuidade: 'G1' })).emendas.emenda;
    expect(g1.anguloMaximoGraus).toBeLessThan(0.05);
    /* a G1 guarda a razão 3 da superfície dada, e a G2 a leva para perto de 1 */
    expect(g1.razaoMaxima).toBeGreaterThan(2);
    const g2 = gaiolaPorRede(rede({ continuidade: 'G2' })).emendas.emenda;
    expect(g2.anguloMaximoGraus).toBeLessThan(0.05);
    expect(g2.razaoMaxima).toBeLessThan(g1.razaoMaxima);
    /* a dobra de 1,5 grau entre os lados: a tangente comum a tira na gaiola */
    const dobrada = gaiolaPorRede(rede({ raios: [1800, 1800], dobra: Math.tan((1.5 * Math.PI) / 180), continuidade: 'G1' })).emendas.emenda;
    expect(dobrada.anguloMaximoGraus).toBeLessThan(0.1);
  });

  it('a curva que atravessa a emenda dobrando mais que anguloDeCanto fica sem a junção, com aviso', () => {
    const g = gaiolaPorRede({ ...rede({ continuidade: 'G1', raios: [1800, 1800], dobra: Math.tan((40 * Math.PI) / 180) }), liso: true });
    expect(g.emendas.emenda.juncoes).toEqual([]);
    expect(g.avisos.filter((a) => a.ref === 'emendaDobrada').map((a) => a.no)).toEqual(['B', 'B1']);
  });

  it('a emenda G2 que passa por um vértice extraordinário avisa que ali ela é no máximo G1', () => {
    /* o lado direito partido em dois retalhos pela curva `meioD`, que termina no meio da emenda, e o esquerdo de cinco lados com um canto
       em M: três retalhos com canto no nó M, que fica com valência 3 dentro da chapa */
    const d = rede({ continuidade: 'G2' });
    const P = (x, z) => [x, altura(x, [600, 1800]), z];
    d.nos.M = P(200, 100); d.nos.M1 = P(400, 100);
    d.curvas = d.curvas.map((c) => (c.nome === 'emenda' ? { ...c, pontos: ['B', P(200, 50), 'M', P(200, 150), 'B1'] } : c.nome === 'ladoD' ? { ...c, pontos: ['C', 'M1', 'C1'] } : c));
    d.curvas.push({ nome: 'meioD', pontos: ['M', P(300, 100), 'M1'] });
    d.retalhos = [
      { nome: 'esquerda', borda: ['baixoE', { curva: 'emenda', de: 'B', ate: 'M' }, { curva: 'emenda', de: 'M', ate: 'B1' }, 'cimaE', 'ladoE'] },
      { nome: 'direitaBaixo', borda: ['baixoD', { curva: 'ladoD', de: 'C', ate: 'M1' }, 'meioD', { curva: 'emenda', de: 'M', ate: 'B' }] },
      { nome: 'direitaCima', borda: ['meioD', { curva: 'ladoD', de: 'M1', ate: 'C1' }, 'cimaD', { curva: 'emenda', de: 'B1', ate: 'M' }] },
    ];
    const g = gaiolaPorRede(d);
    expect(g.emendas.emenda.extraordinarios).toEqual(['M']);
    const aviso = g.avisos.find((a) => a.ref === 'emendaG2NoExtraordinario');
    expect(aviso.pontos).toEqual(['M']);
    expect(aviso.texto).toMatch(/no máximo G1/);
  });
});
