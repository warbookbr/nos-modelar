/* snapshot-universo-autoria.js — leitura consistente do universo de autoria. */

import { lerPecaResolvida } from './ler-peca-resolvida.js';
import { lerUniversoAutoria, validarUniversoAutoria } from './ler-universo-autoria.js';

export const FORMATO = 'mecanifica.snapshot-universo-autoria';
export const VERSAO = 1;

export class ErroSnapshotUniverso extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroSnapshotUniverso';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

function falhar(codigo, caminho, mensagem) {
  throw new ErroSnapshotUniverso(codigo, caminho, mensagem);
}

function canonizar(valor) {
  if (Array.isArray(valor)) return valor.map(canonizar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, canonizar(valor[chave])]));
  }
  if (typeof valor === 'number' && Object.is(valor, -0)) return 0;
  return valor;
}

export function serializarCanonico(valor) {
  const serializado = JSON.stringify(canonizar(valor));
  if (serializado === undefined) throw new TypeError('o valor precisa ser JSON serializável.');
  return serializado;
}

function fonteValida(valor, caminho) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    falhar('fonte-invalida', caminho, 'o carregador precisa devolver valor, fonte e revisão.');
  }
  if (valor.fonte !== 'base-estatica' && valor.fonte !== 'revisao-ativa') {
    falhar('fonte-invalida', `${caminho}.fonte`, 'use base-estatica ou revisao-ativa.');
  }
  if (valor.revisao !== null && typeof valor.revisao !== 'string') {
    falhar('fonte-invalida', `${caminho}.revisao`, 'a revisão precisa ser texto ou nula.');
  }
  if (valor.valor === undefined) falhar('fonte-invalida', `${caminho}.valor`, 'o documento não pode ser indefinido.');
  return { valor: valor.valor, fonte: valor.fonte, revisao: valor.revisao ?? null };
}

async function lerFonte(carregar, entrada, tipo) {
  if (typeof carregar !== 'function') falhar('carregador-invalido', `carregar${tipo}`, 'forneça um carregador confiável.');
  try {
    return fonteValida(await carregar(entrada), `${tipo.toLowerCase()}.${entrada.id}`);
  } catch (erro) {
    if (erro instanceof ErroSnapshotUniverso) throw erro;
    falhar('fonte-indisponivel', `${tipo.toLowerCase()}.${entrada.id}`, erro instanceof Error ? erro.message : String(erro));
  }
}

function validarPeca(fonte, entrada) {
  try {
    lerPecaResolvida(fonte.valor);
  } catch (erro) {
    falhar('peca-invalida', `pecas.${entrada.id}`, erro instanceof Error ? erro.message : String(erro));
  }
}

function assinaturaFontes(pecas, montagens) {
  return {
    pecas: pecas.map(({ id, ref, fonte, revisao, sha256 }) => ({ id, ref, fonte, revisao, sha256 })),
    montagens: montagens.map(({ id, ref, fonte, revisao, sha256 }) => ({ id, ref, fonte, revisao, sha256 })),
  };
}

function mesmaVisao(a, b) {
  return serializarCanonico(a) === serializarCanonico(b);
}

async function capturar({ universo, carregarPeca, carregarMontagem, observarEstado, hash }) {
  const estadoInicial = await observarEstado();
  const pecas = [];
  for (const entrada of universo.pecas) {
    const fonte = await lerFonte(carregarPeca, entrada, 'Peca');
    validarPeca(fonte, entrada);
    pecas.push({
      id: entrada.id,
      ref: entrada.ref,
      fonte: fonte.fonte,
      revisao: fonte.revisao,
      sha256: await hash(serializarCanonico(fonte.valor)),
      documento: fonte.valor,
    });
  }

  const montagens = [];
  for (const entrada of universo.montagens) {
    const fonte = await lerFonte(carregarMontagem, entrada, 'Montagem');
    montagens.push({
      id: entrada.id,
      ref: entrada.ref,
      fonte: fonte.fonte,
      revisao: fonte.revisao,
      sha256: await hash(serializarCanonico(fonte.valor)),
      documento: fonte.valor,
    });
  }
  const estadoFinal = await observarEstado();
  if (!mesmaVisao(estadoInicial, estadoFinal)) {
    falhar('universo-alterado', '$estado', 'a autoria mudou durante a leitura; repita o snapshot.');
  }

  const porRef = new Map(montagens.map((montagem) => [montagem.ref, montagem.documento]));
  let validado;
  try {
    validado = await validarUniversoAutoria(universo, {
      carregarMontagem: async (ref) => porRef.get(ref),
    });
  } catch (erro) {
    falhar('universo-invalido', '$montagens', erro instanceof Error ? erro.message : String(erro));
  }

  return {
    fontes: assinaturaFontes(pecas, montagens),
    estado: estadoInicial,
    pecas,
    montagens,
    dependencias: validado.dependencias,
  };
}

export async function criarSnapshotUniversoAutoria({
  universo: dado,
  carregarPeca,
  carregarMontagem,
  observarEstado = async () => null,
  hash,
  tentativas = 2,
} = {}) {
  const universo = lerUniversoAutoria(dado);
  if (typeof hash !== 'function') throw new TypeError('hash: forneça um hash criptográfico do host.');
  if (!Number.isSafeInteger(tentativas) || tentativas < 1) throw new TypeError('tentativas: informe inteiro seguro >= 1.');

  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    let primeira;
    let segunda;
    try {
      primeira = await capturar({ universo, carregarPeca, carregarMontagem, observarEstado, hash });
      segunda = await capturar({ universo, carregarPeca, carregarMontagem, observarEstado, hash });
    } catch (erro) {
      if (erro?.codigo === 'universo-alterado' && tentativa < tentativas) continue;
      throw erro;
    }
    if (mesmaVisao(primeira.fontes, segunda.fontes) && mesmaVisao(primeira.estado, segunda.estado)) {
      return {
        formato: FORMATO,
        versao: VERSAO,
        universo,
        pecas: segunda.pecas,
        montagens: segunda.montagens,
        dependencias: segunda.dependencias,
        cobertura: {
          completa: true,
          entidades: universo.pecas.length + universo.montagens.length,
          tentativas: tentativa,
          estado: segunda.estado,
        },
      };
    }
    if (tentativa === tentativas) {
      falhar('universo-alterado', '$fontes', 'as fontes mudaram entre leituras; nenhum snapshot misto foi publicado.');
    }
  }
  throw new Error('fluxo de snapshot impossível.');
}
