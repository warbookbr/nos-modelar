/* As linhas do desenho da blocagem, uma classe de defeito por teste. Cada caso é a menor malha que reproduz o defeito (a medida do desenho,
   `tools/modelar/medida-do-desenho.mjs`, achou todos nas peças de família do conjunto de calibração do crítico), e a prova é a camada: o
   traço que cobre, ou não, o segmento 3D do caso, projetado na tela pela mesma conta do desenho. Uma peça de família chega com um volume por
   parte, e o desenho decide a aresta olhando todos juntos e o que se vê de cada lado dela, não a malha de cada parte. */
import earcut from 'earcut';
import { describe, expect, it } from 'vitest';
import { VISTAS } from '../src/index.js';
import { desenharBlocagem, geometria } from '../src/desenho-da-blocagem.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* A malha a montar: vértices (o mesmo índice para o mesmo ponto, se `soldada`) e triângulos de normal para o lado de `fora`. */
class Malha {
  constructor(soldada = true) { this.vertices = []; this.faces = []; this.soldada = soldada; this.indice = new Map(); }

  v(p) {
    if (!this.soldada) { this.vertices.push(p); return this.vertices.length - 1; }
    const k = p.map((c) => Math.round(c * 1e6)).join(',');
    if (!this.indice.has(k)) { this.indice.set(k, this.vertices.length); this.vertices.push(p); }
    return this.indice.get(k);
  }

  tri(a, b, c, volume, fora) {
    const t = dot(cruz(sub(b, a), sub(c, a)), fora) >= 0 ? [a, b, c] : [a, c, b];
    this.faces.push({ vertices: t.map((p) => this.v(p)), volume });
  }

  plano(anel, furos, volume, fora) {
    const eixo = [0, 1, 2].sort((i, j) => Math.abs(fora[j]) - Math.abs(fora[i]))[0];
    const [i, j] = [0, 1, 2].filter((e) => e !== eixo);
    const todos = [...anel, ...furos.flat()];
    const buracos = []; let n = anel.length;
    for (const f of furos) { buracos.push(n); n += f.length; }
    const idx = earcut(todos.flatMap((p) => [p[i], p[j]]), buracos, 2);
    for (let k = 0; k < idx.length; k += 3) this.tri(todos[idx[k]], todos[idx[k + 1]], todos[idx[k + 2]], volume, fora);
  }

  caixa([x0, y0, z0], [x1, y1, z1], volume) {
    const p = (x, y, z) => [x ? x1 : x0, y ? y1 : y0, z ? z1 : z0];
    for (const [anel, fora] of [
      [[p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)], [-1, 0, 0]], [[p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)], [1, 0, 0]],
      [[p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], [0, -1, 0]], [[p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)], [0, 1, 0]],
      [[p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)], [0, 0, -1]], [[p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)], [0, 0, 1]],
    ]) this.plano(anel, [], volume, fora);
  }
}

const cores = ['#c9d6e8', '#e8d2c9', '#cfe8c9'];
const paineis = (malha, ids) => [{ titulo: 'T', nota: '', ocultar: ['titulo', 'nota'], malha: { vertices: malha.vertices, faces: malha.faces }, volumes: ids.map((id, i) => ({ id, cor: cores[i % 3] })) }];

/* Quanto do segmento 3D `A`-`B` os traços da camada cobrem (px do quadro), com a folga `tol` (px) ao lado dele. */
function cobertura(r, vista, A, B, tol = 0.6) {
  const V = VISTAS[vista];
  const { tela } = geometria(r.paineis[0], 0, r.escala);
  const a = tela(V.p(A)); const b = tela(V.p(B));
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const c = Math.hypot(dx, dy);
  const u = [dx / c, dy / c];
  let total = 0;
  for (const f of r.camada.formas) {
    for (const t of f.tracos) {
      for (let i = 0; i + 1 < t.length; i++) {
        const p = [t[i][0] - a[0], t[i][1] - a[1]]; const q = [t[i + 1][0] - a[0], t[i + 1][1] - a[1]];
        const lado = (w) => Math.abs(w[0] * u[1] - w[1] * u[0]);
        if (lado(p) > tol || lado(q) > tol) continue;
        const s0 = Math.max(0, Math.min(c, p[0] * u[0] + p[1] * u[1])); const s1 = Math.max(0, Math.min(c, q[0] * u[0] + q[1] * u[1]));
        total += Math.abs(s1 - s0);
      }
    }
  }
  return { coberto: total, comprimento: c };
}
const cobre = (r, vista, A, B) => { const { coberto, comprimento } = cobertura(r, vista, A, B); return coberto / comprimento; };

