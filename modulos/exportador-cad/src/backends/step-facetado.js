/* step-facetado.js — backend de exportação STEP facetado via OCCT WASM. */
import { OcctKernel } from 'occt-wasm';
import { ErroExportacaoCad } from '../contrato.js';
import { triangularFaces } from '../triangular-faces.js';

const fatorUnidade = Object.freeze({ mm: 1, cm: 10, m: 1000 });

export async function escreverStepFacetado({ nome, malha, corpos, unidade, escala, tolerancia }) {
  let kernel;
  try {
    kernel = await OcctKernel.init();
  } catch (err) {
    throw new ErroExportacaoCad('kernel-indisponivel', `Falha ao inicializar o kernel OCCT: ${err.message}`);
  }

  const fator = fatorUnidade[unidade] * escala;
  try {
    const formas = [];
    for (const corpo of corpos) {
      const vertices = new Map(
        [...malha.vertices].map(([id, ponto]) => [
          id,
          kernel.makeVertex(ponto[0] * fator, ponto[1] * fator, ponto[2] * fator),
        ]),
      );
      const arestas = new Map();
      const obterAresta = (a, b) => {
        const chave = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!arestas.has(chave)) {
          arestas.set(chave, kernel.makeEdge(vertices.get(a), vertices.get(b)));
        }
        return arestas.get(chave);
      };
      const faces = corpo.faces.flatMap((face) =>
        triangularFaces(face).map((triangle) => {
          const edges = triangle.map((a, indice) =>
            obterAresta(a, triangle[(indice + 1) % triangle.length]),
          );
          return kernel.makeFace(kernel.makeWire(edges));
        }),
      );
      const forma = kernel.sewAndSolidify(faces, tolerancia * fator);
      if (!kernel.isValid(forma) || !kernel.subShapeCount(forma, 'solid')) {
        throw new ErroExportacaoCad(
          'corpo-nao-fechado',
          `Corpo '${corpo.nome}' não resultou em sólido fechado válido.`,
          { corpo: corpo.nome, parte: corpo.parte },
        );
      }
      formas.push({ nome: corpo.nome, forma });
    }
    const doc = kernel.createXCAFDocument();
    try {
      for (const corpo of formas) {
        doc.addShape(corpo.forma, { name: corpo.nome });
      }
      const texto = doc.exportSTEP();
      return {
        texto,
        backend: 'occt-wasm@4.3.2',
        corpos: formas.map(({ nome: corpoNome, forma }) => ({
          nome: corpoNome,
          volume: kernel.getVolume(forma),
          caixa: kernel.getBoundingBox(forma),
        })),
      };
    } finally {
      doc.close();
    }
  } catch (err) {
    if (err instanceof ErroExportacaoCad) throw err;
    throw new ErroExportacaoCad('kernel-falhou', `Operação no kernel OCCT falhou: ${err.message}`, {
      detalhe: err.message,
    });
  } finally {
    kernel[Symbol.dispose]();
  }
}
