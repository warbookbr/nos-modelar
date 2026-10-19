/* validar-malha.js — validação e normalização de malha neutra para exportação OBJ. */
import { ErroExportacaoObj } from './contrato.js';

function erro(codigo, mensagem, detalhes) {
  throw new ErroExportacaoObj(codigo, mensagem, detalhes);
}

function areaTriangular(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  return Math.hypot(...cross) / 2;
}

function distancia(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

/* A altura do triângulo sobre o seu maior lado (2 × área ÷ maior aresta) é um comprimento, então pode ser comparada
   com a tolerância, que também é um comprimento. Comparar a área com tolerância² tratava 1 mm como 1 mm² e recusava
   os triângulos de leque dos cantos arredondados. */
function alturaMinima(a, b, c) {
  const maior = Math.max(distancia(a, b), distancia(b, c), distancia(c, a));
  return maior > 0 ? (2 * areaTriangular(a, b, c)) / maior : 0;
}

/* Fração da tolerância abaixo da qual a altura é tratada como zero (1 mm vira 1 nm). Só separa o triângulo sem área
   de fato; a geometria real de um canto arredondado fica muito acima. */
export const FRACAO_DA_TOLERANCIA_PARA_DEGENERADO = 1e-6;

function aresta(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function validarMalhaObj(neutro, { tolerancia = 0.001, exigirFechado = false } = {}) {
  if (!neutro || !(neutro.V instanceof Map) || !(neutro.F instanceof Map)) {
    erro('malha-invalida', 'Malha neutra precisa fornecer Map V e Map F.');
  }
  if (!neutro.V.size || !neutro.F.size) {
    erro('malha-vazia', 'Malha neutra não pode ser vazia.');
  }

  const vertices = new Map();
  for (const [id, ponto] of neutro.V) {
    if (
      !Number.isSafeInteger(id)
      || !Array.isArray(ponto)
      || ponto.length < 3
      || ponto.slice(0, 3).some((valor) => !Number.isFinite(valor))
    ) {
      erro('vertice-invalido', 'Vértice precisa ter id inteiro e três coordenadas finitas.', { vertice: id });
    }
    vertices.set(id, ponto.slice(0, 3));
  }

  const faces = [];
  const incidencias = new Map();

  for (const [mapId, face] of neutro.F) {
    const id = face?.id ?? mapId;
    const vs = face?.vs;
    if (!Number.isSafeInteger(id) || !Array.isArray(vs) || vs.length < 3 || new Set(vs).size < 3) {
      erro('face-degenerada', 'Face precisa ter três vértices distintos.', { face: id });
    }
    if (typeof face.parte !== 'string' || !face.parte.trim()) {
      erro('face-sem-identidade', 'Toda face precisa pertencer a uma parte.', { face: id });
    }
    const pontos = vs.map((vertice) => {
      if (!vertices.has(vertice)) {
        erro('vertice-ausente', 'Face referencia vértice inexistente.', { face: id, vertice });
      }
      return vertices.get(vertice);
    });

    const limiteDegenerado = tolerancia * FRACAO_DA_TOLERANCIA_PARA_DEGENERADO;
    for (let i = 1; i < pontos.length - 1; i++) {
      if (alturaMinima(pontos[0], pontos[i], pontos[i + 1]) <= limiteDegenerado) {
        erro('face-degenerada', 'Face tem triângulo sem área (altura abaixo da tolerância).', { face: id });
      }
    }

    for (let i = 0; i < vs.length; i++) {
      const a = vs[i];
      const b = vs[(i + 1) % vs.length];
      const chave = aresta(a, b);
      const lista = incidencias.get(chave) ?? [];
      lista.push({ face: id, sentido: `${a}:${b}` });
      incidencias.set(chave, lista);
    }

    const material = typeof face.material === 'string' && face.material.trim() ? face.material.trim() : null;
    faces.push({ id, vs: vs.slice(), parte: face.parte.trim(), material });
  }

  if (exigirFechado) {
    for (const [chave, lista] of incidencias) {
      if (lista.length === 1) {
        erro('borda-aberta', 'Aresta pertence a uma única face.', { aresta: chave, face: lista[0].face });
      }
      if (lista.length > 2) {
        erro('aresta-nao-manifold', 'Aresta pertence a mais de duas faces.', { aresta: chave, faces: lista.map((i) => i.face) });
      }
      if (lista[0].sentido === lista[1].sentido) {
        erro('orientacao-incoerente', 'Faces adjacentes percorrem uma aresta no mesmo sentido.', { aresta: chave, faces: lista.map((i) => i.face) });
      }
    }
  }

  return { vertices, faces, arestas: incidencias };
}
