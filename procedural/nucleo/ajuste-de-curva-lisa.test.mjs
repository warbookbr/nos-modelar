/* ajuste-de-curva-lisa.test.mjs — o ajuste de curva lisa em curvas analíticas conhecidas (arco, clotoide, elipse, S), limpas e com ruído de leitura, com o número
 * de inflexões certo e o desvio de cada ponto dentro da tolerância; a curva que `gaiolaPorRede` consome; as recusas; e a planta da lataria do carro-fastback,
 * lida da TABELA da receita (só leitura), dentro dos 3 mm. */
import { describe, expect, it } from 'vitest';
import { ajustarCurvaLisa } from './ajuste-de-curva-lisa.js';
import { gaiolaPorRede } from './gaiola-por-rede.js';

const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));
const ruido = (pontos, amplitude) => pontos.map(([u, v], i) => [u + amplitude * Math.sin(i * ANGULO_AUREO), v + amplitude * Math.cos(i * ANGULO_AUREO * 1.7)]);
const arco = (R, graus, n) => Array.from({ length: n }, (_, i) => { const a = ((i / (n - 1)) * graus * Math.PI) / 180; return [R * Math.sin(a), R * (1 - Math.cos(a))]; });
const clotoide = (n, L, k0, k1) => {
  let x = 0; let y = 0; let th = 0; const h = L / n; const saida = [[0, 0]];
  for (let i = 0; i < n; i += 1) { const k = k0 + ((k1 - k0) * (i + 0.5)) / n; th += (k * h) / 2; x += Math.cos(th) * h; y += Math.sin(th) * h; th += (k * h) / 2; saida.push([x, y]); }
  return saida;
};
const elipse = (a, b, n) => Array.from({ length: n }, (_, i) => { const t = (i / (n - 1)) * (Math.PI / 2) * 0.9; return [a * Math.cos(t), b * Math.sin(t)]; });

const CASOS = [
  { nome: 'arco de 500 mm e 90 graus', pontos: arco(500, 90, 60), inflexoes: 0, clotoides: 1 },
  { nome: 'clotoide de curvatura 1/800 a 1/300', pontos: clotoide(60, 700, 1 / 800, 1 / 300), inflexoes: 0, clotoides: 1 },
  { nome: 'quarto de elipse de 600 por 250 mm', pontos: elipse(600, 250, 70), inflexoes: 0 },
  { nome: 'S de curvatura -1/400 a 1/400 em 800 mm', pontos: clotoide(80, 800, -1 / 400, 1 / 400), inflexoes: 1, clotoides: 1 },
];

