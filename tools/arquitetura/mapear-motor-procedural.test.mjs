/* Guarda que o mapa R00 continue descrevendo a fachada procedural real. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { OPS } from '../../prototipos/procedural/v3/motor/oficina.js';
import { mapearMotorProcedural } from './mapear-motor-procedural.mjs';

describe('mapa estático do motor procedural', () => {
  it('expõe a fachada, operações e consumidores que a R00 precisa congelar', () => {
    const mapa = mapearMotorProcedural();
    expect(mapa.formato).toBe('mecanifica.mapa-motor-procedural');
    expect(mapa.operacoes.map(({ nome }) => nome).sort()).toEqual(Object.keys(OPS).sort());
    expect(mapa.exportacoes).toContain('nucleo');
    expect(mapa.exportacoes).toContain('neutroCanonico');
    expect(mapa.dependenciasDiretas).toEqual([
      './expressoes.js', './operacoes/atributos.js', './operacoes/edicao-direta.js',
      './operacoes/estruturais.js', './operacoes/geradores-avancados.js',
      './operacoes/primitivas-basicas.js', './operacoes/primitivas-superficie.js',
      './operacoes/transformacoes.js', './registro.js', 'earcut',
    ]);
    expect(mapa.consumidores).toContain('src/autoria/executar-receita.js');
  });

  it('não deixa corpo de operação no núcleo após a R03', () => {
    const fonte = readFileSync(new URL('../../prototipos/procedural/v3/motor/nucleo.js', import.meta.url), 'utf8');
    expect(fonte).not.toMatch(/^  [A-Za-z]\w*\(st, a, i\) \{/m);
  });
});
