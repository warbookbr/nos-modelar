/* furgao-realista, receita/interior.js — o interior (etapa 5), todo dentro da chapa: o piso, a divisória, os dois
 * bancos e o painel, cada um com o perfil que o `extrusao` pede (`derivarInterior`).
 */

import { lerp } from './geometria.js';

/* ---------- o interior ---------- */

/** Corta cada canto da polilinha fechada em `c` mm (ou na metade do lado mais curto), para os volumes de cabine não terem aresta viva. */
export function chanfrar(pts, c) {
  const n = pts.length;
  return pts.flatMap((p, k) => {
    const a = pts[(k - 1 + n) % n]; const b = pts[(k + 1) % n];
    const ia = [a[0] - p[0], a[1] - p[1]]; const ib = [b[0] - p[0], b[1] - p[1]];
    const la = Math.hypot(...ia); const lb = Math.hypot(...ib);
    const ca = Math.min(c, la / 2.1); const cb = Math.min(c, lb / 2.1);
    return [[p[0] + ia[0] / la * ca, p[1] + ia[1] / la * ca], [p[0] + ib[0] / lb * cb, p[1] + ib[1] / lb * cb]];
  });
}

/** A seção de dentro da chapa, em [x, y]: a metade da seção frontal da lateral e do teto recuada `d` mm pela normal, de y0 ao teto. */
export function secaoDeDentro(f, d, y0) {
  const pl = f.perfilLado;
  const recuado = pl.map((p, k) => {
    const a = pl[Math.max(0, k - 1)]; const b = pl[Math.min(pl.length - 1, k + 1)];
    const t = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(...t);
    return [p[0] + (-t[1] / l) * d, p[1] + (t[0] / l) * d];
  });
  const xEm = (y) => {
    for (let k = 0; k + 1 < recuado.length; k++) {
      const [x0, y1] = recuado[k]; const [x1, y2] = recuado[k + 1];
      if (y1 <= y && y <= y2 && y2 > y1) return lerp(x0, x1, (y - y1) / (y2 - y1));
    }
    return recuado[0][0];
  };
  const lado = [[xEm(y0), y0], ...recuado.filter((p) => p[1] > y0 && p[0] > 0)];
  return [...lado, [0, lado.at(-1)[1]]];
}

/** As peças do interior em milímetro: o piso, a divisória, os dois bancos e o painel, cada uma com o perfil que o `extrusao` pede. */
export function derivarInterior(T, f) {
  const yPiso = T.piso_y + T.piso_espessura;
  /* a divisória é a seção inteira de dentro da chapa, de lado a lado, do piso ao teto */
  const meia = secaoDeDentro(f, T.divisoria_margem, yPiso - 1);
  const contorno = [...meia, ...[...meia].reverse().slice(1).map(([x, y]) => [-x, y])];
  /* o eixo z do extrusao leva [u, v] a x = u e y = -v, e a peça nasce em z de 0 a altura */
  const divisoria = { nome: 'divisoria', perfil: contorno.map(([x, y]) => [x, -y]), z0: T.divisoria_z - T.divisoria_espessura / 2, espessura: T.divisoria_espessura };
  const zTrasInterno = T.piso_z_tras;
  const zFrente = T.piso_z_frente;
  const meiaLargura = T.piso_meia_largura;
  const piso = {
    nome: 'pisoInterior', y0: T.piso_y, altura: T.piso_espessura,
    perfil: { retangulo: { largura: 2 * meiaLargura, profundidade: zFrente - zTrasInterno, centro: [0, (zFrente + zTrasInterno) / 2], cantos: T.piso_raio_cantos } },
  };
  /* o banco: L em [z, y] (encosto e assento), com o pé no piso e os cantos chanfrados; o eixo x do extrusao leva [u, v] a y = -u e z = v, e a peça nasce em x de 0 a altura */
  const zb = T.banco_costas_z; const zc = zb + T.banco_costas_espessura; const zf = zb + T.banco_profundidade;
  const ySolo = yPiso - 1; const yA = T.banco_assento_y; const yT = T.banco_topo_y;
  const Lzy = chanfrar([[zb, ySolo], [zf, ySolo], [zf, yA], [zc, yA], [zc, yT - 180], [zc - 8, yT - 120], [zc - 8, yT], [zb, yT]], T.banco_chanfro);
  const bancos = [['bancoMotorista', 1], ['bancoPassageiro', -1]].map(([nome, s]) => ({
    nome, perfil: Lzy.map(([z, y]) => [-y, z]), x0: s * T.banco_x - T.banco_largura / 2, largura: T.banco_largura,
  }));
  /* o painel: perfil em [z, y] com a testa junto ao para-brisa, o topo que desce para o motorista e a face de baixo recuada */
  const zp0 = T.painel_z_tras; const zp1 = T.painel_z_frente;
  const Pzy = chanfrar([[zp0 + 90, ySolo], [zp1, ySolo], [zp1, T.painel_topo_y - 10], [zp1 - 130, T.painel_topo_y], [zp0 + 30, T.painel_topo_y - 50], [zp0, T.painel_topo_y - 120], [zp0, ySolo + 420]], T.painel_chanfro);
  const painel = { nome: 'painel', perfil: Pzy.map(([z, y]) => [-y, z]), x0: -T.painel_meia_largura, largura: 2 * T.painel_meia_largura };
  return { piso, divisoria, bancos, painel };
}