describe('ajustarCurvaLisa nas curvas analíticas', () => {
  for (const caso of CASOS) {
    for (const [rotulo, pontos, tolerancia] of [['limpa', caso.pontos, 0.5], ['com ruído de 0,3 mm', ruido(caso.pontos, 0.3), 1]]) {
      it(`${caso.nome}, ${rotulo}: ${caso.inflexoes} inflexão(ões) e todo ponto dentro de ${tolerancia} mm`, () => {
        const a = ajustarCurvaLisa(pontos, { tolerancia });
        expect(a.cabe).toBe(true);
        expect(a.inflexoes).toBe(caso.inflexoes);
        expect(Math.max(...a.desvios.map(Math.abs))).toBeLessThanOrEqual(tolerancia);
        expect(a.desvioMaximo).toBeLessThanOrEqual(tolerancia);
        expect(a.desvios).toHaveLength(pontos.length);
        if (caso.clotoides) expect(a.clotoides.length).toBeLessThanOrEqual(caso.clotoides + 1);
        expect(a.trechos.length).toBeLessThanOrEqual(3);
      });
    }
  }

  it('recupera as curvaturas do arco e da clotoide', () => {
    const a = ajustarCurvaLisa(arco(500, 90, 60), { tolerancia: 0.5 });
    expect(a.joelhos.every((j) => Math.abs(j.k - 1 / 500) < 2e-5)).toBe(true);
    const c = ajustarCurvaLisa(clotoide(60, 700, 1 / 800, 1 / 300), { tolerancia: 0.5 });
    expect(c.joelhos[0].k).toBeCloseTo(1 / 800, 4);
    expect(c.joelhos[c.joelhos.length - 1].k).toBeCloseTo(1 / 300, 4);
    expect(c.trechos[0].sentido).toBe('cresce');
  });

  it('a curva de duas cristas e uma inflexão cabe em poucos trechos', () => {
    /* curvatura: sobe a +1/300 e cai a 0, passa a -1/500 e volta a 0 */
    let x = 0; let y = 0; let th = 0; const pontos = [[0, 0]]; const L = 1600; const n = 160; const h = L / n;
    const kDe = (s) => { const f = s / L; if (f < 0.15) return 0; if (f < 0.3) return ((f - 0.15) / 0.15) / 300; if (f < 0.45) return (1 - (f - 0.3) / 0.15) / 300; if (f < 0.55) return (-(f - 0.45) / 0.1) / 500; if (f < 0.8) return -1 / 500; if (f < 0.9) return (-(0.9 - f) / 0.1) / 500; return 0; };
    for (let i = 0; i < n; i += 1) { const k = kDe((i + 0.5) * h); th += (k * h) / 2; x += Math.cos(th) * h; y += Math.sin(th) * h; th += (k * h) / 2; pontos.push([x, y]); }
    const a = ajustarCurvaLisa(ruido(pontos, 0.2), { tolerancia: 1, maximoDeTrechos: 10 });
    expect(a.cabe).toBe(true);
    expect(a.inflexoes).toBe(1);
    expect(a.clotoides.length).toBeLessThanOrEqual(9);
  });

  it('é determinística: o mesmo ajuste, bit a bit', () => {
    const pontos = ruido(arco(500, 60, 40), 0.3);
    const a = ajustarCurvaLisa(pontos, { tolerancia: 1 }); const b = ajustarCurvaLisa(pontos, { tolerancia: 1 });
    expect(a.joelhos).toEqual(b.joelhos); expect(a.desvios).toEqual(b.desvios);
  });

  it('recusa o que não entende, dizendo o que recebeu', () => {
    expect(() => ajustarCurvaLisa([[0, 0], [1, 1]])).toThrow(/pontos espera uma lista de 3 pontos ou mais, e veio 2 ponto/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { tolerancia: 0 })).toThrow(/tolerancia espera mm maior que zero, e veio 0/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { maximoDeTrechos: 0 })).toThrow(/maximoDeTrechos espera um inteiro/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { duros: [10] })).toThrow(/duros espera índices de 0 a 9/);
    expect(() => ajustarCurvaLisa([[0, 0], [1, 1], [NaN, 2]])).toThrow(/o ponto 2 precisa ser/);
    expect(() => ajustarCurvaLisa(arco(500, 90, 10), { eixos: [1, 1] })).toThrow(/eixos espera dois/);
  });

  it('o teto de trechos devolve a curva com cabe falso e o desvio que ficou', () => {
    const planta = clotoide(80, 800, -1 / 400, 1 / 400).map(([x, y], i) => [x, y + 8 * Math.sin(i / 6)]);
    const a = ajustarCurvaLisa(planta, { tolerancia: 0.5, maximoDeTrechos: 1 });
    expect(a.cabe).toBe(false);
    expect(a.desvioMaximo).toBeGreaterThan(0.5);
    expect(a.clotoides).toHaveLength(1);
  });
});

describe('a curva que a rede consome', () => {
  it('os pontos-chave de pontosDaRede, postos como curva de gaiolaPorRede, dão uma linha que fica a menos de 0,3 mm da curva ajustada', () => {
    const a = ajustarCurvaLisa(arco(600, 80, 60).map(([x, y]) => [x, 0, y]), { tolerancia: 0.5, eixos: [0, 2] });
    const curva = a.pontosDaRede(60, { nome: 'baixo' });
    expect(curva.pontos[0]).toHaveLength(3);
    expect(curva.pontos.every((p) => Math.abs(p[1]) < 1e-9)).toBe(true);
    const ponta = curva.pontos[curva.pontos.length - 1];
    const g = gaiolaPorRede({
      passo: 50, fora: [0, 1, 0],
      nos: { A: curva.pontos[0], B: ponta, C: [ponta[0], 0, ponta[2] + 200], D: [curva.pontos[0][0], 0, curva.pontos[0][2] + 200] },
      curvas: [{ nome: 'baixo', pontos: ['A', ...curva.pontos.slice(1, -1), 'B'] }, { nome: 'direita', pontos: ['B', 'C'] }, { nome: 'cima', pontos: ['C', 'D'] }, { nome: 'esquerda', pontos: ['D', 'A'] }],
      retalhos: [{ nome: 'placa', borda: ['baixo', 'direita', 'cima', 'esquerda'] }],
    });
    const fina = a.amostrar(0.5);
    const noFio = g.linha('baixo').map((nome) => g.pontos[nome].map((c) => c * 1000));
    expect(noFio.length).toBeGreaterThan(10);
    for (const [x, , z] of noFio) { const d = Math.min(...fina.map(([u, v]) => Math.hypot(u - x, v - z))); expect(d).toBeLessThan(0.3); }
  });
});
