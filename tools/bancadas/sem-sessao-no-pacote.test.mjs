/* sem-sessao-no-pacote.test.mjs — o pacote sai sem a sessão de quem construiu. */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { ARQUIVO_DA_SESSAO, semSessaoNoPacote } from './sem-sessao-no-pacote.mjs';

it('apaga a sessão copiada de public/ e deixa o resto do pacote', () => {
  const saida = mkdtempSync(join(tmpdir(), 'pacote-'));
  writeFileSync(join(saida, ARQUIVO_DA_SESSAO), '{"alvo":{"nome":"outra-peca"}}');
  writeFileSync(join(saida, 'bancada.html'), '<html></html>');
  semSessaoNoPacote({ saida }).closeBundle();
  expect(existsSync(join(saida, ARQUIVO_DA_SESSAO))).toBe(false);
  expect(existsSync(join(saida, 'bancada.html'))).toBe(true);
  rmSync(saida, { recursive: true, force: true });
});
