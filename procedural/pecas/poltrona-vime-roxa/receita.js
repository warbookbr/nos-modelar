/* poltrona-vime-roxa — poltrona de vime com base baixa, braços, encosto alto de vime e duas almofadas de tecido: a do assento
 * e a do encosto, esta girada 12 graus para trás em torno de um eixo x.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente da poltrona em +z; o encosto fica em -z e x cresce para a
 * direita de quem olha a poltrona de frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela
 * em caixas, e `gerarPassos` escreve, por parte, uma `chamferBox`, o giro quando a caixa tem um, a `parte` com o nome e o
 * material que a parte usa.
 *
 * Forma e medidas: receita externa de poltrona de vime, convertida pelo esboço do Mecanifica e refeita em passos. Esta
 * reescrita mantém a forma da base, com diferença de 0,00 mm nas medidas de cada caixa e na caixa total (x ±480, y 0 a 726,7,
 * z -430 a 350). Mudanças em relação à base: os nomes das partes passam para camelCase sem underscore (pes -> pesFrenteEsq e
 * assim por diante, braco_esq -> bracoEsq), a caixa da almofada do encosto passa a ter o pivô e o giro na TABELA, e cada parte
 * recebe o material declarado em MATERIAIS.
 */

export const TABELA = {
  pes_lado: 70,
  pes_altura: 90,
  pes_chanfro: 5,
  pes_x_externo: 480,
  pes_z_frente: 280,
  pes_z_tras: -360,

  base_meia_x: 480,
  base_altura: 270,
  base_z_frente: 350,
  base_z_tras: -430,
  base_chanfro: 20,

  braco_largura: 130,
  braco_y0: 300,
  braco_altura: 270,
  braco_chanfro: 26,

  encosto_meia_x: 350,
  encosto_y0: 320,
  encosto_altura: 350,
  encosto_z_frente: -280,
  encosto_z_tras: -430,
  encosto_chanfro: 25,

  almofada_assento_meia_x: 350,
  almofada_assento_y0: 320,
  almofada_assento_altura: 140,
  almofada_assento_z_frente: 350,
  almofada_assento_z_tras: -280,
  almofada_assento_chanfro: 20,

  almofada_encosto_largura: 680,
  almofada_encosto_altura: 300,
  almofada_encosto_profundidade: 160,
  almofada_encosto_centro_y: 570,
  almofada_encosto_centro_z: -175,
  almofada_encosto_chanfro: 32,
  almofada_encosto_graus: -12,
};

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, chanfro, material, giro? }. */
export function derivar(T) {
  const caixas = [];
  const lados = [['Esq', -1], ['Dir', +1]];
  /* Uma faixa em x, espelhada: o lado negativo vai de -externo a -interno, o positivo de interno a externo. */
  const faixaX = (lado, externo, interno) => (lado < 0 ? { x0: -externo, x1: -interno } : { x0: interno, x1: externo });

  /* pés: 70 mm de lado, do chão à face de baixo da base; a ordem é a da frente à trás e da esquerda à direita. */
  const pesX = T.pes_x_externo - T.pes_lado;
  for (const [zNome, z0, z1] of [
    ['Frente', T.pes_z_frente - T.pes_lado, T.pes_z_frente],
    ['Tras', T.pes_z_tras, T.pes_z_tras + T.pes_lado],
  ]) {
    for (const [ladoNome, lado] of lados) {
      caixas.push({
        nome: `pes${zNome}${ladoNome}`, ...faixaX(lado, T.pes_x_externo, pesX),
        y0: 0, y1: T.pes_altura, z0, z1, chanfro: T.pes_chanfro, material: 'pesDeMadeira',
      });
    }
  }

  /* base de vime: começa no topo dos pés e ocupa a largura e a profundidade da poltrona. */
  caixas.push({
    nome: 'baseVime', x0: -T.base_meia_x, x1: T.base_meia_x,
    y0: T.pes_altura, y1: T.pes_altura + T.base_altura, z0: T.base_z_tras, z1: T.base_z_frente,
    chanfro: T.base_chanfro, material: 'vime',
  });

  /* braços: 130 mm nas faces externas da base, com o mesmo fundo e a mesma frente da base. */
  for (const [ladoNome, lado] of lados) {
    caixas.push({
      nome: `braco${ladoNome}`, ...faixaX(lado, T.base_meia_x, T.base_meia_x - T.braco_largura),
      y0: T.braco_y0, y1: T.braco_y0 + T.braco_altura, z0: T.base_z_tras, z1: T.base_z_frente,
      chanfro: T.braco_chanfro, material: 'vime',
    });
  }

  /* encosto de vime: entre os braços, na face de trás da base até a face da frente do encosto. */
  caixas.push({
    nome: 'encostoVime', x0: -T.encosto_meia_x, x1: T.encosto_meia_x,
    y0: T.encosto_y0, y1: T.encosto_y0 + T.encosto_altura, z0: T.encosto_z_tras, z1: T.encosto_z_frente,
    chanfro: T.encosto_chanfro, material: 'vime',
  });

  /* almofada do assento: entre os braços, com a frente rente à da base. */
  caixas.push({
    nome: 'almofadaAssento', x0: -T.almofada_assento_meia_x, x1: T.almofada_assento_meia_x,
    y0: T.almofada_assento_y0, y1: T.almofada_assento_y0 + T.almofada_assento_altura,
    z0: T.almofada_assento_z_tras, z1: T.almofada_assento_z_frente,
    chanfro: T.almofada_assento_chanfro, material: 'tecido',
  });

  /* almofada do encosto: caixa de 680 por 300 por 160 mm, centrada em (0, centro_y, centro_z) antes do giro; o giro de
   * almofada_encosto_graus em x gira a caixa em torno desse mesmo centro, que é o pivô. */
  const cy = T.almofada_encosto_centro_y;
  const cz = T.almofada_encosto_centro_z;
  const meiaL = T.almofada_encosto_largura / 2;
  const meiaA = T.almofada_encosto_altura / 2;
  const meiaP = T.almofada_encosto_profundidade / 2;
  caixas.push({
    nome: 'almofadaEncosto', x0: -meiaL, x1: meiaL, y0: cy - meiaA, y1: cy + meiaA, z0: cz - meiaP, z1: cz + meiaP,
    chanfro: T.almofada_encosto_chanfro, material: 'tecido',
    giro: { eixo: 'x', graus: T.almofada_encosto_graus, pivo: [0, cy, cz] },
  });

  return caixas;
}

