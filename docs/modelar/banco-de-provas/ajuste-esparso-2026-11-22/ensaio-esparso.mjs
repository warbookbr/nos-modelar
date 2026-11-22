/* ensaio-esparso.mjs — a fatia 2 do plano do ajuste esparso na gaiola de prova: o tempo do ajuste com peso pelo Cholesky esparso, a
 * estrutura do fator (não nulos de L contra os de H, a metade de baixo com a diagonal) e a diferença para o denso onde ele cabe.
 * Uso, da raiz do repositório: node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-esparso.mjs [passo ...]
 * Sem passo, roda 34, 21, 16 e 12. Com `--denso` compara com a eliminação densa (minutos acima de 5.000 incógnitas). Nada versionado é escrito. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../../../../..');
const { gaiolaGrande } = await import(pathToFileURL(resolve(RAIZ, 'tools/fixtures/ajuste-esparso/gaiola-grande.mjs')).href);
const { ajustarGaiolaAsMedidasComPeso, ajustarGaiolaAsMedidasComPesoDenso, linhasDoLimite } = await import(pathToFileURL(resolve(RAIZ, 'procedural/nucleo/subdivisao.js')).href);
const { matrizPorLinhas, fatorarCholesky } = await import(pathToFileURL(resolve(RAIZ, 'procedural/nucleo/algebra-esparsa.js')).href);

const args = process.argv.slice(2); const comDenso = args.includes('--denso');
const passos = args.filter((a) => !a.startsWith('--')).map(Number);
for (const passo of passos.length ? passos : [34, 21, 16, 12]) {
  const { gaiola, medidas } = gaiolaGrande({ passo });
  const n = gaiola.vertices.length;
  /* a estrutura de H sem os valores do ajuste: todo vértice é medido, e U é a gaiola inteira */
  const H = matrizPorLinhas(n); for (let k = 0; k < n; k++) H.somar(k, k, 1);
  for (const linha of linhasDoLimite(gaiola, medidas.map((m) => m.indice))) for (const [r, a] of linha) for (const [c, b] of linha) H.somar(r, c, a * b);
  let naoNulosH = 0; for (const l of H.linhas) naoNulosH += l.size;
  const t0 = performance.now(); const fator = fatorarCholesky(H); const tFator = (performance.now() - t0) / 1000;
  const t1 = performance.now(); const r = ajustarGaiolaAsMedidasComPeso(gaiola, medidas); const tAjuste = (performance.now() - t1) / 1000;
  const linha = { passo, incognitas: n, naoNulosH, naoNulosL: fator.naoNulos, preenchimento: +(fator.naoNulos / ((naoNulosH + n) / 2)).toFixed(2), segundosDaFatoracao: +tFator.toFixed(2), segundosDoAjuste: +tAjuste.toFixed(2), ganho: +r.ganho.toFixed(4), ganhoPelaCota: r.ganhoPelaCota };
  if (comDenso) {
    const d = ajustarGaiolaAsMedidasComPesoDenso(gaiola, medidas); let dif = 0;
    r.vertices.forEach((v, k) => { for (let a = 0; a < 3; a++) dif = Math.max(dif, Math.abs(v[a] - d.vertices[k][a])); });
    linha.diferencaParaODenso = dif; linha.ganhoDenso = +d.ganho.toFixed(4);
  }
  linha.picoMb = Math.round(process.resourceUsage().maxRSS / 1024);
  console.log(JSON.stringify(linha));
}
