/* leituras.mjs — anota o que cada arquivo de teste lê do repositório enquanto roda, para o seletor saber que testes uma
 * mudança fora do grafo de imports afeta.
 *
 * Medido em 2026-10-28: uma mudança só em `docs/MAPA.md` fez a bateria rodar todos os testes rápidos e lentos, 26 minutos,
 * porque o grafo de imports não acompanha arquivo lido pelo caminho e alguns testes leem documento, JSON do banco de provas
 * ou o arquivo de um agente. Declarar à mão o que cada um dos 360 arquivos de teste lê envelheceria no primeiro teste novo.
 * Aqui a leitura é observada: a bateria liga GATES_LEITURAS_DIR, o `vitest.config.ts` carrega este arquivo como setupFile, e
 * as funções de leitura do `fs` passam a anotar cada caminho do repositório lido, listado ou consultado. Os processos node que
 * o teste sobe herdam a anotação por NODE_OPTIONS. Um teste que roda `git` na raiz, ou um programa que não é node (Blender,
 * Python, shell), lê o que não dá para ver daqui e fica marcado como quem lê tudo.
 *
 * O registro de cada arquivo de teste vai para `<GATES_LEITURAS_DIR>/<hash>.jsonl`, uma linha por caminho novo, gravada na
 * hora, para sobreviver ao processo morto por sinal, como o servidor de desenvolvimento que o teste encerra. */
import { createHash } from 'node:crypto';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ESTE_ARQUIVO = fileURLToPath(import.meta.url);

/* O Chromium do Playwright não lê arquivo do repositório sozinho: recebe a página do teste ou do servidor de desenvolvimento,
   que é node e é anotado. Medido em 2026-10-28: contá-lo como quem lê tudo punha 21 dos 24 lentos em toda mudança de dado. Vale
   também ao ler um registro gravado antes desta regra. */
export const ehNavegador = (programa) => /^(headless_shell|chrome|chromium|chrome-headless-shell)$/.test(basename(programa)) || /ms-playwright/.test(programa);
const RAIZ = resolve(dirname(ESTE_ARQUIVO), '../..');
const FORA = /^(node_modules|\.git|tmp|dist)(\/|$)/;

/* `git status`, `rev-parse` e `config` dizem o estado da árvore, e `git log` sem patch lê o histórico já gravado (a data do
   último commit, em `tools/bancadas/versao-publicada.mjs`); nenhum lê o conteúdo de um arquivo mudado. O resto do git na raiz
   conta como quem lê tudo. Vale também ao ler um registro gravado antes desta regra. */
const GIT_SEM_CONTEUDO = ['status', 'rev-parse', 'config', '--version', 'log'];
export const gitLeConteudo = (args) => {
  const sub = args.find((a) => !a.startsWith('-'));
  return !GIT_SEM_CONTEUDO.includes(sub) || args.some((a) => /^(-p|--patch|--stat|--numstat|-L)/.test(a));
};

export const arquivoDoRegistro = (diretorio, teste) => join(diretorio, `${createHash('sha1').update(teste).digest('hex').slice(0, 16)}.jsonl`);

/* Instala as anotações neste processo. `destino` é o .jsonl do arquivo de teste. */
let destinoAtual = null;
let vistos = new Set();

