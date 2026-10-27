/* analisar.test.js — cada regra é vista REPROVANDO um defeito construído de
 * propósito, e APROVANDO a malha sã correspondente.
 *
 * Detector que só foi visto aprovando é aprovação por vacuidade: ele pode estar
 * medindo a coisa errada, ou nada. Este repositório já registrou essa falha
 * ("detector que devolve `passa` fora do seu escopo"), então aqui cada achado
 * tem o seu par: um caso que o dispara e um que não. */
import { describe, expect, it } from 'vitest';
import { analisarTopologia, verticesCoincidentes, ErroTopologia } from '../src/analisar.js';

/* Cubo fechado, orientação coerente, tudo quadrilátero: a malha sã de
   referência. Cantos em ordem anti-horária vistos de fora. */
function cuboSao() {
  const vertices = new Map([
    [0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 1, 0]],
    [4, [0, 0, 1]], [5, [1, 0, 1]], [6, [1, 1, 1]], [7, [0, 1, 1]],
  ]);
  const faces = new Map([
    [0, { vs: [0, 3, 2, 1] }],   // z = 0, olhando -Z
    [1, { vs: [4, 5, 6, 7] }],   // z = 1, olhando +Z
    [2, { vs: [0, 1, 5, 4] }],   // y = 0
    [3, { vs: [1, 2, 6, 5] }],   // x = 1
    [4, { vs: [2, 3, 7, 6] }],   // y = 1
    [5, { vs: [3, 0, 4, 7] }],   // x = 0
  ]);
  return { vertices, faces };
}

const cods = (r) => r.achados.map((a) => a.codigo);

describe('analisador de topologia', () => {
  it('aprova o cubo são, sem nenhum achado', () => {
    const r = analisarTopologia(cuboSao());
    expect(r.veredito).toBe('aprova');
    expect(r.achados).toEqual([]);
    expect(r.resumo).toMatchObject({ vertices: 8, faces: 6, arestas: 12, componentes: 1, bordas: 0 });
  });

  it('reprova casca aberta quando uma face some', () => {
    const m = cuboSao();
    m.faces.delete(1);
    const r = analisarTopologia(m);
    expect(r.veredito).toBe('reprova');
    expect(cods(r)).toContain('casca-aberta');
    expect(r.resumo.bordas).toBe(4);
  });

  it('reprova orientação incoerente quando uma face é invertida', () => {
    const m = cuboSao();
    m.faces.set(1, { vs: [7, 6, 5, 4] });   // mesma face, sentido trocado
    const r = analisarTopologia(m);
    expect(r.veredito).toBe('reprova');
    expect(cods(r)).toContain('orientacao-incoerente');
  });

  it('reprova aresta não-manifold quando três faces dividem a mesma aresta', () => {
    const m = cuboSao();
    m.vertices.set(8, [0.5, 2, 0]);
    m.faces.set(6, { vs: [0, 1, 8] });      // terceira face na aresta 0-1
    const r = analisarTopologia(m);
    expect(r.veredito).toBe('reprova');
    expect(cods(r)).toContain('aresta-nao-manifold');
  });

  it('reprova face de área nula', () => {
    const m = cuboSao();
    m.vertices.set(8, [0, 0, 0]);
    m.vertices.set(9, [1, 0, 0]);
    m.vertices.set(10, [0.5, 0, 0]);        // três pontos colineares
    m.faces.set(6, { vs: [8, 9, 10] });
    const r = analisarTopologia(m);
    expect(r.veredito).toBe('reprova');
    expect(cods(r)).toContain('area-nula');
  });

  it('reprova canto repetido na mesma face', () => {
    const m = cuboSao();
    m.faces.set(6, { vs: [0, 1, 1] });
    const r = analisarTopologia(m);
    expect(cods(r)).toContain('canto-repetido');
  });

  it('alerta n-gon sem reprovar, porque n-gon plano não quebra nada', () => {
    const m = cuboSao();
    /* Face de 5 cantos, fechada e sã: substitui a tampa por um pentágono
       apoiado num vértice extra na mesma altura. */
    m.vertices.set(8, [0.5, 1.5, 1]);
    m.faces.set(1, { vs: [4, 5, 6, 8, 7] });
    m.faces.set(4, { vs: [2, 3, 7, 8, 6] });
    const r = analisarTopologia(m);
    expect(cods(r)).toContain('n-gon');
    expect(r.achados.find((a) => a.codigo === 'n-gon').severidade).toBe('alerta');
  });

  it('alerta ilhas quando a malha vem em dois corpos', () => {
    const a = cuboSao();
    const m = { vertices: new Map(a.vertices), faces: new Map(a.faces) };
    for (const [id, p] of a.vertices) m.vertices.set(id + 100, [p[0] + 5, p[1], p[2]]);
    for (const [id, f] of a.faces) m.faces.set(id + 100, { vs: f.vs.map((v) => v + 100) });
    const r = analisarTopologia(m);
    expect(cods(r)).toContain('ilhas');
    expect(r.resumo.componentes).toBe(2);
  });

  it('alerta vértice sem uso', () => {
    const m = cuboSao();
    m.vertices.set(99, [9, 9, 9]);
    expect(cods(analisarTopologia(m))).toContain('vertice-sem-uso');
  });

  it('alerta polo de valência alta acima do limite pedido', () => {
    const m = cuboSao();
    /* No cubo todo vértice tem valência 3; baixar o limite a 2 tem de acusar
       todos, o que prova que o limite é o limite e não um número decorativo. */
    const r = analisarTopologia(m, { limiteValencia: 2 });
    expect(r.achados.filter((a) => a.codigo === 'polo-alto')).toHaveLength(8);
    expect(analisarTopologia(m, { limiteValencia: 3 }).achados).toEqual([]);
  });

  it('recusa malha malformada em vez de devolver veredito', () => {
    expect(() => analisarTopologia(null)).toThrow(ErroTopologia);
    expect(() => analisarTopologia({ vertices: new Map([[0, [0, 0]]]), faces: new Map() }))
      .toThrow(/três números finitos/);
    expect(() => analisarTopologia({ vertices: new Map([[0, [0, 0, 0]]]), faces: new Map([[0, { vs: [0, 1, 2] }]]) }))
      .toThrow(/não existe/);
  });

  it('acha vértices coincidentes e não confunde vizinhos próximos', () => {
    const m = cuboSao();
    m.vertices.set(8, [0, 0, 0]);           // exatamente sobre o vértice 0
    expect(verticesCoincidentes(m)).toHaveLength(1);
    expect(verticesCoincidentes(cuboSao())).toHaveLength(0);
  });
});

