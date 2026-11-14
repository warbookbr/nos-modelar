/* impressao-das-fontes.mjs — a impressão digital do que uma receita executa, para o cache da malha da bancada.

   A bancada executa a receita do zero no navegador a cada carga (`cache-da-execucao.js` guarda o resultado). O cache só vale
   se a chave muda quando QUALQUER coisa que a execução lê muda, e o navegador não enxerga os arquivos. Quem enxerga é o servidor:
   este módulo calcula, em Node, o hash de uma receita e de tudo o que ela importa (módulos locais e família, transitivamente) e o
   hash do motor (o fecho de imports de `src/autoria/executar-receita.js`, que inclui `procedural/nucleo/` e as extensões, mais a
   versão do `manifold-3d`). O plugin do Vite serve isso em `impressao-das-fontes.json`: calculado na hora no servidor de
   desenvolvimento, para uma receita pedida, e gravado no pacote com todas as receitas na construção.

   Não toca o núcleo: só lê arquivos. O fecho de imports é aproximado por texto (`import`/`export ... from`/`import()` com
   especificador literal e relativo); especificador que não resolve a arquivo é ignorado, e arquivo a mais no fecho só invalida
   cedo demais, nunca tarde demais. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

export const NOME_DO_ARQUIVO = 'impressao-das-fontes.json';
export const ENTRADA_DO_MOTOR = 'src/autoria/executar-receita.js';
const PASTAS_DE_RECEITAS = ['procedural/pecas', 'tools/fixtures/acervo'];

const SUFIXOS = ['', '.js', '.mjs', '/index.js'];
const ESPECIFICADOR = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\s*from\s*)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function sha(texto) {
  return createHash('sha256').update(texto).digest('hex');
}

/** Os especificadores relativos de um texto de módulo, na ordem em que aparecem, sem repetição. */
export function especificadoresLocais(texto) {
  const achados = [];
  for (const [, estatico, dinamico] of texto.matchAll(ESPECIFICADOR)) {
    const especificador = estatico ?? dinamico;
    if (especificador.startsWith('./') || especificador.startsWith('../')) achados.push(especificador);
  }
  return [...new Set(achados)];
}

function resolverArquivo(deArquivo, especificador, existe) {
  const base = resolve(dirname(deArquivo), especificador);
  for (const sufixo of SUFIXOS) {
    const candidato = sufixo.startsWith('/') ? join(base, sufixo.slice(1)) : base + sufixo;
    if (existe(candidato)) return candidato;
  }
  return null;
}

/**
 * Todos os arquivos que `entrada` alcança por imports locais, ela inclusive, em ordem estável. `leitor` e `existe`
 * são injetáveis para o teste montar um repositório de mentira em memória.
 */
export function fechoDeImports(entrada, { ler = (c) => readFileSync(c, 'utf8'), existe = (c) => existsSync(c) && statSync(c).isFile() } = {}) {
  const visitados = new Set();
  const pilha = [resolve(entrada)];
  while (pilha.length) {
    const arquivo = pilha.pop();
    if (visitados.has(arquivo)) continue;
    visitados.add(arquivo);
    if (!/\.(m?js|ts)$/.test(arquivo)) continue;
    for (const especificador of especificadoresLocais(ler(arquivo))) {
      const alvo = resolverArquivo(arquivo, especificador, existe);
      if (alvo && !visitados.has(alvo)) pilha.push(alvo);
    }
  }
  return [...visitados].sort();
}

/** Hash do conteúdo e do caminho (relativo à raiz) de uma lista de arquivos. */
export function hashDosArquivos(arquivos, { raiz, ler = (c) => readFileSync(c) } = {}) {
  const resumo = createHash('sha256');
  for (const arquivo of [...arquivos].sort()) {
    const nome = relative(raiz, arquivo).split(sep).join('/');
    resumo.update(`${nome}\0${sha(ler(arquivo))}\n`);
  }
  return resumo.digest('hex');
}

/** O hash da receita e de tudo o que ela importa. */
export function impressaoDaReceita(caminho, { raiz, ...io } = {}) {
  const entrada = resolve(raiz, caminho);
  return hashDosArquivos(fechoDeImports(entrada, io), { raiz, ler: io.ler });
}

function versaoDoManifold(raiz) {
  try {
    return JSON.parse(readFileSync(join(raiz, 'node_modules/manifold-3d/package.json'), 'utf8')).version ?? 'sem-versao';
  } catch {
    return 'sem-manifold';
  }
}

/** O hash do motor: o que `executarReceita` importa (núcleo e extensões inclusos) e a versão do manifold-3d. */
export function impressaoDoMotor({ raiz, versaoDoManifold: versao = versaoDoManifold(raiz), ...io } = {}) {
  const fecho = fechoDeImports(resolve(raiz, ENTRADA_DO_MOTOR), io);
  return sha(`${hashDosArquivos(fecho, { raiz, ler: io.ler })}|manifold-3d@${versao}`);
}

function listarJs(pasta, achados = []) {
  if (!existsSync(pasta)) return achados;
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) listarJs(caminho, achados);
    else if (/\.js$/.test(item.name) && !/\.(test|spec)\.js$/.test(item.name)) achados.push(caminho);
  }
  return achados;
}

/** Impressão de todas as receitas do acervo e dos ensaios, por caminho relativo à raiz, mais a do motor. */
export function impressaoDeTudo({ raiz }) {
  const receitas = {};
  for (const pasta of PASTAS_DE_RECEITAS) {
    for (const arquivo of listarJs(join(raiz, pasta))) {
      receitas[relative(raiz, arquivo).split(sep).join('/')] = impressaoDaReceita(arquivo, { raiz });
    }
  }
  return { motor: impressaoDoMotor({ raiz }), receitas };
}

/* Plugin do Vite. No servidor de desenvolvimento responde `impressao-das-fontes.json?caminho=<receita>` calculando na hora, sem
   depender do observador de arquivos (que ignora `.claude/`, onde moram as cópias de trabalho). Na construção grava o arquivo
   com todas as receitas. */
export function impressaoDasFontes({ raiz }) {
  return {
    name: 'modelar-impressao-das-fontes',
    configureServer(servidor) {
      servidor.middlewares.use((req, res, seguir) => {
        const url = new URL(req.url ?? '/', 'http://local');
        if (!url.pathname.endsWith(`/${NOME_DO_ARQUIVO}`)) return seguir();
        try {
          const caminho = url.searchParams.get('caminho');
          if (!caminho || !PASTAS_DE_RECEITAS.some((pasta) => caminho.startsWith(`${pasta}/`)) || caminho.includes('..')) {
            res.statusCode = 400;
            res.end('caminho de receita inválido');
            return undefined;
          }
          const corpo = { motor: impressaoDoMotor({ raiz }), receita: impressaoDaReceita(caminho, { raiz }) };
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(corpo));
        } catch (erro) {
          res.statusCode = 500;
          res.end(String(erro?.message ?? erro));
        }
        return undefined;
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: NOME_DO_ARQUIVO, source: JSON.stringify(impressaoDeTudo({ raiz })) });
    },
  };
}
