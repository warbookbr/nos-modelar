/* contratos.mjs — schemas e respostas públicas do perfil MCP somente leitura. */
import { z } from 'zod';
export const VERSAO_CONTRATO_MCP = 'mecanifica.mcp.revisao.v6';
export const PERFIL = 'revisao';
export const TRANSPORTE = 'stdio';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nomeParte = z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/);
/* Pacotes homologados existentes podem expor o identificador procedural
   `_mancal-de-mesa`; ele é uma identidade válida de peça, embora não seja um
   slug de montagem. Mantemos montagem/IDs de revisão estritos e aceitamos o
   legado somente no campo que transporta peça. */
const peca = z.string().regex(/^_?[a-z0-9]+(?:-[a-z0-9]+)*$/);
const revisao = z.string().regex(/^r[0-9]+$/);
const vetor = z.array(z.number()).length(3);
const erro = z.object({
  codigo: z.string(),
  mensagem: z.string(),
  acao: z.string(),
});
const respostaBase = {
  ok: z.boolean(),
  codigo: z.number().int(),
  erro: erro.optional(),
};
const totais = z.object({
  partes: z.number().int(),
  faces: z.number().int(),
  vertices: z.number().int(),
  facesSemParte: z.number().int(),
  orfaos: z.number().int(),
  portas: z.number().int(),
  materiais: z.number().int(),
}).strict();
const parte = z.object({
  nome: nomeParte,
  faces: z.number().int(),
  corpos: z.number().int(),
  min: vetor,
  max: vetor,
  centro: vetor,
  dimensoes: vetor,
}).strict();
const hierarquia = z.object({ nome: nomeParte, pai: nomeParte.nullable() }).strict();
const relacao = z.object({
  a: nomeParte,
  b: nomeParte,
  tipo: z.string(),
  distancia: z.number(),
  eixo: z.string(),
  porEixo: vetor,
}).strict();
const porta = z.object({
  id: nomeParte,
  rotulo: z.string(),
  op: z.string(),
  recorte: z.string(),
  origem: z.string(),
}).strict();
const geometria = z.object({
  algoritmo: z.literal('malha-canonica-v1'),
  partes: z.array(z.object({ nome: nomeParte, assinatura: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).strict()),
}).strict();
const descricaoPublica = z.object({
  totais,
  partes: z.array(parte),
  hierarquia: z.array(hierarquia),
  relacoes: z.array(relacao),
  portas: z.array(porta),
  geometria,
}).strict();
const contagem = z.object({ campo: z.string(), anterior: z.number(), atual: z.number() }).strict();
const mudancas = z.object({ adicionadas: z.number().int(), removidas: z.number().int(), alteradas: z.number().int() }).strict();
const comparacaoPublica = z.object({
  formato: z.literal('mecanifica.comparacao-revisao'),
  versao: z.number().int(),
  peca: z.string(),
  anterior: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  atual: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  modeloMudou: z.boolean(),
  contagens: z.array(contagem),
  alteracoes: z.object({
    partes: mudancas,
    relacoes: mudancas,
    portas: mudancas,
    aparencia: z.object({ materiais: mudancas, partes: mudancas }).strict(),
    geometria: z.object({ partes: mudancas, mudou: z.boolean() }).strict(),
  }).strict(),
}).strict();

export const descreverEntrada = z.object({
  peca,
  partes: z.array(nomeParte).optional(),
  subarvore: nomeParte.optional(),
  casas: z.number().int().min(0).max(12).optional(),
  estrito: z.boolean().optional(),
}).strict();

export const validarEntrada = z.object({ id: slug }).strict();

export const compararEntrada = z.object({
  id: slug,
  anterior: revisao,
  posterior: revisao,
}).strict();

export const renderizarEntrada = z.object({ peca }).strict();

const caminhoMontagem = z.array(nomeParte).max(64);
const idMontagem = slug;
const vistaMontagem = z.enum([
  'isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior',
]);

export const descreverMontagemEntrada = z.object({
  id: idMontagem,
  caminho: caminhoMontagem.optional(),
  profundidade: z.number().int().min(0).max(32).optional(),
  incluirRelacionados: z.boolean().optional(),
}).strict();

export const revalidarMontagemEntrada = z.object({
  id: idMontagem,
  alvo: z.union([
    caminhoMontagem.min(1),
    z.object({ tipo: z.enum(['peca', 'montagem']), ref: slug }).strict(),
  ]),
}).strict();

export const catalogarMontagensEntrada = z.object({
  ids: z.array(idMontagem).min(1).max(32),
}).strict();

export const renderizarMontagemEntrada = z.object({
  id: idMontagem,
  caminho: caminhoMontagem.optional(),
  vistas: z.array(vistaMontagem).min(1).max(4).optional(),
}).strict();

export const revisarMontagemEntrada = z.object({
  id: idMontagem,
  caminho: caminhoMontagem.optional(),
  modoFoco: z.enum(['incidente', 'interno']).optional(),
  vistas: z.array(vistaMontagem).min(1).max(4).optional(),
  incluirRelacionados: z.boolean().optional(),
}).strict();

const alvoImpactoGlobal = z.object({
  tipo: z.enum(['peca', 'montagem']),
  id: slug,
}).strict();

const passoImpactoGlobal = z.object({ montagem: slug, instancia: nomeParte }).strict();
const caminhoImpactoGlobal = z.object({
  raiz: slug,
  caminho: z.array(passoImpactoGlobal),
}).strict();
const provenienciaImpactoGlobal = z.object({
  fonte: z.enum(['base-estatica', 'revisao-ativa']),
  revisao: z.string().nullable(),
  sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
}).strict();

export const consultarImpactoGlobalEntrada = alvoImpactoGlobal;

const artefatosProcedurais = z.object({
  entra: z.array(z.string().min(1)), sai: z.array(z.string().min(1)),
}).strict();
const interfacesProcedurais = z.object({
  entra: z.array(z.string().min(1)), sai: z.array(z.string().min(1)),
}).strict();
const identificadorProcedural = z.string().min(1).max(240);
/* O núcleo usa o mesmo identificador semântico para composições declarativas.
   Mantê-lo na borda evita aceitar uma chamada que só falhará dentro do
   resolvedor, depois de atravessar o protocolo MCP. */
const identificadorComposicao = z.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/);
const detalheProcedural = z.enum(['resumo', 'completo']).default('resumo');
const limiteProcedural = z.number().int().positive().max(64).default(8);
const objetoJSON = z.record(z.string(), z.unknown());
const usoOperacaoCompacto = z.object({
  intencao: z.string().min(1), schema: z.string().min(1).nullable(),
  obrigatorios: z.array(z.string()),
}).strict();
const schemaArgumentosOperacao = z.object({
  $schema: z.string().min(1), $id: z.string().min(1), type: z.literal('object'),
  additionalProperties: z.boolean(), required: z.array(z.string()),
  properties: z.record(z.string(), z.unknown()),
}).passthrough();
const exemploOperacao = z.object({
  formato: z.literal('mecanifica.exemplo-operacao@1'),
  PASSOS: z.array(z.tuple([z.string(), objetoJSON])), PARAMS: objetoJSON,
  TOPO: objetoJSON, MATERIAIS: objetoJSON, ESQUELETO: z.unknown().nullable(),
  ALIASES: z.array(z.unknown()),
}).strict();
const usoOperacaoCompleto = z.object({
  formato: z.literal('mecanifica.uso-operacao@1'), intencao: z.string().min(1),
  schemaArgumentos: schemaArgumentosOperacao, exemplo: exemploOperacao,
  precondicoes: z.array(z.string()), limites: z.array(z.string()),
  diagnosticos: z.array(z.object({ quando: z.string(), acao: z.string() }).strict()),
}).strict();