const m = (mm) => mm / 1000;

/** Os PASSOS: por parte, uma `chamferBox` em metro, o `rotaciona` quando a caixa gira, a `parte` com o nome e o `material`. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const id = i + 1;
    passos.push(['chamferBox', {
      origemId: id,
      larg: m(c.x1 - c.x0),
      alt: m(c.y1 - c.y0),
      prof: m(c.z1 - c.z0),
      chanfro: m(c.chanfro),
      em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
    }]);
    if (c.giro) {
      passos.push(['rotaciona', {
        eixo: c.giro.eixo,
        graus: c.giro.graus,
        pivo: [m(c.giro.pivo[0]), m(c.giro.pivo[1]), m(c.giro.pivo[2])],
        sel: { origem: { op: 'chamferBox', id } },
      }]);
    }
    passos.push(['parte', { nome: c.nome, sel: { origem: { op: 'chamferBox', id } } }]);
    passos.push(['material', { sel: { origem: { op: 'chamferBox', id } }, usa: c.material }]);
  });
  return passos;
}

/* Os contatos por face da poltrona: cada par se toca ou se embute no volume declarado, e o motivo diz qual dos dois. */
const PES = ['pesFrenteEsq', 'pesFrenteDir', 'pesTrasEsq', 'pesTrasDir'];
const BRACOS = ['bracoEsq', 'bracoDir'];
export const CONTATOS = [
  ...PES.map((p) => ({ par: [p, 'baseVime'], motivo: 'o topo do pé encosta na face de baixo da base, que começa a 90 mm do chão' })),
  ...BRACOS.map((b) => ({ par: [b, 'baseVime'], motivo: 'o braço desce 60 mm sobre a base de vime, com as faces externas rentes à da base' })),
  { par: ['encostoVime', 'baseVime'], motivo: 'o encosto nasce 40 mm dentro da base de vime, e as faces traseiras ficam rentes' },
  { par: ['almofadaAssento', 'baseVime'], motivo: 'a almofada do assento assenta sobre a base, com 40 mm embutidos e a frente rente à da base' },
  ...BRACOS.map((b) => ({ par: [b, 'encostoVime'], motivo: 'o encosto para na face interna de cada braço e não o atravessa' })),
  ...BRACOS.map((b) => ({ par: [b, 'almofadaAssento'], motivo: 'a almofada do assento para na face interna de cada braço' })),
  { par: ['encostoVime', 'almofadaAssento'], motivo: 'a almofada do assento encosta na face de trás do encosto de vime' },
  { par: ['almofadaAssento', 'almofadaEncosto'], motivo: 'a almofada do encosto fica atrás do assento e embute o canto de baixo na almofada do assento' },
];

