/* chapa-por-rede.js — peça de teste do plano da abertura em qualquer direção: a chapa feita por outra gaiola, a gaiola por rede.
 *
 * A chapa de 600 por 400 mm e 2 mm de espessura é um retalho de quatro curvas (as quatro bordas, arqueadas 40 mm para cima no meio)
 * preenchido por `gaiolaPorRede` com passo de 50 mm e subdividido em dois níveis; a malha dela é irregular junto das bordas. O vão é
 * um retângulo de 200 por 120 mm na vista y, centrado na chapa. Nada vem de referência externa. */
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { dosPassos, m, passoDaAbertura, receitaDe, retangulo } from './chapas.js';

export const VAO = retangulo(200, 140, 400, 260);

export function rede(passo = 50) {
  return gaiolaPorRede({
    passo, fora: [0, 1, 0],
    nos: { A: [0, 0, 0], B: [600, 0, 0], C: [600, 0, 400], D: [0, 0, 400] },
    curvas: [
      { nome: 'baixo', pontos: ['A', [300, 40, 0], 'B'] }, { nome: 'direita', pontos: ['B', [600, 40, 200], 'C'] },
      { nome: 'cima', pontos: ['C', [300, 40, 400], 'D'] }, { nome: 'esquerda', pontos: ['D', [0, 40, 200], 'A'] },
    ],
    retalhos: [{ nome: 'placa', borda: ['baixo', 'direita', 'cima', 'esquerda'] }],
  });
}

export function passosDe(abertura = {}) {
  const g = rede();
  const passos = [['subdivisao', { origemId: 1, ...g.passo, espessura: m(2), niveis: 2 }]];
  if (abertura) passos.push(passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: VAO, ...abertura }));
  return { TOPO: g.pontos, PASSOS: passos };
}

const padrao = passosDe();
export default receitaDe({ nome: 'chapa-por-rede', desc: 'chapa de 600 por 400 mm feita por gaiolaPorRede, com um vão de 200 por 120 mm no meio' }, padrao.TOPO, padrao.PASSOS, { lentes: [2] });
