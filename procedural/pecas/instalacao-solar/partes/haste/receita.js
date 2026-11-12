/* instalacao-solar/haste — a haste rosca dupla de inox de 250 mm, com a borracha de vedação, as arruelas e as porcas.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 8 na obra, 4
 * por linha de trilho. A haste entra furada na crista da onda da telha, atravessa a telha e a onda até o fundo da viga de madeira e
 * é rosqueada nela. Na crista ficam a borracha de vedação, a arruela e a porca de vedação; o resto da haste sobe livre, e no alto o
 * suporte em L assenta com a perna do furo sobre a porca de apoio, presa por uma arruela e uma porca por cima.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a ponta de baixo da haste, a que entra na viga), a haste em pé no eixo y,
 * centrada em x e z, de y = 0 a `comprimento`. Rosca não é modelada: a haste é um cilindro liso. O assento da borracha, na crista, fica
 * em y = `profundidadeDoAssento`: a montagem a deriva da porta do telhado (da crista ao fundo da viga).
 *
 * MEDIDAS A CONFIRMAR (a pessoa só deu o comprimento de 250 mm e o diâmetro de 8 a 10 mm): o diâmetro de 10 mm, a profundidade do
 * assento (o valor da TABELA só vale para ver a peça sozinha), o cone da borracha, as arruelas, a porca de 17 mm de chave, o vão de 1 mm
 * até a porca de apoio (que faz a ponta da haste sobrar uns 15 mm acima da porca de cima, como nas fotos de instalação: de 15 a 20 mm) e os
 * 6,5 mm da perna do suporte em L entre a porca de apoio e a arruela de cima (a chapa de 5 mm mais a borracha de 1,5 mm sob o pé).
 *
 * Técnica: a haste é um `cilindro` em y; a borracha é um `lathe` com furo central e perfil em cone; as arruelas e as porcas são
 * `extrusao` em y de um contorno com furo circular de folga de 0,1 mm em volta da haste (a porca é um sextavado de seis lados).
 */

export const TABELA = {
  /* Comprimento da haste, do documento da pessoa. */
  comprimento: 250,
  /* A CONFIRMAR: diâmetro (a pessoa deu de 8 a 10 mm). */
  diametro: 10,
  /* A CONFIRMAR: a borracha assenta na crista, a esta altura da ponta: a telha de 6 mm, a onda de 51 mm e a viga de 120 mm somam 177,5 com
     a folga entre as duas fileiras. Na montagem o valor vem da porta do telhado; este só vale para ver a peça sozinha. */
  profundidadeDoAssento: 177.5,
  /* A CONFIRMAR: borracha de vedação (raio da base, espessura da aba, raio do topo e altura do cone). */
  raioDaBorracha: 28,
  abaDaBorracha: 2,
  raioDoTopoDaBorracha: 9,
  alturaDoConeDaBorracha: 14,
  /* A CONFIRMAR: arruela (raio externo e espessura) e porca (largura entre faces e altura). */
  raioDaArruela: 15,
  espessuraDaArruela: 3,
  chaveDaPorca: 17,
  alturaDaPorca: 10,
  /* A CONFIRMAR: o vão livre de rosca entre a porca de vedação e a porca de apoio, e a espessura da perna do suporte em L que assenta nela. */
  vaoAteOApoio: 1,
  espessuraDaPernaDoSuporte: 6.5,
  folgaDoFuro: 0.1,
  lados: 24,
};

export const MATERIAIS = {
  inox: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
  borracha: { cor: '#1b1c1e', aspereza: 0.85 },
};

const m = (mm) => mm / 1000;
const ID = { barra: 100, borracha: 101, arruela: 102, porcaBaixa: 103, porcaApoio: 104, arruelaCima: 105, porcaCima: 106 };