export const buscarCapacidadesEntrada = z.object({
  texto: z.string().min(1).max(240).optional(), consome: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  produz: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(), efeito: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  identidade: z.string().min(1).max(240).optional(), limite: limiteProcedural,
  cursor: z.string().min(1).max(240).optional(), detalhe: detalheProcedural,
}).strict();
export const descreverCapacidadeEntrada = z.object({ identificador: identificadorProcedural }).strict();
export const combinarCapacidadesEntrada = z.object({
  artefatos: artefatosProcedurais, interfaces: interfacesProcedurais.optional(), requisitos: z.array(z.string().min(1)).optional(),
  maxCusto: z.number().finite().nonnegative().optional(), maxCadeias: z.number().int().positive().max(32).optional(),
  pesos: z.record(z.string().min(1), z.number().finite().nonnegative()).optional(), limite: limiteProcedural, detalhe: detalheProcedural,
}).strict();
export const validarComposicaoEntrada = z.object({
  composicoes: z.array(z.json()).min(1).max(64), id: identificadorComposicao,
  parametros: z.record(z.string().min(1), z.json()).optional(),
  orcamento: z.object({ maxPassos: z.number().int().positive().max(8192).optional(), maxProfundidade: z.number().int().positive().max(128).optional() }).strict().optional(),
}).strict();
export const analisarLacunaEntrada = z.object({
  id: identificadorProcedural, objetivo: z.string().min(1).max(500), artefatos: artefatosProcedurais,
  interfaces: interfacesProcedurais.optional(), requisitos: z.array(z.string().min(1)).optional(), candidatas: z.array(identificadorProcedural).optional(),
  requisitoAusente: z.object({ tipo: z.enum(['artefato', 'interface', 'representacao']), id: identificadorProcedural }).strict().nullable().optional(),
  contorno: z.object({ descricao: z.string().min(1).max(500), custo: z.number().finite().nonnegative() }).strict().nullable().optional(),
  recorrencia: z.number().int().nonnegative().optional(), classificacao: z.enum(['composicao', 'operacao-nativa', 'representacao']).nullable().optional(),
  limite: limiteProcedural, detalhe: detalheProcedural,
}).strict();
export const diagnosticarExtensaoEntrada = z.object({ capacidade: identificadorProcedural }).strict();

