/* silhueta-da-superficie.mjs — extensão de uma malha de triângulos em fatias ao longo de um eixo, medida na SUPERFÍCIE e não nos vértices.

   Triângulo grande (teto, chão) tem vértices só nas pontas; ler só vértices deixa as fatias do meio sem dado ou com a extensão errada. Aqui cada triângulo é
   recortado contra os limites da fatia (Sutherland-Hodgman contra o slab) e os pontos resultantes acumulam o mínimo e o máximo nos três eixos. Serve ao gerador
   da referência (modelo-de-referencia.mjs, que importa este arquivo no navegador) e ao comparador (comparar-silhueta.mjs). Unidade-agnóstico: as fatias vêm na
   mesma unidade dos triângulos. */

const EPS = 1e-9;

/* Recorta o polígono (lista de [x,y,z]) ao slab de..ate no eixo dado. */
export function recortarAoSlab(poligono, eixo, de, ate) {
  let p = poligono;
  for (const [lado, limite] of [[1, de], [-1, ate]]) {
    const saida = [];
    for (let i = 0; i < p.length; i += 1) {
      const a = p[i]; const b = p[(i + 1) % p.length];
      const da = lado * (a[eixo] - limite); const db = lado * (b[eixo] - limite);
      const aDentro = da >= -EPS; const bDentro = db >= -EPS;
      if (aDentro) saida.push(a);
      if (aDentro !== bDentro) {
        const t = da / (da - db);
        const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        q[eixo] = limite;
        saida.push(q);
      }
    }
    p = saida;
    if (!p.length) return p;
  }
  return p;
}

/* triangulos: iterável de [[x,y,z],[x,y,z],[x,y,z]]. fatias: [{de, ate}]. Devolve, por fatia, {min:[x,y,z], max:[x,y,z]} ou null quando nenhuma superfície a toca. */
export function extensoesPorFatia(triangulos, eixo, fatias) {
  const r = fatias.map(() => null);
  const ordem = fatias.map((f, i) => [f.de, f.ate, i]);
  for (const t of triangulos) {
    const lo = Math.min(t[0][eixo], t[1][eixo], t[2][eixo]); const hi = Math.max(t[0][eixo], t[1][eixo], t[2][eixo]);
    for (const [de, ate, i] of ordem) {
      if (hi < de - EPS || lo > ate + EPS) continue;
      const pts = (lo >= de - EPS && hi <= ate + EPS) ? t : recortarAoSlab(t, eixo, de, ate);
      for (const p of pts) {
        const e = r[i] ?? (r[i] = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
        for (let k = 0; k < 3; k += 1) { if (p[k] < e.min[k]) e.min[k] = p[k]; if (p[k] > e.max[k]) e.max[k] = p[k]; }
      }
    }
  }
  return r;
}

/* Divide [lo,hi] em n fatias iguais. */
export function fatiasIguais(lo, hi, n) {
  return Array.from({ length: n }, (_, i) => ({ de: lo + (hi - lo) * i / n, ate: lo + (hi - lo) * (i + 1) / n }));
}
