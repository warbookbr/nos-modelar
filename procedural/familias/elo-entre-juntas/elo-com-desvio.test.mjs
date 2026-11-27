/* elo-com-desvio.test.mjs — a família `elo-entre-juntas` com o eixo em curva (`desvio`, `azimute`, `deslocamentoLateral`): o desvio zero é o elo reto de antes, bit a bit, a mesma chamada dá a mesma malha, e a curva que a seção não aguenta é recusada dizendo o recebido e o aceito (a forma está em `elo-com-desvio-forma.test.mjs` e `elo-com-desvio-secoes.test.mjs`) */
import { describe, expect, it } from 'vitest';
import { ErroChamadaDeFamilia } from '../../../src/autoria/chamar-familia.js';
import { F, chamar, gerar, hash } from './medidas-do-elo-com-desvio.mjs';

describe('elo entre juntas com desvio', () => {
  it('o desvio zero e o deslocamento zero dão a malha do elo reto de antes, bit a bit', () => {
    expect(hash(gerar({}))).toBe('f339de7fbab8a137807194a75aeb50c0e7ddd0471110514e4dd025e76ee01409');
    expect(hash(gerar({ secao: 2, cintura: 1.3 }))).toBe('8e3a782ee95a291aa14dacc58a9a6d1f4ed7b4c1495b26d7d12a592d17290d63');
    expect(hash(gerar({ secao: 3, comprimento: 300, larguraDaSecao: 100, profundidadeDaSecao: 80, azimute: 40 }))).toBe('85eef47d888a16a646b7de4b8ea5cfc32493fccb3523bc6746044d33499b91da');
    expect(chamar(F, 'e', {}).composicao).toBe('elo-entre-juntas.reto');
    expect(chamar(F, 'e', { desvio: 10 }).composicao).toBe('elo-entre-juntas.desviado');
  });

  it('a mesma chamada dá a mesma malha', () => {
    expect(hash(gerar({ desvio: 25, azimute: 30, cintura: 0.7 }))).toBe(hash(gerar({ desvio: 25, azimute: 30, cintura: 0.7 })));
  });

  describe('recusas', () => {
    const recusa = (parametros) => { try { chamar(F, 'e', parametros); } catch (e) { expect(e).toBeInstanceOf(ErroChamadaDeFamilia); return e; } throw new Error('não recusou'); };

    it('o desvio que a seção não aguenta no comprimento dado', () => {
      const e = recusa({ comprimento: 100, desvio: 40 });
      expect(e.restricao).toBe('curva-fecha-a-parede');
      expect(e.message).toContain('recebeu {');
      expect(e.message).toContain('"desvio":40');
      expect(e.message).toMatch(/aceito: .* <= max\(0, 2 - forma\) \* \(0\.4 \* .* \(o lado esquerdo vale [0-9.]+ e o direito [0-9.]+\)/);
    });
    it('o desvio máximo aceito do elo curto passa e o décimo de grau acima não', () => {
      expect(() => chamar(F, 'e', { comprimento: 100, desvio: 36.7 })).not.toThrow();
      expect(recusa({ comprimento: 100, desvio: 36.9 }).restricao).toBe('curva-fecha-a-parede');
    });
    it('o deslocamento lateral que dobra o eixo demais, para os dois lados (o azimute vira o lado)', () => {
      expect(recusa({ comprimento: 100, deslocamentoLateral: 40 }).restricao).toBe('curva-fecha-a-parede');
      expect(recusa({ comprimento: 100, deslocamentoLateral: 40, azimute: 180 }).restricao).toBe('curva-fecha-a-parede');
      expect(() => chamar(F, 'e', { deslocamentoLateral: 40 })).not.toThrow();
      expect(() => chamar(F, 'e', { deslocamentoLateral: -1 })).toThrow(/parametros\.deslocamentoLateral/);
    });
    it('o desvio acima do teto do contrato e o azimute fora da faixa', () => {
      expect(() => chamar(F, 'e', { desvio: 95 })).toThrow(/parametros\.desvio/);
      expect(() => chamar(F, 'e', { azimute: 200 })).toThrow(/parametros\.azimute/);
    });
  });
});
