/* friso-refinar.test.mjs — a moldura que segue a curva da borda do vão na superfície limite (fatia 4c do plano do núcleo para qualquer mecanismo, atrito 4 do
   ciclo 3 do sedã): o canto de uma janela, que sai em poucos segmentos retos quando o friso passa pelos vértices da malha da chapa, e a opção `refinar` do
   `friso` e o pedido `{ borda }` da `curvaDaGaiola`, que levam a linha à curva refinada. Sem domínio: uma chapa plana de 400 mm com um vão quadrado de cantos
   livres numa gaiola de faces de 50 mm.

   O critério é declarado aqui: o giro entre dois segmentos vizinhos da linha, em graus, abaixo de `LIMITE_DO_GIRO_GRAUS`; a linha que a opção dá é o contorno da
   malha de `niveis + refinar` níveis da mesma gaiola, a 1e-9 m; e a moldura assenta na chapa. */
import { describe, expect, it } from 'vitest';
import { curvaDaGaiola } from './curva-da-gaiola.js';
import { neutroCanonico, nucleo } from './entrada.js';
import { cadeiaRefinada } from './friso.js';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { subdividirCatmullClark } from './subdivisao.js';

/** O giro máximo, em graus, entre dois segmentos vizinhos da linha de um friso: o canto da moldura sem quebra visível. */
const LIMITE_DO_GIRO_GRAUS = 10;
const N = 9; const P = 0.05;
const colunas = Array.from({ length: N }, (_, j) => ({ nome: `c${j}`, em: [(j - 4) * P, 0] }));
const gaiola = () => gaiolaPorEstacoes({
  eixo: 'z', niveis: 2,
  estacoes: Array.from({ length: N }, (_, i) => ({ nome: `e${i}`, em: i * P, colunas: i >= 3 && i <= 5 ? colunas.filter((c) => ![3, 4, 5].includes(Number(c.nome.slice(1)))) : colunas })),
  vaos: [{ nome: 'v', estacoes: ['e2', 'e6'], colunas: ['c2', 'c6'] }],
});
const MOLDURA = { retangulo: { largura: 0.014, profundidade: 0.0048, centro: [0, 0.0015] } };
const passosDe = (g, friso = {}) => [
  ['subdivisao', { origemId: 1, ...g.passo, niveis: 2, borda: 'cantos', espessura: 0.001 }],
  ['friso', { origemId: 2, superficie: { op: 'subdivisao', id: 1 }, linha: { nome: 'moldura', pontos: g.bordaDoVao('v') }, perfil: MOLDURA, ...friso }],
];
const linhaDoFriso = (st) => st.frisos[0].secoes.map((s) => s.p);
const giroMaximo = (pts) => {
  let maior = 0; const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n]; const b = pts[i]; const c = pts[(i + 1) % n];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
    const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
    maior = Math.max(maior, (Math.acos(Math.min(1, cos)) * 180) / Math.PI);
  }
  return maior;
};

