/* espessura.js — dá espessura a uma superfície aberta e devolve o sólido fechado
 *
 * Função pura, sem Three.js e sem domínio: recebe uma superfície poligonal orientada (vértices e faces por índice, a
 * normal de cada face pelo sentido anti-horário) e a espessura t, e devolve o sólido. A superfície declarada fica como
 * está e é a face externa; a face interna é derivada dela, e a parede liga as duas em cada borda livre, de modo que os
 * vãos e o contorno da chapa saem fechados.
 *
 *   lado: 'contraNormal' (padrão) põe o material contra a normal das faces, que é para dentro quando as faces são
 *         anti-horárias vistas de fora; 'normal' põe o material a favor da normal, para a superfície declarada com a
 *         normal para dentro. Nos dois casos a superfície declarada é a face externa e o sólido sai com a normal para fora.
 *
 * O DESLOCAMENTO. Cada vértice anda t ao longo da sua normal, que é a média das normais das faces em volta pesada pelo
 * ângulo do canto, dividida pelo cosseno médio entre ela e as normais das faces (a espessura uniforme do Solidify do
 * Blender). Na face plana o fator é 1; na dobra viva entre duas faces o ponto vai à bissetriz com t / cos(θ/2), que é a
 * esquadria exata, e no canto do cubo vai a t·(1, 1, 1), também exato. Por isso a face interna fica a t de cada face
 * externa também nas dobras, e o volume do sólido é a área vezes a espessura, a menos da curvatura (fator 1 - H t).
 *
 * A DOBRA LOCAL. A face interna se dobra sobre si quando a espessura passa do raio de curvatura do lado do material:
 * dois pontos p e q de uma face, a distância e entre eles, andam para dentro e a distância vira e·(1 - t κ), com
 * κ = -s (m_q - m_p)·e / |e|² a curvatura normal discreta ao longo de e (s = -1 contra a normal, +1 a favor, m o
 * deslocamento por unidade de espessura). Com t κ >= 1 o segmento se inverte e a face interna atravessa a vizinha.
 * O raio local é 1/κ, medido em todo par de cantos de cada face (lados e diagonais); a função devolve o menor deles e
 * grita com os pares em que t >= raio, além das faces internas que se invertem. Na superfície lisa o raio converge ao
 * raio de curvatura; no vinco vivo convexo ele é a largura da primeira faixa de faces dividida por tan(θ/2), e cai pela
 * metade a cada nível de subdivisão, porque a malha interna tem um vértice por vértice externo e não consome a faixa.
 *
 * A DOBRA DA SUPERFÍCIE. Quando a própria superfície se dobra sobre si, com uma face virada contra as vizinhas, a média
 * das normais não tem lado: a normal do vértice fica contra a face virada (ou contra as outras, se a virada pesa mais), e
 * o vértice interno sai à frente da face externa. Num trecho plano a face virada é invisível, e a média ainda dá o fator
 * 1 de esquadria, de modo que o vértice interno sai do outro lado da chapa a uma espessura inteira; a distância dele à
 * superfície externa fica certa e não acusa nada. Por isso cada vértice confere, face a face, que a normal dele fica a
 * menos de acos(COSSENO_MINIMO_DA_ESQUADRIA) de toda face em volta, e a função grita com todos os vértices que não ficam,
 * pelo ângulo, sem devolver sólido. O caso conhecido é a subdivisão com o canto declarado em que a borda faz ângulo
 * côncavo e uma face da gaiola tem ângulo quase raso nesse canto: a superfície subdividida vira uma face ali.
 *
 * O QUE ELA NÃO CONFERE. A proximidade entre partes distantes da superfície (duas paredes a menos de t uma da outra, ou
 * a chapa que volta sobre si) não é curvatura local e fica fora desta conta.
 *
 * A ordem da saída é determinística: os vértices externos na ordem de entrada e depois os internos na mesma ordem; as
 * faces externas, as internas na mesma ordem e as paredes na ordem em que as bordas aparecem varrendo as faces. */

export const COSSENO_MINIMO_DA_ESQUADRIA = 0.05;

