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
