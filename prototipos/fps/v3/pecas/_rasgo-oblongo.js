/* PEÇA DE EXERCÍCIO — prova da ABERTURA OBLONGA (rasgo). Uma cantoneira de
 * fixação com os três casos que o rasgo precisa sustentar de uma vez:
 *
 *   1. dois rasgos PASSANTES num grupo nomeado (`regulagem`) — o caso real de
 *      furo alongado, que existe para o parafuso deslizar antes de apertar;
 *   2. um rasgo CEGO (`assento`), que prova a tampa de fundo no anel de estádio;
 *   3. um furo REDONDO no mesmo passo dos rasgos, que prova que as duas formas
 *      convivem sem forma nova de endereço.
 *
 * O que esta peça prova, e nenhuma outra provava:
 *   - a largura do rasgo é EXATA (2·raio), que é a medida por onde o parafuso
 *     passa; o comprimento é inscrito, como o diâmetro de um furo redondo;
 *   - parede, borda, saída, tampa e grupo continuam endereçáveis palavra por
 *     palavra, sem eixo novo — o rasgo gasta os mesmos `lados` do círculo;
 *   - `lados: {desvio}` continua sendo promessa em metros no anel do estádio.
 *
 * Bancada:
 *   npm run bancada -- _rasgo-oblongo --vistas=superior,isometrica
 *   npm run descrever -- _rasgo-oblongo --estrito
 */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico',
  fidelidade: 'F2',
  precisao: 'mecanica',
  interacao: 'montagem',
  distanciaMinima: 0.18,
  orcamentoFaces: 600,
};

export const TOPO = {
  acabamentoCircular: 0.00025,
};

export const PARAMS = {
  chapaLargura: 0.16,
  chapaProfundidade: 0.09,
  chapaEspessura: 0.010,

  rasgoRaio: 0.0055,
  rasgoMeioCurso: 0.028,
  rasgoAfastamento: 0.026,

  pilotoRaio: 0.004,

  blocoLargura: 0.07,
  blocoProfundidade: 0.05,
  blocoAltura: 0.018,
  blocoDeslocamentoX: 0.12,

  assentoRaio: 0.008,
  assentoMeioCurso: 0.012,
  assentoProfundidade: 0.006,
};

export const MATERIAIS = {
  chapa: { cor: '#8b949f', metalness: 0.68, aspereza: 0.46 },
  corte: { cor: '#44505b', metalness: 0.56, aspereza: 0.35 },
  bloco: { cor: '#7d8a76', metalness: 0.60, aspereza: 0.42 },
  assento: { cor: '#6b5f47', metalness: 0.52, aspereza: 0.44 },
};

const CHAPA = 960;
const ABERTURAS = 961;
const BLOCO = 962;
const ASSENTO = 963;
const TODOS = { passo: 1, fase: 0 };

const ORIGEM_CHAPA = { op: 'cubo', id: CHAPA };
const ORIGEM_ABERTURAS = { op: 'furo', id: ABERTURAS };
const ORIGEM_BLOCO = { op: 'cubo', id: BLOCO };
const ORIGEM_ASSENTO = { op: 'furo', id: ASSENTO };

/* A chapa perde `topo` e `fundo` para o rasgo passante — furo consome a face de
   entrada e a de saída —, então elas não entram no alias. O bloco perde só o
   `topo`, porque o assento é cego. */
export const ALIASES = [
  ['chapaCompleta', { unir: [
    { origem: { ...ORIGEM_CHAPA, face: 'tras' } },
    { origem: { ...ORIGEM_CHAPA, face: 'direita' } },
    { origem: { ...ORIGEM_CHAPA, face: 'frente' } },
    { origem: { ...ORIGEM_CHAPA, face: 'esquerda' } },
    { origem: ORIGEM_ABERTURAS },
  ] }],
  ['blocoCompleto', { unir: [
    { origem: { ...ORIGEM_BLOCO, face: 'fundo' } },
    { origem: { ...ORIGEM_BLOCO, face: 'tras' } },
    { origem: { ...ORIGEM_BLOCO, face: 'direita' } },
    { origem: { ...ORIGEM_BLOCO, face: 'frente' } },
    { origem: { ...ORIGEM_BLOCO, face: 'esquerda' } },
    { origem: ORIGEM_ASSENTO },
  ] }],
];

