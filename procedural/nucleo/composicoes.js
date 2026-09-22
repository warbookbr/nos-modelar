/* composicoes.js — subgrafos procedurais declarativos, sem estado global ou I/O. */
export const FORMATO_COMPOSICAO_PROCEDURAL = 'mecanifica.composicao-procedural@1';
const FORMATO_EXPANSAO = 'mecanifica.expansao-composicao@1';
const VERSAO = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const NO = /^[a-z][a-z0-9-]*$/;
const OPERACAO = /^[A-Za-z][A-Za-z0-9-]*$/;
const CAMPO = /^[a-z][A-Za-z0-9]*$/;
const TIPOS = new Set(['numero', 'inteiro', 'texto', 'vetor3']);

export class ErroComposicaoProcedural extends Error {
  constructor(mensagem) { super(`composição procedural: ${mensagem}`); this.name = 'ErroComposicaoProcedural'; }
}

function comparar(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function plano(valor) { return valor && typeof valor === 'object' && !Array.isArray(valor); }
function copia(valor) { return JSON.parse(JSON.stringify(valor)); }
function texto(valor, onde, padrao = ID) {
  if (typeof valor !== 'string' || !padrao.test(valor)) throw new ErroComposicaoProcedural(`${onde} exige identificador semântico`);
  return valor;
}
function versao(valor, onde) {
  if (typeof valor !== 'string' || !VERSAO.test(valor)) throw new ErroComposicaoProcedural(`${onde} exige versão semântica x.y.z`);
  return valor;
}
function dadoDeclarativo(valor, onde) {
  if (valor == null || ['string', 'boolean'].includes(typeof valor)) return;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new ErroComposicaoProcedural(`${onde} não aceita número não-finito`);
    return;
  }
  if (Array.isArray(valor)) { valor.forEach((item, indice) => dadoDeclarativo(item, `${onde}[${indice}]`)); return; }
  if (!plano(valor)) throw new ErroComposicaoProcedural(`${onde} precisa ser dado declarativo`);
  for (const [chave, item] of Object.entries(valor)) dadoDeclarativo(item, `${onde}.${chave}`);
}
function artefatos(valor, onde) {
  if (!plano(valor) || Object.keys(valor).some((chave) => !['entra', 'sai'].includes(chave)) || !Array.isArray(valor.entra) || !Array.isArray(valor.sai)) {
    throw new ErroComposicaoProcedural(`${onde} exige artefatos {entra, sai}`);
  }
  const normalizar = (itens, lado) => {
    const unicos = new Set();
    for (const item of itens) {
      if (typeof item !== 'string' || !item.trim()) throw new ErroComposicaoProcedural(`${onde}.${lado} exige tipo de artefato`);
      if (unicos.has(item)) throw new ErroComposicaoProcedural(`${onde}.${lado} repete '${item}'`);
      unicos.add(item);
    }
    return [...unicos].sort(comparar);
  };
  const resultado = { entra: normalizar(valor.entra, 'entra'), sai: normalizar(valor.sai, 'sai') };
  if (!resultado.sai.length) throw new ErroComposicaoProcedural(`${onde}.sai não pode ser vazio`);
  return resultado;
}
function valorDoTipo(tipo, valor, onde) {
  if (tipo === 'numero' && (!Number.isFinite(valor))) throw new ErroComposicaoProcedural(`${onde} exige número finito`);
  if (tipo === 'inteiro' && (!Number.isInteger(valor))) throw new ErroComposicaoProcedural(`${onde} exige inteiro`);
  if (tipo === 'texto' && (typeof valor !== 'string')) throw new ErroComposicaoProcedural(`${onde} exige texto`);
  if (tipo === 'vetor3' && (!Array.isArray(valor) || valor.length !== 3 || valor.some((item) => !Number.isFinite(item)))) throw new ErroComposicaoProcedural(`${onde} exige vetor3 finito`);
}
function parametros(valor, onde) {
  if (!plano(valor)) throw new ErroComposicaoProcedural(`${onde} exige objeto de parâmetros`);
  const resultado = {};
  for (const [nome, definicao] of Object.entries(valor)) {
    texto(nome, `${onde}.${nome}`, CAMPO);
    if (!plano(definicao) || Object.keys(definicao).some((chave) => !['tipo', 'padrao'].includes(chave)) || !TIPOS.has(definicao.tipo)) {
      throw new ErroComposicaoProcedural(`${onde}.${nome} exige tipo conhecido e, opcionalmente, padrao`);
    }
    if (Object.hasOwn(definicao, 'padrao')) { dadoDeclarativo(definicao.padrao, `${onde}.${nome}.padrao`); valorDoTipo(definicao.tipo, definicao.padrao, `${onde}.${nome}.padrao`); }
    resultado[nome] = Object.hasOwn(definicao, 'padrao') ? { tipo: definicao.tipo, padrao: copia(definicao.padrao) } : { tipo: definicao.tipo };
  }
  return resultado;
}
function referenciaDeParametro(valor) { return plano(valor) && Object.keys(valor).length === 1 && typeof valor.parametro === 'string'; }
function validarReferencias(valor, parametrosDaComposicao, onde) {
  if (referenciaDeParametro(valor)) {
    if (!Object.hasOwn(parametrosDaComposicao, valor.parametro)) throw new ErroComposicaoProcedural(`${onde} cita parâmetro ausente '${valor.parametro}'`);
    return;
  }
  if (Array.isArray(valor)) { valor.forEach((item, indice) => validarReferencias(item, parametrosDaComposicao, `${onde}[${indice}]`)); return; }
  if (plano(valor)) for (const [chave, item] of Object.entries(valor)) validarReferencias(item, parametrosDaComposicao, `${onde}.${chave}`);
}
function normalizarNos(valor, composicao) {
  if (!Array.isArray(valor) || !valor.length) throw new ErroComposicaoProcedural(`composição '${composicao.id}' exige nós`);
  const ids = new Set();
  return valor.map((no, indice) => {
    const onde = `composição '${composicao.id}', nó ${indice}`;
    if (!plano(no) || !texto(no.id, `${onde}.id`, NO) || ids.has(no.id)) throw new ErroComposicaoProcedural(`${onde} tem id ausente ou duplicado`);
    ids.add(no.id);
    const alvos = Number(Object.hasOwn(no, 'operacao')) + Number(Object.hasOwn(no, 'composicao'));
    if (alvos !== 1 || !plano(no.argumentos ?? {})) throw new ErroComposicaoProcedural(`${onde} exige exatamente operacao ou composicao e argumentos objeto`);
    dadoDeclarativo(no.argumentos ?? {}, `${onde}.argumentos`);
    validarReferencias(no.argumentos ?? {}, composicao.parametros, `${onde}.argumentos`);
    if (no.operacao) return { id: no.id, operacao: texto(no.operacao, `${onde}.operacao`, OPERACAO), argumentos: copia(no.argumentos ?? {}) };
    return { id: no.id, composicao: texto(no.composicao, `${onde}.composicao`), argumentos: copia(no.argumentos ?? {}) };
  });
}
function assinaturaDas(composicoes) {
  return JSON.stringify({ formato: FORMATO_COMPOSICAO_PROCEDURAL, composicoes: composicoes.map(({ id, versao: v, parametros: p, artefatos: a, nos }) => ({ id, versao: v, parametros: p, artefatos: a, nos })) });
}

