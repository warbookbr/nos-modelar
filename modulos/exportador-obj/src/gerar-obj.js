/* gerar-obj.js — serializador Wavefront OBJ (.obj) puro e determinístico com suporte a multipartes. */
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

export function gerarObjTexto({ malha, corpos, unidade = 'mm', escala = 1000, nome = 'modelo' }) {
  const linhas = [
    `# Mecanifica Wavefront OBJ Exporter v1.0`,
    `# Modelo: ${nome}`,
    `# Unidade: ${unidade} (fator de escala: ${escala})`,
    `# Corpos: ${corpos.length}`,
    '',
  ];

  let verticeGlobalOffset = 1;
  let normalGlobalOffset = 1;
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

    // Gerar normais e faces trianguladas
    for (const face of corpo.faces) {
      const triangulos = triangularFaces(face);
      for (const tri of triangulos) {
        const p0 = malha.vertices.get(tri[0]);
        const p1 = malha.vertices.get(tri[1]);
        const p2 = malha.vertices.get(tri[2]);
        const [nx, ny, nz] = calcularNormal(p0, p1, p2);

        linhas.push(`vn ${formatarCoord(nx)} ${formatarCoord(ny)} ${formatarCoord(nz)}`);
        const idxNormal = normalGlobalOffset++;

        const v0 = mapeamentoLocalParaGlobal.get(tri[0]);
        const v1 = mapeamentoLocalParaGlobal.get(tri[1]);
        const v2 = mapeamentoLocalParaGlobal.get(tri[2]);

        linhas.push(`f ${v0}//${idxNormal} ${v1}//${idxNormal} ${v2}//${idxNormal}`);
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
      corpos: estatisticasCorpos,
    },
  };
}
