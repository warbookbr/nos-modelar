/* variantes.js — as tabelas que, sobre a tabela de referência de `../forma.js`, levam a peça de teste do sólido por laços aos
 * limites que a gaiola de laços escrita à mão mostrou e à compensação dos cantos, cada uma mudando só o que pede. As duas primeiras
 * o ajudante recusa (`gaiolaPorLacos` lança o erro com a medida); os módulos ao lado abrem na bancada as que ele monta, e
 * `../medir-limites.mjs` mede todas. */
import receita from '../receita.js';
import { TABELA } from '../forma.js';

export const VARIANTES = {
  /* limite 1: cota exata em todos os pontos da gaiola, recusada */
  medidasEmTodos: { ...TABELA, limites: { ...TABELA.limites, medidas: 'todos' } },
  /* limite 2: os planos de corte a menos de 2,5 mm entre si ficam (sai só o repetido), recusados */
  planosProximos: { ...TABELA, limites: { ...TABELA.limites, distanciaMinimaEntrePlanos: 0 } },
  /* limite 3: o canto da seção compensado, que sai com o raio pedido no corte */
  compensada: { ...TABELA, compensarCantos: true },
  /* limite 4: metade dos planos de corte por quarto de quina em planta (3 em vez de 6) */
  poucosPlanosNaQuina: { ...TABELA, estacoesDaQuina: 3 },
  /* limite 4: o topo, de trás até a transição, num trecho só de 5 pontos em vez de cinco trechos com 8; a face de baixo perde 3
     para as duas cadeias da escada continuarem com o mesmo número de pontos */
  poucosPontosNoTopo: { ...TABELA, topo: [{ nome: 'topo', ate: 1, pontos: 5 }], pontos: { ...TABELA.pontos, baixo: 8 } },
};

/** comTabela(T, nome) -> a receita da peça de teste com outra tabela, pela cópia dos descritores (o getter de PASSOS lê a nova). */
export function comTabela(T, nome) {
  const copia = Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita));
  copia.PARAMS = T;
  copia.meta = { ...receita.meta, nome: `solido-por-lacos/${nome}` };
  return copia;
}
