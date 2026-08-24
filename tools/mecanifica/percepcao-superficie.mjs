/* Canal C1: diagnostico de continuidade de superficie, sem dependencia do motor.
   Ele nao julga se algo "parece um carro"; apenas torna variacao de normal
   visivel (zebra/isofota) e mensuravel (diedros entre faces adjacentes). */

const EPSILON = 1e-9;
const subtrair = (a, b) => a.map((v, i) => v - b[i]);
const produtoVetorial = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const produtoEscalar = (a, b) => a.reduce((soma, v, i) => soma + v * b[i], 0);
const modulo = (v) => Math.hypot(...v);
const normalizar = (v) => { const n = modulo(v) || 1; return v.map((x) => x / n); };
const limitar = (v, minimo, maximo) => Math.max(minimo, Math.min(maximo, v));
const chaveAresta = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
const percentil = (valores, p) => {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.round((ordenados.length - 1) * p))];
};

function verticesNormalizados(vertices) {
  if (vertices instanceof Map) return new Map([...vertices].map(([id, ponto]) => [Number(id), [...ponto]]));
  if (!Array.isArray(vertices)) throw new Error('malha.V precisa ser Map ou array');
  return new Map(vertices.map((item, indice) => {
    if (Array.isArray(item) && item.length === 4 && Number.isFinite(item[0])) return [item[0], item.slice(1)];
    return [indice, item];
  }));
}

function facesNormalizadas(faces) {
  const entradas = faces instanceof Map ? [...faces.entries()] : faces.map((face, indice) => [indice, face]);
  return entradas.map(([id, bruto]) => {
    if (Array.isArray(bruto) && Array.isArray(bruto[1])) return { id: bruto[0], vs: bruto[1], parte: bruto[2] ?? null };
    if (Array.isArray(bruto)) return { id, vs: bruto, parte: null };
    return { id, vs: bruto.vs ?? bruto.vertices, parte: bruto.parte ?? null };
  }).filter((face) => Array.isArray(face.vs) && face.vs.length >= 3);
}

export function normalizarMalha(malha) {
  const V = verticesNormalizados(malha.V ?? malha.vertices);
  const faces = facesNormalizadas(malha.F ?? malha.faces);
  if (V.size < 3 || !faces.length) throw new Error('malha sem vertices ou faces suficientes');
  const triangulos = [];
  for (const face of faces) for (let i = 1; i < face.vs.length - 1; i += 1) {
    const vs = [face.vs[0], face.vs[i], face.vs[i + 1]].map(Number);
    const pontos = vs.map((id) => V.get(id));
    if (pontos.some((ponto) => !ponto || ponto.length !== 3)) throw new Error(`face ${face.id} referencia vertice inexistente`);
    const normal = produtoVetorial(subtrair(pontos[1], pontos[0]), subtrair(pontos[2], pontos[0]));
    if (modulo(normal) > EPSILON) triangulos.push({ vs, normal: normalizar(normal), poligono: face.id, parte: face.parte });
  }
  if (!triangulos.length) throw new Error('malha degenerada');
  return { V, triangulos };
}

