#!/usr/bin/env node
/* reguas-de-texto.mjs — duas regras do contrato que viviam só em texto, agora contadas como catraca (análise do projeto de
 * 2026-11-26, documentacao.md, recomendação 5): o negrito no meio do texto nos documentos de instrução, e o nome de objeto
 * (carro, carroceria, lataria, veículo...) no código do núcleo, que não conhece domínio de objeto. A contagem de cada arquivo
 * não pode subir acima da linha de base gravada, e arquivo novo nasce com zero; quem baixa a contagem grava a linha de base nova.
 *
 * O negrito que abre a linha (o rótulo `**Estado:**` de um plano, o termo definido no começo de um item) não conta; conta o que
 * está no meio da frase. No núcleo contam também os comentários, porque o comentário é onde o domínio entra primeiro; os testes
 * do núcleo ficam de fora, porque provam a operação com um objeto de exemplo.
 *
 * Uso: npm run reguas:texto:check             confere contra a linha de base
 *      node tools/reguas-de-texto/reguas-de-texto.mjs --gravar   grava a linha de base de hoje (só desce)
 *      --ajuda                                  mostra esta ajuda */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const LINHA_DE_BASE = join(RAIZ, 'tools/reguas-de-texto/linha-de-base.json');

export const DOCUMENTOS_DE_INSTRUCAO = /(^|\/)(CLAUDE|AGENTS)\.md$|^\.claude\/.*\.md$|^docs\/modelar\/(usar|guias|contratos)\/.*\.md$|^docs\/COMECE-AQUI\.md$/;
export const CODIGO_DO_NUCLEO = /^procedural\/nucleo\/.*\.js$/;
/* a borda da palavra pela letra Unicode, porque o `\b` do JavaScript não vê o fim de `sedã` */
export const TERMOS_DE_OBJETO = /(?<!\p{L})(carroceria|lataria|ve[ií]culos?|carros?|autom[oó]ve(l|is)|sed[ãa]s?|furg[ãa]o|furg[õo]es|caminh[ãa]o|caminh[õo]es)(?!\p{L})/giu;

/** Os trechos em negrito no meio do texto: fora de bloco de código, sem contar o que abre a linha (depois de marcador de lista). */
export function negritoNoMeio(texto) {
  let n = 0; let emCodigo = false;
  for (const linha of texto.split('\n')) {
    if (/^\s*```/.test(linha)) { emCodigo = !emCodigo; continue; }
    if (emCodigo) continue;
    const semCodigo = linha.replace(/`[^`]*`/g, '');
    const corpo = semCodigo.replace(/^\s*(?:[-*+]|\d+\.)?\s*\*\*[^*]+\*\*/, '');
    n += (corpo.match(/\*\*[^*\s][^*]*\*\*/g) ?? []).length;
  }
  return n;
}

/** As ocorrências de nome de objeto num arquivo do núcleo. */
export function termosDeObjeto(texto) {
  return (texto.match(TERMOS_DE_OBJETO) ?? []).length;
}

/** A conta de hoje: { negrito: {arquivo: n}, dominio: {arquivo: n} }, só com os arquivos acima de zero. */
export function contar(arquivos, ler) {
  const negrito = {}; const dominio = {};
  for (const a of arquivos) {
    if (DOCUMENTOS_DE_INSTRUCAO.test(a)) { const n = negritoNoMeio(ler(a)); if (n) negrito[a] = n; }
    if (CODIGO_DO_NUCLEO.test(a) && !/\.test\./.test(a)) { const n = termosDeObjeto(ler(a)); if (n) dominio[a] = n; }
  }
  return { negrito, dominio };
}

/** Os arquivos cuja conta subiu acima da linha de base (arquivo ausente na base vale zero). */
export function acimaDaBase(hoje, base) {
  const saida = [];
  for (const regra of ['negrito', 'dominio']) {
    for (const [arquivo, n] of Object.entries(hoje[regra])) {
      const antes = base[regra]?.[arquivo] ?? 0;
      if (n > antes) saida.push({ regra, arquivo, antes, n });
    }
  }
  return saida;
}

function principal(argv) {
  if (argv.includes('--ajuda')) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => / \* (Uso|     )/.test(l)).map((l) => l.slice(3)).join('\n'));
    return 0;
  }
  /* os arquivos rastreados e os novos ainda sem registro, para a régua ver o arquivo que o agente criou antes do commit */
  const arquivos = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean).filter((a) => existsSync(join(RAIZ, a)));
  const hoje = contar(arquivos, (a) => readFileSync(join(RAIZ, a), 'utf8'));
  const base = existsSync(LINHA_DE_BASE) ? JSON.parse(readFileSync(LINHA_DE_BASE, 'utf8')) : { negrito: {}, dominio: {} };
  const soma = (o) => Object.values(o).reduce((x, y) => x + y, 0);
  if (argv.includes('--gravar')) {
    const subiu = acimaDaBase(hoje, base);
    if (existsSync(LINHA_DE_BASE) && subiu.length) {
      console.error('reguas:texto — a linha de base só desce; estes subiram, corrija antes de gravar:');
      for (const s of subiu) console.error(`  ${s.regra}: ${s.arquivo} de ${s.antes} para ${s.n}`);
      return 1;
    }
    writeFileSync(LINHA_DE_BASE, `${JSON.stringify({ negrito: hoje.negrito, dominio: hoje.dominio }, null, 1)}\n`);
    console.log(`reguas:texto — linha de base gravada: ${soma(hoje.negrito)} negrito(s) no meio do texto, ${soma(hoje.dominio)} nome(s) de objeto no núcleo.`);
    return 0;
  }
  const subiu = acimaDaBase(hoje, base);
  if (!subiu.length) {
    console.log(`reguas:texto:check ok — ${soma(hoje.negrito)} negrito(s) no meio do texto (base ${soma(base.negrito)}), ${soma(hoje.dominio)} nome(s) de objeto no núcleo (base ${soma(base.dominio)}).`);
    return 0;
  }
  console.error('reguas:texto:check FALHOU — a contagem subiu acima da linha de base:');
  for (const s of subiu) {
    console.error(`  ${s.regra === 'negrito' ? 'negrito no meio do texto' : 'nome de objeto no núcleo'}: ${s.arquivo}, ${s.n} contra ${s.antes} na base`);
  }
  console.error('Escreva sem negrito no meio da frase, e no núcleo sem nome de objeto (o que só serve a um objeto é opção declarada). Se baixou');
  console.error('a contagem de outro arquivo, grave a base nova: node tools/reguas-de-texto/reguas-de-texto.mjs --gravar');
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = principal(process.argv.slice(2));
