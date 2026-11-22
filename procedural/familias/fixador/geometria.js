/* geometria.js — as medidas do fixador em milímetro, a partir dos parâmetros da família e da tabela ISO.

   Puro e sem núcleo. O eixo é y. No parafuso, a face de apoio da cabeça fica em y = 0, a cabeça sobe até a altura dela e a
   haste desce até -comprimento. A porca e a arruela ficam de y = 0 para cima, com o furo no eixo.

   A rosca é cosmética (decisão da pessoa em 2026-11-22): o filete é um friso ao longo da hélice, de perfil trapezoidal com
   a altura de 0,6134 passo da norma, sobre um núcleo no diâmetro menor, e encosta nele como sólido à parte. O comprimento
   roscado é o da norma para parafuso de haste parcial, 2d + 6 mm, ou a haste inteira quando ela é mais curta. As duas pontas
   do filete se fecham em um passo. */
import { medidasIso } from './tabela.js';

export const PECAS = Object.freeze({ 1: 'parafuso', 2: 'porca', 3: 'arruela' });
export const CABECAS = Object.freeze({ 1: 'sextavada', 2: 'allen', 3: 'abaulada' });
export const ALTURA_DO_FILETE = 0.6134;
export const PONTOS_POR_VOLTA_DA_ROSCA = 24;
export const SOBREPOSICAO = 0.1;

/** Os seis cantos do sextavado de chave `s` (a distância entre faces), com duas faces paralelas a x. */
export function sextavado(s) {
  const raio = s / Math.sqrt(3);
  return Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return [raio * Math.cos(a), raio * Math.sin(a)]; });
}

export function geometriaDoFixador(p) {
  const iso = medidasIso(p.diametroNominal);
  const d = p.diametroNominal;
  const P = iso.passo;
  const peca = PECAS[p.peca];
  if (peca === 'porca') return { peca, iso, chave: iso.chave, altura: iso.porca, furo: d / 2 };
  if (peca === 'arruela') return { peca, iso, externo: iso.externoArruela / 2, furo: iso.furoArruela / 2, altura: iso.espessuraArruela };

  const L = p.comprimento;
  const cabeca = CABECAS[p.cabeca];
  let geoCabeca;
  if (cabeca === 'sextavada') geoCabeca = { tipo: cabeca, chave: iso.chave, altura: iso.cabeca };
  else if (cabeca === 'allen') geoCabeca = { tipo: cabeca, raio: iso.dkAllen / 2, altura: d, chaveInterna: iso.chaveAllen, fundo: 0.6 * d };
  else geoCabeca = { tipo: cabeca, raio: 0.875 * d, altura: 0.55 * d, chaveInterna: 0.8 * iso.chaveAllen, fundo: 0.35 * d };

  const roscada = p.rosca >= 1;
  const fundida = p.rosca === 2;
  /* fundida, cada cilindro entra SOBREPOSICAO na peça de cima, para `unir` cruzar volumes e não faces encostadas */
  const sob = fundida ? SOBREPOSICAO : 0;
  const b = Math.min(L, 2 * d + 6);
  const geo = { peca, iso, cabeca: geoCabeca, comprimento: L, roscada, fundida, comprimentoRoscado: roscada ? b : 0 };
  if (roscada) {
    const nucleo = d / 2 - ALTURA_DO_FILETE * P;
    geo.nucleo = { raio: nucleo, de: -L, ate: -L + b + sob };
    geo.filete = {
      raio: nucleo, passo: P, voltas: (b - P) / P, centro: [0, -L + P / 2, 0],
      perfil: [[-0.42 * P, -0.05 * P], [0.42 * P, -0.05 * P], [0.06 * P, ALTURA_DO_FILETE * P], [-0.06 * P, ALTURA_DO_FILETE * P]],
      fechamento: P,
    };
    geo.haste = b < L ? { raio: d / 2, de: -L + b, ate: sob } : null;
  } else {
    geo.haste = { raio: d / 2, de: -L, ate: 0 };
  }
  return geo;
}
