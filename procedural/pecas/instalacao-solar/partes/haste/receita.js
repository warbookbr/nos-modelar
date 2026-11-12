/* instalacao-solar/haste — a haste rosca dupla de inox de 250 mm, com a borracha de vedação, a arruela e as porcas.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 8 na obra, 4
 * por linha de trilho. A haste entra furada na parte alta da onda da telha e rosqueada na viga de madeira; a borracha veda o furo na
 * telha, a arruela e a primeira porca a apertam, e a segunda porca prende o suporte em L (a perna dele passa no vão entre as duas).
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a ponta de baixo da haste, a que entra na viga), a haste em pé no eixo y,
 * centrada em x e z, de y = 0 a `comprimento`. Rosca não é modelada: a haste é um cilindro liso.
 *
 * MEDIDAS A CONFIRMAR (a pessoa só deu o comprimento de 250 mm e o diâmetro de 8 a 10 mm): o diâmetro de 10 mm, a altura em que a
 * borracha assenta (na telha, 100 mm acima da ponta), o cone da borracha, a arruela, a porca de 17 mm de chave e o vão de 5 mm
 * entre as duas porcas.
 *
 * Técnica: a haste é um `cilindro` em y; a borracha é um `lathe` com furo central e perfil em cone; a arruela e as porcas são
 * `extrusao` em y de um contorno com furo circular de folga de 0,1 mm em volta da haste (a porca é um sextavado de seis lados).
 */

export const TABELA = {
  /* Comprimento da haste, do documento da pessoa. */
  comprimento: 250,
  /* A CONFIRMAR: diâmetro (a pessoa deu de 8 a 10 mm). */
  diametro: 10,
  /* A CONFIRMAR: borracha de vedação (altura em que assenta, raio da base, espessura da aba, raio do topo e altura do cone). */
  alturaDaBorracha: 100,
  raioDaBorracha: 28,
  abaDaBorracha: 2,
  raioDoTopoDaBorracha: 9,
  alturaDoConeDaBorracha: 14,
  /* A CONFIRMAR: arruela (raio externo e espessura) e porca (largura entre faces e altura). */
  raioDaArruela: 15,
  espessuraDaArruela: 3,
  chaveDaPorca: 17,
  alturaDaPorca: 10,
  /* A CONFIRMAR: o vão entre a primeira e a segunda porca, onde passa a perna do suporte em L. */
  vaoEntrePorcas: 5,
  folgaDoFuro: 0.1,
  lados: 24,
};

export const MATERIAIS = {
  inox: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
  borracha: { cor: '#1b1c1e', aspereza: 0.85 },
};

const m = (mm) => mm / 1000;
const ID = { barra: 100, borracha: 101, arruela: 102, porcaBaixa: 103, porcaCima: 104 };

export function derivar(t = TABELA) {
  const r = t.diametro / 2;
  const yBorracha = t.alturaDaBorracha;
  const yArruela = yBorracha + t.alturaDoConeDaBorracha;
  const yPorcaBaixa = yArruela + t.espessuraDaArruela;
  const yPorcaCima = yPorcaBaixa + t.alturaDaPorca + t.vaoEntrePorcas;
  /* O sextavado de vértice em +x: o raio do círculo que o circunscreve é a chave sobre a raiz de 3. */
  const R = t.chaveDaPorca / Math.sqrt(3);
  const sextavado = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  return {
    r, yBorracha, yArruela, yPorcaBaixa, yPorcaCima, sextavado, rFuro: r + t.folgaDoFuro,
    /* Perfil [raio, y] da borracha, de baixo: o furo, a aba, o cone até o topo e o furo de novo; fecha no primeiro ponto. */
    perfilDaBorracha: [
      [r, 0], [t.raioDaBorracha, 0], [t.raioDaBorracha, t.abaDaBorracha], [t.raioDoTopoDaBorracha, t.alturaDoConeDaBorracha],
      [r, t.alturaDoConeDaBorracha], [r, 0],
    ],
  };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, deDe) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de: deDe[nome], interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: a borracha assenta no plano das cristas da telha (a haste entra 100 mm abaixo dele) e o suporte em L, na face de
   cima da primeira porca. O giro em torno da haste é o da referência: +z local aponta a subida da água. */
