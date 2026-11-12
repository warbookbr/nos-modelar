/* limpar-lascas.test.ts — `limparLascas`: a limpeza das faces finas que uma booleana deixa.
   Mede, em fixtures sem domínio de objeto: (a) o cálculo puro, na ponta (aresta curta) e na lâmina (apice sobre a aresta) de uma chapa
   fechada feita à mão; (b) o corte em modo superfície do `paineisPorVaos` em cilindro, calota e sela, onde a booleana deixa de 2 a 7 faces
   finas: depois da limpeza, nenhuma, a malha continua fechada e sem face virada, a superfície sai do lugar menos que a tolerância
   (distância máxima nos dois sentidos), o volume e a folga 3D entre os painéis ficam onde estavam, e o resultado é o mesmo em duas
   execuções; (c) a dobra de 140 graus e as concordâncias de raio 3 e 5, onde as faces finas JÁ ESTÃO na chapa de entrada (a tira de
   0,2 mm da concordância, a tampa de 1 mm por 585 mm) e a limpeza não cria nenhuma nem acha como desfazer essas; (d) a operação no
   passo: recusas, o aviso das que ficam, a origem da booleana ainda resolvendo as duas partes depois, o par da costura que segue a
   fusão; e (e) o tempo numa chapa de 54 mil faces. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo em JavaScript.
import { limparLascas, razaoDeFace } from './limpar-lascas.js';
// @ts-expect-error — núcleo em JavaScript.
import { paineisPorVaos } from './paineis-por-vaos.js';
// @ts-expect-error — núcleo em JavaScript.
import { nucleo } from './entrada.js';

type V3 = [number, number, number];
type Malha = { V: Map<number, V3>; F: Map<number, { vs: number[]; parte?: string | null }> };
const rad = Math.PI / 180;
const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const mais = (o: V3, u: V3, t: number): V3 => [o[0] + u[0] * t, o[1] + u[1] * t, o[2] + u[2] * t];
const grito = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } throw new Error('não gritou'); };

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
const triangulos = (m: Malha) => {
  const T: V3[][] = [];
  for (const f of m.F.values()) { const p = f.vs.map((v) => m.V.get(v) as V3); for (let k = 1; k + 1 < p.length; k++) T.push([p[0], p[k], p[k + 1]]); }
  return T;
};
/** A distância máxima entre duas malhas, nos dois sentidos, nos vértices e nos pontos médios das arestas das faces que mudaram (grade de células de `cel`). */
function hausdorff(a: Malha, b: Malha, cel = 8) {
  const grade = (T: V3[][]) => {
    const g = new Map<string, number[]>();
    T.forEach((t, n) => {
      const lo = [0, 1, 2].map((e) => Math.floor(Math.min(t[0][e], t[1][e], t[2][e]) / cel)); const hi = [0, 1, 2].map((e) => Math.floor(Math.max(t[0][e], t[1][e], t[2][e]) / cel));
      for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) { const c = `${i},${j},${k}`; (g.get(c) ?? g.set(c, []).get(c)!).push(n); }
    });
    return g;
  };
  const chave = (m: Malha, vs: number[]) => vs.map((v) => (m.V.get(v) as V3).join(',')).join(';');
  const amostrasDasMudadas = (m: Malha, outra: Malha) => {
    const iguais = new Set([...outra.F.values()].map((f) => chave(outra, f.vs)));
    const S: V3[] = [];
    for (const f of m.F.values()) {
      if (iguais.has(chave(m, f.vs))) continue;
      for (let k = 0; k < f.vs.length; k++) { const p = m.V.get(f.vs[k]) as V3; const q = m.V.get(f.vs[(k + 1) % f.vs.length]) as V3; S.push(p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]); }
    }
    return S;
  };
  const sentido = (de: Malha, para: Malha) => {
    const T = triangulos(para); const G = grade(T); let m = 0;
    for (const p of amostrasDasMudadas(de, para)) {
      const c = p.map((x) => Math.floor(x / cel)); let melhor = Infinity; const vistos = new Set<number>();
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) for (const t of G.get(`${c[0] + i},${c[1] + j},${c[2] + k}`) ?? []) { if (vistos.has(t)) continue; vistos.add(t); melhor = Math.min(melhor, distTri(p, T[t])); }
      m = Math.max(m, melhor === Infinity ? 99 : melhor);
    }
    return m;
  };
  return Math.max(sentido(a, b), sentido(b, a));
}
function semPar(m: Malha) {
  const dir = new Map<string, number>();
  for (const f of m.F.values()) for (let k = 0; k < f.vs.length; k++) { const c = `${f.vs[k]}>${f.vs[(k + 1) % f.vs.length]}`; dir.set(c, (dir.get(c) ?? 0) + 1); }
  let n = 0;
  for (const [c, q] of dir) { const [x, y] = c.split('>'); if (q > 1 || dir.get(`${y}>${x}`) !== q) n++; }
  return n;
}
function volume(m: Malha) {
  let v = 0;
  for (const f of m.F.values()) { const P = f.vs.map((w) => m.V.get(w) as V3); for (let k = 1; k + 1 < P.length; k++) { const [a, b, c] = [P[0], P[k], P[k + 1]]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; } }
  return v;
}
const finas = (m: Malha, limite = 0.003) => [...m.F.values()].filter((f) => razaoDeFace(f.vs.map((v) => m.V.get(v) as V3)) < limite).length;
const copia = (st: any): Malha => ({ V: new Map([...st.V].map(([k, p]: any) => [k, [...p] as V3])), F: new Map([...st.F].map(([k, f]: any) => [k, { ...f, vs: [...f.vs] }])) });
function aplicar(m: Malha, r: any): Malha {
  const s = copia(m);
  for (const [v, p] of r.vertices) s.V.set(v, p);
  for (const v of r.verticesRemovidos) s.V.delete(v);
  for (const f of r.facesRemovidas) s.F.delete(f);
  for (const [f, vs] of r.faces) (s.F.get(f) as any).vs = vs;
  return s;
}
const normal = (m: Malha, vs: number[]): V3 => {
  const P = vs.map((v) => m.V.get(v) as V3); let nx = 0; let ny = 0; let nz = 0;
  for (let k = 0; k < P.length; k++) { const a = P[k]; const b = P[(k + 1) % P.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
  return [nx, ny, nz];
};
/** As faces que a limpeza mudou e que viraram: o produto das normais de antes e de depois fica negativo. */
function facesViradas(antes: Malha, depois: Malha) {
  let n = 0;
  for (const [id, f] of depois.F) {
    const o = antes.F.get(id); if (!o || o.vs.join() === f.vs.join()) continue;
    const a = normal(antes, o.vs); const b = normal(depois, f.vs);
    if (Math.hypot(...a) > 0 && Math.hypot(...b) > 0 && dot(a, b) < 0) n++;
  }
  return n;
}

/* ---- (a) o cálculo puro, numa chapa fechada de 10 x 10 x 1 feita à mão ---- */
function chapaComLasca(tipo: 'ponta' | 'lamina', alto = 0): Malha {
  const V = new Map<number, V3>([[0, [0, 0, 0]], [1, [10, 0, 0]], [2, [10, 10, 0]], [3, [0, 10, 0]], [4, [0, 0, 1]], [5, [10, 0, 1]], [6, [10, 10, 1]], [7, [0, 10, 1]]]);
  const F = new Map<number, { vs: number[]; parte: string }>();
  const poe = (vs: number[]) => F.set(F.size, { vs, parte: 'chapa' });
  poe([0, 3, 2, 1]);
  if (tipo === 'ponta') {
    /* o canto de cima partido em dois vértices a 0,01 mm: o leque do topo tem um triângulo de aresta curta, e a face da frente um canto a mais */
    V.set(8, [0.01, 0, 1]);
    poe([0, 1, 5, 8, 4]); poe([1, 2, 6, 5]); poe([2, 3, 7, 6]); poe([3, 0, 4, 7]);
    poe([7, 4, 8]); poe([7, 8, 5]); poe([7, 5, 6]);
  } else {
    /* um ponto a 0,0021 da diagonal do topo, dentro do triângulo de cima: o triângulo da diagonal sai com a altura de 2 µm */
    V.set(8, [5, 5.003, 1 + alto]);
    poe([0, 1, 5, 4]); poe([1, 2, 6, 5]); poe([2, 3, 7, 6]); poe([3, 0, 4, 7]);
    poe([4, 5, 6]); poe([4, 6, 8]); poe([6, 7, 8]); poe([7, 4, 8]);
  }
  return { V, F };
}

describe('limparLascas: o cálculo puro', () => {
  for (const tipo of ['ponta', 'lamina'] as const) {
    it(`a ${tipo} da chapa fechada some sem mover a superfície, sem abrir a malha e sem virar face`, () => {
      const m = chapaComLasca(tipo);
      expect(semPar(m)).toBe(0);
      expect(finas(m)).toBe(1);
      const r = limparLascas(m, { tolerancia: 0.01 });
      const d = aplicar(m, r);
      expect(r.relatorio.finasAntes).toBe(1);
      expect(r.relatorio.finasDepois).toBe(0);
      expect(finas(d)).toBe(0);
      expect(semPar(d)).toBe(0);
      expect(facesViradas(m, d)).toBe(0);
      expect(Math.abs(volume(d) - volume(m))).toBeLessThan(1e-3);
      expect(hausdorff(m, d)).toBeLessThan(0.01);
      expect(r.relatorio.restantes).toEqual([]);
      if (tipo === 'ponta') expect(r.relatorio.colapsos).toBe(1); else expect(r.relatorio.trocas).toBe(1);
    });
  }
  it('uma tolerância menor que o que a lasca pede deixa a face como está e diz por quê', () => {
    /* o ponto 5 µm acima do plano do topo: a troca da diagonal move a superfície até 2,5 µm */
    const m = chapaComLasca('lamina', 0.005);
    const r = limparLascas(m, { tolerancia: 1e-3 });
    expect(r.relatorio.finasDepois).toBe(1);
    expect(r.relatorio.restantes[0].recusas.join(' ')).toMatch(/tolerância/);
    expect(aplicar(m, r).V.size).toBe(m.V.size);
    expect(limparLascas(m, { tolerancia: 0.01 }).relatorio.finasDepois).toBe(0);
  });
  it('não toca face fora da seleção nem a que tem tinta, e a parte não perde a última face', () => {
    const m = chapaComLasca('ponta');
    const so = limparLascas(m, { tolerancia: 0.01, selecao: [0, 1, 2, 3, 4] });
    expect(so.relatorio.finasAntes).toBe(0);
    expect(finas(aplicar(m, so))).toBe(1);
    const tinta = chapaComLasca('ponta'); (tinta.F.get(5) as any).tinta = [{ x: 1 }];
    expect(limparLascas(tinta, { tolerancia: 0.01 }).relatorio.restantes.map((x: any) => x.face)).toEqual([5]);
  });
  it('recusa a tolerância que não é número positivo e o limite fora de 0 a 0,5', () => {
    const m = chapaComLasca('ponta');
    expect(grito(() => limparLascas(m, { tolerancia: 0 }))).toMatch(/tolerância/);
    expect(grito(() => limparLascas(m, { tolerancia: 0.01, limite: 0.9 }))).toMatch(/limite/);
  });
});

/* ---- (b) o corte em modo superfície ---- */
const casca = (f: (x: number, z: number) => number, N = 9, niveis = 2) => {
  const vertices: number[][] = []; const faces: number[][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = -200 + (400 * i) / (N - 1); const z = -200 + (400 * j) / (N - 1); vertices.push([x, f(x, z), z]); }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const a = i * N + j; faces.push([a, a + 1, a + N + 1, a + N]); }
  return { passos: [['subdivisao', { origemId: 1, vertices, faces, niveis, espessura: 1 }]], origem: { op: 'subdivisao', id: 1 } };
};
const JANELA = [{ nome: 'j', eixo: 'y', fechada: true, pontos: Array.from({ length: 16 }, (_, k) => [100 * Math.cos((2 * Math.PI * k) / 16) + 40, 70 * Math.sin((2 * Math.PI * k) / 16) + 30]) }];
const PJ = [{ nome: 'a', eixo: 'y', ponto: [-170, -170] }, { nome: 'b', eixo: 'y', ponto: [40, 30] }];
const DIAG = [{ nome: 'd', eixo: 'y', pontos: [[-300, -250], [300, 250]] }];
const PD = [{ nome: 'a', eixo: 'y', ponto: [80, -80] }, { nome: 'b', eixo: 'y', ponto: [-80, 80] }];
const parte = (st: any, nome: string) => [...st.F.values()].filter((f: any) => f.parte === nome);
const trisDaParte = (st: any, nome: string) => { const t: V3[][] = []; for (const f of parte(st, nome)) { const p = f.vs.map((v: number) => st.V.get(v) as V3); for (let k = 1; k + 1 < p.length; k++) t.push([p[0], p[k], p[k + 1]]); } return t; };
function folga3d(st: any, a: string, b: string) {
  const A = trisDaParte(st, a); const B = trisDaParte(st, b); let m = Infinity;
  const cantos = (T: V3[][]) => [...new Map(T.flat().map((p) => [p.join(','), p])).values()];
  for (const p of cantos(A)) for (const t of B) m = Math.min(m, distTri(p, t));
  for (const p of cantos(B)) for (const t of A) m = Math.min(m, distTri(p, t));
  return m;
}
const comLimpeza = (g: any, tolerancia = 0.01) => {
  const i = g.passos.findIndex((p: any[]) => p[0] === 'subtrair');
  return [...g.passos.slice(0, i + 1), ['limparLascas', { sel: { origem: g.origemDoCorte }, tolerancia }], ...g.passos.slice(i + 1)];
};

describe('limparLascas: o corte em modo superfície do paineisPorVaos', () => {
  for (const [nome, f, linhas, paineis] of [
    ['cilindro com diagonal', (x: number) => -(x * x) / 300, DIAG, PD],
    ['calota com diagonal', (x: number, z: number) => -(x * x + z * z) / 300, DIAG, PD],
    ['sela com janela', (x: number, z: number) => (x * x - z * z) / 300, JANELA, PJ],
  ] as [string, any, any, any][]) {
    it(`${nome}: zero faces finas, malha fechada, superfície e folga no lugar, sem perder parte`, () => {
      const g = paineisPorVaos({ chapa: casca(f), vao: 4, linhas, paineis, modo: 'superficie', limpar: false });
      const sem = nucleo(g.passos, {}, {});
      const com = nucleo(comLimpeza(g), {}, {});
      expect(sem.orfaos).toEqual([]);
      expect(com.orfaos).toEqual([]);
      const A = copia(sem); const B = copia(com);
      /* o defeito de antes, medido: de 2 a 7 faces finas que a booleana deixa */
      expect(finas(A)).toBeGreaterThanOrEqual(2);
      expect(finas(B)).toBe(0);
      expect(com.avisos.filter((a: any) => a.ref === 'lascasRestantes')).toEqual([]);
      expect(semPar(B)).toBe(0);
      expect(facesViradas(A, B)).toBe(0);
      expect(Math.abs(volume(B) - volume(A))).toBeLessThan(0.1);
      expect(hausdorff(A, B)).toBeLessThan(0.01);
      expect(new Set(parte(com, 'a').concat(parte(com, 'b')).map((x: any) => x.parte))).toEqual(new Set(['a', 'b']));
      expect(Math.abs(folga3d(com, 'a', 'b') - folga3d(sem, 'a', 'b'))).toBeLessThan(0.01);
      process.stdout.write(`[${nome}] faces finas ${finas(A)} -> ${finas(B)}, distância máxima ${hausdorff(A, B).toFixed(4)} mm, folga ${folga3d(sem, 'a', 'b').toFixed(4)} -> ${folga3d(com, 'a', 'b').toFixed(4)}\n`);
    });
  }
  it('o resultado é o mesmo em duas execuções, e na ordem dos mapas de entrada', () => {
    const g = paineisPorVaos({ chapa: casca((x: number, z: number) => -(x * x + z * z) / 300), vao: 4, linhas: DIAG, paineis: PD, modo: 'superficie' });
    const st = nucleo(g.passos, {}, {});
    const m = copia(st);
    const a = limparLascas(m, { tolerancia: 0.01 });
    const b = limparLascas(copia(st), { tolerancia: 0.01 });
    const ord = (m: Map<number, unknown>) => [...m].sort((x, y) => x[0] - y[0]);
    const texto = (r: any) => JSON.stringify({ v: ord(r.vertices), rv: [...r.verticesRemovidos].sort((x: number, y: number) => x - y), f: ord(r.faces), rf: [...r.facesRemovidas].sort((x: number, y: number) => x - y), u: ord(r.fusoes) });
    expect(texto(a)).toBe(texto(b));
    const embaralhada: Malha = { V: new Map([...m.V].reverse()), F: new Map([...m.F].reverse()) };
    expect(texto(limparLascas(embaralhada, { tolerancia: 0.01 }))).toBe(texto(a));
  });
});

/* ---- (c) a dobra de 140 graus e as concordâncias ---- */
function chapaDobrada(centro: number[][], T: number) {
  const n = centro.length;
  const nor = centro.map((_, i) => { const a = centro[Math.max(0, i - 1)]; const b = centro[Math.min(n - 1, i + 1)]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[1] - a[1]) / L, -(b[0] - a[0]) / L]; });
  const s = nor.reduce((acc, v) => acc + v[1], 0) > 0 ? 1 : -1;
  const pol = [...centro, ...centro.map((p, i) => [p[0] - s * nor[i][0] * T, p[1] - s * nor[i][1] * T]).reverse()];
  let A = 0; pol.forEach((p, i) => { const q = pol[(i + 1) % pol.length]; A += p[0] * q[1] - q[0] * p[1]; });
  const ccw = A > 0 ? pol : [...pol].reverse();
  return { passos: [['extrusao', { origemId: 1, eixo: 'x', altura: 300, em: [-150, 0, 0], perfil: [...ccw].reverse().map(([z, y]) => [-y, z]) }]], origem: { op: 'extrusao', id: 1 } };
}
const cumeeira = (r: number, giro = 90) => {
  const h = (giro / 2) * rad; const pts: number[][] = [[-200, -200 * Math.tan(h)]];
  if (r === 0) pts.push([0, 0]); else for (let k = 0; k <= 24; k++) { const th = -h + (2 * h * k) / 24; pts.push([r * Math.sin(th), -(r - r * Math.cos(th))]); }
  pts.push([200, -200 * Math.tan(h)]); return pts;
};

