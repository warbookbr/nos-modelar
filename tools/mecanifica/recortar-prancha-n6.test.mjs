/* Garante que a prancha aprovada não volte a ser consumida como mosaico. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { recortarPranchaN6 } from './recortar-prancha-n6.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('pacote visual N6', () => {
  it('produz cinco vistas individuais vinculadas à prancha aprovada', () => {
    const manifesto = recortarPranchaN6();
    expect(manifesto.aprovacaoUsuario.estado).toBe('aprovada');
    expect(manifesto.vistas.map(({ id }) => id)).toEqual(['frontal', 'lateral-direita', 'traseira', 'superior', 'perspectiva-frontal-direita']);
    for (const vista of manifesto.vistas) {
      const arquivo = resolve(raiz, 'autoria-assistida', 'alvos', 'n6-cupe-esportivo', vista.arquivo);
      expect(existsSync(arquivo)).toBe(true);
      expect(createHash('sha256').update(readFileSync(arquivo)).digest('hex')).toBe(vista.sha256);
    }
  });
});
