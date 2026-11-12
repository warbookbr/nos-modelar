/* carrinho-de-mao/roda — a roda do carrinho de mão pela família `roda-pneu`, perfil `carrinho-de-mao`: o pneu 3.25-8 de Ø 340 e 85 mm
 * de banda, com ombros redondos, no aro de chapa de 8 polegadas, com o disco e o cubo que gira no eixo do chassi.
 *
 * Etapa 4 de 4 da montagem `../../montagem.json` (item 4 das partes do `../../ALINHAMENTO.md`), a única peça com junta: gira em torno
 * do eixo x, no centro do cubo, sem curso. O rascunho aprovado pela pessoa em 2026-11-11 (`../../referencias/carrinho-de-mao.esboco.mjs`)
 * desenhava a roda à mão por revolução; ela sai da família, como o alinhamento pede, com as medidas do rascunho passadas como
 * parâmetro (o perfil traz o pneu de 400, de um 4.00-8). O rascunho chama `montarRoda` daqui.
 *
 * O QUE A FAMÍLIA NÃO COBRE DO RASCUNHO. O cubo do rascunho tem 110 mm de largura (o vão do laço), e a família vai até 0,3 do diâmetro
 * do pneu, 102 mm; a TABELA fica com 102, que a montagem tira do assento do eixo do chassi. O aro do rascunho tem as abas que seguram o talão (até o raio de 106, de 28 a 34 mm do meio),
 * e o da família é um barril reto. O ombro do rascunho tem 26,5 mm na largura, e a família recusa o ombro de mais de 30% da banda
 * (25,5 mm); a TABELA fica com 25,5. A família sempre fura o cubo (de 3 a 12 furos de fixação), que o rascunho não tinha: ficam os
 * quatro furos do perfil, pequenos, no cubo. O eixo, que o rascunho punha com a roda, é do chassi.
 *
 * DE ONDE VEM CADA MEDIDA: a TABELA do `../../ALINHAMENTO.md` (linhas "pneu", "aro" e "eixo") e o rascunho: o talão em Ø 203, o barril
 * do aro de 11,5 mm de parede (do raio 90 ao do talão) e 68 mm de largura (as abas do rascunho), o disco de chapa de 12 mm, o cubo de Ø
 * 52 com o furo do rolamento.
 *
 * O ENCAIXE. A origem é o centro do pneu, com o eixo da roda em x. O furo do cubo é a porta `furoDoCubo`, um cilindro interno da face
 * de dentro do cubo (-x) à de fora; o raio dele é o do eixo do chassi mais a folga do rolamento de 4 mm, e a largura do cubo é o
 * assento do eixo, pelos vínculos da montagem, e a posição põe o furo no assento, com o giro pela `referencia` para cima. A família publica também `eixo`, `assento-do-pneu` e
 * `furos-de-fixacao`.
 *
 * A cadeia: a TABELA em mm; `derivar` leva as medidas aos parâmetros da família (em proporção do diâmetro) e chama a família;
 * `gerarPassos` expande a chamada, que já sai em metro, e acrescenta o sombreamento de cada parte e a porta do furo do cubo.
 * `montarRoda` escreve a mesma roda em mm num estado { passos, topo, origem }, posta no centro, para o rascunho do carrinho. */
import { chamar, criarRegistroDeFamilias } from '../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../nucleo/composicoes.js';
import { TABELA as CHASSI } from '../chassi/receita.js';

export const TABELA = {
  /* o pneu 3.25-8: o diâmetro que fixa a escala e a banda */
  diametroDoPneu: 340,
  banda: 85,
  /* o aro de 8 polegadas: o talão em Ø 203, o barril de 11,5 mm de parede e 68 mm de largura */
  diametroDoAro: 203,
  larguraDoAro: 68,
  paredeDoAro: 11.5,
  /* a roda de chapa: o disco de 12 mm, o cubo de Ø 52 e 102 mm (o máximo da família; o rascunho tinha 110) com o furo do rolamento,
     e os quatro furos de fixação de Ø 5,1 no círculo de 37,4 que a família exige */
  disco: 12,
  diametroDoCubo: 52,
  larguraDoCubo: 102,
  raioDoFuroDoCubo: 12,
  furos: 4,
  circuloDosFuros: 37.4,
  diametroDoFuro: 5.1,
  /* a forma do pneu: o ombro redondo de 25,5 mm na largura (o máximo da família, 30% da banda) e 96 lados */
  ombroRedondo: 1,
  ombro: 25.5,
  ladosDoPneu: 96,
  /* o sombreamento suave, com a quina acima deste ângulo nítida */
  anguloDoLiso: 35,
};

