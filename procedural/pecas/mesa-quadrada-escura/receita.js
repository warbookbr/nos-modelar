/* mesa-quadrada-escura — mesa quadrada de madeira escura: tampo de 980 por 980 mm, quatro pés de 80 mm, quatro saias sob o tampo
 * e oito cantoneiras de reforço (prismas triangulares) entre os pés e as saias.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente da mesa em +z e x cresce para a direita de quem olha a mesa de
 * frente. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela em caixas e em perfis de extrusão, e
 * `gerarPassos` escreve, por parte, a forma, a `parte` com o nome e o `material` que a parte usa.
 *
 * Nomes: o pé e a saia levam a posição (Frente ou Tras, Esq ou Dir). A cantoneira leva o nome da saia que ela sustenta e a quina:
 * `cantoneiraFrenteDir` sustenta a saia da frente no lado direito; `cantoneiraDirFrente` sustenta a saia do lado direito na frente.
 *
 * Encaixes: o pé topa na face de baixo do tampo (y 680); a saia pendura do tampo, com a face de cima em y 680 e a de baixo em y 565;
 * a cantoneira tem o ângulo reto na quina entre a face interna do pé (x ou z ±360) e a face de baixo da saia (y 565), e as duas
 * pernas de 50 mm encostam nelas.
 *
 * Origem: a forma e as medidas vêm da receita do externo `mesa_pes_recortados_escura` (tools/mecanifica/fixtures/receita-externa-balcoes),
 * convertida por `passosDoEsboco` e guardada como base no scratchpad. Esta reescrita mantém cada parte da base com diferença máxima
 * de 0,5 mm na caixa. A simetria em x e em z é exata: a base já era simétrica, e a tabela escreve os quatro quadrantes a partir do
 * mesmo número.
 *
 * Omitido de propósito: a base dos pés tinha afinamento de 12 mm em dois lados (`afinar`), que o conversor recusou. Os pés saem
 * como caixas retas de 80 por 80 por 680 mm com chanfro de 4 mm, e o afinamento fica no backlog.
 *
 * Saias: a base tinha a saia com 730 mm e ela entrava 5 mm na face interna de cada pé. A pessoa aprovou encurtá-la para 720 mm, o
 * vão entre as faces internas dos pés (x ou z de -360 a 360), e a saia agora só encosta no pé, sem atravessá-lo.
 *
 * Material: o tampo leva `madeira`, e os pés, as saias e as cantoneiras levam `madeiraEscura`, como na base.
 */

export const TABELA = {
  altura_total: 720,

  tampo_lado: 980,
  tampo_espessura: 40,
  tampo_chanfro: 8,

  pe_lado: 80,
  pe_distancia: 400, /* centro do pé a 400 mm do eixo da mesa, em x e em z: a face interna fica em 360 e a externa em 440 */
  pe_chanfro: 4,

  saia_altura: 115,
  saia_recuo: 412, /* face interna da saia, a 412 mm do eixo da mesa */
  saia_espessura: 22,
  saia_comprimento: 720,
  saia_chanfro: 3,

  cantoneira_cateto: 50,
};

