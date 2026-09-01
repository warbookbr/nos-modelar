/* machado-de-guerra.js — machado de guerra de uma mão, com OLHO FURADO: o cabo
 * atravessa a cabeça por um furo real, não por um encaixe fingido.
 *
 * Exemplo de autoria, não referência histórica.
 *
 * ---------------------------------------------------------------------------
 * A HISTÓRIA DESTA PEÇA, porque ela é o registro de três erros
 *
 * v1 — `loft` de seções em LOSANGO. Passava em toda medida (fechada, orientada,
 * sem face órfã) e era um cristal de quartzo. O losango põe uma quina no meio da
 * face, onde a cabeça tem de ser CHAPA.
 *
 * v2 — `inflate`, silhueta cruzada com planta. A chapa ficou certa, mas o cabo
 * ATRAVESSAVA a cabeça por dois décimos de milímetro e saía pelas faces, porque
 * a parede do olho tinha 2 mm. E não havia furo: o cabo era enterrado e o
 * encaixe, disfarçado.
 *
 * v3 — esta. O olho é um FURO, e para ele existir foram precisas três coisas
 * que o motor não tinha ou que a receita não sabia pedir:
 *
 *   1. ENDEREÇO DE FACE (atrito A13). `furo` exige que a entrada resolva para
 *      exatamente uma face, e `inflate` publicava as suas só como bloco.
 *   2. `lados` ≡ 2 (mod 4). Com `lados` múltiplo de 4 existe um VÉRTICE no topo
 *      da seção, e um furo centrado cai entre duas faces — nunca cabe em uma.
 *      Com 14 há uma FACE centrada no topo. Esta linha é a menos óbvia da
 *      receita e a que mais custou a achar.
 *   3. ESTAÇÕES EXPLÍCITAS (atrito A15). Partes iguais davam 10,6 mm por face
 *      contra os ~30 mm que o olho precisa. `estacoes` põe UMA estação longa
 *      sobre o olho e as curtas onde a lâmina curva.
 *
 * E uma exigência de FORMA, não de ferramenta: a face de entrada precisa ser
 * PLANA, e face de `loft`/`inflate` só sai plana quando as duas seções vizinhas
 * são SEMELHANTES. Por isso o bloco do olho tem seção CONSTANTE — mesma altura,
 * mesma espessura, do começo ao fim da estação. Isso não é concessão à
 * ferramenta: é como um machado é forjado, com o olho num bloco paralelo e a
 * lâmina abrindo depois dele.
 *
 * EIXOS: `inflate` lê a silhueta em z×y e a planta em z×x, então o gume aponta
 * para +Z e a espessura fica em X. O cabo é Y e atravessa o olho.
 */

const P = {
  cabo: { comprimento: 0.60, raio: 0.014, lados: 10, saliencia: 0.012 },
  cabeca: {
    alcance: 0.170,          // da nuca ao fio, em Z
    /* O BLOCO DO OLHO, em fração do alcance. Seção constante entre os dois:
       é essa constância que deixa as faces planas e o furo possível. */
    olhoDe: 0.115,
    olhoAte: 0.375,
    meiaAlturaOlho: 0.034,
    meiaEspOlho: 0.024,
    meiaEspFio: 0.0016,
    /* 14: FACE centrada no topo da seção. Com 12 ou 16 haveria um vértice ali e
       o furo do olho não caberia em face nenhuma. */
    lados: 14,
    expoenteSecao: 14,
  },
  olho: { raio: 0.0146, lados: 12 },
  esporao: { comprimento: 0.058, base: 0.036 },
  reforco: { alt: 0.026, folga: 0.007 },
};

const C = P.cabeca;
const yCabeca = P.cabo.comprimento;
const zOlho = C.alcance * (C.olhoDe + C.olhoAte) / 2;   // centro do olho, em Z local

/* SILHUETA (z×y). Três trechos: nuca, BLOCO DO OLHO com altura constante, e a
   lâmina abrindo em crescente com barba em gancho. */
