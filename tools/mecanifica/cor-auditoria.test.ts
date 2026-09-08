/* cor-auditoria.test.ts — a cor de auditoria é ENDEREÇO, não enfeite.
 *
 * Duas imagens da mesma peça, feitas em execuções diferentes, precisam usar a
 * mesma cor para a mesma parte; senão comparar as duas exige reler a legenda a
 * cada vez e a cor deixa de ser atalho. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo .js da bancada (sem tipos; roda puro no vitest/esbuild),
// mesma convenção que oficina.test.ts já usa para o motor v3.
import { corDeAuditoria } from '../../src/bancada/controlar-partes.js';
// @ts-expect-error — mesma convenção da linha acima: módulo .js sem tipos.
import { LIMIAR_DISTINCAO, distanciaDeCor } from '../../src/bancada/cor-de-auditoria.js';

/* O cinza claro sobre o qual a auditoria desenha. */
const FUNDO_DA_BANCADA = '#f2f2f2';

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

  it('nenhuma parte some no fundo claro', () => {
    /* Este teste cobrava luminosidade FIXA em 0,55 e saturação fixa em 0,62 —
       travava a implementação, não o requisito. E a implementação travada era
       justamente a que confundia partes vizinhas em peças grandes: na
       bicicleta, `garfo` e `tirante` saíram a 0,079 de distância e o crítico
       visual cego leu os dois como uma peça só.
       O requisito de verdade é o que o nome sempre disse: contraste contra o
       fundo. Ele é cobrado agora com o mesmo instrumento que mede a separação
       entre partes, e a paleta pode variar claro/escuro à vontade desde que
       nenhuma cor chegue perto do fundo. */
    const margens = Array.from({ length: 12 }, (_, i) => ({
      i, d: distanciaDeCor(`#${corDeAuditoria(i).getHexString()}`, FUNDO_DA_BANCADA),
    }));
    for (const { i, d } of margens) {
      expect(d, `parte ${i} contra o fundo`).toBeGreaterThan(LIMIAR_DISTINCAO);
    }
    /* A folga mais apertada é a da faixa clara da paleta, medida em 0,139 — só
       16% acima do limiar. Fica travada aqui: quem clarear a paleta mais um
       pouco descobre por este teste, e não por uma peça que sumiu na imagem. */
    expect(Math.min(...margens.map((m) => m.d))).toBeGreaterThan(0.13);
  });

  it('separa partes vizinhas, que é para o que a cor serve', () => {
    for (let i = 0; i < 11; i++) {
      const a = `#${corDeAuditoria(i).getHexString()}`;
      const b = `#${corDeAuditoria(i + 1).getHexString()}`;
      expect(distanciaDeCor(a, b), `${i}→${i + 1}`).toBeGreaterThan(LIMIAR_DISTINCAO);
    }
  });
});
