/* tracos-comum.mjs — o que os três esboços de traços do fastback genérico dividem: a placa por contorno e as cores.
 * Tudo em mm, [x, y] na vista em que a placa é desenhada, x para a direita de quem olha; o lado -x sai pelo espelho do núcleo.
 * As placas são planas: o que está em disputa é o desenho do traço, e a curvatura da chapa fica para a prancha. */
export const COR = { lataria: '#a8322d', escuro: '#1d1e20', lente: '#e8483a', claro: '#d9dde0', lamina: '#44474c' };

/* o contorno de extrusão em z: o perfil [u, v] vai a (x, -y), então v = -y; com concordância em cada canto quando há raio */
const contorno = (pts, raio) => ({
  inicio: [pts[0][0], -pts[0][1]],
  trechos: [...pts.slice(1), pts[0]].flatMap((p) => [{ reto: [p[0], -p[1]] }, ...(raio ? [{ concordancia: raio }] : [])]),
});
const meio = (pts) => {
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};

/** Uma placa de contorno `pts`, com `saida` mm de relevo a partir de z0, na cor dada; `espelha` põe a cópia do lado -x. */
export function placa(id, pts, { raio = 0, saida = 8, z0 = 0, cor, espelha } = {}) {
  const [x, y] = meio(pts);
  return {
    id, op: 'extrusao', args: { eixo: 'z', altura: saida, perfil: { contorno: contorno(pts, raio) } }, centro: [x, y, z0 + saida / 2],
    ...(cor ? { cor } : {}), ...(espelha ? { espelha: 'x' } : {}),
  };
}

/** O retângulo de (x0, y0) a (x1, y1), em volta anti-horária. */
export const ret = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** Lâminas deitadas de 10 mm, `total` delas a cada `passo` mm a partir de y. */
export const laminas = (id, meia, y, passo, total, z0 = 6) => ({
  id, op: 'cubo', args: { larg: 2 * meia, alt: 10, prof: 8 }, centro: [0, y, z0 + 4], cor: COR.lamina, repete: { total, d: [0, passo, 0] },
});

/** O esboço de uma lista de opções sobre a mesma base. */
export const esboco = (base, opcoes) => ({
  formato: 'esboco-nucleo@1', vista: 'frontal',
  opcoes: opcoes.map((o) => ({ titulo: o.titulo, nota: o.nota, formas: [...base, ...o.formas] })),
});
