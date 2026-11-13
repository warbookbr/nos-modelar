/* instalacao-solar/grampo-ponta-30 — o grampo de ponta em "Z" para moldura de 30 a 35 mm, com parafuso allen e porca de canal.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 4 na obra, os dois lados do painel de 30 mm (2 por lado, um em cada trilho). O grampo prende
 * um painel só, pelo lado de fora dele: a aba de cima aperta o topo da moldura, a parede desce rente à moldura até o perfil e o pé,
 * para fora, fica sobre o topo do perfil, apoiado na ponta dobrada para baixo. O parafuso allen, com arruela de pressão e arruela lisa,
 * atravessa o pé na vertical e rosca numa porca trapezoidal (martelo) que corre no canal de cima do perfil; apertado, puxa o pé contra o
 * trilho e a aba de cima prensa a moldura. A parede tem um furo redondo. Forma tirada da foto da peça real, de lado (2026-11-12), que fica
 * fora do repositório.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a ponta de baixo do parafuso, dentro do canal do perfil), o grampo
 * centrado em z (atravessado ao trilho). Em x, a face da parede voltada para o painel fica em x = 0, o painel e a aba de cima do lado de
 * -x e o pé do lado de +x. O pé assenta em y = `apoio`, o topo do perfil, e a face de baixo da aba de cima fica em y = `apoio` +
 * `alturaDaMoldura`, o topo da moldura. A porca fica sob as abas do canal: o topo dela em y = `apoio` - a espessura da aba do perfil.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o grampo; só deu a faixa e a foto de lado): a altura entre o pé e a aba de cima, a chapa de
 * 3 mm, o pé de 30 mm com a ponta dobrada de 3 mm, a aba de 10 mm sobre a moldura, os 50 mm de largura, o furo da parede de 8 mm, o apoio de
 * 10 mm, o parafuso M6 com cabeça allen de 10 por 6 mm, as arruelas de 1,5 mm e a porca trapezoidal de 16 por 10 por 6 mm.
 *
 * Técnica: uma `extrusao` de eixo z do contorno em Z de chapa (parede, aba de cima, pé e a ponta dobrada), o furo do pé por `subtrair` de
 * um cilindro em y e o furo redondo da parede por `subtrair` de um cilindro em x; o parafuso é um `unir` de haste e cabeça allen; as
 * arruelas são extrusões de anel; a porca é uma `extrusao` de eixo z do trapézio, com o furo por `subtrair`.
 */

export const TABELA = {
  /* A CONFIRMAR: 32,5 mm, o meio da faixa de 30 a 35 mm que o grampo aceita; a moldura de 30 mm fica com folga de 2,5 mm. */
  alturaDaMoldura: 32.5,
  /* A CONFIRMAR: a chapa (parede, aba de cima e pé), o pé para fora, a ponta dobrada para baixo no fim do pé, a aba de cima sobre a moldura,
     a largura no trilho e o furo redondo da parede. */
  parede: 3,
  aba: 30,
  espessuraDaAba: 3,
  dobra: 3,
  gancho: 10,
  comprimento: 50,
  raioDoFuroDaParede: 4,
  /* A CONFIRMAR: arruela lisa e arruela de pressão sob a cabeça (raio de fora e espessura de cada uma). */
  raioDaArruela: 6,
  espessuraDaArruela: 1.5,
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
  /* A CONFIRMAR: porca trapezoidal (martelo) que corre no canal do perfil: ao longo do trilho, a base larga de cima atravessada a ele, a base
     estreita de baixo e a altura. */
  portaAoLongo: 10,
  portaAtravessada: 16,
  portaBaseDeBaixo: 10,
  portaAltura: 6,
  lados: 24,
};

export const MATERIAIS = {
  aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 },
  inox: { cor: '#cfd3d7', metalicidade: 0.55, aspereza: 0.35 },
};

const m = (mm) => mm / 1000;
const ID = { grampo: 100, furo: 101, furado: 102, haste: 103, cabeca: 104, parafuso: 105, porca: 106, furoParede: 107, vazado: 108, lisa: 109, pressao: 110, furoPorca: 111, porcaFurada: 112 };

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [ID.furo, ID.haste, ID.furoParede, ID.furoPorca].map((id) => [`cil${id}`, cilindroInteiro(id)]);
const alias = (id) => ({ alias: `cil${id}` });

