/* Transporte offline: exporta estímulos cegos e ingere respostas assinadas. */
import { createHash } from 'node:crypto';
import { validarCorpusAvaliacaoP0 } from './validar-corpus-avaliacao.mjs';
import { validarJulgamentoCritico } from './contrato-julgamento-critico.mjs';

const canonico = (valor) => Array.isArray(valor) ? valor.map(canonico) : valor && typeof valor === 'object' ? Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, canonico(valor[chave])])) : valor;
const assinar = (valor) => `sha256:${createHash('sha256').update(JSON.stringify(canonico(valor))).digest('hex')}`;
function falhar(mensagem) { throw new Error(`orquestrar-calibracao-critico: ${mensagem}`); }

export function exportarLoteCritico(corpus) {
  const resumo = validarCorpusAvaliacaoP0(corpus);
  if (!resumo.prontoParaCritico) falhar('corpus ainda não está congelado para crítico externo.');
  const apresentacoes = corpus.itens.flatMap((item) => item.apresentacoes.map((apresentacao, indice) => ({
    id: `${item.id}-p${indice + 1}`, item: item.id, ordem: apresentacao.ordem, vista: item.vista, pergunta: item.pergunta,
    evidencias: apresentacao.ordem.map((papel) => item.evidencias.find((evidencia) => evidencia.papel === papel)),
  })));
  const semAssinatura = { formato: 'mecanifica.lote-critico-p0@1', apresentacoes };
  const assinatura = assinar(semAssinatura);
  return Object.freeze({ ...semAssinatura, id: `lote-${assinatura.slice(7, 23)}`, assinatura });
}

export function ingerirRespostasCritico(lote, respostas) {
  if (!lote || lote.formato !== 'mecanifica.lote-critico-p0@1' || typeof lote.assinatura !== 'string') falhar('lote inválido.');
  const { id, assinatura, ...semAssinatura } = lote;
  if (assinatura !== assinar(semAssinatura) || id !== `lote-${assinatura.slice(7, 23)}`) falhar('assinatura do lote não confere.');
  if (!Array.isArray(respostas)) falhar('respostas precisam ser lista.');
  const esperadas = new Map(lote.apresentacoes.map(({ id: apresentacao, item }) => [apresentacao, item]));
  const recebidas = new Set();
  for (const resposta of respostas) {
    const valida = validarJulgamentoCritico(resposta);
    if (valida.lote !== lote.id || valida.assinaturaLote !== lote.assinatura || !esperadas.has(valida.apresentacao) || recebidas.has(valida.apresentacao)) falhar('resposta não pertence ao lote ou está duplicada.');
    if (esperadas.get(valida.apresentacao) !== valida.item) falhar('item da resposta não corresponde à apresentação do lote.');
    recebidas.add(valida.apresentacao);
  }
  if (recebidas.size !== esperadas.size) falhar('cobertura incompleta das apresentações do lote.');
  return Object.freeze({ lote: lote.id, respostas: recebidas.size, assinaturaRespostas: assinar(respostas) });
}
