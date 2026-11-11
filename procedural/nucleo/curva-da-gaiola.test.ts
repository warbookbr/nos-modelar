/* curva-da-gaiola.test.ts — a curva sobre a superfície da gaiola, tirada de `gaiolaPorEstacoes` e de `gaiolaPorLacos` sem digitar coordenada.
   A chapa em L de `fixtures/chapa-em-l-prova.js` (cinco estações de 20 mm, três colunas, quina de raio em mm) dá a conferência em milímetro: a estação inteira e a fracionária
   ficam no plano z delas, a linha passa pela quina arredondada (a 2,5 mm do canto vivo, para o raio de 6), a coluna anda ao longo de z, a fração entre duas colunas fica
   numa linha reta, e a curva cai na malha da chapa. Os laços são a barra da ficha de `gaiolaPorLacos`. Sem domínio. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { curvaDaGaiola } from './curva-da-gaiola.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorLacos } from './gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { chapaEmL } from './fixtures/chapa-em-l-prova.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';
// @ts-expect-error — núcleo em JavaScript.
import { prepararPontoNaMalha } from './ponto-na-malha.js';

type V3 = [number, number, number];
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou'); };
const L = chapaEmL({ raio: 6 });
/** A distância da curva à pele da chapa (a de fora) que o passo `subdivisao` entrega. */
function desvioDaMalha(curva: V3[], chapa = L) {
  const st = nucleo([...chapa.passos, ['parte', { nome: 'ext', sel: { origem: { ...chapa.origem, parte: 'externa' } } }]], {}, chapa.pontosMm);
  expect(st.orfaos).toEqual([]);
  const pele = prepararPontoNaMalha(st.V, st.F, [...st.F.values()].filter((f: any) => f.parte === 'ext').map((f: any) => f.id));
  return Math.max(...curva.map((p) => pele.maisProximo(p, 50).distancia));
}

describe('curvaDaGaiola: estação da gaiola por estações', () => {
  it('a estação inteira vai da coluna a à b pelo plano z dela, sobe a quina arredondada e cai na malha da chapa', () => {
    const { curva, fechada } = curvaDaGaiola(L.gaiola, { estacao: 'e2', de: 'a', ate: 'b' }, { borda: 'cantos' });
    expect(fechada).toBe(false);
    expect(curva.every((p: V3) => Math.abs(p[2] - 40) < 1e-6)).toBe(true);
    expect(curva[0]).toEqual([-40, 40, 40]);
    expect(curva[curva.length - 1]).toEqual([40, -40, 40]);
    /* a face de cima a y = 40, a de lado a x = 40, e o filete de raio 6 a 2,5 mm do canto vivo (6 vezes a raiz de 2 menos 1) */
    const meio = curva.reduce((m: V3, p: V3) => (Math.abs(p[0] - p[1]) < Math.abs(m[0] - m[1]) ? p : m));
    expect(Math.hypot(40 - meio[0], 40 - meio[1])).toBeCloseTo(6 * (Math.SQRT2 - 1), 0);
    expect(Math.abs(Math.hypot(40 - meio[0], 40 - meio[1]) - 6 * (Math.SQRT2 - 1))).toBeLessThan(0.4);
    for (let k = 1; k < curva.length; k += 1) expect(Math.hypot(...[0, 1, 2].map((e) => curva[k][e] - curva[k - 1][e]))).toBeGreaterThan(0);
    expect(desvioDaMalha(curva)).toBeLessThan(0.05);
  });
  it('a estação fracionária fica no plano z entre as duas, e por índice, por nome entre duas e por posição dão a mesma linha', () => {
    const a = curvaDaGaiola(L.gaiola, { estacao: 2.43, de: 'a', ate: 'b' }).curva;
    expect(a.every((p: V3) => Math.abs(p[2] - 48.6) < 1e-6)).toBe(true);
    const b = curvaDaGaiola(L.gaiola, { estacao: { entre: ['e2', 'e3'], fracao: 0.43 }, de: 'a', ate: 'b' }).curva;
    const c = curvaDaGaiola(L.gaiola, { estacao: { em: 0.0486 }, de: 'a', ate: 'b' }).curva;
    expect(b).toEqual(a);
    expect(c.length).toBe(a.length);
    expect(Math.abs(c[0][2] - 48.6)).toBeLessThan(1e-6);
    expect(desvioDaMalha(a)).toBeLessThan(0.05);
  });
  it('a última estação, a fração zero e as pontas por índice funcionam, e de b a a a linha vem no sentido contrário', () => {
    const fim = curvaDaGaiola(L.gaiola, { estacao: 4, de: 'a', ate: 'b' }, { borda: 'cantos' }).curva;
    expect(fim.every((p: V3) => Math.abs(p[2] - 80) < 1e-6)).toBe(true);
    const inteira = curvaDaGaiola(L.gaiola, { estacao: 2, de: 'a', ate: 'b' }).curva;
    const volta = curvaDaGaiola(L.gaiola, { estacao: 2, de: 'b', ate: 'a' }).curva;
    expect(volta).toEqual([...inteira].reverse());
    const porIndice = curvaDaGaiola(L.gaiola, { estacao: 2, de: 0, ate: 1 }).curva;
    expect(porIndice[0]).toEqual(inteira[0]);
    expect(porIndice[porIndice.length - 1][1]).toBeGreaterThan(30);
  });
  it('sem de e ate a estação inteira sai com as mesmas pontas, e o raio que afina de 6 a 3 muda a quina de uma estação à outra', () => {
    const toda = curvaDaGaiola(L.gaiola, { estacao: 1 }).curva;
    expect(toda[0][0]).toBeLessThan(-39); expect(toda[toda.length - 1][1]).toBeLessThan(-39);
    const A = chapaEmL({ raio: { de: 6, ate: 3 } });
    const canto = (z: number) => { const c = curvaDaGaiola(A.gaiola, { estacao: z }).curva as V3[]; const m = c.reduce((q, p) => (Math.abs(p[0] - p[1]) < Math.abs(q[0] - q[1]) ? p : q)); return Math.hypot(40 - m[0], 40 - m[1]); };
    expect(canto(0)).toBeGreaterThan(canto(4) + 0.5);
    expect(canto(0)).toBeCloseTo(6 * (Math.SQRT2 - 1), 0);
    expect(canto(4)).toBeCloseTo(3 * (Math.SQRT2 - 1), 0);
  });
});

