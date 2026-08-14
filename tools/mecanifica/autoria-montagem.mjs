/* autoria-montagem.mjs — planejamento e aplicação interna de montagens v1/v2/v3. */
import { lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { lerRevisaoAtivaAutoria, materializarRevisaoAutoria, planejarRevisaoAutoria } from './repositorio-autoria.mjs';

export const FORMATO_PLANO_AUTORIA_MONTAGEM = 'mecanifica.plano-autoria-montagem';
export const VERSAO_PLANO_AUTORIA_MONTAGEM = 1;
export const ARQUIVO_MONTAGEM = 'montagem.json';

export class ErroAutoriaMontagem extends Error {
  constructor(codigo, campo, mensagem, acao, causa) {
    super(`${campo}: ${mensagem}`);
    this.name = 'ErroAutoriaMontagem';
    this.codigo = codigo;
    this.campo = campo;
    this.acao = acao;
    if (causa !== undefined) this.causa = causa;
  }
}

const texto = (valor) => JSON.stringify(valor);
function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    return `{${Object.keys(valor).sort().map((chave) => `${JSON.stringify(chave)}:${canonico(valor[chave])}`).join(',')}}`;
  }
  return texto(valor);
}

function falhar(codigo, campo, mensagem, acao, causa) {
  throw new ErroAutoriaMontagem(codigo, campo, mensagem, acao, causa);
}

function bytesDaMontagem(montagem) {
  return `${canonico(montagem)}\n`;
}

function confirmarEsperado(plano) {
  return {
    formato: FORMATO_PLANO_AUTORIA_MONTAGEM,
    versao: VERSAO_PLANO_AUTORIA_MONTAGEM,
    entidade: plano.entidade,
    pai: plano.pai,
    objeto: plano.repositorio.objeto,
    commit: plano.repositorio.commit,
  };
}

function compararConfirmacao(observada, esperada) {
  return canonico(observada) === canonico(esperada);
}

function resumoDaAlteracao(pai, montagem) {
  return {
    operacao: pai === null ? 'criacao' : 'alteracao',
    montagem: montagem.id,
    versao: montagem.versao,
    relacoes: montagem.relacoes?.length ?? 0,
  };
}

function diagnosticarResolucao(erro) {
  return {
    codigo: erro?.codigo ?? 'candidato-invalido',
    campo: erro?.caminho ?? erro?.campo ?? '$montagem',
    mensagem: erro instanceof Error ? erro.message : String(erro),
    acao: 'Corrija a montagem e valide novamente antes de confirmar.',
  };
}

export function planejarAutoriaMontagem({ entidade, montagem, montagemBytes: bytesFornecidos, pai = null } = {}) {
  let validada;
  let montagemBytes;
  try {
    if (bytesFornecidos !== undefined) {
      if (typeof bytesFornecidos !== 'string' || bytesFornecidos.length === 0) {
        falhar('montagem-invalida', '$montagemBytes', 'precisa ser texto JSON não vazio.', 'Informe os bytes completos de uma montagem persistida.');
      }
      validada = lerMontagemPersistida(JSON.parse(bytesFornecidos));
      montagemBytes = bytesFornecidos;
    } else {
      validada = lerMontagemPersistida(montagem);
      montagemBytes = bytesDaMontagem(validada);
    }
  } catch (erro) {
    if (erro instanceof ErroAutoriaMontagem) throw erro;
    falhar('montagem-invalida', '$montagem', erro instanceof Error ? erro.message : String(erro), 'Corrija o documento v1/v2/v3 antes de planejar.', erro);
  }
  const repositorio = planejarRevisaoAutoria({ entidade, conteudo: { [ARQUIVO_MONTAGEM]: montagemBytes }, pai });
  return {
    formato: FORMATO_PLANO_AUTORIA_MONTAGEM,
    versao: VERSAO_PLANO_AUTORIA_MONTAGEM,
    entidade,
    pai,
    montagem: validada,
    montagemBytes,
    repositorio,
    resumo: resumoDaAlteracao(pai, validada),
  };
}

export function confirmarAutoriaMontagem(plano, confirmacao = confirmarEsperado(plano)) {
  const esperada = confirmarEsperado(plano);
  if (!compararConfirmacao(confirmacao, esperada)) {
    falhar('confirmacao-divergente', '$confirmacao', 'a confirmação não corresponde ao plano e aos bytes canônicos.', 'Releia o plano e confirme entidade, pai, objeto e commit sem alterações.');
  }
  return { ...plano, confirmacao: esperada };
}

export async function observarAutoriaMontagem({ raiz, entidade, fs } = {}) {
  const ativa = await lerRevisaoAtivaAutoria(raiz, entidade, { fs });
  if (!ativa) return { revisao: null, objeto: null, montagem: null };
  const bytes = ativa.conteudo?.[ARQUIVO_MONTAGEM];
  if (typeof bytes !== 'string') {
    falhar('snapshot-invalido', 'conteudo', `a revisão ativa não contém ${ARQUIVO_MONTAGEM}.`, 'Preserve a revisão e recupere um snapshot de montagem válido.');
  }
  let montagem;
  try { montagem = lerMontagemPersistida(JSON.parse(bytes)); } catch (erro) {
    falhar('snapshot-invalido', ARQUIVO_MONTAGEM, erro instanceof Error ? erro.message : String(erro), 'Preserve a revisão e recupere um snapshot de montagem válido.', erro);
  }
  return { revisao: ativa.commit, objeto: ativa.objeto, montagem };
}

export async function validarAutoriaMontagem(plano, { carregarPeca, carregarMontagem } = {}) {
  const recomputado = planejarAutoriaMontagem({ entidade: plano?.entidade, montagem: plano?.montagem, montagemBytes: plano?.montagemBytes, pai: plano?.pai });
  if (recomputado.repositorio.commit !== plano?.repositorio?.commit
    || recomputado.repositorio.objeto !== plano?.repositorio?.objeto
    || recomputado.montagemBytes !== plano?.montagemBytes) {
    falhar('plano-divergente', '$plano', 'o plano não corresponde aos bytes canônicos da montagem.', 'Planeje novamente e confirme o plano intacto.');
  }
  try {
    const resolvida = await resolverMontagemPersistida(plano.montagem, { carregarPeca, carregarMontagem });
    return { estado: 'validado', montagem: plano.montagem, resolvida, resumo: plano.resumo };
  } catch (erro) {
    const diagnostico = diagnosticarResolucao(erro);
    falhar('candidato-invalido', diagnostico.campo, diagnostico.mensagem, diagnostico.acao, erro);
  }
}

export async function materializarAutoriaMontagem({ raiz, plano, confirmacao, carregarPeca, carregarMontagem, falhaInjetada, fs, telemetria } = {}) {
  const confirmado = confirmarAutoriaMontagem(plano, confirmacao ?? plano?.confirmacao);
  const validacao = await validarAutoriaMontagem(confirmado, { carregarPeca, carregarMontagem });
  const resultado = await materializarRevisaoAutoria({
    raiz,
    plano: confirmado.repositorio,
    falhaInjetada,
    fs,
    telemetria,
  });
  return { ...resultado, validacao: { estado: validacao.estado, resumo: validacao.resumo } };
}
