/* derivar.js — dos parâmetros da cadeira (milímetro) à chamada de composição (metro).

   Puro: recebe os parâmetros completos e devolve a composição da combinação (postes, saias, travessão, travessas, tábuas e
   ripas) e os argumentos dela, todos gerados por `planoDaCadeira` a partir das caixas em milímetro. */
import { planoDaCadeira } from './composicoes.js';
import { combinacaoDaCadeira, idDaCadeira } from './geometria.js';

export function derivar(parametros) {
  const { argumentos } = planoDaCadeira(parametros);
  return { composicao: idDaCadeira(combinacaoDaCadeira(parametros)), argumentos };
}