describe('curvaDaGaiola: coluna da gaiola por estações', () => {
  it('a coluna q corre pelo vértice da quina de uma estação à outra, e com estações fracionárias parte e termina no meio da célula', () => {
    const { curva } = curvaDaGaiola(L.gaiola, { coluna: 'q' });
    expect(curva[0][2]).toBeCloseTo(0, 6); expect(curva[curva.length - 1][2]).toBeCloseTo(80, 6);
    for (const p of curva as V3[]) { expect(p[0]).toBeCloseTo(p[1], 3); expect(Math.hypot(40 - p[0], 40 - p[1])).toBeCloseTo(6 * (Math.SQRT2 - 1), 0); }
    const parte = curvaDaGaiola(L.gaiola, { coluna: 'q', de: 1.5, ate: 3.25 }).curva;
    expect(parte[0][2]).toBeCloseTo(30, 6); expect(parte[parte.length - 1][2]).toBeCloseTo(65, 6);
    expect(parte.every((p: V3, k: number) => k === 0 || p[2] > parte[k - 1][2])).toBe(true);
    const contra = curvaDaGaiola(L.gaiola, { coluna: 'q', de: 3.25, ate: 1.5 }).curva;
    expect(contra).toEqual([...parte].reverse());
  });
  it('a fração entre duas colunas é uma linha reta ao longo de z, e a de uma coluna de ponta anda na borda', () => {
    const f = curvaDaGaiola(L.gaiola, { coluna: { entre: ['a', 'q'], fracao: 0.25 } }, { borda: 'cantos' }).curva as V3[];
    expect(f.every((p) => Math.abs(p[0] - f[0][0]) < 1e-6 && Math.abs(p[1] - f[0][1]) < 1e-6)).toBe(true);
    expect(f[0][0]).toBeGreaterThan(-40); expect(f[0][0]).toBeLessThan(40);
    const b = curvaDaGaiola(L.gaiola, { coluna: 'b' }, { borda: 'cantos' }).curva as V3[];
    expect(b.every((p) => Math.abs(p[0] - 40) < 1e-6 && Math.abs(p[1] + 40) < 1e-6)).toBe(true);
    expect(desvioDaMalha(curvaDaGaiola(L.gaiola, { coluna: 'q', de: 0.5, ate: 3.5 }).curva)).toBeLessThan(0.05);
  });
});

