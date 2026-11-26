#!/usr/bin/env node
/* ramos-parados.mjs — lista os ramos `claude/**` e `envio/**` do remoto que têm commits fora da main, com a data do último commit e
   se o passo `juntar` do CI os recusaria hoje. O `juntar` só avança a main quando ela é ancestral do ramo; quando a main andou desde a
   base, ele falha pedindo para juntar a main e enviar de novo, e o trabalho fica parado se ninguém volta ao ramo. A ferramenta lê só o
   git (sem a API do GitHub): a recusa é a mesma conta que o `juntar` faz, `git merge-base --is-ancestor`.

   Uso: npm run ramos:parados [-- --remoto=origin] [--sem-buscar] [--json] */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PREFIXOS = ['claude/', 'envio/'];

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** Os ramos do remoto com commits fora da main, do mais antigo ao mais novo. */
export function ramosParados({ cwd = RAIZ, remoto = 'origin', buscar = true } = {}) {
  if (buscar) git(['fetch', '-q', '--prune', remoto], cwd);
  const main = `refs/remotes/${remoto}/main`;
  const refs = git(['for-each-ref', '--format=%(refname:strip=3)\t%(committerdate:short)', `refs/remotes/${remoto}/`], cwd)
    .split('\n').filter(Boolean).map((l) => l.split('\t'));
  const ramos = [];
  for (const [nome, data] of refs) {
    if (!PREFIXOS.some((p) => nome.startsWith(p))) continue;
    const ref = `refs/remotes/${remoto}/${nome}`;
    const [atras, frente] = git(['rev-list', '--left-right', '--count', `${main}...${ref}`], cwd).split(/\s+/).map(Number);
    if (frente === 0) continue;
    ramos.push({ nome, data, commitsForaDaMain: frente, commitsDaMainQueFaltam: atras, juntarRecusa: atras > 0 });
  }
  return ramos.sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));
}

export function descrever(ramos) {
  if (!ramos.length) return 'Nenhum ramo claude/** ou envio/** tem commit fora da main.';
  const linhas = ramos.map((r) => `${r.data}  ${r.nome}: ${r.commitsForaDaMain} commit(s) fora da main` +
    (r.juntarRecusa ? `, a main andou ${r.commitsDaMainQueFaltam} commit(s) desde a base e o juntar recusa (git merge origin/main e envie de novo)` : ', o juntar aceitaria'));
  return `${ramos.length} ramo(s) com trabalho fora da main:\n${linhas.join('\n')}`;
}

function principal(argv) {
  if (argv.includes('--ajuda')) {
    console.log('Uso: npm run ramos:parados [-- --remoto=origin] [--sem-buscar] [--json]\nLista os ramos claude/** e envio/** do remoto com commits fora da main, a data do último commit e se o juntar do CI os recusaria.');
    return 0;
  }
  const remoto = argv.find((a) => a.startsWith('--remoto='))?.slice('--remoto='.length) || 'origin';
  const ramos = ramosParados({ remoto, buscar: !argv.includes('--sem-buscar') });
  console.log(argv.includes('--json') ? JSON.stringify(ramos, null, 2) : descrever(ramos));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = principal(process.argv.slice(2));
