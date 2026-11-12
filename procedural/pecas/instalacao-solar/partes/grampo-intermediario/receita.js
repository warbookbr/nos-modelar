/* instalacao-solar/grampo-intermediario — o grampo em "ômega" que aperta as molduras de dois painéis vizinhos de 40 mm, com um parafuso.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 6 na obra, um em
 * cada trilho entre dois painéis de 40 mm vizinhos. O corpo desce entre as duas molduras, que ficam cerca de 20 mm uma da outra, e
 * a placa de cima, mais larga, aperta o topo das duas. O parafuso passa pela placa e desce pelo vazio do corpo até o canal do perfil.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a ponta de baixo do parafuso, que entra no canal do perfil), o grampo
 * centrado em x (o eixo entre os painéis) e em z (ao longo do trilho). O corpo assenta em y = `apoio`, o topo do perfil, e a placa
 * fica em y = `apoio` + `alturaDaMoldura`, o topo da moldura de 40 mm.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o grampo): o vão de 20 mm entre os painéis, a folga de 1 mm de cada lado do corpo, a
 * parede de 2,5 mm, a placa de 40 mm por 4 mm, o comprimento de 50 mm ao longo do trilho, o apoio de 10 mm (o lábio do perfil
 * mais a parte do parafuso dentro dele) e o parafuso de 8 mm de diâmetro com cabeça sextavada de 13 mm.
 *
 * Técnica: uma `extrusao` de eixo z do contorno em ômega (corpo oco em ∩ com a placa larga por cima), um furo de passagem na placa
 * por `subtrair` de um cilindro em y, e o parafuso como `unir` de haste (cilindro) e cabeça (cilindro de seis lados).
 */

export const TABELA = {
  /* O vão entre as duas molduras e a altura da moldura vizinha, do documento da pessoa. */
  vaoEntrePaineis: 20,
  alturaDaMoldura: 40,
  /* A CONFIRMAR: folga de cada lado do corpo, parede, placa (quanto passa sobre cada moldura e a espessura) e comprimento no trilho. */
  folgaDoCorpo: 1,
  parede: 2.5,
  placaSobreCadaMoldura: 10,
  espessuraDaPlaca: 4,
  comprimento: 50,
  /* A CONFIRMAR: a altura do topo do perfil, onde o corpo assenta. */
  apoio: 10,
  /* A CONFIRMAR: parafuso M8, cabeça de 13 mm entre faces e 5 mm de altura, folga do furo da placa. */
  raioDoParafuso: 4,
  chaveDaCabeca: 13,
  alturaDaCabeca: 5,
  folgaDoFuro: 0.3,
  lados: 24,
};

export const MATERIAIS = {
  aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 },
  inox: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
};

const m = (mm) => mm / 1000;
const ID = { grampo: 100, furo: 101, furado: 102, haste: 103, cabeca: 104, parafuso: 105 };

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [ID.furo, ID.haste, ID.cabeca].map((id) => [`cil${id}`, cilindroInteiro(id)]);
const alias = (id) => ({ alias: `cil${id}` });

export function derivar(t = TABELA) {
  const S = t.vaoEntrePaineis / 2 - t.folgaDoCorpo;
  const Si = S - t.parede;
  const P = t.vaoEntrePaineis / 2 + t.placaSobreCadaMoldura;
  const y0 = t.apoio;
  const y1 = y0 + t.alturaDaMoldura;
  const y2 = y1 + t.espessuraDaPlaca;
  /* Contorno em (x, y): o corpo em ∩ de largura 2S com o vazio de largura 2Si, e a placa de largura 2P no topo, de y1 a y2. */
  const contorno = [
    [-S, y0], [-S, y1], [-P, y1], [-P, y2], [P, y2], [P, y1], [S, y1], [S, y0], [Si, y0], [Si, y1], [-Si, y1], [-Si, y0],
  ];
  return { contorno, y0, y1, y2, Si, R: t.chaveDaCabeca / Math.sqrt(3) };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  /* Em eixo z o ponto [u, v] do perfil vai para x = u e y = -v: o contorno entra com o y trocado de sinal e na ordem inversa. */
  passos.push(['extrusao', { origemId: ID.grampo, eixo: 'z', altura: m(t.comprimento), perfil: D.contorno.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [0, 0, m(-t.comprimento / 2)] }]);
  passos.push(['cilindro', {
    origemId: ID.furo, raio: m(t.raioDoParafuso + t.folgaDoFuro), altura: m(t.espessuraDaPlaca + 2), lados: t.lados, em: [0, m(D.y1 - 1), 0],
  }]);
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.grampo } }, alias(ID.furo)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  /* O parafuso: a haste vai da ponta (y = 0) até 2 mm dentro da cabeça, para o `unir` fechar um sólido só. */
  passos.push(['cilindro', { origemId: ID.haste, raio: m(t.raioDoParafuso), altura: m(D.y2 + 2), lados: t.lados }]);
  passos.push(['cilindro', { origemId: ID.cabeca, raio: m(D.R), altura: m(t.alturaDaCabeca), lados: 6, em: [0, m(D.y2), 0] }]);
  passos.push(['unir', { origemId: ID.parafuso, solidos: [alias(ID.haste), alias(ID.cabeca)] }]);
  const sel = { origem: { op: 'unir', id: ID.parafuso } };
  passos.push(['parte', { nome: 'parafuso', sel }], ['material', { usa: 'inox', sel }]);
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/grampo-intermediario', desc: 'grampo intermediário em ômega de alumínio que aperta as molduras de dois painéis vizinhos de 40 mm, com um parafuso, deixando 20 mm entre eles' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'ponta de baixo do parafuso, no eixo entre os painéis, no meio do comprimento; y para cima, o trilho ao longo de z' },
  PLANO: {
    objeto: 'grampo intermediário em ômega, de alumínio, que aperta as molduras de dois painéis vizinhos de 40 mm de altura, deixando cerca de 20 mm entre eles, com um parafuso de inox',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'vão entre os painéis que o corpo ocupa', milimetros: 20 },
    partes: [
      { nome: 'corpo', forma: 'perfil de alumínio de 50 mm: corpo oco em ∩ de 18 mm de largura e 40 mm de altura, parede de 2,5 mm, aberto embaixo, placa de 40 mm por 4 mm por cima, 10 mm sobre cada moldura, furo de passagem na placa', tecnica: 'extrusão de eixo z do contorno em ômega; furo da placa por subtrair' },
      { nome: 'parafuso', forma: 'parafuso de inox de 8 mm de diâmetro com cabeça sextavada de 13 mm sobre a placa, a haste descendo pelo vazio do corpo e saindo 10 mm abaixo dele', tecnica: 'unir de cilindro (haste) e cilindro de seis lados (cabeça)' },
    ],
    criteriosDeReprovacao: [
      'corpo mais largo que o vão de 20 mm entre os painéis, ou com a placa menor que o corpo',
      'corpo maciço, sem o vazio por onde desce o parafuso, ou fechado embaixo',
      'placa sem o furo de passagem, ou parafuso fora do furo',
      'cabeça do parafuso redonda, e não sextavada',
      'altura da placa fora do topo da moldura de 40 mm (apoio mais 40 mm)',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'parafuso'], motivo: 'a cabeça do parafuso assenta na face de cima da placa' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