const silhueta = [
  [0, C.meiaAlturaOlho * 0.80],                       // nuca, topo
  [C.alcance * C.olhoDe, C.meiaAlturaOlho],           // entra o bloco do olho
  [C.alcance * C.olhoAte, C.meiaAlturaOlho],          // sai o bloco: ALTURA CONSTANTE entre os dois
  [C.alcance * 0.58, 0.044],                          // ombro: a lâmina abre
  [C.alcance * 0.86, 0.055],
  [C.alcance * 0.985, 0.030],                         // o gume vira para dentro no alto
  [C.alcance, 0.006],                                 // dois pontos no z máximo: o plano do fio.
  [C.alcance, -0.034],                                // Com um só, a última estação teria altura zero.
  [C.alcance * 0.95, -0.066],
  [C.alcance * 0.80, -0.098],                         // ponta da barba, o gancho
  [C.alcance * C.olhoAte, -C.meiaAlturaOlho],         // volta ao bloco do olho
  [C.alcance * C.olhoDe, -C.meiaAlturaOlho],
  [0, -C.meiaAlturaOlho * 0.80],                      // nuca, base
];

/* PLANTA (z×x). Espessura CONSTANTE ao longo do bloco do olho, pelo mesmo
   motivo, e o bisel concentrado no terço final — o que também deixa a face
   grande da cabeça plana. */
const planta = [
  [0, C.meiaEspOlho * 0.88],
  [C.alcance * C.olhoDe, C.meiaEspOlho],
  [C.alcance * C.olhoAte, C.meiaEspOlho],
  [C.alcance * 0.70, C.meiaEspOlho * 0.72],
  [C.alcance, C.meiaEspFio],
  [C.alcance, -C.meiaEspFio],
  [C.alcance * 0.70, -C.meiaEspOlho * 0.72],
  [C.alcance * C.olhoAte, -C.meiaEspOlho],
  [C.alcance * C.olhoDe, -C.meiaEspOlho],
  [0, -C.meiaEspOlho * 0.88],
];

/* ESTAÇÕES. A segunda (0,150 → 0,500) é a longa: é ela que vira a face onde o
   furo do olho cabe. As demais são curtas e ficam onde o contorno muda. */
const estacoes = [0, C.olhoDe, C.olhoAte, 0.58, 0.72, 0.80, 0.86, 0.95, 0.985, 1];
/* O olho fica na estação de índice 1. Os lados de entrada e saída são
   DERIVADOS de `lados`, não escritos à mão: a seção começa com um vértice em 0°
   e o topo está a 90°, então a face centrada no topo é a de índice
   `floor(lados/4)` e a de baixo é `floor(3*lados/4)`.

   Escrever 3 e 10 direto — como esta receita fazia — amarra o olho a
   `lados: 14`. O primeiro estudo do laboratório varreu `lados` e 21 das 25
   execuções gritaram, porque o índice apontava para uma face que não existia
   naquela contagem. O furo saía do lugar ou não saía, em silêncio, e quem
   mexesse em `lados` no futuro herdaria isso. */
const ESTACAO_OLHO = 1;
const LADO_TOPO = Math.floor(C.lados / 4);
const LADO_FUNDO = Math.floor((3 * C.lados) / 4);

