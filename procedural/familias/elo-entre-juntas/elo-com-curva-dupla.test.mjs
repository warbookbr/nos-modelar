/* elo-com-curva-dupla.test.mjs — o elo com curva também na boca A (`desvioA`, `azimuteA`): com desvioA zero é o elo de antes, bit a bit;
 * o caminho é arco, trecho reto e arco, no plano das curvas, com a boca B a `comprimento` em y; a parede da casca fica em 2 mm; as portas
 * saem na normal de cada boca; e a curva que a seção não aguenta e o plano torcido são recusados dizendo o
 * recebido e o aceito. */
import { describe, expect, it } from 'vitest';
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { ELO_DA_COXA_EM_S, ELO_DA_COXA_EM_U } from '../../../tools/fixtures/elo-entre-juntas/elo-de-curva-dupla.mjs';
import { caminhoDuplo, quadroDaBoca, raiosDaCurvaDupla } from './geometria.js';
import { F, PADRAO, chamar, espessurasDaCasca, gerar, hash } from './medidas-do-elo-com-desvio.mjs';

const completo = (q) => ({ ...PADRAO, ...q });
const recusa = (parametros) => { try { chamar(F, 'e', parametros); } catch (e) { expect(e).toBeInstanceOf(ErroChamadaDeFamilia); return e; } throw new Error('não recusou'); };

describe('elo entre juntas com curva dupla', () => {
  it('desvioA zero (dito ou omitido) dá a malha de antes, bit a bit, com um desvio ou sem', () => {
    expect(hash(gerar({ desvioA: 0, azimuteA: 90 }))).toBe('f339de7fbab8a137807194a75aeb50c0e7ddd0471110514e4dd025e76ee01409');
    expect(hash(gerar({ desvioA: 0, desvio: 25, azimute: 30, cintura: 0.7 }))).toBe(hash(gerar({ desvio: 25, azimute: 30, cintura: 0.7 })));
    expect(chamar(F, 'e', { desvio: 25, desvioA: 0 }).composicao).toBe('elo-entre-juntas.desviado');
    expect(chamar(F, 'e', { desvioA: 10 }).composicao).toBe('elo-entre-juntas.curva-dupla');
  });

  it('na curva dupla o deslocamento lateral não entra: a malha é a mesma com ele ou sem', () => {
    expect(hash(gerar({ ...ELO_DA_COXA_EM_S, deslocamentoLateral: 30 }))).toBe(hash(gerar(ELO_DA_COXA_EM_S)));
  });

  it('a mesma chamada dá a mesma malha', () => {
    expect(hash(gerar(ELO_DA_COXA_EM_U))).toBe(hash(gerar(ELO_DA_COXA_EM_U)));
  });

  for (const [nome, elo, lado] of [['U', ELO_DA_COXA_EM_U, -1], ['S', ELO_DA_COXA_EM_S, 1]]) describe(`a coxa em ${nome}`, () => {
    const q = completo(elo);
    it('o caminho sai da boca A a 90° do eixo, chega à B a 90° e fecha o comprimento em y, com o trecho reto do meio positivo', () => {
      const { pontoB, total, livre } = caminhoDuplo(q);
      expect(pontoB[1]).toBeCloseTo(431, 6);
      expect(livre).toBeGreaterThan(100);
      expect(total).toBeGreaterThan(431);
      const A = quadroDaBoca(q, 'A'); const B = quadroDaBoca(q, 'B');
      expect(Math.abs(A.tangente[1])).toBeLessThan(1e-12);
      expect(Math.abs(B.tangente[1])).toBeLessThan(1e-12);
      expect(A.tangente[2] * B.tangente[2]).toBeCloseTo(lado, 9);
      expect(A.normal.map((x) => -x)).toEqual(A.tangente);
    });
    it('o raio de cada arco é 2,5 vezes a maior meia largura da seção na ponta', () => {
      const r = raiosDaCurvaDupla(q);
      expect(r.A).toBeCloseTo(2.5 * 35, 9);
      expect(r.B).toBeCloseTo(2.5 * 62, 9);
    });
    it('a parede da casca, medida por raio em todo o elo, fica em 2 mm (1,9 a 2,1) sem fechar nem afinar nas curvas', () => {
      const e = espessurasDaCasca(elo, 8);
      expect(e.length).toBeGreaterThan(500);
      expect(e[0]).toBeGreaterThan(1.9);
      expect(e.at(-1)).toBeLessThan(2.1);
    });
    it('a boca A e a boca B publicam a porta na normal do caminho', () => {
      const neutro = gerar(elo);
      const porta = (id) => [...neutro.portas.values?.() ?? Object.values(neutro.portas)].find((p) => p.id === id);
      const normalA = quadroDaBoca(q, 'A').normal; const normalB = quadroDaBoca(q, 'B').normal;
      expect(porta('boca-a').interface.plano.normal.map((v, i) => Math.abs(v - normalA[i]))).toEqual([0, 0, 0].map(() => expect.any(Number)));
      expect(Math.max(...porta('boca-a').interface.plano.normal.map((v, i) => Math.abs(v - normalA[i])))).toBeLessThan(1e-9);
      expect(Math.max(...porta('boca-b').interface.plano.normal.map((v, i) => Math.abs(v - normalB[i])))).toBeLessThan(1e-9);
    });
  });

  describe('recusas', () => {
    it('a curva dupla que não cabe no comprimento, dizendo o recebido e o aceito', () => {
      const e = recusa({ comprimento: 200, larguraDaSecao: 110, profundidadeDaSecao: 70, desvioA: 90, azimuteA: 0, desvio: 90, azimute: 180, diametroDaBocaB: 124, circuloDaBocaB: 112 });
      expect(e.restricao).toBe('curva-dupla-fecha-a-parede');
      expect(e.message).toContain('recebeu {');
      expect(e.message).toContain('"desvioA":90');
      expect(e.message).toMatch(/aceito: .* <= 0 \(o lado esquerdo vale [0-9.]+ e o direito 0\)/);
    });
    it('o comprimento que dá as duas curvas passa e o que falta um pouco não', () => {
      const base = { larguraDaSecao: 110, profundidadeDaSecao: 70, desvioA: 90, azimuteA: 0, desvio: 90, azimute: 180, diametroDaBocaB: 124, circuloDaBocaB: 112 };
      expect(() => chamar(F, 'e', { ...base, comprimento: 243 })).not.toThrow();
      expect(recusa({ ...base, comprimento: 242 }).restricao).toBe('curva-dupla-fecha-a-parede');
    });
    it('a curva só na boca A é aceita e a mesma curva em dois lados de planos diferentes é recusada', () => {
      expect(() => chamar(F, 'e', { comprimento: 300, desvioA: 60 })).not.toThrow();
      const e = recusa({ comprimento: 431, desvioA: 60, azimuteA: 0, desvio: 60, azimute: 90 });
      expect(e.restricao).toBe('curvas-no-mesmo-plano');
      expect(() => chamar(F, 'e', { comprimento: 431, desvioA: 60, azimuteA: 0, desvio: 60, azimute: 180 })).not.toThrow();
    });
    it('o desvioA e o azimuteA fora da faixa', () => {
      expect(() => chamar(F, 'e', { desvioA: 95 })).toThrow(/parametros\.desvioA/);
      expect(() => chamar(F, 'e', { azimuteA: 200 })).toThrow(/parametros\.azimuteA/);
    });
  });
});