const operacaoProcedural = z.object({
  id: z.string(), nome: z.string(), versao: z.string(), categoria: z.string(),
  artefatos: artefatosProcedurais, interfaces: interfacesProcedurais,
  requisitos: z.array(z.string()), custo: z.number().finite().nonnegative(),
  efeitos: z.array(z.string()), identidade: z.string(),
  uso: z.union([usoOperacaoCompacto, usoOperacaoCompleto, z.null()]).optional(),
}).passthrough();
const operacaoProceduralResumo = operacaoProcedural.pick({
  id: true, nome: true, versao: true, categoria: true, artefatos: true,
  interfaces: true, requisitos: true, custo: true, efeitos: true, identidade: true, uso: true,
});
const consultaBusca = z.object({
  texto: z.string().nullable(), consome: z.array(z.string()).nullable(), produz: z.array(z.string()).nullable(),
  efeito: z.array(z.string()).nullable(), identidade: z.string().nullable(),
  limite: z.number().int().positive().nullable(), cursor: z.string().nullable(),
}).passthrough();
const controleProgressivo = z.object({
  limite: z.number().int().positive(), retornadas: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(), truncado: z.boolean(), detalhe: z.enum(['resumo', 'completo']),
}).strict();
const buscaProcedural = z.object({
  formato: z.literal('mecanifica.busca-capacidades@1'), consulta: consultaBusca,
  total: z.number().int().nonnegative(), retornadas: z.number().int().nonnegative().optional(),
  omitidas: z.number().int().nonnegative().optional(), truncado: z.boolean().optional(), proximoCursor: z.string().nullable().optional(),
  operacoes: z.array(operacaoProceduralResumo),
  controle: controleProgressivo,
}).passthrough();
const explicacaoProcedural = z.object({
  formato: z.literal('mecanifica.explicacao-capacidade@1'), encontrada: z.boolean(),
  operacao: operacaoProcedural.optional(), identificador: z.string().optional(),
  diagnostico: z.string().optional(), candidatas: z.array(z.object({ id: z.string(), nome: z.string() }).strict()).optional(),
}).passthrough();
const cadeiaProcedural = z.object({
  operacoes: z.array(z.object({ id: z.string(), nome: z.string() }).strict()), custo: z.number().finite(),
  artefatos: artefatosProcedurais, interfaces: interfacesProcedurais,
}).strict();
const descarteProcedural = z.object({
  operacao: z.object({ id: z.string(), nome: z.string() }).strict(), motivo: z.string(),
}).strict();
const planoProcedural = z.object({
  formato: z.literal('mecanifica.plano-capacidades@1'),
  objetivo: z.object({ artefatos: artefatosProcedurais, interfaces: interfacesProcedurais, requisitos: z.array(z.string()) }).strict(),
  cadeias: z.array(cadeiaProcedural), descartes: z.array(descarteProcedural),
  limites: z.object({ maxCusto: z.number().finite(), maxCadeias: z.number().int().nonnegative() }).strict(),
  diagnostico: z.string(), controle: controleProgressivo,
}).passthrough();
const validacaoProcedural = z.object({
  formato: z.literal('mecanifica.validacao-composicao@1'), valida: z.boolean(), composicao: z.string(),
  artefatos: artefatosProcedurais, passos: z.array(z.tuple([z.string(), objetoJSON])), procedencia: z.object({
    formato: z.literal('mecanifica.procedencia-composicao@1'),
    nos: z.array(z.object({ passo: z.number().int().nonnegative(), caminho: z.string(), composicao: z.string(), no: z.string(), operacao: z.string() }).strict()),
  }).strict(),
}).strict();
const lacunaPublica = z.object({
  formato: z.literal('mecanifica.lacuna-capacidade@1'), id: z.string(), objetivo: z.string(),
  artefatos: artefatosProcedurais, interfaces: interfacesProcedurais, requisitos: z.array(z.string()),
  candidatas: z.array(z.string()), requisitoAusente: z.object({ tipo: z.enum(['artefato', 'interface', 'representacao']), id: z.string() }).strict().nullable(),
  contorno: z.object({ descricao: z.string(), custo: z.number().finite().nonnegative() }).strict().nullable(),
  recorrencia: z.number().int().nonnegative(), classificacao: z.enum(['composicao', 'operacao-nativa', 'representacao']).nullable(),
}).strict();
const classificacaoLacuna = z.object({
  formato: z.literal('mecanifica.classificacao-lacuna@1'), lacuna: z.string(),
  classificacao: z.enum(['composicao', 'operacao-nativa', 'representacao']), fundamento: z.string(), plano: planoProcedural,
}).strict();
const lacunaProcedural = z.object({ lacuna: lacunaPublica, classificacao: classificacaoLacuna }).strict();
const extensaoProcedural = z.object({
  formato: z.literal('mecanifica.diagnostico-extensao@1'), capacidade: z.string(), estado: z.enum(['ausente', 'disponivel']),
  acao: z.string(), codigo: z.string().optional(), executavel: z.boolean().optional(),
  proximoPasso: z.object({ ferramenta: z.string(), motivo: z.string() }).strict().optional(),
}).passthrough();
const saidaProcedural = (resultado) => z.object({ ...respostaBase, resultado: resultado.optional() }).strict();
export const buscarCapacidadesSaida = saidaProcedural(buscaProcedural);
export const descreverCapacidadeSaida = saidaProcedural(explicacaoProcedural);
export const combinarCapacidadesSaida = saidaProcedural(planoProcedural);
export const validarComposicaoSaida = saidaProcedural(validacaoProcedural);
export const analisarLacunaSaida = saidaProcedural(lacunaProcedural);
export const diagnosticarExtensaoSaida = saidaProcedural(extensaoProcedural);

