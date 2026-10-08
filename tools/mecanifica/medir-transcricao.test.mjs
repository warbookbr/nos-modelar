/* medir-transcricao.test.mjs — a medição de uma transcrição: turnos e entrada somada pelo `usage` (uma vez por mensagem),
   cada resultado de ferramenta na etapa da sua chamada, imagem pelo valor fixo, e a soma de várias transcrições. */
import { describe, expect, it } from 'vitest';
import { CARACTERES_POR_TOKEN, etapaDaChamada, medirTranscricao, textoDaMedicao, TOKENS_POR_IMAGEM } from './medir-transcricao.mjs';

const assistente = (id, usage, content) => JSON.stringify({ type: 'assistant', message: { id, usage, content } });
const usuario = (content) => JSON.stringify({ type: 'user', message: { content } });
const uso = (entrada, cache, saida) => ({ input_tokens: entrada, cache_read_input_tokens: cache, output_tokens: saida });

const TRANSCRICAO = [
  usuario('x'.repeat(35)),
  assistente('m1', uso(100, 900, 10), [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm run esboco -- --ajuda tubo' } }]),
  usuario([{ type: 'tool_result', tool_use_id: 't1', content: 'y'.repeat(70) }]),
  /* a mesma mensagem m2 em duas linhas, como o Claude Code grava um bloco por linha */
  assistente('m2', uso(50, 1100, 20), [{ type: 'text', text: 'z'.repeat(7) }]),
  assistente('m2', uso(50, 1100, 20), [{ type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/p/vista.png' } }]),
  usuario([{ type: 'tool_result', tool_use_id: 't2', content: [{ type: 'image', source: {} }] }]),
].join('\n');

describe('medirTranscricao', () => {
  it('conta turnos e entrada pelo usage, uma vez por mensagem, e reparte o resto por etapa', () => {
    const m = medirTranscricao(TRANSCRICAO);
    expect(m).toMatchObject({ turnos: 2, entradaSomada: 1000 + 1150, saida: 30, contextoFinal: 1150 });
    expect(m).toMatchObject({ entradaNova: 150, cacheGravado: 0, cacheLido: 2000 });
    expect(m.etapas['comando esboco --ajuda']).toEqual({ tokens: 70 / CARACTERES_POR_TOKEN, chamadas: 1 });
    expect(m.etapas['imagem aberta']).toEqual({ tokens: TOKENS_POR_IMAGEM, chamadas: 1 });
    expect(m.etapas['texto da IA'].tokens).toBe(7 / CARACTERES_POR_TOKEN);
    expect(m.etapas.pedido.tokens).toBe(35 / CARACTERES_POR_TOKEN);
  });

  it('classifica as chamadas pelas etapas da medição de 2026-10-07, com --ajuda e --composta', () => {
    expect(etapaDaChamada('Read', { file_path: '/r/modulos/esboco/README.md' })).toBe('leitura: README do esboço');
    expect(etapaDaChamada('Read', { file_path: '/r/.claude/skills/esboco-detalhado/SKILL.md' })).toBe('leitura: skill');
    expect(etapaDaChamada('Edit', { file_path: '/t/a.esboco.json' })).toBe('escrita do JSON');
    expect(etapaDaChamada('Bash', { command: 'npm run esboco -- a.esboco.json --composta' })).toBe('comando esboco --composta');
    expect(etapaDaChamada('Bash', { command: 'npm run esboco -- a.esboco.json' })).toBe('comando esboco (gate e leitura padrão)');
    expect(etapaDaChamada('Grep', {})).toBe('ferramenta: Grep');
  });

  it('o texto traz cada transcrição e, com mais de uma, a soma com a porcentagem', () => {
    const m = medirTranscricao(TRANSCRICAO);
    const texto = textoDaMedicao([{ nome: 'a', medicao: m }, { nome: 'b', medicao: m }]);
    expect(texto).toContain('== a: 2 turnos, contexto final 1.150, entrada somada 2.150, saída 30');
    expect(texto).toContain('   entrada: nova 150, gravada no cache 0, lida do cache 2.000');
    expect(texto).toContain('== soma das 2 transcrições');
    expect(texto).toMatch(/imagem aberta +3\.200 tok +[\d.]+%/);
  });
});
