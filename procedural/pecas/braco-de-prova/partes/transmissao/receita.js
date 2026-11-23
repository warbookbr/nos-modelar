/* braco-de-prova/transmissao — as polias GT2 de 20 e 80 dentes e a correia de 6 mm do cotovelo, à mostra dentro do U do
 * primeiro elo.
 *
 * Oitava etapa da montagem `braco-de-prova/montagem.json`. Componentes do pedido inicial da mecatrônica: polias GT2 de 20 e
 * 80 dentes, com diâmetros primitivos de 12,73 e 50,93 mm, e correia de 6 mm. A polia pequena vai no eixo de 5 mm do NEMA 17
 * (furo de 5,1 mm), a grande no eixo de 8 mm do cotovelo (furo de 8,1 mm), as duas com 8 mm de largura e centradas no plano
 * do braço; a distância entre os eixos é de 70 mm (do NEMA 17 a 80 mm do ombro até o cotovelo a 150). Os dentes não são
 * modelados: a polia é o cilindro do diâmetro primitivo, e a correia, de 1,5 mm de espessura (estimativa), abraça as duas
 * polias por fora e segue as duas tangentes externas.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`).
 *
 * Técnica: as polias são cilindros com furo por subtração; a correia é a união de dois anéis (cilindro menos cilindro) com
 * as duas tangentes (caixas giradas no ângulo da tangente e levadas ao meio dela).
 *
 * Portas: `furoDaPoliaPequena` (cilindro interno, eixo +z, centro na face do NEMA 17), que vai no `eixo` do motor do
 * cotovelo, e `furoDaPoliaGrande` (cilindro interno, eixo +z), onde passa o eixo do cotovelo.
 */
