/* triangular-faces.js — decomposição determinística de faces poligonais em triângulos.
   O leque a partir do primeiro canto é a triangulação de sempre; ele só muda quando tem triângulo sem área, que um canto
   colinear do polígono produz (ver `triangularSemDegenerado`). */
import { triangularSemDegenerado } from '../../../procedural/nucleo/triangulacao-face.js';

function leque(vs) {
  const triangles = [];
  for (let indice = 1; indice < vs.length - 1; indice++) {
    triangles.push([vs[0], vs[indice], vs[indice + 1]]);
  }
  return triangles;
}

/* Os triângulos de uma face em ids de vértice. `degenerado(a, b, c)` é o critério de triângulo sem área de quem exporta, com os
   pontos; o validador calcula a triangulação uma vez e a guarda em `face.triangulos`, que a escrita só lê. Sem pontos nem
   critério (face solta, sem malha), sai o leque do canto 0. Devolve null quando nenhuma triangulação da face serve. */
export function triangulosDaFace(face, vertices, degenerado) {
  if (!vertices) return leque(face.vs);
  const pontos = face.vs.map((id) => vertices.get(id));
  const indices = triangularSemDegenerado(pontos, degenerado);
  return indices ? indices.map((tripla) => tripla.map((i) => face.vs[i])) : null;
}

export function triangularFaces(face) {
  return face.triangulos ?? leque(face.vs);
}
