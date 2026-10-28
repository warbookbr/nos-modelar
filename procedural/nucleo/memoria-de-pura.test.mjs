/* memoria-de-pura.test.mjs — a memória das últimas chamadas de uma função pura devolve o que a função devolveria, sem refazer a conta. */
import { describe, expect, it } from 'vitest';
import { memoizarPura } from './memoria-de-pura.js';
import { ajustarGaiolaAsMedidasComPeso, subdividirCatmullClark } from './subdivisao.js';

function contada(corpo) {
  const f = (...a) => { f.chamadas += 1; return corpo(...a); };
  f.chamadas = 0;
  return f;
}

describe('memoizarPura', () => {
  it('a segunda chamada com os mesmos argumentos sai da memória e é igual à primeira', () => {
    const f = contada(({ v }) => ({ soma: v.reduce((s, x) => s + x, 0), v: [...v] }));
    const m = memoizarPura(f);
    const a = m({ v: [1, 2, 3] });
    const b = m({ v: [1, 2, 3] });
    expect(f.chamadas).toBe(1);
    expect(b).toEqual(a);
    expect(m({ v: [1, 2, 4] }).soma).toBe(7);
    expect(f.chamadas).toBe(2);
  });

  it('o resultado devolvido é uma cópia: alterá-lo não altera o que a memória guarda', () => {
    const m = memoizarPura(({ n }) => ({ lista: [n, n] }));
    const primeira = m({ n: 5 });
    primeira.lista.push(99);
    const segunda = m({ n: 5 });
    expect(segunda.lista).toEqual([5, 5]);
    segunda.lista.length = 0;
    expect(m({ n: 5 }).lista).toEqual([5, 5]);
  });

  it('zero negativo, NaN e infinito são argumentos distintos, bit a bit', () => {
    const f = contada((x) => Object.is(x, -0) ? 'menos zero' : String(x));
    const m = memoizarPura(f, { tamanho: 10 });
    expect(m(0)).toBe('0');
    expect(m(-0)).toBe('menos zero');
    expect(m(NaN)).toBe('NaN');
    expect(m(Infinity)).toBe('Infinity');
    expect(m(-Infinity)).toBe('-Infinity');
    expect(m(null)).toBe('null');
    expect(f.chamadas).toBe(6);
    expect(m(-0)).toBe('menos zero');
    expect(m(NaN)).toBe('NaN');
    expect(f.chamadas).toBe(6);
  });

  it('indefinido, ausente e nulo são argumentos distintos', () => {
    const f = contada((x) => JSON.stringify(x) ?? 'nada');
    const m = memoizarPura(f, { tamanho: 10 });
    m({ a: undefined }); m({}); m({ a: null }); m(undefined); m(null);
    expect(f.chamadas).toBe(5);
    m({ a: undefined }); m({}); m(undefined);
    expect(f.chamadas).toBe(5);
  });

  it('o resultado com zero negativo e infinito volta da memória idêntico', () => {
    const m = memoizarPura(() => ({ a: -0, b: Infinity, c: NaN }));
    m();
    const de = m();
    expect(Object.is(de.a, -0)).toBe(true);
    expect(de.b).toBe(Infinity);
    expect(Number.isNaN(de.c)).toBe(true);
  });

  it('argumento que não é dado simples desliga a memória daquela chamada', () => {
    const f = contada((fn) => fn());
    const m = memoizarPura(f);
    expect(m(() => 1)).toBe(1);
    expect(m(() => 2)).toBe(2);
    expect(f.chamadas).toBe(2);
    const h = contada((texto) => texto);
    const mh = memoizarPura(h);
    mh('\u0000u'); mh('\u0000u');
    expect(h.chamadas).toBe(2);
    const g = contada((mapa) => mapa.size);
    const mg = memoizarPura(g);
    mg(new Map([[1, 2]])); mg(new Map([[1, 2]]));
    expect(g.chamadas).toBe(2);
  });

  it('o erro da função não é guardado: a chamada seguinte lança de novo', () => {
    const f = contada(() => { throw new Error('recusa'); });
    const m = memoizarPura(f);
    expect(() => m(1)).toThrow('recusa');
    expect(() => m(1)).toThrow('recusa');
    expect(f.chamadas).toBe(2);
  });

  it('guarda só as últimas chamadas, e `quando` deixa de fora a que não deve entrar', () => {
    const f = contada((x) => x * 2);
    const m = memoizarPura(f, { tamanho: 2 });
    m(1); m(2); m(3);
    expect(f.chamadas).toBe(3);
    m(3); m(2);
    expect(f.chamadas).toBe(3);
    m(1);
    expect(f.chamadas).toBe(4);
    const g = contada((x) => x);
    const mg = memoizarPura(g, { quando: (x) => x > 0 });
    mg(-1); mg(-1); mg(1); mg(1);
    expect(g.chamadas).toBe(3);
  });
});

describe('memoizarPura sem cópia', () => {
  it('devolve o mesmo objeto guardado, e preserva o objeto de classe que a cópia perderia', () => {
    class Malha { constructor(n) { this.n = n; } dobro() { return 2 * this.n; } }
    const f = contada((n) => ({ malha: new Malha(n) }));
    const m = memoizarPura(f, { copiar: false });
    const a = m(3); const b = m(3);
    expect(f.chamadas).toBe(1);
    expect(b).toBe(a);
    expect(b.malha.dobro()).toBe(6);
  });
});

describe('a memória nas funções de subdivisão', () => {
  const cubo = {
    vertices: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]],
    vincos: [], cantos: [], niveis: 2, borda: 'suave', aoLimite: true, comVincos: true,
  };

  it('o refino repetido devolve o mesmo resultado, e alterar uma cópia não afeta a seguinte', () => {
    const primeira = subdividirCatmullClark(cubo);
    const referencia = JSON.stringify(primeira);
    primeira.vertices[0][0] = 123;
    primeira.faces.length = 0;
    const segunda = subdividirCatmullClark(cubo);
    expect(JSON.stringify(segunda)).toBe(referencia);
  });

  it('o refino sem `comVincos` não passa pela memória e dá o mesmo resultado nas duas chamadas', () => {
    const { comVincos, ...sem } = cubo;
    expect(JSON.stringify(subdividirCatmullClark(sem))).toBe(JSON.stringify(subdividirCatmullClark(sem)));
  });

  it('o ajuste das medidas com peso repetido devolve o mesmo resultado', () => {
    const gaiola = { vertices: cubo.vertices, faces: cubo.faces, vincos: [], cantos: [], borda: 'suave' };
    const medidas = [{ indice: 0, peso: 4 }, { indice: 6, peso: 4 }];
    const a = ajustarGaiolaAsMedidasComPeso(gaiola, medidas);
    const b = ajustarGaiolaAsMedidasComPeso(gaiola, medidas);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(b).not.toBe(a);
  });
});
