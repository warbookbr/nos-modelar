/* Fixture de teste: uma composição procedural mínima (um bloco identificado) e o
   registro que a executa. Quem a usa é `tools/mecanifica/composicao-na-varredura.test.mjs`,
   e mudar qualquer arquivo desta pasta muda o que esse teste prova. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../procedural/nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';

export const ID_BLOCO = 'mecanifica.composicao.bloco-identificado';

const parametro = (nome) => ({ parametro: nome });

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_BLOCO,
    versao: '1.0.0',
    parametros: {
      origem: { tipo: 'inteiro' },
      largura: { tipo: 'numero' },
      altura: { tipo: 'numero' },
      profundidade: { tipo: 'numero' },
      centro: { tipo: 'vetor3' },
      parte: { tipo: 'texto' },
      material: { tipo: 'texto' },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'volume',
        operacao: 'cubo',
        argumentos: {
          origemId: parametro('origem'),
          larg: parametro('largura'),
          alt: parametro('altura'),
          prof: parametro('profundidade'),
          em: parametro('centro'),
        },
      },
      {
        id: 'identidade',
        operacao: 'parte',
        argumentos: {
          nome: parametro('parte'),
          sel: { origem: { op: 'cubo', id: parametro('origem') } },
        },
      },
      {
        id: 'aparencia',
        operacao: 'material',
        argumentos: {
          usa: parametro('material'),
          sel: { origem: { op: 'cubo', id: parametro('origem') } },
        },
      },
      {
        id: 'casca-solida',
        operacao: 'solido',
        argumentos: { sel: { origem: { op: 'cubo', id: parametro('origem') } } },
      },
    ],
  }),
]);
