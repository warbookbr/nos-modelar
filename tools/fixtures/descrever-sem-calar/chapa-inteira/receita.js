/* receita.js — peça de prova do aviso do `descrever` para a abertura que cai na booleana da chapa inteira: uma chapa de 5.616 faces com um vão que toma mais da
   metade dela, e o recorte da vizinhança não vale (`vizinhanca.motivo`). Em 2026-11-09, na janela da cabine do furgão, quatro vãos assim levaram a receita de
   118 s a 207 s. O segundo vão, pequeno, recorta e não dá aviso. Nada vem de referência externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, receitaDe, retangulo } from '../../aberturas-em-teste/chapas.js';
import { planoDaChapa } from '../plano.js';

const c = chapaDeGrade({ nx: 14, nz: 14, passo: 50, altura: () => 100, niveis: 2 });
const PASSOS = [
  ['subdivisao', { origemId: 1, ...c.passo }],
  passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: retangulo(60, 60, 590, 590) }),
  ['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 2 } }, substituir: true }],
];
export default { ...receitaDe({ nome: 'chapa-inteira', desc: 'chapa de 5.616 faces com um vão grande, que cai na booleana da chapa inteira' }, c.TOPO, PASSOS), PLANO: planoDaChapa('o vão toma mais da metade da chapa') };
