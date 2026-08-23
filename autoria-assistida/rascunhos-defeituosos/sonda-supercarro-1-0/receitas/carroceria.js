/* Envelope principal por seções: x=largura, y=altura, z=frente positiva. */
import { PERFIL_AUTORIA_JOGO } from '../perfil-autoria.js';

export const PERFIL_AUTORIA = PERFIL_AUTORIA_JOGO;
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  pinturaCobalto: { cor: '#1557b7', aspereza: 0.28, metalicidade: 0.66 },
};
const CORPO = 4101;
const CENTRO_Y = 0.50;
const LADOS = 12;

/* O contorno do loft usa (u,w), com u→x e w→-y neste caminho reto em z.
   A ordem angular é CCW no frame local e descreve uma seção elíptica fechada. */
function contorno(meiaLargura, piso, teto) {
  const centro = (piso + teto) / 2;
  const meiaAltura = (teto - piso) / 2;
  return Array.from({ length: LADOS }, (_, indice) => {
    const angulo = indice * Math.PI * 2 / LADOS;
    const yFisico = centro - Math.sin(angulo) * meiaAltura;
    const estreitamento = yFisico > centro ? 0.90 : 1;
    return [Math.cos(angulo) * meiaLargura * estreitamento, CENTRO_Y - yFisico];
  });
}

export const PASSOS = [
  ['loft', {
    origemId: CORPO,
    lados: LADOS,
    orientacao: [1, 0, 0],
    secoes: [
      { pos: [0, CENTRO_Y, -2.32], raio: 0 },
      { pos: [0, CENTRO_Y, -2.16], contorno: contorno(0.55, 0.28, 0.58) },
      { pos: [0, CENTRO_Y, -1.64], contorno: contorno(0.76, 0.25, 0.73) },
      { pos: [0, CENTRO_Y, -0.84], contorno: contorno(0.73, 0.24, 0.68) },
      { pos: [0, CENTRO_Y, 0.24], contorno: contorno(0.69, 0.23, 0.65) },
      { pos: [0, CENTRO_Y, 1.18], contorno: contorno(0.75, 0.24, 0.71) },
      { pos: [0, CENTRO_Y, 1.78], contorno: contorno(0.67, 0.25, 0.62) },
      { pos: [0, CENTRO_Y, 2.18], contorno: contorno(0.43, 0.28, 0.51) },
      { pos: [0, CENTRO_Y, 2.34], raio: 0 },
    ],
  }],
  ['parte', { nome: 'carroceriaPrincipal', sel: { origem: { op: 'loft', id: CORPO } } }],
  ['material', { usa: 'pinturaCobalto', sel: { grupo: 'carroceriaPrincipal' } }],
  ['liso', { sel: { grupo: 'carroceriaPrincipal' } }],
  ['solido', { sel: { grupo: 'carroceriaPrincipal' } }],
];
export const meta = { nome: 'carroceria', tipo: 'objeto', desc: 'envelope principal do supercarro ficcional' };
