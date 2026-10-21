/* geladeira-compacta-branca — frigobar alto de uma porta, todo branco: gabinete de cantos levemente arredondados, porta de placa com as
 * bordas arredondadas, uma faixa-puxador no topo da porta com uma canaleta côncava na face de cima para os dedos, uma pequena dobradiça no canto de cima
 * direito e quatro pés cilíndricos.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente do aparelho em +z; o fundo fica em -z e x cresce para a direita
 * de quem olha de frente. Origem no chão, centrada em x e em z. A TABELA, em milímetro, é a única fonte das medidas; `derivar`
 * calcula as posições e `gerarPassos` converte para metro num lugar só (`m`).
 *
 * Medidas aprovadas pela pessoa: 475 mm de largura, 870 mm de altura contando os pés e 515 mm de profundidade. A caixa tem 475 por
 * 855 por 495 mm, de y 15 a y 870 e de z -257,5 a z 237,5, sobre pés de 15 mm. A porta tem 20 mm e fecha os 515 mm: de z 237,5 a
 * z 257,5.
 *
 * Razões medidas em frontal.png (685 por 590 px; aparelho de x 274 a 534, 260 px, 1,827 mm/px; topo do friso em y 64 e base dos pés
 * em y 528) e em tres-quartos.png (810 por 590 px):
 *   altura total da foto  464 px  -> 848 mm a 1,827 mm/px (a pessoa aprovou 870; a razão altura/largura da foto é 1,78 e a das
 *                                     medidas aprovadas é 1,83, 3% de diferença que fica como está)
 *   friso do topo         x 297 a 507 px  210 px  0,81 da largura  -> 384 mm, centrado em x (centro em x 402 contra 404 do aparelho)
 *   friso do topo         altura de 64 a ~84 px  20 px  -> 36 mm na face da frente; usado 30 mm
 *   friso acima do topo das laterais  4 px  -> 7 mm (NÃO modelado: a altura total de 870 mm fica fechada em y 870)
 *   dobradiça             x 510 a 535 px  25 px  -> 46 mm de largura, ao fim do friso, no canto de cima direito; usada 36 mm
 *   pés                   direito: 515 a 533 px de largura, 18 px -> 33 mm; altura 8 px -> 15 mm. A pessoa pediu depois os pés
 *                          da foto: 15 mm de altura e 36 mm de diâmetro (a foto mostra 33 mm), com 15 mm da borda do pé à lateral da caixa.
 *   margem em volta da porta  não se mede na foto de frente (a porta chega à borda do gabinete); usado 5 mm, o que a pessoa pediu.
 *
 * Forma do puxador, como a pessoa corrigiu: uma faixa horizontal de 384 mm (0,826 da porta) e 30 mm de altura (y 835 a 865), de z 237,5
 * a z 257,5, com a frente lisa e rente à da porta. A face de CIMA tem a canaleta côncava que corre ao longo da faixa, de ponta a
 * ponta fechada: arco de 14 mm de largura em z e 5 mm de fundo, com 2 mm de borda atrás e o canto da frente arredondado em 4 mm. A
 * canaleta tem 14 mm, abaixo dos 16 a 20 pedidos, porque a porta tem 20 mm de espessura e a faixa não sai para a frente nem entra
 * na caixa. O perfil lateral (y, z) é UMA extrusão ao longo de x, e a porta recebe um recorte do mesmo contorno (por `subtrair`).
 * A altura total ficou em 870 mm: a canaleta coube sem subir. Em planta as pontas são retas.
 *
 * Simplificações em relação à imagem:
 *  - o friso real é um abaulado que sobe 7 mm acima do topo do gabinete e tem as pontas arredondadas em planta; aqui o puxador
 *    fecha em y 865, abaixo do topo, em duas arestas retas.
 *  - a dobradiça real é uma cunha que passa de 15 mm acima do topo; aqui é uma cunha de 5 mm, de y 865 a 870, porque a altura total
 *    de 870 mm está fechada.
 *  - o recuo da traseira e as saídas de ar do fundo não aparecem nas imagens e não são modelados.
 *  - o pé da foto tem borracha preta; os pés aqui são cinza claro, com chanfro de 3 mm no topo.
 *  - a linha de junção entre a porta e o gabinete e o vinco abaixo do friso não são modelados.
 *
 * Texto: nada. A imagem não mostra texto.
 */

