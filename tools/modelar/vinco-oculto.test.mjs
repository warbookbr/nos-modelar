/* vinco-oculto.test.mjs — a régua de vinco e chanfro não declarados sobre malhas pequenas feitas aqui: uma folha com uma dobra reta (o vinco que ninguém pediu),
 * uma folha com duas dobras próximas (o chanfro que ninguém pediu), a folha lisa, o vinco declarado e a imagem. A régua contra as peças de prova está em
 * `vinco-oculto-pecas.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { PADROES, desenharAchados, textoDoAchado, vincoOcultoDaSuperficie } from './vinco-oculto.mjs';

/* uma grade de 20 por 20 quadrados de `h` metros; a altura z é uma função de x, de modo que a dobra é uma linha reta de arestas */
function folha(altura, { h = 0.005, vincos = [] } = {}) {
  const n = 20; const vertices = []; const partes = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { vertices.push([i * h, j * h, altura(i * h)]); partes.push(new Set(['chapa'])); }
  const id = (i, j) => j * (n + 1) + i;
  const faces = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) faces.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]);
  return { vertices, faces, vincos, partes, gaiola: { vertices: [] }, nomeDe: () => null };
}
const rampa = (x0, x1, graus) => (x) => Math.tan((graus * Math.PI) / 180) * Math.min(Math.max(x - x0, 0), x1 - x0);

describe('vinco e chanfro não declarados', () => {
  it('uma dobra reta de 30 graus numa folha é um vinco não declarado, com a parte, a posição, o comprimento e o ângulo', () => {
    const r = vincoOcultoDaSuperficie(folha((x) => 0.3 * Math.abs(x - 0.05)));
    expect(r.chanfros).toEqual([]);
    expect(r.vincos).toHaveLength(1);
    expect(r.vincos[0]).toMatchObject({ tipo: 'vinco', parte: 'chapa', comprimentoMm: 100, arestas: 20 });
    expect(r.vincos[0].anguloMedioGraus).toBeGreaterThan(30);
    expect(r.vincos[0].anguloMedioGraus).toBeLessThan(40);
    expect(r.vincos[0].posicaoMm[0]).toBeCloseTo(50, 0);
    expect(textoDoAchado(r.vincos[0])).toMatch(/^vinco não declarado na parte chapa, em \[50; /);
  });

  it('duas dobras paralelas, com a faixa inclinada de 20 graus entre elas, são um chanfro não declarado, com a largura', () => {
    const r = vincoOcultoDaSuperficie(folha(rampa(0.035, 0.05, 20)));
    expect(r.vincos).toEqual([]);
    expect(r.chanfros).toHaveLength(1);
    expect(r.chanfros[0]).toMatchObject({ tipo: 'chanfro', parte: 'chapa', larguraMm: 16 });
    expect(r.chanfros[0].comprimentoMm).toBeCloseTo(100, 0);
  });

  it('a folha lisa, a curva suave e o vinco declarado não são achados', () => {
    expect(vincoOcultoDaSuperficie(folha(() => 0))).toMatchObject({ vincos: [], chanfros: [] });
    expect(vincoOcultoDaSuperficie(folha((x) => 0.5 * x * x * 10))).toMatchObject({ vincos: [], chanfros: [] });
    const declarado = folha((x) => 0.3 * Math.abs(x - 0.05));
    const meio = 10; const n1 = 21;
    declarado.vincos = Array.from({ length: 20 }, (_, j) => [j * n1 + meio, (j + 1) * n1 + meio, 1]);
    expect(vincoOcultoDaSuperficie(declarado)).toMatchObject({ vincos: [], chanfros: [] });
  });

  it('o limiar de comprimento deixa a cadeia curta de fora, e a saída é a mesma a cada chamada', () => {
    const a = vincoOcultoDaSuperficie(folha((x) => 0.3 * Math.abs(x - 0.05)), { comprimentoMinimoMm: 150 });
    expect(a.vincos).toEqual([]);
    expect(PADROES.comprimentoMinimoMm).toBe(80);
    const f = folha((x) => 0.3 * Math.abs(x - 0.05));
    expect(JSON.stringify(vincoOcultoDaSuperficie(f))).toBe(JSON.stringify(vincoOcultoDaSuperficie(f)));
  });

  it('a imagem pinta o vinco de vermelho e o chanfro de laranja sobre a malha em cinza', () => {
    const f = folha((x) => 0.3 * Math.abs(x - 0.05));
    const r = vincoOcultoDaSuperficie(f);
    const png = desenharAchados([{ sup: f, segmentos: r.segmentos }], { vista: 'iso', largura: 400, altura: 300 });
    let vermelhos = 0; let cinzas = 0;
    for (let i = 0; i < png.width * png.height; i++) {
      const [rr, g, b] = [png.data[4 * i], png.data[4 * i + 1], png.data[4 * i + 2]];
      if (rr > 200 && g < 60 && b < 60) vermelhos++; else if (rr < 160 && Math.abs(rr - g) < 20) cinzas++;
    }
    expect(vermelhos).toBeGreaterThan(50);
    expect(cinzas).toBeGreaterThan(1000);
  });
});