const faixa = (sinal, a, b) => (sinal > 0 ? { a0: a, a1: b } : { a0: -b, a1: -a });

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, chanfro, material }; perfis em milímetro: { nome, eixo, altura, em, perfil, material }. */
export function derivar(T) {
  const tampoY1 = T.altura_total;
  const tampoY0 = T.altura_total - T.tampo_espessura;
  const saiaY0 = tampoY0 - T.saia_altura;

  const peA = T.pe_distancia - T.pe_lado / 2;
  const peB = T.pe_distancia + T.pe_lado / 2;
  const saiaA = T.saia_recuo;
  const saiaB = T.saia_recuo + T.saia_espessura;
  const saiaMeia = T.saia_comprimento / 2;
  const tampoMeia = T.tampo_lado / 2;
  const C = T.cantoneira_cateto;

  const caixas = [];
  const perfis = [];

  caixas.push({
    nome: 'tampo',
    x0: -tampoMeia, x1: tampoMeia, y0: tampoY0, y1: tampoY1, z0: -tampoMeia, z1: tampoMeia,
    chanfro: T.tampo_chanfro, material: 'madeira',
  });

  for (const sx of [+1, -1]) {
    for (const sz of [+1, -1]) {
      const lx = sx > 0 ? 'Dir' : 'Esq';
      const lz = sz > 0 ? 'Frente' : 'Tras';
      const fx = faixa(sx, peA, peB);
      const fz = faixa(sz, peA, peB);
      caixas.push({
        nome: `pe${lz}${lx}`,
        x0: fx.a0, x1: fx.a1, y0: 0, y1: tampoY0, z0: fz.a0, z1: fz.a1,
        chanfro: T.pe_chanfro, material: 'madeiraEscura',
      });
    }
  }

  caixas.push({
    nome: 'saiaFrente',
    x0: -saiaMeia, x1: saiaMeia, y0: saiaY0, y1: tampoY0, z0: saiaA, z1: saiaB,
    chanfro: T.saia_chanfro, material: 'madeiraEscura',
  });
  caixas.push({
    nome: 'saiaTras',
    x0: -saiaMeia, x1: saiaMeia, y0: saiaY0, y1: tampoY0, z0: -saiaB, z1: -saiaA,
    chanfro: T.saia_chanfro, material: 'madeiraEscura',
  });
  caixas.push({
    nome: 'saiaDir',
    x0: saiaA, x1: saiaB, y0: saiaY0, y1: tampoY0, z0: -saiaMeia, z1: saiaMeia,
    chanfro: T.saia_chanfro, material: 'madeiraEscura',
  });
  caixas.push({
    nome: 'saiaEsq',
    x0: -saiaB, x1: -saiaA, y0: saiaY0, y1: tampoY0, z0: -saiaMeia, z1: saiaMeia,
    chanfro: T.saia_chanfro, material: 'madeiraEscura',
  });

  /* Cantoneiras: prismas triangulares com o ângulo reto na quina (face interna do pé e face de baixo da saia). Sob a saia da frente
   * ou de trás, o triângulo fica no plano x-y e a extrusão corre em z; sob a saia lateral, fica no plano y-z e corre em x. */
  for (const sx of [+1, -1]) {
    for (const sz of [+1, -1]) {
      const lx = sx > 0 ? 'Dir' : 'Esq';
      const lz = sz > 0 ? 'Frente' : 'Tras';
      perfis.push({
        nome: `cantoneira${lz}${lx}`, eixo: 'z', altura: T.saia_espessura,
        em: [sx * peA, saiaY0, sz > 0 ? saiaA : -saiaB],
        perfil: [[0, 0], [-sx * C, 0], [0, C]],
        material: 'madeiraEscura',
      });
      perfis.push({
        nome: `cantoneira${lx}${lz}`, eixo: 'x', altura: T.saia_espessura,
        em: [sx > 0 ? saiaA : -saiaB, saiaY0, sz * peA],
        perfil: [[0, 0], [C, 0], [0, -sz * C]],
        material: 'madeiraEscura',
      });
    }
  }

  return { caixas, perfis };
}

const m = (mm) => mm / 1000;

