/* aresta-solta.mjs — régua de malha: a aresta que só uma face usa, o que deixa a casca aberta (a fresta que o `unir` deixava com a frente de um tubo rente à tampa de outro,
   plano "costuras e furos limpos"). Lê só `neutro.V` e `neutro.F`; uma aresta repetida por mais de duas faces não conta aqui (é não-manifold, de outra régua). */

/** { total, exemplos: [{ a, b, face }] }: toda aresta (a, b) que exatamente uma face usa, com a face. */
export function medirArestaSolta(neutro) {
  const usos = new Map();
  for (const face of neutro.F.values()) {
    if (!Array.isArray(face.vs)) continue;
    for (let i = 0; i < face.vs.length; i++) {
      const a = face.vs[i], b = face.vs[(i + 1) % face.vs.length];
      if (a === b) continue;
      const chave = a < b ? `${a}|${b}` : `${b}|${a}`;
      const u = usos.get(chave);
      if (u) u.n++; else usos.set(chave, { a, b, face: face.id, n: 1 });
    }
  }
  const soltas = [...usos.values()].filter((u) => u.n === 1);
  return { total: soltas.length, exemplos: soltas.slice(0, 8).map(({ a, b, face }) => ({ a, b, face })) };
}
