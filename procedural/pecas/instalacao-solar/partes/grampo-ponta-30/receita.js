/* instalacao-solar/grampo-ponta-30 — o grampo de ponta em "Z" para moldura de 30 a 35 mm, com parafuso allen e porca de canal.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 4 na obra, os dois lados do painel de 30 mm (2 por lado, um em cada trilho). O grampo prende
 * um painel só, pelo lado de fora dele: a aba de cima aperta o topo da moldura, a parede desce rente à moldura até o perfil e o pé,
 * para fora, assenta no topo do perfil. O parafuso allen entra na vertical pela parte de cima, junto da parede, desce pelo corpo
 * e pelo pé e rosca numa porca que corre no canal em T do perfil.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a ponta de baixo do parafuso, dentro do canal do perfil), o grampo
 * centrado em z (atravessado ao trilho). Em x, a face da parede voltada para o painel fica em x = 0, o painel e a aba de cima do lado de
 * -x e o pé do lado de +x. O pé assenta em y = `apoio`, o topo do perfil, e a face de baixo da aba de cima fica em y = `apoio` +
 * `alturaDaMoldura`, o topo da moldura. A porca fica sob as abas do canal: o topo dela em y = `apoio` - a espessura da aba do perfil.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o grampo; só deu a faixa de 30 a 35 mm): a altura de 32,5 mm entre o pé e a aba de cima (o
 * meio da faixa), o corpo de 12 mm de espessura que leva o furo, a chapa de 3 mm, o pé de 30 mm, a aba de 10 mm sobre a moldura, os 50 mm
 * de largura, o apoio de 10 mm (a haste do parafuso desce até o meio da porca), o parafuso M6 com cabeça allen de 10 mm por 6 mm e a porca
 * de canal de 16 por 10 por 6 mm.
 *
 * Técnica: uma `extrusao` de eixo z do contorno em Z (corpo grosso com a aba de cima e o pé), um furo vertical por `subtrair` de um
 * cilindro em y; o parafuso é um `unir` de haste (cilindro) e cabeça allen (extrusão de círculo com furo sextavado); a porca é uma
 * `extrusao` de retângulo com furo circular.
 */

export const TABELA = {
  /* A CONFIRMAR: 32,5 mm, o meio da faixa de 30 a 35 mm que o grampo aceita; a moldura de 30 mm fica com folga de 2,5 mm. */
  alturaDaMoldura: 32.5,
  /* A CONFIRMAR: corpo (espessura da parede, que leva o furo do parafuso), pé para fora, espessura da chapa da aba e do pé, aba de cima sobre a moldura e largura no trilho. */
  parede: 12,
  aba: 30,
  espessuraDaAba: 3,
  gancho: 10,
  comprimento: 50,
  /* Altura da moldura do painel que o grampo aperta, para a porta na metade dela. */
  molduraDoPainel: 30,
  /* A CONFIRMAR: o apoio, a altura do topo do perfil no referencial do grampo (a haste do parafuso passa dele até a porca, abaixo). */
  apoio: 10,
  /* A CONFIRMAR: espessura das abas de cima do canal do perfil, por baixo das quais a porca de canal encosta. */
  abaDoPerfil: 2,
  /* A CONFIRMAR: parafuso allen M6, cabeça de 10 mm de diâmetro e 6 mm de altura, chave de 5 mm no soquete, folga do furo do corpo. */
  raioDoParafuso: 3,
  raioDaCabeca: 5,
  alturaDaCabeca: 6,
  chaveDoSoquete: 5,
  folgaDoFuro: 0.25,
  /* A CONFIRMAR: porca de canal que corre no T do perfil: ao longo do trilho, atravessada a ele e a altura. */
  portaAoLongo: 10,
  portaAtravessada: 16,
  portaAltura: 6,
  lados: 24,
};

export const MATERIAIS = {
  aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 },
  inox: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
};

const m = (mm) => mm / 1000;
const ID = { grampo: 100, furo: 101, furado: 102, haste: 103, cabeca: 104, parafuso: 105, porca: 106 };

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [ID.furo, ID.haste].map((id) => [`cil${id}`, cilindroInteiro(id)]);
const alias = (id) => ({ alias: `cil${id}` });