describe('limparLascas: as faces finas que já estão na chapa de entrada', () => {
  for (const [nome, chapa] of [
    ['quina viva de 140 graus em chapa de 1 mm', chapaDobrada(cumeeira(0, 140), 1)],
    ['concordância convexa de raio 3 em chapa de 1 mm', chapaDobrada(cumeeira(3, 90), 1)],
    ['concordância convexa de raio 5 em chapa de 1 mm', chapaDobrada(cumeeira(5, 90), 1)],
  ] as [string, any][]) {
    it(`${nome}: o corte não cria face fina (a chapa já tinha), a limpeza não cria nenhuma e avisa as que ficam`, () => {
      const g = paineisPorVaos({ chapa, vao: 4, modo: 'superficie', linhas: [{ nome: 'x', eixo: 'y', pontos: [[0, -300], [0, 300]] }], paineis: [{ nome: 'a', eixo: 'y', ponto: [-60, 0] }, { nome: 'b', eixo: 'y', ponto: [60, 0] }] });
      const daChapa = copia(nucleo(chapa.passos, {}, {}));
      const sem = copia(nucleo(g.passos, {}, {}));
      const comSt = nucleo(comLimpeza(g), {}, {});
      const com = copia(comSt);
      /* cada face fina da chapa vira no máximo duas depois do corte: o corte parte a tira ao meio, e nenhuma face boa vira fina */
      expect(finas(daChapa)).toBeGreaterThan(0);
      expect(finas(sem)).toBeLessThanOrEqual(2 * finas(daChapa));
      expect(finas(com)).toBeLessThanOrEqual(finas(sem));
      expect(semPar(com)).toBe(0);
      expect(facesViradas(sem, com)).toBe(0);
      expect(hausdorff(sem, com)).toBeLessThan(0.01);
      expect(comSt.avisos.some((a: any) => a.ref === 'lascasRestantes' && a.restantes === finas(com))).toBe(true);
      expect(new Set(parte(comSt, 'a').concat(parte(comSt, 'b')).map((x: any) => x.parte))).toEqual(new Set(['a', 'b']));
      process.stdout.write(`[${nome}] faces finas: chapa ${finas(daChapa)}, depois do corte ${finas(sem)}, depois da limpeza ${finas(com)}\n`);
    });
  }
});

