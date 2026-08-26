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
  const privados = [];
  const apresentacoes = corpus.itens.flatMap((item) => item.apresentacoes.map((apresentacao) => {
    const id = `p${String(privados.length + 1).padStart(4, '0')}`;
    privados.push({ apresentacao: id, item: item.id, alternativas: { primeira: apresentacao.ordem[0], segunda: apresentacao.ordem[1] } });
    return { id, vista: item.vista, pergunta: item.pergunta, alternativas: apresentacao.ordem.map((papel, indice) => {
      const evidencia = item.evidencias.find((atual) => atual.papel === papel);
      return { posicao: indice === 0 ? 'primeira' : 'segunda', arquivo: evidencia.arquivo, sha256: evidencia.sha256 };
    }) };
  }));
  const semAssinatura = { formato: 'mecanifica.lote-critico-p0@2', apresentacoes };
  const assinatura = assinar(semAssinatura);
  const lote = Object.freeze({ ...semAssinatura, id: `lote-${assinatura.slice(7, 23)}`, assinatura });
  const chaveSemAssinatura = { formato: 'mecanifica.chave-lote-critico-p0@2', lote: lote.id, assinaturaLote: lote.assinatura, mapeamentos: privados };
  return Object.freeze({ lote, chavePrivada: Object.freeze({ ...chaveSemAssinatura, assinatura: assinar(chaveSemAssinatura) }) });
}

export function ingerirRespostasCritico(lote, chavePrivada, respostas) {
  if (!lote || lote.formato !== 'mecanifica.lote-critico-p0@2' || typeof lote.assinatura !== 'string') falhar('lote inválido.');
  const { id, assinatura, ...semAssinatura } = lote;
  if (assinatura !== assinar(semAssinatura) || id !== `lote-${assinatura.slice(7, 23)}`) falhar('assinatura do lote não confere.');
  if (!chavePrivada || chavePrivada.formato !== 'mecanifica.chave-lote-critico-p0@2') falhar('chave privada inválida.');
  const { assinatura: assinaturaChave, ...chaveSemAssinatura } = chavePrivada;
  if (assinaturaChave !== assinar(chaveSemAssinatura) || chavePrivada.lote !== lote.id || chavePrivada.assinaturaLote !== lote.assinatura) falhar('chave privada não pertence ao lote.');
  if (!Array.isArray(respostas)) falhar('respostas precisam ser lista.');
  const esperadas = new Map(chavePrivada.mapeamentos.map((mapeamento) => [mapeamento.apresentacao, mapeamento]));
  const recebidas = new Set();
  const julgamentos = [];
  for (const resposta of respostas) {
    const valida = validarJulgamentoCritico(resposta);
    if (valida.lote !== lote.id || valida.assinaturaLote !== lote.assinatura || !esperadas.has(valida.apresentacao) || recebidas.has(valida.apresentacao)) falhar('resposta não pertence ao lote ou está duplicada.');
    const mapeamento = esperadas.get(valida.apresentacao);
    const decisaoSemantica = ['primeira', 'segunda'].includes(valida.decisao) ? mapeamento.alternativas[valida.decisao] : valida.decisao;
    julgamentos.push({ ...valida, item: mapeamento.item, decisaoSemantica });
    recebidas.add(valida.apresentacao);
  }
  if (recebidas.size !== esperadas.size) falhar('cobertura incompleta das apresentações do lote.');
  return Object.freeze({ lote: lote.id, respostas: recebidas.size, assinaturaRespostas: assinar(respostas), julgamentos: Object.freeze(julgamentos) });
}
