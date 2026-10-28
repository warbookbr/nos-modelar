/* suporte-tubo — suporte em L de chapa grossa que prende um tubo de 30 mm a uma parede.
 *
 * Duas abas de 6 mm: a aba de parede, vertical, com dois furos oblongos de
 * 8 por 16 mm para parafuso, e a aba do tubo, horizontal, que sai a 90 graus da
 * parede e tem um recorte em arco que abraça o tubo.
 *
 * Referencial do acervo: Y para cima, o chão da peça em y = 0, a parede no plano
 * z = 0 e a peça avançando para +z. A aba de parede ocupa z de 0 a 6; a aba do
 * tubo nasce na face da frente dela (z = 6) e avança até a borda livre. O eixo do
 * tubo é vertical e passa pelo centro do arco do recorte.
 *
 * Cada aba sai de uma interseção de sólidos, porque `arredondarAresta` só aceita uma
 * aresta cujas pontas tenham um leque simples de faces, e a tampa de um perfil com
 * furo ou com recorte vira um leque de faces convexas:
 * - o CORTE é o perfil com os furos oblongos (aba de parede) ou com o recorte e as
 *   concordâncias (aba do tubo), em contorno por trechos;
 * - cada ENVELOPE é uma caixa lisa do tamanho da aba com um grupo de arestas
 *   arredondadas em 3 mm, escolhidas por propriedade;
 * - a interseção do corte com os envelopes dá a aba pronta.
 * Os envelopes são vários porque o motor deforma a face de apoio onde dois
 * arredondamentos dividem um vértice; cada envelope só arredonda arestas que não
 * dividem vértice, e a interseção faz o encontro sem face torta.
 *
 * Arestas arredondadas: nos quatro cantos da aba de parede, nas bordas de cima e
 * laterais da face da frente; nos dois cantos livres da aba do tubo e nas bordas
 * livre e laterais da face de cima. A face de trás, que encosta na parede, e a de
 * baixo ficam vivas, e uma chapa de 6 mm não comporta 3 mm de arredondamento nas
 * duas faces da mesma borda. Os cantos onde o recorte encontra a borda livre levam
 * a concordância de 5 mm no próprio contorno.
 *
 * Nenhuma face, vértice ou aresta é citada por número: as arestas vêm de
 * `sel: { onde }`, por normal e por posição extrema. Os `origemId` dos passos são
 * a identidade estrutural de cada operação, escolhida aqui.
 */

export const TABELA = {
  /* Chapa grossa: as duas abas têm a mesma espessura. */
  espessura: 6,
  /* Aba de parede: largura (x) e altura (y). */
  larguraAbaParede: 80,
  alturaAbaParede: 60,
  /* Furo oblongo de parafuso: 8 mm de largura e 16 mm de comprimento, com o
     comprimento na vertical para permitir ajuste de altura. */
  furoLargura: 8,
  furoComprimento: 16,
  furoEntreCentros: 48,
  furoAlturaDoCentro: 36,
  /* Aba do tubo: largura (x) e saída contada da superfície da parede até a borda livre. */
  larguraAbaTubo: 60,
  saidaAbaTubo: 50,
  /* Tubo que o recorte abraça. Folga zero: o arco tem o raio do tubo. */
  diametroDoTubo: 30,
  folgaDoTubo: 0,
  /* Distância do eixo do tubo até a borda livre, que é também o comprimento da
     parte reta do recorte antes do arco. */
  eixoDoTuboAteBorda: 15,
  /* Concordância nos cantos onde o recorte encontra a borda livre. */
  concordanciaDoRecorte: 5,
  /* Arredondamento das arestas externas. */
  arredondamentoExterno: 3,
  paineisDoArredondamento: 6,
  segmentosArco: 16,
};

const m = (mm) => mm / 1000;

/* Quanto o corte da aba de parede passa do envelope em cada lado, em milímetro: o
   corte só abre os furos e não divide face nenhuma com os envelopes. Não muda a
   peça, por isso não está na tabela. */
const MARGEM_DO_CORTE = 2;

