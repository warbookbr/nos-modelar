/* contrato.js — tipos, erros e validação de opções do exportador Wavefront OBJ. */

export const FORMATO = 'mecanifica.exportacao-obj@1';
export const UNIDADES_VALIDAS = Object.freeze(['mm', 'cm', 'm']);

export class ErroExportacaoObj extends Error {
  constructor(codigo, mensagem, detalhes = null) {
    super(mensagem);
    this.name = 'ErroExportacaoObj';
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

export function resolverEscalaPadrao(unidade = 'm', escalaInformada) {
  if (escalaInformada !== undefined && escalaInformada !== null) {
    return escalaInformada;
  }
  if (unidade === 'cm') return 100;
  if (unidade === 'mm') return 1000;
  return 1;
}

export function validarOpcoes(opcoes) {
  if (!opcoes || typeof opcoes !== 'object') {
    throw new ErroExportacaoObj('opcoes-invalidas', 'Opções de exportação precisam ser um objeto.');
  }

  const {
    nome,
    unidade = 'm',
    tolerancia = 0.001,
    escala: escalaInformada,
    exigirFechado = false,
  } = opcoes;

  if (typeof nome !== 'string' || !nome.trim()) {
    throw new ErroExportacaoObj('nome-invalido', 'Nome da peça ou montagem precisa ser string não vazia.');
  }

  if (!UNIDADES_VALIDAS.includes(unidade)) {
    throw new ErroExportacaoObj(
      'unidade-invalida',
      `Unidade '${unidade}' inválida. Use: ${UNIDADES_VALIDAS.join(', ')}.`,
    );
  }

  if (!Number.isFinite(tolerancia) || tolerancia <= 0) {
    throw new ErroExportacaoObj('tolerancia-invalida', 'Tolerância precisa ser número positivo finito.');
  }

  const escala = resolverEscalaPadrao(unidade, escalaInformada);
  if (!Number.isFinite(escala) || escala <= 0) {
    throw new ErroExportacaoObj('escala-invalida', 'Escala precisa ser número positivo finito.');
  }

  return {
    nome: nome.trim(),
    unidade,
    tolerancia,
    escala,
    exigirFechado: Boolean(exigirFechado),
  };
}
