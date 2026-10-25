/* poltrona-vime-azul — poltrona de vime sobre quatro pés, com base de vime, dois braços, encosto de vime, almofada de assento e
 * almofada de encosto girada para trás.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente da poltrona em +z; o encosto fica em -z e x cresce para a direita
 * de quem olha a poltrona de frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela em caixas e
 * `gerarPassos` as escreve como uma `chamferBox` por parte, com o giro da almofada do encosto logo depois da caixa dela.
 *
 * Origem: a forma da base de ajustes `cadeira_fibra_azul` (conversão mecânica da receita externa, com os ajustes D1 a D3 e o topo do
 * pé já aprovados no relatório de ajustes), refeita em TABELA. Mudanças em relação à base, todas listadas aqui:
 *  1. Simetria exata em x. As peças simétricas da base estavam centradas em x = -5 mm; o centro delas foi levado para x = 0, o que
 *     desloca cada uma 5 mm em x. A almofada do encosto já estava centrada em x = 0 e fica onde estava.
 *  2. Nomes em camelCase: pes, pes_x, pes_y e pes_xy viraram peFrenteEsq, peFrenteDir, peTrasEsq e peTrasDir; base_vime, braco_esq,
 *     braco_dir, encosto_vime, almofada_assento e almofada_encosto viraram baseVime, bracoEsq, bracoDir, encostoVime, almofadaAssento
 *     e almofadaEncosto.
 *  3. Materiais: vime para a base, os braços e o encosto; vime escuro para os pés; tecido para as duas almofadas. As cores são as da base.
 *  4. Giro: a almofada do encosto é `chamferBox` seguida de `rotaciona` no eixo x, -12 graus, com o pivô no centro da caixa. O ângulo e
 *     o pivô estão na TABELA.
 *
 * Encaixes: os pés topam na face de baixo da base (y 90); a base, os braços e o encosto têm a face de trás em z -440; o assento
 * encosta no encosto em z -280 e nos braços em x ±345; a almofada do encosto fica atrás do assento e à frente do encosto de vime (a
 * caixa girada chega a z -277 no ponto mais de trás). A base de vime, os braços e o encosto se atravessam de propósito, e a base do
 * encosto embute na almofada do assento, como na forma de origem. Esses pares estão em CONTATOS, com motivo.
 *
 * Caixa total, medida na bancada: x ±485, y 0 a cerca de 758 com os chanfros, z -440 a 340.
 */

