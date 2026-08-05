/* revisao.mjs — adaptador MCP fino para os serviços existentes de modelagem. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { descreverPecaReutilizavel } from '../../mecanifica/descrever-peca.mjs';
import { validarPacoteNoDisco } from '../../modelagem/validar-pacote.mjs';
import { compararRevisoes } from '../../modelagem/revisao-modelagem.mjs';
import {
  RAIZ_PACOTES, caminhoDentro, caminhoPacote,
} from '../../modelagem/formato-pacote.mjs';
import { ErroDePacote } from '../../modelagem/formato-pacote.mjs';
import {
  compararEntrada, compararSaida, descreverEntrada, descreverSaida,
  erroAcionavel, respostaErro, respostaOk, validarEntrada, validarSaida,
} from '../contratos.mjs';

const REVISOES = 'revisoes';

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
]);
