/* chapa-em-l-prova.js — a chapa de prova da curva sobre a quina arredondada, sem domínio
 *
 * Duas faces a 90 graus de 80 mm cada, ligadas por uma quina de raio pedido em mm: a face de cima (y = 40, de x = -40 a 40) e a de lado (x = 40, de y = 40 a -40),
 * ao longo de z de 0 a 80 mm, em cinco estações de 20 mm (e0 a e4) e três colunas, a (ponta da face de cima), q (a quina) e b (ponta da face de lado). O vinco da coluna q pede o
 * raio em mm (`raio: 6`, `raio: 3` ou `{ de: 6, ate: 3 }`, a quina que afina ao longo de z). A chapa tem 1 mm de espessura, em `subdivisao` de 3 níveis com borda de cantos, e
 * `virar` põe as normais para fora do canto (o material por dentro do quadrante) ou para dentro. A gaiola sai em metro (como `gaiolaPorEstacoes`) e `pontosMm` em mm. */
import { gaiolaPorEstacoes } from '../gaiola-por-estacoes.js';

export const NIVEIS = 3;
export const COMPRIMENTO = 80;
export const BRACO = 40;

/** @param {{ raio: number | { de: number, ate: number }, virar?: boolean, niveis?: number }} o */
export function chapaEmL({ raio, virar = true, niveis = NIVEIS }) {
  const colunas = [{ nome: 'a', em: [-0.04, 0.04] }, { nome: 'q', em: [0.04, 0.04] }, { nome: 'b', em: [0.04, -0.04] }];
  const gaiola = gaiolaPorEstacoes({
    eixo: 'z', virar, niveis,
    estacoes: [0, 1, 2, 3, 4].map((i) => ({ nome: `e${i}`, em: i * 0.02, colunas })),
    vincos: [{ nome: 'quina', coluna: 'q', raio }],
  });
  const pontosMm = Object.fromEntries(Object.entries(gaiola.pontos).map(([n, p]) => [n, p.map((x) => x * 1000)]));
  const chapa = ['subdivisao', { origemId: 1, ...gaiola.passo, niveis, borda: 'cantos', espessura: 1 }];
  return { gaiola, pontosMm, passos: [chapa], origem: { op: 'subdivisao', id: 1 }, chapa: { passos: [chapa], origem: { op: 'subdivisao', id: 1 }, pontos: pontosMm } };
}
