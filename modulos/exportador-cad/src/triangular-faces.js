/* triangular-faces.js — decomposição determinística de faces poligonais em triângulos. */
export function triangularFaces(face) {
  const triangles = [];
  for (let indice = 1; indice < face.vs.length - 1; indice++) {
    triangles.push([face.vs[0], face.vs[indice], face.vs[indice + 1]]);
  }
  return triangles;
}