/* Registro explícito: nenhuma composição surge por import ou mutação global. */
export function criarRegistroComposicoes({ composicoes, resolverOperacao } = {}) {
  if (!Array.isArray(composicoes) || !composicoes.length) throw new ErroComposicaoProcedural('configuração exige composição(ões) explícita(s)');
  if (typeof resolverOperacao !== 'function') throw new ErroComposicaoProcedural('configuração exige resolvedor explícito de operações');
  const porId = new Map();
  for (const recebida of composicoes) {
    if (!plano(recebida) || recebida.formato !== FORMATO_COMPOSICAO_PROCEDURAL) throw new ErroComposicaoProcedural('composição exige formato mecanifica.composicao-procedural@1');
    const id = texto(recebida.id, 'composição.id');
    if (porId.has(id)) throw new ErroComposicaoProcedural(`composição duplicada '${id}'`);
    const composicao = { formato: FORMATO_COMPOSICAO_PROCEDURAL, id, versao: versao(recebida.versao, `composição '${id}'`), parametros: parametros(recebida.parametros ?? {}, `composição '${id}'.parametros`), artefatos: artefatos(recebida.artefatos, `composição '${id}'`) };
    composicao.nos = normalizarNos(recebida.nos, composicao);
    porId.set(id, composicao);
  }
  const visitar = (id, pilha = []) => {
    if (pilha.includes(id)) throw new ErroComposicaoProcedural(`ciclo de composições: ${[...pilha, id].join(' -> ')}`);
    const composicao = porId.get(id);
    for (const no of composicao.nos) if (no.composicao) {
      if (!porId.has(no.composicao)) throw new ErroComposicaoProcedural(`composição '${id}', nó '${no.id}' cita composição ausente '${no.composicao}'`);
      visitar(no.composicao, [...pilha, id]);
    }
  };
  for (const id of porId.keys()) visitar(id);
  const interfaceDoNo = (no, composicao) => {
    if (no.composicao) return porId.get(no.composicao).artefatos;
    const operacao = resolverOperacao(no.operacao);
    if (!operacao || !operacao.artefatos) throw new ErroComposicaoProcedural(`composição '${composicao.id}', nó '${no.id}' cita operação ausente '${no.operacao}'`);
    return artefatos(operacao.artefatos, `operação '${no.operacao}'`);
  };
  for (const composicao of porId.values()) {
    const disponiveis = new Set(composicao.artefatos.entra);
    for (const no of composicao.nos) {
      const contrato = interfaceDoNo(no, composicao);
      const ausentes = contrato.entra.filter((tipo) => !disponiveis.has(tipo));
      if (ausentes.length) throw new ErroComposicaoProcedural(`composição '${composicao.id}', nó '${no.id}' exige artefato(s) indisponível(is): ${ausentes.join(', ')}`);
      contrato.sai.forEach((tipo) => disponiveis.add(tipo));
    }
    const naoProduzidos = composicao.artefatos.sai.filter((tipo) => !disponiveis.has(tipo));
    if (naoProduzidos.length) throw new ErroComposicaoProcedural(`composição '${composicao.id}' declara saída não produzida: ${naoProduzidos.join(', ')}`);
  }
  const manifesto = [...porId.values()].map((composicao) => copia(composicao)).sort((a, b) => comparar(a.id, b.id));
  return Object.freeze({
    formato: FORMATO_COMPOSICAO_PROCEDURAL, assinatura: assinaturaDas(manifesto), manifesto: Object.freeze(manifesto),
    resolver(id, versaoDesejada = null) { const encontrada = porId.get(id) ?? null; return encontrada && (versaoDesejada == null || encontrada.versao === versaoDesejada) ? copia(encontrada) : null; },
    listar() { return Object.freeze(manifesto.map(copia)); },
  });
}

