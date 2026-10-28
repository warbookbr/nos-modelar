/* gates-ordem.test.mjs — os gates baratos rodam antes e os caros do mais longo para o mais curto (tools/gates.mjs). */
import { describe, expect, it } from 'vitest';
import { DEPENDE_DE, separarEstagios, TETO_DO_ESTAGIO_BARATO_MS } from '../gates.mjs';

describe('separarEstagios', () => {
  it('põe no estágio barato só o que foi medido abaixo do teto', () => {
    const { baratos, caros } = separarEstagios(['a', 'b', 'c'], { a: 800, b: TETO_DO_ESTAGIO_BARATO_MS + 1 });
    expect(baratos).toEqual(['a']);
    expect(caros).toEqual(['c', 'b']);
  });

  it('ordena os caros do mais longo para o mais curto, os nunca medidos à frente', () => {
    const { caros } = separarEstagios(['curto', 'novo', 'longo', 'medio'], { curto: 9_000, longo: 300_000, medio: 60_000 });
    expect(caros).toEqual(['novo', 'longo', 'medio', 'curto']);
  });

  it('gate que depende de um caro fica no estágio caro', () => {
    const [gate, anterior] = Object.entries(DEPENDE_DE)[0];
    const { baratos, caros } = separarEstagios([anterior, gate], { [anterior]: 20_000, [gate]: 100 });
    expect(baratos).toEqual([]);
    expect(caros).toEqual([anterior, gate]);
  });

  it('sem medida nenhuma, tudo é caro na ordem da lista', () => {
    expect(separarEstagios(['x', 'y'], {})).toEqual({ baratos: [], caros: ['x', 'y'] });
  });
});

describe('o pesado fica para o CI', () => {
  it('só nomeia gates da lista, e a lista do CI continua tendo todos', async () => {
    const { GATES, PESADOS_PARA_O_CI } = await import('../gates.mjs');
    expect(PESADOS_PARA_O_CI.filter((g) => !GATES.includes(g))).toEqual([]);
    expect(PESADOS_PARA_O_CI).toContain('test:lentos');
  });
});
