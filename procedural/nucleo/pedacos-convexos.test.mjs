/* pedacos-convexos.test.mjs — a fusão pelos vizinhos dá os mesmos pedaços, na mesma ordem e com o mesmo canto de partida, que a
   varredura que recomeçava do primeiro pedaço a cada fusão, em tampas de perfil com furos (a da extrusão) e em leques com lascas. */
import { describe, expect, it } from 'vitest';
import { pedacosConvexos, pedacosConvexosPorVarredura } from './pedacos-convexos.js';
import { montarPerfil, triangularPerfil } from './perfil2d.js';

/* gerador determinístico, para o teste não depender da sorte */
function sorteio(semente) {
  let s = semente >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

function tampa(entrada) {
  const perfil = montarPerfil(entrada);
  const t = triangularPerfil(perfil);
  const pos = (g) => [t.pontos[g][0], 0, t.pontos[g][1]];
  return { pos, triangulos: t.triangulos };
}

const iguais = ({ pos, triangulos }, piso = 0) => {
  const n = [0, -1, 0];
  expect(pedacosConvexos(pos, triangulos, n, piso)).toEqual(pedacosConvexosPorVarredura(pos, triangulos, n, piso));
};

describe('pedacosConvexos pelos vizinhos', () => {
  it('dá o mesmo que a varredura em chapas com furos redondos, retangulares e de canto arredondado, sorteados', () => {
    for (let semente = 1; semente <= 12; semente++) {
      const r = sorteio(semente);
      const furos = [];
      const n = 2 + Math.floor(r() * 10);
      for (let k = 0; k < n; k++) {
        const centro = [-0.4 + 0.8 * (k + 0.5) / n, -0.1 + 0.2 * r()];
        if (r() < 0.5) furos.push({ circulo: { raio: 0.01 + 0.015 * r(), centro } });
        else furos.push({ retangulo: { largura: 0.02 + 0.02 * r(), profundidade: 0.01 + 0.02 * r(), centro, cantos: r() < 0.5 ? 0.004 : 0 } });
      }
      iguais(tampa({ externo: { retangulo: { largura: 1, profundidade: 0.3, cantos: 0.03 } }, furos, segmentosArco: 4 + Math.floor(r() * 12) }));
    }
  });

  it('dá o mesmo num leque com lascas, em que o piso de área decide a fusão', () => {
    const pontos = [[0, 0, 0], [1, 0, 0], [1, 0, 1e-12], [1, 0, 1], [0.5, 0, 1.5], [0, 0, 1], [0, 0, 0.5 + 1e-13]];
    const pos = (g) => pontos[g];
    const triangulos = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 6]];
    for (const piso of [0, 1e-9]) iguais({ pos, triangulos }, piso);
  });

  it('a chapa de 44 furos (o caso da junta do cabeçote) sai igual e em menos de 2 s', () => {
    const furos = [];
    for (let k = 0; k < 4; k++) furos.push({ circulo: { raio: 0.041, centro: [-0.132 + 0.088 * k, 0] } });
    for (let k = 0; k < 40; k++) furos.push({ circulo: { raio: 0.004, centro: [-0.19 + 0.0095 * k, k % 2 ? 0.055 : -0.055] } });
    const caso = tampa({ externo: { retangulo: { largura: 0.42, profundidade: 0.15, cantos: 0.01 } }, furos, segmentosArco: 12 });
    const t = Date.now();
    const novos = pedacosConvexos(caso.pos, caso.triangulos, [0, -1, 0], 0);
    expect(Date.now() - t).toBeLessThan(2000);
    expect(novos).toEqual(pedacosConvexosPorVarredura(caso.pos, caso.triangulos, [0, -1, 0], 0));
  }, 120000);
});
