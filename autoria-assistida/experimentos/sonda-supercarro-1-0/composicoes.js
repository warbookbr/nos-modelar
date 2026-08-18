/* Bloco privado reutilizável: volume facetado com identidade e aparência. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../prototipos/procedural/v3/motor/oficina.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const parametro = (nome) => ({ parametro: nome });

export const ID_VOLUME_FACETADO = 'mecanifica.composicao.volume-facetado-identificado';

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_VOLUME_FACETADO,
    versao: '1.0.0',
    parametros: {
      origem: { tipo: 'inteiro' },
      largura: { tipo: 'numero' },
      altura: { tipo: 'numero' },
      profundidade: { tipo: 'numero' },
      chanfro: { tipo: 'numero' },
      centro: { tipo: 'vetor3' },
      parte: { tipo: 'texto' },
      material: { tipo: 'texto' },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'volume',
        operacao: 'chamferBox',
        argumentos: {
          origemId: parametro('origem'),
          larg: parametro('largura'),
          alt: parametro('altura'),
          prof: parametro('profundidade'),
          chanfro: parametro('chanfro'),
          em: parametro('centro'),
        },
      },
      {
        id: 'identidade',
        operacao: 'parte',
        argumentos: {
          nome: parametro('parte'),
          sel: { origem: { op: 'chamferBox', id: parametro('origem') } },
        },
      },
      {
        id: 'aparencia',
        operacao: 'material',
        argumentos: {
          usa: parametro('material'),
          sel: { origem: { op: 'chamferBox', id: parametro('origem') } },
        },
      },
      {
        id: 'casca-solida',
        operacao: 'solido',
        argumentos: { sel: { origem: { op: 'chamferBox', id: parametro('origem') } } },
      },
    ],
  }),
]);