export function portas(t = TABELA) {
  const D = derivar(t);
  return {
    vedacao: { forma: 'plano', papel: 'apoia', ponto: [0, t.alturaDaBorracha, 0], normal: [0, -1, 0], extensao: [2 * t.raioDaBorracha, 2 * t.raioDaBorracha], referencia: [0, 0, 1] },
    doSuporte: { forma: 'plano', papel: 'recebe', ponto: [0, D.yPorcaBaixa + t.alturaDaPorca, 0], normal: [0, 1, 0], extensao: [2 * t.raioDaArruela, 2 * t.raioDaArruela], referencia: [0, 0, 1] },
  };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  passos.push(['cilindro', { origemId: ID.barra, raio: m(D.r), altura: m(t.comprimento), lados: t.lados }]);
  for (const sel of [{ origem: { op: 'cilindro', id: ID.barra } }, { origem: { op: 'cilindro', id: ID.barra, tampa: 'fundo' } }, { origem: { op: 'cilindro', id: ID.barra, tampa: 'topo' } }]) {
    passos.push(['parte', { nome: 'barra', sel }], ['material', { usa: 'inox', sel }]);
  }
  passos.push(['lathe', { origemId: ID.borracha, lados: t.lados, segmentosCurva: 1, perfil: D.perfilDaBorracha.map(([r, y]) => [m(r), m(y)]), em: [0, m(D.yBorracha), 0] }]);
  const selBorracha = { origem: { op: 'lathe', id: ID.borracha } };
  passos.push(['parte', { nome: 'borracha', sel: selBorracha }], ['material', { usa: 'borracha', sel: selBorracha }]);

  const anel = (id, nome, y0, altura, perfil) => {
    passos.push(['extrusao', { origemId: id, perfil, furos: [{ circulo: { raio: m(D.rFuro) } }], segmentosArco: t.lados / 4, altura: m(altura), em: [0, m(y0), 0] }]);
    const sel = { origem: { op: 'extrusao', id } };
    passos.push(['parte', { nome, sel }], ['material', { usa: 'inox', sel }]);
  };
  anel(ID.arruela, 'arruela', D.yArruela, t.espessuraDaArruela, { circulo: { raio: m(t.raioDaArruela) } });
  anel(ID.porcaBaixa, 'porcaBaixa', D.yPorcaBaixa, t.alturaDaPorca, D.sextavado.map((p) => p.map(m)));
  anel(ID.porcaCima, 'porcaCima', D.yPorcaCima, t.alturaDaPorca, D.sextavado.map((p) => p.map(m)));
  /* O plano de cada porta passa por vértices da origem dela: a borracha na face de baixo, a primeira porca na de cima. */
  publicar(passos, portas(t), { vedacao: { op: 'lathe', id: ID.borracha }, doSuporte: { op: 'extrusao', id: ID.porcaBaixa } });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/haste', desc: 'haste rosca dupla de inox de 250 mm, com borracha de vedação cônica, arruela e duas porcas' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'ponta de baixo da haste, no eixo; y para cima ao longo da haste' },
  PLANO: {
    objeto: 'haste rosca dupla de inox de 250 mm e 10 mm de diâmetro, com a borracha de vedação, a arruela e duas porcas',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento da haste', milimetros: 250 },
    partes: [
      { nome: 'barra', forma: 'cilindro liso de inox de 10 mm de diâmetro e 250 mm de comprimento em pé no eixo y, sem rosca modelada', tecnica: 'cilindro em y' },
      { nome: 'borracha', forma: 'borracha de vedação preta em cone com aba larga embaixo (56 mm de diâmetro) e topo estreito de 18 mm, 14 mm de altura, com furo central onde a haste passa, a 100 mm da ponta', tecnica: 'revolução (lathe) de perfil fechado em torno do eixo da haste' },
      { nome: 'arruela', forma: 'arruela de inox de 30 mm de diâmetro e 3 mm de espessura, com furo central, assentada no topo da borracha', tecnica: 'extrusão em y de círculo com furo' },
      { nome: 'porcaBaixa', forma: 'porca sextavada de inox de 17 mm entre faces e 10 mm de altura, com furo central, sobre a arruela', tecnica: 'extrusão em y de hexágono com furo circular' },
      { nome: 'porcaCima', forma: 'segunda porca sextavada igual à primeira, 5 mm acima dela, no vão em que passa o suporte em L', tecnica: 'extrusão em y de hexágono com furo circular' },
    ],
    criteriosDeReprovacao: [
      'comprimento da haste diferente de 250 mm',
      'diâmetro fora de 8 a 10 mm',
      'haste que não está em pé no eixo y, ou abaixo do chão',
      'borracha sem furo, ou cilíndrica e sem o cone',
      'arruela ou porca solta da pilha, fora da haste',
      'porca redonda, e não sextavada',
      'só uma porca, ou nenhum vão entre as duas',
    ],
  },
  contatos: [
    { par: ['barra', 'borracha'], motivo: 'a borracha envolve a haste, o furo dela é o diâmetro da haste' },
    { par: ['borracha', 'arruela'], motivo: 'a arruela assenta no topo da borracha' },
    { par: ['arruela', 'porcaBaixa'], motivo: 'a primeira porca assenta na arruela' },
  ],
  ilhas: [{ contem: 'porcaCima', motivo: 'a segunda porca fica 5 mm acima da primeira, no vão em que passa a perna do suporte em L; ela só assenta no suporte, na montagem' }],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
