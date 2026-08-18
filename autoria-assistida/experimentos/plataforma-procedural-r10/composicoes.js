/* Subgrafos privados do estudo R10. Não entram no catálogo de peças. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../prototipos/procedural/v3/motor/oficina.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';

export const ID_APOIO = 'mecanifica.composicao.r10-apoio-prismatico';
export const ID_NERVURA = 'mecanifica.composicao.r10-nervura-triangular';

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_APOIO,
    versao: '1.0.0',
    parametros: {
      largura: { tipo: 'numero' },
      altura: { tipo: 'numero' },
      profundidade: { tipo: 'numero' },
      parte: { tipo: 'texto' },
      material: { tipo: 'texto' },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'volume',
        operacao: 'cubo',
        argumentos: {
          origemId: 3101,
          larg: { parametro: 'largura' },
          alt: { parametro: 'altura' },
          prof: { parametro: 'profundidade' },
        },
      },
      {
        id: 'identidade',
        operacao: 'parte',
        argumentos: { nome: { parametro: 'parte' }, sel: { tudo: true } },
      },
      {
        id: 'aparencia',
        operacao: 'material',
        argumentos: { usa: { parametro: 'material' }, sel: { tudo: true } },
      },
      { id: 'volume-solido', operacao: 'solido', argumentos: { sel: { tudo: true } } },
    ],
  }),
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_NERVURA,
    versao: '1.0.0',
    parametros: {
      raio: { tipo: 'numero' },
      altura: { tipo: 'numero' },
      parte: { tipo: 'texto' },
      material: { tipo: 'texto' },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'volume-nativo',
        operacao: 'prismaTriangular',
        argumentos: { raio: { parametro: 'raio' }, altura: { parametro: 'altura' } },
      },
      {
        id: 'identidade',
        operacao: 'parte',
        argumentos: { nome: { parametro: 'parte' }, sel: { tudo: true } },
      },
      {
        id: 'aparencia',
        operacao: 'material',
        argumentos: { usa: { parametro: 'material' }, sel: { tudo: true } },
      },
      { id: 'volume-solido', operacao: 'solido', argumentos: { sel: { tudo: true } } },
    ],
  }),
]);
