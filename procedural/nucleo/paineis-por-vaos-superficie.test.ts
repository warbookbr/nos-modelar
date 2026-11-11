/* paineis-por-vaos-superficie.test.ts — o modo `superficie` de `paineisPorVaos`: a lâmina varrida sobre a chapa, com as paredes normais a ela.
   Mede, em fixtures sem domínio, a menor distância 3D entre os dois pedaços (a folga entre as paredes, que na pele é o vão): em chapa plana a
   0, 38 e 60 graus, de 1 e de 3 mm; numa dobra viva de 90 graus e numa dobra suave de `subdivisao` com espessura; nos cantos em L e em T de
   duas linhas; e nas recusas. Cada caso mede também o modo `vista`, para a comparação que decide o padrão. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { paineisPorVaos } from './paineis-por-vaos.js';
// @ts-expect-error — núcleo em JavaScript.
import { gaiolaPorLacos } from './gaiola-por-lacos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';

type V3 = [number, number, number];
const rad = Math.PI / 180;
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou');};
const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const mais = (o: V3, u: V3, t: number): V3 => [o[0] + u[0] * t, o[1] + u[1] * t, o[2] + u[2] * t];
function distTri(p: V3, [A, B, C]: V3[]) {
  const ab = sub(B, A); const ac = sub(C, A); const ap = sub(p, A);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
  const bp = sub(p, B); const d3 = dot(ab, bp); const d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) return Math.hypot(...sub(p, mais(A, ab, d1 / (d1 - d3))));
  const cp = sub(p, C); const d5 = dot(ab, cp); const d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) return Math.hypot(...sub(p, mais(A, ac, d2 / (d2 - d6))));
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return Math.hypot(...sub(p, mais(B, sub(C, B), (d4 - d3) / (d4 - d3 + d5 - d6))));
  const den = 1 / (va + vb + vc); return Math.hypot(...sub(p, mais(mais(A, ab, vb * den), ac, vc * den)));
}
const triangulos = (st: any, nome: string) => {
  const t: V3[][] = [];
  for (const f of st.F.values()) { if (f.parte !== nome) continue; const p = f.vs.map((v: number) => st.V.get(v) as V3); for (let k = 1; k + 1 < p.length; k++) t.push([p[0], p[k], p[k + 1]]); }
  return t;
};
/** A menor distância 3D entre dois painéis (cada vértice de um contra os triângulos do outro). */
function folga3d(st: any, a: string, b: string) {
  const A = triangulos(st, a); const B = triangulos(st, b);
  const cantos = (T: V3[][]) => [...new Map(T.flat().map((p) => [p.join(','), p])).values()];
  let m = Infinity;
  for (const p of cantos(A)) for (const t of B) { const d = distTri(p, t); if (d < m) { m = d; } }
  for (const p of cantos(B)) for (const t of A) m = Math.min(m, distTri(p, t));
  return m;
}
const pedacos = (st: any) => new Set([...st.F.values()].map((f: any) => f.parte)).size;

/* a chapa plana de espessura T, inclinada `ang` graus, de 400 de comprimento (z, y), extrudada em x entre -200 e 200 */
const inclinada = (id: number, T: number, ang: number) => {
  const c = Math.cos(ang * rad); const s = Math.sin(ang * rad); const L = 400;
  const pol: [number, number][] = [[0, 0], [L * c, L * s], [L * c - T * s, L * s + T * c], [-T * s, T * c]];
  return ['extrusao', { origemId: id, eixo: 'x', altura: 400, em: [-200, 0, 0], perfil: [...pol].reverse().map(([z, y]) => [-y, z]) }];
};
const cortar = (passos: any[], origem: any, extra: object) => paineisPorVaos({ chapa: { passos, origem }, vao: 4, ...extra } as any);
const medir = (g: any, a = 'a', b = 'b') => { const st = nucleo(g.passos, {}, {}); expect(st.orfaos).toEqual([]); return { st, folga: folga3d(st, a, b), pedacos: pedacos(st) }; };