export const descreverSaida = z.object({
  ...respostaBase,
  resultado: z.object({
    peca: z.string(),
    descricao: descricaoPublica,
  }).optional(),
}).strict();

export const validarSaida = z.object({
  ...respostaBase,
  resultado: z.object({
    id: slug,
    modo: z.string(),
    peca: z.string(),
    partes: z.array(z.string()),
    bytes: z.number().int(),
    alvo: z.object({
      peca: z.string(),
      partes: z.array(z.string()),
      totais: totais,
    }).nullable(),
  }).optional(),
}).strict();

export const compararSaida = z.object({
  ...respostaBase,
  resultado: z.object({
    id: slug,
    anterior: revisao,
    posterior: revisao,
    comparacao: comparacaoPublica,
  }).optional(),
}).strict();

const enquadramentoPublico = z.object({
  valida: z.boolean(),
  area: z.number(),
  largura: z.number(),
  altura: z.number(),
  cortado: z.boolean(),
}).strict();

export const renderizarSaida = z.object({
  ...respostaBase,
  resultado: z.object({
    formato: z.literal('mecanifica.vistas-oficiais'),
    versao: z.literal(1),
    peca: z.string(),
    duracaoMs: z.number().int().nonnegative(),
    bytes: z.number().int().nonnegative(),
    vistas: z.array(z.object({
      nome: z.enum(['isometrica', 'frontal', 'direita', 'superior']),
      mimeType: z.literal('image/png'),
      largura: z.number().int().positive(),
      altura: z.number().int().positive(),
      bytes: z.number().int().nonnegative(),
      sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      enquadramento: enquadramentoPublico,
    }).strict()).length(4),
  }).optional(),
}).strict();

