/* `--vista <vista>` sozinho grava a vista isolada do esboço inteiro na pasta de `--saida`. Antes a linha caía na leitura padrão,
   imprimia o gate e não gravava nada (atrito do esbocista na caçamba do carrinho de mão, 2026-10-09). */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../../../tools/mecanifica/esboco.mjs', import.meta.url));
const FIXTURE = fileURLToPath(new URL('./fixtures/teste-cubo.esboco.json', import.meta.url));

describe('--vista sozinho', () => {
  it('grava só a vista pedida, na largura e na pasta dadas', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'vista-isolada-'));
    const arquivo = join(pasta, 'cubo.esboco.json');
    copyFileSync(FIXTURE, arquivo);
    const saida = join(pasta, 'vistas');
    const r = spawnSync(process.execPath, [CLI, arquivo, '--vista', 'lateral', '--largura', '400', '--saida', saida], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(saida)).toBe(true);
    const pngs = readdirSync(saida).filter((n) => n.endsWith('.png'));
    expect(pngs).toEqual(['cubo-lateral.png']);
  }, 60000);
});
