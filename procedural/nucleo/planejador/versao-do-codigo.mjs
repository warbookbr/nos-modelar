/* versao-do-codigo.mjs — a versão do código que gera o estado de uma receita, para a chave do cache por prefixo (plano do cache por passo,
 * fatia 3, gate 4): o estado guardado por um código nunca serve a outro.
 *
 * A versão cobre o conteúdo de cada arquivo de código de `procedural/nucleo/` e de `procedural/extensoes/` (as operações que o registro
 * da receita junta ao núcleo), sem os testes; cada pacote que esses arquivos importam pelo nome (a `manifold-3d`, o `earcut`), pelo
 * CONTEÚDO de todos os arquivos dele (o `.wasm` da Manifold inclusive; os dois somam uns 3 MB) e pela versão de cada dependência que
 * ele declara; e a versão e a arquitetura do Node, porque a serialização do estado e a aritmética da biblioteca em WebAssembly são dele.
 *
 * `versaoDoCodigo` é pura: recebe os arquivos, os pacotes e o Node e devolve o texto. `versaoDoCodigoNoDisco` é do host em Node: lê os
 * arquivos e os pacotes do repositório. O núcleo não importa este arquivo, que só roda em Node. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FORMATO = 'mecanifica.versao-do-codigo@1';
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PASTAS = Object.freeze(['procedural/nucleo', 'procedural/extensoes']);
const CODIGO = /\.(mjs|js|cjs|json)$/;
const TESTE = /\.test\.[a-z]+$/;
/* o nome de pacote de um `import` estático ou dinâmico, sem caminho relativo nem `node:` */
const PACOTE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])((?:@[^/'"\s]+\/)?[^./'"\s][^/'"\s]*)(?:\/[^'"]*)?\1/g;

/**
 * A versão: um hash do formato, de cada `[caminho, conteudo]` em ordem de caminho, de cada pacote `nome@versao` em ordem de nome e do Node.
 * @param {{ arquivos: Array<[string, string | Buffer]>, pacotes: Record<string, string>, node: string, arquitetura?: string }} entrada
 */
export function versaoDoCodigo({ arquivos, pacotes, node, arquitetura = '' }) {
  const h = createHash('sha256').update(FORMATO);
  for (const [caminho, conteudo] of [...arquivos].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) h.update(`\n${caminho}\n`).update(conteudo);
  for (const nome of Object.keys(pacotes).sort()) h.update(`\npacote ${nome}@${pacotes[nome]}`);
  h.update(`\nnode ${node} ${arquitetura}`);
  return h.digest('hex');
}

function arquivosDe(pasta) {
  const saida = [];
  let itens = [];
  try { itens = readdirSync(pasta, { withFileTypes: true }); } catch { return saida; }
  for (const d of itens) {
    const abs = join(pasta, d.name);
    if (d.isDirectory()) { if (d.name !== 'node_modules') saida.push(...arquivosDe(abs)); } else if (CODIGO.test(d.name) && !TESTE.test(d.name)) saida.push(abs);
  }
  return saida;
}

/* a pasta do pacote: `node_modules/<nome>` da raiz e, se não houver, a de onde o Node o resolve, subindo até a do `package.json` com o
   nome dele (o campo `exports` de alguns pacotes não deixa resolver o `package.json` direto, e o pacote só de ESM não se resolve por
   `require`) */
function pastaDoPacote(raiz, exigir, nome) {
  const ehDele = (pasta) => { try { return JSON.parse(readFileSync(join(pasta, 'package.json'), 'utf8')).name === nome; } catch { return false; } };
  if (ehDele(join(raiz, 'node_modules', nome))) return join(raiz, 'node_modules', nome);
  let pasta;
  try { pasta = dirname(exigir.resolve(nome)); } catch { return null; }
  for (;;) {
    if (ehDele(pasta)) return pasta;
    const acima = dirname(pasta);
    if (acima === pasta) return null;
    pasta = acima;
  }
}

/* o que a versão leva de um pacote: o hash do conteúdo de todos os arquivos dele (sem os `node_modules` de dentro), a versão e a versão
   de cada dependência declarada; 'ausente' quando ele não se acha */
function impressaoDoPacote(raiz, exigir, nome) {
  const pasta = pastaDoPacote(raiz, exigir, nome);
  if (!pasta) return 'ausente';
  const pacote = JSON.parse(readFileSync(join(pasta, 'package.json'), 'utf8'));
  const h = createHash('sha256');
  const todos = (p) => { const s = []; for (const d of readdirSync(p, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const abs = join(p, d.name); if (d.isDirectory()) { if (d.name !== 'node_modules') s.push(...todos(abs)); } else if (d.isFile()) s.push(abs); } return s; };
  for (const abs of todos(pasta)) h.update(`\n${relative(pasta, abs)}\n`).update(readFileSync(abs));
  const dependencias = Object.keys(pacote.dependencies ?? {}).sort().map((dep) => {
    const p = pastaDoPacote(pasta, createRequire(join(pasta, 'package.json')), dep) ?? pastaDoPacote(raiz, exigir, dep);
    let versao = 'ausente';
    try { if (p) versao = JSON.parse(readFileSync(join(p, 'package.json'), 'utf8')).version ?? '?'; } catch { /* fica ausente */ }
    return `${dep}@${versao}`;
  });
  return `${pacote.version ?? '?'} ${h.digest('hex').slice(0, 24)} ${dependencias.join(',')}`;
}

/** Os arquivos e os pacotes que a versão cobre, lidos do repositório em `raiz`. */
export function entradaDaVersaoNoDisco({ raiz = RAIZ } = {}) {
  const arquivos = PASTAS.flatMap((p) => arquivosDe(join(raiz, p))).map((abs) => [relative(raiz, abs), readFileSync(abs)]);
  const nomes = new Set();
  for (const [caminho, conteudo] of arquivos) if (/\.(mjs|js|cjs)$/.test(caminho)) for (const m of String(conteudo).matchAll(PACOTE)) if (!m[2].startsWith('node:')) nomes.add(m[2]);
  const exigir = createRequire(join(raiz, 'package.json'));
  const pacotes = {};
  for (const nome of [...nomes].sort()) {
    pacotes[nome] = impressaoDoPacote(raiz, exigir, nome);
  }
  return { arquivos, pacotes, node: process.version, arquitetura: process.arch };
}

/** A versão do código do repositório em `raiz`, para a memória em armazém. */
export function versaoDoCodigoNoDisco(opcoes) { return versaoDoCodigo(entradaDaVersaoNoDisco(opcoes)); }
