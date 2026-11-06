/* contornos-de-forma.js — peça de teste do plano da abertura em qualquer direção: o contorno côncavo (em L e em estrela) e o de bico
 * muito agudo.
 *
 * A chapa é uma cúpula suave de 600 por 600 mm e 2 mm de espessura (a malha de 25 mm de dois níveis), e o vão é desenhado na vista y,
 * centrado em [300, 300] mm. O L tem braços de 40 mm de largura; a estrela de cinco pontas tem raio de fora 120 mm e de dentro `rDentro`
 * mm; o bico é um triângulo isósceles de 220 mm de altura cujo ângulo na ponta é `alfa` graus. Nada vem de referência externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, poligonoDeRetas, receitaDe, estrela } from './chapas.js';

export const cupula = (x, z) => 200 - ((x - 300) ** 2) / 3000 - ((z - 300) ** 2) / 4500;
const chapa = () => chapaDeGrade({ nx: 7, nz: 7, passo: 100, altura: cupula, niveis: 2 });

/** O L: 200 por 200 mm com o canto de 160 por 160 mm tirado (braços de 40 mm), em sentido anti-horário. */
export const EM_L = poligonoDeRetas([[200, 200], [400, 200], [400, 240], [240, 240], [240, 400], [200, 400]]);
export const ESTRELA = (rDentro = 45) => estrela([300, 300], 5, 120, rDentro);
/** O triângulo de ponta `alfa` graus, com a ponta em [300, 420] e a base a 220 mm dela. */
export function bico(alfa) {
  const metade = (alfa / 2) * (Math.PI / 180); const meia = 220 * Math.tan(metade);
  return poligonoDeRetas([[300, 420], [300 - meia, 200], [300 + meia, 200]]);
}

export function passosDe(contorno, extra = {}) {
  const c = chapa();
  return { TOPO: c.TOPO, PASSOS: [['subdivisao', { origemId: 1, ...c.passo }], passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno, ...extra })] };
}

const padrao = passosDe(ESTRELA());
export default receitaDe({ nome: 'contornos-de-forma', desc: 'cúpula de 600 por 600 mm com um vão em estrela de cinco pontas, o contorno côncavo de bicos vivos' }, padrao.TOPO, padrao.PASSOS, { lentes: [2] });
