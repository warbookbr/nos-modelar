/* cavalete-de-serra.js — cavalete de serra simples de madeira, com duas pernas
 * em X cruzadas em cada extremidade e uma travessa horizontal apoiada em cima.
 *
 * Exemplo de autoria, não referência de engenharia de marcenaria.
 *
 * CONVENÇÃO DE EIXOS. X é o comprimento da travessa, Y é a altura medida a
 * partir do chão (y = 0 é o plano de apoio dos quatro pés) e Z é a abertura
 * das pernas. Cada quadro em X mora num plano de X constante, em x = ±posX.
 *
 * CONVENÇÃO DE `em` no chamferBox, medida e não suposta: X e Z são o CENTRO da
 * caixa e Y é a BASE, de modo que a caixa cresce para cima a partir de `em`.
 *
 * CADEIA DE APOIO DECLARADA. O pé de cada tábua toca y = 0; o comprimento da
 * parte inferior da tábua é derivado da altura do cruzamento e da inclinação,
 * descontando o quanto a espessura da tábua desce quando ela gira, para que a
 * quina baixa fique exatamente no chão e não afunde nele. A travessa não é
 * posta numa altura digitada: a altura dela sai da conta de onde a face interna
 * de cada tábua abre o suficiente para a largura da travessa, que é o ponto em
 * que ela encunha no V acima do cruzamento. Alterar a inclinação, a espessura
 * da tábua ou a largura da travessa move a travessa junto, sem número velho
 * sobrando na receita.
 *
 * SIMETRIA. A tábua da frente é autorada, a de trás é o giro oposto, e o quadro
 * inteiro do lado direito é espelhado em X para o lado esquerdo. Uma correção
 * na tábua direita não pode divergir da esquerda porque só existe uma autoria.
 */

const P = {
  /* Medidas em metros, de cavalete de obra para trabalho em pé. */
  travessa: { comprimento: 1.10, altura: 0.090, espessura: 0.050 },
  perna: { largura: 0.090, espessura: 0.035, inclinacaoGraus: 18, alturaCruzamento: 0.56, sobraAcima: 0.26 },
  /* Distância do plano de cada quadro em X até o centro da peça. */
  posX: 0.42,
  chanfro: 0.003,
};

