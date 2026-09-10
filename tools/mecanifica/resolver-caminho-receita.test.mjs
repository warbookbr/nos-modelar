/* resolver-caminho-receita.test.mjs — testes unitários para resolução flexível e segura de receitas procedurais. */
import { describe, expect, it } from 'vitest';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

describe('resolverCaminhoReceita', () => {
  it('resolve caminho relativo existente diretamente', () => {
    const caminho = resolverCaminhoReceita('tools/fixtures/acervo/chapa-de-fixacao.js');
    expect(caminho).toMatch(/chapa-de-fixacao\.js$/);
  });

  it('resolve nome simples de peça sem extensão', () => {
    const caminho = resolverCaminhoReceita('chapa-de-fixacao');
    expect(caminho).toMatch(/tools[\\/]fixtures[\\/]acervo[\\/]chapa-de-fixacao\.js$/);
  });

  it('resolve nome de peça com extensão .js', () => {
    const caminho = resolverCaminhoReceita('chapa-de-fixacao.js');
    expect(caminho).toMatch(/tools[\\/]fixtures[\\/]acervo[\\/]chapa-de-fixacao\.js$/);
  });

  it('resolve pasta com montagem.js por nome da pasta', () => {
    const caminho = resolverCaminhoReceita('prensa-mecanica-industrial');
    expect(caminho).toMatch(/tools[\\/]fixtures[\\/]acervo[\\/]prensa-mecanica-industrial[\\/]montagem\.js$/);
  });

  it('lança erro claro quando a receita não é encontrada', () => {
    expect(() => resolverCaminhoReceita('peca-que-nao-existe')).toThrowError(/não encontrada/i);
  });

  it('bloqueia tentativa de path traversal para fora do repo', () => {
    expect(() => resolverCaminhoReceita('../../../fora.js')).toThrowError(/confinamento|fora do repositório/i);
  });
});
