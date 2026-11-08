/* materiais-de-prova/receita.js — a peça de prova dos materiais realistas (plano 2026-11-08-materiais-realistas).
 *
 * POR QUE ELA EXISTE. O plano de materiais realistas pede uma peça geral, com os seis materiais que o furgão vai usar, para a
 * pessoa aprovar por imagem antes de qualquer peça do acervo ganhar verniz, vidro, metal espelhado ou relevo. Cada material
 * mora em uma forma simples que mostra o que ele precisa mostrar: a placa curva dá ao verniz uma luz que corre, a placa plana
 * dá ao vidro o que há atrás dele, a calota dá ao metal espelhado um reflexo que se deforma, o disco e o bloco têm face plana
 * para a aspereza e o granulado se lerem, e o pneu tem a banda larga e contínua que o relevo de rodagem pede.
 *
 * NESTA FATIA (a 1) os materiais declaram os campos novos, e o normalizador (`src/autoria/material-da-receita.js`) os valida e
 * guarda, mas a cena ainda os mostra só em cor chapada, aspereza, metalicidade e transparência. Verniz, transmissão, índice de
 * refração e relevo passam a aparecer nas fatias 2 e 3.
 *
 * ELA NÃO É CONTEÚDO. Mora em `tools/fixtures/acervo/` junto das outras receitas de ensaio, fora do acervo publicado.
 * `guarda:acervo` não a varre, e a bancada a lista como ensaio.
 *
 * Referencial: Y para cima, o chão em y = 0, as seis peças em fila ao longo de x, 260 mm entre centros, de frente para +z. */

const m = (mm) => mm / 1000;

export const TABELA = {
  /* a distância entre os centros de duas peças vizinhas da fila */
  passo: 260,
  /* a placa curva da tinta: a largura da corda, a flecha do arco (o quanto o meio avança), a espessura da chapa e a altura */
  placaLargura: 200,
  placaFlecha: 28,
  placaEspessura: 4,
  placaAltura: 160,
  /* a placa plana do vidro */
  vidroLargura: 200,
  vidroAltura: 160,
  vidroEspessura: 6,
  /* a calota do metal espelhado: raio da borda, altura do domo, e o degrau da borda */
  calotaRaio: 90,
  calotaAltura: 55,
  calotaBorda: 8,
  /* o disco de aço pintado */
  discoRaio: 100,
  discoEspessura: 30,
  /* o pneu de borracha: raio de dentro, raio de fora, largura da banda e o chanfro do ombro */
  pneuRaioDentro: 50,
  pneuRaioFora: 100,
  pneuLargura: 80,
  pneuOmbro: 8,
  /* o bloco de plástico granulado */
  blocoLargura: 200,
  blocoAltura: 70,
  blocoProfundidade: 90,
  lados: 48,
};

const COLUNA = { tinta: -2.5, vidro: -1.5, metal: -0.5, aco: 0.5, borracha: 1.5, plastico: 2.5 };
const ID = { tinta: 10, vidro: 20, metal: 30, aco: 40, borracha: 50, plastico: 60 };

