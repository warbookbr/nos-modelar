/* gaiola-interpolada.test.mjs — as opções `interpolar` e `curvas` da gaiola por estações: a interpolação monótona das
   colunas entre estações-chave reproduz uma superfície analítica e não ultrapassa os nós, as estações geradas seguem a
   graduação, as colunas a frações do comprimento de uma curva de seção ficam igualmente espaçadas ao longo dela, as
   medidas marcam só as chaves, e os gritos dizem os nomes. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorEstacoes } from './gaiola-por-estacoes.js';
import { curvaCentripeta, pchip } from './gaiola-interpolada.js';
import { CHAVES, COLUNAS, angulo, chavesExplicitas, chavesPorCurva, curvaDaSecao, nomeDaColuna, superficie } from './fixtures/gaiola-interpolada-prova.js';
import { nucleo, neutroCanonico } from './entrada.js';
import { sha256Hex } from './sha256.js';

const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const grito = (definicao) => { try { gaiolaPorEstacoes(definicao); } catch (e) { return e.message; } throw new Error('não gritou'); };
const interpolada = (extra = {}) => gaiolaPorEstacoes({ eixo: 'z', simetria: 'x', estacoes: chavesExplicitas(), interpolar: { passo: 0.1 }, ...extra });

/* A distância do ponto [x, y] à seção analítica em z, pela poligonal de 20.000 lados da seção. */
function distanciaASecao(z, p) {
  let melhor = Infinity; const n = 20000;
  let a = superficie(z, 0);
  for (let k = 1; k <= n; k++) {
    const b = superficie(z, angulo(COLUNAS - 1) * k / n);
    const d = [b[0] - a[0], b[1] - a[1]]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1])));
    melhor = Math.min(melhor, dist2(p, [a[0] + t * d[0], a[1] + t * d[1]]));
    a = b;
  }
  return melhor;
}

/* A Catmull-Rom uniforme, para mostrar o laço que a centrípeta não faz. */
function catmullRomUniforme(P) {
  const Q = [P[0].map((x, i) => 2 * x - P[1][i]), ...P, P[P.length - 1].map((x, i) => 2 * x - P[P.length - 2][i])];
  return (i, s) => {
    const [p0, p1, p2, p3] = [Q[i], Q[i + 1], Q[i + 2], Q[i + 3]];
    return [0, 1].map((k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * s + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * s * s + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * s * s * s));
  };
}
function autocruzamentos(pts) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  let n = 0;
  for (let i = 0; i + 1 < pts.length; i++) for (let j = i + 2; j + 1 < pts.length; j++) {
    if (o(pts[i], pts[i + 1], pts[j]) * o(pts[i], pts[i + 1], pts[j + 1]) < 0 && o(pts[j], pts[j + 1], pts[i]) * o(pts[j], pts[j + 1], pts[i + 1]) < 0) n += 1;
  }
  return n;
}
const amostrar = (f, trechos, n = 200) => { const r = []; for (let i = 0; i < trechos; i++) for (let k = i ? 1 : 0; k <= n; k++) r.push(f(i, k / n)); return r; };