describe('modo superficie: chapa plana inclinada', () => {
  for (const T of [1, 3]) for (const ang of [0, 38, 60]) {
    it(`chapa de ${T} mm a ${ang} graus: a folga 3D entre os painéis fica dentro de 2% do vão pedido`, () => {
      const c = Math.cos(ang * rad); const s = Math.sin(ang * rad);
      /* a linha paralela à aresta de inclinação, no meio da chapa; as sementes de cada lado, vistas de cima */
      const zm = 200 * c;
      const linhas = [{ nome: 'meio', eixo: 'y', pontos: [[-300, zm], [300, zm]] }];
      const paineis = [{ nome: 'a', eixo: 'y', ponto: [0, zm - 100 * c] }, { nome: 'b', eixo: 'y', ponto: [0, zm + 100 * c] }];
      const g = cortar([inclinada(1, T, ang)], { op: 'extrusao', id: 1 }, { linhas, paineis, modo: 'superficie' });
      const m = medir(g);
      expect(m.pedacos).toBe(2);
      expect(Math.abs(m.folga - 4) / 4).toBeLessThan(0.02);
      expect(g.medidas.folgaMinima).toBeCloseTo(4.02, 3);
      if (ang === 38 && T === 1) {
        const v = medir(cortar([inclinada(1, T, ang)], { op: 'extrusao', id: 1 }, { linhas, paineis }));
        process.stdout.write(`[superfície x vista] 1 mm a 38 graus: folga 3D ${m.folga.toFixed(3)} contra ${v.folga.toFixed(3)}\n`);
        void s;
      }
    });
  }
});

describe('modo superficie: dobras', () => {
  /* o telhado de duas águas de 90 graus de diedro (45 graus cada), de 1 mm, extrudado em x; a linha corre em z e cruza a quina viva */
  const TELHADO = (T: number) => {
    const pol: [number, number][] = [[-200, 0], [0, 200], [200, 0], [200, -T * Math.SQRT2], [0, 200 - T * Math.SQRT2], [-200, -T * Math.SQRT2]];
    return ['extrusao', { origemId: 1, eixo: 'x', altura: 300, em: [-150, 0, 0], perfil: [...pol].reverse().map(([z, y]) => [-y, z]) }];
  };
  it('a linha que atravessa a quina viva de 90 graus corta as duas águas, sem ponte na quina, com a folga 3D no vão pedido', () => {
    const linhas = [{ nome: 'cumeeira', eixo: 'y', pontos: [[0, -300], [0, 300]] }];
    const paineis = [{ nome: 'a', eixo: 'y', ponto: [-60, 0] }, { nome: 'b', eixo: 'y', ponto: [60, 0] }];
    const g = cortar([TELHADO(1)], { op: 'extrusao', id: 1 }, { linhas, paineis, modo: 'superficie' });
    const m = medir(g);
    expect(m.pedacos).toBe(2);
    expect(Math.abs(m.folga - 4) / 4).toBeLessThan(0.02);
    expect(g.avisos).toEqual([]);
    const v = medir(cortar([TELHADO(1)], { op: 'extrusao', id: 1 }, { linhas, paineis, alcance: undefined }));
    process.stdout.write(`[dobra viva de 90 graus] superfície ${m.folga.toFixed(3)}, vista ${v.folga.toFixed(3)}\n`);
  });

  /* a cuba de subdivisão com espessura (paredes a 38 graus da vertical, cantos arredondados): a linha em x cruza o fundo e as duas paredes */
  const rc = 10; const mm = 6; const TAN38 = Math.tan(38 * rad);
  const laco = (em: number) => {
    const a = 60 + em * TAN38; const b = 40 + em * TAN38;
    const arco = (cx: number, cz: number, a0: number) => Array.from({ length: mm + 1 }, (_, k) => { const t = a0 + (Math.PI / 2) * k / mm; return [cx + rc * Math.cos(t), cz + rc * Math.sin(t)]; });
    return { em, trechos: { baixo: [[-a + rc, -b], [a - rc, -b]], dir: [...arco(a - rc, -b + rc, -Math.PI / 2), ...arco(a - rc, b - rc, 0)], cima: [[a - rc, b], [-a + rc, b]], esq: [...arco(-a + rc, b - rc, Math.PI / 2), ...arco(-a + rc, -b + rc, Math.PI)] } };
  };
  const gaiola = gaiolaPorLacos({ nome: 'cuba', eixo: 'y', tampa: { de: 'esq', ate: 'dir' }, aberta: 'fim', espessura: 1, trechos: [{ nome: 'baixo', pontos: 5 }, { nome: 'dir', pontos: 9 }, { nome: 'cima', pontos: 5 }, { nome: 'esq', pontos: 9 }], lacos: [0, 20, 40, 60, 80].map(laco) });
  const CUBA = [['subdivisao', { origemId: 1, ...gaiola.passo, niveis: 2, espessura: 1 }]];
  it('a linha que atravessa o fundo e as paredes da cuba (dobra suave) dá a folga 3D no vão, em dois painéis', () => {
    const linhas = [{ nome: 'meio', eixo: 'y', pontos: [[-150, 0], [150, 0]] }];
    const paineis = [{ nome: 'a', eixo: 'y', ponto: [0, 20] }, { nome: 'b', eixo: 'y', ponto: [0, -20] }];
    const g = paineisPorVaos({ chapa: { passos: CUBA, origem: { op: 'subdivisao', id: 1 }, pontos: gaiola.pontosMm }, vao: 4, linhas, paineis, modo: 'superficie' });
    const st = nucleo(g.passos, {}, gaiola.pontosMm);
    expect(st.orfaos).toEqual([]);
    expect(pedacos(st)).toBe(2);
    const f = folga3d(st, 'a', 'b');
   
    expect(Math.abs(f - 4) / 4).toBeLessThan(0.02);
    process.stdout.write(`[dobra suave de subdivisão, 1 mm] folga 3D ${f.toFixed(3)}; inclinação lida ${g.medidas.inclinacaoMaxima}\n`);
  });
});

