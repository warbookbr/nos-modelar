/* Testes do Catmull-Clark da prova P2. Os casos foram escolhidos para DENUNCIAR
   implementação errada, não para confirmar a certa: contagem exata, convergência,
   vinco que resiste ao nível declarado, borda que não encolhe e determinismo. */
import { describe, expect, it } from 'vitest';
import {
  subdividir, subdividirUmNivel, malhaCanonica, pontosExtraordinarios, topologia, rastrearLoop,
} from './subdividir.mjs';

const cubo = () => ({
  V: new Map([
    [0, [-1, -1, -1]], [1, [1, -1, -1]], [2, [1, 1, -1]], [3, [-1, 1, -1]],
    [4, [-1, -1, 1]], [5, [1, -1, 1]], [6, [1, 1, 1]], [7, [-1, 1, 1]],
  ]),
  F: new Map([[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4],
    [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
    .map((vs, i) => [i, { id: i, vs }])),
});

/* Telhado: dois quads compartilhando uma aresta, dobrados. O teste de vinco vive
   aqui, porque a aresta compartilhada é a única dobra da forma. */
const telhado = (vincos = new Map()) => ({
  V: new Map([
    [0, [-1, 0, -1]], [1, [0, 1, -1]], [2, [1, 0, -1]],
    [3, [-1, 0, 1]], [4, [0, 1, 1]], [5, [1, 0, 1]],
  ]),
  F: new Map([
    [0, { id: 0, vs: [0, 1, 4, 3] }],
    [1, { id: 1, vs: [1, 2, 5, 4] }],
  ]),
  vincos,
});
const cume = (m) => Math.max(...[...m.V.values()].map((p) => p[1]));

describe('contagem e convergência', () => {
  it('produz as contagens exatas de Catmull-Clark em malha de quads', () => {
    for (const [nivel, v, f] of [[1, 26, 24], [2, 98, 96], [3, 386, 384]]) {
      const m = subdividir(cubo(), nivel);
      expect(m.V.size).toBe(v);
      expect(m.F.size).toBe(f);
    }
  });

  it('faz o cubo convergir para um limite estável', () => {
    /* O limite do Catmull-Clark de um cubo NÃO é uma esfera: é um cubo
       arredondado, e a variação de raio converge para um valor positivo em vez
       de ir a zero. A primeira versão deste teste exigia estreitamento
       indefinido e reprovou no nível 4 — a asserção estava errada, não o código.
       O que vale exigir é convergência: o raio para de se mexer. */
    const raio = (n) => {
      const r = [...subdividir(cubo(), n).V.values()].map((p) => Math.hypot(...p));
      return { min: Math.min(...r), max: Math.max(...r) };
    };
    const r = [1, 2, 3, 4, 5, 6].map(raio);

    /* colapso rápido nos primeiros níveis */
    expect(r[2].max - r[2].min).toBeLessThan((r[0].max - r[0].min) / 3);

    /* e depois estabilidade: o mínimo move menos a cada nível */
    const passos = [1, 2, 3, 4, 5].map((i) => Math.abs(r[i].min - r[i - 1].min));
    for (let i = 1; i < passos.length; i += 1) expect(passos[i]).toBeLessThan(passos[i - 1]);
    expect(passos[passos.length - 1]).toBeLessThan(0.001);
  });

  it('não cria ponto extraordinário novo: os oito cantos do cubo são os mesmos', () => {
    for (const nivel of [1, 2, 3]) {
      const pts = pontosExtraordinarios(subdividir(cubo(), nivel));
      expect(pts).toHaveLength(8);
      expect(pts.every((p) => p.valencia === 3)).toBe(true);
    }
  });

  it('só emite quadriláteros, qualquer que seja o nível', () => {
    for (const f of subdividir(cubo(), 2).F.values()) expect(f.vs).toHaveLength(4);
  });
});

describe('vinco semi-agudo', () => {
  const arestaDoCume = '1|4';

  it('sem vinco, o cume do telhado desce', () => {
    expect(cume(subdividirUmNivel(telhado()))).toBeLessThan(1);
  });

  it('com nitidez 2, o cume resiste até o nível 2 e cede no 3', () => {
    const comVinco = (n) => subdividir(telhado(new Map([[arestaDoCume, 2]])), n);
    expect(cume(comVinco(1))).toBeCloseTo(1, 6);
    expect(cume(comVinco(2))).toBeCloseTo(1, 6);
    expect(cume(comVinco(3))).toBeLessThan(1);
  });

  it('nitidez é inteira: fracionária arredonda para cima', () => {
    /* A mistura fracionária foi REMOVIDA por defeito medido: numa crista
       perfeitamente reta de 200 mm, o nível 2 alternava entre 175 e 195 mm,
       porque o ponto de aresta e o ponto de vértice recebiam misturas que não se
       correspondiam. O contrato de P1 lê nitidez como "por quantos níveis a
       aresta permanece aguda", e agora o código lê igual. */
    expect(cume(subdividirUmNivel(telhado(new Map([[arestaDoCume, 0.5]]))))).toBeCloseTo(1, 9);
    expect(cume(subdividirUmNivel(telhado()))).toBeLessThan(1);
  });

  it('crista reta continua reta em todos os níveis', () => {
    /* O teste que teria pego o defeito acima. Uma crista sem curvatura não pode
       ganhar ondulação nenhuma da subdivisão. */
    const V = new Map(); const F = new Map(); const g = [];
    let n = 0;
    for (let i = 0; i < 9; i += 1) {
      const linha = [];
      for (let j = 0; j < 3; j += 1) { V.set(n, [(j - 1) * 100, j === 1 ? 200 : 0, i * 100]); linha.push(n); n += 1; }
      g.push(linha);
    }
    let f = 0;
    for (let i = 0; i < 8; i += 1) for (let j = 0; j < 2; j += 1) { F.set(f, { id: f, vs: [g[i][j], g[i][j + 1], g[i + 1][j + 1], g[i + 1][j]] }); f += 1; }
    const crista = g.map((l) => l[1]);
    const ch = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const vincos = new Map();
    for (let i = 0; i < crista.length - 1; i += 1) vincos.set(ch(crista[i], crista[i + 1]), 2);
    for (const nivel of [1, 2, 3]) {
      const { pontos } = rastrearLoop({ V, F, vincos }, crista, nivel);
      for (let i = 1; i < pontos.length - 1; i += 1) {
        const esperado = [0, 1, 2].map((k) => (pontos[i - 1][k] + pontos[i + 1][k]) / 2);
        const d = Math.hypot(pontos[i][0] - esperado[0], pontos[i][1] - esperado[1], pontos[i][2] - esperado[2]);
        expect(d).toBeLessThan(1e-9);
      }
    }
  });

  it('a nitidez decrementa de um por nível', () => {
    const m1 = subdividirUmNivel(telhado(new Map([[arestaDoCume, 2]])));
    expect([...m1.vincos.values()].every((s) => s === 1)).toBe(true);
    const m2 = subdividirUmNivel(m1);
    expect(m2.vincos.size).toBe(0);
  });
});

describe('borda', () => {
  it('aresta com uma face só é sempre aguda, e a superfície aberta não encolhe', () => {
    const plano = {
      V: new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 1, 0]]]),
      F: new Map([[0, { id: 0, vs: [0, 1, 2, 3] }]]),
    };
    const m = subdividir(plano, 2);
    const xs = [...m.V.values()].map((p) => p[0]);
    const ys = [...m.V.values()].map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(0, 9);
    expect(Math.max(...xs)).toBeCloseTo(1, 9);
    expect(Math.min(...ys)).toBeCloseTo(0, 9);
    expect(Math.max(...ys)).toBeCloseTo(1, 9);
  });

  it('congela o canto de retalho, mas deixa a borda curva relaxar', () => {
    /* Canto de retalho — vértice de valência 2 — fica fixo, senão toda abertura
       perde a esquina a cada nível. Já um vértice no meio de uma borda curva,
       como o contorno de um arco de roda, segue a regra de spline e suaviza. */
    const tira = {
      V: new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [2, 0, 0]],
        [3, [0, 1, 0]], [4, [1, 1, 0]], [5, [2, 1, 0]]]),
      F: new Map([
        [0, { id: 0, vs: [0, 1, 4, 3] }],
        [1, { id: 1, vs: [1, 2, 5, 4] }],
      ]),
    };
    /* Levanta o vértice do meio da borda: ele deve descer ao subdividir. */
    tira.V.set(1, [1, 0, 1]);
    const m = subdividirUmNivel(tira);
    const alturas = [...m.V.values()].map((p) => p[2]);
    expect(Math.max(...alturas)).toBeLessThan(1);
    /* Os quatro cantos de valência 2 continuam onde estavam. */
    const cantos = [[0, 0, 0], [2, 0, 0], [0, 1, 0], [2, 1, 0]];
    for (const c of cantos) {
      const achou = [...m.V.values()].some((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 1e-9);
      expect(achou).toBe(true);
    }
  });

  it('mantém o plano plano', () => {
    const plano = {
      V: new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 1, 0]]]),
      F: new Map([[0, { id: 0, vs: [0, 1, 2, 3] }]]),
    };
    for (const p of subdividir(plano, 3).V.values()) expect(p[2]).toBeCloseTo(0, 12);
  });
});

