/* montagens.mjs — adaptador MCP fino para leitura e auditoria de montagens. */
import { createHash } from 'node:crypto';
import { derivarCatalogoMontagens } from '../../../src/autoria/derivar-catalogo-montagens.js';
import { derivarRoteiroRevalidacao } from '../../../src/autoria/derivar-roteiro-revalidacao.js';
import { descreverMontagemResolvida } from '../../../src/autoria/descrever-montagem-resolvida.js';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { capturarMontagem } from '../../mecanifica/capturar-montagem.mjs';
import { ErroCatalogoMcpMontagens, REGRA_ESCOPO_CATALOGO } from '../catalogo-montagens.mjs';
import {
  catalogarMontagensEntrada, catalogarMontagensSaida,
  descreverMontagemEntrada, descreverMontagemSaida,
  erroAcionavel, renderizarMontagemEntrada, renderizarMontagemSaida,
  revisarMontagemEntrada, revisarMontagemSaida,
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
      roteiro: derivarRoteiroRevalidacao(
        resolvida,
        Array.isArray(argumentos.alvo) ? { caminho: argumentos.alvo } : argumentos.alvo,
      ),
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

export async function revisarMontagem(input, {
  catalogo,
  capturar = capturarMontagem,
  agora = () => Date.now(),
} = {}) {
  let argumentos;
  try { argumentos = revisarMontagemEntrada.parse(input); } catch {
    return { resposta: entradaRecusada(), imagens: [] };
  }
  const descricao = await descreverMontagem({
    id: argumentos.id,
    ...(argumentos.caminho ? { caminho: argumentos.caminho } : {}),
    ...(argumentos.incluirRelacionados !== undefined ? { incluirRelacionados: argumentos.incluirRelacionados } : {}),
  }, { catalogo });
  if (!descricao.ok) return { resposta: descricao, imagens: [] };

  const contexto = descricao.resultado.contexto;
  const resolvida = await catalogo.resolver(argumentos.id);
  const auditoriaIntersecoes = auditarIntersecoesMontagem(resolvida, {
    ...(argumentos.caminho ? { caminho: argumentos.caminho } : {}),
    ...(argumentos.modoFoco ? { modoFoco: argumentos.modoFoco } : {}),
  });
  const colisaoCompleta = argumentos.caminho === undefined && auditoriaIntersecoes.cobertura.completa;
  const contextoRevisao = {
    ...contexto,
    cobertura: {
      ...contexto.cobertura,
      colisaoGlobalVerificada: colisaoCompleta,
      ...(colisaoCompleta
        ? { limitacoes: contexto.cobertura.limitacoes.filter((codigo) => codigo !== 'caixas-mundo-nao-provam-colisao-distancia-ou-folga') }
        : {}),
    },
  };
  const verificacoes = contexto.relacoes.map((relacao) => ({
    id: relacao.id,
    tipo: relacao.tipo,
    estado: relacao.satisfeita === true ? 'passou' : 'falhou',
    referencia: relacao.referencia,
    movel: relacao.movel,
    ...(relacao.medidas !== undefined ? { medidas: relacao.medidas } : {}),
    diagnosticos: relacao.diagnosticos ?? [],
  }));
  const visual = await renderizarMontagem({
    id: argumentos.id,
    ...(argumentos.caminho ? { caminho: argumentos.caminho } : {}),
    ...(argumentos.vistas ? { vistas: argumentos.vistas } : {}),
  }, { catalogo, capturar, agora });
  const naoVerificadas = contextoRevisao.cobertura.limitacoes.map((codigo) => ({
    codigo,
    mensagem: mensagemDaLimitacao(codigo),
  }));
  const visualDisponivel = visual.resposta.ok;
  const estado = verificacoes.some(({ estado: atual }) => atual === 'falhou')
    ? 'reprovada'
    : (auditoriaIntersecoes.pares.some(({ estado: atual }) => atual === 'interpenetram')
      ? 'reprovada'
      : (!visualDisponivel || verificacoes.length === 0 || naoVerificadas.length > 0
        ? 'incompleta' : 'sem-falhas-declaradas'));
  const resposta = respostaOk(0, {
    formato: 'mecanifica.revisao-montagem',
    versao: 1,
    id: argumentos.id,
    caminho: argumentos.caminho ?? [],
    estado,
    contexto: contextoRevisao,
    verificacoes,
    auditoriaIntersecoes,
    cobertura: {
      verificadas: verificacoes.length > 0 ? ['relações declaradas nesta montagem'] : [],
      naoVerificadas,
    },
    visual: {
      estado: visualDisponivel ? 'produzida' : 'indisponivel',
      instrucao: 'Use as imagens para avaliar proporção, forma, encaixe aparente e detalhes visíveis. A imagem não substitui as medidas.',
      vistas: visualDisponivel ? visual.resposta.resultado.vistas : [],
    },
    recomendacoes: [
      `Interpretação obrigatória: ${REGRA_ESCOPO_CATALOGO}`,
      ...(verificacoes.some(({ estado: atual }) => atual === 'falhou')
        ? ['Corrija as verificações reprovadas antes de aceitar a montagem.'] : []),
      ...(auditoriaIntersecoes.pares.some(({ estado: atual }) => atual === 'interpenetram')
        ? ['Corrija as interpenetrações detectadas antes de aceitar a montagem.'] : []),
      ...(auditoriaIntersecoes.cobertura.inconclusivos > 0
        ? ['A auditoria geométrica ficou inconclusiva em alguns pares; não trate a montagem como livre de interseções.'] : []),
      ...(naoVerificadas.length > 0
        ? ['Não trate esta revisão como aprovação completa: há verificações fora do escopo atual.'] : []),
      ...(visualDisponivel ? [] : ['Repita a revisão com um ambiente visual disponível.']),
    ],
  });
  return { resposta, imagens: visual.imagens };
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

function mensagemDaLimitacao(codigo) {
  const mensagens = {
    'caixas-mundo-nao-provam-colisao-distancia-ou-folga': 'não foi provado se há colisão ou folga geral entre todas as peças',
    'hierarquia-de-partes-nao-transportada': 'a hierarquia interna das peças não foi transportada nesta resposta',
    'dependencias-indiretas-nao-verificadas': 'não foram procuradas dependências fora desta montagem',
    'uso-global-fora-da-raiz-nao-verificado': 'não foram procurados usos desta peça em outras montagens',
  };
  return mensagens[codigo] ?? `a verificação '${codigo}' não foi executada`;
}

export function conteudoRevisaoMontagem({ resposta, imagens }) {
  if (!resposta.ok) {
    return [{ type: 'text', text: `revisar_montagem: ${resposta.erro?.mensagem ?? 'operação recusada.'}` }];
  }
  const resultado = resposta.resultado;
  const falhas = resultado.verificacoes.filter(({ estado }) => estado === 'falhou').length;
  const interpenetracoes = resultado.auditoriaIntersecoes.pares.filter(({ estado }) => estado === 'interpenetram').length;
  const texto = [
    `revisar_montagem: ${resultado.estado}.`,
    `Escopo: ${REGRA_ESCOPO_CATALOGO}`,
    `${resultado.verificacoes.length} verificação(ões) declarada(s), ${falhas} falha(s); ${interpenetracoes} interpenetração(ões) detectada(s).`,
    resultado.visual.estado === 'produzida'
      ? `${resultado.visual.vistas.length} vista(s) produzida(s); a análise visual cabe à IA consumidora.`
      : 'As imagens não foram produzidas; a revisão está incompleta.',
  ].join(' ');
  return [{ type: 'text', text: texto }, ...imagens.map(({ data, mimeType }) => ({ type: 'image', data, mimeType }))];
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
      descricao: 'Descreve por ID uma montagem listada no catálogo configurado pelo host, sem escrita. Estar listada concede escopo de operação, não aprovação.',
      inputSchema: descreverMontagemEntrada,
      outputSchema: descreverMontagemSaida,
      executar: (entrada) => descreverMontagem(entrada, { catalogo }),
    },
    {
      nome: 'planejar_revalidacao_montagem',
      descricao: 'Deriva relações e pendências a revalidar depois de alterar uma instância por caminho ou uma definição compartilhada por tipo/ref.',
      inputSchema: revalidarMontagemEntrada,
      outputSchema: revalidarMontagemSaida,
      executar: (entrada) => planejarRevalidacao(entrada, { catalogo }),
    },
    {
      nome: 'catalogar_montagens',
      descricao: 'Cataloga usos e relações somente entre raízes listadas explicitamente pelo host.',
      inputSchema: catalogarMontagensEntrada,
      outputSchema: catalogarMontagensSaida,
      executar: (entrada) => catalogarMontagens(entrada, { catalogo }),
    },
    {
      nome: 'renderizar_montagem',
      descricao: 'Produz vistas em memória de uma montagem ou subárvore listada no catálogo do host.',
      inputSchema: renderizarMontagemEntrada,
      outputSchema: renderizarMontagemSaida,
      executar: (entrada) => renderizarMontagem(entrada, { catalogo }),
      estruturar: ({ resposta }) => resposta,
      conteudo: conteudoRenderizacaoMontagem,
    },
    {
      nome: 'revisar_montagem',
      descricao: 'Avalia uma montagem listada no catálogo do host e separa verificações executadas, limitações e vistas. modoFoco interno reduz pares ao interior da subárvore e mantém omissões explícitas. A listagem não é aprovação nem homologação.',
      inputSchema: revisarMontagemEntrada,
      outputSchema: revisarMontagemSaida,
      executar: (entrada) => revisarMontagem(entrada, { catalogo }),
      estruturar: ({ resposta }) => resposta,
      conteudo: conteudoRevisaoMontagem,
    },
  ]);
}
