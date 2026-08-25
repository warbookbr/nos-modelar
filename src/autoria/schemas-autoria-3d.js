/* JSON Schemas descobríveis de N1/N2. A validação semântica final continua nos
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
import {
  CRITERIOS_VISUAIS_FORMA_GLOBAL, FORMATO_ALVO_FORMA_GLOBAL, FORMATO_ANDAIME_GLOBAL,
  FORMATO_AVALIACAO_ALVO_FORMA_GLOBAL, FORMATO_AVALIACAO_FORMA_GLOBAL,
  FORMATO_BLOCAGEM_GLOBAL, FORMATO_CRITICA_ALVO_FORMA_GLOBAL, FORMATO_CRITICA_FORMA_GLOBAL,
  FORMATO_DECISAO_FORMA_GLOBAL, TIPOS_VOLUME_FORMA_GLOBAL, VISTAS_ORTOGRAFICAS_FORMA_GLOBAL,
} from './forma-global.js';
import { SCHEMA_QUALIFICACAO_ALVO } from './qualificacao-alvo.js';

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
const vetor = (tamanho) => ({
  type: 'array', minItems: tamanho, maxItems: tamanho, items: { type: 'number' },
});

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

const envelope = () => objeto({ min: vetor(3), max: vetor(3) });
const landmark = (comTolerancia = false) => objeto({
  id: slug(), posicao: vetor(3), ...(comTolerancia ? { tolerancia: { type: 'number', exclusiveMinimum: 0 } } : {}),
});
const contornosPorVista = () => objeto(Object.fromEntries(VISTAS_ORTOGRAFICAS_FORMA_GLOBAL.map((vista) => [vista, objeto({
  contornos: {
    type: 'array', minItems: 1,
    items: objeto({
      id: slug(), papel: { enum: ['massa-primaria', 'apoio-reconhecimento', 'referencia-secundaria'] },
      pontos: { type: 'array', minItems: 3, items: vetor(2) },
    }),
  },
})])));

const volumeBase = {
  id: slug(), regioes: listaTexto({ minItems: 1, slugue: true }), tipo: { enum: TIPOS_VOLUME_FORMA_GLOBAL }, centro: vetor(3),
};
const SCHEMA_VOLUME_FORMA_GLOBAL = {
  oneOf: [
    objeto({ ...volumeBase, tipo: { const: 'caixa' }, dimensoes: vetor(3) }),
    objeto({
      ...volumeBase, tipo: { const: 'cilindro' }, eixo: { enum: ['x', 'y', 'z'] },
      raio: { type: 'number', exclusiveMinimum: 0 }, comprimento: { type: 'number', exclusiveMinimum: 0 },
      segmentos: { type: 'integer', minimum: 8, maximum: 128 },
    }),
    objeto({
      ...volumeBase, tipo: { const: 'prisma' }, eixoExtrusao: { enum: ['x', 'y', 'z'] },
      eixosPerfil: { type: 'array', minItems: 2, maxItems: 2, uniqueItems: true, items: { enum: ['x', 'y', 'z'] } },
      comprimento: { type: 'number', exclusiveMinimum: 0 },
      perfil: { type: 'array', minItems: 3, items: vetor(2) },
    }),
    objeto({
      ...volumeBase, tipo: { const: 'casco-secoes' }, eixoPercurso: { enum: ['x', 'y', 'z'] },
      eixosSecao: { type: 'array', minItems: 2, maxItems: 2, uniqueItems: true, items: { enum: ['x', 'y', 'z'] } },
      secoes: {
        type: 'array', minItems: 2,
        items: objeto({ posicao: { type: 'number' }, perfil: { type: 'array', minItems: 3, items: vetor(2) } }),
      },
    }),
  ],
};

const SCHEMA_ALVO_FORMA_GLOBAL = {
  $schema: RASCUNHO, $id: FORMATO_ALVO_FORMA_GLOBAL,
  ...objeto({
    formato: { const: FORMATO_ALVO_FORMA_GLOBAL }, id: slug(), objetivo: slug(),
    familia: { enum: FAMILIAS_AUTORIA }, intencao: texto(), unidade: { const: 'mm' }, eixos: eixos(),
    envelope: envelope(), landmarks: { type: 'array', minItems: 1, items: landmark(true) },
    procedencia: objeto({ tipo: slug(), referencias: listaTexto({ minItems: 1 }) }),
    rubrica: objeto({
      id: slug(), categoriaEsperada: slug(), criterios: listaTexto({ minItems: 1, slugue: true }),
      papeisAuxiliares: listaTexto({ slugue: true }),
    }),
    regioesObrigatorias: listaTexto({ minItems: 1, slugue: true }), vistas: contornosPorVista(),
    limiares: objeto({
      iouMinimo: { type: 'number', minimum: 0, maximum: 1 },
      desvioMaximo: { type: 'number', minimum: 0, maximum: 1 },
      erroEnvelopeRelativoMaximo: { type: 'number', minimum: 0, maximum: 1 },
      erroLandmarkNormalizadoMaximo: { type: 'number', minimum: 0 },
    }),
    orcamento: objeto({
      volumesMaximos: { type: 'integer', minimum: 1, maximum: 1000 },
      triangulosMaximos: { type: 'integer', minimum: 1, maximum: 1000000 },
      resolucaoGrade: { type: 'integer', minimum: 32, maximum: 256 },
    }),
    rejeicoes: listaTexto({ minItems: 1, slugue: true }),
  }),
};

const SCHEMA_ANDAIME_GLOBAL = {
  $schema: RASCUNHO, $id: FORMATO_ANDAIME_GLOBAL,
  ...objeto({
    formato: { const: FORMATO_ANDAIME_GLOBAL }, id: slug(), objetivo: slug(), alvo: slug(),
    familia: { enum: FAMILIAS_AUTORIA }, intencao: texto(), unidade: { const: 'mm' }, eixos: eixos(),
    envelope: envelope(), landmarks: { type: 'array', minItems: 1, items: landmark(false) },
    volumes: { type: 'array', minItems: 1, items: SCHEMA_VOLUME_FORMA_GLOBAL },
  }),
};

const SCHEMA_ITEM_CRITERIO_VISUAL = objeto({
  id: { enum: CRITERIOS_VISUAIS_FORMA_GLOBAL }, estado: { enum: ['passa', 'reprova', 'inconclusivo'] }, achado: texto(),
});

const SCHEMA_CRITICA_ALVO_FORMA_GLOBAL = objeto({
  formato: { const: FORMATO_CRITICA_ALVO_FORMA_GLOBAL }, papel: { const: 'critico-visual-independente' },
  contexto: { const: 'alvo-e-rubrica-sem-blocagem' }, alvo: slug(),
  estado: { enum: ['aprovada', 'reprovada', 'inconclusiva'] }, categoriaReconhecida: anulavel(slug()),
  criterios: { type: 'array', minItems: CRITERIOS_VISUAIS_FORMA_GLOBAL.length, maxItems: CRITERIOS_VISUAIS_FORMA_GLOBAL.length, items: SCHEMA_ITEM_CRITERIO_VISUAL },
  achados: listaTexto(),
});

const SCHEMA_AVALIACAO_ALVO_FORMA_GLOBAL = {
  $schema: RASCUNHO, $id: FORMATO_AVALIACAO_ALVO_FORMA_GLOBAL,
  ...objeto({
    formato: { const: FORMATO_AVALIACAO_ALVO_FORMA_GLOBAL }, alvo: slug(), objetivo: slug(),
    gate: { const: 'g00-qualidade-do-alvo' }, estado: { enum: ['aprovado', 'reprovado', 'bloqueado'] },
    motivo: slug(), automatico: { enum: ['aprovado', 'reprovado'] }, rubrica: { type: 'object' },
    critica: anulavel(SCHEMA_CRITICA_ALVO_FORMA_GLOBAL), diagnosticos: { type: 'array', items: diagnostico() },
  }),
};

const SCHEMA_BLOCAGEM_GLOBAL = {
  $schema: RASCUNHO, $id: FORMATO_BLOCAGEM_GLOBAL,
  ...objeto({
    formato: { const: FORMATO_BLOCAGEM_GLOBAL }, id: slug(), objetivo: slug(), alvo: slug(), andaime: slug(),
    familia: { enum: FAMILIAS_AUTORIA }, unidade: { const: 'mm' }, eixos: eixos(),
    envelopeDeclarado: envelope(), envelopeDerivado: envelope(),
    landmarks: { type: 'array', minItems: 1, items: landmark(false) },
    volumes: {
      type: 'array', minItems: 1, items: objeto({
        id: slug(), regioes: listaTexto({ minItems: 1, slugue: true }), tipo: { enum: TIPOS_VOLUME_FORMA_GLOBAL },
        inicioVertice: { type: 'integer', minimum: 0 }, quantidadeVertices: { type: 'integer', minimum: 1 },
        quantidadeTriangulos: { type: 'integer', minimum: 1 },
      }),
    },
    malha: objeto({
      vertices: { type: 'array', minItems: 1, items: vetor(3) },
      faces: {
        type: 'array', minItems: 1,
        items: objeto({ vertices: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'integer', minimum: 0 } }, volume: slug(), regioes: listaTexto({ minItems: 1, slugue: true }) }),
      },
    }),
    estatisticas: objeto({ volumes: { type: 'integer', minimum: 1 }, vertices: { type: 'integer', minimum: 1 }, triangulos: { type: 'integer', minimum: 1 } }),
  }),
};

const SCHEMA_AVALIACAO_FORMA_GLOBAL = {
  $schema: RASCUNHO, $id: FORMATO_AVALIACAO_FORMA_GLOBAL,
  ...objeto({
    formato: { const: FORMATO_AVALIACAO_FORMA_GLOBAL }, alvo: slug(), blocagem: slug(), objetivo: slug(),
    gate: { const: 'g01-forma-global-medida' }, estado: { enum: ['aprovado', 'reprovado', 'bloqueado'] },
    g00: objeto({ estado: { enum: ['aprovado', 'reprovado', 'bloqueado'] }, motivo: slug() }),
    vistas: {
      type: 'array', minItems: 3, maxItems: 3,
      items: objeto({
        id: { enum: VISTAS_ORTOGRAFICAS_FORMA_GLOBAL }, estado: { enum: ['aprovada', 'reprovada'] },
        metricas: objeto({ iou: { type: 'number' }, falta: { type: 'number' }, excesso: { type: 'number' }, desvioMaximo: { type: 'number' } }),
      }),
    },
    envelope: objeto({ estado: { enum: ['aprovado', 'reprovado'] }, erroRelativoMaximo: { type: 'number', minimum: 0 } }),
    landmarks: {
      type: 'array', minItems: 1,
      items: objeto({ id: slug(), estado: { enum: ['aprovado', 'reprovado'] }, erroNormalizado: anulavel({ type: 'number', minimum: 0 }) }),
    },
    regioes: objeto({ estado: { enum: ['aprovado', 'reprovado'] }, ausentes: listaTexto({ slugue: true }) }),
    orcamento: objeto({ estado: { enum: ['aprovado', 'reprovado'] }, usado: { type: 'object' }, limite: { type: 'object' } }),
    diagnosticos: { type: 'array', items: diagnostico() },
  }),
};

const SCHEMA_CRITICA_FORMA_GLOBAL = objeto({
  formato: { const: FORMATO_CRITICA_FORMA_GLOBAL }, papel: { const: 'critico-visual-independente' },
  contexto: { const: 'vistas-neutras-sem-identidade-do-alvo' }, blocagem: slug(),
  estado: { enum: ['reconhecida', 'reprovada', 'inconclusiva'] }, rotulo: anulavel(texto(120)),
  criterios: { type: 'array', minItems: CRITERIOS_VISUAIS_FORMA_GLOBAL.length, maxItems: CRITERIOS_VISUAIS_FORMA_GLOBAL.length, items: SCHEMA_ITEM_CRITERIO_VISUAL },
  achados: listaTexto(),
});

const SCHEMA_DECISAO_FORMA_GLOBAL = {
  $schema: RASCUNHO, $id: FORMATO_DECISAO_FORMA_GLOBAL,
  ...objeto({
    formato: { const: FORMATO_DECISAO_FORMA_GLOBAL }, alvo: slug(), blocagem: slug(),
    estado: { enum: ['aprovado', 'reprovado', 'bloqueado'] }, motivo: slug(),
    gates: objeto({ g00: { enum: ['aprovado', 'reprovado', 'bloqueado'] }, g01: { enum: ['aprovado', 'reprovado', 'bloqueado'] }, g02: { enum: ['aprovado', 'reprovado', 'bloqueado'] } }),
    critica: anulavel(SCHEMA_CRITICA_FORMA_GLOBAL), decisaoUsuario: anulavel({ enum: ['aprovar', 'reprovar'] }),
  }),
};

const CONTRATOS = congelar({
  objetivo: SCHEMA_OBJETIVO, receitaAutoral: SCHEMA_RECEITA, provedor: SCHEMA_PROVEDOR,
  protocolo: SCHEMA_PROTOCOLO, plano: SCHEMA_PLANO, execucao: SCHEMA_EXECUCAO,
  resultadoEtapa: SCHEMA_RESULTADO_ETAPA, resultadoPlanejamento: SCHEMA_RESULTADO_PLANEJAMENTO,
  cobertura: SCHEMA_COBERTURA, alvoFormaGlobal: SCHEMA_ALVO_FORMA_GLOBAL,
  andaimeGlobal: SCHEMA_ANDAIME_GLOBAL, blocagemGlobal: SCHEMA_BLOCAGEM_GLOBAL,
  avaliacaoAlvoFormaGlobal: SCHEMA_AVALIACAO_ALVO_FORMA_GLOBAL,
  avaliacaoFormaGlobal: SCHEMA_AVALIACAO_FORMA_GLOBAL, decisaoFormaGlobal: SCHEMA_DECISAO_FORMA_GLOBAL,
  qualificacaoAlvo: SCHEMA_QUALIFICACAO_ALVO,
});

const INDICE = congelar({
  formato: FORMATO_SCHEMAS_AUTORIA_3D,
  rascunho: RASCUNHO,
  contratos: CONTRATOS,
  limites: [
    'schema valida estrutura; normalizador valida eixos não colineares, referências e identidades cruzadas',
    'schema não aprova forma, superfície, conectividade, evidência ou decisão humana',
    'G00 reprova alvo fraco antes da geometria; G01 mede forma somente contra alvo aprovado; G02 depende de crítico independente e usuário',
  ],
});

export function indiceSchemasAutoria3D() { return INDICE; }
