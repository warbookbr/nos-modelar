/* gera.mjs — o gerador que a IA do desenho por coordenadas escreveu para os polígonos do braço (cantos arredondados e círculos em mm),
   guardado com o resultado para a prova ser reexecutável: node gera.mjs <saida>/lateral.partes.json */
import { writeFileSync } from 'node:fs';
const r1 = (x) => Math.round(x * 10) / 10;
// retângulo arredondado: raios por canto [ie, id, sd, se] (inferior esq, inferior dir, superior dir, superior esq)
function ret(h0, v0, h1, v1, raios = [0, 0, 0, 0], n = 6) {
  const [ie, id, sd, se] = typeof raios === 'number' ? [raios, raios, raios, raios] : raios;
  const pts = [];
  const canto = (ch, cv, r, a0) => {
    if (!r) { pts.push([r1(ch + (a0 === 180 || a0 === 90 ? 0 : 0)), r1(cv)]); return; }
    for (let i = 0; i <= n; i++) { const a = ((a0 + (90 * i) / n) * Math.PI) / 180; pts.push([r1(ch + r * Math.cos(a)), r1(cv + r * Math.sin(a))]); }
  };
  // anti-horário começando no canto inferior esquerdo
  if (ie) canto(h0 + ie, v0 + ie, ie, 180); else pts.push([h0, v0]);
  if (id) canto(h1 - id, v0 + id, id, 270); else pts.push([h1, v0]);
  if (sd) canto(h1 - sd, v1 - sd, sd, 0); else pts.push([h1, v1]);
  if (se) canto(h0 + se, v1 - se, se, 90); else pts.push([h0, v1]);
  return pts;
}
function circ(ch, cv, r, n = 24) {
  return Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return [r1(ch + r * Math.cos(a)), r1(cv + r * Math.sin(a))]; });
}
const cp = 776; // centro do punho
const partes = {
  chapa_pe: ret(-12, 0, 252, 10, 2, 2),
  base: ret(0, 10, 240, 250, [0, 0, 18, 18], 4),
  caixa_lateral: ret(-38, 34, 0, 236, [8, 0, 0, 8], 3),
  anel_base: ret(8, 250, 232, 262),
  junta_baixo: ret(24, 262, 216, 412, 36, 6),
  elo: ret(24, 404, 216, 870),
  tampa: ret(45, 425, 195, 850, 75, 8),
  anel_topo: ret(24, 866, 216, 880),
  junta_topo: ret(24, 880, 216, 1004, [0, 0, 40, 40], 6),
  braco: ret(216, 836, 720, 980),
  anel_braco: ret(216, 826, 244, 990, 4, 2),
  carcaca: ret(530, 836, 848, 980, [40, 72, 72, 40], 8),
  anel_punho_1: ret(cp - 58, 822, cp + 58, 836),
  anel_punho_2: ret(cp - 55, 810, cp + 55, 822),
  anel_punho_3: ret(cp - 58, 798, cp + 58, 810),
  garfo: (() => {
    // placa de cima com dois braços descendo dos lados, pontas arredondadas
    const L = cp - 56, R = cp + 56, w = 22, topo = 798, placa = 780, fundo = 718;
    const pts = [];
    // braço esquerdo, de cima para baixo pelo lado de fora
    pts.push([L, topo], [L, fundo + w / 2]);
    for (let i = 1; i < 6; i++) { const a = Math.PI + (Math.PI * i) / 6; pts.push([r1(L + w / 2 + (w / 2) * Math.cos(a)), r1(fundo + w / 2 + (w / 2) * Math.sin(a))]); }
    pts.push([L + w, fundo + w / 2], [L + w, placa], [R - w, placa], [R - w, fundo + w / 2]);
    for (let i = 1; i < 6; i++) { const a = Math.PI + (Math.PI * i) / 6; pts.push([r1(R - w / 2 + (w / 2) * Math.cos(a)), r1(fundo + w / 2 + (w / 2) * Math.sin(a))]); }
    pts.push([R, fundo + w / 2], [R, topo]);
    return pts;
  })(),
  articulacao: circ(cp, 748, 30),
  cilindro: ret(cp - 48, 632, cp + 48, 718, 4, 2),
  flange: ret(cp - 101, 610, cp + 101, 632, 3, 2),
  cubo: ret(cp - 28, 590, cp + 28, 610, [4, 4, 0, 0], 2),
};
const d = {
  objeto: 'braco robotico colaborativo',
  vista: 'lateral',
  frenteParaFundo: ['tampa', 'articulacao', 'carcaca', 'anel_braco', 'anel_base', 'anel_topo', 'junta_baixo', 'junta_topo', 'elo', 'braco', 'garfo', 'caixa_lateral', 'base', 'chapa_pe', 'anel_punho_1', 'anel_punho_2', 'anel_punho_3', 'cilindro', 'flange', 'cubo'],
  partes,
};
writeFileSync(process.argv[2], JSON.stringify(d) .replace(/"partes":\{/, '"partes":{\n').replace(/\],"/g, '],\n"') + '\n');
let n = 0; for (const p of Object.values(partes)) n += p.length;
console.log(Object.keys(partes).length, 'partes', n, 'pontos');