const receita = {
  meta: { nome: 'poltrona-vime-roxa', desc: 'poltrona de vime com base baixa, braços, encosto alto e almofadas de tecido' },
  PARAMS: TABELA,
  MATERIAIS: {
    vime: { cor: '#9e744e', metalicidade: 0, aspereza: 0.8 },
    pesDeMadeira: { cor: '#443020', metalicidade: 0, aspereza: 0.85 },
    tecido: { cor: '#aa7d91', metalicidade: 0, aspereza: 0.7 },
  },
  TOPO: { origem: 'chão, no meio da poltrona em x e em z; y para cima e a frente da poltrona em +z' },
  PLANO: {
    objeto: 'poltrona de vime de 960 mm de largura, 780 mm de profundidade e 727 mm de altura total, com assento a 360 mm do chão e encosto alto',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'largura total da poltrona', milimetros: 960 },
    familia: 'assento',
    partes: [
      { nome: 'pesFrenteEsq', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'pesFrenteDir', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'pesTrasEsq', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'pesTrasDir', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'baseVime', forma: 'bloco de 960 por 270 por 780 mm, chanfro de 20 mm, sobre os pés', tecnica: 'chamferBox com o topo dos pés na face de baixo' },
      { nome: 'bracoEsq', forma: 'bloco de 130 por 270 por 780 mm na face externa esquerda da base, com chanfro de 26 mm', tecnica: 'chamferBox rente às faces externas e às faces de frente e de trás da base' },
      { nome: 'bracoDir', forma: 'bloco de 130 por 270 por 780 mm na face externa direita da base, com chanfro de 26 mm', tecnica: 'chamferBox rente às faces externas e às faces de frente e de trás da base' },
      { nome: 'encostoVime', forma: 'painel de 700 por 350 por 150 mm entre os braços, com chanfro de 25 mm', tecnica: 'chamferBox entre as faces internas dos braços, da base até o topo em y 670' },
      { nome: 'almofadaAssento', forma: 'almofada de 700 por 140 por 630 mm entre os braços, com chanfro de 20 mm', tecnica: 'chamferBox apoiada na base, com 40 mm embutidos, entre os braços' },
      { nome: 'almofadaEncosto', forma: 'almofada de 680 por 300 por 160 mm, girada 12 graus para trás em torno de um eixo x, com chanfro de 32 mm', tecnica: 'chamferBox centrada em (0, 570, -175) antes do giro, com rotaciona em x e pivô no centro' },
    ],
    criteriosDeReprovacao: [
      'algum pé não toca o chão ou não chega na face de baixo da base',
      'o encosto não fica atrás do assento, em -z, ou não sobe da base até a altura de 670 mm',
      'um lado da poltrona difere do outro em medida ou posição de peça',
      'a almofada do encosto não é girada para trás em torno de x, ou atravessa o encosto de vime',
      'algum braço não fica rente às faces externas da base',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
