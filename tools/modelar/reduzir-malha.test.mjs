/* reduzir-malha.test.mjs — o redutor de malha, nos dois sentidos: o que ele reduz e o que ele recusa, medido pela conferência independente. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { conferirReducao } from '../../docs/modelar/banco-de-provas/reduzir-poligonos-2026-11-27/conferir-reducao.mjs';
import { reduzirMalha } from './reduzir-malha.mjs';

/* A malha de prova: uma grade de (nx x ny) quadriláteros; `pos(i, j)` dá o canto em milímetro, `parteDe(i, j)` a parte do quadrilátero. */
function grade({ nx, ny, pos, parteDe = () => 'chapa', V = new Map(), F = new Map(), prefixo = 'g', invertida = false }) {
  const id = (i, j) => `${prefixo}${i}_${j}`;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) { const [x, y, z] = pos(i, j); V.set(id(i, j), [x / 1000, y / 1000, z / 1000]); }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const vs = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]; if (invertida) vs.reverse();
    const fid = `${prefixo}f${i}_${j}`; F.set(fid, { id: fid, vs, parte: parteDe(i, j), material: 'aco', liso: 30 });
  }
  return { V, F };
}
/* a casca de um cubo de `n` divisões por face e de lado L mm, de cantos compartilhados pelo id; a tampa é outra parte */
function cubo(n, L = 20) {
  const V = new Map(), F = new Map();
  const chave = (x, y, z) => `c${x}_${y}_${z}`;
  const no = (x, y, z) => { const k = chave(x, y, z); if (!V.has(k)) V.set(k, [x * L / n / 1000, y * L / n / 1000, z * L / n / 1000]); return k; };
  const face = (nome, parte, f) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const vs = f(i, j).map((p) => no(...p)); F.set(`${nome}${i}_${j}`, { id: `${nome}${i}_${j}`, vs, parte, material: 'aco', liso: 30 }); } };
  face('x0', 'corpo', (i, j) => [[0, i, j], [0, i, j + 1], [0, i + 1, j + 1], [0, i + 1, j]]);
  face('x1', 'corpo', (i, j) => [[n, i, j], [n, i + 1, j], [n, i + 1, j + 1], [n, i, j + 1]]);
  face('y0', 'corpo', (i, j) => [[i, 0, j], [i + 1, 0, j], [i + 1, 0, j + 1], [i, 0, j + 1]]);
  face('y1', 'tampa', (i, j) => [[i, n, j], [i, n, j + 1], [i + 1, n, j + 1], [i + 1, n, j]]);
  face('z0', 'corpo', (i, j) => [[i, j, 0], [i, j + 1, 0], [i + 1, j + 1, 0], [i + 1, j, 0]]);
  face('z1', 'corpo', (i, j) => [[i, j, n], [i + 1, j, n], [i + 1, j + 1, n], [i, j + 1, n]]);
  return { V, F };
}
const assinatura = (r) => createHash('sha256').update(JSON.stringify([[...r.V], [...r.F], [...r.mapa]])).digest('hex');
const area = (m, parte) => {
  let a = 0;
  for (const f of m.F.values()) {
    if (f.parte !== parte) continue;
    const P = f.vs.map((v) => m.V.get(v).map((c) => c * 1000));
    for (let k = 1; k + 1 < P.length; k++) { const u = [0, 1, 2].map((q) => P[k][q] - P[0][q]), w = [0, 1, 2].map((q) => P[k + 1][q] - P[0][q]); a += Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2; }
  }
  return a;
};
const caixa = (m) => { const c = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]]; for (const p of m.V.values()) p.forEach((x, k) => { c[k][0] = Math.min(c[k][0], x); c[k][1] = Math.max(c[k][1], x); }); return c; };

