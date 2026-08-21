/* aceite-visual.mjs — porteiro de vínculo entre revisão, briefing e evidências visuais. */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarCriticaVisual } from './revisao-modelagem.mjs';

export const FORMATO_ACEITE_VISUAL = 'mecanifica.aceite-visual';
export const VERSAO_ACEITE_VISUAL = 1;
export const VISTAS_OBRIGATORIAS = ['isometrica', 'frontal', 'direita', 'superior'];
const SHA = /^sha256:[a-f0-9]{64}$/;
const NOME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function falhar(mensagem) { throw new Error(`aceite-visual: ${mensagem}`); }
function obj(valor, onde) { if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(`${onde} precisa ser objeto.`); return valor; }
function texto(valor, onde) { if (typeof valor !== 'string' || !valor.trim()) falhar(`${onde} precisa ser texto não vazio.`); return valor; }
function sha(valor, onde) { const v = texto(valor, onde); if (!SHA.test(v)) falhar(`${onde} precisa ser SHA-256 hexadecimal minúsculo.`); return v; }
function nome(valor, onde) { const v = texto(valor, onde); if (!NOME.test(v)) falhar(`${onde} precisa ser identidade semântica minúscula.`); return v; }
function exato(valor, campos, onde) {
  obj(valor, onde); const atual = Object.keys(valor).sort(); const esperado = [...campos].sort();
  const faltam = esperado.filter((x) => !atual.includes(x)); const sobram = atual.filter((x) => !esperado.includes(x));
  if (faltam.length || sobram.length) falhar(`${onde} tem chaves inválidas; ausentes: ${faltam.join(', ') || '(nenhuma)'}; extras: ${sobram.join(', ') || '(nenhuma)'}.`);
}
function prova(valor, onde) {
  exato(valor, ['hash', 'localizador'], onde);
  const localizador = texto(valor.localizador, `${onde}.localizador`);
  if (!/^repo:\/\/[A-Za-z0-9._/-]+$/.test(localizador) || localizador.includes('..')) falhar(`${onde}.localizador precisa ser repo:// relativo e canônico.`);
  return { hash: sha(valor.hash, `${onde}.hash`), localizador };
}
function listaNomes(valor, onde) {
  if (!Array.isArray(valor) || !valor.length) falhar(`${onde} precisa ser lista não vazia.`);
  const itens = valor.map((x, i) => nome(x, `${onde}[${i}]`));
  if (new Set(itens).size !== itens.length) falhar(`${onde} não pode repetir identidade.`);
  return itens;
}
function opcoes(valor) {
  return { assinaturaModelo: sha(valor?.assinaturaModelo, 'assinaturaModelo esperada'), assinaturaBriefing: sha(valor?.assinaturaBriefing, 'assinaturaBriefing esperado'), rejeicoes: listaNomes(valor?.rejeicoesObrigatorias, 'rejeicoesObrigatorias esperadas') };
}

