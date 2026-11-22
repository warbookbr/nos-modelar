/* composicoes.js — as composições da família `fixador`: o parafuso de cada cabeça em três hastes (lisa, roscada até a
   cabeça e roscada só na ponta), a porca e a arruela. São geradas por laço, porque a composição v1 só substitui valores e
   a cabeça e a haste mudam o número de passos.

   A cabeça sextavada é a extrusão do sextavado. A allen e a abaulada têm o sextavado interno tirado por `subtrair`. A haste
   lisa e o núcleo da rosca são cilindros; o filete é o `friso` com `helice`, de pontas fechadas. As partes são `cabeca`,
   `haste` e `rosca` no parafuso, `porca` e `arruela`. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { PONTOS_POR_VOLTA_DA_ROSCA } from './geometria.js';

export const HASTES = Object.freeze(['lisa', 'roscada', 'parcial']);
export const idDoParafuso = (cabeca, haste) => `fixador.parafuso-${cabeca}-${haste}`;
export const ID_DA_PORCA = 'fixador.porca';
export const ID_DA_ARRUELA = 'fixador.arruela';

const p = (nome) => ({ parametro: nome });
const origem = (op, id, extra = {}) => ({ origem: { op, id, ...extra } });
const SEGMENTOS_DO_CIRCULO = 8;
const LADOS_DA_HASTE = 32;
const sextavadoPorParametros = (prefixo) => Array.from({ length: 6 }, (_, k) => [p(`${prefixo}x${k}`), p(`${prefixo}z${k}`)]);
const nomesDoSextavado = (prefixo) => Array.from({ length: 6 }, (_, k) => [[`${prefixo}x${k}`, 'numero'], [`${prefixo}z${k}`, 'numero']]).flat();

const parte = (id, nome, sel) => ({ id, operacao: 'parte', argumentos: { nome, sel } });
const partesDoCilindro = (id, nome, cilindro) => [undefined, 'fundo', 'topo'].map((tampa, k) => parte(`${id}-${k}`, nome, origem('cilindro', cilindro, tampa ? { tampa } : {})));

/* o sextavado interno tirado da cabeça de origem `de` (op, id) */
const recesso = (de) => [
  { id: 'recesso', operacao: 'extrusao', argumentos: { origemId: 11, perfil: sextavadoPorParametros('recesso'), altura: p('alturaDoRecesso'), em: p('emRecesso') } },
  { id: 'cabeca-com-recesso', operacao: 'subtrair', argumentos: { origemId: 12, solidos: [origem(...de), origem('extrusao', 11)] } },
  parte('parte-da-cabeca', 'cabeca', origem('subtrair', 12)),
];

const CABECAS = {
  sextavada: {
    nos: [
      { id: 'cabeca', operacao: 'extrusao', argumentos: { origemId: 10, perfil: sextavadoPorParametros('cabeca'), altura: p('alturaDaCabeca') } },
      parte('parte-da-cabeca', 'cabeca', origem('extrusao', 10)),
    ],
    parametros: [...nomesDoSextavado('cabeca'), ['alturaDaCabeca', 'numero']],
  },
  allen: {
    nos: [
      { id: 'cabeca', operacao: 'extrusao', argumentos: { origemId: 10, perfil: { circulo: { raio: p('raioDaCabeca') } }, altura: p('alturaDaCabeca'), segmentosArco: SEGMENTOS_DO_CIRCULO } },
      ...recesso(['extrusao', 10]),
    ],
    parametros: [['raioDaCabeca', 'numero'], ['alturaDaCabeca', 'numero'], ...nomesDoSextavado('recesso'), ['alturaDoRecesso', 'numero'], ['emRecesso', 'vetor3']],
  },
  abaulada: {
    nos: [
      {
        id: 'cabeca', operacao: 'lathe',
        argumentos: { origemId: 10, lados: LADOS_DA_HASTE, perfil: [[0, 0], [p('raioDaCabeca'), 0], [p('raioDaCabeca'), p('domo0')], [p('domoRaio1'), p('domo1')], [p('domoRaio2'), p('domo2')], [0, p('alturaDaCabeca')]] },
      },
      ...recesso(['lathe', 10]),
    ],
    parametros: [['raioDaCabeca', 'numero'], ['alturaDaCabeca', 'numero'], ['domo0', 'numero'], ['domo1', 'numero'], ['domo2', 'numero'], ['domoRaio1', 'numero'], ['domoRaio2', 'numero'], ...nomesDoSextavado('recesso'), ['alturaDoRecesso', 'numero'], ['emRecesso', 'vetor3']],
  },
};

