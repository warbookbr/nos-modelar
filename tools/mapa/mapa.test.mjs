/* mapa.test.mjs — o `--ajuda` do mapa imprime o uso e não regrava docs/MAPA.md (antes ele regravava o arquivo, análise do projeto de 2026-11-26). */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const MAPA = `${REPO}docs/MAPA.md`;

describe('mapa --ajuda', () => {
  it('imprime o uso e deixa o mapa como estava', () => {
    const antes = { texto: readFileSync(MAPA, 'utf8'), mtime: statSync(MAPA).mtimeMs };
    const saida = execFileSync(process.execPath, ['tools/mapa/mapa.mjs', '--ajuda'], { cwd: REPO, encoding: 'utf8' });
    expect(saida).toMatch(/npm run mapa:check/);
    expect(readFileSync(MAPA, 'utf8')).toBe(antes.texto);
    expect(statSync(MAPA).mtimeMs).toBe(antes.mtime);
  });
});
