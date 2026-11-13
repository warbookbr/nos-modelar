/* forma-exata.test.mjs — o protótipo da forma exata antes da malha: o contorno de retas e arcos e o recuo dele, a triangulação da
   região plana, as operações de borda e de furo sobre a forma, e a malha gerada no fim. */
import { describe, expect, it } from 'vitest';
import { areaDoContorno, deslocarContorno } from '../contorno.js';
import { contornoPorTrechos } from '../curva2d.js';
import { amostrarNivel, areaDoNivel, divisoesDoLaco, lacoExatoPorTrechos, nivelDoLaco } from './contorno-exato.js';
import { triangularRegiao } from './triangular-regiao.js';
import { arredondarAresta, chanfrarAresta, facesExatas, furoPassante, malhaDaForma, prismaExato, volumeExato } from './forma-exata.js';
import { estanqueidade, menorAreaDeFace, volumeDaMalha } from './medir-malha.js';

const CONTORNO = { inicio: [0, 0], trechos: [{ reto: [12, 0] }, { reto: [14.5, 1.6] }, { arco: { por: [40, 6.4], ate: [70, 5.4] } }, { arcoTangente: [200, -19] }, { arcoTangente: [290, 1] }, { arco: { por: [215, 31], ate: [140, 56.4] } }, { reto: [0, 34] }] };
const RETANGULO = { inicio: [0, 0], trechos: [{ reto: [40, 0] }, { reto: [40, 20] }, { reto: [0, 20] }] };

function distanciaAoSegmento(p, s) {
  if (s.tipo === 'reta') {
    const e = [s.b[0] - s.a[0], s.b[1] - s.a[1]];
    const f = Math.min(1, Math.max(0, ((p[0] - s.a[0]) * e[0] + (p[1] - s.a[1]) * e[1]) / (e[0] ** 2 + e[1] ** 2)));
    return Math.hypot(p[0] - s.a[0] - e[0] * f, p[1] - s.a[1] - e[1] * f);
  }
  return Math.abs(Math.hypot(p[0] - s.c[0], p[1] - s.c[1]) - s.r);
}

describe('contorno exato', () => {
  it('guarda cada trecho como reta ou arco, e os pontos que `contornoPorTrechos` calcula para o mesmo contorno caem sobre eles', () => {
    const laco = lacoExatoPorTrechos(CONTORNO);
    expect(laco.segmentos.map((s) => s.tipo)).toEqual(['reta', 'reta', 'arco', 'arco', 'arco', 'arco', 'reta', 'reta']);
    expect(laco.segmentos[7].fecho).toBe(true);
    const pontos = contornoPorTrechos(CONTORNO, { segmentosArco: 16 });
    for (const p of pontos) expect(Math.min(...laco.segmentos.map((s) => distanciaAoSegmento(p, s)))).toBeLessThan(1e-8);
  });

  it('o recuo de um retângulo dá os vértices de `deslocarContorno`, e a área do nível é exata', () => {
    const laco = lacoExatoPorTrechos(RETANGULO);
    const nivel = nivelDoLaco(laco, [3, 3, 3, 3]);
    const esperado = deslocarContorno([[0, 0], [40, 0], [40, 20], [0, 20]], 3);
    nivel.segmentos.forEach((s, i) => { expect(s.de[0]).toBeCloseTo(esperado[i][0], 12); expect(s.de[1]).toBeCloseTo(esperado[i][1], 12); });
    expect(areaDoNivel(nivel)).toBeCloseTo(34 * 14, 9);
  });

  it('cada trecho recua pela distância dele e o canto sai da interseção dos dois vizinhos', () => {
    const nivel = nivelDoLaco(lacoExatoPorTrechos(RETANGULO), [5, 1, 0, 2]);
    expect(nivel.segmentos.map((s) => s.de.map((x) => Number(x.toFixed(9))))).toEqual([[2, 5], [39, 5], [39, 20], [2, 20]]);
  });

  it('a área exata do contorno curvo é o limite da área do polígono amostrado', () => {
    const laco = lacoExatoPorTrechos(CONTORNO);
    const nivel = nivelDoLaco(laco, laco.segmentos.map(() => 0));
    const fino = amostrarNivel(nivel, divisoesDoLaco(laco, { passo: 1000, desvio: 1e-7 }));
    expect(areaDoContorno(fino)).toBeCloseTo(areaDoNivel(nivel), 3);
  });

  it('recusa a spline, o trecho que some e a borda que muda numa junção tangente, dizendo o trecho e a medida', () => {
    expect(() => lacoExatoPorTrechos({ inicio: [0, 0], trechos: [{ reto: [10, 0] }, { spline: [[10, 5], [0, 5]] }] })).toThrow(/trechos\[1\].*spline/);
    expect(() => nivelDoLaco(lacoExatoPorTrechos(RETANGULO), [0, 25, 0, 25])).toThrow(/trecho 0 \(reto de 40\) some.*sobra -10/);
    const laco = lacoExatoPorTrechos(CONTORNO);
    expect(() => nivelDoLaco(laco, [0, 0, 1, 2, 2, 0, 0, 0])).toThrow(/trechos 2 e 3 se encontram em tangência.*recuos diferentes \(1 e 2\)/);
  });
});