/** Validação pura; briefing e revisão esperados são externos ao pacote. */
export function validarAceiteVisual(entrada, entradaOpcoes) {
  const esperado = opcoes(entradaOpcoes);
  exato(entrada, ['alvo', 'assinaturaBriefing', 'assinaturaModelo', 'critica', 'formato', 'rejeicoes', 'sobreposicao', 'versao', 'vistas'], 'aceite');
  if (entrada.formato !== FORMATO_ACEITE_VISUAL || entrada.versao !== VERSAO_ACEITE_VISUAL) falhar('formato ou versão não suportados.');
  if (sha(entrada.assinaturaModelo, 'assinaturaModelo') !== esperado.assinaturaModelo) falhar('assinaturaModelo diverge da revisão esperada.');
  if (sha(entrada.assinaturaBriefing, 'assinaturaBriefing') !== esperado.assinaturaBriefing) falhar('assinaturaBriefing diverge do briefing esperado.');
  const alvo = prova(entrada.alvo, 'alvo'); const sobreposicao = prova(entrada.sobreposicao, 'sobreposicao');
  if (!Array.isArray(entrada.vistas)) falhar('vistas precisa ser lista.');
  const vistas = entrada.vistas.map((item, i) => { exato(item, ['evidencia', 'nome'], `vistas[${i}]`); return { evidencia: prova(item.evidencia, `vistas[${i}].evidencia`), nome: nome(item.nome, `vistas[${i}].nome`) }; });
  const nomesVistas = vistas.map((v) => v.nome);
  if (new Set(nomesVistas).size !== nomesVistas.length || nomesVistas.length !== VISTAS_OBRIGATORIAS.length || VISTAS_OBRIGATORIAS.some((x) => !nomesVistas.includes(x))) falhar(`vistas precisa cobrir exatamente: ${VISTAS_OBRIGATORIAS.join(', ')}.`);
  vistas.sort((a, b) => VISTAS_OBRIGATORIAS.indexOf(a.nome) - VISTAS_OBRIGATORIAS.indexOf(b.nome));
  exato(entrada.critica, ['assinaturaModelo', 'evidencia', 'papel'], 'critica');
  if (entrada.critica.papel !== 'critico-visual-independente') falhar("critica.papel precisa ser 'critico-visual-independente'.");
  if (sha(entrada.critica.assinaturaModelo, 'critica.assinaturaModelo') !== esperado.assinaturaModelo) falhar('critica.assinaturaModelo diverge da revisão avaliada.');
  const critica = { assinaturaModelo: esperado.assinaturaModelo, evidencia: prova(entrada.critica.evidencia, 'critica.evidencia'), papel: entrada.critica.papel };
  const provas = new Set(['alvo', 'sobreposicao', 'critica', ...nomesVistas]);
  if (!Array.isArray(entrada.rejeicoes)) falhar('rejeicoes precisa ser lista.');
  const rejeicoes = entrada.rejeicoes.map((item, i) => {
    exato(item, ['evidencias', 'id', 'resultado'], `rejeicoes[${i}]`);
    const resultado = texto(item.resultado, `rejeicoes[${i}].resultado`); if (!['passa', 'reprova', 'inconclusiva'].includes(resultado)) falhar(`rejeicoes[${i}].resultado é inválido.`);
    const evidencias = listaNomes(item.evidencias, `rejeicoes[${i}].evidencias`); if (evidencias.some((x) => !provas.has(x))) falhar(`rejeicoes[${i}].evidencias cita prova não declarada.`);
    return { evidencias, id: nome(item.id, `rejeicoes[${i}].id`), resultado };
  });
  const ids = rejeicoes.map((r) => r.id);
  if (new Set(ids).size !== ids.length || ids.length !== esperado.rejeicoes.length || esperado.rejeicoes.some((x) => !ids.includes(x))) falhar(`rejeicoes precisa cobrir exatamente: ${esperado.rejeicoes.join(', ')}.`);
  rejeicoes.sort((a, b) => esperado.rejeicoes.indexOf(a.id) - esperado.rejeicoes.indexOf(b.id));
  const motivos = rejeicoes.filter((r) => r.resultado !== 'passa').map((r) => `rejeicao:${r.id}`);
  return { alvo, assinaturaBriefing: esperado.assinaturaBriefing, assinaturaModelo: esperado.assinaturaModelo, critica, formato: FORMATO_ACEITE_VISUAL, rejeicoes, sobreposicao, versao: VERSAO_ACEITE_VISUAL, veredito: motivos.length ? { estado: 'reprovado', motivos } : { estado: 'aprovavel', motivos: [] }, vistas };
}

function arquivoDaProva(item, raizRepositorio) {
  const raiz = realpathSync(raizRepositorio); const candidato = resolve(raiz, item.localizador.slice('repo://'.length));
  if ((!candidato.startsWith(`${raiz}/`) && candidato !== raiz) || !existsSync(candidato) || !lstatSync(candidato).isFile()) falhar(`evidência ausente ou fora da raiz: ${item.localizador}.`);
  const real = realpathSync(candidato); if (!real.startsWith(`${raiz}/`)) falhar(`evidência aponta symlink fora da raiz: ${item.localizador}.`);
  const encontrado = `sha256:${createHash('sha256').update(readFileSync(real)).digest('hex')}`;
  if (encontrado !== item.hash) falhar(`hash diverge para ${item.localizador}.`);
  return real;
}

/** Confere bytes e documento de crítica; não tenta inferir qualidade dos pixels. */
export function verificarEvidenciasAceiteNoDisco(aceite, entradaOpcoes, { raizRepositorio } = {}) {
  if (!raizRepositorio) falhar('raizRepositorio é obrigatória para verificar evidências.');
  const valido = validarAceiteVisual(aceite, entradaOpcoes);
  const itens = [valido.alvo, valido.sobreposicao, ...valido.vistas.map((v) => v.evidencia)]; itens.forEach((item) => arquivoDaProva(item, raizRepositorio));
  const criticaArquivo = arquivoDaProva(valido.critica.evidencia, raizRepositorio);
  let documento; try { documento = JSON.parse(readFileSync(criticaArquivo, 'utf8')); } catch { falhar('crítica não contém JSON válido.'); }
  let critica; try { critica = validarCriticaVisual(documento); } catch (causa) { falhar(`crítica inválida: ${causa.message}`); }
  const abertos = critica.achados.filter((a) => ['aberto', 'bloqueado'].includes(a.estado));
  if (abertos.some((a) => a.vinculo.antes !== valido.assinaturaModelo && a.vinculo.depois !== valido.assinaturaModelo)) falhar('crítica contém achado sem vínculo à revisão avaliada.');
  const motivos = [...valido.veredito.motivos, ...(abertos.length ? ['critica:achado-aberto'] : [])];
  return { ...valido, critica: { ...valido.critica, achadosAbertos: abertos.length }, veredito: motivos.length ? { estado: 'reprovado', motivos } : { estado: 'aprovavel', motivos: [] } };
}
