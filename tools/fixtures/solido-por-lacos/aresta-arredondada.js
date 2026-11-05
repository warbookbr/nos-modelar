/* aresta-arredondada.js — a peça de comparação do terceiro limite da peça de teste: uma caixa da mesma seção da parte deitada
 * (190 mm de largura, de y = 20 a 210) com a aresta de cima em +x arredondada por `arredondarAresta` com o raio dos cantos da
 * seção (32 mm). O canto que ela dá é o que a receita pede quando declara o raio; o canto da subdivisão, com os pontos da
 * gaiola no mesmo arco, sai mais macio, e `medir.mjs` mede os dois do mesmo jeito, no corte z = 0. */
import { TABELA, m } from './forma.js';

const PAINEIS = 8;

export function gerarPassos(T = TABELA) {
  const L = T.meiaLargura;
  const yBaixo = T.alturaDoEixo - L;
  return [
    ['cubo', { origemId: 1, larg: m(2 * L), alt: m(2 * L), prof: m(2 * L), em: [0, m(yBaixo), 0] }],
    ['arredondarAresta', {
      origemId: 2, raio: m(T.raioDosCantos), paineis: PAINEIS,
      sel: { origem: { op: 'cubo', id: 1 }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'x', lado: 'max' } } },
    }],
    ['parte', { nome: 'caixa', sel: { origem: { op: 'cubo', id: 1 } } }],
  ];
}

export default {
  meta: { nome: 'solido-por-lacos/aresta-arredondada', desc: 'caixa da seção da peça de teste com a aresta de cima arredondada por arredondarAresta' },
  TABELA,
  PARAMS: TABELA,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
