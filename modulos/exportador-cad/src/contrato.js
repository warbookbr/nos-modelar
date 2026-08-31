/* contrato.js — contrato e validação de opções do exportador CAD. */
export const FORMATO = 'mecanifica.exportacao-cad@1';
export const UNIDADES = Object.freeze(new Set(['mm', 'cm', 'm']));
export const ESTRATEGIAS = Object.freeze(new Set(['facetada']));

export class ErroExportacaoCad extends Error {
  constructor(codigo, mensagem, detalhes = {}) {
    super(mensagem);
    this.name = 'ErroExportacaoCad';
    this.codigo = codigo;
    this.detalhes = Object.freeze({ ...detalhes });
  }
}

export function validarOpcoes(opcoes) {
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) {
    throw new ErroExportacaoCad('entrada-invalida', 'Opções de exportação precisam ser um objeto.');
  }
  const { nome, formato, estrategia, unidade, escala = 1, tolerancia } = opcoes;
  if (typeof nome !== 'string' || !nome.trim()) throw new ErroExportacaoCad('nome-invalido', 'Nome da peça precisa ser texto não vazio.');
  if (formato !== 'step') throw new ErroExportacaoCad('formato-nao-suportado', "Somente o formato 'step' é suportado.", { formato });
  if (estrategia !== 'facetada') throw new ErroExportacaoCad('estrategia-nao-suportada', "Somente a estratégia 'facetada' é suportada.", { estrategia });
  if (!UNIDADES.has(unidade)) throw new ErroExportacaoCad('unidade-invalida', 'Unidade precisa ser mm, cm ou m.', { unidade });
  if (!Number.isFinite(escala) || escala <= 0) throw new ErroExportacaoCad('escala-invalida', 'Escala precisa ser um número positivo.', { escala });
  if (!Number.isFinite(tolerancia) || tolerancia <= 0) throw new ErroExportacaoCad('tolerancia-invalida', 'Tolerância precisa ser um número positivo.', { tolerancia });
  return { nome: nome.trim(), formato, estrategia, unidade, escala, tolerancia };
}