describe('gaiola interpolada entre estações-chave', () => {
  it('reproduz a superfície analítica a menos de 0,5 mm entre as cinco chaves, e as chaves saem exatas', () => {
    const g = interpolada();
    const tipos = g.estacoes.map((e) => e.tipo);
    expect(tipos.filter((t) => t === 'chave')).toHaveLength(5);
    expect(tipos.filter((t) => t === 'gerada')).toHaveLength(20);
    let maior = 0;
    for (const e of g.estacoes) {
      for (let j = 0; j < COLUNAS; j++) {
        const p = g.pontos[`${e.nome}_${nomeDaColuna(j)}`];
        expect(p[2]).toBe(e.em);
        const d = dist2(p, superficie(e.em, angulo(j)));
        if (e.tipo === 'chave') expect(d).toBe(0);
        maior = Math.max(maior, d);
      }
    }
    expect(maior).toBeGreaterThan(1e-5); // a medida não é vazia: a interpolação não é exata entre as chaves
    expect(maior).toBeLessThan(5e-4);
  });

  it('não ultrapassa os valores dos nós: cada coordenada fica entre as das duas chaves do intervalo', () => {
    const g = interpolada();
    const chaves = g.estacoes.filter((e) => e.tipo === 'chave');
    for (const e of g.estacoes.filter((x) => x.tipo === 'gerada')) {
      const b = chaves.findIndex((k) => k.em > e.em); const A = chaves[b - 1], B = chaves[b];
      for (let j = 0; j < COLUNAS; j++) {
        const p = g.pontos[`${e.nome}_${nomeDaColuna(j)}`], a = g.pontos[`${A.nome}_${nomeDaColuna(j)}`], q = g.pontos[`${B.nome}_${nomeDaColuna(j)}`];
        for (const c of [0, 1]) {
          expect(p[c]).toBeGreaterThanOrEqual(Math.min(a[c], q[c]));
          expect(p[c]).toBeLessThanOrEqual(Math.max(a[c], q[c]));
        }
      }
    }
  });

  it('no degrau a interpolação fica plana onde os nós são iguais, e a spline comum ultrapassaria', () => {
    const x = [0, 0.6, 1.2, 1.8, 2.4], y = [0.1, 0.1, 0.1, 0.13, 0.13];
    const f = pchip(x, y);
    let menor = Infinity, maior = -Infinity;
    for (let k = 0; k <= 2400; k++) { const v = f(k / 1000); menor = Math.min(menor, v); maior = Math.max(maior, v); }
    expect(menor).toBe(0.1);
    expect(maior).toBe(0.13);
    for (let k = 0; k <= 1200; k++) expect(f(k / 1000)).toBe(0.1);
    // a Catmull-Rom uniforme pelos mesmos nós passa de 0,13 e desce abaixo de 0,1
    const cr = catmullRomUniforme(x.map((xi, i) => [xi, y[i]]));
    const ys = amostrar(cr, 4).map((p) => p[1]);
    expect(Math.max(...ys) - 0.13).toBeGreaterThan(1e-3);
    expect(0.1 - Math.min(...ys)).toBeGreaterThan(1e-3);
  });

  it('gera as estações pelo passo e gradua: nenhum intervalo passa do dobro de um vizinho', () => {
    const tres = (nome, em) => ({ nome, em, colunas: [{ nome: 'a', em: [1, 0] }, { nome: 'b', em: [1, 1] }] });
    const g = gaiolaPorEstacoes({ eixo: 'z', estacoes: [tres('p', 0), tres('q', 0.1), tres('r', 1.0)], interpolar: { passo: 0.3 } });
    const em = g.estacoes.map((e) => e.em);
    for (let k = 0; k + 1 < em.length; k++) {
      const largura = em[k + 1] - em[k];
      expect(largura).toBeLessThanOrEqual(0.3 + 1e-12);
      if (k > 0) expect(largura).toBeLessThanOrEqual(2 * (em[k] - em[k - 1]) * (1 + 1e-9));
      if (k + 2 < em.length) expect(largura).toBeLessThanOrEqual(2 * (em[k + 2] - em[k + 1]) * (1 + 1e-9));
    }
    // q a r divide em 0,4 e 0,7 pelo passo, e o intervalo de 0,1 a 0,4 passa do dobro do de p a q e se divide em 0,25
    expect(g.estacoes.map((e) => e.nome)).toEqual(['p', 'q', 'q_1', 'q_2', 'q_3', 'r']);
    expect(em.map((z) => Math.round(z * 1e9) / 1e9)).toEqual([0, 0.1, 0.25, 0.4, 0.7, 1]);
    // sem passo, só as estações declaradas sem colunas são interpoladas
    const declarada = gaiolaPorEstacoes({ eixo: 'z', estacoes: [tres('p', 0), { nome: 'm', em: 0.05 }, tres('q', 0.1)], interpolar: {} });
    expect(declarada.estacoes.map((e) => e.tipo)).toEqual(['chave', 'interpolada', 'chave']);
    expect(declarada.ponto('m', 'b')).toBe('m_b');
  });

  it('as medidas e os cantos marcam só as chaves com chaves: true, e a gaiola sobe à subdivisão', () => {
    const g = interpolada({ medidas: [{ chaves: true }], cantos: [{ coluna: 's0', chaves: true }] });
    expect(g.passo.medidas).toHaveLength(5 * COLUNAS);
    expect(g.passo.medidas.every((n) => CHAVES.some(([c]) => n.startsWith(`${c}_`)))).toBe(true);
    expect(g.passo.cantos).toEqual(CHAVES.map(([c]) => `${c}_s0`));
    const comPeso = interpolada({ medidas: [{ coluna: 's3', chaves: true, peso: 1 }] });
    expect(comPeso.passo.medidas).toEqual(CHAVES.map(([c]) => ({ ponto: `${c}_s3`, peso: 1 })));
    const neutro = nucleo([['subdivisao', { origemId: 1, ...g.passo, niveis: 1 }]], g.pontos);
    expect(neutro.orfaos).toEqual([]);
    const P = [...neutro.V.values()];
    for (const m of g.passo.medidas) expect(Math.min(...P.map((p) => Math.hypot(p[0] - g.pontos[m][0], p[1] - g.pontos[m][1], p[2] - g.pontos[m][2])))).toBeLessThan(1e-6);
  });

  it('leva a fusão, a coluna que começa e a que termina para as chaves, com os nomes da chave anterior', () => {
    const col = (nome, u, extra) => ({ nome, em: [1, u], ...extra });
    const g = gaiolaPorEstacoes({
      eixo: 'z', interpolar: { passo: 0.5 },
      estacoes: [
        { nome: 'p', em: 0, colunas: [col('a', 0), col('m', 0.4), col('n', 0.6), col('x', 0.8), col('b', 1)] },
        { nome: 'q', em: 1, colunas: [col('a', 0), col('mn', 0.5, { de: ['m', 'n'] }), col('b', 1)] },
        { nome: 'r', em: 2, colunas: [col('a', 0), col('mn', 0.5), col('y', 0.75), col('b', 1)] },
      ],
    });
    expect(g.estacoes.map((e) => e.nome)).toEqual(['p', 'p_1', 'q', 'q_1', 'r']);
    // entre p e q: m e n seguem com o nome de p e se fundem em q; x termina logo depois de p
    expect(Object.keys(g.pontos).filter((n) => n.startsWith('p_1_'))).toEqual(['p_1_a', 'p_1_m', 'p_1_n', 'p_1_b']);
    // os nós de m são p_m (0,4), q_mn (0,5) e r_mn (0,5): a derivada em q é zero e a ponta p sobe com 0,15
    expect(g.pontos.p_1_m[1]).toBeCloseTo(0.46875, 12);
    expect(g.passo.faces).toContainEqual(['p_n', 'p_x', 'p_b', 'p_1_b', 'p_1_n']);
    expect(g.passo.faces).toContainEqual(['p_1_m', 'p_1_n', 'q_mn']);
    // entre q e r: y começa em r, num pentágono
    expect(Object.keys(g.pontos).filter((n) => n.startsWith('q_1_'))).toEqual(['q_1_a', 'q_1_mn', 'q_1_b']);
    expect(g.passo.faces).toContainEqual(['q_1_mn', 'q_1_b', 'r_b', 'r_y', 'r_mn']);
  });

  it('é determinística, e sem as opções a saída do ajudante não muda', () => {
    const a = interpolada(), b = interpolada();
    expect(JSON.stringify([a.pontos, a.passo])).toBe(JSON.stringify([b.pontos, b.passo]));
    expect(sha256Hex(JSON.stringify([a.pontos, a.passo]))).toBe(sha256Hex(JSON.stringify([b.pontos, b.passo])));
    const sem = gaiolaPorEstacoes({ eixo: 'z', estacoes: chavesExplicitas() });
    const comVazia = gaiolaPorEstacoes({ eixo: 'z', estacoes: chavesExplicitas(), interpolar: {} });
    expect(JSON.stringify([comVazia.pontos, comVazia.passo])).toBe(JSON.stringify([sem.pontos, sem.passo]));
    expect(sem.estacoes).toBeUndefined();
    expect(JSON.stringify(neutroCanonico(nucleo([['subdivisao', { origemId: 1, ...a.passo, niveis: 1 }]], a.pontos)))).toBe(JSON.stringify(neutroCanonico(nucleo([['subdivisao', { origemId: 1, ...b.passo, niveis: 1 }]], b.pontos))));
  });

  it('grita com os nomes', () => {
    const k = chavesExplicitas();
    expect(grito({ eixo: 'z', estacoes: [k[0], { nome: 'm', em: 0.3 }, k[1]] })).toMatch(/'m' não tem colunas; declare as colunas, ou interpolar/);
    expect(grito({ eixo: 'z', estacoes: [{ nome: 'm', em: -0.3 }, ...k], interpolar: {} })).toMatch(/'m' é interpolada e fica antes da primeira estação-chave/);
    expect(grito({ eixo: 'z', estacoes: [...k, { nome: 'm', em: 3 }], interpolar: {} })).toMatch(/'m' é interpolada e fica depois da última/);
    expect(grito({ eixo: 'z', estacoes: k, interpolar: { passo: 0 } })).toMatch(/interpolar.passo é 0/);
    expect(grito({ eixo: 'z', estacoes: k, interpolar: { passo: 0.1, graduar: false } })).toMatch(/interpolar tem campo desconhecido 'graduar'/);
    expect(grito({ eixo: 'z', estacoes: k, interpolar: { passo: 0.1 }, medidas: [{ estacao: 'tras_2' }] })).toMatch(/medidas\[0\] cita a estação 'tras_2', que a interpolação gerou pelo passo/);
    expect(grito({ eixo: 'z', estacoes: k, interpolar: { passo: 0.1 }, vincos: [{ nome: 'v', coluna: 's2', de: 'quarto_1', nitidez: 1 }] })).toMatch(/o vinco 'v' cita a estação 'quarto_1', que a interpolação gerou/);
    expect(grito({ eixo: 'z', estacoes: k, interpolar: { passo: 0.1 }, vaos: [{ nome: 'janela', estacoes: ['meio', 'meio_3'], colunas: ['s2', 's4'] }] })).toMatch(/o vão 'janela' cita a estação 'meio_3', que a interpolação gerou/);
    expect(() => interpolada().ponto('meio_1', 's0')).toThrow(/'meio_1', que a interpolação gerou/);
    expect(grito({ eixo: 'z', estacoes: k, medidas: [{ chaves: true }] })).toMatch(/chaves: true, mas a gaiola não declara interpolar/);
    expect(grito({ eixo: 'z', estacoes: [k[0], { nome: 'm', em: 0.3 }, k[1]], interpolar: {}, medidas: [{ estacao: 'm', chaves: true }] })).toMatch(/cita a estação 'm', que não é estação-chave/);
    expect(grito({ eixo: 'z', estacoes: [k[0], { ...k[1], nome: 'tras_1' }, k[2]], interpolar: { passo: 0.1 } })).toMatch(/a estação gerada 'tras_1', a 1ª depois de 'tras', tem o nome de uma estação declarada/);
    expect(grito({ eixo: { curva: 'anel', pontos: [[0, 0, 0], [1, 0, 0], [1, 1, 0]], normal: [0, 0, 1], fechada: true }, estacoes: [{ nome: 'a', em: 0, colunas: k[0].colunas }, { nome: 'b', em: 0.5, colunas: k[0].colunas }], interpolar: {} })).toMatch(/interpolar não vale no eixo fechado/);
    const p = (nome, em, extra) => ({ nome, em, colunas: [{ nome: 'a', em: [1, 0] }, { nome: 'b', em: [1, 1] }], ...extra });
    expect(grito({ eixo: 'z', regioes: [{ nome: 'r', estacoes: ['p', 'q'], colunas: [null, null] }], estacoes: [p('p', 0), { nome: 'm', em: 0.5 }, p('q', 1)], interpolar: {} })).toMatch(/'m' é interpolada e fica dentro da região 'r'/);
    expect(grito({ eixo: 'z', estacoes: [p('p', 0), { nome: 'm', em: 0.5 }, { nome: 'q', em: 1, colunas: [{ nome: 'c', em: [1, 0] }, { nome: 'd', em: [1, 1] }] }], interpolar: {} })).toMatch(/'m' é interpolada entre as chaves 'p' e 'q', mas só 0 coluna liga as duas/);
  });
});