/** Os PASSOS: uma `chamferBox` por caixa e uma `extrusao` por cantoneira, cada uma com a `parte` e o `material`. Medidas em metro. */
export function gerarPassos(T) {
  const { caixas, perfis } = derivar(T);
  const passos = [];
  let id = 0;
  for (const c of caixas) {
    id += 1;
    const sel = { origem: { op: 'chamferBox', id } };
    passos.push(['chamferBox', {
      origemId: id,
      larg: m(c.x1 - c.x0),
      alt: m(c.y1 - c.y0),
      prof: m(c.z1 - c.z0),
      chanfro: m(c.chanfro),
      em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
    }]);
    passos.push(['parte', { nome: c.nome, sel }]);
    passos.push(['material', { sel, usa: c.material }]);
  }
  for (const p of perfis) {
    id += 1;
    const sel = { origem: { op: 'extrusao', id } };
    passos.push(['extrusao', {
      origemId: id,
      eixo: p.eixo,
      altura: m(p.altura),
      perfil: p.perfil.map(([u, v]) => [m(u), m(v)]),
      em: p.em.map((x) => m(x)),
    }]);
    passos.push(['parte', { nome: p.nome, sel }]);
    passos.push(['material', { sel, usa: p.material }]);
  }
  return passos;
}

/* Os contatos: cada par se toca por face, ou se sobrepõe no que o motivo diz, e nenhum se atravessa por acidente. */
const PES = ['peFrenteEsq', 'peFrenteDir', 'peTrasEsq', 'peTrasDir'];
const SAIAS = ['saiaFrente', 'saiaTras', 'saiaEsq', 'saiaDir'];
const CANTONEIRAS = [
  ['cantoneiraFrenteDir', 'peFrenteDir', 'saiaFrente'],
  ['cantoneiraFrenteEsq', 'peFrenteEsq', 'saiaFrente'],
  ['cantoneiraTrasDir', 'peTrasDir', 'saiaTras'],
  ['cantoneiraTrasEsq', 'peTrasEsq', 'saiaTras'],
  ['cantoneiraDirFrente', 'peFrenteDir', 'saiaDir'],
  ['cantoneiraDirTras', 'peTrasDir', 'saiaDir'],
  ['cantoneiraEsqFrente', 'peFrenteEsq', 'saiaEsq'],
  ['cantoneiraEsqTras', 'peTrasEsq', 'saiaEsq'],
];
const PARES_SAIA_PE = [
  ['saiaFrente', 'peFrenteDir'], ['saiaFrente', 'peFrenteEsq'],
  ['saiaTras', 'peTrasDir'], ['saiaTras', 'peTrasEsq'],
  ['saiaDir', 'peFrenteDir'], ['saiaDir', 'peTrasDir'],
  ['saiaEsq', 'peFrenteEsq'], ['saiaEsq', 'peTrasEsq'],
];

export const CONTATOS = [
  ...PES.map((p) => ({ par: ['tampo', p], motivo: 'o topo do pé topa na face de baixo do tampo, em y 680, e a face do pé fica dentro da área do tampo' })),
  ...SAIAS.map((s) => ({ par: ['tampo', s], motivo: 'o topo da saia encosta na face de baixo do tampo, em y 680, e fica dentro da área do tampo' })),
  ...PARES_SAIA_PE.map(([s, p]) => ({ par: [s, p], motivo: 'a ponta da saia, de 720 mm, encosta na face interna do pé, que fica a 360 mm do eixo da mesa' })),
  ...CANTONEIRAS.map(([c, p]) => ({ par: [c, p], motivo: 'a perna de 50 mm da cantoneira encosta na face interna do pé, na quina da saia' })),
  ...CANTONEIRAS.map(([c, , s]) => ({ par: [c, s], motivo: 'a outra perna da cantoneira encosta na face de baixo da saia, em y 565' })),
];