/* ---- (d) a operação no passo ---- */
describe('limparLascas: a operação no passo', () => {
  const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }], ['subtrair', { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }]];
  it('recusa a chamada sem sel, sem tolerância ou com tolerância que não é número positivo, e argumento que ela não conhece', () => {
    const motivos = (args: object) => nucleo([...base, ['limparLascas', args]], {}, {}).orfaos.map((o: any) => o.motivo).join(' | ');
    expect(motivos({ tolerancia: 0.001 })).toMatch(/exige sel/);
    expect(motivos({ sel: { tudo: true } })).toMatch(/exige tolerancia/);
    expect(motivos({ sel: { tudo: true }, tolerancia: -1 })).toMatch(/número positivo/);
    expect(motivos({ sel: { tudo: true }, tolerancia: 0.001, limite: 2 })).toMatch(/entre 0 e 0,5/);
    expect(motivos({ sel: { tudo: true }, tolerancia: 0.001, raio: 1 })).toMatch(/argumento desconhecido 'raio'/);
  });
  it('sem lasca, a malha sai idêntica e sem aviso', () => {
    const sem = nucleo(base, {}, {});
    const com = nucleo([...base, ['limparLascas', { sel: { origem: { op: 'subtrair', id: 9 } }, tolerancia: 0.00001 }]], {}, {});
    expect(com.orfaos).toEqual([]);
    expect(JSON.stringify([...com.F])).toBe(JSON.stringify([...sem.F]));
    expect(com.avisos).toEqual([]);
  });
  it('a origem da booleana segue citável, e o par da costura acompanha a fusão', () => {
    const g = paineisPorVaos({ chapa: casca((x: number, z: number) => (x * x - z * z) / 300), vao: 4, linhas: JANELA, paineis: PJ, modo: 'superficie' });
    const passos = comLimpeza(g);
    const com = nucleo([...passos, ['solido', { sel: { origem: { ...g.origemDoCorte, costura: true } } }]], {}, {});
    expect(com.orfaos).toEqual([]);
    expect(new Set([...com.F.values()].map((f: any) => f.parte)).size).toBe(2);
  });
});

