/* empilhadeira/roda-dianteira — a roda dianteira da empilhadeira pela família `roda-pneu`: o pneu pneumático industrial de Ø 705 e
 * banda de 250 mm (o 7.00-12 da ficha da classe 2,5 t, alargado pela vista de cima e pela de frente), no aro de 12 polegadas, com a
 * roda de chapa de aço de seis furos. Uma receita, duas instâncias na montagem (a esquerda e a direita, esta girada meia volta).
 *
 * Etapa da montagem `../../montagem.json` depois do eixo dianteiro (fatia 3 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`,
 * item 2 das partes do `../../ALINHAMENTO.md`). O rascunho aprovado pela pessoa em 2026-11-10 (`../../referencias/eixos-rodas.esboco.mjs`)
 * desenhava a roda à mão; ela passou a sair da família, como o plano pede ("Família `roda-pneu`: USAR DIRETO"), e o rascunho chama
 * `montarRodaDianteira` daqui.
 *
 * DE ONDE VEM CADA MEDIDA. O diâmetro e a banda do pneu são os de `rodas.dianteira` da carcaça, que corta os poços por eles (Ø 705,
 * de 417 a 667 mm do centro da máquina). O aro de 12 polegadas (talão em Ø 320), o barril de 18 mm, o disco de 15 mm e o furo do
 * disco de Ø 110 (por onde passa a tampa de Ø 100 do cubo do eixo) são os do rascunho. O cubo da roda (a família o exige: é de onde
 * sai a porta `eixo`) tem Ø 200 e 30 mm e assenta, pela face de dentro, na face de fora do flange do eixo (Ø 220); os seis furos de
 * Ø 14 no círculo de 132 são de caráter. O assento da roda é a distância da face de dentro do cubo ao plano do meio do pneu (o
 * "offset" da roda), tirado do pneu da carcaça (417 + 250/2 = 542) e da face do flange do eixo (463): 79 mm. A família o recebe como
 * `desvio`, a fração da folga do aro que o disco ocupa.
 *
 * O que a família não faz, e por isso fica diferente do rascunho: o ombro do pneu, que o rascunho arredondava com uns 55 mm de raio,
 * sai com o arco de 9 mm que é o máximo da família (`CHANFRO_MAXIMO_DO_OMBRO_MM`), e o flanco vai reto do bojo ao ombro; a revolução
 * tem 96 lados no lugar de 48.
 *
 * A cadeia: a TABELA em mm; `derivar` leva as medidas aos parâmetros da família (em proporção do diâmetro) e chama a família;
 * `gerarPassos` expande a chamada, que já sai em metro, e acrescenta o sombreamento de cada parte. `montarRodaDianteira` escreve a
 * mesma roda em mm num estado { passos, topo, origem }, posta e girada, para o rascunho da máquina inteira, que é em mm. */
import { chamar, criarRegistroDeFamilias } from '../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../nucleo/composicoes.js';
import { TABELA as CARCACA } from '../carcaca/receita.js';
import { TABELA as EIXO } from '../eixo-dianteiro/receita.js';

const RODA = CARCACA.rodas.dianteira;

export const TABELA = {
  /* o pneu: o diâmetro e a banda da carcaça */
  diametroDoPneu: 2 * RODA.raio,
  banda: RODA.banda,
  /* o aro de 12 polegadas: o talão em Ø 320, o barril de 18 mm de parede e 234 mm de largura (8 mm de cada lado para dentro da banda) */
  diametroDoAro: 320,
  larguraDoAro: 234,
  paredeDoAro: 18,
  /* a roda de chapa: o disco de 15 mm, o cubo de Ø 200 e 30 mm com o furo de Ø 110 e seis furos de Ø 14 no círculo de 132, por
     dentro da borda de dentro do disco (77,5 mm), para os furos passarem de lado a lado à vista */
  disco: 15,
  diametroDoCubo: 200,
  larguraDoCubo: 30,
  furoCentral: 110,
  furos: 6,
  circuloDosFuros: 132,
  diametroDoFuro: 14,
  /* o assento da roda: a face de dentro do cubo fica a esta distância do plano do meio do pneu, para dentro (o pneu de 417 a 667 mm
     da carcaça e a face do flange do eixo) */
  assento: RODA.xDentro + RODA.banda / 2 - EIXO.cubo.face,
  /* a forma do pneu: o ombro em arco (o da família, de 9 mm) e 96 lados */
  ombroRedondo: 1,
  ladosDoPneu: 96,
  /* o sombreamento suave, com a quina acima deste ângulo nítida (o do eixo e da carcaça) */
  anguloDoLiso: 35,
};

