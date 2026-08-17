/* impacto-global.mjs — adaptador MCP reduzido sobre o mapa canônico. */
import {
  consultarImpactoGlobalEntrada, consultarImpactoGlobalSaida,
  erroAcionavel, respostaErro, respostaOk,
} from '../contratos.mjs';

function entradaRecusada() {
  return respostaErro(1, erroAcionavel(
    'entrada_recusada', 'A entrada não atende ao schema da ferramenta.',
    'Corrija os campos conforme o schema anunciado em tools/list.',
  ));
}

function falhaConhecida(erro) {
  return respostaErro(1, erroAcionavel(
    String(erro.codigo).replaceAll('-', '_'),
    String(erro.message ?? 'A consulta foi recusada.').replace(/\s+/g, ' ').trim().slice(0, 320),
    erro.acao ?? 'Revise o universo e o alvo semântico anunciados antes de tentar novamente.',
  ));
}

export async function consultarImpacto(input, { universo }) {
  let alvo;
  try { alvo = consultarImpactoGlobalEntrada.parse(input); } catch { return entradaRecusada(); }
  try {
    return respostaOk(0, { impacto: await universo.consultar(alvo) });
  } catch (erro) {
    if (erro?.codigo) return falhaConhecida(erro);
    process.stderr.write(`mecanifica-mcp: consultar_impacto_global: falha interna (${erro?.name ?? 'Error'}).\n`);
    return respostaErro(1, erroAcionavel(
      'falha_interna', 'A consulta de impacto não conseguiu concluir.',
      'Inspecione a configuração confiável e os documentos persistidos do servidor.',
    ));
  }
}

export function criarFerramentasImpactoGlobal(universo) {
  return Object.freeze([{
    nome: 'consultar_impacto_global',
    descricao: 'Consulta impacto global dentro do universo canônico configurado, usando somente tipo e ID semânticos.',
    inputSchema: consultarImpactoGlobalEntrada,
    outputSchema: consultarImpactoGlobalSaida,
    executar: (entrada) => consultarImpacto(entrada, { universo }),
  }]);
}