import { m, passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../comum/blocos.mjs';

export const TABELA = {
  alturaDoEixo: 140,
  eixoDoMotor: 80,
  cotovelo: 150,
  /* Face do NEMA 17 (face de fora da parede de trás do primeiro elo), de onde sai o eixo dele. */
  faceDoMotor: -26,
  diametroDaPoliaPequena: 12.73,
  diametroDaPoliaGrande: 50.93,
  larguraDaPolia: 8,
  raioDoFuroPequeno: 2.55,
  raioDoFuroGrande: 4.05,
  larguraDaCorreia: 6,
  espessuraDaCorreia: 1.5,
};

export const MATERIAIS = CORES;

const ID_CORREIA = 900;

export function derivar(t = TABELA) {
  const y = t.alturaDoEixo;
  const z0 = -t.larguraDaPolia / 2;
  const furo = (x, raio) => ({ eixo: 'z', base: [x, y, z0 - 1], comprimento: t.larguraDaPolia + 2, raio, lados: 18 });
  const formas = [
    { nome: 'poliaPequena', material: 'aluminio', eixo: 'z', base: [t.eixoDoMotor, y, z0], comprimento: t.larguraDaPolia, raio: t.diametroDaPoliaPequena / 2, lados: 36, furos: [furo(t.eixoDoMotor, t.raioDoFuroPequeno)] },
    { nome: 'poliaGrande', material: 'aluminio', eixo: 'z', base: [t.cotovelo, y, z0], comprimento: t.larguraDaPolia, raio: t.diametroDaPoliaGrande / 2, lados: 36, furos: [furo(t.cotovelo, t.raioDoFuroGrande)] },
  ];
  /* As tangentes externas: com r1 < r2 e d entre os centros, sen(a) = (r2 − r1)/d; o ponto de tangência de cima é o centro
     mais r·(−sen a, cos a) e o de baixo o centro mais r·(−sen a, −cos a). */
  const r1 = t.diametroDaPoliaPequena / 2;
  const r2 = t.diametroDaPoliaGrande / 2;
  const d = t.cotovelo - t.eixoDoMotor;
  const a = Math.asin((r2 - r1) / d);
  const comprimento = Math.sqrt(d * d - (r2 - r1) ** 2);
  const meio = (sinal) => {
    const p1 = [t.eixoDoMotor - r1 * Math.sin(a), y + sinal * r1 * Math.cos(a)];
    const p2 = [t.cotovelo - r2 * Math.sin(a), y + sinal * r2 * Math.cos(a)];
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  };
  const correia = { r1, r2, a, comprimento, meioDeCima: meio(1), meioDeBaixo: meio(-1) };
  return { formas, correia };
}

export const ALIASES = [
  ...aliasesDasFormas(derivar(TABELA).formas),
  ...[1, 2, 3, 4].map((k) => [`correia${k}`, { unir: [
    { origem: { op: 'cilindro', id: ID_CORREIA + k } },
    { origem: { op: 'cilindro', id: ID_CORREIA + k, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: ID_CORREIA + k, tampa: 'topo' } },
  ] }]),
];

export function gerarPassos(t = TABELA) {
  const { formas, correia } = derivar(t);
  const { passos } = passosDasFormas(formas);
  const y = t.alturaDoEixo;
  const w = t.larguraDaCorreia;
  const e = t.espessuraDaCorreia;
  const anel = (k, x, r) => {
    passos.push(['cilindro', { origemId: ID_CORREIA + k, raio: m(r + e), altura: m(w), lados: 36, eixo: 'z', em: [m(x), m(y), m(-w / 2)] }]);
    passos.push(['cilindro', { origemId: ID_CORREIA + k + 1, raio: m(r), altura: m(w + 2), lados: 36, eixo: 'z', em: [m(x), m(y), m(-w / 2 - 1)] }]);
    passos.push(['subtrair', { origemId: ID_CORREIA + 10 + k, solidos: [{ alias: `correia${k}` }, { alias: `correia${k + 1}` }] }]);
    return { origem: { op: 'subtrair', id: ID_CORREIA + 10 + k } };
  };
  const anelPequeno = anel(1, t.eixoDoMotor, correia.r1);
  const anelGrande = anel(3, t.cotovelo, correia.r2);
  const tangente = (id, sinal, centro) => {
    const sel = { origem: { op: 'cubo', id } };
    passos.push(['cubo', { origemId: id, larg: m(correia.comprimento), alt: m(e), prof: m(w), em: [0, sinal > 0 ? 0 : m(-e), 0] }]);
    passos.push(['rotaciona', { sel, eixo: 'z', graus: (sinal * correia.a * 180) / Math.PI, pivo: [0, 0, 0] }]);
    passos.push(['transladar', { sel, d: [m(centro[0]), m(centro[1]), 0] }]);
    return sel;
  };
  const deCima = tangente(ID_CORREIA + 20, 1, correia.meioDeCima);
  const deBaixo = tangente(ID_CORREIA + 21, -1, correia.meioDeBaixo);
  const sel = { origem: { op: 'unir', id: ID_CORREIA + 30 } };
  passos.push(['unir', { origemId: ID_CORREIA + 30, solidos: [anelPequeno, anelGrande, deCima, deBaixo] }]);
  passos.push(['parte', { nome: 'correia', sel }]);
  passos.push(['material', { usa: 'correia', sel }]);
  passos.push(porta('furoDaPoliaPequena', origemDa(formas, 'poliaPequena'), {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [t.eixoDoMotor, y, t.faceDoMotor], raio: t.raioDoFuroPequeno,
    inicio: -t.larguraDaPolia / 2 - t.faceDoMotor, fim: t.larguraDaPolia / 2 - t.faceDoMotor,
  }));
  passos.push(porta('furoDaPoliaGrande', origemDa(formas, 'poliaGrande'), {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [t.cotovelo, y, -t.larguraDaPolia / 2], raio: t.raioDoFuroGrande, inicio: 0, fim: t.larguraDaPolia,
  }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/transmissao', desc: 'transmissão do cotovelo do braço de prova: polias GT2 de 20 e 80 dentes (12,73 e 50,93 mm primitivos) a 70 mm uma da outra e a correia de 6 mm, à mostra dentro do primeiro elo' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'polias GT2 de 20 e 80 dentes e correia de 6 mm entre o NEMA 17 e o eixo do cotovelo',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'diâmetro primitivo da polia grande', milimetros: 50.93 },
    partes: [
      { nome: 'poliaPequena', forma: 'polia de 12,73 mm por 8 mm no eixo do NEMA 17, furo de 5,1 mm', tecnica: 'cilindro com furo por subtração' },
      { nome: 'poliaGrande', forma: 'polia de 50,93 mm por 8 mm no eixo do cotovelo, furo de 8,1 mm', tecnica: 'cilindro com furo por subtração' },
      { nome: 'correia', forma: 'correia de 6 × 1,5 mm abraçando as duas polias pelas tangentes externas', tecnica: 'união de dois anéis e duas caixas giradas' },
    ],
    criteriosDeReprovacao: [
      'polia com diâmetro primitivo diferente do pedido inicial',
      'correia fora das polias, ou com menos de 2 mm de folga até as paredes e o fundo do primeiro elo',
      'polias ou correia em outra cor que não a do alumínio e a preta',
    ],
  },
  contatos: [
    { par: ['correia', 'poliaGrande'], motivo: 'a correia abraça a polia' },
    { par: ['correia', 'poliaPequena'], motivo: 'a correia abraça a polia' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