describe('modo superficie: cantos de duas linhas', () => {
  const placa = (T: number) => ({ passos: [['cubo', { origemId: 1, larg: 600, alt: T, prof: 400 }]], origem: { op: 'cubo', id: 1 } });
  for (const T of [1, 3]) {
    it(`canto em L de duas linhas numa chapa de ${T} mm: o vão no canto continua o pedido (modo vista deixa o dente)`, () => {
      const linhas = [{ nome: 'A', eixo: 'y', pontos: [[-300, 0], [0, 0]] }, { nome: 'B', eixo: 'y', pontos: [[0, 0], [0, 250]] }];
      const paineis = [{ nome: 'a', eixo: 'y', ponto: [-150, 100] }, { nome: 'b', eixo: 'y', ponto: [150, -100] }];
      const s = medir(cortar(placa(T).passos, placa(T).origem, { linhas, paineis, modo: 'superficie' }));
      const v = medir(cortar(placa(T).passos, placa(T).origem, { linhas, paineis }));
      expect(s.pedacos).toBe(2);
      expect(Math.abs(s.folga - 4) / 4).toBeLessThan(0.02);
      expect(v.folga).toBeLessThan(3.2);
      process.stdout.write(`[canto em L, ${T} mm] superfície ${s.folga.toFixed(3)}, vista ${v.folga.toFixed(3)}\n`);
    });
    it(`canto em T numa chapa de ${T} mm: as três folgas ficam no vão`, () => {
      const linhas = [{ nome: 'A', eixo: 'y', pontos: [[-300, 0], [300, 0]] }, { nome: 'B', eixo: 'y', pontos: [[0, 0], [0, 250]] }];
      const paineis = [{ nome: 'a', eixo: 'y', ponto: [-150, 100] }, { nome: 'b', eixo: 'y', ponto: [150, 100] }, { nome: 'c', eixo: 'y', ponto: [0, -100] }];
      const g = cortar(placa(T).passos, placa(T).origem, { linhas, paineis, modo: 'superficie' });
      const st = nucleo(g.passos, {}, {});
      expect(st.orfaos).toEqual([]);
      expect(pedacos(st)).toBe(3);
      for (const [x, y] of [['a', 'b'], ['a', 'c'], ['b', 'c']]) expect(Math.abs(folga3d(st, x, y) - 4) / 4, `${x}${y}`).toBeLessThan(0.02);
    });
  }
  it('a linha que sai pela borda de uma chapa inclinada não alarga no fim', () => {
    const c = Math.cos(38 * rad);
    const linhas = [{ nome: 'meio', eixo: 'y', pontos: [[-300, 200 * c], [300, 200 * c]] }];
    const g = cortar([inclinada(1, 1, 38)], { op: 'extrusao', id: 1 }, { linhas, paineis: [{ nome: 'a', eixo: 'y', ponto: [0, 100 * c] }, { nome: 'b', eixo: 'y', ponto: [0, 300 * c] }], modo: 'superficie' });
    const st = nucleo(g.passos, {}, {});
    /* a largura da lâmina é a mesma nas pontas que passam da borda: a primeira e a última seção do sólido têm o mesmo vão */
    const lam = g.passos.find((p: any) => p[0] === 'subdivisao')[1];
    const ys = lam.vertices.map((p: number[]) => p[0]);
    expect(Math.min(...ys)).toBeLessThan(-200);
    expect(Math.max(...ys)).toBeGreaterThan(200);
    expect(Math.abs(folga3d(st, 'a', 'b') - 4) / 4).toBeLessThan(0.02);
  });
});

