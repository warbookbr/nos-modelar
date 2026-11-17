/* gaiola-por-rede-emenda.test.mjs — a emenda com continuidade declarada da gaiola por rede (`continuidade: 'G1' | 'G2'` na curva), na
   gaiola: as recusas, a junção das curvas que atravessam a emenda (a mesma tangente no nó, e o desvio conferido também com o vizinho nó
   { curva, fracao } e com anguloDeCanto: false), o relatório `emendas` (a razão com sinal, null sem medida, o deslocamento pela
   declaração), os avisos de `limitesDaEmenda`, a G2 experimental e o aviso do vértice extraordinário na emenda G2. A prova na superfície, medida por `continuidade-nas-emendas.mjs`, está em
   `tools/fixtures/correcao-de-superficie/emendas.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from './gaiola-por-rede.js';

/* duas chapas de 200 por 200 mm emendadas na curva x = 200: a seção em x é um arco com o topo na emenda, de raio `raios[0]` à esquerda e
   `raios[1]` à direita (mm), e a seção em z é reta */
function altura(x, raios) {
  const r = x <= 200 ? raios[0] : raios[1];
  return Math.sqrt(r * r - (x - 200) ** 2) - r;
}
function rede({ raios = [600, 1800], continuidade = null, vinco = null, liso, dobra = 0, emendaNaBorda = false, inflexao = false } = {}) {
  const P = (x, z) => [x, (x > 200 && inflexao ? -1 : 1) * altura(x, raios) + (x > 200 ? dobra * (x - 200) : 0), z];
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
      /* a G1 move a gaiola 0,8 mm, abaixo da tolerância; a G2 é experimental e, na razão 3, move 1,9 mm */
      expect(g.avisos.filter((a) => a.ref.startsWith('emenda')).map((a) => a.ref)).toEqual(continuidade === 'G1' ? [] : ['emendaG2Experimental', 'emendaMoveu']);
      expect(e.experimental).toBe(continuidade === 'G2' ? true : undefined);
      expect(e.deslocamentoMaximoMm).toBeCloseTo(continuidade === 'G1' ? 0.817 : 1.909, 2);
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

  it('a curva que atravessa a emenda dobrando mais que anguloDeCanto fica sem a junção, com aviso, também com anguloDeCanto: false', () => {
    for (const anguloDeCanto of [undefined, false]) {
      const g = gaiolaPorRede({ ...rede({ continuidade: 'G1', raios: [1800, 1800], dobra: Math.tan((40 * Math.PI) / 180) }), liso: true, ...(anguloDeCanto === undefined ? {} : { anguloDeCanto }) });
      expect(g.emendas.emenda.juncoes).toEqual([]);
      const dobradas = g.avisos.filter((a) => a.ref === 'emendaDobrada');
      expect(dobradas.map((a) => a.no)).toEqual(['B', 'B1']);
      /* sem anguloDeCanto, a junção confere pelo padrão de 35 graus (antes juntava e a curva de baixo andava 2,5 mm) */
      expect(dobradas.every((a) => a.limiteGraus === 35)).toBe(true);
    }
  });

  it('o vizinho do nó que é nó { curva, fracao } entra pela posição na curva: a curva que dobra 42 graus fica sem a junção', () => {
    /* a curva de baixo da direita vai de B ao nó Q sobre a lateral direita, perto do topo: sai de B a 42 graus da de baixo da esquerda */
    const d = rede({ raios: [1800, 1800], continuidade: 'G1' });
    d.nos.Q = { curva: 'ladoD', fracao: 0.9 };
    d.curvas = d.curvas.map((c) => (c.nome === 'baixoD' ? { ...c, pontos: ['B', 'Q'] } : c));
    d.retalhos = [d.retalhos[0], { nome: 'direita', borda: ['baixoD', { curva: 'ladoD', de: 'Q', ate: 'C1' }, 'cimaD', 'emenda'] }];
    const g = gaiolaPorRede(d);
    expect(g.emendas.emenda.juncoes).toEqual([{ no: 'B1', curvas: ['cimaE', 'cimaD'] }]);
    const dobrada = g.avisos.find((a) => a.ref === 'emendaDobrada');
    expect(dobrada.no).toBe('B');
    expect(dobrada.desvioGraus).toBeCloseTo(42.1, 0);
  });

  it('a razão sai com sinal: negativa na inflexão, que a G1 aceita e a G2 acusa', () => {
    const g1 = gaiolaPorRede(rede({ raios: [600, 600], inflexao: true, continuidade: 'G1' }));
    expect(g1.emendas.emenda.razaoMaxima).toBeCloseTo(-1, 2);
    expect(gaiolaPorRede(rede({ raios: [600, 600], continuidade: 'G1' })).emendas.emenda.razaoMaxima).toBeCloseTo(1, 2);
    expect(g1.avisos.filter((a) => a.ref === 'emendaAcimaDoLimite')).toEqual([]);
    const g2 = gaiolaPorRede(rede({ raios: [600, 600], inflexao: true, continuidade: 'G2' }));
    const acima = g2.avisos.find((a) => a.ref === 'emendaAcimaDoLimite');
    expect(acima.razaoMaxima).toBeLessThan(0);
    expect(acima.texto).toMatch(/troca de sinal/);
  });

  it('sem ponto medido o ângulo e a razão saem null, com aviso, e não 0 grau e razão 1', () => {
    /* o lado direito com uma divisão só na largura: nenhuma fileira de miolo que o alisamento mova */
    const d = rede({ continuidade: 'G1' });
    d.retalhos[1].divisoes = [1, 8];
    const g = gaiolaPorRede(d);
    expect(g.emendas.emenda).toMatchObject({ medidos: 0, anguloMaximoGraus: null, razaoMaxima: null, pontoDoAngulo: null });
    expect(g.avisos.find((a) => a.ref === 'emendaSemMedida').texto).toMatch(/null/);
  });

  it('limitesDaEmenda: a tolerância do deslocamento, a da curva e o ângulo, e as recusas', () => {
    const g = gaiolaPorRede({ ...rede({ continuidade: 'G1' }), limitesDaEmenda: { tolerancia: 0.5 } });
    const moveu = g.avisos.find((a) => a.ref === 'emendaMoveu');
    expect(moveu).toMatchObject({ curva: 'emenda', toleranciaMm: 0.5 });
    expect(moveu.deslocamentoMaximoMm).toBeCloseTo(0.817, 2);
    const solta = gaiolaPorRede({ ...rede({ continuidade: 'G1' }), limitesDaEmenda: { tolerancia: 0.5, toleranciaPorCurva: { emenda: 2 } } });
    expect(solta.avisos.filter((a) => a.ref === 'emendaMoveu')).toEqual([]);
    expect(solta.emendas.emenda.toleranciaMm).toBe(2);
    const angulo = gaiolaPorRede({ ...rede({ continuidade: 'G2' }), limitesDaEmenda: { angulo: 0.001 } });
    expect(angulo.avisos.find((a) => a.ref === 'emendaAcimaDoLimite').texto).toMatch(/ângulo entre as tangentes/);
    expect(() => gaiolaPorRede({ ...rede(), limitesDaEmenda: { tolerancia: 1 } })).toThrow(/nenhuma curva declara continuidade/);
    expect(() => gaiolaPorRede({ ...rede({ continuidade: 'G1' }), limitesDaEmenda: { toleranciaPorCurva: { baixoE: 1 } } })).toThrow(/não declara continuidade/);
    expect(() => gaiolaPorRede({ ...rede({ continuidade: 'G1' }), limitesDaEmenda: { razao: 0.5 } })).toThrow(/de 1 para cima/);
    expect(() => gaiolaPorRede({ ...rede({ continuidade: 'G1' }), limitesDaEmenda: { folga: 1 } })).toThrow(/campo desconhecido/);
  });

  it('a referência sem a declaração fica fora da captura: a captura vê só a gaiola pedida', async () => {
    const { capturarGaiolas } = await import('./gaiola-captura.js');
    const { gaiolas } = capturarGaiolas(() => gaiolaPorRede(rede({ continuidade: 'G1' })));
    expect(gaiolas).toHaveLength(1);
    expect(gaiolas[0].emendas.emenda.continuidade).toBe('G1');
  });

  it('a curva no plano de simetria é recusada falando da simetria', () => {
    /* a metade x >= 0 de uma chapa: a curva de x = 0 é borda de um retalho só, e o outro lado é a metade espelhada */
    const P = (x, z) => [x, -(x * x) / 2400, z];
    const d = {
      passo: 25, fora: [0, 1, 0], simetria: 'x', nos: { A: P(0, 0), B: P(200, 0), A1: P(0, 200), B1: P(200, 200) },
      curvas: [
        { nome: 'baixo', pontos: ['A', P(100, 0), 'B'] }, { nome: 'cima', pontos: ['A1', P(100, 200), 'B1'] },
        { nome: 'plano', pontos: ['A', P(0, 100), 'A1'], continuidade: 'G1' }, { nome: 'lado', pontos: ['B', P(200, 100), 'B1'] },
      ],
      retalhos: [{ nome: 'metade', borda: ['baixo', 'lado', 'cima', 'plano'] }],
    };
    expect(() => gaiolaPorRede(d)).toThrow(/plano de simetria x = 0.*metade espelhada/);
  });

  it('a dobra de faces com a G2 declarada recusa a rede pela G2, e não manda declarar liso: false', () => {
    /* o disco de raio 100 mm dentro do anel até 220 mm, num paraboloide, com a curva fechada de dentro declarada G2 */
    const y = (x, z) => -(x * x + z * z) / 3000;
    const pt = (r, a) => { const x = r * Math.cos(a); const z = r * Math.sin(a); return [x, y(x, z), z]; };
    const nos = {};
    for (let k = 0; k < 4; k++) { nos[`i${k}`] = { curva: 'dentro', fracao: k / 4 }; nos[`o${k}`] = { curva: 'fora', fracao: k / 4 }; }
    const circulo = (r, nome, extra) => ({ nome, fechada: true, pontos: Array.from({ length: 8 }, (_, k) => pt(r, (2 * Math.PI * k) / 8)), ...extra });
    const curvas = [circulo(100, 'dentro', { continuidade: 'G2' }), circulo(220, 'fora', {})];
    for (let k = 0; k < 4; k++) curvas.push({ nome: `raio${k}`, pontos: [`i${k}`, pt(160, (2 * Math.PI * k) / 4), `o${k}`] });
    const arco = (c, k) => ({ curva: c, de: `${c === 'dentro' ? 'i' : 'o'}${k}`, ate: `${c === 'dentro' ? 'i' : 'o'}${(k + 1) % 4}` });
    const retalhos = [{ nome: 'miolo', borda: [0, 1, 2, 3].map((k) => arco('dentro', k)) }];
    for (let k = 0; k < 4; k++) retalhos.push({ nome: `anel${k}`, borda: [arco('dentro', k), { curva: `raio${k}`, de: `i${k}`, ate: `o${k}` }, arco('fora', k), { curva: `raio${(k + 1) % 4}`, de: `o${(k + 1) % 4}`, ate: `i${(k + 1) % 4}` }] });
    expect(() => gaiolaPorRede({ passo: 25, fora: [0, 1, 0], nos, curvas, retalhos })).toThrow(/'G2' declarada na curva 'dentro': a G2 é experimental/);
    /* a G1 na mesma curva monta */
    expect(gaiolaPorRede({ passo: 25, fora: [0, 1, 0], nos, curvas: [circulo(100, 'dentro', { continuidade: 'G1' }), ...curvas.slice(1)], retalhos }).emendas.dentro.continuidade).toBe('G1');
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
