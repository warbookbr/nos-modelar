/* elo-de-chapa.mjs — a peça de prova do elo de chapa reta: a coxa do esqueleto humanoide aprovado (431 mm entre os eixos do quadril e do joelho,
 * `comprimentoDaCoxa` de procedural/pecas/esqueleto-humanoide/proporcoes.json) como uma chapa de 6 mm presa pela face à flange de saída do atuador do
 * quadril e à flange de fixação do atuador do joelho (os dois de 100 mm), postos só pelas portas, pela montagem do elo reto. As duas bocas da chapa
 * olham para o mesmo lado: os dois atuadores ficam do mesmo lado da chapa, com os eixos antiparalelos (o do joelho meia volta do do quadril),
 * e a face de apoio de cada flange cai no mesmo plano. */
import { ATUADOR, CURSO_DO_JOELHO } from './elo-de-curva-dupla.mjs';
import { parametrosDoElo } from '../../../procedural/familias/elo-entre-juntas/tabela.js';
import proporcoes from '../../../procedural/pecas/esqueleto-humanoide/proporcoes.json' with { type: 'json' };

/** A chapa de `comprimento` mm entre dois atuadores de 100 mm, com `campos` (a espessura, a largura, a passagem) sobre o padrão. */
export const chapaEntreAtuadores = (comprimento, campos = {}) => Object.freeze({ ...parametrosDoElo({ de: ATUADOR, para: ATUADOR, forma: 2, comprimento, ...campos }) });

/** A coxa em chapa: 431 mm, a espessura de 6 mm e a largura de 130 mm do padrão. */
export const CHAPA_DA_COXA = chapaEntreAtuadores(proporcoes.medidas.comprimentoDaCoxa);
export { ATUADOR, CURSO_DO_JOELHO };