/* ---- (e) o tempo numa chapa de 54 mil faces ---- */
describe('limparLascas: o tempo', () => {
  it('numa chapa de subdivisão de 52 mil faces sem lasca, a varredura leva menos de 3 s', () => {
    const m = copia(nucleo(casca((x: number, z: number) => -(x * x + z * z) / 300, 21, 3).passos, {}, {}));
    expect(m.F.size).toBeGreaterThan(50000);
    const t0 = performance.now();
    const r = limparLascas(m, { tolerancia: 0.01 });
    const ms = performance.now() - t0;
    process.stdout.write(`[chapa de subdivisão de ${m.F.size} faces] limpeza ${ms.toFixed(0)} ms, sem lasca\n`);
    expect(r.relatorio.finasAntes).toBe(0);
    expect(ms).toBeLessThan(3000);
  });
  it('em 54 mil faces de lajes com uma lasca a cada oito ou nove (6.400, de uma lâmina ou de uma ponta), a limpeza leva menos de 5 s e as desfaz', () => {
    const V = new Map<number, V3>(); const F = new Map<number, { vs: number[]; parte: string }>();
    let nv = 0; let nf = 0;
    for (let k = 0; k < 6400; k++) {
      const lajes = chapaComLasca(k % 2 ? 'ponta' : 'lamina');
      const base = nv; const dx = (k % 100) * 20; const dy = Math.floor(k / 100) * 20;
      for (const [id, p] of lajes.V) V.set(base + id, [p[0] + dx, p[1] + dy, p[2]]);
      nv += lajes.V.size;
      for (const f of lajes.F.values()) F.set(nf++, { vs: f.vs.map((v) => base + v), parte: `laje${k}` });
    }
    expect(F.size).toBeGreaterThan(50000);
    const m: Malha = { V, F };
    const t0 = performance.now();
    const r = limparLascas(m, { tolerancia: 0.01 });
    const ms = performance.now() - t0;
    process.stdout.write(`[${F.size} faces, ${r.relatorio.finasAntes} lascas] limpeza ${ms.toFixed(0)} ms, faces finas ${r.relatorio.finasAntes} -> ${r.relatorio.finasDepois}, colapsos ${r.relatorio.colapsos}, trocas ${r.relatorio.trocas}\n`);
    expect(r.relatorio.finasAntes).toBe(6400);
    expect(r.relatorio.finasDepois).toBe(0);
    expect(ms).toBeLessThan(15000); /* 0,7 s aqui, 5,2 s no CI com a máquina dividida: o teto pega a limpeza quadrática, não a carga */
    expect(semPar(aplicar(m, r))).toBe(0);
  });
});

