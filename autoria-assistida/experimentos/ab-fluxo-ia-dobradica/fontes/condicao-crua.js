/* DOBRADIÇA DE PORTÃO — conjunto procedural técnico-didático F2 para inspeção
   e montagem. Duas folhas retangulares de 1,20 m × 0,65 m × 35 mm encontram-se
   num eixo vertical: o gomo central pertence à folha fixa, os gomos inferior e
   superior pertencem à móvel, e um pino com folga real atravessa os três.

   Os barris são vazados por `furo`, não cilindros sólidos sobrepostos ao pino.
   Pequenas abas, incluídas nas partes das folhas, alcançam somente os gomos de
   que cada folha é dona. Toda seleção persistida usa origem estrutural ou alias;
   não há ids posicionais de vértice ou face.

   Bancada e régua:
     npm run descrever -- _dobradica-de-portao --estrito
     npm run bancada -- _dobradica-de-portao --vistas=isometrica,frontal,direita,superior
     npm run bancada -- _dobradica-de-portao --selecionadas=barrilFixo,barrisMoveis,pino --modo=isolar --focar
*/
import { executar, colisaoDe } from '../motor/oficina.js';

export const TOPO = {
  ladosBarril: 24,
  ladosFuro: 20,
  ladosPino: 20,
};

const MEDIDAS = {
  folhaAltura: 1.20,
  folhaLargura: 0.65,
  folhaEspessura: 0.035,
  anguloAbertura: -60,

  /* O corpo para 60 mm antes do eixo; a aba avança até 45 mm. Como o barril
     tem raio de 55 mm, há uma união curta e legível só no gomo correspondente. */
  recuoCorpoAoEixo: 0.060,
  abaLargura: 0.020,
  abaAvanco: 0.015,

  barrilRaio: 0.055,
  barrilFuroRaio: 0.025,
  gomoAltura: 0.350,
  folgaEntreGomos: 0.040,
  barrilInferiorY: 0.035,

  pinoRaio: 0.018,
  pinoBaseY: -0.070,
  pinoAltura: 1.340,
  cabecaPinoRaio: 0.034,
  cabecaPinoAltura: 0.040,
};

const DERIVADAS = {
  folhaCorpoLargura: '= folhaLargura - abaAvanco',
  folhaCorpoCentroX: '= recuoCorpoAoEixo + folhaCorpoLargura / 2',
  folhaCorpoCentroXNeg: '= -folhaCorpoCentroX',
  abaCentroX: '= recuoCorpoAoEixo - abaAvanco + abaLargura / 2',
  abaCentroXNeg: '= -abaCentroX',

  barrilCentralY: '= barrilInferiorY + gomoAltura + folgaEntreGomos',
  barrilSuperiorY: '= barrilCentralY + gomoAltura + folgaEntreGomos',
  barrilInferiorTopoY: '= barrilInferiorY + gomoAltura',
  barrilCentralTopoY: '= barrilCentralY + gomoAltura',
  barrilSuperiorTopoY: '= barrilSuperiorY + gomoAltura',
  cabecaPinoBaseY: '= pinoBaseY + pinoAltura',
};

export const PARAMS = { ...MEDIDAS, ...DERIVADAS };

export const MATERIAIS = {
  acoFixo: { cor: '#31556f', aspereza: 0.58 },
  acoMovel: { cor: '#c87932', aspereza: 0.52 },
  acoDoPino: { cor: '#aeb8bf', aspereza: 0.28 },
};

/* Identidades estruturais declaradas pelo autor. */
const FOLHA_FIXA_CORPO = 710;
const FOLHA_FIXA_ABA = 711;
const FOLHA_MOVEL_CORPO = 720;
const FOLHA_MOVEL_ABA_INFERIOR = 721;
const FOLHA_MOVEL_ABA_SUPERIOR = 722;
const BARRIL_FIXO = 730;
const FURO_BARRIL_FIXO = 731;
const BARRIL_MOVEL_INFERIOR = 740;
const FURO_BARRIL_MOVEL_INFERIOR = 741;
const BARRIL_MOVEL_SUPERIOR = 742;
const FURO_BARRIL_MOVEL_SUPERIOR = 743;
const PINO_CORPO = 750;
const PINO_CABECA = 751;

