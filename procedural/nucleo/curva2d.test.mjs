/* curva2d.test.mjs — contorno 2D por trechos (reto, arco, arco tangente, concordância e spline).

   As afirmações são números: área e comprimento contra a conta analítica do polígono inscrito (e contra a do círculo, com
   discretização fina), pontos de passagem exatos, distância ao centro, ângulo entre arestas nas junções, recusas com campo
   e valor, e a saída byte a byte. A tolerância de 1e-7 cobre a grade de 1e-9 da saída. */
import { describe, expect, it } from 'vitest';
import { areaDoContorno, ehSimples, retanguloArredondado } from './contorno.js';
import { ErroDeCurva, contornoPorTrechos } from './curva2d.js';
import { nucleo } from './entrada.js';
import { ErroDePerfil, formaParaContorno, montarPerfil } from './perfil2d.js';
import { sha256Hex } from './sha256.js';

const comprimento = (pontos) => pontos.reduce((s, p, k) => s + Math.hypot(pontos[(k + 1) % pontos.length][0] - p[0], pontos[(k + 1) % pontos.length][1] - p[1]), 0);
const recusa = (contorno, opcoes) => { try { contornoPorTrechos(contorno, opcoes); } catch (e) { return e; } return null; };
const perto = (a, b, casas = 7) => { expect(a).toHaveLength(b.length); a.forEach((p, k) => { expect(p[0]).toBeCloseTo(b[k][0], casas); expect(p[1]).toBeCloseTo(b[k][1], casas); }); };
/* ângulo (rad) entre a aresta que chega em k e a que sai de k */
const virada = (p, k) => {
  const a = p[(k - 1 + p.length) % p.length], b = p[k], c = p[(k + 1) % p.length];
  const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
  return Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]);
};

/* Gancho: barra de espessura 1 que dobra um quarto de volta. Externo: reto, arco tangente (R = 2), reto; interno: reto,
   arco tangente (R = 1, para o outro lado), reto. Dobra com centro em (4, 2). */
const GANCHO = {
  inicio: [0, 0],
  trechos: [
    { reto: [4, 0] },
    { arcoTangente: [6, 2] },
    { reto: [6, 5] },
    { reto: [5, 5] },
    { reto: [5, 2] },
    { arcoTangente: [4, 1] },
    { reto: [0, 1] },
  ],
};
/* área do polígono inscrito: a barra reta 4 × 1, a coluna 1 × 3 e o anel de quarto de volta entre R = 1 e R = 2 com n
   segmentos, cuja área é n × ½(R² − r²) sen(θ), θ = π / (2n) */
const areaDoGancho = (n) => 4 + 3 + 0.5 * 3 * n * Math.sin(Math.PI / (2 * n));
const comprimentoDoGancho = (n) => 4 + 3 + 1 + 3 + 4 + 1 + 3 * n * 2 * Math.sin(Math.PI / (4 * n));

describe('perfil de gancho: reto, arco tangente, reto', () => {
  it('área e comprimento batem com a conta do polígono inscrito, para vários segmentosArco', () => {
    for (const n of [1, 2, 4, 7, 16]) {
      const p = contornoPorTrechos(GANCHO, { segmentosArco: n });
      expect(areaDoContorno(p)).toBeCloseTo(areaDoGancho(n), 7);
      expect(comprimento(p)).toBeCloseTo(comprimentoDoGancho(n), 7);
      expect(ehSimples(p)).toBe(true);
    }
  });

  it('com discretização fina converge para a conta do círculo (7 + 3π/4 de área, 16 + 3π/2 de perímetro)', () => {
    const p = contornoPorTrechos(GANCHO, { segmentosArco: 512 });
    expect(areaDoContorno(p)).toBeCloseTo(7 + (3 * Math.PI) / 4, 4);
    expect(comprimento(p)).toBeCloseTo(16 + (3 * Math.PI) / 2, 4);
  });

  it('número de pontos: 2 retos de entrada e saída de cada arco, mais os n pontos de cada arco', () => {
    const n = 4;
    const p = contornoPorTrechos(GANCHO, { segmentosArco: n });
    // pontos escritos: (0,0) (4,0) (6,5) (5,5) (5,2) (0,1) (4,1)... mais n − 1 intermediários em cada um dos dois arcos
    expect(p).toHaveLength(8 + 2 * (n - 1));
    expect(p[0]).toEqual([0, 0]);
    expect(p).toContainEqual([6, 2]);
    expect(p).toContainEqual([4, 1]);
  });

  it('os pontos de cada arco ficam na circunferência (R = 2 e R = 1 em volta de (4, 2)) e a junção é tangente', () => {
    const n = 6;
    const p = contornoPorTrechos(GANCHO, { segmentosArco: n });
    const externos = p.filter(([u, v]) => u >= 4 && v <= 2 && Math.hypot(u - 4, v - 2) > 1.5);
    expect(externos).toHaveLength(n + 1);
    for (const [u, v] of externos) expect(Math.hypot(u - 4, v - 2)).toBeCloseTo(2, 8);
    const internos = p.filter(([u, v]) => u >= 4 && v <= 2 && Math.hypot(u - 4, v - 2) < 1.5);
    expect(internos).toHaveLength(n + 1);
    for (const [u, v] of internos) expect(Math.hypot(u - 4, v - 2)).toBeCloseTo(1, 8);
    // numa junção tangente a corda se desvia da tangente em meio passo angular: θ/2 = π / (4n)
    const kEntrada = p.findIndex(([u, v]) => u === 4 && v === 0);
    expect(Math.abs(virada(p, kEntrada))).toBeCloseTo(Math.PI / (4 * n), 8);
    const kSaida = p.findIndex(([u, v]) => u === 6 && v === 2);
    expect(Math.abs(virada(p, kSaida))).toBeCloseTo(Math.PI / (4 * n), 8);
  });

  it('o contorno entra em montarPerfil como {contorno} e a área do perfil é a do polígono', () => {
    const perfil = montarPerfil({ externo: { contorno: GANCHO }, segmentosArco: 8 });
    expect(perfil.componentes).toHaveLength(1);
    expect(perfil.area).toBeCloseTo(areaDoGancho(8), 6);
    expect(areaDoContorno(perfil.componentes[0].externo)).toBeGreaterThan(0);
  });
});

