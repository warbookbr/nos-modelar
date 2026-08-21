/* aceite-visual-regional.mjs — v2 do aceite: evidência por região e papel.
   A v1 continua em aceite-visual.mjs, com suas quatro vistas globais intactas. */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarCriticaVisual } from './revisao-modelagem.mjs';

export const FORMATO_ACEITE_VISUAL_REGIONAL = 'mecanifica.aceite-visual';
export const VERSAO_ACEITE_VISUAL_REGIONAL = 2;
const SHA = /^sha256:[a-f0-9]{64}$/;
const NOME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CLASSES = new Set(['alvo', 'modelo', 'comparacao-regional']);
const ESCOPOS = new Set(['silhueta-exterior', 'recorte-interno']);

function falhar(texto) { throw new Error(`aceite-visual-regional: ${texto}`); }
function objeto(v, onde) { if (!v || typeof v !== 'object' || Array.isArray(v)) falhar(`${onde} precisa ser objeto.`); }
function exato(v, campos, onde) { objeto(v, onde); const chaves = Object.keys(v).sort(); const esperadas = [...campos].sort(); if (chaves.length !== esperadas.length || chaves.some((x, i) => x !== esperadas[i])) falhar(`${onde} tem chaves inválidas.`); }
function texto(v, onde) { if (typeof v !== 'string' || !v.trim()) falhar(`${onde} precisa ser texto não vazio.`); return v; }
function nome(v, onde) { const valor = texto(v, onde); if (!NOME.test(valor)) falhar(`${onde} precisa ser identidade semântica.`); return valor; }
function hash(v, onde) { const valor = texto(v, onde); if (!SHA.test(valor)) falhar(`${onde} precisa ser SHA-256.`); return valor; }
function prova(v, onde) {
  exato(v, ['hash', 'localizador'], onde);
  const localizador = texto(v.localizador, `${onde}.localizador`);
  if (!/^repo:\/\/[A-Za-z0-9._/-]+$/.test(localizador) || localizador.includes('..')) falhar(`${onde}.localizador precisa ser repo:// canônico.`);
  return { hash: hash(v.hash, `${onde}.hash`), localizador };
}
function listaNomes(v, onde) { if (!Array.isArray(v) || !v.length) falhar(`${onde} precisa ser lista não vazia.`); const lista = v.map((x, i) => nome(x, `${onde}[${i}]`)); if (new Set(lista).size !== lista.length) falhar(`${onde} repete identidade.`); return lista; }

