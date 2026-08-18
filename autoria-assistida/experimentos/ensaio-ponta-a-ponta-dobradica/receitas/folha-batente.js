/* Receita privada: folha do batente com dois olhais. */
import { ID_CHAPA, ID_OLHAL } from '../composicoes.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico', fidelidade: 'F2', precisao: 'mecanica', interacao: 'montagem',
  distanciaMinima: 0.12, orcamentoFaces: 220,
};
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  chapa: { cor: '#55758f', aspereza: 0.48, metalicidade: 0.62 },
  olhal: { cor: '#38556d', aspereza: 0.42, metalicidade: 0.68 },
};
export const CHAMADAS_COMPOSICOES = [
  {
    id: 'chapa-batente', composicao: ID_CHAPA,
    argumentos: { origem: 1101, largura: 0.07, altura: 0.12, profundidade: 0.006, centro: [-0.035, 0, 0], parte: 'chapaBatente', material: 'chapa' },
  },
  {
    id: 'olhal-inferior', composicao: ID_OLHAL,
    argumentos: { origem: 1102, raioInterno: 0.0042, raioExterno: 0.009, comprimento: 0.04, inicio: [0, 0, 0], parte: 'olhalInferior', material: 'olhal', porta: 'alojamentoInferiorDoParafuso' },
  },
  {
    id: 'olhal-superior', composicao: ID_OLHAL,
    argumentos: { origem: 1103, raioInterno: 0.0042, raioExterno: 0.009, comprimento: 0.04, inicio: [0, 0.08, 0], parte: 'olhalSuperior', material: 'olhal', porta: 'alojamentoSuperiorDoParafuso' },
  },
];
export const meta = { nome: 'folha-batente', tipo: 'objeto', desc: 'folha privada do batente' };
