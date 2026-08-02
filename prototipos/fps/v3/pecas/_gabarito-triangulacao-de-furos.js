/* PEÇA DE EXERCÍCIO — prova geral do A-33. Um disco hexagonal recebe dez
 * furos triangulares muito próximos da borda: é a fronteira que a ponte gulosa
 * não repartia. Não há vocabulário automotivo; é uma chapa de furação neutra.
 *
 * Bancada:
 *   npm run bancada -- _gabarito-triangulacao-de-furos --vistas=superior,isometrica,frontal
 *   npm run descrever -- _gabarito-triangulacao-de-furos --estrito
 */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico', fidelidade: 'F2', precisao: 'mecanica',
  interacao: 'inspecao', distanciaMinima: 0.18, orcamentoFaces: 500,
};

export const PARAMS = {
  raioDaChapa: 0.052,
  espessura: 0.012,
  raioDoFuro: 0.0065,
  raioDoCirculo: 0.038,
};

export const TOPO = { ladosDaChapa: 6, ladosDoFuro: 3, totalDeFuros: 10 };

export const MATERIAIS = {
  chapa: { cor: '#85929e', metalness: 0.72, aspereza: 0.38 },
  corte: { cor: '#34495e', metalness: 0.50, aspereza: 0.34 },
};

const CHAPA = 960;
const FUROS = 961;
const ORIGEM_CHAPA = { op: 'cilindro', id: CHAPA };
const ORIGEM_FUROS = { op: 'furo', id: FUROS };
const TODOS = { passo: 1, fase: 0 };

export const ALIASES = [
  ['chapaPerfurada', { unir: [
    { origem: ORIGEM_CHAPA },
    { origem: ORIGEM_FUROS },
  ] }],
];

export const PASSOS = [
  ['cilindro', {
    origemId: CHAPA, raio: 'raioDaChapa', altura: 'espessura', lados: 'ladosDaChapa',
  }],
  ['furo', {
    origemId: FUROS,
    de: { ...ORIGEM_CHAPA, tampa: 'topo' },
    saida: { ...ORIGEM_CHAPA, tampa: 'fundo' },
    centros: { distancia: 'raioDoCirculo', total: 'totalDeFuros', volta: 360 },
    raio: 'raioDoFuro', lados: 'ladosDoFuro', orientacao: [1, 0, 0],
  }],
  ['parte', { nome: 'chapaPerfurada', sel: { alias: 'chapaPerfurada' } }],
  ['publicarPorta', { nome: 'paredesDosFuros', de: { ...ORIGEM_FUROS, parede: TODOS } }],
  ['material', { sel: { grupo: 'chapaPerfurada' }, usa: 'chapa' }],
  ['material', { sel: { origem: { ...ORIGEM_FUROS, parede: TODOS } }, usa: 'corte' }],
  ['solido', { sel: { grupo: 'chapaPerfurada' } }],
];

export const meta = {
  fechada: true,
  nome: '_gabarito-triangulacao-de-furos',
  tipo: 'objeto',
  desc: 'chapa hexagonal com dez furos triangulares próximos da borda, usada para provar triangulação robusta',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
