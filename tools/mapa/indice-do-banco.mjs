#!/usr/bin/env node
/* indice-do-banco.mjs — gera o índice de `docs/modelar/banco-de-provas/README.md` das pastas, e confere que ele está em dia.
 *
 * O índice nasceu escrito à mão em 2026-11-13, quando os planos que alcançavam as pastas do banco de provas saíram da árvore, e já
 * listava só parte delas. Aqui cada subpasta ganha uma linha: o título do documento de entrada ligado a ele, e o nome da pasta. O
 * documento de entrada é o `README.md` da pasta ou, sem ele, o primeiro `.md` dela em ordem alfabética (só no primeiro nível da
 * pasta); o título é a primeira linha `# ` dele. Pasta sem `.md` no primeiro nível entra só pelo nome. Os documentos da pasta que o de entrada não alcança por link (o `docs:links:check` exige que todo documento seja alcançável) entram como linhas recuadas logo abaixo. O parágrafo de abertura e a linha do arquivo
 * solto ficam à mão, fora dos marcadores; entre eles tudo é gerado.
 *
 * Não confundir com `tools/modelar/banco-de-provas.mjs`, que gera `BANCO-DE-PROVAS.md`, o custo por objeto, e não muda.
 *
 *   node tools/mapa/indice-do-banco.mjs --gerar    reescreve o trecho entre os marcadores
 *   node tools/mapa/indice-do-banco.mjs --check    reprova se o trecho estiver velho (também dentro de `npm run mapa:check`) */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PASTA_DO_BANCO = 'docs/modelar/banco-de-provas';
export const INDICE = `${PASTA_DO_BANCO}/README.md`;
export const INICIO = '<!-- indice-do-banco:inicio (gerado por `npm run banco:indice:gerar`; não edite à mão) -->';
export const FIM = '<!-- indice-do-banco:fim -->';

const ordem = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function tituloDe(texto) {
  const m = /^# +(.+?) *$/m.exec(texto.replace(/\r\n/g, '\n'));
  return m ? m[1] : null;
}

/* Os `.md` de uma pasta, em qualquer profundidade, em ordem de caminho. */
function documentosDe(base, pasta) {
  const achados = [];
  const andar = (rel) => {
    for (const e of readdirSync(path.join(base, rel), { withFileTypes: true }).sort((x, y) => ordem(x.name, y.name))) {
      if (e.isDirectory() && !e.name.startsWith('.')) andar(`${rel}/${e.name}`);
      else if (e.isFile() && e.name.endsWith('.md')) achados.push(`${rel}/${e.name}`);
    }
  };
  andar(pasta);
  return achados.sort(ordem);
}

/* Os documentos que um documento liga por caminho relativo, dentro da lista dada. */
function ligadosPor(base, doc, todos) {
  const texto = readFileSync(path.join(base, doc), 'utf8');
  const alvos = [];
  for (const m of texto.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
    const alvo = path.posix.normalize(path.posix.join(path.posix.dirname(doc), m[1]));
    if (todos.includes(alvo)) alvos.push(alvo);
  }
  return alvos;
}

function fecho(base, partida, todos, alcancados) {
  const pilha = [partida];
  while (pilha.length) {
    const doc = pilha.pop();
    if (alcancados.has(doc)) continue;
    alcancados.add(doc);
    pilha.push(...ligadosPor(base, doc, todos));
  }
}

/* A linha de uma pasta: o título do documento de entrada ligado a ele, e o nome da pasta. Os documentos da pasta que nem o de entrada
   nem os que ele liga alcançam (o `docs:links:check` exige que todo documento seja alcançável) entram embaixo, um por linha. */
export function linhasDoIndice(raiz = REPO) {
  const base = path.join(raiz, PASTA_DO_BANCO);
  const pastas = readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name).sort(ordem);
  const titulo = (doc, padrao) => tituloDe(readFileSync(path.join(base, doc), 'utf8')) ?? padrao;
  const linhas = [];
  for (const pasta of pastas) {
    const todos = documentosDe(base, pasta);
    const diretos = todos.filter((d) => path.posix.dirname(d) === pasta).map((d) => path.posix.basename(d));
    const entrada = diretos.includes('README.md') ? 'README.md' : diretos[0];
    const alcancados = new Set();
    if (entrada) {
      linhas.push(`- [${titulo(`${pasta}/${entrada}`, pasta)}](${pasta}/${entrada}) — \`${pasta}\``);
      fecho(base, `${pasta}/${entrada}`, todos, alcancados);
    } else linhas.push(`- \`${pasta}\``);
    for (const doc of todos) {
      if (alcancados.has(doc)) continue;
      fecho(base, doc, todos, alcancados);
      linhas.push(`  - [${titulo(doc, doc)}](${doc}) — \`${path.posix.dirname(doc)}\``);
    }
  }
  return linhas;
}

export function indiceGerado(raiz = REPO) {
  const caminho = path.join(raiz, INDICE);
  const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : '';
  const i = atual.indexOf(INICIO);
  const f = atual.indexOf(FIM);
  const bloco = `${INICIO}\n${linhasDoIndice(raiz).join('\n')}\n${FIM}`;
  if (i === -1 || f === -1 || f < i) return { atual, esperado: null, erro: `${INDICE} não tem os marcadores do índice gerado (${INICIO} ... ${FIM}).` };
  return { atual, esperado: atual.slice(0, i) + bloco + atual.slice(f + FIM.length) };
}

/* Devolve a lista de problemas, vazia quando o índice está em dia. */
export function conferirIndice(raiz = REPO) {
  const { atual, esperado, erro } = indiceGerado(raiz);
  if (erro) return [erro];
  if (atual === esperado) return [];
  return [`${INDICE} está desatualizado em relação às pastas de ${PASTA_DO_BANCO}/. Rode \`npm run banco:indice:gerar\` e commite o resultado.`];
}

const executadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDireto) {
  const args = process.argv.slice(2);
  if (args.includes('--ajuda') || !(args.includes('--gerar') || args.includes('--check'))) {
    console.log(`uso: node tools/mapa/indice-do-banco.mjs --gerar | --check\nGera ou confere o trecho entre os marcadores de ${INDICE}: uma linha por subpasta de ${PASTA_DO_BANCO}/, com o título do documento de entrada.`);
    process.exit(args.includes('--ajuda') ? 0 : 2);
  }
  if (args.includes('--check')) {
    const problemas = conferirIndice();
    if (problemas.length) { for (const p of problemas) console.error(`banco:indice:check FALHOU — ${p}`); process.exit(1); }
    console.log(`banco:indice:check ok — ${linhasDoIndice().filter((l) => !l.startsWith(' ')).length} pasta(s) no índice.`);
  } else {
    const { esperado, erro } = indiceGerado();
    if (erro) { console.error(erro); process.exit(1); }
    writeFileSync(path.join(REPO, INDICE), esperado);
    console.log(`banco:indice:gerar — ${linhasDoIndice().filter((l) => !l.startsWith(' ')).length} pasta(s) em ${INDICE}.`);
  }
}