describe('face fina e vértice no meio de aresta', () => {
  it('o cubo são não dispara nenhuma das duas', () => {
    const c = cods(analisarTopologia(cuboSao()));
    expect(c).not.toContain('face-fina');
    expect(c).not.toContain('vertice-em-aresta');
  });

  it('reprova a lasca: face comprida e quase sem largura', () => {
    const vertices = new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 0.001, 0]], [3, [0, 0.001, 0]]]);
    const faces = new Map([[0, { vs: [0, 1, 2, 3] }]]);
    expect(cods(analisarTopologia({ vertices, faces }))).toContain('face-fina');
  });

  it('deixa passar faixa estreita legítima, como o chanfro de um anel', () => {
    const vertices = new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 0.05, 0]], [3, [0, 0.05, 0]]]);
    const faces = new Map([[0, { vs: [0, 1, 2, 3] }]]);
    expect(cods(analisarTopologia({ vertices, faces }))).not.toContain('face-fina');
  });

  it('reprova o encontro em T dentro da mesma superfície', () => {
    /* Dois quadrados de baixo e um retângulo em cima: o vértice 4, entre os
       de baixo, cai no meio da aresta de baixo do retângulo. */
    const vertices = new Map([
      [0, [0, 0, 0]], [4, [1, 0, 0]], [1, [2, 0, 0]],
      [5, [0, 1, 0]], [6, [1, 1, 0]], [7, [2, 1, 0]],
      [8, [0, 2, 0]], [9, [2, 2, 0]],
    ]);
    const faces = new Map([
      [0, { vs: [0, 4, 6, 5] }], [1, { vs: [4, 1, 7, 6] }],
      [2, { vs: [5, 7, 9, 8] }],
    ]);
    const achado = analisarTopologia({ vertices, faces }).achados.find((a) => a.codigo === 'vertice-em-aresta');
    expect(achado?.onde.vertice).toBe(6);
  });

  it('a grade acha os mesmos encontros em T, na mesma ordem, que a comparação de cada aresta com cada vértice', () => {
    /* Uma faixa de 40 blocos em T encadeados num corpo só, com relevo em z para espalhar as células, e uma aresta longa
       em diagonal que cruza células demais e cai na lista do componente. */
    const vertices = new Map(); const faces = new Map();
    let f = 0;
    const id = (i, j) => i * 3 + j;
    const z = (i) => (i % 2 ? (z(i - 1) + z(i + 1)) / 2 : 0.3 * Math.sin(i));
    for (let i = 0; i <= 80; i++) for (let j = 0; j < 3; j++) vertices.set(id(i, j), [i * 0.5, j, z(i)]);
    for (let b = 0; b < 40; b++) {
      const i = 2 * b;
      faces.set(f++, { vs: [id(i, 0), id(i + 1, 0), id(i + 1, 1), id(i, 1)] });
      faces.set(f++, { vs: [id(i + 1, 0), id(i + 2, 0), id(i + 2, 1), id(i + 1, 1)] });
      faces.set(f++, { vs: [id(i, 1), id(i + 2, 1), id(i + 2, 2), id(i, 2)] });
    }
    vertices.set(1000, [0, 0, -30]); vertices.set(1001, [40, 2, 30]);
    faces.set(f++, { vs: [id(0, 0), 1000, 1001] });
    const r = analisarTopologia({ vertices, faces }).achados.filter((a) => a.codigo === 'vertice-em-aresta').map((a) => a.onde);
    // a comparação de antes, aresta por aresta contra todos os vértices do corpo
    const esperado = [];
    const pontas = new Map();
    for (const { vs } of faces.values()) vs.forEach((a, k) => { const b = vs[(k + 1) % vs.length]; pontas.set(a < b ? `${a}|${b}` : `${b}|${a}`, [a, b]); });
    const usados = [...new Set([...faces.values()].flatMap((x) => x.vs))];
    const ordem = []; const visto = new Set(); const adj = new Map();
    for (const { vs } of faces.values()) vs.forEach((a, k) => { const b = vs[(k + 1) % vs.length]; for (const [p, q] of [[a, b], [b, a]]) { if (!adj.has(p)) adj.set(p, new Set()); adj.get(p).add(q); } });
    for (const v of adj.keys()) { if (visto.has(v)) continue; const fila = [v]; visto.add(v); ordem.push(v); while (fila.length) { const x = fila.pop(); for (const w of adj.get(x)) if (!visto.has(w)) { visto.add(w); ordem.push(w); fila.push(w); } } }
    expect(usados.length).toBe(ordem.length);
    for (const [a, b] of pontas.values()) {
      const A = vertices.get(a), B = vertices.get(b); const d = [0, 1, 2].map((e) => B[e] - A[e]); const L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
      for (const v of ordem) {
        if (v === a || v === b) continue;
        const P = vertices.get(v); const ap = [0, 1, 2].map((e) => P[e] - A[e]); const s = (ap[0] * d[0] + ap[1] * d[1] + ap[2] * d[2]) / L2;
        if (s <= 1e-6 || s >= 1 - 1e-6) continue;
        if (Math.hypot(...[0, 1, 2].map((e) => ap[e] - s * d[e])) < 1e-6) esperado.push({ vertice: v, aresta: [a, b] });
      }
    }
    expect(esperado).toHaveLength(40);
    expect(r).toEqual(esperado);
  });

  it('não acusa vértice de outro corpo que só encosta na aresta', () => {
    const { vertices, faces } = cuboSao();
    vertices.set(10, [0.5, 0, 0]); vertices.set(11, [0.5, -1, 0]); vertices.set(12, [0.5, -1, -1]);
    faces.set(6, { vs: [10, 11, 12] });
    expect(cods(analisarTopologia({ vertices, faces }))).not.toContain('vertice-em-aresta');
  });
  it('reprova a dobra: duas faces que dividem duas arestas', () => {
    const vertices = new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 1, 0]], [4, [0.5, 0.5, 1]]]);
    const faces = new Map([[0, { vs: [0, 1, 2, 3] }], [1, { vs: [2, 1, 0, 4] }]]);
    expect(cods(analisarTopologia({ vertices, faces }))).toContain('dobra');
  });

  it('o cubo são não tem dobra', () => {
    expect(cods(analisarTopologia(cuboSao()))).not.toContain('dobra');
  });
});

