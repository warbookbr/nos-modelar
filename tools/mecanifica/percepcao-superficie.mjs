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

/* A versão inicial pintava uma cor por triângulo em SVG. Isso fazia a própria
   triangulação parecer zebra e invalidava o canal. C1 agora rasteriza cada
   pixel com normal interpolada por vértice e z-buffer: não há wireframe nem
   salto de cor na aresta de uma face plana. */
const escalar = (v, k) => v.map((x) => x * k);
const somar = (a, b) => a.map((x, i) => x + b[i]);
const refletir = (incidente, normal) => subtrair(escalar(normal, 2 * produtoEscalar(normal, incidente)), incidente);
const misturarCor = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * limitar(t, 0, 1)));
const CAMERAS = {
  isometrica: { olhar: normalizar([.72, -.46, -.52]), u: normalizar([-.58, 0, -.81]), v: normalizar([-.37, -.89, .27]) },
  lateral: { olhar: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0] },
  frontal: { olhar: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0] },
  superior: { olhar: [0, -1, 0], u: [0, 0, -1], v: [-1, 0, 0] },
};
/* As faixas pertencem ao ambiente de inspeção, não à orientação da câmera.
   Assim, trocar a vista não troca artificialmente o padrão que a superfície
   reflete. */
const EIXO_AMBIENTE_ZEBRA = normalizar([.55, .12, .82]);

function dadosPorVertice(analise) {
  /* Malhas paramétricas repetem vértices na costura (u=0/u=2π). Para C1 a
     normal pertence ao ponto geométrico, não ao índice local da face. */
  /* Number() elimina a assinatura distinta de -0.00000000; sem isso, as
     cópias de uma costura paramétrica continuam em grupos separados. */
  const chavePonto = (ponto) => ponto.map((v) => {
    const arredondado = Number(v.toFixed(8));
    return Object.is(arredondado, -0) ? 0 : arredondado;
  }).join('|');
  const grupoDe = new Map([...analise.malha.V].map(([id, ponto]) => [id, chavePonto(ponto)]));
  const grupos = new Map([...grupoDe.values()].map((chave) => [chave, { normal: [0, 0, 0], curvatura: 0, contagem: 0 }]));
  for (const triangulo of analise.malha.triangulos) {
    const [a, b, c] = triangulo.vs.map((id) => analise.malha.V.get(id));
    const area = modulo(produtoVetorial(subtrair(b, a), subtrair(c, a))) / 2;
    for (const id of triangulo.vs) { const grupo = grupos.get(grupoDe.get(id)); grupo.normal = somar(grupo.normal, escalar(triangulo.normal, area)); }
  }
  for (const [indice, vizinhos] of analise.vizinhos) {
    const intensidade = vizinhos.reduce((soma, graus) => soma + graus, 0) / (vizinhos.length || 1);
    for (const id of analise.malha.triangulos[indice].vs) { const grupo = grupos.get(grupoDe.get(id)); grupo.curvatura += intensidade; grupo.contagem += 1; }
  }
  return {
    normais: new Map([...grupoDe].map(([id, chave]) => [id, normalizar(grupos.get(chave).normal)])),
    curvaturas: new Map([...grupoDe].map(([id, chave]) => { const grupo = grupos.get(chave); return [id, grupo.curvatura / (grupo.contagem || 1)]; })),
  };
}

function prepararCamera(malha, camera, largura, altura, margem) {
  const cam = CAMERAS[camera]; if (!cam) throw new Error(`câmera C1 desconhecida: ${camera}`);
  const crus = [...malha.V.values()].map((ponto) => ({ x: produtoEscalar(ponto, cam.u), y: produtoEscalar(ponto, cam.v), z: produtoEscalar(ponto, cam.olhar) }));
  const xs = crus.map((p) => p.x), ys = crus.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const escala = Math.min((largura - margem * 2) / (maxX - minX || 1), (altura - margem * 2) / (maxY - minY || 1));
  return { cam, projetar: (ponto) => ({ x: margem + (produtoEscalar(ponto, cam.u) - minX) * escala, y: altura - margem - (produtoEscalar(ponto, cam.v) - minY) * escala, z: produtoEscalar(ponto, cam.olhar) }) };
}

