/* revalidacao.mjs — porta MCP Agent-First sobre campanhas persistidas. */

import { z } from 'zod';
import {
  lerCampanhaRevalidacao,
  obsoletarItemRevalidacao,
  registrarResultadoRevalidacao,
} from '../../mecanifica/repositorio-revalidacao.mjs';

const slug = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const commit = z.string().regex(/^[a-f0-9]{64}$/);
const revisao = z.string().regex(/^[a-f0-9]{64}$/).nullable();
const alvo = z.object({ tipo: z.enum(['peca', 'montagem']), id: slug }).strict();
const identidade = z.object({
  causa: alvo.extend({ revisao, sha256 }).strict(),
  universo: slug.nullable(),
  mapaSha256: sha256,
}).strict();
const proveniencia = z.object({ fonte: z.enum(['base-estatica', 'revisao-ativa']), revisao, sha256 }).strict();
const resultadoEntrada = z.object({
  formato: z.literal('mecanifica.resultado-revalidacao'),
  versao: z.literal(1),
  item: alvo,
  revisaoValidada: proveniencia,
  estado: z.enum(['aprovado', 'reprovado']),
  gates: z.array(z.string()).max(64),
  diagnostico: z.json().nullable(),
}).strict();

const base = {
  ok: z.boolean(),
  codigo: z.number().int(),
  erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional(),
};
const itemPublico = z.object({
  chave: z.string(), ordem: z.number().int().positive(), alvo,
  revisaoObservada: proveniencia,
  estado: z.enum(['pendente', 'em-validacao', 'aprovado', 'reprovado', 'obsoleto']),
  versao: z.number().int().nonnegative(),
  ultimoResultado: z.object({ estado: z.enum(['aprovado', 'reprovado']), gates: z.array(z.string()), temDiagnostico: z.boolean() }).nullable(),
}).strict();
const resumo = z.object({
  formato: z.literal('mecanifica.resumo-campanha-revalidacao'), versao: z.literal(1),
  identidade, causa: alvo.extend({ revisao, sha256 }).strict(),
  alcance: z.object({ raizesAfetadas: z.array(slug), raizesNaoAfetadas: z.array(slug) }).nullable(),
  cobertura: z.json(),
  totais: z.object({ total: z.number().int(), pendentes: z.number().int(), emValidacao: z.number().int(), aprovados: z.number().int(), reprovados: z.number().int(), obsoletos: z.number().int() }).strict(),
  itens: z.array(itemPublico),
  resultados: z.number().int().nonnegative(),
}).strict();
const saidaResumo = z.object({ ...base, resultado: resumo.optional() }).strict();
const saidaItem = z.object({ ...base, resultado: z.object({ identidade, item: itemPublico }).strict().optional() }).strict();
const saidaEscrita = z.object({ ...base, resultado: z.object({ identidade, revisao: commit, objeto: commit, idempotente: z.boolean() }).strict().optional() }).strict();

function resposta(ok, resultado, erro = null) {
  return ok ? { ok: true, codigo: 0, resultado } : { ok: false, codigo: 1, erro };
}

function entradaRecusada() {
  return resposta(false, null, { codigo: 'entrada_recusada', mensagem: 'A entrada não atende ao contrato da campanha.', acao: 'Use somente a identidade e os IDs semânticos anunciados.' });
}

function falhaConhecida(erro) {
  const codigo = String(erro?.codigo ?? 'falha_interna').replaceAll('-', '_');
  const mensagens = {
    campanha_ausente: 'A campanha solicitada não foi encontrada.',
    item_ausente: 'O item não pertence à campanha.',
    revisao_desatualizada: 'A revisão observada não é mais atual.',
    conflito_concorrencia: 'O item mudou durante a operação.',
    resultado_conflitante: 'Já existe outro resultado para essa revisão.',
    campanha_corrompida: 'A campanha não passou na verificação de integridade.',
    revisao_nao_alterada: 'A revisão atual ainda não mudou.',
  };
  return resposta(false, null, {
    codigo,
    mensagem: mensagens[codigo] ?? 'A operação de revalidação foi recusada.',
    acao: 'Leia novamente a campanha e repita somente se o estado observado continuar válido.',
  });
}

function seguroResultado(resultado) {
  if (!resultado) return null;
  return {
    estado: resultado.estado,
    gates: [...(resultado.gates ?? [])],
    temDiagnostico: resultado.diagnostico !== null && resultado.diagnostico !== undefined,
  };
}

function itemSeguro(item) {
  return {
    chave: item.chave,
    ordem: item.ordem,
    alvo: item.alvo,
    revisaoObservada: item.revisaoObservada,
    estado: item.estado,
    versao: item.versao,
    ultimoResultado: seguroResultado(item.ultimoResultado),
  };
}

