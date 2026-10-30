/* moldura-do-vao.test.mjs — a conferência geral da moldura em volta de um vão, sobre faixas desenhadas à mão no plano.
 *
 * O núcleo da conferência (`conferirMoldura`) não sabe de chapa curva, de gaiola nem de veículo: recebe a borda como polilinha e os
 * frisos como pegadas (a posição e os dois extremos do anel em cada seção). Aqui a borda é um quadrado de 100 mm no plano z = 0 e cada
 * friso uma faixa reta desenhada por código, de modo que o resultado esperado sai da conta: a moldura que cobre a borda inteira passa, o
 * trecho sem faixa é achado com o comprimento e a posição, a faixa que passa a 3 mm da linha não a cobre, a emenda de duas faixas de
 * larguras diferentes tem o degrau da diferença, e o canto de dois cortes retos tem entalhe até que uma peça o preencha. A prova sobre a
 * malha varrida de verdade, com a gaiola e os frisos da chapa curva, está em `src/autoria/molduras-do-vao.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { GIRO_DO_CANTO, TOLERANCIA_DA_MOLDURA, conferirMoldura } from './moldura-do-vao.js';

const L = 0.1;
const quadrado = [{ nome: 'a', p: [0, 0, 0] }, { nome: 'b', p: [L, 0, 0] }, { nome: 'c', p: [L, L, 0] }, { nome: 'd', p: [0, L, 0] }];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dist = (a, b) => Math.hypot(...sub(a, b));

/* Uma faixa reta de `de` a `ate` no plano z = 0, com `meia` de cada lado da linha deslocada `afasta` para a esquerda de quem a segue, em
   seções a cada `passo`; as pontas abertas levam o anel de dois pontos. */
function faixa(nome, de, ate, { meia = 0.005, afasta = 0, passo = 0.025 } = {}) {
  const d = sub(ate, de); const comp = Math.hypot(...d); const t = d.map((x) => x / comp);
  const esq = [-t[1], t[0], 0];
  const n = Math.max(1, Math.round(comp / passo));
  const secoes = [];
  for (let k = 0; k <= n; k++) {
    const p = de.map((x, i) => x + (d[i] * k) / n);
    const c = p.map((x, i) => x + esq[i] * afasta);
    secoes.push({ s: (comp * k) / n, p, e: c.map((x, i) => x + esq[i] * meia), d: c.map((x, i) => x - esq[i] * meia) });
  }
  const anel = (s) => [s.e, s.d];
  return { nome, fechada: false, secoes, extremos: [anel(secoes[0]), anel(secoes[n])], pontas: ['aberta', 'aberta'] };
}

describe('conferirMoldura — cobertura da borda', () => {
  it('a borda inteira coberta por uma faixa só não deixa trecho descoberto', () => {
    const r = conferirMoldura({ borda: [{ nome: 'a', p: [0, 0, 0] }, { nome: 'b', p: [L, 0, 0] }], frisos: [faixa('f', [0, 0, 0], [L, 0, 0])] });
    expect(r.descobertos).toEqual([]);
    expect(r.cobertas).toBe(r.amostras);
    expect(r.comprimento).toBeCloseTo(L, 12);
  });

  it('a faixa que para antes do fim deixa o trecho que falta, com o comprimento, o meio e o nome dos pontos que o cercam', () => {
    const r = conferirMoldura({ borda: [{ nome: 'a', p: [0, 0, 0] }, { nome: 'b', p: [L, 0, 0] }], frisos: [faixa('f', [0, 0, 0], [0.06, 0, 0])] });
    expect(r.descobertos).toHaveLength(1);
    const t = r.descobertos[0];
    expect(t.comprimento).toBeGreaterThan(0.039);
    expect(t.comprimento).toBeLessThan(0.041);
    expect(t.entre).toEqual(['a', 'b']);
    expect(t.posicao[0]).toBeGreaterThan(0.075);
    expect(t.posicao[0]).toBeLessThan(0.085);
    /* a faixa acaba em x = 0,06, e o meio do trecho (x ≈ 0,08) está a 20 mm dela */
    expect(t.distanciaDaFaixa).toBeGreaterThan(0.019);
    expect(t.distanciaDaFaixa).toBeLessThan(0.022);
  });

  it('a faixa afastada da linha não a cobre, e a distância dita é a do afastamento', () => {
    const r = conferirMoldura({ borda: [{ nome: 'a', p: [0, 0, 0] }, { nome: 'b', p: [L, 0, 0] }], frisos: [faixa('f', [0, 0, 0], [L, 0, 0], { afasta: 0.008 })] });
    /* a faixa vai de 3 a 13 mm da linha: nenhum ponto da borda fica coberto, e todos estão a 3 mm dela */
    expect(r.cobertas).toBe(0);
    expect(r.descobertos).toHaveLength(1);
    expect(r.descobertos[0].distanciaDaFaixa).toBeCloseTo(0.003, 6);
    expect(r.descobertos[0].comprimento).toBeCloseTo(L, 3);
  });

  it('a tolerância é a declarada: a faixa a 0,4 mm cobre com a padrão e deixa de cobrir com 0,1 mm', () => {
    const borda = [{ nome: 'a', p: [0, 0, 0] }, { nome: 'b', p: [L, 0, 0] }];
    const f = faixa('f', [0, 0, 0], [L, 0, 0], { meia: 0.005, afasta: 0.0054 });
    expect(TOLERANCIA_DA_MOLDURA).toBe(5e-4);
    expect(conferirMoldura({ borda, frisos: [f] }).descobertos).toEqual([]);
    expect(conferirMoldura({ borda, frisos: [f], tolerancia: 1e-4 }).descobertos.length).toBeGreaterThan(0);
  });

  it('na volta fechada o trecho que passa pelo começo é um só', () => {
    const faixas = [faixa('b', [L, 0, 0], [L, L, 0]), faixa('c', [L, L, 0], [0, L, 0])];
    const r = conferirMoldura({ borda: quadrado, fechada: true, frisos: faixas });
    /* sem faixa em a-b e em d-a: um trecho de d a b, passando por a */
    expect(r.descobertos).toHaveLength(1);
    expect(r.descobertos[0].comprimento).toBeGreaterThan(0.18);
    expect(r.descobertos[0].entre).toEqual(['d', 'b']);
  });

  it('recusa borda sem dois pontos e conferência sem friso', () => {
    expect(() => conferirMoldura({ borda: [{ nome: 'a', p: [0, 0, 0] }], frisos: [faixa('f', [0, 0, 0], [L, 0, 0])] })).toThrow(/dois pontos/);
    expect(() => conferirMoldura({ borda: quadrado, frisos: [] })).toThrow(/ao menos um friso/);
  });
});

