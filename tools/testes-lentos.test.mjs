/* testes-lentos.test.mjs — a lista dos lentos aponta para arquivos que existem, e a bateria dos lentos roda todos onde precisa. */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { argumentosDoVitest, TESTES_LENTOS } from './testes-lentos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('a lista dos testes lentos', () => {
  it('só tem arquivos que existem, sem repetição', () => {
    expect(TESTES_LENTOS.filter((f) => !existsSync(join(RAIZ, f)))).toEqual([]);
    expect(new Set(TESTES_LENTOS).size).toBe(TESTES_LENTOS.length);
  });

  it('os lentos rodam todos no CI, com --completo e sem ramo remoto, e só os ligados ao que mudou fora disso', () => {
    const remoto = () => 'origin/ramo';
    expect(argumentosDoVitest('lentos', { ambiente: { CI: 'true' }, remoto }).args).toEqual(['run']);
    expect(argumentosDoVitest('lentos', { ambiente: { GATES_COMPLETO: '1' }, remoto }).args).toEqual(['run']);
    expect(argumentosDoVitest('lentos', { ambiente: {}, remoto: () => null }).args).toEqual(['run']);
    expect(argumentosDoVitest('lentos', { ambiente: {}, remoto }).args).toEqual(['run', '--changed', 'origin/ramo', '--passWithNoTests']);
    expect(argumentosDoVitest('rapidos', { ambiente: {}, remoto }).args).toEqual(['run']);
  });
});
