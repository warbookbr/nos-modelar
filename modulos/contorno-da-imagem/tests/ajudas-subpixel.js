/* ajudas-subpixel.js — imagens sintéticas antisserrilhadas e medidas de
   geometria para os testes da borda abaixo do pixel e da forma declarada. */
import { PNG } from 'pngjs';

/* Imagem em tons de cinza a partir de uma função contínua (x, y) -> cinza,
   calculada por supersampling S x S em cada pixel, como o desenho vetorial
   antisserrilhado que a referência é. O centro do pixel (x, y) é o ponto (x, y). */
export function imagemAntisserrilhada(largura, altura, tom, S = 8) {
  const png = new PNG({ width: largura, height: altura });
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    let soma = 0;
    for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) soma += tom(x - 0.5 + (i + 0.5) / S, y - 0.5 + (j + 0.5) / S);
    const v = Math.round(soma / (S * S)); const o = (y * largura + x) * 4;
    png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
  }
  return PNG.sync.write(png);
}

/* Pontos do anel de 0.1 em 0.1 px (ou `passo`), para medir a linha e não só os vértices. */
export function amostrarAnel(anel, passo = 0.1) {
  const saida = [];
  for (let i = 0; i < anel.length; i += 1) {
    const [ax, ay] = anel[i]; const [bx, by] = anel[(i + 1) % anel.length];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / passo));
    for (let s = 0; s < n; s += 1) saida.push([ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n]);
  }
  return saida;
}

/* Reta ajustada por mínimos quadrados totais; devolve o maior desvio dos pontos a ela. */
export function desvioDaReta(pontos) {
  const n = pontos.length;
  const cx = pontos.reduce((s, p) => s + p[0], 0) / n; const cy = pontos.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0; let sxy = 0; let syy = 0;
  for (const [x, y] of pontos) { sxx += (x - cx) ** 2; sxy += (x - cx) * (y - cy); syy += (y - cy) ** 2; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const nx = -Math.sin(ang); const ny = Math.cos(ang);
  return Math.max(...pontos.map(([x, y]) => Math.abs((x - cx) * nx + (y - cy) * ny)));
}

export const areaDoAnel = (anel) => {
  let s = 0;
  for (let i = 0; i < anel.length; i += 1) { const [ax, ay] = anel[i]; const [bx, by] = anel[(i + 1) % anel.length]; s += ax * by - bx * ay; }
  return Math.abs(s / 2);
};

export const dentroDoAnel = (anel, x, y) => {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i, i += 1) {
    const [xi, yi] = anel[i]; const [xj, yj] = anel[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
};

/* Quantos pontos de uma grade fina caem em mais de um anel, e quantos caem na
   união `uniao` sem cair em nenhum dos `partes`. Os dois números são zero quando
   as partes dividem a mesma linha, sem sobreposição e sem buraco. */
export function sobreposicaoEBuraco(partes, uniao, caixa, passo = 0.173) {
  let sobra = 0; let buraco = 0;
  for (let y = caixa[1] + 0.0371; y < caixa[3]; y += passo) for (let x = caixa[0] + 0.0293; x < caixa[2]; x += passo) {
    const n = partes.filter((a) => dentroDoAnel(a, x, y)).length;
    if (n > 1) sobra += 1;
    if (n === 0 && uniao.some((a) => dentroDoAnel(a, x, y))) buraco += 1;
  }
  return { sobra, buraco };
}

/* Centro de massa da área do anel. */
export const centroideDoAnel = (anel) => {
  let a = 0; let cx = 0; let cy = 0;
  for (let i = 0; i < anel.length; i += 1) {
    const [ax, ay] = anel[i]; const [bx, by] = anel[(i + 1) % anel.length]; const c = ax * by - bx * ay;
    a += c; cx += (ax + bx) * c; cy += (ay + by) * c;
  }
  return [cx / (3 * a), cy / (3 * a)];
};
