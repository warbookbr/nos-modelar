/* geometria.js — o rolamento rígido de esferas e o mancal de pedestal, em milímetro, com o eixo do rolamento em y, de 0 à
   largura B.

   Regra da família, porque a norma só dá o contorno: o diâmetro da esfera é 0,3 (D − d), o círculo primitivo é (d + D)/2,
   o número de esferas é o que cabe com 1,65 diâmetro de passo, e a pista de cada anel é um arco de 1,04 raio de esfera em
   volta do centro dela, de modo que a esfera fica solta com a folga interna. O ombro do anel fica a 0,35 raio de esfera do
   círculo primitivo. O vedado (forma 2) tem a vedação como um lábio do anel externo em cada face, de 0,08 B, até perto do
   anel interno. O mancal (forma 3) é o vedado dentro de uma caixa de pedestal: o cubo de raio 0,75 D e 1,3 B de largura,
   o pé de 2,6 D por 0,25 D com dois furos de fixação, e o eixo a 0,8 D acima da base. */

export const LADOS_DO_ANEL = 48;
export const LADOS_DA_ESFERA = 16;
const PONTOS_DO_ARCO = 7;
const PONTOS_DA_ESFERA = 9;

function arco(centro, raio, de, ate) {
  return Array.from({ length: PONTOS_DO_ARCO }, (_, k) => { const a = de + ((ate - de) * k) / (PONTOS_DO_ARCO - 1); return [centro[0] + raio * Math.cos(a), centro[1] + raio * Math.sin(a)]; });
}

export function regraDasEsferas({ furo: d, diametroExterno: D }) {
  const diametro = 0.3 * (D - d);
  const primitivo = (d + D) / 4;
  const esferas = Math.floor((2 * Math.PI * primitivo) / (1.65 * diametro));
  return { diametro, primitivo, esferas };
}

export function geometriaDoRolamento(q) {
  const { furo: d, diametroExterno: D, largura: B, chanfro: c } = q;
  const { diametro, primitivo: rp, esferas } = regraDasEsferas(q);
  const rb = diametro / 2; const R = 1.04 * rb; const meio = B / 2;
  const rs = rp + 0.35 * rb; const ri = rp - 0.35 * rb;
  const dy = Math.sqrt(R * R - (0.35 * rb) ** 2); const a = Math.atan2(dy, 0.35 * rb);
  const vedado = q.forma >= 2;
  const t = 0.08 * B; const rv = ri + 0.04 * (D - d);
  /* o anel externo: a parede de fora com os chanfros, a pista em arco e, no vedado, os lábios das faces */
  const pistaDeFora = arco([rp, meio], R, a, -a); // de (rs, meio + dy) a (rs, meio − dy), passando por fora
  const externo = vedado
    ? [[D / 2 - c, 0], [D / 2, c], [D / 2, B - c], [D / 2 - c, B], [rv, B], [rv, B - t], [rs, B - t], ...pistaDeFora, [rs, t], [rv, t], [rv, 0]]
    : [[D / 2 - c, 0], [D / 2, c], [D / 2, B - c], [D / 2 - c, B], [rs, B], ...pistaDeFora, [rs, 0]];
  const pistaDeDentro = arco([rp, meio], R, Math.PI + a, Math.PI - a); // de (ri, meio − dy) a (ri, meio + dy), por dentro
  const interno = [[d / 2 + c, 0], [ri, 0], ...pistaDeDentro, [ri, B], [d / 2 + c, B], [d / 2, B - c], [d / 2, c]];
  const esfera = Array.from({ length: PONTOS_DA_ESFERA }, (_, k) => { const f = -Math.PI / 2 + (Math.PI * k) / (PONTOS_DA_ESFERA - 1); return [Math.abs(rb * Math.cos(f)) < 1e-12 ? 0 : rb * Math.cos(f), rb * Math.sin(f)]; });
  const fechar = (pts) => [...pts, pts[0]];
  const pecas = [
    { parte: 'anelExterno', cheios: [{ op: 'lathe', perfil: fechar(externo), em: [0, 0, 0], lados: LADOS_DO_ANEL }] },
    { parte: 'anelInterno', cheios: [{ op: 'lathe', perfil: fechar(interno), em: [0, 0, 0], lados: LADOS_DO_ANEL }] },
    { parte: 'esferas', cheios: [{ op: 'lathe', perfil: esfera, em: [rp, meio, 0], lados: LADOS_DA_ESFERA, copias: { total: esferas, graus: 360 / esferas } }] },
  ];
  const resultado = { pecas, esferas, primitivo: rp, raioDaEsfera: rb, apoio: { ponto: [rp, 0, 0], normal: [0, -1, 0], extensao: [D, D] } };
  if (q.forma !== 3) return resultado;
  const Rh = 0.75 * D; const w = 1.3 * B; const y0 = meio - w / 2; const Hc = 0.8 * D; const Lb = 2.6 * D; const tb = 0.25 * D; const xf = 1.0 * D; const rf = 0.07 * D;
  const cubo = { op: 'lathe', perfil: [[D / 2, y0], [Rh, y0], [Rh, y0 + w], [D / 2, y0 + w], [D / 2, y0]], em: [0, 0, 0], lados: LADOS_DO_ANEL };
  const pe = { op: 'extrusao', perfil: [[-Lb / 2, -Hc], [Lb / 2, -Hc], [Lb / 2, -Hc + tb], [0.9 * Rh, -Hc + tb], [0.6 * Rh, -0.2 * D], [-0.6 * Rh, -0.2 * D], [-0.9 * Rh, -Hc + tb], [-Lb / 2, -Hc + tb]], altura: w, em: [0, y0, 0] };
  const alojamento = { op: 'lathe', perfil: [[0, y0 - 1], [D / 2, y0 - 1], [D / 2, y0 + w + 1], [0, y0 + w + 1]], em: [0, 0, 0], lados: LADOS_DO_ANEL };
  const parafuso = (x) => ({ op: 'lathe', eixo: 'z', perfil: [[0, 0], [rf, 0], [rf, tb + 2], [0, tb + 2]], em: [x, meio, -Hc - 1], lados: 24 });
  pecas.push({ parte: 'mancal', cheios: [cubo, pe], ferramentas: [alojamento, parafuso(-xf), parafuso(xf)] });
  resultado.apoio = { ponto: [0, meio, -Hc], normal: [0, 0, -1], extensao: [Lb, w] };
  return resultado;
}
