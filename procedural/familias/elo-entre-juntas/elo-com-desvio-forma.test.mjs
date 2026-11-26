/* elo-com-desvio-forma.test.mjs — o elo curvo: a boca B no ponto e na direção do caminho, a parede na espessura pedida também na curva e a elíptica de 431 mm a 90° e o eixo em S sem órfão, lasca nem porta fora do lugar */
import { describe, expect, it } from 'vitest';
import { medirPonto } from '../../../tools/modelar/aprovacao-da-familia.mjs';
import { F, GRAUS, PADRAO, chamar, espessurasDaCasca, gerar } from './medidas-do-elo-com-desvio.mjs';
import { caminhoDoElo, giroDaBocaB } from './geometria.js';

describe('elo entre juntas com desvio, a forma', () => {
  for (const [nome, parametros] of [
    ['a elíptica de 431 mm a 90°, para +x', { comprimento: 431, larguraDaSecao: 100, profundidadeDaSecao: 80, desvio: 90, azimute: 90 }],
    ['só o deslocamento lateral de 30 mm (o eixo em S)', { deslocamentoLateral: 30, azimute: 120 }],
  ]) it(`a seção ${nome} sai com a parte elo num pedaço só, sem órfão, sem lasca e com as portas no lugar`, () => {
    const r = medirPonto(F, { ...PADRAO, ...parametros }, nome, { montagem: 'nenhuma' });
    expect(r.problemas.map((p) => `${p.codigo}: ${p.mensagem}`)).toEqual([]);
    expect(r.estado).toBe('ok');
  });

  it('a boca B sai no ponto e na direção do caminho, e a normal da porta é a tangente girada do desvio', () => {
    for (const parametros of [{ desvio: 25 }, { desvio: 40, azimute: 60, deslocamentoLateral: -20 }]) {
      const q = { ...PADRAO, ...parametros };
      const n = gerar(parametros);
      const I = n.portas.get('boca-b').interface;
      const { pontoB } = caminhoDoElo(q); const { tangente } = giroDaBocaB(q);
      expect(I.plano.ponto.map((v, i) => Math.abs(v * 1000 - pontoB[i])).every((d) => d < 1e-9)).toBe(true);
      expect(I.plano.normal.map((v, i) => Math.abs(v - tangente[i])).every((d) => d < 1e-9)).toBe(true);
      expect(pontoB[1]).toBeCloseTo(q.comprimento, 9);
      expect(Math.acos(tangente[1]) / GRAUS).toBeCloseTo(q.desvio, 9);
    }
  });

  it('a parede fica na espessura pedida também na curva, no meio e no desvio máximo do elo curto', () => {
    for (const parametros of [{ desvio: 25 }, { comprimento: 150, desvio: 60 }, { comprimento: 100, desvio: 36.7 }]) {
      const e = espessurasDaCasca({ ...PADRAO, ...parametros });
      const q = (f) => e[Math.floor(f * (e.length - 1))];
      expect(q(0.5), JSON.stringify(parametros)).toBeGreaterThan(1.95);
      expect(q(0.5), JSON.stringify(parametros)).toBeLessThan(2.05);
      expect(q(0.05), JSON.stringify(parametros)).toBeGreaterThan(1.7);
      expect(q(0.95), JSON.stringify(parametros)).toBeLessThan(2.4);
    }
  });
});
