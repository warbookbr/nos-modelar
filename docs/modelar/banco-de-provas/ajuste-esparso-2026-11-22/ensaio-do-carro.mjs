/* ensaio-do-carro.mjs — o gate 1 do plano do ajuste esparso: a subdivisão da lataria do quarto traseiro do carro-fastback com a rede mais
 * densa, pela variante da receita (`chapa.passo`, como `--params`), com e sem as medidas. Só o passo `subdivisao` e a parte que nomeia o
 * sólido dele são executados, como no ensaio de escala do carro (`../carro-fastback-2026-11-14/ensaio-de-escala.mjs`).
 * Uso, da raiz do repositório, um processo por medida, porque o pico de memória é o do processo:
 *   node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-do-carro.mjs <passo em mm> [--sem-medidas]
 * Imprime uma linha JSON com os vértices da meia gaiola, os segundos da subdivisão e o pico de memória. Nada versionado é escrito. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../../../../..');
const args = process.argv.slice(2);
const passo = Number(args.find((a) => !a.startsWith('--')));
const semMedidas = args.includes('--sem-medidas');
if (!(passo > 0)) { console.error('uso: ensaio-do-carro.mjs <passo em mm> [--sem-medidas]'); process.exit(2); }

const receita = (await import(pathToFileURL(resolve(RAIZ, 'procedural/pecas/carro-fastback/partes/lataria/receita.js')).href)).default;
const { executarReceita } = await import(pathToFileURL(resolve(RAIZ, 'src/autoria/executar-receita.js')).href);
const { receitaComParams } = await import(pathToFileURL(resolve(RAIZ, 'tools/modelar/entrada-de-medida.mjs')).href);
const v = receitaComParams(receita, { chapa: { passo } });
const [op, argumentos] = v.PASSOS[0];
const sub = semMedidas ? Object.fromEntries(Object.entries(argumentos).filter(([k]) => k !== 'medidas')) : argumentos;
const PASSOS = [[op, sub], ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }]];
const t = performance.now();
const { neutro } = executarReceita({ PARAMS: v.PARAMS, TOPO: v.TOPO, ALIASES: v.ALIASES, PASSOS });
const segundos = (performance.now() - t) / 1000;
if (neutro.orfaos.length) throw new Error(`a subdivisão não executou: ${neutro.orfaos[0].motivo}`);
console.log(JSON.stringify({ passo, semMedidas, verticesDaGaiola: sub.vertices.length, medidas: sub.medidas?.length ?? 0, segundosDaSubdivisao: +segundos.toFixed(2), picoMb: Math.round(process.resourceUsage().maxRSS / 1024) }));
