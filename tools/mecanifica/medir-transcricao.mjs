#!/usr/bin/env node
/* medir-transcricao.mjs — onde vão os tokens de um agente: `npm run medir:transcricao -- <transcrição.jsonl> [...]`.
 *
 * Lê a transcrição JSONL de um agente (a que o Claude Code grava por subagente) e reparte o que entrou no contexto por
 * etapa: leitura da skill, do README do esboço e de outros arquivos, escrita do JSON, cada comando do esboço, imagens
 * abertas, texto da própria IA. Imprime também os turnos, a entrada somada (o que se paga, porque cada turno relê o
 * contexto) e o contexto final. Com várias transcrições, soma as partes no fim. Foi a medição de 2026-10-07
 * (`docs/mecanifica/banco-de-provas/MEDICAO-DE-TOKENS-2026-10.md`), e a fatia 6 do caminho curto a repete para comparar.
 *
 * As partes são estimadas: texto vale um token a cada 3,5 caracteres e cada imagem vale TOKENS_POR_IMAGEM. Os turnos e a
 * entrada somada vêm do `usage` da API e são exatos, e a entrada vem também dividida em nova, gravada no cache e lida do
 * cache, porque a leitura de cache custa uma fração da entrada nova e a mesma soma de tokens pode custar bem diferente. */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CARACTERES_POR_TOKEN = 3.5;
/* Uma vista de 1100 px de largura, como as do esboço, custa por volta disso. */
export const TOKENS_POR_IMAGEM = 1600;

const FLAGS_DO_ESBOCO = ['--ajuda', '--composta', '--analise', '--descrever', '--condutor', '--medidas', '--ligacoes', '--editar', '--vista', '--unidade'];

/* A etapa de uma chamada de ferramenta. */
export function etapaDaChamada(nome, entrada = {}) {
  if (nome === 'Read') {
    const p = entrada.file_path ?? '';
    if (p.endsWith('.png')) return 'imagem aberta';
    if (p.includes('/skills/')) return 'leitura: skill';
    if (p.endsWith('modulos/esboco/README.md')) return 'leitura: README do esboço';
    if (p.endsWith('.esboco.json')) return 'leitura: o próprio JSON';
    return 'leitura: outros arquivos';
  }
  if (nome === 'Write' || nome === 'Edit') return (entrada.file_path ?? '').includes('.esboco.json') ? 'escrita do JSON' : 'escrita: outros';
  if (nome === 'Bash') {
    const c = entrada.command ?? '';
    const flag = FLAGS_DO_ESBOCO.find((f) => c.includes(f));
    if (flag) return `comando esboco ${flag}`;
    if (c.includes('esboco')) return 'comando esboco (gate e leitura padrão)';
    return 'bash: outros';
  }
  return `ferramenta: ${nome}`;
}

const tokensDeTexto = (texto) => String(texto ?? '').length / CARACTERES_POR_TOKEN;

/* A medição de uma transcrição, dada como texto JSONL: { turnos, entradaSomada, entradaNova, cacheGravado, cacheLido,
   saida, contextoFinal, etapas: { etapa: { tokens, chamadas } } }. Uma mensagem da API que aparece em várias linhas (uma por bloco) conta uma vez. */
