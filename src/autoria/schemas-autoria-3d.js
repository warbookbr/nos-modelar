/* JSON Schemas descobríveis da N1. A validação semântica final continua nos
   normalizadores e na máquina de estados; schemas são a fronteira estrutural. */

import {
  ETAPAS_AUTORIA, FAMILIAS_AUTORIA, FORMATO_OBJETIVO_AUTORIA,
  FORMATO_PROVEDOR_AUTORIA, FORMATO_RECEITA_AUTORAL,
  TIPOS_FONTE_AUTORAL, TIPOS_PRODUTO_DERIVADO,
} from './contrato-autoria-3d.js';
import {
  FORMATO_EXECUCAO_FLUXO_AUTORIA, FORMATO_PLANO_FLUXO_AUTORIA,
  FORMATO_PROTOCOLO_FLUXO_AUTORIA,
} from './orquestrar-fluxo-autoria.js';

export const FORMATO_SCHEMAS_AUTORIA_3D = 'mecanifica.schemas-autoria-3d@1';
export const FORMATO_RESULTADO_ETAPA_AUTORIA = 'mecanifica.resultado-etapa-autoria@1';
export const FORMATO_RESULTADO_PLANEJAMENTO_AUTORIA = 'mecanifica.resultado-planejamento-autoria@1';
export const FORMATO_COBERTURA_FLUXO_AUTORIA = 'mecanifica.cobertura-fluxo-autoria@1';

const RASCUNHO = 'https://json-schema.org/draft/2020-12/schema';
const SLUG = '^[a-z0-9]+(?:-[a-z0-9]+)*$';
const SEMVER = '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$';
const SHA256 = '^sha256:[0-9a-f]{64}$';
const DIRECOES = ['+x', '-x', '+y', '-y', '+z', '-z'];

function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar); Object.freeze(valor);
  }
  return valor;
}

const texto = (maxLength = 500) => ({ type: 'string', minLength: 1, maxLength });
const slug = () => ({ type: 'string', pattern: SLUG, maxLength: 120 });
const semver = () => ({ type: 'string', pattern: SEMVER });
const listaTexto = ({ minItems = 0, slugue = false } = {}) => ({
  type: 'array', minItems, uniqueItems: true, items: slugue ? slug() : texto(),
});
const objeto = (properties, required = Object.keys(properties)) => ({
  type: 'object', additionalProperties: false, required, properties,
});
const anulavel = (schema) => ({ anyOf: [schema, { type: 'null' }] });

const eixos = () => objeto({
  direita: { enum: DIRECOES }, cima: { enum: DIRECOES }, frente: { enum: DIRECOES },
});
const artefatos = (saidaObrigatoria = true) => objeto({
  entra: listaTexto(), sai: listaTexto({ minItems: saidaObrigatoria ? 1 : 0 }),
});
const diagnostico = () => objeto({
  codigo: texto(), campo: texto(), causa: texto(), impacto: texto(), proximoPasso: texto(),
});

const SCHEMA_OBJETIVO = {
  $schema: RASCUNHO, $id: FORMATO_OBJETIVO_AUTORIA,
  ...objeto({
    formato: { const: FORMATO_OBJETIVO_AUTORIA }, id: slug(),
    familia: { enum: FAMILIAS_AUTORIA }, intencao: texto(),
    qualidade: { enum: ['exploratoria', 'reconhecivel', 'integrada', 'promovivel'] },
    unidade: { const: 'mm' }, eixos: eixos(),
    referencias: {
      type: 'array', minItems: 1, uniqueItems: true,
      items: objeto({ id: slug(), tipo: slug(), evidencia: texto() }),
    },
    restricoes: listaTexto(), rejeicoes: listaTexto({ minItems: 1 }),
    incertezas: {
      type: 'array', uniqueItems: true,
      items: objeto({
        id: slug(), sobre: texto(), motivo: texto(), efeito: { enum: ['diagnostico', 'bloqueia'] },
        referencia: anulavel(slug()),
      }),
    },
    necessidades: {
      type: 'array', uniqueItems: true,
      items: objeto({
        id: slug(), etapa: { enum: ETAPAS_AUTORIA }, classe: slug(),
        artefatos: artefatos(), interfaces: artefatos(false),
        requisitos: listaTexto(), obrigatoria: { type: 'boolean' },
      }),
    },
  }),
};

