/* contratos.mjs — schemas e respostas públicas do perfil MCP somente leitura. */
import { z } from 'zod';
import { PECAS_DISPONIVEIS } from '../mecanifica/descrever-peca.mjs';

export const VERSAO_CONTRATO_MCP = 'mecanifica.mcp.revisao.v2';
export const PERFIL = 'revisao';
export const TRANSPORTE = 'stdio';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nomeParte = z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/);
const peca = z.enum(PECAS_DISPONIVEIS);
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

export function respostaOk(codigo, resultado) {
  return { ok: true, codigo, resultado };
}

export function respostaErro(codigo, erroDetalhe) {
  return { ok: false, codigo, erro: erroDetalhe };
}

export function erroAcionavel(codigo, mensagem, acao) {
  return { codigo, mensagem, acao };
}