describe('curvaDaGaiola: recusas com o nome', () => {
  it('a estação, a coluna, o pedido e a gaiola que não existem ou não servem', () => {
    expect(grito(() => curvaDaGaiola(L.gaiola, { estacao: 'e9' }))).toMatch(/estação 'e9' não existe \(há 'e0', 'e1'/);
    expect(grito(() => curvaDaGaiola(L.gaiola, { estacao: 9 }))).toMatch(/cai fora das estações \(de 0 a 4\)/);
    expect(grito(() => curvaDaGaiola(L.gaiola, { estacao: 2, de: 'x', ate: 'b' }))).toMatch(/a coluna 'x' não existe em 'e2' \(há 'a', 'q', 'b'\)/);
    expect(grito(() => curvaDaGaiola(L.gaiola, { estacao: 2, de: 'a', ate: 'a' }))).toMatch(/de e ate são a mesma coluna/);
    expect(grito(() => curvaDaGaiola(L.gaiola, { estacao: 1, coluna: 'q' }))).toMatch(/uma de estacao, laco, coluna ou borda/);
    expect(grito(() => curvaDaGaiola(L.gaiola, { laco: 1 }))).toMatch(/`laco` é da gaiola de laços/);
    expect(grito(() => curvaDaGaiola(L.gaiola, { estacao: { entre: ['e0', 'e2'], fracao: 0.5 } }))).toMatch(/não são estações vizinhas/);
    expect(grito(() => curvaDaGaiola({ pontos: {} }, { estacao: 1 }))).toMatch(/a gaiola precisa trazer `passo`|precisa ser a que gaiolaPorEstacoes/);
    expect(grito(() => curvaDaGaiola(L.gaiola, { estacao: 1 }, { niveis: 9 }))).toMatch(/niveis é um inteiro de 1 a 6/);
  });
  it('a mesma chamada dá a mesma curva', () => {
    const a = curvaDaGaiola(L.gaiola, { estacao: 2.43, de: 'a', ate: 'b' });
    const b = curvaDaGaiola(chapaEmL({ raio: 6 }).gaiola, { estacao: 2.43, de: 'a', ate: 'b' });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});

describe('curvaDaGaiola: gaiola por laços', () => {
  const barra = gaiolaPorLacos({
    nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' },
    trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }],
    lacos: [0, 50, 100].map((em) => ({ em, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [15, 40], [30, 40]], cima: [[30, 40], [30, 0]], tras: [[30, 0], [15, 0], [0, 0]] } })),
  });
  it('o laço inteiro é uma volta fechada no plano x dele, e o laço fracionário fica entre dois', () => {
    const r = curvaDaGaiola(barra, { laco: 'l1' });
    expect(r.fechada).toBe(true);
    expect(r.curva.every((p: V3) => Math.abs(p[0] - 50) < 1e-6)).toBe(true);
    const f = curvaDaGaiola(barra, { laco: 1.5 });
    expect(f.fechada).toBe(true);
    expect(f.curva.length).toBe(r.curva.length);
    expect(f.curva.every((p: V3) => p[0] > 50 && p[0] < 100)).toBe(true);
    expect(Math.abs(f.curva[0][0] - 73.5)).toBeLessThan(0.1);
  });
  it('de uma coluna a outra do laço a linha é aberta, e a coluna do laço anda por todos os laços', () => {
    const r = curvaDaGaiola(barra, { laco: 1, de: 'frente', ate: 'cima' });
    expect(r.fechada).toBe(false);
    expect(r.curva[0][0]).toBeCloseTo(50, 6);
    const c = curvaDaGaiola(barra, { coluna: 'frente.1' });
    expect(c.fechada).toBe(false);
    expect(c.curva[0][0]).toBeLessThan(c.curva[c.curva.length - 1][0]);
    expect(c.curva.every((p: V3) => Math.abs(p[1] - c.curva[0][1]) < 1e-6 && Math.abs(p[2] - c.curva[0][2]) < 1e-6)).toBe(false);
    const parte = curvaDaGaiola(barra, { coluna: { trecho: 'frente', k: 1 }, de: 'l0', ate: 1.5 });
    expect(parte.curva[parte.curva.length - 1][0]).toBeGreaterThan(60); expect(parte.curva[parte.curva.length - 1][0]).toBeLessThan(90);
    expect(grito(() => curvaDaGaiola(barra, { estacao: 1 }))).toMatch(/`estacao` é da gaiola de estações/);
    expect(grito(() => curvaDaGaiola(barra, { laco: 'lx' }))).toMatch(/laço 'lx' não existe/);
  });
});
