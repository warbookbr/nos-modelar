/* contorno.test.mjs — retângulo arredondado, recuo por meia-esquadria, área e convexidade do contorno 2D. */
import { describe, expect, it } from 'vitest';
import { areaDoContorno, deslocarContorno, ehConvexo, retanguloArredondado } from './contorno.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/* distância (com sinal, positiva para dentro de um polígono anti-horário) de p à reta da aresta a->b */
const paraDentro = (p, a, b) => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / dist(a, b);

/* Cópia literal de recuarPerfil e ehConvexo que modulos/esboco/src/index.js tinha antes de importar este núcleo, só para
   provar que o resultado do núcleo é o que o esboço calculava no caso convexo. */
function recuarPerfilDoEsboco(perfil, d) {
  const n = perfil.length;
  const dir = (a, b) => { const x = b[0] - a[0]; const y = b[1] - a[1]; const t = Math.hypot(x, y); return [x / t, y / t]; };
  return perfil.map((q, i) => {
    const e1 = dir(perfil[(i - 1 + n) % n], q);
    const e2 = dir(q, perfil[(i + 1) % n]);
    const n1 = [-e1[1], e1[0]];
    const n2 = [-e2[1], e2[0]];
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [q[0] + (n1[0] + n2[0]) * k, q[1] + (n1[1] + n2[1]) * k];
  });
}
function ehConvexoDoEsboco(perfil) {
  let sinal = 0;
  for (let i = 0; i < perfil.length; i++) {
    const a = perfil[i]; const b = perfil[(i + 1) % perfil.length]; const c = perfil[(i + 2) % perfil.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-9) continue;
    if (sinal === 0) sinal = Math.sign(z);
    else if (Math.sign(z) !== sinal) return false;
  }
  return sinal !== 0;
}

/* área esperada do recuo de um polígono convexo por meia-esquadria: A - P*d + d² * soma(tan(ângulo externo / 2)) */
function areaEsperadaDoRecuo(poligono, d) {
  const n = poligono.length;
  let perimetro = 0;
  let tangentes = 0;
  for (let i = 0; i < n; i++) {
    const a = poligono[(i - 1 + n) % n]; const b = poligono[i]; const c = poligono[(i + 1) % n];
    perimetro += dist(b, c);
    const externo = Math.atan2((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]));
    tangentes += Math.tan(externo / 2);
  }
  return areaDoContorno(poligono) - perimetro * d + d * d * tangentes;
}

/* a frente em D da caçamba: cantos da frente [largura/2, arco], cantos de trás pequenos */
const D = { largura: 190, profundidade: 300, cantos: [[95, 215], [95, 215], 20, 20], segmentosPorCanto: 4 };

