// geometria de medida: triangulação em leque, distância ponto-triângulo, grade uniforme, desvio unilateral amostrado
export function triangular(faces) { const t = []; for (const f of faces) for (let k = 1; k + 1 < f.length; k++) t.push(f[0], f[k], f[k + 1]); return t; }
export function distPT(px, py, pz, P, a, b, c) {
  const ax = P[3*a], ay = P[3*a+1], az = P[3*a+2];
  const abx = P[3*b]-ax, aby = P[3*b+1]-ay, abz = P[3*b+2]-az, acx = P[3*c]-ax, acy = P[3*c+1]-ay, acz = P[3*c+2]-az;
  const apx = px-ax, apy = py-ay, apz = pz-az;
  const d1 = abx*apx+aby*apy+abz*apz, d2 = acx*apx+acy*apy+acz*apz;
  let qx, qy, qz;
  if (d1 <= 0 && d2 <= 0) { qx = ax; qy = ay; qz = az; }
  else {
    const bpx = apx-abx, bpy = apy-aby, bpz = apz-abz; const d3 = abx*bpx+aby*bpy+abz*bpz, d4 = acx*bpx+acy*bpy+acz*bpz;
    if (d3 >= 0 && d4 <= d3) { qx = ax+abx; qy = ay+aby; qz = az+abz; }
    else {
      const vc = d1*d4-d3*d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1/(d1-d3); qx = ax+v*abx; qy = ay+v*aby; qz = az+v*abz; }
      else {
        const cpx = apx-acx, cpy = apy-acy, cpz = apz-acz; const d5 = abx*cpx+aby*cpy+abz*cpz, d6 = acx*cpx+acy*cpy+acz*cpz;
        if (d6 >= 0 && d5 <= d6) { qx = ax+acx; qy = ay+acy; qz = az+acz; }
        else {
          const vb = d5*d2-d1*d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2/(d2-d6); qx = ax+w*acx; qy = ay+w*acy; qz = az+w*acz; }
          else {
            const va = d3*d6-d5*d4;
            if (va <= 0 && (d4-d3) >= 0 && (d5-d6) >= 0) { const w = (d4-d3)/((d4-d3)+(d5-d6)); qx = ax+abx+w*(acx-abx); qy = ay+aby+w*(acy-aby); qz = az+abz+w*(acz-abz); }
            else { const den = 1/(va+vb+vc); const v = vb*den, w = vc*den; qx = ax+abx*v+acx*w; qy = ay+aby*v+acy*w; qz = az+abz*v+acz*w; }
          }
        }
      }
    }
  }
  const dx = px-qx, dy = py-qy, dz = pz-qz; return dx*dx+dy*dy+dz*dz;
}
export function criarGrade(P, T, cel) {
  let mn = [1e30,1e30,1e30], mx = [-1e30,-1e30,-1e30];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { if (P[i+k] < mn[k]) mn[k] = P[i+k]; if (P[i+k] > mx[k]) mx[k] = P[i+k]; }
  const n = mx.map((x, k) => Math.max(1, Math.ceil((x - mn[k]) / cel) + 1));
  const cels = new Map(); const ch = (i, j, k) => (i * n[1] + j) * n[2] + k;
  for (let t = 0; t < T.length; t += 3) {
    const lo = [1e30,1e30,1e30], hi = [-1e30,-1e30,-1e30];
    for (let q = 0; q < 3; q++) for (let k = 0; k < 3; k++) { const v = P[3*T[t+q]+k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const a = lo.map((v, k) => Math.floor((v - mn[k]) / cel)), b = hi.map((v, k) => Math.floor((v - mn[k]) / cel));
    for (let i = a[0]; i <= b[0]; i++) for (let j = a[1]; j <= b[1]; j++) for (let k = a[2]; k <= b[2]; k++) { const c = ch(i, j, k); let l = cels.get(c); if (!l) cels.set(c, l = []); l.push(t); }
  }
  return { P, T, cel, mn, n, cels, ch };
}
export function distancia(g, px, py, pz, teto = Infinity) {
  const { P, T, cel, mn, n, cels, ch } = g; const c = [px, py, pz].map((v, k) => Math.floor((v - mn[k]) / cel));
  let melhor = teto * teto; let qual = -1; const maxR = Math.max(...n);
  for (let r = 0; r <= maxR; r++) {
    if (r > 0 && ((r - 1) * cel) ** 2 > melhor) break;
    for (let i = c[0]-r; i <= c[0]+r; i++) { if (i < 0 || i >= n[0]) continue; for (let j = c[1]-r; j <= c[1]+r; j++) { if (j < 0 || j >= n[1]) continue; for (let k = c[2]-r; k <= c[2]+r; k++) { if (k < 0 || k >= n[2]) continue;
      if (Math.max(Math.abs(i-c[0]), Math.abs(j-c[1]), Math.abs(k-c[2])) !== r) continue;
      const l = cels.get(ch(i, j, k)); if (!l) continue; for (const t of l) { const d = distPT(px, py, pz, P, T[t], T[t+1], T[t+2]); if (d < melhor) { melhor = d; qual = t; } } } } }
  }
  distancia.tri = qual; return Math.sqrt(melhor);
}
// amostras da malha A (vértices + baricentros + meios de aresta) -> distância até a malha B; devolve max, p99, média (na unidade da malha)
export function desvio(PA, TA, gB, soVertices = false) {
  const ds = []; const visto = new Uint8Array(PA.length / 3);
  if (soVertices) for (let v = 0; v < PA.length / 3; v++) ds.push(distancia(gB, PA[3*v], PA[3*v+1], PA[3*v+2]));
  for (let t = 0; t < TA.length; t += 3) {
    const [a, b, c] = [TA[t], TA[t+1], TA[t+2]];
    for (const v of [a, b, c]) if (!visto[v]) { visto[v] = 1; ds.push(distancia(gB, PA[3*v], PA[3*v+1], PA[3*v+2])); }
    ds.push(distancia(gB, (PA[3*a]+PA[3*b]+PA[3*c])/3, (PA[3*a+1]+PA[3*b+1]+PA[3*c+1])/3, (PA[3*a+2]+PA[3*b+2]+PA[3*c+2])/3));
    for (const [u, v] of [[a,b],[b,c],[c,a]]) if (u < v) ds.push(distancia(gB, (PA[3*u]+PA[3*v])/2, (PA[3*u+1]+PA[3*v+1])/2, (PA[3*u+2]+PA[3*v+2])/2));
  }
  ds.sort((x, y) => x - y); const n = ds.length;
  return { max: ds[n-1], p99: ds[Math.floor(n*0.99)], media: ds.reduce((s, x) => s + x, 0) / n, n };
}
// maior ângulo entre normais de triângulos vizinhos que NÃO passam do limiar de quina (graus): o facetamento que a luz rasante mostra
export function diedros(P, T, quina = 30) {
  const nrm = new Float64Array(T.length); const arestas = new Map();
  for (let t = 0; t < T.length; t += 3) { const [a,b,c] = [T[t],T[t+1],T[t+2]]; const ux=P[3*b]-P[3*a],uy=P[3*b+1]-P[3*a+1],uz=P[3*b+2]-P[3*a+2],vx=P[3*c]-P[3*a],vy=P[3*c+1]-P[3*a+1],vz=P[3*c+2]-P[3*a+2];
    let x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx; const l=Math.hypot(x,y,z)||1; nrm[t]=x/l;nrm[t+1]=y/l;nrm[t+2]=z/l;
    for (const [u, v] of [[a,b],[b,c],[c,a]]) { const k = u < v ? u * 4294967296 + v : v * 4294967296 + u; const o = arestas.get(k); if (o === undefined) arestas.set(k, t); else arestas.set(k, [o, t]); } }
  const angs = []; let quinas = 0;
  for (const v of arestas.values()) { if (!Array.isArray(v)) continue; const [s, t] = v; const c = nrm[s]*nrm[t]+nrm[s+1]*nrm[t+1]+nrm[s+2]*nrm[t+2]; const a = Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI; if (a > quina) quinas++; else angs.push(a); }
  angs.sort((x, y) => x - y); const n = angs.length;
  return { max: angs[n-1], p99: angs[Math.floor(n*0.99)], p90: angs[Math.floor(n*0.9)], media: angs.reduce((s,x)=>s+x,0)/n, quinas };
}