const haste = [
  { id: 'haste', operacao: 'cilindro', argumentos: { origemId: 20, raio: p('raioDaHaste'), altura: p('alturaDaHaste'), em: p('emHaste'), lados: LADOS_DA_HASTE } },
  ...partesDoCilindro('parte-da-haste', 'haste', 20),
];
const rosca = [
  { id: 'nucleo', operacao: 'cilindro', argumentos: { origemId: 21, raio: p('raioDoNucleo'), altura: p('alturaDoNucleo'), em: p('emNucleo'), lados: LADOS_DA_HASTE } },
  ...partesDoCilindro('parte-do-nucleo', 'haste', 21),
  {
    id: 'filete', operacao: 'friso',
    argumentos: {
      origemId: 30, linha: { nome: 'rosca' }, ponta: 'fechada', fechamento: p('fechamento'),
      helice: { raio: p('raioDoFilete'), passo: p('passo'), voltas: p('voltas'), centro: p('centroDoFilete'), pontosPorVolta: PONTOS_POR_VOLTA_DA_ROSCA },
      perfil: [[p('fileteU0'), p('fileteV0')], [p('fileteU1'), p('fileteV1')], [p('fileteU2'), p('fileteV2')], [p('fileteU3'), p('fileteV3')]],
    },
  },
  parte('parte-do-filete', 'rosca', origem('friso', 30)),
];
const PARAMETROS_DA_HASTE = [['raioDaHaste', 'numero'], ['alturaDaHaste', 'numero'], ['emHaste', 'vetor3']];
const PARAMETROS_DA_ROSCA = [
  ['raioDoNucleo', 'numero'], ['alturaDoNucleo', 'numero'], ['emNucleo', 'vetor3'], ['fechamento', 'numero'], ['raioDoFilete', 'numero'], ['passo', 'numero'],
  ['voltas', 'numero'], ['centroDoFilete', 'vetor3'], ...[0, 1, 2, 3].flatMap((k) => [[`fileteU${k}`, 'numero'], [`fileteV${k}`, 'numero']]),
];

const composicao = (id, nomes, nos) => Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: '1.0.0', parametros: Object.fromEntries(nomes.map(([nome, tipo]) => [nome, { tipo }])),
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1'] }, nos,
});

const parafusos = Object.entries(CABECAS).flatMap(([cabeca, c]) => [
  composicao(idDoParafuso(cabeca, 'lisa'), [...c.parametros, ...PARAMETROS_DA_HASTE], [...c.nos, ...haste]),
  composicao(idDoParafuso(cabeca, 'roscada'), [...c.parametros, ...PARAMETROS_DA_ROSCA], [...c.nos, ...rosca]),
  composicao(idDoParafuso(cabeca, 'parcial'), [...c.parametros, ...PARAMETROS_DA_HASTE, ...PARAMETROS_DA_ROSCA], [...c.nos, ...haste, ...rosca]),
]);

export const COMPOSICOES = Object.freeze([
  ...parafusos,
  composicao(ID_DA_PORCA, [...nomesDoSextavado('porca'), ['alturaDaPorca', 'numero'], ['furo', 'numero']], [
    { id: 'porca', operacao: 'extrusao', argumentos: { origemId: 10, perfil: sextavadoPorParametros('porca'), furos: [{ circulo: { raio: p('furo') } }], altura: p('alturaDaPorca'), segmentosArco: SEGMENTOS_DO_CIRCULO } },
    parte('parte-da-porca', 'porca', origem('extrusao', 10)),
  ]),
  composicao(ID_DA_ARRUELA, [['externo', 'numero'], ['furo', 'numero'], ['alturaDaArruela', 'numero']], [
    { id: 'arruela', operacao: 'extrusao', argumentos: { origemId: 10, perfil: { circulo: { raio: p('externo') } }, furos: [{ circulo: { raio: p('furo') } }], altura: p('alturaDaArruela'), segmentosArco: SEGMENTOS_DO_CIRCULO } },
    parte('parte-da-arruela', 'arruela', origem('extrusao', 10)),
  ]),
]);
