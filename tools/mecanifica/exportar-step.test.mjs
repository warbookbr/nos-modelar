/* exportar-step.test.js — suíte de testes da CLI de exportação STEP e escrita segura. */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportarArquivoStep, parseArgs, resolverEscalaPadrao } from './exportar-step.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../..');
const TEST_DIR = join(tmpdir(), 'testes-exportar-step-' + Date.now());
const RECEITA_CANDIDATA = join(REPO, 'tools/mecanifica/fixtures/fixture-cubo.js');
const RECEITA_ERRO = join(REPO, 'tools/mecanifica/fixtures/fixture-erro.js');

describe('R03 — CLI exportar-step e escrita atômica', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  it('calcula escala padrão de conversão a partir de metros procedurais', () => {
    expect(resolverEscalaPadrao('mm')).toBe(1000);
    expect(resolverEscalaPadrao('cm')).toBe(100);
    expect(resolverEscalaPadrao('m')).toBe(1);
    expect(resolverEscalaPadrao('mm', 42)).toBe(42);
  });

  it('faz parse correto dos argumentos da linha de comando', () => {
    const args = [
      '--arquivo=receita.js',
      '--saida=saida.step',
      '--unidade=cm',
      '--tolerancia=0.002',
      '--escala=2',
      '--sobrescrever',
      '--diagnostico=json',
    ];
    const opts = parseArgs(args);
    expect(opts).toEqual({
      arquivo: 'receita.js',
      saida: 'saida.step',
      unidade: 'cm',
      tolerancia: 0.002,
      escala: 2,
      sobrescrever: true,
      diagnosticoJson: true,
      somenteValidar: false,
    });
  });

  it('exporta arquivo STEP atômico e válido a partir de uma receita', async () => {
    const saida = join(TEST_DIR, 'prisma.step');
    const res = await exportarArquivoStep({
      arquivo: RECEITA_CANDIDATA,
      saida,
      unidade: 'mm',
      tolerancia: 0.001,
      escala: 1,
      sobrescrever: true,
    });

    expect(existsSync(saida)).toBe(true);
    expect(res.bytesGravados).toBeGreaterThan(100);
    const conteudo = readFileSync(saida, 'utf8');
    expect(conteudo).toMatch(/^ISO-10303-21;/);
  });

  it('recusa sobrescrever arquivo existente sem a flag --sobrescrever', async () => {
    const saida = join(TEST_DIR, 'existente.step');
    writeFileSync(saida, 'ISO-10303-21;\n');

    await expect(
      exportarArquivoStep({
        arquivo: RECEITA_CANDIDATA,
        saida,
        unidade: 'mm',
        tolerancia: 0.001,
        escala: 1,
        sobrescrever: false,
      }),
    ).rejects.toThrowError(/já existe/);
  });

  it('sobrescreve arquivo existente quando a flag --sobrescrever é passada', async () => {
    const saida = join(TEST_DIR, 'sobrescrever.step');
    writeFileSync(saida, 'ISO-10303-21;\n');

    const res = await exportarArquivoStep({
      arquivo: RECEITA_CANDIDATA,
      saida,
      unidade: 'mm',
      tolerancia: 0.001,
      escala: 1,
      sobrescrever: true,
    });

    expect(existsSync(saida)).toBe(true);
    expect(res.bytesGravados).toBeGreaterThan(100);
  });

  it('suporta modo --somente-validar sem gerar arquivo de saída', async () => {
    const saida = join(TEST_DIR, 'nao-deve-existir.step');
    const res = await exportarArquivoStep({
      arquivo: RECEITA_CANDIDATA,
      saida,
      unidade: 'mm',
      tolerancia: 0.001,
      escala: 1,
      somenteValidar: true,
    });

    expect(res.somenteValidar).toBe(true);
    expect(res.diagnostico.valido).toBe(true);
    expect(existsSync(saida)).toBe(false);
  });

  it('recusa receita fora do repositório por violação de confinamento', async () => {
    await expect(
      exportarArquivoStep({
        arquivo: '../fora-do-repo/receita.js',
        unidade: 'mm',
      }),
    ).rejects.toThrowError(/Confinamento violado/);
  });

  it('garante escrita atômica sem deixar arquivos parciais em caso de erro', async () => {
    const saida = join(TEST_DIR, 'nao-deve-gravar.step');

    await expect(
      exportarArquivoStep({
        arquivo: RECEITA_ERRO,
        saida,
        unidade: 'mm',
      }),
    ).rejects.toThrow();

    expect(existsSync(saida)).toBe(false);
    const arquivos = existsSync(TEST_DIR) ? (await import('node:fs')).readdirSync(TEST_DIR) : [];
    const temps = arquivos.filter((f) => f.includes('.tmp.'));
    expect(temps).toEqual([]);
  });
});
