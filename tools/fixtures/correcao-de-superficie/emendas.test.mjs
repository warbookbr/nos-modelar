/* emendas.test.mjs — o item 3 do gate de saída do plano das ferramentas de correção de superfície (fatia 4): nas chapas emendadas com a
 * continuidade declarada na curva da emenda (`continuidade` de `gaiolaPorRede`), `continuidade-nas-emendas.mjs` (o `npm run emendas`) mede
 * o ângulo e a razão de curvatura dentro do declarado, fora dos vértices extraordinários: G1 com o ângulo abaixo de 0,5 grau, G2 também com
 * a razão abaixo de 1,2. As mesmas chapas sem a declaração são o antes: a G1 passa de 0,5 grau nas pontas da emenda.
 *
 * A `emenda-g1-em-g2` (a superfície G1, de razão 3, com a G2 declarada) é o limite medido: a faixa iguala a curvatura no miolo da emenda,
 * a mais de três espaçamentos das pontas, e nas pontas, onde as curvas da borda trazem o salto de curvatura nos pontos-chave, a razão sobe
 * até 1,6.
 *
 * As chapas que a revisão da fatia 4 pediu: a `emenda-dupla` (dupla curvatura, a mesma dos dois lados), a `emenda-inflexao` (a seção em S,
 * de tangente comum e curvatura que troca de sinal) e a `rede-ponta-com-ponta` (as duas metades de uma curva emendada que se encontram
 * ponta com ponta no nó de outra curva emendada), com a G1 declarada; a G2 na dupla curvatura é o limite medido da G2 experimental. As da
 * segunda revisão: a `rede-em-fila` (o deslocamento de cada declaração separado do da vizinha), a `emenda-inflexao-lisa-declarada` (a
 * curvatura que passa por zero na emenda não é salto de sinal) e a `rede-tres-no-no` (o empate no nó não junta e não depende da ordem). */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { continuidadeNasEmendas } from '../../modelar/continuidade-nas-emendas.mjs';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { DECLARACOES_EM_FILA, definicaoDaEmenda, definicaoEmFila, definicaoPontaComPonta, definicaoTresNoNo, receitaDeProva } from './chapas.mjs';

const LIMITE_G1_GRAUS = 0.5;
const LIMITE_G2_RAZAO = 1.2;

/* as amostras da emenda entre as duas chapas, fora dos vértices extraordinários que a gaiola declara na curva (a um espaçamento deles) */
function amostras(nome) {
  const receita = receitaDeProva(nome);
  const { json } = continuidadeNasEmendas(executarReceita(receita).neutro, { nome });
  expect(json.emendas).toHaveLength(1);
  const extra = (receita.REDE.emendas?.emenda?.extraordinarios ?? []).map((p) => receita.REDE.pontos[p].map((c) => c * 1000));
  const fora = json.emendas[0].amostras.filter((a) => extra.every((e) => Math.hypot(a[1] - e[0], a[2] - e[1], a[3] - e[2]) > 30));
  const mediana = (k) => fora.map((a) => a[k]).sort((p, q) => p - q)[fora.length >> 1];
  return { receita, fora, angulo: Math.max(...fora.map((a) => a[6])), razao: Math.max(...fora.map((a) => a[9])), kA: mediana(7), kB: mediana(8) };
}

/* a maior distância (mm) entre os pontos de mesmo nome de duas gaiolas */
function maiorDiferenca(a, b) {
  let m = 0;
  for (const [k, p] of Object.entries(a.pontos)) { const q = b.pontos[k]; if (q) m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * 1000); }
  return m;
}

/* o ângulo (graus) entre as direções com que as curvas `a` (que termina no nó) e `b` (que começa nele) passam pelo nó */
function anguloNoNo(g, a, b) {
  const p = g.pontoDaCurva(a, 1); const pa = g.pontoDaCurva(a, 1 - 1e-4); const pb = g.pontoDaCurva(b, 1e-4);
  const u = p.map((x, k) => x - pa[k]); const v = pb.map((x, k) => x - p[k]);
  return (Math.acos(Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v)))) * 180) / Math.PI;
}

