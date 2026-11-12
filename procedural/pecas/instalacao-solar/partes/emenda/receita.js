/* instalacao-solar/emenda — a peça que entra dentro de dois perfis para uni-los, com dois parafusos.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`): são 6 na obra,
 * 3 por linha de trilho. Metade do comprimento entra em cada perfil e os dois parafusos, um de cada lado do meio, a prendem nele.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo do corpo), o corpo ao longo de x, de 0 a `comprimento`,
 * centrado em z. Os parafusos ficam em cima, com a cabeça sextavada de y = `altura` a `altura` + `cabeca`.
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu a emenda): o comprimento de 150 mm, a seção de 26 por 30 mm que cabe no vazio do
 * perfil (a tabela do `perfil` deixa 27 mm de largura útil entre os rasgos), a parede do tubo, o afastamento e a bitola dos parafusos.
 *
 * Técnica: o corpo é uma `extrusao` de eixo x de um tubo retangular, com dois furos de passagem abertos por `subtrair` de cilindros
 * em y; cada parafuso é um `unir` do corpo roscado (cilindro) e da cabeça sextavada (cilindro de seis lados). A haste do parafuso
 * passa pelo furo com folga de 0,2 mm e a cabeça assenta na face de cima do corpo.
 */

export const TABELA = {
  /* A CONFIRMAR: comprimento e seção externa. */
  comprimento: 150,
  largura: 26,
  altura: 30,
  /* A CONFIRMAR: parede do tubo. */
  parede: 4,
  /* A CONFIRMAR: parafusos, a metade do afastamento entre eles, o raio da haste, a folga do furo e a cabeça. */
  afastamentoDosParafusos: 90,
  raioDoParafuso: 3,
  folgaDoFuro: 0.2,
  compDaHaste: 16,
  raioDaCabeca: 5.8,
  cabeca: 4,
  ladosDoParafuso: 24,
};

export const MATERIAIS = {
  aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 },
  inox: { cor: '#9ea3a8', metalicidade: 0.95, aspereza: 0.25 },
};

const m = (mm) => mm / 1000;
const ID = { corpo: 100, furoA: 101, furoB: 102, furado: 103, hasteA: 104, cabecaA: 105, parafusoA: 106, hasteB: 107, cabecaB: 108, parafusoB: 109 };

/* O cilindro inteiro (lateral e as duas tampas) como seleção nomeada, para as booleanas. */
const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [ID.furoA, ID.furoB, ID.hasteA, ID.cabecaA, ID.hasteB, ID.cabecaB].map((id) => [`cil${id}`, cilindroInteiro(id)]);
const alias = (id) => ({ alias: `cil${id}` });

export function derivar(t = TABELA) {
  const xs = [t.comprimento / 2 - t.afastamentoDosParafusos / 2, t.comprimento / 2 + t.afastamentoDosParafusos / 2];
  return {
    xs,
    /* Em eixo x o ponto [u, v] vai para y = -u e z = v. */
    tuboFora: { largura: t.altura, profundidade: t.largura, centro: [-t.altura / 2, 0] },
    tuboVazio: { largura: t.altura - 2 * t.parede, profundidade: t.largura - 2 * t.parede, centro: [-t.altura / 2, 0] },
    yDaHaste: t.altura - t.compDaHaste,
  };
}

