/* imagem-pesada-no-git.test.mjs — nenhuma imagem rastreada passa de 3 MB: o git guarda para sempre o que entra, e agentes despachados já deixaram 26 MB de amostras numa pasta de prova (2026-10-19). */
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LIMITE = 3 * 1024 * 1024;

describe('imagens versionadas', () => {
  it('nenhuma imagem rastreada passa de 3 MB', () => {
    const arquivos = spawnSync('git', ['ls-files'], { encoding: 'utf8' }).stdout.split('\n').filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f));
    const pesadas = arquivos.map((f) => [f, statSync(f, { throwIfNoEntry: false })?.size ?? 0]).filter(([, t]) => t > LIMITE).map(([f, t]) => `${f} (${(t / 1048576).toFixed(1)} MB)`);
    expect(pesadas).toEqual([]);
  });
});
