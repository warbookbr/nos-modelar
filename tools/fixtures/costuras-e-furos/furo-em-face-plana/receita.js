/* furo-em-face-plana/receita.js — peça de prova do defeito "o `furo` refaz a face plana em leques de triângulos longos" (plano "costuras e furos limpos"): um
 * disco de 154 mm de diâmetro e 43 mm de espessura, de eixo x, feito por `cilindro` de 144 lados (cuja tampa é uma face só e aceita o `furo`), com um furo central
 * de 30 mm e oito furos de 6 mm num círculo de 125 mm, todos cegos com 6 mm de fundo e 18 lados, abertos na tampa da frente, como o flange do braço robótico. */
const m = (mm) => mm / 1000;

export const TABELA = {
  raio: 77, espessura: 43, lados: 144, raioDoFuroCentral: 15, furosEmCirculo: 8, raioDoCirculoDeFuracao: 62.5, raioDoFuro: 3, profundidade: 6, ladosDoFuro: 18,
};

export function gerarPassos(T = TABELA) {
  const E = m(T.espessura);
  return [
    ['cilindro', { origemId: 1, raio: m(T.raio), altura: E, lados: T.lados, eixo: 'x' }],
    ['furo', {
      origemId: 2, de: { op: 'cilindro', id: 1, tampa: 'topo' }, lados: T.ladosDoFuro,
      centros: [
        { nome: 'central', centro: [E, 0, 0], raio: m(T.raioDoFuroCentral), profundidade: m(T.profundidade) },
        { nome: 'circulo', pivo: [E, 0, 0], distancia: m(T.raioDoCirculoDeFuracao), total: T.furosEmCirculo, volta: 360, raio: m(T.raioDoFuro), profundidade: m(T.profundidade) },
      ],
    }],
    ['parte', { nome: 'disco', sel: { tudo: true } }],
  ];
}

export default {
  meta: { nome: 'furo-em-face-plana', desc: 'disco com oito furos cegos em círculo e um central na face da frente' },
  TABELA,
  PARAMS: TABELA,
  TOPO: {},
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
