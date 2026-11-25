/* braco-de-prova/transmissao — as polias GT2 de 20 e 80 dentes e a correia de 6 mm do cotovelo, à mostra dentro do U do
 * primeiro elo.
 *
 * Oitava etapa da montagem `braco-de-prova/montagem.json`. Componentes do pedido inicial da mecatrônica: polias GT2 de 20 e
 * 80 dentes, com diâmetros primitivos de 12,73 e 50,93 mm, e correia de 6 mm. A polia pequena vai no eixo de 5 mm do NEMA 17
 * (furo de 5,1 mm), a grande no eixo de 8 mm do cotovelo (furo de 8,1 mm), com a faixa da correia centrada no plano do braço;
 * a distância entre os eixos é de 70 mm (do NEMA 17 a 80 mm do ombro até o cotovelo a 150). As polias saem da família
 * `polia-e-correia`, perfis `gt2-20` (com flanges, cubo de 16 × 7 mm) e `gt2-80` (sem flanges, cubo de 22 × 8 mm), com os
 * dentes; só o furo muda do perfil, para a folga do encaixe. A família não tem correia: a correia, de 1,5 mm de espessura
 * (estimativa), assenta no diâmetro externo das polias e segue as duas tangentes externas.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`).
 *
 * Técnica: as polias são a chamada da família, giradas e levadas ao eixo; a correia é a união de dois anéis (cilindro menos cilindro) com
 * as duas tangentes (caixas giradas no ângulo da tangente e levadas ao meio dela).
 *
 * Portas: `furoDaPoliaPequena` (cilindro interno, eixo +z, centro na face do NEMA 17), que vai no `eixo` do motor do
 * cotovelo, e `furoDaPoliaGrande` (cilindro interno, eixo +z), onde passa o eixo do cotovelo.
 */
import { m, porta, MATERIAIS as CORES } from '../../comum/blocos.mjs';
import { chamar, criarRegistroDeFamilias } from '../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../nucleo/composicoes.js';

export const TABELA = {
  alturaDoEixo: 140,
  eixoDoMotor: 80,
  cotovelo: 150,
  /* Face do NEMA 17 (face de fora da parede de trás do primeiro elo), de onde sai o eixo dele. */
  faceDoMotor: -26,
  diametroDaPoliaPequena: 12.73,
  diametroDaPoliaGrande: 50.93,
  /* Os perfis aprovados da família `polia-e-correia`; o furo leva a folga de 0,05 mm no raio do encaixe da montagem. */
  perfilPequena: 'gt2-20',
  perfilGrande: 'gt2-80',
  furoPequeno: 5.1,
  furoGrande: 8.1,
  /* Diferença da linha primitiva da GT2 (a da família): a correia assenta no externo, 0,254 mm dentro do primitivo. */
  diferencaPrimitiva: 0.254,
  larguraDaCorreia: 6,
  espessuraDaCorreia: 1.5,
};

export const MATERIAIS = CORES;

const ID_CORREIA = 900;

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* A polia da família é um corpo de revolução em torno de y, com o cubo de y 0 ao comprimento do cubo e a faixa da correia
   acima dele; a faixa é centrada no plano do braço (z 0) por um quarto de volta em x (y vira +z) e uma translação, com o cubo para trás, do lado do motor. */
function polia(t, id, perfil, furo, x) {
  const familia = familias().obter('polia-e-correia');
  const p = familia.contrato.perfis[perfil].parametros;
  const chamada = chamar(familia, id, p);
  const passos = expandirChamadasDeComposicao(familias().registroComposicoes, [chamada]).passos;
  /* O comprimento é o topo do perfil da revolução; a faixa (com as flanges, se houver) fica entre o cubo e o topo. */
  const perfilDoTorno = passos.find(([op]) => op === 'lathe')[1].perfil;
  const comprimento = Math.max(...perfilDoTorno.map(([, yy]) => yy)) * 1000;
  const meioDaFaixa = (p.comprimentoDoCubo + comprimento) / 2;
  return { p, passos, meioDaFaixa, comprimento, x, furo, primitivo: (p.dentes * 2) / Math.PI };
}

export function derivar(t = TABELA) {
  const pequena = polia(t, 'polia-pequena', t.perfilPequena, t.furoPequeno, t.eixoDoMotor);
  const grande = polia(t, 'polia-grande', t.perfilGrande, t.furoGrande, t.cotovelo);
  /* As tangentes externas: com r1 < r2 e d entre os centros, sen(a) = (r2 − r1)/d; o ponto de tangência de cima é o centro
     mais r·(−sen a, cos a) e o de baixo o centro mais r·(−sen a, −cos a). A correia assenta no diâmetro externo. */
  const y = t.alturaDoEixo;
  const r1 = pequena.primitivo / 2 - t.diferencaPrimitiva;
  const r2 = grande.primitivo / 2 - t.diferencaPrimitiva;
  const d = t.cotovelo - t.eixoDoMotor;
  const a = Math.asin((r2 - r1) / d);
  const comprimento = Math.sqrt(d * d - (r2 - r1) ** 2);
  const meio = (sinal) => {
    const p1 = [t.eixoDoMotor - r1 * Math.sin(a), y + sinal * r1 * Math.cos(a)];
    const p2 = [t.cotovelo - r2 * Math.sin(a), y + sinal * r2 * Math.cos(a)];
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  };
  const correia = { r1, r2, a, comprimento, meioDeCima: meio(1), meioDeBaixo: meio(-1) };
  return { polias: { poliaPequena: pequena, poliaGrande: grande }, correia };
}

