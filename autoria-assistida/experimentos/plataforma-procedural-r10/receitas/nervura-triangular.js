/* Família triangular, produzida pelo subgrafo que usa a extensão nativa. */
import { ID_NERVURA } from '../composicoes.js';

export const FAMILIA = 'extensao-nativa';
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  nervura: { cor: '#b57a45', aspereza: 0.5, metalicidade: 0.35 },
};
export const CHAMADAS_COMPOSICOES = [{
  id: 'nervura',
  composicao: ID_NERVURA,
  argumentos: { raio: 0.25, altura: 0.8, parte: 'nervura', material: 'nervura' },
}];
export const meta = { nome: 'nervura-triangular', tipo: 'objeto', desc: 'fixture privada R10' };
