/* procedural.mjs — adaptador MCP fino sobre o serviço puro de descoberta. */
import {
  analisarLacunaEntrada, analisarLacunaSaida, buscarCapacidadesEntrada,
  buscarCapacidadesSaida, combinarCapacidadesEntrada, combinarCapacidadesSaida,
  descreverCapacidadeEntrada, descreverCapacidadeSaida, diagnosticarExtensaoEntrada,
  diagnosticarExtensaoSaida, erroAcionavel, respostaErro, respostaOk,
  validarComposicaoEntrada, validarComposicaoSaida,
} from '../contratos.mjs';

function entradaRecusada() {
  return respostaErro(1, erroAcionavel('entrada_recusada', 'A entrada não atende ao schema da ferramenta.', 'Corrija os campos conforme o schema anunciado em tools/list.'));
}
function executar(nome, tarefa) {
  try { return respostaOk(0, tarefa()); } catch (erro) {
    process.stderr.write(`mecanifica-mcp: ${nome}: falha controlada (${erro?.name ?? 'Error'}).\n`);
    return respostaErro(1, erroAcionavel('operacao_recusada', String(erro?.message ?? 'A operação foi recusada.'), 'Revise o contrato anunciado e o diagnóstico retornado antes de tentar novamente.'));
  }
}
function ferramenta(nome, descricao, entrada, saida, tarefa) {
  return { nome, descricao, inputSchema: entrada, outputSchema: saida, executar: (valor) => {
    let argumentos;
    try { argumentos = entrada.parse(valor); } catch { return entradaRecusada(); }
    return executar(nome, () => tarefa(argumentos));
  } };
}

export function criarFerramentasProcedurais(servico) {
  return Object.freeze([
    ferramenta('buscar_capacidades', 'Busca contratos procedurais registrados; não executa receita nem cria capacidade.', buscarCapacidadesEntrada, buscarCapacidadesSaida, (entrada) => servico.buscar(entrada)),
    ferramenta('descrever_capacidade', 'Explica uma capacidade exata ou relata sua ausência com candidatas registradas.', descreverCapacidadeEntrada, descreverCapacidadeSaida, ({ identificador }) => servico.descrever(identificador)),
    ferramenta('combinar_capacidades', 'Planeja cadeias estruturalmente compatíveis por artefatos, interfaces, requisitos e custo; não valida forma ou estética.', combinarCapacidadesEntrada, combinarCapacidadesSaida, (entrada) => servico.combinar(entrada)),
    ferramenta('validar_composicao', 'Valida e expande uma composição declarativa em memória; não executa geometria nem grava receita.', validarComposicaoEntrada, validarComposicaoSaida, (entrada) => servico.validarComposicao(entrada)),
    ferramenta('analisar_lacuna', 'Registra e classifica uma lacuna por evidência; não instala nem promove extensão.', analisarLacunaEntrada, analisarLacunaSaida, (entrada) => servico.analisarLacuna(entrada)),
    ferramenta('diagnosticar_extensao', 'Informa se uma extensão está registrada nesta configuração e a ação segura quando estiver ausente.', diagnosticarExtensaoEntrada, diagnosticarExtensaoSaida, ({ capacidade }) => servico.diagnosticarExtensao(capacidade)),
  ]);
}
