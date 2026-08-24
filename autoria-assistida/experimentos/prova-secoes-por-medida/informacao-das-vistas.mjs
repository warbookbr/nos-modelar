#!/usr/bin/env node
/* informacao-das-vistas.mjs — as três vistas ortográficas determinam a seção?

   Esta é a pergunta que decide o "caminho 1": trocar números inventados por
   dado medido de blueprint. Blueprint dá CONTORNO — lateral, planta, frontal.
   Seção transversal é outra coisa. Se o contorno não carregar a informação da
   seção, nenhuma imagem de referência resolve o problema, e é melhor saber
   isso antes de construir um pipeline de reconstrução.

   O teste: gerar corpos com a MESMA lateral e a MESMA planta por construção,
   variando só a "cheiura" da seção — o expoente de queda do flanco. Se a vista
   frontal mudar muito, a informação está lá. Se quase não mudar, não está. */

import { secaoDoPerfil } from '../../rascunhos-defeituosos/prova-cage-quarto-dianteiro/quarto-dianteiro.mjs';

/* Reimplementa a seção com o expoente exposto. A geometria é a mesma do
   quarto dianteiro; só a cheiura vira parâmetro. */
export function secaoComCheiura(q, pCima, pBaixo) {
  const [cx, cy] = q.crista;
  const pts = [[0, q.centro]];
  for (const f of [0.31, 0.62, 0.83]) {
    const naCorda = q.centro + (cy - q.centro) * f;
    pts.push([Math.round(cx * f), Math.round(naCorda + q.bojoDoCapo * Math.sin(Math.PI * Math.pow(f, 0.85)))]);
  }
  pts.push([cx, cy]);
  const yLargo = q.soleira[1] + (cy - q.soleira[1]) * q.alturaDaLarguraMax;
  const queda = (a, b, u, p) => a - (a - b) * Math.pow(Math.min(1, Math.max(0, u)), p);
  for (const t of [0.10, 0.28, 0.55, 0.80]) {
    const y = cy + (q.soleira[1] - cy) * t;
    const x = y >= yLargo
      ? queda(q.larguraMax, cx, (y - yLargo) / ((cy - yLargo) || 1), pCima)
      : queda(q.larguraMax, q.soleira[0], (yLargo - y) / ((yLargo - q.soleira[1]) || 1), pBaixo);
    pts.push([Math.round(x), Math.round(y)]);
  }
  pts.push(q.soleira.slice());
  return pts;
}

/* Contorno frontal: meia largura máxima por faixa de altura, sobre todas as
   estações. É exatamente o que uma blueprint mostra na vista de frente. */
export function contornoFrontal(secoes, passo = 20) {
  const por = new Map();
  for (const pts of secoes) {
    /* Amostra denso ao longo da seção, senão o contorno vira serrilha. */
    for (let i = 0; i < pts.length - 1; i += 1) {
      for (let s = 0; s <= 12; s += 1) {
        const t = s / 12;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t;
        const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
        const k = Math.round(y / passo) * passo;
        por.set(k, Math.max(por.get(k) ?? 0, x));
      }
    }
  }
  return [...por.entries()].sort((a, b) => a[0] - b[0]);
}

export function compararContornos(a, b) {
  const mapa = new Map(b);
  let max = 0;
  let soma = 0;
  let n = 0;
  for (const [y, xa] of a) {
    const xb = mapa.get(y);
    if (xb === undefined) continue;
    const d = Math.abs(xa - xb);
    max = Math.max(max, d);
    soma += d;
    n += 1;
  }
  return { maxMm: +max.toFixed(1), medioMm: +(soma / (n || 1)).toFixed(1), amostras: n };
}
