/* separar-corpos.js — separação determinística de componentes conexos por parte. */
export function separarCorpos(malha) {
  const faces = malha.faces.slice().sort((a, b) => a.id - b.id);
  const porFace = new Map(faces.map((face) => [face.id, face]));
  const vizinhos = new Map(faces.map((face) => [face.id, new Set()]));
  for (const lista of malha.arestas.values()) {
    if (lista.length !== 2) continue;
    const f0 = porFace.get(lista[0].face);
    const f1 = porFace.get(lista[1].face);
    if (f0 && f1 && f0.parte === f1.parte) {
      vizinhos.get(f0.id).add(f1.id);
      vizinhos.get(f1.id).add(f0.id);
    }
  }
  const vistos = new Set();
  const contagemPorParte = new Map();
  const corpos = [];
  for (const face of faces) {
    if (vistos.has(face.id)) continue;
    const fila = [face.id];
    const ids = [];
    vistos.add(face.id);
    while (fila.length) {
      const atual = fila.pop();
      ids.push(atual);
      for (const vizinho of [...vizinhos.get(atual)].sort((a, b) => b - a)) {
        if (!vistos.has(vizinho)) {
          vistos.add(vizinho);
          fila.push(vizinho);
        }
      }
    }
    const numero = (contagemPorParte.get(face.parte) ?? 0) + 1;
    contagemPorParte.set(face.parte, numero);
    corpos.push({
      nome: numero === 1 ? face.parte : `${face.parte}__${numero}`,
      parte: face.parte,
      faces: ids.map((id) => porFace.get(id)).sort((a, b) => a.id - b.id),
    });
  }
  return corpos.sort((a, b) => a.nome.localeCompare(b.nome, 'en'));
}
