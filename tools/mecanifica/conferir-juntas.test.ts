/* conferir-juntas.test.ts — testes para a ferramenta de medição e diagnóstico de juntas. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — JS legado.
import { nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';
// @ts-expect-error — módulo JS sem tipos.
import { analisarJuntas } from './conferir-juntas.mjs';

describe('conferir-juntas — analisarJuntas', () => {
  it('detecta junta selada coplanar entre dois cubos encostados', () => {
    const passos = [
      ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1, em: [0, 0.05, 0] }],
      ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, larg: 0.1, alt: 0.1, prof: 0.1, em: [0, 0.15, 0] }],
      ['parte', { nome: 'topo', sel: { origem: { op: 'cubo', id: 2 } } }],
    ];
    const st = nucleo(passos, {}, {}, {});
    const juntas = analisarJuntas(st);

    expect(juntas).toHaveLength(1);
    expect(juntas[0].parteA).toBe('base');
    expect(juntas[0].parteB).toBe('topo');
    expect(juntas[0].vaoMm).toBeLessThanOrEqual(0.01);
    expect(juntas[0].anguloDesvioGraus).toBeLessThanOrEqual(0.1);
    expect(juntas[0].status).toContain('SELADA');
  });

  it('detecta fresta quando há separação visível', () => {
    const passos = [
      ['cubo', { origemId: 1, larg: 0.1, alt: 0.1, prof: 0.1, em: [0, 0.05, 0] }],
      ['parte', { nome: 'base', sel: { origem: { op: 'cubo', id: 1 } } }],
      ['cubo', { origemId: 2, larg: 0.1, alt: 0.1, prof: 0.1, em: [0, 0.155, 0] }], // 5 mm acima
      ['parte', { nome: 'topo', sel: { origem: { op: 'cubo', id: 2 } } }],
    ];
    const st = nucleo(passos, {}, {}, {});
    const juntas = analisarJuntas(st);

    expect(juntas).toHaveLength(1);
    expect(juntas[0].vaoMm).toBeCloseTo(5.0, 1);
    expect(juntas[0].status).toContain('FRESTA');
  });
});
