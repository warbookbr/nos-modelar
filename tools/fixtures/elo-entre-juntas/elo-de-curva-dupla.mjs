/* elo-de-curva-dupla.mjs — as peças de prova do elo de curva dupla: a coxa do esqueleto humanoide aprovado (431 mm entre os planos das
 * flanges, `comprimentoDaCoxa` de procedural/pecas/esqueleto-humanoide/proporcoes.json) ligando dois atuadores de junta de 100 mm de
 * eixos paralelos (o quadril e o joelho flexionam em torno de x), afastados 431 mm no sentido do membro. A boca A sai a 90 graus do eixo
 * do membro e a B também: em U (as bocas olham para lados opostos, os dois atuadores lado a lado na mesma coluna, o elo abre para um
 * lado só) ou em S (as bocas olham para o mesmo lado, o joelho fica deslocado do quadril). Postos só pelas portas, pela montagem do elo reto. */
import { parametrosDoAtuador } from '../../../procedural/familias/atuador-de-junta/tabela.js';
import { parametrosDoElo } from '../../../procedural/familias/elo-entre-juntas/tabela.js';
import proporcoes from '../../../procedural/pecas/esqueleto-humanoide/proporcoes.json' with { type: 'json' };
import esqueleto from '../../../procedural/pecas/esqueleto-humanoide/esqueleto.json' with { type: 'json' };

const ATUADOR = { forma: 1, ...parametrosDoAtuador(100) };
/* a coxa é mais funda (110, no sentido anterior-posterior) que larga (70, no sentido dos eixos das juntas, que é o das curvas) */
const CORPO = { comprimento: proporcoes.medidas.comprimentoDaCoxa, larguraDaSecao: 110, profundidadeDaSecao: 70, cintura: 0.85 };
const elo = (campos) => Object.freeze({ ...parametrosDoElo({ de: ATUADOR, para: ATUADOR, ...CORPO, ...campos }) });

/** A coxa em U: a boca A sai para +z a 90 graus (azimute 0), a B chega a −z (azimute 180). */
export const ELO_DA_COXA_EM_U = elo({ desvioA: 90, azimuteA: 0, desvio: 90, azimute: 180 });
/** A coxa em S: as duas bocas olham para o mesmo lado (+z). */
export const ELO_DA_COXA_EM_S = elo({ desvioA: 90, azimuteA: 0, desvio: 90, azimute: 0 });
/** A coxa ou a canela em U de `comprimento` mm, com `campos` (a seção, por exemplo) sobre o padrão da coxa. */
export const eloEmU = (comprimento, campos = {}) => elo({ comprimento, desvioA: 90, azimuteA: 0, desvio: 90, azimute: 180, ...campos });
export { ATUADOR };

/** O curso de flexão do joelho direito do esqueleto aprovado (0 a 140 graus), com que a junta B da coxa é conferida. */
export const CURSO_DO_JOELHO = Object.freeze({ ...esqueleto.juntas.find((j) => j.id === 'joelho-direito').curso });
