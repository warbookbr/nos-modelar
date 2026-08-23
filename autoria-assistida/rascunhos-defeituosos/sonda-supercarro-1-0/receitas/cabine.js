/* Canópia contínua por loft, separável da carroceria e de baixo perfil. */
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  vidroFume: { cor: '#15283d', aspereza: 0.16, metalicidade: 0.08, mistura: 'transparente', opacidade: 0.58 },
};
const CABINE = 4201;
const CENTRO_Y = 0.86;
const LADOS = 12;

function contorno(meiaLargura, piso, teto) {
  const centro = (piso + teto) / 2;
  const meiaAltura = (teto - piso) / 2;
  return Array.from({ length: LADOS }, (_, indice) => {
    const angulo = indice * Math.PI * 2 / LADOS;
    const yFisico = centro - Math.sin(angulo) * meiaAltura;
    return [Math.cos(angulo) * meiaLargura, CENTRO_Y - yFisico];
  });
}

export const PASSOS = [
  ['loft', {
    origemId: CABINE,
    lados: LADOS,
    orientacao: [1, 0, 0],
    secoes: [
      { pos: [0, CENTRO_Y, -1.12], raio: 0 },
      { pos: [0, CENTRO_Y, -0.92], contorno: contorno(0.30, 0.66, 0.92) },
      { pos: [0, CENTRO_Y, -0.45], contorno: contorno(0.46, 0.65, 1.05) },
      { pos: [0, CENTRO_Y, 0.25], contorno: contorno(0.51, 0.64, 1.12) },
      { pos: [0, CENTRO_Y, 0.72], contorno: contorno(0.43, 0.65, 1.04) },
      { pos: [0, CENTRO_Y, 1.08], contorno: contorno(0.24, 0.67, 0.87) },
      { pos: [0, CENTRO_Y, 1.20], raio: 0 },
    ],
  }],
  ['parte', { nome: 'canopiaEnvidracada', sel: { origem: { op: 'loft', id: CABINE } } }],
  ['material', { usa: 'vidroFume', sel: { grupo: 'canopiaEnvidracada' } }],
  ['liso', { sel: { grupo: 'canopiaEnvidracada' } }],
  ['solido', { sel: { grupo: 'canopiaEnvidracada' } }],
];
export const meta = { nome: 'cabine', tipo: 'objeto', desc: 'canópia externa fumê' };
