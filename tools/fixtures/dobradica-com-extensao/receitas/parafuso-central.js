/* Receita privada: pino/parafuso passante, sem promessa de rosca helicoidal. */
import { ID_PINO } from '../composicoes.js';

export const PERFIL_AUTORIA = {
  visual: 'tecnicoDidatico', fidelidade: 'F2', precisao: 'mecanica', interacao: 'montagem',
  distanciaMinima: 0.12, orcamentoFaces: 160,
};
export const PARAMS = {};
export const TOPO = {};
export const ALIASES = [];
export const MATERIAIS = {
  parafuso: { cor: '#b7bdc5', aspereza: 0.34, metalicidade: 0.78 },
};
export const CHAMADAS_COMPOSICOES = [{
  id: 'parafuso-passante',
  composicao: ID_PINO,
  argumentos: {
    origem: 1301, raioHaste: 0.004, raioCabeca: 0.0075,
    inicioCabeca: -0.007, inicioHaste: 0, fimInferior: 0.04,
    fimCentral: 0.08, fimHaste: 0.12, parte: 'parafuso', material: 'parafuso',
    portaInferior: 'trechoInferior', portaCentral: 'trechoCentral',
    portaSuperior: 'trechoSuperior',
  },
}];
export const meta = { nome: 'parafuso-central', tipo: 'objeto', desc: 'pino/parafuso privado sem rosca' };
