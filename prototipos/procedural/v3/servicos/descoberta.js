/* descoberta.js — porta neutra de descoberta procedural; sem I/O, MCP ou visor. */
import {
  REGISTRO_OPERACOES, buscarCapacidades, catalogoDeCapacidades,
  classificarLacunaCapacidade, criarLacunaCapacidade, criarRegistroComposicoes,
  diagnosticarExtensaoAusente, explicarCapacidade, expandirComposicao,
  hipergrafoDeCapacidades, planejarCapacidades, schemaDaLacunaCapacidade,
} from '../motor/oficina.js';

export const FORMATO_VALIDACAO_COMPOSICAO = 'mecanifica.validacao-composicao@1';

export function criarServicoDescobertaProcedural({ registro = REGISTRO_OPERACOES } = {}) {
  const catalogo = catalogoDeCapacidades(registro);
  const hipergrafo = hipergrafoDeCapacidades(catalogo);
  const schemaLacuna = schemaDaLacunaCapacidade();
  return Object.freeze({
    catalogo: () => catalogo,
    hipergrafo: () => hipergrafo,
    schemas: () => Object.freeze({ lacuna: schemaLacuna }),
    buscar: (consulta = {}) => buscarCapacidades(catalogo, consulta),
    descrever: (identificador) => explicarCapacidade(catalogo, identificador),
    combinar: (consulta) => planejarCapacidades(catalogo, consulta),
    validarComposicao({ composicoes, id, parametros = {}, orcamento = {} } = {}) {
      const registroComposicoes = criarRegistroComposicoes({
        composicoes, resolverOperacao: registro.resolver,
      });
      const expansao = expandirComposicao(registroComposicoes, id, parametros, { orcamento });
      return Object.freeze({
        formato: FORMATO_VALIDACAO_COMPOSICAO, valida: true, composicao: expansao.composicao,
        artefatos: registroComposicoes.resolver(id).artefatos,
        passos: expansao.passos, procedencia: expansao.procedencia,
      });
    },
    analisarLacuna(entrada) {
      const lacuna = criarLacunaCapacidade(entrada);
      return Object.freeze({ lacuna, classificacao: classificarLacunaCapacidade(catalogo, lacuna) });
    },
    diagnosticarExtensao: (capacidade) => diagnosticarExtensaoAusente(registro, capacidade)
      ?? Object.freeze({ formato: 'mecanifica.diagnostico-extensao@1', capacidade, estado: 'disponivel', acao: 'a capacidade está registrada nesta configuração do motor' }),
  });
}
