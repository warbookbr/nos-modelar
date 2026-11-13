/* corpo-por-fatias-gaiola.test.mjs — o que corpoPorFatias faz com o que a gaiolaPorLacos devolve: a recusa pela face fina e a passagem dos avisos dela. */
import { describe, expect, it, vi } from 'vitest';

let avisosDaGaiola = [];
vi.mock('./gaiola-por-lacos.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, gaiolaPorLacos: (o) => { const g = real.gaiolaPorLacos(o); return { ...g, avisos: [...g.avisos, ...avisosDaGaiola] }; } };
});
const { corpoPorFatias } = await import('./corpo-por-fatias.js');
const circ = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const corpo = () => corpoPorFatias({ nome: 'c', eixo: 'x', fatias: [{ em: 0, contorno: circ(5, 8) }, { em: 20, contorno: circ(5, 8) }] });

describe('corpoPorFatias diante dos avisos da gaiola', () => {
  it('recusa a gaiola que sai com face fina, com a quantidade e o remédio, e deixa passar os outros avisos dela', () => {
    avisosDaGaiola = [{ ref: 'amostragemDesigual', texto: 'x' }];
    expect(corpo().avisos.map((a) => a.ref)).toEqual(['amostragemDesigual']);
    avisosDaGaiola = [{ ref: 'facesFinas', quantidade: 3, texto: 'três faces' }];
    expect(corpo).toThrow(/a gaiola sai com 3 faces finas \(três faces\); ponha uma fatia entre as de contorno muito diferente/);
    avisosDaGaiola = [{ ref: 'facesFinas', quantidade: 1, texto: 'uma' }];
    expect(corpo).toThrow(/sai com 1 face fina /);
    avisosDaGaiola = [];
    expect(corpo().avisos).toEqual([]);
  });
});
