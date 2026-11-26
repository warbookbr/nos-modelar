#!/usr/bin/env node
/* territorio-do-envio.mjs — confere que cada arquivo que o envio muda contra a main pertence ao território de um plano ativo, a um
 * caminho compartilhado ou a um arquivo gerado; o que sobra precisa de uma linha `Fora-do-territorio: <caminho>, <motivo>` num
 * commit do envio (o defeito pontual que o contrato permite). Antes a regra do território vivia só em texto: o gate dos planos
 * conferia a sobreposição entre planos, e nada conferia o que o envio mudava (análise do projeto de 2026-11-26, processo.md).
 *
 * Uso: npm run territorio:check [-- --base=<ref>]   (padrão origin/main; sem a ref, avisa e passa, porque não há contra o quê medir)
 *      --ajuda                                       mostra esta ajuda */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMINHOS_COMPARTILHADOS, sobrepoe } from './planos.mjs';

const RAIZ = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/* Os arquivos que os geradores regravam a partir de outros (o mapa, os índices, a crônica dos encerrados, o contrato gerado dos
   roteiros): mudam junto com qualquer plano e não pertencem a nenhum. */
export const GERADOS = [
  'README.md', 'CLAUDE.md', 'docs/modelar/INDEX.md', 'docs/modelar/banco-de-provas/README.md',
  'docs/modelar/decisoes/PLANOS-ENCERRADOS.md', 'docs/modelar/roteiros/ROTEIROS.md',
];

/** Os caminhos do território de cada plano ativo, como estão escritos (antes do filtro dos compartilhados). */
export function territoriosAtivos(pasta = join(RAIZ, 'docs/modelar/planos')) {
  const saida = [];
  for (const nome of readdirSync(pasta)) {
    if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(nome)) continue;
    const texto = readFileSync(join(pasta, nome), 'utf8');
    if (texto.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/m)?.[1]?.toLowerCase() !== 'ativo') continue;
    const linha = texto.match(/^\*\*Território:\*\*\s*(.*?)\s*$/m)?.[1] ?? '';
    saida.push({ plano: nome, caminhos: [...linha.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()) });
  }
  return saida;
}

/** As linhas `Fora-do-territorio:` das mensagens: { caminho, motivo }. */
export function declaracoesFora(mensagens) {
  return [...mensagens.matchAll(/^Fora-do-territorio:\s*([^,\s]+)\s*,\s*(.+?)\s*$/gm)].map((m) => ({ caminho: m[1], motivo: m[2] }));
}

/** A conferência pura: { fora, donos } com os arquivos sem dono nem declaração. */
export function conferirTerritorio(arquivos, territorios, declarados = []) {
  const donos = new Map();
  const fora = [];
  for (const arquivo of arquivos) {
    if (GERADOS.includes(arquivo) || CAMINHOS_COMPARTILHADOS.some((c) => sobrepoe(c, arquivo))) continue;
    const dono = territorios.find((t) => t.caminhos.some((c) => sobrepoe(c, arquivo)));
    if (dono) { donos.set(arquivo, dono.plano); continue; }
    if (declarados.some((d) => sobrepoe(d.caminho, arquivo))) continue;
    fora.push(arquivo);
  }
  return { fora, donos };
}

const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).trim();

function principal() {
  if (process.argv.includes('--ajuda')) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith(' * Uso') || l.startsWith(' *      ')).map((l) => l.slice(3)).join('\n'));
    return 0;
  }
  const base = process.argv.find((a) => a.startsWith('--base='))?.slice(7) ?? 'origin/main';
  try { git('rev-parse', '--verify', '--quiet', `${base}^{commit}`); } catch {
    console.log(`territorio:check — sem a ref ${base}, nada a medir; passa. No CI ela existe; aqui, rode com --base=<ref da main>.`);
    return 0;
  }
  const arquivos = git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean);
  const mensagens = git('log', '--no-merges', '--format=%B', `${base}..HEAD`);
  const { fora } = conferirTerritorio(arquivos, territoriosAtivos(), declaracoesFora(mensagens));
  if (!fora.length) { console.log(`territorio:check ok — ${arquivos.length} arquivo(s) mudados contra ${base}, todos com dono.`); return 0; }
  console.error(`territorio:check FALHOU — ${fora.length} arquivo(s) mudados fora do território de qualquer plano ativo:`);
  for (const f of fora) console.error(`  - ${f}`);
  console.error('Ponha o caminho no território do plano que o muda, ou, se é defeito pontual, escreva num commit do envio a linha');
  console.error('  Fora-do-territorio: <caminho>, <motivo>');
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = principal();