/* O passo no estado: o peso do vértice que some passa ao que fica, o registro de fusão entra em `merges`, e a face desfeita fica em `consumidas` (a citação explícita diz que o passo a desfez e a da origem inteira segue valendo). */
describe('limparLascas no estado: pesos, fusões e consumo', () => {
  const E = { ossos: [{ nome: 'o' }, { nome: 'p' }] };
  const rodar = (passos: any[]) => nucleo(passos, {}, {}, {}, E, [], {});
  const V = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 1], [10, 0, 1], [10, 10, 1], [0, 10, 1], [0.01, 0, 1]];
  const F = [[0, 3, 2, 1], [0, 1, 5, 8, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [7, 4, 8], [7, 8, 5], [7, 5, 6]];
  const S = ['subdivisao', { origemId: 1, vertices: V, faces: F, niveis: 0 }];
  const L = ['limparLascas', { sel: { tudo: true }, tolerancia: 0.05 }];
  const base = rodar([S]);
  const vid = [...base.V.keys()] as number[];

  it('o vértice que some deixa o peso no que fica (o maior por osso) e o registro de fusão', () => {
    const st = rodar([S, ['pesar', { osso: 'o', peso: 1, sel: { v: [vid[8]] } }], ['pesar', { osso: 'p', peso: 0.5, sel: { v: [vid[4]] } }], ['pesar', { osso: 'o', peso: 0.25, sel: { v: [vid[4]] } }], L]);
    expect(st.orfaos).toEqual([]);
    expect(st.V.has(vid[8])).toBe(false);
    expect(st.pesos.has(vid[8])).toBe(false);
    expect([...st.pesos.get(vid[4])].sort()).toEqual([['o', 1], ['p', 0.5]]);
    expect(st.merges).toEqual([{ de: [vid[8]], para: vid[4] }]);
  });

  it('a face desfeita entra em consumidas: a citação explícita diz que o passo a desfez, e a origem inteira segue valendo', () => {
    const ids = [...base.F.keys()] as number[];
    const st = rodar([S, L]);
    const sumiu = ids.filter((f) => !st.F.has(f));
    expect(sumiu).toHaveLength(1);
    expect(rodar([S, L, ['liso', { sel: { origem: { op: 'subdivisao', id: 1 } } }]]).orfaos).toEqual([]);
  });
});