function validarRegional(aceite, { assinaturaModelo, assinaturaBriefing, rejeicoesObrigatorias, recortesObrigatorios } = {}, { permitirCriticaAusente = false } = {}) {
  const temCritica = Object.hasOwn(aceite ?? {}, 'critica');
  exato(aceite, permitirCriticaAusente && !temCritica
    ? ['assinaturaBriefing', 'assinaturaModelo', 'consultas', 'formato', 'rejeicoes', 'versao']
    : ['assinaturaBriefing', 'assinaturaModelo', 'consultas', 'critica', 'formato', 'rejeicoes', 'versao'], 'aceite');
  if (aceite.formato !== FORMATO_ACEITE_VISUAL_REGIONAL || aceite.versao !== VERSAO_ACEITE_VISUAL_REGIONAL) falhar('formato ou versão não suportados.');
  if (hash(aceite.assinaturaModelo, 'assinaturaModelo') !== hash(assinaturaModelo, 'assinaturaModelo esperado')) falhar('assinaturaModelo diverge.');
  if (hash(aceite.assinaturaBriefing, 'assinaturaBriefing') !== hash(assinaturaBriefing, 'assinaturaBriefing esperado')) falhar('assinaturaBriefing diverge.');
  const esperadas = listaNomes(rejeicoesObrigatorias, 'rejeicoesObrigatorias');
  const recortes = listaNomes(recortesObrigatorios, 'recortesObrigatorios');
  if (!Array.isArray(aceite.consultas) || !aceite.consultas.length) falhar('consultas precisa ser lista não vazia.');
  const idsDeEntrada = new Set(); const consultas = []; const indice = new Map();
  for (let i = 0; i < aceite.consultas.length; i += 1) {
    const c = aceite.consultas[i]; exato(c, ['entradas', 'papel', 'proposito', 'regiao'], `consultas[${i}]`);
    const papel = texto(c.papel, `consultas[${i}].papel`); const proposito = texto(c.proposito, `consultas[${i}].proposito`); const regiao = nome(c.regiao, `consultas[${i}].regiao`);
    if (!['modelador', 'critico-visual-independente'].includes(papel)) falhar(`consultas[${i}].papel inválido.`);
    if (!['comparar', 'revisar'].includes(proposito)) falhar(`consultas[${i}].proposito inválido.`);
    if ((papel === 'modelador') !== (proposito === 'comparar')) falhar(`consultas[${i}] combina papel e propósito indevidamente.`);
    if (!Array.isArray(c.entradas) || !c.entradas.length) falhar(`consultas[${i}].entradas vazia.`);
    const classes = new Set(); const escopos = new Set(); const entradas = c.entradas.map((e, j) => {
      exato(e, ['classe', 'escopo', 'evidencia', 'id', 'vista'], `consultas[${i}].entradas[${j}]`);
      const id = nome(e.id, `consultas[${i}].entradas[${j}].id`); if (idsDeEntrada.has(id)) falhar(`entrada '${id}' repetida entre consultas.`); idsDeEntrada.add(id);
      if (!CLASSES.has(e.classe)) falhar(`consultas[${i}].entradas[${j}].classe não permite painel composto.`);
      if (!ESCOPOS.has(e.escopo)) falhar(`consultas[${i}].entradas[${j}].escopo inválido.`);
      classes.add(e.classe); escopos.add(e.escopo);
      return { id, classe: e.classe, escopo: e.escopo, vista: nome(e.vista, `consultas[${i}].entradas[${j}].vista`), evidencia: prova(e.evidencia, `consultas[${i}].entradas[${j}].evidencia`) };
    });
    if (![...CLASSES].every((classe) => classes.has(classe))) falhar(`consultas[${i}] exige alvo, modelo e comparação regional.`);
    const chave = `${papel}:${regiao}`; if (indice.has(chave)) falhar(`consulta repetida para ${chave}.`); indice.set(chave, { entradas, escopos });
    consultas.push({ papel, proposito, regiao, entradas });
  }
  for (const recorte of recortes) for (const papel of ['modelador', 'critico-visual-independente']) {
    const consulta = indice.get(`${papel}:${recorte}`);
    if (!consulta || !consulta.escopos.has('recorte-interno')) falhar(`recorte '${recorte}' não recebeu comparação interna para ${papel}.`);
  }
  let critica;
  if (!permitirCriticaAusente || temCritica) {
    exato(aceite.critica, ['assinaturaModelo', 'evidencia', 'papel'], 'critica');
    if (aceite.critica.papel !== 'critico-visual-independente') falhar("critica.papel precisa ser 'critico-visual-independente'.");
    if (hash(aceite.critica.assinaturaModelo, 'critica.assinaturaModelo') !== hash(assinaturaModelo, 'assinaturaModelo esperado')) falhar('critica.assinaturaModelo diverge.');
    critica = {
      assinaturaModelo: hash(assinaturaModelo, 'assinaturaModelo esperado'),
      evidencia: prova(aceite.critica.evidencia, 'critica.evidencia'),
      papel: 'critico-visual-independente',
    };
  }
  if (!Array.isArray(aceite.rejeicoes)) falhar('rejeicoes precisa ser lista.');
  const rejeicoes = aceite.rejeicoes.map((r, i) => {
    exato(r, ['evidencias', 'id', 'resultado'], `rejeicoes[${i}]`); const id = nome(r.id, `rejeicoes[${i}].id`);
    if (!['passa', 'reprova', 'inconclusiva'].includes(r.resultado)) falhar(`rejeicoes[${i}].resultado inválido.`);
    const evidencias = listaNomes(r.evidencias, `rejeicoes[${i}].evidencias`); if (evidencias.some((e) => !idsDeEntrada.has(e))) falhar(`rejeicoes[${i}] cita evidência ausente.`);
    return { id, resultado: r.resultado, evidencias };
  });
  const ids = rejeicoes.map((r) => r.id); if (new Set(ids).size !== ids.length || ids.length !== esperadas.length || esperadas.some((id) => !ids.includes(id))) falhar('rejeições não cobrem o briefing.');
  const motivos = rejeicoes.filter((r) => r.resultado !== 'passa').map((r) => `rejeicao:${r.id}`);
  return { ...aceite, ...(critica ? { critica } : {}), consultas, rejeicoes, veredito: motivos.length ? { estado: 'reprovado', motivos } : { estado: 'aprovavel', motivos: [] } };
}

