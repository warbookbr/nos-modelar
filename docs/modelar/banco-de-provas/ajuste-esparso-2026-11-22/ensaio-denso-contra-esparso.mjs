/* ensaio-denso-contra-esparso.mjs — o gate 4 do plano do ajuste esparso: na lataria do carro-fastback, a mesma receita pelo ajuste esparso
 * (o do núcleo) e pela eliminação densa de referência (`ajustarGaiolaAsMedidasComPesoDenso`), com a gaiola ajustada e a malha subdividida
 * comparadas vértice a vértice. A gaiola sai de `gaiolaDoPasso`, como o passo `subdivisao` a resolve, e a malha da subdivisão de cada uma.
 * Uso, da raiz do repositório: node --max-old-space-size=8192 docs/modelar/banco-de-provas/ajuste-esparso-2026-11-22/ensaio-denso-contra-esparso.mjs [passo em mm]
 * Sem passo, usa o da receita. Imprime uma linha JSON com as diferenças máximas, em metro, e os tempos. Nada versionado é escrito. */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const RAIZ = resolve(fileURLToPath(import.meta.url), '../../../../..');
const imp = (p) => import(pathToFileURL(resolve(RAIZ, p)).href);
const receita = (await imp('procedural/pecas/carro-fastback/partes/lataria/receita.js')).default;
const { receitaComParams } = await imp('tools/modelar/entrada-de-medida.mjs');
const { criarResolverNumerico } = await imp('procedural/nucleo/expressoes.js');
const { gaiolaDoPasso } = await imp('procedural/nucleo/operacoes/subdivisao.js');
const { subdividirCatmullClark, ajustarGaiolaAsMedidasComPesoDenso } = await imp('procedural/nucleo/subdivisao.js');

const passo = Number(process.argv[2]);
const v = passo > 0 ? receitaComParams(receita, { chapa: { passo } }) : receita;
const args = v.PASSOS.find((p) => p[0] === 'subdivisao')[1];
const dict = { ...v.PARAMS, ...v.TOPO };
const { num } = criarResolverNumerico(dict);
const vec = (a) => (typeof a === 'string' ? dict[a] : a).map(num);
let t = performance.now();
const r = gaiolaDoPasso(args, { vec, num });
const segundosEsparso = (performance.now() - t) / 1000;
if (r.erro) throw new Error(`a gaiola não resolve: ${r.erro[1]}`);
const borda = args.borda ?? 'suave';
t = performance.now();
const densa = ajustarGaiolaAsMedidasComPesoDenso({ ...r.declaradaCheia, borda }, r.medidas, r.regularizacao).vertices;
const segundosDenso = (performance.now() - t) / 1000;
const diferenca = (A, B) => { let d = 0; A.forEach((p, k) => { for (let x = 0; x < 3; x++) d = Math.max(d, Math.abs(p[x] - B[k][x])); }); return d; };
const niveis = Math.trunc(num(args.niveis ?? 2));
const malha = (vertices) => subdividirCatmullClark({ ...r.gaiola, vertices, niveis, borda, aoLimite: true, comVincos: true }).vertices;
console.log(JSON.stringify({
  passo: passo > 0 ? passo : 'receita', verticesDaGaiola: r.gaiola.vertices.length, medidas: r.medidas.length,
  gaiola: diferenca(r.gaiola.vertices, densa), malha: diferenca(malha(r.gaiola.vertices), malha(densa)),
  segundosDoPassoEsparso: +segundosEsparso.toFixed(2), segundosDoAjusteDenso: +segundosDenso.toFixed(2),
}));
