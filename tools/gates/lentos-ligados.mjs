/* lentos-ligados.mjs — quais testes lentos o envio liga ao que mudou, e quantos deles cabem na bateria local.
 *
 * Medido em 2026-11-13: duas reprovações do CI no mesmo dia eram teste lento ligado direto ao arquivo mudado
 * (`src/autoria/material-da-receita.acervo.test.js`, um piso de contagem do acervo, quando arquivos de `procedural/pecas/`
 * saíram; `tools/modelar/raio-da-aresta.test.mjs`, quando `tools/modelar/capacidade.mjs` mudou), e cada uma custou uns 15
 * minutos de CI e um reenvio. A bateria local deixava o `test:lentos` inteiro para o CI. Aqui ele passa a rodar os lentos
 * ligados ao que o envio mudou: pelo fecho dos imports de cada lento (o mesmo do seletor) e pelo registro de leituras dos testes,
 * que diz que teste lê um arquivo fora do grafo (receita, JSON, pasta listada). Com um teto, para a bateria local não virar a do
 * CI: se os ligados passarem de TETO_DE_ARQUIVOS ou de TETO_DE_MS pela duração guardada, rodam os de menor duração até o teto e o
 * resto fica para o CI, que roda todos. */
import { readFileSync } from 'node:fs';
import { fechoDosImports } from './seletor.mjs';
import { testesQueLeem } from './leituras.mjs';
import { mediana } from '../testes-lentos.mjs';

export const TETO_DE_MS = 5 * 60_000;
export const TETO_DE_ARQUIVOS = 8;
/* sem duração guardada para o arquivo, vale esta, que é o piso de um lento */
export const DURACAO_SEM_MEDIDA_MS = 30_000;

/* A duração guardada de cada lento: a mediana do histórico de execuções, e na falta dele o peso medido (em segundos) em
   `testes-lentos-pesos.json`; o arquivo sem nenhum dos dois entra com DURACAO_SEM_MEDIDA_MS. */
export function duracaoGuardada(arquivo, historico = {}, pesos = {}) {
  const h = historico[arquivo];
  if (h?.length) return mediana(h);
  if (pesos[arquivo] > 0) return pesos[arquivo] * 1000;
  return DURACAO_SEM_MEDIDA_MS;
}

/* `alterados`: o que o envio mudou. `estruturais`: dentre eles, os que apareceram ou sumiram (a listagem de pasta de um teste
   só muda de resposta por eles). `leituras`: o registro do gate, ou null se ainda não há. Devolve cada lento ligado, com o motivo. */
export function lentosLigados({ lentos, alterados, estruturais = [], foto, leituras = null, raiz = '.' }) {
  const mudados = new Set(alterados);
  const ligados = new Map();
  for (const teste of lentos) {
    if (!foto[teste] && !mudados.has(teste)) continue;
    const fecho = fechoDosImports(raiz, [teste], foto);
    const por = [...mudados].find((c) => fecho.has(c));
    if (por) ligados.set(teste, `importa ${por}`);
  }
  const lidos = leituras ? testesQueLeem(leituras, alterados, estruturais) : [];
  for (const teste of lentos) if (!ligados.has(teste) && lidos.includes(teste)) ligados.set(teste, 'lê o que mudou (registro de leituras)');
  return ligados;
}

/* Corta pelo teto: do mais barato ao mais caro, entra enquanto couber em arquivos e em tempo. O que passa do teto fica para o CI. */
export function aplicarTeto(ligados, duracoes, { tetoMs = TETO_DE_MS, tetoArquivos = TETO_DE_ARQUIVOS } = {}) {
  const arquivos = [...ligados];
  const total = arquivos.reduce((s, a) => s + duracoes(a), 0);
  if (arquivos.length <= tetoArquivos && total <= tetoMs) return { rodam: arquivos.sort(), ficam: [], somaMs: total, cortado: false };
  const ordem = arquivos.sort((a, b) => duracoes(a) - duracoes(b) || a.localeCompare(b));
  const rodam = []; const ficam = [];
  let soma = 0;
  for (const a of ordem) {
    if (!ficam.length && rodam.length < tetoArquivos && soma + duracoes(a) <= tetoMs) { rodam.push(a); soma += duracoes(a); } else ficam.push(a);
  }
  return { rodam: rodam.sort(), ficam: ficam.sort(), somaMs: soma, cortado: true };
}

/* O texto para o relatório da bateria. */
export function relatarLentosLigados({ rodam, ficam, somaMs, cortado }) {
  const s = Math.round(somaMs / 1000);
  if (!rodam.length && !ficam.length) return 'test:lentos — nenhum lento ligado ao que o envio mudou; o CI roda todos.';
  if (!cortado) return `test:lentos — ${rodam.length} lento(s) ligado(s) ao que o envio mudou rodam aqui (${s} s guardados): ${rodam.join(', ')}; o CI roda todos.`;
  return `test:lentos — ligados demais para a bateria local (teto de ${TETO_DE_ARQUIVOS} arquivos ou ${TETO_DE_MS / 60_000} minutos): rodam os ${rodam.length} mais curtos (${s} s guardados): ${rodam.join(', ')}; ficam para o CI: ${ficam.join(', ')}.`;
}

export function lerPesos(caminho) {
  try { return JSON.parse(readFileSync(caminho, 'utf8')).segundos ?? {}; } catch { return {}; }
}
