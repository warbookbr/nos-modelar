#!/usr/bin/env node
/* territorio-do-envio.mjs — confere que cada arquivo que o envio muda pertence ao território de um plano ativo, a um caminho
 * compartilhado ou a um arquivo gerado; o que sobra precisa de uma linha `Fora-do-territorio: <arquivo>, <motivo>` num commit do
 * envio (o defeito pontual que o contrato permite). Antes a regra do território vivia só em texto: o gate dos planos conferia a
 * sobreposição entre planos, e nada conferia o que o envio mudava (análise do projeto de 2026-11-26, processo.md).
 *
 * O envio é medido a partir da base comum com a main (`git merge-base`), de modo que o que outra sessão pôs na main depois não
 * entra na conta. Vale o território dos planos ativos no fim do envio e na base, porque o plano que se encerra ou congela no envio
 * sai dos ativos sem deixar de ser o dono do que mudou.
 *
 * Uso: npm run territorio:check [-- --base=<ref>]   (padrão origin/main; sem a ref, avisa e passa fora do CI, e reprova no CI ou
 *                                                    com --base explícito)
 *      --ajuda                                       mostra esta ajuda */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMINHOS_COMPARTILHADOS, sobrepoe } from './planos.mjs';

/* Os arquivos que os geradores regravam a partir de outros (o mapa, os índices, a crônica dos encerrados, o contrato gerado dos
   roteiros, o banco de provas e o mapa de ferramentas por objeto): mudam junto com qualquer plano e não pertencem a nenhum. */
export const GERADOS = [
  'README.md', 'CLAUDE.md', 'docs/modelar/INDEX.md', 'docs/modelar/banco-de-provas/README.md',
  'docs/modelar/decisoes/PLANOS-ENCERRADOS.md', 'docs/modelar/decisoes/README.md', 'docs/modelar/roteiros/ROTEIROS.md',
  'docs/modelar/banco-de-provas/BANCO-DE-PROVAS.md', 'docs/modelar/banco-de-provas/banco-de-provas.json',
  'docs/modelar/pesquisas/FERRAMENTAS-POR-OBJETO.md',
];

const PLANO = /^\d{4}-\d{2}-\d{2}-.+\.md$/;

/** Os caminhos do território de um plano ativo, como estão escritos, ou null se o texto não é de plano ativo. */
export function caminhosDoAtivo(texto) {
  if (texto.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/m)?.[1]?.toLowerCase() !== 'ativo') return null;
  const linha = texto.match(/^\*\*Território:\*\*\s*(.*?)\s*$/m)?.[1] ?? '';
  return [...linha.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
}

/** As linhas `Fora-do-territorio:` das mensagens: { caminho, motivo }. */
export function declaracoesFora(mensagens) {
  return [...mensagens.matchAll(/^Fora-do-territorio:\s*([^,\n]+?)\s*,\s*(\S.*?)\s*$/gm)].map((m) => ({ caminho: m[1], motivo: m[2] }));
}

/**
 * A conferência pura. `arquivos` são { caminho, novo }; a declaração vale para o arquivo exato, ou para uma pasta só quando todos
 * os arquivos mudados dentro dela são novos (a pasta que o envio cria). Devolve { fora, soltas }: os arquivos sem dono nem
 * declaração, e as declarações que não casam com nenhum arquivo mudado (erro de digitação ou declaração que sobrou).
 */
export function conferirTerritorio(arquivos, territorios, declarados = []) {
  const valeA = (d) => {
    const dentro = arquivos.filter((a) => sobrepoe(d.caminho, a.caminho));
    if (!dentro.length) return [];
    if (d.caminho.endsWith('/') && dentro.some((a) => !a.novo)) return [];
    return dentro.map((a) => a.caminho);
  };
  const liberados = new Set(declarados.flatMap(valeA));
  const soltas = declarados.filter((d) => !valeA(d).length);
  const fora = [];
  for (const { caminho } of arquivos) {
    if (GERADOS.includes(caminho) || CAMINHOS_COMPARTILHADOS.some((c) => sobrepoe(c, caminho))) continue;
    if (territorios.some((t) => t.caminhos.some((c) => sobrepoe(c, caminho)))) continue;
    if (liberados.has(caminho)) continue;
    fora.push(caminho);
  }
  return { fora, soltas };
}

