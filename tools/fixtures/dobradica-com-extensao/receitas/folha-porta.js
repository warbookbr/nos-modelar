/* Receita privada: folha da porta com olhal central. */
import { ID_CHAPA_RECORTADA, ID_OLHAL } from '../composicoes.js';

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
    /* chapa de x = 0 a 70 mm, 120 mm de altura, 6 mm de espessura, com os trechos de y = 0 a 40,5 e de 79,5 a 120
       recuados até x = 9,5 mm: o nó do batente tem raio 9 mm e ocupa y de 0 a 40 e de 80 a 120, então sobram 0,5 mm de
       folga em volta dele. A aba de x = 0 a 9,5 fica só entre y = 40,5 e 79,5, junto do olhal da porta. */
    id: 'chapa-porta', composicao: ID_CHAPA_RECORTADA,
    argumentos: {
      origem: 1201, xFora: 0.07, xBorda: 0.0095, xMeio: 0, vTopo: -0.12, vA: -0.0405, vB: -0.0795,
      profundidade: 0.006, centro: [0, 0, -0.003], parte: 'chapaPorta', material: 'chapa',
    },
  },
  {
    id: 'olhal-central', composicao: ID_OLHAL,
    argumentos: { origem: 1202, raioInterno: 0.0042, raioExterno: 0.009, comprimento: 0.04, inicio: [0, 0.04, 0], parte: 'olhalCentral', material: 'olhal', porta: 'alojamentoCentralDoParafuso' },
  },
];
export const meta = { nome: 'folha-porta', tipo: 'objeto', desc: 'folha privada da porta' };

/* CONTATOS INTENCIONAIS. Declarados quando `--estrito` passou a reprovar contato
   não declarado: a geometria não mudou, só passou a dizer o que sempre fez. */
export const contatos = [
  { par: ['chapaPorta', 'olhalCentral'], motivo: 'o olhal central nasce da chapa e é conformado nela' },
];