export class ErroDaEspessura extends TypeError {
  /** lugares: [{ vertices: [a, b], raio, ponto }] do pior para o melhor; raio: o menor raio local medido; tipo: 'raio'
   *  quando a espessura passa do raio local, 'dobra' quando a própria superfície se dobra sobre si e nenhuma espessura a
   *  acompanha (cada lugar traz então o vértice e o `angulo`, em graus, da face em volta mais longe da normal dele). */
  constructor(motivo, lugares = [], raio = null, tipo = 'raio') {
    super(`espessura: ${motivo}`);
    this.motivo = motivo; this.lugares = lugares; this.raio = raio; this.tipo = tipo;
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const medio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

function newell(P) {
  const n = [0, 0, 0];
  for (let k = 0; k < P.length; k++) {
    const a = P[k], b = P[(k + 1) % P.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

function validar(vertices, faces, espessura, lado) {
  if (!Array.isArray(vertices) || !vertices.length) throw new TypeError('espessura: superfície sem vértices');
  for (const [k, v] of vertices.entries()) if (!Array.isArray(v) || v.length !== 3 || v.some((c) => !Number.isFinite(c))) throw new TypeError(`espessura: vértice ${k} precisa ser [x,y,z] finito`);
  if (!Array.isArray(faces) || !faces.length) throw new TypeError('espessura: superfície sem faces');
  for (const [k, f] of faces.entries()) {
    if (!Array.isArray(f) || f.length < 3 || new Set(f).size !== f.length) throw new TypeError(`espessura: face ${k} precisa de 3 ou mais vértices distintos`);
    for (const i of f) if (!Number.isInteger(i) || i < 0 || i >= vertices.length) throw new TypeError(`espessura: face ${k} cita vértice inexistente ${i}`);
  }
  if (typeof espessura !== 'number' || !Number.isFinite(espessura) || espessura <= 0) throw new TypeError('espessura: a espessura precisa ser número finito maior que zero');
  if (lado !== 'contraNormal' && lado !== 'normal') throw new TypeError("espessura: lado precisa ser 'contraNormal' ou 'normal'");
}

/**
 * espessarSuperficie({ vertices, faces, espessura, lado }) -> { vertices, faces, partes, raioMinimo, ondeRaioMinimo }
 *   partes: { externa, interna, borda }, índices das faces de saída de cada grupo;
 *   raioMinimo: o menor raio de curvatura local do lado do material (Infinity se a superfície não curva para lá), e
 *   ondeRaioMinimo: { vertices: [a, b], ponto } do par em que ele foi medido.
 * Grita com ErroDaEspessura quando a superfície não é variedade orientada ou quando a espessura passa do raio local.
 */
export function espessarSuperficie({ vertices, faces, espessura, lado = 'contraNormal' }) {
  validar(vertices, faces, espessura, lado);
  const n = vertices.length; const t = espessura; const s = lado === 'contraNormal' ? -1 : 1;

  /* variedade orientada: cada aresta em uma ou duas faces, e com duas, percorrida em sentidos opostos */
  const dirigidas = new Map(); const contagem = new Map();
  const ch = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  faces.forEach((f) => f.forEach((a, k) => {
    const b = f[(k + 1) % f.length];
    const d = `${a}>${b}`;
    if (dirigidas.has(d)) throw new ErroDaEspessura('a superfície não é orientada: duas faces percorrem a aresta no mesmo sentido', [{ vertices: [a, b], ponto: medio(vertices[a], vertices[b]) }]);
    dirigidas.set(d, true);
    const c = ch(a, b); contagem.set(c, (contagem.get(c) ?? 0) + 1);
    if (contagem.get(c) > 2) throw new ErroDaEspessura('a superfície não é variedade: aresta com mais de duas faces', [{ vertices: [a, b], ponto: medio(vertices[a], vertices[b]) }]);
  }));

  /* normais das faces e dos vértices, pesadas pelo ângulo do canto */
  const normalDaFace = faces.map((f, k) => {
    const m = newell(f.map((i) => vertices[i])); const l = Math.hypot(m[0], m[1], m[2]);
    if (!(l > 0)) throw new ErroDaEspessura('face de área nula', [{ vertices: [f[0], f[1]], ponto: vertices[f[0]] }]);
    return [m[0] / l, m[1] / l, m[2] / l];
  });
  const soma = Array.from({ length: n }, () => [0, 0, 0]);
  const cantos = Array.from({ length: n }, () => []);
  faces.forEach((f, fi) => f.forEach((v, k) => {
    const u = vertices[f[(k + f.length - 1) % f.length]], w = vertices[f[(k + 1) % f.length]], p = vertices[v];
    const a = sub(u, p), b = sub(w, p); const c = cruz(a, b);
    const angulo = Math.atan2(Math.hypot(c[0], c[1], c[2]), dot(a, b));
    const nf = normalDaFace[fi];
    soma[v][0] += angulo * nf[0]; soma[v][1] += angulo * nf[1]; soma[v][2] += angulo * nf[2];
    cantos[v].push([angulo, fi]);
  }));
  /* o lado de cada vértice: a normal média tem de ficar do lado de toda face em volta, ou o vértice interno sai à frente
     da face externa dela; o vértice em que alguma face não tem o cosseno mínimo é dobra da superfície */
  const dobrados = [];
  const desloc = soma.map((m, v) => {
    if (!cantos[v].length) throw new TypeError(`espessura: o vértice ${v} não pertence a nenhuma face`);
    const l = Math.hypot(m[0], m[1], m[2]);
    const nv = l > 0 ? [m[0] / l, m[1] / l, m[2] / l] : [0, 0, 0];
    let peso = 0, cos = 0, pior = Infinity;
    for (const [angulo, fi] of cantos[v]) { const c = dot(nv, normalDaFace[fi]); peso += angulo; cos += angulo * c; pior = Math.min(pior, c); }
    cos = peso > 0 ? cos / peso : 0;
    if (!(cos >= COSSENO_MINIMO_DA_ESQUADRIA) || !(pior >= COSSENO_MINIMO_DA_ESQUADRIA)) {
      dobrados.push({ vertices: [v, v], raio: 0, ponto: [...vertices[v]], angulo: (Math.acos(Math.max(-1, Math.min(1, Math.min(pior, cos)))) * 180) / Math.PI });
      return [0, 0, 0];
    }
    return [nv[0] / cos, nv[1] / cos, nv[2] / cos];
  });
  if (dobrados.length) {
    const lugares = dobrados.sort((p, q) => q.angulo - p.angulo || p.vertices[0] - q.vertices[0]);
    throw new ErroDaEspessura(`a superfície se dobra sobre si: em ${lugares.length} vértice(s) uma face em volta fica a ${Number(lugares[0].angulo.toPrecision(3))} graus da normal do vértice, e a face interna sairia à frente da externa`, lugares, 0, 'dobra');
  }
  const internos = vertices.map((p, v) => [p[0] + s * t * desloc[v][0], p[1] + s * t * desloc[v][1], p[2] + s * t * desloc[v][2]]);

  /* raio local em todo par de cantos de cada face, e as faces internas que se invertem */
  let raioMinimo = Infinity; let ondeRaioMinimo = null;
  const dobras = new Map();
  const anotar = (a, b, raio) => {
    const c = ch(a, b); const antes = dobras.get(c);
    if (!antes || raio < antes.raio) dobras.set(c, { vertices: a < b ? [a, b] : [b, a], raio, ponto: medio(vertices[a], vertices[b]) });
  };
  let invertidas = 0;
  faces.forEach((f, fi) => {
    let menor = Infinity; let par = [f[0], f[Math.floor(f.length / 2)]];
    for (let j = 0; j < f.length; j++) {
      for (let k = j + 1; k < f.length; k++) {
        const a = f[j], b = f[k];
        const e = sub(vertices[b], vertices[a]); const e2 = dot(e, e);
        const kappa = -s * dot(sub(desloc[b], desloc[a]), e) / e2;
        if (!(kappa > 0)) continue;
        const raio = 1 / kappa;
        if (raio < menor) { menor = raio; par = [a, b]; }
        if (raio < raioMinimo) { raioMinimo = raio; ondeRaioMinimo = { vertices: a < b ? [a, b] : [b, a], ponto: medio(vertices[a], vertices[b]) }; }
        if (t >= raio) anotar(a, b, raio);
      }
    }
    /* a face interna que se inverte sem par dobrado (cisalhamento) entra com o menor raio da face */
    const ni = newell(f.map((i) => internos[i]));
    if (!(dot(ni, normalDaFace[fi]) > 0) && !(t >= menor)) { invertidas += 1; anotar(par[0], par[1], menor); }
  });
  if (dobras.size) {
    const lugares = [...dobras.values()].sort((p, q) => p.raio - q.raio || p.vertices[0] - q.vertices[0] || p.vertices[1] - q.vertices[1]);
    const motivo = lugares[0].raio <= t
      ? `a espessura ${t} passa do raio de curvatura local, que chega a ${Number(raioMinimo.toPrecision(3))}`
      : `a espessura ${t} inverte ${invertidas} face(s) interna(s), com raio local de ${Number(lugares[0].raio.toPrecision(3))}`;
    throw new ErroDaEspessura(motivo, lugares, raioMinimo);
  }

  /* saída: externa, interna e parede em cada borda livre */
  const externas = faces.map((f) => (s < 0 ? [...f] : [...f].reverse()));
  const internas = faces.map((f) => (s < 0 ? [...f].reverse() : [...f]).map((i) => n + i));
  const paredes = [];
  for (const f of externas) {
    for (let k = 0; k < f.length; k++) {
      const x = f[k], y = f[(k + 1) % f.length];
      if (contagem.get(ch(x, y)) === 1) paredes.push([y, x, n + x, n + y]);
    }
  }
  const F = [...externas, ...internas, ...paredes];
  const faixa = (de, ate) => Array.from({ length: ate - de }, (_, k) => de + k);
  return {
    vertices: [...vertices.map((p) => [...p]), ...internos],
    faces: F,
    partes: { externa: faixa(0, faces.length), interna: faixa(faces.length, 2 * faces.length), borda: faixa(2 * faces.length, F.length) },
    raioMinimo,
    ondeRaioMinimo,
  };
}