export function gerarPassos(t = TABELA) {
  const x = (coluna) => m(COLUNA[coluna] * t.passo);
  const passos = [];
  const parte = (nome, sel, material) => {
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { sel, usa: material }]);
  };
  const meia = t.placaLargura / 2;

  /* tinta com verniz: a chapa é um arco de flecha dada, com a espessura da chapa, extrudado em altura */
  passos.push(['extrusao', {
    origemId: ID.tinta,
    perfil: {
      contorno: {
        inicio: [-m(meia), 0],
        trechos: [
          { arco: { por: [0, m(t.placaFlecha)], ate: [m(meia), 0] } },
          { reto: [m(meia), -m(t.placaEspessura)] },
          { arco: { por: [0, m(t.placaFlecha - t.placaEspessura)], ate: [-m(meia), -m(t.placaEspessura)] } },
        ],
      },
    },
    altura: m(t.placaAltura),
    em: [x('tinta'), 0, 0],
  }]);
  parte('placaDeTinta', { origem: { op: 'extrusao', id: ID.tinta } }, 'tintaComVerniz');

  /* vidro: a placa plana */
  passos.push(['cubo', {
    origemId: ID.vidro, larg: m(t.vidroLargura), alt: m(t.vidroAltura), prof: m(t.vidroEspessura), em: [x('vidro'), 0, 0],
  }]);
  parte('placaDeVidro', { origem: { op: 'cubo', id: ID.vidro } }, 'vidro');

  /* metal espelhado: a calota, um domo de revolução com o degrau da borda */
  passos.push(['lathe', {
    origemId: ID.metal,
    lados: t.lados,
    em: [x('metal'), 0, 0],
    perfil: [
      [0, 0],
      [m(t.calotaRaio), 0],
      [m(t.calotaRaio), m(t.calotaBorda)],
      [m(t.calotaRaio * 0.8), m(t.calotaAltura * 0.62)],
      [m(t.calotaRaio * 0.45), m(t.calotaAltura * 0.9)],
      [0, m(t.calotaAltura)],
    ],
  }]);
  parte('calotaEspelhada', { origem: { op: 'lathe', id: ID.metal } }, 'metalEspelhado');

  /* aço pintado: o disco da roda, com a face plana larga */
  passos.push(['cilindro', {
    origemId: ID.aco, raio: m(t.discoRaio), altura: m(t.discoEspessura), lados: t.lados, eixo: 'y', em: [x('aco'), 0, 0],
  }]);
  parte('discoDeAcoPintado', { alias: 'discoInteiro' }, 'acoPintado');

  /* borracha com relevo: o anel do pneu, a banda larga e contínua que o relevo de rodagem pede */
  passos.push(['lathe', {
    origemId: ID.borracha,
    lados: t.lados,
    em: [x('borracha'), 0, 0],
    perfil: [
      [m(t.pneuRaioDentro), 0],
      [m(t.pneuRaioFora - t.pneuOmbro), 0],
      [m(t.pneuRaioFora), m(t.pneuOmbro)],
      [m(t.pneuRaioFora), m(t.pneuLargura - t.pneuOmbro)],
      [m(t.pneuRaioFora - t.pneuOmbro), m(t.pneuLargura)],
      [m(t.pneuRaioDentro), m(t.pneuLargura)],
      [m(t.pneuRaioDentro), 0],
    ],
  }]);
  parte('pneuDeBorracha', { origem: { op: 'lathe', id: ID.borracha } }, 'borrachaComRelevo');

  /* plástico granulado: o bloco de faces planas e largas */
  passos.push(['cubo', {
    origemId: ID.plastico, larg: m(t.blocoLargura), alt: m(t.blocoAltura), prof: m(t.blocoProfundidade), em: [x('plastico'), 0, 0],
  }]);
  parte('blocoDePlastico', { origem: { op: 'cubo', id: ID.plastico } }, 'plasticoGranulado');

  return passos;
}

export const ALIASES = [
  ['discoInteiro', { unir: [
    { origem: { op: 'cilindro', id: ID.aco } },
    { origem: { op: 'cilindro', id: ID.aco, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: ID.aco, tampa: 'topo' } },
  ] }],
];

/* Os seis materiais do plano, declarados uma vez com os campos novos. As cores e a aspereza partem das do furgão realista (azul da
   lataria, aço prateado, plástico preto, borracha preta, vidro claro de leve tom verde). */
export const MATERIAIS = {
  /* tinta sólida com verniz: base de aspereza média, verniz inteiro e liso por cima */
  tintaComVerniz: {
    tipo: 'liso', cor: '#5d75c9', aspereza: 0.5, metalicidade: 0.05, verniz: 1, asperezaDoVerniz: 0.04,
  },
  /* vidro claro com leve tom verde: transmite quase tudo, índice de refração de vidro comum */
  vidro: {
    tipo: 'liso', cor: '#e4f0ee', mistura: 'transparente', opacidade: 0.25, aspereza: 0.03, metalicidade: 0,
    transmissao: 1, indiceDeRefracao: 1.5, tomDoVidro: '#a8cdbd',
  },
  /* metal espelhado: quase sem aspereza e todo metal */
  metalEspelhado: {
    tipo: 'metal', acabamento: 'pintado', cor: '#d6d9dd', aspereza: 0.04, metalicidade: 1,
  },
  /* aço pintado de prata acetinado: metal sob tinta, com um verniz fosco por cima */
  acoPintado: {
    tipo: 'metal', acabamento: 'pintado', cor: '#b9bcc2', aspereza: 0.42, metalicidade: 0.6, verniz: 0.3, asperezaDoVerniz: 0.3,
  },
  /* borracha preta fosca com o relevo da banda de rodagem */
  borrachaComRelevo: {
    tipo: 'liso', cor: '#1f1f23', aspereza: 0.92, metalicidade: 0, relevo: { tipo: 'bandaDeRodagem', escala: 30, intensidade: 0.6 },
  },
  /* plástico preto acetinado, entre o fosco e o brilhante, com granulado fino */
  plasticoGranulado: {
    tipo: 'liso', cor: '#1b1b1e', aspereza: 0.5, metalicidade: 0, verniz: 0.2, asperezaDoVerniz: 0.4,
    relevo: { tipo: 'granulado', escala: 0.4, intensidade: 0.35 },
  },
};

export const receitaMateriaisDeProva = {
  meta: {
    nome: 'Peça de prova dos materiais',
    versao: '1.0.0',
    autor: 'Modelar',
    desc: 'ensaio dos seis materiais realistas, em fila: tinta com verniz, vidro, metal espelhado, aço pintado, borracha com relevo e plástico granulado; não é conteúdo do acervo',
  },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaMateriaisDeProva;
