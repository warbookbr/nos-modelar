/* repositorio-revalidacao.mjs — persistência R01 sobre o repositório transacional existente. */

import { createHash } from 'node:crypto';
import {
  lerRevisaoAtivaAutoria,
  materializarRevisaoAutoria,
  planejarRevisaoAutoria,
} from './repositorio-autoria.mjs';
import {
  registrarResultado,
  transicionarItem,
  validarCampanhaRevalidacao,
} from '../../src/autoria/protocolo-revalidacao.js';
import { serializarCanonico } from '../../src/autoria/snapshot-universo-autoria.js';

export class ErroRepositorioRevalidacao extends Error {
  constructor(codigo, mensagem, acao) {
    super(mensagem);
    this.name = 'ErroRepositorioRevalidacao';
    this.codigo = codigo;
    this.acao = acao;
  }
}

function identidadeValida(identidade) {
  if (!identidade || typeof identidade !== 'object' || Array.isArray(identidade)
    || !identidade.causa || typeof identidade.causa.tipo !== 'string'
    || typeof identidade.causa.id !== 'string' || !identidade.causa.id
    || (identidade.causa.revisao !== null && typeof identidade.causa.revisao !== 'string')
    || typeof identidade.causa.sha256 !== 'string' || !identidade.causa.sha256
    || (identidade.universo !== null && typeof identidade.universo !== 'string')
    || typeof identidade.mapaSha256 !== 'string' || !identidade.mapaSha256) {
    throw new ErroRepositorioRevalidacao('identidade-invalida', 'identidade de campanha incompleta.', 'Use causa, universo e hash canônicos observados.');
  }
  return {
    causa: {
      tipo: identidade.causa.tipo,
      id: identidade.causa.id,
      revisao: identidade.causa.revisao ?? null,
      sha256: identidade.causa.sha256,
    },
    universo: identidade.universo ?? null,
    mapaSha256: identidade.mapaSha256,
  };
}

function entidadeDaIdentidade(identidade) {
  const bytes = serializarCanonico(identidade);
  const digest = createHash('sha256').update(bytes, 'utf8').digest('hex');
  /* É endereço técnico derivado; não substitui a identidade semântica salva. */
  return `campanha-${digest}`;
}

function compararBytes(a, b) {
  return serializarCanonico(a) === serializarCanonico(b);
}

function validarPai(pai) {
  if (pai !== null && (typeof pai !== 'string' || !/^[0-9a-f]{64}$/.test(pai))) {
    throw new ErroRepositorioRevalidacao('pai-invalido', 'pai precisa ser commit hexadecimal ou null.', 'Use a revisão retornada pela leitura atual.');
  }
}

export function enderecoTecnicoCampanha(identidade) {
  return entidadeDaIdentidade(identidadeValida(identidade));
}

export async function persistirCampanhaRevalidacao({ raiz, campanha, pai = null, falhaInjetada, fs, telemetria } = {}) {
  const validada = validarCampanhaRevalidacao(campanha);
  validarPai(pai);
  const entidade = entidadeDaIdentidade(validada.identidade);
  const ativa = await lerRevisaoAtivaAutoria(raiz, entidade, { fs });
  if (ativa && compararBytes(ativa.conteudo, validada)) {
    return {
      estado: 'aplicado',
      idempotente: true,
      identidade: validada.identidade,
      revisao: ativa.commit,
      objeto: ativa.objeto,
    };
  }
  if ((ativa?.commit ?? null) !== pai) {
    throw new ErroRepositorioRevalidacao(
      'revisao-desatualizada',
      `a campanha '${entidade}' mudou desde o pai observado.`,
      'Leia a campanha atual, preserve o histórico e planeje novamente.',
    );
  }
  const plano = planejarRevisaoAutoria({ entidade, conteudo: validada, pai });
  const aplicado = await materializarRevisaoAutoria({ raiz, plano, falhaInjetada, fs, telemetria });
  return {
    estado: aplicado.estado,
    idempotente: Boolean(aplicado.idempotente),
    identidade: validada.identidade,
    revisao: aplicado.commit,
    objeto: aplicado.objeto,
  };
}

export async function lerCampanhaRevalidacao(raiz, identidade, { fs } = {}) {
  const identidadeObservada = identidadeValida(identidade);
  const entidade = entidadeDaIdentidade(identidadeObservada);
  const ativa = await lerRevisaoAtivaAutoria(raiz, entidade, { fs });
  if (!ativa) return null;
  let campanha;
  try { campanha = validarCampanhaRevalidacao(ativa.conteudo); }
  catch (erro) {
    throw new ErroRepositorioRevalidacao('campanha-corrompida', erro instanceof Error ? erro.message : String(erro), 'Preserve a revisão e interrompa a leitura.');
  }
  if (!compararBytes(campanha.identidade, identidadeObservada)) {
    throw new ErroRepositorioRevalidacao('identidade-divergente', 'a campanha armazenada não corresponde à identidade consultada.', 'Preserve a revisão e descarte o endereço técnico divergente.');
  }
  return {
    estado: ativa.estado,
    pai: ativa.pai,
    revisao: ativa.commit,
    objeto: ativa.objeto,
    campanha,
  };
}

