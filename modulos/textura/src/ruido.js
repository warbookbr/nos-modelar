/**
 * Ruído determinístico e contínuo nas bordas do tile (gradiente de Perlin com rede periódica).
 * Sem Math.random: todo número vem de um hash inteiro da semente e das coordenadas da rede.
 */

const GRAD = [];
for (let i = 0; i < 16; i += 1) {
  const a = (i / 16) * Math.PI * 2;
  GRAD.push([Math.cos(a), Math.sin(a)]);
}

export function hashInt(a, b, c) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Número em [0, 1) sorteado por (semente, índice, canal). */
export function sorteio(semente, indice, canal) {
  return hashInt(Math.round(semente * 1000), indice, canal + 0x51ed) / 4294967296;
}

function perlinPeriodico(x, y, nu, nv, semente) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const x0 = ((xi % nu) + nu) % nu;
  const y0 = ((yi % nv) + nv) % nv;
  const x1 = (x0 + 1) % nu;
  const y1 = (y0 + 1) % nv;
  const g00 = GRAD[hashInt(x0, y0, semente) & 15];
  const g10 = GRAD[hashInt(x1, y0, semente) & 15];
  const g01 = GRAD[hashInt(x0, y1, semente) & 15];
  const g11 = GRAD[hashInt(x1, y1, semente) & 15];
  const d00 = g00[0] * fx + g00[1] * fy;
  const d10 = g10[0] * (fx - 1) + g10[1] * fy;
  const d01 = g01[0] * fx + g01[1] * (fy - 1);
  const d11 = g11[0] * (fx - 1) + g11[1] * (fy - 1);
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = d00 + (d10 - d00) * u;
  const b = d01 + (d11 - d01) * u;
  return a + (b - a) * v;
}

/**
 * Campo de ruído fractal de px*px valores em torno de 0,5, periódico no tile.
 * `nu` e `nv` são os ciclos da rede por tile em x e em y (inteiros >= 1); cada oitava dobra os dois.
 */
export function campoDeRuido(px, nu, nv, { detalhe = 2, rugosidade = 0.5, semente = 1 } = {}) {
  const campo = new Float32Array(px * px);
  const nOit = Math.floor(detalhe) + 1;
  let soma = 0;
  let amp = 1;
  for (let o = 0; o < nOit; o += 1) {
    soma += amp;
    amp *= rugosidade;
  }
  amp = 1;
  for (let o = 0; o < nOit; o += 1) {
    const mu = Math.max(1, Math.round(nu)) * 2 ** o;
    const mv = Math.max(1, Math.round(nv)) * 2 ** o;
    const sem = hashInt(Math.round(semente * 1000), o, 7919);
    for (let j = 0; j < px; j += 1) {
      const y = ((j + 0.5) / px) * mv;
      for (let i = 0; i < px; i += 1) {
        const x = ((i + 0.5) / px) * mu;
        campo[j * px + i] += (amp / soma) * perlinPeriodico(x, y, mu, mv, sem);
      }
    }
    amp *= rugosidade;
  }
  for (let k = 0; k < campo.length; k += 1) campo[k] = Math.min(1, Math.max(0, 0.5 + 1.1 * campo[k]));
  return campo;
}

export const limitar = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

/** Equivalente ao Map Range do Blender com clamp: v em [fmin, fmax] vira [lo, hi]. */
export function faixa(v, lo, hi, fmin = 0, fmax = 1, suave = false) {
  let t = (v - fmin) / (fmax - fmin);
  t = limitar(t);
  if (suave) t = t * t * (3 - 2 * t);
  return lo + (hi - lo) * t;
}
