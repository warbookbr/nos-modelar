/* gerar-obj.js — serializador Wavefront OBJ (.obj) puro e determinístico com suporte a multipartes e coordenadas de textura. */
import { triangularFaces } from '../../exportador-cad/src/triangular-faces.js';

function formatarCoord(val) {
  if (Math.abs(val) < 1e-9) return '0';
  const fixado = val.toFixed(6);
  // Remove zeros à direita e ponto desnecessário
  return fixado.replace(/\.?0+$/, '');
}

function calcularNormal(p0, p1, p2) {
  const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  const nx = u[1] * v[2] - u[2] * v[1];
  const ny = u[2] * v[0] - u[0] * v[2];
  const nz = u[0] * v[1] - u[1] * v[0];
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-12) return [0, 1, 0];
  return [nx / len, ny / len, nz / len];
}

/* Mapeamento planar: o plano é o do eixo dominante da normal do triângulo, e (u, v) é a posição em metros
   dividida por metrosPorTile. Sai em metros da malha neutra, sem o fator de escala da saída. */
function eixoDominante([nx, ny, nz]) {
  const a = Math.abs(nx);
  const b = Math.abs(ny);
  const c = Math.abs(nz);
  if (a >= b && a >= c) return 0;
  if (b >= c) return 1;
  return 2;
}

function coordenadaDeTextura(p, eixo, metrosPorTile) {
  const [a, b] = eixo === 0 ? [p[1], p[2]] : eixo === 1 ? [p[0], p[2]] : [p[0], p[1]];
  return [a / metrosPorTile, b / metrosPorTile];
}

/* texturas: Map de material -> { metrosPorTile }, já validado e restrito aos materiais usados. Ausente ou null
   mantém a saída byte a byte igual à de antes do material. */
export function gerarObjTexto({ malha, corpos, unidade = 'mm', escala = 1000, nome = 'modelo', texturas = null, nomeMtl = null }) {
  const comTextura = texturas instanceof Map && texturas.size > 0;
  const linhas = [
    /* O cabeçalho é marca do formato exportado, como os ids `mecanifica.*`, e fica com o nome antigo (plano renomear para Modelar, decisão 1). */
    `# Mecanifica Wavefront OBJ Exporter v1.0`,
    `# Modelo: ${nome}`,
    `# Unidade: ${unidade} (fator de escala: ${escala})`,
    `# Corpos: ${corpos.length}`,
    '',
  ];
  if (comTextura) {
    linhas.push(`mtllib ${nomeMtl}`, '');
  }

  let verticeGlobalOffset = 1;
  let normalGlobalOffset = 1;
  let texturaGlobalOffset = 1;
  let totalTriangulos = 0;
  let totalVerticesExportados = 0;

  const estatisticasCorpos = [];

  for (const corpo of corpos) {
    linhas.push(`o ${corpo.nome}`);
    linhas.push(`g ${corpo.nome}`);

    // Mapear apenas os vértices usados por este corpo
    const idsVerticesCorpo = [...new Set(corpo.faces.flatMap((f) => f.vs))].sort((a, b) => a - b);
    const mapeamentoLocalParaGlobal = new Map();

    for (const idV of idsVerticesCorpo) {
      const p = malha.vertices.get(idV);
      const x = p[0] * escala;
      const y = p[1] * escala;
      const z = p[2] * escala;
      linhas.push(`v ${formatarCoord(x)} ${formatarCoord(y)} ${formatarCoord(z)}`);
      mapeamentoLocalParaGlobal.set(idV, verticeGlobalOffset++);
    }

    totalVerticesExportados += idsVerticesCorpo.length;
    let triangulosCorpo = 0;
    let materialAtual = null;

    // Gerar normais e faces trianguladas
    for (const face of corpo.faces) {
      if (comTextura && face.material !== materialAtual) {
        linhas.push(`usemtl ${face.material}`);
        materialAtual = face.material;
      }
      const triangulos = triangularFaces(face);
      for (const tri of triangulos) {
        const p0 = malha.vertices.get(tri[0]);
        const p1 = malha.vertices.get(tri[1]);
        const p2 = malha.vertices.get(tri[2]);
        const normal = calcularNormal(p0, p1, p2);
        const [nx, ny, nz] = normal;

        const v0 = mapeamentoLocalParaGlobal.get(tri[0]);
        const v1 = mapeamentoLocalParaGlobal.get(tri[1]);
        const v2 = mapeamentoLocalParaGlobal.get(tri[2]);

        if (comTextura) {
          const { metrosPorTile } = texturas.get(face.material);
          const eixo = eixoDominante(normal);
          const indicesVt = [];
          for (const p of [p0, p1, p2]) {
            const [u, v] = coordenadaDeTextura(p, eixo, metrosPorTile);
            linhas.push(`vt ${formatarCoord(u)} ${formatarCoord(v)}`);
            indicesVt.push(texturaGlobalOffset++);
          }
          linhas.push(`vn ${formatarCoord(nx)} ${formatarCoord(ny)} ${formatarCoord(nz)}`);
          const idxNormal = normalGlobalOffset++;
          linhas.push(`f ${v0}/${indicesVt[0]}/${idxNormal} ${v1}/${indicesVt[1]}/${idxNormal} ${v2}/${indicesVt[2]}/${idxNormal}`);
        } else {
          linhas.push(`vn ${formatarCoord(nx)} ${formatarCoord(ny)} ${formatarCoord(nz)}`);
          const idxNormal = normalGlobalOffset++;
          linhas.push(`f ${v0}//${idxNormal} ${v1}//${idxNormal} ${v2}//${idxNormal}`);
        }
        triangulosCorpo++;
        totalTriangulos++;
      }
    }

    linhas.push('');

    estatisticasCorpos.push({
      nome: corpo.nome,
      parte: corpo.parte,
      vertices: idsVerticesCorpo.length,
      facesOriginais: corpo.faces.length,
      triangulos: triangulosCorpo,
    });
  }

  return {
    texto: linhas.join('\n'),
    estatisticas: {
      nome,
      unidade,
      escala,
      totalCorpos: corpos.length,
      totalVertices: totalVerticesExportados,
      totalTriangulos,
      texturizado: comTextura,
      corpos: estatisticasCorpos,
    },
  };
}