export const TABELA = {
  pe_lado: 70,
  pe_altura: 90,
  pe_x_externo: 440,
  pe_z_frente: 340,
  pe_z_tras: -440,
  pe_chanfro: 5,

  base_altura: 270,
  base_meia_x: 440,
  base_z_frente: 340,
  base_z_tras: -440,
  base_chanfro: 20,

  braco_y0: 300,
  braco_altura: 280,
  braco_x_interno: 345,
  braco_x_externo: 485,
  braco_chanfro: 28,

  encosto_y0: 320,
  encosto_altura: 380,
  encosto_meia_x: 440,
  encosto_z_frente: -280,
  encosto_z_tras: -440,
  encosto_chanfro: 25,

  assento_y0: 320,
  assento_altura: 140,
  assento_meia_x: 345,
  assento_z_frente: 320,
  assento_z_tras: -280,
  assento_chanfro: 20,

  almofada_encosto_y0: 400,
  almofada_encosto_altura: 350,
  almofada_encosto_meia_x: 340,
  almofada_encosto_prof: 180,
  almofada_encosto_z_centro: -160,
  almofada_encosto_chanfro: 35,
  almofada_encosto_graus: -12,
  almofada_encosto_pivo: [0, 575, -160],
};

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, chanfro, material, giro? }. */
export function derivar(T) {
  const caixas = [];

  /* pés: quadrados de pe_lado em x e em z, com a face de fora em x ±pe_x_externo; y 0 até pe_altura */
  const peX1 = T.pe_x_externo;
  const peX0 = peX1 - T.pe_lado;
  const peZ1Frente = T.pe_z_frente;
  const peZ0Frente = peZ1Frente - T.pe_lado;
  const peZ0Tras = T.pe_z_tras;
  const peZ1Tras = peZ0Tras + T.pe_lado;
  const pes = [
    ['peFrenteEsq', -1, peZ0Frente, peZ1Frente],
    ['peFrenteDir', +1, peZ0Frente, peZ1Frente],
    ['peTrasEsq', -1, peZ0Tras, peZ1Tras],
    ['peTrasDir', +1, peZ0Tras, peZ1Tras],
  ];
  for (const [nome, lado, z0, z1] of pes) {
    const x = lado < 0 ? { x0: -peX1, x1: -peX0 } : { x0: peX0, x1: peX1 };
    caixas.push({ nome, ...x, y0: 0, y1: T.pe_altura, z0, z1, chanfro: T.pe_chanfro, material: 'vimeEscuro' });
  }

  /* base de vime: assenta no topo dos pés, em y pe_altura, e ocupa a profundidade inteira da poltrona */
  const baseY0 = T.pe_altura;
  caixas.push({
    nome: 'baseVime',
    x0: -T.base_meia_x, x1: T.base_meia_x,
    y0: baseY0, y1: baseY0 + T.base_altura,
    z0: T.base_z_tras, z1: T.base_z_frente,
    chanfro: T.base_chanfro,
    material: 'vime',
  });

  /* braços: por fora da base, entre x ±braco_x_interno e ±braco_x_externo, com a mesma profundidade da base */
  for (const [nome, lado] of [['bracoEsq', -1], ['bracoDir', +1]]) {
    const x = lado < 0
      ? { x0: -T.braco_x_externo, x1: -T.braco_x_interno }
      : { x0: T.braco_x_interno, x1: T.braco_x_externo };
    caixas.push({
      nome, ...x,
      y0: T.braco_y0, y1: T.braco_y0 + T.braco_altura,
      z0: T.base_z_tras, z1: T.base_z_frente,
      chanfro: T.braco_chanfro,
      material: 'vime',
    });
  }

  /* encosto de vime: a face da frente fica em z encosto_z_frente, e as costas em encosto_z_tras */
  caixas.push({
    nome: 'encostoVime',
    x0: -T.encosto_meia_x, x1: T.encosto_meia_x,
    y0: T.encosto_y0, y1: T.encosto_y0 + T.encosto_altura,
    z0: T.encosto_z_tras, z1: T.encosto_z_frente,
    chanfro: T.encosto_chanfro,
    material: 'vime',
  });

  /* almofada do assento: entre os braços, com a face de trás em assento_z_tras, encostada no encosto */
  caixas.push({
    nome: 'almofadaAssento',
    x0: -T.assento_meia_x, x1: T.assento_meia_x,
    y0: T.assento_y0, y1: T.assento_y0 + T.assento_altura,
    z0: T.assento_z_tras, z1: T.assento_z_frente,
    chanfro: T.assento_chanfro,
    material: 'tecido',
  });

  /* almofada do encosto: caixa centrada em z almofada_encosto_z_centro; o giro é aplicado depois, em gerarPassos */
  const meiaProf = T.almofada_encosto_prof / 2;
  caixas.push({
    nome: 'almofadaEncosto',
    x0: -T.almofada_encosto_meia_x, x1: T.almofada_encosto_meia_x,
    y0: T.almofada_encosto_y0, y1: T.almofada_encosto_y0 + T.almofada_encosto_altura,
    z0: T.almofada_encosto_z_centro - meiaProf, z1: T.almofada_encosto_z_centro + meiaProf,
    chanfro: T.almofada_encosto_chanfro,
    material: 'tecido',
    giro: { graus: T.almofada_encosto_graus, pivo: T.almofada_encosto_pivo },
  });

  return caixas;
}

const m = (mm) => mm / 1000;

