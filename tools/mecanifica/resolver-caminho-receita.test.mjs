/* resolver-caminho-receita.test.mjs — testes unitários para resolução flexível e segura de receitas procedurais. */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO, resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

/* O resolvedor busca dentro do repositório, então a fixture de arquivo solto e
   a de pasta com entrada dentro moram numa área temporária DENTRO do repo, sob
   `tmp/`, e são apagadas ao final. Não apontamos para peça alguma do acervo:
   este teste prova achar arquivo no disco, não geometria de peça nenhuma. */
let AREA;
let ARQUIVO_SOLTO;
let NOME_PASTA;

beforeAll(() => {
  mkdirSync(join(REPO, 'tmp'), { recursive: true });
  AREA = mkdtempSync(join(REPO, 'tmp', 'teste-resolver-caminho-'));

  ARQUIVO_SOLTO = join(AREA, 'receita-solta.js');
  writeFileSync(ARQUIVO_SOLTO, 'export const receita = { PASSOS: [] };\n', 'utf8');

  const pasta = join(AREA, 'receita-em-pasta');
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'montagem.js'), 'export const receita = { PASSOS: [] };\n', 'utf8');
  NOME_PASTA = relative(REPO, pasta).replace(/\\/g, '/');
});

afterAll(() => {
  rmSync(AREA, { recursive: true, force: true });
});

describe('resolverCaminhoReceita', () => {
  it('resolve caminho relativo existente diretamente', () => {
    const relativoSolto = relative(REPO, ARQUIVO_SOLTO).replace(/\\/g, '/');
    const caminho = resolverCaminhoReceita(relativoSolto);
    expect(caminho).toMatch(/receita-solta\.js$/);
  });

  it('resolve caminho relativo sem a extensão .js', () => {
    const relativoSemExtensao = relative(REPO, ARQUIVO_SOLTO).replace(/\\/g, '/').replace(/\.js$/, '');
    const caminho = resolverCaminhoReceita(relativoSemExtensao);
    expect(caminho).toMatch(/receita-solta\.js$/);
  });

  it('resolve pasta com montagem.js por nome da pasta', () => {
    const caminho = resolverCaminhoReceita(NOME_PASTA);
    expect(caminho).toMatch(/receita-em-pasta[\\/]montagem\.js$/);
  });

  it('lança erro claro quando a receita não é encontrada', () => {
    expect(() => resolverCaminhoReceita('peca-que-nao-existe')).toThrowError(/não encontrada/i);
  });

  it('bloqueia tentativa de path traversal para fora do repo', () => {
    expect(() => resolverCaminhoReceita('../../../fora.js')).toThrowError(/confinamento|fora do repositório/i);
  });
});
