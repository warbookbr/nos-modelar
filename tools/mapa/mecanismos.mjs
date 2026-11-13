#!/usr/bin/env node
/* mecanismos.mjs — a página `docs/modelar/MECANISMOS.md` cita todo mecanismo do projeto.
 *
 * A página é a lista de uma tela do que existe além do código que constrói formas e de onde cada coisa mora. Sem conferência, ela
 * envelhece no primeiro mecanismo novo: pasta que nasce em `.claude/`, `modulos/`, `procedural/`, `tools/` ou `docs/modelar/` e
 * ninguém põe na lista. Aqui toda pasta de primeiro nível dessas (e todo `.md` solto em `.claude/`) precisa aparecer na página pelo
 * caminho, ou constar em DISPENSAS com o motivo. A página tem teto de linhas, porque uma lista que passa de uma tela deixa de ser
 * a visão geral.
 *
 *   node tools/mapa/mecanismos.mjs --check
 *   node tools/mapa/mecanismos.mjs --ajuda */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PAGINA = 'docs/modelar/MECANISMOS.md';
export const TETO_DE_LINHAS = 45;

/* Onde se procura mecanismo: a pasta, e o que conta nela. `md` conta também o `.md` solto. */
export const RAIZES = [
  { pasta: '.claude', md: true },
  { pasta: 'modulos', md: false },
  { pasta: 'procedural', md: false },
  { pasta: 'tools', md: false },
  { pasta: 'docs/modelar', md: false },
];

/* O que não é mecanismo, com o motivo. Cada entrada custa uma linha escrita aqui: sem glob. */
export const DISPENSAS = {
  'tools/fixtures/': 'dado de teste das ferramentas, não um mecanismo',
  'tools/testes/': 'teste que confere os próprios testes, sem uso fora deles',
  'procedural/servicos/': 'um arquivo de descoberta de peças, usado só pelo núcleo e citado em procedural/README.md',
};

export function conferirMecanismos({ raiz = REPO, dispensas = DISPENSAS, teto = TETO_DE_LINHAS } = {}) {
  const problemas = [];
  const caminhoDaPagina = path.join(raiz, PAGINA);
  if (!existsSync(caminhoDaPagina)) return { problemas: [`a página ${PAGINA} não existe`], itens: [] };
  const texto = readFileSync(caminhoDaPagina, 'utf8').replace(/\r\n/g, '\n');
  const linhas = texto.replace(/\n$/, '').split('\n').length;
  if (linhas > teto) problemas.push(`${PAGINA} tem ${linhas} linhas e o teto é ${teto}: encurte as linhas da tabela ou junte as parecidas; a página é uma tela.`);
  const itens = [];
  for (const { pasta, md } of RAIZES) {
    const dir = path.join(raiz, pasta);
    if (!existsSync(dir)) continue;
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isDirectory() && !e.name.startsWith('.')) itens.push(`${pasta}/${e.name}/`);
      else if (md && e.isFile() && e.name.endsWith('.md')) itens.push(`${pasta}/${e.name}`);
    }
  }
  for (const item of itens) {
    if (dispensas[item] || texto.includes(item)) continue;
    problemas.push(`${item} não está em ${PAGINA}. Ponha uma linha na tabela com o caminho dele, ou, se não é mecanismo, uma entrada em DISPENSAS de tools/mapa/mecanismos.mjs com o motivo.`);
  }
  for (const dispensado of Object.keys(dispensas)) {
    if (!itens.includes(dispensado)) problemas.push(`a dispensa ${dispensado} já não existe no repositório: tire-a de DISPENSAS em tools/mapa/mecanismos.mjs.`);
    else if (texto.includes(dispensado)) problemas.push(`a dispensa ${dispensado} já está citada em ${PAGINA}: tire-a de DISPENSAS em tools/mapa/mecanismos.mjs.`);
  }
  return { problemas, itens, linhas };
}

const executadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDireto) {
  if (process.argv.includes('--ajuda')) {
    console.log(`uso: node tools/mapa/mecanismos.mjs --check [--raiz=<pasta>]\nConfere que ${PAGINA} cita, pelo caminho, toda pasta de primeiro nível de ${RAIZES.map((r) => r.pasta).join(', ')} (e todo .md solto em .claude/), ou que ela consta em DISPENSAS com o motivo, e que a página não passa de ${TETO_DE_LINHAS} linhas.`);
    process.exit(0);
  }
  const raizPedida = process.argv.find((a) => a.startsWith('--raiz='))?.slice('--raiz='.length);
  const { problemas, itens, linhas } = conferirMecanismos(raizPedida ? { raiz: path.resolve(raizPedida) } : {});
  if (problemas.length) {
    console.error(`mecanismos:check FALHOU — ${problemas.length} problema(s):`);
    for (const p of problemas) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`mecanismos:check ok — ${itens.length} pasta(s) conferidas, página com ${linhas} linhas.`);
}
