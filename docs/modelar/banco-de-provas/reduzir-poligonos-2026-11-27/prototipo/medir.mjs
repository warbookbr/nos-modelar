// uso: node medir.mjs <raiz da worktree> <caminho relativo da receita> <saida.json> [saida da malha .json]
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const [raiz, rel, saida, malha] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(resolve(raiz, p)).href);
const { REGISTRO_DA_RECEITA, executarReceita } = await imp('src/autoria/executar-receita.js');
const { receitaDoModulo } = await imp('tools/modelar/importar-receita.mjs');
const man = await imp('procedural/nucleo/manifold.js');
await man.carregarManifold();
const modulo = await imp(rel);
let receita = receitaDoModulo(modulo);
if (process.env.VARIANTE) { const v = JSON.parse(process.env.VARIANTE); const r2 = Object.create(receita); const fundir = (a, b) => { const o = { ...a }; for (const [k, x] of Object.entries(b)) o[k] = x && typeof x === 'object' && !Array.isArray(x) ? fundir(a[k] ?? {}, x) : x; return o; }; r2.PARAMS = fundir(receita.PARAMS, v); receita = r2; console.log('variante', JSON.stringify(v)); }
let st = null; const voltas = [];
const base = REGISTRO_DA_RECEITA;
const registro = { ...base, resolver(...a) {
  const r = base.resolver(...a); const agora = performance.now();
  if (voltas.length) { const u = voltas[voltas.length - 1]; u.ms = agora - u.t0; if (st) { u.F1 = st.F.size; u.V1 = st.V.size; } }
  voltas.push({ op: a[0], t0: agora, F0: st ? st.F.size : 0, V0: st ? st.V.size : 0 });
  if (!st && r) { const ex = r.executar; return { ...r, executar: Object.assign(function (s, ...resto) { st = s; return ex.call(this, s, ...resto); }, ex) }; }
  return r; } };
const t0 = performance.now();
const { entrada, neutro } = executarReceita(receita, { registroOperacoes: registro });
const total = performance.now() - t0;
const u = voltas[voltas.length - 1]; u.ms = performance.now() - u.t0; u.F1 = neutro.F.size; u.V1 = neutro.V.size;
const passos = voltas.map((v, i) => { const args = entrada.PASSOS[i]?.[1] ?? {}; const rot = args.nome ?? args.parte ?? args.id ?? args.como ?? null;
  return { i, op: v.op, ms: Math.round(v.ms), F0: v.F0, F1: v.F1, dF: v.F1 - v.F0, rot: typeof rot === 'string' ? rot : null, niveis: args.niveis ?? args.nivel ?? null }; });
// por parte
const partes = new Map();
const hist = {};
let tri = 0;
for (const [id, f] of neutro.F) {
  const n = f.vs.length; hist[n] = (hist[n] ?? 0) + 1; tri += n - 2;
  const nome = f.parte ?? '(sem parte)';
  let p = partes.get(nome); if (!p) partes.set(nome, p = { nome, faces: 0, tri: 0, area: 0, min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9], vs: new Set() });
  p.faces++; p.tri += n - 2;
  const P = f.vs.map((v) => neutro.V.get(v)); let ax = 0, ay = 0, az = 0;
  for (let k = 1; k + 1 < n; k++) { const a = P[0], b = P[k], c = P[k + 1]; const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2]; ax += uy*vz-uz*vy; ay += uz*vx-ux*vz; az += ux*vy-uy*vx; }
  p.area += Math.hypot(ax, ay, az) / 2;
  for (const q of P) for (let k = 0; k < 3; k++) { if (q[k] < p.min[k]) p.min[k] = q[k]; if (q[k] > p.max[k]) p.max[k] = q[k]; }
  for (const v of f.vs) p.vs.add(v);
}
const lista = [...partes.values()].map((p) => ({ nome: p.nome, faces: p.faces, tri: p.tri, vertices: p.vs.size, area_mm2: Math.round(p.area), dim: p.max.map((x, k) => Math.round(x - p.min[k])), min: p.min.map(Math.round), max: p.max.map(Math.round), arestaMedia_mm: +(Math.sqrt(p.area / p.faces)).toFixed(2) })).sort((a, b) => b.faces - a.faces);
const amostraV = neutro.V.values().next().value; const amostraF = neutro.F.values().next().value;
writeFileSync(saida, JSON.stringify({ rel, totalMs: Math.round(total), faces: neutro.F.size, vertices: neutro.V.size, triangulos: tri, hist, orfaos: neutro.orfaos.length, rssMB: Math.round(process.memoryUsage().rss / 1e6), heapMB: Math.round(process.memoryUsage().heapUsed / 1e6), amostraV, amostraF, passos, partes: lista }, null, 1));
if (malha) {
  const ids = new Map(); const pos = []; for (const [id, v] of neutro.V) { ids.set(id, ids.size); pos.push(+v[0], +v[1], +v[2]); }
  const nomes = [...partes.keys()]; const idx = new Map(nomes.map((n, i) => [n, i]));
  const faces = []; for (const [id, f] of neutro.F) faces.push([idx.get(f.parte ?? '(sem parte)'), ...f.vs.map((v) => ids.get(v))]);
  writeFileSync(malha, JSON.stringify({ partes: nomes, pos, faces }));
}
console.log(`ok ${rel}: ${neutro.F.size} faces, ${neutro.V.size} vertices, ${Math.round(total / 1000)} s, orfaos ${neutro.orfaos.length}`);
