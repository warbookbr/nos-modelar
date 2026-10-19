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

const NOME_DE_MATERIAL = /^[A-Za-z0-9_-]+$/;
const ARQUIVO_DE_TEXTURA = /^[A-Za-z0-9_.-]+\.(png|jpe?g)$/i;
const NOME_DE_MTL = /^[A-Za-z0-9_.-]+\.mtl$/;

/* texturas: { nomeDoMaterial: { arquivo, metrosPorTile } }. Vazio ou ausente devolve null, e a saída fica igual à de antes. */
export function validarTexturas(texturas) {
  if (texturas === undefined || texturas === null) return null;
  if (typeof texturas !== 'object' || Array.isArray(texturas)) {
    throw new ErroExportacaoObj('texturas-invalidas', 'Texturas precisam ser um objeto { material: { arquivo, metrosPorTile } }.');
  }
  const mapa = new Map();
  for (const material of Object.keys(texturas).sort()) {
    const entrada = texturas[material];
    if (!NOME_DE_MATERIAL.test(material)) {
      throw new ErroExportacaoObj('material-invalido', `Nome de material '${material}' precisa ter só letras, números, _ e -.`);
    }
    if (!entrada || typeof entrada !== 'object' || typeof entrada.arquivo !== 'string' || !ARQUIVO_DE_TEXTURA.test(entrada.arquivo)) {
      throw new ErroExportacaoObj('textura-invalida', `Textura de '${material}' precisa de arquivo PNG ou JPEG com nome simples, sem pasta.`);
    }
    if (!Number.isFinite(entrada.metrosPorTile) || entrada.metrosPorTile <= 0) {
      throw new ErroExportacaoObj('textura-invalida', `metrosPorTile de '${material}' precisa ser número positivo finito, em metros.`);
    }
    mapa.set(material, { material, arquivo: entrada.arquivo, metrosPorTile: entrada.metrosPorTile });
  }
  return mapa.size ? mapa : null;
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
    texturas: texturasInformadas,
    nomeMtl: nomeMtlInformado,
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

  const nomeMtl = nomeMtlInformado === undefined || nomeMtlInformado === null
    ? `${nome.trim()}.mtl`
    : nomeMtlInformado;
  if (typeof nomeMtl !== 'string' || !NOME_DE_MTL.test(nomeMtl)) {
    throw new ErroExportacaoObj('nome-mtl-invalido', 'Nome do .mtl precisa ser um arquivo simples terminado em .mtl, sem pasta.');
  }

  return {
    nome: nome.trim(),
    unidade,
    tolerancia,
    escala,
    exigirFechado: Boolean(exigirFechado),
    texturas: validarTexturas(texturasInformadas),
    nomeMtl,
  };
}
