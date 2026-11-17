/* medida-na-curva.test.mjs — a medida da emenda na curva declarada (fatia 5 do plano das ferramentas de correção de superfície), pelo neutro
 * marcado (`marcarCurvas`) e pela superfície limite exata: nas chapas emendadas a curva `emenda` é achada (não a borda entre as partes), o
 * salto de curvatura é zero onde a subdivisão é C2, e a rampa é o que distingue a superfície G1 da G2; a marca não muda a malha. */
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { neutroCanonico } from '../../../procedural/nucleo/entrada.js';
import { receitaDeProva } from './chapas.mjs';
import { medirCurvasDaReceita } from './medida-na-curva.mjs';

const emenda = (nome) => {
  const [chapa] = medirCurvasDaReceita(receitaDeProva(nome, { marcarCurvas: true }), { curvas: ['emenda'] });
  return chapa.curvas.find((c) => c.nome === 'emenda');
};

describe('a medida na curva declarada', () => {
  it('a marca não muda a malha da chapa', () => {
    const sem = executarReceita(receitaDeProva('emenda-g1')).neutro; const com = executarReceita(receitaDeProva('emenda-g1', { marcarCurvas: true })).neutro;
    expect(JSON.stringify(neutroCanonico(com))).toBe(JSON.stringify(neutroCanonico(sem)));
    expect(com.chapas[0].curvas.map((c) => c.nome)).toContain('emenda');
  });

  it('a curva da emenda: dois lados, salto zero e ângulo zero na lisa; o vinco vivo da G0 dá o ângulo', () => {
    for (const nome of ['emenda-g1', 'emenda-g2', 'emenda-g1-declarada', 'emenda-g2-declarada']) {
      const m = emenda(nome);
      expect(m.lados, nome).toBe(2);
      expect(m.medidas, nome).toBeGreaterThan(200);
      expect(m.salto, nome).toBeLessThan(1e-12);
      expect(m.anguloMaximoGraus, nome).toBeLessThan(1e-6);
      expect(m.singularesPerto, nome).toBe(0);
    }
    expect(emenda('emenda-g0').anguloMaximoGraus).toBeGreaterThan(6);
  });

  it('a rampa: a G1 (razão 3) sobe a curvatura de um lado ao outro, e a G2 declarada é a mais plana (3,1 contra 6,6 da G2 sem declaração, fora da faixa da borda)', () => {
    const g1 = emenda('emenda-g1'); const g2 = emenda('emenda-g2'); const g2d = emenda('emenda-g2-declarada');
    expect(g1.inclinacaoForaDosSingulares).toBeGreaterThan(2 * g2.inclinacaoForaDosSingulares);
    /* o lugar do máximo: fora da faixa da borda livre (a mais de `afastamentoDaBordaMm` das duas pontas da curva, que termina na borda), e o
       máximo da faixa da borda, à parte, sai na ponta, onde a curvatura ainda sobe de zero; sem o afastamento, ele seria o da curva */
    for (const [nome, m] of [['emenda-g1', g1], ['emenda-g2', g2]]) {
      const z = m.ondeInclinacaoForaDosSingulares.pontoMm[2];
      expect(m.afastamentoDaBordaMm, nome).toBeCloseTo(2 * m.faixaMm, 3);
      expect(Math.min(z, m.comprimentoMm - z), nome).toBeGreaterThanOrEqual(m.afastamentoDaBordaMm - 1);
      const zb = m.ondeInclinacaoNaBorda.pontoMm[2];
      expect(Math.min(zb, m.comprimentoMm - zb), nome).toBeLessThan(2);
      expect(m.inclinacaoNaBorda, nome).toBeGreaterThan(2 * m.inclinacaoForaDosSingulares);
    }
    /* na G1 declarada o máximo é o da curva, no meio da chapa, e a faixa da borda não passa dele */
    expect(emenda('emenda-g1-declarada').inclinacaoNaBorda).toBeLessThanOrEqual(emenda('emenda-g1-declarada').inclinacaoForaDosSingulares);
    expect(g2d.inclinacaoForaDosSingulares).toBeLessThan(g2.inclinacaoForaDosSingulares / 2);
    /* na G1 a curvatura na borda da faixa fica entre a de cada lado desenhada (2 e 0,67 1/m), e na curva, entre as duas */
    const [a, b] = g1.curvaturaNaFaixa;
    expect(Math.min(a, b)).toBeLessThan(g1.curvaturaNaLinha);
    expect(g1.curvaturaNaLinha).toBeLessThan(Math.max(a, b));
  });

  it('a chapa simétrica: a curva espelhada vem medida, igual à direta', () => {
    const [chapa] = medirCurvasDaReceita(receitaDeProva('chapa-simetrica-espelhada', { marcarCurvas: true }), { curvas: ['ombro'] });
    const ombro = chapa.curvas.filter((c) => c.nome === 'ombro');
    expect(ombro.map((c) => c.espelho)).toEqual([false, true]);
    expect(ombro[1].inclinacaoForaDosSingulares).toBeCloseTo(ombro[0].inclinacaoForaDosSingulares, 6);
    expect(Math.max(...ombro.map((c) => c.salto))).toBeLessThan(1e-12);
  });
});
