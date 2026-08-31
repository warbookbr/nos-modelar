/* maca-de-abas.js — maça de abas: cabeça de seis abas radiais em haste de aço.
 *
 * Exemplo de autoria, não referência histórica.
 *
 * POR QUE ESTA ARMA. A espada exercitou seção que muda ao longo do comprimento;
 * o machado, assimetria no plano do corte. Falta a terceira família: REPETIÇÃO
 * RADIAL. A cabeça é uma aba só, copiada seis vezes em torno do eixo — e a
 * receita descreve UMA aba, não seis. Descrever seis seria seis lugares para
 * errar e seis lugares para corrigir quando o desenho mudar.
 *
 * O QUE FAZ LER COMO MAÇA DE ABAS e não como clava:
 *   - as abas são finas e ALTAS, não bojudas. A maça de abas concentra o golpe
 *     numa linha para vencer malha e placa; bojo espalha e amassa;
 *   - a haste é de metal, não de madeira, e é FINA. Arma tardia, de cavaleiro;
 *   - o pomo existe e é pequeno. Equilibra sem virar contrapeso de espada.
 *
 * ECONOMIA. Seis abas por `arranja` radial custam uma declaração. A aba é um
 * loft de seções SEMELHANTES — a espessura acompanha a altura — e por isso as
 * faces dela saem planas até o último dígito, sem torção nenhuma. Foi a lição
 * que a lâmina da espada curta deu ao afilar só na largura.
 */

const P = {
  haste: { comprimento: 0.56, raio: 0.013, lados: 8 },
  nucleo: { raio: 0.0145, altura: 0.094, lados: 12 },
  aba: {
    quantidade: 6,
    alcance: 0.046,        // do eixo para fora, em Z
    alturaRaiz: 0.062,     // altura junto da haste
    alturaGume: 0.034,     // altura da aresta que bate
    meiaEspRaiz: 0.0075,
    meiaEspGume: 0.0013,
    divisoes: 8,
    lados: 12,
    /* Superelipse achatada: a aba é CHAPA. Seção em losango — que era o que
       havia aqui — põe uma quina no meio da face e a aba vira lente, com o
       gume virando ponta em vez de aresta. */
    expoenteSecao: 12,
  },
  colar: { alt: 0.020, folga: 0.005 },
  pomo: { raio: 0.020, lados: 10 },
};

/* O topo da haste é onde a cabeça monta; tudo acima é cabeça. */
const yCabeca = P.haste.comprimento;

/* A ABA É UMA CHAPA, e por isso vem de `inflate` e não de `loft`.

   A primeira versão era um `loft` de seções em losango correndo para fora, com
   polo nas duas pontas. O resultado passava em toda medida e mesmo assim era
   uma lente hexagonal espetada na haste: o losango punha uma quina no meio da
   face, e os dois polos faziam a aba afinar até virar bico dos dois lados — de
   um lado para dentro do núcleo, do outro justamente onde deveria estar a
   ARESTA QUE BATE.

   Maça de abas bate com uma aresta, não com um bico. `inflate` descreve a aba
   como ela é: um perfil recortado (alto na raiz, mais baixo no gume, com a
   aresta externa VERTICAL) cruzado com a espessura (grossa na raiz, fina no
   gume). Fechada por construção, sem polo.

   EIXOS: `inflate` lê a silhueta em z×y e a planta em z×x, então a aba nasce
   apontando para +Z e o `arranja` radial em torno de Y distribui as seis. */
const A = P.aba;

const silhuetaAba = [
  [0, A.alturaRaiz / 2],
  [A.alcance * 0.55, A.alturaRaiz * 0.44],
  [A.alcance, A.alturaGume / 2],     // começa a aresta externa
  [A.alcance, -A.alturaGume / 2],    // e termina: entre as duas, uma reta vertical
  [A.alcance * 0.55, -A.alturaRaiz * 0.44],
  [0, -A.alturaRaiz / 2],
];

const plantaAba = [
  [0, A.meiaEspRaiz],
  [A.alcance * 0.6, A.meiaEspRaiz * 0.72],
  [A.alcance, A.meiaEspGume],
  [A.alcance, -A.meiaEspGume],
  [A.alcance * 0.6, -A.meiaEspRaiz * 0.72],
  [0, -A.meiaEspRaiz],
];

