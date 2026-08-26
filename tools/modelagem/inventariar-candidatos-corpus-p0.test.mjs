/* Inventário não promove uma evidência: só torna ausência e insuficiência visíveis. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inventariarCandidatosCorpusP0 } from './inventariar-candidatos-corpus-p0.mjs';

const raiz = resolve(import.meta.dirname, '..', '..');

describe('inventário de candidatas V-01..V-32', () => {
  it('cobre as 32 lições sem fazer nenhuma delas virar controle por contagem de arquivo', () => {
    const inventario = inventariarCandidatosCorpusP0();
    expect(inventario.candidatas).toHaveLength(32);
    expect(inventario.candidatas.every(({ elegivel }) => elegivel === false)).toBe(true);
    expect(inventario.candidatas.find(({ id }) => id === 'V-07')).toMatchObject({ evidenciasEncontradas: expect.arrayContaining([expect.stringMatching(/esfera-sintetica-zebra-frontal\.png$/)]) });
    expect(inventario.candidatas.find(({ id }) => id === 'V-16')).toMatchObject({ evidenciasEncontradas: expect.arrayContaining([expect.stringMatching(/neutra-conjunto-frontal\.png$/)]) });
    expect(JSON.parse(readFileSync(resolve(raiz, 'autoria-assistida/avaliacao/corpus-p0/inventario-v01-v32.json'), 'utf8'))).toEqual(inventario);
    expect(inventario.candidatas.flatMap(({ evidenciasEncontradas }) => evidenciasEncontradas).every((arquivo) => existsSync(resolve(raiz, arquivo)))).toBe(true);
  });
});
