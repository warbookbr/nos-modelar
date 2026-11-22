/* ensaio-sela.mjs — a medida que decide a fatia 3 do plano do ajuste esparso: o preenchimento do LU esparso no sistema de ponto de sela
 * da gaiola de prova, com uma parte das cotas exata, contra o do Cholesky no caso positivo definido do mesmo tamanho. A régua é a razão
 * entre os não nulos do fator e os da matriz (L contra a metade de baixo de H com a diagonal; L e U contra K inteira).
 * Uso: node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-sela.mjs [passo ...] [--cada=9]
 * Sem passo, roda 34, 21 e 16. `--cada=k` faz exata uma cota em cada k. Nada versionado é escrito. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../../../../..');
const { gaiolaGrande } = await import(pathToFileURL(resolve(RAIZ, 'tools/fixtures/ajuste-esparso/gaiola-grande.mjs')).href);
const { linhasDoLimite } = await import(pathToFileURL(resolve(RAIZ, 'procedural/nucleo/subdivisao.js')).href);
const { matrizPorLinhas, fatorarCholesky, fatorarLUEsparso } = await import(pathToFileURL(resolve(RAIZ, 'procedural/nucleo/algebra-esparsa.js')).href);

const args = process.argv.slice(2);
const cada = Number((args.find((a) => a.startsWith('--cada=')) ?? '--cada=9').slice(7));
const passos = args.filter((a) => !a.startsWith('--')).map(Number);
const contar = (m) => { let t = 0; for (const l of m.linhas) t += l.size; return t; };
for (const passo of passos.length ? passos : [34, 21, 16]) {
  const { gaiola, medidas } = gaiolaGrande({ passo });
  const n = gaiola.vertices.length; const indices = medidas.map((m) => m.indice);
  const linhas = linhasDoLimite(gaiola, indices);
  const exata = indices.map((_, t) => t % cada === 0); const nE = exata.filter(Boolean).length;
  /* o caso positivo definido: todas com peso */
  const H = matrizPorLinhas(n); for (let k = 0; k < n; k++) H.somar(k, k, 1);
  for (const l of linhas) for (const [r, a] of l) for (const [c, b] of l) H.somar(r, c, a * b);
  const tC = performance.now(); const ch = fatorarCholesky(H); const segundosCholesky = (performance.now() - tC) / 1000;
  const razaoPositiva = ch.naoNulos / ((contar(H) + n) / 2);
  /* o ponto de sela: as exatas viram restrição */
  const K = matrizPorLinhas(n + nE); for (let k = 0; k < n; k++) K.somar(k, k, 1);
  let s = 0;
  linhas.forEach((l, t) => {
    if (!exata[t]) { for (const [r, a] of l) for (const [c, b] of l) K.somar(r, c, a * b); return; }
    const r = n + s++; for (const [c, w] of l) { K.somar(r, c, w); K.somar(c, r, w); }
  });
  const tL = performance.now(); const lu = fatorarLUEsparso(K); const segundosLU = (performance.now() - tL) / 1000;
  const razaoSela = lu.naoNulos / contar(K);
  console.log(JSON.stringify({ passo, incognitas: n, exatas: nE, razaoPositiva: +razaoPositiva.toFixed(2), razaoSela: +razaoSela.toFixed(2), vezes: +(razaoSela / razaoPositiva).toFixed(2), deficientes: lu.deficientes.length, segundosCholesky: +segundosCholesky.toFixed(2), segundosLU: +segundosLU.toFixed(2) }));
}