const FACES_DO_CUBO = ['fundo', 'topo', 'tras', 'direita', 'frente', 'esquerda'];
const TODOS = { passo: 1, fase: 0 };

const cubosInteiros = (ids) => ids.flatMap((id) =>
  FACES_DO_CUBO.map((face) => ({ origem: { op: 'cubo', id, face } })),
);

const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });

/* Depois do corte, as tampas originais não existem mais: o barril completo é
   a lateral original mais os dois anéis e a parede publicados pelo furo. */
const barrilVazado = (barrilId, furoId) => [
  { origem: { op: 'cilindro', id: barrilId } },
  { origem: { op: 'furo', id: furoId, borda: TODOS } },
  { origem: { op: 'furo', id: furoId, parede: TODOS } },
  { origem: { op: 'furo', id: furoId, saida: TODOS } },
];

export const ALIASES = [
  ['folhaFixaInteira', { unir: cubosInteiros([FOLHA_FIXA_CORPO, FOLHA_FIXA_ABA]) }],
  ['folhaMovelInteira', { unir: cubosInteiros([
    FOLHA_MOVEL_CORPO,
    FOLHA_MOVEL_ABA_INFERIOR,
    FOLHA_MOVEL_ABA_SUPERIOR,
  ]) }],

  ['barrilFixoAntesDoFuro', cilindroInteiro(BARRIL_FIXO)],
  ['barrilMovelInferiorAntesDoFuro', cilindroInteiro(BARRIL_MOVEL_INFERIOR)],
  ['barrilMovelSuperiorAntesDoFuro', cilindroInteiro(BARRIL_MOVEL_SUPERIOR)],
  ['barrilFixoInteiro', { unir: barrilVazado(BARRIL_FIXO, FURO_BARRIL_FIXO) }],
  ['barrisMoveisInteiros', { unir: [
    ...barrilVazado(BARRIL_MOVEL_INFERIOR, FURO_BARRIL_MOVEL_INFERIOR),
    ...barrilVazado(BARRIL_MOVEL_SUPERIOR, FURO_BARRIL_MOVEL_SUPERIOR),
  ] }],
  ['paredesDosBarris', { unir: [
    { origem: { op: 'furo', id: FURO_BARRIL_FIXO, parede: TODOS } },
    { origem: { op: 'furo', id: FURO_BARRIL_MOVEL_INFERIOR, parede: TODOS } },
    { origem: { op: 'furo', id: FURO_BARRIL_MOVEL_SUPERIOR, parede: TODOS } },
  ] }],
  ['lateraisDosBarris', { unir: [
    { origem: { op: 'cilindro', id: BARRIL_FIXO } },
    { origem: { op: 'cilindro', id: BARRIL_MOVEL_INFERIOR } },
    { origem: { op: 'cilindro', id: BARRIL_MOVEL_SUPERIOR } },
  ] }],
  ['pinoInteiro', { unir: [
    ...cilindroInteiro(PINO_CORPO).unir,
    ...cilindroInteiro(PINO_CABECA).unir,
  ] }],
  ['lateraisDoPino', { unir: [
    { origem: { op: 'cilindro', id: PINO_CORPO } },
    { origem: { op: 'cilindro', id: PINO_CABECA } },
  ] }],
];

