/* subdivisao-energia-de-curvatura.test.mjs — a energia de variação de curvatura como regularização do ajuste das cotas com peso
 * (`regularizacao: { tipo: 'variacaoDeCurvatura', onda? }` em `ajustarGaiolaAsMedidasComPeso`, em `operadorDasMedidas` e no passo
 * `subdivisao`): o estêncil do anel contra o oráculo da superfície limite, a energia nula em toda quadrática do parâmetro, a calibração
 * da onda, as cotas exatas no lugar, o operador igual ao ajuste sobre a gaiola recebida, as recusas, a faixa da onda, e a conta de sempre sem o argumento. */
import { describe, expect, it } from 'vitest';
import { gaiolaDoPasso } from './operacoes/subdivisao.js';
import {
  ARESTAS_POR_ONDA, ErroDaOnda, ONDA_MAXIMA_EM_PASSOS, ONDA_MINIMA_EM_PASSOS, RESTO_DO_DESLOCAMENTO, passoDaGaiola, ajustarGaiolaAsMedidas, ajustarGaiolaAsMedidasComPeso, energiaDeVariacaoDeCurvatura, limitesDaGaiola, operadorDasMedidas, superficieLimite,
} from './subdivisao.js';

/* a grade de nx por nz vértices, com o ponto de cada um dado por ponto(i, j) */
const grade = (nx, nz, ponto) => {
  const vertices = []; const faces = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) vertices.push(ponto(i, j));
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i; faces.push([a, a + nx, a + nx + 1, a + 1]); }
  return { vertices, faces, vincos: [], cantos: [], borda: 'suave' };
};
const altura = (nx, nz, h, f) => grade(nx, nz, (i, j) => [i * h, f(i * h, j * h), j * h]);
const REG = Object.freeze({ tipo: 'variacaoDeCurvatura' });
const maior = (A, B) => Math.max(...A.map((p, k) => Math.max(Math.abs(p[0] - B[k][0]), Math.abs(p[1] - B[k][1]), Math.abs(p[2] - B[k][2]))));

