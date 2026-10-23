/* chapa-com-abertura-de-prova.mjs — a forma desenhada por código com que se prova a conferência do refino: uma chapa plana de
   1 m (x) por 0,6 m (y), com a face de fora para +z, uma abertura retangular e, se pedido, um calombo liso. Duas versões da
   mesma chapa fazem uma rodada de refino: a segunda baixa a abertura e tira o calombo. Em metro, y para cima e frente em
   +z; nenhum dado vem de referência externa. A grade é de 5 mm e a abertura cai em linhas da grade, de modo que 45 mm de
   descida são nove células exatas. */

export const LARGURA = 1.0;
export const ALTURA = 0.6;
export const PASSO = 0.005;
/** A caixa de medida que cobre a chapa inteira, com folga em z: x, y, z. */
export const CAIXA = '0,1,0,0.6,-0.05,0.05';
/** A abertura da primeira versão, em metro: x de 0,3 a 0,7 e y de 0,25 a 0,45. */
export const ABERTURA = { x0: 0.3, x1: 0.7, y0: 0.25, y1: 0.45 };
/** O calombo da primeira versão: 10 mm de altura e 60 mm de raio, centrado em x 0,85 e y 0,15. */
export const CALOMBO = { x: 0.85, y: 0.15, altura: 0.01, raio: 0.06 };

/** A chapa em OBJ. Opções: `abertura` ({ x0, x1, y0, y1 } em metro, alinhada à grade, ou null), `calombo` ({ x, y, altura, raio }
 *  ou null) e `desloca` (metro, em z, para fora). */
export function obj({ abertura = ABERTURA, calombo = null, desloca = 0 } = {}) {
  const nx = Math.round(LARGURA / PASSO);
  const ny = Math.round(ALTURA / PASSO);
  const dentro = (i, j) => {
    if (!abertura) return false;
    const cx = (i + 0.5) * PASSO;
    const cy = (j + 0.5) * PASSO;
    return cx > abertura.x0 && cx < abertura.x1 && cy > abertura.y0 && cy < abertura.y1;
  };
  const z = (x, y) => {
    let h = desloca;
    if (calombo) {
      const r = Math.hypot(x - calombo.x, y - calombo.y) / calombo.raio;
      if (r < 1) h += calombo.altura * (1 - r * r) ** 2;
    }
    return h;
  };
  const id = new Map();
  const V = [];
  const F = [];
  const vertice = (i, j) => {
    const k = j * (nx + 1) + i;
    if (!id.has(k)) {
      id.set(k, V.length + 1);
      const x = i * PASSO;
      const y = j * PASSO;
      V.push([x, y, z(x, y)]);
    }
    return id.get(k);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (dentro(i, j)) continue;
      F.push([vertice(i, j), vertice(i + 1, j), vertice(i + 1, j + 1), vertice(i, j + 1)]);
    }
  }
  return ['o chapa', ...V.map((v) => `v ${v.map((c) => c.toFixed(6)).join(' ')}`), ...F.map((f) => `f ${f.join(' ')}`)].join('\n') + '\n';
}

/** A abertura baixada de `mm` milímetros. */
export function abaixo(mm, abertura = ABERTURA) {
  const d = mm / 1000;
  return { ...abertura, y0: abertura.y0 - d, y1: abertura.y1 - d };
}