describe('o friso na borda de um vão: o canto sem quebra', () => {
  const g = gaiola();
  it('sem a opção a linha passa pelos vértices da chapa, e o canto da janela quebra a mais do limite', () => {
    const st = nucleo(passosDe(g), {}, g.pontos);
    expect(st.orfaos).toEqual([]);
    expect(linhaDoFriso(st)).toHaveLength(64);
    expect(giroMaximo(linhaDoFriso(st))).toBeGreaterThan(2 * LIMITE_DO_GIRO_GRAUS);
  });
  it('refinar: 2 deixa o giro entre segmentos abaixo do limite declarado, e cada nível a mais o divide por dois', () => {
    const giros = [0, 1, 2, 3].map((r) => giroMaximo(linhaDoFriso(nucleo(passosDe(g, r ? { refinar: r } : {}), {}, g.pontos))));
    expect(giros[2]).toBeLessThan(LIMITE_DO_GIRO_GRAUS);
    for (let r = 1; r < 4; r++) expect(giros[r] / giros[r - 1]).toBeCloseTo(0.5, 1);
  });
  it('a linha refinada é a borda da superfície limite refinada: o contorno da malha de 4 níveis da mesma gaiola, a 1e-9 m', () => {
    const st = nucleo(passosDe(g, { refinar: 2 }), {}, g.pontos);
    expect(st.orfaos).toEqual([]);
    const nomes = g.passo.vertices; const indice = new Map(nomes.map((n, k) => [n, k]));
    const faces = g.passo.faces.map((f) => f.map((n) => indice.get(n)));
    const malha = subdividirCatmullClark({ vertices: nomes.map((n) => g.pontos[n]), faces, vincos: [], niveis: 4, borda: 'cantos' });
    const cadeia = cadeiaRefinada(faces, nomes.length, 4, g.bordaDoVao('v').map((n) => indice.get(n))).cadeia.slice(0, -1);
    const linha = linhaDoFriso(st);
    expect(linha).toHaveLength(cadeia.length);
    cadeia.forEach((v, k) => { for (let d = 0; d < 3; d++) expect(Math.abs(linha[k][d] - malha.vertices[v][d])).toBeLessThan(1e-9); });
  });
  it('a moldura continua assentada na chapa: a linha refinada fica a menos de 2% da face da gaiola do contorno da chapa, e no plano dela', () => {
    const base = linhaDoFriso(nucleo(passosDe(g), {}, g.pontos));
    const refinada = linhaDoFriso(nucleo(passosDe(g, { refinar: 2 }), {}, g.pontos));
    const aoSegmento = (p, a, b) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
      return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1], p[2] - a[2] - t * ab[2]);
    };
    let pior = 0;
    for (const p of refinada) pior = Math.max(pior, Math.min(...base.map((a, i) => aoSegmento(p, a, base[(i + 1) % base.length]))));
    expect(pior).toBeLessThan(0.02 * P);
    for (const p of refinada) expect(Math.abs(p[1])).toBeLessThan(1e-9);
    /* a pegada de cada seção, nos dois lados da linha, sai do mesmo plano da chapa */
    const st = nucleo(passosDe(g, { refinar: 2 }), {}, g.pontos);
    for (const s of st.frisos[0].secoes) { expect(Math.abs(s.e[1])).toBeLessThan(1e-6); expect(Math.abs(s.d[1])).toBeLessThan(1e-6); }
  });
  it('é determinística, e sem a opção (ou com refinar: 0) a forma canônica é a de hoje', () => {
    const hoje = JSON.stringify(neutroCanonico(nucleo(passosDe(g), {}, g.pontos)));
    expect(JSON.stringify(neutroCanonico(nucleo(passosDe(g, { refinar: 0 }), {}, g.pontos)))).toBe(hoje);
    expect(JSON.stringify(neutroCanonico(nucleo(passosDe(g, { refinar: 2 }), {}, g.pontos)))).toBe(JSON.stringify(neutroCanonico(nucleo(passosDe(g, { refinar: 2 }), {}, g.pontos))));
    expect(JSON.stringify(neutroCanonico(nucleo(passosDe(g, { refinar: 2 }), {}, g.pontos)))).not.toBe(hoje);
  });
  it('recusa com o motivo: refinar fora de 0 a 4, não inteiro, sem superfície, ou numa linha que não é borda livre', () => {
    const recusa = (passos, topo = g.pontos) => nucleo(passos, {}, topo).orfaos[0]?.motivo ?? '';
    expect(recusa(passosDe(g, { refinar: 5 }))).toMatch(/refinar é o número de níveis a mais.*de 0 a 4/);
    expect(recusa(passosDe(g, { refinar: 1.5 }))).toMatch(/inteiro/);
    expect(recusa([['friso', { superficie: null, linha: { nome: 'x', pontos: ['a', 'b'] }, normal: [0, 1, 0], perfil: MOLDURA, refinar: 1 }]], { a: [0, 0, 0], b: [0.1, 0, 0] })).toMatch(/refinar segue a curva da borda livre/);
    const dentro = passosDe(g, { refinar: 1 }); dentro[1][1].linha = { nome: 'm', pontos: ['e1_c1', 'e1_c2', 'e1_c3'] };
    expect(recusa(dentro)).toMatch(/refinar segue a borda livre da chapa/);
  });
});

describe('curvaDaGaiola: o pedido { borda } de um vão', () => {
  const g = gaiola();
  it('dá a borda do vão nos níveis da malha, fechada, e igual ao contorno da malha refinada da gaiola', () => {
    for (const niveis of [2, 4]) {
      const r = curvaDaGaiola(g, { borda: 'v' }, { niveis });
      expect(r.fechada).toBe(true);
      expect(r.curva).toHaveLength(16 * 2 ** niveis);
      const nomes = g.passo.vertices; const indice = new Map(nomes.map((n, k) => [n, k]));
      const faces = g.passo.faces.map((f) => f.map((n) => indice.get(n)));
      const malha = subdividirCatmullClark({ vertices: nomes.map((n) => g.pontos[n].map((x) => x * 1000)), faces, vincos: [], niveis, borda: 'suave' });
      const cadeia = cadeiaRefinada(faces, nomes.length, niveis, g.bordaDoVao('v').map((n) => indice.get(n))).cadeia.slice(0, -1);
      cadeia.forEach((v, k) => { for (let d = 0; d < 3; d++) expect(Math.abs(r.curva[k][d] - malha.vertices[v][d])).toBeLessThan(1e-5); });
    }
    expect(giroMaximo(curvaDaGaiola(g, { borda: 'v' }, { niveis: 4 }).curva)).toBeLessThan(LIMITE_DO_GIRO_GRAUS);
  });
  it('recusa com o nome: vão que não existe, com de e ate, e junto de outro pedido', () => {
    expect(() => curvaDaGaiola(g, { borda: 'nao-existe' })).toThrow(/nao-existe/);
    expect(() => curvaDaGaiola(g, { borda: 'v', de: 'e1' })).toThrow(/sem `de` nem `ate`/);
    expect(() => curvaDaGaiola(g, { borda: 'v', coluna: 'c1' })).toThrow(/uma de estacao, laco, coluna ou borda/);
  });
});