export function instalar(destino) {
  /* Instalado de novo no mesmo processo (o processo filho herda a anotação e o teste dele a liga para outro registro), só
     troca o destino. */
  if (destinoAtual !== destino) vistos = new Set();
  destinoAtual = destino;
  if (globalThis.__leiturasInstaladas) return;
  globalThis.__leiturasInstaladas = true;
  const anotar = (tipo, caminho) => {
    const chave = `${tipo} ${caminho}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    try { appendFileSync(destinoAtual, `${JSON.stringify({ [tipo]: caminho })}\n`); } catch { /* sem registro, o seletor roda o modo inteiro */ }
  };
  const appendFileSync = fs.appendFileSync;
  const existe = fs.existsSync;
  const relativoDaRaiz = (alvo) => {
    if (typeof alvo === 'number' || alvo == null) return null;
    let caminho = alvo instanceof URL ? fileURLToPath(alvo) : Buffer.isBuffer(alvo) ? alvo.toString() : String(alvo);
    if (caminho.startsWith('file:')) caminho = fileURLToPath(caminho);
    const rel = relative(RAIZ, isAbsolute(caminho) ? caminho : resolve(caminho)).split('\\').join('/');
    if (!rel || rel.startsWith('..') || isAbsolute(rel) || FORA.test(rel)) return null;
    return rel;
  };
  const embrulhar = (alvo, nomes, tipo) => {
    for (const nome of nomes) {
      const original = alvo[nome];
      if (typeof original !== 'function') continue;
      alvo[nome] = function anotado(caminho, ...resto) {
        const rel = relativoDaRaiz(caminho);
        if (rel !== null) anotar(tipo, rel);
        return original.call(this, caminho, ...resto);
      };
    }
  };
  /* Três tipos: 'a' lê o conteúdo, 'e' só consulta se existe (stat, exists, access) e 'd' lista a pasta. A consulta e a listagem
     só mudam de resposta quando um arquivo aparece ou some. Medido em 2026-10-28: o servidor do Vite que os testes do MCP sobem
     percorre o repositório inteiro e consulta 14 mil caminhos sem ler nenhum documento, e isso punha os dois testes, 60 s, em
     toda mudança de documento. */
  embrulhar(fs, ['readFileSync', 'readFile', 'openSync', 'open', 'createReadStream'], 'a');
  embrulhar(fs, ['existsSync', 'statSync', 'lstatSync', 'stat', 'lstat', 'accessSync', 'access'], 'e');
  embrulhar(fs, ['readdirSync', 'readdir', 'opendirSync', 'opendir'], 'd');
  embrulhar(fs.promises, ['readFile', 'open'], 'a');
  embrulhar(fs.promises, ['stat', 'lstat', 'access'], 'e');
  embrulhar(fs.promises, ['readdir', 'opendir'], 'd');

  /* Os processos filhos: node herda a anotação; git na raiz e qualquer outro programa contam como quem lê tudo. */
  const gancho = `--import ${pathToFileURL(ESTE_ARQUIVO).href}`;
  const comAnotacao = (env) => {
    const base = env ?? process.env;
    const opcoes = base.NODE_OPTIONS ?? '';
    return { ...base, GATES_LEITURAS_DESTINO: destinoAtual, NODE_OPTIONS: opcoes.includes(gancho) ? opcoes : `${opcoes} ${gancho}`.trim() };
  };
  const ehNode = (programa) => ['node', 'npm', 'npx', 'vitest', 'vite', 'tsx'].includes(basename(programa).replace(/\.(cmd|exe)$/, '')) || programa === process.execPath;
  const examinar = (comando, args, opcoes) => {
    const naRaiz = relativoDaRaiz(opcoes?.cwd ?? process.cwd()) !== null || resolve(opcoes?.cwd ?? process.cwd()) === RAIZ;
    const palavras = String(comando).trim().split(/\s+/);
    const programa = palavras[0];
    const todos = [...palavras.slice(1), ...(args ?? [])].filter((a) => typeof a === 'string');
    if (basename(programa) === 'git') { if (naRaiz && gitLeConteudo(todos)) anotar('t', `git ${todos.join(' ')}`.slice(0, 120)); }
    /* Outro programa (Python, Blender) lê o arquivo que recebe e os vizinhos dele: medido em 2026-10-28, os scripts de
       `tools/blender` abrem o que vem no argumento e o `grade.json` ou o `.json` ao lado. Vale o arquivo e a pasta dele. */
    const outro = !ehNode(programa) && !ehNavegador(programa) && basename(programa) !== 'git';
    for (const a of todos) {
      const rel = !a.startsWith('-') ? relativoDaRaiz(resolve(opcoes?.cwd ?? process.cwd(), a)) : null;
      if (!rel || !existe(join(RAIZ, rel))) continue;
      anotar('a', rel);
      if (outro) anotar('d', dirname(rel) === '.' ? '' : dirname(rel));
    }
  };
  for (const nome of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) {
    const original = childProcess[nome];
    childProcess[nome] = function anotado(comando, args, opcoes, ...resto) {
      if (!Array.isArray(args)) { resto.unshift(opcoes); opcoes = args; args = []; }
      if (opcoes !== null && typeof opcoes === 'object' && !Array.isArray(opcoes)) opcoes = { ...opcoes, env: comAnotacao(opcoes.env) };
      else { if (opcoes !== undefined) resto.unshift(opcoes); opcoes = { env: comAnotacao() }; }
      examinar(comando, args, opcoes);
      return original.call(this, comando, args, opcoes, ...resto);
    };
  }
  for (const nome of ['exec', 'execSync']) {
    const original = childProcess[nome];
    childProcess[nome] = function anotado(comando, opcoes, ...resto) {
      if (typeof opcoes === 'function') { resto.unshift(opcoes); opcoes = {}; }
      opcoes = { ...(opcoes ?? {}), env: comAnotacao(opcoes?.env) };
      examinar(comando, [], opcoes);
      return original.call(this, comando, opcoes, ...resto);
    };
  }
  const forkOriginal = childProcess.fork;
  childProcess.fork = function anotado(modulo, args, opcoes) {
    if (!Array.isArray(args)) { opcoes = args; args = []; }
    return forkOriginal.call(this, modulo, args, { ...(opcoes ?? {}), env: comAnotacao(opcoes?.env) });
  };
  syncBuiltinESMExports();
}

/* Processo filho com NODE_OPTIONS: instala com o destino herdado. */
if (process.env.GATES_LEITURAS_DESTINO) instalar(process.env.GATES_LEITURAS_DESTINO);

/* Lê o registro de um diretório: { teste: { arquivos: Set, pastas: Set, tudo: bool } }. */
export function lerLeituras(diretorio) {
  const registro = {};
  let nomes = [];
  try { nomes = fs.readdirSync(diretorio).filter((n) => n.endsWith('.jsonl')); } catch { return registro; }
  for (const nome of nomes) {
    let teste = null; const entrada = { arquivos: new Set(), existencias: new Set(), pastas: new Set(), tudo: false };
    for (const linha of fs.readFileSync(join(diretorio, nome), 'utf8').split('\n')) {
      if (!linha) continue;
      try {
        const l = JSON.parse(linha);
        if (l.teste) teste = l.teste;
        else if ('a' in l) entrada.arquivos.add(l.a);
        else if ('e' in l) entrada.existencias.add(l.e);
        else if ('d' in l) entrada.pastas.add(l.d);
        else if (l.t && !ehNavegador(l.t) && !(l.t.startsWith('git ') && !gitLeConteudo(l.t.split(' ').slice(1)))) entrada.tudo = true;
      } catch { entrada.tudo = true; }
    }
    if (teste) registro[teste] = entrada;
  }
  return registro;
}

/* Os testes cujo registro diz ler algum dos caminhos: o conteúdo dele, ou, se ele apareceu ou sumiu (`estruturais`), a
   consulta a ele ou a listagem da pasta dele; ou quem lê tudo. */
export function testesQueLeem(registro, caminhos, estruturais = caminhos) {
  const pasta = (c) => (dirname(c) === '.' ? '' : dirname(c));
  return Object.keys(registro).filter((teste) => {
    const r = registro[teste];
    return r.tudo || caminhos.some((c) => r.arquivos.has(c)
      || (estruturais.includes(c) && ((r.existencias?.has(c) ?? false) || r.pastas.has(pasta(c)))));
  }).sort();
}
