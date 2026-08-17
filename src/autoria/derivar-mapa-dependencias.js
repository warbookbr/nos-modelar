/* derivar-mapa-dependencias.js — mapa global derivado de um snapshot estável. */

import { lerMontagemPersistida } from './ler-montagem-persistida.js';
import { lerPecaResolvida } from './ler-peca-resolvida.js';
import { lerUniversoAutoria } from './ler-universo-autoria.js';

export const FORMATO = 'mecanifica.mapa-dependencias';
export const VERSAO = 1;

export class ErroMapaDependencias extends Error {
  constructor(codigo, caminho, mensagem) {
    super(`${caminho}: ${mensagem}`);
    this.name = 'ErroMapaDependencias';
    this.codigo = codigo;
    this.caminho = caminho;
  }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const chaveAlvo = (alvo) => `${alvo.tipo}:${alvo.id}`;
const chaveCaminho = (caminho) => JSON.stringify(caminho);

function falhar(codigo, caminho, mensagem) {
  throw new ErroMapaDependencias(codigo, caminho, mensagem);
}

function copiar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function fonteDaEntrada(entrada, caminho) {
  if (typeof entrada.fonte !== 'string'
    || (entrada.fonte !== 'base-estatica' && entrada.fonte !== 'revisao-ativa')
    || (entrada.revisao !== null && typeof entrada.revisao !== 'string')
    || typeof entrada.sha256 !== 'string' || !entrada.sha256) {
    falhar('proveniencia-invalida', caminho, 'fonte, revisão e hash precisam estar completos.');
  }
  return { fonte: entrada.fonte, revisao: entrada.revisao ?? null, sha256: entrada.sha256 };
}

function alvoDo(universo, tipo, ref, caminho) {
  const entradas = tipo === 'montagem' ? universo.montagens : universo.pecas;
  const entrada = entradas.find((item) => item.ref === ref);
  if (!entrada) falhar('referencia-nao-enumerada', caminho, `referência '${ref}' não pertence ao universo.`);
  return { tipo, id: entrada.id };
}

function validarSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    falhar('snapshot-invalido', '$', 'forneça um snapshot de autoria.');
  }
  if (snapshot.formato !== 'mecanifica.snapshot-universo-autoria' || snapshot.versao !== 1) {
    falhar('snapshot-invalido', '$', 'o formato precisa ser mecanifica.snapshot-universo-autoria v1.');
  }
  if (snapshot.cobertura?.completa !== true) {
    falhar('cobertura-incompleta', 'cobertura', 'somente snapshots completos podem gerar mapa global.');
  }
  let universo;
  try { universo = lerUniversoAutoria(snapshot.universo); }
  catch (erro) { falhar('universo-invalido', 'universo', erro instanceof Error ? erro.message : String(erro)); }
  if (!Array.isArray(snapshot.pecas) || !Array.isArray(snapshot.montagens)) {
    falhar('snapshot-invalido', '$', 'pecas e montagens precisam ser listas.');
  }
  const pecas = new Map();
  const montagens = new Map();
  for (const entrada of snapshot.pecas ?? []) {
    if (pecas.has(entrada.id)) falhar('entidade-duplicada', `pecas.${entrada.id}`, 'peça repetida no snapshot.');
    const declarada = universo.pecas.find((item) => item.id === entrada.id && item.ref === entrada.ref);
    if (!declarada) falhar('entidade-nao-enumerada', `pecas.${entrada.id}`, 'peça não pertence ao universo.');
    try { lerPecaResolvida(entrada.documento); }
    catch (erro) { falhar('peca-invalida', `pecas.${entrada.id}`, erro instanceof Error ? erro.message : String(erro)); }
    pecas.set(entrada.id, { ...entrada, proveniencia: fonteDaEntrada(entrada, `pecas.${entrada.id}`) });
  }
  if (pecas.size !== universo.pecas.length) falhar('cobertura-incompleta', 'pecas', 'o snapshot não trouxe todas as peças enumeradas.');

  for (const entrada of snapshot.montagens ?? []) {
    if (montagens.has(entrada.id)) falhar('entidade-duplicada', `montagens.${entrada.id}`, 'montagem repetida no snapshot.');
    const declarada = universo.montagens.find((item) => item.id === entrada.id && item.ref === entrada.ref);
    if (!declarada) falhar('entidade-nao-enumerada', `montagens.${entrada.id}`, 'montagem não pertence ao universo.');
    let documento;
    try { documento = lerMontagemPersistida(entrada.documento); }
    catch (erro) { falhar('montagem-invalida', `montagens.${entrada.id}`, erro instanceof Error ? erro.message : String(erro)); }
    if (documento.id !== entrada.id) falhar('identidade-divergente', `montagens.${entrada.id}.id`, `documento trouxe '${documento.id}'.`);
    montagens.set(entrada.id, { ...entrada, documento, proveniencia: fonteDaEntrada(entrada, `montagens.${entrada.id}`) });
  }
  if (montagens.size !== universo.montagens.length) falhar('cobertura-incompleta', 'montagens', 'o snapshot não trouxe todas as montagens enumeradas.');
  return { universo, pecas, montagens };
}