export function derivar(t = TABELA) {
  const r = t.diametro / 2;
  const yBorracha = t.profundidadeDoAssento;
  const yArruela = yBorracha + t.alturaDoConeDaBorracha;
  const yPorcaBaixa = yArruela + t.espessuraDaArruela;
  const yPorcaApoio = yPorcaBaixa + t.alturaDaPorca + t.vaoAteOApoio;
  const yPernaDoSuporte = yPorcaApoio + t.alturaDaPorca;
  const yArruelaCima = yPernaDoSuporte + t.espessuraDaPernaDoSuporte;
  const yPorcaCima = yArruelaCima + t.espessuraDaArruela;
  /* O sextavado de vértice em +x: o raio do círculo que o circunscreve é a chave sobre a raiz de 3. */
  const R = t.chaveDaPorca / Math.sqrt(3);
  const sextavado = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  return {
    r, yBorracha, yArruela, yPorcaBaixa, yPorcaApoio, yPernaDoSuporte, yArruelaCima, yPorcaCima, sextavado, rFuro: r + t.folgaDoFuro,
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

/* As portas, em mm: a borracha assenta no plano das cristas da telha (a haste entra `profundidadeDoAssento` abaixo dele) e o suporte em L, na
   face de cima da porca de apoio. O giro em torno da haste é o da referência: +z local aponta a subida da água. */
export function portas(t = TABELA) {
  const D = derivar(t);
  return {
    vedacao: { forma: 'plano', papel: 'apoia', ponto: [0, t.profundidadeDoAssento, 0], normal: [0, -1, 0], extensao: [2 * t.raioDaBorracha, 2 * t.raioDaBorracha], referencia: [0, 0, 1] },
    doSuporte: { forma: 'plano', papel: 'recebe', ponto: [0, D.yPernaDoSuporte, 0], normal: [0, 1, 0], extensao: [2 * t.raioDaArruela, 2 * t.raioDaArruela], referencia: [0, 0, 1] },
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
  anel(ID.porcaApoio, 'porcaApoio', D.yPorcaApoio, t.alturaDaPorca, D.sextavado.map((p) => p.map(m)));
  anel(ID.arruelaCima, 'arruelaCima', D.yArruelaCima, t.espessuraDaArruela, { circulo: { raio: m(t.raioDaArruela) } });
  anel(ID.porcaCima, 'porcaCima', D.yPorcaCima, t.alturaDaPorca, D.sextavado.map((p) => p.map(m)));
  /* O plano de cada porta passa por vértices da origem dela: a borracha na face de baixo, a porca de apoio na de cima. */
  publicar(passos, portas(t), { vedacao: { op: 'lathe', id: ID.borracha }, doSuporte: { op: 'extrusao', id: ID.porcaApoio } });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/haste', desc: 'haste rosca dupla de inox de 250 mm, com borracha de vedação cônica, arruela e porca de vedação na crista e porca de apoio, arruela e porca no alto' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'ponta de baixo da haste, no eixo; y para cima ao longo da haste' },
  PLANO: {
    objeto: 'haste rosca dupla de inox de 250 mm e 10 mm de diâmetro, com a borracha de vedação, a arruela e a porca de vedação na crista, e a porca de apoio, a arruela e a porca no alto, onde assenta o suporte em L',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento da haste', milimetros: 250 },
    partes: [
      { nome: 'barra', forma: 'cilindro liso de inox de 10 mm de diâmetro e 250 mm de comprimento em pé no eixo y, sem rosca modelada', tecnica: 'cilindro em y' },
      { nome: 'borracha', forma: 'borracha de vedação preta em cone com aba larga embaixo (56 mm de diâmetro) e topo estreito de 18 mm, 14 mm de altura, com furo central onde a haste passa, no assento da crista', tecnica: 'revolução (lathe) de perfil fechado em torno do eixo da haste' },
      { nome: 'arruela', forma: 'arruela de inox de 30 mm de diâmetro e 3 mm de espessura, com furo central, assentada no topo da borracha', tecnica: 'extrusão em y de círculo com furo' },
      { nome: 'porcaBaixa', forma: 'porca de vedação sextavada de inox de 17 mm entre faces e 10 mm de altura, com furo central, sobre a arruela', tecnica: 'extrusão em y de hexágono com furo circular' },
      { nome: 'porcaApoio', forma: 'porca sextavada igual à primeira, 1 mm acima dela, em cuja face de cima assenta a perna do suporte em L', tecnica: 'extrusão em y de hexágono com furo circular' },
      { nome: 'arruelaCima', forma: 'arruela de 30 mm e 3 mm, 6,5 mm acima da porca de apoio (o vão do pé do suporte em L com a borracha)', tecnica: 'extrusão em y de círculo com furo' },
      { nome: 'porcaCima', forma: 'porca sextavada igual às outras, sobre a arruela de cima, que prende o suporte em L', tecnica: 'extrusão em y de hexágono com furo circular' },
    ],
    criteriosDeReprovacao: [
      'comprimento da haste diferente de 250 mm',
      'diâmetro fora de 8 a 10 mm',
      'haste que não está em pé no eixo y, ou abaixo do chão',
      'borracha sem furo, ou cilíndrica e sem o cone',
      'pilha de baixo (borracha, arruela, porca de vedação) fora do assento, ou solta da haste',
      'porca redonda, e não sextavada',
      'sem a pilha de cima (porca de apoio, vão da perna, arruela e porca), ou com a porca de apoio colada na de vedação',
      'ponta da haste acima da pilha de cima, quando ela sobra para cima da última porca',
    ],
  },
  contatos: [
    { par: ['barra', 'borracha'], motivo: 'a borracha envolve a haste, o furo dela é o diâmetro da haste' },
    { par: ['borracha', 'arruela'], motivo: 'a arruela assenta no topo da borracha' },
    { par: ['arruela', 'porcaBaixa'], motivo: 'a porca de vedação assenta na arruela' },
    { par: ['arruelaCima', 'porcaCima'], motivo: 'a porca de cima assenta na arruela de cima' },
  ],
  ilhas: [
    { contem: 'porcaApoio', motivo: 'a porca de apoio fica 1 mm acima da porca de vedação, na rosca livre; o suporte em L assenta nela na montagem' },
    { contem: 'arruelaCima', motivo: 'a arruela de cima fica 6,5 mm acima da porca de apoio, no vão do pé do suporte em L e da borracha; o pé passa ali na montagem' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
