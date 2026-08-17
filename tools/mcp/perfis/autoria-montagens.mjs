/* autoria-montagens.mjs — porta MCP opt-in, fina sobre a autoria interna. */
import { z } from 'zod';
import { capturarMontagem } from '../../mecanifica/capturar-montagem.mjs';
import {
  ARQUIVO_MONTAGEM, confirmarAutoriaMontagem, observarAutoriaMontagem, planejarAutoriaMontagem,
  prepararPromocaoAutoriaMontagem, promoverAutoriaMontagem,
} from '../../mecanifica/autoria-montagem.mjs';
import { alterarMontagem, diferencaMontagem } from '../../../src/autoria/alterar-montagem.js';
import { lerCadeiaAutoria } from '../../mecanifica/repositorio-autoria.mjs';

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

/* Alteração compacta: o agente declara o que muda, e o documento completo é
   reconstituído AQUI, a partir da revisão ativa. Tudo que não foi declarado
   permanece idêntico por construção — o agente não reenvia, logo não pode
   alterar por acidente. A saída é o mesmo plano de `planejar_autoria_montagem`,
   mais o diff, porque daqui para a frente o caminho é o mesmo: inspecionar,
   conferir os gates e só então aplicar. */
export async function planejarAlteracao(input, { autoria }) {
  try {
    const args = z.object({ id: slug, revisaoObservada: hash.nullable(), alteracoes: z.array(z.json()).min(1) }).strict().parse(input);
    autorizado(autoria, args.id);
    const ativa = await observarAutoriaMontagem({ raiz: autoria.raizRepositorio, entidade: args.id });
    if (ativa.revisao !== args.revisaoObservada) throw Object.assign(new Error('Revisão observada divergente.'), { codigo: 'revisao-desatualizada', acao: 'Leia a revisão ativa e planeje novamente.' });
    if (!ativa.montagem) throw Object.assign(new Error('Sem documento ativo.'), { codigo: 'montagem-nao-encontrada', acao: 'Publique uma primeira revisão antes de alterar por campo.' });
    const { montagem, diff } = alterarMontagem(ativa.montagem, args.alteracoes);
    const interno = planejarAutoriaMontagem({ entidade: args.id, montagem, pai: args.revisaoObservada });
    if (interno.montagem.id !== args.id) throw Object.assign(new Error('ID interno divergente.'), { codigo: 'identidade-divergente', acao: 'Não altere o id da raiz para um valor diferente do anunciado.' });
    return resposta(true, { id: args.id, diff, plano: publicoPlano(interno), confirmacao: confirmarAutoriaMontagem(interno).confirmacao });
  } catch (erro) { return erro?.name === 'ZodError' ? entrada() : falha(erro); }
}

/* O documento vive como BYTES sob o nome do arquivo, e não como objeto: é o
   mesmo caminho que a leitura da revisão ativa percorre, e desserializar aqui
   de outro jeito faria a comparação enxergar um envelope onde o resto do
   sistema enxerga a montagem. */
function documentoDaRevisao(elo, papel) {
  const bytes = elo?.conteudo?.[ARQUIVO_MONTAGEM];
  if (typeof bytes !== 'string') {
    throw Object.assign(new Error('Snapshot inválido.'), { codigo: 'snapshot-invalido', acao: `A revisão citada em ${papel} não contém ${ARQUIVO_MONTAGEM}.` });
  }
  return JSON.parse(bytes);
}

/* HISTÓRICO. A cadeia já era percorrida a cada leitura da revisão ativa, e
   descartada; aqui ela é devolvida. Sem isto o agente publica e não consegue
   olhar para trás — o conteúdo antigo fica guardado do lado, e inalcançável. */
export async function historicoAutoria(input, { autoria }) {
  try {
    const { id } = z.object({ id: slug }).strict().parse(input); autorizado(autoria, id);
    const cadeia = await lerCadeiaAutoria(autoria.raizRepositorio, id);
    const revisoes = cadeia.map((elo, k) => ({
      revisao: elo.commit, pai: elo.pai, ordem: k, ativa: k === cadeia.length - 1,
    }));
    return resposta(true, { id, total: revisoes.length, revisoes });
  } catch (erro) { return erro?.name === 'ZodError' ? entrada() : falha(erro); }
}

/* COMPARAR. A diferença sai no MESMO vocabulário da alteração compacta, então
   o agente que leu a diferença já sabe escrever a alteração que a desfaz.
   `estruturais` sai separado de propósito: instância acrescentada ou removida
   NÃO é expressável como alteração, e juntar as duas listas faria o agente
   acreditar que qualquer diferença pode ser desfeita por um campo. */