const contextoMontagem = z.object({
  formato: z.literal('mecanifica.contexto-montagem'),
  versao: z.literal(1),
  raiz: z.object({ id: z.string() }).strict(),
  totais: z.object({
    pecas: z.number().int().nonnegative(),
    montagens: z.number().int().nonnegative(),
    relacoesDeclaradas: z.number().int().nonnegative(),
    satisfeitas: z.number().int().nonnegative(),
    reprovadas: z.number().int().nonnegative(),
  }).strict(),
  instancias: z.array(z.json()),
  relacoes: z.array(z.json()),
  cobertura: z.object({
    relacoesLocaisExecutadas: z.boolean(),
    colisaoGlobalVerificada: z.boolean(),
    dependenciasIndiretasVerificadas: z.boolean(),
    limitacoes: z.array(z.string()),
  }).strict(),
  consulta: z.object({
    caminho: caminhoMontagem,
    profundidade: z.number().int().nonnegative().nullable(),
    incluirRelacionados: z.boolean(),
    instanciasOmitidas: z.number().int().nonnegative(),
    relacoesOmitidas: z.number().int().nonnegative(),
    incluidasPorRelacao: z.array(caminhoMontagem),
  }).strict().optional(),
}).strict();

export const descreverMontagemSaida = z.object({
  ...respostaBase,
  resultado: z.object({ id: idMontagem, contexto: contextoMontagem }).strict().optional(),
}).strict();

const roteiroRevalidacao = z.object({
  formato: z.literal('mecanifica.roteiro-revalidacao'),
  versao: z.literal(1),
  alvo: z.union([
    z.object({ caminho: caminhoMontagem }).strict(),
    z.object({ tipo: z.enum(['peca', 'montagem']), ref: slug }).strict(),
  ]),
  consumidoresDefinicao: z.array(z.object({
    caminho: caminhoMontagem,
    id: nomeParte,
    alvo: z.object({ tipo: z.enum(['peca', 'montagem']), ref: slug }).strict(),
  }).strict()).optional(),
  caminhosIniciais: z.array(caminhoMontagem).optional(),
  montagensARevalidar: z.array(z.object({ caminho: caminhoMontagem }).strict()),
  itens: z.array(z.json()),
  pendencias: z.array(z.object({ codigo: z.string(), executavel: z.literal(false), acao: z.string() }).strict()),
  limitacoes: z.array(z.string()),
}).strict();

export const revalidarMontagemSaida = z.object({
  ...respostaBase,
  resultado: z.object({ id: idMontagem, roteiro: roteiroRevalidacao }).strict().optional(),
}).strict();

const catalogoMontagens = z.object({
  formato: z.literal('mecanifica.catalogo-montagens'),
  versao: z.literal(1),
  raizes: z.array(z.object({ id: z.string() }).strict()),
  usos: z.array(z.json()),
  relacoes: z.array(z.json()),
  limitacoes: z.array(z.string()),
}).strict();

