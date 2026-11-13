#!/usr/bin/env node
/* independencia-catalogo.mjs — firewall pequeno entre o núcleo, a autoria
 * pura e as portas que resolvem arquivos. Importar uma peça pelo caminho é
 * permitido no adaptador que recebeu essa responsabilidade; não é permitido
 * no núcleo nem no serviço puro de execução. Também confere a fronteira do próprio núcleo: `procedural/nucleo/` não
 * importa `src/`, `tools/`, `modulos/` nem as camadas de `procedural/` acima dele (veja `verificarFronteiraDoNucleo`).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function arquivosJs(pasta) {
  const saida = [];
  for (const nome of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, nome.name);
    if (nome.isDirectory()) saida.push(...arquivosJs(caminho));
    else if (nome.isFile() && caminho.endsWith('.js')) saida.push(caminho);
  }
  return saida;
}

/* Fronteira do núcleo: `procedural/nucleo/` não conhece nada acima dele. Em código que não é teste nem fixture
 * (`.js`, `.mjs`, `.ts`), import estático, `export ... from` e `import('literal')` que resolvam para uma destas pastas
 * reprovam. Pacote e `node:` ficam livres. Os testes (`*.test.*`) e as fixtures ficam fora da régua e são só contados. */
export const PASTAS_ACIMA_DO_NUCLEO = [
  'src', 'tools', 'modulos', 'procedural/pecas', 'procedural/familias', 'procedural/criterios', 'procedural/extensoes', 'procedural/servicos',
];
const CODIGO = /\.(?:js|mjs|ts)$/;
const TESTE = /\.test\.[^/]+$/;
const FIXTURE = /(?:^|[./-])fixtures?(?:[./-]|$)/i;
const IMPORTACAO = /(?:\bimport\s*\(\s*|\bimport\s+(?:[^'";]*?\bfrom\s*)?|\bexport\s+[^'";]*?\bfrom\s*)(['"])([^'"\n]+)\1/g;

function arquivosDoNucleo(pasta, saida = []) {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    if (entrada.name === 'node_modules') continue;
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) arquivosDoNucleo(caminho, saida);
    else if (entrada.isFile() && CODIGO.test(entrada.name)) saida.push(caminho);
  }
  return saida;
}

/* Tira os comentários sem mudar a contagem de linhas. */
function semComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[\s;{}(),])\/\/[^\n]*/g, '$1');
}

/* Os especificadores de import do texto: [{ linha, especificador }]. */
export function importsDoTexto(texto) {
  const limpo = semComentarios(texto);
  const achados = [];
  for (const m of limpo.matchAll(IMPORTACAO)) achados.push({ linha: limpo.slice(0, m.index).split('\n').length, especificador: m[2] });
  return achados;
}

function pastaProibida(especificador, arquivo, raiz) {
  if (!especificador.startsWith('.')) return null;
  const alvo = relative(raiz, resolve(dirname(arquivo), especificador)).split('\\').join('/');
  if (alvo.startsWith('procedural/nucleo/') || alvo === 'procedural/nucleo') return null;
  return PASTAS_ACIMA_DO_NUCLEO.find((p) => alvo === p || alvo.startsWith(`${p}/`)) ?? null;
}

export function verificarFronteiraDoNucleo(raiz = REPO) {
  const problemas = [];
  let varridos = 0; let importsConferidos = 0; const testesQueSobem = []; let testes = 0; let fixtures = 0;
  const todos = existsSync(join(raiz, 'procedural/nucleo')) ? arquivosDoNucleo(join(raiz, 'procedural/nucleo')) : [];
  for (const arquivo of todos) {
    const rel = relative(raiz, arquivo).split('\\').join('/');
    const texto = readFileSync(arquivo, 'utf8');
    const ehTeste = TESTE.test(rel);
    if (!ehTeste && FIXTURE.test(rel.slice('procedural/nucleo/'.length))) { fixtures += 1; continue; }
    if (ehTeste) testes += 1; else varridos += 1;
    for (const { linha, especificador } of importsDoTexto(texto)) {
      const pasta = pastaProibida(especificador, arquivo, raiz);
      if (ehTeste) { if (pasta) { testesQueSobem.push(rel); break; } continue; }
      importsConferidos += 1;
      if (pasta) problemas.push(`núcleo importa ${pasta}/: ${rel}:${linha}: importa '${especificador}'. O núcleo (procedural/nucleo/) não conhece nada acima dele; leve o que precisa para a camada de cima.`);
    }
  }
  return { problemas, varridos, importsConferidos, testes, fixtures, testesQueSobem };
}

function ocorrencias(arquivos, padrao, regra) {
  const problemas = [];
  for (const arquivo of arquivos) {
    const texto = readFileSync(arquivo, 'utf8');
    for (const [indice, linha] of texto.split('\n').entries()) {
      if (padrao.test(linha)) problemas.push(`${regra}: ${relative(REPO, arquivo)}:${indice + 1}: ${linha.trim()}`);
      padrao.lastIndex = 0;
    }
  }
  return problemas;
}

export function verificarIndependencia() {
  const motor = arquivosJs(join(REPO, 'procedural/nucleo'));
  const autoriaPura = [join(REPO, 'src/autoria/executar-receita.js')];
  return [
    ...verificarFronteiraDoNucleo().problemas,
    ...ocorrencias(motor, /(?:from\s+['"]|import\s*\()([^'"]*)(?:three|pecas\/)/i, 'motor importa catálogo/renderizador'),
    ...ocorrencias(autoriaPura, /node:(?:fs|path|url)|procedural\/pecas|src\/bancada|tools\//i, 'serviço puro conhece porta ou disco'),
  ];
}

const chamadoDireto = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (chamadoDireto) {
  const problemas = verificarIndependencia();
  if (problemas.length) {
    console.error(`arquitetura:check FALHOU — ${problemas.length} dependência(s):`);
    for (const problema of problemas) console.error(`  - ${problema}`);
    process.exit(1);
  }
  const f = verificarFronteiraDoNucleo();
  console.log(`arquitetura:check ok — núcleo e serviço puro não dependem do catálogo; fronteira do núcleo: ${f.varridos} arquivos de código, ${f.importsConferidos} imports conferidos, ${f.testesQueSobem.length} teste(s) sobem de camada (fora da régua)`);
}
