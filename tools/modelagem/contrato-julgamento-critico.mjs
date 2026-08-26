/* Resposta de crítico externo: dados assinados, nunca veredito inferido localmente. */
import { createHash } from 'node:crypto';

export const FORMATO_JULGAMENTO_CRITICO = 'mecanifica.julgamento-critico@1';
const SHA = /^sha256:[a-f0-9]{64}$/;
const DECISOES = new Set(['A', 'B', 'empate', 'indeterminado']);
const VEREDITOS = new Set(['aprovar', 'reprovar', 'indeterminado']);
function falhar(mensagem) { throw new Error(`julgamento-critico: ${mensagem}`); }
function canonico(valor) {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, canonico(valor[chave])]));
  return valor;
}
function hash(valor) { return `sha256:${createHash('sha256').update(JSON.stringify(canonico(valor))).digest('hex')}`; }
function baseSemAssinatura(entrada) { const { assinaturaResposta, ...base } = entrada; return base; }

export function assinarJulgamentoCritico(entrada) { return hash(baseSemAssinatura(entrada)); }

export function validarJulgamentoCritico(entrada) {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) falhar('resposta precisa ser objeto.');
  const chaves = ['achados', 'apresentacao', 'assinaturaLote', 'assinaturaResposta', 'confianca', 'decisao', 'formato', 'hashPrompt', 'item', 'lote', 'modelo', 'provedor'];
  const atuais = Object.keys(entrada).sort();
  if (atuais.length !== chaves.length || atuais.some((chave, i) => chave !== chaves[i])) falhar('chaves inválidas.');
  if (entrada.formato !== FORMATO_JULGAMENTO_CRITICO || !DECISOES.has(entrada.decisao)) falhar('formato ou decisão inválidos.');
  for (const chave of ['lote', 'item', 'apresentacao', 'provedor', 'modelo']) if (typeof entrada[chave] !== 'string' || !entrada[chave].trim()) falhar(`${chave} obrigatório.`);
  if (!SHA.test(entrada.assinaturaLote) || !SHA.test(entrada.hashPrompt) || !SHA.test(entrada.assinaturaResposta)) falhar('assinatura ou hash inválido.');
  if (!Number.isFinite(entrada.confianca) || entrada.confianca < 0 || entrada.confianca > 1) falhar('confiança fora de 0..1.');
  if (!Array.isArray(entrada.achados)) falhar('achados precisam ser lista.');
  for (const achado of entrada.achados) {
    if (!achado || typeof achado !== 'object' || Object.keys(achado).sort().join(',') !== 'evidencia,regiao,veredito') falhar('achado inválido.');
    if (typeof achado.regiao !== 'string' || !achado.regiao || !VEREDITOS.has(achado.veredito) || typeof achado.evidencia !== 'string' || !achado.evidencia) falhar('achado sem região, veredito ou evidência.');
  }
  if (assinarJulgamentoCritico(entrada) !== entrada.assinaturaResposta) falhar('assinatura da resposta não confere.');
  return Object.freeze(canonico(entrada));
}
