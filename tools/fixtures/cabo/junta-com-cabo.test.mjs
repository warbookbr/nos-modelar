/* junta-com-cabo.test.mjs — gate 3 do plano dos cabos, o arranjo que passa: dois atuadores de junta de 100 mm (a montagem de `duas-juntas.mjs`) com um cabo preso às portas `cabo` que a família do atuador publica, uma na carcaça de cada lado
 * da junta A, que se refaz em cada passo do curso de −90° a 90° com o mesmo comprimento, sem esticar, dobrar abaixo do raio mínimo, atravessar peça nem sair do centro da porta. Qualquer acusação da conferência reprova o teste e vem escrita
 * na mensagem. Os arranjos que falham estão em `junta-com-cabo-falhas.test.mjs`, a régua de alinhamento em `junta-com-cabo-alinhamento.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { conferirCursoDoCabo, refazerNoCurso } from '../../../procedural/familias/cabo/montagem.js';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

const { execucao, resolvida, problemas, declaracao, gerada } = prepararJuntaComCabo();
const norma = (a) => Math.hypot(...a);

describe('o cabo na junta, o arranjo que passa', () => {
  it('a montagem monta, com a porta de cabo que a família publica em cada carcaça e a junta A de −90° a 90°', () => {
    expect(problemas).toEqual([]);
    expect(declaracao.curso).toEqual({ minimo: -90, maximo: 90 });
    for (const id of ['carcacaA', 'carcacaB']) expect([...resolvida.instancias.find((i) => i.id === id).definicao.neutro.portas.keys()]).toContain('cabo');
    expect(gerada.articulacoes).toHaveLength(2);
  });

  it('as pontas do cabo seguem a porta: em cada passo a ponta B está no centro da porta da carcaça B (raio 22,32 mm, 85,5 mm de altura), girada pela junta', () => {
    const refeito = refazerNoCurso(resolvida, declaracao, ARRANJOS.passa.pedido, { passos: 6 });
    expect(refeito).toHaveLength(7);
    for (const p of refeito) { expect(Math.hypot(p.pedido.para.ponto[0], p.pedido.para.ponto[2])).toBeCloseTo(22.32, 3); expect(p.pedido.para.ponto[1]).toBeCloseTo(85.5, 3); }
    refeito.forEach((p, i) => {
      const angulo = (Math.atan2(-p.pedido.para.ponto[2], p.pedido.para.ponto[0]) * 180) / Math.PI;
      expect(angulo).toBeCloseTo(-90 + 30 * i, 3);
      /* a ponta A é o centro da ponta do cilindro de saída da carcaça A: x = 48 + 14 mm, na altura 10 + 0,3 · 55 mm, saindo para +x */
      expect(p.pedido.de.ponto[0]).toBeCloseTo(62, 6);
      expect(p.pedido.de.ponto[1]).toBeCloseTo(26.5, 6);
      expect(p.pedido.de.direcao).toEqual([1, 0, 0]);
      expect(norma(p.pedido.para.direcao)).toBeCloseTo(1, 9);
    });
  });

  it('RECUSA AUTOMÁTICA: o cabo se refaz em todo o curso com o mesmo comprimento e a conferência não acusa nada (qualquer acusação reprova, escrita)', () => {
    const r = conferirCursoDoCabo(resolvida, declaracao, ARRANJOS.passa.pedido, execucao);
    expect(r.legivel, `a conferência acusou:\n${r.legivel.join('\n')}`).toEqual([]);
    expect(r.falhas).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.posicoes.length).toBeGreaterThanOrEqual(25);
    for (const p of r.posicoes) expect(Math.abs(p.comprimentoDeCorte / 150 - 1)).toBeLessThan(0.005);
    expect(r.comprimento.desvio).toBeLessThan(0.005);
    const distancias = r.posicoes.map((p) => p.distanciaEntrePontas);
    expect(Math.max(...distancias) - Math.min(...distancias)).toBeGreaterThan(15);
    for (const p of r.posicoes) expect(p.raioMinimo).toBeGreaterThanOrEqual(9 - 1e-6);
    expect(r.segundos).toBeLessThan(60);
  }, 60000);

  it('é determinística: a mesma conferência dá o mesmo resultado', () => {
    const a = conferirCursoDoCabo(resolvida, declaracao, ARRANJOS.passa.pedido, execucao, { passos: 4 });
    const b = conferirCursoDoCabo(resolvida, declaracao, ARRANJOS.passa.pedido, execucao, { passos: 4 });
    expect({ ...a, segundos: 0 }).toEqual({ ...b, segundos: 0 });
  }, 60000);
});
