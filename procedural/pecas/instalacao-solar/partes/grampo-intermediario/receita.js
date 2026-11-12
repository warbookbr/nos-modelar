/* instalacao-solar/grampo-intermediario — a tampa estriada que aperta as molduras de dois painéis vizinhos de 40 mm, com parafuso allen e porca de canal.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 6 na obra, um em
 * cada trilho entre dois painéis de 40 mm vizinhos. A tampa tem duas asas curtas que apertam o topo da moldura de cada painel e, no meio,
 * um pescoço curto que desce entre as duas molduras, que ficam cerca de 20 mm uma da outra. O parafuso allen passa pelo centro da tampa e do
 * pescoço, desce pelo vão entre os painéis e rosca numa porca de canal que corre no canal em T do perfil, abaixo.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a ponta de baixo do parafuso, dentro do canal do perfil), o grampo
 * centrado em x (o eixo entre os painéis, ao longo do trilho) e em z (atravessado ao trilho). O topo do perfil fica em y = `apoio`, a
 * face de baixo da tampa em y = `apoio` + `alturaDaMoldura`, o topo da moldura de 40 mm, e a porca encosta sob as abas do canal.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o grampo): o vão de 20 mm entre os painéis (do documento da pessoa, "uns 20 mm"), a folga de
 * 1 mm de cada lado do pescoço, o pescoço de 12 mm de altura, a tampa de 40 mm por 4 mm (10 mm sobre cada moldura), os frisos do topo das asas,
 * a largura de 50 mm no trilho, o apoio de 10 mm, o parafuso M6 com cabeça allen de 10 mm por 6 mm e a porca de canal de 16 por 10 por 6 mm.
 *
 * Técnica: uma `extrusao` de eixo z do contorno (tampa com frisos nas asas e pescoço curto), um furo de passagem por `subtrair` de um
 * cilindro em y; o parafuso é um `unir` de haste (cilindro) e cabeça allen (extrusão de círculo com furo sextavado); a porca é uma
 * `extrusao` de retângulo com furo circular.
 */

export const TABELA = {
  /* O vão entre as duas molduras e a altura da moldura vizinha, do documento da pessoa. */
  vaoEntrePaineis: 20,
  alturaDaMoldura: 40,
  /* A CONFIRMAR: folga de cada lado do pescoço, altura do pescoço, tampa (quanto passa sobre cada moldura e a espessura) e largura no trilho. */
  folgaDoCorpo: 1,
  pescoco: 12,
  placaSobreCadaMoldura: 10,
  espessuraDaPlaca: 4,
  comprimento: 50,
  /* A CONFIRMAR: frisos do topo das asas (crista, vale, fundura), do lado de fora de uma faixa lisa onde a cabeça assenta. */
  frisoCrista: 1.5,
  frisoVale: 1.5,
  frisoFundura: 0.5,
  faixaLisa: 6,
  /* A CONFIRMAR: o apoio, a altura do topo do perfil no referencial do grampo, e a espessura das abas de cima do canal do perfil. */
  apoio: 10,
  abaDoPerfil: 2,
  /* A CONFIRMAR: parafuso allen M6, cabeça de 10 mm de diâmetro e 6 mm de altura, chave de 5 mm no soquete, folga do furo. */
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

/* Os frisos de uma face reta: de `a` a `b`, a crista no traçado, o vale `fundura` para o lado `dentro`. Começa na crista em `a`. */
export function frisos(a, b, dentro, crista, vale, fundura) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const em = (pos, prof = 0) => [a[0] + u[0] * pos + dentro[0] * prof, a[1] + u[1] * pos + dentro[1] * prof];
  const pts = [a];
  for (let pos = 0; pos + crista + vale < len - 0.2; pos += crista + vale) {
    pts.push(em(pos + crista), em(pos + crista, fundura), em(pos + crista + vale, fundura), em(pos + crista + vale));
  }
  pts.push(b);
  return pts;
}

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [ID.furo, ID.haste].map((id) => [`cil${id}`, cilindroInteiro(id)]);
const alias = (id) => ({ alias: `cil${id}` });

