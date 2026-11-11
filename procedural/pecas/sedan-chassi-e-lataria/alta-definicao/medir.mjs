#!/usr/bin/env node
/* medir.mjs: o que o primeiro ciclo de alta definição mede e nenhuma ferramenta do repositório dá: o tempo de montagem, o número de
 * faces por parte e o raio das arestas de caráter, lido num corte da malha.
 *
 * O RAIO. O corte da malha no plano z dado é uma polilinha em (x, y). Junto da quina, as duas faces vizinhas são quase planas: a reta
 * de cada lado é ajustada aos pontos do corte entre `longe0` e `longe1` mm da quina (fora do arredondamento), as duas retas se
 * cruzam na quina viva, e a folga é a distância da quina viva à polilinha do corte. O raio do filete circular de mesma folga é
 * folga / (1 / sen(phi / 2) - 1), com phi o ângulo por dentro entre as duas retas; é a definição da tabela de `modelar-carroceria.md`.
 * Sai também o menor raio de curvatura da polilinha (círculo por três pontos seguidos), que na malha de nível N é limitado pelo
 * tamanho do segmento. Só entram as faces cuja normal olha para fora (a face de fora da chapa).
 *
 * Uso: node medir.mjs <caminho.esboco.mjs> [--z=1700,1500] [--quina=cintura|ombro] */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { receitaDaOpcao } from '../../../../modulos/esboco-nucleo/src/opcao.js';

const arquivo = process.argv[2];
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `=${d}`).split('=')[1];
const t0 = performance.now();
const modulo = await import(pathToFileURL(resolve(arquivo)).href);
const t1 = performance.now();
let neutro;
try { ({ neutro } = receitaDaOpcao(modulo.default.opcoes[0], { nome: 'medir' })); } catch (e) { console.log(JSON.stringify({ arquivo, recusa: e.message })); process.exit(1); }
const t2 = performance.now();

const V = (id) => neutro.V.get(id).map((c) => c * 1000);
const faces = [...neutro.F.values()];
const porParte = {};
for (const f of faces) porParte[f.parte ?? '(sem parte)'] = (porParte[f.parte ?? '(sem parte)'] ?? 0) + 1;
const lados = {}; for (const f of faces) lados[f.vs.length] = (lados[f.vs.length] ?? 0) + 1;