export const MATERIAIS = {
  borracha: { tipo: 'liso', cor: '#151617' },
  aco: { tipo: 'liso', cor: '#4a4f55' },
};

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/** A chamada da família `roda-pneu` com as medidas da TABELA, em proporção do diâmetro do pneu (o ombro em proporção do flanco). */
export function derivar(T = TABELA) {
  const D = T.diametroDoPneu;
  return chamar(familias().obter('roda-pneu'), 'roda', {
    diametroPneu: D,
    larguraPneu: T.banda / D,
    diametroAro: T.diametroDoAro / D,
    larguraAro: T.larguraDoAro / T.banda,
    paredeDoAro: T.paredeDoAro / D,
    banda: 0,
    tipo: 0,
    espessuraDisco: T.disco / D,
    larguraCubo: T.larguraDoCubo / D,
    diametroCubo: T.diametroDoCubo / D,
    diametroFuroCentral: 2 * T.raioDoFuroDoCubo / D,
    furosDeFixacao: T.furos,
    diametroCirculoFuros: T.circuloDosFuros / D,
    diametroFuro: T.diametroDoFuro / D,
    desvio: 0,
    ombroRedondo: T.ombroRedondo,
    ombroDoPneu: T.ombro / ((D - T.diametroDoAro) / 2),
    ladosDoPneu: T.ladosDoPneu,
  });
}

/* As partes que a família nomeia. */
export const PARTES = ['pneu', 'aro', 'cubo', 'disco'];

/** Os passos da família, em metro, como ela os expande. */
function passosDaFamilia(T) {
  return expandirChamadasDeComposicao(familias().registroComposicoes, [derivar(T)]).passos;
}

/** A porta do furo do cubo, em metro: o cilindro do furo central, da face de dentro do cubo à de fora, saindo da parede do furo (a
 *  última faixa da revolução do cubo, que a porta `eixo` da família cita pelo corte dos furos de fixação). */
function portaDoFuro(passos, T) {
  const eixoDaFamilia = passos.find(([op, a]) => op === 'publicarPorta' && a.id === 'eixo')[1];
  const corte = passos.find(([op, a]) => op === eixoDaFamilia.de.op && a.origemId === eixoDaFamilia.de.id)[1];
  const revolucao = corte.solidos[0].origem;
  const perfil = passos.find(([op, a]) => op === revolucao.op && a.origemId === revolucao.id)[1].perfil;
  const raio = T.raioDoFuroDoCubo / 1000;
  const parede = perfil.findIndex((p, k) => k < perfil.length - 1 && Math.abs(p[0] - raio) < 1e-9 && Math.abs(perfil[k + 1][0] - raio) < 1e-9);
  const [x0, x1] = [perfil[parede][1], perfil[parede + 1][1]].sort((a, b) => a - b);
  return ['publicarPorta', { id: 'furoDoCubo', de: { ...revolucao, faixa: parede },
    interface: { forma: 'cilindro', papel: 'interna', eixo: [1, 0, 0], centro: [x0, 0, 0], raio, inicio: 0, fim: x1 - x0, referencia: [0, 1, 0] } }];
}

/** Os PASSOS, em metro: a roda da família, o sombreamento de cada parte e a porta do furo do cubo. */
export function gerarPassos(T = TABELA) {
  const passos = passosDaFamilia(T);
  const lisos = passos.filter(([op]) => op === 'parte').map(([, { sel }]) => ['liso', { sel, angulo: T.anguloDoLiso }]);
  return [...passos, ...lisos, portaDoFuro(passos, T)];
}

/* Os campos de medida (metro, na saída da família) das operações que a roda usa; o rascunho os quer em mm. */
const MEDIDAS = { lathe: ['perfil', 'em'], cubo: ['larg', 'alt', 'prof', 'em'], arranja: ['d', 'pivo'] };
const emMm = (v) => (typeof v === 'number' ? Math.round(v * 1e7) / 1e4 : Array.isArray(v) ? v.map(emMm) : v);
/* os ids da família são locais: no estado do carrinho inteiro cada um soma a base do estado */
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  return v;
};

/** A roda no estado { passos, topo, origem } do carrinho inteiro, em mm, com o centro do pneu no eixo do chassi e a cor do material
 *  de cada parte pelo pincel, porque o rascunho não tem MATERIAIS. Sem as portas, que são da montagem. */
