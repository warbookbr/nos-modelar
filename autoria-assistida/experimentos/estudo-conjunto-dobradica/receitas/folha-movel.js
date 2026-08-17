/* Experimento confinado — folha móvel de uma dobradiça didática. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico',
  fidelidade: 'F2',
  precisao: 'mecanica',
  interacao: 'montagem',
  distanciaMinima: 0.12,
  orcamentoFaces: 140,
};

export const PARAMS = {
  larguraFolha: 0.070,
  alturaFolha: 0.120,
  espessuraFolha: 0.006,
  centroFolha: [0.035, 0, 0],
  raioInternoOlhal: 0.0042,
  raioExternoOlhal: 0.009,
  comprimentoOlhal: 0.040,
  inicioOlhal: [0, 0.040, 0],
};

export const TOPO = { lados: 24 };

export const MATERIAIS = {
  folha: { cor: '#a56d42', aspereza: 0.50, metalness: 0.58 },
  olhal: { cor: '#7c4c2d', aspereza: 0.43, metalness: 0.64 },
};

const CHAPA = 8201;
const OLHAL = 8202;
const ORIGEM_CHAPA = { op: 'cubo', id: CHAPA };
const ORIGEM_OLHAL = { op: 'lathe', id: OLHAL };

export const ALIASES = [
  ['chapaInteira', { origem: ORIGEM_CHAPA }],
  ['olhalInteiro', { origem: ORIGEM_OLHAL }],
];

export const PASSOS = [
  ['cubo', {
    origemId: CHAPA,
    larg: 'larguraFolha',
    alt: 'alturaFolha',
    prof: 'espessuraFolha',
    em: 'centroFolha',
  }],
  ['lathe', {
    origemId: OLHAL,
    perfil: [
      ['raioInternoOlhal', 0],
      ['raioExternoOlhal', 0],
      ['raioExternoOlhal', 'comprimentoOlhal'],
      ['raioInternoOlhal', 'comprimentoOlhal'],
      ['raioInternoOlhal', 0],
    ],
    lados: 'lados',
    em: 'inicioOlhal',
  }],

  ['parte', { nome: 'chapaMovel', sel: { alias: 'chapaInteira' } }],
  ['parte', { nome: 'olhalCentral', sel: { alias: 'olhalInteiro' } }],
  ['publicarPorta', {
    nome: 'alojamentoCentralDoPino',
    de: { ...ORIGEM_OLHAL, faixa: 3 },
    interface: {
      forma: 'cilindro', papel: 'interna', eixo: [0, 1, 0], referencia: [1, 0, 0],
      centro: 'inicioOlhal', raio: 'raioInternoOlhal', inicio: 0, fim: 'comprimentoOlhal',
    },
  }],

  ['liso', { sel: { origem: { ...ORIGEM_OLHAL, faixa: 1 } } }],
  ['liso', { sel: { origem: { ...ORIGEM_OLHAL, faixa: 3 } } }],
  ['material', { sel: { grupo: 'chapaMovel' }, usa: 'folha' }],
  ['material', { sel: { grupo: 'olhalCentral' }, usa: 'olhal' }],
  ['solido', { sel: { grupo: 'chapaMovel' } }],
  ['solido', { sel: { grupo: 'olhalCentral' } }],
];

export const meta = {
  nome: 'folha-movel',
  tipo: 'objeto',
  desc: 'folha móvel experimental com olhal central',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
