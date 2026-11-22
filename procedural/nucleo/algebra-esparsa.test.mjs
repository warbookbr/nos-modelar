import { describe, it, expect } from 'vitest';
import { matrizSimetrica, porColunas, cotaDeVarah, ordemDeGrauMinimo, fatorarCholesky, resolverCholesky } from './algebra-esparsa.js';
import { fatorarLU, resolverLU } from './subdivisao.js';

/* a matriz de uma grade nx × ny com o estêncil de cinco pontos mais a diagonal, positiva definida e diagonal dominante */
function grade(nx, ny, diag = 5) {
  const n = nx * ny; const m = matrizSimetrica(n); const id = (i, j) => j * nx + i;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = id(i, j); m.somar(k, k, diag);
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      if (i + di < nx && j + dj < ny) { const o = id(i + di, j + dj); m.somar(k, o, -1); m.somar(o, k, -1); }
    }
  }
  return m;
}
const densa = ({ n, linhas }) => Array.from({ length: n }, (_, r) => { const l = new Array(n).fill(0); for (const [c, v] of linhas[r]) l[c] = v; return l; });

describe('álgebra esparsa', () => {
  it('o Cholesky esparso resolve como a eliminação densa', () => {
    const m = grade(9, 7); const n = m.n;
    const b = Array.from({ length: n }, (_, k) => Math.sin(k * 1.7) + 0.1 * k);
    const f = fatorarCholesky(m);
    expect(f.naoPositivaEm).toBeUndefined();
    const x = resolverCholesky(f, b); const xd = resolverLU(fatorarLU(densa(m)), b);
    for (let k = 0; k < n; k++) expect(Math.abs(x[k] - xd[k])).toBeLessThan(1e-13);
  });

  it('o grau mínimo aproximado enche no máximo 10% mais que o exato do grafo de eliminação explícito', () => {
    /* a referência: o grafo explícito, que liga os vizinhos do eliminado entre si */
    const explicita = ({ n, linhas }) => {
      const adj = linhas.map((l, k) => new Set([...l.keys()].filter((c) => c !== k))); const fora = new Uint8Array(n); const ordem = [];
      while (ordem.length < n) {
        let v = -1; for (let k = 0; k < n; k++) if (!fora[k] && (v < 0 || adj[k].size < adj[v].size)) v = k;
        fora[v] = 1; ordem.push(v);
        for (const a of adj[v]) { adj[a].delete(v); for (const b of adj[v]) if (b !== a) adj[a].add(b); }
      }
      return ordem;
    };
    /* uma grade com ligações em diagonal e algumas longas, para que haja elementos absorvidos e graus empatados */
    const m = grade(14, 11);
    for (let k = 0; k + 15 < m.n; k += 7) { m.somar(k, k + 15, -0.1); m.somar(k + 15, k, -0.1); }
    for (let k = 3; k + 60 < m.n; k += 23) { m.somar(k, k + 60, -0.1); m.somar(k + 60, k, -0.1); }
    const exata = fatorarCholesky(m, Int32Array.from(explicita(m))).naoNulos;
    expect(fatorarCholesky(m).naoNulos).toBeLessThanOrEqual(1.1 * exata);
  });

  it('o grau mínimo enche menos que a ordem natural e é determinístico', () => {
    const m = grade(30, 30);
    const natural = fatorarCholesky(m, Int32Array.from({ length: m.n }, (_, k) => k));
    const minimo = fatorarCholesky(m);
    expect(minimo.naoNulos).toBeLessThan(natural.naoNulos / 2);
    expect([...ordemDeGrauMinimo(m)]).toEqual([...ordemDeGrauMinimo(grade(30, 30))]);
    /* a mesma entrada, o mesmo fator bit a bit */
    expect([...fatorarCholesky(grade(30, 30)).Lx]).toEqual([...minimo.Lx]);
  });

  it('a matriz que não é positiva definida para a fatoração no índice original', () => {
    const m = matrizSimetrica(3);
    m.somar(0, 0, 1); m.somar(1, 1, 1); m.somar(2, 2, 1); m.somar(0, 1, 2); m.somar(1, 0, 2);
    const f = fatorarCholesky(m);
    expect([0, 1]).toContain(f.naoPositivaEm);
  });

  it('a cota de Varah limita ‖A⁻¹‖∞ e é infinita sem dominância', () => {
    const m = grade(8, 8); const cota = cotaDeVarah(m);
    const lu = fatorarLU(densa(m)); const n = m.n; let norma = 0;
    const cols = Array.from({ length: n }, (_, c) => resolverLU(lu, Array.from({ length: n }, (__, r) => (r === c ? 1 : 0))));
    for (let r = 0; r < n; r++) { let s = 0; for (let c = 0; c < n; c++) s += Math.abs(cols[c][r]); norma = Math.max(norma, s); }
    expect(cota).toBe(1);
    expect(norma).toBeLessThanOrEqual(cota);
    expect(cotaDeVarah(grade(4, 4, 3))).toBe(Infinity);
  });

  it('a montagem por colunas ordena as linhas e soma na ordem dos termos', () => {
    const m = matrizSimetrica(3); m.somar(2, 0, 0.1); m.somar(2, 0, 0.2); m.somar(2, 2, 1); m.somar(2, 1, 3);
    const c = porColunas(m);
    expect([...c.indices.subarray(c.inicio[2], c.inicio[3])]).toEqual([0, 1, 2]);
    expect(c.valores[c.inicio[2]]).toBe(0.1 + 0.2);
  });
});
