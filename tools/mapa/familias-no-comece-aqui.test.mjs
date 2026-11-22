/* familias-no-comece-aqui.test.mjs — a página de entrada conta e nomeia as famílias registradas: ela disse "7 famílias"
 * com oito no registro, e só a leitura de 2026-11-22 achou. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FAMILIAS } from '../../procedural/familias/index.js';

describe('docs/COMECE-AQUI.md e o registro de famílias', () => {
  it('o número de famílias da página é o do registro', () => {
    const texto = readFileSync(new URL('../../docs/COMECE-AQUI.md', import.meta.url), 'utf8');
    const m = /Há (\d+) \[famílias\]/.exec(texto);
    expect(m, 'a frase "Há N [famílias]" sumiu da página').not.toBeNull();
    expect(Number(m[1]), `a página diz ${m[1]} e o registro tem ${FAMILIAS.length}: atualize a frase e a lista de nomes`).toBe(FAMILIAS.length);
  });
});