export function validarAceiteVisualRegional(aceite, opcoes) { return validarRegional(aceite, opcoes); }

/** Pré-revisão: valida somente o material que pode existir antes do crítico. */
export function validarPreparacaoVisualRegional(aceite, opcoes) { return validarRegional(aceite, opcoes, { permitirCriticaAusente: true }); }

function verificarProva(evidencia, raiz) {
  const candidato = resolve(raiz, evidencia.localizador.slice('repo://'.length));
  if (!candidato.startsWith(`${raiz}/`) || !existsSync(candidato) || !lstatSync(candidato).isFile()) falhar(`evidência ausente: ${evidencia.localizador}.`);
  const real = realpathSync(candidato); if (!real.startsWith(`${raiz}/`)) falhar(`symlink fora da raiz: ${evidencia.localizador}.`);
  const atual = `sha256:${createHash('sha256').update(readFileSync(real)).digest('hex')}`;
  if (atual !== evidencia.hash) falhar(`hash diverge: ${evidencia.localizador}.`);
}

export function verificarEvidenciasAceiteRegionalNoDisco(aceite, opcoes, { raizRepositorio } = {}) {
  if (!raizRepositorio) falhar('raizRepositorio é obrigatória.');
  const valido = validarAceiteVisualRegional(aceite, opcoes); const raiz = realpathSync(raizRepositorio);
  valido.consultas.flatMap((c) => c.entradas).forEach((e) => verificarProva(e.evidencia, raiz));
  verificarProva(valido.critica.evidencia, raiz);
  let documento;
  try { documento = JSON.parse(readFileSync(resolve(raiz, valido.critica.evidencia.localizador.slice('repo://'.length)), 'utf8')); }
  catch { falhar('crítica não contém JSON válido.'); }
  let critica;
  try { critica = validarCriticaVisual(documento); }
  catch (causa) { falhar(`crítica inválida: ${causa.message}`); }
  const abertos = critica.achados.filter((achado) => ['aberto', 'bloqueado'].includes(achado.estado));
  if (abertos.some((achado) => achado.vinculo.antes !== valido.assinaturaModelo && achado.vinculo.depois !== valido.assinaturaModelo)) {
    falhar('crítica contém achado sem vínculo à revisão avaliada.');
  }
  const motivos = [...valido.veredito.motivos, ...(abertos.length ? ['critica:achado-aberto'] : [])];
  return {
    ...valido,
    critica: { ...valido.critica, achadosAbertos: abertos.length },
    veredito: motivos.length ? { estado: 'reprovado', motivos } : { estado: 'aprovavel', motivos: [] },
  };
}

export function verificarPreparacaoVisualRegionalNoDisco(aceite, opcoes, { raizRepositorio } = {}) {
  if (!raizRepositorio) falhar('raizRepositorio é obrigatória.');
  const valido = validarPreparacaoVisualRegional(aceite, opcoes); const raiz = realpathSync(raizRepositorio);
  valido.consultas.flatMap((consulta) => consulta.entradas).forEach((entrada) => verificarProva(entrada.evidencia, raiz));
  return valido;
}