const desenho = (malha, ids, vista) => desenharBlocagem({ vista, paineis: paineis(malha, ids) }, { camada: true });

describe('o vinco e o empate de 30 graus', () => {
  /* a placa de 70 x 56 x 14 com um furo de `lados` lados em z; as arestas da parede do furo, paralelas ao eixo, ligam duas facetas */
  function placaComFuro(lados) {
    const m = new Malha();
    const [L, A, E] = [70, 56, 14];
    const furo = (z) => Array.from({ length: lados }, (_, k) => [35 + 10 * Math.cos((2 * Math.PI * k) / lados), 28 + 10 * Math.sin((2 * Math.PI * k) / lados), z]);
    m.plano([[0, 0, 0], [L, 0, 0], [L, A, 0], [0, A, 0]], [furo(0)], 'p', [0, 0, -1]);
    m.plano([[0, 0, E], [L, 0, E], [L, A, E], [0, A, E]], [furo(E)], 'p', [0, 0, 1]);
    for (const [anel, fora] of [[[[0, 0, 0], [L, 0, 0], [L, 0, E], [0, 0, E]], [0, -1, 0]], [[[0, A, 0], [L, A, 0], [L, A, E], [0, A, E]], [0, 1, 0]], [[[0, 0, 0], [0, A, 0], [0, A, E], [0, 0, E]], [-1, 0, 0]], [[[L, 0, 0], [L, A, 0], [L, A, E], [L, 0, E]], [1, 0, 0]]]) m.plano(anel, [], 'p', fora);
    for (let k = 0; k < lados; k++) {
      const a = furo(0)[k]; const b = furo(0)[(k + 1) % lados];
      const dentro = [35 - (a[0] + b[0]) / 2, 28 - (a[1] + b[1]) / 2, 0];
      m.tri(a, b, [a[0], a[1], E], 'p', dentro); m.tri(b, [b[0], b[1], E], [a[0], a[1], E], 'p', dentro);
    }
    return { m, furo };
  }

  it('o furo de doze lados (30 graus entre as facetas, nem mais nem menos) não leva traço nas arestas da parede que não são silhueta', () => {
    const { m, furo } = placaComFuro(12);
    const olho = [1, 1, 1];
    const r = desenho(m, ['p'], 'isometrica');
    const E = 14;
    let conferidas = 0;
    for (let k = 0; k < 12; k++) {
      const a = furo(0)[k]; const b = furo(0)[(k + 1) % 12]; const z = furo(0)[(k + 11) % 12];
      /* a normal de cada faceta vizinha (para dentro do furo): a aresta é silhueta se uma olha para o observador e a outra não */
      const normal = (p, q) => { const d = sub(q, p); const n = [d[1], -d[0], 0]; const c = [35 - (p[0] + q[0]) / 2, 28 - (p[1] + q[1]) / 2, 0]; return dot(n, c) > 0 ? n : n.map((x) => -x); };
      const depois = dot(normal(a, b), olho) > 1e-9; const antes = dot(normal(z, a), olho) > 1e-9;
      if (depois !== antes) continue;
      conferidas++;
      expect(cobre(r, 'isometrica', [a[0], a[1], 0], [a[0], a[1], E]), `aresta ${k} da parede`).toBeLessThan(0.05);
    }
    expect(conferidas).toBeGreaterThanOrEqual(6);
  });

  it('o furo de vinte e quatro lados também não, e o de seis (60 graus) leva uma por faceta que vê', () => {
    const { m: vinte, furo: f24 } = placaComFuro(24);
    const r24 = desenho(vinte, ['p'], 'isometrica');
    expect(cobre(r24, 'isometrica', [f24(0)[3][0], f24(0)[3][1], 0], [f24(0)[3][0], f24(0)[3][1], 14])).toBeLessThan(0.05);
    const { m: seis, furo: f6 } = placaComFuro(6);
    const r6 = desenho(seis, ['p'], 'isometrica');
    /* seis facetas: a aresta entre as duas que olham para o observador é vinco de 60 graus e sai */
    let tracadas = 0;
    for (let k = 0; k < 6; k++) tracadas += cobre(r6, 'isometrica', [f6(0)[k][0], f6(0)[k][1], 0], [f6(0)[k][0], f6(0)[k][1], 14]) > 0.2 ? 1 : 0;
    expect(tracadas).toBeGreaterThanOrEqual(2);
  });
});

