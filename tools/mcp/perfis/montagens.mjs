/* montagens.mjs — adaptador MCP fino para leitura e auditoria de montagens. */
import { createHash } from 'node:crypto';
import { derivarCatalogoMontagens } from '../../../src/autoria/derivar-catalogo-montagens.js';
import { derivarRoteiroRevalidacao } from '../../../src/autoria/derivar-roteiro-revalidacao.js';
import { descreverMontagemResolvida } from '../../../src/autoria/descrever-montagem-resolvida.js';
import { capturarMontagem } from '../../mecanifica/capturar-montagem.mjs';
import { ErroCatalogoMcpMontagens } from '../catalogo-montagens.mjs';
import {
  catalogarMontagensEntrada, catalogarMontagensSaida,
  descreverMontagemEntrada, descreverMontagemSaida,
  erroAcionavel, renderizarMontagemEntrada, renderizarMontagemSaida,
  respostaErro, respostaOk, revalidarMontagemEntrada, revalidarMontagemSaida,
} from '../contratos.mjs';

export const LIMITES_VISTAS_MONTAGEM = Object.freeze({
  imagemBytes: 2 * 1024 * 1024,
  totalBytes: 8 * 1024 * 1024,
  respostaBytes: 11 * 1024 * 1024,
  timeoutMs: 45_000,
});

function textoCurto(valor, limite = 320) {
  const texto = String(valor ?? '').replace(/\s+/g, ' ').trim();
  return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}

function entradaRecusada() {
  return respostaErro(1, erroAcionavel(
    'entrada_recusada',
    'A entrada não atende ao schema da ferramenta.',
    'Corrija os campos conforme o schema anunciado em tools/list.',
  ));
}

function falhaConhecida(erro) {
  return respostaErro(1, erroAcionavel(
    String(erro.codigo).replaceAll('-', '_'),
    textoCurto(erro.message),
    erro.acao ?? 'Revise o contexto semântico anunciado antes de tentar novamente.',
  ));
}

function falhaInterna(nome, erro) {
  process.stderr.write(`mecanifica-mcp: ${nome}: falha interna (${erro?.name ?? 'Error'}).\n`);
  return respostaErro(1, erroAcionavel(
    'falha_interna',
    'A ferramenta não conseguiu concluir a operação.',
    'Inspecione a configuração e os documentos persistidos do servidor.',
  ));
}

async function executar(nome, tarefa) {
  try { return await tarefa(); } catch (erro) {
    return erro?.codigo ? falhaConhecida(erro) : falhaInterna(nome, erro);
  }
}

export async function descreverMontagem(input, { catalogo }) {
  let argumentos;
  try { argumentos = descreverMontagemEntrada.parse(input); } catch { return entradaRecusada(); }
  return executar('descrever_montagem', async () => {
    const resolvida = await catalogo.resolver(argumentos.id);
    const contexto = descreverMontagemResolvida(resolvida, {
      ...(argumentos.caminho ? { caminho: argumentos.caminho } : {}),
      ...(argumentos.profundidade !== undefined ? { profundidade: argumentos.profundidade } : {}),
      ...(argumentos.incluirRelacionados ? { incluirRelacionados: true } : {}),
    });
    return respostaOk(0, { id: argumentos.id, contexto });
  });
}

export async function planejarRevalidacao(input, { catalogo }) {
  let argumentos;
  try { argumentos = revalidarMontagemEntrada.parse(input); } catch { return entradaRecusada(); }
  return executar('planejar_revalidacao_montagem', async () => {
    const resolvida = await catalogo.resolver(argumentos.id);
    return respostaOk(0, {
      id: argumentos.id,
      roteiro: derivarRoteiroRevalidacao(resolvida, { caminho: argumentos.alvo }),
    });
  });
}

export async function catalogarMontagens(input, { catalogo }) {
  let argumentos;
  try { argumentos = catalogarMontagensEntrada.parse(input); } catch { return entradaRecusada(); }
  if (new Set(argumentos.ids).size !== argumentos.ids.length) {
    return respostaErro(1, erroAcionavel(
      'raiz_duplicada', 'A lista repete uma raiz.', 'Informe cada ID anunciado uma única vez.',
    ));
  }
  return executar('catalogar_montagens', async () => {
    const resolvidas = await Promise.all(argumentos.ids.map((id) => catalogo.resolver(id)));
    return respostaOk(0, {
      ids: argumentos.ids.slice(),
      catalogo: derivarCatalogoMontagens(resolvidas),
    });
  });
}

function pacoteVisual(resposta, imagens = []) {
  return { resposta, imagens };
}

export function conteudoRenderizacaoMontagem({ resposta, imagens }) {
  if (!resposta.ok) {
    return [{ type: 'text', text: `renderizar_montagem: ${resposta.erro?.mensagem ?? 'operação recusada.'}` }];
  }
  return [
    { type: 'text', text: `renderizar_montagem: ${imagens.length} vista(s) produzida(s).` },
    ...imagens.map(({ data, mimeType }) => ({ type: 'image', data, mimeType })),
  ];
}

function erroVisual(codigo, mensagem, acao) {
  return pacoteVisual(respostaErro(1, erroAcionavel(String(codigo).replaceAll('-', '_'), mensagem, acao)));
}

