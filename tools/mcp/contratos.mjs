/* contratos.mjs — schemas e respostas públicas do perfil MCP somente leitura. */
import { z } from 'zod';
export const VERSAO_CONTRATO_MCP = 'mecanifica.mcp.revisao.v5';
export const PERFIL = 'revisao';
export const TRANSPORTE = 'stdio';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nomeParte = z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/);
const peca = slug;
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
const vistaMontagem = z.enum(['isometrica', 'frontal', 'direita', 'superior']);

export const descreverMontagemEntrada = z.object({
  id: idMontagem,
  caminho: caminhoMontagem.optional(),
  profundidade: z.number().int().min(0).max(32).optional(),
  incluirRelacionados: z.boolean().optional(),
}).strict();

export const revalidarMontagemEntrada = z.object({
  id: idMontagem,
  alvo: caminhoMontagem.min(1),
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
  alvo: z.object({ caminho: caminhoMontagem }).strict(),
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
