/* Sonda N3.5: suavização local guiada exclusivamente por continuidade C1.
   É isolada: não importa o núcleo nem reescreve a receita do quarto dianteiro. */
const EPSILON = 1e-9;
const subtrair = (a, b) => a.map((v, i) => v - b[i]);
const somar = (a, b) => a.map((v, i) => v + b[i]);
const escalar = (a, k) => a.map((v) => v * k);
const produto = (a, b) => a.reduce((soma, v, i) => soma + v * b[i], 0);
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[0], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const modulo = (v) => Math.hypot(...v);
const normalizar = (v) => escalar(v, 1 / (modulo(v) || 1));
const chaveAresta = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
const limitar = (v, minimo, maximo) => Math.max(minimo, Math.min(maximo, v));
const percentil = (valores, p) => {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.round((ordenados.length - 1) * p))];
};

function verticesComoMapa(malha) {
  return new Map(malha.V.map((item, indice) => Array.isArray(item) && item.length === 4 ? [item[0], item.slice(1)] : [indice, item.slice()]));
}

function facesNormalizadas(malha) {
  return malha.F.map((item, indice) => Array.isArray(item) ? { id: item[0] ?? indice, vs: Array.isArray(item[1]) ? item[1] : item, parte: item[2] ?? null } : { id: item.id ?? indice, vs: item.vs, parte: item.parte ?? null });
}

function normalDaFace(face, vertices) {
  const origem = vertices.get(face.vs[0]); let normal = [0, 0, 0];
  for (let i = 1; i < face.vs.length - 1; i += 1) normal = somar(normal, cruz(subtrair(vertices.get(face.vs[i]), origem), subtrair(vertices.get(face.vs[i + 1]), origem)));
  return normalizar(normal);
}

export function topologiaGuiadaPorC1(malha, { limiteProtecaoGraus = 25 } = {}) {
  const vertices = verticesComoMapa(malha); const faces = facesNormalizadas(malha);
  const normais = new Map(faces.map((face) => [face.id, normalDaFace(face, vertices)]));
  const arestas = new Map();
  for (const face of faces) for (let i = 0; i < face.vs.length; i += 1) {
    const a = face.vs[i], b = face.vs[(i + 1) % face.vs.length], chave = chaveAresta(a, b);
    if (!arestas.has(chave)) arestas.set(chave, { a, b, faces: [] });
    arestas.get(chave).faces.push(face.id);
  }
  const protegidas = new Set(); const protegidos = new Set(); const vizinhos = new Map([...vertices.keys()].map((id) => [id, new Set()])); const diedrosSuaves = [];
  for (const [chave, aresta] of arestas) {
    const [a, b] = aresta.faces;
    const graus = aresta.faces.length === 2 ? Math.acos(limitar(produto(normais.get(a), normais.get(b)), -1, 1)) * 180 / Math.PI : Infinity;
    if (arestas.get(chave).faces.length !== 2 || graus >= limiteProtecaoGraus) {
      protegidas.add(chave); protegidos.add(aresta.a); protegidos.add(aresta.b);
      continue;
    }
    diedrosSuaves.push(graus); vizinhos.get(aresta.a).add(aresta.b); vizinhos.get(aresta.b).add(aresta.a);
  }
  return { vertices, faces, arestas, protegidas, protegidos, vizinhos, diedrosSuaves, limiteProtecaoGraus };
}

export function medirRegiaoSuave(malha, opcoes = {}) {
  const topologia = topologiaGuiadaPorC1(malha, opcoes);
  return {
    arestasProtegidas: topologia.protegidas.size,
    verticesProtegidos: topologia.protegidos.size,
    adjacenciasSuaves: topologia.diedrosSuaves.length,
    diedroSuaveMedioGraus: Number((topologia.diedrosSuaves.reduce((soma, v) => soma + v, 0) / (topologia.diedrosSuaves.length || 1)).toFixed(3)),
    diedroSuaveP95Graus: Number(percentil(topologia.diedrosSuaves, .95).toFixed(3)),
    diedroSuaveMaximoGraus: Number(Math.max(0, ...topologia.diedrosSuaves).toFixed(3)),
  };
}

export function suavizarGuiadoPorC1(malha, { iteracoes = 6, lambda = .18, limiteProtecaoGraus = 25 } = {}) {
  const original = verticesComoMapa(malha); const topologia = topologiaGuiadaPorC1(malha, { limiteProtecaoGraus });
  let atual = new Map([...original].map(([id, ponto]) => [id, ponto.slice()]));
  for (let passo = 0; passo < iteracoes; passo += 1) {
    const proximo = new Map();
    for (const [id, ponto] of atual) {
      if (topologia.protegidos.has(id) || topologia.vizinhos.get(id).size === 0) { proximo.set(id, ponto.slice()); continue; }
      const media = [...topologia.vizinhos.get(id)].map((vizinho) => atual.get(vizinho)).reduce((soma, item) => somar(soma, item), [0, 0, 0]).map((v) => v / topologia.vizinhos.get(id).size);
      proximo.set(id, somar(ponto, escalar(subtrair(media, ponto), lambda)));
    }
    atual = proximo;
  }
  const V = malha.V.map((item, indice) => {
    const id = Array.isArray(item) && item.length === 4 ? item[0] : indice;
    const ponto = atual.get(id);
    return Array.isArray(item) && item.length === 4 ? [id, ...ponto] : ponto;
  });
  const deslocamentos = [...original.keys()].map((id) => modulo(subtrair(atual.get(id), original.get(id))));
  return {
    malha: { V, F: malha.F.map((face) => Array.isArray(face) ? [...face] : { ...face, vs: face.vs.slice() }) },
    parametros: { iteracoes, lambda, limiteProtecaoGraus },
    preservacao: { verticesProtegidos: topologia.protegidos.size, arestasProtegidas: topologia.protegidas.size, deslocamentoMaximoMm: Number(Math.max(...deslocamentos).toFixed(3)), deslocamentoMedioMm: Number((deslocamentos.reduce((soma, v) => soma + v, 0) / deslocamentos.length).toFixed(3)) },
  };
}
