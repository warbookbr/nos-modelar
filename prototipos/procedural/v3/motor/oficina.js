/* oficina.js — fachada pública compatível do motor procedural.
   A implementação é separada por responsabilidade; esta entrada preserva o
   contrato usado por receitas, bancada, ferramentas e consumidores externos. */
export {
  BLOCO, FORMATO, OPERACOES_COM_ORIGEM, OPS,
  contagemPorDesvio, flechaDoAnel, flechaDoArco, ladosPorDesvio,
  neutroCanonico, nucleo,
} from './nucleo.js';
export { adaptarV3 } from './adaptador.js';
export { avaliarChaves, bindPoseOssos, montarAnimar } from './animacao.js';
export { colisaoDe, executar } from './executor.js';
