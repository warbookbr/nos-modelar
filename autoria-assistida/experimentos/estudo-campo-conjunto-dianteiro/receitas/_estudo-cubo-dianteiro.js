/* ESTUDO DE CAMPO — cubo escalonado e vazado do conjunto dianteiro mínimo.
   A peça prova perfil de revolução e três interfaces semânticas. */
import { executar, colisaoDe } from '../../../../prototipos/fps/v3/motor/oficina.js';

export const PARAMS = {
  cavidadeRaio: 0.0280,
  cuboRaio: 0.055,
  flangeRaio: 0.085,
  pilotoRaio: 0.049,
  inicioX: -0.060,
  corpoFimX: 0.020,
  flangeFimX: 0.032,
  pilotoFimX: 0.052,
};

export const TOPO = { lados: 32 };
export const MATERIAIS = { acoCubo: { cor: '#8b949e', aspereza: 0.48, metalness: 0.78 } };
const CUBO = 1201;
export const ALIASES = [['cuboInteiro', { origem: { op: 'lathe', id: CUBO } }]];

export const PASSOS = [
  ['lathe', { origemId: CUBO, lados: 'lados', perfil: [
    ['cavidadeRaio', 'inicioX'],
    ['cuboRaio', 'inicioX'],
    ['cuboRaio', 'corpoFimX'],
    ['flangeRaio', 'corpoFimX'],
    ['flangeRaio', 'flangeFimX'],
    ['pilotoRaio', 'flangeFimX'],
    ['pilotoRaio', 'pilotoFimX'],
    ['cavidadeRaio', 'pilotoFimX'],
    ['cavidadeRaio', 'inicioX'],
  ] }],
  ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { alias: 'cuboInteiro' } }],
  ['parte', { nome: 'cubo', sel: { alias: 'cuboInteiro' } }],
  ['publicarPorta', {
    nome: 'cavidadeDoEixo', de: { op: 'lathe', id: CUBO, faixa: 7 },
    interface: {
      forma: 'cilindro', papel: 'interna', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0],
      raio: 'cavidadeRaio', inicio: 'inicioX', fim: 'pilotoFimX',
    },
  }],
  ['publicarPorta', {
    nome: 'pilotoDoAro', de: { op: 'lathe', id: CUBO, faixa: 5 },
    interface: {
      forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0],
      raio: 'pilotoRaio', inicio: 'flangeFimX', fim: 'pilotoFimX',
    },
  }],
  ['publicarPorta', {
    nome: 'assentoDoDisco', de: { op: 'lathe', id: CUBO, faixa: 3 },
    interface: {
      forma: 'anel', papel: 'recebe', parte: 'cubo', eixo: [1, 0, 0], centro: [0, 0, 0],
      raioInterno: 'pilotoRaio', raioExterno: 'flangeRaio', inicio: 'corpoFimX', fim: 'flangeFimX',
    },
  }],
  /* Somente as faixas cilíndricas recebem normal suave. Suavizar também os
     anéis planos produziu um halo ondulado visível na primeira isométrica. */
  ['liso', { sel: { origem: { op: 'lathe', id: CUBO, faixa: 1 } } }],
  ['liso', { sel: { origem: { op: 'lathe', id: CUBO, faixa: 3 } } }],
  ['liso', { sel: { origem: { op: 'lathe', id: CUBO, faixa: 5 } } }],
  ['liso', { sel: { origem: { op: 'lathe', id: CUBO, faixa: 7 } } }],
  ['material', { sel: { grupo: 'cubo' }, usa: 'acoCubo' }],
  ['solido', { sel: { grupo: 'cubo' } }],
];

export const meta = {
  nome: '_estudo-cubo-dianteiro', tipo: 'objeto',
  desc: 'cubo vazado simplificado com interfaces de eixo, aro e disco',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};
export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
