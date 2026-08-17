/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/fps/v3/pecas/` são exemplos. Elas existem para
 * exercitar e provar capacidades do núcleo, e nada mais. Nenhuma é referência de
 * engenharia, componente aprovado ou ponto de partida de produto.
 *
 * Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
 * falhar, não para descrever um componente real. Esta geometria pode mudar ou
 * ser removida a qualquer momento, sem aviso e sem migração.
 *
 * O que este repositório sustenta é o núcleo e as capacidades provadas — nunca
 * a geometria daqui. Ver "Peças são exemplos" no README.md.
 */
/* PEÇA DE EXERCÍCIO — prova geral da F1/A-30: uma flange de tubulação abre,
 * em UM passo, a passagem central e o círculo de fixação com raios diferentes.
 * Os grupos são nomeados pelo autor; nenhuma seleção depende do índice global
 * produzido pela expansão. Perfil: tecnicoDidatico, F2, precisão mecânica. */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico',
  fidelidade: 'F2',
  precisao: 'mecanica',
  interacao: 'montagem',
  distanciaMinima: 0.20,
  orcamentoFaces: 320,
};

export const TOPO = {
  corpoLados: 16,
  furoLados: 12,
  parafusos: 4,
};

export const PARAMS = {
  corpoRaio: 0.060,
  corpoAltura: 0.012,
  passagemDiam: 0.050,
  parafusoRaio: 0.0055,
  orbita: 0.044,
};

export const MATERIAIS = {
  acoDaFlange: { cor: '#9ca3ad', metalness: 0.72, aspereza: 0.42 },
  usinagemDaPassagem: { cor: '#56616d', metalness: 0.64, aspereza: 0.34 },
  usinagemDosParafusos: { cor: '#404a55', metalness: 0.58, aspereza: 0.40 },
};

const CORPO = 900;
const FUROS_DA_FLANGE = 901;
const ORIGEM_CORPO = { op: 'cilindro', id: CORPO };
const ORIGEM_FUROS = { op: 'furo', id: FUROS_DA_FLANGE };
const TODOS = { passo: 1, fase: 0 };

export const ALIASES = [
  ['corpoInteiro', {
    unir: [
      { origem: { ...ORIGEM_CORPO, lado: TODOS } },
      { origem: { ...ORIGEM_FUROS, borda: TODOS } },
      { origem: { ...ORIGEM_FUROS, saida: TODOS } },
      { origem: { ...ORIGEM_FUROS, preenchimento: TODOS } },
      { origem: { ...ORIGEM_FUROS, preenchimentoDaSaida: TODOS } },
    ],
  }],
  ['paredeDaPassagem', { origem: { ...ORIGEM_FUROS, grupo: 'passagem', parede: TODOS } }],
  ['paredesDosParafusos', { origem: { ...ORIGEM_FUROS, grupo: 'parafusos', parede: TODOS } }],
];

export const PASSOS = [
  ['cilindro', {
    origemId: CORPO,
    raio: 'corpoRaio',
    altura: 'corpoAltura',
    lados: 'corpoLados',
  }],

  ['furo', {
    origemId: FUROS_DA_FLANGE,
    de: { ...ORIGEM_CORPO, tampa: 'topo' },
    saida: { ...ORIGEM_CORPO, tampa: 'fundo' },
    raio: 'parafusoRaio',
    lados: 'furoLados',
    orientacao: [1, 0, 0],
    centros: [
      { nome: 'passagem', centro: [0, 0, 0], raio: '= passagemDiam / 2' },
      { nome: 'parafusos', distancia: 'orbita', total: 'parafusos', volta: 360 },
    ],
  }],

  ['parte', { nome: 'corpoDaFlange', sel: { alias: 'corpoInteiro' } }],
  ['parte', { nome: 'bocaDaPassagem', sel: { alias: 'paredeDaPassagem' } }],
  ['parte', { nome: 'furosDeParafuso', sel: { alias: 'paredesDosParafusos' } }],

  ['publicarPorta', { nome: 'passagemDaTubulacao', de: { ...ORIGEM_FUROS, grupo: 'passagem', parede: TODOS } }],
  ['publicarPorta', { nome: 'circuloDeFixacao', de: { ...ORIGEM_FUROS, grupo: 'parafusos', parede: TODOS } }],

  ['material', { sel: { grupo: 'corpoDaFlange' }, usa: 'acoDaFlange' }],
  ['material', { sel: { grupo: 'bocaDaPassagem' }, usa: 'usinagemDaPassagem' }],
  ['material', { sel: { grupo: 'furosDeParafuso' }, usa: 'usinagemDosParafusos' }],
  ['solido', { sel: { grupo: 'corpoDaFlange' } }],
];

export const meta = {
  fechada: true,
  nome: '_flange-de-tubulacao',
  tipo: 'objeto',
  desc: 'flange de tubulação — prova não automotiva de passagem central e círculo de fixação nomeados no mesmo passo de furo',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
