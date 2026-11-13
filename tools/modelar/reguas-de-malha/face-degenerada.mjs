/* face-degenerada.mjs — régua de malha: a face de três ou mais cantos que não define plano (plano "costuras e furos limpos", fatia 1).

   Dois critérios, e a face que falhar em qualquer um entra. O do `adaptarThree` (`src/autoria/adaptar-three.js`, `prepararFaces`), que recusa a face com "é
   degenerada": a normal de Newell do polígono, sem normalizar, tem módulo (o dobro da área, em m²) de no máximo 1e-12, ou algum canto não existe. E o da
   auditoria de interseções (`prepararSolido`, `src/autoria/contato-de-solidos.js`), que mede cada triângulo da triangulação com piso relativo ao tamanho do
   sólido (a parte da face, ou a peça inteira se a face não tem parte): módulo do produto vetorial de no máximo min(1e-6, 2e-9 vezes o quadrado da meia diagonal da caixa dos vértices). Face de três cantos é o próprio
   triângulo; face de mais cantos é recusada se a normal de Newell passa desse piso a menos, ou se, depois de tirar da triangulação do earcut os triângulos
   que não passam do piso (o canto colinear que a união deixa no meio de uma aresta), não sobra nenhum. A régua devolve toda face recusada, na ordem em que
   o adaptador as visita, e não só a primeira. Lê só `neutro.V` e `neutro.F`. */
import earcut from 'earcut';

/** O limite do `adaptarThree` para o módulo da normal de Newell (dobro da área, m²). */
export const LIMITE_DA_NORMAL = 1e-12;

/** O limite relativo da auditoria de interseções para o módulo do produto vetorial de um triângulo, com a escala medida pela meia diagonal da caixa dos vértices do `neutro` (ou, com `parte`, das faces dela). */
export function limiteRelativo(neutro, parte) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  /* com `parte`, só os vértices das faces dela: a auditoria mede cada sólido (a parte) pela diagonal dele */
  const pontos = parte === undefined ? neutro.V.values()
    : [...neutro.F.values()].filter((f) => (f.parte ?? null) === parte && Array.isArray(f.vs)).flatMap((f) => f.vs.map((v) => neutro.V.get(v)).filter(Boolean));
  for (const p of pontos) for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
  const meia = Number.isFinite(min[0]) ? Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 : 0;
  return Math.min(1e-6, 2e-9 * meia * meia);
}

/** O dobro da área (módulo da normal de Newell) dos cantos, ou null se algum não é ponto. */
export function normalDeNewell(pontos) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i], b = pontos[(i + 1) % pontos.length];
    if (!a || !b) return null;
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return Math.hypot(x, y, z);
}

const produto = (a, b, c) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
};

/** O triângulo mais folgado da triangulação da face (módulo do produto vetorial) depois de tirar os que não passam de `limite`: 0 se nenhum sobra. */
function maiorTriangulo(pontos, normal, limite) {
  if (pontos.length === 3) return produto(pontos[0], pontos[1], pontos[2]);
  const eixo = [0, 1, 2].reduce((m, k) => (Math.abs(normal[k]) > Math.abs(normal[m]) ? k : m), 0);
  const [i, j] = [[1, 2], [0, 2], [0, 1]][eixo];
  const indices = earcut(pontos.flatMap((p) => [p[i], p[j]]), null, 2);
  let maior = 0;
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const m = produto(pontos[indices[t]], pontos[indices[t + 1]], pontos[indices[t + 2]]);
    if (m > limite && m > maior) maior = m;
  }
  return maior;
}

/** { total, faces: [{ id, cantos, normal, parte }] } com cada face que o `adaptarThree` recusaria como degenerada ou que a auditoria de interseções acharia sem área. */
export function medirFaceDegenerada(neutro) {
  const faces = [];
  const limites = new Map();
  const limiteDa = (parte) => {
    if (!limites.has(parte)) limites.set(parte, Math.max(LIMITE_DA_NORMAL, limiteRelativo(neutro, parte)));
    return limites.get(parte);
  };
  for (const face of neutro.F.values()) {
    /* com menos de 3 cantos (ou sem lista) o adaptador também recusa ("precisa de pelo menos 3 vértices"): entra na régua, com a normal indefinida */
    if (!Array.isArray(face.vs) || face.vs.length < 3) { faces.push({ id: face.id, cantos: Array.isArray(face.vs) ? face.vs.length : 0, normal: null, parte: face.parte ?? null }); continue; }
    const limite = limiteDa(face.parte ?? null);
    const pontos = face.vs.map((v) => neutro.V.get(v));
    const modulo = normalDeNewell(pontos);
    if (modulo == null || !(modulo > limite)) { faces.push({ id: face.id, cantos: face.vs.length, normal: modulo, parte: face.parte ?? null }); continue; }
    if (face.vs.length === 3) continue;
    const normal = [0, 0, 0];
    for (let k = 0; k < pontos.length; k++) { const a = pontos[k], b = pontos[(k + 1) % pontos.length]; normal[0] += (a[1] - b[1]) * (a[2] + b[2]); normal[1] += (a[2] - b[2]) * (a[0] + b[0]); normal[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    if (!(maiorTriangulo(pontos, normal, limite) > 0)) faces.push({ id: face.id, cantos: face.vs.length, normal: modulo, parte: face.parte ?? null });
  }
  return { total: faces.length, faces };
}
