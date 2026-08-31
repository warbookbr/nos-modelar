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
    raioInterno: 0.010,
    raioExterno: 0.058,
    /* A ALTURA precisa ficar bem abaixo do diâmetro da cabeça, e esta é a
       medida que a imagem corrigiu duas vezes. Com altura 0,092 contra 0,11 de
       diâmetro, as seis abas tinham quase a mesma extensão nas duas direções e
       se fundiam num bolo facetado — o render mostrou uma bola, não uma maça.
       Com 0,062 contra 0,116 cada aba lê como barbatana, com o vão entre elas
       visível, que é o que dá o nome à arma. */
    alturaInterna: 0.062,
    alturaExterna: 0.030,
    /* altura / espessura, mantida constante para as seções ficarem semelhantes.
       O valor é ALTO de propósito: na primeira versão era 8,2 e a aba saía
       grossa a ponto de as seis se encostarem — o render mostrou uma bola
       facetada, não uma maça de abas. Aba de maça é chapa, não cunha. */
    razao: 15,
  },
  colar: { alt: 0.020, folga: 0.005 },
  pomo: { raio: 0.020, lados: 10 },
};

/* O topo da haste é onde a cabeça monta; tudo acima é cabeça. */
const yCabeca = P.haste.comprimento;

/* Seção da aba num raio dado. A espessura é DERIVADA da altura pela mesma
   razão em toda estação — é isso que mantém as seções semelhantes e, com elas,
   os quads do loft planos. Espessura constante aqui torceria as faces. */
const secaoAba = (raio, altura) => {
  const meiaEsp = altura / P.aba.razao / 2;
  return {
    pos: [raio, yCabeca + P.nucleo.altura * 0.5, 0],
    contorno: [
      [altura / 2, 0],
      [0, meiaEsp],
      [-altura / 2, 0],
      [0, -meiaEsp],
    ],
  };
};

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

    /* ---------- uma aba ----------
       Quatro estações: base enterrada no núcleo, corpo, e a ponta fechando num
       polo. A aba encolhe em altura para fora, que é o que dá o perfil de
       lâmina curta em vez de placa retangular. */
    ['loft', {
      origemId: 3,
      lados: 4,
      orientacao: [0, 1, 0],
      secoes: [
        { pos: [P.aba.raioInterno - 0.004, yCabeca + P.nucleo.altura * 0.5, 0], raio: 0 },
        secaoAba(P.aba.raioInterno, P.aba.alturaInterna),
        secaoAba((P.aba.raioInterno + P.aba.raioExterno) / 2, (P.aba.alturaInterna + P.aba.alturaExterna) / 2),
        secaoAba(P.aba.raioExterno, P.aba.alturaExterna),
        { pos: [P.aba.raioExterno + 0.003, yCabeca + P.nucleo.altura * 0.5, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'aba', sel: { origem: { op: 'loft', id: 3 } } }],

    /* ---------- as outras cinco ----------
       `volta` é o arco FECHADO da coleção: 360 com total 6 dá passo de 60°. As
       cópias são nomeadas porque posição não é identidade neste repositório —
       inserir uma sétima aba não pode fazer `copia: 2` apontar para outra. */
    ['arranja', {
      origemId: 4,
      derivaDe: { op: 'loft', id: 3 },
      sel: { origem: { op: 'loft', id: 3 } },
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