function resumoSeguro(campanha) {
  const itens = campanha.itens.map(itemSeguro);
  const estados = Object.fromEntries(['pendente', 'em-validacao', 'aprovado', 'reprovado', 'obsoleto'].map((estado) => [estado, 0]));
  for (const item of itens) estados[item.estado] += 1;
  return {
    formato: 'mecanifica.resumo-campanha-revalidacao', versao: 1,
    identidade: campanha.identidade,
    causa: campanha.causa,
    alcance: campanha.alcance ?? null,
    cobertura: campanha.cobertura,
    totais: {
      total: itens.length, pendentes: estados.pendente, emValidacao: estados['em-validacao'],
      aprovados: estados.aprovado, reprovados: estados.reprovado, obsoletos: estados.obsoleto,
    },
    itens,
    resultados: (campanha.historicoResultados ?? []).length,
  };
}

async function consultarCampanha(input, { raiz }) {
  try {
    const args = identidade.parse(input);
    const lida = await lerCampanhaRevalidacao(raiz, args);
    if (!lida) return falhaConhecida({ codigo: 'campanha-ausente' });
    return resposta(true, resumoSeguro(lida.campanha));
  } catch (erro) { return erro?.name === 'ZodError' ? entradaRecusada() : falhaConhecida(erro); }
}

async function consultarItem(input, { raiz }) {
  try {
    const args = z.object({ identidade, item: alvo }).strict().parse(input);
    const lida = await lerCampanhaRevalidacao(raiz, args.identidade);
    if (!lida) return falhaConhecida({ codigo: 'campanha-ausente' });
    const item = lida.campanha.itens.find((entrada) => entrada.chave === `${args.item.tipo}:${args.item.id}`);
    if (!item) return falhaConhecida({ codigo: 'item-ausente' });
    return resposta(true, { identidade: lida.campanha.identidade, item: itemSeguro(item) });
  } catch (erro) { return erro?.name === 'ZodError' ? entradaRecusada() : falhaConhecida(erro); }
}

async function registrarResultado(input, { raiz }) {
  try {
    const args = z.object({ identidade, resultado: resultadoEntrada, versaoEsperada: z.number().int().nonnegative(), pai: commit.nullable().optional() }).strict().parse(input);
    const respostaInterna = await registrarResultadoRevalidacao({ raiz, identidade: args.identidade, resultado: args.resultado, versaoEsperada: args.versaoEsperada, pai: args.pai ?? null });
    return resposta(true, { identidade: args.identidade, revisao: respostaInterna.persistida.revisao, objeto: respostaInterna.persistida.objeto, idempotente: respostaInterna.idempotente });
  } catch (erro) { return erro?.name === 'ZodError' ? entradaRecusada() : falhaConhecida(erro); }
}

async function obsoletarItem(input, { raiz }) {
  try {
    const args = z.object({ identidade, item: alvo, revisaoAtual: proveniencia, versaoEsperada: z.number().int().nonnegative(), pai: commit.nullable().optional() }).strict().parse(input);
    const respostaInterna = await obsoletarItemRevalidacao({ raiz, identidade: args.identidade, item: args.item, revisaoAtual: args.revisaoAtual, versaoEsperada: args.versaoEsperada, pai: args.pai ?? null });
    return resposta(true, { identidade: args.identidade, revisao: respostaInterna.persistida.revisao, objeto: respostaInterna.persistida.objeto, idempotente: respostaInterna.idempotente });
  } catch (erro) { return erro?.name === 'ZodError' ? entradaRecusada() : falhaConhecida(erro); }
}

export function criarFerramentasRevalidacao({ raizRepositorio, podeEscrever = false } = {}) {
  if (typeof raizRepositorio !== 'string' || !raizRepositorio) return Object.freeze([]);
  const leitura = [
    { nome: 'consultar_campanha_revalidacao', descricao: 'Consulta resumo compacto de campanha por identidade semântica, sem paths ou documentos internos.', inputSchema: identidade, outputSchema: saidaResumo, executar: (entrada) => consultarCampanha(entrada, { raiz: raizRepositorio }) },
    { nome: 'consultar_item_revalidacao', descricao: 'Consulta estado e revisão de um item semântico da campanha.', inputSchema: z.object({ identidade, item: alvo }).strict(), outputSchema: saidaItem, executar: (entrada) => consultarItem(entrada, { raiz: raizRepositorio }) },
  ];
  if (!podeEscrever) return Object.freeze(leitura);
  return Object.freeze([...leitura,
    { nome: 'registrar_resultado_revalidacao', descricao: 'Registra resultado aprovado ou reprovado com revisão e versão esperadas.', inputSchema: z.object({ identidade, resultado: resultadoEntrada, versaoEsperada: z.number().int().nonnegative(), pai: commit.nullable().optional() }).strict(), outputSchema: saidaEscrita, anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, executar: (entrada) => registrarResultado(entrada, { raiz: raizRepositorio }) },
    { nome: 'obsoletar_item_revalidacao', descricao: 'Marca item obsoleto depois de observar revisão diferente, com CAS.', inputSchema: z.object({ identidade, item: alvo, revisaoAtual: proveniencia, versaoEsperada: z.number().int().nonnegative(), pai: commit.nullable().optional() }).strict(), outputSchema: saidaEscrita, anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, executar: (entrada) => obsoletarItem(entrada, { raiz: raizRepositorio }) },
  ]);
}
