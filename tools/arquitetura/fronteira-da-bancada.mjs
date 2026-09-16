#!/usr/bin/env node
/* fronteira-da-bancada.mjs — a bancada é um módulo, não o centro do projeto.
 *
 * A bancada existe para a PESSOA: ela abre a peça, olha, seleciona, arrasta,
 * edita a malha. A IA não usa nada disso — ela lê receita, executa, mede e
 * escreve. As duas coisas se encontram num ponto só, e é de propósito: a pessoa
 * salva o que desenhou e a rodada de absorção lê aquilo como medida.
 *
 * Essa fronteira estava certa por disciplina e não por regra. O núcleo de
 * autoria nunca importou a bancada, mas nada impedia alguém de fazer isso na
 * pressa, e o custo apareceria tarde: o motor procedural passaria a exigir
 * Three.js, `document` e `window` para rodar, e o CLI, o MCP e os testes
 * headless parariam de funcionar por causa de uma interface.
 *
 * Esta régua torna a fronteira conferível. O que ela proíbe:
 *
 *   `src/autoria/` não importa `src/bancada/`. O núcleo é headless e não
 *   conhece interface.
 *
 *   As ferramentas da IA — `tools/mecanifica/`, `tools/mcp/`, `tools/autoria/` —
 *   também não. Elas rodam em terminal e em integração contínua, onde a bancada
 *   não existe.
 *
 * O que continua permitido, e por quê: `tools/bancadas/` é o harness que SERVE a
 * bancada no navegador, então ele a importa por definição. E arquivo de teste
 * pode importar o que ele testa, seja onde for.
 *
 * Quando um módulo dentro de `src/bancada/` for preciso dos dois lados, a saída
 * não é abrir exceção: é tirá-lo de lá. Foi o que aconteceu com o catálogo de
 * peças e as cores de auditoria, que nunca foram interface e hoje moram em
 * `src/autoria/`.
 *
 *   npm run bancada:fronteira:check
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PROIBIDO_IMPORTAR_BANCADA = ['src/autoria', 'tools/mecanifica', 'tools/mcp', 'tools/autoria'];
const EXTENSOES = ['.js', '.mjs', '.ts'];
const ehTeste = (caminho) => /\.(test|spec)\.[^.]+$/.test(caminho);

function arquivosDe(pasta) {
  const encontrados = [];
  let entradas;
  try { entradas = readdirSync(pasta, { withFileTypes: true }); } catch { return encontrados; }
  for (const entrada of entradas) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) encontrados.push(...arquivosDe(caminho));
    else if (EXTENSOES.some((e) => entrada.name.endsWith(e))) encontrados.push(caminho);
  }
  return encontrados;
}

/* Pega `import ... from 'x'`, `export ... from 'x'` e `import('x')`. */
const ALCANCE = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

const problemas = [];
let conferidos = 0;

for (const raiz of PROIBIDO_IMPORTAR_BANCADA) {
  for (const arquivo of arquivosDe(join(REPO, raiz))) {
    if (ehTeste(arquivo)) continue;
    conferidos += 1;
    const texto = readFileSync(arquivo, 'utf8');
    for (const [, alvo] of texto.matchAll(ALCANCE)) {
      if (!/(^|\/)bancada\//.test(alvo)) continue;
      problemas.push(`${relative(REPO, arquivo)} importa '${alvo}'`);
    }
  }
}

if (problemas.length) {
  console.error('bancada:fronteira FALHOU — a bancada é módulo e não pode ser dependência de quem roda sem navegador:');
  for (const linha of problemas) console.error(`  ${linha}`);
  console.error('  Se o módulo serve aos dois lados, tire-o de src/bancada/ em vez de abrir exceção.');
  process.exit(1);
}
console.log(`bancada:fronteira ok — ${conferidos} arquivo(s) fora da bancada, nenhum depende dela.`);