export const receitaMachadoDeGuerra = {
  meta: { nome: 'Machado de Guerra', versao: '3.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    olhoFurado: 'o cabo atravessa um furo real, aberto por `furo` entre duas faces endereçadas',
    blocoDoOlho: 'seção constante entre olhoDe e olhoAte: seções semelhantes dão face plana, e furo exige face plana',
    ladosImpar: 'lados=14 põe uma FACE no topo da seção; múltiplo de 4 poria um vértice e o furo não caberia',
    estacoesExplicitas: 'uma estação longa sobre o olho, curtas onde a lâmina curva',
    eixoDoCorte: 'Z; o cabo é Y; a espessura é X',
  },

  MATERIAIS: {
    aco: { cor: '#9aa3ad', metalicidade: 0.88, aspereza: 0.38 },
    acoEscuro: { cor: '#6f7885', metalicidade: 0.85, aspereza: 0.5 },
    madeira: { cor: '#7a5230', metalicidade: 0.0, aspereza: 0.8 },
  },

  PASSOS: [
    /* ---------- cabeça ----------
       Vem ANTES do cabo porque o furo dela é quem define onde o cabo passa. */
    ['inflate', {
      origemId: 2,
      contornoLado: silhueta,
      contornoTopo: planta,
      modo: 'secoes',
      estacoes,
      lados: C.lados,
      expoenteSecao: C.expoenteSecao,
    }],

    /* ---------- O OLHO ----------
       Entra pela face de cima do bloco e sai pela de baixo. É o furo que faz
       este machado ser montado em vez de encaixado. */
    ['furo', {
      origemId: 3,
      de: { op: 'inflate', id: 2, estacao: ESTACAO_OLHO, lado: LADO_TOPO },
      saida: { op: 'inflate', id: 2, estacao: ESTACAO_OLHO, lado: LADO_FUNDO },
      centro: [0, C.meiaAlturaOlho, zOlho],
      raio: P.olho.raio,
      lados: P.olho.lados,
      orientacao: [0, 0, 1],
    }],
    /* `sel: {tudo:true}` e não `{op:'inflate',id:2}`: o furo CONSUMIU as duas
       faces de entrada e saída — elas viraram a borda anular do corte — e citar
       a origem inteira depois disso é recusado, com razão, para ninguém receber
       em silêncio um conjunto diferente do que pediu. Aqui `tudo` é exato
       porque a cabeça é a PRIMEIRA geometria da receita: não existe mais nada
       para selecionar por engano. Foi por isso que ela veio antes do cabo. */
    ['parte', { nome: 'cabeca', sel: { tudo: true } }],
    ['transladar', { d: [0, yCabeca, -zOlho], sel: { grupo: 'cabeca' } }],

    /* ---------- cabo ----------
       ATRAVESSA o olho e sobra um pouco acima, que é onde vai a cunha num
       machado real. Nas versões anteriores ele parava dentro da cabeça porque
       não havia furo para atravessar. */
    ['loft', {
      origemId: 1,
      lados: P.cabo.lados,
      orientacao: [1, 0, 0],
      secoes: [
        { pos: [0, 0, 0], raio: 0 },
        { pos: [0, 0.004, 0], raio: P.cabo.raio * 1.14 },
        { pos: [0, P.cabo.comprimento * 0.30, 0], raio: P.cabo.raio * 0.92 },
        { pos: [0, P.cabo.comprimento * 0.86, 0], raio: P.cabo.raio },
        { pos: [0, yCabeca + C.meiaAlturaOlho + P.cabo.saliencia, 0], raio: P.cabo.raio },
        { pos: [0, yCabeca + C.meiaAlturaOlho + P.cabo.saliencia + 0.004, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'cabo', sel: { origem: { op: 'loft', id: 1 } } }],

    /* ---------- esporão ----------
       Cresce da NUCA, o bloco de aço atrás do olho. Entra na cabeça em vez de
       tangenciar: tangência exata deixa costura na junção. */
    ['cone', {
      origemId: 4,
      raio: P.esporao.base / 2,
      altura: P.esporao.comprimento,
      lados: 6,
      eixo: 'z',
      em: [0, yCabeca, -zOlho + 0.010 - P.esporao.comprimento],
    }],
    ['parte', { nome: 'esporao', sel: { origem: { op: 'cone', id: 4 } } }],

    /* ---------- cinta do olho ----------
       Encosta por baixo da cabeça. Laterais e tampas são citações separadas:
       `{op:'cilindro',id}` sem eixo resolve só a lateral. */
    ['cilindro', {
      origemId: 5,
      raio: P.cabo.raio + P.reforco.folga,
      altura: P.reforco.alt,
      lados: P.cabo.lados,
      em: [0, yCabeca - C.meiaAlturaOlho - P.reforco.alt, 0],
    }],
    ['parte', { nome: 'cintaDoOlho', sel: { origem: { op: 'cilindro', id: 5 } } }],
    ['parte', { nome: 'cintaDoOlho', sel: { origem: { op: 'cilindro', id: 5, tampa: 'fundo' } } }],
    ['parte', { nome: 'cintaDoOlho', sel: { origem: { op: 'cilindro', id: 5, tampa: 'topo' } } }],

    ['material', { usa: 'madeira', sel: { grupo: 'cabo' } }],
    ['material', { usa: 'aco', sel: { grupo: 'cabeca' } }],
    ['material', { usa: 'aco', sel: { grupo: 'esporao' } }],
    ['material', { usa: 'acoEscuro', sel: { grupo: 'cintaDoOlho' } }],
  ],
};

export default receitaMachadoDeGuerra;
