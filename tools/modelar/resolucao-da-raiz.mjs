/* resolucao-da-raiz.mjs — o pacote que a cópia isolada não tem vem da raiz do repositório principal.
 *
 * O ATRITO. Uma cópia isolada do agente (um worktree do git) nasce sem `node_modules`, e `node tools/modelar/esboco-nucleo.mjs` morre
 * no primeiro pacote que importa (`pngjs`, depois `earcut`, `manifold-3d`), de modo que o agente copiava o pacote à mão, um por um
 * (2026-11-09 e 2026-11-12). Aqui o pacote que não se acha a partir do arquivo que o importa é procurado nas `node_modules` do
 * repositório principal, o que o `.git` do worktree aponta; quem tem `node_modules` próprio continua a usá-lo, porque a procura só
 * entra depois de a resolução normal falhar, e a cópia da pasta, a ligação simbólica e o `npm ci` não são necessários.
 *
 * COMO SE USA. `node --import ./tools/modelar/resolucao-da-raiz.mjs <script>`, que é o que o `npm run esboco:nucleo` faz: um gancho
 * de resolução só vale para os módulos carregados depois de registrado, e os `import` estáticos do script são resolvidos antes de a
 * primeira linha dele rodar. Fora da cópia isolada (o `.git` é uma pasta) o registro não faz nada. */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isMainThread } from 'node:worker_threads';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_DO_REPOSITORIO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** A raiz do repositório principal quando `raiz` é um worktree (o `.git` é um arquivo `gitdir: <principal>/.git/worktrees/<nome>`); `null` se não for. */
export function raizPrincipalDe(raiz = RAIZ_DO_REPOSITORIO) {
  const git = join(raiz, '.git');
  try {
    if (!statSync(git).isFile()) return null;
    const alvo = /^gitdir:\s*(.+)$/m.exec(readFileSync(git, 'utf8'))?.[1]?.trim();
    if (!alvo) return null;
    const gitComum = resolve(raiz, alvo, '../..');
    const principal = dirname(gitComum);
    return existsSync(join(principal, 'node_modules')) ? principal : null;
  } catch { return null; }
}

/* Roda no gancho, que vive numa thread à parte: recebe a raiz principal em `initialize`. */
let principal = null;
export function initialize(dados) { principal = dados?.principal ?? null; }

const nu = (s) => !/^(?:\.{0,2}\/|[a-z][a-z0-9+.-]*:|#)/i.test(s);

export async function resolve_(specifier, context, next) {
  try { return await next(specifier, context); } catch (erro) {
    if (!principal || erro?.code !== 'ERR_MODULE_NOT_FOUND' || !nu(specifier)) throw erro;
    return next(specifier, { ...context, parentURL: pathToFileURL(join(principal, 'package.json')).href });
  }
}
export { resolve_ as resolve };

/** O mesmo para o servidor do Vite que a captura sobe: a bancada que roda no navegador importa `manifold-3d`, `three` e `earcut`, e o Vite os procura a partir da cópia
 *  e não os acha. Devolve a configuração a mesclar (um plugin que resolve o pacote pela raiz principal e a permissão de servir arquivos de lá), ou `{}` fora de uma cópia. */
export function configuracaoViteDaRaiz(raiz = RAIZ_DO_REPOSITORIO) {
  const principal = raizPrincipalDe(raiz);
  if (!principal) return {};
  const ancora = join(principal, 'package.json');
  return {
    plugins: [{
      name: 'resolucao-da-raiz',
      enforce: 'post',
      async resolveId(origem, importador, opcoes) {
        if (!nu(origem) || origem.startsWith('/') || origem.startsWith('\0') || importador?.startsWith(principal)) return null;
        return this.resolve(origem, ancora, { ...opcoes, skipSelf: true });
      },
    }],
    server: { fs: { allow: [raiz, principal] } },
  };
}

if (isMainThread) {
  const principalDaCopia = raizPrincipalDe();
  if (principalDaCopia) register(import.meta.url, { data: { principal: principalDaCopia } });
}
