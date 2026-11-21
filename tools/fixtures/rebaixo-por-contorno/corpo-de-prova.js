/* corpo-de-prova.js — corpo de prova neutro (sem domínio) para o plano de rebaixo por contorno. */
import { chapaDeGrade } from '../aberturas-em-teste/chapas.js';

/** Bloco curvo subdividido de 400 × 400 mm e 40 mm de espessura (dupla curvatura de 20 mm), pronto para rebaixos de até 20 mm. */
export function blocoCurvoDeProva(opcoes = {}) {
  return chapaDeGrade({
    nx: 6,
    nz: 6,
    passo: 80,
    altura: (x, z) => 20 * Math.sin(x / 150) * Math.cos(z / 180),
    espessura: 40,
    niveis: 2,
    ...opcoes,
  });
}

/** Mede a altura máxima da superfície (ao longo de `eixo`, direção `+` ou `-`) no ponto 2D `(u, v)` da vista. */
export function alturaNaVista(st, eixo, sentido, u, v) {
  const idx = eixo === 'x' ? [2, 1, 0] : eixo === 'y' ? [0, 2, 1] : [0, 1, 2];
  const [iu, iv, iw] = idx;
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const hits = [];
  for (const f of st.F.values()) {
    const pts = f.vs.map((id) => st.V.get(id));
    for (let k = 1; k < pts.length - 1; k++) {
      const a = [pts[0][iu], pts[0][iv], pts[0][iw]];
      const b = [pts[k][iu], pts[k][iv], pts[k][iw]];
      const c = [pts[k + 1][iu], pts[k + 1][iv], pts[k + 1][iw]];
      const p = [u, v];
      const d1 = orient(a, b, p), d2 = orient(b, c, p), d3 = orient(c, a, p);
      if ((d1 >= -1e-12 && d2 >= -1e-12 && d3 >= -1e-12) || (d1 <= 1e-12 && d2 <= 1e-12 && d3 <= 1e-12)) {
        const A = orient(a, b, c);
        if (Math.abs(A) < 1e-15) continue;
        const w = (a[2] * d2 + b[2] * d3 + c[2] * d1) / (d1 + d2 + d3);
        hits.push(w);
      }
    }
  }
  if (!hits.length) return null;
  return sentido === '+' ? Math.max(...hits) : Math.min(...hits);
}