describe('concordância', () => {
  const retangulo = (w, h, r) => ({
    inicio: [w / 2, h / 2],
    trechos: [{ concordancia: r }, { reto: [-w / 2, h / 2] }, { concordancia: r }, { reto: [-w / 2, -h / 2] }, { concordancia: r }, { reto: [w / 2, -h / 2] }, { concordancia: r }],
  });

  it('retângulo com quatro concordâncias dá os mesmos números de retanguloArredondado', () => {
    for (const [w, h, r, n] of [[4, 3, 0.5, 4], [4, 3, 0.5, 3], [6, 2, 0.75, 1], [6, 2, 0.75, 5], [2, 1, 0.5, 4], [2, 2, 1, 4], [5, 3, 0.3, 8]]) {
      const por = contornoPorTrechos(retangulo(w, h, r), { segmentosArco: n });
      const esperado = retanguloArredondado({ largura: w, profundidade: h, cantos: r, segmentosPorCanto: n });
      expect(por).toEqual(esperado);
    }
  });

  it('o mesmo retângulo escrito por formaParaContorno e por montarPerfil, com a área analítica (4 − π)r² a menos', () => {
    const r = 0.5;
    const pontos = formaParaContorno({ contorno: retangulo(4, 3, r) }, 'perfil', { segmentosArco: 256 });
    expect(areaDoContorno(pontos)).toBeCloseTo(12 - (4 - Math.PI) * r * r, 5);
    expect(montarPerfil({ externo: { contorno: retangulo(4, 3, r) }, segmentosArco: 4 }).area)
      .toBeCloseTo(montarPerfil({ externo: { retangulo: { largura: 4, profundidade: 3, cantos: r } }, segmentosArco: 4 }).area, 6);
  });

  it('canto que não é reto: o triângulo equilátero tem a área menos Σ r²(tan(φ/2) − φ/2), φ = 120° nos três cantos', () => {
    const lado = 4, h = (lado * Math.sqrt(3)) / 2, r = 0.5;
    const tri = {
      inicio: [0, 0],
      trechos: [{ concordancia: r }, { reto: [lado, 0] }, { concordancia: r }, { reto: [lado / 2, h] }, { concordancia: r }],
    };
    const p = contornoPorTrechos(tri, { segmentosArco: 256 });
    const phi = (2 * Math.PI) / 3;
    const esperado = (Math.sqrt(3) / 4) * lado * lado - 3 * r * r * (Math.tan(phi / 2) - phi / 2);
    expect(areaDoContorno(p)).toBeCloseTo(esperado, 5);
    // as pontas da concordância ficam a r·tan(φ/2) do vértice, sobre as arestas
    const t = r * Math.tan(phi / 2);
    expect(p.some(([u, v]) => Math.abs(u - t) < 1e-8 && v === 0)).toBe(true);
    expect(p.some(([u, v]) => Math.abs(u - (lado - t)) < 1e-8 && v === 0)).toBe(true);
  });

  it('raio exatamente igual à metade do lado: os arcos se encontram no meio e o ponto sai uma vez', () => {
    const p = contornoPorTrechos(retangulo(2, 1, 0.5), { segmentosArco: 4 });
    expect(p).toEqual(retanguloArredondado({ largura: 2, profundidade: 1, cantos: 0.5, segmentosPorCanto: 4 }));
  });

  it('concordância só no meio do contorno: os outros cantos ficam vivos', () => {
    const p = contornoPorTrechos({ inicio: [0, 0], trechos: [{ reto: [4, 0] }, { concordancia: 1 }, { reto: [4, 3] }, { reto: [0, 3] }] }, { segmentosArco: 4 });
    expect(p).toContainEqual([0, 0]);
    expect(p).toContainEqual([4, 3]);
    expect(p).toContainEqual([0, 3]);
    expect(p).not.toContainEqual([4, 0]);
    expect(p).toContainEqual([3, 0]);
    expect(p).toContainEqual([4, 1]);
  });
});

