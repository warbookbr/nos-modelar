/* Subgrafos privados e paramétricos do ensaio 1.0. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../../procedural/nucleo/entrada.js';

const MALHA = 'mecanifica.malha-poligonal@1';
const PARTE = 'mecanifica.parte@1';
const PORTA = 'mecanifica.porta@1';

export const ID_CHAPA_RECORTADA = 'mecanifica.composicao.chapa-recortada';
export const ID_OLHAL = 'mecanifica.composicao.olhal-cilindrico';
export const ID_PINO = 'mecanifica.composicao.pino-passante-segmentado';

const parametro = (nome) => ({ parametro: nome });

export const COMPOSICOES = Object.freeze([
  /* CHAPA COM A FAIXA DOS NÓS DA OUTRA FOLHA RECORTADA. A chapa inteira de cada folha atravessava os olhais da outra
     (cerca de 2400 mm³ de sobreposição medida entre as duas folhas), e o contato de sólidos acusava a interpenetração
     que o ensaio chamava de encosto. O perfil é um polígono de oito pontos no plano de y e x: a chapa vai de `xFora` até
     `xBorda` nas pontas e só até `xMeio` na faixa entre `vA` e `vB`, que é a faixa que o nó da outra folha ocupa mais a
     folga. Na folha da porta `xMeio` fica além de `xBorda` (aba que sobra entre os nós do batente) e na do batente
     fica aquém (recorte onde passa o nó da porta). A extrusão sai em z (eixo 'z'), e nesse eixo o ponto [u, v] vai
     para x = u e y = -v; por isso `vTopo`, `vA` e `vB` são as alturas com o sinal trocado. */
  Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL,
    id: ID_CHAPA_RECORTADA,
    versao: '1.0.0',
    parametros: {
      origem: { tipo: 'inteiro' },
      xFora: { tipo: 'numero' },
      xBorda: { tipo: 'numero' },
      xMeio: { tipo: 'numero' },
      vTopo: { tipo: 'numero' },
      vA: { tipo: 'numero' },
      vB: { tipo: 'numero' },
      profundidade: { tipo: 'numero' },
      centro: { tipo: 'vetor3' },
      parte: { tipo: 'texto' },
      material: { tipo: 'texto' },
    },
    artefatos: { entra: [], sai: [MALHA, PARTE] },
    nos: [
      {
        id: 'volume',
        operacao: 'extrusao',
        argumentos: {
          origemId: parametro('origem'),
          perfil: [
            [parametro('xFora'), 0],
            [parametro('xFora'), parametro('vTopo')],
            [parametro('xBorda'), parametro('vTopo')],
            [parametro('xBorda'), parametro('vB')],
            [parametro('xMeio'), parametro('vB')],
            [parametro('xMeio'), parametro('vA')],
            [parametro('xBorda'), parametro('vA')],
            [parametro('xBorda'), 0],
          ],
          altura: parametro('profundidade'),
          eixo: 'z',
          em: parametro('centro'),
        },
      },
      {
        id: 'identidade',
        operacao: 'parte',
        argumentos: {
          nome: parametro('parte'),
          sel: { origem: { op: 'extrusao', id: parametro('origem') } },
        },
      },
      {
        id: 'aparencia',
        operacao: 'material',
        argumentos: {
          usa: parametro('material'),
          sel: { origem: { op: 'extrusao', id: parametro('origem') } },
        },
      },
      {
        id: 'casca-solida',
        operacao: 'solido',
        argumentos: { sel: { origem: { op: 'extrusao', id: parametro('origem') } } },
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