export const PASSOS = [
  /* Folhas: corpos retangulares e abas locais, soldadas apenas ao gomo de sua
     propriedade. A extensão total de cada folha, da borda externa à aba, é
     aproximadamente 0,65 m. */
  ['cubo', { origemId: FOLHA_FIXA_CORPO, larg: 'folhaCorpoLargura', alt: 'folhaAltura', prof: 'folhaEspessura' }],
  ['transladar', { d: ['folhaCorpoCentroXNeg', 0, 0], sel: { origem: { op: 'cubo', id: FOLHA_FIXA_CORPO } } }],
  ['cubo', { origemId: FOLHA_FIXA_ABA, larg: 'abaLargura', alt: 'gomoAltura', prof: 'folhaEspessura' }],
  ['transladar', { d: ['abaCentroXNeg', 'barrilCentralY', 0], sel: { origem: { op: 'cubo', id: FOLHA_FIXA_ABA } } }],

  ['cubo', { origemId: FOLHA_MOVEL_CORPO, larg: 'folhaCorpoLargura', alt: 'folhaAltura', prof: 'folhaEspessura' }],
  ['transladar', { d: ['folhaCorpoCentroX', 0, 0], sel: { origem: { op: 'cubo', id: FOLHA_MOVEL_CORPO } } }],
  ['cubo', { origemId: FOLHA_MOVEL_ABA_INFERIOR, larg: 'abaLargura', alt: 'gomoAltura', prof: 'folhaEspessura' }],
  ['transladar', { d: ['abaCentroX', 'barrilInferiorY', 0], sel: { origem: { op: 'cubo', id: FOLHA_MOVEL_ABA_INFERIOR } } }],
  ['cubo', { origemId: FOLHA_MOVEL_ABA_SUPERIOR, larg: 'abaLargura', alt: 'gomoAltura', prof: 'folhaEspessura' }],
  ['transladar', { d: ['abaCentroX', 'barrilSuperiorY', 0], sel: { origem: { op: 'cubo', id: FOLHA_MOVEL_ABA_SUPERIOR } } }],
  ['rotaciona', { eixo: 'y', graus: 'anguloAbertura', pivo: [0, 0, 0], sel: { alias: 'folhaMovelInteira' } }],

  /* Gomo fixo central. O furo remove as tampas e cria a parede cilíndrica por
     onde o pino passa. */
  ['cilindro', { origemId: BARRIL_FIXO, raio: 'barrilRaio', altura: 'gomoAltura', lados: 'ladosBarril' }],
  ['transladar', { d: [0, 'barrilCentralY', 0], sel: { alias: 'barrilFixoAntesDoFuro' } }],
  ['furo', {
    origemId: FURO_BARRIL_FIXO,
    de: { op: 'cilindro', id: BARRIL_FIXO, tampa: 'topo' },
    saida: { op: 'cilindro', id: BARRIL_FIXO, tampa: 'fundo' },
    centro: [0, 'barrilCentralTopoY', 0],
    raio: 'barrilFuroRaio',
    lados: 'ladosFuro',
    orientacao: [1, 0, 0],
  }],

  /* Gomos móveis inferior e superior, no mesmo eixo. */
  ['cilindro', { origemId: BARRIL_MOVEL_INFERIOR, raio: 'barrilRaio', altura: 'gomoAltura', lados: 'ladosBarril' }],
  ['transladar', { d: [0, 'barrilInferiorY', 0], sel: { alias: 'barrilMovelInferiorAntesDoFuro' } }],
  ['furo', {
    origemId: FURO_BARRIL_MOVEL_INFERIOR,
    de: { op: 'cilindro', id: BARRIL_MOVEL_INFERIOR, tampa: 'topo' },
    saida: { op: 'cilindro', id: BARRIL_MOVEL_INFERIOR, tampa: 'fundo' },
    centro: [0, 'barrilInferiorTopoY', 0],
    raio: 'barrilFuroRaio',
    lados: 'ladosFuro',
    orientacao: [1, 0, 0],
  }],
  ['cilindro', { origemId: BARRIL_MOVEL_SUPERIOR, raio: 'barrilRaio', altura: 'gomoAltura', lados: 'ladosBarril' }],
  ['transladar', { d: [0, 'barrilSuperiorY', 0], sel: { alias: 'barrilMovelSuperiorAntesDoFuro' } }],
  ['furo', {
    origemId: FURO_BARRIL_MOVEL_SUPERIOR,
    de: { op: 'cilindro', id: BARRIL_MOVEL_SUPERIOR, tampa: 'topo' },
    saida: { op: 'cilindro', id: BARRIL_MOVEL_SUPERIOR, tampa: 'fundo' },
    centro: [0, 'barrilSuperiorTopoY', 0],
    raio: 'barrilFuroRaio',
    lados: 'ladosFuro',
    orientacao: [1, 0, 0],
  }],

  /* Pino passante: a haste ultrapassa os gomos embaixo e em cima; a cabeça
     superior é parte do mesmo pino e torna a orientação de montagem explícita. */
  ['cilindro', { origemId: PINO_CORPO, raio: 'pinoRaio', altura: 'pinoAltura', lados: 'ladosPino' }],
  ['transladar', { d: [0, 'pinoBaseY', 0], sel: { origem: { op: 'cilindro', id: PINO_CORPO, tampa: 'fundo' } } }],
  ['transladar', { d: [0, 'pinoBaseY', 0], sel: { origem: { op: 'cilindro', id: PINO_CORPO, tampa: 'topo' } } }],
  ['cilindro', { origemId: PINO_CABECA, raio: 'cabecaPinoRaio', altura: 'cabecaPinoAltura', lados: 'ladosPino' }],
  ['transladar', { d: [0, 'cabecaPinoBaseY', 0], sel: { origem: { op: 'cilindro', id: PINO_CABECA, tampa: 'fundo' } } }],
  ['transladar', { d: [0, 'cabecaPinoBaseY', 0], sel: { origem: { op: 'cilindro', id: PINO_CABECA, tampa: 'topo' } } }],

  /* Exatamente as cinco identidades semânticas pedidas. */
  ['parte', { nome: 'folhaFixa', sel: { alias: 'folhaFixaInteira' }, pivo: [0, 0, 0] }],
  ['parte', { nome: 'folhaMovel', sel: { alias: 'folhaMovelInteira' }, pivo: [0, 0, 0] }],
  ['parte', { nome: 'barrilFixo', sel: { alias: 'barrilFixoInteiro' }, pivo: [0, 0, 0] }],
  ['parte', { nome: 'barrisMoveis', sel: { alias: 'barrisMoveisInteiros' }, pivo: [0, 0, 0] }],
  ['parte', { nome: 'pino', sel: { alias: 'pinoInteiro' }, pivo: [0, 0, 0] }],

  ['liso', { sel: { alias: 'lateraisDosBarris' } }],
  ['liso', { sel: { alias: 'paredesDosBarris' } }],
  ['liso', { sel: { alias: 'lateraisDoPino' } }],

  ['material', { sel: { grupo: 'folhaFixa' }, usa: 'acoFixo' }],
  ['material', { sel: { grupo: 'barrilFixo' }, usa: 'acoFixo' }],
  ['material', { sel: { grupo: 'folhaMovel' }, usa: 'acoMovel' }],
  ['material', { sel: { grupo: 'barrisMoveis' }, usa: 'acoMovel' }],
  ['material', { sel: { grupo: 'pino' }, usa: 'acoDoPino' }],

  ['solido', { sel: { grupo: 'folhaFixa' } }],
  ['solido', { sel: { grupo: 'folhaMovel' } }],
  ['solido', { sel: { grupo: 'barrilFixo' } }],
  ['solido', { sel: { grupo: 'barrisMoveis' } }],
  ['solido', { sel: { grupo: 'pino' } }],
];

export const meta = {
  nome: '_dobradica-de-portao',
  tipo: 'objeto',
  desc: 'dobradiça vertical de portão F2 — duas folhas retangulares, três gomos vazados alternados e pino passante saliente',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