describe('arco', () => {
  const D = (arco, segmentosArco = 4) => contornoPorTrechos({ inicio: [3, 1], trechos: [{ arco }] }, { segmentosArco });

  it('por três pontos, meia volta anti-horária: área do semicírculo inscrito e pontos a R = 2 do centro', () => {
    const n = 4;
    const p = D({ por: [1, 3], ate: [-1, 1] }, n);
    expect(p).toHaveLength(2 * n + 1);
    expect(p[0]).toEqual([3, 1]);
    expect(p[p.length - 1]).toEqual([-1, 1]);
    for (const [u, v] of p.slice(0, -1)) expect(Math.hypot(u - 1, v - 1)).toBeCloseTo(2, 8);
    expect(areaDoContorno(p)).toBeCloseTo(0.5 * 4 * (2 * n) * Math.sin(Math.PI / (2 * n)), 7);
    expect(comprimento(p)).toBeCloseTo(2 * n * 2 * 2 * Math.sin(Math.PI / (4 * n)) + 4, 7);
    const fino = D({ por: [1, 3], ate: [-1, 1] }, 512);
    expect(areaDoContorno(fino)).toBeCloseTo(2 * Math.PI, 4);
  });

  it('por três pontos, o sentido vem da ordem: horário passa por baixo, e o ponto do meio fica no arco', () => {
    const p = D({ por: [1, -1], ate: [-1, 1] });
    expect(areaDoContorno(p)).toBeLessThan(0);
    expect(p).toContainEqual([1, -1]);
    for (const [u, v] of p.slice(0, -1)) expect(Math.hypot(u - 1, v - 1)).toBeCloseTo(2, 8);
  });

  it('por três pontos, mais de meia volta: 270° horários em 12 segmentos', () => {
    const p = contornoPorTrechos({ inicio: [3, 1], trechos: [{ arco: { por: [1, -1], ate: [1, 3] } }] }, { segmentosArco: 4 });
    expect(p).toHaveLength(12 + 1);
    expect(p).toContainEqual([1, -1]);
    expect(p).toContainEqual([-1, 1]);
    expect(p[p.length - 1]).toEqual([1, 3]);
    // comprimento do arco (12 cordas de 22,5°) e o fecho, a corda de (1, 3) a (3, 1)
    expect(comprimento(p)).toBeCloseTo(12 * 2 * 2 * Math.sin((1.5 * Math.PI) / 24) + Math.hypot(2, 2), 7);
  });

  it('por centro e ângulo dá a mesma polilinha que por três pontos, nos dois sentidos', () => {
    perto(D({ centro: [1, 1], angulo: 180 }), D({ por: [1, 3], ate: [-1, 1] }));
    perto(D({ centro: [1, 1], angulo: -180 }), D({ por: [1, -1], ate: [-1, 1] }));
  });

  it('por centro e ângulo, ângulo qualquer: 90° em segmentosArco segmentos; 45° em ceil(segmentosArco / 2)', () => {
    expect(D({ centro: [1, 1], angulo: 90 }, 6)).toHaveLength(6 + 1);
    expect(D({ centro: [1, 1], angulo: 45 }, 6)).toHaveLength(3 + 1);
    expect(D({ centro: [1, 1], angulo: 100 }, 4)).toHaveLength(5 + 1);   // ceil(100 / 90 × 4) = 5
    const p = D({ centro: [1, 1], angulo: 90 }, 6);
    expect(p[p.length - 1][0]).toBeCloseTo(1, 8);
    expect(p[p.length - 1][1]).toBeCloseTo(3, 8);
  });

  it('arco tangente: parte na direção do reto que chegou, ponto final exato e raio pela conta (R = |d|² / 2d·n)', () => {
    const p = contornoPorTrechos({ inicio: [0, 0], trechos: [{ reto: [2, 0] }, { arcoTangente: [3, 1] }, { reto: [3, 3] }] }, { segmentosArco: 256 });
    // quarto de volta de raio 1 com centro em (2, 1)
    expect(p).toContainEqual([3, 1]);
    const arco = p.filter(([u, v]) => u > 2 && u <= 3 && v > 0 && v <= 1);
    expect(arco.length).toBeGreaterThan(200);
    for (const [u, v] of arco) expect(Math.hypot(u - 2, v - 1)).toBeCloseTo(1, 8);
    // tangente no começo: a primeira corda do arco quase paralela ao reto (desvio θ/2 = π / (4 · 256))
    const k = p.findIndex(([u, v]) => u === 2 && v === 0);
    expect(Math.abs(virada(p, k))).toBeCloseTo(Math.PI / (4 * 256), 6);   // a grade de 1e-9 pesa nas cordas curtas
  });

  it('arco tangente para o lado oposto (centro à direita) e arco tangente que passa de meia volta', () => {
    const horario = contornoPorTrechos({ inicio: [0, 0], trechos: [{ reto: [2, 0] }, { arcoTangente: [3, -1] }, { reto: [3, -3] }, { reto: [0, -3] }] }, { segmentosArco: 64 });
    for (const [u, v] of horario.filter(([u, v]) => u > 2 && v < 0 && v >= -1)) expect(Math.hypot(u - 2, v + 1)).toBeCloseTo(1, 8);
    // de (2, 0) com tangente +x até (2, 2): semicírculo anti-horário? Não: o ponto está atrás da tangente, a volta passa de 180°
    const longo = contornoPorTrechos({ inicio: [0, 0], trechos: [{ reto: [2, 0] }, { arcoTangente: [1, 1] }, { reto: [0, 3] }] }, { segmentosArco: 64 });
    // centro em (2, 1.25)? raio = |d|² / 2 d·n com d = (−1, 1), n = (0, 1): 2 / 2 = 1, centro (2, 1)
    for (const [u, v] of longo.filter(([u, v]) => v > 0 && u > 1 - 1e-9 && u <= 3 && Math.hypot(u - 2, v - 1) < 1.2)) expect(Math.hypot(u - 2, v - 1)).toBeCloseTo(1, 8);
    expect(longo).toContainEqual([1, 1]);
  });
});

