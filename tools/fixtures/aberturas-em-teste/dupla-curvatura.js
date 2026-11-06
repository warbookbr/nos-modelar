/* dupla-curvatura.js — peça de teste do plano da abertura em qualquer direção: a superfície de dupla curvatura forte.
 *
 * A chapa de 800 por 800 mm e 2 mm de espessura é uma sela de raios 250 mm em x (para baixo) e 250 mm em z (para cima), subdividida
 * em dois níveis, ou, na variante `cupula`, uma cúpula de raios 250 e 250 mm. A inclinação da superfície vai de 0 no centro a mais de
 * 58 graus nas bordas (x ou z a 400 mm do centro: tan = 400 / 250). O vão é um retângulo de 160 por 160 mm na vista y, centrado em
 * `[u, v]` mm. Nada vem de referência externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, receitaDe, retangulo } from './chapas.js';

export const RAIO_MM = 250;
export const sela = (x, z) => 300 - ((x - 400) ** 2) / (2 * RAIO_MM) + ((z - 400) ** 2) / (2 * RAIO_MM);
export const cupula = (x, z) => 300 - ((x - 400) ** 2) / (2 * RAIO_MM) - ((z - 400) ** 2) / (2 * RAIO_MM);

/** O vão de 160 por 160 mm centrado a (cx, cz) mm. */
export const vaoEm = (cx, cz) => retangulo(cx - 80, cz - 80, cx + 80, cz + 80);

/** Os passos da chapa de dupla curvatura (`forma` 'sela' ou 'cupula') com o vão em (cx, cz). */
export function passosDe({ forma = 'sela', cx = 400, cz = 400, ...extra } = {}) {
  const c = chapaDeGrade({ nx: 9, nz: 9, passo: 100, altura: forma === 'sela' ? sela : cupula, niveis: 2 });
  return { TOPO: c.TOPO, PASSOS: [['subdivisao', { origemId: 1, ...c.passo }], passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: vaoEm(cx, cz), ...extra })] };
}

const padrao = passosDe({ forma: 'sela', cx: 580, cz: 580 });
export default receitaDe({ nome: 'dupla-curvatura', desc: 'sela de raios 250 mm com um vão de 160 mm no flanco, onde a superfície inclina 46 graus' }, padrao.TOPO, padrao.PASSOS, { lentes: [2] });
