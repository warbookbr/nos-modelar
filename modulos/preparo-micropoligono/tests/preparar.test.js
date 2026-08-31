/* preparar.test.js — cada requisito é visto reprovando o seu defeito.
 *
 * Um preparador que sempre aprova é pior que nenhum: ele transfere para o motor
 * a confiança que ele mesmo não conquistou. */
import { describe, expect, it } from 'vitest';
import { prepararParaMicropoligono, melhorDiagonal, NAO_COBERTO, ErroPreparo } from '../src/preparar.js';

function cuboSao() {
  return {
    vertices: new Map([
      [0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 1, 0]],
      [4, [0, 0, 1]], [5, [1, 0, 1]], [6, [1, 1, 1]], [7, [0, 1, 1]],
    ]),
    faces: new Map([
      [0, { vs: [0, 3, 2, 1], parte: 'c' }], [1, { vs: [4, 5, 6, 7], parte: 'c' }],
      [2, { vs: [0, 1, 5, 4], parte: 'c' }], [3, { vs: [1, 2, 6, 5], parte: 'c' }],
      [4, { vs: [2, 3, 7, 6], parte: 'c' }], [5, { vs: [3, 0, 4, 7], parte: 'c' }],
    ]),
  };
}

const cods = (r) => r.achados.map((a) => a.codigo);

describe('preparo para micropolígono', () => {
  it('aprova o cubo são e entrega triângulos', () => {
    const r = prepararParaMicropoligono(cuboSao());
    expect(r.veredito).toBe('aprova');
    expect(r.resumo.triangulos).toBe(12);      // 6 quads -> 12 triângulos
    expect(r.malha.triangulos).toHaveLength(12);
    expect(r.malha.triangulos.every((t) => t.vs.length === 3)).toBe(true);
  });

  it('converte metro para centímetro, que é o que o motor assume', () => {
    const r = prepararParaMicropoligono(cuboSao(), { unidadeEntrada: 'm', unidadeSaida: 'cm' });
    expect(r.escala.fator).toBe(100);
    expect(r.malha.vertices.get(6)).toEqual([100, 100, 100]);
  });

  it('reprova malha aberta e NÃO entrega geometria junto do veredito', () => {
    const m = cuboSao();
    m.faces.delete(1);
    const r = prepararParaMicropoligono(m);
    expect(r.veredito).toBe('reprova');
    expect(cods(r)).toContain('malha-aberta');
    expect(r.malha).toBeNull();
  });

  it('reprova orientação incoerente antes de triangular', () => {
    const m = cuboSao();
    m.faces.set(1, { vs: [7, 6, 5, 4], parte: 'c' });
    const r = prepararParaMicropoligono(m);
    expect(cods(r)).toContain('orientacao-incoerente');
    expect(r.malha).toBeNull();
  });

  it('reprova triângulo degenerado vindo de face colinear', () => {
    const m = cuboSao();
    m.vertices.set(8, [0, 0, 0]); m.vertices.set(9, [1, 0, 0]); m.vertices.set(10, [0.5, 0, 0]);
    m.faces.set(6, { vs: [8, 9, 10], parte: 'c' });
    const r = prepararParaMicropoligono(m);
    expect(cods(r)).toContain('triangulo-degenerado');
  });

  it('alerta face torta, porque aí o leque de triangulação vira escolha', () => {
    const m = cuboSao();
    m.vertices.set(6, [1, 1, 1.3]);            // tira a tampa do plano
    const r = prepararParaMicropoligono(m);
    expect(cods(r)).toContain('face-torta');
    expect(r.veredito).toBe('alerta');
    expect(r.malha).not.toBeNull();            // alerta não bloqueia entrega
  });

  it('escolhe a diagonal curta no quad torto, não a do primeiro canto', () => {
    /* Quad torto em que a diagonal 0-2 é a LONGA. Sem escolha, o leque pegaria
       ela e produziria dois triângulos mais alongados que o necessário. */
    const pontos = new Map([[0, [0, 0, 0]], [1, [3, 0, 0]], [2, [3, 1, 1]], [3, [0, 1, 0]]]);
    expect(melhorDiagonal(pontos, [0, 1, 2, 3])).toBe(1);
  });

  it('mantém a diagonal do primeiro canto quando ela já é a curta', () => {
    const pontos = new Map([[0, [0, 0, 0]], [1, [1, 0, 0]], [2, [1, 1, 0]], [3, [0, 3, 0]]]);
    expect(melhorDiagonal(pontos, [0, 1, 2, 3])).toBe(0);
  });

  it('recusa a diagonal que passa por fora do quad côncavo, mesmo sendo a curta', () => {
    /* Canto 0 reflexo: a diagonal interna é a 0-2 (3,54) e a 1-3 é mais curta
       (2,50) mas passa FORA — um dos triângulos cobriria área que não é da face.
       O critério de dentro tem de vencer o de comprimento. Este caso não aparece
       em quad qualquer: numa varredura, só 19% dos quads côncavos têm a diagonal
       de fora mais curta. Foi preciso procurar por um. */
    const pontos = new Map([[0, [4, 3.5, 0]], [1, [4.5, 1.5, 0]], [2, [0.5, 3, 0]], [3, [4.5, 4, 0]]]);
    const q = [...pontos.values()];
    const dist = (a, b) => Math.hypot(...[0, 1, 2].map((k) => q[a][k] - q[b][k]));
    expect(dist(1, 3)).toBeLessThan(dist(0, 2));
    expect(melhorDiagonal(pontos, [0, 1, 2, 3])).toBe(0);
  });

  it('registra a diagonal usada em cada triângulo, para a escolha ser auditável', () => {
    const r = prepararParaMicropoligono(cuboSao());
    expect(r.malha.triangulos.every((t) => Array.isArray(t.diagonal) && t.diagonal.length === 2)).toBe(true);
  });

  it('ignora ruído de ponto flutuante e acusa torção real', () => {
    /* A medida no acervo mostrou dois grupos e nada entre eles: face de caixa
       desvia 1e-17, face de loft que torce desvia 1e-2 para cima. O limiar
       precisa separar exatamente isso — e não ser frouxo a ponto de calar a
       segunda, que foi a tentação quando a espada começou a alertar. */
    const m = cuboSao();
    m.vertices.set(6, [1, 1, 1 + 1e-16]);
    expect(cods(prepararParaMicropoligono(m))).not.toContain('face-torta');
    m.vertices.set(6, [1, 1, 1.02]);
    expect(cods(prepararParaMicropoligono(m))).toContain('face-torta');
  });

  it('declara por escrito o que não cobre', () => {
    const r = prepararParaMicropoligono(cuboSao());
    expect(r.naoCoberto).toBe(NAO_COBERTO);
    expect(r.naoCoberto.join(' ')).toMatch(/UV/);
    expect(r.naoCoberto.join(' ')).toMatch(/densidade de triângulo/);
  });

  it('recusa unidade desconhecida e malha malformada', () => {
    expect(() => prepararParaMicropoligono(cuboSao(), { unidadeSaida: 'polegada' })).toThrow(ErroPreparo);
    expect(() => prepararParaMicropoligono({})).toThrow(ErroPreparo);
    expect(() => prepararParaMicropoligono({ vertices: new Map([[0, [0, 0]]]), faces: new Map() }))
      .toThrow(/números finitos/);
  });
});
