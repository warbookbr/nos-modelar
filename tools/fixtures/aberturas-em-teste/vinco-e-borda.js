/* vinco-e-borda.js — peça de teste do plano da abertura em qualquer direção: o contorno que cruza um vinco vivo e o que passa perto
 * da borda da chapa.
 *
 * A chapa é um telhado de duas águas de 800 por 800 mm e 2 mm de espessura, com a cumeeira (vinco vivo) em x = 400 ao longo de z e
 * as águas a 26,6 graus, subdividida em dois níveis. O primeiro vão é um retângulo de 240 por 200 mm na vista y, centrado na
 * cumeeira, que o atravessa. O segundo é o retângulo de 200 por 200 mm a `d` mm da borda x = 0 da chapa. Nada vem de referência externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, receitaDe, retangulo } from './chapas.js';

export const telhado = (x) => 300 - 0.5 * Math.abs(x - 400);
const chapa = () => chapaDeGrade({
  nx: 9, nz: 9, passo: 100, altura: (x) => telhado(x), niveis: 2,
  vincos: [{ nome: 'cumeeira', pontos: Array.from({ length: 9 }, (_, j) => [4, j]), nitidez: 'viva' }],
});

/** O vão que cruza a cumeeira, em x de 280 a 520 e z de 300 a 500. */
export const CRUZANDO = retangulo(280, 300, 520, 500);
/** O vão a `d` mm da borda x = 0, em z de 300 a 500, com 200 mm de largura. */
export const pertoDaBorda = (d) => retangulo(d, 300, d + 200, 500);

const montar = (contornos) => {
  const c = chapa();
  return {
    TOPO: c.TOPO,
    PASSOS: [['subdivisao', { origemId: 1, ...c.passo }], ...contornos.map((contorno, k) => passoDaAbertura(k + 2, dosPassos(k ? 'aberturaPorContorno' : 'subdivisao', k ? k + 1 : 1), { vista: 'y', contorno }))],
  };
};
export const passosCruzando = () => montar([CRUZANDO]);
export const passosPertoDaBorda = (d) => montar([pertoDaBorda(d)]);

const padrao = montar([CRUZANDO, pertoDaBorda(40)]);
export default receitaDe({ nome: 'vinco-e-borda', desc: 'telhado de duas águas com um vão que cruza a cumeeira viva e outro a 40 mm da borda da chapa' }, padrao.TOPO, padrao.PASSOS, { lentes: [2, 3] });