export function derivar(t = TABELA) {
  const e = m(t.espessura);
  const L = m(t.larguraAbaParede);
  const H = m(t.alturaAbaParede);
  const k = m(MARGEM_DO_CORTE);
  const meiaFuro = m(t.furoLargura) / 2;
  const retoDoFuro = m(t.furoComprimento) / 2 - meiaFuro;
  const Lt = m(t.larguraAbaTubo);
  const zFora = m(t.saidaAbaTubo);
  const raioDoRecorte = m(t.diametroDoTubo) / 2 + m(t.folgaDoTubo);
  const zCentroDoArco = zFora - m(t.eixoDoTuboAteBorda);
  /* No perfil de uma extrusão em z, u vai para x e v vai para -y. */
  const furo = (lado) => {
    const cu = lado * m(t.furoEntreCentros) / 2;
    const cv = -m(t.furoAlturaDoCentro);
    return {
      contorno: {
        inicio: [cu + meiaFuro, cv],
        trechos: [
          { reto: [cu + meiaFuro, cv - retoDoFuro] },
          { arcoTangente: [cu - meiaFuro, cv - retoDoFuro] },
          { reto: [cu - meiaFuro, cv + retoDoFuro] },
          { arcoTangente: [cu + meiaFuro, cv + retoDoFuro] },
        ],
      },
    };
  };
  return {
    e,
    raioDoArredondamento: m(t.arredondamentoExterno),
    abaParede: {
      envelope: { largura: L, profundidade: H, centro: [0, -H / 2] },
      corte: { largura: L + 2 * k, profundidade: H + 2 * k, centro: [0, -H / 2], altura: e + 2 * k, em: [0, 0, -k] },
      furos: [furo(-1), furo(1)],
    },
    abaTubo: {
      envelope: { largura: Lt, profundidade: zFora - e, centro: [0, (zFora + e) / 2] },
      altura: e,
      contorno: {
        inicio: [-Lt / 2, e],
        trechos: [
          { reto: [Lt / 2, e] },
          { reto: [Lt / 2, zFora] },
          { reto: [raioDoRecorte, zFora] },
          { concordancia: m(t.concordanciaDoRecorte) },
          { reto: [raioDoRecorte, zCentroDoArco] },
          { arcoTangente: [-raioDoRecorte, zCentroDoArco] },
          { reto: [-raioDoRecorte, zFora] },
          { concordancia: m(t.concordanciaDoRecorte) },
          { reto: [-Lt / 2, zFora] },
        ],
      },
    },
  };
}

/* Identidade estrutural dos passos, escolhida aqui: cada aba tem uma centena,
   com o corte, os envelopes de dez em dez e o resultado no fim. */
const ID = {
  corteParede: 100, parede: 190,
  corteTubo: 200, tubo: 290,
};

const NORMAL = { cima: [0, 1, 0], baixo: [0, -1, 0], frente: [0, 0, 1], direita: [1, 0, 0], esquerda: [-1, 0, 0] };

/* Cada aresta é dita por propriedade: a normal de uma das faces que a usam e o
   extremo de um eixo. Os envelopes de uma aba são a mesma caixa, e cada um
   arredonda arestas que não dividem vértice: o motor deforma a face de apoio
   onde dois arredondamentos se encontram, e a interseção dos envelopes faz o
   encontro sem essa deformação. */
const ENVELOPES_PAREDE = [
  {
    nome: 'cantosDaAbaParede', id: 110,
    arestas: [
      { normal: 'cima', eixo: 'x', lado: 'max' }, { normal: 'cima', eixo: 'x', lado: 'min' },
      { normal: 'baixo', eixo: 'x', lado: 'max' }, { normal: 'baixo', eixo: 'x', lado: 'min' },
    ],
  },
  {
    nome: 'bordasLateraisDaFrente', id: 120,
    arestas: [{ normal: 'frente', eixo: 'x', lado: 'max' }, { normal: 'frente', eixo: 'x', lado: 'min' }],
  },
  { nome: 'bordaDeCimaDaFrente', id: 130, arestas: [{ normal: 'frente', eixo: 'y', lado: 'max' }] },
];
const ENVELOPES_TUBO = [
  {
    nome: 'cantosLivresDaAbaTubo', id: 210,
    arestas: [{ normal: 'direita', eixo: 'z', lado: 'max' }, { normal: 'esquerda', eixo: 'z', lado: 'max' }],
  },
  {
    nome: 'bordasLateraisDeCimaDaAbaTubo', id: 220,
    arestas: [{ normal: 'cima', eixo: 'x', lado: 'max' }, { normal: 'cima', eixo: 'x', lado: 'min' }],
  },
  { nome: 'bordaLivreDeCimaDaAbaTubo', id: 230, arestas: [{ normal: 'cima', eixo: 'z', lado: 'max' }] },
];

