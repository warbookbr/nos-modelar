/* universo-autoria.mjs — adaptador confinado do snapshot do universo. */

import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { criarProvedoresAutoriaInativa } from './autoria-ativa.mjs';
import { verificarCaminhoConfinado } from './caminho-confinado.mjs';

export class ErroCarregadorUniverso extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.name = 'ErroCarregadorUniverso';
    this.codigo = codigo;
  }
}

function arquivoComum(caminho) {
  let estado;
  try { estado = lstatSync(caminho); } catch {
    throw new ErroCarregadorUniverso('referencia-indisponivel', 'A referência autorizada não pôde ser lida.');
  }
  if (!estado.isFile() || estado.isSymbolicLink()) {
    throw new ErroCarregadorUniverso('referencia-indisponivel', 'A referência autorizada precisa ser arquivo comum.');
  }
}

function lerJsonConfinado(raiz, ref) {
  const caminho = resolve(raiz, `${ref}.json`);
  try {
    verificarCaminhoConfinado(caminho, { raiz });
    arquivoComum(caminho);
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    if (erro instanceof ErroCarregadorUniverso) throw erro;
    throw new ErroCarregadorUniverso('referencia-indisponivel', 'A referência autorizada não pôde ser lida.');
  }
}

function revisaoAtiva(estado, tipo, id) {
  const lista = estado?.[tipo] ?? [];
  return lista.find((item) => item.id === id)?.revisao ?? null;
}

export function sha256Canonico(bytes) {
  return `sha256:${createHash('sha256').update(bytes, 'utf8').digest('hex')}`;
}

export function criarCarregadoresUniverso({
  raizMontagens,
  raizPecas,
  provedores = criarProvedoresAutoriaInativa({}),
} = {}) {
  if (typeof raizMontagens !== 'string' || typeof raizPecas !== 'string') {
    throw new TypeError('raizMontagens e raizPecas são obrigatórias.');
  }
  if (!provedores || typeof provedores.estado !== 'function'
    || typeof provedores.carregarMontagem !== 'function'
    || typeof provedores.carregarPeca !== 'function') {
    throw new TypeError('provedores: informe carregadores e estado confiáveis.');
  }

  const montagens = resolve(raizMontagens);
  const pecas = resolve(raizPecas);
  let estadoAtual = null;

  async function observarEstado() {
    estadoAtual = await provedores.estado();
    return estadoAtual;
  }

  async function carregar(tipo, entrada, raiz, carregarAtivo) {
    const ativa = await carregarAtivo(entrada.id);
    if (ativa !== null && ativa !== undefined) {
      const revisao = revisaoAtiva(estadoAtual, tipo === 'montagem' ? 'montagens' : 'receitas', entrada.id);
      if (revisao === null) {
        throw new ErroCarregadorUniverso('revisao-indisponivel', 'A revisão ativa não tem proveniência observada.');
      }
      return {
        valor: ativa,
        fonte: 'revisao-ativa',
        revisao,
      };
    }
    return {
      valor: lerJsonConfinado(raiz, entrada.ref),
      fonte: 'base-estatica',
      revisao: null,
    };
  }

  return Object.freeze({
    observarEstado,
    carregarPeca: (entrada) => carregar('peca', entrada, pecas, provedores.carregarPeca.bind(provedores)),
    carregarMontagem: (entrada) => carregar('montagem', entrada, montagens, provedores.carregarMontagem.bind(provedores)),
  });
}
