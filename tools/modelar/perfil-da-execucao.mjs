#!/usr/bin/env node
/* perfil-da-execucao.mjs — mede a execução de uma receita sem mudar nada nela (fatia 1 do plano do planejador de execução).
 *
 *   node tools/modelar/perfil-da-execucao.mjs <peça> --executar     o tempo de `executarReceita` sozinha, em ms, num processo novo
 *   node tools/modelar/perfil-da-execucao.mjs <peça> --perfil       tempo por passo e por operação, o grafo de leitura e as sequências de subtrair
 *   node tools/modelar/perfil-da-execucao.mjs --acervo              o grafo e as sequências de subtrair de todas as peças, sem executar
 *
 * Nada liga por padrão: o perfil usa o mesmo cronometrador do `descrever` (um registro que só embrulha `resolver`, de modo que o
 * caminho rápido do núcleo continua valendo) e a análise do grafo vem de `procedural/nucleo/planejador/leitura-escrita.js`. */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { REGISTRO_DA_RECEITA, executarReceita } from '../../src/autoria/executar-receita.js';
import {
  analisarPassos, resumirPerfil, resumoPorOperacao, sequenciasDeSubtrair, tempoDosPassos, totaisDoGrafo,
} from '../../procedural/nucleo/planejador/leitura-escrita.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const AJUDA = `uso: node tools/modelar/perfil-da-execucao.mjs <peça> --executar | --perfil [--topo=20] [--json]
     node tools/modelar/perfil-da-execucao.mjs --acervo [--json]
  --executar  imprime o tempo de executarReceita sozinha (ms); rode num processo novo por medida
  --perfil    tempo por passo e por operação, grafo de leitura e sequências de subtrair da peça
  --acervo    grafo de leitura e sequências de subtrair de todas as peças, sem executar nada
  --topo=N    quantos passos mais caros listar (padrão 20)
  --json      saída em JSON`;

async function receitaDaPeca(peca, raiz = REPO) {
  return receitaDoModulo(await importarReceita(resolverCaminhoReceita(peca, { raiz })));
}

/** O grafo de leitura e as sequências de uma lista de passos, pelo manifesto do registro da receita. */
export function analiseEstatica(receita, registro = REGISTRO_DA_RECEITA) {
  const passos = receita.PASSOS;
  const opcoes = { manifesto: registro.manifesto, aliases: receita.ALIASES ?? [] };
  const analise = analisarPassos(passos, opcoes);
  return {
    totais: totaisDoGrafo(analise),
    porOperacao: resumoPorOperacao(analise),
    estritas: sequenciasDeSubtrair(passos, { ...opcoes, modo: 'estrita' }),
    relaxadas: sequenciasDeSubtrair(passos, { ...opcoes, modo: 'relaxada' }),
  };
}

/** O tempo de `executarReceita` sozinha, em ms. */
export function medirExecucao(receita, opcoes = {}) {
  const t0 = performance.now();
  const { neutro } = executarReceita(receita, opcoes);
  return { ms: performance.now() - t0, faces: neutro.F.size };
}

/** Executa a receita com o cronometrador e devolve o perfil por passo e por operação mais a análise estática. */
export async function perfilarReceita(receita, { topo = 20 } = {}) {
  const { registroCronometrado } = await import('./descrever-peca.mjs');
  const tempos = new Map();
  const cronometro = registroCronometrado(REGISTRO_DA_RECEITA, { total: receita.PASSOS.length, tempos, aoPasso: null });
  const rastreio = new Map();
  const t0 = performance.now();
  const { entrada, neutro } = executarReceita(receita, {
    registroOperacoes: cronometro.registro,
    aoRastrear: (i, op, ms) => rastreio.set(i, { op, ms }),
  });
  cronometro.fechar(entrada.PASSOS);
  const totalMs = performance.now() - t0;
  const estatica = analiseEstatica(receita);
  const soma = (seqs) => seqs.map((s) => ({ ...s, ms: tempoDosPassos(tempos, s.passos) }));
  return {
    faces: neutro.F.size,
    totalMs,
    cronometrado: tempos.size > 0,
    perfil: resumirPerfil(tempos, { maisCaros: topo }),
    /* o que cada operação gasta só no rastreio do retrato (`aoRastrear` do núcleo), contra o que gasta no passo todo */
    rastreio: resumirPerfil(rastreio, { maisCaros: 0 }).porOperacao,
    grafo: estatica,
    estritas: soma(estatica.estritas),
    relaxadas: soma(estatica.relaxadas),
  };
}

/** Os nomes das receitas de passos do acervo, as partes das montagens como `<objeto>/<parte>`. */
export function pecasDoAcervo({ raiz = REPO } = {}) {
  const base = resolve(raiz, 'procedural/pecas');
  const pecas = [];
  for (const f of readdirSync(base).filter((n) => !n.startsWith('.') && !n.endsWith('.md')).sort()) {
    /* a montagem é uma pasta sem receita própria, com cada parte em `partes/<parte>/receita.js` */
    if (!existsSync(resolve(base, f, 'receita.js')) && existsSync(resolve(base, f, 'partes'))) {
      for (const parte of readdirSync(resolve(base, f, 'partes')).sort()) if (existsSync(resolve(base, f, 'partes', parte, 'receita.js'))) pecas.push(`${f}/${parte}`);
    } else pecas.push(f);
  }
  return pecas;
}

/** `pecas` limita a análise a uma amostra (a lista inteira por padrão). */
export async function analiseDoAcervo({ raiz = REPO, pecas = pecasDoAcervo({ raiz }) } = {}) {
  const saida = [];
  for (const peca of pecas) {
    let receita;
    try { receita = await receitaDaPeca(peca, raiz); } catch { saida.push({ peca, erro: 'não carregou' }); continue; }
    if (!Array.isArray(receita.PASSOS)) { saida.push({ peca, erro: 'sem PASSOS' }); continue; }
    saida.push({ peca, passos: receita.PASSOS.length, ...analiseEstatica(receita) });
  }
  return saida;
}

const ms = (x) => `${(x / 1000).toFixed(2).replace('.', ',')} s`;
const pct = (x) => `${(x * 100).toFixed(1).replace('.', ',')}%`;

function textoDoPerfil(peca, r) {
  const L = [`perfil da execução de ${peca}: ${r.perfil.passos} passos, ${r.faces} faces, ${ms(r.totalMs)} no total (${ms(r.perfil.totalMs)} nos passos)`];
  L.push('', 'soma por operação (ms, passos, parte do total dos passos)');
  for (const o of r.perfil.porOperacao) L.push(`  ${o.op.padEnd(22)} ${String(Math.round(o.ms)).padStart(8)} ms  ${String(o.passos).padStart(4)} passos  ${pct(o.parte).padStart(7)}  maior ${Math.round(o.maiorMs)} ms`);
  L.push('', `os ${r.perfil.maisCaros.length} passos mais caros`);
  for (const p of r.perfil.maisCaros) L.push(`  passo ${String(p.i).padStart(4)}  ${p.op.padEnd(22)} ${String(Math.round(p.ms)).padStart(8)} ms`);
  L.push('', `rastreio do retrato por operação (ms no rastreio de ${Math.round(r.rastreio.reduce((x, o) => x + o.ms, 0))} ms ao todo)`);
  for (const o of r.rastreio) L.push(`  ${o.op.padEnd(22)} ${String(Math.round(o.ms)).padStart(8)} ms  ${String(o.passos).padStart(4)} passos`);
  const t = r.grafo.totais;
  L.push('', `grafo: ${t.passos} passos, ${t.criadoras} criadores, ${t.leMalha} leem a malha, ${t.leituraDeclarada} com leitura declarada, ${t.barreiras} barreiras, ${t.leituraExtraivel} com leitura extraível dos argumentos, ${t.leituraDinamica} dinâmicos`);
  L.push(`sequências de subtrair: ${r.estritas.length} estritas, ${r.relaxadas.length} relaxadas`);
  for (const s of r.relaxadas) L.push(`  passos ${s.inicio}..${s.fim}: ${s.tamanho} cortes, ${s.ferramentas} ferramentas, ${s.intermediarios} criadores no meio, dependem ${s.ferramentasDependem}, ${Math.round(s.ms)} ms`);
  return L.join('\n');
}

function textoDoAcervo(linhas) {
  const L = ['acervo: peça, passos, leem a malha, leitura declarada, barreiras, extraíveis, sequências estritas / relaxadas (tamanhos)'];
  for (const p of linhas) {
    if (p.erro) { L.push(`  ${p.peca.padEnd(28)} ${p.erro}`); continue; }
    const t = p.totais;
    L.push(`  ${p.peca.padEnd(28)} ${String(p.passos).padStart(4)} ${String(t.leMalha).padStart(4)} ${String(t.leituraDeclarada).padStart(3)} ${String(t.barreiras).padStart(4)} ${String(t.leituraExtraivel).padStart(4)}  ${p.estritas.length}/${p.relaxadas.length} (${p.relaxadas.map((s) => s.tamanho).join(',') || '-'})`);
  }
  return L.join('\n');
}

export async function principal(argv, { escrever = (t) => process.stdout.write(`${t}\n`) } = {}) {
  let lido;
  try {
    lido = lerArgumentos(argv, { opcoes: ['topo'], bandeiras: ['executar', 'perfil', 'acervo', 'json', 'ajuda'], posicional: { nome: 'a peça', obrigatorio: false } });
  } catch (erro) { escrever(erro.message); return 2; }
  if (lido.bandeira('ajuda')) { escrever(AJUDA); return 0; }
  const json = lido.bandeira('json');
  const saida = (obj, texto) => escrever(json ? JSON.stringify(obj, null, 2) : texto);
  if (lido.bandeira('acervo')) {
    const linhas = await analiseDoAcervo();
    saida(linhas, textoDoAcervo(linhas));
    return 0;
  }
  const peca = lido.posicional;
  if (!peca || (!lido.bandeira('executar') && !lido.bandeira('perfil'))) { escrever(`diga a peça e --executar ou --perfil, ou --acervo.\n${AJUDA}`); return 2; }
  const topo = Number(lido.opcao('topo') ?? 20);
  if (!Number.isInteger(topo) || topo < 1) { escrever(`--topo precisa ser inteiro >= 1, recebi '${lido.opcao('topo')}'.`); return 2; }
  const receita = await receitaDaPeca(peca);
  if (!Array.isArray(receita.PASSOS)) { escrever(`'${peca}' não exporta PASSOS; esta ferramenta mede só receita de passos.`); return 2; }
  if (lido.bandeira('executar')) {
    const r = medirExecucao(receita);
    saida({ peca, ...r }, `${r.ms.toFixed(0)}`);
    return 0;
  }
  const r = await perfilarReceita(receita, { topo });
  saida({ peca, ...r }, textoDoPerfil(peca, r));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; });
}
