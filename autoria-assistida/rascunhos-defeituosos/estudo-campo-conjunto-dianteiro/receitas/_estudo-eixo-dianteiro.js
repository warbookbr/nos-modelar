/* ESTUDO DE CAMPO — eixo simples do conjunto dianteiro mínimo. Esta peça é
   evidência descartável de autoria e montagem; não é ativo automotivo. */
import { executar, colisaoDe } from '../../../../prototipos/procedural/v3/motor/oficina.js';

export const PARAMS = {
  raio: 0.0275,
  comprimento: 0.180,
  inicioX: -0.150,
  interfaceInicioX: -0.060,
  interfaceFimX: 0.030,
};

export const TOPO = { lados: 24 };
export const MATERIAIS = { aco: { cor: '#737b84', aspereza: 0.58, metalness: 0.72 } };

const EIXO = 1101;
const cilindroInteiro = (id) => ({ unir: [
  { origem: { op: 'cilindro', id } },
  { origem: { op: 'cilindro', id, tampa: 'fundo' } },
  { origem: { op: 'cilindro', id, tampa: 'topo' } },
] });
export const ALIASES = [['eixoInteiro', cilindroInteiro(EIXO)]];

export const PASSOS = [
  ['cilindro', { origemId: EIXO, raio: 'raio', altura: 'comprimento', lados: 'lados' }],
  ['rotaciona', { eixo: 'z', graus: -90, pivo: [0, 0, 0], sel: { origem: { op: 'cilindro', id: EIXO } } }],
  ['transladar', { d: ['inicioX', 0, 0], sel: { alias: 'eixoInteiro' } }],
  ['parte', { nome: 'eixo', sel: { alias: 'eixoInteiro' } }],
  ['publicarPorta', {
    nome: 'coloDoCubo',
    de: { op: 'cilindro', id: EIXO },
    interface: {
      forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], referencia: [0, 1, 0], centro: [0, 0, 0],
      raio: 'raio', inicio: 'interfaceInicioX', fim: 'interfaceFimX',
    },
  }],
  ['liso', { sel: { origem: { op: 'cilindro', id: EIXO } } }],
  ['material', { sel: { grupo: 'eixo' }, usa: 'aco' }],
  ['solido', { sel: { grupo: 'eixo' } }],
];

export const meta = {
  nome: '_estudo-eixo-dianteiro', tipo: 'objeto',
  desc: 'eixo simplificado para estudo de autoria e montagem',
  colisao: colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS, ALIASES),
};

export function construir(ctx) {
  return executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS, {}, null, ALIASES);
}