export function gerarPassos(params = P) {
  const cfg = { ...P, ...params };
  const t = cfg.perna.espessura;
  const theta = (cfg.perna.inclinacaoGraus * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const tan = Math.tan(theta);
  const yc = cfg.perna.alturaCruzamento;
  const px = cfg.posX;

  /* Comprimento da tábua abaixo do cruzamento. A ponta baixa é cortada
     perpendicular à tábua e ainda leva chanfro, então quem toca o chão não é a
     linha de centro nem a quina teórica: é o ponto mais baixo do perfil
     chanfrado. Os dois candidatos são a quina da face de baixo recuada pelo
     chanfro e a quina da face lateral subida pelo chanfro; o maior mergulho dos
     dois é o que precisa parar em y = 0. */
  const c = cfg.chanfro;
  const mergulho = Math.max((t / 2 - c) * sin, (t / 2) * sin - c * cos);
  const compAbaixo = (yc - mergulho) / cos;
  const compTabua = compAbaixo + cfg.perna.sobraAcima;

  /* Altura da base da travessa: acima do cruzamento as duas tábuas abrem em V,
     e a face interna de cada uma está em z = (y - yc)*tan - (t/2)/cos. A
     travessa encosta nas duas faces quando essa abertura iguala metade da
     espessura dela.
     O canto de baixo da travessa também é chanfrado, então quem encosta na
     tábua é o ponto em que o chanfro encontra a face lateral, um chanfro acima
     da base. */
  const yTravessa = yc - c + (cfg.travessa.espessura / 2 + (t / 2) / cos) / tan;

  const TABUA_FRENTE = { op: 'chamferBox', id: 10 };
  const TABUA_TRAS = { op: 'chamferBox', id: 11 };

  return [
    /* ---------- tábua dianteira do quadro direito ----------
       Nasce vertical, centrada no plano do quadro, e gira em torno do ponto de
       cruzamento: o giro em +X leva +Y para +Z, então a ponta de cima vai para
       a frente e o pé vai para trás. */
    ['chamferBox', {
      origemId: 10,
      larg: cfg.perna.largura, alt: compTabua, prof: t,
      chanfro: cfg.chanfro,
      em: [px, yc - compAbaixo, 0],
    }],
    ['parte', { nome: 'pernaDianteira', sel: { origem: TABUA_FRENTE } }],
    ['rotaciona', {
      eixo: 'x', graus: cfg.perna.inclinacaoGraus, pivo: [px, yc, 0],
      sel: { origem: TABUA_FRENTE },
    }],

    /* ---------- tábua traseira do quadro direito ----------
       Mesma tábua com o giro oposto; as duas se cruzam em y = alturaCruzamento
       e formam o X. */
    ['chamferBox', {
      origemId: 11,
      larg: cfg.perna.largura, alt: compTabua, prof: t,
      chanfro: cfg.chanfro,
      em: [px, yc - compAbaixo, 0],
    }],
    ['parte', { nome: 'pernaTraseira', sel: { origem: TABUA_TRAS } }],
    ['rotaciona', {
      eixo: 'x', graus: -cfg.perna.inclinacaoGraus, pivo: [px, yc, 0],
      sel: { origem: TABUA_TRAS },
    }],

    /* ---------- quadro esquerdo: espelho em X ----------
       A cópia herda a parte da fonte. */
    ['espelha', {
      origemId: 20, eixo: 'x', pos: 0,
      derivaDe: TABUA_FRENTE, sel: { origem: TABUA_FRENTE },
    }],
    ['espelha', {
      origemId: 21, eixo: 'x', pos: 0,
      derivaDe: TABUA_TRAS, sel: { origem: TABUA_TRAS },
    }],

    /* ---------- travessa horizontal ----------
       Deitada ao longo de X, encunhada no V dos dois quadros e sobrando nas
       duas pontas para apoiar tábua mais larga que o vão entre os quadros. */
    ['chamferBox', {
      origemId: 30,
      larg: cfg.travessa.comprimento,
      alt: cfg.travessa.altura,
      prof: cfg.travessa.espessura,
      chanfro: cfg.chanfro,
      em: [0, yTravessa, 0],
    }],
    ['parte', { nome: 'travessa', sel: { origem: { op: 'chamferBox', id: 30 } } }],

    /* ---------- acabamento ---------- */
    ['material', { usa: 'pinho', sel: { grupo: 'travessa' } }],
    ['material', { usa: 'pinhoEscuro', sel: { grupo: 'pernaDianteira' } }],
    ['material', { usa: 'pinhoEscuro', sel: { grupo: 'pernaTraseira' } }],
  ];
}

export const receitaCavaleteDeSerra = {
  meta: {
    nome: 'Cavalete de Serra',
    versao: '1.0.0',
    descricao: 'Cavalete de obra com dois quadros de pernas cruzadas em X e travessa horizontal apoiada no V dos quadros.',
    autor: 'Mecanifica Procedural AI',
  },

  PARAMS: P,

  /* As tábuas de um mesmo quadro se cruzam de verdade, e a travessa encosta nas
     faces internas das quatro tábuas. Nenhum outro par se toca. */
  contatos: [
    { par: ['pernaDianteira', 'pernaTraseira'], motivo: 'as duas tábuas do quadro se cruzam no X' },
    { par: ['pernaDianteira', 'travessa'], motivo: 'a travessa encunha na face interna da tábua dianteira' },
    { par: ['pernaTraseira', 'travessa'], motivo: 'a travessa encunha na face interna da tábua traseira' },
  ],

  TOPO: {
    simetria: 'bilateral em X (quadro direito autorado, esquerdo espelhado) e bilateral em Z por giro oposto das duas tábuas',
    volumesPlanares: 'travessa e tábuas por chamferBox — madeira serrada chanfrada, sem curva',
    apoio: 'quatro pés em y=0; o chão é o plano de apoio',
    cruzamento: 'as tábuas de cada quadro giram em torno do ponto de cruzamento em y=alturaCruzamento',
    alturaDaTravessa: 'derivada da inclinação, da espessura da tábua e da largura da travessa; nunca digitada',
  },

  MATERIAIS: {
    pinho: { cor: '#d2ab74', metalicidade: 0.0, aspereza: 0.68 },
    pinhoEscuro: { cor: '#a67b47', metalicidade: 0.0, aspereza: 0.7 },
  },

  get PASSOS() {
    return gerarPassos(this.PARAMS ?? P);
  },
};

export default receitaCavaleteDeSerra;
