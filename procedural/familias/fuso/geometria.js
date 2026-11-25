/* geometria.js — o fuso e a castanha, em milímetro, com o eixo em y, de 0 ao comprimento.

   O fuso é o núcleo cilíndrico com o filete por cima, um `friso` ao longo da hélice, de pontas fechadas, como a rosca
   cosmética do `fixador`: no trapezoidal (tipo 1), o núcleo tem o diâmetro menor d3 e o filete o perfil de 30° da ISO 2904,
   com a crista de 0,366 P; no de esferas (tipo 2), só o volume de fora: o núcleo tem o diâmetro do fundo da pista
   (d − 0,6 P) e o filete é a crista larga entre as pistas, de 0,55 P, com os cantos chanfrados.

   A castanha flangeada é regra da família: o corpo de diâmetro 1,6 d + 6 (2 d + 8 na de esferas) e comprimento 2 d (2,4 d),
   o flange de 2,4 d + 14 (2,8 d + 18) com 0,25 d + 4 de espessura e quatro furos no meio do flange, de 0,1 d + 4,5. O furo
   da castanha tem 0,1 mm de folga sobre a crista do filete. O filete fica à parte do núcleo, como a rosca cosmética do
   `fixador`: unir os dois custou de 7,5 s (Tr20x4 de 300 mm) a 63 s (Tr10x2 de 600 mm) por fuso, medido em 2026-11-24. */
import { folgaDeCrista } from './tabela.js';

export const PONTOS_POR_VOLTA = 24;
export const LADOS = 48;

export function geometriaDoFuso(q) {
  const { tipo, diametro: d, passo: P, comprimento: L, posicaoDaCastanha: yN } = q;
  let nucleo; let perfil;
  if (tipo === 1) {
    const h3 = P / 2 + folgaDeCrista(P);
    nucleo = d / 2 - h3;
    const crista = 0.366 * P / 2; const base = crista + h3 * Math.tan(Math.PI / 12);
    perfil = [[-base, 0], [base, 0], [crista, h3], [-crista, h3]];
  } else {
    nucleo = d / 2 - 0.3 * P;
    const h = 0.3 * P; const meia = 0.275 * P; const ch = 0.08 * P;
    perfil = [[-meia, 0], [meia, 0], [meia, h - ch], [meia - ch, h], [-meia + ch, h], [-meia, h - ch]];
  }
  const filete = { raio: nucleo, passo: P, voltas: (L - P) / P, centro: [0, P / 2, 0], perfil, fechamento: P };
  const esferas = tipo === 2;
  const Rc = (esferas ? 2 * d + 8 : 1.6 * d + 6) / 2; const Ln = esferas ? 2.4 * d : 2 * d;
  const Rf = (esferas ? 2.8 * d + 18 : 2.4 * d + 14) / 2; const tf = 0.25 * d + 4; const rb = d / 2 + 0.1;
  const castanha = [[rb, 0], [Rf, 0], [Rf, tf], [Rc, tf], [Rc, Ln], [rb, Ln], [rb, 0]];
  const pcd = (Rc + Rf) / 2; const rfuro = (0.1 * d + 4.5) / 2;
  const furo = [[0, -1], [rfuro, -1], [rfuro, tf + 1], [0, tf + 1]];
  return { nucleo: [[0, 0], [nucleo, 0], [nucleo, L], [0, L]], raioDoNucleo: nucleo, filete, castanha, emCastanha: [0, yN, 0], furo, emFuro: [pcd * Math.SQRT1_2, yN, pcd * Math.SQRT1_2], comprimentoDaCastanha: Ln, raioDoFlange: Rf };
}