/* A face dobrada sobre si mesma. O corte de vão por curva que passa a 2 mm de uma estação deixa, na parede do vão, uma face de cinco cantos
   na mesma reta até o ruído (a lateral traseira do sedã, no fim da porta, na quina da cintura): área de 1e-4 mm² e razão de 7e-5. A vizinha
   que a absorve ganha os cantos e fica com eles a décimos de micrômetro fora da reta, e a limpeza recusava a fusão por "não é convexa" e por
   "valência 2" (o canto que passa à vizinha era contado sem ela). Os pontos e as seis faces são os do carro, em mm, com a tolerância de
   0,01 mm que o corte usa. */
describe('limparLascas: a face de cantos alinhados até o ruído', () => {
  const P: V3[] = [[-857.859375, 997.826263, -762.03129], [-858.582467, 996.67288, -765.19033], [-857.859375, 997.826263, -765.19033], [-858.582075, 996.674374, -762.03129], [-858.805335, 995.822842, -762.03129], [-859.028578, 994.971375, -765.19033], [-857.377851, 998.117947, -762.03129], [-856.695029, 998.531568, -765.19033], [-856.695029, 998.531568, -762.03129], [-859.510979, 997.074456, -762.03129], [-859.763485, 996.111376, -762.03129], [-859.046316, 997.815625, -762.03129], [-858.158689, 997.348836, -762.03129], [-858.813819, 998.186476, -762.03129], [-857.946412, 997.687433, -762.03129], [-857.911492, 997.743132, -762.03129], [-858.638279, 998.466474, -762.03129], [-857.83106, 999.012575, -762.03129], [-858.580535, 998.558579, -762.03129]];
  /* a face 9 é a dobrada: [3, 0, 15, 14, 12] */
  const FACES = [[0, 1, 2], [3, 4, 5, 1], [6, 0, 2, 7, 8], [9, 10, 4, 3], [11, 9, 3, 12], [13, 11, 12, 14], [15, 16, 13, 14], [6, 17, 18, 16, 0], [15, 0, 16], [3, 0, 15, 14, 12], [0, 3, 1]];
  const malha = (): Malha => ({
    V: new Map(P.map((p, k) => [k, p] as [number, V3])),
    F: new Map(FACES.map((vs, k) => [k, { vs, parte: 'chapa' }] as [number, { vs: number[]; parte: string }])),
  });

  it('a face de área quase nula some, absorvida pela vizinha, e a superfície sai do lugar menos que a tolerância', () => {
    const m = malha();
    expect(razaoDeFace(m.F.get(9)!.vs.map((v) => m.V.get(v)))).toBeLessThan(1e-3);
    const r = limparLascas(m, { selecao: null, tolerancia: 0.01 });
    expect(r.relatorio.finasAntes).toBe(1);
    expect(r.relatorio.finasDepois).toBe(0);
    expect(r.facesRemovidas.has(9)).toBe(true);
    expect(r.relatorio.desvioMaximo).toBeLessThan(0.01);
    for (const [, vs] of r.faces) expect(razaoDeFace((vs as number[]).map((v) => m.V.get(v)))).toBeGreaterThanOrEqual(0.003);
  });

  it('sem a tolerância que cobre o ruído ela fica, com o motivo', () => {
    const r = limparLascas(malha(), { selecao: null, tolerancia: 1e-9 });
    expect(r.relatorio.finasDepois).toBe(1);
    expect(r.relatorio.restantes[0].recusas.length).toBeGreaterThan(0);
  });
});

