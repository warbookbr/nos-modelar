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
/* PEÇA DE EXERCÍCIO — prova não automotiva do A-37. Um bloco com chanfros
 * recebe uma faixa de raio numa aresta cuja ponta encontra canto composto.
 * Ela existe para revisar a costura em isolamento, antes de qualquer pinça. */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico', fidelidade: 'F2', precisao: 'mecanica',
  interacao: 'inspecao', distanciaMinima: 0.2, orcamentoFaces: 120,
};

export const PARAMS = {
  largura: 0.52,
  altura: 0.34,
  profundidade: 0.40,
  chanfro: 0.045,
  raio: 0.028,
};

export const TOPO = { paineisDoRaio: 3 };

export const MATERIAIS = {
  corpo: { cor: '#6f8494', metalness: 0.58, aspereza: 0.34 },
  faixa: { cor: '#b9c9d2', metalness: 0.68, aspereza: 0.28 },
};

const BLOCO = 960;
const RAIO = 961;
const ORIGEM_BLOCO = { op: 'chamferBox', id: BLOCO };
const ORIGEM_RAIO = { op: 'arredondarAresta', id: RAIO };
const TODOS = { passo: 1, fase: 0 };

export const ALIASES = [
  ['blocoFundido', { unir: [{ origem: ORIGEM_BLOCO }, { origem: ORIGEM_RAIO }] }],
];

export const PASSOS = [
  ['chamferBox', {
    origemId: BLOCO, larg: 'largura', alt: 'altura', prof: 'profundidade', chanfro: 'chanfro',
  }],
  ['arredondarAresta', {
    origemId: RAIO,
    de: { ...ORIGEM_BLOCO, face: 'topo' },
    aresta: 0,
    raio: 'raio',
    paineis: 'paineisDoRaio',
  }],
  ['parte', { nome: 'blocoFundido', sel: { alias: 'blocoFundido' } }],
  ['publicarPorta', { nome: 'faixaDeArredondamento', de: { ...ORIGEM_RAIO, painel: TODOS } }],
  ['material', { sel: { grupo: 'blocoFundido' }, usa: 'corpo' }],
  ['material', { sel: { origem: { ...ORIGEM_RAIO, painel: TODOS } }, usa: 'faixa' }],
  ['liso', { sel: { origem: { ...ORIGEM_RAIO, painel: TODOS } } }],
  ['solido', { sel: { grupo: 'blocoFundido' } }],
];

export const meta = {
  fechada: true,
  nome: '_bloco-arredondado-composto',
  tipo: 'objeto',
  desc: 'bloco chanfrado com uma aresta de canto composto arredondada, fixture neutra do A-37',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
