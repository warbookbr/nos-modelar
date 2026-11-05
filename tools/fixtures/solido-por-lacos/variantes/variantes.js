/* variantes.js — as tabelas que refazem, na peça de teste do sólido por laços, os limites que a gaiola de laços escrita à mão
 * mostrou, cada uma mudando só o que o limite pede sobre a tabela de referência de `../forma.js`. Os módulos ao lado abrem
 * cada uma na bancada, e `../medir-limites.mjs` mede todas. O terceiro limite (a aresta mais macia que a do `arredondarAresta`)
 * se mede na própria forma de referência, contra `../aresta-arredondada.js`, e não tem variante. */
import receita from '../receita.js';
import { TABELA } from '../forma.js';

export const VARIANTES = {
  /* limite 1: cota exata em todos os pontos da gaiola */
  medidasEmTodos: { ...TABELA, limites: { ...TABELA.limites, medidas: 'todos' } },
  /* limite 2: os planos de corte a menos de 2,5 mm entre si ficam (sai só o repetido) */
  planosProximos: { ...TABELA, limites: { ...TABELA.limites, distanciaMinimaEntrePlanos: 0 } },
  /* limite 4: metade dos planos de corte por quarto de quina em planta (3 em vez de 6) */
  poucosPlanosNaQuina: { ...TABELA, estacoesDaQuina: 3 },
  /* limite 4: 4 pontos no topo, de trás até a transição, em vez de 7; a face de baixo perde 3 para as duas cadeias da escada
     continuarem com o mesmo número de pontos */
  poucosPontosNoTopo: { ...TABELA, fracoesDoTopo: [0, 0.25, 0.5, 0.75], pontosDeBaixo: 6 },
};

/** comTabela(T, nome) -> a receita da peça de teste com outra tabela, pela cópia dos descritores (o getter de PASSOS lê a nova). */
export function comTabela(T, nome) {
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita));
  copia.PARAMS = T;
  copia.meta = { ...receita.meta, nome: `solido-por-lacos/${nome}` };
  return copia;
}
