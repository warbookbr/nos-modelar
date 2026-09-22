/* Família de revolução, executada pelo registro explícito completo da R10. */
export const FAMILIA = 'revolucao';
export const PARAMS = { raio: 0.15, altura: 0.8 };
export const TOPO = { lados: 24 };
export const ALIASES = [];
export const MATERIAIS = {
  pino: { cor: '#b7c2c8', aspereza: 0.38, metalicidade: 0.72 },
};
export const PASSOS = [
  ['cilindro', { origemId: 3201, raio: 'raio', altura: 'altura', lados: 'lados' }],
  ['parte', { nome: 'pino', sel: { tudo: true } }],
  ['material', { usa: 'pino', sel: { tudo: true } }],
  ['solido', { sel: { tudo: true } }],
];
export const meta = { nome: 'pino-circular', tipo: 'objeto', desc: 'fixture privada R10' };