export const MATERIAIS = {
  borracha: { tipo: 'liso', cor: '#1a1b1d' },
  aco: { tipo: 'liso', cor: CARCACA.cores.cinzaClaro },
};

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/** A chamada da família `roda-pneu` com as medidas da TABELA, em proporção do diâmetro do pneu. */
export function derivar(T = TABELA) {
  const D = T.diametroDoPneu;
  /* o centro do cubo, no referencial da roda (o meio do pneu em x 0, o lado de fora em +x), e o desvio que o põe lá */
  const centroDoCubo = -T.assento + T.larguraDoCubo / 2;
  const desvio = centroDoCubo / ((T.larguraDoAro - T.disco) / 2);
  return chamar(familias().obter('roda-pneu'), 'roda-dianteira', {
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
    diametroFuroCentral: T.furoCentral / D,
    furosDeFixacao: T.furos,
    diametroCirculoFuros: T.circuloDosFuros / D,
    diametroFuro: T.diametroDoFuro / D,
    desvio,
    ombroRedondo: T.ombroRedondo,
    ladosDoPneu: T.ladosDoPneu,
  });
}

/* As partes que a família nomeia. */
export const PARTES = ['pneu', 'aro', 'cubo', 'disco'];

/** Os passos da família, em metro, como ela os expande. */
function passosDaFamilia(T) {
  return expandirChamadasDeComposicao(familias().registroComposicoes, [derivar(T)]).passos;
}

/** Os PASSOS, em metro: a roda da família e o sombreamento de cada parte. */
export function gerarPassos(T = TABELA) {
  const passos = passosDaFamilia(T);
  const lisos = passos.filter(([op]) => op === 'parte').map(([, { sel }]) => ['liso', { sel, angulo: T.anguloDoLiso }]);
  return [...passos, ...lisos];
}

/* Os campos de medida (metro, na saída da família) das operações que a roda usa; o rascunho os quer em mm. */
const MEDIDAS = { lathe: ['perfil', 'em'], cubo: ['larg', 'alt', 'prof', 'em'], arranja: ['d', 'pivo'] };
const emMm = (v) => (typeof v === 'number' ? Math.round(v * 1e7) / 1e4 : Array.isArray(v) ? v.map(emMm) : v);
/* os ids da família são locais (de 1 a 16): no estado da máquina inteira cada um soma a base do estado */
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  return v;
};

/** Monta uma roda no estado { passos, topo, origem } da máquina inteira, em mm: o centro do pneu em `centro`, o lado de fora para +x
 *  (`lado` 1) ou para -x (`lado` -1, meia volta em y), as partes com os nomes de `nomes` (o nome da família para o da máquina) e a cor
 *  do material de cada uma pelo pincel, porque o rascunho não tem MATERIAIS. Sem as portas, que são da montagem. */
export function montarRodaDianteira(estado, { centro, lado = 1, nomes = {} }, T = TABELA) {
  const base = estado.origem;
  let maior = 0;
  const nomeadas = [];
  for (const passo of passosDaFamilia(T)) {
    const [op, args] = comBase(passo, base);
    if (op === 'publicarPorta') continue;
    if (Number.isFinite(args.origemId)) maior = Math.max(maior, args.origemId);
    if (op === 'material') { estado.passos.push(['pincel', { modo: 'face', sel: args.sel, cor: MATERIAIS[args.usa].cor }]); continue; }
    if (op === 'parte') { nomeadas.push(args.sel); estado.passos.push(['parte', { ...args, nome: nomes[args.nome] ?? args.nome }]); continue; }
    estado.passos.push([op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMm(v) : v]))]);
  }
  estado.origem = Math.max(estado.origem, maior);
  for (const sel of nomeadas) {
    if (lado < 0) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 0, 0], sel }]);
    estado.passos.push(['transladar', { d: centro, sel }], ['liso', { sel, angulo: T.anguloDoLiso }]);
  }
}

