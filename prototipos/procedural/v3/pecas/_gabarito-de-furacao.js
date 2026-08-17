/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/procedural/v3/pecas/` são exemplos. Elas existem para
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
/* PEÇA DE EXERCÍCIO — prova geral do A-34. Um gabarito de bancada combina
 * cilindro, cone e furo escritos pela mesma tolerância geométrica. O objeto
 * não sabe nada sobre carro: ele demonstra que a IA pode pedir acabamento em
 * metros em vez de adivinhar três contagens de lados incomparáveis.
 *
 * Bancada:
 *   npm run bancada -- _gabarito-de-furacao --vistas=superior,isometrica,frontal
 *   npm run descrever -- _gabarito-de-furacao --estrito
 */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico',
  fidelidade: 'F2',
  precisao: 'mecanica',
  interacao: 'montagem',
  distanciaMinima: 0.18,
  orcamentoFaces: 500,
};

export const TOPO = {
  acabamentoCircular: 0.00025,
};

export const PARAMS = {
  placaLargura: 0.18,
  placaProfundidade: 0.12,
  placaEspessura: 0.012,
  furoRaio: 0.0065,
  furoProfundidade: 0.007,
  buchaRaio: 0.018,
  buchaAltura: 0.025,
  pinoRaio: 0.014,
  pinoAltura: 0.035,
  posicaoX: 0.052,
};

export const MATERIAIS = {
  placa: { cor: '#8b949f', metalness: 0.68, aspereza: 0.46 },
  corte: { cor: '#44505b', metalness: 0.56, aspereza: 0.35 },
  bucha: { cor: '#c0a867', metalness: 0.62, aspereza: 0.34 },
  pino: { cor: '#718096', metalness: 0.70, aspereza: 0.34 },
};

const PLACA = 950;
const FURO = 951;
const BUCHA = 952;
const PINO = 953;
const TODOS = { passo: 1, fase: 0 };

const ORIGEM_PLACA = { op: 'cubo', id: PLACA };
const ORIGEM_FURO = { op: 'furo', id: FURO };
const ORIGEM_BUCHA = { op: 'cilindro', id: BUCHA };
const ORIGEM_PINO = { op: 'cone', id: PINO };

export const ALIASES = [
  ['placaCompleta', { unir: [
    { origem: { ...ORIGEM_PLACA, face: 'fundo' } },
    { origem: { ...ORIGEM_PLACA, face: 'tras' } },
    { origem: { ...ORIGEM_PLACA, face: 'direita' } },
    { origem: { ...ORIGEM_PLACA, face: 'frente' } },
    { origem: { ...ORIGEM_PLACA, face: 'esquerda' } },
    { origem: ORIGEM_FURO },
  ] }],
  ['buchaCompleta', { unir: [
    { origem: ORIGEM_BUCHA },
    { origem: { ...ORIGEM_BUCHA, tampa: 'fundo' } },
    { origem: { ...ORIGEM_BUCHA, tampa: 'topo' } },
  ] }],
  ['pinoCompleto', { unir: [
    { origem: ORIGEM_PINO },
    { origem: { ...ORIGEM_PINO, tampa: 'fundo' } },
  ] }],
];

export const PASSOS = [
  ['cubo', {
    origemId: PLACA,
    larg: 'placaLargura',
    alt: 'placaEspessura',
    prof: 'placaProfundidade',
  }],
  ['furo', {
    origemId: FURO,
    de: { ...ORIGEM_PLACA, face: 'topo' },
    profundidade: 'furoProfundidade',
    centro: [0, 0, 0],
    raio: 'furoRaio',
    lados: { desvio: 'acabamentoCircular' },
    orientacao: [1, 0, 0],
  }],
  ['cilindro', {
    origemId: BUCHA,
    raio: 'buchaRaio',
    altura: 'buchaAltura',
    lados: { desvio: 'acabamentoCircular' },
  }],
  ['transladar', {
    d: ['= -posicaoX', 'placaEspessura', 0],
    sel: { origem: ORIGEM_BUCHA },
  }],
  ['cone', {
    origemId: PINO,
    raio: 'pinoRaio',
    altura: 'pinoAltura',
    lados: { desvio: 'acabamentoCircular' },
  }],
  ['transladar', {
    d: ['posicaoX', 'placaEspessura', 0],
    sel: { origem: ORIGEM_PINO },
  }],

  ['parte', { nome: 'placaDoGabarito', sel: { alias: 'placaCompleta' } }],
  ['parte', { nome: 'buchaDeGuia', sel: { alias: 'buchaCompleta' } }],
  ['parte', { nome: 'pinoDeCentragem', sel: { alias: 'pinoCompleto' } }],

  ['publicarPorta', { nome: 'canalDeFuracao', de: { ...ORIGEM_FURO, parede: TODOS } }],
  ['publicarPorta', { nome: 'apoioDaBucha', de: { ...ORIGEM_BUCHA, tampa: 'fundo' } }],
  ['publicarPorta', { nome: 'apoioDoPino', de: { ...ORIGEM_PINO, tampa: 'fundo' } }],

  ['material', { sel: { grupo: 'placaDoGabarito' }, usa: 'placa' }],
  ['material', { sel: { origem: { ...ORIGEM_FURO, parede: TODOS } }, usa: 'corte' }],
  ['material', { sel: { origem: { ...ORIGEM_FURO, tampa: 'fundo' } }, usa: 'corte' }],
  ['material', { sel: { grupo: 'buchaDeGuia' }, usa: 'bucha' }],
  ['material', { sel: { grupo: 'pinoDeCentragem' }, usa: 'pino' }],
  ['solido', { sel: { grupo: 'placaDoGabarito' } }],
  ['solido', { sel: { grupo: 'buchaDeGuia' } }],
  ['solido', { sel: { grupo: 'pinoDeCentragem' } }],
];

export const meta = {
  fechada: true,
  nome: '_gabarito-de-furacao',
  tipo: 'objeto',
  desc: 'gabarito de bancada — placa, bucha, pino cônico e furo compartilham uma tolerância circular em metros',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