describe('colunas a frações de uma curva de seção', () => {
  /* um lado reto de 0,5 m, um canto de 5 cm de raio e um teto de 0,75 m: os pontos-chave se juntam no canto */
  const canto = [[0.8, 0], [0.8, 0.25], [0.8, 0.5], ...[1, 2, 3, 4, 5].map((k) => { const a = (k * Math.PI) / 12; return [0.75 + 0.05 * Math.cos(a), 0.5 + 0.05 * Math.sin(a)]; }), [0.75, 0.55], [0.4, 0.55], [0, 0.55]];

  it('as amostras ficam igualmente espaçadas ao longo da curva a 2%, e por parâmetro se amontoariam no canto', () => {
    const C = curvaCentripeta(canto, 'canto');
    // o comprimento ao longo da curva, medido de novo com 4096 amostras por trecho, e a posição de cada amostra nele
    const densa = amostrar((i, s) => C.ponto(i, s), C.trechos, 4096);
    const acum = [0]; for (let k = 1; k < densa.length; k++) acum.push(acum[k - 1] + Math.hypot(densa[k][0] - densa[k - 1][0], densa[k][1] - densa[k - 1][1], densa[k][2] - densa[k - 1][2]));
    const posicao = (p) => { let melhor = 0, d = Infinity; densa.forEach((q, k) => { const e = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (e < d) { d = e; melhor = k; } }); return acum[melhor]; };
    const n = 12;
    const s = Array.from({ length: n + 1 }, (_, j) => posicao(C.naFracao(j / n)));
    const passo = acum[acum.length - 1] / n;
    const desvio = Math.max(...s.slice(1).map((x, j) => Math.abs((x - s[j]) / passo - 1)));
    expect(desvio).toBeLessThan(0.02);
    expect(Math.abs(C.comprimento / acum[acum.length - 1] - 1)).toBeLessThan(1e-5);
    // pelo parâmetro de cada trecho (frações iguais do número de trechos), as amostras se juntam onde os pontos se juntam
    const porParametro = Array.from({ length: n + 1 }, (_, j) => { const t = (j / n) * C.trechos; const i = Math.min(C.trechos - 1, Math.floor(t)); return posicao(C.ponto(i, t - i)); });
    const desvioPorParametro = Math.max(...porParametro.slice(1).map((x, j) => Math.abs((x - porParametro[j]) / passo - 1)));
    expect(desvioPorParametro).toBeGreaterThan(0.5);
    // a curva passa pelos pontos-chave e as frações 0 e 1 são as pontas exatas
    for (const [i, p] of canto.entries()) expect(Math.hypot(C.ponto(Math.min(i, C.trechos - 1), i === C.trechos ? 1 : 0)[0] - p[0], C.ponto(Math.min(i, C.trechos - 1), i === C.trechos ? 1 : 0)[1] - p[1])).toBe(0);
    expect(C.naFracao(0)).toEqual([0.8, 0, 0]);
    expect(C.naFracao(1)).toEqual([0, 0.55, 0]);
  });

  it('a centrípeta não faz laço onde a uniforme faz', () => {
    const P = [[0, 0], [1, 1], [1.1, 1], [2, 0]];
    expect(autocruzamentos(amostrar(catmullRomUniforme(P), 3))).toBeGreaterThan(0);
    const C = curvaCentripeta(P);
    expect(autocruzamentos(amostrar((i, s) => C.ponto(i, s), 3))).toBe(0);
  });

  it('a estação usa a curva pelo nome, entre colunas declaradas, e a interpolação segue as colunas dela', () => {
    const g = gaiolaPorEstacoes({ eixo: 'z', simetria: 'x', curvas: [curvaDaSecao], estacoes: chavesPorCurva(), interpolar: { passo: 0.1 } });
    // nas chaves, as colunas ficam sobre a seção analítica a menos do erro da curva pelos cinco pontos-chave
    let naChave = 0, entre = 0;
    for (const e of g.estacoes) {
      for (let j = 0; j < COLUNAS; j++) {
        const p = g.pontos[`${e.nome}_${nomeDaColuna(j)}`]; const d = distanciaASecao(e.em, p);
        if (e.tipo === 'chave') naChave = Math.max(naChave, d); else entre = Math.max(entre, d);
      }
    }
    expect(naChave).toBeLessThan(5e-4);
    expect(entre).toBeLessThan(1e-3);
    // a curva entre colunas declaradas, e a curva desconhecida
    const misto = gaiolaPorEstacoes({ eixo: 'z', curvas: [{ nome: 'c', colunas: [{ nome: 'meio', fracao: 0.5 }] }], estacoes: ['p', 'q'].map((nome, k) => ({ nome, em: k, colunas: [{ nome: 'baixo', em: [1, 0] }, { curva: 'c', pontos: [[1, 0.2], [1, 0.8]] }, { nome: 'alto', em: [1, 1] }] })) });
    expect(misto.passo.vertices).toEqual(['p_baixo', 'p_meio', 'p_alto', 'q_baixo', 'q_meio', 'q_alto']);
    expect(misto.pontos.q_meio[1]).toBeCloseTo(0.5, 12);
    expect(grito({ eixo: 'z', curvas: [curvaDaSecao], estacoes: [{ nome: 'p', em: 0, colunas: [{ curva: 'outra', pontos: [[0, 0], [1, 1]] }] }, chavesPorCurva()[1]] })).toMatch(/a estação 'p' usa a curva 'outra', que não está em curvas/);
    expect(grito({ eixo: 'z', curvas: [{ nome: 'c', colunas: [{ nome: 'a', fracao: 0.5 }, { nome: 'b', fracao: 0.5 }] }], estacoes: chavesPorCurva() })).toMatch(/as colunas da curva 'c' vêm em fração crescente, e 'b' \(0.5\) não passa da anterior/);
    expect(grito({ eixo: 'z', curvas: [curvaDaSecao], estacoes: [{ nome: 'p', em: 0, colunas: [{ curva: 'secao', pontos: [[0, 0], [0, 0], [1, 1]] }] }, chavesPorCurva()[1]] })).toMatch(/a curva 'secao' da estação 'p' repete o ponto-chave: o 1º e o 2º são iguais/);
  });
});
