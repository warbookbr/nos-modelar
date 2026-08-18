/* oficina.js — fachada pública compatível do motor procedural.
   A implementação é separada por responsabilidade; esta entrada preserva o
   contrato usado por receitas, bancada, ferramentas e consumidores externos. */
export {
  BLOCO, FORMATO, OPERACOES_COM_ORIGEM, OPS,
  contagemPorDesvio, flechaDoAnel, flechaDoArco, ladosPorDesvio,
  neutroCanonico, nucleo, REGISTRO_OPERACOES,
} from './nucleo.js';
export { criarRegistroOperacoes, ErroRegistroOperacoes } from './registro.js';
export { TIPO_MALHA_POLIGONAL, artefatoDaMalha, grafoDaProcedencia, procedenciaCanonica } from './artefatos.js';
export { adaptarV3 } from './adaptador.js';
export { avaliarChaves, bindPoseOssos, montarAnimar } from './animacao.js';
export { colisaoDe, executar } from './executor.js';
