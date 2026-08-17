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
    alcance: {
      raizesAfetadas: copiar(impacto.raizesAfetadas ?? []),
      raizesNaoAfetadas: copiar(impacto.raizesNaoAfetadas ?? []),
    },
    historicoResultados: [],
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

function identidadeValida(identidade, caminho = 'identidade') {
  const causa = alvoValido(identidade?.causa, `${caminho}.causa`);
  if ((identidade.causa.revisao !== null && typeof identidade.causa.revisao !== 'string')
    || typeof identidade.causa.sha256 !== 'string' || !identidade.causa.sha256) {
    falhar('identidade-invalida', `${caminho}.causa`, 'revisão e hash da causa precisam estar completos.');
  }
  if (identidade.universo !== null && typeof identidade.universo !== 'string') {
    falhar('identidade-invalida', `${caminho}.universo`, 'universo precisa ser texto ou null.');
  }
  if (typeof identidade.mapaSha256 !== 'string' || !identidade.mapaSha256) {
    falhar('identidade-invalida', `${caminho}.mapaSha256`, 'hash canônico do mapa é obrigatório.');
  }
  return { ...causa, revisao: identidade.causa.revisao ?? null, sha256: identidade.causa.sha256 };
}

/** Valida bytes relidos antes de entregá-los a um consumidor ou repositório. */
export function validarCampanhaRevalidacao(campanha) {
  if (!campanha || campanha.formato !== FORMATO_CAMPANHA || campanha.versao !== VERSAO) {
    falhar('campanha-invalida', 'campanha', 'o contrato exige campanha-revalidacao v1.');
  }
  if (!campanha.identidade || typeof campanha.chave !== 'string') {
    falhar('campanha-invalida', 'campanha', 'identidade e chave são obrigatórias.');
  }
  identidadeValida(campanha.identidade);
  if (campanha.chave !== serializarCanonico(campanha.identidade)) {
    falhar('identidade-divergente', 'campanha.chave', 'a chave não corresponde à identidade canônica.');
  }
  if (serializarCanonico(campanha.causa) !== serializarCanonico(campanha.identidade.causa)) {
    falhar('identidade-divergente', 'campanha.causa', 'causa e identidade precisam ser iguais.');
  }
  if (!Array.isArray(campanha.itens)) falhar('campanha-invalida', 'campanha.itens', 'itens precisa ser lista.');
  const vistos = new Set();
  for (const [indice, item] of campanha.itens.entries()) {
    const validado = validarItem(item);
    if (vistos.has(validado.chave)) falhar('item-duplicado', `campanha.itens[${indice}]`, `o item '${validado.chave}' aparece mais de uma vez.`);
    vistos.add(validado.chave);
  }
  if (!campanha.cobertura || typeof campanha.cobertura !== 'object' || Array.isArray(campanha.cobertura)) {
    falhar('campanha-invalida', 'campanha.cobertura', 'cobertura precisa ser objeto.');
  }
  if (campanha.alcance !== undefined) {
    for (const campo of ['raizesAfetadas', 'raizesNaoAfetadas']) {
      if (!Array.isArray(campanha.alcance[campo]) || campanha.alcance[campo].some((id) => typeof id !== 'string' || !id)) {
        falhar('alcance-invalido', `campanha.alcance.${campo}`, 'raízes precisam ser IDs semânticos.');
      }
    }
    const afetadas = new Set(campanha.alcance.raizesAfetadas);
    if (afetadas.size !== campanha.alcance.raizesAfetadas.length
      || campanha.alcance.raizesNaoAfetadas.some((id) => afetadas.has(id))) {
      falhar('alcance-invalido', 'campanha.alcance', 'raízes não podem ser duplicadas ou afetadas e não afetadas ao mesmo tempo.');
    }
  }
  return copiar(campanha);
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
  if (resultado.estado !== 'aprovado' && resultado.estado !== 'reprovado') {
    falhar('estado-resultado-invalido', 'resultado.estado', 'um resultado final precisa ser aprovado ou reprovado.');
  }
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