describe('spline', () => {
  const PTS = [[2, 1], [4, 2.5], [5, 0.5], [7, 1.5], [8, 4]];
  const SPLINE = (extra = {}) => ({ inicio: [0, 0], trechos: [{ spline: { pontos: PTS, ...extra } }] });

  it('passa exatamente por todos os pontos de passagem, em ordem, e tem segmentosSpline pontos por vão', () => {
    const n = 8;
    const p = contornoPorTrechos(SPLINE(), { segmentosSpline: n });
    expect(p).toHaveLength(1 + PTS.length * n);
    const todos = [[0, 0], ...PTS];
    todos.forEach((q, k) => expect(p[k * n]).toEqual(q));
  });

  it('o número de pontos segue segmentosSpline, do argumento ou do contorno (o do contorno vale)', () => {
    expect(contornoPorTrechos(SPLINE(), { segmentosSpline: 3 })).toHaveLength(1 + PTS.length * 3);
    expect(contornoPorTrechos({ ...SPLINE(), segmentosSpline: 5 }, { segmentosSpline: 3 })).toHaveLength(1 + PTS.length * 5);
    expect(contornoPorTrechos(SPLINE())).toHaveLength(1 + PTS.length * 8);
  });

  it('pontos colineares e igualmente espaçados dão uma reta', () => {
    const p = contornoPorTrechos({ inicio: [0, 0], trechos: [{ spline: [[1, 1], [2, 2], [3, 3]] }, { reto: [3, 0] }] }, { segmentosSpline: 6 });
    for (const [u, v] of p.slice(0, 19)) expect(v).toBeCloseTo(u, 8);
  });

  it('pontos sobre uma circunferência: o desvio do raio cai com o refinamento (h⁴ no miolo, h² nas pontas livres)', () => {
    const sobre = (n) => Array.from({ length: n }, (_, k) => [Math.cos((Math.PI * (k + 1)) / n), Math.sin((Math.PI * (k + 1)) / n)]);
    const erro = (n, soMiolo) => {
      const p = contornoPorTrechos({ inicio: [1, 0], trechos: [{ spline: { pontos: sobre(n), tangente: 'livre' } }] }, { segmentosSpline: 12 });
      const usados = soMiolo ? p.filter(([u, v]) => Math.atan2(v, u) > Math.PI / 4 && Math.atan2(v, u) < (3 * Math.PI) / 4) : p;
      return Math.max(...usados.map(([u, v]) => Math.abs(Math.hypot(u, v) - 1)));
    };
    expect(erro(6, false)).toBeLessThan(0.025);
    expect(erro(12, false)).toBeLessThan(erro(6, false) / 3.5);
    expect(erro(24, false)).toBeLessThan(erro(12, false) / 3.5);
    expect(erro(6, true)).toBeLessThan(0.002);
    expect(erro(12, true)).toBeLessThan(erro(6, true) / 10);
    expect(erro(24, true)).toBeLessThan(erro(12, true) / 10);
  });

  it('a tangente é contínua nos pontos de passagem: a quina entre cordas vizinhas cai na proporção de 1/segmentosSpline', () => {
    const quinas = (n) => {
      const p = contornoPorTrechos(SPLINE(), { segmentosSpline: n });
      return [1, 2, 3, 4].map((k) => Math.abs(virada(p, k * n)));
    };
    const grosso = quinas(100), fino = quinas(400);
    fino.forEach((q, k) => { expect(q).toBeLessThan(grosso[k] / 3.5); expect(q).toBeGreaterThan(grosso[k] / 4.5); });
  });

  it("tangente 'anterior' parte na direção do reto anterior (a quina some com 1/segmentosSpline); 'livre' parte na da primeira corda e fica com a quina", () => {
    const quina = (tangente, n) => {
      const p = contornoPorTrechos({ inicio: [0, 0], trechos: [{ reto: [3, 0] }, { spline: { pontos: [[4, 3], [6, 3]], ...(tangente ? { tangente } : {}) } }] }, { segmentosSpline: n });
      return Math.abs(virada(p, 1));
    };
    expect(quina('anterior', 400)).toBeLessThan(quina('anterior', 100) / 3.5);
    expect(quina('anterior', 400)).toBeLessThan(0.01);
    expect(quina('livre', 400)).toBeGreaterThan(1.2);   // a corda (1, 3) está a 71,6° do reto: quina de 1,25 rad entre o reto e a primeira corda
    expect(quina(null, 100)).toBe(quina('anterior', 100));   // 'anterior' é o padrão quando há trecho anterior
  });

  it('pontos desiguais (dois muito próximos, outro longe) não fazem laço: o contorno continua simples', () => {
    const desigual = { inicio: [0, 0], trechos: [{ spline: [[1, 0.2], [1.05, 0.25], [6, 3], [6.1, 0.1]] }, { reto: [3, -1] }] };
    expect(ehSimples(contornoPorTrechos(desigual, { segmentosSpline: 16 }))).toBe(true);
  });
});