/** Os PASSOS: uma `chamferBox` por parte, em metro, com o giro e o nome logo depois. `em` é o centro em x e z e a base em y. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const id = i + 1;
    const sel = () => ({ origem: { op: 'chamferBox', id } });
    passos.push(['chamferBox', {
      origemId: id,
      larg: m(c.x1 - c.x0),
      alt: m(c.y1 - c.y0),
      prof: m(c.z1 - c.z0),
      chanfro: m(c.chanfro),
      em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
    }]);
    if (c.giro) {
      passos.push(['rotaciona', { eixo: 'x', graus: c.giro.graus, pivo: c.giro.pivo.map((v) => m(v)), sel: sel() }]);
    }
    passos.push(['parte', { nome: c.nome, sel: sel() }]);
    passos.push(['material', { usa: c.material, sel: sel() }]);
  });
  return passos;
}

/* Os contatos da poltrona: cada par declarado é um toque por face ou um embutido da forma de origem, e nenhum par se toca sem estar aqui. */
const PES = ['peFrenteEsq', 'peFrenteDir', 'peTrasEsq', 'peTrasDir'];
const BRACOS = ['bracoEsq', 'bracoDir'];
export const CONTATOS = [
  ...PES.map((p) => ({ par: [p, 'baseVime'], motivo: 'o topo do pé encosta na face de baixo da base, em y 90' })),
  ...BRACOS.map((b) => ({ par: [b, 'baseVime'], motivo: 'o braço começa em y 300 e entra 60 mm na base de vime, como na forma de origem' })),
  { par: ['encostoVime', 'baseVime'], motivo: 'o encosto começa em y 320 e embute 40 mm na base; base e encosto são um bloco de vime' },
  { par: ['almofadaAssento', 'baseVime'], motivo: 'a almofada do assento assenta na base de vime e embute 40 mm nela, como na forma de origem' },
  ...BRACOS.map((b) => ({ par: [b, 'encostoVime'], motivo: 'o encosto de vime atravessa a faixa x ±345 a ±440 por dentro dos braços' })),
  ...BRACOS.map((b) => ({ par: [b, 'almofadaAssento'], motivo: 'a almofada do assento encosta na face interna de cada braço, em x ±345' })),
  { par: ['almofadaAssento', 'encostoVime'], motivo: 'a almofada do assento encosta na face da frente do encosto de vime, em z -280' },
  { par: ['almofadaEncosto', 'almofadaAssento'], motivo: 'a almofada do encosto girada tem a base embutida na almofada do assento, como na forma de origem' },
];

const receita = {
  meta: { nome: 'poltrona-vime-azul', desc: 'poltrona de vime sobre quatro pés, com base, dois braços, encosto, assento e almofada de encosto girada' },
  PARAMS: TABELA,
  MATERIAIS: {
    vime: { cor: '#73583e', metalicidade: 0, aspereza: 0.8 },
    vimeEscuro: { cor: '#302218', metalicidade: 0, aspereza: 0.8 },
    tecido: { cor: '#58626a', metalicidade: 0, aspereza: 0.9 },
  },
  TOPO: { origem: 'chão, no meio da poltrona em x e na origem de z; y para cima e a frente da poltrona em +z' },
  PLANO: {
    objeto: 'poltrona de vime com almofadas, de cerca de 970 mm de largura, 758 mm de altura e 780 mm de profundidade, com assento a 460 mm do chão',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'largura total da poltrona entre as faces de fora dos braços', milimetros: 970 },
    familia: 'assento',
    partes: [
      { nome: 'peFrenteEsq', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'peFrenteDir', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'peTrasEsq', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'peTrasDir', forma: 'prisma quadrado de 70 mm de lado e 90 mm de altura, chanfro de 5 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo da base' },
      { nome: 'baseVime', forma: 'bloco de 880 por 270 por 780 mm sobre os pés, com chanfro de 20 mm', tecnica: 'chamferBox assentada no topo dos pés, em y 90' },
      { nome: 'bracoEsq', forma: 'bloco de 140 por 280 por 780 mm, de y 300 a 580, por fora da base, com chanfro de 28 mm', tecnica: 'chamferBox com a face de trás em z -440, como a base' },
      { nome: 'bracoDir', forma: 'bloco de 140 por 280 por 780 mm, de y 300 a 580, por fora da base, com chanfro de 28 mm', tecnica: 'chamferBox com a face de trás em z -440, como a base' },
      { nome: 'encostoVime', forma: 'placa de 880 por 380 por 160 mm, de y 320 a 700, com a face da frente em z -280 e chanfro de 25 mm', tecnica: 'chamferBox atrás do assento, com a face de trás em z -440' },
      { nome: 'almofadaAssento', forma: 'almofada de 690 por 140 por 600 mm, de y 320 a 460, com chanfro de 20 mm', tecnica: 'chamferBox entre os braços, encostada no encosto em z -280' },
      { nome: 'almofadaEncosto', forma: 'almofada de 680 por 350 por 180 mm, girada 12 graus para trás em torno do eixo x, com chanfro de 35 mm', tecnica: 'chamferBox seguida de rotaciona em x, -12 graus, pivô no centro da caixa (y 575, z -160)' },
    ],
    criteriosDeReprovacao: [
      'alguma perna não toca o chão ou não chega na face de baixo da base',
      'o encosto não fica atrás do assento, em -z, ou os braços não ficam por fora da base',
      'a almofada do encosto entra no encosto de vime, passando da face da frente em z -280',
      'as peças simétricas em x não são simétricas em torno de x = 0',
      'um lado da poltrona difere do outro em medida ou posição de peça',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
