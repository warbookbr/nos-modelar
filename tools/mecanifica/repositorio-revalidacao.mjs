/* repositorio-revalidacao.mjs — persistência R01 sobre o repositório transacional existente. */

import { createHash } from 'node:crypto';
import {
  lerRevisaoAtivaAutoria,
  materializarRevisaoAutoria,
  planejarRevisaoAutoria,
} from './repositorio-autoria.mjs';
import {
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