describe('retanguloArredondado', () => {
  it('raio 0 dá os quatro cantos vivos, sem ponto repetido, anti-horário', () => {
    const p = retanguloArredondado({ largura: 10, profundidade: 6, cantos: 0, segmentosPorCanto: 5 });
    expect(p).toEqual([[5, 3], [-5, 3], [-5, -3], [5, -3]]);
    expect(areaDoContorno(p)).toBe(60);
  });

  it('raio igual nos quatro cantos: 4 * (segmentos + 1) pontos, área exata do polígono inscrito, simétrico', () => {
    const r = 2;
    const s = 6;
    const p = retanguloArredondado({ largura: 10, profundidade: 6, cantos: r, segmentosPorCanto: s });
    expect(p).toHaveLength(4 * (s + 1));
    expect(areaDoContorno(p)).toBeCloseTo(10 * 6 - 4 * (r * r - 0.5 * s * r * r * Math.sin(Math.PI / 2 / s)), 8);
    expect(ehConvexo(p)).toBe(true);
    for (const [u, v] of p) {
      expect(Math.abs(u)).toBeLessThanOrEqual(5 + 1e-9);
      expect(Math.abs(v)).toBeLessThanOrEqual(3 + 1e-9);
    }
    // espelhado em u e em v: cada ponto tem o seu simétrico na lista
    for (const [u, v] of p) {
      expect(p.some(([a, b]) => Math.abs(a + u) < 1e-9 && Math.abs(b - v) < 1e-9)).toBe(true);
      expect(p.some(([a, b]) => Math.abs(a - u) < 1e-9 && Math.abs(b + v) < 1e-9)).toBe(true);
    }
    // o primeiro ponto é o início do arco do canto +u+v, sobre o lado +u
    expect(p[0]).toEqual([5, 1]);
  });

  it('raio igual à meia-largura nos dois cantos de um lado dá um arco inteiro, com o ponto do meio uma vez só', () => {
    const p = retanguloArredondado(D);
    // frente: 2 * 5 pontos de arco - 1 coincidente = 9; trás: 2 * 5 pontos de canto = 10
    expect(p).toHaveLength(9 + 10);
    // o ponto do meio da frente é o único com u = 0 em v máximo, uma vez
    const meio = p.filter(([u, v]) => u === 0 && v === 150);
    expect(meio).toHaveLength(1);
    // nenhum ponto consecutivo repetido, nem na volta
    for (let i = 0; i < p.length; i++) expect(dist(p[i], p[(i + 1) % p.length])).toBeGreaterThan(1e-6);
    // o arco da frente é meia elipse de semi-eixos 95 e 215 centrada em (0, 150 - 215)
    const arco = p.filter(([, v]) => v > -65 - 1e-9);
    for (const [u, v] of arco) expect((u / 95) ** 2 + ((v + 65) / 215) ** 2).toBeCloseTo(1, 8);
    expect(areaDoContorno(p)).toBeGreaterThan(0);
    expect(ehConvexo(p)).toBe(true);
  });

  it('canto elíptico: ru e rv diferentes, pontos sobre a elipse e o lado reto no que sobra', () => {
    const p = retanguloArredondado({ largura: 20, profundidade: 10, cantos: [[6, 3], 0, 0, 0], segmentosPorCanto: 3 });
    expect(p).toHaveLength(4 + 3);
    const arco = p.slice(0, 4);
    expect(arco[0]).toEqual([10, 2]);
    expect(arco[3]).toEqual([4, 5]);
    for (const [u, v] of arco) expect(((u - 4) / 6) ** 2 + ((v - 2) / 3) ** 2).toBeCloseTo(1, 8);
    // os três cantos vivos restantes
    expect(p.slice(4)).toEqual([[-10, 5], [-10, -5], [10, -5]]);
  });

  it('um raio zero num só eixo vira canto vivo', () => {
    const p = retanguloArredondado({ largura: 10, profundidade: 6, cantos: [[2, 0], 0, 0, 0], segmentosPorCanto: 3 });
    expect(p).toEqual([[5, 3], [-5, 3], [-5, -3], [5, -3]]);
  });

  it('é anti-horário e a contagem de pontos segue os raios', () => {
    for (const cantos of [0, 1, [1, 0, 2, 0], [[1, 2], [2, 1], 0, 3]]) {
      const p = retanguloArredondado({ largura: 12, profundidade: 8, cantos, segmentosPorCanto: 3 });
      const raios = Array.isArray(cantos) ? cantos : [cantos, cantos, cantos, cantos];
      const esperado = raios.reduce((acc, c) => acc + ((Array.isArray(c) ? c[0] * c[1] : c) > 0 ? 4 : 1), 0);
      expect(p).toHaveLength(esperado);
      expect(areaDoContorno(p)).toBeGreaterThan(0);
      expect(ehConvexo(p)).toBe(true);
    }
  });

  it('é determinístico: mesma entrada, mesmos números, sem zero negativo nem ruído de ponto flutuante', () => {
    const a = retanguloArredondado(D);
    const b = retanguloArredondado({ ...D });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.flat().some((x) => Object.is(x, -0))).toBe(false);
    for (const x of a.flat()) expect(Math.abs(x * 1e9 - Math.round(x * 1e9))).toBeLessThan(1e-3);
  });

  it('usa quatro segmentos por canto e canto vivo quando não se diz nada', () => {
    expect(retanguloArredondado({ largura: 4, profundidade: 2 })).toHaveLength(4);
    expect(retanguloArredondado({ largura: 4, profundidade: 2, cantos: 0.5 })).toHaveLength(20);
  });

  it('recusa raio negativo, soma dos raios maior que o lado e segmentos menores que 1', () => {
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: -1 })).toThrow(/raio negativo/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: [1, [1, -0.5], 1, 1] })).toThrow(/canto 1 tem raio negativo/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: 3.5 })).toThrow(/soma dos raios \(7\) passa da largura \(10\)|soma dos raios \(7\) passa da profundidade \(6\)/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: [[6, 1], [5, 1], 0, 0] })).toThrow(/lado \+v.*soma dos raios \(11\) passa da largura \(10\)/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: [[1, 4], 0, 0, [1, 3]] })).toThrow(/lado \+u.*soma dos raios \(7\) passa da profundidade \(6\)/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: 1, segmentosPorCanto: 0 })).toThrow(/segmentosPorCanto/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: 1, segmentosPorCanto: 2.5 })).toThrow(/segmentosPorCanto/);
  });

  it('aceita a soma dos raios igual ao lado e recusa medidas e listas inválidas', () => {
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: 3 })).not.toThrow();
    expect(() => retanguloArredondado({ largura: 0, profundidade: 6 })).toThrow(/largura/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: Number.NaN })).toThrow(/profundidade/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: [1, 1, 1] })).toThrow(/lista de 4 cantos/);
    expect(() => retanguloArredondado({ largura: 10, profundidade: 6, cantos: [1, 1, 1, 'a'] })).toThrow(/canto 3/);
  });
});

