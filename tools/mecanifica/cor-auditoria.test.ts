/* cor-auditoria.test.ts — a cor de auditoria é ENDEREÇO, não enfeite.
 *
 * Duas imagens da mesma peça, feitas em execuções diferentes, precisam usar a
 * mesma cor para a mesma parte; senão comparar as duas exige reler a legenda a
 * cada vez e a cor deixa de ser atalho. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo .js da bancada (sem tipos; roda puro no vitest/esbuild),
// mesma convenção que oficina.test.ts já usa para o motor v3.
import { corDeAuditoria } from '../../src/bancada/controlar-partes.js';

describe('cor de auditoria', () => {
  it('é determinística: o mesmo índice dá sempre a mesma cor', () => {
    expect(corDeAuditoria(3).getHexString()).toBe(corDeAuditoria(3).getHexString());
  });

  it('não repete cor entre as partes de uma montagem realista', () => {
    /* Doze partes cobre a cadeira (8) com folga. Se duas colidissem, a imagem
       diria que duas peças distintas são a mesma. */
    const vistas = new Set(Array.from({ length: 12 }, (_, i) => corDeAuditoria(i).getHexString()));
    expect(vistas.size).toBe(12);
  });

  it('mantém luminosidade parecida, para nenhuma parte sumir no fundo claro', () => {
    for (let i = 0; i < 12; i++) {
      const hsl = corDeAuditoria(i).getHSL({ h: 0, s: 0, l: 0 });
      expect(hsl.l).toBeCloseTo(0.55, 5);
      expect(hsl.s).toBeCloseTo(0.62, 5);
    }
  });
});
