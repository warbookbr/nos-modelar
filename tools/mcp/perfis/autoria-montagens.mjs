/* autoria-montagens.mjs — porta MCP opt-in, fina sobre a autoria interna. */
import { z } from 'zod';
import { capturarMontagem } from '../../mecanifica/capturar-montagem.mjs';
import {
  confirmarAutoriaMontagem, observarAutoriaMontagem, planejarAutoriaMontagem,
  prepararPromocaoAutoriaMontagem, promoverAutoriaMontagem,
} from '../../mecanifica/autoria-montagem.mjs';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const caminho = z.array(z.string().min(1)).min(1).max(64);
const plano = z.object({
  formato: z.literal('mecanifica.plano-autoria-montagem'), versao: z.literal(1),
  entidade: slug, pai: hash.nullable(), montagem: z.json(), montagemBytes: z.string(),
  repositorio: z.object({ entidade: slug, pai: hash.nullable(), objeto: hash, commit: hash }).strict(),
  resumo: z.json(), confirmacao: z.json().optional(),
}).passthrough();
const confirmar = z.object({ formato: z.literal('mecanifica.plano-autoria-montagem'), versao: z.literal(1), entidade: slug, pai: hash.nullable(), objeto: hash, commit: hash }).strict();
const base = { ok: z.boolean(), codigo: z.number().int(), erro: z.object({ codigo: z.string(), mensagem: z.string(), acao: z.string() }).optional() };
const saida = z.object({ ...base, resultado: z.json().optional() }).strict();

function resposta(ok, resultado, erro) { return ok ? { ok: true, codigo: 0, resultado } : { ok: false, codigo: 1, erro }; }
function falha(erro) { return resposta(false, null, { codigo: String(erro?.codigo ?? 'falha_interna').replaceAll('-', '_'), mensagem: 'A operação de autoria foi recusada.', acao: erro?.acao ?? 'Revise a proposta e a configuração opt-in do host.' }); }
function entrada() { return resposta(false, null, { codigo: 'entrada_recusada', mensagem: 'A entrada não atende ao schema da ferramenta.', acao: 'Corrija os campos conforme tools/list.' }); }
function autorizado(autoria, id) {
  if (!autoria?.configurado || !autoria.catalogo?.tem(id)) throw Object.assign(new Error('Montagem não autorizada.'), { codigo: 'montagem-nao-encontrada', acao: 'Escolha um ID anunciado pelo catálogo configurado pelo host.' });
}
function publicoPlano(item) {
  const { objetoBytes, commitBytes, ...repositorio } = item.repositorio;
  return { ...item, repositorio };
}

export async function observarAutoria(input, { autoria }) {
  try {
    const { id } = z.object({ id: slug }).strict().parse(input); autorizado(autoria, id);
    const ativa = await observarAutoriaMontagem({ raiz: autoria.raizRepositorio, entidade: id });
    return resposta(true, { id, revisao: ativa.revisao, montagem: ativa.montagem });
  } catch (erro) { return erro?.name === 'ZodError' ? entrada() : falha(erro); }
}

export async function planejarAutoria(input, { autoria }) {
  try {
    const args = z.object({ id: slug, revisaoObservada: hash.nullable(), montagem: z.json() }).strict().parse(input); autorizado(autoria, args.id);
    const ativa = await observarAutoriaMontagem({ raiz: autoria.raizRepositorio, entidade: args.id });
    if (ativa.revisao !== args.revisaoObservada) throw Object.assign(new Error('Revisão observada divergente.'), { codigo: 'revisao-desatualizada', acao: 'Leia a revisão ativa e planeje novamente.' });
    const interno = planejarAutoriaMontagem({ entidade: args.id, montagem: args.montagem, pai: args.revisaoObservada });
    if (interno.montagem.id !== args.id) throw Object.assign(new Error('ID interno divergente.'), { codigo: 'identidade-divergente', acao: 'Use no documento o mesmo ID semântico anunciado.' });
    return resposta(true, { id: args.id, plano: publicoPlano(interno), confirmacao: confirmarAutoriaMontagem(interno).confirmacao });
  } catch (erro) { return erro?.name === 'ZodError' ? entrada() : falha(erro); }
}