export async function compararRevisoes(input, { autoria }) {
  try {
    const args = z.object({ id: slug, anterior: hash, posterior: hash }).strict().parse(input);
    autorizado(autoria, args.id);
    const cadeia = await lerCadeiaAutoria(autoria.raizRepositorio, args.id);
    const acha = (rev, papel) => {
      const elo = cadeia.find((item) => item.commit === rev);
      if (!elo) throw Object.assign(new Error('Revisão desconhecida.'), { codigo: 'revisao-nao-encontrada', acao: `A revisão citada em ${papel} não está na cadeia desta montagem; leia o histórico e use uma revisão anunciada.` });
      return elo;
    };
    const a = acha(args.anterior, 'anterior');
    const b = acha(args.posterior, 'posterior');
    const { alteracoes, estruturais } = diferencaMontagem(documentoDaRevisao(a, 'anterior'), documentoDaRevisao(b, 'posterior'));
    return resposta(true, { id: args.id, anterior: args.anterior, posterior: args.posterior, alteracoes, estruturais });
  } catch (erro) { return erro?.name === 'ZodError' ? entrada() : falha(erro); }
}

/* RESTAURAR. Ela NÃO move o estado ativo: devolve um plano, e o plano segue
   pelos mesmos gates de sempre — inspecionar, conferir, aplicar. Voltar a uma
   revisão antiga é publicar uma revisão NOVA com aquele conteúdo, e não
   reescrever a história; a cadeia continua sendo a verdade do que aconteceu. */
export async function planejarRestauracao(input, { autoria }) {
  try {
    const args = z.object({ id: slug, revisaoObservada: hash.nullable(), revisao: hash }).strict().parse(input);
    autorizado(autoria, args.id);
    const cadeia = await lerCadeiaAutoria(autoria.raizRepositorio, args.id);
    const ativa = cadeia.length ? cadeia[cadeia.length - 1] : null;
    if ((ativa?.commit ?? null) !== args.revisaoObservada) throw Object.assign(new Error('Revisão observada divergente.'), { codigo: 'revisao-desatualizada', acao: 'Leia a revisão ativa e planeje novamente.' });
    const alvo = cadeia.find((item) => item.commit === args.revisao);
    if (!alvo) throw Object.assign(new Error('Revisão desconhecida.'), { codigo: 'revisao-nao-encontrada', acao: 'Leia o histórico e use uma revisão anunciada.' });
    if (alvo.commit === ativa?.commit) throw Object.assign(new Error('Restauração sem efeito.'), { codigo: 'restauracao-sem-efeito', acao: 'A revisão pedida já é a ativa; restaurar publicaria uma revisão que não muda nada.' });
    const montagem = documentoDaRevisao(alvo, 'revisao');
    const { alteracoes, estruturais } = diferencaMontagem(documentoDaRevisao(ativa, 'ativa'), montagem);
    const interno = planejarAutoriaMontagem({ entidade: args.id, montagem, pai: args.revisaoObservada });
    return resposta(true, { id: args.id, restaurando: args.revisao, alteracoes, estruturais, plano: publicoPlano(interno), confirmacao: confirmarAutoriaMontagem(interno).confirmacao });
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
    ['historico_autoria_montagem', 'Lista as revisões da montagem, da primeira à ativa.', historicoAutoria, z.object({ id: slug }).strict()],
    ['comparar_revisoes_montagem', 'Compara duas revisões no vocabulário da alteração compacta.', compararRevisoes, z.object({ id: slug, anterior: hash, posterior: hash }).strict()],
    ['planejar_restauracao_montagem', 'Planeja publicar o conteúdo de uma revisão anterior como revisão nova.', planejarRestauracao, z.object({ id: slug, revisaoObservada: hash.nullable(), revisao: hash }).strict()],
    ['planejar_alteracao_montagem', 'Planeja mudança por alvo e campo semântico, sem reenviar o documento inteiro.', planejarAlteracao, z.object({ id: slug, revisaoObservada: hash.nullable(), alteracoes: z.array(z.json()).min(1) }).strict()],
    ['inspecionar_proposta_montagem', 'Deriva impacto, revalidação e vistas da proposta sem escrita.', inspecionarAutoria, z.object({ plano, confirmacao: confirmar, alvo: caminho }).strict()],
    ['aplicar_autoria_montagem', 'Aplica somente proposta confirmada que passou pelos gates.', aplicarAutoria, z.object({ plano, confirmacao: confirmar, alvo: caminho }).strict()],
  ].map(([nome, descricao, executar, inputSchema]) => ({ nome, descricao, inputSchema, outputSchema: saida, executar: (entrada) => executar(entrada, { autoria }), anotacoes: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } })));
}
