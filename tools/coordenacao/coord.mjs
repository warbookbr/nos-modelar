#!/usr/bin/env node
/* coord.mjs — caixa postal local, econômica e sem dependências para coordenar
   agentes em repositórios diferentes sem carregar histórico ou diffs inteiros. */
import {
  existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_REPO = resolve(AQUI, '..', '..');
export const RAIZ_PADRAO = resolve(RAIZ_REPO, '..', 'Mecanifica-coord');
const TIPOS = new Set(['intencao', 'entrega', 'bloqueio', 'decisao', 'estado']);

export class ErroCoordenacao extends Error {}

function falhar(mensagem) {
  throw new ErroCoordenacao(mensagem);
}

function slug(valor, campo) {
  if (!valor || !/^[a-z0-9][a-z0-9._-]*$/i.test(valor)) {
    falhar(`${campo} precisa usar somente letras, números, ponto, _ ou -.`);
  }
  return valor;
}

function agora() {
  return new Date().toISOString();
}

function idCurto() {
  return randomUUID().replaceAll('-', '').slice(0, 12);
}

function serializar(valor) {
  return `${JSON.stringify(valor, null, 2)}\n`;
}

function escreverAtomico(caminho, valor) {
  mkdirSync(dirname(caminho), { recursive: true });
  const temporario = `${caminho}.${process.pid}.${idCurto()}.tmp`;
  writeFileSync(temporario, serializar(valor), { encoding: 'utf8', flag: 'wx' });
  renameSync(temporario, caminho);
}

function lerJson(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

function arquivosJson(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith('.json'))
    .map((nome) => join(pasta, nome));
}

function normalizarLista(valor) {
  if (Array.isArray(valor)) return [...new Set(valor.map((item) => String(item).trim()).filter(Boolean))].sort();
  if (!valor) return [];
  return normalizarLista(String(valor).split(','));
}

function caminhoMensagem(raiz, mensagem) {
  const prefixo = mensagem.criadaEm.replaceAll(':', '').replaceAll('.', '');
  return join(raiz, 'mensagens', `${prefixo}__${mensagem.id}.json`);
}

function acharMensagem(raiz, id) {
  slug(id, 'id');
  const achados = arquivosJson(join(raiz, 'mensagens')).filter((caminho) => caminho.endsWith(`__${id}.json`));
  if (achados.length !== 1) falhar(`mensagem '${id}' não encontrada.`);
  return achados[0];
}

function git(cwd, argumentos, opcional = false) {
  try {
    return execFileSync('git', ['-c', `safe.directory=${resolve(cwd).replaceAll('\\', '/')}`, ...argumentos], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (erro) {
    if (opcional) return null;
    falhar(`git falhou em '${cwd}': ${erro.stderr?.trim() || erro.message}`);
  }
}

export function estadoGit(cwd, base = null) {
  const pasta = resolve(cwd);
  const branch = git(pasta, ['branch', '--show-current']) || '(destacado)';
  const head = git(pasta, ['rev-parse', 'HEAD']);
  const remoto = git(pasta, ['remote', 'get-url', 'origin'], true);
  const status = git(pasta, ['status', '--short']) || '';
  let diffStat = '';
  if (base) {
    git(pasta, ['rev-parse', '--verify', `${base}^{commit}`]);
    diffStat = git(pasta, ['diff', '--stat', `${base}..${head}`]) || '(sem diferença commitada)';
  } else if (status) {
    diffStat = git(pasta, ['diff', '--stat', 'HEAD']) || '(somente arquivos novos ou mudanças de índice)';
  }
  return { pasta, remoto, branch, base, head, sujo: Boolean(status), status, diffStat };
}

export function inicializar(raiz = RAIZ_PADRAO, configuracao = {}) {
  const destino = resolve(raiz);
  for (const pasta of ['mensagens', 'confirmacoes', 'reservas']) mkdirSync(join(destino, pasta), { recursive: true });
  const configPath = join(destino, 'config.json');
  if (!existsSync(configPath)) {
    escreverAtomico(configPath, {
      formato: 'mecanifica.coordenacao-local', versao: 1,
      criadaEm: agora(), repositorios: configuracao.repositorios ?? {
        warbook: RAIZ_REPO,
        brigsd: resolve(RAIZ_REPO, '..', 'brigsd-Mecanifica'),
      },
    });
  }
  return destino;
}

export function enviarMensagem({
  raiz = RAIZ_PADRAO, de, para = 'todos', tipo, corpo = '', repoPath = null,
  base = null, arquivos = [], identidades = [], assunto = '', respondeA = null,
} = {}) {
  inicializar(raiz);
  slug(de, 'de');
  slug(para, 'para');
  if (!TIPOS.has(tipo)) falhar(`tipo precisa ser: ${[...TIPOS].join(', ')}.`);
  if (!corpo.trim() && !assunto.trim()) falhar('informe assunto ou corpo.');
  const criadaEm = agora();
  const mensagem = {
    formato: 'mecanifica.mensagem-coordenacao', versao: 1,
    id: idCurto(), criadaEm, de, para, tipo,
    assunto: assunto.trim(), corpo: corpo.trim(),
    respondeA: respondeA || null,
    arquivos: normalizarLista(arquivos), identidades: normalizarLista(identidades),
    git: repoPath ? estadoGit(repoPath, base) : null,
  };
  escreverAtomico(caminhoMensagem(resolve(raiz), mensagem), mensagem);
  return mensagem;
}

export function listarInbox({ raiz = RAIZ_PADRAO, agente, todas = false, limite = 20 } = {}) {
  slug(agente, 'agente');
  const confirmacoes = join(resolve(raiz), 'confirmacoes', agente);
  return arquivosJson(join(resolve(raiz), 'mensagens'))
    .map(lerJson)
    .filter((m) => m.para === agente || m.para === 'todos')
    .filter((m) => todas || !existsSync(join(confirmacoes, `${m.id}.json`)))
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
    .slice(0, limite);
}

export function lerMensagem({ raiz = RAIZ_PADRAO, id } = {}) {
  return lerJson(acharMensagem(resolve(raiz), id));
}

export function confirmarMensagem({ raiz = RAIZ_PADRAO, agente, id } = {}) {
  slug(agente, 'agente');
  const mensagem = lerMensagem({ raiz, id });
  if (mensagem.para !== agente && mensagem.para !== 'todos') {
    falhar(`mensagem '${id}' não foi destinada a '${agente}'.`);
  }
  const caminho = join(resolve(raiz), 'confirmacoes', agente, `${id}.json`);
  if (!existsSync(caminho)) escreverAtomico(caminho, { id, agente, confirmadaEm: agora() });
  return mensagem;
}

function sobrepoeCaminho(a, b) {
  const x = a.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  const y = b.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

function reservasAtivas(raiz) {
  return arquivosJson(join(resolve(raiz), 'reservas')).map(lerJson).filter((r) => !r.liberadaEm);
}

export function reservar({ raiz = RAIZ_PADRAO, agente, repo, arquivos = [], identidades = [], objetivo = '' } = {}) {
  inicializar(raiz);
  slug(agente, 'agente');
  const listaArquivos = normalizarLista(arquivos);
  const listaIds = normalizarLista(identidades);
  if (!listaArquivos.length && !listaIds.length) falhar('a reserva exige arquivos ou identidades.');
  const conflitos = reservasAtivas(raiz).filter((r) => r.agente !== agente && (
    r.identidades.some((id) => listaIds.includes(id))
    || r.arquivos.some((existente) => listaArquivos.some((novo) => sobrepoeCaminho(existente, novo)))
  ));
  if (conflitos.length) {
    falhar(`reserva conflita com ${conflitos.map((r) => `${r.id} (${r.agente})`).join(', ')}.`);
  }
  const reserva = {
    formato: 'mecanifica.reserva-coordenacao', versao: 1, id: idCurto(),
    criadaEm: agora(), liberadaEm: null, agente, repo: repo || null,
    objetivo: objetivo.trim(), arquivos: listaArquivos, identidades: listaIds,
  };
  escreverAtomico(join(resolve(raiz), 'reservas', `${reserva.id}.json`), reserva);
  return reserva;
}

export function liberar({ raiz = RAIZ_PADRAO, agente, id } = {}) {
  slug(agente, 'agente'); slug(id, 'id');
  const caminho = join(resolve(raiz), 'reservas', `${id}.json`);
  if (!existsSync(caminho)) falhar(`reserva '${id}' não encontrada.`);
  const reserva = lerJson(caminho);
  if (reserva.agente !== agente) falhar(`reserva '${id}' pertence a '${reserva.agente}'.`);
  if (!reserva.liberadaEm) {
    reserva.liberadaEm = agora();
    const temporario = `${caminho}.${process.pid}.${idCurto()}.tmp`;
    writeFileSync(temporario, serializar(reserva), { encoding: 'utf8', flag: 'wx' });
    rmSync(caminho);
    renameSync(temporario, caminho);
  }
  return reserva;
}

function opcoes(argv) {
  const resultado = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { resultado._.push(arg); continue; }
    const igual = arg.indexOf('=');
    const chave = arg.slice(2, igual === -1 ? undefined : igual);
    if (igual !== -1) resultado[chave] = arg.slice(igual + 1);
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) resultado[chave] = argv[++i];
    else resultado[chave] = true;
  }
  return resultado;
}

function raizDe(opts) {
  return resolve(opts.root || process.env.MECANIFICA_COORD_DIR || RAIZ_PADRAO);
}

function corpoDe(opts) {
  if (opts['body-file']) return readFileSync(resolve(opts['body-file']), 'utf8');
  return opts.body || '';
}

function resumoMensagem(m) {
  const gitResumo = m.git ? ` | ${m.git.branch}@${m.git.head.slice(0, 8)}${m.git.sujo ? ' +local' : ''}` : '';
  const assunto = m.assunto || m.corpo.split(/\r?\n/, 1)[0] || '(sem assunto)';
  return `${m.criadaEm} [${m.tipo.toUpperCase()}] ${m.de} → ${m.para} | ${m.id}${gitResumo}\n  ${assunto}`;
}

function imprimir(valor, json = false) {
  console.log(json ? serializar(valor).trimEnd() : valor);
}

function ajuda() {
  return `Uso: node tools/coordenacao/coord.mjs <comando> [opções]\n\n` +
    `  init [--root=...]\n` +
    `  inbox <agente> [--all] [--limit=20] [--json]\n` +
    `  read <id> [--json]\n` +
    `  ack <agente> <id>\n` +
    `  send --from=codex --to=claude --kind=intencao --subject=... [--body-file=...]\n` +
    `       [--repo-path=...] [--base=<commit>] [--files=a,b] [--ids=A-40,A-41]\n` +
    `  claim <agente> --repo=warbook --files=a,b [--ids=A-40] [--subject=...]\n` +
    `  release <agente> <id>\n` +
    `  claims [--all] [--json]\n` +
    `  status [--json]\n\n` +
    `Mensagens novas aparecem primeiro. inbox não mostra corpos nem mensagens já confirmadas.`;
}

function executarCli(argv) {
  const [comando, ...resto] = argv;
  const opts = opcoes(resto);
  const raiz = raizDe(opts);
  if (!comando || comando === 'help' || comando === '--help') return imprimir(ajuda());
  if (comando === 'init') return imprimir(`Canal pronto em ${inicializar(raiz)}`);
  if (comando === 'inbox') {
    const mensagens = listarInbox({ raiz, agente: opts._[0], todas: Boolean(opts.all), limite: Number(opts.limit || 20) });
    if (opts.json) return imprimir(mensagens, true);
    return imprimir(mensagens.length ? mensagens.map(resumoMensagem).join('\n') : 'Nenhuma mensagem nova.');
  }
  if (comando === 'read') return imprimir(lerMensagem({ raiz, id: opts._[0] }), true);
  if (comando === 'ack') {
    const m = confirmarMensagem({ raiz, agente: opts._[0], id: opts._[1] });
    return imprimir(`Confirmada ${m.id}.`);
  }
  if (comando === 'send') {
    const m = enviarMensagem({
      raiz, de: opts.from, para: opts.to || 'todos', tipo: opts.kind,
      assunto: opts.subject || '', corpo: corpoDe(opts), repoPath: opts['repo-path'] || null,
      base: opts.base || null, arquivos: opts.files, identidades: opts.ids, respondeA: opts.reply || null,
    });
    return imprimir(`Enviada ${m.id}.`);
  }
  if (comando === 'claim') {
    const r = reservar({
      raiz, agente: opts._[0], repo: opts.repo, arquivos: opts.files,
      identidades: opts.ids, objetivo: opts.subject || '',
    });
    return imprimir(`Reserva ${r.id} criada.`);
  }
  if (comando === 'release') {
    const r = liberar({ raiz, agente: opts._[0], id: opts._[1] });
    return imprimir(`Reserva ${r.id} liberada.`);
  }
  if (comando === 'claims') {
    const reservas = opts.all ? arquivosJson(join(raiz, 'reservas')).map(lerJson) : reservasAtivas(raiz);
    return imprimir(opts.json ? reservas : (reservas.length ? reservas.map((r) =>
      `${r.id} | ${r.agente} | ${r.repo || '?'} | ${r.arquivos.join(', ') || r.identidades.join(', ')}`).join('\n') : 'Nenhuma reserva ativa.'), Boolean(opts.json));
  }
  if (comando === 'status') {
    inicializar(raiz);
    const config = lerJson(join(raiz, 'config.json'));
    const estados = Object.fromEntries(Object.entries(config.repositorios || {}).map(([nome, caminho]) => [nome, estadoGit(caminho)]));
    return imprimir(opts.json ? estados : Object.entries(estados).map(([nome, e]) =>
      `${nome}: ${e.branch}@${e.head.slice(0, 8)}${e.sujo ? ' +local' : ''}`).join('\n'), Boolean(opts.json));
  }
  falhar(`comando '${comando}' desconhecido.\n${ajuda()}`);
}

const ePrincipal = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (ePrincipal) {
  try { executarCli(process.argv.slice(2)); }
  catch (erro) {
    console.error(`coord: ${erro.message}`);
    process.exitCode = erro instanceof ErroCoordenacao ? 2 : 1;
  }
}
