/* PEÇA DE EXERCÍCIO — dobradiça vertical de portão para inspeção na bancada.
   Duas folhas de chapa compartilham o eixo Y: a folha fixa carrega o gomo
   central e a móvel carrega os gomos inferior e superior. Os três barris são
   perfis de revolução fechados e ocos; o pino passa pela cavidade com folga
   radial e ultrapassa o conjunto nas duas extremidades. Toda seleção usa
   identidade estrutural ou parte semântica, sem ids posicionais. */
import { executar, colisaoDe } from '../motor/oficina.js';

export const PARAMS = {
  folhaAltura: 1.20,
  folhaLargura: 0.72,
  folhaEspessura: 0.012,
  folhaFixaX: -0.400,
  folhaMovelX: 0.400,
  aberturaDeInspecao: 24,

  barrilRaioExterno: 0.040,
  barrilRaioInterno: 0.022,
  gomoAltura: 0.380,
  gomoInferiorBaseY: 0,
  gomoInferiorTopoY: 0.380,
  gomoCentralBaseY: 0.410,
  gomoCentralTopoY: 0.790,
  gomoSuperiorBaseY: 0.820,
  gomoSuperiorTopoY: 1.200,

  pinoRaio: 0.0195,
  pinoComprimento: 1.220,
  pinoBaseY: -0.010,
};

export const TOPO = {
  ladosBarris: 32,
  ladosPino: 32,
};

export const MATERIAIS = {
  acoFixo: { cor: '#3f596c', aspereza: 0.58 },
  acoMovel: { cor: '#8b735b', aspereza: 0.56 },
  acoDoPino: { cor: '#d5dbe1', aspereza: 0.24 },
};

/* Identidades estruturais declaradas pelo autor; não são posições de passo. */
const FOLHA_FIXA = 610;
const FOLHA_MOVEL = 620;
const BARRIL_FIXO = 630;
const BARRIL_MOVEL_INFERIOR = 640;
const BARRIL_MOVEL_SUPERIOR = 650;
const PINO = 660;

const origem = (op, id, eixo = {}) => ({ op, id, ...eixo });
const cilindroInteiro = (id) => ({
  unir: [
    { origem: origem('cilindro', id) },
    { origem: origem('cilindro', id, { tampa: 'fundo' }) },
    { origem: origem('cilindro', id, { tampa: 'topo' }) },
  ],
});

export const ALIASES = [
  ['folhaFixaInteira', { origem: origem('cubo', FOLHA_FIXA) }],
  ['folhaMovelInteira', { origem: origem('cubo', FOLHA_MOVEL) }],
  ['barrilFixoInteiro', { origem: origem('lathe', BARRIL_FIXO) }],
  ['barrilMovelInferiorInteiro', { origem: origem('lathe', BARRIL_MOVEL_INFERIOR) }],
  ['barrilMovelSuperiorInteiro', { origem: origem('lathe', BARRIL_MOVEL_SUPERIOR) }],
  ['barrisMoveisInteiros', {
    unir: [
      { origem: origem('lathe', BARRIL_MOVEL_INFERIOR) },
      { origem: origem('lathe', BARRIL_MOVEL_SUPERIOR) },
    ],
  }],
  ['superficiesCurvasDosBarris', {
    unir: [
      { origem: origem('lathe', BARRIL_FIXO, { faixa: 1 }) },
      { origem: origem('lathe', BARRIL_FIXO, { faixa: 3 }) },
      { origem: origem('lathe', BARRIL_MOVEL_INFERIOR, { faixa: 1 }) },
      { origem: origem('lathe', BARRIL_MOVEL_INFERIOR, { faixa: 3 }) },
      { origem: origem('lathe', BARRIL_MOVEL_SUPERIOR, { faixa: 1 }) },
      { origem: origem('lathe', BARRIL_MOVEL_SUPERIOR, { faixa: 3 }) },
    ],
  }],
  ['pinoInteiro', cilindroInteiro(PINO)],
];

const perfilDoBarril = (baseY, topoY) => [
  ['barrilRaioInterno', baseY],
  ['barrilRaioExterno', baseY],
  ['barrilRaioExterno', topoY],
  ['barrilRaioInterno', topoY],
  ['barrilRaioInterno', baseY],
];

