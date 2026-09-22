/* Família prismática, produzida por subgrafo declarativo privado. */
import { ID_APOIO } from '../composicoes.js';

export const FAMILIA = 'prismatica';
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  apoio: { cor: '#687985', aspereza: 0.58, metalicidade: 0.48 },
};
export const CHAMADAS_COMPOSICOES = [{
  id: 'apoio',
  composicao: ID_APOIO,
  argumentos: { largura: 2, altura: 0.2, profundidade: 1, parte: 'apoio', material: 'apoio' },
}];
export const meta = { nome: 'apoio-prismatico', tipo: 'objeto', desc: 'fixture privada R10' };
