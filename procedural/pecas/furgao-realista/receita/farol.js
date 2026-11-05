/* furgao-realista, receita/farol.js — os faróis dianteiros e os piscas (forma A de 2026-11-05, `referencias/farol-dianteiro.esboco.json`):
 * cada farol é um vão aberto na chapa pronta por `aberturaPorContorno` na vista frontal ([x, y] em mm, na camada da frente), com a lente
 * recuada, e o pisca é um segundo vão aberto na lente do farol, o contorno dele cortado pelo do farol recuado `pisca_margem` (o vão não
 * pode encostar na borda do sólido que corta). O lado esquerdo (+x) leva o desenho, e o direito o espelha. */
const area2 = (p) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0);

/** Corta o polígono `p` pelo polígono convexo `c` recuado `margem` (Sutherland e Hodgman), os dois em [x, y]. */
export function cortarPorConvexo(p, c, margem) {
  const ccw = area2(c) > 0 ? c : [...c].reverse();
  let saida = p;
  for (let i = 0; i < ccw.length; i += 1) {
    const a = ccw[i]; const b = ccw[(i + 1) % ccw.length];
    const t = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(...t);
    const n = [t[1] / l, -t[0] / l];
    const lim = n[0] * a[0] + n[1] * a[1] - margem;
    const entrada = saida; saida = [];
    for (let k = 0; k < entrada.length; k += 1) {
      const q = entrada[k]; const r = entrada[(k + 1) % entrada.length];
      const dq = n[0] * q[0] + n[1] * q[1] - lim; const dr = n[0] * r[0] + n[1] * r[1] - lim;
      if (dq <= 0) saida.push(q);
      if ((dq < 0 && dr > 0) || (dq > 0 && dr < 0)) { const s = dq / (dq - dr); saida.push([q[0] + s * (r[0] - q[0]), q[1] + s * (r[1] - q[1])]); }
    }
  }
  return saida;
}

/** O contorno fechado de `curva2d` por retos, a partir de pontos [x, y] em mm, levados por `esc` (m, de mm a metro). */
export const contornoPorRetos = (pontos, esc) => ({
  inicio: pontos[0].map(esc), trechos: [...pontos.slice(1), pontos[0]].map((p) => ({ reto: p.map(esc) })),
});

/** Os dois faróis e os dois piscas, em mm [x, y]: o esquerdo (+x) é o desenho da TABELA e o direito o espelho, na ordem invertida. */
export function derivarFarois(T) {
  const espelhar = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
  const pisca = cortarPorConvexo(T.pisca_perfil, T.farol_perfil, T.pisca_margem);
  return [
    { lado: 'Esquerdo', farol: T.farol_perfil, pisca },
    { lado: 'Direito', farol: espelhar(T.farol_perfil), pisca: espelhar(pisca) },
  ];
}