const receita = {
  meta: { nome: 'mesa-quadrada-escura', desc: 'mesa quadrada de madeira escura, com tampo de 980 mm, quatro pés, quatro saias e oito cantoneiras de reforço' },
  PARAMS: TABELA,
  MATERIAIS: {
    madeira: { cor: '#58524e', metalicidade: 0, aspereza: 0.8 },
    madeiraEscura: { cor: '#4c443e', metalicidade: 0, aspereza: 0.8 },
  },
  TOPO: { origem: 'chão, no meio da mesa em x e em z; y para cima e a frente da mesa em +z' },
  PLANO: {
    objeto: 'mesa quadrada de madeira escura, com 980 por 980 mm de tampo e 720 mm de altura total, quatro pés de 80 mm, quatro saias sob o tampo e oito cantoneiras de reforço',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da mesa', milimetros: 720 },
    partes: [
      { nome: 'tampo', forma: 'tábua quadrada de 980 por 40 por 980 mm, com chanfro de 8 mm, em y 680 a 720', tecnica: 'chamferBox apoiada sobre os quatro pés e as quatro saias' },
      { nome: 'peFrenteEsq', forma: 'prisma quadrado de 80 mm de lado e 680 mm de altura, com chanfro de 4 mm', tecnica: 'chamferBox do chão até a face de baixo do tampo' },
      { nome: 'peFrenteDir', forma: 'prisma quadrado de 80 mm de lado e 680 mm de altura, com chanfro de 4 mm', tecnica: 'chamferBox do chão até a face de baixo do tampo' },
      { nome: 'peTrasEsq', forma: 'prisma quadrado de 80 mm de lado e 680 mm de altura, com chanfro de 4 mm', tecnica: 'chamferBox do chão até a face de baixo do tampo' },
      { nome: 'peTrasDir', forma: 'prisma quadrado de 80 mm de lado e 680 mm de altura, com chanfro de 4 mm', tecnica: 'chamferBox do chão até a face de baixo do tampo' },
      { nome: 'saiaFrente', forma: 'bloco de 730 por 115 por 22 mm sob o tampo, na frente, em z 412 a 434', tecnica: 'chamferBox com a face de cima encostada no tampo e a de baixo em y 565' },
      { nome: 'saiaTras', forma: 'bloco de 730 por 115 por 22 mm sob o tampo, atrás, em z -434 a -412', tecnica: 'chamferBox com a face de cima encostada no tampo e a de baixo em y 565' },
      { nome: 'saiaEsq', forma: 'bloco de 22 por 115 por 730 mm sob o tampo, à esquerda, em x -434 a -412', tecnica: 'chamferBox com a face de cima encostada no tampo e a de baixo em y 565' },
      { nome: 'saiaDir', forma: 'bloco de 22 por 115 por 730 mm sob o tampo, à direita, em x 412 a 434', tecnica: 'chamferBox com a face de cima encostada no tampo e a de baixo em y 565' },
      { nome: 'cantoneiraFrenteDir', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia da frente à direita', tecnica: 'extrusao em z, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
      { nome: 'cantoneiraFrenteEsq', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia da frente à esquerda', tecnica: 'extrusao em z, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
      { nome: 'cantoneiraTrasDir', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia de trás à direita', tecnica: 'extrusao em z, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
      { nome: 'cantoneiraTrasEsq', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia de trás à esquerda', tecnica: 'extrusao em z, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
      { nome: 'cantoneiraDirFrente', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia da direita, na frente', tecnica: 'extrusao em x, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
      { nome: 'cantoneiraDirTras', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia da direita, atrás', tecnica: 'extrusao em x, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
      { nome: 'cantoneiraEsqFrente', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia da esquerda, na frente', tecnica: 'extrusao em x, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
      { nome: 'cantoneiraEsqTras', forma: 'prisma triangular de 50 por 50 mm de cateto e 22 mm de espessura, sob a saia da esquerda, atrás', tecnica: 'extrusao em x, com o ângulo reto na quina entre a face interna do pé e a face de baixo da saia' },
    ],
    criteriosDeReprovacao: [
      'algum pé não toca o chão ou não chega na face de baixo do tampo',
      'o tampo não cobre os quatro pés nem fica em y 680 a 720',
      'alguma saia não fica sob o tampo, entre y 565 e 680, ou não fica entre os pés',
      'alguma cantoneira não encosta no pé e na saia da sua quina, ou não tem o ângulo reto na quina',
      'um lado da mesa difere do outro em medida ou posição de peça',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() {
    return gerarPassos(this.PARAMS);
  },
};

export default receita;
