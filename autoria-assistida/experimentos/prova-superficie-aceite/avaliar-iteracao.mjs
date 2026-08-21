/* Juízo local da iteração; não é o aceite R0. Ele existe para impedir que uma
   malha inicial seja confundida com a prova que o plano exige. */
export function avaliarIteracao(pele) {
  const partes = new Set([...pele.F.values()].map((f) => f.parte));
  const achados = [];
  if (!partes.has('arcoDeRoda') || !pele.aberturas?.arcoDeRoda?.loop?.length) achados.push('sem abertura de roda topológica');
  if (!pele.aberturas?.farol?.removida || pele.aberturas.farol.loop?.length !== 4) achados.push('sem recorte de farol geométrico');
  if (!partes.has('quebraDeOmbro')) achados.push('sem região de quebra de ombro');
  if (componentesConectados(pele) !== 1) achados.push('arco ou pele desconectados');
  return { decisao: achados.length ? 'reprovado' : 'pronta-para-leitura-visual', achados };
}

export function componentesConectados(pele) {
  const porVertice = new Map();
  for (const face of pele.F.values()) for (const vertice of face.vs) {
    if (!porVertice.has(vertice)) porVertice.set(vertice, []);
    porVertice.get(vertice).push(face.id);
  }
  const vizinhas = new Map([...pele.F.keys()].map((id) => [id, new Set()]));
  for (const faces of porVertice.values()) for (const a of faces) for (const b of faces) if (a !== b) vizinhas.get(a).add(b);
  const restantes = new Set(pele.F.keys()); let componentes = 0;
  while (restantes.size) {
    componentes += 1;
    const fila = [restantes.values().next().value];
    while (fila.length) {
      const atual = fila.pop();
      if (!restantes.delete(atual)) continue;
      for (const outra of vizinhas.get(atual)) if (restantes.has(outra)) fila.push(outra);
    }
  }
  return componentes;
}