export const TABELA = {
  largura_total: 475,
  altura_total: 870,
  profundidade_total: 515,

  pe_altura: 15,
  pe_diametro: 36,
  pe_chanfro: 2,
  pe_folga_borda: 15,
  pe_lados: 24,

  caixa_raio: 7,
  caixa_paineis: 4,
  porta_espessura: 20,

  porta_margem: 5,
  porta_raio: 7,
  porta_paineis: 4,

  puxador_fracao: 0.826,
  puxador_altura: 30,
  puxador_canal_largura: 14,
  puxador_canal_fundo: 5,
  puxador_canal_segmentos: 8,
  puxador_raio_frente: 4,
  puxador_raio_segmentos: 4,

  dobradica_largura: 36,
  dobradica_altura: 5,
  dobradica_profundidade: 14,
  dobradica_folga_do_puxador: 2.5,
  dobradica_chanfro: 4,
};

const m = (mm) => mm / 1000;

/* Geometria em milímetro: quem faz o quê e onde. */
export function derivar(T) {
  const meiaX = T.largura_total / 2;
  const zFrenteTotal = T.profundidade_total / 2;
  const zPortaFrente = zFrenteTotal;
  const zPortaTras = zPortaFrente - T.porta_espessura;
  const caixaY0 = T.pe_altura;
  const caixaY1 = T.altura_total;
  const caixaZ0 = -zFrenteTotal;
  const caixaZ1 = zPortaTras;

  const portaY0 = caixaY0 + T.porta_margem;
  const portaY1 = caixaY1 - T.porta_margem;
  const portaMeiaX = meiaX - T.porta_margem;

  /* puxador: a faixa sobe do y de baixo até o topo da porta, com a frente rente à da porta */
  const puxMeiaX = (T.puxador_fracao * 2 * portaMeiaX) / 2;
  const puxY1 = portaY1;
  const puxY0 = puxY1 - T.puxador_altura;
  const puxYc = (puxY0 + puxY1) / 2;
  const puxZc = (zPortaTras + zPortaFrente) / 2;

  /* contorno lateral, em (y relativo à base, z relativo à frente da porta), sentido anti-horário em (y, z): atrás de baixo para
     cima, o topo para a frente com a canaleta côncava, o canto da frente arredondado, a frente lisa para baixo e a base de volta */
  const cima = T.puxador_altura;
  const rf = T.puxador_raio_frente;
  const meiaCanal = T.puxador_canal_largura / 2;
  const fundoCanal = T.puxador_canal_fundo;
  const raioCanal = (meiaCanal * meiaCanal + fundoCanal * fundoCanal) / (2 * fundoCanal);
  const zCanalC = -rf - meiaCanal;
  const yCanalC = cima - fundoCanal + raioCanal;
  const canal = [];
  for (let k = 0; k <= T.puxador_canal_segmentos; k += 1) {
    const z = zCanalC - meiaCanal + (2 * meiaCanal * k) / T.puxador_canal_segmentos;
    canal.push([yCanalC - Math.sqrt(raioCanal * raioCanal - (z - zCanalC) ** 2), z]);
  }
  const quina = [];
  for (let k = 1; k <= T.puxador_raio_segmentos; k += 1) {
    const a = (Math.PI / 2) * (k / T.puxador_raio_segmentos);
    quina.push([cima - rf + rf * Math.cos(a), -rf + rf * Math.sin(a)]);
  }
  const contornoRel = [
    [0, -T.porta_espessura],
    [cima, -T.porta_espessura],
    ...canal,
    ...quina,
    [0, 0],
  ];
  const puxadorPerfil = contornoRel.map(([y, z]) => [y - T.puxador_altura / 2, z + T.porta_espessura / 2]);

  /* recorte da porta: o retângulo do puxador, de cima a baixo na espessura da porta, aberto 2 mm para a frente e 1 mm para cima */
  const recorte = { x: puxMeiaX, y0: puxY0, y1: puxY1 + 1, z0: zPortaTras - 1, z1: zPortaFrente + 2 };

  /* dobradiça: cunha no canto de cima direito, assentada no topo da porta, ao lado do fim do puxador */
  const dobX0 = puxMeiaX + T.dobradica_folga_do_puxador;
  const dobX1 = dobX0 + T.dobradica_largura;
  const dobZ0 = zPortaFrente - T.dobradica_profundidade;
  const dobPerfilRel = [
    [0, 0],
    [T.dobradica_altura, 0],
    [T.dobradica_altura, T.dobradica_profundidade - T.dobradica_chanfro],
    [T.dobradica_altura - 1.5, T.dobradica_profundidade],
    [0, T.dobradica_profundidade],
  ].map(([y, z]) => [y - T.dobradica_altura / 2, z - T.dobradica_profundidade / 2]);
  /* o sentido (y, z) acima é horário no desenho de cima para trás; troca a ordem para ficar anti-horário */
  const dobPerfil = [...dobPerfilRel].reverse();

  const recuo = T.pe_folga_borda + T.pe_diametro / 2;
  const peX = meiaX - recuo;
  const peZf = caixaZ1 - recuo;
  const peZt = caixaZ0 + recuo;
  const pes = [
    { nome: 'peFrenteEsq', x: -peX, z: peZf },
    { nome: 'peFrenteDir', x: peX, z: peZf },
    { nome: 'peTrasEsq', x: -peX, z: peZt },
    { nome: 'peTrasDir', x: peX, z: peZt },
  ];

  return {
    meiaX, zFrenteTotal, zPortaFrente, zPortaTras, caixaY0, caixaY1, caixaZ0, caixaZ1,
    portaY0, portaY1, portaMeiaX,
    puxMeiaX, puxY0, puxY1, puxYc, puxZc, puxadorPerfil, recorte,
    dobX0, dobX1, dobZ0, dobYc: portaY1 + T.dobradica_altura / 2, dobZc: zPortaFrente - T.dobradica_profundidade / 2, dobPerfil,
    pes,
  };
}

