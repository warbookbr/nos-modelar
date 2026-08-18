/* Guarda determinismo e compatibilidade da linha de base R00 do núcleo. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OPS } from '../../prototipos/procedural/v3/motor/oficina.js';
import { baselineMotorR00, casosMotorR00, executarCorpusMotorR00 } from './corpus-motor-r00.mjs';

describe('corpus sintético do motor — R00', () => {
  it('cobre cada operação publicada exatamente uma vez', () => {
    expect(casosMotorR00.flatMap(({ operacoes }) => operacoes)).toEqual(Object.keys(OPS));
  });

  it('é determinístico e preserva a linha de base canônica', () => {
    const esperado = JSON.parse(readFileSync(new URL('./fixtures/motor-r00-baseline.json', import.meta.url), 'utf8'));
    expect(executarCorpusMotorR00()).toEqual(executarCorpusMotorR00());
    expect(baselineMotorR00()).toEqual(esperado);
  });
});
