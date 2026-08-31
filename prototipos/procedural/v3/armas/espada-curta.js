/* espada-curta.js — espada curta de infantaria, tipo gládio: lâmina larga com
 * afilamento em duas etapas, guarda, punho e pomo.
 *
 * Exemplo de autoria, não referência histórica nem de esgrima.
 *
 * POR QUE ESTA ARMA. Ela exige o oposto da cadeira: lá tudo era caixa e o
 * desafio era junção; aqui o corpo principal é uma seção que muda ao longo do
 * comprimento, que é `loft`, e o desafio é a lâmina não virar uma cunha reta.
 *
 * A ANATOMIA que faz ler como gládio e não como faca grande:
 *   - a lâmina é quase paralela até dois terços e SÓ ENTÃO afila, em vez de
 *     afilar do punho à ponta. É essa "barriga" tardia que dá o perfil;
 *   - a seção é losango achatado, não retângulo: quatro pontos, com o eixo
 *     maior na largura. Retângulo lê como régua;
 *   - a guarda é curta e larga, o pomo é esférico e pesado. O punho fica curto
 *     de propósito: gládio é arma de uma mão só.
 *
 * ECONOMIA. A lâmina inteira sai de UM loft de quatro lados: cinco seções
 * descrevem todo o afilamento e o motor interpola. Descrever o mesmo perfil por
 * caixas empilhadas custaria três vezes mais face e não daria a transição.
 */

const P = {
  lamina: {
    comprimento: 0.50,
    larguraOmbro: 0.052,
    larguraBarriga: 0.058,   // a lâmina ENGROSSA antes de afilar: é o perfil folha
    espessura: 0.008,
    inicioAfilamento: 0.66,  // fração do comprimento onde a ponta começa
  },
  guarda: { larg: 0.095, alt: 0.022, prof: 0.030 },
  punho: { comprimento: 0.105, raio: 0.017, lados: 8 },
  pomo: { raio: 0.026, lados: 10 },
};

/* A lâmina cresce em +Y a partir da guarda; o cabo desce em -Y. Tudo em metros.
   `yGuarda` é a origem semântica da peça: é onde a mão encontra a arma. */
const yGuarda = 0;
const L = P.lamina.comprimento;

/* Meia-largura e meia-espessura por estação, para o losango ficar legível.

   A ESPESSURA ACOMPANHA A LARGURA, e isto não é detalhe. Na primeira versão ela
   era constante: perto da ponta a lâmina tinha 1,6 mm de meia-largura e ainda
   8 mm de espessura, ou seja, a seção deixava de ser um losango deitado e virava
   um losango EM PÉ — uma agulha grossa, não uma ponta de espada. O conferente
   viu isso como 25% de torção nas faces da ponta, porque quad de loft só sai
   plano quando as duas seções são semelhantes, e ali a razão despencava.

   Manter a razão largura/espessura quase constante conserta as duas coisas de
   uma vez: a ponta afila como aço afila, e as faces param de torcer. */
const RAZAO = P.lamina.larguraOmbro / P.lamina.espessura;
const secao = (fracao, meiaLarg) => ({
  pos: [0, yGuarda + fracao * L, 0],
  contorno: [
    [meiaLarg, 0],
    [0, (meiaLarg * 2) / RAZAO / 2],
    [-meiaLarg, 0],
    [0, -(meiaLarg * 2) / RAZAO / 2],
  ],
});