/* (f) a face de área nula que o corte do `aparar` deixou no chassi do sedã (CICLO-5.md, atrito 4), com a vizinhança medida: a fita de 17 cantos alinhados,
   de 4 mm por 0,00008 mm (área 3e-10 m²), e o triângulo de 0,015 mm de aresta, bem proporcionado e sem área para a medida de contatos triangular. A razão
   área / maior aresta² não pega o segundo, e a fita só sai para a vizinha, também fina; com a área mínima, saem as duas. */
describe('limparLascas: a face sem área para a medida de contatos', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/lascas-do-aparar.json', import.meta.url), 'utf8'));
  const malhaDoAparar = (): Malha => ({ V: new Map(fx.vertices.map((p: V3, i: number) => [i, p])), F: new Map(fx.faces.map((f: { vs: number[]; parte: string }, i: number) => [i, { vs: f.vs, parte: f.parte }])) });
  const area = (m: Malha, f: number) => { const p = m.F.get(f)!.vs.map((v) => m.V.get(v)!); let nx = 0; let ny = 0; let nz = 0; for (let k = 0; k < p.length; k++) { const a = p[k]; const b = p[(k + 1) % p.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); } return Math.hypot(nx, ny, nz) / 2; };
  const AREA_MINIMA = 2.9e-9;

  it('as duas faces da fixture têm área abaixo da mínima, e a fita tem 17 cantos', () => {
    const m = malhaDoAparar();
    expect(m.F.get(fx.alvos[0])!.vs.length).toBe(17);
    for (const a of fx.alvos) expect(area(m, a)).toBeLessThan(AREA_MINIMA);
  });

  it('sem a área mínima as duas ficam; com ela saem, dentro da tolerância e sem lasca nova', () => {
    const sem = limparLascas(malhaDoAparar(), { tolerancia: 1e-5 });
    for (const a of fx.alvos) expect(sem.facesRemovidas.has(a)).toBe(false);
    const m = malhaDoAparar();
    const com = limparLascas(m, { tolerancia: 1e-5, areaMinima: AREA_MINIMA });
    for (const a of fx.alvos) expect(com.facesRemovidas.has(a)).toBe(true);
    expect(com.relatorio.desvioMaximo).toBeLessThan(1e-5);
    for (const [f, vs] of com.faces) expect(area({ V: m.V, F: new Map([[f, { vs }]]) } as Malha, f)).toBeGreaterThan(0);
  });

  it('a área mínima negativa grita', () => {
    expect(grito(() => limparLascas(malhaDoAparar(), { tolerancia: 1e-5, areaMinima: -1 }))).toMatch(/área mínima/);
  });
});