describe('a face torta e o triângulo de área nula da triangulação', () => {
  it('alerta a face torta com a triangulação ligada, e ignora o ruído de ponto flutuante', () => {
    const m = cuboSao();
    m.vertices.set(6, [1, 1, 1 + 1e-16]);
    expect(cods(analisarTopologia(m, { triangulacao: true }))).not.toContain('face-torta');
    m.vertices.set(6, [1, 1, 1.02]);
    expect(cods(analisarTopologia(m))).not.toContain('face-torta');
    const r = analisarTopologia(m, { triangulacao: true });
    expect(cods(r)).toContain('face-torta');
    expect(r.achados.find((a) => a.codigo === 'face-torta').severidade).toBe('alerta');
  });

  it('reprova o canto colinear que dá triângulo de área nula na triangulação de uma face sã', () => {
    const r = analisarTopologia({
      vertices: new Map([[0, [0, 0, 0]], [1, [0.5, 0, 0]], [2, [1, 0, 0]], [3, [1, 1, 0]], [4, [0, 1, 0]]]),
      faces: new Map([[0, { vs: [0, 1, 2, 3, 4] }]]),
    }, { triangulacao: true });
    expect(cods(r)).toContain('triangulo-degenerado');
    expect(cods(r)).not.toContain('area-nula');
  });
});