export async function inspecionarAutoria(input, { autoria, capturar = capturarMontagem }) {
  try {
    const args = z.object({ plano, confirmacao: confirmar, alvo: caminho }).strict().parse(input); autorizado(autoria, args.plano.entidade);
    const interno = { ...args.plano, confirmacao: args.confirmacao };
    // Os bytes privados não precisam cruzar a porta: o plano é reconstituído da montagem pública e conferido pelos hashes.
    const recomposto = planejarAutoriaMontagem({ entidade: interno.entidade, montagem: interno.montagem, pai: interno.pai });
    if (recomposto.repositorio.commit !== interno.repositorio.commit) throw Object.assign(new Error('Plano divergente.'), { codigo: 'plano-divergente', acao: 'Planeje novamente e use o plano retornado.' });
    const promocao = await prepararPromocaoAutoriaMontagem({ plano: { ...recomposto, confirmacao: args.confirmacao }, alvo: { caminho: args.alvo }, carregadores: autoria.catalogo.carregadores(), capturarVistas: capturar });
    return resposta(true, { id: interno.entidade, promocao: { estado: promocao.estado, impacto: promocao.impacto, revalidacao: promocao.revalidacao, visual: promocao.visual, bloqueios: promocao.bloqueios } });
  } catch (erro) { return erro?.name === 'ZodError' ? entrada() : falha(erro); }
}

export async function aplicarAutoria(input, { autoria, capturar = capturarMontagem }) {
  try {
    const args = z.object({ plano, confirmacao: confirmar, alvo: caminho }).strict().parse(input); autorizado(autoria, args.plano.entidade);
    const recomposto = planejarAutoriaMontagem({ entidade: args.plano.entidade, montagem: args.plano.montagem, pai: args.plano.pai });
    if (recomposto.repositorio.commit !== args.plano.repositorio.commit) throw Object.assign(new Error('Plano divergente.'), { codigo: 'plano-divergente', acao: 'Planeje novamente e use o plano retornado.' });
    const resultado = await promoverAutoriaMontagem({ raiz: autoria.raizRepositorio, plano: { ...recomposto, confirmacao: args.confirmacao }, alvo: { caminho: args.alvo }, carregadores: autoria.catalogo.carregadores(), capturarVistas: capturar });
    return resposta(true, { id: args.plano.entidade, revisao: resultado.resultado.commit, promocao: resultado.estado });
  } catch (erro) { return erro?.name === 'ZodError' ? entrada() : falha(erro); }
}

export function criarFerramentasAutoria(autoria) {
  return Object.freeze([
    ['observar_autoria_montagem', 'Lê a revisão ativa de uma montagem autorizada.', observarAutoria, z.object({ id: slug }).strict()],
    ['planejar_autoria_montagem', 'Planeja uma mudança por ID semântico, sem escrita.', planejarAutoria, z.object({ id: slug, revisaoObservada: hash.nullable(), montagem: z.json() }).strict()],
    ['inspecionar_proposta_montagem', 'Deriva impacto, revalidação e vistas da proposta sem escrita.', inspecionarAutoria, z.object({ plano, confirmacao: confirmar, alvo: caminho }).strict()],
    ['aplicar_autoria_montagem', 'Aplica somente proposta confirmada que passou pelos gates.', aplicarAutoria, z.object({ plano, confirmacao: confirmar, alvo: caminho }).strict()],
  ].map(([nome, descricao, executar, inputSchema]) => ({ nome, descricao, inputSchema, outputSchema: saida, executar: (entrada) => executar(entrada, { autoria }), anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } })));
}
