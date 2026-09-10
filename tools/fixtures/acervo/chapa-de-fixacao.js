/* chapa-de-fixacao.js — chapa de fixação em L com furos passantes.
 *
 * Exemplo de autoria, não referência de engenharia.
 *
 * POR QUE ESTA PEÇA EXISTE. Ela é a prova de que `furo` alcança chapa feita por
 * `inflate`. Até o atrito A13, `inflate` publicava as faces só como bloco —
 * `{op,id}` devolvia as centenas de uma vez — e `furo` exige que a entrada
 * resolva para EXATAMENTE UMA face. O resultado é que nenhuma peça de chapa
 * podia ser furada: nem olho de machado, nem rasgo de suporte, nem passagem de
 * eixo. O motor sabia abrir o furo; faltava endereço.
 *
 * Agora o modo 'secoes' publica a grade que ele já tinha: `estacao` ao longo do
 * caminho, `lado` na volta da seção, e as duas tampas. Um par (estacao, lado) é
 * uma face e só uma.
 *
 * O QUE APRENDER AQUI, se você veio copiar o padrão:
 *   - o furo tem de CABER dentro da face de entrada. Não é um corte que
 *     atravessa a malha onde quiser: ele nasce numa face e sai por outra. Menos
 *     `divisoes` dá face maior e furo maior;
 *   - entrada e saída precisam ficar ALINHADAS. Com `lados: 12`, a face do
 *     lado 2 e a do lado 9 se enxergam; a do lado 2 com a do lado 8, não, e o
 *     motor recusa dizendo que o anel não cabe na face de saída;
 *   - a face de entrada precisa ser PLANA. Seções semelhantes dão face plana —
 *     é a mesma regra que endireitou a lâmina da espada. Trecho onde a seção
 *     muda de proporção torce, e torção barra o furo.
 */

const P = {
  chapa: { comprimento: 0.140, meiaAltura: 0.050, meiaEspessura: 0.020 },
  malha: { divisoes: 3, lados: 12, expoenteSecao: 20 },
  furo: { raio: 0.006, lados: 12, deslocamento: 0.0094 },
};

const C = P.chapa;

/* Silhueta e planta CONSTANTES: é um prisma. Seção que não muda de proporção é
   seção semelhante, e seção semelhante dá face plana — que é o que o `furo`
   exige da entrada. Um perfil que afinasse aqui torceria a face e o corte seria
   recusado, com a medida do desvio no diagnóstico. */
const silhueta = [
  [0, C.meiaAltura], [C.comprimento, C.meiaAltura],
  [C.comprimento, -C.meiaAltura], [0, -C.meiaAltura],
];
const planta = [
  [0, C.meiaEspessura], [C.comprimento, C.meiaEspessura],
  [C.comprimento, -C.meiaEspessura], [0, -C.meiaEspessura],
];

export const receitaChapaDeFixacao = {
  meta: { nome: 'Chapa de Fixação', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    chapaPorInflate: 'silhueta e planta constantes: prisma de seções semelhantes',
    furoPorEndereco: 'entrada e saída citadas por (estacao, lado), o endereço que o A13 abriu',
    alinhamento: 'lado 2 enxerga lado 9; entrada e saída precisam se ver',
  },

  MATERIAIS: {
    aco: { cor: '#98a1ab', metalicidade: 0.86, aspereza: 0.42 },
  },

  PASSOS: [
    ['inflate', {
      origemId: 1,
      contornoLado: silhueta,
      contornoTopo: planta,
      modo: 'secoes',
      divisoes: P.malha.divisoes,
      lados: P.malha.lados,
      expoenteSecao: P.malha.expoenteSecao,
    }],

    /* Dois furos passantes, um por estação. `estacao` escolhe a posição ao longo
       da chapa e o par de `lado` escolhe por onde entra e por onde sai. */
    /* A PROPORÇÃO desta peça é imposta pelo contrato, não escolhida por gosto,
       e vale registrar porque foi medido: o furo tem de caber na face de
       entrada E na de saída. Com 140 mm de comprimento e 3 divisões, um furo de
       6 mm passa a partir de 40 mm de espessura; com 32 mm não passa nem com
       raio de 5 mm, porque as faces de entrada e de saída deixam de cobrir a
       mesma faixa. Chapa mais fina pede mais `lados` na seção, não furo menor. */
    ['furo', {
      origemId: 2,
      de: { op: 'inflate', id: 1, estacao: 1, lado: 2 },
      saida: { op: 'inflate', id: 1, estacao: 1, lado: 9 },
      centro: [P.furo.deslocamento, C.meiaAltura, C.comprimento * 0.5],
      raio: P.furo.raio,
      lados: P.furo.lados,
      orientacao: [1, 0, 0],
    }],
    ['furo', {
      origemId: 3,
      de: { op: 'inflate', id: 1, estacao: 0, lado: 2 },
      saida: { op: 'inflate', id: 1, estacao: 0, lado: 9 },
      centro: [P.furo.deslocamento, C.meiaAltura, C.comprimento * 0.16],
      raio: P.furo.raio,
      lados: P.furo.lados,
      orientacao: [1, 0, 0],
    }],

    ['parte', { nome: 'chapa', sel: { tudo: true } }],
    ['material', { usa: 'aco', sel: { grupo: 'chapa' } }],
  ],
};

export default receitaChapaDeFixacao;
