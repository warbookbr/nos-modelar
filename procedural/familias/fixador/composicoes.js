/* composicoes.js — as composições da família `fixador`: o parafuso de cada cabeça em cinco hastes (lisa, roscada até a
   cabeça e roscada só na ponta, as duas roscadas também fundidas), a porca e a arruela. São geradas por laço, porque a composição v1 só substitui valores e
   a cabeça e a haste mudam o número de passos.

   A cabeça sextavada é a extrusão do sextavado. A allen e a abaulada têm o sextavado interno tirado por `subtrair`. A haste
   lisa e o núcleo da rosca são cilindros; o filete é o `friso` com `helice`, de pontas fechadas. As partes são `cabeca`,
   `haste` e `rosca` no parafuso, `porca` e `arruela`. Com a rosca fundida, as quatro peças do parafuso viram um sólido só
   por `unir`, a parte `parafuso`. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { PONTOS_POR_VOLTA_DA_ROSCA } from './geometria.js';

export const HASTES = Object.freeze(['lisa', 'roscada', 'parcial', 'roscada-fundida', 'parcial-fundida']);
export const idDoParafuso = (cabeca, haste) => `fixador.parafuso-${cabeca}-${haste}`;
export const ID_DA_PORCA = 'fixador.porca';
export const ID_DA_ARRUELA = 'fixador.arruela';

const p = (nome) => ({ parametro: nome });
const origem = (op, id, extra = {}) => ({ origem: { op, id, ...extra } });
const SEGMENTOS_DO_CIRCULO = 8;
const LADOS_DA_HASTE = 32;
/* o quanto a limpeza das lascas da união pode mover a superfície, em metro: 10 µm */
const LASCA = 0.00001;
/* a face menor que isto, em metro quadrado, sai como lasca: o quadrado da tolerância de 0,01 mm do STEP */
const AREA_MINIMA = 1e-10;
const sextavadoPorParametros = (prefixo) => Array.from({ length: 6 }, (_, k) => [p(`${prefixo}x${k}`), p(`${prefixo}z${k}`)]);
const nomesDoSextavado = (prefixo) => Array.from({ length: 6 }, (_, k) => [[`${prefixo}x${k}`, 'numero'], [`${prefixo}z${k}`, 'numero']]).flat();

const parte = (id, nome, sel) => ({ id, operacao: 'parte', argumentos: { nome, sel } });
const partesDoCilindro = (id, nome, cilindro) => [undefined, 'fundo', 'topo'].map((tampa, k) => parte(`${id}-${k}`, nome, origem('cilindro', cilindro, tampa ? { tampa } : {})));

/* o sextavado interno tirado da cabeça de origem `de` (op, id); a cabeça passa a ser a origem do subtrair */
const recesso = (de) => [
  { id: 'recesso', operacao: 'extrusao', argumentos: { origemId: 11, perfil: sextavadoPorParametros('recesso'), altura: p('alturaDoRecesso'), em: p('emRecesso') } },
  { id: 'cabeca-com-recesso', operacao: 'subtrair', argumentos: { origemId: 12, solidos: [origem(...de), origem('extrusao', 11)] } },
];

/* cada cabeça: os nós que a geram (`gera`), a origem do sólido dela e os parâmetros */

const CABECAS = {
  sextavada: {
    gera: [
      { id: 'cabeca', operacao: 'extrusao', argumentos: { origemId: 10, perfil: sextavadoPorParametros('cabeca'), altura: p('alturaDaCabeca') } },
    ],
    origem: ['extrusao', 10],
    parametros: [...nomesDoSextavado('cabeca'), ['alturaDaCabeca', 'numero']],
  },
  allen: {
    gera: [
      { id: 'cabeca', operacao: 'extrusao', argumentos: { origemId: 10, perfil: { circulo: { raio: p('raioDaCabeca') } }, altura: p('alturaDaCabeca'), segmentosArco: SEGMENTOS_DO_CIRCULO } },
      ...recesso(['extrusao', 10]),
    ],
    origem: ['subtrair', 12],
    parametros: [['raioDaCabeca', 'numero'], ['alturaDaCabeca', 'numero'], ...nomesDoSextavado('recesso'), ['alturaDoRecesso', 'numero'], ['emRecesso', 'vetor3']],
  },
  abaulada: {
    gera: [
      {
        id: 'cabeca', operacao: 'lathe',
        argumentos: { origemId: 10, lados: LADOS_DA_HASTE, perfil: [[0, 0], [p('raioDaCabeca'), 0], [p('raioDaCabeca'), p('domo0')], [p('domoRaio1'), p('domo1')], [p('domoRaio2'), p('domo2')], [0, p('alturaDaCabeca')]] },
      },
      ...recesso(['lathe', 10]),
    ],
    origem: ['subtrair', 12],
    parametros: [['raioDaCabeca', 'numero'], ['alturaDaCabeca', 'numero'], ['domo0', 'numero'], ['domo1', 'numero'], ['domo2', 'numero'], ['domoRaio1', 'numero'], ['domoRaio2', 'numero'], ...nomesDoSextavado('recesso'), ['alturaDoRecesso', 'numero'], ['emRecesso', 'vetor3']],
  },
};

