/* receita.js — peça de prova do aviso de casca aberta do `descrever` e do `malha:conferir`: um loft de duas seções sem polo, que sai como tubo aberto (parte
   `tubo`), ao lado de um cubo fechado (parte `caixa`). Nada vem de referência externa. */
const m = (mm) => mm / 1000;
const secao = (z) => ({ pos: [0, 0, m(z)], contorno: [[m(-20), m(-20)], [m(20), m(-20)], [m(20), m(20)], [m(-20), m(20)]] });
export default {
  meta: { nome: 'casca-aberta', desc: 'loft de duas seções sem polo (tubo aberto) e um cubo fechado' },
  PARAMS: {},
  TOPO: {},
  PASSOS: [
    ['loft', { origemId: 1, secoes: [secao(0), secao(100)], lados: 4 }],
    ['parte', { nome: 'tubo', sel: { tudo: true } }],
    ['cubo', { origemId: 2, larg: m(40), alt: m(40), prof: m(40), em: [m(35), 0, m(50)] }],
    ['parte', { nome: 'caixa', sel: { origem: { op: 'cubo', id: 2 } } }],
  ],
};
