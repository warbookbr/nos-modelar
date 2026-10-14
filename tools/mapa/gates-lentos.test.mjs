/* gates-lentos.test.mjs — depois do gate `test`, o resumo lista os cinco arquivos de teste mais lentos e avisa o que passa do teto,
   lendo a duração que o repórter `tools/vitest-duracoes.mjs` grava. */
import { describe, expect, it } from 'vitest';
import { arquivosMaisLentos, TETO_POR_ARQUIVO_DE_TESTE_MS } from '../gates.mjs';
import DuracoesDosTestes from '../vitest-duracoes.mjs';

describe('os arquivos de teste mais lentos no resumo dos gates', () => {
  const duracoes = [
    { arquivo: 'a.test.js', ms: 2_000 }, { arquivo: 'b.test.js', ms: TETO_POR_ARQUIVO_DE_TESTE_MS + 1 },
    { arquivo: 'c.test.js', ms: 9_000 }, { arquivo: 'd.test.js', ms: 1_000 }, { arquivo: 'e.test.js', ms: 3_000 },
    { arquivo: 'f.test.js', ms: 500 },
  ];

  it('lista os cinco mais lentos, do mais lento ao mais rápido', () => {
    const linhas = arquivosMaisLentos(duracoes);
    expect(linhas).toHaveLength(5);
    expect(linhas.map((l) => l.match(/\S+\.test\.js/)[0])).toEqual(['b.test.js', 'c.test.js', 'e.test.js', 'a.test.js', 'd.test.js']);
  });

  it('avisa só o arquivo que passa do teto, dizendo o teto e o que fazer', () => {
    const [primeira, segunda] = arquivosMaisLentos(duracoes);
    expect(primeira.startsWith('⚠')).toBe(true);
    expect(primeira).toContain(`passa de ${TETO_POR_ARQUIVO_DE_TESTE_MS / 1000}s`);
    expect(primeira).toContain('meça por etapa');
    expect(segunda.startsWith('⚠')).toBe(false);
  });

  it('o repórter do Vitest expõe o gancho do fim da execução', () => {
    expect(typeof new DuracoesDosTestes().onTestRunEnd).toBe('function');
  });
});