/* Os arredondamentos de um envelope têm ids de operação logo depois do dele. */
const idArredondamento = (envelope, k) => envelope.id + 1 + k;

/* O envelope inteiro é a caixa mais os painéis de arredondamento; sem eles a
   seleção seria uma superfície aberta. */
const envelopeInteiro = (envelope) => ({
  unir: [
    { origem: { op: 'extrusao', id: envelope.id } },
    ...envelope.arestas.map((_, k) => ({ origem: { op: 'arredondarAresta', id: idArredondamento(envelope, k) } })),
  ],
});

/* Só os painéis dos arredondamentos, para o sombreamento liso não alcançar as faces planas. */
const painesDe = (lista) => ({
  unir: lista.flatMap((envelope) => envelope.arestas.map((_, k) => ({ origem: { op: 'arredondarAresta', id: idArredondamento(envelope, k) } }))),
});

export const ALIASES = [
  ...[...ENVELOPES_PAREDE, ...ENVELOPES_TUBO].map((envelope) => [envelope.nome, envelopeInteiro(envelope)]),
  ['arredondamentosDaAbaParede', painesDe(ENVELOPES_PAREDE)],
  ['arredondamentosDaAbaTubo', painesDe(ENVELOPES_TUBO)],
];

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];

  const arredonda = (envelope, k, { normal, eixo, lado }) => ['arredondarAresta', {
    origemId: idArredondamento(envelope, k),
    raio: P.raioDoArredondamento,
    paineis: t.paineisDoArredondamento,
    sel: {
      origem: { op: 'extrusao', id: envelope.id },
      onde: { alvo: 'aresta', normal: { dir: NORMAL[normal], ate: 5 }, extremo: { eixo, lado } },
    },
  }];

  /* Cada envelope é a caixa da aba com as arestas do seu grupo arredondadas. */
  const envelopes = (lista, extrusaoDaCaixa) => {
    for (const envelope of lista) {
      passos.push(['extrusao', { origemId: envelope.id, ...extrusaoDaCaixa }]);
      envelope.arestas.forEach((aresta, k) => passos.push(arredonda(envelope, k, aresta)));
    }
  };

  /* Aba de parede. */
  const W = P.abaParede;
  passos.push(['extrusao', {
    origemId: ID.corteParede, eixo: 'z', altura: W.corte.altura, em: W.corte.em,
    perfil: { retangulo: { largura: W.corte.largura, profundidade: W.corte.profundidade, centro: W.corte.centro } },
    furos: W.furos, segmentosArco: t.segmentosArco,
  }]);
  envelopes(ENVELOPES_PAREDE, { eixo: 'z', altura: P.e, perfil: { retangulo: W.envelope } });
  passos.push(['intersectar', {
    origemId: ID.parede,
    solidos: [
      { origem: { op: 'extrusao', id: ID.corteParede } },
      ...ENVELOPES_PAREDE.map((envelope) => ({ alias: envelope.nome })),
    ],
  }]);
  passos.push(['parte', { nome: 'abaParede', sel: { origem: { op: 'intersectar', id: ID.parede } } }]);

  /* Aba do tubo. */
  const T = P.abaTubo;
  passos.push(['extrusao', {
    origemId: ID.corteTubo, altura: T.altura, perfil: { contorno: T.contorno }, segmentosArco: t.segmentosArco,
  }]);
  envelopes(ENVELOPES_TUBO, { altura: T.altura, perfil: { retangulo: T.envelope } });
  passos.push(['intersectar', {
    origemId: ID.tubo,
    solidos: [
      { origem: { op: 'extrusao', id: ID.corteTubo } },
      ...ENVELOPES_TUBO.map((envelope) => ({ alias: envelope.nome })),
    ],
  }]);
  passos.push(['parte', { nome: 'abaTubo', sel: { origem: { op: 'intersectar', id: ID.tubo } } }]);

  /* Acabamento. A face de trás da aba de parede, a que encosta na parede, é a de
     normal -z no extremo mínimo de z; ela ganha o material de apoio. */
  for (const id of [ID.parede, ID.tubo]) {
    passos.push(['material', { usa: 'aco', sel: { origem: { op: 'intersectar', id } } }]);
  }
  passos.push(['material', {
    usa: 'apoio',
    sel: {
      origem: { op: 'intersectar', id: ID.parede },
      onde: { normal: { dir: [0, 0, -1], ate: 5 }, extremo: { eixo: 'z', lado: 'min' } },
    },
  }]);
  /* O arredondamento sai em painéis; o ângulo de 30 graus os liga numa curva e
     deixa nítidas as quinas de 90 graus. */
  for (const alias of ['arredondamentosDaAbaParede', 'arredondamentosDaAbaTubo']) {
    passos.push(['liso', { angulo: 30, sel: { alias } }]);
  }
  /* As paredes dos furos e do recorte são curvas em facetas: lisas, com as quinas de 90 graus nítidas. */
  passos.push(['liso', { angulo: 30, sel: { origem: { op: 'extrusao', id: ID.corteParede, parede: 'furos' } } }]);
  passos.push(['liso', { angulo: 30, sel: { origem: { op: 'extrusao', id: ID.corteTubo, parede: 'externo' } } }]);

  return passos;
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(t = TABELA) {
  const meiaParede = t.larguraAbaParede / 2;
  const meiaTubo = t.larguraAbaTubo / 2;
  return [
    { nome: 'canto de baixo da aba de parede', parte: 'abaParede', medida: 'minimo', em: [-meiaParede, 0, 0], toleranciaMm: 0.5 },
    { nome: 'canto de cima da aba de parede', parte: 'abaParede', medida: 'maximo', em: [meiaParede, t.alturaAbaParede, t.espessura], toleranciaMm: 0.5 },
    { nome: 'canto junto à parede da aba do tubo', parte: 'abaTubo', medida: 'minimo', em: [-meiaTubo, 0, t.espessura], toleranciaMm: 0.5 },
    { nome: 'canto da borda livre da aba do tubo', parte: 'abaTubo', medida: 'maximo', em: [meiaTubo, t.espessura, t.saidaAbaTubo], toleranciaMm: 0.5 },
  ];
}

