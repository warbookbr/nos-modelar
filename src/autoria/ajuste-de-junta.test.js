/* ajuste-de-junta.test.js — o gesto do canto: quais juntas a peça tem, o que
   anda quando a pessoa puxa uma, e se o que ela desenhou cabe numa receita. */
import { describe, expect, it } from 'vitest';
import { RAIO_DE_JUNTA_PADRAO, aplicarAjusteDeJunta, detectarJuntas } from './ajuste-de-junta.js';
import { capturarAlvo, compararComAlvo } from './alvo-do-ajuste.js';
import { executarReceita } from './executar-receita.js';
import { descreverPeca } from './descrever-partes.js';
import { receitaComParametros } from './parametros-vivos.js';
import * as bicicleta from '../../prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js';

const receita = bicicleta.default ?? bicicleta;
const executar = (params) => executarReceita(params ? receitaComParametros(receita, params) : receita).neutro;
const PONTEIRA_ESQ = 'balancoInferiorEsq+balancoSuperiorEsq';
const PONTEIRA_DIR = 'balancoInferiorDir+balancoSuperiorDir';
const caixaDe = (neutro, nome) => descreverPeca(neutro).partes.find((p) => p.nome === nome);

describe('detectarJuntas', () => {
  it('acha os cantos do quadro, um por canto', () => {
    const juntas = detectarJuntas(executar());
    const nomes = juntas.map((j) => j.nome);
    expect(nomes).toContain(PONTEIRA_ESQ);
    expect(nomes).toContain(PONTEIRA_DIR);
    expect(nomes).toContain('tuboSelim+tuboSuperior');
    /* Seis cantos: as duas ponteiras, o movimento central, o encontro dos
       balanços superiores no tubo do selim, e as duas soldas do tubo superior.
       Mais que isso significa canto partido em pedaços. */
    expect(juntas).toHaveLength(6);
  });

  it('nomeia por parte, nunca por id de vértice', () => {
    for (const junta of detectarJuntas(executar())) {
      expect(junta.nome).toMatch(/^[A-Za-z]+(\+[A-Za-z]+)+(#\d+)?$/);
      expect(junta.partes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('é determinístico entre execuções', () => {
    const a = detectarJuntas(executar()).map((j) => [j.nome, j.posicao]);
    const b = detectarJuntas(executar()).map((j) => [j.nome, j.posicao]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('a ponteira esquerda fica no lado esquerdo e atrás do movimento central', () => {
    const ponteira = detectarJuntas(executar()).find((j) => j.nome === PONTEIRA_ESQ);
    expect(ponteira.posicao[0]).toBeLessThan(0);
    expect(ponteira.posicao[2]).toBeLessThan(-0.4);
  });
});

describe('aplicarAjusteDeJunta', () => {
  it('não toca a malha de entrada', () => {
    const base = executar();
    const antes = JSON.stringify([...base.V.entries()]);
    aplicarAjusteDeJunta(base, [{ junta: PONTEIRA_ESQ, deslocamento: [0, 0, -0.01] }]);
    expect(JSON.stringify([...base.V.entries()])).toBe(antes);
  });

  it('move só as partes que passam pela junta', () => {
    const base = executar();
    const depois = aplicarAjusteDeJunta(base, [{ junta: PONTEIRA_ESQ, deslocamento: [0, 0, -0.012] }]);
    for (const nome of ['balancoInferiorEsq', 'balancoSuperiorEsq']) {
      expect(caixaDe(depois, nome).dimensoes[2]).toBeGreaterThan(caixaDe(base, nome).dimensoes[2]);
    }
    for (const nome of ['balancoInferiorDir', 'balancoSuperiorDir', 'tuboSelim', 'tuboSuperior', 'tuboInferior']) {
      expect(caixaDe(depois, nome)).toEqual(caixaDe(base, nome));
    }
  });

  it('a ponta oposta da parte fica parada', () => {
    const base = executar();
    const depois = aplicarAjusteDeJunta(base, [{ junta: PONTEIRA_ESQ, deslocamento: [0, 0, -0.012] }]);
    /* O balanço esquerdo nasce na caixa do movimento central: a borda da frente
       não anda, só a de trás. */
    expect(caixaDe(depois, 'balancoInferiorEsq').max[2]).toBeCloseTo(caixaDe(base, 'balancoInferiorEsq').max[2], 9);
    expect(caixaDe(depois, 'balancoInferiorEsq').min[2]).toBeLessThan(caixaDe(base, 'balancoInferiorEsq').min[2]);
  });

  it('recusa junta que não existe e deslocamento inválido', () => {
    const base = executar();
    expect(() => aplicarAjusteDeJunta(base, [{ junta: 'naoExiste', deslocamento: [0, 0, 1] }])).toThrow(/desconhecida/);
    expect(() => aplicarAjusteDeJunta(base, [{ junta: PONTEIRA_ESQ, deslocamento: [0, 0] }])).toThrow(/deslocamento/);
    expect(() => aplicarAjusteDeJunta(base, 'nada')).toThrow(/lista/);
  });

  /* A PROVA DE QUE O GESTO CABE NUMA RECEITA. Puxar as duas ponteiras para trás
     é o ajuste que o autor tentou fazer com a seta. O alvo que sai desse gesto
     é reproduzido pela receita com `balancoTraseiro` 12 mm maior, dentro da
     tolerância de meio milímetro. Sem isto, a rodada de absorção estaria
     perseguindo um alvo que nenhuma receita alcança. */
  it('puxar as duas ponteiras é o mesmo que alongar o balanço', () => {
    const base = executar();
    const queda = receita.PARAMS.quedaDoMovimentoCentral;
    const recuo = (comprimento) => Math.sqrt(comprimento ** 2 - queda ** 2);
    const dz = -(recuo(514) - recuo(502)) / 1000;

    const ajustada = aplicarAjusteDeJunta(base, [
      { junta: PONTEIRA_ESQ, deslocamento: [0, 0, dz] },
      { junta: PONTEIRA_DIR, deslocamento: [0, 0, dz] },
    ]);
    const alvo = capturarAlvo(ajustada, { peca: 'bicicleta-quadro' });
    const veredito = compararComAlvo(executar({ ...receita.PARAMS, balancoTraseiro: 514 }), alvo);

    expect(veredito.dentro).toBe(true);
    expect(veredito.piorMm).toBeLessThan(0.5);
  });

  it('a receita original não alcança o alvo do gesto', () => {
    const base = executar();
    const alvo = capturarAlvo(
      aplicarAjusteDeJunta(base, [
        { junta: PONTEIRA_ESQ, deslocamento: [0, 0, -0.012] },
        { junta: PONTEIRA_DIR, deslocamento: [0, 0, -0.012] },
      ]),
      { peca: 'bicicleta-quadro' },
    );
    expect(compararComAlvo(base, alvo).dentro).toBe(false);
  });

  it('o raio de junta é declarável', () => {
    expect(RAIO_DE_JUNTA_PADRAO).toBe(0.02);
    expect(detectarJuntas(executar(), { raio: 0.0005 }).length).toBeLessThan(6);
  });
});

describe('orçamento do arrasto', () => {
  it('aceita as juntas já detectadas e chega no mesmo resultado', () => {
    const base = executar();
    const juntas = detectarJuntas(base);
    const ajuste = [{ junta: PONTEIRA_ESQ, deslocamento: [0, 0, -0.012] }];
    const comLista = aplicarAjusteDeJunta(base, ajuste, { juntas });
    const semLista = aplicarAjusteDeJunta(base, ajuste);
    expect(JSON.stringify([...comLista.V.entries()])).toBe(JSON.stringify([...semLista.V.entries()]));
  });
});