export function derivar(t = TABELA) {
  const y0 = t.apoio;
  const y1 = y0 + t.alturaDaMoldura;
  const y2 = y1 + t.espessuraDaAba;
  const xFuro = t.parede / 2;
  /* Contorno em (x, y): o corpo grosso de x = 0 a `parede`, o pé para +x embaixo e a aba de cima para -x em cima. */
  const contorno = [
    [0, y0], [t.aba, y0], [t.aba, y0 + t.espessuraDaAba], [t.parede, y0 + t.espessuraDaAba], [t.parede, y2], [-t.gancho, y2], [-t.gancho, y1], [0, y1],
  ];
  const R = t.chaveDoSoquete / Math.sqrt(3);
  const soquete = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  /* A porca de canal encosta por baixo das abas do perfil: o topo dela fica `abaDoPerfil` abaixo do topo do perfil. */
  const topoDaPorca = t.apoio - t.abaDoPerfil;
  return { contorno, y0, y1, y2, xFuro, soquete, topoDaPorca, baseDaPorca: topoDaPorca - t.portaAltura };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: a face de dentro da parede, que encosta na moldura do painel (na metade da altura dela), e a ponta do pé, onde o grampo
   vizinho do outro painel encosta a dele quando os dois ficam lado a lado. */
export function portas(t = TABELA) {
  return {
    noPainel: { forma: 'plano', papel: 'apoia', ponto: [0, t.apoio + t.molduraDoPainel / 2, 0], normal: [-1, 0, 0], extensao: [t.molduraDoPainel, t.comprimento], referencia: [0, 1, 0] },
    pontaDaAba: { forma: 'plano', papel: 'recebe', ponto: [t.aba, t.apoio + t.espessuraDaAba / 2, 0], normal: [1, 0, 0], extensao: [t.espessuraDaAba, t.comprimento], referencia: [0, 1, 0] },
  };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  /* Em eixo z o ponto [u, v] do perfil vai para x = u e y = -v: o contorno entra com o y trocado de sinal e na ordem inversa. */
  passos.push(['extrusao', { origemId: ID.grampo, eixo: 'z', altura: m(t.comprimento), perfil: D.contorno.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [0, 0, m(-t.comprimento / 2)] }]);
  /* O furo do parafuso: um cilindro vertical por todo o corpo, do pé à aba de cima. */
  passos.push(['cilindro', {
    origemId: ID.furo, raio: m(t.raioDoParafuso + t.folgaDoFuro), altura: m(D.y2 - D.y0 + 2), lados: t.lados, em: [m(D.xFuro), m(D.y0 - 1), 0],
  }]);
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.grampo } }, alias(ID.furo)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  /* O parafuso allen: a haste vai da ponta (y = 0) até a metade da cabeça, para o `unir` fechar um sólido só e o soquete ter fundo. */
  passos.push(['cilindro', { origemId: ID.haste, raio: m(t.raioDoParafuso), altura: m(D.y2 + t.alturaDaCabeca / 2), lados: t.lados, em: [m(D.xFuro), 0, 0] }]);
  passos.push(['extrusao', {
    origemId: ID.cabeca, altura: m(t.alturaDaCabeca), segmentosArco: t.lados / 4,
    perfil: { circulo: { raio: m(t.raioDaCabeca), centro: [0, 0] } }, furos: [D.soquete.map(([u, v]) => [m(u), m(v)])],
    em: [m(D.xFuro), m(D.y2), 0],
  }]);
  passos.push(['unir', { origemId: ID.parafuso, solidos: [alias(ID.haste), { origem: { op: 'extrusao', id: ID.cabeca } }] }]);
  const sel = { origem: { op: 'unir', id: ID.parafuso } };
  passos.push(['parte', { nome: 'parafuso', sel }], ['material', { usa: 'inox', sel }]);

  /* A porca de canal: retângulo com furo para a haste, sob as abas do perfil. */
  passos.push(['extrusao', {
    origemId: ID.porca, altura: m(t.portaAltura), segmentosArco: t.lados / 4,
    perfil: { retangulo: { largura: m(t.portaAoLongo), profundidade: m(t.portaAtravessada), centro: [0, 0] } },
    furos: [{ circulo: { raio: m(t.raioDoParafuso), centro: [0, 0] } }],
    em: [m(D.xFuro), m(D.baseDaPorca), 0],
  }]);
  const selPorca = { origem: { op: 'extrusao', id: ID.porca } };
  passos.push(['parte', { nome: 'porca', sel: selPorca }], ['material', { usa: 'inox', sel: selPorca }]);
  publicar(passos, portas(t), { op: 'subtrair', id: ID.furado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/grampo-ponta-30', desc: 'grampo de ponta em Z de alumínio para moldura de 30 a 35 mm, com parafuso allen de inox e porca de canal' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'ponta de baixo do parafuso; a face da parede voltada para o painel em x = 0 (painel em -x), o trilho ao longo de x, a largura em z; y para cima' },
  PLANO: {
    objeto: 'grampo de ponta em Z, de alumínio, para moldura de painel de 30 a 35 mm de altura, com parafuso allen vertical pela parte de cima e porca de canal embaixo',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'altura da moldura que o grampo aperta', milimetros: 32.5 },
    partes: [
      { nome: 'corpo', forma: 'perfil de alumínio em Z de 50 mm de largura: corpo de 12 mm de espessura e 32,5 mm de altura útil com furo vertical, aba de cima de 10 mm para o lado do painel, pé de 30 mm para fora embaixo', tecnica: 'extrusão de eixo z do contorno em Z; furo vertical por subtrair' },
      { nome: 'parafuso', forma: 'parafuso allen de inox M6, cabeça cilíndrica de 10 mm com soquete sextavado sobre a aba de cima, haste descendo pelo corpo e pelo pé até a porca', tecnica: 'unir de cilindro (haste) e extrusão de círculo com furo sextavado (cabeça)' },
      { nome: 'porca', forma: 'porca de canal retangular de 10 por 16 por 6 mm, furada para a haste, sob o pé, de onde corre no canal em T do perfil', tecnica: 'extrusão de retângulo com furo circular' },
    ],
    criteriosDeReprovacao: [
      'gancho e pé do mesmo lado da parede, formando U ou C, e não Z',
      'altura entre o pé e a face de baixo da aba de cima diferente de 32,5 mm',
      'parafuso no pé, e não pela parte de cima junto da parede, ou fora do furo',
      'cabeça do parafuso sextavada por fora, e não cilíndrica com soquete sextavado (allen)',
      'sem a porca de canal sob o pé, ou porca fora do alinhamento do parafuso',
      'grampo simétrico, com aba de cima nos dois lados, quando é de ponta',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'parafuso'], motivo: 'a cabeça do parafuso assenta na face de cima da aba' },
    { par: ['parafuso', 'porca'], motivo: 'a haste do parafuso passa pelo furo da porca de canal' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
