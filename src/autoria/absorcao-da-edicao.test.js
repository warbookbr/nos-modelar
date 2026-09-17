/* absorcao-da-edicao.test.js — o laço inteiro: a pessoa edita a malha, a receita
   é reescrita, e a medida diz se chegou.
 *
 * É a prova que o plano "Modo de edição de malha" pede no gate de saída, e ela
 * responde a pergunta que quase derrubou o plano. Variar os números que a
 * receita já declara NÃO alcança uma edição livre; medido, mover um vértice 5 mm
 * deixa a melhor busca sobre os vinte e nove parâmetros a 2,531 mm, cinco vezes
 * a tolerância. A rodada de absorção não faz isso: ela REESCREVE a receita.
 *
 * O caso escolhido é o que nenhum número atual alcança. O triângulo principal da
 * bicicleta é simétrico no plano do meio, e por isso nenhum parâmetro desloca o
 * tubo do selim para o lado — é a mesma razão pela qual a bancada não desenha
 * seta de x naquela parte. A edição empurra o anel de cima do tubo 6 mm em x, e
 * a reescrita dá à receita o número que faltava. */
import { describe, expect, it } from 'vitest';
import { capturarAlvo, compararComAlvo } from './alvo-do-ajuste.js';
import { executarReceita } from './executar-receita.js';
import { conferirAbsorcao } from './origem-de-parametro.js';
import { moverSelecaoDaMalha, topologiaDaMalhaNeutra } from '../bancada/edicao-de-malha.js';
import * as prova from '../../tools/fixtures/acervo/peca-de-prova/receita.js';
import { derivar } from '../../tools/fixtures/acervo/peca-de-prova/receita.js';

const receita = prova.default ?? prova;
const DESVIO = 0.006;

function alvoDaEdicao() {
  const base = executarReceita(receita).neutro;
  const topologia = topologiaDaMalhaNeutra(base, { partes: ['tuboDeitado'] });
  /* O ANEL DA PONTA LIVRE. `tuboDeitado` sai do cubo central e termina solto, e
     é a ponta solta que se empurra: o anel é escolhido pela distância ao ponto
     que `derivar` chama de `frente`, e não por altura, porque o tubo é
     inclinado e altura não separa anel de anel. */
  const frente = derivar(receita.PARAMS).frente;
  const distancia = (id) => {
    const p = base.V.get(Number(id));
    return Math.hypot(...[0, 1, 2].map((i) => p[i] - frente[i]));
  };
  /* O limiar é uma vez e meia o raio do tubo: pega o anel, que está a um raio
     do ponto da ponta, e o vértice de polo que o loft põe um milímetro adiante,
     sem alcançar o anel do outro extremo. Medir em relação ao mais próximo não
     serve, porque o polo fica a um milímetro e o anel a vinte e dois. */
  const alcance = (receita.PARAMS.raioDoTubo / 1000) * 1.5;
  const anelDaPonta = topologia.vertices.filter((id) => distancia(id) < alcance);
  const editada = moverSelecaoDaMalha(base, topologia, { modo: 'vertice', selecionados: anelDaPonta }, [DESVIO, 0, 0]);
  return { base, alvo: capturarAlvo(editada, { peca: 'peca-de-prova' }), anelDaPonta };
}

/* A reescrita, escrita aqui em vez de gravada na peça: o desvio de 6 mm é um
   caso de prova. O que ela faz é o que a rodada de absorção faria no arquivo —
   acrescentar o número que falta, ligá-lo ao passo que constrói a parte, e
   declarar de onde ele veio. */
function receitaReescrita() {
  const PARAMS = { ...receita.PARAMS, desvioLateralDaPontaDoDeitado: DESVIO * 1000 };
  return {
    ...receita,
    PARAMS,
    ORIGENS: {
      ...receita.ORIGENS,
      desvioLateralDaPontaDoDeitado: 'desenhado na bancada: a ponta livre do tubo deitado, 6 mm em x',
    },
    get PASSOS() {
      const passos = receita.PASSOS.map((passo) => (Array.isArray(passo) ? [passo[0], { ...passo[1] }] : passo));
      const loft = passos.find(([op, corpo]) => op === 'loft' && corpo.origemId === 40);
      const secoes = loft[1].secoes.map((sec) => ({ ...sec, pos: [...sec.pos] }));
      /* As duas seções da ponta ganham o x; as do começo nascem no cubo. */
      const ordenadas = [...secoes].sort((a, b) => b.pos[2] - a.pos[2]);
      for (const secao of ordenadas.slice(0, 2)) secao.pos[0] += DESVIO;
      loft[1].secoes = secoes;
      return passos;
    },
  };
}

describe('absorver uma edição de malha', () => {
  it('a edição sai de dentro do tubo deitado e não toca o resto da peça', () => {
    const { base, alvo, anelDaPonta } = alvoDaEdicao();
    expect(anelDaPonta.length).toBeGreaterThan(8);
    const veredito = compararComAlvo(base, alvo);
    const fora = veredito.partes.filter((p) => !p.dentro).map((p) => p.parte);
    expect(fora).toEqual(['tuboDeitado']);
  });

  it('a receita como está não alcança a edição', () => {
    const { base, alvo } = alvoDaEdicao();
    const veredito = compararComAlvo(base, alvo);
    expect(veredito.dentro).toBe(false);
    expect(veredito.piorMm).toBeGreaterThan(5);
  });

  it('a receita reescrita chega na edição, dentro da tolerância', () => {
    const { alvo } = alvoDaEdicao();
    const veredito = compararComAlvo(executarReceita(receitaReescrita()).neutro, alvo);
    expect(veredito.dentro).toBe(true);
    expect(veredito.piorMm).toBeLessThan(0.5);
  });

  it('o parâmetro novo diz de onde veio, senão a absorção reprova', () => {
    const nova = receitaReescrita();
    expect(conferirAbsorcao(receita, nova).ok).toBe(true);
    expect(conferirAbsorcao(receita, nova).novos).toEqual(['desvioLateralDaPontaDoDeitado']);

    const semOrigem = { ...nova, ORIGENS: receita.ORIGENS };
    expect(conferirAbsorcao(receita, semOrigem).ok).toBe(false);
  });

  it('o alvo salvo não carrega id de vértice, índice de array nem posição de passo', () => {
    const { alvo } = alvoDaEdicao();
    for (const parte of alvo.partes) {
      expect(Object.keys(parte).sort()).toEqual(['faces', 'max', 'min', 'parte', 'pontos']);
      expect(typeof parte.parte).toBe('string');
      /* `faces` é quantas faces a parte tem, e não quais: contagem não é
         identidade, e é o que faz a régua enxergar duplicar e criar face. */
      expect(Number.isInteger(parte.faces)).toBe(true);
      for (const ponto of parte.pontos) expect(ponto).toHaveLength(3);
    }
    expect(JSON.stringify(alvo)).not.toMatch(/"(vertice|vértice|face|passo|indice|índice|id)"/i);
  });

  it('o alvo é o mesmo em duas capturas da mesma edição', () => {
    expect(JSON.stringify(alvoDaEdicao().alvo)).toBe(JSON.stringify(alvoDaEdicao().alvo));
  });
});