const cabecaComParte = (c) => [...c.gera, parte('parte-da-cabeca', 'cabeca', origem(...c.origem))];
const filete = {
  id: 'filete', operacao: 'friso',
  argumentos: {
    origemId: 30, linha: { nome: 'rosca' }, ponta: 'fechada', fechamento: p('fechamento'),
    helice: { raio: p('raioDoFilete'), passo: p('passo'), voltas: p('voltas'), centro: p('centroDoFilete'), pontosPorVolta: PONTOS_POR_VOLTA_DA_ROSCA },
    perfil: [[p('fileteU0'), p('fileteV0')], [p('fileteU1'), p('fileteV1')], [p('fileteU2'), p('fileteV2')], [p('fileteU3'), p('fileteV3')]],
  },
};
const haste = [
  { id: 'haste', operacao: 'cilindro', argumentos: { origemId: 20, raio: p('raioDaHaste'), altura: p('alturaDaHaste'), em: p('emHaste'), lados: LADOS_DA_HASTE } },
  ...partesDoCilindro('parte-da-haste', 'haste', 20),
];
const rosca = [
  { id: 'nucleo', operacao: 'cilindro', argumentos: { origemId: 21, raio: p('raioDoNucleo'), altura: p('alturaDoNucleo'), em: p('emNucleo'), lados: LADOS_DA_HASTE } },
  ...partesDoCilindro('parte-do-nucleo', 'haste', 21),
  filete,
  parte('parte-do-filete', 'rosca', origem('friso', 30)),
];

/* a rosca fundida: a haste e o núcleo são extrusões de círculo (a origem cobre o sólido inteiro, com as tampas), entram
   um pouco na peça de cima, e `unir` junta a cabeça, a haste, o núcleo e o filete num sólido só, a parte `parafuso` */
function fundido(c, comHaste) {
  const cilindro = (id, origemId, raio, altura, em) => ({ id, operacao: 'extrusao', argumentos: { origemId, perfil: { circulo: { raio: p(raio) } }, altura: p(altura), em: p(em), segmentosArco: SEGMENTOS_DO_CIRCULO } });
  return [
    ...c.gera,
    ...(comHaste ? [cilindro('haste', 20, 'raioDaHaste', 'alturaDaHaste', 'emHaste')] : []),
    cilindro('nucleo', 21, 'raioDoNucleo', 'alturaDoNucleo', 'emNucleo'),
    filete,
    { id: 'parafuso-fundido', operacao: 'unir', argumentos: { origemId: 40, solidos: [origem(...c.origem), ...(comHaste ? [origem('extrusao', 20)] : []), origem('extrusao', 21), origem('friso', 30)] } },
    parte('parte-do-parafuso', 'parafuso', origem('unir', 40)),
    { id: 'limpar-lascas', operacao: 'limparLascas', argumentos: { sel: { grupo: 'parafuso' }, tolerancia: LASCA, areaMinima: AREA_MINIMA } },
  ];
}
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
  composicao(idDoParafuso(cabeca, 'lisa'), [...c.parametros, ...PARAMETROS_DA_HASTE], [...cabecaComParte(c), ...haste]),
  composicao(idDoParafuso(cabeca, 'roscada'), [...c.parametros, ...PARAMETROS_DA_ROSCA], [...cabecaComParte(c), ...rosca]),
  composicao(idDoParafuso(cabeca, 'parcial'), [...c.parametros, ...PARAMETROS_DA_HASTE, ...PARAMETROS_DA_ROSCA], [...cabecaComParte(c), ...haste, ...rosca]),
  composicao(idDoParafuso(cabeca, 'roscada-fundida'), [...c.parametros, ...PARAMETROS_DA_ROSCA], fundido(c, false)),
  composicao(idDoParafuso(cabeca, 'parcial-fundida'), [...c.parametros, ...PARAMETROS_DA_HASTE, ...PARAMETROS_DA_ROSCA], fundido(c, true)),
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