describe('conferirMoldura — emendas', () => {
  const reta = [{ nome: 'a', p: [0, 0, 0] }, { nome: 'm', p: [0.05, 0, 0] }, { nome: 'b', p: [L, 0, 0] }];

  it('duas faixas de mesma largura emendadas no meio são uma emenda reta sem degrau', () => {
    const r = conferirMoldura({ borda: reta, frisos: [faixa('A', [0, 0, 0], [0.05, 0, 0]), faixa('B', [0.05, 0, 0], [L, 0, 0])] });
    expect(r.descobertos).toEqual([]);
    expect(r.emendas).toHaveLength(1);
    expect(r.emendas[0]).toMatchObject({ tipo: 'reta', ok: true });
    expect(r.emendas[0].degrau).toBeLessThan(1e-9);
  });

  it('as larguras diferentes são o degrau, com o tamanho dele e as duas larguras', () => {
    const r = conferirMoldura({ borda: reta, frisos: [faixa('A', [0, 0, 0], [0.05, 0, 0], { meia: 0.005 }), faixa('B', [0.05, 0, 0], [L, 0, 0], { meia: 0.007 })] });
    const e = r.emendas[0];
    expect(e.tipo).toBe('reta');
    expect(e.ok).toBe(false);
    expect(e.degrau).toBeCloseTo(0.002, 9);
    expect(e.larguras[0]).toBeCloseTo(0.01, 9);
    expect(e.larguras[1]).toBeCloseTo(0.014, 9);
    expect(e.posicao).toEqual([0.05, 0, 0]);
  });

  it('a diferença menor que a tolerância não é degrau', () => {
    const r = conferirMoldura({ borda: reta, frisos: [faixa('A', [0, 0, 0], [0.05, 0, 0], { meia: 0.005 }), faixa('B', [0.05, 0, 0], [L, 0, 0], { meia: 0.0052 })] });
    expect(r.emendas[0].ok).toBe(true);
  });

  it('duas pontas que não se encontram não são emenda', () => {
    const r = conferirMoldura({ borda: reta, frisos: [faixa('A', [0, 0, 0], [0.04, 0, 0]), faixa('B', [0.06, 0, 0], [L, 0, 0])] });
    expect(r.emendas).toEqual([]);
    expect(r.descobertos).toHaveLength(1);
    expect(r.descobertos[0].comprimento).toBeGreaterThan(0.018);
  });

  it('o canto de dois cortes retos tem entalhe no quadrante de fora, de tamanho dado pela conta', () => {
    const borda = [{ nome: 'a', p: [0, 0, 0] }, { nome: 'b', p: [L, 0, 0] }, { nome: 'c', p: [L, L, 0] }];
    const r = conferirMoldura({ borda, frisos: [faixa('A', [0, 0, 0], [L, 0, 0]), faixa('B', [L, 0, 0], [L, L, 0])] });
    expect(r.descobertos).toEqual([]);
    expect(r.emendas).toHaveLength(1);
    const e = r.emendas[0];
    expect(e.tipo).toBe('canto');
    expect(e.giro).toBeCloseTo(90, 6);
    expect(e.ok).toBe(false);
    /* a faixa tem 5 mm de cada lado: o leque de raio 5 mm tem o ponto a 45 graus a 5 × √2 − 5 ... do canto, e a 3,5 mm das duas faixas */
    expect(e.raioDeFora).toBeCloseTo(0.005, 9);
    expect(e.entalhe).toBeGreaterThan(0.0034);
    expect(e.entalhe).toBeLessThan(0.0036);
    expect(dist(e.posicao, [L, 0, 0])).toBeLessThan(1e-9);
  });

  it('uma peça que preenche o quadrante de fora fecha o canto', () => {
    const borda = [{ nome: 'a', p: [0, 0, 0] }, { nome: 'b', p: [L, 0, 0] }, { nome: 'c', p: [L, L, 0] }];
    /* a faixa curta de 14 mm, na diagonal, cobrindo o quadrado de fora [L, L+5 mm] × [-5 mm, 0] */
    const tampa = { nome: 'T', fechada: false, secoes: [
      { s: 0, p: [L, 0, 0], e: [L + 0.006, 0.0, 0], d: [L, -0.006, 0] },
      { s: 0.01, p: [L + 0.003, -0.003, 0], e: [L + 0.006, 0.006, 0], d: [L + 0.006, -0.006, 0] },
    ], extremos: null };
    const r = conferirMoldura({ borda, frisos: [faixa('A', [0, 0, 0], [L, 0, 0]), faixa('B', [L, 0, 0], [L, L, 0]), tampa] });
    expect(r.emendas.find((e) => e.tipo === 'canto').ok).toBe(true);
  });

  it('duas faixas iguais que se encontram numa quebra de 6 graus não têm degrau: o corte girado não é perfil diferente', () => {
    /* antes, os anéis se comparavam no espaço e davam 2 × 5 mm × sen(3°) = 0,52 mm de degrau entre dois perfis iguais */
    const giro = (6 * Math.PI) / 180;
    const fim = [0.05 + 0.05 * Math.cos(giro), 0.05 * Math.sin(giro), 0];
    const borda = [{ nome: 'a', p: [0, 0, 0] }, { nome: 'm', p: [0.05, 0, 0] }, { nome: 'b', p: fim }];
    const r = conferirMoldura({ borda, frisos: [faixa('A', [0, 0, 0], [0.05, 0, 0]), faixa('B', [0.05, 0, 0], fim)] });
    const e = r.emendas[0];
    expect(e.tipo).toBe('reta');
    expect(e.giro).toBeCloseTo(6, 6);
    expect(e.degrau).toBeLessThan(1e-9);
    /* a cunha de fora da quebra: o ponto do meio do leque de 5 mm fica a 5 mm × sen(3°) das duas faixas */
    expect(e.entalhe).toBeCloseTo(0.005 * Math.sin(giro / 2), 5);
    expect(e.ok).toBe(true);
  });

  it('a dobra da chapa sob a emenda (a linha que atravessa um vinco) não é giro: a emenda é reta, sem degrau nem entalhe', () => {
    /* duas faixas com 3 mm de altura pela normal da chapa, a segunda numa chapa dobrada 15 graus para longe da normal; antes, o giro
       contava a dobra, a emenda virava canto e o leque, medido acima da chapa, dava entalhe de milímetros */
    const dobra = (15 * Math.PI) / 180;
    const comAltura = (nome, de, t, n) => {
      const esq = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
      const secoes = [0, 0.025, 0.05].map((s) => { const p = de.map((x, i) => x + t[i] * s); return { s, p, e: p.map((x, i) => x + esq[i] * 0.005), d: p.map((x, i) => x - esq[i] * 0.005) }; });
      const anel = (S) => [S.d, S.e, S.e.map((x, i) => x + n[i] * 0.003), S.d.map((x, i) => x + n[i] * 0.003)];
      return { nome, fechada: false, secoes, extremos: [anel(secoes[0]), anel(secoes[2])] };
    };
    const m = [0.05, 0, 0]; const tB = [Math.cos(dobra), 0, -Math.sin(dobra)]; const nB = [Math.sin(dobra), 0, Math.cos(dobra)];
    const A = comAltura('A', [0, 0, 0], [1, 0, 0], [0, 0, 1]); const B = comAltura('B', m, tB, nB);
    const borda = [{ nome: 'a', p: [0, 0, 0] }, { nome: 'm', p: m }, { nome: 'b', p: m.map((x, i) => x + tB[i] * 0.05) }];
    const r = conferirMoldura({ borda, frisos: [A, B] });
    expect(r.descobertos).toEqual([]);
    const e = r.emendas[0];
    expect(e.tipo).toBe('reta');
    expect(e.giro).toBeLessThan(1e-6);
    expect(e.degrau).toBeLessThan(1e-9);
    expect(e.entalhe).toBeLessThan(1e-9);
    expect(e.ok).toBe(true);
  });

  it('o giro do canto começa em dez graus: uma quebra de 5 graus entre as pontas ainda é reta', () => {
    expect(GIRO_DO_CANTO).toBe(10);
    const r = conferirMoldura({ borda: reta, frisos: [faixa('A', [0, 0, 0], [0.05, 0, 0]), faixa('B', [0.05, 0, 0], [0.1, 0.00436, 0])] });
    expect(r.emendas[0].tipo).toBe('reta');
    expect(r.emendas[0].giro).toBeCloseTo(5, 1);
  });
});