const receita = {
  meta: { nome: 'suporte-tubo', desc: 'suporte em L de chapa grossa que prende um tubo de 30 mm a uma parede' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    aco: { cor: '#6b737b', metalicidade: 0.8, aspereza: 0.4 },
    apoio: { cor: '#3f464c', metalicidade: 0.8, aspereza: 0.55 },
  },
  TOPO: { origem: 'canto de baixo da aba de parede, no meio da largura e encostado na parede; y para cima e a aba do tubo avança para +z' },
  PLANO: {
    objeto: 'suporte em L de chapa grossa que prende um tubo de 30 mm de diâmetro a uma parede, com duas abas de 6 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro do tubo que o recorte abraça', milimetros: 30 },
    partes: [
      {
        nome: 'abaParede',
        forma: 'chapa vertical de 80 por 60 mm e 6 mm de espessura, com dois furos oblongos de 8 por 16 mm para parafuso, quatro cantos e a borda de cima da frente arredondados em 3 mm',
        tecnica: 'extrusão com furos oblongos de contorno por trechos, cortada pelo envelope de arestas arredondadas',
      },
      {
        nome: 'abaTubo',
        forma: 'chapa horizontal de 60 mm de largura e 6 mm de espessura que sai a 90 graus da aba de parede, com recorte em arco que abraça o tubo e concordância de 5 mm nos cantos do recorte',
        tecnica: 'extrusão de contorno por trechos com reto, arco tangente e concordância, cortada pelo envelope de arestas arredondadas',
      },
    ],
    criteriosDeReprovacao: [
      'o recorte da aba do tubo não é um arco de 30 mm de diâmetro aberto na borda livre',
      'os furos da aba de parede não são oblongos de 8 por 16 mm',
      'as duas abas não formam um L a 90 graus, ou a aba do tubo sai para o lado da parede',
      'os cantos do recorte na borda livre ficam vivos, sem concordância de 5 mm',
      'canto livre de uma aba com quina viva onde o plano pede arredondamento de 3 mm',
      'a peça fica abaixo do chão ou deitada, fora do referencial de Y para cima',
    ],
  },
  contatos: [
    { par: ['abaParede', 'abaTubo'], motivo: 'a aba do tubo nasce na face da frente da aba de parede, rente à base' },
  ],
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
