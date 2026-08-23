/* Experimento confinado — folha fixa de uma dobradiça didática. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico',
  fidelidade: 'F2',
  precisao: 'mecanica',
  interacao: 'montagem',
  distanciaMinima: 0.12,
  orcamentoFaces: 220,
};

export const PARAMS = {
  larguraFolha: 0.070,
  alturaFolha: 0.120,
  espessuraFolha: 0.006,
  centroFolha: [-0.035, 0, 0],
  raioInternoOlhal: 0.0042,
  raioExternoOlhal: 0.009,
  comprimentoOlhal: 0.040,
  inicioOlhalSuperior: [0, 0.080, 0],
};

export const TOPO = { lados: 24 };

export const MATERIAIS = {
  folha: { cor: '#55758f', aspereza: 0.48, metalness: 0.62 },
  olhal: { cor: '#38556d', aspereza: 0.42, metalness: 0.68 },
};

const CHAPA = 8101;
const OLHAL_INFERIOR = 8102;
const OLHAL_SUPERIOR = 8103;
const PERFIL_OLHAL = [
  ['raioInternoOlhal', 0],
  ['raioExternoOlhal', 0],
  ['raioExternoOlhal', 'comprimentoOlhal'],
  ['raioInternoOlhal', 'comprimentoOlhal'],
  ['raioInternoOlhal', 0],
];

const ORIGEM_CHAPA = { op: 'cubo', id: CHAPA };
const ORIGEM_INFERIOR = { op: 'lathe', id: OLHAL_INFERIOR };
const ORIGEM_SUPERIOR = { op: 'lathe', id: OLHAL_SUPERIOR };

export const ALIASES = [
  ['chapaInteira', { origem: ORIGEM_CHAPA }],
  ['olhalInferiorInteiro', { origem: ORIGEM_INFERIOR }],
  ['olhalSuperiorInteiro', { origem: ORIGEM_SUPERIOR }],
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
    origemId: OLHAL_INFERIOR,
    perfil: PERFIL_OLHAL,
    lados: 'lados',
  }],
  ['lathe', {
    origemId: OLHAL_SUPERIOR,
    perfil: PERFIL_OLHAL,
    lados: 'lados',
    em: 'inicioOlhalSuperior',
  }],

  ['parte', { nome: 'chapaFixa', sel: { alias: 'chapaInteira' } }],
  ['parte', { nome: 'olhalInferior', sel: { alias: 'olhalInferiorInteiro' } }],
  ['parte', { nome: 'olhalSuperior', sel: { alias: 'olhalSuperiorInteiro' } }],

  ['publicarPorta', {
    nome: 'alojamentoInferiorDoPino',
    de: { ...ORIGEM_INFERIOR, faixa: 3 },
    interface: {
      forma: 'cilindro', papel: 'interna', eixo: [0, 1, 0], referencia: [1, 0, 0],
      centro: [0, 0, 0], raio: 'raioInternoOlhal', inicio: 0, fim: 'comprimentoOlhal',
    },
  }],
  ['publicarPorta', {
    nome: 'alojamentoSuperiorDoPino',
    de: { ...ORIGEM_SUPERIOR, faixa: 3 },
    interface: {
      forma: 'cilindro', papel: 'interna', eixo: [0, 1, 0], referencia: [1, 0, 0],
      centro: 'inicioOlhalSuperior', raio: 'raioInternoOlhal', inicio: 0, fim: 'comprimentoOlhal',
    },
  }],

  ['liso', { sel: { origem: { ...ORIGEM_INFERIOR, faixa: 1 } } }],
  ['liso', { sel: { origem: { ...ORIGEM_INFERIOR, faixa: 3 } } }],
  ['liso', { sel: { origem: { ...ORIGEM_SUPERIOR, faixa: 1 } } }],
  ['liso', { sel: { origem: { ...ORIGEM_SUPERIOR, faixa: 3 } } }],
  ['material', { sel: { grupo: 'chapaFixa' }, usa: 'folha' }],
  ['material', { sel: { grupo: 'olhalInferior' }, usa: 'olhal' }],
  ['material', { sel: { grupo: 'olhalSuperior' }, usa: 'olhal' }],
  ['solido', { sel: { grupo: 'chapaFixa' } }],
  ['solido', { sel: { grupo: 'olhalInferior' } }],
  ['solido', { sel: { grupo: 'olhalSuperior' } }],
];

export const meta = {
  nome: 'folha-fixa',
  tipo: 'objeto',
  desc: 'folha fixa experimental com dois olhais alternados',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