describe('modo superficie: recusas, avisos e a unidade', () => {
  const placa = { passos: [['cubo', { origemId: 1, larg: 600, alt: 1, prof: 400 }]], origem: { op: 'cubo', id: 1 } };
  const base = { chapa: placa, vao: 4, linhas: [{ eixo: 'y', pontos: [[0, -300], [0, 300]] }], paineis: [{ nome: 'e', eixo: 'y', ponto: [-150, 0] }, { nome: 'd', eixo: 'y', ponto: [150, 0] }] };
  it('o modo exige os passos da chapa, recusa modo desconhecido e a linha fora da chapa, e o raio rasante', () => {
    expect(grito(() => paineisPorVaos({ ...base, chapa: { origem: placa.origem }, origemId: 5, modo: 'superficie', linhas: [{ eixo: 'y', pontos: [[0, -300], [0, 300]], alcance: [-1, 2] }] }))).toMatch(/precisa dos passos da chapa/);
    expect(grito(() => paineisPorVaos({ ...base, modo: 'curvo' }))).toMatch(/modo é 'vista'.*ou 'superficie'/);
    expect(grito(() => paineisPorVaos({ ...base, modo: 'superficie', linhas: [{ nome: 'solta', eixo: 'y', pontos: [[1000, 150], [1100, 150]] }] }))).toMatch(/a linha 'solta' não corta a chapa/);
    expect(grito(() => cortar([inclinada(1, 1, 85)], { op: 'extrusao', id: 1 }, { modo: 'superficie', linhas: [{ nome: 'r', eixo: 'y', pontos: [[-300, 17], [300, 17]] }], paineis: [{ nome: 'a', eixo: 'y', ponto: [0, 5] }] }))).toMatch(/raio rasante/);
  });
  it('a volta fechada menor que o vão recusa; o furo (descarta) fura a chapa', () => {
    const q = [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]];
    expect(grito(() => paineisPorVaos({ ...base, modo: 'superficie', linhas: [{ nome: 'q', eixo: 'y', fechada: true, pontos: q }], paineis: [{ nome: 'fora', eixo: 'y', ponto: [100, 100] }] }))).toMatch(/a volta 'q' é menor que o vão/);
    const g = paineisPorVaos({ ...base, modo: 'superficie', linhas: [{ nome: 'furo', eixo: 'y', fechada: true, dentro: 'descarta', pontos: [[-30, -30], [30, -30], [30, 30], [-30, 30]] }], paineis: [{ nome: 'fora', eixo: 'y', ponto: [100, 100] }] });
    expect(nucleo(g.passos, {}, {}).orfaos).toEqual([]);
    expect(g.medidas.pedacos).toBe(1);
  });
  it('a janela fechada dentro de um painel é um anel varrido, com o painel de dentro', () => {
    const g = paineisPorVaos({ ...base, modo: 'superficie', linhas: [{ nome: 'janela', eixo: 'y', fechada: true, pontos: [[-60, -40], [60, -40], [60, 40], [-60, 40]] }], paineis: [{ nome: 'fora', eixo: 'y', ponto: [200, 100] }, { nome: 'janela', eixo: 'y', ponto: [0, 0] }] });
    expect(g.medidas.paineisAchados).toBe(2);
    expect(g.passos.filter((p: any) => p[0] === 'subdivisao')).toHaveLength(1);
    const st = nucleo(g.passos, {}, {});
    expect(st.orfaos).toEqual([]);
    expect(Math.abs(folga3d(st, 'fora', 'janela') - 4) / 4).toBeLessThan(0.02);
  });
  it("saida: 'metro' converte os vértices da lâmina, e o modo vista segue com a saída de antes", () => {
    const mm = paineisPorVaos({ ...base, modo: 'superficie' });
    const m = paineisPorVaos({ ...base, modo: 'superficie', saida: 'metro' });
    const a = mm.passos.find((p: any) => p[0] === 'subdivisao')[1].vertices[0];
    const b = m.passos.find((p: any) => p[0] === 'subdivisao')[1].vertices[0];
    expect(b[0]).toBeCloseTo(a[0] / 1000, 9);
    const vista = paineisPorVaos(base);
    expect(vista.passos.filter((p: any) => p[0] === 'extrusao')).toHaveLength(1);
    expect(vista.passos.some((p: any) => p[0] === 'subdivisao')).toBe(false);
  });
});
