/* face-degenerada.mjs — régua de malha: a face de três ou mais cantos que não define plano (plano "costuras e furos limpos", fatia 1).

   O critério é o do `adaptarThree` (`src/autoria/adaptar-three.js`, `prepararFaces`), que recusa a face com "é degenerada": a normal de Newell
   do polígono, sem normalizar, tem módulo (o dobro da área, em m²) de no máximo 1e-12, ou algum canto não existe. A régua devolve toda
   face que o adaptador recusa, na mesma ordem em que ele as visita, e não só a primeira. Lê só `neutro.V` e `neutro.F`. */

/** O limite do `adaptarThree` para o módulo da normal de Newell (dobro da área, m²). */
export const LIMITE_DA_NORMAL = 1e-12;

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

/** { total, faces: [{ id, cantos, normal, parte }] } com cada face que o `adaptarThree` recusaria como degenerada. */
export function medirFaceDegenerada(neutro) {
  const faces = [];
  for (const face of neutro.F.values()) {
    if (!Array.isArray(face.vs) || face.vs.length < 3) continue;
    const modulo = normalDeNewell(face.vs.map((v) => neutro.V.get(v)));
    if (modulo == null || !(modulo > LIMITE_DA_NORMAL)) faces.push({ id: face.id, cantos: face.vs.length, normal: modulo, parte: face.parte ?? null });
  }
  return { total: faces.length, faces };
}
