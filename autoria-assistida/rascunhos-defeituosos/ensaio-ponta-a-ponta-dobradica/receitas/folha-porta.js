/* Receita privada: folha da porta com olhal central. */
import { ID_CHAPA, ID_OLHAL } from '../composicoes.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico', fidelidade: 'F2', precisao: 'mecanica', interacao: 'montagem',
  distanciaMinima: 0.12, orcamentoFaces: 140,
};
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  chapa: { cor: '#a56d42', aspereza: 0.50, metalicidade: 0.58 },
  olhal: { cor: '#7c4c2d', aspereza: 0.43, metalicidade: 0.64 },
};
export const CHAMADAS_COMPOSICOES = [
  {
    id: 'chapa-porta', composicao: ID_CHAPA,
    argumentos: { origem: 1201, largura: 0.07, altura: 0.12, profundidade: 0.006, centro: [0.035, 0, 0], parte: 'chapaPorta', material: 'chapa' },
  },
  {
    id: 'olhal-central', composicao: ID_OLHAL,
    argumentos: { origem: 1202, raioInterno: 0.0042, raioExterno: 0.009, comprimento: 0.04, inicio: [0, 0.04, 0], parte: 'olhalCentral', material: 'olhal', porta: 'alojamentoCentralDoParafuso' },
  },
];
export const meta = { nome: 'folha-porta', tipo: 'objeto', desc: 'folha privada da porta' };
