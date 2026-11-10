/* furo-na-tampa-do-lathe/receita.js — peça de prova do defeito "o `furo` recusa a tampa de um `lathe`, que sai em leque" (plano "costuras e furos limpos"):
 * um disco de 154 mm de diâmetro e 43 mm de espessura, de eixo x, feito por `lathe` de 144 lados, com um furo cego central de 30 mm e 6 mm de fundo aberto
 * na tampa da frente (`faixa` 2 do perfil). O `furo` exige que `de` resolva para uma face só, e a tampa do `lathe` são 144 triângulos. */
const m = (mm) => mm / 1000;

export const TABELA = { raio: 77, espessura: 43, lados: 144, raioDoFuro: 15, profundidade: 6, ladosDoFuro: 18 };

export function gerarPassos(T = TABELA) {
  const R = m(T.raio), E = m(T.espessura);
  return [
    ['lathe', { origemId: 1, lados: T.lados, eixo: 'x', perfil: [[0, 0], [R, 0], [R, E], [0, E]] }],
    ['furo', { origemId: 2, de: { op: 'lathe', id: 1, faixa: 2 }, lados: T.ladosDoFuro, centros: [{ nome: 'central', centro: [E, 0, 0], raio: m(T.raioDoFuro), profundidade: m(T.profundidade) }] }],
    ['parte', { nome: 'disco', sel: { tudo: true } }],
  ];
}

export default {
  meta: { nome: 'furo-na-tampa-do-lathe', desc: 'disco de lathe com um furo cego na tampa da frente' },
  TABELA,
  PARAMS: TABELA,
  TOPO: {},
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