function principal(raiz, argv, ambiente) {
  const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (argv.includes('--ajuda')) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith(' * Uso') || l.startsWith(' *      ') || l.startsWith(' *                ')).map((l) => l.slice(3)).join('\n'));
    return 0;
  }
  const pedida = argv.find((a) => a.startsWith('--base='));
  const ref = pedida ? pedida.slice(7) : 'origin/main';
  let base;
  try { base = git('merge-base', `${ref}^{commit}`, 'HEAD').trim(); } catch { base = ''; }
  if (!ref || !base) {
    const texto = `territorio:check — sem a ref ${JSON.stringify(ref)} ou sem base comum com HEAD, nada a medir`;
    if (pedida || ambiente.CI) { console.error(`${texto}; reprova, porque no CI ou com --base explícito a medida é obrigatória. Rode git fetch origin main.`); return 1; }
    console.log(`${texto}; passa fora do CI. Para medir, rode git fetch origin main ou passe --base=<ref da main>.`);
    return 0;
  }
  const quando = git('log', '-1', '--format=%h de %cs', base).trim();
  const linhas = git('diff', '--no-renames', '--name-status', '-z', base, 'HEAD').split('\0').filter(Boolean);
  const arquivos = [];
  for (let i = 0; i < linhas.length; i += 2) arquivos.push({ caminho: linhas[i + 1], novo: linhas[i] === 'A' });
  const mensagens = git('log', '--no-merges', '--format=%B', `${base}..HEAD`);
  const territorios = [];
  for (const nome of readdirSync(join(raiz, 'docs/modelar/planos')).filter((n) => PLANO.test(n))) {
    const c = caminhosDoAtivo(readFileSync(join(raiz, 'docs/modelar/planos', nome), 'utf8'));
    if (c) territorios.push({ plano: nome, caminhos: c });
  }
  for (const nome of git('ls-tree', '--name-only', '-z', `${base}:docs/modelar/planos`).split('\0').filter((n) => PLANO.test(n))) {
    const c = caminhosDoAtivo(git('show', `${base}:docs/modelar/planos/${nome}`));
    if (c) territorios.push({ plano: `${nome} (ativo na base)`, caminhos: c });
  }
  const { fora, soltas } = conferirTerritorio(arquivos, territorios, declaracoesFora(mensagens));
  if (!fora.length && !soltas.length) {
    console.log(`territorio:check ok — ${arquivos.length} arquivo(s) mudados desde a base ${quando}, todos com dono (o que não foi gravado em commit não entra).`);
    return 0;
  }
  console.error(`territorio:check FALHOU — medido desde a base comum com ${ref}, ${quando}, contra ${territorios.length} território(s) de plano ativo.`);
  if (fora.length) {
    console.error(`${fora.length} arquivo(s) mudados fora do território de qualquer plano ativo:`);
    for (const f of fora) console.error(`  - ${f}`);
    console.error('Ponha o caminho no território do plano que o muda, ou, se é defeito pontual, escreva num commit do envio (não num de junção) a linha');
    console.error('  Fora-do-territorio: <arquivo>, <motivo>');
    console.error('A declaração vale para o arquivo exato, ou para uma pasta só quando o envio cria todos os arquivos dela. Se a lista traz arquivos que este envio não mudou, a main local está velha: rode git fetch origin main.');
  }
  if (soltas.length) {
    console.error(`${soltas.length} declaração(ões) que não casam com arquivo mudado (pasta com arquivo antigo dentro, ou caminho errado):`);
    for (const d of soltas) console.error(`  - ${d.caminho}, ${d.motivo}`);
  }
  return 1;
}

export { principal };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(resolve(fileURLToPath(new URL('../..', import.meta.url))), process.argv.slice(2), process.env);
}
