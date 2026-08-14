import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  carregarCatalogoMontagens, catalogoMontagensDoAmbiente,
  criarCatalogoMontagensVazio, VARIAVEL_CATALOGO_MCP_MONTAGENS,
} from './catalogo-montagens.mjs';

const CONFIGURACAO = resolve('tools/mcp/fixtures/catalogo-montagens.json');

describe('catálogo MCP de montagens configurado pelo host', () => {
  it('lista somente raízes declaradas e resolve por ID sem caminho do cliente', async () => {
    const catalogo = carregarCatalogoMontagens(CONFIGURACAO);
    expect(catalogo.listar()).toEqual([
      { id: 'gabarito-separacao-direcional' },
      { id: 'gabarito-unitario' },
    ]);
    const montagem = await catalogo.resolver('gabarito-separacao-direcional');
    expect(montagem.id).toBe('gabarito-separacao-direcional');
    expect(montagem.relacoes).toHaveLength(1);
    await expect(catalogo.resolver('v3-separacao-direcional')).rejects.toMatchObject({
      codigo: 'montagem-nao-encontrada',
    });
  });

  it('fica vazio sem configuração e explica a ação necessária', async () => {
    const catalogo = criarCatalogoMontagensVazio();
    expect(catalogo.listar()).toEqual([]);
    await expect(catalogo.resolver('qualquer')).rejects.toMatchObject({ codigo: 'catalogo-nao-configurado' });
    expect(catalogoMontagensDoAmbiente({})).toMatchObject({ configurado: false });
  });

  it('lê o caminho apenas da configuração confiável do processo', () => {
    const catalogo = catalogoMontagensDoAmbiente({ [VARIAVEL_CATALOGO_MCP_MONTAGENS]: CONFIGURACAO });
    expect(catalogo).toMatchObject({ configurado: true });
    expect(() => carregarCatalogoMontagens('relativo.json')).toThrowError(expect.objectContaining({ codigo: 'configuracao-invalida' }));
  });

  it('recusa vínculo simbólico mesmo quando a raiz foi explicitamente listada', async () => {
    const temp = mkdtempSync(join(tmpdir(), 'mecanifica-catalogo-mcp-'));
    const fora = mkdtempSync(join(tmpdir(), 'mecanifica-catalogo-fora-'));
    try {
      mkdirSync(join(temp, 'montagens'));
      mkdirSync(join(temp, 'pecas'));
      writeFileSync(join(fora, 'escape.json'), JSON.stringify({
        formato: 'mecanifica.montagem', versao: 1, id: 'escape', instancias: [],
      }));
      symlinkSync(join(fora, 'escape.json'), join(temp, 'montagens', 'escape.json'));
      const configuracao = join(temp, 'catalogo.json');
      writeFileSync(configuracao, JSON.stringify({
        formato: 'mecanifica.catalogo-mcp-montagens', versao: 1,
        raizMontagens: 'montagens', raizPecas: 'pecas',
        raizes: [{ id: 'escape', ref: 'escape' }],
      }));
      const catalogo = carregarCatalogoMontagens(configuracao);
      await expect(catalogo.resolver('escape')).rejects.toMatchObject({ codigo: 'referencia-indisponivel' });
    } finally {
      rmSync(temp, { recursive: true, force: true });
      rmSync(fora, { recursive: true, force: true });
    }
  });
});
