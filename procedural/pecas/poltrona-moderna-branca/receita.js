/* poltrona-moderna-branca — poltrona de estofado com dois braços, assento e encosto sobre uma base, com quatro pés de madeira.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 e a frente da poltrona em +z; x cresce para a direita de quem olha a
 * poltrona de frente, e o encosto fica em -z. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela
 * em caixas e `gerarPassos` as escreve como uma `chamferBox` por parte, com a parte nomeada logo depois.
 *
 * Encaixes: o pé topa na face de baixo do braço que ele apoia (y 85), com a face externa alinhada ao braço (x ±450); a base e
 * o assento encostam na face interna do braço (x ±310); a base assenta no topo dos pés e dos braços; o assento assenta na face
 * de cima da base (y 280) e vai até a frente do encosto (z -120); o encosto assenta na face de cima da base, atrás do assento,
 * e ocupa todo o vão entre os braços (x ±310).
 *
 * Origem: os passos da base, que são a conversão mecânica da receita externa `cadeira_larga_estofada_clara` com o alinhamento e os ajustes
 * aprovados. A base é a referência de medida, e esta receita a reproduz com a mesma forma e as mesmas faces.
 *
 * Mudanças em relação à base, e o motivo de cada uma:
 *   - Nomes: pes, pes_x, pes_y e pes_xy viram pesFrenteEsq, pesFrenteDir, pesTrasEsq e pesTrasDir, porque a base não tinha
 *     underscore e os nomes precisam dizer a posição; bracos e bracos_x viram bracoEsq e bracoDir pelo mesmo motivo.
 *   - Medidas: nenhuma. Toda face da base cabe nesta receita com diferença de 0 mm, e a caixa total é x ±450, y 0 a 800 e
 *     z -420 a 410 (900 por 800 por 830 mm), igual à da base.
 *   - Encosto: 180 mm de espessura, de z -300 a -120, sem engrossar, e x ±310, igual ao vão entre os braços.
 *   - Cor: a cor branca foi aplicada por pedido aprovado, porque a poltrona deve ser branca; a base e a receita externa eram
 *     marrons. Cada caixa leva o material da sua parte (`material` em `derivar`) e `gerarPassos` escreve a operação `material`
 *     logo depois da `parte`: o tecido, de assento e encosto, fica em branco quente e a estrutura, de base, braços e pés, em
 *     off-white, para as partes continuarem distinguíveis. Nenhuma medida, parte ou contato mudou.
 */

