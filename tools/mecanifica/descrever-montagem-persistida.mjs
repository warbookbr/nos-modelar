#!/usr/bin/env node
/* descrever-montagem-persistida.mjs — CLI confinada do contexto JSON para IA. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { descreverMontagemResolvida } from '../../src/autoria/descrever-montagem-resolvida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { lerArgumentos } from './argumentos.mjs';
import { verificarCaminhoConfinado } from './caminho-confinado.mjs';

class ErroEntradaContexto extends Error {
  constructor(codigo, campo, mensagem, acao) {
    super(mensagem);
    this.name = 'ErroEntradaContexto';
    this.codigo = codigo;
    this.campo = campo;
    this.acao = acao;
  }
}

const uso = 'Use --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir>.';

function exigir(valor, campo) {
  if (!valor) throw new ErroEntradaContexto('opcao-obrigatoria', campo, `--${campo} é obrigatório.`, uso);
  return valor;
}

function lerJsonConfinado(caminho, raiz, campo) {
  try {
    verificarCaminhoConfinado(caminho, { raiz });
  } catch (erro) {
    throw new ErroEntradaContexto(
      'caminho-nao-confinado', campo, erro instanceof Error ? erro.message : String(erro),
      `Use um arquivo comum estritamente dentro de --${campo === 'arquivo' ? 'raiz-montagens' : campo}.`,
    );
  }
  let texto;
  try {
    texto = readFileSync(caminho, 'utf8');
  } catch (erro) {
    throw new ErroEntradaContexto(
      'arquivo-indisponivel', campo, `arquivo solicitado não pôde ser lido (${erro?.code ?? 'erro de leitura'}).`,
      'Confirme a referência, a raiz explícita e as permissões de leitura.',
    );
  }
  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw new ErroEntradaContexto(
      'json-invalido', campo, erro instanceof Error ? erro.message : String(erro),
      'Corrija o JSON antes de resolver a montagem.',
    );
  }
}

function caminhoDaConsulta(valor) {
  if (valor === null) return undefined;
  const segmentos = valor.split('/');
  if (segmentos.some((segmento) => !segmento)) {
    throw new ErroEntradaContexto(
      'caminho-invalido', 'caminho', '--caminho não aceita segmento vazio.',
      'Use IDs separados por uma barra, por exemplo --caminho=freio/disco.',
    );
  }
  return segmentos;
}

function profundidadeDaConsulta(valor) {
  if (valor === null) return undefined;
  if (!/^\d+$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
    throw new ErroEntradaContexto(
      'profundidade-invalida', 'profundidade', '--profundidade precisa ser inteiro não negativo.',
      'Remova a opção ou informe, por exemplo, --profundidade=1.',
    );
  }
  return Number(valor);
}

function diagnostico(erro) {
  const acaoPorCodigo = {
    'referencia-ausente': 'Confirme a referência e se o JSON correspondente existe dentro da raiz explícita.',
    'caminho-ausente': 'Consulte instancias[].caminho no contexto completo e escolha um caminho existente.',
  };
  return {
    nome: erro?.name ?? 'Error',
    codigo: erro?.codigo ?? 'entrada-invalida',
    campo: erro?.campo ?? erro?.caminho ?? '$argumentos',
    mensagem: erro instanceof Error ? erro.message : String(erro),
    acao: erro?.acao ?? acaoPorCodigo[erro?.codigo] ?? uso,
  };
}

try {
  const argumentos = lerArgumentos(process.argv.slice(2), {
    opcoes: ['arquivo', 'raiz-montagens', 'raiz-pecas', 'caminho', 'profundidade'],
    bandeiras: ['incluir-relacionados'],
  });
  const raizMontagens = resolve(exigir(argumentos.opcao('raiz-montagens'), 'raiz-montagens'));
  const raizPecas = resolve(exigir(argumentos.opcao('raiz-pecas'), 'raiz-pecas'));
  const arquivo = resolve(exigir(argumentos.opcao('arquivo'), 'arquivo'));
  const raiz = lerJsonConfinado(arquivo, raizMontagens, 'arquivo');
  const carregarMontagem = async (ref) => lerJsonConfinado(resolve(raizMontagens, `${ref}.json`), raizMontagens, 'raiz-montagens');
  const carregarPeca = async (ref) => lerJsonConfinado(resolve(raizPecas, `${ref}.json`), raizPecas, 'raiz-pecas');
  const resolvida = await resolverMontagemPersistida(raiz, { carregarPeca, carregarMontagem });
  const opcoes = {
    ...(argumentos.opcao('caminho') !== null ? { caminho: caminhoDaConsulta(argumentos.opcao('caminho')) } : {}),
    ...(argumentos.opcao('profundidade') !== null ? { profundidade: profundidadeDaConsulta(argumentos.opcao('profundidade')) } : {}),
    ...(argumentos.bandeira('incluir-relacionados') ? { incluirRelacionados: true } : {}),
  };
  process.stdout.write(`${JSON.stringify(descreverMontagemResolvida(resolvida, opcoes), null, 2)}\n`);
} catch (erro) {
  process.stderr.write(`descrever-montagem-persistida: ${JSON.stringify({ erro: diagnostico(erro) })}\n`);
  process.exitCode = 1;
}
