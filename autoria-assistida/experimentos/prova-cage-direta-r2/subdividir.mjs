/* Compilador privado R2: um nível Catmull-Clark para cage de quadriláteros. */
const chave = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
const media = (pontos) => pontos[0].map((_, eixo) => pontos.reduce((soma, ponto) => soma + ponto[eixo], 0) / pontos.length);

export function subdividirUmNivel(cage) {
  const vincos = cage.vincos ?? new Map();
  const faces = [...cage.F.entries()].map(([id, face]) => ({ id, ...face })).sort((a, b) => a.id - b.id);
  const arestas = new Map();
  const facesDoVertice = new Map(); const arestasDoVertice = new Map();
  const pontosDeFace = new Map(faces.map((face) => [face.id, media(face.vs.map((id) => cage.V.get(id)))]));
  for (const face of faces) for (let i = 0; i < 4; i += 1) {
    const a = face.vs[i], b = face.vs[(i + 1) % 4], k = chave(a, b);
    if (!arestas.has(k)) arestas.set(k, { a, b, faces: [] });
    arestas.get(k).faces.push(face.id);
    if (!arestasDoVertice.has(a)) arestasDoVertice.set(a, new Set());
    if (!arestasDoVertice.has(b)) arestasDoVertice.set(b, new Set());
    arestasDoVertice.get(a).add(k); arestasDoVertice.get(b).add(k);
    if (!facesDoVertice.has(a)) facesDoVertice.set(a, new Set());
    facesDoVertice.get(a).add(face.id);
  }
  const pontosDeAresta = new Map();
  const nitidez = (k, e) => e.faces.length === 1 ? Infinity : vincos.get(k) ?? 0;
  for (const [k, e] of arestas) pontosDeAresta.set(k, nitidez(k, e) >= 1
    ? media([cage.V.get(e.a), cage.V.get(e.b)])
    : media([cage.V.get(e.a), cage.V.get(e.b), ...e.faces.map((id) => pontosDeFace.get(id))]));
  const pontosDeVertice = new Map();
  for (const [id, ponto] of cage.V) {
    const chaves = [...(arestasDoVertice.get(id) ?? [])];
    if (chaves.length === 0) { pontosDeVertice.set(id, [...ponto]); continue; }
    const bordas = chaves.filter((k) => arestas.get(k).faces.length === 1);
    if (bordas.length === 2) {
      const vizinhos = bordas.map((k) => { const e = arestas.get(k); return cage.V.get(e.a === id ? e.b : e.a); });
      pontosDeVertice.set(id, ponto.map((valor, eixo) => (6 * valor + vizinhos[0][eixo] + vizinhos[1][eixo]) / 8));
      continue;
    }
    const agudas = chaves.filter((k) => nitidez(k, arestas.get(k)) >= 1);
    if (agudas.length >= 3) { pontosDeVertice.set(id, [...ponto]); continue; }
    if (agudas.length === 2) {
      const vizinhos = agudas.map((k) => { const e = arestas.get(k); return cage.V.get(e.a === id ? e.b : e.a); });
      pontosDeVertice.set(id, ponto.map((valor, eixo) => (6 * valor + vizinhos[0][eixo] + vizinhos[1][eixo]) / 8));
      continue;
    }
    const idsFaces = [...(facesDoVertice.get(id) ?? [])]; const n = chaves.length;
    const Fmedio = media(idsFaces.map((faceId) => pontosDeFace.get(faceId)));
    const Rmedio = media(chaves.map((k) => { const e = arestas.get(k); return media([cage.V.get(e.a), cage.V.get(e.b)]); }));
    pontosDeVertice.set(id, ponto.map((valor, eixo) => (Fmedio[eixo] + 2 * Rmedio[eixo] + (n - 3) * valor) / n));
  }
  const V = new Map(); const vertice = new Map(); const aresta = new Map(); const centro = new Map(); let proximo = 0;
  for (const [id] of [...cage.V].sort((a, b) => a[0] - b[0])) { vertice.set(id, proximo); V.set(proximo, pontosDeVertice.get(id)); proximo += 1; }
  for (const [k, e] of [...arestas].sort()) {
    aresta.set(k, proximo); V.set(proximo, pontosDeAresta.get(k)); proximo += 1;
  }
  for (const face of faces) { centro.set(face.id, proximo); V.set(proximo, pontosDeFace.get(face.id)); proximo += 1; }
  const F = new Map(); let id = 0;
  for (const face of faces) for (let i = 0; i < 4; i += 1) {
    const atual = face.vs[i], anterior = face.vs[(i + 3) % 4], proximoVertice = face.vs[(i + 1) % 4];
    F.set(id, { vs: [vertice.get(atual), aresta.get(chave(atual, proximoVertice)), centro.get(face.id), aresta.get(chave(anterior, atual))], parte: face.parte }); id += 1;
  }
  return { V, F, vincos: new Map() };
}