describe('a divisão entre volumes não é aresta', () => {
  it('duas caixas encostadas, com as faces de cima no mesmo plano, não levam traço na emenda (as paredes que se tocam são interiores)', () => {
    for (const soldada of [true, false]) {
      const m = new Malha(soldada);
      m.caixa([0, 0, 0], [30, 20, 20], 'a'); m.caixa([30, 0, 0], [60, 20, 20], 'b');
      /* a emenda em cada vista: a de cima, ao longo de z, onde a vista a mostra com comprimento, e a da frente, ao longo de y */
      for (const [vista, de, ate] of [['isometrica', [30, 20, 0], [30, 20, 20]], ['superior', [30, 20, 0], [30, 20, 20]], ['frontal', [30, 0, 20], [30, 20, 20]], ['isometrica', [30, 0, 20], [30, 20, 20]]]) {
        const r = desenho(m, ['a', 'b'], vista);
        expect(cobre(r, vista, de, ate), `${vista}, ${soldada ? 'vértices soldados' : 'vértices de cada caixa'}, emenda ${de}-${ate}`).toBeLessThan(0.05);
      }
      /* e a borda de verdade fica: a aresta de cima da frente de a, que não é emenda */
      expect(cobre(desenho(m, ['a', 'b'], 'frontal'), 'frontal', [0, 20, 20], [30, 20, 20])).toBeGreaterThan(0.9);
    }
  });

  it('a emenda que só vale em parte da aresta (a vizinha tem a metade da profundidade) é cortada onde a vizinha acaba', () => {
    const m = new Malha();
    m.caixa([0, 0, 0], [30, 20, 20], 'a'); m.caixa([30, 0, 0], [60, 20, 10], 'b');
    const r = desenho(m, ['a', 'b'], 'superior');
    /* de z = 0 a 10 as duas faces de cima são uma só, e de z = 10 a 20 a aresta de a é o contorno */
    expect(cobre(r, 'superior', [30, 20, 0], [30, 20, 9.5])).toBeLessThan(0.05);
    expect(cobre(r, 'superior', [30, 20, 10.5], [30, 20, 20])).toBeGreaterThan(0.9);
  });

  it('o volume embutido cuja face fica no plano da face do vizinho não leva o contorno dela (as paredes dele estão dentro do vizinho)', () => {
    /* o caso do aro dentro do pneu maciço: a face de frente do volume pequeno é a mesma superfície que a do grande, e o contorno e as paredes
       dele ficam atrás dela */
    const m = new Malha();
    m.caixa([0, 0, 0], [60, 60, 60], 'grande'); m.caixa([20, 20, 30], [40, 40, 60], 'embutido');
    for (const vista of ['isometrica', 'frontal']) {
      const r = desenho(m, ['grande', 'embutido'], vista);
      for (const [de, ate] of [[[20, 20, 60], [40, 20, 60]], [[40, 20, 60], [40, 40, 60]], [[20, 40, 60], [40, 40, 60]]]) {
        const { comprimento } = cobertura(r, vista, de, ate);
        if (comprimento < 2) continue;
        expect(cobre(r, vista, de, ate), `${vista}, ${de}-${ate}`).toBeLessThan(0.05);
      }
    }
  });
});

describe('o que um volume esconde do outro', () => {
  it('a aresta atrás da face de outro volume não é traçada, e o trecho que a face deixa à vista é', () => {
    /* a (z de 0 a 20) e b (z de 0 a 10) lado a lado; a aresta de baixo da parede de a em x = 30 passa atrás de b nos primeiros dez milímetros */
    const m = new Malha();
    m.caixa([0, 0, 0], [30, 20, 20], 'a'); m.caixa([30, 0, 0], [60, 20, 10], 'b');
    const r = desenho(m, ['a', 'b'], 'isometrica');
    expect(cobre(r, 'isometrica', [30, 0, 1], [30, 0, 9]), 'atrás de b').toBeLessThan(0.05);
    expect(cobre(r, 'isometrica', [30, 0, 11], [30, 0, 19]), 'à vista').toBeGreaterThan(0.9);
  });

  it('a linha de uma peça atrás da própria chapa some até a borda da chapa, sem o toco que a divisão em pedaços deixava', () => {
    /* uma caixa baixa na frente de uma alta: a aresta vertical da alta que fica atrás da baixa acaba exatamente na quina da baixa */
    const m = new Malha();
    m.caixa([0, 0, 0], [20, 40, 20], 'alta'); m.caixa([0, 0, 20], [20, 15, 40], 'baixa');
    const r = desenho(m, ['alta', 'baixa'], 'frontal');
    /* na vista de frente a aresta direita da alta, de y = 0 a 40, é visível só acima da quina da baixa (y = 15) */
    const { coberto } = cobertura(r, 'frontal', [20, 15, 20], [20, 40, 20]);
    expect(coberto).toBeGreaterThan(0);
    expect(cobre(r, 'frontal', [20, 2, 20], [20, 14, 20]), 'a parte de baixo é a borda da baixa, que a alta repete').toBeGreaterThan(0.9);
  });
});

