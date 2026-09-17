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
import * as bicicleta from '../../prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js';

const receita = bicicleta.default ?? bicicleta;
const DESVIO = 0.006;

function alvoDaEdicao() {
  const base = executarReceita(receita).neutro;
  const topologia = topologiaDaMalhaNeutra(base, { partes: ['tuboSelim'] });
  const alturas = topologia.vertices.map((id) => ({ id, y: base.V.get(Number(id))[1] }));
  const maisAlto = Math.max(...alturas.map((a) => a.y));
  const anelDeCima = alturas.filter((a) => maisAlto - a.y < 0.02).map((a) => a.id);
  const editada = moverSelecaoDaMalha(base, topologia, { modo: 'vertice', selecionados: anelDeCima }, [DESVIO, 0, 0]);
  return { base, alvo: capturarAlvo(editada, { peca: 'bicicleta-quadro' }), anelDeCima };
}

/* A reescrita, escrita aqui em vez de gravada na bicicleta: o desvio de 6 mm é
   um caso de prova, e não uma decisão de desenho do autor. O que ela faz é o que
   a rodada de absorção faria no arquivo — acrescentar o número que falta, ligá-lo
   ao passo que constrói a parte, e declarar de onde ele veio. */
function receitaReescrita() {
  const PARAMS = { ...receita.PARAMS, desvioLateralTopoTuboSelim: DESVIO * 1000 };
  return {
    ...receita,
    PARAMS,
    ORIGENS: {
      ...receita.ORIGENS,
      desvioLateralTopoTuboSelim: 'desenhado na bancada: o anel de cima do tubo do selim, 6 mm em x',
    },
    get PASSOS() {
      const passos = receita.PASSOS.map((passo) => (Array.isArray(passo) ? [passo[0], { ...passo[1] }] : passo));
      const loft = passos.find(([op, corpo]) => op === 'loft' && corpo.origemId === 102);
      const secoes = loft[1].secoes.map((s) => ({ ...s, pos: [...s.pos] }));
      /* As duas seções de cima ganham o x; as de baixo nascem no plano do meio. */
      const ordenadas = [...secoes].sort((a, b) => b.pos[1] - a.pos[1]);
      for (const secao of ordenadas.slice(0, 2)) secao.pos[0] += DESVIO;
      loft[1].secoes = secoes;
      return passos;
    },
  };
}

describe('absorver uma edição de malha', () => {
  it('a edição sai de dentro do tubo do selim e não toca o resto da peça', () => {
    const { base, alvo, anelDeCima } = alvoDaEdicao();
    expect(anelDeCima).toHaveLength(15);
    const veredito = compararComAlvo(base, alvo);
    const fora = veredito.partes.filter((p) => !p.dentro).map((p) => p.parte);
    expect(fora).toEqual(['tuboSelim']);
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
    expect(conferirAbsorcao(receita, nova).novos).toEqual(['desvioLateralTopoTuboSelim']);

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
