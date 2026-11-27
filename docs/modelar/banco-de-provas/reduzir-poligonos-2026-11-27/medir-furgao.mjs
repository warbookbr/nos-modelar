/* medir-furgao.mjs — a medida do redutor no furgão realista: triângulos antes e depois por parte, desvio medido por código separado, tempo,
 * repetição e a luz rasante. Uso: node docs/modelar/banco-de-provas/reduzir-poligonos-2026-11-27/medir-furgao.mjs [--saida=<pasta>] [--extra]
 * Escreve `medidas-furgao.json` e as imagens na pasta de saída (padrão: a deste arquivo). Leva uns 5 minutos, quase todos na conferência. */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../../../..');
const arg = (n) => process.argv.slice(2).find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const saida = resolve(arg('saida') ?? AQUI); mkdirSync(saida, { recursive: true });
const imp = (p) => import(pathToFileURL(resolve(REPO, p)).href);
const { executarReceita } = await imp('src/autoria/executar-receita.js');
const { receitaDoModulo } = await imp('tools/modelar/importar-receita.mjs');
const { carregarManifold } = await imp('procedural/nucleo/manifold.js');
const { reduzirMalha } = await imp('tools/modelar/reduzir-malha.mjs');
const { conferirReducao } = await import('./conferir-reducao.mjs');
const { luzRasante } = await import('./luz-rasante.mjs');
await carregarManifold();

const relatorio = {};
let t = performance.now();
const { neutro } = executarReceita(receitaDoModulo(await imp('procedural/pecas/furgao-realista/receita.js')));
relatorio.executarReceitaMs = Math.round(performance.now() - t);
relatorio.facesDaMalha = neutro.F.size;

const sha = (r) => createHash('sha256').update(JSON.stringify([[...r.V], [...r.F], [...r.mapa]])).digest('hex');
t = performance.now();
const r = reduzirMalha(neutro);
relatorio.reduzirMs = Math.round(performance.now() - t);
relatorio.estatisticas = r.estatisticas;
relatorio.sha256 = sha(r);
t = performance.now();
relatorio.sha256DaSegundaExecucao = sha(reduzirMalha(neutro));
relatorio.segundaExecucaoMs = Math.round(performance.now() - t);
relatorio.repete = relatorio.sha256 === relatorio.sha256DaSegundaExecucao;

t = performance.now();
const c = conferirReducao(neutro, r);
relatorio.conferirMs = Math.round(performance.now() - t);
relatorio.conferencia = { ok: c.ok, todos: c.todos, problemas: c.problemas.slice(0, 20) };
relatorio.partes = c.partes.map((p) => ({ parte: p.parte, antes: p.triangulosOriginal, depois: p.triangulosReduzida, desvioMaxMm: +p.desvioMaxMm.toFixed(4), idaMm: +p.desvioIdaMm.toFixed(4), voltaMm: +p.desvioVoltaMm.toFixed(4), normalMaxGraus: +p.normalMaxGraus.toFixed(2), lacosDeBorda: [p.lacosOriginal, p.lacosReduzida], fechada: [p.fechadaOriginal, p.fechadaReduzida] }))
  .sort((a, b) => b.antes - a.antes);

relatorio.imagens = [];
for (const vista of ['lado', 'tresquartos']) relatorio.imagens.push(...luzRasante(neutro, r, resolve(saida, 'furgao'), { vista }));
if (process.argv.includes('--extra')) {
  relatorio.sensibilidade = [];
  for (const normalGraus of [4, 6]) { t = performance.now(); const x = reduzirMalha(neutro, { normalGraus }); relatorio.sensibilidade.push({ normalGraus, triangulosDepois: x.estatisticas.triangulosDepois, ms: Math.round(performance.now() - t), conferido: false }); }
}
writeFileSync(resolve(saida, 'medidas-furgao.json'), `${JSON.stringify(relatorio, null, 1)}\n`);
console.log(JSON.stringify({ ...relatorio, partes: undefined, imagens: relatorio.imagens }, null, 1));
