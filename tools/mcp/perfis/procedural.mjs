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
    return respostaErro(1, erroAcionavel(
      erro?.codigo ?? 'operacao_recusada',
      String(erro?.message ?? 'A operação foi recusada.'),
      erro?.acao ?? 'Revise o campo indicado e o contrato anunciado antes de tentar novamente.',
    ));
  }
}
function ferramenta(nome, descricao, entrada, saida, tarefa) {
  return { nome, descricao, inputSchema: entrada, outputSchema: saida, executar: (valor) => {
    let argumentos;
    try { argumentos = entrada.parse(valor); } catch { return entradaRecusada(); }
    return executar(nome, () => tarefa(argumentos));
  } };
}

function projetarOperacao(operacao, detalhe) {
  if (detalhe === 'completo') return operacao;
  return {
    id: operacao.id, nome: operacao.nome, versao: operacao.versao,
    categoria: operacao.categoria, artefatos: operacao.artefatos,
    interfaces: operacao.interfaces, requisitos: operacao.requisitos,
    custo: operacao.custo, efeitos: operacao.efeitos, identidade: operacao.identidade,
    ...(operacao.uso !== undefined ? { uso: operacao.uso } : {}),
  };
}

function controle(total, retornadas, limite, detalhe, truncado = total > retornadas) {
  return { limite, retornadas, total, truncado, detalhe };
}

function projetarBusca(resposta, { limite, detalhe }) {
  const operacoes = resposta.operacoes ?? [];
  const selecionadas = operacoes.map((operacao) => projetarOperacao(operacao, detalhe));
  const total = resposta.total ?? operacoes.length;
  const retornadas = resposta.retornadas ?? operacoes.length;
  return {
    ...resposta,
    operacoes: selecionadas,
    controle: controle(total, retornadas, limite, detalhe, resposta.truncado ?? total > retornadas),
  };
}

function projetarPlano(plano, { limite, detalhe }) {
  const cadeias = plano.cadeias ?? [];
  const descartes = plano.descartes ?? [];
  const limiteCadeias = Math.min(limite, cadeias.length);
  const restante = Math.max(0, limite - limiteCadeias);
  const limiteDescartes = detalhe === 'completo' ? descartes.length : restante;
  const cadeiasRetornadas = cadeias.slice(0, limiteCadeias);
  const descartesRetornados = descartes.slice(0, limiteDescartes);
  return {
    ...plano,
    cadeias: cadeiasRetornadas,
    descartes: descartesRetornados,
    controle: controle(cadeias.length + descartes.length, cadeiasRetornadas.length + descartesRetornados.length, limite, detalhe),
    ...(detalhe === 'resumo' && descartes.length > descartesRetornados.length
      ? { descartesOmitidos: descartes.length - descartesRetornados.length }
      : {}),
  };
}

function diagnosticoExtensao(resultado) {
  if (resultado?.estado !== 'ausente') return resultado;
  return {
    ...resultado,
    codigo: 'extensao_ausente',
    executavel: false,
    acao: 'Não instale nem promova código neste perfil; registre a lacuna e planeje a extensão fora desta operação.',
    proximoPasso: { ferramenta: 'analisar_lacuna', motivo: 'confirmar se composição ou representação existente resolve a necessidade antes de criar extensão.' },
  };
}

export function criarFerramentasProcedurais(servico) {
  return Object.freeze([
    ferramenta('buscar_capacidades', 'Busca contratos procedurais registrados; retorna resumo limitado por padrão e não executa receita nem cria capacidade.', buscarCapacidadesEntrada, buscarCapacidadesSaida, (entrada) => {
      const { limite, cursor, detalhe, ...consulta } = entrada;
      return projetarBusca(servico.buscar({ ...consulta, limite, ...(cursor !== undefined ? { cursor } : {}) }), { limite, detalhe });
    }),
    ferramenta('descrever_capacidade', 'Explica uma capacidade exata ou relata sua ausência com candidatas registradas.', descreverCapacidadeEntrada, descreverCapacidadeSaida, ({ identificador }) => servico.descrever(identificador)),
    ferramenta('combinar_capacidades', 'Planeja cadeias estruturalmente compatíveis; retorna resumo limitado por padrão e não valida forma ou estética.', combinarCapacidadesEntrada, combinarCapacidadesSaida, (entrada) => {
      const { limite, detalhe, ...consulta } = entrada;
      return projetarPlano(servico.combinar(consulta), { limite, detalhe });
    }),
    ferramenta('validar_composicao', 'Valida e expande uma composição declarativa em memória; não executa geometria nem grava receita.', validarComposicaoEntrada, validarComposicaoSaida, (entrada) => servico.validarComposicao(entrada)),
    ferramenta('analisar_lacuna', 'Registra e classifica uma lacuna por evidência; não instala nem promove extensão.', analisarLacunaEntrada, analisarLacunaSaida, (entrada) => {
      const { limite = 8, detalhe = 'resumo' } = entrada;
      const { limite: _limite, detalhe: _detalhe, ...lacuna } = entrada;
      const resultado = servico.analisarLacuna(lacuna);
      if (!resultado?.classificacao?.plano) return resultado;
      return { ...resultado, classificacao: { ...resultado.classificacao, plano: projetarPlano(resultado.classificacao.plano, { limite, detalhe }) } };
    }),
    ferramenta('diagnosticar_extensao', 'Informa se uma extensão está registrada; ausência não é autorização para instalar ou promover código.', diagnosticarExtensaoEntrada, diagnosticarExtensaoSaida, ({ capacidade }) => diagnosticoExtensao(servico.diagnosticarExtensao(capacidade))),
  ]);
}
