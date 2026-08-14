/* protocolo-revalidacao.js — contrato puro da R00, sem persistência ou efeitos. */

import { serializarCanonico } from './snapshot-universo-autoria.js';

export const FORMATO_CAMPANHA = 'mecanifica.campanha-revalidacao';
export const FORMATO_RESULTADO = 'mecanifica.resultado-revalidacao';
export const VERSAO = 1;

const ESTADOS = Object.freeze(['pendente', 'em-validacao', 'aprovado', 'reprovado', 'obsoleto']);
const TIPOS = Object.freeze(['peca', 'montagem']);

export class ErroContratoRevalidacao extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroContratoRevalidacao';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const chaveAlvo = (alvo) => `${alvo.tipo}:${alvo.id}`;

function falhar(codigo, caminho, mensagem) {
  throw new ErroContratoRevalidacao(codigo, caminho, mensagem);
}

function alvoValido(alvo, caminho) {
  if (!alvo || !TIPOS.includes(alvo.tipo) || typeof alvo.id !== 'string' || !alvo.id) {
    falhar('alvo-invalido', caminho, 'informe tipo peca ou montagem e um ID semântico.');
  }
  return { tipo: alvo.tipo, id: alvo.id };
}

function provenienciaValida(valor, caminho) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)
    || (valor.fonte !== 'base-estatica' && valor.fonte !== 'revisao-ativa')
    || (valor.revisao !== null && typeof valor.revisao !== 'string')
    || typeof valor.sha256 !== 'string' || !valor.sha256) {
    falhar('proveniencia-invalida', caminho, 'fonte, revisão e hash precisam estar completos.');
  }
  return { fonte: valor.fonte, revisao: valor.revisao ?? null, sha256: valor.sha256 };
}

function validarMapaEImpacto(mapa, impacto, mapaSha256) {
  if (!mapa || mapa.formato !== 'mecanifica.mapa-dependencias' || mapa.versao !== 1) {
    falhar('mapa-invalido', 'mapa', 'o contrato exige mapa-dependencias v1.');
  }
  if (mapa.cobertura?.completa !== true) falhar('cobertura-incompleta', 'mapa.cobertura', 'o mapa precisa declarar cobertura completa.');
  if (!impacto || impacto.formato !== 'mecanifica.impacto-global' || impacto.versao !== 1) {
    falhar('impacto-invalido', 'impacto', 'o contrato exige impacto-global v1.');
  }
  if (impacto.cobertura?.completa !== true) falhar('cobertura-incompleta', 'impacto.cobertura', 'o impacto precisa declarar cobertura completa.');
  if (typeof mapaSha256 !== 'string' || !mapaSha256) falhar('hash-ausente', 'mapaSha256', 'o snapshot precisa carregar o hash canônico do mapa.');
  if (impacto.cobertura.universo !== (mapa.universo?.id ?? null)) {
    falhar('snapshot-incoerente', 'impacto.cobertura.universo', 'impacto e mapa precisam apontar para o mesmo universo.');
  }
  if (!Array.isArray(mapa.entidades)) falhar('mapa-invalido', 'mapa.entidades', 'entidades precisa ser lista.');
  if (!Array.isArray(impacto.roteiroRevalidacao)) falhar('impacto-invalido', 'impacto.roteiroRevalidacao', 'roteiroRevalidacao precisa ser lista.');
}

function entidadeDo(mapa, alvo, caminho) {
  const entidade = mapa.entidades.find((item) => item.tipo === alvo.tipo && item.id === alvo.id);
  if (!entidade) falhar('alvo-ausente', caminho, `a entidade '${chaveAlvo(alvo)}' não está no snapshot.`);
  return entidade;
}

function validarCausa(mapa, impacto, causa) {
  const alvo = alvoValido(causa, 'causa');
  const entidade = entidadeDo(mapa, alvo, 'causa');
  const observada = provenienciaValida(entidade.proveniencia, `mapa.${chaveAlvo(alvo)}.proveniencia`);
  if (causa.revisao !== observada.revisao || causa.sha256 !== observada.sha256) {
    falhar('causa-desatualizada', 'causa', 'a revisão causadora precisa ser exatamente a observada no mapa.');
  }
  if (impacto.alvo?.tipo !== alvo.tipo || impacto.alvo?.id !== alvo.id) {
    falhar('causa-divergente', 'impacto.alvo', 'o impacto precisa ter a mesma causa semântica.');
  }
  return { tipo: alvo.tipo, id: alvo.id, revisao: observada.revisao, sha256: observada.sha256 };
}

function validarRoteiro(mapa, impacto) {
  const vistos = new Set();
  return impacto.roteiroRevalidacao.map((roteiro, indice) => {
    const alvo = alvoValido(roteiro, `impacto.roteiroRevalidacao[${indice}]`);
    if (alvo.tipo !== 'montagem') falhar('item-invalido', `impacto.roteiroRevalidacao[${indice}]`, 'um item de campanha precisa ser montagem.');
    const chave = chaveAlvo(alvo);
    if (vistos.has(chave)) falhar('item-duplicado', `impacto.roteiroRevalidacao[${indice}]`, `o item '${chave}' aparece mais de uma vez.`);
    vistos.add(chave);
    const entidade = entidadeDo(mapa, alvo, `impacto.roteiroRevalidacao[${indice}]`);
    return {
      ordem: Number.isSafeInteger(roteiro.ordem) && roteiro.ordem > 0 ? roteiro.ordem : indice + 1,
      alvo,
      revisaoObservada: provenienciaValida(entidade.proveniencia, `mapa.${chave}.proveniencia`),
      caminhos: copiar(roteiro.caminhos ?? []),
    };
  }).sort((a, b) => a.ordem - b.ordem || chaveAlvo(a.alvo).localeCompare(chaveAlvo(b.alvo)));
}

