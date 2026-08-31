/* exportar-obj.test.mjs — suíte de testes da CLI de exportação OBJ. */
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportarArquivoObj,
  parseArgs,
  REPO,
} from './exportar-obj.mjs';

describe('CLI exportar-obj', () => {
  const saidaTeste = resolve(REPO, 'exportacoes/obj/teste_cli_cubo.obj');
  const receitaCandidata = resolve(REPO, 'tools/mecanifica/fixtures/fixture-cubo.js');

  afterEach(() => {
    if (existsSync(saidaTeste)) {
      unlinkSync(saidaTeste);
    }
  });

  it('adota unidade m e escala 1 por padrão no parse de argumentos', () => {
    const opcoes = parseArgs(['--arquivo=receita.js']);
    expect(opcoes.unidade).toBe('m');
    expect(opcoes.escala).toBe(1);
  });

  it('faz parse correto dos argumentos da linha de comando', () => {
    const opcoes = parseArgs([
      '--arquivo=prototipos/procedural/v3/pecas/_modelo.js',
      '--saida=exportacoes/obj/saida.obj',
      '--unidade=cm',
      '--sobrescrever',
    ]);

    expect(opcoes.arquivo).toBe('prototipos/procedural/v3/pecas/_modelo.js');
    expect(opcoes.saida).toBe('exportacoes/obj/saida.obj');
    expect(opcoes.unidade).toBe('cm');
    expect(opcoes.escala).toBe(100);
    expect(opcoes.sobrescrever).toBe(true);
  });

  it('permite validação sem gravar em disco', async () => {
    const res = await exportarArquivoObj({
      arquivo: receitaCandidata,
      somenteValidar: true,
    });

    expect(res.somenteValidar).toBe(true);
    expect(res.diagnostico.valido).toBe(true);
    expect(res.diagnostico.corpos.length).toBeGreaterThan(0);
  });

  it('exporta arquivo .obj físico no destino especificado', async () => {
    const res = await exportarArquivoObj({
      arquivo: receitaCandidata,
      saida: saidaTeste,
      unidade: 'mm',
      sobrescrever: true,
    });

    expect(existsSync(saidaTeste)).toBe(true);
    expect(res.tamanhoBytes).toBeGreaterThan(0);

    const conteudo = readFileSync(saidaTeste, 'utf8');
    expect(conteudo).toContain('# Mecanifica Wavefront OBJ Exporter');
    expect(conteudo).toContain('o ');
    expect(conteudo).toContain('v ');
    expect(conteudo).toContain('f ');
  });

  it('recusa sobrescrever sem a flag --sobrescrever', async () => {
    await exportarArquivoObj({
      arquivo: receitaCandidata,
      saida: saidaTeste,
      sobrescrever: true,
    });

    await expect(
      exportarArquivoObj({
        arquivo: receitaCandidata,
        saida: saidaTeste,
        sobrescrever: false,
      }),
    ).rejects.toThrowError(/Arquivo de destino já existe/);
  });
});
