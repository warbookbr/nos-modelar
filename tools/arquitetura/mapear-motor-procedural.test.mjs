/* Guarda que o mapa R00 continue descrevendo a fachada procedural real. */
import { describe, expect, it } from 'vitest';
import { OPS } from '../../prototipos/procedural/v3/motor/oficina.js';
import { mapearMotorProcedural } from './mapear-motor-procedural.mjs';

describe('mapa estático do motor procedural', () => {
  it('expõe a fachada, operações e consumidores que a R00 precisa congelar', () => {
    const mapa = mapearMotorProcedural();
    expect(mapa.formato).toBe('mecanifica.mapa-motor-procedural');
    expect(mapa.operacoes.map(({ nome }) => nome)).toEqual(Object.keys(OPS));
    expect(mapa.exportacoes).toContain('nucleo');
    expect(mapa.exportacoes).toContain('neutroCanonico');
    expect(mapa.dependenciasDiretas).toEqual(['./expressoes.js', './registro.js', 'earcut']);
    expect(mapa.consumidores).toContain('src/autoria/executar-receita.js');
  });
});