const SCHEMA_RECEITA = {
  $schema: RASCUNHO, $id: FORMATO_RECEITA_AUTORAL,
  ...objeto({
    formato: { const: FORMATO_RECEITA_AUTORAL }, id: slug(), objetivo: slug(),
    familia: { enum: FAMILIAS_AUTORIA }, revisaoPai: anulavel(slug()), intencao: texto(),
    coordenadas: objeto({ unidade: { const: 'mm' }, escala: { type: 'number', exclusiveMinimum: 0 }, eixos: eixos() }),
    fontes: {
      type: 'array', minItems: 1, uniqueItems: true,
      items: objeto({ id: slug(), tipo: { enum: TIPOS_FONTE_AUTORAL }, formato: texto(), versao: semver() }),
    },
    semantica: objeto({
      regioes: listaTexto({ slugue: true }), landmarks: listaTexto({ slugue: true }), interfaces: listaTexto({ slugue: true }),
    }),
    dependencias: {
      type: 'array', uniqueItems: true,
      items: objeto({ tipo: slug(), id: slug(), revisao: anulavel(slug()) }),
    },
    produtosDerivados: {
      type: 'array', uniqueItems: true,
      items: {
        ...objeto({
          id: slug(), tipo: { enum: TIPOS_PRODUTO_DERIVADO }, estado: { enum: ['esperado', 'compilado'] },
          assinatura: anulavel({ type: 'string', pattern: SHA256 }), provedor: slug(), versao: semver(),
        }),
        allOf: [
          { if: { properties: { estado: { const: 'esperado' } }, required: ['estado'] }, then: { properties: { assinatura: { type: 'null' } } } },
          { if: { properties: { estado: { const: 'compilado' } }, required: ['estado'] }, then: { properties: { assinatura: { type: 'string', pattern: SHA256 } } } },
        ],
      },
    },
    aceite: objeto({
      gates: {
        type: 'array', minItems: 1, uniqueItems: true,
        items: objeto({ id: slug(), estado: { enum: ['pendente', 'aprovado', 'reprovado', 'bloqueado'] } }),
      },
    }),
  }),
};

const SCHEMA_PROVEDOR = {
  $schema: RASCUNHO, $id: FORMATO_PROVEDOR_AUTORIA,
  ...objeto({
    formato: { const: FORMATO_PROVEDOR_AUTORIA }, id: slug(), versao: semver(),
    familias: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: ['*', ...FAMILIAS_AUTORIA] } },
    etapas: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: ETAPAS_AUTORIA } },
    classes: listaTexto({ minItems: 1, slugue: true }),
    efeitos: {
      type: 'array', minItems: 1, uniqueItems: true,
      items: { enum: ['leitura', 'planejamento', 'compilacao', 'validacao', 'revisao', 'publicacao'] },
    },
  }),
};

const SCHEMA_PROTOCOLO = {
  $schema: RASCUNHO, $id: FORMATO_PROTOCOLO_FLUXO_AUTORIA,
  ...objeto({
    formato: { const: FORMATO_PROTOCOLO_FLUXO_AUTORIA }, familia: { enum: FAMILIAS_AUTORIA },
    etapas: { type: 'array', minItems: 1, items: objeto({ id: { enum: ETAPAS_AUTORIA }, classe: slug() }) },
  }),
};

const SCHEMA_PLANO = {
  $schema: RASCUNHO, $id: FORMATO_PLANO_FLUXO_AUTORIA,
  ...objeto({
    formato: { const: FORMATO_PLANO_FLUXO_AUTORIA }, estado: { enum: ['pronto', 'bloqueado'] },
    objetivo: { $ref: FORMATO_OBJETIVO_AUTORIA },
    etapas: {
      type: 'array', items: objeto({
        id: { enum: ETAPAS_AUTORIA }, estado: { enum: ['planejada', 'bloqueada'] },
        necessidades: listaTexto({ slugue: true }),
      }),
    },
    escolhas: {
      type: 'array', items: objeto({
        necessidade: slug(), etapa: { enum: ETAPAS_AUTORIA }, estado: { enum: ['planejada', 'bloqueada', 'omitida'] },
        provedor: anulavel(slug()), custo: anulavel({ type: 'number', minimum: 0 }),
        plano: anulavel({ type: 'object' }), lacuna: anulavel({ type: 'object' }),
      }),
    },
    diagnosticos: { type: 'array', items: diagnostico() },
  }),
};

