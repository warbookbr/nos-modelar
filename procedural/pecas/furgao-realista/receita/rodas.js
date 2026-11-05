/* furgao-realista, receita/rodas.js — a roda da família `roda-pneu`: o registro das famílias, a chamada pelo perfil
 * da TABELA e a soma da base aos ids locais da família.
 */

import { chamar, criarRegistroDeFamilias } from '../../../familias/index.js';

/* ---------- a roda da família ---------- */

let registroDeFamilias = null;
export const familias = () => { registroDeFamilias ??= criarRegistroDeFamilias(); return registroDeFamilias; };

/** A chamada da família `roda-pneu` pelo perfil da tabela. O perfil dá a roda de chapa, os sulcos da banda e os furos de ventilação; o que a prancha fixa
 *  vale mais que ele: o diâmetro e a largura do pneu (710 e 235) e o assento do aro, que as medidas da família pedem como proporção do diâmetro. */
export function chamadaDaRoda(T, id) {
  const D = T.pneu_diametro;
  return chamar(familias().obter('roda-pneu'), id, { perfil: T.roda_perfil, diametroPneu: D, larguraPneu: T.pneu_largura / D, diametroAro: T.roda_assento / D });
}

/* Os ids da família são locais (de 1 a 11) e os nomes das partes são os dela (pneu, aro, cubo, disco): cada roda soma `base` aos ids e põe o sufixo da roda nos
   nomes, para as quatro não colidirem entre si nem com os passos desta receita. */
export const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  }
  return v;
};
export const BASE_DAS_RODAS = 200;
