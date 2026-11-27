/* junta-com-cabo.test.mjs — gate 3 do plano dos cabos, o arranjo que passa: dois atuadores de junta de 100 mm (a montagem de `duas-juntas.mjs`) com um cabo preso por portas, uma na carcaça de cada lado da junta A, que se
 * refaz em cada passo do curso de −90° a 90° com o mesmo comprimento, sem esticar, dobrar abaixo do raio mínimo nem atravessar peça. Os arranjos que falham, e a pose em que a conferência os acusa, estão em
 * `junta-com-cabo-falhas.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { conferirCursoDoCabo, refazerNoCurso } from '../../../procedural/familias/cabo/montagem.js';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

const { execucao, resolvida, problemas, declaracao, gerada } = prepararJuntaComCabo();
const norma = (a) => Math.hypot(...a);

describe('o cabo na junta, o arranjo que passa', () => {
  it('a montagem monta, com a porta de cabo nas carcaças e a junta A de −90° a 90°', () => {
    expect(problemas).toEqual([]);
    expect(declaracao.curso).toEqual({ minimo: -90, maximo: 90 });
    for (const id of ['carcacaA', 'carcacaB']) expect([...resolvida.instancias.find((i) => i.id === id).definicao.neutro.portas.keys()]).toContain('cabo');
    expect(gerada.articulacoes).toHaveLength(2);
  });

  it('as pontas do cabo seguem a porta: em cada passo a ponta B está no centro da porta da carcaça B, girada pela junta', () => {
    const refeito = refazerNoCurso(resolvida, declaracao, ARRANJOS.passa.pedido, { passos: 6 });
    expect(refeito).toHaveLength(7);
    const raios = refeito.map((p) => Math.hypot(p.pedido.para.ponto[0], p.pedido.para.ponto[2]));
    const alturas = refeito.map((p) => p.pedido.para.ponto[1]);
    for (const r of raios) expect(r).toBeCloseTo(22.4, 3);
    for (const y of alturas) expect(y).toBeCloseTo(88, 3);
    /* a ponta B gira em torno de y com a junta: o ângulo do passo é o do curso, e a ponta A não sai do lugar */
    refeito.forEach((p, i) => {
      const graus = -90 + 30 * i;
      const angulo = (Math.atan2(-p.pedido.para.ponto[2], p.pedido.para.ponto[0]) * 180) / Math.PI;
      expect(angulo).toBeCloseTo(graus, 3);
      expect(p.pedido.de.ponto[0]).toBeCloseTo(44, 6);
      expect(norma(p.pedido.de.direcao)).toBeCloseTo(1, 9);
    });
  });

  it('o cabo se refaz em cada passo do curso com o mesmo comprimento, e a conferência não acusa nada', () => {
    const r = conferirCursoDoCabo(resolvida, declaracao, ARRANJOS.passa.pedido, execucao);
    expect(r.legivel).toEqual([]);
    expect(r.falhas).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.posicoes).toHaveLength(25);
    for (const p of r.posicoes) expect(Math.abs(p.comprimentoDeCorte / 110 - 1)).toBeLessThan(0.005);
    expect(r.comprimento.desvio).toBeLessThan(0.005);
    /* a distância entre as pontas muda com a pose (a ponta B dá a volta) e o cabo continua o mesmo */
    const distancias = r.posicoes.map((p) => p.distanciaEntrePontas);
    expect(Math.max(...distancias) - Math.min(...distancias)).toBeGreaterThan(20);
    for (const p of r.posicoes) expect(p.raioMinimo).toBeGreaterThanOrEqual(9 - 1e-6);
    expect(r.segundos).toBeLessThan(60);
  }, 60000);

  it('é determinística: a mesma conferência dá o mesmo resultado', () => {
    const a = conferirCursoDoCabo(resolvida, declaracao, ARRANJOS.passa.pedido, execucao, { passos: 4 });
    const b = conferirCursoDoCabo(resolvida, declaracao, ARRANJOS.passa.pedido, execucao, { passos: 4 });
    expect({ ...a, segundos: 0 }).toEqual({ ...b, segundos: 0 });
  }, 60000);
});