function corDoCampo(tipo, normal, curvatura, camera) {
  if (tipo === 'zebra') {
    const reflexo = normalizar(refletir(escalar(camera.olhar, -1), normal));
    /* Listras paralelas de um ambiente, não ângulo polar: o modelo anterior
       criava raios falsos na esfera porque a fase se encontrava num polo. */
    const fase = produtoEscalar(reflexo, EIXO_AMBIENTE_ZEBRA);
    const faixa = .5 + .5 * Math.sin((fase + 1) * Math.PI * 7);
    return misturarCor([10, 25, 43], [235, 246, 250], faixa);
  }
  if (tipo === 'isofota') {
    const intensidade = .14 + .86 * limitar((produtoEscalar(normal, normalizar([-.35, .8, .48])) + 1) / 2, 0, 1);
    return misturarCor([20, 27, 34], [236, 214, 165], intensidade);
  }
  const t = limitar(curvatura / 28, 0, 1);
  return t < .55 ? misturarCor([27, 110, 175], [84, 194, 203], t / .55) : misturarCor([84, 194, 203], [236, 54, 70], (t - .55) / .45);
}

export function rasterizarDiagnostico(analise, { tipo = 'zebra', camera = 'isometrica', largura = 720, altura = 480, margem = 24 } = {}) {
  if (!['zebra', 'isofota', 'curvatura'].includes(tipo)) throw new Error(`tipo C1 desconhecido: ${tipo}`);
  const { normais, curvaturas } = dadosPorVertice(analise);
  const { cam, projetar } = prepararCamera(analise.malha, camera, largura, altura, margem);
  const pixels = new Uint8Array(largura * altura * 4); const profundidade = new Float64Array(largura * altura).fill(-Infinity);
  for (let i = 0; i < largura * altura; i += 1) { pixels[i * 4] = 230; pixels[i * 4 + 1] = 235; pixels[i * 4 + 2] = 235; pixels[i * 4 + 3] = 255; }
  for (const triangulo of analise.malha.triangulos) {
    const ps = triangulo.vs.map((id) => projetar(analise.malha.V.get(id)));
    const area = (ps[1].x - ps[0].x) * (ps[2].y - ps[0].y) - (ps[2].x - ps[0].x) * (ps[1].y - ps[0].y);
    if (Math.abs(area) < EPSILON) continue;
    const minX = Math.max(0, Math.floor(Math.min(...ps.map((p) => p.x)))), maxX = Math.min(largura - 1, Math.ceil(Math.max(...ps.map((p) => p.x))));
    const minY = Math.max(0, Math.floor(Math.min(...ps.map((p) => p.y)))), maxY = Math.min(altura - 1, Math.ceil(Math.max(...ps.map((p) => p.y))));
    for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
      const px = x + .5, py = y + .5;
      const w0 = ((ps[1].x - px) * (ps[2].y - py) - (ps[2].x - px) * (ps[1].y - py)) / area;
      const w1 = ((ps[2].x - px) * (ps[0].y - py) - (ps[0].x - px) * (ps[2].y - py)) / area; const w2 = 1 - w0 - w1;
      if (w0 < -EPSILON || w1 < -EPSILON || w2 < -EPSILON) continue;
      const indice = y * largura + x; const z = w0 * ps[0].z + w1 * ps[1].z + w2 * ps[2].z;
      if (z <= profundidade[indice]) continue;
      profundidade[indice] = z;
      const normal = normalizar(somar(somar(escalar(normais.get(triangulo.vs[0]), w0), escalar(normais.get(triangulo.vs[1]), w1)), escalar(normais.get(triangulo.vs[2]), w2)));
      const curvatura = w0 * curvaturas.get(triangulo.vs[0]) + w1 * curvaturas.get(triangulo.vs[1]) + w2 * curvaturas.get(triangulo.vs[2]);
      const cor = corDoCampo(tipo, normal, curvatura, cam); const base = indice * 4;
      pixels[base] = cor[0]; pixels[base + 1] = cor[1]; pixels[base + 2] = cor[2];
    }
  }
  return { largura, altura, pixels };
}

const tabelaCrc = (() => Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }))();
const crc32 = (dados) => { let c = 0xffffffff; for (const byte of dados) c = tabelaCrc[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const u32 = (n) => Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const trechoPng = (tipo, dados) => { const nome = Buffer.from(tipo); return Buffer.concat([u32(dados.length), nome, dados, u32(crc32(Buffer.concat([nome, dados])))]); };

export async function codificarPng({ largura, altura, pixels }) {
  const { deflateSync } = await import('node:zlib');
  const linhas = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y += 1) { const destino = y * (largura * 4 + 1); linhas[destino] = 0; Buffer.from(pixels.buffer, pixels.byteOffset + y * largura * 4, largura * 4).copy(linhas, destino + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trechoPng('IHDR', Buffer.concat([u32(largura), u32(altura), Buffer.from([8, 6, 0, 0, 0])])), trechoPng('IDAT', deflateSync(linhas, { level: 9 })), trechoPng('IEND', Buffer.alloc(0))]);
}

export async function renderizarDiagnosticoPng(analise, opcoes = {}) {
  return codificarPng(rasterizarDiagnostico(analise, opcoes));
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