export function medirTranscricao(jsonl) {
  const vistos = new Set();
  const etapaPorChamada = new Map();
  const etapas = new Map();
  const somar = (etapa, tokens, chamadas = 0) => {
    const e = etapas.get(etapa) ?? { tokens: 0, chamadas: 0 };
    e.tokens += tokens; e.chamadas += chamadas;
    etapas.set(etapa, e);
  };
  let turnos = 0; let entradaSomada = 0; let saida = 0; let contextoFinal = 0;
  let entradaNova = 0; let cacheGravado = 0; let cacheLido = 0;
  for (const linha of jsonl.split('\n')) {
    if (!linha.trim()) continue;
    const d = JSON.parse(linha);
    const m = d.message;
    if (!m || typeof m !== 'object') continue;
    if (d.type === 'assistant') {
      if (m.id && !vistos.has(m.id)) {
        vistos.add(m.id);
        const u = m.usage ?? {};
        const total = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
        turnos += 1; entradaSomada += total; saida += u.output_tokens ?? 0; contextoFinal = total;
        entradaNova += u.input_tokens ?? 0; cacheGravado += u.cache_creation_input_tokens ?? 0; cacheLido += u.cache_read_input_tokens ?? 0;
      }
      for (const b of Array.isArray(m.content) ? m.content : []) {
        if (b?.type === 'tool_use') {
          const etapa = etapaDaChamada(b.name, b.input);
          etapaPorChamada.set(b.id, etapa);
          somar(etapa, etapa.startsWith('escrita') ? tokensDeTexto(JSON.stringify(b.input ?? {})) : 0, 1);
        } else if (b?.type === 'text') {
          somar('texto da IA', tokensDeTexto(b.text));
        }
      }
    } else if (d.type === 'user') {
      if (typeof m.content === 'string') {
        if (turnos === 0) somar('pedido', tokensDeTexto(m.content));
        continue;
      }
      for (const b of Array.isArray(m.content) ? m.content : []) {
        if (b?.type !== 'tool_result') continue;
        const etapa = etapaPorChamada.get(b.tool_use_id) ?? 'resultado sem chamada';
        const partes = Array.isArray(b.content) ? b.content : [{ type: 'text', text: String(b.content ?? '') }];
        for (const p of partes) somar(etapa, p?.type === 'image' ? TOKENS_POR_IMAGEM : tokensDeTexto(p?.text));
      }
    }
  }
  return { turnos, entradaSomada, entradaNova, cacheGravado, cacheLido, saida, contextoFinal, etapas: Object.fromEntries([...etapas].sort((a, b) => b[1].tokens - a[1].tokens)) };
}

const inteiro = (n) => Math.round(n).toLocaleString('pt-BR');

export function textoDaMedicao(medicoes) {
  const linhas = [];
  const soma = new Map();
  for (const { nome, medicao: m } of medicoes) {
    linhas.push(`== ${nome}: ${m.turnos} turnos, contexto final ${inteiro(m.contextoFinal)}, entrada somada ${inteiro(m.entradaSomada)}, saída ${inteiro(m.saida)}`);
    linhas.push(`   entrada: nova ${inteiro(m.entradaNova ?? 0)}, gravada no cache ${inteiro(m.cacheGravado ?? 0)}, lida do cache ${inteiro(m.cacheLido ?? 0)}`);
    for (const [etapa, { tokens, chamadas }] of Object.entries(m.etapas)) {
      linhas.push(`   ${etapa.padEnd(40)} ${inteiro(tokens).padStart(9)} tok  (${chamadas} chamadas)`);
      soma.set(etapa, (soma.get(etapa) ?? 0) + tokens);
    }
  }
  if (medicoes.length > 1) {
    const total = [...soma.values()].reduce((a, b) => a + b, 0) || 1;
    linhas.push(`== soma das ${medicoes.length} transcrições`);
    for (const [etapa, tokens] of [...soma].sort((a, b) => b[1] - a[1])) {
      linhas.push(`   ${etapa.padEnd(40)} ${inteiro(tokens).padStart(9)} tok ${(100 * tokens / total).toFixed(1).padStart(5)}%`);
    }
  }
  return `${linhas.join('\n')}\n`;
}

function executar(arquivos) {
  if (arquivos.length === 0) {
    process.stderr.write('uso: npm run medir:transcricao -- <transcrição.jsonl> [...]\n');
    process.exitCode = 1;
    return;
  }
  const medicoes = arquivos.map((a) => ({ nome: basename(a), medicao: medirTranscricao(readFileSync(a, 'utf8')) }));
  process.stdout.write(textoDaMedicao(medicoes));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar(process.argv.slice(2));