describe('identidade semântica', () => {
  it('as quatro filhas herdam o nome da face da cage', () => {
    const c = cubo();
    c.F.get(0).parte = 'capo';
    const m = subdividir(c, 2);
    const doCapo = [...m.F.values()].filter((f) => f.parte === 'capo');
    expect(doCapo).toHaveLength(16);
  });

  it('face sem nome não ganha nome', () => {
    expect([...subdividir(cubo(), 1).F.values()].every((f) => f.parte === undefined)).toBe(true);
  });
});

describe('determinismo', () => {
  it('mesma cage e mesmo nível dão saída idêntica', () => {
    const a = JSON.stringify(malhaCanonica(subdividir(cubo(), 2)));
    const b = JSON.stringify(malhaCanonica(subdividir(cubo(), 2)));
    expect(a).toBe(b);
  });

  it('não depende da ordem de inserção das faces', () => {
    const normal = cubo();
    const trocado = cubo();
    const invertido = new Map([...trocado.F.entries()].reverse());
    trocado.F = invertido;
    expect(JSON.stringify(malhaCanonica(subdividir(normal, 2))))
      .toBe(JSON.stringify(malhaCanonica(subdividir(trocado, 2))));
  });
});

describe('topologia', () => {
  it('acha doze arestas no cubo, cada uma com duas faces', () => {
    const { arestas } = topologia([...cubo().F.values()]);
    expect(arestas.size).toBe(12);
    for (const e of arestas.values()) expect(e.faces).toHaveLength(2);
  });
});
