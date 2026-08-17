/* autoria-receitas.mjs — porta MCP fina para receitas declarativas. */
import { z } from 'zod';
import {
  aplicarAutoriaReceita, confirmarAutoriaReceita, inspecionarAutoriaReceita,
  observarAutoriaReceita, planejarAutoriaReceita,
} from '../../mecanifica/autoria-receita.mjs';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const receita = z.object({ formato: z.literal('mecanifica.receita-declarativa'), versao: z.literal(1), id: slug, params: z.json(), topo: z.json(), passos: z.json(), materiais: z.json(), aliases: z.json(), meta: z.json() }).strict();
const plano = z.object({ formato: z.literal('mecanifica.plano-autoria-receita'), versao: z.literal(1), id: slug, pai: hash.nullable(), receita, repositorio: z.object({ entidade: z.string(), pai: hash.nullable(), objeto: hash, commit: hash }).strict(), resumo: z.json() }).passthrough();
const confirmacao = z.object({ formato: z.literal('mecanifica.plano-autoria-receita'), versao: z.literal(1), id: slug, pai: hash.nullable(), objeto: hash, commit: hash }).strict();
const saida = z.object({ ok: z.boolean(), codigo: z.number().int(), resultado: z.json().optional(), erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional() }).strict();
const resposta = (resultado) => ({ ok: true, codigo: 0, resultado });
const falha = (erro) => ({ ok: false, codigo: 1, erro: { codigo: String(erro?.codigo ?? 'falha_interna').replaceAll('-', '_'), mensagem: 'A operação de autoria de receita foi recusada.', acao: erro?.acao ?? 'Revise a proposta declarativa.' } });
function autorizar(autoria, id) {
  if (!autoria?.configurado || !autoria.receitasAutorizadas?.has(id)) throw Object.assign(new Error('Receita não autorizada.'), { codigo: 'receita-nao-autorizada', acao: 'O host precisa autorizar explicitamente esse ID de receita.' });
}
function publico(item) { const { receitaBytes, peca, ...resto } = item; const { objetoBytes, commitBytes, ...repositorio } = item.repositorio; return { ...resto, repositorio }; }
function recompor(item, confirmada) {
  const novo = planejarAutoriaReceita({ receita: item.receita, pai: item.pai });
  if (novo.repositorio.commit !== item.repositorio.commit) throw Object.assign(new Error('Plano divergente.'), { codigo: 'plano-divergente', acao: 'Planeje novamente.' });
  return confirmarAutoriaReceita(novo, confirmada);
}

export async function observarReceita(input, { autoria }) {
  try { const { id } = z.object({ id: slug }).strict().parse(input); autorizar(autoria, id); return resposta({ id, ...(await observarAutoriaReceita({ raiz: autoria.raizRepositorio, id })) }); }
  catch (erro) { return falha(erro); }
}
export async function planejarReceita(input, { autoria }) {
  try {
    const args = z.object({ id: slug, revisaoObservada: hash.nullable(), receita }).strict().parse(input); autorizar(autoria, args.id);
    if (args.receita.id !== args.id) throw Object.assign(new Error('ID divergente.'), { codigo: 'identidade-divergente', acao: 'Use o mesmo ID no alvo e documento.' });
    const ativa = await observarAutoriaReceita({ raiz: autoria.raizRepositorio, id: args.id });
    if (ativa.revisao !== args.revisaoObservada) throw Object.assign(new Error('Revisão velha.'), { codigo: 'revisao-desatualizada', acao: 'Observe e planeje novamente.' });
    const interno = planejarAutoriaReceita({ receita: args.receita, pai: args.revisaoObservada });
    return resposta({ id: args.id, plano: publico(interno), confirmacao: confirmarAutoriaReceita(interno).confirmacao });
  } catch (erro) { return falha(erro); }
}
export async function inspecionarReceita(input, { autoria }) {
  try {
    const args = z.object({ plano, confirmacao }).strict().parse(input); autorizar(autoria, args.plano.id);
    const interno = recompor(args.plano, args.confirmacao);
    const resultado = await inspecionarAutoriaReceita({ plano: interno, revalidar: autoria.catalogo?.revalidarPeca?.bind(autoria.catalogo) });
    return resposta({ id: interno.id, estado: resultado.estado, visual: resultado.visual, revalidacao: resultado.revalidacao });
  } catch (erro) { return falha(erro); }
}
export async function aplicarReceita(input, { autoria }) {
  try {
    const args = z.object({ plano, confirmacao }).strict().parse(input); autorizar(autoria, args.plano.id);
    const interno = recompor(args.plano, args.confirmacao);
    const resultado = await aplicarAutoriaReceita({ raiz: autoria.raizRepositorio, plano: interno, revalidar: autoria.catalogo?.revalidarPeca?.bind(autoria.catalogo) });
    return resposta({ id: interno.id, ...resultado });
  } catch (erro) { return falha(erro); }
}

export function criarFerramentasAutoriaReceitas(autoria) {
  return Object.freeze([
    ['observar_autoria_receita', 'Lê revisão ativa de receita declarativa.', observarReceita, z.object({ id: slug }).strict()],
    ['planejar_autoria_receita', 'Planeja receita declarativa sem escrita.', planejarReceita, z.object({ id: slug, revisaoObservada: hash.nullable(), receita }).strict()],
    ['inspecionar_proposta_receita', 'Executa, revalida e captura a proposta.', inspecionarReceita, z.object({ plano, confirmacao }).strict()],
    ['aplicar_autoria_receita', 'Publica somente a receita confirmada e aprovada.', aplicarReceita, z.object({ plano, confirmacao }).strict()],
  ].map(([nome, descricao, executar, inputSchema]) => ({ nome, descricao, inputSchema, outputSchema: saida, executar: (entrada) => executar(entrada, { autoria }), anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } })));
}