export function analisarSuperficie(malha, { limiteAbruptoGraus = 25 } = {}) {
  const normalizada = normalizarMalha(malha);
  const arestas = new Map();
  normalizada.triangulos.forEach((triangulo, indice) => {
    for (let i = 0; i < 3; i += 1) {
      const chave = chaveAresta(triangulo.vs[i], triangulo.vs[(i + 1) % 3]);
      if (!arestas.has(chave)) arestas.set(chave, []);
      arestas.get(chave).push(indice);
    }
  });
  const diedros = []; const vizinhos = new Map(); let bordas = 0; let naoManifold = 0;
  for (const triangulos of arestas.values()) {
    if (triangulos.length === 1) { bordas += 1; continue; }
    if (triangulos.length !== 2) { naoManifold += 1; continue; }
    const [a, b] = triangulos.map((indice) => normalizada.triangulos[indice]);
    if (a.poligono === b.poligono) continue;
    const graus = Math.acos(limitar(produtoEscalar(a.normal, b.normal), -1, 1)) * 180 / Math.PI;
    diedros.push(graus);
    if (!vizinhos.has(triangulos[0])) vizinhos.set(triangulos[0], []);
    if (!vizinhos.has(triangulos[1])) vizinhos.set(triangulos[1], []);
    vizinhos.get(triangulos[0]).push(graus); vizinhos.get(triangulos[1]).push(graus);
  }
  const abruptas = diedros.filter((graus) => graus >= limiteAbruptoGraus).length;
  const resumo = {
    formato: 'mecanifica.percepcao-superficie@1',
    vertices: normalizada.V.size,
    triangulos: normalizada.triangulos.length,
    arestasDeBorda: bordas,
    arestasNaoManifold: naoManifold,
    adjacencias: diedros.length,
    diedroMedioGraus: Number((diedros.reduce((soma, v) => soma + v, 0) / (diedros.length || 1)).toFixed(3)),
    diedroP95Graus: Number(percentil(diedros, .95).toFixed(3)),
    diedroMaximoGraus: Number(Math.max(0, ...diedros).toFixed(3)),
    parcelaAbrupta: Number((abruptas / (diedros.length || 1)).toFixed(5)),
    limiteAbruptoGraus,
  };
  /* 19° preserva o toro discretizado do corpus; o corte veio da medição do
     próprio corpus, não de uma tentativa de fazer os reprovados passarem. */
  resumo.leitura = resumo.diedroP95Graus <= 19 && resumo.parcelaAbrupta <= .02 && !resumo.arestasNaoManifold
    ? 'regular-no-canal-c1' : 'irregular-no-canal-c1';
  return { ...resumo, malha: normalizada, diedros, vizinhos };
}

const PALETA_ZEBRA = ['#07182e', '#d9f2ff', '#194970', '#fff4c9', '#113755', '#e6fbff'];
const corZebra = (normal) => {
  const r = normalizar([normal[0], normal[1] - normal[2] * .72, normal[2] + normal[1] * .72]);
  return PALETA_ZEBRA[Math.floor(((Math.atan2(r[0], r[1]) + Math.PI) / (2 * Math.PI)) * PALETA_ZEBRA.length) % PALETA_ZEBRA.length];
};
const corIsofota = (normal) => {
  const intensidade = limitar((produtoEscalar(normal, normalizar([-.35, .8, .48])) + 1) / 2, 0, 1);
  const v = Math.round(35 + intensidade * 205); return `rgb(${v},${Math.round(v * .9)},${Math.round(v * .72)})`;
};
const corCurvatura = (graus) => {
  const t = limitar(graus / 45, 0, 1); return `rgb(${Math.round(30 + 220 * t)},${Math.round(130 - 95 * t)},${Math.round(190 - 135 * t)})`;
};

function projetar(normalizada) {
  const pontos = new Map([...normalizada.V].map(([id, [x, y, z]]) => [id, [x * .78 - z * .62, y * .90 - x * .25 - z * .18]]));
  const xs = [...pontos.values()].map((p) => p[0]), ys = [...pontos.values()].map((p) => p[1]);
  const dx = Math.max(...xs) - Math.min(...xs) || 1, dy = Math.max(...ys) - Math.min(...ys) || 1;
  return new Map([...pontos].map(([id, [x, y]]) => [id, [18 + 224 * (x - Math.min(...xs)) / dx, 18 + 164 * (1 - (y - Math.min(...ys)) / dy)]]));
}