export function gerarPassos(t = TABELA) {
  const D = derivar(t);
  const passos = [];
  const ret = (r) => ({ retangulo: { largura: m(r.largura), profundidade: m(r.profundidade), centro: r.centro.map(m) } });
  passos.push(['extrusao', { origemId: ID.corpo, eixo: 'x', altura: m(t.comprimento), perfil: ret(D.tuboFora), furos: [ret(D.tuboVazio)] }]);
  /* Os furos de passagem: cilindros em y que atravessam a parede de cima. */
  const furos = [ID.furoA, ID.furoB];
  furos.forEach((id, k) => passos.push(['cilindro', {
    origemId: id, raio: m(t.raioDoParafuso + t.folgaDoFuro), altura: m(t.compDaHaste + 2), lados: t.ladosDoParafuso,
    em: [m(D.xs[k]), m(D.yDaHaste), 0],
  }]));
  passos.push(['subtrair', { origemId: ID.furado, solidos: [{ origem: { op: 'extrusao', id: ID.corpo } }, ...furos.map(alias)] }]);
  const corpo = { origem: { op: 'subtrair', id: ID.furado } };
  passos.push(['parte', { nome: 'corpo', sel: corpo }], ['material', { usa: 'aluminio', sel: corpo }]);

  [['A', ID.hasteA, ID.cabecaA, ID.parafusoA], ['B', ID.hasteB, ID.cabecaB, ID.parafusoB]].forEach(([letra, haste, cabeca, parafuso], k) => {
    /* A haste entra 2 mm na cabeça, para o `unir` fechar um sólido só. */
    passos.push(['cilindro', { origemId: haste, raio: m(t.raioDoParafuso), altura: m(t.compDaHaste + 2), lados: t.ladosDoParafuso, em: [m(D.xs[k]), m(D.yDaHaste), 0] }]);
    passos.push(['cilindro', { origemId: cabeca, raio: m(t.raioDaCabeca), altura: m(t.cabeca), lados: 6, em: [m(D.xs[k]), m(t.altura), 0] }]);
    passos.push(['unir', { origemId: parafuso, solidos: [alias(haste), alias(cabeca)] }]);
    const sel = { origem: { op: 'unir', id: parafuso } };
    passos.push(['parte', { nome: `parafuso${letra}`, sel }], ['material', { usa: 'inox', sel }]);
  });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/emenda', desc: 'emenda de alumínio de 150 mm que entra dentro de dois perfis para uni-los, com dois parafusos de cabeça sextavada' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'face de baixo do corpo, na ponta de x = 0, centrada em z; y para cima, o corpo ao longo de +x, os parafusos em cima' },
  PLANO: {
    objeto: 'emenda de alumínio de 150 mm que encaixa dentro de dois perfis de trilho para uni-los, com dois parafusos de inox',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento da emenda', milimetros: 150 },
    partes: [
      { nome: 'corpo', forma: 'tubo retangular de alumínio de 150 mm de comprimento, 26 mm de largura e 30 mm de altura, parede de 4 mm, vazado de ponta a ponta, com dois furos de passagem na parede de cima, 90 mm um do outro, simétricos em relação ao meio', tecnica: 'extrusão de eixo x de tubo retangular, furos por subtrair de cilindros em y' },
      { nome: 'parafusoA', forma: 'parafuso de inox de 6 mm de diâmetro com cabeça sextavada de 4 mm, a haste de 16 mm descendo pelo furo do corpo, num lado do meio', tecnica: 'unir de cilindro (haste) e cilindro de seis lados (cabeça)' },
      { nome: 'parafusoB', forma: 'segundo parafuso, igual ao primeiro, no outro lado do meio', tecnica: 'unir de cilindro (haste) e cilindro de seis lados (cabeça)' },
    ],
    criteriosDeReprovacao: [
      'comprimento diferente de 150 mm',
      'seção que não cabe no vazio do perfil (mais larga que 27 mm), ou maciça, sem o vazio',
      'só um parafuso, ou parafusos fora dos furos do corpo',
      'cabeça do parafuso redonda, e não sextavada',
      'parafusos fora de posição simétrica em relação ao meio do corpo',
      'qualquer parte abaixo do chão (y negativo)',
    ],
  },
  contatos: [
    { par: ['corpo', 'parafusoA'], motivo: 'a cabeça do parafuso assenta na face de cima do corpo' },
    { par: ['corpo', 'parafusoB'], motivo: 'a cabeça do parafuso assenta na face de cima do corpo' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
