/* index.js — porta pública do módulo exportador Wavefront OBJ. */
import { separarCorpos } from '../../exportador-cad/src/separar-corpos.js';
import { ErroExportacaoObj, FORMATO, resolverEscalaPadrao, validarOpcoes } from './contrato.js';
import { gerarObjTexto } from './gerar-obj.js';
import { validarMalhaObj } from './validar-malha.js';

export { ErroExportacaoObj, FORMATO, resolverEscalaPadrao, validarOpcoes } from './contrato.js';
export { validarMalhaObj } from './validar-malha.js';

export async function exportarObj(opcoes) {
  const normalizadas = validarOpcoes(opcoes);
  const malha = validarMalhaObj(opcoes.neutro, normalizadas);
  const corpos = separarCorpos(malha);

  const { texto, estatisticas } = gerarObjTexto({
    malha,
    corpos,
    unidade: normalizadas.unidade,
    escala: normalizadas.escala,
    nome: normalizadas.nome,
  });

  return {
    formato: FORMATO,
    texto,
    bytes: new TextEncoder().encode(texto),
    extensao: '.obj',
    mime: 'model/obj',
    diagnostico: {
      ...estatisticas,
      tolerancia: normalizadas.tolerancia,
      exigirFechado: normalizadas.exigirFechado,
    },
  };
}