export const catalogarMontagensSaida = z.object({
  ...respostaBase,
  resultado: z.object({ ids: z.array(idMontagem), catalogo: catalogoMontagens }).strict().optional(),
}).strict();

export const renderizarMontagemSaida = z.object({
  ...respostaBase,
  resultado: z.object({
    formato: z.literal('mecanifica.vistas-montagem'),
    versao: z.literal(1),
    id: idMontagem,
    caminho: caminhoMontagem,
    duracaoMs: z.number().int().nonnegative(),
    bytes: z.number().int().nonnegative(),
    vistas: z.array(z.object({
      nome: vistaMontagem,
      mimeType: z.literal('image/png'),
      largura: z.number().int().positive(),
      altura: z.number().int().positive(),
      bytes: z.number().int().nonnegative(),
      sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      instancias: z.array(caminhoMontagem),
      enquadramento: enquadramentoPublico,
    }).strict()).min(1).max(4),
  }).strict().optional(),
}).strict();

const verificacaoMontagem = z.object({
  id: z.string(),
  tipo: z.string(),
  estado: z.enum(['passou', 'falhou']),
  referencia: z.json(),
  movel: z.json(),
  medidas: z.json().optional(),
  diagnosticos: z.array(z.json()),
}).strict();

const coberturaRevisaoMontagem = z.object({
  verificadas: z.array(z.string()),
  naoVerificadas: z.array(z.object({ codigo: z.string(), mensagem: z.string() }).strict()),
}).strict();

const visualRevisaoMontagem = z.object({
  estado: z.enum(['produzida', 'indisponivel']),
  instrucao: z.string(),
  vistas: z.array(z.json()),
}).strict();

export const revisarMontagemSaida = z.object({
  ...respostaBase,
  resultado: z.object({
    formato: z.literal('mecanifica.revisao-montagem'),
    versao: z.literal(1),
    id: idMontagem,
    caminho: caminhoMontagem,
    estado: z.enum(['sem-falhas-declaradas', 'reprovada', 'incompleta']),
    contexto: z.json(),
    verificacoes: z.array(verificacaoMontagem),
    auditoriaIntersecoes: z.json(),
    cobertura: coberturaRevisaoMontagem,
    visual: visualRevisaoMontagem,
    recomendacoes: z.array(z.string()),
  }).strict().optional(),
}).strict();

const impactoGlobal = z.object({
  formato: z.literal('mecanifica.impacto-global'),
  versao: z.literal(1),
  alvo: alvoImpactoGlobal,
  dependentesDiretos: z.array(alvoImpactoGlobal),
  dependentesTransitivos: z.array(alvoImpactoGlobal.extend({ distancia: z.number().int().positive() }).strict()),
  raizesAfetadas: z.array(slug),
  raizesNaoAfetadas: z.array(slug),
  caminhos: z.array(caminhoImpactoGlobal),
  relacoes: z.array(z.json()),
  roteiroRevalidacao: z.array(z.object({
    ordem: z.number().int().positive(),
    tipo: z.literal('montagem'),
    id: slug,
    motivo: z.enum(['alvo', 'dependente-direto', 'dependente-transitivo']),
    proveniencia: provenienciaImpactoGlobal,
    caminhos: z.array(caminhoImpactoGlobal),
  }).strict()),
  cobertura: z.object({
    completa: z.literal(true),
    universo: slug.nullable(),
    entidadesConsideradas: z.number().int().nonnegative(),
    entidadesAfetadas: z.number().int().nonnegative(),
  }).strict(),
  limitacoes: z.array(z.string()),
}).strict();

export const consultarImpactoGlobalSaida = z.object({
  ...respostaBase,
  resultado: z.object({ impacto: impactoGlobal }).strict().optional(),
}).strict();

export function respostaOk(codigo, resultado) {
  return { ok: true, codigo, resultado };
}

export function respostaErro(codigo, erroDetalhe) {
  return { ok: false, codigo, erro: erroDetalhe };
}

export function erroAcionavel(codigo, mensagem, acao) {
  return { codigo, mensagem, acao };
}
