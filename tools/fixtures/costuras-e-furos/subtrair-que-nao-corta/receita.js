/* subtrair-que-nao-corta/receita.js — peça de prova do defeito "um `subtrair` que não corta nada passa calado" (plano "costuras e furos limpos"): um bloco de
 * 100 x 60 x 40 mm de que se subtrai um bloco de 20 mm que fica 50 mm longe dele, sem tocá-lo. A peça sai idêntica ao bloco, sem órfão e sem aviso. */
const m = (mm) => mm / 1000;

export const TABELA = { larg: 100, alt: 60, prof: 40, ferramenta: 20, distancia: 50 };

export function gerarPassos(T = TABELA) {
  return [
    ['cubo', { origemId: 1, larg: m(T.larg), alt: m(T.alt), prof: m(T.prof) }],
    ['cubo', { origemId: 2, larg: m(T.ferramenta), alt: m(T.ferramenta), prof: m(T.ferramenta), em: [m(T.larg / 2 + T.distancia), 0, 0] }],
    ['subtrair', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }],
    ['parte', { nome: 'bloco', sel: { origem: { op: 'subtrair', id: 3 } } }],
  ];
}

export default {
  meta: { nome: 'subtrair-que-nao-corta', desc: 'um bloco do qual se subtrai outro que fica longe dele' },
  TABELA,
  PARAMS: TABELA,
  TOPO: {},
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