function valoresDosParametros(composicao, argumentos, onde) {
  if (!plano(argumentos)) throw new ErroComposicaoProcedural(`${onde} exige argumentos objeto`);
  for (const chave of Object.keys(argumentos)) if (!Object.hasOwn(composicao.parametros, chave)) throw new ErroComposicaoProcedural(`${onde} recebeu parâmetro desconhecido '${chave}'`);
  const valores = {};
  for (const [nome, definicao] of Object.entries(composicao.parametros)) {
    const temValor = Object.hasOwn(argumentos, nome);
    if (!temValor && !Object.hasOwn(definicao, 'padrao')) throw new ErroComposicaoProcedural(`${onde} exige parâmetro '${nome}'`);
    const valor = temValor ? argumentos[nome] : definicao.padrao;
    dadoDeclarativo(valor, `${onde}.${nome}`); valorDoTipo(definicao.tipo, valor, `${onde}.${nome}`);
    valores[nome] = copia(valor);
  }
  return valores;
}
function substituirParametros(valor, valores, onde) {
  if (referenciaDeParametro(valor)) {
    if (!Object.hasOwn(valores, valor.parametro)) throw new ErroComposicaoProcedural(`${onde} cita parâmetro não resolvido '${valor.parametro}'`);
    return copia(valores[valor.parametro]);
  }
  if (Array.isArray(valor)) return valor.map((item, indice) => substituirParametros(item, valores, `${onde}[${indice}]`));
  if (plano(valor)) return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, substituirParametros(item, valores, `${onde}.${chave}`)]));
  return valor;
}
function orcamento(valor = {}) {
  if (!plano(valor)) throw new ErroComposicaoProcedural('orçamento precisa ser objeto');
  const maxPassos = valor.maxPassos ?? 2048, maxProfundidade = valor.maxProfundidade ?? 32;
  if (!Number.isInteger(maxPassos) || maxPassos < 1 || !Number.isInteger(maxProfundidade) || maxProfundidade < 1) throw new ErroComposicaoProcedural('orçamento exige maxPassos e maxProfundidade inteiros positivos');
  return { maxPassos, maxProfundidade };
}