function versaoEsperadaValida(versao) {
  if (!Number.isSafeInteger(versao) || versao < 0) {
    throw new ErroRepositorioRevalidacao('versao-invalida', 'versaoEsperada precisa ser contador inteiro não negativo.', 'Leia o item atual antes de tentar a transição.');
  }
}

function itemDa(campanha, alvo) {
  const chave = `${alvo?.tipo}:${alvo?.id}`;
  const item = campanha.itens.find((entrada) => entrada.chave === chave);
  if (!item) throw new ErroRepositorioRevalidacao('item-ausente', `o item '${chave}' não pertence à campanha.`, 'Use um alvo semântico derivado do impacto da campanha.');
  return item;
}

export async function registrarResultadoRevalidacao({
  raiz, identidade, resultado, versaoEsperada, pai = null, falhaInjetada, fs, telemetria,
} = {}) {
  const atual = await lerCampanhaRevalidacao(raiz, identidade, { fs });
  if (!atual) throw new ErroRepositorioRevalidacao('campanha-ausente', 'a campanha não existe.', 'Derive e persista a campanha antes de registrar resultado.');
  if (pai !== null && pai !== atual.revisao) throw new ErroRepositorioRevalidacao('revisao-desatualizada', 'a campanha mudou desde a revisão observada.', 'Leia a campanha atual e repita a operação.');
  const campanha = atual.campanha;
  const registro = registrarResultado(campanha.historicoResultados ?? [], resultado);
  if (registro.idempotente) return { idempotente: true, persistida: atual };
  const item = itemDa(campanha, resultado.item);
  if (resultado.revisaoValidada.revisao !== item.revisaoObservada.revisao
    || resultado.revisaoValidada.sha256 !== item.revisaoObservada.sha256) {
    throw new ErroRepositorioRevalidacao('revisao-desatualizada', 'o resultado não corresponde à revisão observada pelo item.', 'Releia o mapa e valide a revisão atual antes de registrar o resultado.');
  }
  versaoEsperadaValida(versaoEsperada);
  const emValidacao = item.estado === 'pendente'
    ? transicionarItem(item, {
      esperadoVersao: versaoEsperada,
      proximoEstado: 'em-validacao',
      revisaoAtual: resultado.revisaoValidada,
    })
    : item;
  const itemAtualizado = transicionarItem(emValidacao, {
    esperadoVersao: emValidacao.versao,
    proximoEstado: resultado.estado,
    revisaoAtual: resultado.revisaoValidada,
    resultado: {
      revisao: resultado.revisaoValidada.revisao,
      sha256: resultado.revisaoValidada.sha256,
    },
  });
  const novaCampanha = {
    ...campanha,
    itens: campanha.itens.map((entrada) => entrada.chave === itemAtualizado.chave ? itemAtualizado : entrada),
    historicoResultados: registro.historico,
  };
  const persistida = await persistirCampanhaRevalidacao({
    raiz, campanha: novaCampanha, pai: atual.revisao, falhaInjetada, fs, telemetria,
  });
  return { idempotente: false, persistida };
}

export async function obsoletarItemRevalidacao({
  raiz, identidade, item: alvo, revisaoAtual, versaoEsperada, pai = null, falhaInjetada, fs, telemetria,
} = {}) {
  const atual = await lerCampanhaRevalidacao(raiz, identidade, { fs });
  if (!atual) throw new ErroRepositorioRevalidacao('campanha-ausente', 'a campanha não existe.', 'Derive e persista a campanha antes de invalidar item.');
  if (pai !== null && pai !== atual.revisao) throw new ErroRepositorioRevalidacao('revisao-desatualizada', 'a campanha mudou desde a revisão observada.', 'Leia a campanha atual e repita a operação.');
  const campanha = atual.campanha;
  const itemAtual = itemDa(campanha, alvo);
  if (itemAtual.estado === 'obsoleto') return { idempotente: true, persistida: atual };
  versaoEsperadaValida(versaoEsperada);
  if (!revisaoAtual || revisaoAtual.revisao === itemAtual.revisaoObservada.revisao
    && revisaoAtual.sha256 === itemAtual.revisaoObservada.sha256) {
    throw new ErroRepositorioRevalidacao('revisao-nao-alterada', 'a revisão atual ainda é a mesma observada pelo item.', 'Só obsoleta o item depois de observar uma revisão diferente.');
  }
  const itemAtualizado = transicionarItem(itemAtual, {
    esperadoVersao: versaoEsperada,
    proximoEstado: 'obsoleto',
    revisaoAtual,
  });
  const novaCampanha = {
    ...campanha,
    itens: campanha.itens.map((entrada) => entrada.chave === itemAtualizado.chave ? itemAtualizado : entrada),
  };
  const persistida = await persistirCampanhaRevalidacao({
    raiz, campanha: novaCampanha, pai: atual.revisao, falhaInjetada, fs, telemetria,
  });
  return { idempotente: false, persistida };
}