describe('areaDoContorno e ehConvexo', () => {
  it('área com sinal: positiva anti-horário, negativa horário', () => {
    const q = [[0, 0], [4, 0], [4, 3], [0, 3]];
    expect(areaDoContorno(q)).toBe(12);
    expect(areaDoContorno([...q].reverse())).toBe(-12);
  });

  it('convexo aceita colineares e recusa côncavo e degenerado, como o do esboço', () => {
    const casos = [
      [[0, 0], [4, 0], [4, 3], [0, 3]],
      [[0, 0], [2, 0], [4, 0], [4, 3], [0, 3]],
      [[0, 0], [4, 0], [4, 3], [2, 1], [0, 3]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [0, 3], [4, 3], [4, 0]],
      retanguloArredondado(D),
    ];
    for (const c of casos) expect(ehConvexo(c)).toBe(ehConvexoDoEsboco(c));
    expect(ehConvexo(casos[0])).toBe(true);
    expect(ehConvexo(casos[1])).toBe(true);
    expect(ehConvexo(casos[2])).toBe(false);
    expect(ehConvexo(casos[3])).toBe(false);
    expect(ehConvexo(casos[4])).toBe(true);
  });

  it('recusa entrada que não é polígono', () => {
    expect(() => areaDoContorno([[0, 0], [1, 1]])).toThrow(/3 pontos/);
    expect(() => ehConvexo([[0, 0], [1, 1], [1, 'x']])).toThrow(/ponto 2/);
  });
});