export const PASSOS = [
  /* As chapas nascem apoiadas em Y=0. Suas bordas internas terminam em
     X=±40 mm, tangentes ao raio externo do barril. */
  ['cubo', {
    origemId: FOLHA_FIXA,
    larg: 'folhaLargura',
    alt: 'folhaAltura',
    prof: 'folhaEspessura',
  }],
  ['transladar', {
    d: ['folhaFixaX', 0, 0],
    sel: { alias: 'folhaFixaInteira' },
  }],
  ['cubo', {
    origemId: FOLHA_MOVEL,
    larg: 'folhaLargura',
    alt: 'folhaAltura',
    prof: 'folhaEspessura',
  }],
  ['transladar', {
    d: ['folhaMovelX', 0, 0],
    sel: { alias: 'folhaMovelInteira' },
  }],
  ['rotaciona', {
    eixo: 'y',
    graus: 'aberturaDeInspecao',
    pivo: [0, 0, 0],
    sel: { alias: 'folhaMovelInteira' },
  }],

  /* O gomo central é fixo; os externos são móveis. Cada perfil fecha a parede
     externa, os dois anéis de topo/base e a parede interna da passagem. */
  ['lathe', {
    origemId: BARRIL_FIXO,
    lados: 'ladosBarris',
    perfil: perfilDoBarril('gomoCentralBaseY', 'gomoCentralTopoY'),
  }],
  ['lathe', {
    origemId: BARRIL_MOVEL_INFERIOR,
    lados: 'ladosBarris',
    perfil: perfilDoBarril('gomoInferiorBaseY', 'gomoInferiorTopoY'),
  }],
  ['lathe', {
    origemId: BARRIL_MOVEL_SUPERIOR,
    lados: 'ladosBarris',
    perfil: perfilDoBarril('gomoSuperiorBaseY', 'gomoSuperiorTopoY'),
  }],

  /* O pino já nasce no eixo Y e recebe 2,5 mm de folga radial na passagem. */
  ['cilindro', {
    origemId: PINO,
    raio: 'pinoRaio',
    altura: 'pinoComprimento',
    lados: 'ladosPino',
  }],
  ['transladar', {
    d: [0, 'pinoBaseY', 0],
    sel: { alias: 'pinoInteiro' },
  }],

  /* Exatamente as cinco partes semânticas do briefing. */
  ['parte', { nome: 'folhaFixa', sel: { alias: 'folhaFixaInteira' } }],
  ['parte', { nome: 'folhaMovel', sel: { alias: 'folhaMovelInteira' } }],
  ['parte', { nome: 'barrilFixo', sel: { alias: 'barrilFixoInteiro' } }],
  ['parte', { nome: 'barrisMoveis', sel: { alias: 'barrisMoveisInteiros' } }],
  ['parte', { nome: 'pino', sel: { alias: 'pinoInteiro' } }],

  /* Portas de montagem: chapas de fixação e o eixo removível. */
  ['publicarPorta', { nome: 'montagemFolhaFixa', de: origem('cubo', FOLHA_FIXA) }],
  ['publicarPorta', { nome: 'montagemFolhaMovel', de: origem('cubo', FOLHA_MOVEL) }],
  ['publicarPorta', { nome: 'eixoDoPino', de: origem('cilindro', PINO) }],

  ['material', { sel: { grupo: 'folhaFixa' }, usa: 'acoFixo' }],
  ['material', { sel: { grupo: 'barrilFixo' }, usa: 'acoFixo' }],
  ['material', { sel: { grupo: 'folhaMovel' }, usa: 'acoMovel' }],
  ['material', { sel: { grupo: 'barrisMoveis' }, usa: 'acoMovel' }],
  ['material', { sel: { grupo: 'pino' }, usa: 'acoDoPino' }],

  ['liso', { sel: { alias: 'superficiesCurvasDosBarris' } }],
  ['liso', { sel: { origem: origem('cilindro', PINO) } }],

  ['solido', { sel: { grupo: 'folhaFixa' } }],
  ['solido', { sel: { grupo: 'folhaMovel' } }],
  ['solido', { sel: { grupo: 'barrilFixo' } }],
  ['solido', { sel: { grupo: 'barrisMoveis' } }],
  ['solido', { sel: { grupo: 'pino' } }],
];

export const meta = {
  fechada: true,
  nome: '_dobradica-de-portao',
  tipo: 'objeto',
  desc: 'dobradiça vertical de portão F2 com duas folhas de 1,20 m, três gomos ocos alternados e pino passante removível',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
