/* prancha-r4-independente.test.mjs — prova fria e mutações da prancha R4. */
import { describe, expect, it } from 'vitest';
import { prancha } from './prancha.mjs';
import { spec } from './prancha-r4-independente.mjs';

const copia = () => structuredClone(spec);

describe('R4 — autoria fria de quatro vistas', () => {
  it('produz uma prancha inédita, completa e sem alerta', () => {
    const { relatorio } = prancha(copia());
    expect(relatorio.alertas).toEqual([]);
    expect(relatorio.autoria.bloqueada).toBe(false);
  });

  it('não deixa a mutação de altura passar entre as projeções', () => {
    const mutada = copia();
    mutada.camadas.find((c) => c.nome === 'frenteDireita').pts[2][1] = 2050;
    expect(prancha(mutada).relatorio.alertas.join(' ')).toMatch(/coerência y|envelope/);
  });

  it('recusa a alegação de quatro vistas quando a traseira deixa de ter camada', () => {
    const mutada = copia();
    mutada.camadas = mutada.camadas.filter((c) => c.vista !== 'traseira');
    expect(() => prancha(mutada)).toThrow(/camada na vista traseira/);
  });
});