describe('triangulação da região', () => {
  const anel = (cx, cy, r, n, horario = false) => Array.from({ length: n }, (_, k) => { const a = ((horario ? -k : k) * 2 * Math.PI) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const borda = [];
  for (let k = 0; k < 20; k++) borda.push([k * 5, 0]);
  for (let k = 0; k < 8; k++) borda.push([100, k * 5]);
  for (let k = 0; k < 20; k++) borda.push([100 - k * 5, 40]);
  for (let k = 0; k < 8; k++) borda.push([0, 40 - k * 5]);
  const furo = anel(30, 20, 3, 18, true), outro = anel(70, 22, 9, 24, true);
  const pontos = [...borda, ...furo, ...outro];
  const lacos = [borda.map((_, k) => k), furo.map((_, k) => borda.length + k), outro.map((_, k) => borda.length + furo.length + k)];
  const t = triangularRegiao(pontos, lacos);
  const area2 = ([a, b, c]) => (t.pontos[b][0] - t.pontos[a][0]) * (t.pontos[c][1] - t.pontos[a][1]) - (t.pontos[b][1] - t.pontos[a][1]) * (t.pontos[c][0] - t.pontos[a][0]);

  it('cobre a região sem sobra nem falta, com todo triângulo anti-horário', () => {
    for (const tri of t.triangulos) expect(area2(tri)).toBeGreaterThan(0);
    const soma = t.triangulos.reduce((s, tri) => s + area2(tri) / 2, 0);
    expect(soma).toBeCloseTo(areaDoContorno(borda) + areaDoContorno(furo) + areaDoContorno(outro), 9);
  });

  it('mantém inteira cada aresta dos laços, e nenhum ponto novo cai sobre o contorno', () => {
    const usos = new Map();
    for (const tri of t.triangulos) for (let k = 0; k < 3; k++) { const a = tri[k], b = tri[(k + 1) % 3]; const c = a < b ? `${a}|${b}` : `${b}|${a}`; usos.set(c, (usos.get(c) ?? 0) + 1); }
    const doContorno = new Set();
    for (const l of lacos) l.forEach((a, k) => { const b = l[(k + 1) % l.length]; doContorno.add(a < b ? `${a}|${b}` : `${b}|${a}`); });
    for (const c of doContorno) expect(usos.get(c)).toBe(1);
    for (const [c, n] of usos) if (!doContorno.has(c)) expect(n).toBe(2);
    expect(t.pontos.slice(0, pontos.length)).toEqual(pontos);
  });

  it('nenhum triângulo passa de razão 10 entre o maior lado e a altura dele (o limite da régua de triângulo fino)', () => {
    let pior = 0;
    for (const [a, b, c] of t.triangulos) {
      const P = [t.pontos[a], t.pontos[b], t.pontos[c]];
      const maior = Math.max(...P.map((p, k) => Math.hypot(p[0] - P[(k + 1) % 3][0], p[1] - P[(k + 1) % 3][1])));
      pior = Math.max(pior, (maior * maior) / area2([a, b, c]));
    }
    expect(pior).toBeLessThan(10);
    expect(t.interrompido).toBe(false);
  });

  it('é determinística, e sem refino (qualidade infinita) não cria ponto', () => {
    expect(JSON.stringify(triangularRegiao(pontos, lacos))).toBe(JSON.stringify(t));
    const cru = triangularRegiao(pontos, lacos, { qualidade: Infinity });
    expect(cru.pontos.length).toBe(pontos.length);
    expect(cru.triangulos.length).toBe(pontos.length + 2 * 2 - 2);
  });

  it('recusa o ponto repetido', () => {
    expect(() => triangularRegiao([[0, 0], [1, 0], [1, 0], [0, 1]], [[0, 1, 2, 3]])).toThrow(/ponto 2 .* repete/);
  });
});

describe('forma exata: operações e malha', () => {
  const caixa = () => prismaExato({ contorno: RETANGULO, altura: 10 });

  it('o prisma tem as faces exatas do contorno, e o chanfro e o arredondamento trocam a aresta por uma face exata', () => {
    expect(facesExatas(caixa()).map((f) => f.tipo)).toEqual(['plano', 'plano', 'plano', 'plano', 'plano', 'plano']);
    const f = arredondarAresta(chanfrarAresta(caixa(), { trechos: [0], lado: 'topo', largura: 2, altura: 3 }), { trechos: [2], lado: 'ambos', raio: 1 });
    expect(facesExatas(f).filter((x) => x.trecho === 0).map((x) => `${x.parte}: ${x.tipo}`)).toEqual(['parede: plano', 'chanfro de cima: plano']);
    expect(facesExatas(f).filter((x) => x.trecho === 2).map((x) => `${x.parte}: ${x.tipo}`)).toEqual(['arredondado de baixo: cilindro', 'parede: plano', 'arredondado de cima: cilindro']);
    const disco = furoPassante(prismaExato({ contorno: { circulo: { raio: 30 } }, altura: 8 }), { centro: [5, 0], raio: 4, boca: { lado: 'topo', chanfro: { largura: 1, altura: 1 } } });
    expect(facesExatas(arredondarAresta(disco, { lado: 'fundo', raio: 2 })).map((x) => x.tipo)).toEqual(['plano', 'plano', 'toro', 'cilindro', 'cilindro', 'cone']);
  });

  it('o volume exato da caixa chanfrada é o da conta à mão, e a malha de faces planas dá o mesmo volume', () => {
    const f = chanfrarAresta(caixa(), { trechos: [0], lado: 'topo', largura: 2, altura: 3 });
    const esperado = 40 * 20 * 10 - (2 * 3 / 2) * 40;
    expect(volumeExato(f)).toBeCloseTo(esperado, 8);
    const malha = malhaDaForma(f, { passo: 5, desvio: 0.01 });
    expect(volumeDaMalha(malha)).toBeCloseTo(esperado, 8);
    expect(estanqueidade(malha)).toMatchObject({ fechada: true, verticesSemFace: 0 });
  });

  it('dois chanfros diferentes num canto vivo se encontram na reta de interseção dos dois planos', () => {
    const f = chanfrarAresta(chanfrarAresta(caixa(), { trechos: [0], lado: 'topo', largura: 6, altura: 3 }), { trechos: [1], lado: 'topo', largura: 2, altura: 3 });
    /* volume: a caixa menos os dois prismas de chanfro, mais a parte que os dois tiram em comum no canto (uma pirâmide de base 6 por 2 e altura 3 tem um terço do bloco) */
    expect(volumeExato(f)).toBeCloseTo(8000 - (6 * 3 / 2) * 40 - (2 * 3 / 2) * 20 + (6 * 2 * 3) / 3, 8);
    const malha = malhaDaForma(f, { passo: 5, desvio: 0.01 });
    expect(volumeDaMalha(malha)).toBeCloseTo(volumeExato(f), 8);
    expect(estanqueidade(malha).fechada).toBe(true);
  });

  it('o volume exato do disco de borda arredondada é o do teorema de Pappus, e a malha chega a ele quando o desvio diminui', () => {
    const R = 30, H = 8, r = 2;
    const f = arredondarAresta(prismaExato({ contorno: { circulo: { raio: R } }, altura: H }), { lado: 'topo', raio: r });
    const area = r * r * (1 - Math.PI / 4), centroide = (r * (10 - 3 * Math.PI)) / (3 * (4 - Math.PI));
    const esperado = Math.PI * R * R * H - 2 * Math.PI * (R - centroide) * area;
    expect(volumeExato(f)).toBeCloseTo(esperado, 6);
    const grossa = volumeDaMalha(malhaDaForma(f, { passo: 100, desvio: 0.05 }));
    const fina = volumeDaMalha(malhaDaForma(f, { passo: 100, desvio: 0.0005 }));
    expect(Math.abs(fina - esperado)).toBeLessThan(Math.abs(grossa - esperado) / 50);
    expect(Math.abs(fina - esperado) / esperado).toBeLessThan(1e-4);
  });

  it('o furo passante com a boca arredondada fecha, sem face de área nula, e as bocas dividem os vértices com o topo', () => {
    let f = prismaExato({ contorno: { circulo: { raio: 30, lados: 48 } }, altura: 8 });
    f = furoPassante(f, { centro: [0, 0], raio: 6, lados: 18, boca: { lado: 'ambos', raio: 1, paineis: 3 } });
    f = furoPassante(f, { centro: [18, 0], raio: 2, lados: 12, boca: { lado: 'topo', chanfro: { largura: 0.5, altura: 0.5 } } });
    const malha = malhaDaForma(f, { passo: 100, desvio: 0.01 });
    expect(estanqueidade(malha)).toEqual({ arestasSoltas: 0, arestasDeMaisDeDuasFaces: 0, arestasNoMesmoSentido: 0, verticesSemFace: 0, fechada: true });
    expect(menorAreaDeFace(malha)).toBeGreaterThan(0.01);
    expect(volumeDaMalha(malha)).toBeGreaterThan(0);
    expect(new Set(malha.superficie)).toEqual(new Set(['plano', 'cilindro', 'toro', 'cone']));
    expect(JSON.stringify(malhaDaForma(f, { passo: 100, desvio: 0.01 }))).toBe(JSON.stringify(malha));
  });

  it('as recusas dizem a operação, o trecho e a medida', () => {
    expect(() => chanfrarAresta(caixa(), { trechos: [0, 2], lado: 'topo', largura: 12, altura: 1 })).toThrow(/trecho 1 \(reto de 20\) some/);
    expect(() => chanfrarAresta(chanfrarAresta(caixa(), { trechos: [0], lado: 'topo', largura: 1, altura: 6 }), { trechos: [0], lado: 'fundo', largura: 1, altura: 5 })).toThrow(/chanfrarAresta: no trecho 0 as bordas de cima e de baixo somam 11 de altura, e a peça tem 10/);
    expect(() => chanfrarAresta(caixa(), { trechos: [7], largura: 1, altura: 1 })).toThrow(/não tem o trecho 7/);
    expect(() => furoPassante(caixa(), { centro: [38, 10], raio: 3 })).toThrow(/furoPassante: o furo de raio 3 .* fica a 2 do laço 0/);
    expect(() => furoPassante(furoPassante(caixa(), { centro: [10, 10], raio: 3 }), { centro: [15, 10], raio: 3 })).toThrow(/laço 1/);
    expect(() => arredondarAresta(prismaExato({ contorno: { circulo: { raio: 5 } }, altura: 20 }), { lado: 'topo', raio: 6 })).toThrow(/passa do raio 5/);
  });

  it('a chapa de contorno curvo com gume e quinas quebradas sai fechada, com o volume exato a menos do desvio da corda', () => {
    let f = prismaExato({ contorno: CONTORNO, altura: 5 });
    f = chanfrarAresta(f, { trechos: [2, 3, 4], lado: 'ambos', largura: 16, altura: 2.5 });
    f = chanfrarAresta(f, { trechos: [0, 1, 5, 6], lado: 'ambos', largura: 0.8, altura: 0.8 });
    expect(facesExatas(f).filter((x) => x.tipo === 'cone')).toHaveLength(8);
    const malha = malhaDaForma(f, { passo: 6, desvio: 0.02 });
    expect(estanqueidade(malha).fechada).toBe(true);
    expect(menorAreaDeFace(malha)).toBeGreaterThan(1);
    expect(Math.abs(volumeDaMalha(malha) - volumeExato(f)) / volumeExato(f)).toBeLessThan(5e-4);
    /* a ordem contrária passa por um estado em que o degrau de 3 mm some, e a operação recusa em vez de entregar face torta */
    expect(() => chanfrarAresta(prismaExato({ contorno: CONTORNO, altura: 5 }), { trechos: [0, 1, 5, 6], lado: 'ambos', largura: 0.8, altura: 0.8 })).toThrow(/trecho 1 .* some/);
  });
});