export async function renderizarMontagem(input, {
  catalogo,
  capturar = capturarMontagem,
  limites = LIMITES_VISTAS_MONTAGEM,
  agora = () => Date.now(),
} = {}) {
  let argumentos;
  try { argumentos = renderizarMontagemEntrada.parse(input); } catch { return pacoteVisual(entradaRecusada()); }
  const inicio = agora();
  let resolvida;
  try { resolvida = await catalogo.resolver(argumentos.id); } catch (erro) {
    const resposta = erro instanceof ErroCatalogoMcpMontagens || erro?.codigo
      ? falhaConhecida(erro) : falhaInterna('renderizar_montagem', erro);
    return pacoteVisual(resposta);
  }
  const vistasPedidas = argumentos.vistas ?? ['isometrica', 'direita'];
  let capturada;
  try {
    capturada = await capturar({
      montagem: resolvida,
      caminho: argumentos.caminho ?? [],
      vistas: vistasPedidas,
      timeoutMs: limites.timeoutMs,
    });
  } catch (erro) {
    return pacoteVisual(falhaInterna('renderizar_montagem', erro));
  }
  if (!capturada.ok) {
    return erroVisual(
      capturada.erro?.codigo ?? 'falha-captura-montagem',
      textoCurto(capturada.erro?.mensagem ?? 'A captura de montagem foi recusada.'),
      capturada.erro?.codigo === 'tempo-esgotado'
        ? 'Reduza o número de vistas ou o escopo semântico solicitado.'
        : 'Revise a montagem e o caminho semântico antes de tentar novamente.',
    );
  }
  const capturas = capturada.resultado?.capturas;
  if (!Array.isArray(capturas) || capturas.length !== vistasPedidas.length
    || capturas.some((captura, indice) => captura.nome !== vistasPedidas[indice])) {
    return erroVisual(
      'vistas_incompletas',
      'O serviço visual não devolveu exatamente as vistas solicitadas.',
      'Corrija o serviço compartilhado; não complete a resposta com imagem sintética.',
    );
  }
  const imagens = [];
  const vistas = [];
  let totalBytes = 0;
  for (const captura of capturas) {
    const dados = Buffer.isBuffer(captura.dados) ? captura.dados : Buffer.from(captura.dados ?? []);
    if (dados.byteLength > limites.imagemBytes) {
      return erroVisual('payload_excedido', `A vista '${captura.nome}' excedeu o limite de bytes.`, 'Peça menos vistas ou decida outro transporte.');
    }
    if (!captura.enquadramento) {
      return erroVisual('enquadramento_ausente', `A vista '${captura.nome}' não trouxe enquadramento.`, 'Corrija o visor antes de publicar a resposta.');
    }
    totalBytes += dados.byteLength;
    imagens.push({ nome: captura.nome, mimeType: 'image/png', data: dados.toString('base64') });
    vistas.push({
      nome: captura.nome,
      mimeType: 'image/png',
      largura: captura.largura,
      altura: captura.altura,
      bytes: dados.byteLength,
      sha256: `sha256:${createHash('sha256').update(dados).digest('hex')}`,
      instancias: captura.instancias,
      enquadramento: captura.enquadramento,
    });
  }
  if (totalBytes > limites.totalBytes) {
    return erroVisual('payload_excedido', 'As vistas excederam o limite total de bytes.', 'Peça menos vistas ou decida outro transporte.');
  }
  const resposta = respostaOk(0, {
    formato: 'mecanifica.vistas-montagem',
    versao: 1,
    id: argumentos.id,
    caminho: argumentos.caminho ?? [],
    duracaoMs: Math.max(0, Math.round(agora() - inicio)),
    bytes: totalBytes,
    vistas,
  });
  const pacote = pacoteVisual(resposta, imagens);
  const respostaBytes = Buffer.byteLength(JSON.stringify({
    content: conteudoRenderizacaoMontagem(pacote),
    structuredContent: resposta,
  }), 'utf8');
  if (respostaBytes > limites.respostaBytes) {
    return erroVisual('payload_excedido', 'A resposta MCP serializada excederia o limite.', 'Peça menos vistas ou decida outro transporte.');
  }
  return pacote;
}

export function criarFerramentasMontagem(catalogo) {
  return Object.freeze([
    {
      nome: 'descrever_montagem',
      descricao: 'Descreve uma montagem autorizada por ID e caminho semântico, sem escrita.',
      inputSchema: descreverMontagemEntrada,
      outputSchema: descreverMontagemSaida,
      executar: (entrada) => descreverMontagem(entrada, { catalogo }),
    },
    {
      nome: 'planejar_revalidacao_montagem',
      descricao: 'Deriva relações e pendências a revalidar depois de alterar um alvo semântico.',
      inputSchema: revalidarMontagemEntrada,
      outputSchema: revalidarMontagemSaida,
      executar: (entrada) => planejarRevalidacao(entrada, { catalogo }),
    },
    {
      nome: 'catalogar_montagens',
      descricao: 'Cataloga usos e relações somente entre raízes autorizadas escolhidas explicitamente.',
      inputSchema: catalogarMontagensEntrada,
      outputSchema: catalogarMontagensSaida,
      executar: (entrada) => catalogarMontagens(entrada, { catalogo }),
    },
    {
      nome: 'renderizar_montagem',
      descricao: 'Produz vistas em memória de uma montagem ou subárvore autorizada.',
      inputSchema: renderizarMontagemEntrada,
      outputSchema: renderizarMontagemSaida,
      executar: (entrada) => renderizarMontagem(entrada, { catalogo }),
      estruturar: ({ resposta }) => resposta,
      conteudo: conteudoRenderizacaoMontagem,
    },
  ]);
}
