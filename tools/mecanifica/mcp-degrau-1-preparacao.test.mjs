/* Provas da fatia preparatória: importação silenciosa, serviço estruturado e limpeza. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { olharBancada } from './olhar-bancada.mjs';

const DESCRIBIR = new URL('./descrever-peca.mjs', import.meta.url);
const OLHAR = new URL('./olhar-bancada.mjs', import.meta.url);

describe('fatia preparatória do Degrau 1', () => {
  it('importa as CLIs sem argv, saída ou execução automática', () => {
    const script = `await import(${JSON.stringify(DESCRIBIR.href)}); await import(${JSON.stringify(OLHAR.href)});`;
    const saida = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    expect(saida).toBe('');
  });

  it('descreverPecaReutilizavel devolve dados e erros sem encerrar o processo', async () => {
    const sucesso = await descreverPecaReutilizavel({ peca: 'freio-disco' });
    expect(sucesso).toMatchObject({ ok: true, codigo: 0, stderr: '' });
    expect(sucesso.stdout).toContain('peça: freio-disco');

    const erro = await descreverPecaReutilizavel({ peca: 'nao-existe' });
    expect(erro).toMatchObject({ ok: false, codigo: 2, erro: { categoria: 'uso' } });
    expect(erro.stderr).toContain("peça 'nao-existe' não existe");
  });

  it('olharBancada valida e retorna erro sem iniciar infraestrutura', async () => {
    let iniciou = false;
    const resultado = await olharBancada({
      vistas: ['vista-inexistente'],
      dependencias: { createServer: async () => { iniciou = true; } },
    });
    expect(resultado).toMatchObject({ ok: false, codigo: 2, erro: { categoria: 'uso' } });
    expect(iniciou).toBe(false);
  });

  it('injeta logs e sempre fecha o servidor se o navegador falhar', async () => {
    let fechado = false;
    const servidor = {
      httpServer: { address: () => ({ port: 43123 }) },
      async listen() {},
      async close() { fechado = true; },
    };
    const logs = [];
    const resultado = await olharBancada({
      peca: 'freio-disco',
      vistas: ['isometrica'],
      logger: (canal, mensagem) => logs.push([canal, mensagem]),
      dependencias: {
        createServer: async () => servidor,
        carregarPlaywright: async () => ({ chromium: { launch: async () => { throw new Error('falha de teste'); } } }),
      },
    });
    expect(resultado).toMatchObject({ ok: false, codigo: 1, erro: { categoria: 'execucao' } });
    expect(fechado).toBe(true);
    expect(logs).toEqual([]);
  });

  it('fecha Vite mesmo quando browser.close falha e preserva o erro principal', async () => {
    let viteFechado = false;
    const servidor = {
      httpServer: { address: () => ({ port: 43123 }) },
      async listen() {},
      async close() { viteFechado = true; },
    };
    const resultado = await olharBancada({
      peca: 'freio-disco', vistas: ['isometrica'],
      dependencias: {
        createServer: async () => servidor,
        carregarPlaywright: async () => ({ chromium: { launch: async () => ({
          async newPage() { throw new Error('falha principal de página'); },
          async close() { throw new Error('falha secundária de fechamento'); },
        }) } }),
      },
    });
    expect(viteFechado).toBe(true);
    expect(resultado).toMatchObject({
      ok: false,
      erro: {
        codigo: 'falha_bancada',
        mensagem: 'falha principal de página',
        limpeza: [{ recurso: 'browser', codigo: 'falha_fechamento' }],
      },
    });
  });

  it('não grava saída durante importação e não depende de arquivos de teste', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'mecanifica-mcp-import-'));
    try {
      const script = `await import(${JSON.stringify(OLHAR.href)});`;
      execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: pasta, encoding: 'utf8' });
      expect(readdirSync(pasta)).toEqual([]);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});
