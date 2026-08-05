/* revisao.mjs — adaptador MCP fino para os serviços existentes de modelagem. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { descreverPecaReutilizavel } from '../../mecanifica/descrever-peca.mjs';
import { olharBancada } from '../../mecanifica/olhar-bancada.mjs';
import { validarPacoteNoDisco } from '../../modelagem/validar-pacote.mjs';
import { compararRevisoes } from '../../modelagem/revisao-modelagem.mjs';
import {
  RAIZ_PACOTES, REVISOES, caminhoDentro, caminhoPacote,
} from '../../modelagem/formato-pacote.mjs';
import { ErroDePacote } from '../../modelagem/formato-pacote.mjs';
import {
  compararEntrada, compararSaida, descreverEntrada, descreverSaida,
  erroAcionavel, renderizarEntrada, renderizarSaida, respostaErro, respostaOk,
  validarEntrada, validarSaida,
} from '../contratos.mjs';

const VISTAS_OFICIAIS = Object.freeze(['isometrica', 'frontal', 'direita', 'superior']);
export const LIMITES_VISTAS = Object.freeze({
  imagemBytes: 2 * 1024 * 1024,
  totalBytes: 8 * 1024 * 1024,
  respostaBytes: 11 * 1024 * 1024,
  timeoutMs: 45_000,
});

function textoCurto(valor, limite = 320) {
  const texto = String(valor ?? '').replace(/\s+/g, ' ').trim();
  return texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto;
}

function erroDeServico(resultado) {
  const categoria = resultado?.erro?.categoria;
  return respostaErro(resultado?.codigo ?? 1, erroAcionavel(
    resultado?.erro?.codigo ?? (categoria === 'uso' ? 'uso_invalido' : 'falha_servico'),
    textoCurto(resultado?.erro?.mensagem ?? 'O serviço recusou a operação.'),
    categoria === 'uso'
      ? 'Corrija os argumentos conforme o schema da ferramenta.'
      : 'Inspecione o diagnóstico estruturado antes de tentar novamente.',
  ));
}

function entradaRecusada() {
  return respostaErro(1, erroAcionavel(
    'entrada_recusada',
    'A entrada não atende ao schema da ferramenta.',
    'Corrija os campos conforme o schema anunciado em tools/list.',
  ));
}

function falhaInterna(nome, erro) {
  const tipo = erro?.name ?? 'Error';
  process.stderr.write(`mecanifica-mcp: ${nome}: falha interna (${tipo}).\n`);
  return respostaErro(1, erroAcionavel(
    'falha_interna',
    'A ferramenta não conseguiu concluir a operação.',
    'Tente novamente; não altere os argumentos com base neste erro.',
  ));
}

function erroDeExcecao(nome, erro, codigo, acao) {
  if (erro instanceof ErroDePacote || erro?.codigo === 'revisao_nao_encontrada') {
    return respostaErro(1, erroAcionavel(codigo, textoCurto(erro.message), acao));
  }
  return falhaInterna(nome, erro);
}

export function resumoDescricao(descricao) {
  return {
    totais: resumoTotais(descricao.totais),
    partes: descricao.partes.map(({ nome, faces, corpos, min, max, centro, dimensoes }) => ({
      nome, faces, corpos, min, max, centro, dimensoes,
    })),
    hierarquia: descricao.hierarquia.map(({ nome, pai }) => ({ nome, pai })),
    relacoes: descricao.relacoes.map(({ a, b, tipo, distancia, eixo, porEixo }) => ({
      a, b, tipo, distancia, eixo, porEixo,
    })),
    portas: descricao.portas.map(({ id, rotulo, op, recorte, origem }) => ({
      id, rotulo, op, recorte, origem,
    })),
    geometria: {
      algoritmo: descricao.geometria.algoritmo,
      partes: descricao.geometria.partes.map(({ nome, assinatura }) => ({ nome, assinatura })),
    },
  };
}

export function resumoTotais(totais) {
  return {
    partes: totais.partes,
    faces: totais.faces,
    vertices: totais.vertices,
    facesSemParte: totais.facesSemParte,
    orfaos: totais.orfaos,
    portas: totais.portas,
    materiais: totais.materiais,
  };
}

function contarMudancas(grupo) {
  return {
    adicionadas: grupo.adicionadas.length,
    removidas: grupo.removidas.length,
    alteradas: grupo.alteradas.length,
  };
}

export function resumoComparacao(comparacao) {
  return {
    formato: comparacao.formato,
    versao: comparacao.versao,
    peca: comparacao.peca,
    anterior: comparacao.anterior,
    atual: comparacao.atual,
    modeloMudou: comparacao.modeloMudou,
    contagens: comparacao.contagens,
    alteracoes: {
      partes: contarMudancas(comparacao.partes),
      relacoes: contarMudancas(comparacao.relacoes),
      portas: contarMudancas(comparacao.portas),
      aparencia: {
        materiais: contarMudancas(comparacao.aparencia.materiais),
        partes: contarMudancas(comparacao.aparencia.partes),
      },
      geometria: {
        partes: contarMudancas(comparacao.geometria.partes),
        mudou: comparacao.geometria.mudou,
      },
    },
  };
}

function lerRevisaoOficial(id, nome) {
  const pasta = caminhoPacote(id, { raizPacotes: RAIZ_PACOTES });
  const arquivo = join(pasta, REVISOES, nome, 'revisao.json');
  if (!caminhoDentro(RAIZ_PACOTES, pasta) || !caminhoDentro(pasta, arquivo)) {
    const erro = new Error('revisão fora da raiz oficial.');
    erro.codigo = 'revisao_nao_encontrada';
    throw erro;
  }
  try {
    return JSON.parse(readFileSync(arquivo, 'utf8'));
  } catch {
    const erro = new Error(`a revisão oficial '${nome}' não foi encontrada ou não é JSON válido.`);
    erro.codigo = 'revisao_nao_encontrada';
    throw erro;
  }
}

export async function descrever(input) {
  let argumentos;
  try { argumentos = descreverEntrada.parse(input); } catch { return entradaRecusada(); }
  const resultado = await descreverPecaReutilizavel(argumentos);
  if (!resultado.ok) return erroDeServico(resultado);
  return respostaOk(resultado.codigo, {
    peca: resultado.resultado.peca,
    descricao: resumoDescricao(resultado.resultado.descricao),
  });
}

export async function validar(input) {
  let argumentos;
  try { argumentos = validarEntrada.parse(input); } catch { return entradaRecusada(); }
  const { id } = argumentos;
  try {
    const validado = await validarPacoteNoDisco(id, { raizPacotes: RAIZ_PACOTES });
    return respostaOk(0, {
      id,
      modo: validado.modo,
      peca: validado.peca,
      partes: validado.partes,
      bytes: validado.bytes,
      alvo: validado.alvo
        ? {
          peca: validado.alvo.peca,
          partes: validado.alvo.partes,
            totais: resumoTotais(validado.alvo.descricao.totais),
        }
        : null,
    });
  } catch (erro) {
    const codigo = erro instanceof ErroDePacote && /não existe/.test(erro.message)
      ? 'pacote_nao_encontrado' : 'pacote_invalido';
    return erroDeExcecao(
      'validar_pacote', erro, codigo,
      'Use um pacote oficial existente ou corrija o contrato do pacote.',
    );
  }
}

export function comparar(input) {
  let argumentos;
  try { argumentos = compararEntrada.parse(input); } catch { return entradaRecusada(); }
  const { id, anterior, posterior } = argumentos;
  try {
    const comparacao = compararRevisoes(
      lerRevisaoOficial(id, anterior),
      lerRevisaoOficial(id, posterior),
    );
    return respostaOk(0, {
      id,
      anterior,
      posterior,
      comparacao: resumoComparacao(comparacao),
    });
  } catch (erro) {
    const codigo = erro?.codigo === 'revisao_nao_encontrada'
      ? 'revisao_nao_encontrada' : 'revisao_invalida';
    return erroDeExcecao(
      'comparar_revisoes', erro, codigo,
      'Use duas revisões oficiais existentes e válidas do mesmo pacote.',
    );
  }
}

function pacoteVisual(resposta, imagens = []) {
  return { resposta, imagens };
}

export function conteudoRenderizacao({ resposta, imagens }) {
  if (!resposta.ok) {
    return [{ type: 'text', text: `renderizar_vistas: ${resposta.erro?.mensagem ?? 'operação recusada.'}` }];
  }
  return [
    { type: 'text', text: 'renderizar_vistas: quatro vistas oficiais produzidas.' },
    ...imagens.map(({ data, mimeType }) => ({ type: 'image', data, mimeType })),
  ];
}

function erroVisual(codigo, mensagem, acao) {
  return pacoteVisual(respostaErro(1, erroAcionavel(codigo, mensagem, acao)));
}

export async function renderizar(input, {
  olhar = olharBancada,
  limites = LIMITES_VISTAS,
  agora = () => Date.now(),
} = {}) {
  let argumentos;
  try { argumentos = renderizarEntrada.parse(input); } catch { return pacoteVisual(entradaRecusada()); }
  const inicio = agora();
  let capturado;
  try {
    capturado = await olhar({
      peca: argumentos.peca,
      revisar: true,
      capturarEmMemoria: true,
      timeoutMs: limites.timeoutMs,
    });
  } catch (erro) {
    return pacoteVisual(falhaInterna('renderizar_vistas', erro));
  }
  if (!capturado.ok) {
    const tempo = capturado.erro?.codigo === 'tempo_esgotado';
    return erroVisual(
      tempo ? 'tempo_esgotado' : (capturado.erro?.codigo ?? 'falha_bancada'),
      textoCurto(capturado.erro?.mensagem ?? 'A bancada recusou a captura.'),
      tempo
        ? 'Reduza o custo da captura sem alterar as quatro vistas oficiais, ou pare a fatia.'
        : 'Inspecione o diagnóstico da bancada antes de tentar novamente.',
    );
  }
  const capturas = capturado.resultado?.capturas;
  const vistasRelatadas = capturado.resultado?.vistas ?? [];
  if (!Array.isArray(capturas) || capturas.length !== VISTAS_OFICIAIS.length
    || capturas.some((captura, indice) => captura.nome !== VISTAS_OFICIAIS[indice])) {
    return erroVisual(
      'vistas_incompletas',
      'A bancada não devolveu exatamente as quatro vistas oficiais na ordem contratada.',
      'Corrija o serviço compartilhado; não complete a resposta com capturas sintéticas.',
    );
  }
  const imagens = [];
  const vistas = [];
  let totalBytes = 0;
  for (const captura of capturas) {
    const dados = Buffer.isBuffer(captura.dados) ? captura.dados : Buffer.from(captura.dados ?? []);
    if (dados.byteLength > limites.imagemBytes) {
      return erroVisual(
        'payload_excedido',
        `A vista '${captura.nome}' excedeu o limite de ${limites.imagemBytes} bytes.`,
        'Pare a fatia e decida outro transporte; não reduza a prova oficial silenciosamente.',
      );
    }
    totalBytes += dados.byteLength;
    const relato = vistasRelatadas.find(({ nome }) => nome === captura.nome);
    if (!relato?.enquadramento) {
      return erroVisual(
        'vistas_incompletas',
        `A vista '${captura.nome}' não trouxe métricas de enquadramento.`,
        'Corrija a paridade com o serviço da bancada antes de publicar a ferramenta.',
      );
    }
    const data = dados.toString('base64');
    imagens.push({ nome: captura.nome, mimeType: 'image/png', data });
    vistas.push({
      nome: captura.nome,
      mimeType: 'image/png',
      largura: captura.largura,
      altura: captura.altura,
      bytes: dados.byteLength,
      sha256: `sha256:${createHash('sha256').update(dados).digest('hex')}`,
      enquadramento: relato.enquadramento,
    });
  }
  if (totalBytes > limites.totalBytes) {
    return erroVisual(
      'payload_excedido',
      `As quatro vistas somaram ${totalBytes} bytes; o limite é ${limites.totalBytes}.`,
      'Pare a fatia e decida outro transporte; não omita nem recomprima vistas silenciosamente.',
    );
  }
  const resposta = respostaOk(0, {
    formato: 'mecanifica.vistas-oficiais',
    versao: 1,
    peca: capturado.resultado.peca,
    duracaoMs: Math.max(0, Math.round(agora() - inicio)),
    bytes: totalBytes,
    vistas,
  });
  const pacote = pacoteVisual(resposta, imagens);
  const respostaBytes = Buffer.byteLength(JSON.stringify({
    content: conteudoRenderizacao(pacote),
    structuredContent: resposta,
  }), 'utf8');
  if (respostaBytes > limites.respostaBytes) {
    return erroVisual(
      'payload_excedido',
      `A resposta MCP serializada teria ${respostaBytes} bytes; o limite é ${limites.respostaBytes}.`,
      'Pare a fatia e decida outro transporte; não altere as quatro vistas oficiais silenciosamente.',
    );
  }
  return pacote;
}

export const ferramentasRevisao = Object.freeze([
  {
    nome: 'descrever_peca',
    descricao: 'Mede uma peça pela régua neutra existente, sem escrever no repositório.',
    inputSchema: descreverEntrada,
    outputSchema: descreverSaida,
    executar: descrever,
  },
  {
    nome: 'validar_pacote',
    descricao: 'Valida um pacote oficial somente leitura.',
    inputSchema: validarEntrada,
    outputSchema: validarSaida,
    executar: validar,
  },
  {
    nome: 'comparar_revisoes',
    descricao: 'Compara duas revisões oficiais do mesmo pacote.',
    inputSchema: compararEntrada,
    outputSchema: compararSaida,
    executar: comparar,
  },
  {
    nome: 'renderizar_vistas',
    descricao: 'Produz e transporta as quatro vistas oficiais sem escrever artefatos.',
    inputSchema: renderizarEntrada,
    outputSchema: renderizarSaida,
    executar: renderizar,
    estruturar: ({ resposta }) => resposta,
    conteudo: conteudoRenderizacao,
  },
]);
