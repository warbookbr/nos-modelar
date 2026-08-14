/* ler-universo-autoria.js — contrato e prova estrutural do universo v1. */

import { lerMontagemPersistida } from './ler-montagem-persistida.js';

export const FORMATO = 'mecanifica.universo-autoria';
export const VERSAO = 1;

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ErroUniversoAutoria extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroUniversoAutoria';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const simples = (valor) => valor !== null
  && typeof valor === 'object'
  && !Array.isArray(valor)
  && (Object.getPrototypeOf(valor) === Object.prototype || Object.getPrototypeOf(valor) === null);

function falhar(codigo, caminho, mensagem) {
  throw new ErroUniversoAutoria(codigo, caminho, mensagem);
}

function chavesExatas(valor, permitidas, caminho) {
  const extras = Object.keys(valor).filter((chave) => !permitidas.includes(chave));
  if (extras.length) falhar('chave-desconhecida', caminho, `chave(s) desconhecida(s): ${extras.sort().join(', ')}.`);
}

function slugue(valor, caminho) {
  if (typeof valor !== 'string' || !slug.test(valor)) {
    falhar('identidade-invalida', caminho, 'precisa ser slug semântico em minúsculas.');
  }
  return valor;
}

function entrada(valor, caminho) {
  if (!simples(valor)) falhar('estrutura-invalida', caminho, 'precisa ser objeto simples.');
  chavesExatas(valor, ['id', 'ref'], caminho);
  return { id: slugue(valor.id, `${caminho}.id`), ref: slugue(valor.ref, `${caminho}.ref`) };
}

function listaDeEntradas(valor, tipo) {
  if (!Array.isArray(valor) || valor.length === 0) {
    falhar('universo-vazio', tipo, 'precisa conter ao menos uma entrada.');
  }
  const entradas = valor.map((item, indice) => entrada(item, `${tipo}[${indice}]`));
  const ids = new Set();
  const refs = new Set();
  for (const [indice, item] of entradas.entries()) {
    if (ids.has(item.id)) falhar('id-duplicado', `${tipo}[${indice}].id`, `ID '${item.id}' aparece mais de uma vez.`);
    if (refs.has(item.ref)) falhar('referencia-ambigua', `${tipo}[${indice}].ref`, `referência '${item.ref}' aparece mais de uma vez.`);
    ids.add(item.id); refs.add(item.ref);
  }
  return entradas.sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));
}

function listaDeRaizes(valor, montagens) {
  if (!Array.isArray(valor) || valor.length === 0) falhar('raizes-invalidas', 'raizes', 'precisa conter ao menos uma montagem.');
  const ids = valor.map((id, indice) => slugue(id, `raizes[${indice}]`));
  const vistos = new Set();
  for (const [indice, id] of ids.entries()) {
    if (vistos.has(id)) falhar('raiz-duplicada', `raizes[${indice}]`, `raiz '${id}' aparece mais de uma vez.`);
    if (!montagens.some((montagem) => montagem.id === id)) falhar('raiz-ausente', `raizes[${indice}]`, `montagem '${id}' não está enumerada.`);
    vistos.add(id);
  }
  return ids.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function lerUniversoAutoria(dado) {
  if (!simples(dado)) falhar('estrutura-invalida', '$', 'precisa ser objeto simples.');
  chavesExatas(dado, ['formato', 'versao', 'id', 'pecas', 'montagens', 'raizes'], '$');
  if (dado.formato !== FORMATO) falhar('formato-desconhecido', 'formato', `esperado '${FORMATO}'.`);
  if (dado.versao !== VERSAO) falhar('versao-nao-suportada', 'versao', `esperado ${VERSAO}.`);
  const id = slugue(dado.id, 'id');
  const pecas = listaDeEntradas(dado.pecas, 'pecas');
  const montagens = listaDeEntradas(dado.montagens, 'montagens');
  const raizes = listaDeRaizes(dado.raizes, montagens);
  return JSON.parse(JSON.stringify({ formato: FORMATO, versao: VERSAO, id, pecas, montagens, raizes }));
}

async function carregarDocumentoMontagem(carregar, entradaMontagem) {
  if (typeof carregar !== 'function') falhar('carregador-invalido', 'carregarMontagem', 'forneça um carregador confiável.');
  let bruto;
  try { bruto = await carregar(entradaMontagem.ref); } catch (erro) {
    falhar('referencia-ausente', `montagens.${entradaMontagem.id}`, erro instanceof Error ? erro.message : String(erro));
  }
  if (bruto === null || bruto === undefined) {
    falhar('referencia-ausente', `montagens.${entradaMontagem.id}`, `referência '${entradaMontagem.ref}' não foi carregada.`);
  }
  try { return lerMontagemPersistida(bruto); } catch (erro) {
    falhar('montagem-invalida', `montagens.${entradaMontagem.id}`, erro instanceof Error ? erro.message : String(erro));
  }
}

export async function validarUniversoAutoria(dado, { carregarMontagem } = {}) {
  const universo = lerUniversoAutoria(dado);
  const porRefMontagem = new Map(universo.montagens.map((entrada) => [entrada.ref, entrada]));
  const porRefPeca = new Map(universo.pecas.map((entrada) => [entrada.ref, entrada]));
  const documentos = [];
  const dependencias = new Map(universo.montagens.map(({ id }) => [id, []]));

  for (const entradaMontagem of universo.montagens) {
    const documento = await carregarDocumentoMontagem(carregarMontagem, entradaMontagem);
    if (documento.id !== entradaMontagem.id) {
      falhar('identidade-divergente', `montagens.${entradaMontagem.id}.id`, `documento trouxe '${documento.id}'.`);
    }
    for (const [indice, instancia] of documento.instancias.entries()) {
      const caminho = `montagens.${entradaMontagem.id}.instancias[${indice}].alvo.ref`;
      const tabela = instancia.alvo.tipo === 'montagem' ? porRefMontagem : porRefPeca;
      const alvo = tabela.get(instancia.alvo.ref);
      if (!alvo) falhar('referencia-nao-enumerada', caminho, `referência '${instancia.alvo.ref}' não pertence ao universo.`);
      if (instancia.alvo.tipo === 'montagem') dependencias.get(entradaMontagem.id).push(alvo.id);
    }
    documentos.push({ id: entradaMontagem.id, ref: entradaMontagem.ref, documento });
  }

  const estado = new Set();
  const pilha = [];
  function visitar(id) {
    if (estado.has(id)) return;
    if (pilha.includes(id)) {
      const ciclo = [...pilha.slice(pilha.indexOf(id)), id].join(' -> ');
      falhar('ciclo', `montagens.${id}`, `ciclo de composição: ${ciclo}.`);
    }
    pilha.push(id);
    for (const dependente of dependencias.get(id)) visitar(dependente);
    pilha.pop();
    estado.add(id);
  }
  for (const { id } of universo.montagens) visitar(id);

  return {
    universo,
    montagens: documentos,
    dependencias: [...dependencias.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([id, alvos]) => ({ montagem: id, alvos: [...new Set(alvos)].sort((a, b) => a.localeCompare(b, 'pt-BR')) })),
    cobertura: { completa: true, entidades: universo.pecas.length + universo.montagens.length },
  };
}
