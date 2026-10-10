/* gates-saida-guardada.test.mjs — a saída inteira de um gate que falha vai para
   `tmp/gates/`, ignorado pelo git, e a linha de falha diz o caminho. Gate que
   passa não deixa arquivo. */
import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardarSaidaDoGate, linhaDeFalha } from '../gates.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* Área dentro do repositório, em `tmp/`, porque o git a ignora e ela some ao fim do teste. */
mkdirSync(join(REPO, 'tmp'), { recursive: true });
const AREA = mkdtempSync(join(REPO, 'tmp', 'teste-saida-guardada-'));

afterAll(() => {
  rmSync(AREA, { recursive: true, force: true });
});

/* Uma saída longa, com marcas no começo e no fim: se o arquivo perdesse o começo, a marca inicial sumiria. */
const SAIDA_LONGA = ['INICIO-DA-SAIDA', ...Array.from({ length: 400 }, (_, i) => `linha ${i}`), 'FIM-DA-SAIDA', ''].join('\n');

describe('saída de gate que falha', () => {
  it('grava a saída inteira num arquivo em tmp/gates e devolve o caminho', () => {
    const caminho = guardarSaidaDoGate('test', SAIDA_LONGA, 1, AREA);
    expect(caminho).toBe(join(AREA, 'tmp', 'gates', 'test.log'));
    expect(readFileSync(caminho, 'utf8')).toBe(SAIDA_LONGA);
  });

  it('o arquivo fica ignorado pelo git, então não entra no commit', () => {
    const caminho = guardarSaidaDoGate('test', SAIDA_LONGA, 1, AREA);
    const relativo = relative(REPO, caminho);
    const verificado = spawnSync('git', ['check-ignore', '-q', relativo], { cwd: REPO });
    expect(verificado.status).toBe(0);
  });

  it('o nome do arquivo não leva dois-pontos, que o Windows recusa no nome', () => {
    const caminho = guardarSaidaDoGate('mcp:visual:check', 'falhou', 1, AREA);
    expect(caminho).toBe(join(AREA, 'tmp', 'gates', 'mcp-visual-check.log'));
    expect(existsSync(caminho)).toBe(true);
  });

  it('a linha de falha diz o caminho do arquivo', () => {
    const caminho = guardarSaidaDoGate('test', SAIDA_LONGA, 1, AREA);
    expect(linhaDeFalha('test', caminho)).toBe(`▶ test — FALHOU; saída inteira em ${caminho}`);
  });

  it('gate que passa não cria arquivo e apaga o que uma falha anterior deixou', () => {
    guardarSaidaDoGate('build', SAIDA_LONGA, 1, AREA);
    const passou = guardarSaidaDoGate('build', 'tudo certo', 0, AREA);
    expect(passou).toBeNull();
    expect(existsSync(join(AREA, 'tmp', 'gates', 'build.log'))).toBe(false);
  });

  it('a pasta é criada quando ainda não existe', () => {
    const area = mkdtempSync(join(AREA, 'nova-'));
    expect(existsSync(join(area, 'tmp'))).toBe(false);
    const caminho = guardarSaidaDoGate('porteiro', 'x', 1, area);
    expect(readFileSync(caminho, 'utf8')).toBe('x');
  });
});
