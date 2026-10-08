#!/usr/bin/env node
/* roteiros.mjs — os invariantes e os roteiros de leitura por intenção, como dado.
 *
 * A fonte é `docs/mecanifica/roteiros/roteiros.json`. Dela saem duas páginas
 * geradas, `INVARIANTES.md` (a página curta que toda intenção lê) e
 * `ROTEIROS.md` (o que cada intenção lê antes, o que abre só quando a condição
 * aparece, a skill, os comandos e o que se confere no fim). O gate
 * `leitura:obrigatoria` usa as funções daqui para conferir que todo arquivo e
 * todo comando citado existe, que cada roteiro cabe no orçamento e que as duas
 * páginas estão em dia com o JSON.
 *
 *   npm run roteiros:gerar   regrava as duas páginas a partir do JSON
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA = 'docs/mecanifica/roteiros';
export const CAMINHO_JSON = `${PASTA}/roteiros.json`;
export const CAMINHO_INVARIANTES = `${PASTA}/INVARIANTES.md`;
export const CAMINHO_ROTEIROS = `${PASTA}/ROTEIROS.md`;

/* A frase do `quando` é uma linha de índice: passa disso, vira parágrafo e o índice deixa de ser lido de relance. */
export const TETO_DA_FRASE = 140;

const AVISO_GERADO = '<!-- Gerado de roteiros.json por `npm run roteiros:gerar`. Não edite à mão. -->';

export function carregarRoteiros(raiz = RAIZ) {
  return JSON.parse(readFileSync(join(raiz, CAMINHO_JSON), 'utf8'));
}

function scriptsDoPacote(raiz) {
  return JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).scripts ?? {};
}

/* Um comando citado existe quando é `npm run <script>` de um script do package.json, ou `node <arquivo>` de um arquivo do
   repositório. O resto da linha (argumentos, marcadores como <arquivo>) não se confere. */
function problemaDoComando(comando, scripts, raiz) {
  const npm = /^npm run ([^\s]+)/.exec(comando);
  if (npm) return scripts[npm[1]] ? null : `o script "${npm[1]}" não existe no package.json`;
  const node = /^node ([^\s]+)/.exec(comando);
  if (node) return existsSync(join(raiz, node[1])) ? null : `o arquivo ${node[1]} não existe`;
  return 'o comando precisa começar por "npm run" ou "node"';
}

const textoCheio = (v) => typeof v === 'string' && v.trim() !== '';

/* Os problemas do JSON, um por linha, cada um dizendo o que corrigir. Lista vazia quando está tudo certo. */
export function validarRoteiros(dados, raiz = RAIZ) {
  const problemas = [];
  const scripts = scriptsDoPacote(raiz);
  const existe = (relativo) => existsSync(join(raiz, relativo));
  if (dados?.versao !== 1) problemas.push(`${CAMINHO_JSON}: "versao" deve ser 1.`);

  const idsInv = new Set();
  for (const [i, inv] of (dados?.invariantes ?? []).entries()) {
    const onde = `invariante ${inv?.id ?? `#${i + 1}`}`;
    if (!textoCheio(inv?.id)) problemas.push(`${onde}: falta o "id".`);
    else if (idsInv.has(inv.id)) problemas.push(`${onde}: "id" repetido.`);
    else idsInv.add(inv.id);
    if (!textoCheio(inv?.texto)) problemas.push(`${onde}: falta o "texto".`);
    if (inv?.gate !== null && !(typeof inv?.gate === 'string' && scripts[inv.gate])) {
      problemas.push(`${onde}: "gate" deve ser null ou um script do package.json (recebido ${JSON.stringify(inv?.gate)}).`);
    }
  }
  if (idsInv.size === 0) problemas.push(`${CAMINHO_JSON}: a lista "invariantes" está vazia.`);

  const ids = new Set();
  for (const [i, r] of (dados?.roteiros ?? []).entries()) {
    const onde = `roteiro ${r?.id ?? `#${i + 1}`}`;
    if (!textoCheio(r?.id)) problemas.push(`${onde}: falta o "id".`);
    else if (ids.has(r.id)) problemas.push(`${onde}: "id" repetido.`);
    else ids.add(r.id);
    for (const campo of ['intencao', 'titulo', 'quando', 'conferido']) {
      if (!textoCheio(r?.[campo])) problemas.push(`${onde}: falta "${campo}".`);
    }
    if (textoCheio(r?.quando) && r.quando.length > TETO_DA_FRASE) {
      problemas.push(`${onde}: o "quando" tem ${r.quando.length} caracteres, e a frase do índice cabe em ${TETO_DA_FRASE}.`);
    }
    const ler = Array.isArray(r?.ler) ? r.ler : [];
    if (ler.length === 0) problemas.push(`${onde}: a lista "ler" está vazia.`);
    if (!ler.includes(CAMINHO_INVARIANTES)) problemas.push(`${onde}: "ler" precisa incluir ${CAMINHO_INVARIANTES}, que toda intenção lê.`);
    for (const relativo of ler) if (!existe(relativo)) problemas.push(`${onde}: ${relativo} não existe (corrija o caminho em "ler" ou tire a linha).`);
    for (const item of r?.sobDemanda ?? []) {
      if (!textoCheio(item?.arquivo) || !existe(item.arquivo)) problemas.push(`${onde}: ${item?.arquivo} de "sobDemanda" não existe.`);
      if (!textoCheio(item?.quando)) problemas.push(`${onde}: ${item?.arquivo} de "sobDemanda" não diz "quando" abrir.`);
      if (ler.includes(item?.arquivo)) problemas.push(`${onde}: ${item.arquivo} está em "ler" e em "sobDemanda".`);
    }
    if (r?.skill !== null && !(textoCheio(r?.skill) && existe(`.claude/skills/${r.skill}/SKILL.md`))) {
      problemas.push(`${onde}: a skill ${JSON.stringify(r?.skill)} não existe em .claude/skills/.`);
    }
    for (const comando of r?.comandos ?? []) {
      const p = problemaDoComando(comando, scripts, raiz);
      if (p) problemas.push(`${onde}: o comando "${comando}" não serve: ${p}.`);
    }
    if (!Number.isInteger(r?.orcamentoBytes) || r.orcamentoBytes <= 0) problemas.push(`${onde}: "orcamentoBytes" deve ser um inteiro positivo.`);
    const base = r?.linhaDeBase;
    if (!(Number.isInteger(base?.bytes) && base.bytes > 0 && /^\d{4}-\d{2}-\d{2}$/.test(base?.data ?? ''))) {
      problemas.push(`${onde}: "linhaDeBase" deve ser { "bytes": inteiro, "data": "AAAA-MM-DD" }.`);
    }
  }
  if (ids.size === 0) problemas.push(`${CAMINHO_JSON}: a lista "roteiros" está vazia.`);
  return problemas;
}

