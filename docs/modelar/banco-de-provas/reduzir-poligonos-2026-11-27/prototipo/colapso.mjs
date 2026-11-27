// protótipo: decimação por colapso de meia-aresta (o vértice some para cima de um vizinho; nenhum vértice novo, nenhuma posição nova)
// com TETO EXPLÍCITO: todo vértice original fica a no máximo eps da malha reduzida, todo triângulo novo fica a no máximo eps da original
// (baricentro e meios de aresta), a normal de cada triângulo novo fica a no máximo alfa graus da normal dos vértices originais que ele
// cobre, e borda, quina (diedro > quina) e costura entre partes só encolhem ao longo de si mesmas. Determinístico: ordem por id.
import { criarGrade, distancia, distPT } from './geo.mjs';
const RAD = 180 / Math.PI;
function distPS(P, p, a, b) { const ax=P[3*a],ay=P[3*a+1],az=P[3*a+2]; const dx=P[3*b]-ax,dy=P[3*b+1]-ay,dz=P[3*b+2]-az; const px=P[3*p]-ax,py=P[3*p+1]-ay,pz=P[3*p+2]-az; const l=dx*dx+dy*dy+dz*dz; let t=l?(px*dx+py*dy+pz*dz)/l:0; t=Math.max(0,Math.min(1,t)); return Math.hypot(px-t*dx,py-t*dy,pz-t*dz); }
export function decimar(P, Tin, { eps = 0.1, alfa = 4, quina = 30, trava = null, celula = 10 } = {}) {
  const nT = Tin.length / 3; const T = Int32Array.from(Tin); const vivo = new Uint8Array(nT).fill(1);
  const vt = new Map(); const add = (v, t) => { let l = vt.get(v); if (!l) vt.set(v, l = []); l.push(t); };
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) add(T[3*t+k], t);
  const normal = (a, b, c) => { const ux=P[3*b]-P[3*a],uy=P[3*b+1]-P[3*a+1],uz=P[3*b+2]-P[3*a+2],vx=P[3*c]-P[3*a],vy=P[3*c+1]-P[3*a+1],vz=P[3*c+2]-P[3*a+2]; const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx; const l=Math.hypot(x,y,z); return l > 1e-12 ? [x/l,y/l,z/l,l/2] : [0,0,0,0]; };
  const N = new Array(nT); for (let t = 0; t < nT; t++) N[t] = normal(T[3*t], T[3*t+1], T[3*t+2]);
  // arestas de feição
  const ek = (a, b) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  const ar = new Map(); for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const key = ek(T[3*t+k], T[3*t+(k+1)%3]); const l = ar.get(key); if (l) l.push(t); else ar.set(key, [t]); }
  const feic = new Map(); const preso = new Set(); const cq = Math.cos(quina / RAD);
  const addF = (a, b) => { let l = feic.get(a); if (!l) feic.set(a, l = new Set()); l.add(b); };
  for (const [key, l] of ar) { const a = Math.floor(key / 4294967296), b = key % 4294967296;
    if (l.length > 2) { preso.add(a); preso.add(b); continue; }
    if (l.length === 1 || N[l[0]][0]*N[l[1]][0]+N[l[0]][1]*N[l[1]][1]+N[l[0]][2]*N[l[1]][2] < cq) { addF(a, b); addF(b, a); } }
  if (trava) for (const v of vt.keys()) if (trava[v]) preso.add(v);
  for (const [v, l] of feic) if (l.size !== 2) preso.add(v);
  // normal de vértice (só dos lisos) e o quanto as faces originais dele já se afastam dela
  const vn = new Map(); const lim = new Map();
  for (const [v, l] of vt) { if (feic.has(v)) continue; let x = 0, y = 0, z = 0; for (const t of l) { x += N[t][0]*N[t][3]; y += N[t][1]*N[t][3]; z += N[t][2]*N[t][3]; } const m = Math.hypot(x, y, z); if (!m) continue; const n = [x/m, y/m, z/m]; vn.set(v, n);
    let pior = 0; for (const t of l) { if (!N[t][3]) continue; pior = Math.max(pior, Math.acos(Math.min(1, n[0]*N[t][0]+n[1]*N[t][1]+n[2]*N[t][2])) * RAD); } lim.set(v, Math.max(alfa, pior + 0.5)); }
  const grade = criarGrade(P, Tin, celula);
  const pts = new Map(); // triângulo -> vértices originais absorvidos
  const ptsAresta = new Map(); // aresta de feição -> vértices originais absorvidos nela
  const contem = (t, v) => T[3*t] === v || T[3*t+1] === v || T[3*t+2] === v;
  let colapsos = 0;
  const avaliar = (u, v, teto, aplicar) => {
    const anel = vt.get(u); const some = [], fica = [];
    for (const t of anel) (contem(t, v) ? some : fica).push(t);
    const deFeicao = feic.has(u);
    if (some.length !== (deFeicao && ar1(u, v) ? 1 : 2)) return Infinity;
    // condição do elo: os vizinhos comuns de u e v são só os terceiros vértices dos triângulos que somem
    const viz = new Set(); for (const t of anel) for (let k = 0; k < 3; k++) { const w = T[3*t+k]; if (w !== u && w !== v) viz.add(w); }
    let comuns = 0; const vizV = new Set(); for (const t of vt.get(v)) for (let k = 0; k < 3; k++) vizV.add(T[3*t+k]); for (const w of viz) if (vizV.has(w)) comuns++;
    if (comuns !== some.length) return Infinity;
    const novos = []; // [t, a, b, c, normal]
    for (const t of fica) { const a = T[3*t] === u ? v : T[3*t], b = T[3*t+1] === u ? v : T[3*t+1], c = T[3*t+2] === u ? v : T[3*t+2]; const n = normal(a, b, c); if (!n[3]) return Infinity;
      const o = normal(T[3*t], T[3*t+1], T[3*t+2]); if (n[0]*o[0]+n[1]*o[1]+n[2]*o[2] < 0.5) return Infinity;
      for (const w of [a, b, c]) { const nw = vn.get(w); if (nw && Math.acos(Math.min(1, n[0]*nw[0]+n[1]*nw[1]+n[2]*nw[2])) * RAD > lim.get(w)) return Infinity; }
      novos.push([t, a, b, c, n]); }
    if (!novos.length) return Infinity;
    let custo = 0; const destino = [];
    const pontos = [u]; for (const t of anel) { const l = pts.get(t); if (l) for (const p of l) pontos.push(p); }
    for (const p of pontos) { let m = Infinity, q = null; for (const nv of novos) { const d = distPT(P[3*p], P[3*p+1], P[3*p+2], P, nv[1], nv[2], nv[3]); if (d < m) { m = d; q = nv; } }
      m = Math.sqrt(m); if (m > teto) return Infinity; if (m > custo) custo = m;
      const np = vn.get(p); if (np && Math.acos(Math.min(1, q[4][0]*np[0]+q[4][1]*np[1]+q[4][2]*np[2])) * RAD > lim.get(p)) return Infinity;
      destino.push(q[0]); }
    for (const [, a, b, c] of novos) { // o triângulo novo contra a malha original
      const am = [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]];
      for (const [i, j, k] of am) { const d = distancia(grade, i*P[3*a]+j*P[3*b]+k*P[3*c], i*P[3*a+1]+j*P[3*b+1]+k*P[3*c+1], i*P[3*a+2]+j*P[3*b+2]+k*P[3*c+2], teto * 4); if (d > teto) return Infinity; if (d > custo) custo = d; } }
    let outro = -1, daLinha = null;
    if (deFeicao) { for (const w of feic.get(u)) if (w !== v) outro = w; daLinha = [u, ...(ptsAresta.get(ek(u, v)) ?? []), ...(ptsAresta.get(ek(u, outro)) ?? [])];
      if (feic.get(v).has(outro)) return Infinity;
      for (const p of daLinha) { const d = distPS(P, p, v, outro); if (d > teto) return Infinity; if (d > custo) custo = d; } }
    if (!aplicar) return custo;
    for (const t of anel) pts.delete(t);
    pontos.forEach((p, i) => { let l = pts.get(destino[i]); if (!l) pts.set(destino[i], l = []); l.push(p); });
    for (const t of some) { vivo[t] = 0; for (let k = 0; k < 3; k++) { const w = T[3*t+k]; if (w !== u) { const l = vt.get(w); l.splice(l.indexOf(t), 1); } } }
    const lv = vt.get(v); for (const [t, a, b, c] of novos) { T[3*t] = a; T[3*t+1] = b; T[3*t+2] = c; lv.push(t); }
    vt.delete(u);
    if (deFeicao) { ptsAresta.delete(ek(u, v)); ptsAresta.delete(ek(u, outro)); ptsAresta.set(ek(v, outro), daLinha); feic.delete(u); const fv = feic.get(v); fv.delete(u); fv.add(outro); const fo = feic.get(outro); fo.delete(u); fo.add(v); }
    colapsos++; return custo;
  };
  const ar1 = (u, v) => feic.get(u)?.has(v) && bordaAberta(u, v);
  const bordaAberta = (u, v) => { let n = 0; for (const t of vt.get(u)) if (contem(t, v)) n++; return n === 1; };
  const ordem = [...vt.keys()].sort((a, b) => a - b);
  for (const fr of [0.25, 0.5, 1]) { const teto = eps * fr;
    for (let volta = 0; volta < 12; volta++) { const antes = colapsos; const tocado = new Set();
      for (const u of ordem) { if (!vt.has(u) || preso.has(u) || tocado.has(u)) continue;
        const cand = feic.has(u) ? [...feic.get(u)] : (() => { const s = new Set(); for (const t of vt.get(u)) for (let k = 0; k < 3; k++) if (T[3*t+k] !== u) s.add(T[3*t+k]); return [...s]; })();
        cand.sort((a, b) => a - b); let melhor = Infinity, alvo = -1;
        for (const v of cand) { const c = avaliar(u, v, teto, false); if (c < melhor) { melhor = c; alvo = v; } }
        if (alvo < 0) continue;
        const anel = vt.get(u).slice(); for (const t of anel) for (let k = 0; k < 3; k++) tocado.add(T[3*t+k]);
        avaliar(u, alvo, teto, true); }
      if (colapsos - antes < 0.003 * vt.size) break; } }
  const R = []; for (let t = 0; t < nT; t++) if (vivo[t]) R.push(T[3*t], T[3*t+1], T[3*t+2]);
  return { T: new Uint32Array(R), colapsos, presos: preso.size, deFeicao: feic.size, vertices: vt.size };
}