describe('o redutor de malha', () => {
  it('o plano exato reduz quase tudo, sem desvio, e mantém a borda e os cantos', () => {
    const m = grade({ nx: 20, ny: 20, pos: (i, j) => [i, j, 0] });
    const r = reduzirMalha(m);
    const c = conferirReducao(m, r);
    expect(r.estatisticas.triangulosAntes).toBe(800);
    expect(r.estatisticas.triangulosDepois).toBeLessThanOrEqual(8);
    expect(c.todos.desvioMaxMm).toBeLessThan(1e-9);
    expect(c.todos.normalMaxGraus).toBeLessThan(1e-6);
    expect(c.problemas).toEqual([]);
    expect(c.ok).toBe(true);
    for (const canto of ['g0_0', 'g20_0', 'g0_20', 'g20_20']) expect(r.V.has(canto)).toBe(true);
    expect(caixa(r)).toEqual(caixa(m));
  });

  it('o colapso que passaria do teto é recusado, e o que cabe no teto passa', () => {
    const comRelevo = (h) => grade({ nx: 10, ny: 10, pos: (i, j) => [i, j, i === 5 && j === 5 ? h : 0] });
    const alto = comRelevo(0.2); /* 0,2 mm: quatro vezes o teto */
    const rAlto = reduzirMalha(alto);
    expect(rAlto.V.has('g5_5')).toBe(true);
    expect(conferirReducao(alto, rAlto).ok).toBe(true);
    const baixo = comRelevo(0.01); /* 0,01 mm: cabe */
    const rBaixo = reduzirMalha(baixo);
    const cBaixo = conferirReducao(baixo, rBaixo);
    expect(cBaixo.ok).toBe(true);
    expect(cBaixo.todos.desvioMaxMm).toBeLessThanOrEqual(0.05);
    expect(rBaixo.estatisticas.triangulosDepois).toBeLessThan(rAlto.estatisticas.triangulosDepois);
    /* o teto é parâmetro: com 0,3 mm o relevo de 0,2 mm cabe */
    const rFolgado = reduzirMalha(alto, { toleranciaMm: 0.3, normalGraus: 40 });
    expect(rFolgado.estatisticas.triangulosDepois).toBeLessThan(rAlto.estatisticas.triangulosDepois);
    expect(conferirReducao(alto, rFolgado, { toleranciaMm: 0.3, normalGraus: 40 }).ok).toBe(true);
  });

  it('o teto de normal é parâmetro: o apertado recusa o que o folgado reduz, e a conferência mede abaixo de cada um', () => {
    const passo = 0.5 * Math.PI / 180, R = 100;
    const faixa = grade({ nx: 120, ny: 3, pos: (i, j) => [R * Math.sin(i * passo), j, R * Math.cos(i * passo)] });
    const apertado = reduzirMalha(faixa, { toleranciaMm: 1, normalGraus: 0.3 });
    const folgado = reduzirMalha(faixa, { toleranciaMm: 1, normalGraus: 5 });
    expect(apertado.estatisticas.triangulosDepois).toBeGreaterThan(folgado.estatisticas.triangulosDepois);
    expect(conferirReducao(faixa, apertado, { toleranciaMm: 1, normalGraus: 0.3 }).todos.normalMaxGraus).toBeLessThanOrEqual(0.3);
    expect(conferirReducao(faixa, folgado, { toleranciaMm: 1, normalGraus: 5 }).todos.normalMaxGraus).toBeLessThanOrEqual(5);
    expect(conferirReducao(faixa, folgado, { toleranciaMm: 1, normalGraus: 5 }).todos.desvioMaxMm).toBeLessThanOrEqual(1);
  });

  it('a divisa de parte fica: nenhum triângulo cruza a divisa, a área de cada parte é a de antes e as pontas da divisa ficam', () => {
    const m = grade({ nx: 16, ny: 16, pos: (i, j) => [i, j, 0], parteDe: (i) => (i < 8 ? 'esquerda' : 'direita') });
    const r = reduzirMalha(m);
    const c = conferirReducao(m, r);
    expect(c.ok).toBe(true);
    expect(r.estatisticas.triangulosDepois).toBeLessThan(40);
    for (const f of r.F.values()) { const xs = f.vs.map((v) => r.V.get(v)[0] * 1000); expect(f.parte === 'esquerda' ? Math.max(...xs) <= 8 + 1e-9 : Math.min(...xs) >= 8 - 1e-9).toBe(true); }
    for (const p of ['esquerda', 'direita']) expect(area(r, p)).toBeCloseTo(area(m, p), 6);
    for (const ponta of ['g8_0', 'g8_16']) expect(r.V.has(ponta)).toBe(true);
    for (const f of r.F.values()) expect(['esquerda', 'direita']).toContain(f.parte);
  });

  it('a quina fica: o cubo reduz as faces, mantém os oito cantos, a casca fechada e as duas partes', () => {
    const m = cubo(8);
    const r = reduzirMalha(m);
    const c = conferirReducao(m, r);
    expect(r.estatisticas.triangulosAntes).toBe(768);
    expect(r.estatisticas.triangulosDepois).toBeLessThanOrEqual(60);
    expect(c.ok).toBe(true);
    expect(c.todos.fechada).toBe(true);
    expect(c.todos.borda).toBe(0);
    for (const x of [0, 8]) for (const y of [0, 8]) for (const z of [0, 8]) expect(r.V.has(`c${x}_${y}_${z}`)).toBe(true);
    expect(caixa(r)).toEqual(caixa(m));
    expect(area(r, 'tampa')).toBeCloseTo(400, 6);
    expect(area(r, 'corpo')).toBeCloseTo(2000, 6);
  });

  it('os ids e os campos sobrevivem e o mapa leva cada triângulo removido a um sobrevivente da mesma parte', () => {
    const m = grade({ nx: 12, ny: 12, pos: (i, j) => [i, j, 0], parteDe: (i) => (i < 6 ? 'a' : 'b') });
    const r = reduzirMalha(m);
    expect(conferirReducao(m, r).problemas).toEqual([]);
    expect(r.mapa.size + r.F.size).toBe(2 * 144);
    for (const [de, para] of r.mapa) { expect(r.F.has(de)).toBe(false); expect(r.F.has(para)).toBe(true); }
    for (const [id, p] of r.V) expect(m.V.get(id)).toEqual(p);
    for (const f of r.F.values()) { expect(f.vs).toHaveLength(3); expect(f.liso).toBe(30); expect(f.material).toBe('aco'); expect(m.F.has(f.origem)).toBe(true); }
    expect(m.F.size).toBe(144); /* a entrada não muda */
  });

  it('a saída repete: duas execuções dão o mesmo sha256, e a entrada não é tocada', () => {
    const m = cubo(6);
    const antes = JSON.stringify([[...m.V], [...m.F]]);
    const a = assinatura(reduzirMalha(m));
    const b = assinatura(reduzirMalha(m));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify([[...m.V], [...m.F]])).toBe(antes);
  });

  it('a conferência acusa uma redução que passa do teto', () => {
    const m = grade({ nx: 10, ny: 10, pos: (i, j) => [i, j, i === 5 && j === 5 ? 0.1 : 0] });
    const frouxa = reduzirMalha(m, { toleranciaMm: 1, normalGraus: 60 });
    const c = conferirReducao(m, frouxa, { toleranciaMm: 0.05 });
    expect(c.ok).toBe(false);
    expect(c.todos.desvioMaxMm).toBeGreaterThan(0.05);
  });

  it('recusa parâmetro inválido', () => {
    expect(() => reduzirMalha(cubo(2), { toleranciaMm: 0 })).toThrow(/positivos/);
  });
});
