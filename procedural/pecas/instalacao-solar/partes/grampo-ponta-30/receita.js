/* instalacao-solar/grampo-ponta-30 — o grampo em "Z" de ponta para moldura de 30 a 35 mm, com um parafuso.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 4 na obra, os dois lados do painel de 30 mm (2 por lado, um em cada trilho). O grampo prende
 * um painel só, pelo lado de fora dele: o gancho de cima aperta o topo da moldura, a parede sobe rente à moldura e a aba de
 * baixo, para fora, assenta no topo do perfil e leva o parafuso que desce até o canal do trilho.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a ponta de baixo do parafuso, que entra no canal do perfil), o grampo
 * centrado em z (ao longo do trilho). Em x, a face da parede voltada para o painel fica em x = 0, o painel e o gancho do lado de
 * -x e a aba e o parafuso do lado de +x. A aba assenta em y = `apoio`, o topo do perfil, e a face de baixo do gancho fica em
 * y = `apoio` + `alturaDaMoldura`, o topo da moldura.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o grampo): a altura de 32,5 mm entre a aba e o gancho (o meio da faixa de 30 a 35 mm do documento da pessoa), a parede de 3 mm, a aba de 30 mm, o gancho de 10 mm sobre a
 * moldura, o comprimento de 50 mm ao longo do trilho, o apoio de 10 mm e o parafuso de 8 mm com cabeça sextavada de 13 mm.
 *
 * Técnica: uma `extrusao` de eixo z do contorno em Z, um furo de passagem na aba por `subtrair` de um cilindro em y, e o parafuso
 * como `unir` de haste (cilindro) e cabeça (cilindro de seis lados).
 */

export const TABELA = {
  /* A CONFIRMAR: 32,5 mm, o meio da faixa de 30 a 35 mm que o grampo aceita; a moldura de 30 mm fica com folga de 2,5 mm. */
  alturaDaMoldura: 32.5,
  /* A CONFIRMAR: parede, aba para fora, espessura da chapa, gancho sobre a moldura e comprimento no trilho. */
  parede: 3,
  aba: 30,
  espessuraDaAba: 3,
  gancho: 10,
  comprimento: 50,
  /* Altura da moldura do painel que o grampo aperta, para a porta na metade dela. */
  molduraDoPainel: 30,
  /* A CONFIRMAR: a altura do topo do perfil, onde a aba assenta. */
  apoio: 10,
  /* A CONFIRMAR: parafuso M8, cabeça de 13 mm entre faces e 5 mm de altura, folga do furo da aba. */
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
  const y0 = t.apoio;
  const y1 = y0 + t.alturaDaMoldura;
  const y2 = y1 + t.espessuraDaAba;
  const xFuro = t.parede + (t.aba - t.parede) / 2;
  /* Contorno em (x, y): a parede de x = 0 a `parede`, a aba para +x embaixo e o gancho para -x em cima. */
  const contorno = [
    [0, y0], [t.aba, y0], [t.aba, y0 + t.espessuraDaAba], [t.parede, y0 + t.espessuraDaAba], [t.parede, y2], [-t.gancho, y2], [-t.gancho, y1], [0, y1],
  ];
  return { contorno, y0, y1, y2, xFuro, R: t.chaveDaCabeca / Math.sqrt(3), topoDaAba: y0 + t.espessuraDaAba };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: a face de dentro da parede, que encosta na moldura do painel (na metade da altura dela), e a ponta da aba, onde o grampo
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
  passos.push(['cilindro', {
    origemId: ID.furo, raio: m(t.raioDoParafuso + t.folgaDoFuro), altura: m(t.espessuraDaAba + 2), lados: t.lados, em: [m(D.xFuro), m(D.y0 - 1), 0],
  }]);
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.grampo } }, alias(ID.furo)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  /* O parafuso: a haste vai da ponta (y = 0) até 2 mm dentro da cabeça, para o `unir` fechar um sólido só. */
  passos.push(['cilindro', { origemId: ID.haste, raio: m(t.raioDoParafuso), altura: m(D.topoDaAba + 2), lados: t.lados, em: [m(D.xFuro), 0, 0] }]);
  passos.push(['cilindro', { origemId: ID.cabeca, raio: m(D.R), altura: m(t.alturaDaCabeca), lados: 6, em: [m(D.xFuro), m(D.topoDaAba), 0] }]);
  passos.push(['unir', { origemId: ID.parafuso, solidos: [alias(ID.haste), alias(ID.cabeca)] }]);
  const sel = { origem: { op: 'unir', id: ID.parafuso } };
  passos.push(['parte', { nome: 'parafuso', sel }], ['material', { usa: 'inox', sel }]);
  publicar(passos, portas(t), { op: 'subtrair', id: ID.furado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/grampo-ponta-30', desc: 'grampo de ponta em Z de alumínio para moldura de 30 a 35 mm, com um parafuso de inox' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'ponta de baixo do parafuso; a face da parede voltada para o painel em x = 0 (painel em -x), o trilho ao longo de z; y para cima' },
  PLANO: {
    objeto: 'grampo de ponta em Z, de alumínio, para moldura de painel de 30 a 35 mm de altura, com um parafuso de inox',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'altura da moldura que o grampo aperta', milimetros: 32.5 },
    partes: [
      { nome: 'corpo', forma: 'perfil de alumínio em Z de 50 mm de comprimento e 3 mm de chapa: parede de 32,5 mm de altura útil, aba de 30 mm para fora embaixo com furo de passagem, gancho de 10 mm para o lado do painel em cima', tecnica: 'extrusão de eixo z do contorno em Z; furo da aba por subtrair' },
      { nome: 'parafuso', forma: 'parafuso de inox de 8 mm de diâmetro com cabeça sextavada de 13 mm sobre a aba, descendo pelo furo e saindo 10 mm abaixo dela', tecnica: 'unir de cilindro (haste) e cilindro de seis lados (cabeça)' },
    ],
    criteriosDeReprovacao: [
      'gancho e aba do mesmo lado da parede, formando U ou C, e não Z',
      'altura entre a aba e a face de baixo do gancho diferente de 32,5 mm',
      'aba sem o furo de passagem, ou parafuso fora do furo',
      'cabeça do parafuso redonda, e não sextavada',
      'grampo simétrico, com gancho nos dois lados, quando é de ponta',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'parafuso'], motivo: 'a cabeça do parafuso assenta na face de cima da aba' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
