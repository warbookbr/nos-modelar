/* qualificacao-alvo.js — declara o que uma referência permite inferir. */

export const FORMATO_QUALIFICACAO_ALVO = 'mecanifica.qualificacao-alvo@1';

export const SCHEMA_QUALIFICACAO_ALVO = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: FORMATO_QUALIFICACAO_ALVO,
  oneOf: [
    {
      type: 'object', additionalProperties: false,
      required: ['classe', 'formato', 'id', 'limitacoes', 'origem', 'versao'],
      properties: {
        formato: { const: FORMATO_QUALIFICACAO_ALVO }, versao: { const: 1 },
        id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        classe: { const: 'direcao-estetica' }, limitacoes: { type: 'array', uniqueItems: true, items: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } },
        origem: { type: 'object', additionalProperties: false, required: ['hash', 'tipo'], properties: { tipo: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }, hash: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' } } },
      },
    },
    {
      type: 'object', additionalProperties: false,
      required: ['classe', 'formato', 'geometria', 'id', 'limitacoes', 'origem', 'versao'],
      properties: {
        formato: { const: FORMATO_QUALIFICACAO_ALVO }, versao: { const: 1 },
        id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        classe: { const: 'alvo-geometrico' }, limitacoes: { type: 'array', uniqueItems: true, items: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } },
        origem: { type: 'object', additionalProperties: false, required: ['hash', 'tipo'], properties: { tipo: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }, hash: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' } } },
        geometria: { type: 'object', additionalProperties: false, required: ['cameras', 'correspondencias', 'escala', 'objeto'], properties: {
          objeto: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          escala: { type: 'object', additionalProperties: false, required: ['fator', 'unidade'], properties: { unidade: { const: 'mm' }, fator: { type: 'number', exclusiveMinimum: 0 } } },
          cameras: { type: 'array', minItems: 2, uniqueItems: true, items: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } },
          correspondencias: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } },
        } },
      },
    },
    {
      type: 'object', additionalProperties: false,
      required: ['classe', 'formato', 'id', 'limitacoes', 'motivo', 'origem', 'versao'],
      properties: {
        formato: { const: FORMATO_QUALIFICACAO_ALVO }, versao: { const: 1 },
        id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        classe: { const: 'indeterminado' }, motivo: { type: 'string', minLength: 1 },
        limitacoes: { type: 'array', uniqueItems: true, items: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } },
        origem: { type: 'object', additionalProperties: false, required: ['hash', 'tipo'], properties: { tipo: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }, hash: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' } } },
      },
    },
  ],
});

const CLASSES = new Set(['direcao-estetica', 'alvo-geometrico', 'indeterminado']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA = /^sha256:[a-f0-9]{64}$/;

function falhar(mensagem) { throw new Error(`qualificacao-alvo: ${mensagem}`); }
function objeto(valor, onde) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(`${onde} precisa ser objeto.`);
  return valor;
}
function texto(valor, onde) {
  if (typeof valor !== 'string' || !valor.trim()) falhar(`${onde} precisa ser texto não vazio.`);
  return valor;
}
function slug(valor, onde) {
  const resultado = texto(valor, onde);
  if (!SLUG.test(resultado)) falhar(`${onde} precisa ser slug minúsculo.`);
  return resultado;
}
function chavesExatas(valor, esperadas, onde) {
  const atuais = Object.keys(objeto(valor, onde)).sort();
  const ordenadas = [...esperadas].sort();
  if (atuais.length !== ordenadas.length || atuais.some((chave, i) => chave !== ordenadas[i])) {
    falhar(`${onde} tem chaves inválidas.`);
  }
}
function listaSlugs(valor, onde, minimo = 0) {
  if (!Array.isArray(valor) || valor.length < minimo) falhar(`${onde} precisa ter ao menos ${minimo} item(ns).`);
  const itens = valor.map((item, indice) => slug(item, `${onde}[${indice}]`));
  if (new Set(itens).size !== itens.length) falhar(`${onde} não pode repetir itens.`);
  return itens;
}
function copiar(valor) { return JSON.parse(JSON.stringify(valor)); }

function validarOrigem(origem) {
  chavesExatas(origem, ['hash', 'tipo'], 'origem');
  const tipo = slug(origem.tipo, 'origem.tipo');
  const hash = texto(origem.hash, 'origem.hash');
  if (!SHA.test(hash)) falhar('origem.hash precisa ser SHA-256.');
  return { tipo, hash };
}

function validarGeometria(geometria) {
  chavesExatas(geometria, ['cameras', 'correspondencias', 'escala', 'objeto'], 'geometria');
  const objetoComum = slug(geometria.objeto, 'geometria.objeto');
  chavesExatas(geometria.escala, ['fator', 'unidade'], 'geometria.escala');
  if (geometria.escala.unidade !== 'mm' || !Number.isFinite(geometria.escala.fator) || geometria.escala.fator <= 0) {
    falhar('geometria.escala precisa declarar mm e fator positivo.');
  }
  return {
    objeto: objetoComum,
    escala: { unidade: 'mm', fator: geometria.escala.fator },
    cameras: listaSlugs(geometria.cameras, 'geometria.cameras', 2),
    correspondencias: listaSlugs(geometria.correspondencias, 'geometria.correspondencias', 1),
  };
}

/**
 * Normaliza um contrato puro. Somente `alvo-geometrico` autoriza fitting;
 * conceito sem calibração permanece intencionalmente incapaz de fazê-lo.
 */
export function validarQualificacaoAlvo(entrada) {
  objeto(entrada, 'qualificacao');
  const classe = entrada.classe;
  const esperadas = ['classe', 'formato', 'id', 'limitacoes', 'origem', 'versao'];
  if (classe === 'alvo-geometrico') esperadas.push('geometria');
  if (classe === 'indeterminado') {
    if (!Object.hasOwn(entrada, 'motivo')) falhar('motivo é obrigatório para alvo indeterminado.');
    esperadas.push('motivo');
  }
  chavesExatas(entrada, esperadas, 'qualificacao');
  if (entrada.formato !== FORMATO_QUALIFICACAO_ALVO || entrada.versao !== 1) falhar('formato ou versão não suportados.');
  if (!CLASSES.has(classe)) falhar('classe inválida.');
  const normalizado = {
    formato: FORMATO_QUALIFICACAO_ALVO,
    versao: 1,
    id: slug(entrada.id, 'id'),
    classe,
    origem: validarOrigem(entrada.origem),
    limitacoes: listaSlugs(entrada.limitacoes, 'limitacoes'),
    permiteFittingGeometrico: classe === 'alvo-geometrico',
  };
  if (classe === 'alvo-geometrico') normalizado.geometria = validarGeometria(entrada.geometria);
  if (classe === 'indeterminado') normalizado.motivo = texto(entrada.motivo, 'motivo');
  return Object.freeze(copiar(normalizado));
}
