/* Subgrafos privados e paramétricos do ensaio 1.0. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../prototipos/procedural/v3/motor/oficina.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const ID_CHAPA = 'mecanifica.composicao.chapa-identificada';
export const ID_OLHAL = 'mecanifica.composicao.olhal-cilindrico';
export const ID_PINO = 'mecanifica.composicao.pino-passante-segmentado';

const parametro = (nome) => ({ parametro: nome });

export const COMPOSICOES = Object.freeze([
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_CHAPA,
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
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_OLHAL,
    versao: '1.0.0',
    parametros: {
      origem: { tipo: 'inteiro' },
      raioInterno: { tipo: 'numero' },
      raioExterno: { tipo: 'numero' },
      comprimento: { tipo: 'numero' },
      inicio: { tipo: 'vetor3' },
      parte: { tipo: 'texto' },
      material: { tipo: 'texto' },
      porta: { tipo: 'texto' },
      lados: { tipo: 'inteiro', padrao: 24 },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      {
        id: 'revolucao',
        operacao: 'lathe',
        argumentos: {
          origemId: parametro('origem'),
          perfil: [
            [parametro('raioInterno'), 0],
            [parametro('raioExterno'), 0],
            [parametro('raioExterno'), parametro('comprimento')],
            [parametro('raioInterno'), parametro('comprimento')],
            [parametro('raioInterno'), 0],
          ],
          lados: parametro('lados'),
          em: parametro('inicio'),
        },
      },
      {
        id: 'identidade',
        operacao: 'parte',
        argumentos: {
          nome: parametro('parte'),
          sel: { origem: { op: 'lathe', id: parametro('origem') } },
        },
      },
      {
        id: 'interface',
        operacao: 'publicarPorta',
        argumentos: {
          nome: parametro('porta'),
          de: { op: 'lathe', id: parametro('origem'), faixa: 3 },
          interface: {
            forma: 'cilindro',
            papel: 'interna',
            eixo: [0, 1, 0],
            referencia: [1, 0, 0],
            centro: parametro('inicio'),
            raio: parametro('raioInterno'),
            inicio: 0,
            fim: parametro('comprimento'),
          },
        },
      },
      {
        id: 'suavidade-externa',
        operacao: 'liso',
        argumentos: { sel: { origem: { op: 'lathe', id: parametro('origem'), faixa: 1 } } },
      },
      {
        id: 'suavidade-interna',
        operacao: 'liso',
        argumentos: { sel: { origem: { op: 'lathe', id: parametro('origem'), faixa: 3 } } },
      },
      {
        id: 'aparencia',
        operacao: 'material',
        argumentos: {
          usa: parametro('material'),
          sel: { origem: { op: 'lathe', id: parametro('origem') } },
        },
      },
      {
        id: 'casca-solida',
        operacao: 'solido',
        argumentos: { sel: { origem: { op: 'lathe', id: parametro('origem') } } },
      },
    ],
  }),
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_PINO,
    versao: '1.0.0',
    parametros: {
      origem: { tipo: 'inteiro' },
      raioHaste: { tipo: 'numero' },
      raioCabeca: { tipo: 'numero' },
      inicioCabeca: { tipo: 'numero' },
      inicioHaste: { tipo: 'numero' },
      fimInferior: { tipo: 'numero' },
      fimCentral: { tipo: 'numero' },
      fimHaste: { tipo: 'numero' },
      parte: { tipo: 'texto' },
      material: { tipo: 'texto' },
      portaInferior: { tipo: 'texto' },
      portaCentral: { tipo: 'texto' },
      portaSuperior: { tipo: 'texto' },
      lados: { tipo: 'inteiro', padrao: 24 },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE, PORTA] },
    nos: [
      {
        id: 'revolucao',
        operacao: 'lathe',
        argumentos: {
          origemId: parametro('origem'),
          perfil: [
            [0, parametro('inicioCabeca')],
            [parametro('raioCabeca'), parametro('inicioCabeca')],
            [parametro('raioCabeca'), parametro('inicioHaste')],
            [parametro('raioHaste'), parametro('inicioHaste')],
            [parametro('raioHaste'), parametro('fimHaste')],
            [0, parametro('fimHaste')],
          ],
          lados: parametro('lados'),
        },
      },
      {
        id: 'identidade',
        operacao: 'parte',
        argumentos: {
          nome: parametro('parte'),
          sel: { origem: { op: 'lathe', id: parametro('origem') } },
        },
      },
      ...[
        ['interface-inferior', 'portaInferior', 'inicioHaste', 'fimInferior'],
        ['interface-central', 'portaCentral', 'fimInferior', 'fimCentral'],
        ['interface-superior', 'portaSuperior', 'fimCentral', 'fimHaste'],
      ].map(([id, porta, inicio, fim]) => ({
        id,
        operacao: 'publicarPorta',
        argumentos: {
          nome: parametro(porta),
          de: { op: 'lathe', id: parametro('origem'), faixa: 3 },
          interface: {
            forma: 'cilindro',
            papel: 'externa',
            eixo: [0, 1, 0],
            referencia: [1, 0, 0],
            centro: [0, 0, 0],
            raio: parametro('raioHaste'),
            inicio: parametro(inicio),
            fim: parametro(fim),
          },
        },
      })),
      {
        id: 'suavidade',
        operacao: 'liso',
        argumentos: { sel: { origem: { op: 'lathe', id: parametro('origem') } } },
      },
      {
        id: 'aparencia',
        operacao: 'material',
        argumentos: {
          usa: parametro('material'),
          sel: { origem: { op: 'lathe', id: parametro('origem') } },
        },
      },
      {
        id: 'casca-solida',
        operacao: 'solido',
        argumentos: { sel: { origem: { op: 'lathe', id: parametro('origem') } } },
      },
    ],
  }),
]);
