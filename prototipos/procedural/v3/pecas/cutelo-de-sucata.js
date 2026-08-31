/* cutelo-de-sucata.js — arma corpo a corpo pós-apocalíptica.
   v2: lâmina de verdade (loft com seção em cunha: dorso grosso, fio fino,
   barriga larga e ponta fechada) e cabo torneado (lathe), em vez da pilha
   de caixas retas da v1 que lia como uma tábua. */

const ESP = { base: 0.0110, meio: 0.0098, alto: 0.0070, ponta: 0.0050 };

/* Seção transversal da lâmina no plano local do anel: 6 pontos CCW.
   -dorso = costas da lâmina (grossa), +fio = gume (espessura zero). */
function secaoLamina(y, dorso, fio, esp) {
  return {
    pos: [0, y, 0],
    contorno: [
      [-dorso, -esp],
      [0, -esp],
      [fio, 0],
      [0, esp],
      [-dorso, esp],
      [-dorso - 0.006, 0],
    ],
  };
}

export const receitaCutelo = {
  meta: {
    nome: 'Cutelo de Sucata Reforçado',
    versao: '2.0.0',
    autor: 'Mecanifica Procedural AI',
  },
  PARAMS: {
    comprimentoTotal: 0.88,
    larguraLamina: 0.138,
  },
  MATERIAIS: {
    ferroSucata: { cor: '#475569', metalicidade: 0.85, aspereza: 0.45 },
    fioAfiado: { cor: '#cbd5e1', metalicidade: 0.95, aspereza: 0.15 },
    couroCabo: { cor: '#78350f', metalicidade: 0.1, aspereza: 0.8 },
    reforcoBronze: { cor: '#d97706', metalicidade: 0.9, aspereza: 0.3 },
  },
  PASSOS: [
    // 1. Cabo torneado: pomo alargado embaixo, barriga no meio, colar no topo.
    ['lathe', {
      origemId: 20,
      lados: 14,
      perfil: [
        [0, 0.000],
        [0.034, 0.000],
        [0.036, 0.018],
        [0.028, 0.035],
        [0.020, 0.060],
        [0.023, 0.130],
        [0.020, 0.200],
        [0.026, 0.238],
        [0.030, 0.255],
        [0, 0.262],
      ],
    }],
    ['parte', { nome: 'cabo', sel: { origem: { op: 'lathe', id: 20 } } }],
    ['material', { usa: 'couroCabo', sel: { grupo: 'cabo' } }],

    // 2. Guarda / travessa chanfrada no topo do cabo.
    ['chamferBox', {
      origemId: 21,
      larg: 0.048,
      alt: 0.030,
      prof: 0.135,
      chanfro: 0.008,
      em: [0, 0.255, 0.038],
    }],
    ['parte', { nome: 'guarda', sel: { origem: { op: 'chamferBox', id: 21 } }, pai: 'cabo' }],
    ['material', { usa: 'reforcoBronze', sel: { grupo: 'guarda' } }],

    // 3. Lâmina: espigão fechado dentro da guarda, alarga até a barriga,
    //    afina e fecha em ponta. Sem tampa aberta em nenhuma extremidade.
    ['loft', {
      origemId: 22,
      lados: 6,
      secoes: [
        { pos: [0, 0.255, 0], raio: 0 },
        secaoLamina(0.285, 0.020, 0.050, ESP.base),
        secaoLamina(0.360, 0.024, 0.078, ESP.base),
        secaoLamina(0.520, 0.026, 0.100, ESP.meio),
        secaoLamina(0.700, 0.026, 0.112, ESP.alto),
        secaoLamina(0.800, 0.024, 0.104, ESP.alto),
        secaoLamina(0.845, 0.018, 0.070, ESP.ponta),
        { pos: [0, 0.880, 0], raio: 0 },
      ],
    }],
    ['parte', { nome: 'lamina', sel: { origem: { op: 'loft', id: 22 } }, pai: 'guarda' }],
    ['material', { usa: 'ferroSucata', sel: { grupo: 'lamina' } }],

    /* ORIENTAÇÃO DE EMPUNHADURA (convenção de arma do Jogo01).
       A peça é autorada com o cabo em pé no eixo Y, que é o frame neutro da
       Mecanifica. O motor espera outra coisa: a arma nasce DENTRO da mão, então
       a origem precisa cair no meio da empunhadura (não no pomo) e a lâmina
       precisa apontar no eixo que a mão usa. Medido em jogo (Tools/isolar_em_jogo.py,
       vista de frente e girada 90 graus): a lâmina em -X pende ao lado da
       perna; em +X ela sobe atravessada na frente do tronco. Fazer esse ajuste no
       componente da Unreal, arma por arma, é trabalho manual que se repete e se
       perde; aqui ele é parte da peça e vale para toda exportação. */
    ['rotaciona', { eixo: 'z', graus: 90, pivo: [0, 0, 0] }],
    /* O attach e por SNAP no osso `hand_r`: a origem da malha cai no PIVO DO
       OSSO, que fica no punho, nao na palma — por isso o cabo aparecia dentro
       do antebraco. Alem de centrar a empunhadura (0.13), desloca-se ate a
       palma. A medida vem do socket `HandGrip_R` que a Epic entrega no
       mannequin, (-7.01, 2.05, 0) cm no espaco do osso; o exportador inverte Y
       entre a Mecanifica e a Unreal, dai o sinal do segundo termo. */
    ['transladar', { d: [0.13 - 0.0701, -0.0205, 0] }],
  ],
};

export default receitaCutelo;
