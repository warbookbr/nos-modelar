/* ler-montagem-persistida.js — leitor/validador fail-closed da montagem v1. */

import { identidadeTransformacaoRigida, validarTransformacaoRigida } from './transformacao-rigida.js';

export const FORMATO = 'mecanifica.montagem';
export const VERSAO = 1;

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

export function lerMontagemPersistida(dado) {
  if (!ehObjetoSimples(dado)) falhar('estrutura-invalida', '$', 'precisa ser objeto simples.');
  chavesExatas(dado, ['formato', 'versao', 'id', 'instancias'], '$');
  if (dado.formato !== FORMATO) falhar('formato-desconhecido', 'formato', `esperado '${FORMATO}'.`);
  if (dado.versao !== VERSAO) falhar('versao-nao-suportada', 'versao', `esperado ${VERSAO}.`);
  const id = textoNaoVazio(dado.id, 'id-invalido', 'id');
  if (!Array.isArray(dado.instancias)) falhar('estrutura-invalida', 'instancias', 'precisa ser array.');
  const instancias = dado.instancias.map(lerInstancia);
  const ids = new Set();
  for (const [indice, instancia] of instancias.entries()) {
    if (ids.has(instancia.id)) falhar('instancia-duplicada', `instancias[${indice}].id`, `ID '${instancia.id}' duplicado.`);
    ids.add(instancia.id);
  }
  instancias.sort((a, b) => a.id.localeCompare(b.id));
  return { formato: FORMATO, versao: VERSAO, id, instancias };
}