export const PASSOS = [
  ['cubo', {
    origemId: CHAPA,
    larg: 'chapaLargura',
    alt: 'chapaEspessura',
    prof: 'chapaProfundidade',
  }],

  /* Os dois rasgos de regulagem e o furo piloto nascem no MESMO passo: é isso
     que prova que estádio e círculo dividem o anel de `lados` pontos sem que a
     lista precise saber qual é qual. O grupo `regulagem` dá endereço de autor
     aos dois rasgos; o piloto fica fora dele de propósito, para que
     `grupo:'regulagem'` possa ser conferido contra um furo que não é rasgo. */
  ['furo', {
    origemId: ABERTURAS,
    de: { ...ORIGEM_CHAPA, face: 'topo' },
    saida: { ...ORIGEM_CHAPA, face: 'fundo' },
    centros: [
      { nome: 'regulagem',
        centro: ['= -rasgoMeioCurso', 0, '= -rasgoAfastamento'],
        ate: ['rasgoMeioCurso', 0, '= -rasgoAfastamento'],
        raio: 'rasgoRaio' },
      { nome: 'regulagemOposta',
        centro: ['= -rasgoMeioCurso', 0, 'rasgoAfastamento'],
        ate: ['rasgoMeioCurso', 0, 'rasgoAfastamento'],
        raio: 'rasgoRaio' },
      { nome: 'piloto',
        centro: [0, 0, 0],
        raio: 'pilotoRaio' },
    ],
    lados: { desvio: 'acabamentoCircular' },
    orientacao: [1, 0, 0],
  }],

  /* O bloco existe porque o rasgo passante CONSUMIU o topo e o fundo da chapa:
     um segundo corte precisa de uma face que ainda exista. Ele carrega o rasgo
     CEGO, que prova `tampa:'fundo'` num anel que não é circular — a tampa é o
     estádio inteiro, não um disco. */
  ['cubo', {
    origemId: BLOCO,
    larg: 'blocoLargura',
    alt: 'blocoAltura',
    prof: 'blocoProfundidade',
  }],
  ['transladar', {
    d: ['blocoDeslocamentoX', 0, 0],
    sel: { origem: ORIGEM_BLOCO },
  }],

  ['furo', {
    origemId: ASSENTO,
    de: { ...ORIGEM_BLOCO, face: 'topo' },
    profundidade: 'assentoProfundidade',
    centro: ['= blocoDeslocamentoX - assentoMeioCurso', 0, 0],
    ate: ['= blocoDeslocamentoX + assentoMeioCurso', 0, 0],
    raio: 'assentoRaio',
    lados: { desvio: 'acabamentoCircular' },
    orientacao: [1, 0, 0],
  }],

  ['parte', { nome: 'chapaDeFixacao', sel: { alias: 'chapaCompleta' } }],
  ['parte', { nome: 'blocoDeAssento', sel: { alias: 'blocoCompleto' } }],

  ['publicarPorta', { nome: 'cursoDeRegulagem', de: { ...ORIGEM_ABERTURAS, grupo: 'regulagem', parede: TODOS } }],
  ['publicarPorta', { nome: 'fundoDoAssento', de: { ...ORIGEM_ASSENTO, tampa: 'fundo' } }],

  ['material', { sel: { grupo: 'chapaDeFixacao' }, usa: 'chapa' }],
  ['material', { sel: { origem: { ...ORIGEM_ABERTURAS, parede: TODOS } }, usa: 'corte' }],
  ['material', { sel: { grupo: 'blocoDeAssento' }, usa: 'bloco' }],
  ['material', { sel: { origem: { ...ORIGEM_ASSENTO, parede: TODOS } }, usa: 'assento' }],
  ['material', { sel: { origem: { ...ORIGEM_ASSENTO, tampa: 'fundo' } }, usa: 'assento' }],
  ['solido', { sel: { grupo: 'chapaDeFixacao' } }],
  ['solido', { sel: { grupo: 'blocoDeAssento' } }],
];

export const meta = {
  fechada: true,
  nome: '_rasgo-oblongo',
  tipo: 'objeto',
  desc: 'cantoneira de regulagem — dois rasgos passantes agrupados, um rasgo cego e um furo redondo no mesmo passo',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
