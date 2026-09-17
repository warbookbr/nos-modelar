/* ajuste-de-junta.test.js — o gesto do canto: quais juntas a peça tem, o que
   anda quando a pessoa puxa uma, e se o que ela desenhou cabe numa receita. */
import { describe, expect, it } from 'vitest';
import { RAIO_DE_JUNTA_PADRAO, aplicarAjusteDeJunta, detectarJuntas } from './ajuste-de-junta.js';
import { capturarAlvo, compararComAlvo } from './alvo-do-ajuste.js';
import { executarReceita } from './executar-receita.js';
import { descreverPeca } from './descrever-partes.js';
import { receitaComParametros } from './parametros-vivos.js';
import * as prova from '../../tools/fixtures/acervo/peca-de-prova/receita.js';
import { derivar } from '../../tools/fixtures/acervo/peca-de-prova/receita.js';

const receita = prova.default ?? prova;
const executar = (params) => executarReceita(params ? receitaComParametros(receita, params) : receita).neutro;
const TOPO_ESQ = 'travessa+tuboEsquerdo';
const TOPO_DIR = 'travessa+tuboDireito';
const caixaDe = (neutro, nome) => descreverPeca(neutro).partes.find((p) => p.nome === nome);

describe('detectarJuntas', () => {
  it('acha os cantos da peça, um por canto', () => {
    const juntas = detectarJuntas(executar());
    const nomes = juntas.map((j) => j.nome);
    expect(nomes).toContain(TOPO_ESQ);
    expect(nomes).toContain(TOPO_DIR);
    expect(nomes).toContain('tuboDeitado+tuboDireito+tuboEsquerdo');
    /* Três cantos: os dois topos onde a travessa encosta, e a base onde os três
       tubos se encontram. Mais que isso significa canto partido em pedaços, que
       é o que acontece quando o tubo é grosso demais para o raio de junta. */
    expect(juntas).toHaveLength(3);
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

  it('o topo esquerdo fica do lado esquerdo, em cima e do lado de z positivo', () => {
    const topo = detectarJuntas(executar()).find((j) => j.nome === TOPO_ESQ);
    expect(topo.posicao[0]).toBeLessThan(0);
    expect(topo.posicao[1]).toBeGreaterThan(0.5);
    expect(topo.posicao[2]).toBeGreaterThan(0.4);
  });
});

describe('aplicarAjusteDeJunta', () => {
  it('não toca a malha de entrada', () => {
    const base = executar();
    const antes = JSON.stringify([...base.V.entries()]);
    aplicarAjusteDeJunta(base, [{ junta: TOPO_ESQ, deslocamento: [0, 0, -0.01] }]);
    expect(JSON.stringify([...base.V.entries()])).toBe(antes);
  });

  it('move só as partes que passam pela junta', () => {
    const base = executar();
    /* O topo esquerdo está em z positivo, então puxá-lo para +z estica quem
       passa por ele; puxar para -z encolheria e a afirmação mediria o contrário. */
    const depois = aplicarAjusteDeJunta(base, [{ junta: TOPO_ESQ, deslocamento: [0, 0, 0.012] }]);
    for (const nome of ['tuboEsquerdo', 'travessa']) {
      expect(caixaDe(depois, nome).dimensoes[2]).toBeGreaterThan(caixaDe(base, nome).dimensoes[2]);
    }
    for (const nome of ['tuboDeitado']) {
      expect(caixaDe(depois, nome)).toEqual(caixaDe(base, nome));
    }
  });

  it('a ponta oposta da parte fica parada', () => {
    const base = executar();
    const depois = aplicarAjusteDeJunta(base, [{ junta: TOPO_ESQ, deslocamento: [0, 0, 0.012] }]);
    /* O tubo esquerdo nasce no cubo central: a borda de z mais alto é a que
       encosta na travessa e anda, e a oposta fica onde estava. "Fica onde
       estava" é medido em proporção ao que a junta andou, e não em casas
       decimais: a borda de baixo não está exatamente no zero, porque o cubo tem
       raio, então a interpolação a toca de leve. Nove micrômetros para uma
       puxada de doze milímetros é menos de um milésimo do gesto. */
    const sobrou = Math.abs(caixaDe(depois, 'tuboEsquerdo').min[2] - caixaDe(base, 'tuboEsquerdo').min[2]);
    expect(sobrou).toBeLessThan(0.012 / 1000);
    expect(caixaDe(depois, 'tuboEsquerdo').max[2]).toBeGreaterThan(caixaDe(base, 'tuboEsquerdo').max[2]);
  });

  it('recusa junta que não existe e deslocamento inválido', () => {
    const base = executar();
    expect(() => aplicarAjusteDeJunta(base, [{ junta: 'naoExiste', deslocamento: [0, 0, 1] }])).toThrow(/desconhecida/);
    expect(() => aplicarAjusteDeJunta(base, [{ junta: TOPO_ESQ, deslocamento: [0, 0] }])).toThrow(/deslocamento/);
    expect(() => aplicarAjusteDeJunta(base, 'nada')).toThrow(/lista/);
  });

  /* A PROVA DE QUE O GESTO CABE NUMA RECEITA. Puxar os dois topos para fora é o
     mesmo que alongar os tubos que sobem, e o alvo que sai desse gesto é
     reproduzido pela receita com `comprimentoDoTubo` maior, dentro da tolerância
     de meio milímetro. Sem isto, a rodada de absorção estaria perseguindo um
     alvo que nenhuma receita alcança. O deslocamento de cada junta não é
     inventado: sai da diferença entre o que `derivar` devolve com o número
     antigo e com o novo. */
  it('puxar os dois topos é o mesmo que alongar os tubos', () => {
    const base = executar();
    const maior = { ...receita.PARAMS, comprimentoDoTubo: receita.PARAMS.comprimentoDoTubo + 20 };
    const de = derivar(receita.PARAMS);
    const para = derivar(maior);
    const delta = (a, b) => [0, 1, 2].map((i) => b[i] - a[i]);

    const ajustada = aplicarAjusteDeJunta(base, [
      { junta: TOPO_ESQ, deslocamento: delta(de.topoEsq, para.topoEsq) },
      { junta: TOPO_DIR, deslocamento: delta(de.topoDir, para.topoDir) },
    ]);
    const alvo = capturarAlvo(ajustada, { peca: 'peca-de-prova' });
    const veredito = compararComAlvo(executar(maior), alvo);

    expect(veredito.dentro).toBe(true);
    expect(veredito.piorMm).toBeLessThan(0.5);
  });
});
