/* receita.js — peça de prova do `descrever` e da `guarda:acervo` que dizem o órfão: a abertura tem um contorno que sai da chapa, o núcleo recusa o passo e a
   parte que cita a abertura fica sem face. Em 2026-11-11, no furgão, foi um contorno que cruzava a fresta de uma porta. Nada vem de referência externa. */
import { chapaDeGrade, dosPassos, passoDaAbertura, receitaDe, retangulo } from '../../aberturas-em-teste/chapas.js';
import { planoDaChapa } from '../plano.js';

const c = chapaDeGrade({ nx: 9, nz: 9, passo: 100, altura: () => 100, niveis: 2 });
const PASSOS = [
  ['subdivisao', { origemId: 1, ...c.passo }],
  passoDaAbertura(2, dosPassos('subdivisao', 1), { vista: 'y', contorno: retangulo(1500, 1500, 1700, 1700) }),
  ['parte', { nome: 'chapa', sel: { origem: { op: 'aberturaPorContorno', id: 2 } }, substituir: true }],
];
export default { ...receitaDe({ nome: 'orfao', desc: 'chapa com uma abertura recusada, que deixa a parte sem face' }, c.TOPO, PASSOS), PLANO: planoDaChapa('o contorno do vão sai da chapa') };