describe('determinismo', () => {
  it('a mesma receita dá os mesmos números, byte a byte, e o hash está fixado', () => {
    const receita = { inicio: [0, 0], trechos: [{ reto: [5, 0] }, { arcoTangente: [7, 2] }, { reto: [7, 6] }, { concordancia: 0.3 }, { reto: [5, 7] }, { spline: [[3, 6.5], [1, 7]] }, { arco: { por: [-1, 4], ate: [0, 2] } }] };
    const a = contornoPorTrechos(receita, { segmentosArco: 6, segmentosSpline: 5 });
    const b = contornoPorTrechos(JSON.parse(JSON.stringify(receita)), { segmentosArco: 6, segmentosSpline: 5 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(sha256Hex(JSON.stringify(contornoPorTrechos(GANCHO, { segmentosArco: 4 })))).toBe(HASH_DO_GANCHO);
    expect(sha256Hex(JSON.stringify(a))).toBe(HASH_DA_RECEITA_MISTA);
  });

  it('a entrada não é alterada', () => {
    const copia = JSON.stringify(GANCHO);
    contornoPorTrechos(GANCHO);
    expect(JSON.stringify(GANCHO)).toBe(copia);
  });

  it('PARAM e expressão chegam por `num`, como nos outros campos dimensionais', () => {
    const num = (x) => (typeof x === 'string' ? { L: 4, R: 1 }[x] : x);
    const p = contornoPorTrechos({ inicio: [0, 0], trechos: [{ reto: ['L', 0] }, { arcoTangente: [5, 'R'] }, { reto: [5, 3] }, { reto: [0, 3] }] }, { num });
    expect(p).toContainEqual([4, 0]);
    expect(p).toContainEqual([5, 1]);
  });
});

/* O hash é o do gancho com segmentosArco 4; se a discretização mudar de propósito, o número muda aqui e na documentação. */
const HASH_DO_GANCHO = '8f8dc3f299750a075fac4037b9c4d2a8a42f6cb5bc012584b8f67040cc8f15f3';
const HASH_DA_RECEITA_MISTA = '4154ff57a12b515bdfe28bc53e33fb3e4caf9528f8e43fb0322fd7b9dce31516';

describe('recusas', () => {
  const um = (trechos, inicio = [0, 0]) => ({ inicio, trechos });

  it('arco por três pontos colineares: campo, os pontos e o que fazer', () => {
    const e = recusa(um([{ arco: { por: [1, 1], ate: [2, 2] } }]));
    expect(e).toBeInstanceOf(ErroDeCurva);
    expect(e.campo).toBe('contorno.trechos[0].arco');
    expect(e.message).toMatch(/colineares/);
    expect(e.message).toMatch(/\[0,0\].*\[1,1\].*\[2,2\]/);
    expect(e.message).toMatch(/\{reto\}/);
  });

  it('arco por três pontos com pontos repetidos', () => {
    expect(recusa(um([{ arco: { por: [0, 0], ate: [2, 2] } }])).campo).toBe('contorno.trechos[0].arco.por');
    expect(recusa(um([{ arco: { por: [1, 1], ate: [1, 1] } }])).campo).toBe('contorno.trechos[0].arco.ate');
    expect(recusa(um([{ arco: { por: [1, 1], ate: [0, 0] } }])).message).toMatch(/volta inteira/);
  });

  it('concordância maior que o trecho: o raio, a medida do reto e o raio máximo', () => {
    // retângulo 4 × 1 com raio 0,6 nos quatro cantos: cada lado de 1 cede 0,6 + 0,6
    const e = recusa({ inicio: [2, 0.5], trechos: [{ concordancia: 0.6 }, { reto: [-2, 0.5] }, { concordancia: 0.6 }, { reto: [-2, -0.5] }, { concordancia: 0.6 }, { reto: [2, -0.5] }, { concordancia: 0.6 }] });
    expect(e.campo).toBe('contorno.trechos[0].concordancia');
    expect(e.message).toMatch(/raio 0\.6 pede 0\.6/);
    expect(e.message).toMatch(/mede 1 e já cede 0\.6 a outra/);
    expect(e.message).toMatch(/raio máximo .* 0\.4\b/);
    expect(recusa({ inicio: [2, 0.5], trechos: [{ concordancia: 0.5 }, { reto: [-2, 0.5] }, { concordancia: 0.5 }, { reto: [-2, -0.5] }, { concordancia: 0.5 }, { reto: [2, -0.5] }, { concordancia: 0.5 }] })).toBeNull();   // 0,5 + 0,5 cabe exato
  });

  it('duas concordâncias que dividem o mesmo reto e não cabem', () => {
    const e = recusa({ inicio: [0, 0], trechos: [{ concordancia: 1.5 }, { reto: [2, 0] }, { concordancia: 1.5 }, { reto: [2, 5] }, { reto: [0, 5] }] });
    expect(e.campo).toBe('contorno.trechos[0].concordancia');
    expect(e.message).toMatch(/já cede 1\.5 a outra concordância/);
  });

  it('concordância entre reto e arco, retos colineares, reto que volta e raio inválido', () => {
    expect(recusa(um([{ reto: [4, 0] }, { concordancia: 0.5 }, { arco: { centro: [4, 2], angulo: 90 } }, { reto: [0, 4] }])).message).toMatch(/liga dois retos.*arco/);
    expect(recusa(um([{ reto: [2, 0] }, { concordancia: 0.5 }, { reto: [4, 0] }, { reto: [4, 3] }])).message).toMatch(/mesma direção/);
    expect(recusa(um([{ reto: [4, 0] }, { concordancia: 0.5 }, { reto: [1, 0] }, { reto: [1, 3] }])).message).toMatch(/volta sobre/);
    const r = recusa(um([{ reto: [4, 0] }, { concordancia: 0 }, { reto: [4, 3] }]));
    expect(r.campo).toBe('contorno.trechos[1].concordancia');
    expect(r.message).toMatch(/maior que zero \(veio 0\)/);
    expect(recusa(um([{ concordancia: 1 }, { concordancia: 2 }, { reto: [4, 0] }, { reto: [4, 3] }])).message).toMatch(/já há uma concordância/);
  });

  it('tangente impossível: ponto sobre a reta da tangente, sem trecho anterior, e spline que não tem a que ser tangente', () => {
    const e = recusa(um([{ reto: [2, 0] }, { arcoTangente: [5, 0] }, { reto: [5, 3] }]));
    expect(e.campo).toBe('contorno.trechos[1].arcoTangente');
    expect(e.message).toMatch(/tangente impossível/);
    expect(e.message).toMatch(/\[5,0\]/);
    expect(recusa(um([{ arcoTangente: [2, 2] }, { reto: [0, 3] }])).message).toMatch(/primeiro trecho/);
    const s = recusa(um([{ spline: { pontos: [[1, 1], [2, 0]], tangente: 'anterior' } }]));
    expect(s.campo).toBe('contorno.trechos[0].spline.tangente');
  });

  it('arco por centro e ângulo: ângulo zero, volta inteira, centro no ponto atual', () => {
    expect(recusa(um([{ arco: { centro: [1, 1], angulo: 0 } }])).message).toMatch(/maior que 0 e menor que 360 graus \(veio 0\)/);
    expect(recusa(um([{ arco: { centro: [1, 1], angulo: 360 } }])).campo).toBe('contorno.trechos[0].arco.angulo');
    expect(recusa(um([{ arco: { centro: [0, 0], angulo: 90 } }])).campo).toBe('contorno.trechos[0].arco.centro');
    expect(recusa(um([{ arco: { centro: [1, 1] } }])).message).toMatch(/precisa de `centro` e `angulo`/);
    expect(recusa(um([{ arco: { centro: [1, 1], angulo: 90, por: [0, 0] } }])).message).toMatch(/um dos dois/);
  });

  it('spline com um ponto só, ponto repetido, tangente fora da lista', () => {
    expect(recusa(um([{ spline: [[1, 1]] }])).message).toMatch(/2 pontos.*ou mais/);
    expect(recusa(um([{ spline: [[1, 1], [1, 1], [3, 0]] }])).message).toMatch(/pontos 0 e 1 coincidem/);
    expect(recusa(um([{ spline: { pontos: [[1, 1], [3, 0]], tangente: 'reta' } }])).campo).toBe('contorno.trechos[0].spline.tangente');
  });

  it('trecho desconhecido, chave a mais, ponto malformado, número inválido e segmentos inválidos', () => {
    const t = recusa(um([{ curva: [1, 1] }]));
    expect(t.campo).toBe('contorno.trechos[0]');
    expect(t.message).toMatch(/aceito, com uma chave só: reto, arco, arcoTangente, concordancia, spline/);
    expect(recusa(um([{ reto: [1, 1], arco: {} }])).message).toMatch(/uma chave só/);
    expect(recusa(um([{ reto: [1] }])).message).toMatch(/precisa ser \[u, v\] \(veio \[1\]\)/);
    expect(recusa(um([{ reto: [1, Infinity] }, { reto: [0, 1] }])).campo).toBe('contorno.trechos[0].reto[1]');
    expect(recusa({ inicio: [0, 0], trechos: [{ reto: [1, 0] }], largura: 2 }).message).toMatch(/campo desconhecido; aceito: inicio, trechos, segmentosSpline/);
    expect(recusa({ trechos: [{ reto: [1, 0] }] }).campo).toBe('contorno.inicio');
    expect(recusa({ inicio: [0, 0], trechos: [] }).campo).toBe('contorno.trechos');
    expect(recusa(um([{ reto: [1, 0] }]), { segmentosArco: 0 }).campo).toBe('contorno.segmentosArco');
    expect(recusa({ ...um([{ reto: [1, 0] }]), segmentosSpline: 1.5 }).campo).toBe('contorno.segmentosSpline');
    expect(recusa(um([{ reto: [0, 0] }, { reto: [1, 0] }])).message).toMatch(/comprimento zero/);
  });

  it('em montarPerfil a recusa vira ErroDePerfil com o campo do perfil, e um contorno que se cruza é recusado como polígono não simples', () => {
    let e;
    try { montarPerfil({ externo: { contorno: um([{ arco: { por: [1, 1], ate: [2, 2] } }]) } }); } catch (x) { e = x; }
    expect(e).toBeInstanceOf(ErroDePerfil);
    expect(e.campo).toBe('externo.contorno.trechos[0].arco');
    let f;
    try { montarPerfil({ externo: { retangulo: { largura: 10, profundidade: 10 } }, furos: [{ contorno: um([{ arco: { por: [1, 1], ate: [2, 2] } }]) }] }); } catch (x) { f = x; }
    expect(f.campo).toBe('furos[0].contorno.trechos[0].arco');
    let g;
    try { montarPerfil({ externo: { contorno: { inicio: [0, 0], trechos: [{ reto: [4, 4] }, { reto: [4, 0] }, { reto: [0, 4] }] } } }); } catch (x) { g = x; }
    expect(g.message).toMatch(/não é um polígono simples/);
    expect(() => montarPerfil({ externo: { contorno: GANCHO }, segmentosSpline: 0 })).toThrow(/segmentosSpline: precisa ser um inteiro >= 1/);
  });
});

describe('ponta a ponta: a op extrusao com o contorno por trechos', () => {
  const gritos = (m) => m.orfaos.map((o) => `${o.ref}: ${o.motivo}`).join(' | ');
  const volume = (m) => {
    let v = 0;
    for (const f of m.F.values()) {
      const P = f.vs.map((id) => m.V.get(id));
      for (let k = 1; k < P.length - 1; k++) {
        const [a, b, c] = [P[0], P[k], P[k + 1]];
        v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      }
    }
    return v;
  };
  const irregulares = (m) => {
    const uso = new Map();
    for (const f of m.F.values()) for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k], b = f.vs[(k + 1) % f.vs.length];
      const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
      uso.set(chave, (uso.get(chave) ?? 0) + 1);
    }
    return [...uso.values()].filter((n) => n !== 2).length;
  };
  const hash = (m) => sha256Hex(JSON.stringify([[...m.V.entries()], [...m.F.entries()].map(([id, f]) => [id, f.vs])]));

  it('o gancho extrudado é um sólido fechado de volume área × altura, com as normais para fora', () => {
    const n = 6;
    const m = nucleo([['extrusao', { origemId: 1, perfil: { contorno: GANCHO }, segmentosArco: n, altura: 0.5 }]], {});
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
    expect(volume(m)).toBeCloseTo(areaDoGancho(n) * 0.5, 6);
    expect(m.V.size).toBe(2 * (8 + 2 * (n - 1)));
  });

  it('com furo também escrito por trechos (um oblongo de dois arcos de meia volta), a área é a do gancho menos a do furo', () => {
    const n = 4;
    const furo = { contorno: { inicio: [1, 0.3], trechos: [{ reto: [2.5, 0.3] }, { arco: { centro: [2.5, 0.5], angulo: 180 } }, { reto: [1, 0.7] }, { arco: { centro: [1, 0.5], angulo: 180 } }] } };
    // 1,5 de reto por 0,4 de largura, com duas pontas de meia volta de raio 0,2 (juntas, um polígono de 4n lados)
    const m = nucleo([['extrusao', { origemId: 1, perfil: { contorno: GANCHO }, furos: [furo], segmentosArco: n, altura: 0.5 }]], {});
    expect(gritos(m)).toBe('');
    expect(irregulares(m)).toBe(0);
    const areaFuro = areaDoContorno(contornoPorTrechos(furo.contorno, { segmentosArco: n }));
    expect(areaFuro).toBeCloseTo(1.5 * 0.4 + 0.5 * 0.04 * 4 * n * Math.sin(Math.PI / (2 * n)), 7);
    expect(volume(m)).toBeCloseTo((areaDoGancho(n) - areaFuro) * 0.5, 6);
  });

  it('segmentosSpline e PARAM chegam pela op; o número de vértices segue a discretização', () => {
    const passos = (s) => [['extrusao', { origemId: 1, perfil: { contorno: { inicio: [0, 0], trechos: [{ reto: ['L', 0] }, { spline: [[5, 1], [6, 3], [4, 4]] }] } }, segmentosSpline: s, altura: 1 }]];
    const a = nucleo(passos(3), { L: 4 }), b = nucleo(passos(7), { L: 4 });
    expect(gritos(a)).toBe('');
    expect(gritos(b)).toBe('');
    expect(a.V.size).toBe(2 * (2 + 3 * 3));    // (0,0) (4,0) e 3 vãos de 3 pontos
    expect(b.V.size).toBe(2 * (2 + 3 * 7));
    expect(irregulares(b)).toBe(0);
    expect(volume(b)).toBeGreaterThan(0);
  });

  it('a mesma receita dá a mesma malha, byte a byte', () => {
    const passos = [['extrusao', { origemId: 1, perfil: { contorno: GANCHO }, segmentosArco: 5, altura: 0.5 }]];
    expect(hash(nucleo(passos, {}))).toBe(hash(nucleo(JSON.parse(JSON.stringify(passos)), {})));
  });

  it('a recusa da curva sai como órfão da op, com o campo e o valor', () => {
    const m = nucleo([['extrusao', { origemId: 1, perfil: { contorno: { inicio: [0, 0], trechos: [{ arco: { por: [1, 1], ate: [2, 2] } }] } }, altura: 1 }]], {});
    expect(m.orfaos[0].ref).toBe('perfil.contorno.trechos[0].arco');
    expect(m.orfaos[0].motivo).toMatch(/colineares/);
    expect(m.V.size).toBe(0);
  });
});
