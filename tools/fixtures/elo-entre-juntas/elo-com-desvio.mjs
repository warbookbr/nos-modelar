/* elo-com-desvio.mjs — as peças de prova do elo com desvio: o elo da canela do esqueleto humanoide aprovado (431 mm entre os
 * planos das flanges, `comprimentoDaCanela` de procedural/pecas/esqueleto-humanoide/proporcoes.json) com a boca B girada 25
 * graus para o joelho, o mesmo elo no desvio máximo que o teto do contrato deixa (90 graus), e o elo curto de 100 mm no desvio
 * máximo que a restrição da curva aceita (o raio de curvatura do eixo, 2,5 vezes a maior meia largura da seção). Cada um fica entre
 * dois atuadores de junta de 100 mm, postos só pelas portas, pela mesma montagem do elo reto. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { parametrosDoAtuador } from '../../../procedural/familias/atuador-de-junta/tabela.js';
import { parametrosDoElo } from '../../../procedural/familias/elo-entre-juntas/tabela.js';

const ATUADOR = { forma: 1, ...parametrosDoAtuador(100) };
const CORPO = { larguraDaSecao: 100, profundidadeDaSecao: 80, cintura: 0.85 };
const elo = (campos) => Object.freeze({ ...parametrosDoElo({ de: ATUADOR, para: ATUADOR, ...CORPO, ...campos }) });

/** A canela (431 mm) com o joelho: a boca B gira 25 graus no plano sagital (azimute 0, para +z). */
export const ELO_DA_CANELA_COM_JOELHO = elo({ comprimento: 431, desvio: 25, azimute: 0 });
/** A canela no maior desvio que o contrato deixa, 90 graus, com a restrição da curva ainda aceitando. */
export const ELO_DA_CANELA_NO_TETO = elo({ comprimento: 431, desvio: 90, azimute: 0 });
/** O elo curto (100 mm) sem desvio, a base de onde se mede o desvio máximo que a restrição da curva aceita. */
export const ELO_CURTO = elo({ comprimento: 100 });
/** O elo curto no desvio máximo aceito (36,7 graus, medido por `desvioMaximoAceito`). */
export const ELO_CURTO_NO_MAXIMO = elo({ comprimento: 100, desvio: 36.7 });

/** O maior desvio, em graus, que a família aceita para `base` (bisseção sobre a chamada), arredondado para baixo no décimo de grau. */
export function desvioMaximoAceito(familia, base) {
  const aceita = (desvio) => { try { chamar(familia, 'e', { ...base, desvio }); return true; } catch (erro) { if (!erro.restricao) throw erro; return false; } };
  const teto = familia.contrato.parametros.desvio.maximo;
  if (aceita(teto)) return teto;
  let baixo = 0; let alto = teto;
  for (let i = 0; i < 40; i += 1) { const meio = (baixo + alto) / 2; if (aceita(meio)) baixo = meio; else alto = meio; }
  return Math.floor(baixo * 10) / 10;
}
