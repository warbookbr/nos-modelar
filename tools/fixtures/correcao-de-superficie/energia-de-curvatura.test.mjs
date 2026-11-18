/* energia-de-curvatura.test.mjs — as provas do protótipo da etapa A do degrau 3 (fatia 5 do plano das ferramentas de correção de
 * superfície), `energia-de-curvatura.mjs`: o estêncil do anel 3×3 contra o oráculo da superfície limite, a energia nula na quadrática, a
 * calibração da onda, e o efeito medido sobre a crista de curvatura das curvas exatas, sem mudar o núcleo. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { limitesDaGaiola, superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { definicaoAnalitica } from './chapas.mjs';
import { ajustarComEnergia, energiaDaGaiola, estenceisDoAnel, provaDasAnaliticas, provaDasEmendas, termosDaEnergia, topologiaRegular } from './energia-de-curvatura.mjs';

/* a grade plana de nx por nz vértices de passo h, com a altura y = f(x, z) */
const grade = (nx, nz, h, f) => {
  const vertices = []; const faces = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) vertices.push([i * h, f(i * h, j * h), j * h]);
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i; faces.push([a, a + nx, a + nx + 1, a + 1]); }
  return { vertices, faces, vincos: [], cantos: [], borda: 'suave' };
};

describe('a energia de variação de curvatura (protótipo fora do núcleo)', () => {
  it('o estêncil do anel 3×3 dá as derivadas segundas do oráculo no vértice regular, a 1e-12', () => {
    const g = gaiolaPorRede(definicaoAnalitica('toro'));
    const r = gaiolaDoPasso(g.passo, { vec: (p) => g.pontos[p], num: Number });
    const gaiola = { ...r.gaiola, borda: 'suave' }; const P = gaiola.vertices;
    const T = topologiaRegular(gaiola); const sup = superficieLimite(gaiola);
    const aplicar = (linha) => { const s = [0, 0, 0]; for (const [j, w] of linha) for (let x = 0; x < 3; x++) s[x] += w * P[j][x]; return s; };
    let conferidos = 0, pior = 0;
    gaiola.faces.forEach((f, fi) => {
      if (!T.regular(f[0])) return;
      /* no canto 0 da face, u vai para f[1] e v para f[3], o seguinte de f[1] na volta do vértice */
      const k = T.vizinhos(f[0]).indexOf(f[1]);
      const anel = T.anel(f[0], k);
      expect(anel[2][1]).toBe(f[1]); expect(anel[1][2]).toBe(f[3]); expect(anel[2][2]).toBe(f[2]);
      const e = estenceisDoAnel(anel); const a = sup.avaliar(fi, 0, 0);
      for (const [linha, d] of [[e.uu, a.duu], [e.uv, a.duv], [e.vv, a.dvv]]) { const s = aplicar(linha); for (let x = 0; x < 3; x++) pior = Math.max(pior, Math.abs(s[x] - d[x])); }
      conferidos++;
    });
    expect(conferidos).toBe(gaiola.faces.filter((f) => T.regular(f[0])).length);
    expect(conferidos).toBeGreaterThan(280);
    expect(pior).toBeLessThan(1e-12);
  });

  it('a energia é nula na quadrática em grade uniforme, positiva na cúbica, e só tem termo entre vértices regulares', () => {
    const quadratica = grade(9, 8, 0.03, (x, z) => 0.7 * x * x - 1.3 * x * z + 0.4 * z * z + 0.2 * x - 0.1);
    /* os comprimentos são os da gaiola declarada, congelados: com a grade plana declarada (comprimentos iguais), toda quadrática no
       parâmetro tem energia nula. Com os comprimentos tirados da própria quadrática inclinada eles deixam de ser iguais, e a energia
       dela sai pequena e não nula (o limite do parâmetro por comprimento de aresta, que fica para a etapa B) */
    const termos = termosDaEnergia(grade(9, 8, 0.03, () => 0), 0.12);
    /* as arestas entre os 7 por 6 vértices de dentro: 6 × 6 numa direção e 7 × 5 na outra */
    expect(termos).toHaveLength(6 * 6 + 7 * 5);
    const cubica = energiaDaGaiola(termos, grade(9, 8, 0.03, (x) => 5 * x * x * x).vertices);
    expect(cubica).toBeGreaterThan(1e-6);
    expect(energiaDaGaiola(termos, quadratica.vertices)).toBeLessThan(1e-20 * cubica);
    const naPropria = energiaDaGaiola(termosDaEnergia(quadratica, 0.12), quadratica.vertices);
    expect(naPropria).toBeGreaterThan(0); expect(naPropria).toBeLessThan(0.01 * cubica);
    /* o vinco e o canto tiram o termo dos vértices que tocam */
    const comVinco = { ...quadratica, vincos: [[3 * 9 + 3, 3 * 9 + 4, 2]], cantos: [5 * 9 + 6] };
    const T = topologiaRegular(comVinco);
    expect(T.regular(3 * 9 + 3)).toBe(false); expect(T.regular(3 * 9 + 4)).toBe(false); expect(T.regular(5 * 9 + 6)).toBe(false);
    expect(T.regular(2 * 9 + 2)).toBe(true); expect(T.regular(0)).toBe(false); expect(T.regular(4)).toBe(false);
  });

  it('a calibração: a senoide de comprimento `onda` cotada com peso 1 sai com perto de metade da amplitude', () => {
    const razao = (arestasPorOnda) => {
      const h = 0.025; const onda = arestasPorOnda * h; const nx = 6 * arestasPorOnda + 1; const nz = 9;
      const g = grade(nx, nz, h, (x) => 0.001 * Math.sin((2 * Math.PI * x) / onda));
      const medidas = g.vertices.map((_, indice) => ({ indice, peso: 1 }));
      const { vertices } = ajustarComEnergia(g, medidas, { onda });
      const L = limitesDaGaiola({ ...g, vertices });
      let num = 0, den = 0;
      /* as duas ondas do meio, na fileira do meio */
      for (let i = 2 * arestasPorOnda; i <= 4 * arestasPorOnda; i++) { const k = 4 * nx + i; num += L[k][1] * g.vertices[k][1]; den += g.vertices[k][1] ** 2; }
      return num / den;
    };
    const quatro = razao(4), oito = razao(8);
    expect(quatro).toBeGreaterThan(0.4); expect(quatro).toBeLessThan(0.5);
    expect(oito).toBeGreaterThan(0.47); expect(oito).toBeLessThan(0.53);
  });

  it('no paraboloide, a crista de curvatura das curvas de dentro cai de mais de 1 1/m para menos de 0,05, com as cotas exatas no lugar', () => {
    const [p] = provaDasAnaliticas({}, ['paraboloide']);
    for (const c of p.hoje.cristaPontual) expect(c.maxima, c.nome).toBeGreaterThan(1);
    for (const c of p.prototipo.cristaPontual) { expect(c.vertices, c.nome).toBeGreaterThanOrEqual(8); expect(c.maxima, c.nome).toBeLessThan(0.05); }
    /* a chapa inteira é a ponta das curvas exatas, igual nas duas; longe da borda o protótipo segue a cota do miolo, que está a 0,2 mm */
    expect(p.prototipo.a100Mm).toBeLessThan(0.25);
  });

  it('na emenda-g1 a crista some sem a superfície se afastar da desenhada mais que hoje', () => {
    const [e] = provaDasEmendas({}, ['emenda-g1']);
    expect(e.hoje.cristaPontual.maxima).toBeGreaterThan(0.3);
    expect(e.prototipo.cristaPontual.maxima).toBeLessThan(0.05);
    expect(e.prototipo.distanciaJuntoMm).toBeLessThanOrEqual(e.hoje.distanciaJuntoMm);
    expect(e.prototipo.distanciaMm).toBeLessThanOrEqual(e.hoje.distanciaMm);
    expect(e.prototipo.salto).toBeLessThan(1e-12);
  });
});