function declaracao(montagem, instancia, alvo) {
  return {
    montagem,
    instancia: instancia.id,
    alvo,
  };
}

function caminhoPublico(caminho) {
  return caminho.map(({ montagem, instancia }) => ({ montagem, instancia }));
}

function endpointDa(montagemInicial, endpoint, universo, montagens, caminho) {
  let montagemAtual = montagemInicial;
  const publico = [];
  let alvo;
  for (const [indice, segmento] of endpoint.caminho.entries()) {
    const documento = montagens.get(montagemAtual)?.documento;
    const instancia = documento?.instancias.find((item) => item.id === segmento);
    if (!instancia) falhar('endpoint-invalido', `${caminho}.caminho[${indice}]`, `instância '${segmento}' não existe em '${montagemAtual}'.`);
    publico.push({ montagem: montagemAtual, instancia: segmento });
    const ultimo = indice === endpoint.caminho.length - 1;
    alvo = alvoDo(universo, instancia.alvo.tipo, instancia.alvo.ref, `${caminho}.caminho[${indice}]`);
    if (!ultimo && instancia.alvo.tipo !== 'montagem') {
      falhar('endpoint-invalido', `${caminho}.caminho[${indice}]`, 'uma peça não pode ser atravessada.');
    }
    if (!ultimo) montagemAtual = alvo.id;
  }
  if (alvo?.tipo !== 'peca') falhar('endpoint-invalido', caminho, 'o endpoint precisa terminar em peça.');
  return {
    caminho: caminhoPublico(publico),
    alvo,
    ...(endpoint.porta !== undefined ? { porta: endpoint.porta } : {}),
    ...(endpoint.parte !== undefined ? { parte: endpoint.parte } : {}),
  };
}

function ordenarAlvo(a, b) {
  return comparar(a.tipo, b.tipo) || comparar(a.id, b.id);
}

function ordenarCaminho(a, b) {
  return comparar(a.raiz, b.raiz) || comparar(chaveCaminho(a.caminho), chaveCaminho(b.caminho));
}

