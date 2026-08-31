/* index.js — porta pública do módulo exportador CAD. */
import { ErroExportacaoCad, FORMATO, validarOpcoes } from './contrato.js';
import { separarCorpos } from './separar-corpos.js';
import { escreverStepFacetado } from './backends/step-facetado.js';
import { validarMalha } from './validar-malha.js';

export { ErroExportacaoCad, FORMATO, validarOpcoes } from './contrato.js';
export { validarMalha } from './validar-malha.js';
export { separarCorpos } from './separar-corpos.js';

function extrairCaixa(caixaBruta, q) {
  if (!caixaBruta) return null;
  if (caixaBruta.xmin !== undefined) {
    return {
      min: [q(caixaBruta.xmin), q(caixaBruta.ymin), q(caixaBruta.zmin)],
      max: [q(caixaBruta.xmax), q(caixaBruta.ymax), q(caixaBruta.zmax)],
    };
  }
  if (Array.isArray(caixaBruta)) {
    return {
      min: [q(caixaBruta[0]), q(caixaBruta[1]), q(caixaBruta[2])],
      max: [q(caixaBruta[3]), q(caixaBruta[4]), q(caixaBruta[5])],
    };
  }
  if (caixaBruta.min && caixaBruta.max) {
    return {
      min: [
        q(caixaBruta.min.x ?? caixaBruta.min[0]),
        q(caixaBruta.min.y ?? caixaBruta.min[1]),
        q(caixaBruta.min.z ?? caixaBruta.min[2]),
      ],
      max: [
        q(caixaBruta.max.x ?? caixaBruta.max[0]),
        q(caixaBruta.max.y ?? caixaBruta.max[1]),
        q(caixaBruta.max.z ?? caixaBruta.max[2]),
      ],
    };
  }
  return null;
}

function gerarImpressaoGeometrica({ unidade, escala, tolerancia, corpos }) {
  const q = (v, tol = tolerancia) => (Number.isFinite(v) ? Math.round(v / tol) * tol : v);
  return {
    unidade,
    escala,
    tolerancia,
    corpos: corpos.map((c) => ({
      nome: c.nome,
      volume: q(c.volume),
      caixa: extrairCaixa(c.caixa, q),
    })),
  };
}

export async function exportarCad(opcoes) {
  const normalizadas = validarOpcoes(opcoes);
  const malha = validarMalha(opcoes.neutro, normalizadas);
  const corpos = separarCorpos(malha);
  const resultado = await escreverStepFacetado({ ...normalizadas, malha, corpos });
  const partesUnicas = [...new Set(corpos.map((corpo) => corpo.parte))].sort();

  return {
    formato: FORMATO,
    bytes: new TextEncoder().encode(resultado.texto),
    extensao: '.step',
    mime: 'model/step',
    diagnostico: {
      backend: resultado.backend,
      estrategia: normalizadas.estrategia,
      unidade: normalizadas.unidade,
      escala: normalizadas.escala,
      tolerancia: normalizadas.tolerancia,
      vertices: malha.vertices.size,
      facesOriginais: malha.faces.length,
      partes: partesUnicas.map((parte) => ({
        nome: parte,
        corpos: corpos.filter((corpo) => corpo.parte === parte).length,
      })),
      corpos: resultado.corpos,
      reparos: [],
      avisos: [],
      impressaoGeometrica: gerarImpressaoGeometrica({
        unidade: normalizadas.unidade,
        escala: normalizadas.escala,
        tolerancia: normalizadas.tolerancia,
        corpos: resultado.corpos,
      }),
    },
  };
}
