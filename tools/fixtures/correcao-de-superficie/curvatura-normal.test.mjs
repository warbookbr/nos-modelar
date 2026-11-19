/* curvatura-normal.test.mjs — o protótipo da curvatura normal linearizada (`curvatura-normal.mjs`): a medida contra o oráculo, a energia
 * nula no plano e no cilindro de passo igual, o contrato da cota nos dois modos, e a grade de razão 2 como o banco de provas a mediu
 * (`docs/modelar/banco-de-provas/correcao-de-superficie-2026-11-16/README.md`). O protótipo NÃO passou no critério da decisão de
 * 2026-11-19, e os números daqui guardam o que foi medido, para quem retomar a ideia. */
import { describe, expect, it } from 'vitest';
import { curvaturaNormal, superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { topologiaRegular } from './energia-de-curvatura.mjs';
import { curvaturasDoVertice, provaDaEnergia, provaDaGrade } from './curvatura-normal.mjs';

describe('a curvatura normal linearizada, fora do núcleo', () => {
  it('sobre a própria gaiola, κ_uu e κ_vv são a curvatura normal do oráculo nas direções u e v, numa grade torta', () => {
    const nx = 9, nz = 8; const vertices = []; const faces = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) vertices.push([0.03 * i + 0.002 * i * i + 0.001 * j, 0.01 * Math.sin(0.7 * i) * Math.cos(0.5 * j), 0.025 * j + 0.0015 * j * j - 0.0007 * i]);
    for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i; faces.push([a, a + nx, a + nx + 1, a + 1]); }
    const g = { vertices, faces, vincos: [], cantos: [], borda: 'suave' };
    const T = topologiaRegular(g); const sup = superficieLimite(g); let pior = 0, conferidos = 0;
    faces.forEach((f, fi) => {
      if (!T.regular(f[0])) return;
      const c = curvaturasDoVertice(vertices, T.anel(f[0], 0)); const a = sup.avaliar(fi, 0, 0);
      const k = (linha) => linha.reduce((s, [j, w]) => s + w * (c.n[0] * vertices[j][0] + c.n[1] * vertices[j][1] + c.n[2] * vertices[j][2]), 0);
      /* o sinal da normal do anel depende da volta; compara-se o módulo */
      pior = Math.max(pior, Math.abs(Math.abs(k(c.linhas[0])) - Math.abs(curvaturaNormal(a, c.Su))), Math.abs(Math.abs(k(c.linhas[2])) - Math.abs(curvaturaNormal(a, c.Sv))));
      conferidos++;
    });
    expect(conferidos).toBe(7 * 6);
    expect(pior).toBeLessThan(1e-9);
  });

  it('a energia é nula no plano em qualquer espaçamento e no cilindro de passo igual, e não é nula na quadrática inclinada', () => {
    const e = Object.fromEntries(provaDaEnergia().map((p) => [p.gaiola, p]));
    const de = (prefixo) => Object.values(e).find((p) => p.gaiola.startsWith(prefixo));
    expect(de('plano inclinado').sobreACubica).toBeLessThan(1e-20);
    expect(de('cilindro R 1 m, passo igual no ângulo').sobreACubica).toBeLessThan(1e-20);
    expect(de('cilindro R 1 m, passo igual no plano').sobreACubica).toBeLessThan(1e-12);
    /* na esfera sobra o erro da gaiola: 1,6e-8 da cúbica com o passo igual no ângulo, 0,7% com o passo igual no plano, 3% na razão 2 */
    expect(de('esfera R 0,5 m, passo igual na latitude').sobreACubica).toBeLessThan(1e-6);
    expect(de('esfera R 0,5 m, grade de razão 2').sobreACubica).toBeLessThan(0.05);
    /* a curvatura da quadrática inclinada varia de fato: a energia dela é 2,3 vezes a da cúbica de referência */
    expect(de('quadrática inclinada').sobreACubica).toBeGreaterThan(1);
  });

  it('a cota completa fica no lugar a 1e-9 mm; a cota só na normal escorrega milímetros na grade de razão 2', () => {
    const completa = provaDaGrade({ cota: 'completa' }, [2]); const normal = provaDaGrade({ cota: 'normal' }, [2]);
    for (const p of completa) expect(p.ajuste.residuoExatoMm, p.forma).toBeLessThan(1e-9);
    for (const p of normal) { expect(p.ajuste.residuoNaNormalMm, p.forma).toBeLessThan(1e-9); expect(p.ajuste.escorregamentoDentroMm, p.forma).toBeGreaterThan(4); }
    /* CONHECIDA: com a cota completa o cilindro e a sela ficam piores que sem a opção (0,365 contra 0,320 e 0,482 contra 0,330 mm) */
    const de = (lista, forma) => lista.find((p) => p.forma === forma);
    for (const forma of ['cilindro', 'sela']) expect(de(completa, forma).normalMm, `${forma} passou a caber com a cota completa: tire a marca`).toBeGreaterThan(de(completa, forma).semAOpcaoMm);
    /* nas três formas a curvatura normal fica longe do desvio da etapa B (3,27, 1,65 e 2,28 mm) */
    for (const p of [...completa, ...normal]) expect(p.normalMm, p.forma).toBeLessThan(0.3 * p.etapaBMm);
    for (const p of normal) expect(p.normalMm, p.forma).toBeLessThan(p.semAOpcaoMm);
  });
});
