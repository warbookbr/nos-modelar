/* casca-aberta-por-parte.mjs — qual parte da peça tem casca aberta, e com quantas arestas soltas. A topologia diz "aresta X pertence a uma face só" sobre a
   malha inteira; quem modela precisa do nome da parte (um loft sem polo vira tubo aberto, e achar qual por bissecção custou uma sessão inteira). A conta é a
   mesma da topologia (aresta de uma face só), feita parte a parte, sobre as faces com `parte`. */

const chave = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** As partes com ao menos uma aresta de uma face só, na ordem de aparição: `[{ parte, arestas }]`. */
export function partesComCascaAberta(neutro) {
  const porParte = new Map();
  for (const face of neutro.F.values()) {
    if (!face.parte) continue;
    if (!porParte.has(face.parte)) porParte.set(face.parte, new Map());
    const arestas = porParte.get(face.parte);
    const vs = face.vs;
    for (let k = 0; k < vs.length; k += 1) {
      const c = chave(vs[k], vs[(k + 1) % vs.length]);
      arestas.set(c, (arestas.get(c) ?? 0) + 1);
    }
  }
  const abertas = [];
  for (const [parte, arestas] of porParte) {
    let soltas = 0;
    for (const n of arestas.values()) if (n === 1) soltas += 1;
    if (soltas) abertas.push({ parte, arestas: soltas });
  }
  return abertas;
}

/** O nome da parte de uma face, ou null quando a face não tem identidade. */
export function parteDaFace(neutro, idDaFace) {
  return neutro.F.get(idDaFace)?.parte ?? null;
}