describe('a energia de variação de curvatura no ajuste das cotas', () => {
  it('o estêncil do anel dá as derivadas segundas do oráculo no vértice regular, numa grade torta, a 1e-12', () => {
    /* a grade não é uniforme nem plana: o passo muda com i e j, e a altura é uma senoide */
    const g = grade(9, 8, (i, j) => [0.03 * i + 0.002 * i * i + 0.001 * j, 0.01 * Math.sin(0.7 * i) * Math.cos(0.5 * j), 0.025 * j + 0.0015 * j * j - 0.0007 * i]);
    const E = energiaDeVariacaoDeCurvatura(g); const sup = superficieLimite(g); const P = g.vertices;
    const aplicar = (linha) => { const s = [0, 0, 0]; for (const [k, w] of linha) for (let x = 0; x < 3; x++) s[x] += w * P[k][x]; return s; };
    let conferidos = 0, pior = 0;
    g.faces.forEach((f, fi) => {
      /* no canto 0 da face, u vai para f[1] e v para f[3] */
      const d = E.derivadas(f[0], f[1]);
      if (!d) return;
      const a = sup.avaliar(fi, 0, 0);
      for (const [linha, exata] of [[d.uu, a.duu], [d.uv, a.duv], [d.vv, a.dvv]]) { const s = aplicar(linha); for (let x = 0; x < 3; x++) pior = Math.max(pior, Math.abs(s[x] - exata[x])); }
      conferidos++;
    });
    /* os 7 por 6 vértices de dentro, menos a última coluna e a última fileira deles, que não são canto 0 de face */
    expect(conferidos).toBe(7 * 6);
    expect(pior).toBeLessThan(1e-12);
    expect(E.derivadas(0, 1)).toBe(null); expect(E.derivadas(10, 40)).toBe(null);
  });

  it('a energia é nula em toda quadrática do parâmetro, na própria gaiola dela, e positiva na cúbica', () => {
    const cubica = altura(9, 8, 0.03, (x) => 5 * x * x * x);
    const Ec = energiaDeVariacaoDeCurvatura(cubica).valor(cubica.vertices);
    expect(Ec).toBeGreaterThan(1e-6);
    /* a quadrática inclinada amostrada em passo igual no plano: as arestas têm comprimentos diferentes no espaço (a razão entre a
       maior e a menor passa de 1,05), e a energia, com o comprimento no parâmetro, é nula sobre os termos tirados da PRÓPRIA gaiola */
    const inclinada = altura(9, 8, 0.03, (x, z) => 3 * x * x - 4 * x * z + 2 * z * z + 0.2 * x - 0.1);
    const arestas = inclinada.faces.map((f) => Math.hypot(...inclinada.vertices[f[0]].map((c, k) => c - inclinada.vertices[f[1]][k])));
    expect(Math.max(...arestas) / Math.min(...arestas)).toBeGreaterThan(1.05);
    const Ei = energiaDeVariacaoDeCurvatura(inclinada);
    expect(Ei.valor(inclinada.vertices)).toBeLessThan(1e-20 * Ec);
    /* as arestas entre os 7 por 6 vértices de dentro: 6 × 6 numa direção e 7 × 5 na outra */
    expect(Ei.termos).toHaveLength(6 * 6 + 7 * 5);
    /* a imagem quadrática geral da grade inteira, nas três coordenadas, com o passo que muda e a grade cisalhada */
    const geral = grade(9, 8, (i, j) => [0.03 * i + 0.002 * i * i + 0.004 * j, 0.001 * i * i - 0.002 * i * j + 0.0015 * j * j + 0.004 * i, 0.025 * j + 0.001 * j * j - 0.001 * i * j]);
    expect(energiaDeVariacaoDeCurvatura(geral).valor(geral.vertices)).toBeLessThan(1e-20 * Ec);
    /* e a mesma grade com um termo cúbico tem energia */
    const torta = grade(9, 8, (i, j) => [0.03 * i + 0.0002 * i * i * i, 0.001 * i * i, 0.025 * j]);
    expect(energiaDeVariacaoDeCurvatura(torta).valor(torta.vertices)).toBeGreaterThan(1e-6 * Ec);
    /* o padrão da onda é ARESTAS_POR_ONDA passos, e o passo, a mediana das arestas */
    const plana = altura(9, 8, 0.03, () => 0);
    const Ep = energiaDeVariacaoDeCurvatura(plana);
    expect(Ep.passo).toBeCloseTo(0.03, 12); expect(Ep.onda).toBeCloseTo(ARESTAS_POR_ONDA * 0.03, 12);
    expect(energiaDeVariacaoDeCurvatura(plana, { onda: 0.5 }).onda).toBe(0.5);
  });

  it('o vinco, o canto, a borda e o extraordinário não têm termo', () => {
    const base = altura(9, 8, 0.03, (x, z) => 0.3 * x * z);
    const comVinco = { ...base, vincos: [[3 * 9 + 3, 3 * 9 + 4, 2]], cantos: [5 * 9 + 6] };
    const E = energiaDeVariacaoDeCurvatura(comVinco);
    const comTermo = new Set(E.termos.flatMap((t) => t.aresta));
    for (const i of [3 * 9 + 3, 3 * 9 + 4, 5 * 9 + 6, 0, 4, 8 * 9 - 1]) expect(comTermo.has(i), `vértice ${i}`).toBe(false);
    expect(comTermo.has(2 * 9 + 2)).toBe(true);
    expect(E.termos.length).toBeLessThan(energiaDeVariacaoDeCurvatura(base).termos.length);
    /* o vinco de nitidez zero não é vinco */
    expect(energiaDeVariacaoDeCurvatura({ ...base, vincos: [[3 * 9 + 3, 3 * 9 + 4, 0]] }).termos).toHaveLength(6 * 6 + 7 * 5);
    /* três quadros em volta de um vértice de valência 3: nenhum vértice é regular, e a lista de termos sai vazia */
    const tres = { vertices: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], [-1, 0, 1], [-1, 0, 0], [-1, 0, -1]], faces: [[0, 3, 2, 1], [0, 5, 4, 3], [0, 1, 6, 5]], vincos: [], cantos: [] };
    expect(energiaDeVariacaoDeCurvatura(tres).termos).toHaveLength(0);
  });

  it('a calibração: a senoide de comprimento `onda` cotada com peso 1 sai com perto de metade da amplitude', () => {
    const razao = (arestasPorOnda) => {
      const h = 0.025; const onda = arestasPorOnda * h; const nx = 6 * arestasPorOnda + 1; const nz = 9;
      const g = altura(nx, nz, h, (x) => 0.001 * Math.sin((2 * Math.PI * x) / onda));
      const medidas = g.vertices.map((_, indice) => ({ indice, peso: 1 }));
      const r = ajustarGaiolaAsMedidasComPeso(g, medidas, { ...REG, onda });
      expect(r.regularizacao.onda).toBe(onda);
      expect(r.regularizacao.energiaDepois).toBeLessThan(r.regularizacao.energiaAntes);
      const L = limitesDaGaiola({ ...g, vertices: r.vertices });
      let num = 0, den = 0;
      /* as duas ondas do meio, na fileira do meio */
      for (let i = 2 * arestasPorOnda; i <= 4 * arestasPorOnda; i++) { const k = 4 * nx + i; num += L[k][1] * g.vertices[k][1]; den += g.vertices[k][1] ** 2; }
      return num / den;
    };
    const quatro = razao(4), oito = razao(8);
    expect(quatro).toBeGreaterThan(0.4); expect(quatro).toBeLessThan(0.5);
    expect(oito).toBeGreaterThan(0.47); expect(oito).toBeLessThan(0.53);
  });

  it('as cotas exatas ficam no lugar, o ponto sem cota vai para perto da quadrática, e só exatas também vale', () => {
    /* a calha quadrática y = 2 x², com a borda e a fileira do meio cotadas exatas e o miolo, sem cota, achatado em y = 0 */
    const nx = 13, nz = 9, h = 0.025;
    const f = (x) => 2 * (x - 0.15) ** 2;
    const certa = altura(nx, nz, h, f);
    const naCota = (i, j) => i === 0 || i === nx - 1 || j === 0 || j === nz - 1 || i === 6;
    const declarada = grade(nx, nz, (i, j) => [i * h, naCota(i, j) ? f(i * h) : 0, j * h]);
    const medidas = []; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (naCota(i, j)) medidas.push({ indice: j * nx + i, peso: Infinity });
    const r = ajustarGaiolaAsMedidasComPeso(declarada, medidas, REG);
    expect(Math.max(...r.residuos)).toBeLessThan(1e-12);
    expect(r.regularizacao.arestasComTermo).toBe((nx - 3) * (nz - 2) + (nx - 2) * (nz - 3));
    expect(r.regularizacao.energiaDepois).toBeLessThan(0.01 * r.regularizacao.energiaAntes);
    /* a superfície limite do miolo, que foi declarado a até 45 mm da calha, fica a menos de 0,6 mm dela (o que sobra é o degrau da regra
       de borda, κh²/6 = 0,42 mm aqui, que a energia espalha); o ajuste de sempre, sem a regularização, deixa o miolo onde foi declarado */
    const L = limitesDaGaiola({ ...declarada, vertices: r.vertices });
    let desvio = 0; for (let j = 2; j < nz - 2; j++) for (let i = 2; i < nx - 2; i++) desvio = Math.max(desvio, Math.abs(L[j * nx + i][1] - f(i * h)));
    expect(desvio).toBeLessThan(0.0006);
    const semEnergia = ajustarGaiolaAsMedidas(declarada, medidas.map((m) => m.indice));
    const L0 = limitesDaGaiola({ ...declarada, vertices: semEnergia.vertices });
    expect(Math.abs(L0[4 * nx + 3][1] - certa.vertices[4 * nx + 3][1])).toBeGreaterThan(0.01);
    /* o resto do deslocamento não pesa: o vértice que nenhum termo nem cota alcança fica onde foi declarado */
    expect(RESTO_DO_DESLOCAMENTO).toBe(1e-9);
  });

  it('CONHECIDA: com o espaçamento desigual entre os dois lados de uma curva exata, a superfície se afasta da forma mais que sem a energia', () => {
    /* É o limite que impede o uso em receita. A grade de 15 por 15 sobre 600 mm tem o espaçamento em x duas vezes maior de um lado da
       curva do meio; a borda e as duas fileiras do meio são cota exata e o miolo tem a cota da própria forma (peso 1 sem a energia, 0,003
       com ela). A energia cobra a derivada segunda no parâmetro, o degrau do espaçamento conta como curvatura, e o desvio a mais de
       100 mm da borda vai de 0,89 para 3,27 mm no paraboloide e de 0,33 para 2,28 na sela. A catraca cobra que não piore, e falha quando
       a energia deixar de ser pior que o ajuste de sempre, para a marca sair. */
    const nx = 15; const a = 0.6 / (7 + 7 * 2); const xs = (i) => -0.3 + (i <= 7 ? i * a : 7 * a + (i - 7) * a * 2); const zs = (j) => -0.3 + (0.6 * j) / 14;
    const conhecidas = { paraboloide: [(x, z) => x * x + z * z, 3.273], sela: [(x, z) => (x * x - z * z) / 1.5, 2.283] };
    for (const [nome, [f, medido]] of Object.entries(conhecidas)) {
      const g = grade(nx, nx, (i, j) => [xs(i), f(xs(i), zs(j)), zs(j)]);
      const exata = (k) => { const i = k % nx, j = Math.floor(k / nx); return i === 0 || j === 0 || i === nx - 1 || j === nx - 1 || i === 7 || j === 7; };
      const desvio = (regularizacao, peso) => {
        const r = ajustarGaiolaAsMedidasComPeso(g, g.vertices.map((_, indice) => ({ indice, peso: exata(indice) ? Infinity : peso })), regularizacao);
        const sup = superficieLimite({ ...g, vertices: r.vertices }); let pior = 0;
        for (let fi = 0; fi < g.faces.length; fi++) for (const u of [0.25, 0.5, 0.75]) for (const v of [0.25, 0.5, 0.75]) {
          const p = sup.avaliar(fi, u, v).ponto;
          if (Math.min(0.3 - Math.abs(p[0]), 0.3 - Math.abs(p[2])) >= 0.1) pior = Math.max(pior, Math.abs(p[1] - f(p[0], p[2])));
        }
        return pior * 1000;
      };
      const sem = desvio(null, 1), com = desvio(REG, 0.003);
      expect(com, `${nome}: a energia deixou de ser pior com o espaçamento desigual: tire a marca`).toBeGreaterThan(sem);
      expect(com, `${nome} piorou`).toBeLessThanOrEqual(medido * 1.02);
    }
  });

  it('sem o argumento a conta é a de sempre, e a memória separa as duas chamadas', () => {
    const g = altura(9, 8, 0.03, (x, z) => 0.02 * Math.sin(20 * x) * Math.cos(15 * z));
    const medidas = g.vertices.map((_, indice) => ({ indice, peso: indice % 7 === 0 ? Infinity : 2 }));
    const a = ajustarGaiolaAsMedidasComPeso(g, medidas);
    const b = ajustarGaiolaAsMedidasComPeso(g, medidas, null);
    const c = ajustarGaiolaAsMedidasComPeso(g, medidas, undefined);
    expect(b).toEqual(a); expect(c).toEqual(a);
    expect(Object.hasOwn(a, 'regularizacao')).toBe(false);
    const d = ajustarGaiolaAsMedidasComPeso(g, medidas, REG);
    expect(maior(d.vertices, a.vertices)).toBeGreaterThan(1e-5);
    expect(ajustarGaiolaAsMedidasComPeso(g, medidas)).toEqual(a);
    expect(ajustarGaiolaAsMedidasComPeso(g, medidas, REG)).toEqual(d);
  });

  it('o operador com a regularização refaz o ajuste da gaiola recebida, e com a onda declarada não é linear nela', () => {
    const g = altura(9, 8, 0.03, (x, z) => 0.02 * Math.sin(20 * x) * Math.cos(15 * z));
    for (const medidas of [
      g.vertices.map((_, indice) => ({ indice, peso: indice % 7 === 0 ? Infinity : 2 })),
      g.vertices.map((_, indice) => ({ indice, peso: Infinity })).filter((m) => m.indice % 3 === 0),
    ]) {
      const reg = { ...REG, onda: 0.2 };
      const r = ajustarGaiolaAsMedidasComPeso(g, medidas, reg);
      const op = operadorDasMedidas(g, medidas, reg);
      expect(op.exato).toBe(false);
      /* o operador é o sistema montado sobre a gaiola recebida: aplicado às posições dela, devolve a gaiola ajustada */
      expect(maior(op.aplicar(g.vertices), r.vertices)).toBeLessThan(1e-10);
      /* e sem a regularização o operador é outro */
      expect(maior(operadorDasMedidas(g, medidas).aplicar(g.vertices), r.vertices)).toBeGreaterThan(1e-6);
    }
    /* com a onda declarada os coeficientes da energia valem (onda/passo)⁶, e o passo (a mediana das arestas) sai da gaiola: a gaiola
       esticada em x tem outro passo, e o operador da original aplicado à esticada não é o ajuste dela. Sem a onda declarada ela
       acompanha o passo, os coeficientes não dependem das posições, e o operador é linear */
    const medidas = g.vertices.map((_, indice) => ({ indice, peso: indice % 7 === 0 ? Infinity : 2 }));
    const esticada = { ...g, vertices: g.vertices.map((p) => [3 * p[0], p[1], p[2]]) };
    for (const [reg, linear] of [[{ ...REG, onda: 0.2 }, false], [REG, true]]) {
      const daEsticada = ajustarGaiolaAsMedidasComPeso(esticada, medidas, reg);
      expect(daEsticada.regularizacao.passo).not.toBeCloseTo(ajustarGaiolaAsMedidasComPeso(g, medidas, reg).regularizacao.passo, 6);
      expect(maior(operadorDasMedidas(esticada, medidas, reg).aplicar(esticada.vertices), daEsticada.vertices)).toBeLessThan(1e-10);
      const peloDaOriginal = maior(operadorDasMedidas(g, medidas, reg).aplicar(esticada.vertices), daEsticada.vertices);
      if (linear) expect(peloDaOriginal).toBeLessThan(1e-10); else expect(peloDaOriginal).toBeGreaterThan(1e-6);
    }
  });

  it('a onda fora de 2 a 64 passos da gaiola é recusada com o valor, a faixa e o passo', () => {
    const g = altura(9, 8, 0.03, (x, z) => 0.02 * Math.sin(20 * x) * Math.cos(15 * z));
    const medidas = g.vertices.map((_, indice) => ({ indice, peso: 1 }));
    expect(ONDA_MINIMA_EM_PASSOS).toBe(2); expect(ONDA_MAXIMA_EM_PASSOS).toBe(64);
    const passo = passoDaGaiola(g.vertices, g.faces);
    expect(energiaDeVariacaoDeCurvatura(g).passo).toBe(passo);
    for (const onda of [0.0002, 0.99 * 2 * passo, 1.01 * 64 * passo, 20]) {
      for (const chamada of [() => energiaDeVariacaoDeCurvatura(g, { onda }), () => ajustarGaiolaAsMedidasComPeso(g, medidas, { ...REG, onda }), () => operadorDasMedidas(g, medidas, { ...REG, onda })]) {
        let erro = null; try { chamada(); } catch (e) { erro = e; }
        expect(erro, `onda ${onda}`).toBeInstanceOf(ErroDaOnda);
        expect(erro.message).toContain(`a onda da regularizacao é ${onda}, fora da faixa de ${2 * passo} a ${64 * passo}`);
        expect(erro.message).toContain(`é ${passo})`);
        expect(erro).toMatchObject({ onda, passo, minima: 2 * passo, maxima: 64 * passo });
      }
    }
    for (const onda of [2 * passo, 4 * passo, 64 * passo]) expect(ajustarGaiolaAsMedidasComPeso(g, medidas, { ...REG, onda }).regularizacao.onda).toBe(onda);
  });

  it('a regularização malformada é recusada com o valor recebido', () => {
    const g = altura(5, 5, 0.03, () => 0);
    const medidas = [{ indice: 12, peso: 1 }];
    for (const ruim of [true, 'variacaoDeCurvatura', [], { tipo: 'placa' }, { onda: 0.1 }, { tipo: 'variacaoDeCurvatura', onda: 0 }, { tipo: 'variacaoDeCurvatura', onda: -1 }, { tipo: 'variacaoDeCurvatura', onda: '0.1' }, { tipo: 'variacaoDeCurvatura', peso: 2 }]) {
      expect(() => ajustarGaiolaAsMedidasComPeso(g, medidas, ruim), JSON.stringify(ruim)).toThrow(/regularizacao/);
      expect(() => operadorDasMedidas(g, medidas, ruim), JSON.stringify(ruim)).toThrow(/regularizacao/);
    }
  });

  it('o passo: a regularização vai ao ajuste, pede medidas e recusa o que não conhece', () => {
    const nomes = []; const pontos = {};
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const n = `g${i}${j}`; nomes.push(n); pontos[n] = [0.03 * i, 0.002 * i * i + 0.001 * Math.sin(3 * i + j), 0.03 * j]; }
    const faces = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) faces.push([`g${i}${j}`, `g${i}${j + 1}`, `g${i + 1}${j + 1}`, `g${i + 1}${j}`]);
    const st = { vec: (p) => pontos[p], num: Number };
    const base = { vertices: nomes, faces, medidas: ['g00', 'g40', 'g04', 'g44', { ponto: 'g22', peso: 1 }] };
    const sem = gaiolaDoPasso(base, st);
    expect(sem.erro).toBeUndefined(); expect(sem.regularizacao).toBe(null);
    const com = gaiolaDoPasso({ ...base, regularizacao: { tipo: 'variacaoDeCurvatura', onda: 0.1 } }, st);
    expect(com.erro).toBeUndefined();
    expect(com.regularizacao).toEqual({ tipo: 'variacaoDeCurvatura', onda: 0.1 });
    expect(maior(com.gaiola.vertices, sem.gaiola.vertices)).toBeGreaterThan(1e-6);
    /* a gaiola do passo é a do ajuste com a regularização devolvida */
    const direto = ajustarGaiolaAsMedidasComPeso({ ...com.declaradaCheia, borda: 'suave' }, com.medidas, com.regularizacao);
    expect(com.gaiola.vertices).toEqual(direto.vertices);
    /* só cotas exatas: o ajuste com a regularização, e não o exato de sempre */
    const exatas = gaiolaDoPasso({ ...base, medidas: ['g00', 'g40', 'g04', 'g44', 'g22'], regularizacao: { tipo: 'variacaoDeCurvatura' } }, st);
    expect(exatas.erro).toBeUndefined(); expect(exatas.regularizacao).toEqual({ tipo: 'variacaoDeCurvatura' });
    expect(maior(exatas.gaiola.vertices, gaiolaDoPasso({ ...base, medidas: ['g00', 'g40', 'g04', 'g44', 'g22'] }, st).gaiola.vertices)).toBeGreaterThan(1e-6);
    const recusa = (regularizacao, extra = {}) => gaiolaDoPasso({ ...base, ...extra, regularizacao }, st).erro;
    expect(recusa({ tipo: 'placa' })).toEqual(['regularizacao', expect.stringMatching(/"placa".*variacaoDeCurvatura/)]);
    expect(recusa({ tipo: 'variacaoDeCurvatura', onda: 0 })).toEqual(['regularizacao', expect.stringMatching(/onda é 0.*maior que zero/)]);
    expect(recusa({ tipo: 'variacaoDeCurvatura', peso: 3 })).toEqual(['regularizacao', expect.stringMatching(/campo desconhecido 'peso'/)]);
    expect(recusa(true)).toEqual(['regularizacao', expect.stringMatching(/precisa ser objeto.*true/)]);
    expect(recusa({ tipo: 'variacaoDeCurvatura' }, { medidas: undefined })).toEqual(['regularizacao', expect.stringMatching(/vale com medidas/)]);
    /* a onda fora da faixa: o passo desta gaiola é 0,03 m e a faixa, de 0,06 a 1,92 m */
    const h = passoDaGaiola(com.declaradaCheia.vertices, com.declaradaCheia.faces);
    for (const onda of [0.0002, 0.05, 2, 20]) {
      const [campo, texto] = recusa({ tipo: 'variacaoDeCurvatura', onda });
      expect(campo).toBe('regularizacao');
      expect(texto).toContain(`regularizacao.onda é ${onda} m, fora da faixa de ${2 * h} a ${64 * h} m`);
      expect(texto).toContain(`é ${h} m`);
    }
    expect(recusa({ tipo: 'variacaoDeCurvatura', onda: 2 * h })).toBeUndefined();
    expect(recusa({ tipo: 'variacaoDeCurvatura', onda: 64 * h })).toBeUndefined();
  });
});