export const receitaMacaDeAbas = {
  meta: { nome: 'Maça de Abas', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  TOPO: {
    abaUnica: 'uma aba descrita, seis instanciadas por arranja radial em torno de Y',
    secoesSemelhantes: 'a espessura da aba acompanha a altura, então os quads do loft saem planos',
    eixo: 'Y é a haste; a cabeça é a repetição em torno dele',
    origemSemantica: 'y=0 é o fim do punho; a cabeça começa em y=0,56',
  },

  MATERIAIS: {
    aco: { cor: '#aeb5be', metalicidade: 0.9, aspereza: 0.34 },
    acoEscuro: { cor: '#6b7481', metalicidade: 0.86, aspereza: 0.48 },
    couro: { cor: '#42301f', metalicidade: 0.0, aspereza: 0.86 },
  },

  PASSOS: [
    /* ---------- haste ----------
       Fecha nas duas pontas com polo de raio zero; sem isso o loft sai tubo. */
    ['loft', {
      origemId: 1,
      lados: P.haste.lados,
      orientacao: [1, 0, 0],
      secoes: [
        { pos: [0, 0, 0], raio: 0 },
        { pos: [0, 0.005, 0], raio: P.haste.raio },
        { pos: [0, P.haste.comprimento * 0.7, 0], raio: P.haste.raio },
        { pos: [0, yCabeca + P.nucleo.altura, 0], raio: P.haste.raio * 0.95 },
        { pos: [0, yCabeca + P.nucleo.altura + 0.004, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'haste', sel: { origem: { op: 'loft', id: 1 } } }],

    /* ---------- núcleo da cabeça ----------
       O cilindro em que as abas se apoiam. Sem ele as abas se tocariam só na
       aresta e a cabeça leria como estrela vazada. */
    ['cilindro', {
      origemId: 2,
      raio: P.nucleo.raio,
      altura: P.nucleo.altura,
      lados: P.nucleo.lados,
      em: [0, yCabeca, 0],
    }],
    /* As TAMPAS pedem citação própria. `{op:'cilindro',id}` sem eixo resolve só
       as laterais — é convenção do motor, não descuido — e sem estas duas linhas
       o fundo e o topo do cilindro ficam sem parte, cinzentos e mudos. Foi assim
       que apareceram as quatro faces órfãs desta peça. */
    ['parte', { nome: 'nucleo', sel: { origem: { op: 'cilindro', id: 2 } } }],
    ['parte', { nome: 'nucleo', sel: { origem: { op: 'cilindro', id: 2, tampa: 'fundo' } } }],
    ['parte', { nome: 'nucleo', sel: { origem: { op: 'cilindro', id: 2, tampa: 'topo' } } }],

    /* ---------- uma aba ---------- */
    ['inflate', {
      origemId: 3,
      contornoLado: silhuetaAba,
      contornoTopo: plantaAba,
      modo: 'secoes',
      divisoes: A.divisoes,
      lados: A.lados,
      expoenteSecao: A.expoenteSecao,
    }],
    ['parte', { nome: 'aba', sel: { origem: { op: 'inflate', id: 3 } } }],
    /* A raiz da aba fica ENTERRADA no núcleo: sem o recuo em Z ela encostaria na
       superfície do cilindro e a junção apareceria como fresta. */
    ['transladar', { d: [0, yCabeca + P.nucleo.altura * 0.5, -0.006], sel: { grupo: 'aba' } }],

    /* ---------- as outras cinco ----------
       `volta` é o arco FECHADO da coleção: 360 com total 6 dá passo de 60°. As
       cópias são nomeadas porque posição não é identidade neste repositório —
       inserir uma sétima aba não pode fazer `copia: 2` apontar para outra. */
    ['arranja', {
      origemId: 4,
      derivaDe: { op: 'inflate', id: 3 },
      sel: { origem: { op: 'inflate', id: 3 } },
      modo: 'radial',
      eixo: 'y',
      total: P.aba.quantidade,
      volta: 360,
      nomes: ['abaB', 'abaC', 'abaD', 'abaE', 'abaF'],
    }],

    /* ---------- colar ----------
       A cinta abaixo da cabeça. Detalhe pequeno que faz a arma parecer montada
       em vez de fundida num bloco só. */
    ['cilindro', {
      origemId: 5,
      raio: P.haste.raio + P.colar.folga,
      altura: P.colar.alt,
      lados: P.haste.lados,
      em: [0, yCabeca - P.colar.alt, 0],
    }],
    ['parte', { nome: 'colar', sel: { origem: { op: 'cilindro', id: 5 } } }],
    ['parte', { nome: 'colar', sel: { origem: { op: 'cilindro', id: 5, tampa: 'fundo' } } }],
    ['parte', { nome: 'colar', sel: { origem: { op: 'cilindro', id: 5, tampa: 'topo' } } }],

    /* ---------- pomo ----------
       Pequeno de propósito: maça já tem o peso na ponta certa. */
    ['esfera', {
      origemId: 6,
      raio: P.pomo.raio,
      lados: P.pomo.lados,
      em: [0, P.pomo.raio * 0.35, 0],
    }],
    ['parte', { nome: 'pomo', sel: { origem: { op: 'esfera', id: 6 } } }],

    ['material', { usa: 'acoEscuro', sel: { grupo: 'haste' } }],
    ['material', { usa: 'aco', sel: { grupo: 'nucleo' } }],
    ['material', { usa: 'aco', sel: { grupo: 'aba' } }],
    ['material', { usa: 'acoEscuro', sel: { grupo: 'colar' } }],
    ['material', { usa: 'acoEscuro', sel: { grupo: 'pomo' } }],
  ],
};

export default receitaMacaDeAbas;
