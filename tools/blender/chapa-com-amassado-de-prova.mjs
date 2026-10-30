/* chapa-com-amassado-de-prova.mjs — a forma desenhada por código com que se prova a luz rasante e a curvatura da lataria: uma
   chapa de 1 m (x) por 0,6 m (y), de 2 mm de espessura (duas peles e a quina), abaulada em x com raio de 6 m, a face de fora
   para +z, com um friso de seção octogonal de 4 mm de raio ao longo de y 0,55 como objeto à parte. O amassado plantado é largo
   e raso, o que passa por distância mediana, mapa de distância e curvatura de raio curto: 1,2 mm de fundo em 160 mm de
   diâmetro, em x 0,4 e y 0,3. Em metro, y para cima e frente em +z; nenhum dado vem de referência externa.

   A malha é a da chapa de ensaio das outras ferramentas (grade de 5 mm), e as duas versões, com e sem o amassado, têm os
   mesmos vértices, de modo que a diferença entre elas é só o amassado. A chapa se chama `chapa` e o friso `friso`, como as
   partes de uma peça exportada com `exportar:obj`. */

export const LARGURA = 1.0;
export const ALTURA = 0.6;
export const PASSO = 0.005;
export const ESPESSURA = 0.002;
/** O abaulamento em x: a chapa é um trecho de cilindro de raio 6 m, de eixo em y. */
export const RAIO_DO_ABAULAMENTO = 6;
/** O amassado: centro, fundo (m, para dentro, em -z) e raio (m) da cova, que tem o perfil fundo * (1 - r²/raio²)². */
export const AMASSADO = { x: 0.4, y: 0.3, fundo: 0.0012, raio: 0.08 };
/** O friso: y da linha, x de ponta a ponta e raio da seção, em metro. */
export const FRISO = { y: 0.55, x0: 0.1, x1: 0.9, raio: 0.004, lados: 8 };
/** A caixa (xmin, xmax, ymin, ymax, zmin, zmax) que cobre o amassado e um pouco mais, em metro. */
export const REGIAO_DO_AMASSADO = [0.3, 0.5, 0.2, 0.4, -0.1, 0.1];
/** A região de controle, do mesmo tamanho, longe do amassado e do friso, na mesma chapa. */
export const REGIAO_DE_CONTROLE = [0.62, 0.82, 0.2, 0.4, -0.1, 0.1];
/** A caixa da chapa inteira, com folga em z. */
export const CAIXA = '0,1,0,0.6,-0.1,0.1';

/** A altura da pele de fora em (x, y), com ou sem amassado. */
export function alturaDeFora(x, y, amassado = AMASSADO) {
  let z = -((x - LARGURA / 2) ** 2) / (2 * RAIO_DO_ABAULAMENTO);
  if (amassado) {
    const r = Math.hypot(x - amassado.x, y - amassado.y) / amassado.raio;
    if (r < 1) z -= amassado.fundo * (1 - r * r) ** 2;
  }
  return z;
}

/** A chapa em OBJ. Opções: `amassado` (como AMASSADO, ou null para a chapa lisa) e `friso` (se o friso entra como objeto à parte). */
export function obj({ amassado = AMASSADO, friso = true } = {}) {
  const nx = Math.round(LARGURA / PASSO);
  const ny = Math.round(ALTURA / PASSO);
  const V = [];
  const F = [];
  const fe = (i, j) => 1 + j * (nx + 1) + i;                    // pele de fora
  const di = (i, j) => 1 + (nx + 1) * (ny + 1) + j * (nx + 1) + i; // pele de dentro
  for (const lado of [0, 1]) {
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const x = i * PASSO;
        const y = j * PASSO;
        V.push([x, y, alturaDeFora(x, y, amassado) - (lado ? ESPESSURA : 0)]);
      }
    }
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      F.push([fe(i, j), fe(i + 1, j), fe(i + 1, j + 1), fe(i, j + 1)]);
      F.push([di(i, j), di(i, j + 1), di(i + 1, j + 1), di(i + 1, j)]);
    }
  }
  // a quina: os quatro lados ligam a pele de fora à de dentro, com a normal para fora da chapa
  for (let i = 0; i < nx; i++) {
    F.push([fe(i, 0), di(i, 0), di(i + 1, 0), fe(i + 1, 0)]);
    F.push([fe(i + 1, ny), di(i + 1, ny), di(i, ny), fe(i, ny)]);
  }
  for (let j = 0; j < ny; j++) {
    F.push([fe(0, j + 1), di(0, j + 1), di(0, j), fe(0, j)]);
    F.push([fe(nx, j), di(nx, j), di(nx, j + 1), fe(nx, j + 1)]);
  }
  const linhas = ['o chapa', ...V.map((v) => `v ${v.map((c) => c.toFixed(7)).join(' ')}`), ...F.map((f) => `f ${f.join(' ')}`)];
  if (friso) linhas.push(...frisoObj(V.length));
  return `${linhas.join('\n')}\n`;
}

/** O friso: um prisma octogonal fechado nas pontas, enrolado para fora, assentado na pele de fora (1 mm dentro dela). */
function frisoObj(base) {
  const { y, x0, x1, raio, lados } = FRISO;
  const passos = Math.round((x1 - x0) / PASSO);
  const V = [];
  for (let s = 0; s <= passos; s++) {
    const x = x0 + (s * (x1 - x0)) / passos;
    const z0 = alturaDeFora(x, y, null) + raio - 0.001;
    for (let k = 0; k < lados; k++) {
      const t = (2 * Math.PI * k) / lados;
      V.push([x, y + raio * Math.cos(t), z0 + raio * Math.sin(t)]);
    }
  }
  const id = (s, k) => base + 1 + s * lados + (k % lados);
  const F = [];
  for (let s = 0; s < passos; s++) {
    for (let k = 0; k < lados; k++) F.push([id(s, k), id(s, k + 1), id(s + 1, k + 1), id(s + 1, k)]);
  }
  F.push(Array.from({ length: lados }, (_, k) => id(0, lados - 1 - k)));
  F.push(Array.from({ length: lados }, (_, k) => id(passos, k)));
  return ['o friso', ...V.map((v) => `v ${v.map((c) => c.toFixed(7)).join(' ')}`), ...F.map((f) => `f ${f.join(' ')}`)];
}