describe('a emenda com continuidade declarada, medida por emendas', () => {
  it('G1 declarada na chapa G1: o ângulo abaixo de 0,5 grau em toda a emenda, e sem a declaração passava', () => {
    const antes = amostras('emenda-g1');
    expect(antes.angulo).toBeGreaterThan(LIMITE_G1_GRAUS);
    const depois = amostras('emenda-g1-declarada');
    expect(depois.fora.length).toBeGreaterThan(50);
    expect(depois.angulo).toBeLessThan(LIMITE_G1_GRAUS);
    /* a G1 deixa a curvatura de cada lado: a razão fica mais perto dos 3 da superfície que sem a declaração */
    expect(depois.razao).toBeGreaterThan(antes.razao);
    expect(depois.receita.REDE.emendas.emenda).toMatchObject({ continuidade: 'G1', extraordinarios: [] });
  });

  it('G2 declarada na chapa G2: o ângulo abaixo de 0,5 grau e a razão abaixo de 1,2 em toda a emenda', () => {
    const antes = amostras('emenda-g2');
    const depois = amostras('emenda-g2-declarada');
    expect(depois.fora.length).toBeGreaterThan(50);
    expect(depois.angulo).toBeLessThan(LIMITE_G1_GRAUS);
    expect(depois.razao).toBeLessThan(LIMITE_G2_RAZAO);
    expect(depois.angulo).toBeLessThan(antes.angulo);
  });

  it('G2 declarada na chapa G1: a razão abaixo de 1,2 no miolo da emenda, a mais de três espaçamentos das pontas, e o ângulo abaixo de 0,5 grau', () => {
    const { fora, angulo } = amostras('emenda-g1-em-g2');
    /* o espaçamento da gaiola ao longo da emenda é 400/14 mm; nas três fileiras de cada ponta a razão sobe até 1,6 (o limite medido) */
    const miolo = fora.filter((a) => a[0] > (3 * 400) / 14 && a[0] < 400 - (3 * 400) / 14);
    expect(miolo.length).toBeGreaterThan(30);
    expect(Math.max(...miolo.map((a) => a[9]))).toBeLessThan(LIMITE_G2_RAZAO);
    expect(angulo).toBeLessThan(LIMITE_G1_GRAUS);
  });

  it('dupla curvatura: a G1 declarada fica abaixo de 0,5 grau sem mover a forma, e a G2 é o limite medido, experimental', () => {
    const antes = amostras('emenda-dupla');
    expect(antes.angulo).toBeGreaterThan(LIMITE_G1_GRAUS);
    const depois = amostras('emenda-dupla-declarada');
    expect(depois.fora.length).toBeGreaterThan(50);
    expect(depois.angulo).toBeLessThan(LIMITE_G1_GRAUS);
    const rede = depois.receita.REDE;
    expect(rede.emendas.emenda.deslocamentoMaximoMm).toBeLessThan(0.5);
    expect(rede.avisos.filter((a) => a.ref.startsWith('emenda'))).toEqual([]);
    /* a G2 na mesma superfície, de curvatura igual dos dois lados: o peso da faixa leva a gaiola a mais de 20 mm, e os avisos dizem */
    const g2 = gaiolaPorRede(definicaoDaEmenda('emenda-dupla', { continuidade: 'G2' }));
    expect(g2.emendas.emenda.experimental).toBe(true);
    expect(g2.emendas.emenda.deslocamentoMaximoMm).toBeGreaterThan(20);
    expect(g2.avisos.filter((a) => a.ref.startsWith('emenda')).map((a) => a.ref)).toEqual(['emendaG2Experimental', 'emendaMoveu', 'emendaAcimaDoLimite']);
  });

  it('seção com inflexão: a G1 declarada fica abaixo de 0,5 grau com a curvatura de sinais opostos, e a razão da gaiola sai negativa', () => {
    const antes = amostras('emenda-inflexao');
    const depois = amostras('emenda-inflexao-declarada');
    expect(depois.fora.length).toBeGreaterThan(50);
    expect(depois.angulo).toBeLessThan(LIMITE_G1_GRAUS);
    expect(depois.angulo).toBeLessThan(antes.angulo);
    expect(Math.sign(depois.kA)).toBe(-Math.sign(depois.kB));
    /* a curvatura de cada lado fica mais perto da desenhada (1/0,6 m) que sem a declaração */
    expect(Math.abs(depois.kA)).toBeGreaterThan(Math.abs(antes.kA));
    expect(depois.receita.REDE.emendas.emenda.razaoMaxima).toBeCloseTo(-1, 1);
    const g2 = gaiolaPorRede(definicaoDaEmenda('emenda-inflexao', { continuidade: 'G2' }));
    expect(g2.avisos.find((a) => a.ref === 'emendaAcimaDoLimite').razaoMaxima).toBeLessThan(0);
  });

  it('curvas emendadas ponta com ponta no nó de outra emendada: se juntam, e as quatro emendas ficam abaixo de 0,5 grau', () => {
    const sem = gaiolaPorRede(definicaoPontaComPonta());
    expect(anguloNoNo(sem, 'H1', 'H2')).toBeGreaterThan(2);
    const receita = receitaDeProva('rede-ponta-com-ponta');
    const g = receita.REDE;
    expect(anguloNoNo(g, 'H1', 'H2')).toBeLessThan(0.01);
    expect(anguloNoNo(g, 'b1', 'b2')).toBeLessThan(0.01);
    expect(g.emendas.V.juncoes.map((j) => j.no)).toEqual(['B', 'M', 'G']);
    expect(g.emendas.V.juncoes[1].curvas).toEqual(['H1', 'H2']);
    const { json } = continuidadeNasEmendas(executarReceita(receita).neutro, { nome: 'rede-ponta-com-ponta' });
    expect(json.emendas).toHaveLength(4);
    for (const e of json.emendas) {
      const medidas = e.amostras.filter((a) => a[6] != null);
      expect(medidas.length).toBeGreaterThan(10);
      expect(Math.max(...medidas.map((a) => a[6]))).toBeLessThan(LIMITE_G1_GRAUS);
    }
  });

  it('o deslocamento de cada curva é o da declaração dela: na fila com G2 em v1 e G1 em v2, o aviso de v2 é o que a G1 dela move', () => {
    const g = receitaDeProva('rede-em-fila').REDE;
    expect(g.emendas.v1.deslocamentoDe).toBe('curva');
    /* a referência de v2 é a rede com a G2 de v1 só: a diferença entre as duas gaiolas é o deslocamento de v2 */
    const semV2 = gaiolaPorRede(definicaoEmFila({ declaracoes: { v1: DECLARACOES_EM_FILA.v1 } }));
    expect(g.emendas.v2.deslocamentoMaximoMm).toBeCloseTo(maiorDiferenca(semV2, g), 2);
    const semV1 = gaiolaPorRede(definicaoEmFila({ declaracoes: { v2: DECLARACOES_EM_FILA.v2 } }));
    expect(g.emendas.v1.deslocamentoMaximoMm).toBeCloseTo(maiorDiferenca(semV1, g), 2);
    /* antes as duas saíam com os 15,6 mm do conjunto; a G1 de v2 move bem menos que a G2 de v1 */
    expect(g.emendas.v2.deslocamentoMaximoMm).toBeLessThan(g.emendas.v1.deslocamentoMaximoMm / 2);
    /* a medida olha a gaiola inteira: a G2 de v1 sozinha move também o retalho r2, que não é lado dela */
    const soV1 = gaiolaPorRede(definicaoEmFila({ declaracoes: { v1: 'G2' } }));
    const r2 = Math.max(...Object.keys(soV1.pontos).filter((k) => k.startsWith('r2.')).map((k) => Math.hypot(...soV1.pontos[k].map((x, i) => x - gaiolaPorRede(definicaoEmFila()).pontos[k][i])) * 1000));
    expect(r2).toBeGreaterThan(5);
    expect(soV1.emendas.v1.deslocamentoMaximoMm).toBeGreaterThanOrEqual(r2);
    /* com mais de quatro curvas emendadas o deslocamento é do conjunto, num aviso só, com as curvas em volta do ponto */
    const cinco = gaiolaPorRede({ ...definicaoEmFila({ declaracoes: { v1: 'G1', v2: 'G1', v3: 'G1', v4: 'G1', v5: 'G1' }, retalhos: 6 }), limitesDaEmenda: { tolerancia: 0.1 } });
    expect(Object.values(cinco.emendas).every((e) => e.deslocamentoDe === 'conjunto')).toBe(true);
    const moveu = cinco.avisos.filter((a) => a.ref === 'emendaMoveu');
    expect(moveu).toHaveLength(1);
    expect(moveu[0]).toMatchObject({ conjunto: true, curvas: ['v1'] });
    expect(moveu[0].texto).toMatch(/do conjunto/);
  });

  it('inflexão lisa: a curvatura que passa por zero na emenda não é salto de sinal, e o S de dois arcos continua sendo', () => {
    const g = receitaDeProva('emenda-inflexao-lisa-declarada').REDE;
    expect(g.emendas.emenda.razaoMaxima).toBeGreaterThan(0);
    expect(g.avisos.filter((a) => a.ref === 'emendaAcimaDoLimite')).toEqual([]);
    expect(gaiolaPorRede(definicaoDaEmenda('emenda-inflexao', { continuidade: 'G2' })).emendas.emenda.razaoMaxima).toBeLessThan(0);
    const { angulo, kA, kB } = amostras('emenda-inflexao-lisa-declarada');
    expect(angulo).toBeLessThan(LIMITE_G1_GRAUS);
    expect(Math.max(Math.abs(kA), Math.abs(kB))).toBeLessThan(0.5);
  });

  it('o empate no nó de três curvas não junta nenhuma, avisa, e a gaiola não depende da ordem das curvas', () => {
    const g = receitaDeProva('rede-tres-no-no').REDE;
    expect(g.emendas.V.juncoes.map((j) => j.no)).toEqual(['B', 'G']);
    expect(g.avisos.find((a) => a.ref === 'emendaEmpate').curvas.sort()).toEqual(['H1', 'X2', 'X3']);
    expect(maiorDiferenca(g, gaiolaPorRede(definicaoTresNoNo({ ordem: 2 })))).toBe(0);
    /* sem empate, a mais reta se junta e a outra fica sem par */
    const reta = gaiolaPorRede(definicaoTresNoNo({ dz: [10, 40] }));
    expect(reta.emendas.V.juncoes[1]).toEqual({ no: 'M', curvas: ['H1', 'X2'] });
    expect(reta.avisos.find((a) => a.ref === 'emendaSemPar').curvas).toEqual(['X3']);
  });

  it('a continuação não emendada da emenda não é curva sem par, e a quebra entre duas peças emendadas avisa', () => {
    const continua = gaiolaPorRede(definicaoPontaComPonta({ continuidade: 'G1', declaradas: ['V1'], partirV: true }));
    expect(continua.emendas.V1.juncoes.map((j) => j.no)).toEqual(['B', 'M']);
    expect(continua.avisos.filter((a) => a.ref.startsWith('emenda'))).toEqual([]);
    const pecas = gaiolaPorRede(definicaoPontaComPonta({ continuidade: 'G1', declaradas: ['V1', 'V2'], partirV: true }));
    const quebra = pecas.avisos.find((a) => a.ref === 'emendaQuebrada');
    expect(quebra).toMatchObject({ no: 'M', curvas: ['V1', 'V2'] });
    expect(quebra.quebraGraus).toBeGreaterThan(0.5);
    /* com a horizontal também emendada, as duas peças atravessam H1 e H2 e se juntam */
    const tudo = gaiolaPorRede(definicaoPontaComPonta({ continuidade: 'G1', declaradas: ['V1', 'V2', 'H1', 'H2'], partirV: true }));
    expect(tudo.emendas.H1.juncoes.map((j) => j.curvas.join('|'))).toContain('V1|V2');
    expect(tudo.avisos.filter((a) => a.ref === 'emendaQuebrada')).toEqual([]);
  });
});

