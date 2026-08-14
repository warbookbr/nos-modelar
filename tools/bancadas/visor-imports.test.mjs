import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const VISOR = resolve(RAIZ, 'prototipos/fps/v3/visor.html');

function importMapDoVisor() {
  const html = readFileSync(VISOR, 'utf8');
  const trecho = html.match(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/);
  if (!trecho) throw new Error('visor legado precisa declarar um import map');
  return { html, mapa: JSON.parse(trecho[1]) };
}

describe('imports do visor legado servido sem transformação', () => {
  it('resolve earcut antes de executar o módulo do visor', () => {
    const { html, mapa } = importMapDoVisor();
    const alvo = mapa.imports?.earcut;

    expect(alvo).toBe('/node_modules/earcut/src/earcut.js');
    expect(existsSync(resolve(RAIZ, alvo.slice(1)))).toBe(true);
    expect(html.indexOf('type="importmap"')).toBeLessThan(html.indexOf('type="module"'));
  });
});
