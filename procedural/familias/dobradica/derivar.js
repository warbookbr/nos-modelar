/* derivar.js — dos parâmetros da dobradiça (milímetro) à chamada de composição (metro).

   Puro: recebe os parâmetros completos e devolve a composição do conjunto, que reúne o pino e as duas folhas numa peça
   só, com os argumentos de cada uma. O número de nós e de furos escolhe a composição, porque a composição v1 só
   substitui valores. A montagem v5 chama as três composições soltas com os mesmos argumentos (`argumentosDasPecas`). */
import { idDoConjunto, nomeNoConjunto } from './composicoes.js';
import { argumentosDaFolha, argumentosDoPino, geometriaDaDobradica } from './geometria.js';

/** Os argumentos de cada peça da dobradiça, em metro, e a geometria de onde saíram. */
export function argumentosDasPecas(parametros) {
  const geometria = geometriaDaDobradica(parametros);
  return {
    geometria,
    pino: argumentosDoPino(geometria),
    d: argumentosDaFolha(geometria, 'd'),
    e: argumentosDaFolha(geometria, 'e'),
  };
}

export function derivar(parametros) {
  const { pino, d, e } = argumentosDasPecas(parametros);
  const argumentos = {};
  for (const [quem, valores] of [['pino', pino], ['d', d], ['e', e]]) {
    for (const [nome, valor] of Object.entries(valores)) argumentos[nomeNoConjunto(quem, nome)] = valor;
  }
  return { composicao: idDoConjunto(parametros.nos, parametros.furos), argumentos };
}