function campoSvg(analise, tipo, { x = 0, y = 0, largura = 260, altura = 220 } = {}) {
  const escalaX = largura / 260, escalaY = altura / 200;
  const pontos = projetar(analise.malha);
  const faces = analise.malha.triangulos.map((triangulo, indice) => {
    /* Décimo de pixel conserva a leitura e evita evidência SVG inflada por
       casas decimais que não existem na imagem rasterizada. */
    const coords = triangulo.vs.map((id) => pontos.get(id).map((v, eixo) => ((eixo ? y : x) + v * (eixo ? escalaY : escalaX)).toFixed(1)).join(',')).join(' ');
    const media = (analise.vizinhos.get(indice) ?? [0]).reduce((soma, v) => soma + v, 0) / (analise.vizinhos.get(indice)?.length || 1);
    const cor = tipo === 'zebra' ? corZebra(triangulo.normal) : tipo === 'isofota' ? corIsofota(triangulo.normal) : corCurvatura(media);
    return `<polygon points="${coords}" fill="${cor}" stroke="#17232d" stroke-opacity=".16" stroke-width=".35"/>`;
  }).join('');
  return `<g>${faces}</g>`;
}

export function renderizarDiagnosticoSvg(analise, { titulo = 'superficie' } = {}) {
  const tipos = [['zebra', 'zebra'], ['isofota', 'isofota'], ['curvatura', 'curvatura']];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="270" viewBox="0 0 840 270">
<rect width="840" height="270" fill="#f4f5f2"/><text x="18" y="28" font-family="system-ui,sans-serif" font-size="17" fill="#18242e">${titulo}</text>
${tipos.map(([tipo, rotulo], indice) => `<g transform="translate(${indice * 280},48)"><text x="14" y="-10" font-family="system-ui,sans-serif" font-size="12" fill="#52606b">${rotulo}</text><rect x="8" y="0" width="260" height="205" rx="6" fill="#dce2e1"/>${campoSvg(analise, tipo, { x: 8, y: 0 })}</g>`).join('')}
<text x="18" y="245" font-family="ui-monospace,monospace" font-size="11" fill="#41515d">p95 ${analise.diedroP95Graus}° · abruptas ${(analise.parcelaAbrupta * 100).toFixed(2)}% · ${analise.leitura}</text></svg>`;
}

export function renderizarPainelZebra(itens) {
  const largura = 280 * itens.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="275" viewBox="0 0 ${largura} 275"><rect width="100%" height="100%" fill="#f4f5f2"/>${itens.map(({ id, analise }, indice) => `<g transform="translate(${indice * 280},0)"><text x="16" y="25" font-family="system-ui,sans-serif" font-size="14" fill="#18242e">${id}</text><rect x="10" y="38" width="260" height="205" rx="6" fill="#dce2e1"/>${campoSvg(analise, 'zebra', { x: 10, y: 38 })}<text x="16" y="264" font-family="ui-monospace,monospace" font-size="10" fill="#41515d">p95 ${analise.diedroP95Graus}° · ${analise.leitura}</text></g>`).join('')}</svg>`;
}

function grade(parametros, ponto) {
  const { u = 24, v = 24, uMin = -1, uMax = 1, vMin = -1, vMax = 1 } = parametros;
  const V = []; const F = [];
  for (let j = 0; j <= v; j += 1) for (let i = 0; i <= u; i += 1) V.push(ponto(uMin + (uMax - uMin) * i / u, vMin + (vMax - vMin) * j / v));
  const linha = u + 1;
  for (let j = 0; j < v; j += 1) for (let i = 0; i < u; i += 1) { const a = j * linha + i; F.push([a, a + 1, a + linha + 1, a + linha]); }
  return { V, F };
}

export const superficiesSinteticas = {
  esfera: () => grade({ u: 36, v: 24, uMin: 0, uMax: Math.PI * 2, vMin: .06, vMax: Math.PI - .06 }, (u, v) => [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)]),
  toro: () => grade({ u: 36, v: 20, uMin: 0, uMax: Math.PI * 2, vMin: 0, vMax: Math.PI * 2 }, (u, v) => { const r = .72 + .28 * Math.cos(v); return [r * Math.cos(u), .28 * Math.sin(v), r * Math.sin(u)]; }),
  patchJusto: () => grade({ u: 32, v: 32 }, (u, v) => [u, .18 * Math.exp(-2.2 * (u * u + v * v)), v]),
  patchComQuebra: () => grade({ u: 32, v: 32 }, (u, v) => [u, .12 * Math.exp(-2.2 * (u * u + v * v)) + (u > .04 ? .42 : 0), v]),
};