const NORMAL_CIMA = [0, 1, 0];
const NORMAL_FRENTE = [0, 0, 1];
const NORMAL_TRAS = [0, 0, -1];

const ID = {
  caixa: 1, porta: 2, puxador: 3, dobradica: 4, pe: 10,
  arredondaCaixa: 100, arredondaPorta: 200, recorte: 1000, subtracaoPorta: 2001,
};

export const ALIASES = [
  ['caixaArredondada', { unir: [
    { origem: { op: 'cubo', id: ID.caixa } },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ origem: { op: 'arredondarAresta', id: ID.arredondaCaixa + k } })),
  ] }],
  ['portaArredondada', { unir: [
    { origem: { op: 'cubo', id: ID.porta } },
    ...[0, 1].map((k) => ({ origem: { op: 'arredondarAresta', id: ID.arredondaPorta + k } })),
  ] }],
];

/** Os PASSOS: uma forma por parte, em metro, com a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  const D = derivar(T);
  const passos = [];
  const parte = (nome, sel, material) => {
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { sel, usa: material }]);
  };

  /* caixa: cubo do topo dos pés ao y 870, com as quatro arestas verticais e as quatro de cima arredondadas */
  passos.push(['cubo', {
    origemId: ID.caixa, larg: m(T.largura_total), alt: m(D.caixaY1 - D.caixaY0), prof: m(D.caixaZ1 - D.caixaZ0),
    em: [0, m(D.caixaY0), m((D.caixaZ0 + D.caixaZ1) / 2)],
  }]);
  [
    [NORMAL_FRENTE, 'x', 'max'], [NORMAL_FRENTE, 'x', 'min'], [NORMAL_TRAS, 'x', 'max'], [NORMAL_TRAS, 'x', 'min'],
    [NORMAL_CIMA, 'x', 'max'], [NORMAL_CIMA, 'x', 'min'], [NORMAL_CIMA, 'z', 'max'], [NORMAL_CIMA, 'z', 'min'],
  ].forEach(([dir, eixo, lado], k) => {
    passos.push(['arredondarAresta', {
      origemId: ID.arredondaCaixa + k, raio: m(T.caixa_raio), paineis: T.caixa_paineis,
      sel: { origem: { op: 'cubo', id: ID.caixa }, onde: { alvo: 'aresta', normal: { dir, ate: 5 }, extremo: { eixo, lado } } },
    }]);
  });
  parte('caixa', { alias: 'caixaArredondada' }, 'branco');
  passos.push(['liso', { angulo: 30, sel: { alias: 'caixaArredondada' } }]);

  /* porta: placa de cantos arredondados, menos o recorte onde o puxador assenta */
  passos.push(['cubo', {
    origemId: ID.porta, larg: m(2 * D.portaMeiaX), alt: m(D.portaY1 - D.portaY0), prof: m(T.porta_espessura),
    em: [0, m(D.portaY0), m((D.zPortaTras + D.zPortaFrente) / 2)],
  }]);
  [
    [NORMAL_FRENTE, 'x', 'max'], [NORMAL_FRENTE, 'x', 'min'],
  ].forEach(([dir, eixo, lado], k) => {
    passos.push(['arredondarAresta', {
      origemId: ID.arredondaPorta + k, raio: m(T.porta_raio), paineis: T.porta_paineis,
      sel: { origem: { op: 'cubo', id: ID.porta }, onde: { alvo: 'aresta', normal: { dir, ate: 5 }, extremo: { eixo, lado } } },
    }]);
  });
  const r = D.recorte;
  passos.push(['cubo', {
    origemId: ID.recorte, larg: m(2 * r.x), alt: m(r.y1 - r.y0), prof: m(r.z1 - r.z0),
    em: [0, m(r.y0), m((r.z0 + r.z1) / 2)],
  }]);
  passos.push(['subtrair', { origemId: ID.subtracaoPorta, solidos: [{ alias: 'portaArredondada' }, { origem: { op: 'cubo', id: ID.recorte } }] }]);
  parte('porta', { origem: { op: 'subtrair', id: ID.subtracaoPorta } }, 'branco');
  passos.push(['liso', { angulo: 30, sel: { origem: { op: 'subtrair', id: ID.subtracaoPorta } } }]);

  /* puxador: UMA extrusão ao longo de x do contorno lateral (u = y, v = z), de x -puxMeiaX a +puxMeiaX */
  passos.push(['extrusao', {
    origemId: ID.puxador, eixo: 'x', altura: m(2 * D.puxMeiaX),
    perfil: D.puxadorPerfil.map(([u, v]) => [m(u), m(v)]),
    em: [m(-D.puxMeiaX), m(D.puxYc), m(D.puxZc)],
  }]);
  parte('puxadorDoTopo', { origem: { op: 'extrusao', id: ID.puxador } }, 'brancoCinza');

  /* dobradiça: cunha pequena no canto de cima direito da porta */
  passos.push(['extrusao', {
    origemId: ID.dobradica, eixo: 'x', altura: m(D.dobX1 - D.dobX0),
    perfil: D.dobPerfil.map(([u, v]) => [m(u), m(v)]),
    em: [m(D.dobX0), m(D.dobYc), m(D.dobZc)],
  }]);
  parte('dobradicaSuperior', { origem: { op: 'extrusao', id: ID.dobradica } }, 'branco');

  /* pés: tronco de cone de revolução em y, com o chanfro no topo; o topo encosta na face de baixo da caixa */
  const pr = T.pe_diametro / 2;
  D.pes.forEach((pe, k) => {
    passos.push(['lathe', {
      origemId: ID.pe + k, lados: T.pe_lados,
      perfil: [[0, 0], [m(pr), 0], [m(pr), m(T.pe_altura - T.pe_chanfro)], [m(pr - T.pe_chanfro), m(T.pe_altura)], [0, m(T.pe_altura)]],
      em: [m(pe.x), 0, m(pe.z)],
    }]);
    parte(pe.nome, { origem: { op: 'lathe', id: ID.pe + k } }, 'cinzaClaro');
  });

  return passos;
}

