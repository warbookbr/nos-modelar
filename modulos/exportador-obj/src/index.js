/* index.js — porta pública do módulo exportador Wavefront OBJ. */
import { separarCorpos } from '../../exportador-cad/src/separar-corpos.js';
import { ErroExportacaoObj, FORMATO, resolverEscalaPadrao, validarOpcoes } from './contrato.js';
import { gerarMtlTexto } from './gerar-mtl.js';
import { gerarObjTexto } from './gerar-obj.js';
import { validarMalhaObj } from './validar-malha.js';

export { ErroExportacaoObj, FORMATO, resolverEscalaPadrao, validarOpcoes, validarTexturas } from './contrato.js';
export { validarMalhaObj } from './validar-malha.js';

/* Os materiais usados pelas faces, com a textura de cada um. Face sem material, ou material sem entrada em `texturas`,
   recusa a exportação: com texturas pedidas, toda parte precisa de imagem. */
function materiaisTexturizados(malha, texturas) {
  if (!texturas) return [];
  const usados = new Set();
  for (const face of malha.faces) {
    if (!face.material) {
      throw new ErroExportacaoObj('face-sem-material', 'Com texturas pedidas, toda face precisa de material.', { face: face.id });
    }
    if (!texturas.has(face.material)) {
      throw new ErroExportacaoObj('material-sem-textura', `Material '${face.material}' não tem textura declarada.`, { material: face.material, face: face.id });
    }
    usados.add(face.material);
  }
  return [...usados].sort().map((material) => texturas.get(material));
}

export async function exportarObj(opcoes) {
  const normalizadas = validarOpcoes(opcoes);
  const malha = validarMalhaObj(opcoes.neutro, normalizadas);
  const corpos = separarCorpos(malha);
  const materiais = materiaisTexturizados(malha, normalizadas.texturas);
  const texturizado = materiais.length > 0;

  const { texto, estatisticas } = gerarObjTexto({
    malha,
    corpos,
    unidade: normalizadas.unidade,
    escala: normalizadas.escala,
    nome: normalizadas.nome,
    texturas: texturizado ? normalizadas.texturas : null,
    nomeMtl: normalizadas.nomeMtl,
  });

  return {
    formato: FORMATO,
    texto,
    bytes: new TextEncoder().encode(texto),
    extensao: '.obj',
    mime: 'model/obj',
    mtl: texturizado ? gerarMtlTexto({ nome: normalizadas.nome, materiais }) : null,
    nomeMtl: texturizado ? normalizadas.nomeMtl : null,
    materiais,
    diagnostico: {
      ...estatisticas,
      tolerancia: normalizadas.tolerancia,
      exigirFechado: normalizadas.exigirFechado,
    },
  };
}