describe('onde um volume atravessa o outro', () => {
  it('a barra que passa pelo montante leva traço onde a face de cima dela entra nas faces dele', () => {
    /* a barra (x de -30 a 30, y e z de -5 a 5) atravessa o montante (x de -5 a 5, y de -30 a 30, z de -15 a 15): a face de cima da barra
       é um retângulo só, sem vértice em x = 5, e a aresta em que ela encontra a face do montante não existe em nenhuma das malhas */
    const m = new Malha();
    m.caixa([-30, -5, -5], [30, 5, 5], 'barra'); m.caixa([-5, -30, -15], [5, 30, 15], 'montante');
    const r = desenho(m, ['barra', 'montante'], 'isometrica');
    expect(cobre(r, 'isometrica', [5, 5, 0], [5, 5, 5])).toBeGreaterThan(0.9);
    expect(cobre(r, 'isometrica', [5, 5, 0], [5, 5, 4])).toBeGreaterThan(0.9);
  });

  it('o pino que atravessa a chapa leva o contorno da entrada na face dela', () => {
    const m = new Malha();
    m.caixa([-40, -40, 0], [40, 40, 6], 'chapa');
    m.caixa([-8, -8, -20], [8, 8, 26], 'pino');
    const r = desenho(m, ['chapa', 'pino'], 'isometrica');
    /* a face da chapa em z = 6 é um quadrado sem vértice no pino, e o pino a cruza em x = 8 (a parede que vê o observador) e em y = 8 */
    expect(cobre(r, 'isometrica', [8, -8, 6], [8, 8, 6])).toBeGreaterThan(0.9);
    expect(cobre(r, 'isometrica', [-8, 8, 6], [8, 8, 6])).toBeGreaterThan(0.9);
  });

  it('as superfícies que passam de raspão (menos de 30 graus entre elas) não levam traço', () => {
    /* uma cunha de 10 graus pousada na chapa: a face dela cruza a face de cima da chapa em x = 0 com 10 graus, e isso é suave */
    const m = new Malha();
    m.caixa([-40, -40, 0], [40, 40, 6], 'chapa');
    const t = Math.tan((10 * Math.PI) / 180);
    const cunha = [[-30, -10, 3], [30, -10, 3], [30, 10, 3], [-30, 10, 3], [-30, -10, 3 + 30 * t - 3 + 3], [30, -10, 3 - 30 * t + 3], [30, 10, 3 - 30 * t + 3], [-30, 10, 3 + 30 * t - 3 + 3]];
    expect(cunha.length).toBe(8);
    const topo = [[-30, -10, 3 + 30 * t + 3], [30, -10, 3 - 30 * t + 3], [30, 10, 3 - 30 * t + 3], [-30, 10, 3 + 30 * t + 3]];
    const base = [[-30, -10, 3], [30, -10, 3], [30, 10, 3], [-30, 10, 3]];
    m.plano(topo, [], 'cunha', [0, 0, 1]); m.plano(base, [], 'cunha', [0, 0, -1]);
    for (let k = 0; k < 4; k++) m.plano([base[k], base[(k + 1) % 4], topo[(k + 1) % 4], topo[k]], [], 'cunha', sub(base[k], [0, 0, 0]).map((c, e) => (e === 2 ? 0 : c)).map((c, e) => (k % 2 === 0 ? (e === 1 ? (k === 0 ? -1 : 1) : 0) : (e === 0 ? (k === 1 ? 1 : -1) : 0))));
    const r = desenho(m, ['chapa', 'cunha'], 'isometrica');
    expect(cobre(r, 'isometrica', [0, -10, 6], [0, 10, 6])).toBeLessThan(0.1);
  });
});

describe('o traço visível', () => {
  it('a forma opaca sai com `visiveis` e sem perfil, e a translúcida segue com o perfil', () => {
    const m = new Malha();
    m.caixa([0, 0, 0], [30, 20, 20], 'a'); m.caixa([40, 0, 0], [70, 20, 20], 'b');
    const entrada = { vista: 'isometrica', paineis: [{ titulo: 'T', nota: '', ocultar: ['titulo', 'nota'], malha: { vertices: m.vertices, faces: m.faces }, volumes: [{ id: 'a', cor: cores[0] }, { id: 'b', cor: cores[1], opacidade: 0.5 }] }] };
    const r = desenharBlocagem(entrada, { camada: true });
    const [fa, fb] = r.camada.formas;
    expect(fa.visiveis).toBe(true);
    expect(fa.inclinacoes).toBeUndefined();
    expect(fb.visiveis).toBeUndefined();
    expect(Array.isArray(fb.inclinacoes)).toBe(true);
  });
});