export const receitaEspadaCurta = {
  meta: { nome: 'Espada Curta', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    laminaPorLoft: 'cinco seções em losango achatado; o afilamento é a diferença entre elas',
    perfilFolha: 'engrossa até 45% do comprimento e só afila depois de 66%',
    cabo: 'guarda em caixa, punho em loft octogonal, pomo em esfera',
    origemSemantica: 'y=0 é a guarda, onde a mão encontra a arma',
  },

  MATERIAIS: {
    aco: { cor: '#b8bec7', metalicidade: 0.9, aspereza: 0.32 },
    bronze: { cor: '#8c6a3f', metalicidade: 0.8, aspereza: 0.45 },
    couro: { cor: '#4a3428', metalicidade: 0.0, aspereza: 0.85 },
  },

  PASSOS: [
    /* ---------- lâmina ----------
       As cinco estações são a forma inteira. Repare que a segunda é MAIS LARGA
       que a primeira: é a barriga que separa gládio de faca. */
    ['loft', {
      origemId: 1,
      lados: 4,
      orientacao: [1, 0, 0],
      secoes: [
        /* Seção de raio zero fecha o loft num polo — é a convenção do motor
           para tampar a ponta. O polo da BASE fica enterrado dentro da guarda,
           então a lâmina é um sólido fechado e a junção não aparece. Sem isto o
           loft sai como tubo aberto, e o conferente acusa 24 arestas de borda:
           foi assim que este defeito apareceu, numa linha de comando, antes de
           qualquer render. */
        { pos: [0, yGuarda - P.guarda.alt * 0.6, 0], raio: 0 },
        secao(0.00, P.lamina.larguraOmbro / 2),
        secao(0.45, P.lamina.larguraBarriga / 2),
        secao(P.lamina.inicioAfilamento, P.lamina.larguraOmbro / 2),
        secao(0.92, P.lamina.larguraOmbro / 5),
        secao(0.985, 0.0016),
        { pos: [0, yGuarda + L, 0], raio: 0 },   // a ponta é um polo, não uma tampa
      ],
    }],
    ['parte', { nome: 'lamina', sel: { origem: { op: 'loft', id: 1 } } }],

    /* ---------- guarda ----------
       Larga na direção da lâmina e curta na profundidade: barra a mão sem
       virar cruz de espada longa. */
    ['chamferBox', {
      origemId: 2,
      larg: P.guarda.larg, alt: P.guarda.alt, prof: P.guarda.prof,
      chanfro: 0.004,
      em: [0, yGuarda - P.guarda.alt, 0],
    }],
    ['parte', { nome: 'guarda', sel: { origem: { op: 'chamferBox', id: 2 } } }],

    /* ---------- punho ----------
       Octogonal e levemente barrigudo, que é como cabo de couro enrolado se
       comporta na mão. Oito lados bastam: a mão cobre o cabo em uso. */
    ['loft', {
      origemId: 3,
      lados: P.punho.lados,
      orientacao: [1, 0, 0],
      secoes: [
        { pos: [0, yGuarda - P.guarda.alt * 0.5, 0], raio: 0 },
        { pos: [0, yGuarda - P.guarda.alt, 0], raio: P.punho.raio },
        { pos: [0, yGuarda - P.guarda.alt - P.punho.comprimento * 0.45, 0], raio: P.punho.raio * 1.08 },
        { pos: [0, yGuarda - P.guarda.alt - P.punho.comprimento, 0], raio: P.punho.raio * 0.92 },
        { pos: [0, yGuarda - P.guarda.alt - P.punho.comprimento * 1.08, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'punho', sel: { origem: { op: 'loft', id: 3 } } }],

    /* ---------- pomo ----------
       Contrapeso. Sem ele a arma lê como faca: o pomo é o que diz "isto tem
       peso atrás da mão". */
    ['esfera', {
      origemId: 4,
      raio: P.pomo.raio,
      lados: P.pomo.lados,
      em: [0, yGuarda - P.guarda.alt - P.punho.comprimento - P.pomo.raio * 0.55, 0],
    }],
    ['parte', { nome: 'pomo', sel: { origem: { op: 'esfera', id: 4 } } }],

    ['material', { usa: 'aco', sel: { grupo: 'lamina' } }],
    ['material', { usa: 'bronze', sel: { grupo: 'guarda' } }],
    ['material', { usa: 'couro', sel: { grupo: 'punho' } }],
    ['material', { usa: 'bronze', sel: { grupo: 'pomo' } }],
  ],
};

export default receitaEspadaCurta;
