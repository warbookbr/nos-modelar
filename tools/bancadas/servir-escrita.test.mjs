/* servir-escrita.test.mjs — o atendente escreve dentro do acervo, e só ali.
 *
 * Um atendente de escrita ligado no navegador sem essa porta é um jeito de
 * qualquer página aberta reescrever arquivo da máquina. O caso guardado é a
 * fuga por `..` e por caminho absoluto, que é como isso acontece na prática. */
import { describe, expect, it } from 'vitest';
import { caminhoNoAcervo } from './servir-escrita.mjs';

describe('atendente de escrita da bancada', () => {
  it('resolve peça do acervo pelo nome', () => {
    const caminho = caminhoNoAcervo('bicicleta-quadro');
    expect(caminho).toMatch(/prototipos\/procedural\/v3\/pecas\/bicicleta-quadro\.js$/);
  });

  it('RECUSA endereço que escapa da pasta do acervo', () => {
    for (const fuga of [
      '../../../package',
      '/etc/passwd',
      '../../../../../../tmp/qualquer',
      '',
      null,
    ]) {
      expect(caminhoNoAcervo(fuga)).toBe(null);
    }
  });

  it('nome com escape percentual continua DENTRO do acervo, e não vira fuga', () => {
    /* `..%2F..%2Fpackage` não é caminho, é um nome esquisito de arquivo: o
       `resolve` não desfaz escape percentual, então ele aterrissa dentro da
       pasta e vira um arquivo que não existe. A garantia que importa não é
       recusar a string, é o endereço final ficar dentro do acervo. */
    expect(caminhoNoAcervo('..%2F..%2Fpackage'))
      .toMatch(/prototipos\/procedural\/v3\/pecas\//);
  });

  it('aceita subpasta do acervo, que é onde montagem mora', () => {
    expect(caminhoNoAcervo('prensa/montagem')).toMatch(/pecas\/prensa\/montagem\.js$/);
  });
});
