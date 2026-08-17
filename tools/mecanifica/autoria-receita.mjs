/* autoria-receita.mjs — autoria declarativa de receitas, sem avaliar JavaScript. */
import { nucleo, neutroCanonico } from '../../prototipos/procedural/v3/motor/oficina.js';
import { FORMATO, VERSAO, lerPecaResolvida, parteDaFace } from '../../src/autoria/ler-peca-resolvida.js';
import { capturarMontagem } from './capturar-montagem.mjs';
import { lerRevisaoAtivaAutoria, materializarRevisaoAutoria, planejarRevisaoAutoria } from './repositorio-autoria.mjs';

export const FORMATO_RECEITA_DECLARATIVA = 'mecanifica.receita-declarativa';
export const VERSAO_RECEITA_DECLARATIVA = 1;
export const FORMATO_PLANO_AUTORIA_RECEITA = 'mecanifica.plano-autoria-receita';
const ARQUIVO_RECEITA = 'receita.json';
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ErroAutoriaReceita extends Error {
  constructor(codigo, campo, mensagem, acao, causa) {
    super(`${campo}: ${mensagem}`); this.name = 'ErroAutoriaReceita'; this.codigo = codigo;
    this.campo = campo; this.acao = acao; if (causa !== undefined) this.causa = causa;
  }
}
function falhar(codigo, campo, mensagem, acao, causa) { throw new ErroAutoriaReceita(codigo, campo, mensagem, acao, causa); }
function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') return `{${Object.keys(valor).sort().map((k) => `${JSON.stringify(k)}:${canonico(valor[k])}`).join(',')}}`;
  return JSON.stringify(valor);
}
function jsonPuro(valor, caminho = '$') {
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean'
    || (typeof valor === 'number' && Number.isFinite(valor))) return;
  if (Array.isArray(valor)) { valor.forEach((item, i) => jsonPuro(item, `${caminho}[${i}]`)); return; }
  if (typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    for (const [chave, item] of Object.entries(valor)) jsonPuro(item, `${caminho}.${chave}`); return;
  }
  falhar('valor-nao-declarativo', caminho, 'a receita aceita somente valores JSON finitos.', 'Remova funções, código, classes, imports e valores especiais.');
}
function validarReceita(receita) {
  jsonPuro(receita);
  const bytes = Buffer.byteLength(JSON.stringify(receita), 'utf8');
  if (bytes > 512 * 1024 || receita?.passos?.length > 2048 || receita?.aliases?.length > 2048) {
    falhar('limite-excedido', '$receita', 'a proposta excede 512 KiB ou 2.048 passos/aliases.', 'Divida a peça ou reduza a proposta antes de executar.');
  }
  const chaves = Object.keys(receita ?? {}).sort().join(',');
  if (chaves !== 'aliases,formato,id,materiais,meta,params,passos,topo,versao'
    || receita.formato !== FORMATO_RECEITA_DECLARATIVA || receita.versao !== VERSAO_RECEITA_DECLARATIVA
    || typeof receita.id !== 'string' || !slug.test(receita.id)
    || !Array.isArray(receita.passos) || !Array.isArray(receita.aliases)
    || !receita.params || !receita.topo || !receita.materiais || !receita.meta) {
    falhar('receita-invalida', '$receita', 'o documento não respeita o contrato declarativo v1.', 'Informe formato, versão, id, params, topo, passos, materiais, aliases e meta.');
  }
  if (receita.meta.nome !== receita.id) falhar('identidade-divergente', '$receita.meta.nome', 'precisa ser igual ao id da receita.', 'Use a mesma identidade semântica no documento.');
  return JSON.parse(JSON.stringify(receita));
}

export function executarReceitaDeclarativa(receita) {
  const validada = validarReceita(receita);
  let bruto;
  try { bruto = nucleo(validada.passos, validada.params, validada.topo, validada.materiais, null, validada.aliases); }
  catch (erro) { falhar('execucao-recusada', '$receita.passos', erro instanceof Error ? erro.message : String(erro), 'Corrija os passos e execute novamente.', erro); }
  if (bruto.orfaos.length) falhar('execucao-recusada', '$receita.passos', `o núcleo produziu ${bruto.orfaos.length} órfão(s).`, 'Corrija operações, seleções, interfaces e identidades antes de confirmar.');
  const neutro = neutroCanonico(bruto);
  if (neutro.V.length > 500_000 || neutro.F.length > 500_000) falhar('limite-excedido', '$receita.passos', 'a geometria excede 500.000 vértices ou faces.', 'Reduza a topologia antes de publicar.');
  const semParte = neutro.F.filter((face) => !parteDaFace(face));
  if (semParte.length) falhar('identidade-ausente', '$receita.passos', `${semParte.length} face(s) não possuem parte semântica.`, 'Nomeie todas as faces com operações parte antes de publicar.');
  const peca = {
    formato: FORMATO, versao: VERSAO, peca: validada.id, receita: validada.id,
    meta: JSON.parse(JSON.stringify(validada.meta)), materiais: validada.materiais,
    partes: [...new Set(neutro.F.map(parteDaFace))].sort(),
    portas: [...bruto.portas.values()].map((porta) => JSON.parse(JSON.stringify(porta))),
    V: neutro.V, F: neutro.F,
  };
  lerPecaResolvida(peca);
  return { receita: validada, peca, resumo: { vertices: peca.V.length, faces: peca.F.length, partes: peca.partes, portas: peca.portas.map((p) => p.id ?? p.nome).sort() } };
}