export const TABELA = {
  pe_largura: 80,
  pe_altura: 85,
  pe_profundidade_frente: 80,
  pe_profundidade_tras: 90,
  pe_x_externo: 450,
  pe_z_frente: 410,
  pe_z_tras: -420,
  pe_chanfro: 4,

  braco_x_externo: 450,
  braco_largura: 140,
  braco_altura: 530,
  braco_chanfro: 15,

  base_altura: 195,
  base_z_frente: 410,
  base_z_tras: -420,
  base_chanfro: 10,

  assento_espessura: 160,
  assento_z_frente: 410,
  assento_chanfro: 15,

  encosto_z_frente: -120,
  encosto_espessura: 180,
  encosto_topo: 800,
  encosto_chanfro: 15,
};

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, chanfro }. */
export function derivar(T) {
  /* a face interna dos braços, que é o vão em x da base, do assento e do encosto */
  const meiaX = T.braco_x_externo - T.braco_largura;

  const pesX0 = T.pe_x_externo - T.pe_largura;
  const pesFrenteZ0 = T.pe_z_frente - T.pe_profundidade_frente;
  const pesTrasZ1 = T.pe_z_tras + T.pe_profundidade_tras;

  const baseY0 = T.pe_altura;
  const baseY1 = baseY0 + T.base_altura;
  const bracoY0 = T.pe_altura;
  const bracoY1 = bracoY0 + T.braco_altura;

  const assentoY0 = baseY1;
  const assentoY1 = assentoY0 + T.assento_espessura;
  const assentoZ0 = T.encosto_z_frente;

  const encostoY0 = assentoY0;
  const encostoZ0 = T.encosto_z_frente - T.encosto_espessura;
  const encostoZ1 = T.encosto_z_frente;

  /* a face externa e a interna de um lado; lado -1 é o da esquerda de quem olha de frente, em x negativo */
  const lado = (sinal, interno, externo) => (sinal < 0 ? { x0: -externo, x1: -interno } : { x0: interno, x1: externo });

  const caixas = [];

  /* pés: sob a face de baixo de cada braço, com a face externa em x ±450; o de trás é 10 mm mais fundo */
  const pes = [
    ['pesFrenteEsq', -1, pesFrenteZ0, T.pe_z_frente],
    ['pesFrenteDir', +1, pesFrenteZ0, T.pe_z_frente],
    ['pesTrasEsq', -1, T.pe_z_tras, pesTrasZ1],
    ['pesTrasDir', +1, T.pe_z_tras, pesTrasZ1],
  ];
  for (const [nome, sinal, z0, z1] of pes) {
    caixas.push({ nome, ...lado(sinal, pesX0, T.pe_x_externo), y0: 0, y1: T.pe_altura, z0, z1, chanfro: T.pe_chanfro, material: 'madeira' });
  }

  /* base: entre as faces internas dos braços, sobre o topo dos pés e dos braços */
  caixas.push({
    nome: 'base',
    x0: -meiaX, x1: meiaX,
    y0: baseY0, y1: baseY1,
    z0: T.base_z_tras, z1: T.base_z_frente,
    chanfro: T.base_chanfro, material: 'madeira',
  });

  /* braços: de x ±310 até x ±450, da altura dos pés à altura do braço */
  for (const [nome, sinal] of [['bracoEsq', -1], ['bracoDir', +1]]) {
    caixas.push({
      nome,
      ...lado(sinal, meiaX, T.braco_x_externo),
      y0: bracoY0, y1: bracoY1,
      z0: T.base_z_tras, z1: T.base_z_frente,
      chanfro: T.braco_chanfro, material: 'madeira',
    });
  }

  /* assento: entre os braços, sobre a base, da frente do encosto até a frente da poltrona */
  caixas.push({
    nome: 'assento',
    x0: -meiaX, x1: meiaX,
    y0: assentoY0, y1: assentoY1,
    z0: assentoZ0, z1: T.assento_z_frente,
    chanfro: T.assento_chanfro, material: 'tecido',
  });

  /* encosto: 180 mm de espessura, atrás do assento, do topo da base até y 800 */
  caixas.push({
    nome: 'encosto',
    x0: -meiaX, x1: meiaX,
    y0: encostoY0, y1: T.encosto_topo,
    z0: encostoZ0, z1: encostoZ1,
    chanfro: T.encosto_chanfro, material: 'tecido',
  });

  return caixas;
}

const m = (mm) => mm / 1000;

/** Os PASSOS: uma caixa `chamferBox` por parte, em metro. `em` é o centro em x e z e a base em y. */
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
    passos.push(['parte', { nome: c.nome, sel: { origem: { op: 'chamferBox', id } } }]);
    passos.push(['material', { sel: { origem: { op: 'chamferBox', id } }, usa: c.material }]);
  });
  return passos;
}

/* Os contatos da poltrona: cada par se toca em uma face e nenhum se atravessa. */
const PES = ['pesFrenteEsq', 'pesFrenteDir', 'pesTrasEsq', 'pesTrasDir'];
const BRACOS = ['bracoEsq', 'bracoDir'];
export const CONTATOS = [
  ...PES.map((p) => ({ par: [p, p.endsWith('Esq') ? 'bracoEsq' : 'bracoDir'], motivo: 'o topo do pé encosta na face de baixo do braço que ele apoia, com a face externa alinhada em x ±450' })),
  ...BRACOS.map((b) => ({ par: ['base', b], motivo: 'a base encosta na face interna do braço, em x ±310' })),
  ...BRACOS.map((b) => ({ par: ['assento', b], motivo: 'o assento encosta na face interna do braço, em x ±310' })),
  ...BRACOS.map((b) => ({ par: ['encosto', b], motivo: 'o encosto encosta na face interna do braço e ocupa todo o vão entre eles' })),
  { par: ['assento', 'base'], motivo: 'o assento assenta na face de cima da base, em y 280' },
  { par: ['encosto', 'base'], motivo: 'o encosto assenta na face de cima da base, atrás do assento, em y 280' },
  { par: ['assento', 'encosto'], motivo: 'a costas do assento encosta na frente do encosto, em z -120' },
];

