/* ler-montagem-persistida.js — leitor/validador fail-closed da montagem v1/v2/v3. */

import { identidadeTransformacaoRigida, validarTransformacaoRigida } from './transformacao-rigida.js';

export const FORMATO = 'mecanifica.montagem';
export const VERSAO = 1;
export const VERSAO_RELACOES = 2;
export const VERSAO_ATUAL = 3;
export const VERSAO_AUDITORIA_INTERSECOES = 4;
export const VERSOES_SUPORTADAS = Object.freeze([VERSAO, VERSAO_RELACOES, VERSAO_ATUAL, VERSAO_AUDITORIA_INTERSECOES]);

export class ErroMontagemPersistida extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroMontagemPersistida';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const ehObjetoSimples = (valor) => valor !== null
  && typeof valor === 'object'
  && !Array.isArray(valor)
  && (Object.getPrototypeOf(valor) === Object.prototype || Object.getPrototypeOf(valor) === null);

function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function falhar(codigo, caminho, mensagem) {
  throw new ErroMontagemPersistida(codigo, caminho, mensagem);
}

function chavesExatas(valor, permitidas, caminho) {
  const extras = Object.keys(valor).filter((chave) => !permitidas.includes(chave));
  if (extras.length) falhar('chave-desconhecida', caminho, `chave(s) desconhecida(s): ${extras.sort().join(', ')}.`);
}

function textoNaoVazio(valor, codigo, caminho) {
  if (typeof valor !== 'string' || !valor) falhar(codigo, caminho, 'precisa ser texto não vazio.');
  return valor;
}

function numeroFinitoNaoNegativo(valor, caminho) {
  if (!Number.isFinite(valor) || valor < 0) {
    falhar('especificacao-invalida', caminho, 'precisa ser número finito >= 0.');
  }
  return Object.is(valor, -0) ? 0 : valor;
}

