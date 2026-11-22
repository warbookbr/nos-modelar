/* ensaio-denso.mjs — a linha de base do plano do ajuste esparso (fatia 1): o custo do ajuste denso de hoje na gaiola grande neutra
 * (`tools/fixtures/ajuste-esparso/gaiola-grande.mjs`), que reproduz a ordem dos vértices da rede espelhada, e a estrutura do sistema.
 * Uso, da raiz do repositório:
 *   node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-denso.mjs [passo em mm ...]
 * Sem passo roda a série 34, 30, 27, 24 e 21, um processo filho por passo (o pico de memória é o do processo), e imprime uma linha JSON por
 * passo e a lei de potência do tempo e da memória sobre as incógnitas. Cada linha traz: as incógnitas e as medidas; os não nulos da matriz
 * H = I + Σ WᵢᵀWᵢ do ajuste com peso e a banda dela na ordem da rede; os não nulos de L e U da eliminação de hoje (`fatorarLU`) e a razão
 * deles sobre os de H, que calibra a parada do plano; o tempo e o pico do `ajustarGaiolaAsMedidasComPeso`, com a conferência do ganho.
 * Nada no repositório versionado é escrito. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../../../../..');
const SERIE = [34, 30, 27, 24, 21];
const importar = (rel) => import(pathToFileURL(resolve(RAIZ, rel)).href);

async function medir(passo) {
  const { gaiolaGrande } = await importar('tools/fixtures/ajuste-esparso/gaiola-grande.mjs');
  const S = await importar('procedural/nucleo/subdivisao.js');
  const { gaiola, medidas } = gaiolaGrande({ passo });
  const n = gaiola.vertices.length;
  /* a estrutura: H com a diagonal 1 de cada incógnita e o produto das linhas do limite de cada medida */
  const H = Array.from({ length: n }, (_, k) => new Map([[k, 1]]));
  for (const l of S.linhasDoLimite(gaiola, medidas.map((m) => m.indice))) for (const [r, wr] of l) for (const [c, wc] of l) H[r].set(c, (H[r].get(c) ?? 0) + wr * wc);
  let naoNulosH = 0, banda = 0;
  H.forEach((linha, r) => { naoNulosH += linha.size; for (const c of linha.keys()) banda = Math.max(banda, Math.abs(r - c)); });
  const densa = H.map((linha) => { const v = new Array(n).fill(0); for (const [c, x] of linha) v[c] = x; return v; });
  const t0 = performance.now();
  const lu = S.fatorarLU(densa);
  const segundosDaFatoracao = (performance.now() - t0) / 1000;
  let naoNulosLU = 0; for (const linha of lu.M) for (const x of linha) if (x !== 0) naoNulosLU += 1;
  densa.length = 0; lu.M.length = 0;
  const t1 = performance.now();
  const r = S.ajustarGaiolaAsMedidasComPeso(gaiola, medidas);
  const segundosDoAjuste = (performance.now() - t1) / 1000;
  return { passo, incognitas: n, medidas: medidas.length, naoNulosH, banda, naoNulosLU, preenchimento: +(naoNulosLU / naoNulosH).toFixed(1), segundosDaFatoracao: +segundosDaFatoracao.toFixed(2), segundosDoAjuste: +segundosDoAjuste.toFixed(2), ganho: +r.ganho.toFixed(4), picoMb: Math.round(process.resourceUsage().maxRSS / 1024) };
}

function leiDePotencia(xs, ys) {
  const lx = xs.map(Math.log), ly = ys.map(Math.log), n = xs.length;
  const mx = lx.reduce((a, b) => a + b) / n, my = ly.reduce((a, b) => a + b) / n;
  return +(lx.reduce((s, x, i) => s + (x - mx) * (ly[i] - my), 0) / lx.reduce((s, x) => s + (x - mx) ** 2, 0)).toFixed(2);
}

const args = process.argv.slice(2).map(Number);
if (args.length) {
  for (const p of args) console.log(JSON.stringify(await medir(p)));
} else {
  const linhas = [];
  for (const p of SERIE) {
    const r = spawnSync(process.execPath, ['--max-old-space-size=8192', fileURLToPath(import.meta.url), String(p)], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 });
    const ultima = r.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
    if (r.status !== 0 || !ultima) { console.log(JSON.stringify({ passo: p, falhou: r.status, erro: r.stderr.trim().split('\n').slice(-3).join(' | ') })); break; }
    console.log(ultima); linhas.push(JSON.parse(ultima));
  }
  if (linhas.length >= 3) {
    const n = linhas.map((l) => l.incognitas);
    console.log(JSON.stringify({ leiDoAjuste: leiDePotencia(n, linhas.map((l) => l.segundosDoAjuste)), leiDaFatoracao: leiDePotencia(n, linhas.map((l) => l.segundosDaFatoracao)), leiDaMemoria: leiDePotencia(n, linhas.map((l) => l.picoMb)), leiDaBanda: leiDePotencia(n, linhas.map((l) => l.banda)) }));
  }
}