export function derivar(t = TABELA) {
  const e = t.espessuraDaAba;
  const y0 = t.apoio;
  const y1 = y0 + t.alturaDaMoldura;
  const y2 = y1 + e;
  /* O pé fica `dobra` acima do trilho, apoiado na ponta dobrada e no pé da parede; o topo do pé é onde a arruela assenta. */
  const yPe = y0 + t.dobra;
  const topoDoPe = yPe + e;
  const xFuro = (t.parede + t.aba) / 2;
  /* Contorno em (x, y): a parede de chapa de x = 0 a `parede`, o pé para +x com a ponta dobrada para baixo no fim e a aba de cima para -x. */
  const contorno = [
    [0, y0], [t.parede, y0], [t.parede, yPe], [t.aba - e, yPe], [t.aba - e, y0], [t.aba, y0], [t.aba, topoDoPe],
    [t.parede, topoDoPe], [t.parede, y2], [-t.gancho, y2], [-t.gancho, y1], [0, y1],
  ];
  const R = t.chaveDoSoquete / Math.sqrt(3);
  const soquete = [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)]);
  /* A porca encosta por baixo das abas do perfil: o topo dela fica `abaDoPerfil` abaixo do topo do perfil. */
  const topoDaPorca = t.apoio - t.abaDoPerfil;
  const baseDaCabeca = topoDoPe + 2 * t.espessuraDaArruela;
  return { contorno, y0, y1, y2, yPe, topoDoPe, xFuro, soquete, topoDaPorca, baseDaPorca: topoDaPorca - t.portaAltura, baseDaCabeca, yFuroDaParede: (topoDoPe + y1) / 2 };
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
    pontaDaAba: { forma: 'plano', papel: 'recebe', ponto: [t.aba, t.apoio + (t.dobra + t.espessuraDaAba) / 2, 0], normal: [1, 0, 0], extensao: [t.dobra + t.espessuraDaAba, t.comprimento], referencia: [0, 1, 0] },
  };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  /* Em eixo z o ponto [u, v] do perfil vai para x = u e y = -v: o contorno entra com o y trocado de sinal e na ordem inversa. */
  passos.push(['extrusao', { origemId: ID.grampo, eixo: 'z', altura: m(t.comprimento), perfil: D.contorno.map(([x, y]) => [m(x), m(-y)]).reverse(), em: [0, 0, m(-t.comprimento / 2)] }]);
  /* O furo do parafuso atravessa o pé na vertical, e o furo redondo atravessa a parede em x. */
  passos.push(['cilindro', {
    origemId: ID.furo, raio: m(t.raioDoParafuso + t.folgaDoFuro), altura: m(D.topoDoPe - D.y0 + 2), lados: t.lados, em: [m(D.xFuro), m(D.y0 - 1), 0],
  }]);
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.grampo } }, alias(ID.furo)] }]);
  passos.push(['cilindro', { origemId: ID.furoParede, eixo: 'x', raio: m(t.raioDoFuroDaParede), altura: m(t.parede + 2), lados: t.lados, em: [m(-1), m(D.yFuroDaParede), 0] }]);
  passos.push(['subtrair', { origemId: ID.vazado, solidos: [{ origem: { op: 'subtrair', id: ID.furado } }, alias(ID.furoParede)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.vazado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  /* As duas arruelas sobre o pé: a lisa embaixo e a de pressão em cima, anéis em volta da haste. */
  [[ID.lisa, D.topoDoPe], [ID.pressao, D.topoDoPe + t.espessuraDaArruela]].forEach(([id, y]) => {
    passos.push(['extrusao', {
      origemId: id, altura: m(t.espessuraDaArruela), segmentosArco: t.lados / 4,
      perfil: { circulo: { raio: m(t.raioDaArruela), centro: [0, 0] } }, furos: [{ circulo: { raio: m(t.raioDoParafuso + t.folgaDoFuro), centro: [0, 0] } }],
      em: [m(D.xFuro), m(y), 0],
    }]);
    const sel = { origem: { op: 'extrusao', id } };
    passos.push(['parte', { nome: 'arruelas', sel }], ['material', { usa: 'inox', sel }]);
  });

  /* O parafuso allen: a haste vai da ponta (y = 0) até a metade da cabeça, para o `unir` fechar um sólido só e o soquete ter fundo. */
  passos.push(['cilindro', { origemId: ID.haste, raio: m(t.raioDoParafuso), altura: m(D.baseDaCabeca + t.alturaDaCabeca / 2), lados: t.lados, em: [m(D.xFuro), 0, 0] }]);
  passos.push(['extrusao', {
    origemId: ID.cabeca, altura: m(t.alturaDaCabeca), segmentosArco: t.lados / 4,
    perfil: { circulo: { raio: m(t.raioDaCabeca), centro: [0, 0] } }, furos: [D.soquete.map(([u, v]) => [m(u), m(v)])],
    em: [m(D.xFuro), m(D.baseDaCabeca), 0],
  }]);
  passos.push(['unir', { origemId: ID.parafuso, solidos: [alias(ID.haste), { origem: { op: 'extrusao', id: ID.cabeca } }] }]);
  const sel = { origem: { op: 'unir', id: ID.parafuso } };
  passos.push(['parte', { nome: 'parafuso', sel }], ['material', { usa: 'inox', sel }]);

  /* A porca trapezoidal: extrusão em x do trapézio em (z, y), base larga em cima, sob as abas do canal, e furo vertical para a haste. Em eixo x
     o ponto [u, v] do perfil vai para y = -u e z = v. */
  const a = t.portaAtravessada / 2; const b = t.portaBaseDeBaixo / 2;
  const trapezio = [[-a, D.topoDaPorca], [a, D.topoDaPorca], [b, D.baseDaPorca], [-b, D.baseDaPorca]];
  passos.push(['extrusao', { origemId: ID.porca, eixo: 'x', altura: m(t.portaAoLongo), perfil: trapezio.map(([z, y]) => [m(-y), m(z)]), em: [m(D.xFuro - t.portaAoLongo / 2), 0, 0] }]);
  passos.push(['cilindro', { origemId: ID.furoPorca, raio: m(t.raioDoParafuso), altura: m(t.portaAltura + 2), lados: t.lados, em: [m(D.xFuro), m(D.baseDaPorca - 1), 0] }]);
  passos.push(['subtrair', { origemId: ID.porcaFurada, solidos: [{ origem: { op: 'extrusao', id: ID.porca } }, alias(ID.furoPorca)] }]);
  const selPorca = { origem: { op: 'subtrair', id: ID.porcaFurada } };
  passos.push(['parte', { nome: 'porca', sel: selPorca }], ['material', { usa: 'inox', sel: selPorca }]);
  publicar(passos, portas(t), { op: 'subtrair', id: ID.vazado });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/grampo-ponta-30', desc: 'grampo de ponta em Z de alumínio para moldura de 30 a 35 mm, com parafuso allen de inox pelo pé, arruelas e porca trapezoidal' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'ponta de baixo do parafuso; a face da parede voltada para o painel em x = 0 (painel em -x), o trilho ao longo de x, a largura em z; y para cima' },
  PLANO: {
    objeto: 'grampo de ponta em Z, de alumínio, para moldura de painel de 30 a 35 mm de altura, com parafuso allen vertical pelo pé, arruelas e porca trapezoidal no canal do perfil',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'altura da moldura que o grampo aperta', milimetros: 32.5 },
    partes: [
      { nome: 'corpo', forma: 'chapa de alumínio em Z de 50 mm de largura e 3 mm de espessura: parede de 32,5 mm de altura útil com furo redondo, aba de cima de 10 mm para o lado do painel, pé de 30 mm para fora com furo vertical e ponta dobrada para baixo', tecnica: 'extrusão de eixo z do contorno em Z; furos do pé e da parede por subtrair' },
      { nome: 'parafuso', forma: 'parafuso allen de inox M6, cabeça cilíndrica de 10 mm com soquete sextavado sobre as arruelas, haste descendo pelo furo do pé até a porca', tecnica: 'unir de cilindro (haste) e extrusão de círculo com furo sextavado (cabeça)' },
      { nome: 'arruelas', forma: 'arruela lisa e arruela de pressão de inox, anéis de 12 mm de diâmetro e 1,5 mm, empilhadas sobre o pé, em volta da haste', tecnica: 'duas extrusões de anel' },
      { nome: 'porca', forma: 'porca trapezoidal (martelo) de 10 mm ao longo do trilho, 16 mm em cima e 10 embaixo, 6 de altura, furada para a haste, sob as abas do canal do perfil', tecnica: 'extrusão de eixo x do trapézio com furo por subtrair' },
    ],
    criteriosDeReprovacao: [
      'gancho e pé do mesmo lado da parede, formando U ou C, e não Z',
      'altura entre o pé e a face de baixo da aba de cima diferente de 32,5 mm',
      'parafuso pela parte de cima junto da parede, e não atravessando o pé, ou fora do furo',
      'pé sem a ponta dobrada para baixo, ou parede sem o furo redondo',
      'sem as duas arruelas entre a cabeça e o pé',
      'cabeça do parafuso sextavada por fora, e não cilíndrica com soquete sextavado (allen)',
      'sem a porca trapezoidal sob o pé, ou porca fora do alinhamento do parafuso',
      'grampo simétrico, com aba de cima nos dois lados, quando é de ponta',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'arruelas'], motivo: 'a arruela lisa assenta na face de cima do pé' },
    { par: ['arruelas', 'parafuso'], motivo: 'a cabeça do parafuso assenta na arruela de pressão' },
    { par: ['parafuso', 'porca'], motivo: 'a haste do parafuso passa pelo furo da porca trapezoidal' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