function lerPose(valor, caminho) {
  if (valor === undefined) {
    const identidade = identidadeTransformacaoRigida();
    return { rotacao: identidade.rotacao, deslocamento: identidade.deslocamento };
  }
  if (!ehObjetoSimples(valor)) falhar('pose-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['rotacao', 'deslocamento'], caminho);
  try {
    const pose = validarTransformacaoRigida(valor, caminho, { aceitarEscala: false });
    return { rotacao: pose.rotacao, deslocamento: pose.deslocamento };
  } catch (erro) {
    falhar('pose-invalida', caminho, erro instanceof Error ? erro.message : String(erro));
  }
}

function lerInstancia(valor, indice) {
  const caminho = `instancias[${indice}]`;
  if (!ehObjetoSimples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['id', 'alvo', 'pose'], caminho);
  const id = textoNaoVazio(valor.id, 'id-invalido', `${caminho}.id`);
  if (!ehObjetoSimples(valor.alvo)) falhar('alvo-invalido', `${caminho}.alvo`, 'precisa ser objeto simples.');
  chavesExatas(valor.alvo, ['tipo', 'ref'], `${caminho}.alvo`);
  if (valor.alvo.tipo !== 'peca' && valor.alvo.tipo !== 'montagem') {
    falhar('tipo-alvo-nao-suportado', `${caminho}.alvo.tipo`, 'aceita somente peca ou montagem.');
  }
  const ref = textoNaoVazio(valor.alvo.ref, 'alvo-invalido', `${caminho}.alvo.ref`);
  return {
    id,
    alvo: { tipo: valor.alvo.tipo, ref },
    pose: lerPose(valor.pose, `${caminho}.pose`),
  };
}

function lerEndpoint(valor, caminho) {
  if (!ehObjetoSimples(valor)) falhar('endpoint-invalido', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['caminho', 'porta'], caminho);
  if (!Array.isArray(valor.caminho) || valor.caminho.length === 0) {
    falhar('endpoint-invalido', `${caminho}.caminho`, 'precisa ser array não vazio.');
  }
  const caminhoSemantico = valor.caminho.map((id, indice) => textoNaoVazio(id, 'endpoint-invalido', `${caminho}.caminho[${indice}]`));
  const porta = textoNaoVazio(valor.porta, 'endpoint-invalido', `${caminho}.porta`);
  return { caminho: caminhoSemantico, porta };
}

function lerEndpointRegiao(valor, caminho) {
  if (!ehObjetoSimples(valor)) falhar('endpoint-invalido', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['caminho', 'parte'], caminho);
  if (!Array.isArray(valor.caminho) || valor.caminho.length === 0) {
    falhar('endpoint-invalido', `${caminho}.caminho`, 'precisa ser array não vazio.');
  }
  const caminhoSemantico = valor.caminho.map((id, indice) => textoNaoVazio(id, 'endpoint-invalido', `${caminho}.caminho[${indice}]`));
  return {
    caminho: caminhoSemantico,
    ...(valor.parte !== undefined ? { parte: textoNaoVazio(valor.parte, 'endpoint-invalido', `${caminho}.parte`) } : {}),
  };
}

function lerFaixa(valor, caminho) {
  if (!ehObjetoSimples(valor)) falhar('especificacao-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['nominal', 'toleranciaFabricacao'], caminho);
  const nominal = numeroFinitoNaoNegativo(valor.nominal, `${caminho}.nominal`);
  if (!ehObjetoSimples(valor.toleranciaFabricacao)) {
    falhar('especificacao-invalida', `${caminho}.toleranciaFabricacao`, 'precisa ser objeto simples.');
  }
  chavesExatas(valor.toleranciaFabricacao, ['menos', 'mais'], `${caminho}.toleranciaFabricacao`);
  const menos = numeroFinitoNaoNegativo(valor.toleranciaFabricacao.menos, `${caminho}.toleranciaFabricacao.menos`);
  const mais = numeroFinitoNaoNegativo(valor.toleranciaFabricacao.mais, `${caminho}.toleranciaFabricacao.mais`);
  if (nominal - menos < 0) {
    falhar('especificacao-invalida', caminho, 'nominal - toleranciaFabricacao.menos precisa ser >= 0.');
  }
  return { nominal, toleranciaFabricacao: { menos, mais } };
}

function lerEspecificacao(valor, tipo, caminho) {
  if (!ehObjetoSimples(valor)) falhar('especificacao-invalida', caminho, 'precisa ser objeto simples.');
  const chaves = tipo === 'encaixaCilindrico'
    ? ['folgaRadial', 'toleranciaNumerica']
    : ['sobreposicaoRadial', 'sobreposicaoAxial', 'toleranciaNumerica'];
  chavesExatas(valor, chaves, caminho);
  const especificacao = {
    ...(tipo === 'encaixaCilindrico'
      ? { folgaRadial: lerFaixa(valor.folgaRadial, `${caminho}.folgaRadial`) }
      : {
        sobreposicaoRadial: lerFaixa(valor.sobreposicaoRadial, `${caminho}.sobreposicaoRadial`),
        sobreposicaoAxial: lerFaixa(valor.sobreposicaoAxial, `${caminho}.sobreposicaoAxial`),
      }),
    toleranciaNumerica: numeroFinitoNaoNegativo(valor.toleranciaNumerica, `${caminho}.toleranciaNumerica`),
  };
  return especificacao;
}

function lerEspecificacaoDirecional(valor, caminho) {
  if (!ehObjetoSimples(valor)) falhar('especificacao-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['eixo', 'separacaoMinima', 'toleranciaNumerica'], caminho);
  if (!Array.isArray(valor.eixo) || valor.eixo.length !== 3 || valor.eixo.some((numero) => !Number.isFinite(numero))) {
    falhar('especificacao-invalida', `${caminho}.eixo`, 'precisa ter três números finitos.');
  }
  const eixo = valor.eixo.map((numero) => Object.is(numero, -0) ? 0 : numero);
  if (Math.hypot(...eixo) === 0) falhar('especificacao-invalida', `${caminho}.eixo`, 'não pode ser vetor nulo.');
  return {
    eixo,
    separacaoMinima: numeroFinitoNaoNegativo(valor.separacaoMinima, `${caminho}.separacaoMinima`),
    toleranciaNumerica: numeroFinitoNaoNegativo(valor.toleranciaNumerica, `${caminho}.toleranciaNumerica`),
  };
}

function lerExpectativaIntersecao(valor, indice) {
  const caminho = `auditoriaIntersecoes.expectativas[${indice}]`;
  if (!ehObjetoSimples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['id', 'a', 'b', 'motivo'], caminho);
  const id = textoNaoVazio(valor.id, 'id-invalido', `${caminho}.id`);
  const lerCaminho = (lado) => {
    const campo = `${caminho}.${lado}`;
    if (!ehObjetoSimples(valor[lado])) falhar('expectativa-invalida', campo, 'precisa ser objeto simples.');
    chavesExatas(valor[lado], ['caminho'], campo);
    if (!Array.isArray(valor[lado].caminho) || valor[lado].caminho.length === 0) {
      falhar('expectativa-invalida', `${campo}.caminho`, 'precisa ser caminho de peça não vazio.');
    }
    return { caminho: valor[lado].caminho.map((idCaminho, j) => textoNaoVazio(idCaminho, 'expectativa-invalida', `${campo}.caminho[${j}]`)) };
  };
  const a = lerCaminho('a');
  const b = lerCaminho('b');
  if (JSON.stringify(a.caminho) === JSON.stringify(b.caminho)) falhar('expectativa-invalida', caminho, 'os dois lados precisam ser peças diferentes.');
  return { id, a, b, motivo: textoNaoVazio(valor.motivo, 'expectativa-invalida', `${caminho}.motivo`) };
}

function lerAuditoriaIntersecoes(valor) {
  const caminho = 'auditoriaIntersecoes';
  if (!ehObjetoSimples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['toleranciaNumerica', 'expectativas'], caminho);
  if (!Array.isArray(valor.expectativas)) falhar('estrutura-invalida', `${caminho}.expectativas`, 'precisa ser array.');
  const expectativas = valor.expectativas.map(lerExpectativaIntersecao);
  const ids = new Set();
  for (const [indice, expectativa] of expectativas.entries()) {
    if (ids.has(expectativa.id)) falhar('expectativa-duplicada', `${caminho}.expectativas[${indice}].id`, `ID '${expectativa.id}' duplicado.`);
    ids.add(expectativa.id);
  }
  expectativas.sort((a, b) => compararTexto(a.id, b.id));
  return { toleranciaNumerica: numeroFinitoNaoNegativo(valor.toleranciaNumerica, `${caminho}.toleranciaNumerica`), expectativas };
}

function lerRelacao(valor, indice, permitirDirecional = false) {
  const caminho = `relacoes[${indice}]`;
  if (!ehObjetoSimples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['id', 'tipo', 'referencia', 'movel', 'especificacao'], caminho);
  const id = textoNaoVazio(valor.id, 'id-invalido', `${caminho}.id`);
  const tipos = ['encaixaCilindrico', 'assentaAnular', ...(permitirDirecional ? ['mantemSeparacaoDirecional'] : [])];
  if (!tipos.includes(valor.tipo)) {
    falhar('tipo-relacao-nao-suportado', `${caminho}.tipo`, `aceita somente ${tipos.join(', ')}.`);
  }
  if (valor.tipo === 'mantemSeparacaoDirecional') {
    return {
      id,
      tipo: valor.tipo,
      referencia: lerEndpointRegiao(valor.referencia, `${caminho}.referencia`),
      movel: lerEndpointRegiao(valor.movel, `${caminho}.movel`),
      especificacao: lerEspecificacaoDirecional(valor.especificacao, `${caminho}.especificacao`),
    };
  }
  return {
    id,
    tipo: valor.tipo,
    referencia: lerEndpoint(valor.referencia, `${caminho}.referencia`),
    movel: lerEndpoint(valor.movel, `${caminho}.movel`),
    especificacao: lerEspecificacao(valor.especificacao, valor.tipo, `${caminho}.especificacao`),
  };
}

function lerV1(dado) {
  chavesExatas(dado, ['formato', 'versao', 'id', 'instancias'], '$');
  const id = textoNaoVazio(dado.id, 'id-invalido', 'id');
  if (!Array.isArray(dado.instancias)) falhar('estrutura-invalida', 'instancias', 'precisa ser array.');
  const instancias = dado.instancias.map(lerInstancia);
  const ids = new Set();
  for (const [indice, instancia] of instancias.entries()) {
    if (ids.has(instancia.id)) falhar('instancia-duplicada', `instancias[${indice}].id`, `ID '${instancia.id}' duplicado.`);
    ids.add(instancia.id);
  }
  instancias.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { formato: FORMATO, versao: VERSAO, id, instancias };
}

function lerV2(dado) {
  chavesExatas(dado, ['formato', 'versao', 'id', 'instancias', 'relacoes'], '$');
  const id = textoNaoVazio(dado.id, 'id-invalido', 'id');
  if (!Array.isArray(dado.instancias)) falhar('estrutura-invalida', 'instancias', 'precisa ser array.');
  const instancias = dado.instancias.map(lerInstancia);
  const ids = new Set();
  for (const [indice, instancia] of instancias.entries()) {
    if (ids.has(instancia.id)) falhar('instancia-duplicada', `instancias[${indice}].id`, `ID '${instancia.id}' duplicado.`);
    ids.add(instancia.id);
  }
  if (!Array.isArray(dado.relacoes)) falhar('estrutura-invalida', 'relacoes', 'precisa ser array.');
  const relacoes = dado.relacoes.map((relacao, indice) => lerRelacao(relacao, indice));
  const relacaoIds = new Set();
  for (const [indice, relacao] of relacoes.entries()) {
    if (relacaoIds.has(relacao.id)) falhar('relacao-duplicada', `relacoes[${indice}].id`, `ID '${relacao.id}' duplicado.`);
    relacaoIds.add(relacao.id);
  }
  instancias.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  relacoes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { formato: FORMATO, versao: VERSAO_RELACOES, id, instancias, relacoes };
}

function lerV3(dado) {
  chavesExatas(dado, ['formato', 'versao', 'id', 'instancias', 'relacoes'], '$');
  const id = textoNaoVazio(dado.id, 'id-invalido', 'id');
  if (!Array.isArray(dado.instancias)) falhar('estrutura-invalida', 'instancias', 'precisa ser array.');
  const instancias = dado.instancias.map(lerInstancia);
  const ids = new Set();
  for (const [indice, instancia] of instancias.entries()) {
    if (ids.has(instancia.id)) falhar('instancia-duplicada', `instancias[${indice}].id`, `ID '${instancia.id}' duplicado.`);
    ids.add(instancia.id);
  }
  if (!Array.isArray(dado.relacoes)) falhar('estrutura-invalida', 'relacoes', 'precisa ser array.');
  const relacoes = dado.relacoes.map((relacao, indice) => lerRelacao(relacao, indice, true));
  const relacaoIds = new Set();
  for (const [indice, relacao] of relacoes.entries()) {
    if (relacaoIds.has(relacao.id)) falhar('relacao-duplicada', `relacoes[${indice}].id`, `ID '${relacao.id}' duplicado.`);
    relacaoIds.add(relacao.id);
  }
  instancias.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  relacoes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { formato: FORMATO, versao: VERSAO_ATUAL, id, instancias, relacoes };
}

function lerV4(dado) {
  chavesExatas(dado, ['formato', 'versao', 'id', 'instancias', 'relacoes', 'auditoriaIntersecoes'], '$');
  const { auditoriaIntersecoes, ...semAuditoria } = dado;
  const base = lerV3({ ...semAuditoria, versao: VERSAO_ATUAL });
  return {
    ...base,
    versao: VERSAO_AUDITORIA_INTERSECOES,
    auditoriaIntersecoes: lerAuditoriaIntersecoes(auditoriaIntersecoes),
  };
}

export function lerMontagemPersistida(dado) {
  if (!ehObjetoSimples(dado)) falhar('estrutura-invalida', '$', 'precisa ser objeto simples.');
  if (dado.formato !== FORMATO) falhar('formato-desconhecido', 'formato', `esperado '${FORMATO}'.`);
  if (!VERSOES_SUPORTADAS.includes(dado.versao)) {
    falhar('versao-nao-suportada', 'versao', `esperado uma de ${VERSOES_SUPORTADAS.join(', ')}.`);
  }
  if (dado.versao === VERSAO) return lerV1(dado);
  if (dado.versao === VERSAO_RELACOES) return lerV2(dado);
  if (dado.versao === VERSAO_ATUAL) return lerV3(dado);
  return lerV4(dado);
}
