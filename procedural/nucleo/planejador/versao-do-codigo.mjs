/* versao-do-codigo.mjs — a versão do código que gera o estado de uma receita, para a chave do cache por prefixo (plano do cache por passo,
 * fatia 3, gate 4): o estado guardado por um código nunca serve a outro.
 *
 * A versão cobre o conteúdo de cada arquivo de código de `procedural/nucleo/` e de `procedural/extensoes/` (as operações que o registro
 * da receita junta ao núcleo), sem os testes; a versão de cada pacote que esses arquivos importam pelo nome (a `manifold-3d`, o
 * `earcut`, o `ajv`), lida do `package.json` dele; e a versão do Node, porque a serialização do estado e a aritmética da biblioteca em
 * WebAssembly são dele.
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
 * @param {{ arquivos: Array<[string, string | Buffer]>, pacotes: Record<string, string>, node: string }} entrada
 */
export function versaoDoCodigo({ arquivos, pacotes, node }) {
  const h = createHash('sha256').update(FORMATO);
  for (const [caminho, conteudo] of [...arquivos].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) h.update(`\n${caminho}\n`).update(conteudo);
  for (const nome of Object.keys(pacotes).sort()) h.update(`\npacote ${nome}@${pacotes[nome]}`);
  h.update(`\nnode ${node}`);
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

/* a versão do `package.json` do pacote: o de `node_modules/<nome>` da raiz e, se não houver, o da pasta de onde o Node o resolve,
   subindo até o que tem o nome dele (o campo `exports` de alguns pacotes não deixa resolver o `package.json` direto, e o pacote só de
   ESM não se resolve por `require`) */
function versaoDoPacote(raiz, exigir, nome) {
  try { const pacote = JSON.parse(readFileSync(join(raiz, 'node_modules', nome, 'package.json'), 'utf8')); if (pacote.name === nome) return pacote.version ?? '?'; } catch { /* resolve abaixo */ }
  let pasta;
  try { pasta = dirname(exigir.resolve(nome)); } catch { return 'ausente'; }
  for (;;) {
    try { const pacote = JSON.parse(readFileSync(join(pasta, 'package.json'), 'utf8')); if (pacote.name === nome) return pacote.version ?? '?'; } catch { /* sobe */ }
    const acima = dirname(pasta);
    if (acima === pasta) return 'ausente';
    pasta = acima;
  }
}

/** Os arquivos e os pacotes que a versão cobre, lidos do repositório em `raiz`. */
export function entradaDaVersaoNoDisco({ raiz = RAIZ } = {}) {
  const arquivos = PASTAS.flatMap((p) => arquivosDe(join(raiz, p))).map((abs) => [relative(raiz, abs), readFileSync(abs)]);
  const nomes = new Set();
  for (const [caminho, conteudo] of arquivos) if (/\.(mjs|js|cjs)$/.test(caminho)) for (const m of String(conteudo).matchAll(PACOTE)) if (!m[2].startsWith('node:')) nomes.add(m[2]);
  const exigir = createRequire(join(raiz, 'package.json'));
  const pacotes = {};
  for (const nome of [...nomes].sort()) {
    pacotes[nome] = versaoDoPacote(raiz, exigir, nome);
  }
  return { arquivos, pacotes, node: process.version };
}

/** A versão do código do repositório em `raiz`, para a memória em armazém. */
export function versaoDoCodigoNoDisco(opcoes) { return versaoDoCodigo(entradaDaVersaoNoDisco(opcoes)); }