/* O tamanho de cada arquivo de "ler" e o total, em bytes. Arquivo que não existe conta 0 (a validação já o aponta). */
export function medirRoteiro(roteiro, raiz = RAIZ) {
  const arquivos = roteiro.ler.map((relativo) => {
    const caminho = join(raiz, relativo);
    return { relativo, bytes: existsSync(caminho) ? statSync(caminho).size : 0 };
  });
  return { arquivos, total: arquivos.reduce((soma, a) => soma + a.bytes, 0) };
}

const milhar = (n) => n.toLocaleString('pt-BR');
const codigo = (s) => `\`${s}\``;

export function gerarInvariantes(dados) {
  const linhas = dados.invariantes.map((inv, i) => `${i + 1}. ${inv.texto}${inv.gate ? ` O gate ${codigo(inv.gate)} confere.` : ''}`);
  return [
    '# Invariantes',
    '',
    AVISO_GERADO,
    '',
    'Valem para toda intenção e se leem sempre, antes do roteiro da tarefa, que está em',
    '[`ROTEIROS.md`](ROTEIROS.md). O invariante que tem gate é conferido por ele; os outros só',
    'valem se forem lidos e lembrados.',
    '',
    ...linhas,
    '',
  ].join('\n');
}

export function gerarRoteirosMd(dados) {
  const partes = [
    '# Roteiros de leitura por intenção',
    '',
    AVISO_GERADO,
    '',
    'Cada roteiro diz o que ler antes de começar, o que abrir só quando a condição aparecer, a',
    'skill, os comandos e o que se confere no fim. Todo roteiro começa pelos',
    '[invariantes](INVARIANTES.md). `npm run leitura:obrigatoria` imprime o tamanho da leitura de',
    'cada roteiro contra o orçamento, e o gate recusa o roteiro que passa dele. O `AGENTS.md` faz',
    'para outros agentes o papel do `CLAUDE.md` e não entra na soma.',
    '',
    '| roteiro | intenção | quando |',
    '| --- | --- | --- |',
    ...dados.roteiros.map((r) => `| ${codigo(r.id)} | ${r.intencao} | ${r.quando} |`),
  ];
  for (const r of dados.roteiros) {
    partes.push('', `## ${r.id}: ${r.titulo}`, '', r.quando, '');
    partes.push(`Ler antes de começar, num orçamento de ${milhar(r.orcamentoBytes)} bytes (linha de base de ${milhar(r.linhaDeBase.bytes)} bytes em ${r.linhaDeBase.data}):`, '');
    for (const relativo of r.ler) partes.push(`- ${codigo(relativo)}`);
    if ((r.sobDemanda ?? []).length > 0) {
      partes.push('', 'Abrir só quando a condição aparecer:', '');
      for (const item of r.sobDemanda) partes.push(`- ${codigo(item.arquivo)}, quando ${item.quando}.`);
    }
    partes.push('');
    if (r.skill) partes.push(`Skill: ${codigo(r.skill)}.`, '');
    if ((r.comandos ?? []).length > 0) partes.push(`Comandos: ${r.comandos.map(codigo).join(', ')}.`, '');
    partes.push(`Conferido no fim: ${r.conferido}`);
  }
  return `${partes.join('\n')}\n`;
}

/* As páginas geradas que diferem do que está no disco: [{ relativo, esperado }]. */
export function paginasDesatualizadas(dados, raiz = RAIZ) {
  return [
    { relativo: CAMINHO_INVARIANTES, esperado: gerarInvariantes(dados) },
    { relativo: CAMINHO_ROTEIROS, esperado: gerarRoteirosMd(dados) },
  ].filter(({ relativo, esperado }) => {
    const caminho = join(raiz, relativo);
    return !existsSync(caminho) || readFileSync(caminho, 'utf8') !== esperado;
  });
}

function executar() {
  const dados = carregarRoteiros();
  if (process.argv.includes('--gerar')) {
    writeFileSync(join(RAIZ, CAMINHO_INVARIANTES), gerarInvariantes(dados));
    writeFileSync(join(RAIZ, CAMINHO_ROTEIROS), gerarRoteirosMd(dados));
    console.log(`gravados ${CAMINHO_INVARIANTES} e ${CAMINHO_ROTEIROS}`);
    return;
  }
  console.error('uso: npm run roteiros:gerar (a conferência é o gate leitura:obrigatoria)');
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
