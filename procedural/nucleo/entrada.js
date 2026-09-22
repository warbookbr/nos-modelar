/* oficina.js — fachada pública compatível do motor procedural.
   A implementação é separada por responsabilidade; esta entrada preserva o
   contrato usado por receitas, bancada, ferramentas e consumidores externos. */
export {
  BLOCO, FORMATO, OPERACOES_COM_ORIGEM, OPS,
  contagemPorDesvio, flechaDoAnel, flechaDoArco, ladosPorDesvio,
  neutroCanonico, nucleo, REGISTRO_OPERACOES,
} from './nucleo.js';
export { criarRegistroOperacoes, ErroRegistroOperacoes } from './registro.js';
export { FORMATO_EXEMPLO_OPERACAO, FORMATO_USO_OPERACAO, criarContratoUsoOperacao, usoDaOperacao, usosDasOperacoes } from './uso-operacoes.js';
export { TIPO_MALHA_POLIGONAL, artefatoDaMalha, grafoDaProcedencia, procedenciaCanonica } from './artefatos.js';
export { FORMATO_CATALOGO, FORMATO_HIPERGRAFO, buscarCapacidades, catalogoDeCapacidades, explicarCapacidade, hipergrafoDeCapacidades } from './catalogo.js';
export { ErroComposicaoProcedural, FORMATO_COMPOSICAO_PROCEDURAL, FORMATO_EXPANSAO, criarRegistroComposicoes, expandirChamadasDeComposicao, expandirComposicao } from './composicoes.js';
export { ErroExtensaoNativa, FORMATO_EXTENSAO_NATIVA, criarOperacaoNativa, criarRegistroComExtensoes, diagnosticarExtensaoAusente } from './extensoes.js';
export { ErroLacunaCapacidade, FORMATO_CLASSIFICACAO_LACUNA, FORMATO_LACUNA_CAPACIDADE, FORMATO_PLANO_CAPACIDADES, classificarLacunaCapacidade, criarLacunaCapacidade, planejarCapacidades, schemaDaLacunaCapacidade } from './lacunas.js';
export { adaptarV3 } from './adaptador.js';
export { avaliarChaves, bindPoseOssos, montarAnimar } from './animacao.js';
export { colisaoDe, executar } from './executor.js';