describe('deslocarContorno', () => {
  const quadrado = [[5, 5], [-5, 5], [-5, -5], [5, -5]];

  it('recuo de quadrado: lado cai 2d, área (a - 2d)², mesmo número de vértices', () => {
    const p = deslocarContorno(quadrado, 1);
    expect(p).toEqual([[4, 4], [-4, 4], [-4, -4], [4, -4]]);
    expect(areaDoContorno(p)).toBe(64);
    expect(deslocarContorno(quadrado, 4.5)).toHaveLength(4);
  });

  it('distância negativa expande, zero devolve o mesmo polígono', () => {
    expect(deslocarContorno(quadrado, -2)).toEqual([[7, 7], [-7, 7], [-7, -7], [7, -7]]);
    expect(deslocarContorno(quadrado, 0)).toEqual(quadrado);
    expect(deslocarContorno(quadrado, 0)).not.toBe(quadrado);
  });

  it('recuo de D: a área cai como A - P*d + d² * soma(tan(externo/2)) e cada vértice fica a d dos lados vizinhos', () => {
    const d = D.cantos[3];
    const p = retanguloArredondado(D);
    for (const recuo of [3, 7, -5]) {
      const q = deslocarContorno(p, recuo);
      expect(q).toHaveLength(p.length);
      expect(areaDoContorno(q)).toBeCloseTo(areaEsperadaDoRecuo(p, recuo), 6);
      expect(ehConvexo(q)).toBe(true);
      for (let i = 0; i < p.length; i++) {
        const antes = p[(i - 1 + p.length) % p.length];
        const depois = p[(i + 1) % p.length];
        expect(paraDentro(q[i], antes, p[i])).toBeCloseTo(recuo, 8);
        expect(paraDentro(q[i], p[i], depois)).toBeCloseTo(recuo, 8);
      }
    }
    expect(d).toBe(20);
    // o recuo da caçamba (parede de 7 mm) mantém a área positiva e menor que a do contorno externo
    expect(areaDoContorno(deslocarContorno(p, 7))).toBeLessThan(areaDoContorno(p));
  });

  it('bate com o recuo de perfil convexo do esboço: o mesmo polígono dá os mesmos pontos', () => {
    const hexagono = Array.from({ length: 6 }, (_, k) => [8 * Math.cos((k * Math.PI) / 3), 5 * Math.sin((k * Math.PI) / 3)]);
    const triangulo = [[0, 0], [10, 0], [3, 6]];
    const caixaChanfrada = [[-4, -5], [4, -5], [5, -4], [5, 4], [4, 5], [-4, 5], [-5, 4], [-5, -4]];
    for (const poligono of [quadrado, hexagono, triangulo, caixaChanfrada, retanguloArredondado(D), retanguloArredondado({ largura: 30, profundidade: 20, cantos: [[8, 4], 3, [2, 6], 0], segmentosPorCanto: 3 })]) {
      for (const d of [0.5, 1.2]) {
        const meu = deslocarContorno(poligono, d);
        const dele = recuarPerfilDoEsboco(poligono, d);
        expect(meu).toHaveLength(dele.length);
        meu.forEach((q, i) => {
          expect(q[0]).toBeCloseTo(dele[i][0], 12);
          expect(q[1]).toBeCloseTo(dele[i][1], 12);
        });
      }
    }
  });

  it('é determinístico e não altera a entrada', () => {
    const p = retanguloArredondado(D);
    const copia = JSON.stringify(p);
    expect(JSON.stringify(deslocarContorno(p, 6))).toBe(JSON.stringify(deslocarContorno(p, 6)));
    expect(JSON.stringify(p)).toBe(copia);
  });

  it('recusa polígono não convexo, horário, degenerado e distância inválida', () => {
    expect(() => deslocarContorno([[0, 0], [4, 0], [4, 3], [2, 1], [0, 3]], 0.1)).toThrow(/não é convexo/);
    expect(() => deslocarContorno([...quadrado].reverse(), 1)).toThrow(/anti-horário/);
    expect(() => deslocarContorno([[0, 0], [4, 0], [4, 0], [4, 3], [0, 3]], 0.1)).toThrow(/comprimento zero/);
    expect(() => deslocarContorno(quadrado, Number.NaN)).toThrow(/distancia/);
  });

  it('recusa o recuo que inverte o polígono e diz o recuo máximo aproximado', () => {
    expect(() => deslocarContorno(quadrado, 5)).toThrow(/recuo máximo é aproximadamente 5\.000/);
    expect(() => deslocarContorno(quadrado, 6)).toThrow(/inverte ou colapsa.*5\.000/);
    const retangulo = [[10, 2], [-10, 2], [-10, -2], [10, -2]];
    expect(() => deslocarContorno(retangulo, 1.5)).not.toThrow();
    expect(() => deslocarContorno(retangulo, 2.5)).toThrow(/aproximadamente 2\.000/);
    const p = retanguloArredondado(D);
    const maximo = Number(/aproximadamente ([\d.]+)/.exec((() => { try { deslocarContorno(p, 500); } catch (e) { return e.message; } return ''; })())[1]);
    expect(maximo).toBeGreaterThan(0);
    expect(() => deslocarContorno(p, maximo - 0.01)).not.toThrow();
    expect(() => deslocarContorno(p, maximo + 0.01)).toThrow(/inverte/);
  });
});