export function derivarMapaDependencias(snapshot) {
  const { universo, pecas, montagens } = validarSnapshot(snapshot);
  const entidades = [
    ...universo.pecas.map((entrada) => ({
      tipo: 'peca', id: entrada.id, ref: entrada.ref, proveniencia: copiar(pecas.get(entrada.id).proveniencia),
    })),
    ...universo.montagens.map((entrada) => ({
      tipo: 'montagem', id: entrada.id, ref: entrada.ref, proveniencia: copiar(montagens.get(entrada.id).proveniencia),
    })),
  ].sort(ordenarAlvo);

  const composicao = [];
  const usosPorAlvo = new Map(entidades.map((entidade) => [chaveAlvo(entidade), []]));
  for (const montagem of universo.montagens) {
    const documento = montagens.get(montagem.id).documento;
    for (const instancia of documento.instancias) {
      const alvo = alvoDo(universo, instancia.alvo.tipo, instancia.alvo.ref, `montagens.${montagem.id}.instancias.${instancia.id}`);
      const item = declaracao(montagem.id, instancia, alvo);
      composicao.push(item);
      usosPorAlvo.get(chaveAlvo(alvo)).push({ montagem: montagem.id, instancia: instancia.id });
    }
  }

  const ocorrencias = [];
  const ocorrenciasPorAlvo = new Map(entidades.map((entidade) => [chaveAlvo(entidade), []]));
  const relacaoOcorrencias = new Map();
  function visitar(montagemId, raiz, caminho, pilha) {
    if (pilha.includes(montagemId)) {
      falhar('ciclo', `montagens.${montagemId}`, `ciclo de ocorrência: ${[...pilha, montagemId].join(' -> ')}`);
    }
    const documento = montagens.get(montagemId).documento;
    for (const instancia of documento.instancias) {
      const alvo = alvoDo(universo, instancia.alvo.tipo, instancia.alvo.ref, `montagens.${montagemId}.instancias.${instancia.id}`);
      const proximo = [...caminho, { montagem: montagemId, instancia: instancia.id }];
      const ocorrencia = { raiz, alvo, caminho: caminhoPublico(proximo) };
      ocorrencias.push(ocorrencia);
      ocorrenciasPorAlvo.get(chaveAlvo(alvo)).push({ raiz, caminho: caminhoPublico(proximo) });
      if (alvo.tipo === 'montagem') visitar(alvo.id, raiz, proximo, [...pilha, montagemId]);
    }
    for (const relacao of documento.relacoes ?? []) {
      const chave = `${montagemId}:${relacao.id}`;
      const lista = relacaoOcorrencias.get(chave) ?? [];
      lista.push({ raiz, caminho: caminhoPublico(caminho) });
      relacaoOcorrencias.set(chave, lista);
    }
  }
  for (const raiz of universo.raizes) visitar(raiz, raiz, [], []);

  const relacoes = [];
  for (const montagem of universo.montagens) {
    const documento = montagens.get(montagem.id).documento;
    for (const relacao of documento.relacoes ?? []) {
      const chave = `${montagem.id}:${relacao.id}`;
      relacoes.push({
        montagem: montagem.id,
        id: relacao.id,
        tipo: relacao.tipo,
        referencia: endpointDa(montagem.id, relacao.referencia, universo, montagens, `montagens.${montagem.id}.relacoes.${relacao.id}.referencia`),
        movel: endpointDa(montagem.id, relacao.movel, universo, montagens, `montagens.${montagem.id}.relacoes.${relacao.id}.movel`),
        especificacao: copiar(relacao.especificacao),
        proveniencia: copiar(montagens.get(montagem.id).proveniencia),
        ocorrencias: (relacaoOcorrencias.get(chave) ?? []).sort(ordenarCaminho),
      });
    }
  }

  composicao.sort((a, b) => comparar(a.montagem, b.montagem) || comparar(a.instancia, b.instancia));
  ocorrencias.sort(ordenarCaminho);
  for (const lista of usosPorAlvo.values()) lista.sort((a, b) => comparar(a.montagem, b.montagem) || comparar(a.instancia, b.instancia));
  for (const lista of ocorrenciasPorAlvo.values()) lista.sort(ordenarCaminho);
  relacoes.sort((a, b) => comparar(a.montagem, b.montagem) || comparar(a.id, b.id));

  const usos = entidades.map((entidade) => ({
    alvo: { tipo: entidade.tipo, id: entidade.id },
    declaracoes: usosPorAlvo.get(chaveAlvo(entidade)) ?? [],
    ocorrencias: ocorrenciasPorAlvo.get(chaveAlvo(entidade)) ?? [],
  }));

  return copiar({
    formato: FORMATO,
    versao: VERSAO,
    universo,
    entidades,
    raizes: universo.raizes.map((id) => ({ id })),
    composicao,
    ocorrencias,
    usos,
    relacoes,
    cobertura: {
      completa: true,
      entidades: entidades.length,
      raizes: universo.raizes.length,
      snapshot: {
        tentativas: snapshot.cobertura.tentativas ?? null,
        estado: copiar(snapshot.cobertura.estado ?? null),
      },
    },
  });
}