/* Contatos, declarados antes de medir. A porta assenta na face da frente da caixa, em z 237,5, e o puxador ocupa o recorte da porta. */
export const CONTATOS = [
  { par: ['caixa', 'porta'], motivo: 'a face de trás da porta encosta na face da frente da caixa, em z 237,5, sem atravessá-la' },
  { par: ['caixa', 'puxadorDoTopo'], motivo: 'a face de trás do puxador encosta na face da frente da caixa, em z 237,5, na faixa de cima' },
  { par: ['porta', 'puxadorDoTopo'], motivo: 'o puxador ocupa o recorte do topo da porta e encosta nas paredes e no fundo dele, sem folga' },
  { par: ['porta', 'dobradicaSuperior'], motivo: 'a base da dobradiça assenta na face de cima da porta, em y 865, no canto direito' },
  ...['peFrenteEsq', 'peFrenteDir', 'peTrasEsq', 'peTrasDir'].map((p) => (
    { par: ['caixa', p], motivo: 'o topo do pé encosta na face de baixo da caixa, em y 15' }
  )),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const D = derivar(T);
  const tol = 0.5;
  const pFD = D.pes[1];
  const pTE = D.pes[2];
  const rp = T.pe_diametro / 2;
  return [
    { nome: 'canto de trás, embaixo, da caixa', parte: 'caixa', medida: 'minimo', em: [-D.meiaX, D.caixaY0, D.caixaZ0], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da caixa', parte: 'caixa', medida: 'maximo', em: [D.meiaX, D.caixaY1, D.caixaZ1], toleranciaMm: tol },
    { nome: 'canto de baixo, atrás, da porta', parte: 'porta', medida: 'minimo', em: [-D.portaMeiaX, D.portaY0, D.zPortaTras], toleranciaMm: tol },
    { nome: 'canto de cima da frente da porta', parte: 'porta', medida: 'maximo', em: [D.portaMeiaX, D.portaY1, D.zPortaFrente], toleranciaMm: tol },
    { nome: 'ponta direita de cima do puxador', parte: 'puxadorDoTopo', medida: 'maximo', em: [D.puxMeiaX, D.puxY1, D.zPortaFrente], toleranciaMm: tol },
    { nome: 'ponta esquerda de baixo do puxador, atrás', parte: 'puxadorDoTopo', medida: 'minimo', em: [-D.puxMeiaX, D.puxY0, D.zPortaTras], toleranciaMm: tol },
    { nome: 'canto de cima da dobradiça', parte: 'dobradicaSuperior', medida: 'maximo', em: [D.dobX1, D.portaY1 + T.dobradica_altura, D.zPortaFrente], toleranciaMm: tol },
    { nome: 'pé da frente à direita, embaixo', parte: 'peFrenteDir', medida: 'minimo', em: [pFD.x - rp, 0, pFD.z - rp], toleranciaMm: tol },
    { nome: 'pé de trás à esquerda, embaixo', parte: 'peTrasEsq', medida: 'minimo', em: [pTE.x - rp, 0, pTE.z - rp], toleranciaMm: tol },
  ];
}

export const PASSOS = gerarPassos(TABELA);

const receita = {
  meta: { nome: 'geladeira-compacta-branca', desc: 'frigobar alto branco de uma porta, com caixa, porta, puxador de topo com canaleta na face de cima, dobradiça superior e quatro pés' },
  PARAMS: TABELA,
  MATERIAIS: {
    branco: { tipo: 'liso', cor: '#f3f3ee', desgaste: 0.01, brilho: 0.7 },
    brancoCinza: { tipo: 'liso', cor: '#ebebe6', desgaste: 0.015, brilho: 0.7 },
    cinzaClaro: { tipo: 'liso', cor: '#c8c8c4', desgaste: 0.02 },
  },
  TOPO: { origem: 'chão, no meio do aparelho em x e em z; y para cima e a frente do aparelho em +z' },
  PLANO: {
    objeto: 'geladeira compacta branca (frigobar alto) de uma porta, 475 por 870 (com os pés) por 515 mm, com puxador de topo com canaleta na face de cima, dobradiça superior e quatro pés',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do aparelho com os pés', milimetros: 870 },
    familia: 'movel-de-caixa',
    partes: [
      { nome: 'caixa', forma: 'bloco de 475 por 855 por 495 mm, de y 15 a 870 e de z -257,5 a 237,5, com as quatro arestas verticais e as quatro de cima arredondadas em 7 mm', tecnica: 'cubo com arredondarAresta escolhida por sel.onde' },
      { nome: 'porta', forma: 'placa de 465 por 845 por 20 mm, de y 20 a 865, com a frente em z 257,5, arestas verticais da frente arredondadas em 7 mm e um recorte de 384 por 30 mm no topo para o puxador', tecnica: 'cubo com arredondarAresta, menos um cubo de recorte por subtrair' },
      { nome: 'puxadorDoTopo', forma: 'faixa de 384 mm (0,81 da porta) e 30 mm de altura, de y 835 a 865, com a frente lisa, canto da frente arredondado em 4 mm e uma canaleta côncava de 14 mm de largura e 5 mm de fundo na face de cima', tecnica: 'uma extrusão ao longo de x de um polígono de perfil lateral com a canaleta em arco facetado' },
      { nome: 'dobradicaSuperior', forma: 'cunha de 36 por 5 por 14 mm, de y 865 a 870, no canto de cima direito da porta, ao lado do fim do puxador', tecnica: 'extrusão ao longo de x de um perfil de cunha' },
      { nome: 'peFrenteEsq', forma: 'cilindro de 36 mm de diâmetro e 15 mm de altura com chanfro de 2 mm no topo, a 15 mm da borda do pé às laterais da caixa, na frente à esquerda', tecnica: 'lathe de perfil com chanfro no topo' },
      { nome: 'peFrenteDir', forma: 'cilindro de 36 mm de diâmetro e 15 mm de altura com chanfro de 2 mm no topo, a 15 mm da borda do pé às laterais da caixa, na frente à direita', tecnica: 'lathe de perfil com chanfro no topo' },
      { nome: 'peTrasEsq', forma: 'cilindro de 36 mm de diâmetro e 15 mm de altura com chanfro de 2 mm no topo, a 15 mm da borda do pé às laterais da caixa, atrás à esquerda', tecnica: 'lathe de perfil com chanfro no topo' },
      { nome: 'peTrasDir', forma: 'cilindro de 36 mm de diâmetro e 15 mm de altura com chanfro de 2 mm no topo, a 15 mm da borda do pé às laterais da caixa, atrás à direita', tecnica: 'lathe de perfil com chanfro no topo' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 475 por 870 por 515 mm, ou algum vértice fica abaixo do chão',
      'a caixa, a porta ou os pés não são simétricos em x',
      'a caixa não assenta sobre os quatro pés, ou a porta não encosta na face da frente da caixa sem atravessá-la',
      'o puxador não é uma faixa de perfil lateral com a canaleta côncava na face de cima, no topo da porta, rente à frente da porta',
      'a dobradiça não fica no canto de cima direito, assentada no topo da porta',
      'a malha das arestas arredondadas se abre ou tem face de área nula',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  PASSOS,
};

export default receita;
