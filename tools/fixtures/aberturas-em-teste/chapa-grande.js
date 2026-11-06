/* chapa-grande.js — peça de teste do plano da abertura em qualquer direção: o tempo de um vão numa chapa do tamanho da do furgão.
 *
 * A chapa é uma cúpula suave de 770 por 770 mm, de 2 mm de espessura, com 12 por 12 pontos de gaiola, subdividida em cinco níveis
 * (`niveis`): cerca de 250 mil faces nas duas peles. O vão é um retângulo de 200 por 200 mm na vista y. Nada vem de referência
 * externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, receitaDe, retangulo } from './chapas.js';

export const domo = (x, z) => 300 - ((x - 385) ** 2) / 4000 - ((z - 385) ** 2) / 6000;
export const VAO = retangulo(285, 285, 485, 485);

export function passosDe({ niveis = 5, abertura = true } = {}) {
  const c = chapaDeGrade({ nx: 12, nz: 12, passo: 70, altura: domo, niveis });
  const passos = [['subdivisao', { origemId: 1, ...c.passo }]];
  if (abertura) passos.push(passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: VAO }));
  return { TOPO: c.TOPO, PASSOS: passos };
}

const padrao = passosDe({ niveis: 4 });
export default receitaDe({ nome: 'chapa-grande', desc: 'cúpula de 770 por 770 mm com um vão de 200 mm; a bancada mostra a versão de quatro níveis, e o teste mede a de cinco (250 mil faces)' }, padrao.TOPO, padrao.PASSOS, { lentes: [2] });