/* Os pares que a família põe em contato por desenho. */
export const CONTATOS = [
  { par: ['aro', 'pneu'], motivo: 'o talão do pneu assenta no barril do aro, no raio de 160 mm' },
  { par: ['aro', 'disco'], motivo: 'a borda de fora do disco entra até o meio da parede do aro' },
  { par: ['cubo', 'disco'], motivo: 'a borda de dentro do disco entra até o meio da parede do cubo' },
];

const receita = {
  meta: { nome: 'empilhadeira/roda-dianteira', desc: 'roda dianteira da empilhadeira pela família roda-pneu: pneu pneumático de Ø 705 e banda de 250 no aro de 12 polegadas, roda de chapa de seis furos' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro do pneu; y para cima, o eixo da roda em x, o lado de fora em +x e a frente em +z' },
  PLANO: {
    objeto: 'roda dianteira motriz de empilhadeira de contrapeso de 2,5 t: pneu pneumático industrial alto e largo num aro pequeno de aço, presa ao cubo do eixo dianteiro, onde gira',
    referencias: ['../../referencias/frente.ia.png', '../../referencias/cima.ia.png', '../../referencias/carcaca-frente.ia.png'],
    escala: { medida: 'diâmetro do pneu (7.00-12 da ficha da classe 2,5 t)', milimetros: 705 },
    familiaProcedural: 'roda-pneu',
    partes: [
      { nome: 'pneu', forma: 'pneu preto de Ø 705 e 250 mm de banda, banda lisa, ombro em arco curto e flanco com bojo, do talão de Ø 320 à banda', tecnica: 'família roda-pneu, banda 0 com ombro redondo: revolução em torno de x, 96 lados' },
      { nome: 'aro', forma: 'barril cinza do aro de 12 polegadas, de 18 mm de parede e 234 mm de largura, que o talão do pneu abraça', tecnica: 'família roda-pneu: revolução em torno de x de um tubo' },
      { nome: 'cubo', forma: 'anel cinza de Ø 200 e 30 mm, com o furo de Ø 110 e seis furos de Ø 14, cuja face de dentro fica 79 mm para dentro do meio do pneu', tecnica: 'família roda-pneu: revolução do anel menos o furo central e os seis furos repetidos em volta do eixo' },
      { nome: 'disco', forma: 'chapa cinza de 15 mm do cubo ao aro, recuada para dentro do pneu', tecnica: 'família roda-pneu, tipo 0: revolução em torno de x de um anel' },
    ],
    criteriosDeReprovacao: [
      'o pneu fora de Ø 705 por 250 mm de banda, ou o aro grande demais para um pneu industrial alto',
      'a roda fora do chão, ou cruzando o poço, a aba do paralama ou a lateral da carcaça',
      'a roda fora do eixo do cubo, ou com o cubo dela sem assentar na face do flange do eixo',
      'a tampa do cubo do eixo sem passar pelo furo do disco',
      'o disco por fora do pneu em vez de recuado para dentro',
    ],
  },
  contatos: CONTATOS,
  /* o pneu, o aro e o disco são anéis; o cubo tem o furo central e os seis de fixação */
  formas: { pneu: 'anel', aro: 'anel', disco: 'anel', cubo: { furos: 1 + TABELA.furos } },
  /* Os extremos que a TABELA fixa, em mm: o pneu inteiro e a face de dentro do cubo, onde a roda assenta no flange do eixo. */
  get PONTOS() {
    const T = this.PARAMS; const R = T.diametroDoPneu / 2; const C = T.diametroDoCubo / 2;
    return [
      { nome: 'borda de fora e topo do pneu', parte: 'pneu', medida: 'maximo', em: [T.banda / 2, R, R], toleranciaMm: 0.5 },
      { nome: 'borda de dentro e fundo do pneu', parte: 'pneu', medida: 'minimo', em: [-T.banda / 2, -R, -R], toleranciaMm: 0.5 },
      { nome: 'face de dentro do cubo da roda', parte: 'cubo', medida: 'minimo', em: [-T.assento, -C, -C], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