export const PASSOS = gerarPassos(TABELA);

const receita = {
  meta: { nome: 'poltrona-moderna-branca', desc: 'poltrona de estofado com dois braços, assento e encosto sobre base e quatro pés de madeira' },
  PARAMS: TABELA,
  MATERIAIS: {
    madeira: { cor: '#e8e4dc', metalicidade: 0, aspereza: 0.8 },
    tecido: { cor: '#f2efe9', metalicidade: 0, aspereza: 0.8 },
  },
  TOPO: { origem: 'chão, no meio da poltrona em x e em z; y para cima e a frente da poltrona em +z' },
  PLANO: {
    objeto: 'poltrona de estofado com braços, 900 mm de largura, 830 mm de profundidade e 800 mm de altura, com assento a 440 mm do chão',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da poltrona', milimetros: 800 },
    familia: 'assento',
    partes: [
      { nome: 'pesFrenteEsq', forma: 'prisma quadrado de 80 mm por 80 mm e 85 mm de altura, chanfro de 4 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo do braço esquerdo' },
      { nome: 'pesFrenteDir', forma: 'prisma quadrado de 80 mm por 80 mm e 85 mm de altura, chanfro de 4 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo do braço direito' },
      { nome: 'pesTrasEsq', forma: 'prisma de 80 mm por 90 mm e 85 mm de altura, chanfro de 4 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo do braço esquerdo' },
      { nome: 'pesTrasDir', forma: 'prisma de 80 mm por 90 mm e 85 mm de altura, chanfro de 4 mm', tecnica: 'chamferBox ancorada no chão, topo na face de baixo do braço direito' },
      { nome: 'base', forma: 'bloco de 620 por 195 por 830 mm, chanfro de 10 mm, de y 85 a 280', tecnica: 'chamferBox entre as faces internas dos braços, sobre o topo dos pés e dos braços' },
      { nome: 'bracoEsq', forma: 'bloco de 140 por 530 por 830 mm, de x -450 a -310, chanfro de 15 mm', tecnica: 'chamferBox da altura dos pés até y 615, face externa em x -450' },
      { nome: 'bracoDir', forma: 'bloco de 140 por 530 por 830 mm, de x 310 a 450, chanfro de 15 mm', tecnica: 'chamferBox da altura dos pés até y 615, face externa em x 450' },
      { nome: 'assento', forma: 'tábua de 620 por 160 por 530 mm, de y 280 a 440, chanfro de 15 mm', tecnica: 'chamferBox entre os braços, sobre a base, da frente do encosto até z 410' },
      { nome: 'encosto', forma: 'painel de 620 por 520 por 180 mm, de z -300 a -120, do topo da base a y 800, chanfro de 15 mm', tecnica: 'chamferBox entre os braços, atrás do assento, sobre a base' },
    ],
    criteriosDeReprovacao: [
      'algum pé não toca o chão ou não chega na face de baixo do braço que ele apoia',
      'o encosto não fica atrás do assento, em -z, ou não ocupa o vão inteiro entre os braços',
      'um lado da poltrona difere do outro em medida ou posição de peça',
      'a base ou o assento atravessam um braço em vez de encostar na face interna dele',
      'o encosto tem mais de 180 mm de espessura',
    ],
  },
  contatos: CONTATOS,
  PASSOS,
};

export default receita;
