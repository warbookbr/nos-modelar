/* Os traços da camada do desenho das formas (`desenharEsboco(..., { camada: true })`), dois defeitos que a medida do desenho achou nas
   imagens do conjunto de calibração do crítico que vêm de um esboço (a picape e o guarda-roupa): a caixa vista de lado sem a aresta de
   cima, porque só a ponta do começo do prisma tinha a borda onde a lateral de frente acaba, e, com `tracosVisiveis`, a emenda de duas
   formas no mesmo plano traçada e o cruzamento de uma forma com a outra sem traço (`tracos-da-camada.js`). */
import { describe, expect, it } from 'vitest';
import { desenharEsboco, VISTAS } from '../src/index.js';

const caixa = (id, [largura, altura, profundidade], centro = [0, 0, 0], extra = {}) => ({ id, tipo: 'caixa', largura, altura, profundidade, centro, cor: 'azul', ...extra });
const esboco = (vista, formas) => ({ vista, geometria: true, ocultar: ['titulo', 'nota'], opcoes: [{ titulo: 'T', formas }] });

/* Quanto do segmento 3D `A`-`B` os traços da camada cobrem, em fração, com a folga de `tol` pixels ao lado dele. */
function cobre(r, vista, A, B, tol = 0.7) {
  const { cx, cy } = r.geometria.paineis[0];
  const tela = (P) => { const q = VISTAS[vista].p(P); return [cx + q[0] * r.escala, cy + q[1] * r.escala]; };
  const a = tela(A); const b = tela(B);
  const c = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / c, (b[1] - a[1]) / c];
  let total = 0;
  for (const f of r.camada.formas) {
    for (const t of f.tracos) {
      for (let i = 0; i + 1 < t.length; i++) {
        const p = [t[i][0] - a[0], t[i][1] - a[1]]; const q = [t[i + 1][0] - a[0], t[i + 1][1] - a[1]];
        if (Math.abs(p[0] * u[1] - p[1] * u[0]) > tol || Math.abs(q[0] * u[1] - q[1] * u[0]) > tol) continue;
        total += Math.abs(Math.max(0, Math.min(c, q[0] * u[0] + q[1] * u[1])) - Math.max(0, Math.min(c, p[0] * u[0] + p[1] * u[1])));
      }
    }
  }
  return total / c;
}

describe('a caixa vista de lado leva as quatro arestas do contorno', () => {
  it('na vista de frente e na lateral, com as duas pontas do prisma de perfil, a aresta de cima sai como a de baixo', () => {
    for (const [vista, de, ate] of [['frontal', [-50, 30, 20], [50, 30, 20]], ['frontal', [-50, -30, 20], [50, -30, 20]], ['lateral', [50, 30, -20], [50, 30, 20]], ['lateral', [50, -30, -20], [50, -30, 20]]]) {
      const r = desenharEsboco(esboco(vista, [caixa('a', [100, 60, 40])]), { camada: true });
      expect(cobre(r, vista, de, ate), `${vista}, ${de}-${ate}`).toBeGreaterThan(0.95);
    }
  });
});

describe('tracosVisiveis: os traços refeitos pelo que se vê', () => {
  const dela = (vista, formas) => desenharEsboco(esboco(vista, formas), { camada: true, tracosVisiveis: true });

  it('a emenda de duas caixas encostadas no mesmo plano não leva traço, e o contorno de verdade leva', () => {
    const formas = [caixa('a', [60, 40, 30], [0, 0, 0]), caixa('b', [60, 40, 30], [60, 0, 0], { cor: 'verde' })];
    /* a emenda em x = 30: a da face da frente, de baixo a cima, e a da face de cima, de trás para a frente, onde a vista as mostra */
    for (const [vista, de, ate] of [['isometrica', [30, -20, 15], [30, 20, 15]], ['isometrica', [30, 20, -15], [30, 20, 15]], ['frontal', [30, -20, 15], [30, 20, 15]], ['superior', [30, 20, -15], [30, 20, 15]]]) {
      expect(cobre(dela(vista, formas), vista, de, ate), `${vista}, emenda ${de}-${ate}`).toBeLessThan(0.05);
    }
    /* o contorno de verdade: a aresta de cima da frente do conjunto, de x = -30 a 90 */
    for (const vista of ['isometrica', 'frontal']) expect(cobre(dela(vista, formas), vista, [-30, 20, 15], [90, 20, 15]), `${vista}, aresta de cima`).toBeGreaterThan(0.85);
    /* sem a opção a emenda segue traçada, como sempre foi */
    expect(cobre(desenharEsboco(esboco('frontal', formas), { camada: true }), 'frontal', [30, -20, 15], [30, 20, 15])).toBeGreaterThan(0.5);
  });

  it('o cilindro que atravessa a caixa leva o contorno da entrada na face dela', () => {
    /* o cilindro de eixo y, de 20 de diâmetro, atravessa a caixa de 60 x 40 x 30 pela face de cima; a aresta em que a parede dele cruza a face da frente
       da caixa (z = 15) é a reta em x = ±10, de y = 0 a 20 */
    const formas = [caixa('a', [60, 40, 30]), { id: 'b', tipo: 'cilindro', diametro: 20, comprimento: 80, eixo: 'y', cor: 'verde' }];
    const r = dela('isometrica', formas);
    let tracado = 0;
    const n = 12;
    /* a face de cima da caixa (y = 20) é cortada pelo círculo de raio 10: alguma corda do círculo sai na vista isométrica, sem ser a silhueta do cilindro */
    for (let k = 0; k < n; k++) {
      const a = [10 * Math.cos((2 * Math.PI * k) / n), 20, 10 * Math.sin((2 * Math.PI * k) / n)];
      const b = [10 * Math.cos((2 * Math.PI * (k + 1)) / n), 20, 10 * Math.sin((2 * Math.PI * (k + 1)) / n)];
      tracado += cobre(r, 'isometrica', a, b, 1.2) > 0.3 ? 1 : 0;
    }
    expect(tracado).toBeGreaterThanOrEqual(4);
  });

  it('a camada sai com `visiveis` nas formas opacas e sem perfil; o SVG não muda', () => {
    const formas = [caixa('a', [60, 40, 30]), caixa('b', [20, 20, 20], [20, 30, 0], { opacidade: 0.5, cor: 'verde' })];
    const com = dela('isometrica', formas);
    const sem = desenharEsboco(esboco('isometrica', formas), { camada: true });
    expect(com.camada.formas[0].visiveis).toBe(true);
    expect(com.camada.formas[0].inclinacoes).toBeUndefined();
    expect(com.camada.formas[1].visiveis).toBeUndefined();
    expect(com.svg).toBe(sem.svg);
  });
});