/**
 * Deriva a campanha inteira em memória. A chave não contém UUID, relógio ou
 * posição; o índice `ordem` é apenas execução derivada, nunca identidade.
 */
export function criarCampanhaRevalidacao({ mapa, impacto, causa, mapaSha256 } = {}) {
  validarMapaEImpacto(mapa, impacto, mapaSha256);
  const causaObservada = validarCausa(mapa, impacto, causa);
  const roteiro = validarRoteiro(mapa, impacto);
  const identidade = {
    causa: causaObservada,
    universo: mapa.universo?.id ?? null,
    mapaSha256,
  };
  const itens = roteiro.map(({ ordem, alvo, revisaoObservada, caminhos }) => ({
    chave: chaveAlvo(alvo),
    ordem,
    alvo,
    revisaoObservada,
    estado: 'pendente',
    versao: 0,
    caminhos,
  }));
  return {
    formato: FORMATO_CAMPANHA,
    versao: VERSAO,
    chave: serializarCanonico(identidade),
    identidade: copiar(identidade),
    causa: copiar(causaObservada),
    itens,
    cobertura: copiar(impacto.cobertura),
  };
}

function validarItem(item) {
  const alvo = alvoValido(item?.alvo, 'item.alvo');
  if (item.chave !== chaveAlvo(alvo)) falhar('identidade-divergente', 'item.chave', 'a chave precisa ser derivada do alvo semântico.');
  if (!ESTADOS.includes(item.estado)) falhar('estado-invalido', 'item.estado', `use um estado de ${ESTADOS.join(', ')}.`);
  if (!Number.isSafeInteger(item.versao) || item.versao < 0) falhar('versao-invalida', 'item.versao', 'versao precisa ser contador inteiro não negativo.');
  const revisao = provenienciaValida(item.revisaoObservada, 'item.revisaoObservada');
  return { ...item, alvo, revisaoObservada: revisao };
}

const transicoes = Object.freeze({
  pendente: ['em-validacao', 'obsoleto'],
  'em-validacao': ['aprovado', 'reprovado', 'obsoleto'],
  aprovado: ['obsoleto'],
  reprovado: ['obsoleto'],
  obsoleto: [],
});

/** Aplica uma transição com comparação-e-troca explícita; não muta o item. */
export function transicionarItem(item, { esperadoVersao, proximoEstado, revisaoAtual, resultado = null } = {}) {
  const atual = validarItem(item);
  if (esperadoVersao !== atual.versao) falhar('conflito-concorrencia', 'esperadoVersao', 'o item mudou; releia a campanha antes de tentar novamente.');
  if (!ESTADOS.includes(proximoEstado) || !transicoes[atual.estado].includes(proximoEstado)) {
    falhar('transicao-invalida', 'proximoEstado', `não é permitido sair de '${atual.estado}' para '${proximoEstado}'.`);
  }
  if (revisaoAtual !== undefined && (revisaoAtual.revisao !== atual.revisaoObservada.revisao
    || revisaoAtual.sha256 !== atual.revisaoObservada.sha256) && proximoEstado !== 'obsoleto') {
    falhar('revisao-desatualizada', 'revisaoAtual', 'a validação não pode concluir sobre uma revisão diferente da observada.');
  }
  if ((proximoEstado === 'aprovado' || proximoEstado === 'reprovado')
    && (!resultado || resultado.revisao !== atual.revisaoObservada.revisao || resultado.sha256 !== atual.revisaoObservada.sha256)) {
    falhar('resultado-sem-vinculo', 'resultado', 'resultado final precisa vincular a revisão exata observada.');
  }
  return {
    ...copiar(atual),
    estado: proximoEstado,
    versao: atual.versao + 1,
    ...(resultado ? { ultimoResultado: copiar(resultado) } : {}),
  };
}

/** Registra um fato sem duplicar repetição idêntica nem sobrescrever conflito. */
export function registrarResultado(historico, resultado) {
  if (!Array.isArray(historico)) falhar('historico-invalido', 'historico', 'histórico precisa ser lista.');
  if (!resultado || resultado.formato !== FORMATO_RESULTADO || resultado.versao !== VERSAO) {
    falhar('resultado-invalido', 'resultado', 'resultado-revalidacao v1 é obrigatório.');
  }
  const item = alvoValido(resultado.item, 'resultado.item');
  const revisao = provenienciaValida(resultado.revisaoValidada, 'resultado.revisaoValidada');
  const fato = {
    formato: FORMATO_RESULTADO,
    versao: VERSAO,
    chave: `${chaveAlvo(item)}|${serializarCanonico(revisao)}`,
    item,
    revisaoValidada: revisao,
    estado: resultado.estado,
    gates: copiar(resultado.gates ?? []),
    diagnostico: copiar(resultado.diagnostico ?? null),
  };
  const existente = historico.find((entrada) => entrada.chave === fato.chave);
  if (existente) {
    if (serializarCanonico(existente) !== serializarCanonico(fato)) falhar('resultado-conflitante', 'resultado', 'a mesma revisão já possui outro resultado; preserve ambos para auditoria.');
    return { historico: copiar(historico), idempotente: true };
  }
  return { historico: [...copiar(historico), fato], idempotente: false };
}

export const estadosRevalidacao = ESTADOS;
