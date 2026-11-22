import { describe, it, expect } from 'vitest';
import { matrizPorLinhas, porColunas, cotaDeVarah, ordemDeGrauMinimo, fatorarCholesky, contarCholesky, resolverCholesky, fatorarLUEsparso, resolverLUEsparso, resolverLUEsparsoTransposta, baseDoNucleo } from './algebra-esparsa.js';
import { fatorarLU, resolverLU, linhasDoLimite, ajustarGaiolaAsMedidasComPeso } from './subdivisao.js';
import { gaiolaGrande } from '../../tools/fixtures/ajuste-esparso/gaiola-grande.mjs';

/* a matriz de uma grade nx × ny com o estêncil de cinco pontos mais a diagonal, positiva definida e diagonal dominante */
function grade(nx, ny, diag = 5) {
  const n = nx * ny; const m = matrizPorLinhas(n); const id = (i, j) => j * nx + i;
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
    const m = matrizPorLinhas(3);
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
    const m = matrizPorLinhas(3); m.somar(2, 0, 0.1); m.somar(2, 0, 0.2); m.somar(2, 2, 1); m.somar(2, 1, 3);
    const c = porColunas(m);
    expect([...c.indices.subarray(c.inicio[2], c.inicio[3])]).toEqual([0, 1, 2]);
    expect(c.valores[c.inicio[2]]).toBe(0.1 + 0.2);
  });
});

describe('LU esparso', () => {
  /* uma matriz não simétrica de grade com uma coluna a mais de ligação, determinística */
  const naoSimetrica = (nx, ny) => {
    const m = grade(nx, ny, 4.2);
    for (let k = 0; k + 3 < m.n; k += 5) m.somar(k, k + 3, 0.7);
    for (let k = 7; k < m.n; k += 11) m.somar(k, k - 7, -0.4);
    return m;
  };
  it('resolve A x = b e Aᵀ x = b como a eliminação densa', () => {
    const m = naoSimetrica(8, 9); const n = m.n; const A = densa(m);
    const b = Array.from({ length: n }, (_, k) => Math.cos(k * 0.9) + 0.05 * k);
    const f = fatorarLUEsparso(m);
    expect(f.deficientes).toEqual([]);
    const x = resolverLUEsparso(f, b); const xd = resolverLU(fatorarLU(A), b);
    for (let k = 0; k < n; k++) expect(Math.abs(x[k] - xd[k])).toBeLessThan(1e-12);
    const AT = A[0].map((_, c) => A.map((l) => l[c]));
    const xt = resolverLUEsparsoTransposta(f, b); const xtd = resolverLU(fatorarLU(AT), b);
    for (let k = 0; k < n; k++) expect(Math.abs(xt[k] - xtd[k])).toBeLessThan(1e-12);
  });

  it('o ponto de sela, com a diagonal nula nas linhas das restrições, pivota fora da diagonal', () => {
    const nU = 30; const m = matrizPorLinhas(nU + 3);
    for (let k = 0; k < nU; k++) { m.somar(k, k, 2); if (k + 1 < nU) { m.somar(k, k + 1, -0.5); m.somar(k + 1, k, -0.5); } }
    [[0, 1, 2], [10, 11], [20, 25, 29]].forEach((cols, s) => cols.forEach((c, t) => { m.somar(nU + s, c, 1 + t); m.somar(c, nU + s, 1 + t); }));
    const b = Array.from({ length: nU + 3 }, (_, k) => k % 4 - 1);
    const f = fatorarLUEsparso(m);
    expect(f.deficientes).toEqual([]);
    const x = resolverLUEsparso(f, b); const xd = resolverLU(fatorarLU(densa(m)), b);
    for (let k = 0; k < nU + 3; k++) expect(Math.abs(x[k] - xd[k])).toBeLessThan(1e-12);
  });

  it('a base do núcleo nomeia a união dos suportes, a mesma em qualquer ordem de colunas', () => {
    /* dois blocos singulares independentes (cada um com linhas que somam zero) e um bloco regular */
    const m = matrizPorLinhas(9);
    const bloco = (i0) => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) m.somar(i0 + a, i0 + b, a === b ? 2 : -1); };
    bloco(0); bloco(3); for (let k = 6; k < 9; k++) m.somar(k, k, 1);
    const natural = Int32Array.from({ length: 9 }, (_, k) => k); const trocada = Int32Array.from([8, 5, 4, 3, 7, 2, 1, 0, 6]);
    const a = fatorarLUEsparso(m, { ordem: natural }); const b = fatorarLUEsparso(m, { ordem: trocada });
    expect(a.deficientes.length).toBe(2); expect(b.deficientes.length).toBe(2);
    expect(baseDoNucleo(a)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(baseDoNucleo(b)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('a lei de custo do ajuste da gaiola (o teste de escala do plano do ajuste esparso)', () => {
  /* O custo é contado em operações, e não no relógio, que no CI anda de duas a três vezes mais devagar: as visitas da ordenação, as
     multiplicações da fatoração (Σ c_k² sobre as colunas de L) e os não nulos de L vezes as resoluções. O caminho esparso resolve três
     vezes (os eixos), porque o ganho sai da cota de Varah; o solver denso eliminava na ordem da rede e resolvia uma vez por medida para o
     ganho, mais os três eixos. O expoente entre dois tamanhos da gaiola de prova, que tem a ordem e a banda da lataria do carro, reprova
     acima de EXPOENTE_MAXIMO. Foi o gate que faltou: o denso crescia com expoente perto de 3 e nada o mediu antes do ensaio de escala. */
  const EXPOENTE_MAXIMO = 2.3;
  const medir = (passo) => {
    const { gaiola, medidas } = gaiolaGrande({ passo });
    const n = gaiola.vertices.length;
    const H = matrizPorLinhas(n); for (let k = 0; k < n; k++) H.somar(k, k, 1);
    for (const l of linhasDoLimite(gaiola, medidas.map((m) => m.indice))) for (const [r, a] of l) for (const [c, b] of l) H.somar(r, c, a * b);
    const contagem = {}; const ordem = ordemDeGrauMinimo(H, contagem);
    const esparso = contarCholesky(H, ordem);
    const natural = contarCholesky(H, Int32Array.from({ length: n }, (_, k) => k));
    return {
      n, gaiola, medidas,
      esparso: contagem.visitas + esparso.operacoes + 3 * esparso.naoNulos,
      denso: natural.operacoes + (medidas.length + 3) * natural.naoNulos,
    };
  };
  const pequena = medir(34); const grande = medir(21);
  const expoente = (chave) => Math.log(grande[chave] / pequena[chave]) / Math.log(grande.n / pequena.n);

  it(`o caminho esparso cresce com expoente até ${EXPOENTE_MAXIMO}, e o solver denso, na ordem da rede, passa dele`, () => {
    expect(grande.n / pequena.n).toBeGreaterThan(2);
    expect(expoente('esparso')).toBeLessThanOrEqual(EXPOENTE_MAXIMO);
    expect(expoente('denso')).toBeGreaterThan(EXPOENTE_MAXIMO);
  });

  it('o ajuste da gaiola de prova usa o caminho contado: o ganho pela cota, sem a conta exata', () => {
    expect(ajustarGaiolaAsMedidasComPeso(pequena.gaiola, pequena.medidas).ganhoPelaCota).toBe(true);
  });
});