export function montarRoda(estado, T = TABELA) {
  const E = CHASSI.eixo;
  const centro = [0, E.y, E.z];
  const base = estado.origem;
  let maior = 0;
  const nomeadas = [];
  for (const passo of passosDaFamilia(T)) {
    const [op, args] = comBase(passo, base);
    if (op === 'publicarPorta') continue;
    if (Number.isFinite(args.origemId)) maior = Math.max(maior, args.origemId);
    if (op === 'material') { estado.passos.push(['pincel', { modo: 'face', sel: args.sel, cor: MATERIAIS[args.usa].cor }]); continue; }
    if (op === 'parte') { nomeadas.push(args.sel); estado.passos.push(['parte', args]); continue; }
    estado.passos.push([op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMm(v) : v]))]);
  }
  estado.origem = Math.max(estado.origem, maior);
  for (const sel of nomeadas) estado.passos.push(['transladar', { d: centro, sel }], ['liso', { sel, angulo: T.anguloDoLiso }]);
}

/* Os pares que a família põe em contato por desenho. */
export const CONTATOS = [
  { par: ['aro', 'pneu'], motivo: 'o talão do pneu assenta no barril do aro, no raio de 101,5 mm' },
  { par: ['aro', 'disco'], motivo: 'a borda de fora do disco entra até o meio da parede do aro' },
  { par: ['cubo', 'disco'], motivo: 'a borda de dentro do disco entra até o meio da parede do cubo' },
];

const receita = {
  meta: { nome: 'carrinho-de-mao/roda', desc: 'roda do carrinho de mão pela família roda-pneu: pneu 3.25-8 de Ø 340 e banda de 85 no aro de chapa de 8 polegadas, com o cubo que gira no eixo' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro do pneu; y para cima, o eixo da roda em x e a frente em +z' },
  PLANO: {
    objeto: 'roda de carrinho de mão de obra: pneu 3.25-8 largo de ombros redondos num aro de chapa escuro de 8 polegadas, com o disco e o cubo que gira no eixo do chassi, dentro do laço',
    referencias: ['../../referencias/carrinho-de-mao.contornos.json'],
    escala: { medida: 'diâmetro do pneu 3.25-8, que fixa a escala das referências (TABELA do alinhamento)', milimetros: 340 },
    familiaProcedural: 'roda-pneu',
    partes: [
      { nome: 'pneu', forma: 'pneu preto de Ø 340 e 85 mm de banda, banda lisa e ombros redondos de 25,5 mm na largura, do talão de Ø 203 à banda, sem quina', tecnica: 'família roda-pneu, banda 0 com ombro redondo e ombro largo: revolução em torno de x, 96 lados' },
      { nome: 'aro', forma: 'barril escuro do aro de 8 polegadas, de 11,5 mm de parede e 68 mm de largura, que o talão do pneu abraça', tecnica: 'família roda-pneu: revolução em torno de x de um tubo' },
      { nome: 'cubo', forma: 'anel escuro de Ø 52 e 102 mm de largura, centrado no pneu, com o furo do rolamento de Ø 24 e quatro furos de fixação pequenos', tecnica: 'família roda-pneu: revolução do anel menos os furos de fixação repetidos em volta do eixo' },
      { nome: 'disco', forma: 'chapa escura de 12 mm do cubo ao aro, no plano do meio do pneu', tecnica: 'família roda-pneu, tipo 0: revolução em torno de x de um anel' },
    ],
    criteriosDeReprovacao: [
      'o pneu fora de Ø 340 por 85 mm de banda, ou de ombro em quina',
      'a roda fora do chão em y 0 sob o eixo, ou fora do eixo do chassi',
      'a roda cruzando a caçamba, o laço ou os mancais',
      'o cubo largo demais para o vão entre os mancais, ou o furo do cubo sem folga em volta do eixo',
    ],
  },
  contatos: CONTATOS,
  /* o pneu, o aro e o disco são anéis; o cubo tem o furo central e os de fixação */
  formas: { pneu: 'anel', aro: 'anel', disco: 'anel', cubo: { furos: 1 + TABELA.furos } },
  /* Os extremos que a TABELA fixa, em mm: o pneu inteiro e as faces do cubo. */
  get PONTOS() {
    const T = this.PARAMS; const R = T.diametroDoPneu / 2; const C = T.diametroDoCubo / 2;
    return [
      { nome: 'borda de fora e topo do pneu', parte: 'pneu', medida: 'maximo', em: [T.banda / 2, R, R], toleranciaMm: 0.5 },
      { nome: 'borda de dentro e fundo do pneu', parte: 'pneu', medida: 'minimo', em: [-T.banda / 2, -R, -R], toleranciaMm: 0.5 },
      { nome: 'face de dentro do cubo', parte: 'cubo', medida: 'minimo', em: [-T.larguraDoCubo / 2, -C, -C], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
