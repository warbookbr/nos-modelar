/* juncao-de-tubos.test.mjs — o encontro em T de dois cilindros com arredondamento, construído das curvas exatas: a malha fecha,
   o volume confere com a conta do sólido e nenhuma face fica sem área. */
import { describe, expect, it } from 'vitest';
import { juncaoDeTubos } from './juncao-de-tubos.js';
import { estanqueidade, menorAreaDeFace, volumeDaMalha } from './medir-malha.js';

const BASE = { raioDoTronco: 95, comprimentoDoTronco: 400, raioDoRamo: 60, alturaDoRamo: 250, raio: 10, lados: 144 };

/* o volume da união sem arredondamento: o tronco mais a parte do ramo acima da parede do tronco, integrada no disco do ramo */
function volumeDaUniao({ raioDoTronco: Rt, comprimentoDoTronco: L, raioDoRamo: Rr, alturaDoRamo: H }) {
  const n = 4000;
  let soma = 0;
  for (let k = 0; k < n; k++) {
    const y = -Rr + ((k + 0.5) * 2 * Rr) / n;
    soma += 2 * Math.sqrt(Rr * Rr - y * y) * (H - Math.sqrt(Rt * Rt - y * y)) * ((2 * Rr) / n);
  }
  return Math.PI * Rt * Rt * L + soma;
}

describe('junção de tubos em T', () => {
  it('fecha, sem vértice solto, e toda face tem área', () => {
    const malha = juncaoDeTubos(BASE);
    expect(estanqueidade(malha)).toEqual({ arestasSoltas: 0, arestasDeMaisDeDuasFaces: 0, arestasNoMesmoSentido: 0, verticesSemFace: 0, fechada: true });
    expect(menorAreaDeFace(malha)).toBeGreaterThan(1);
    expect(new Set(malha.superficie)).toEqual(new Set(['arredondamento', 'cilindro', 'plano']));
    expect(malha.ladosDoRamo).toBe(92);
  });

  it('com o raio perto de zero o volume é o da união dos dois cilindros, e o raio de 10 acrescenta o material da costura', () => {
    const uniao = volumeDaUniao(BASE);
    const quaseSemRaio = volumeDaMalha(juncaoDeTubos({ ...BASE, raio: 0.001 }));
    /* o polígono de 144 lados tem 3,2e-4 a menos de área que o círculo, e o de 288, um quarto disso */
    expect(Math.abs(quaseSemRaio - uniao) / uniao).toBeLessThan(5e-4);
    expect(Math.abs(volumeDaMalha(juncaoDeTubos({ ...BASE, raio: 0.001, lados: 288 })) - uniao) / uniao).toBeLessThan(1.3e-4);
    const comRaio = volumeDaMalha(juncaoDeTubos(BASE));
    expect(comRaio - quaseSemRaio).toBeGreaterThan(3000);
    expect(comRaio - quaseSemRaio).toBeLessThan(6000);
  });

  it('os pontos do arredondamento ficam na esfera que rola: a raio do centro dela, e os contatos sobre os dois cilindros', () => {
    const malha = juncaoDeTubos({ ...BASE, paineis: 4 });
    const { raioDoTronco: Rt, raioDoRamo: Rr, raio: r } = BASE;
    const doArredondamento = new Set();
    malha.F.forEach((f, i) => { if (malha.superficie[i] === 'arredondamento') f.forEach((v) => doArredondamento.add(v)); });
    expect(doArredondamento.size).toBe(92 * 5);
    const centros = Array.from({ length: 92 }, (_, j) => { const t = (2 * Math.PI * j) / 92; return [(Rr + r) * Math.cos(t), (Rr + r) * Math.sin(t), Math.sqrt((Rt + r) ** 2 - ((Rr + r) * Math.sin(t)) ** 2)]; });
    for (const v of doArredondamento) {
      const [x, y, z] = malha.V[v];
      /* fora dos dois cilindros ou sobre eles */
      expect(Math.hypot(y, z)).toBeGreaterThan(Rt - 1e-9);
      expect(Math.hypot(x, y)).toBeGreaterThan(Rr - 1e-9);
      /* alguma estação tem o centro da esfera a r deste ponto */
      expect(Math.min(...centros.map((S) => Math.abs(Math.hypot(x - S[0], y - S[1], z - S[2]) - r)))).toBeLessThan(1e-9);
    }
  });

  it('com os dois raios iguais o arredondamento some nos dois pontos de tangência, e a malha continua fechada e sem face nula', () => {
    const malha = juncaoDeTubos({ ...BASE, raioDoRamo: 95 });
    expect(estanqueidade(malha).fechada).toBe(true);
    expect(estanqueidade(malha).verticesSemFace).toBe(0);
    expect(menorAreaDeFace(malha)).toBeGreaterThan(0.1);
  });

  it('é determinística e recusa o que não cobre', () => {
    expect(JSON.stringify(juncaoDeTubos(BASE))).toBe(JSON.stringify(juncaoDeTubos(BASE)));
    expect(() => juncaoDeTubos({ ...BASE, raioDoRamo: 96 })).toThrow(/raioDoRamo: 96 passa do raio do tronco 95/);
    expect(() => juncaoDeTubos({ ...BASE, comprimentoDoTronco: 150 })).toThrow(/comprimentoDoTronco: o arredondamento alcança 70 .* veio 150/);
    expect(() => juncaoDeTubos({ ...BASE, alturaDoRamo: 100 })).toThrow(/alturaDoRamo: o arredondamento sobe até 105/);
  });
});
