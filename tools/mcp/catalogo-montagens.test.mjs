/* catalogo-montagens.test.mjs — confinamento e descoberta explícita do catálogo MCP. */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

  it('revalida peça candidata somente nas raízes explicitamente autorizadas', async () => {
    const catalogo = carregarCatalogoMontagens(CONFIGURACAO);
    const candidata = JSON.parse(readFileSync(resolve('tools/mecanifica/fixtures/pecas-resolvidas/bloco-gabarito.json'), 'utf8'));
    const resultado = await catalogo.revalidarPeca('bloco-gabarito', candidata);
    expect(resultado.cobertura).toBe('catalogo-explicito');
    expect(resultado.raizes.map(({ id, usa, estado }) => ({ id, usa, estado }))).toEqual([
      { id: 'gabarito-separacao-direcional', usa: true, estado: 'aprovada' },
      { id: 'gabarito-unitario', usa: true, estado: 'aprovada' },
    ]);
  });

  it('compõe raiz e peça ativas sobre a base estática sem confundir ID com arquivo', async () => {
    const base = carregarCatalogoMontagens(CONFIGURACAO);
    const montagemAtiva = JSON.parse(readFileSync(resolve('tools/mecanifica/fixtures/montagens-persistidas/v3-separacao-direcional.json'), 'utf8'));
    montagemAtiva.instancias.find(({ id }) => id === 'movel').pose.deslocamento[1] = 1.04;
    const pecaAtiva = JSON.parse(readFileSync(resolve('tools/mecanifica/fixtures/pecas-resolvidas/bloco-gabarito.json'), 'utf8'));
    pecaAtiva.V = pecaAtiva.V.map(([id, x, y, z]) => [id, x, y * 0.5, z]);
    const chamadas = [];
    const catalogo = base.comProvedores({
      async carregarMontagem(id) {
        chamadas.push(['montagem', id]);
        return id === 'gabarito-separacao-direcional' ? montagemAtiva : null;
      },
      async carregarPeca(id) {
        chamadas.push(['peca', id]);
        return id === 'bloco-gabarito' ? pecaAtiva : null;
      },
    });

    const resolvida = await catalogo.resolver('gabarito-separacao-direcional');
    expect(resolvida.relacoes[0].medidas.separacaoDirecional).toBeCloseTo(0.54);
    expect(chamadas).toContainEqual(['montagem', 'gabarito-separacao-direcional']);
    expect(chamadas).not.toContainEqual(['montagem', 'v3-separacao-direcional']);
    expect(chamadas).toContainEqual(['peca', 'bloco-gabarito']);
  });

  it('preserva exatamente a base quando nenhum provedor possui revisão ativa', async () => {
    const base = carregarCatalogoMontagens(CONFIGURACAO);
    const catalogo = base.comProvedores({
      async carregarMontagem() { return null; },
      async carregarPeca() { return null; },
    });
    await expect(catalogo.resolver('gabarito-separacao-direcional'))
      .resolves.toEqual(await base.resolver('gabarito-separacao-direcional'));
  });

  it('revalida a candidata contra a montagem ativa, não contra uma raiz obsoleta', async () => {
    const base = carregarCatalogoMontagens(CONFIGURACAO);
    const montagemAtiva = JSON.parse(readFileSync(resolve('tools/mecanifica/fixtures/montagens-persistidas/v3-separacao-direcional.json'), 'utf8'));
    montagemAtiva.instancias.find(({ id }) => id === 'movel').pose.deslocamento[1] = 1.01;
    const candidata = JSON.parse(readFileSync(resolve('tools/mecanifica/fixtures/pecas-resolvidas/bloco-gabarito.json'), 'utf8'));
    const catalogo = base.comProvedores({
      async carregarMontagem(id) { return id === 'gabarito-separacao-direcional' ? montagemAtiva : null; },
    });
    const resultado = await catalogo.revalidarPeca('bloco-gabarito', candidata);
    expect(resultado.raizes.find(({ id }) => id === 'gabarito-separacao-direcional')).toMatchObject({
      usa: true, estado: 'falhou',
    });
  });

  it('falha fechada quando um provedor ativo lança erro', async () => {
    const base = carregarCatalogoMontagens(CONFIGURACAO);
    const catalogo = base.comProvedores({
      async carregarMontagem() { throw Object.assign(new Error('revisão corrompida'), { codigo: 'snapshot-invalido' }); },
    });
    await expect(catalogo.resolver('gabarito-unitario')).rejects.toMatchObject({ codigo: 'snapshot-invalido' });
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