/* o corte no plano z: os segmentos das faces de fora, em (x, y) */
function corte(z) {
  const segs = [];
  for (const f of faces) {
    const P = f.vs.map(V);
    const n = [0, 0, 0];
    for (let i = 0; i < P.length; i++) { const a = P[i]; const b = P[(i + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    if (n[0] + n[1] <= 0) continue;            /* a face de dentro olha para -x e para -y */
    const cruz = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i]; const b = P[(i + 1) % P.length];
      if ((a[2] - z) * (b[2] - z) < 0) { const t = (z - a[2]) / (b[2] - a[2]); cruz.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    if (cruz.length === 2) segs.push(cruz);
  }
  return segs;
}
function reta(pts) {                              /* mínimos quadrados total: ponto médio e direção */
  const m = [0, 0]; for (const p of pts) { m[0] += p[0] / pts.length; m[1] += p[1] / pts.length; }
  let sxx = 0; let sxy = 0; let syy = 0;
  for (const p of pts) { const dx = p[0] - m[0]; const dy = p[1] - m[1]; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { m, d: [Math.cos(a), Math.sin(a)] };
}
function raioNaQuina(z, quina, longe0, longe1) {
  const pts = corte(z).flat();
  const perto = (p) => Math.hypot(p[0] - quina[0], p[1] - quina[1]);
  /* os dois lados da quina: os pontos do corte acima/para dentro e abaixo/para fora dela */
  const ladoA = pts.filter((p) => perto(p) > longe0 && perto(p) < longe1 && (p[1] - quina[1]) - (p[0] - quina[0]) > 0 === false);
  const ladoB = pts.filter((p) => perto(p) > longe0 && perto(p) < longe1 && (p[1] - quina[1]) - (p[0] - quina[0]) > 0 === true);
  if (ladoA.length < 2 || ladoB.length < 2) return { erro: `corte sem pontos dos dois lados da quina em z ${z}` };
  const A = reta(ladoA); const B = reta(ladoB);
  const det = A.d[0] * -B.d[1] + B.d[0] * A.d[1];
  const t = ((B.m[0] - A.m[0]) * -B.d[1] + B.d[0] * (B.m[1] - A.m[1])) / det;
  const viva = [A.m[0] + A.d[0] * t, A.m[1] + A.d[1] * t];
  const cos = Math.abs(A.d[0] * B.d[0] + A.d[1] * B.d[1]);
  /* o ângulo por dentro: as direções saindo da quina para cada lado */
  const dir = (R, lado) => { const c = [0, 0]; for (const p of lado) { c[0] += p[0] / lado.length; c[1] += p[1] / lado.length; } const s = Math.sign((c[0] - viva[0]) * R.d[0] + (c[1] - viva[1]) * R.d[1]); return [R.d[0] * s, R.d[1] * s]; };
  const dA = dir(A, ladoA); const dB = dir(B, ladoB);
  const phi = Math.acos(Math.max(-1, Math.min(1, dA[0] * dB[0] + dA[1] * dB[1])));
  /* a folga: a distância da quina viva aos segmentos do corte */
  let folga = Infinity;
  for (const [p, q] of corte(z)) {
    const ux = q[0] - p[0]; const uy = q[1] - p[1]; const L2 = ux * ux + uy * uy;
    const s = Math.max(0, Math.min(1, ((viva[0] - p[0]) * ux + (viva[1] - p[1]) * uy) / L2));
    folga = Math.min(folga, Math.hypot(viva[0] - p[0] - ux * s, viva[1] - p[1] - uy * s));
  }
  const raio = folga / (1 / Math.sin(phi / 2) - 1);
  /* o raio de curvatura da polilinha: os pontos do corte a até `longe0` da quina, em ordem de ângulo em volta de um centro do lado de
     dentro, e o círculo por três pontos seguidos; saem o menor e a mediana dos três menores */
  const bis = [dA[0] + dB[0], dA[1] + dB[1]]; const nb = Math.hypot(bis[0], bis[1]) || 1;
  const centro = [viva[0] + (bis[0] / nb) * 3 * longe1, viva[1] + (bis[1] / nb) * 3 * longe1];
  const unicos = new Map();
  for (const p of pts) if (Math.hypot(p[0] - viva[0], p[1] - viva[1]) < longe0) unicos.set(`${p[0].toFixed(3)},${p[1].toFixed(3)}`, p);
  const cadeia = [...unicos.values()].sort((p, q) => Math.atan2(p[1] - centro[1], p[0] - centro[0]) - Math.atan2(q[1] - centro[1], q[0] - centro[0]));
  const raios = [];
  for (let i = 1; i + 1 < cadeia.length; i++) {
    const [a, b, c] = [cadeia[i - 1], cadeia[i], cadeia[i + 1]];
    const ab = Math.hypot(a[0] - b[0], a[1] - b[1]); const bc = Math.hypot(b[0] - c[0], b[1] - c[1]); const ca = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    if (area > 1e-9) raios.push((ab * bc * ca) / (4 * area));
  }
  raios.sort((x, y) => x - y);
  const a2 = (v) => (v === undefined ? null : Math.round(v * 100) / 100);
  /* o segmento da malha junto da quina, que limita o raio que a malha mostra */
  const junto = corte(z).filter(([p, q]) => perto(p) < longe0 && perto(q) < longe0).map(([p, q]) => Math.hypot(p[0] - q[0], p[1] - q[1]));
  return { z, quinaViva: viva.map((v) => Math.round(v * 100) / 100), anguloPorDentroGraus: Math.round((phi * 1800) / Math.PI) / 10, folgaMm: Math.round(folga * 1000) / 1000, raioDoFileteMm: Math.round(raio * 100) / 100, raioMinimoDeCurvaturaMm: a2(raios[0]), raioDeCurvaturaMedianaDosTresMenoresMm: a2(raios[1]),
    segmentoJuntoMm: junto.length ? Math.round((junto.reduce((a, b) => a + b, 0) / junto.length) * 100) / 100 : null, segmentosNoArredondamento: junto.length, cos: Math.round(cos * 1000) / 1000 };
}

const zs = arg('z', '1800,1500,1100,800').split(',').map(Number);
const saida = {
  arquivo,
  tempoMs: { importar: Math.round(t1 - t0), montar: Math.round(t2 - t1), total: Math.round(t2 - t0) },
  faces: { total: faces.length, porLados: lados, porParte },
  vertices: neutro.V.size,
  reclamacoesDaExecucao: neutro.orfaos ?? [],
  avisos: modulo.AVISOS,
  medidasDoCorte: modulo.MEDIDAS_DO_CORTE,
  raioDaCintura: zs.filter((z) => z > 700).map((z) => raioNaQuina(z, [860, 1000], 30, 80)),
  raioDoOmbro: zs.map((z) => raioNaQuina(z, [866, 890], 25, 70)),
};
console.log(JSON.stringify(saida, null, 1));