/* Os ids locais da família (de 10 a 30) somam a base de cada polia. */
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  return v;
};
const BASE = { poliaPequena: 100, poliaGrande: 200 };

export const ALIASES = [
  ...Object.entries(BASE).map(([nome, base]) => [`furo${nome}`, { unir: [
    { origem: { op: 'cilindro', id: base + 40 } },
    { origem: { op: 'cilindro', id: base + 40, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: base + 40, tampa: 'topo' } },
  ] }]),
  ...[1, 2, 3, 4].map((k) => [`correia${k}`, { unir: [
    { origem: { op: 'cilindro', id: ID_CORREIA + k } },
    { origem: { op: 'cilindro', id: ID_CORREIA + k, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id: ID_CORREIA + k, tampa: 'topo' } },
  ] }]),
];

export function gerarPassos(t = TABELA) {
  const { polias, correia } = derivar(t);
  const passos = [];
  const y = t.alturaDoEixo;
  const origens = {};
  for (const [nome, pol] of Object.entries(polias)) {
    let sel = null;
    for (const passo of pol.passos) {
      const [op, args] = comBase(passo, BASE[nome]);
      if (op === 'publicarPorta') continue;
      if (op === 'parte') {
        passos.push(['rotaciona', { sel: args.sel, eixo: 'x', graus: 90, pivo: [0, 0, 0] }]);
        passos.push(['transladar', { sel: args.sel, d: [m(pol.x), m(y), m(-pol.meioDaFaixa)] }]);
        /* O furo do perfil é o nominal; o da folga do encaixe é tirado depois, e é dele que sai a porta. */
        const idFuro = BASE[nome] + 40;
        passos.push(['cilindro', { origemId: idFuro, raio: m(pol.furo / 2), altura: m(pol.comprimento + 2), lados: 18, eixo: 'z', em: [m(pol.x), m(y), m(-pol.meioDaFaixa - 1)] }]);
        passos.push(['subtrair', { origemId: idFuro + 1, solidos: [args.sel, { alias: `furo${nome}` }] }]);
        sel = { origem: { op: 'subtrair', id: idFuro + 1 } };
        passos.push(['parte', { nome, sel }]);
        passos.push(['material', { usa: 'aluminio', sel }]);
        continue;
      }
      passos.push([op, args]);
    }
    origens[nome] = sel.origem;
  }
  const w = t.larguraDaCorreia;
  const e = t.espessuraDaCorreia;
  /* O anel de 36 lados circunscreve o externo da polia, para o meio de cada lado não entrar nos dentes. */
  const anel = (k, x, rExterno) => {
    const r = rExterno / Math.cos(Math.PI / 36) + 0.05;
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
  /* Depois do quarto de volta em x, o y da família vira +z: a polia vai de −meioDaFaixa (o lado do cubo, atrás) até
     comprimento − meioDaFaixa, e o furo cobre esse trecho todo. */
  const pp = polias.poliaPequena;
  const pg = polias.poliaGrande;
  passos.push(porta('furoDaPoliaPequena', origens.poliaPequena, {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [t.eixoDoMotor, y, t.faceDoMotor], raio: t.furoPequeno / 2,
    inicio: -pp.meioDaFaixa - t.faceDoMotor, fim: pp.comprimento - pp.meioDaFaixa - t.faceDoMotor,
  }));
  passos.push(porta('furoDaPoliaGrande', origens.poliaGrande, {
    forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [t.cotovelo, y, -pg.meioDaFaixa], raio: t.furoGrande / 2, inicio: 0, fim: pg.comprimento,
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
      { nome: 'poliaPequena', forma: 'polia GT2 de 20 dentes (12,73 mm primitivos) com flanges, no eixo do NEMA 17, furo de 5,1 mm', tecnica: 'família polia-e-correia, perfil gt2-20' },
      { nome: 'poliaGrande', forma: 'polia GT2 de 80 dentes (50,93 mm primitivos) no eixo do cotovelo, furo de 8,1 mm', tecnica: 'família polia-e-correia, perfil gt2-80' },
      { nome: 'correia', forma: 'correia de 6 × 1,5 mm abraçando as duas polias pelas tangentes externas', tecnica: 'união de dois anéis e duas caixas giradas' },
    ],
    criteriosDeReprovacao: [
      'polia com diâmetro primitivo diferente do pedido inicial',
      'correia fora das polias, ou com menos de 2 mm de folga até as paredes e o fundo do primeiro elo',
      'polias ou correia em outra cor que não a do alumínio e a preta',
    ],
  },
  contatos: [],
  /* A correia de 36 lados fica a até 0,05 mm da ponta dos dentes, porque a face reta do anel facetado entraria nos dentes
     da polia de 96 lados; cada polia é presa no eixo dela, e só a montagem as liga. */
  ilhas: [
    { contem: 'poliaPequena', motivo: 'a polia pequena se prende no eixo do NEMA 17, e a correia assenta nela com 0,05 mm de folga' },
    { contem: 'poliaGrande', motivo: 'a polia grande se prende no eixo do cotovelo, e a correia assenta nela com 0,05 mm de folga' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