export function derivar(t = TABELA) {
  const S = t.vaoEntrePaineis / 2 - t.folgaDoCorpo;
  const P = t.vaoEntrePaineis / 2 + t.placaSobreCadaMoldura;
  const y0 = t.apoio;
  const y1 = y0 + t.alturaDaMoldura;
  const y2 = y1 + t.espessuraDaPlaca;
  const fr = (a, b) => frisos(a, b, [0, -1], t.frisoCrista, t.frisoVale, t.frisoFundura);
  const L = t.faixaLisa;
  /* Contorno em (x, y), anti-horário: o pescoço curto de largura 2S sob a tampa de largura 2P, e no topo uma faixa lisa no meio e os frisos nas duas asas. */
  const contorno = [
    [-S, y1 - t.pescoco], [S, y1 - t.pescoco], [S, y1], [P, y1], [P, y2],
    ...fr([P, y2], [L, y2]).slice(1), ...fr([-L, y2], [-P, y2]),
    [-P, y1], [-S, y1],
  ];
  const R = t.chaveDoSoquete / Math.sqrt(3);
  const soquete = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  const topoDaPorca = t.apoio - t.abaDoPerfil;
  return { contorno, S, y0, y1, y2, soquete, topoDaPorca, baseDaPorca: topoDaPorca - t.portaAltura };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: as duas faces do pescoço, que encostam nas molduras dos painéis vizinhos, na metade da altura da moldura. */
export function portas(t = TABELA) {
  const S = t.vaoEntrePaineis / 2 - t.folgaDoCorpo;
  const y = t.apoio + t.alturaDaMoldura / 2;
  const face = (x, papel) => ({ forma: 'plano', papel, ponto: [x, y, 0], normal: [Math.sign(x), 0, 0], extensao: [t.alturaDaMoldura, t.comprimento], referencia: [0, 1, 0] });
  return { faceEsquerda: face(-S, 'apoia'), faceDireita: face(S, 'recebe') };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  /* Em eixo z o ponto [u, v] do perfil vai para x = u e y = -v: o contorno entra com o y trocado de sinal e na ordem inversa. */
  passos.push(['extrusao', { origemId: ID.grampo, eixo: 'z', altura: m(t.comprimento), perfil: D.contorno.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [0, 0, m(-t.comprimento / 2)] }]);
  /* O furo de passagem: um cilindro vertical pelo pescoço e pela tampa. */
  passos.push(['cilindro', {
    origemId: ID.furo, raio: m(t.raioDoParafuso + t.folgaDoFuro), altura: m(D.y2 - (D.y1 - t.pescoco) + 2), lados: t.lados, em: [0, m(D.y1 - t.pescoco - 1), 0],
  }]);
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.grampo } }, alias(ID.furo)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  /* O parafuso allen: a haste vai da ponta (y = 0) até a metade da cabeça, para o `unir` fechar um sólido só e o soquete ter fundo. */
  passos.push(['cilindro', { origemId: ID.haste, raio: m(t.raioDoParafuso), altura: m(D.y2 + t.alturaDaCabeca / 2), lados: t.lados }]);
  passos.push(['extrusao', {
    origemId: ID.cabeca, altura: m(t.alturaDaCabeca), segmentosArco: t.lados / 4,
    perfil: { circulo: { raio: m(t.raioDaCabeca), centro: [0, 0] } }, furos: [D.soquete.map(([u, v]) => [m(u), m(v)])],
    em: [0, m(D.y2), 0],
  }]);
  passos.push(['unir', { origemId: ID.parafuso, solidos: [alias(ID.haste), { origem: { op: 'extrusao', id: ID.cabeca } }] }]);
  const sel = { origem: { op: 'unir', id: ID.parafuso } };
  passos.push(['parte', { nome: 'parafuso', sel }], ['material', { usa: 'inox', sel }]);

  /* A porca de canal: retângulo com furo para a haste, sob as abas do perfil. */
  passos.push(['extrusao', {
    origemId: ID.porca, altura: m(t.portaAltura), segmentosArco: t.lados / 4,
    perfil: { retangulo: { largura: m(t.portaAoLongo), profundidade: m(t.portaAtravessada), centro: [0, 0] } },
    furos: [{ circulo: { raio: m(t.raioDoParafuso), centro: [0, 0] } }],
    em: [0, m(D.baseDaPorca), 0],
  }]);
  const selPorca = { origem: { op: 'extrusao', id: ID.porca } };
  passos.push(['parte', { nome: 'porca', sel: selPorca }], ['material', { usa: 'inox', sel: selPorca }]);
  publicar(passos, portas(t), { op: 'subtrair', id: ID.furado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/grampo-intermediario', desc: 'grampo intermediário de alumínio, tampa estriada com duas asas e pescoço curto entre dois painéis de 40 mm (vão de 20 mm), com parafuso allen de inox e porca de canal' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'ponta de baixo do parafuso, no eixo entre os painéis, no meio da largura; y para cima, o trilho ao longo de x, a largura em z' },
  PLANO: {
    objeto: 'grampo intermediário de alumínio para dois painéis de 40 mm a cerca de 20 mm um do outro: tampa estriada com asas curtas, pescoço curto entre eles, parafuso allen central e porca de canal embaixo',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'vão entre os painéis que o pescoço ocupa', milimetros: 20 },
    partes: [
      { nome: 'corpo', forma: 'peça de alumínio de 50 mm de largura: tampa de 40 mm por 4 mm com frisos nas duas asas (10 mm sobre cada moldura) e pescoço maciço curto de 18 mm por 12 mm sob o meio dela, com furo vertical central', tecnica: 'extrusão de eixo z do contorno com frisos; furo vertical por subtrair' },
      { nome: 'parafuso', forma: 'parafuso allen de inox M6, cabeça cilíndrica de 10 mm com soquete sextavado sobre a tampa, haste descendo pelo pescoço e pelo vão entre os painéis até a porca de canal', tecnica: 'unir de cilindro (haste) e extrusão de círculo com furo sextavado (cabeça)' },
      { nome: 'porca', forma: 'porca de canal retangular de 10 por 16 por 6 mm, furada para a haste, que corre no canal em T do perfil, bem abaixo da tampa', tecnica: 'extrusão de retângulo com furo circular' },
    ],
    criteriosDeReprovacao: [
      'duas paredes altas descendo até o perfil, e não o pescoço curto no meio',
      'pescoço mais largo que o vão de 20 mm entre os painéis, ou tampa menor que o pescoço',
      'tampa lisa, sem os frisos nas asas',
      'parafuso fora do furo, ou cabeça sextavada por fora, e não cilíndrica com soquete sextavado (allen)',
      'sem a porca de canal embaixo, ou fora do alinhamento do parafuso',
      'altura da tampa fora do topo da moldura de 40 mm (apoio mais 40 mm)',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'parafuso'], motivo: 'a cabeça do parafuso assenta na face de cima da tampa' },
    { par: ['parafuso', 'porca'], motivo: 'a haste do parafuso passa pelo furo da porca de canal' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