const SCHEMA_EXECUCAO = {
  $schema: RASCUNHO, $id: FORMATO_EXECUCAO_FLUXO_AUTORIA,
  ...objeto({
    formato: { const: FORMATO_EXECUCAO_FLUXO_AUTORIA }, objetivo: { $ref: FORMATO_OBJETIVO_AUTORIA },
    estado: { enum: ['em-execucao', 'concluido', 'reprovado', 'bloqueado'] },
    etapaAtual: anulavel({ enum: ETAPAS_AUTORIA }),
    etapas: {
      type: 'array', minItems: 1,
      items: objeto({ id: { enum: ETAPAS_AUTORIA }, estado: { enum: ['pendente', 'aprovada', 'reprovada', 'bloqueada'] } }),
    },
    historico: {
      type: 'array', items: objeto({
        etapa: { enum: ETAPAS_AUTORIA }, estado: { enum: ['aprovada', 'reprovada', 'bloqueada'] },
        evidencias: listaTexto(), diagnosticos: { type: 'array', items: diagnostico() },
        decisaoUsuario: anulavel({ enum: ['aprovar', 'reprovar'] }),
      }),
    },
  }),
  allOf: [
    { if: { properties: { estado: { const: 'concluido' } }, required: ['estado'] }, then: { properties: { etapaAtual: { type: 'null' } } } },
    { if: { properties: { estado: { enum: ['em-execucao', 'reprovado', 'bloqueado'] } }, required: ['estado'] }, then: { properties: { etapaAtual: { enum: ETAPAS_AUTORIA } } } },
  ],
};

const SCHEMA_RESULTADO_ETAPA = {
  $schema: RASCUNHO, $id: FORMATO_RESULTADO_ETAPA_AUTORIA,
  ...objeto({
    etapa: { enum: ETAPAS_AUTORIA }, estado: { enum: ['aprovada', 'reprovada', 'bloqueada'] },
    evidencias: listaTexto(), diagnosticos: { type: 'array', items: diagnostico() },
    decisaoUsuario: anulavel({ enum: ['aprovar', 'reprovar'] }),
  }),
};

const SCHEMA_RESULTADO_PLANEJAMENTO = {
  $schema: RASCUNHO, $id: FORMATO_RESULTADO_PLANEJAMENTO_AUTORIA,
  ...objeto({
    formato: { const: FORMATO_RESULTADO_PLANEJAMENTO_AUTORIA },
    estado: { enum: ['pronto', 'bloqueado', 'invalido'] },
    plano: anulavel({ $ref: FORMATO_PLANO_FLUXO_AUTORIA }),
    diagnosticos: { type: 'array', items: diagnostico() },
  }),
  allOf: [
    { if: { properties: { estado: { const: 'invalido' } }, required: ['estado'] }, then: { properties: { plano: { type: 'null' } } } },
    { if: { properties: { estado: { enum: ['pronto', 'bloqueado'] } }, required: ['estado'] }, then: { properties: { plano: { $ref: FORMATO_PLANO_FLUXO_AUTORIA } } } },
  ],
};

const SCHEMA_COBERTURA = {
  $schema: RASCUNHO, $id: FORMATO_COBERTURA_FLUXO_AUTORIA,
  ...objeto({
    formato: { const: FORMATO_COBERTURA_FLUXO_AUTORIA }, familia: { enum: FAMILIAS_AUTORIA },
    protocolo: { const: FORMATO_PROTOCOLO_FLUXO_AUTORIA },
    provedores: {
      type: 'array', uniqueItems: true, items: objeto({ id: slug(), versao: semver() }),
    },
    etapas: {
      type: 'array', minItems: 1,
      items: objeto({ id: { enum: ETAPAS_AUTORIA }, classe: slug(), estado: { enum: ['coberta', 'lacuna'] }, provedores: listaTexto({ slugue: true }) }),
    },
    totais: objeto({
      etapas: { type: 'integer', minimum: 1 }, cobertas: { type: 'integer', minimum: 0 }, lacunas: { type: 'integer', minimum: 0 },
    }),
  }),
};

const CONTRATOS = congelar({
  objetivo: SCHEMA_OBJETIVO, receitaAutoral: SCHEMA_RECEITA, provedor: SCHEMA_PROVEDOR,
  protocolo: SCHEMA_PROTOCOLO, plano: SCHEMA_PLANO, execucao: SCHEMA_EXECUCAO,
  resultadoEtapa: SCHEMA_RESULTADO_ETAPA, resultadoPlanejamento: SCHEMA_RESULTADO_PLANEJAMENTO,
  cobertura: SCHEMA_COBERTURA,
});

const INDICE = congelar({
  formato: FORMATO_SCHEMAS_AUTORIA_3D,
  rascunho: RASCUNHO,
  contratos: CONTRATOS,
  limites: [
    'schema valida estrutura; normalizador valida eixos não colineares, referências e identidades cruzadas',
    'schema não aprova forma, superfície, conectividade, evidência ou decisão humana',
  ],
});

export function indiceSchemasAutoria3D() { return INDICE; }