function entidadeDa(id) { return `receita-${id}`; }
function confirmacaoDo(plano) { return { formato: FORMATO_PLANO_AUTORIA_RECEITA, versao: 1, id: plano.id, pai: plano.pai, objeto: plano.repositorio.objeto, commit: plano.repositorio.commit }; }
export function planejarAutoriaReceita({ receita, pai = null } = {}) {
  const executada = executarReceitaDeclarativa(receita);
  const receitaBytes = `${canonico(executada.receita)}\n`;
  const repositorio = planejarRevisaoAutoria({ entidade: entidadeDa(receita.id), conteudo: { [ARQUIVO_RECEITA]: receitaBytes }, pai });
  return { formato: FORMATO_PLANO_AUTORIA_RECEITA, versao: 1, id: receita.id, pai, receita: executada.receita, receitaBytes, peca: executada.peca, resumo: executada.resumo, repositorio };
}
export function confirmarAutoriaReceita(plano, confirmacao = confirmacaoDo(plano)) {
  if (canonico(confirmacao) !== canonico(confirmacaoDo(plano))) falhar('confirmacao-divergente', '$confirmacao', 'a confirmação não corresponde aos bytes planejados.', 'Planeje novamente e confirme o plano intacto.');
  return { ...plano, confirmacao: confirmacaoDo(plano) };
}
export async function observarAutoriaReceita({ raiz, id } = {}) {
  if (typeof id !== 'string' || !slug.test(id)) falhar('identidade-invalida', '$id', 'id precisa ser slug canônico.', 'Use identidade semântica em minúsculas.');
  const ativa = await lerRevisaoAtivaAutoria(raiz, entidadeDa(id));
  if (!ativa) return { revisao: null, receita: null };
  const bytes = ativa.conteudo?.[ARQUIVO_RECEITA];
  try { return { revisao: ativa.commit, receita: validarReceita(JSON.parse(bytes)) }; }
  catch (erro) { falhar('snapshot-invalido', ARQUIVO_RECEITA, erro instanceof Error ? erro.message : String(erro), 'Preserve e audite o snapshot inválido.', erro); }
}
function montagemVisual(peca) {
  return { id: `inspecao-${peca.peca}`, instancias: [{ id: 'peca', caminho: ['peca'], alvo: { tipo: 'peca', ref: peca.peca }, poseMundo: { deslocamento: [0, 0, 0], rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] }, definicao: { neutro: lerPecaResolvida(peca) } }], relacoes: [] };
}
export async function inspecionarAutoriaReceita({ plano, confirmacao, capturar = capturarMontagem, revalidar } = {}) {
  const confirmado = confirmarAutoriaReceita(plano, confirmacao ?? plano?.confirmacao);
  const recomposto = planejarAutoriaReceita({ receita: confirmado.receita, pai: confirmado.pai });
  if (recomposto.repositorio.commit !== confirmado.repositorio.commit) falhar('plano-divergente', '$plano', 'o plano foi alterado após planejamento.', 'Planeje novamente.');
  const captura = await capturar({ montagem: montagemVisual(recomposto.peca), vistas: ['isometrica', 'direita'] });
  if (!captura?.ok || captura.resultado?.capturas?.length !== 2) falhar('inspecao-visual-falhou', '$captura', 'duas vistas reais são obrigatórias.', 'Corrija a captura antes de publicar.');
  const revalidacao = typeof revalidar === 'function' ? await revalidar(recomposto.id, recomposto.peca) : { cobertura: 'nenhuma', raizes: [] };
  const falhas = revalidacao.raizes?.filter((item) => item.estado !== 'aprovada') ?? [];
  if (falhas.length) falhar('revalidacao-recusada', '$revalidacao', `${falhas.length} montagem(ns) não passaram.`, 'Corrija a receita e repita a inspeção.');
  return { estado: 'aprovada', plano: recomposto, visual: captura.resultado.capturas.map(({ nome, enquadramento, instancias }) => ({ nome, enquadramento, instancias })), revalidacao };
}
export async function aplicarAutoriaReceita({ raiz, plano, confirmacao, capturar, revalidar } = {}) {
  const inspecao = await inspecionarAutoriaReceita({ plano, confirmacao, capturar, revalidar });
  const resultado = await materializarRevisaoAutoria({ raiz, plano: inspecao.plano.repositorio });
  return { estado: resultado.estado, revisao: resultado.commit, resumo: inspecao.plano.resumo, visual: inspecao.visual, revalidacao: inspecao.revalidacao };
}