/* Expansão é atômica: em erro, não há retorno parcial. Identidade é escolhida
   pela chamada externa via parâmetros; o motor não cria UUID nem renumera ids. */
export function expandirComposicao(registro, id, argumentos = {}, opcoes = {}) {
  if (!registro || registro.formato !== FORMATO_COMPOSICAO_PROCEDURAL || typeof registro.resolver !== 'function') throw new ErroComposicaoProcedural('expansão exige registro de composições');
  const limites = orcamento(opcoes.orcamento);
  const passos = [], proveniencia = [];
  const expandir = (composicaoId, entrada, caminho, profundidade) => {
    if (profundidade > limites.maxProfundidade) throw new ErroComposicaoProcedural(`orçamento excedido: profundidade máxima ${limites.maxProfundidade}`);
    const composicao = registro.resolver(composicaoId);
    if (!composicao) throw new ErroComposicaoProcedural(`composição ausente '${composicaoId}'`);
    const valores = valoresDosParametros(composicao, entrada, `chamada '${caminho}'`);
    for (const no of composicao.nos) {
      const caminhoDoNo = `${caminho}/${no.id}`;
      const args = substituirParametros(no.argumentos, valores, caminhoDoNo);
      if (no.composicao) { expandir(no.composicao, args, caminhoDoNo, profundidade + 1); continue; }
      if (passos.length >= limites.maxPassos) throw new ErroComposicaoProcedural(`orçamento excedido: máximo de ${limites.maxPassos} passos`);
      passos.push([no.operacao, args]);
      proveniencia.push({ passo: passos.length - 1, caminho: caminhoDoNo, composicao: composicao.id, no: no.id, operacao: no.operacao });
    }
  };
  expandir(id, argumentos, id, 1);
  return { formato: FORMATO_EXPANSAO, composicao: id, passos, procedencia: { formato: 'mecanifica.procedencia-composicao@1', nos: proveniencia } };
}

export function expandirChamadasDeComposicao(registro, chamadas, opcoes = {}) {
  if (!Array.isArray(chamadas) || !chamadas.length) throw new ErroComposicaoProcedural('receita exige chamada(s) de composição');
  const limites = orcamento(opcoes.orcamento), passos = [], nos = [];
  const ids = new Set();
  for (const chamada of chamadas) {
    if (!plano(chamada) || !texto(chamada.id, 'chamada.id', NO) || ids.has(chamada.id) || !texto(chamada.composicao, `chamada '${chamada.id}'.composicao`) || !plano(chamada.argumentos ?? {})) throw new ErroComposicaoProcedural('chamada de composição inválida ou duplicada');
    ids.add(chamada.id);
    const restante = limites.maxPassos - passos.length;
    const expansao = expandirComposicao(registro, chamada.composicao, chamada.argumentos ?? {}, { orcamento: { maxPassos: restante, maxProfundidade: limites.maxProfundidade } });
    for (const [operacao, args] of expansao.passos) passos.push([operacao, args]);
    nos.push(...expansao.procedencia.nos.map((no) => ({ ...no, passo: no.passo + passos.length - expansao.passos.length, caminho: `receita:${chamada.id}/${no.caminho}` })));
  }
  return { formato: FORMATO_EXPANSAO, chamadas: chamadas.map(({ id: chamadaId, composicao }) => ({ id: chamadaId, composicao })), passos, procedencia: { formato: 'mecanifica.procedencia-composicao@1', nos } };
}

export { FORMATO_EXPANSAO };
