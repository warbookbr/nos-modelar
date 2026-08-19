#!/usr/bin/env node
/* prancha-chassi-p0.mjs — gera docs/mecanifica/img/chassi-p0-prancha.svg: a prancha
   ortográfica ALVO da rodada P0 do chassi realista. Não é a projeção de uma peça
   existente; é o desenho contra o qual a geometria futura será medida. Toda medida
   vem de docs/mecanifica/CHASSI-P0-ALVO-E-LIMIARES.md e é repetida aqui como dados
   explícitos: se os dois divergirem, o documento manda. Saída determinística, sem
   timestamp e sem dependência. */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(REPO, 'docs', 'mecanifica', 'img', 'chassi-p0-prancha.svg');

/* --- dados de P0, em milímetros -------------------------------------------- */
const ENVELOPE = { comprimento: 4600, largura: 2000, altura: 1190, entreEixos: 2650 };
const Z_MIN = -2335, Z_MAX = 2265, Y_MAX = 1190, X_MAX = 1000;

const RODA = {
  dianteira: { z: 1325, x: 830, raio: 340, arco: 385 },
  traseira: { z: -1325, x: 840, raio: 358, arco: 400 },
};

const LANDMARKS = [
  ['L01', 'ponta do nariz', 0, 520, 2265],
  ['L02', 'centro roda diant.', 830, 340, 1325],
  ['L03', 'centro roda tras.', 840, 358, -1325],
  ['L04', 'base do para-brisa', 0, 980, 480],
  ['L05', 'topo do para-brisa', 0, 1185, -180],
  ['L06', 'topo do teto', 0, 1190, -560],
  ['L07', 'fim do vidro tras.', 0, 1120, -1150],
  ['L08', 'tampa do motor', 0, 1055, -1750],
  ['L09', 'extremidade tras.', 0, 920, -2335],
  ['L10', 'cintura na porta', 930, 950, 0],
  ['L11', 'soleira', 925, 145, 0],
  ['L12', 'largura máxima', 1000, 850, -900],
  ['L13', 'ombro dianteiro', 965, 900, 1325],
  ['L14', 'topo arco diant.', 830, 725, 1325],
  ['L15', 'topo arco tras.', 840, 758, -1325],
];

/* Curva mestra 1 — silhueta lateral superior, em x = 0. [z, y] */
const PERFIL_SUPERIOR = [
  [2265, 520], [2100, 700], [1800, 830], [1325, 900], [900, 930],
  [480, 980], [120, 1090], [-180, 1185], [-370, 1190], [-560, 1190],
  [-820, 1168], [-1150, 1120], [-1750, 1055], [-2100, 1010], [-2335, 920],
];

/* Silhueta lateral inferior, em três segmentos: os arcos de roda são aberturas
   reais, então a linha de baixo é interrompida por eles em vez de atravessá-los. */
const PERFIL_INFERIOR = [
  [[2265, 520], [2215, 340], [2100, 205], [1900, 168], [1710, 260], [1710, 340]],
  [[940, 340], [820, 200], [400, 145], [0, 145], [-500, 152], [-800, 190], [-925, 358]],
  [[-1725, 358], [-1900, 210], [-2080, 200], [-2240, 380], [-2335, 920]],
];

/* Curva mestra 2 — planta: meia largura por estação. [z, meiaLargura] */
const PLANTA = [
  [2200, 300], [2100, 620], [1900, 845], [1325, 965], [800, 945],
  [0, 940], [-900, 1000], [-1600, 970], [-2100, 880], [-2335, 665],
];

/* Vista frontal — meia largura por altura. [y, meiaLargura] */
const FRONTAL = [
  [105, 860], [340, 940], [725, 962], [900, 965], [1010, 890],
  [1120, 725], [1185, 625],
];

/* --- desenho ---------------------------------------------------------------- */
const S = 0.16;                       /* px por milímetro */
const LAT = { x: 70, y: 96 };
const FRT = { x: 900, y: 96 };
const PLN = { x: 70, y: 420 };

const n = (v) => Number(v.toFixed(2));
const latX = (z) => n(LAT.x + (z - Z_MIN) * S);
const latY = (y) => n(LAT.y + (Y_MAX - y) * S);
const frtX = (x) => n(FRT.x + (x + X_MAX) * S);
const frtY = (y) => n(FRT.y + (Y_MAX - y) * S);
const plnX = (z) => n(PLN.x + (z - Z_MIN) * S);
const plnY = (x) => n(PLN.y + (x + X_MAX) * S);

/* Catmull-Rom → bézier cúbica: a curva mestra passa exatamente pelos pontos. */
function suave(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [n(p1[0] + (p2[0] - p0[0]) / 6), n(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [n(p2[0] - (p3[0] - p1[0]) / 6), n(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
}

const O = [];
const put = (s) => O.push(s);

put(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1320 820" width="1320" height="820" font-family="ui-sans-serif, system-ui, sans-serif">`);
put(`<rect width="1320" height="820" fill="#fbfbfa"/>`);
put(`<style>
  .corpo{fill:none;stroke:#12233b;stroke-width:2.1;stroke-linejoin:round}
  .arco{fill:none;stroke:#12233b;stroke-width:2.1}
  .pneu{fill:none;stroke:#8a94a2;stroke-width:1.6}
  .aro{fill:none;stroke:#c0c6cf;stroke-width:1.2}
  .eixo{stroke:#c8ccd2;stroke-width:1;stroke-dasharray:9 4 2 4}
  .cota{stroke:#b3593d;stroke-width:1}
  .cotat{fill:#b3593d;font-size:11px}
  .lm{fill:#1f6f5c}
  .lmt{fill:#1f6f5c;font-size:9.5px}
  .tit{fill:#12233b;font-size:14px;font-weight:600}
  .sub{fill:#6b7481;font-size:11px}
  .car{fill:none;stroke:#b3593d;stroke-width:1.8;stroke-dasharray:6 3}
</style>`);

put(`<text x="70" y="34" class="tit">Chassi P0 — prancha ortográfica alvo</text>`);
put(`<text x="70" y="52" class="sub">Alvo declarado antes da geometria. Milímetros. x = largura, y = altura, z = frente positiva. Escala 1:6,25.</text>`);

/* ---- vista lateral ---- */
put(`<text x="${LAT.x}" y="${LAT.y - 10}" class="sub">LATERAL — plano x = 0, frente à direita</text>`);
put(`<line class="eixo" x1="${latX(Z_MIN) - 20}" y1="${latY(0)}" x2="${latX(Z_MAX) + 20}" y2="${latY(0)}"/>`);
put(`<path class="corpo" d="${suave(PERFIL_SUPERIOR.map(([z, y]) => [latX(z), latY(y)]))}"/>`);
for (const seg of PERFIL_INFERIOR) {
  put(`<path class="corpo" d="${suave(seg.map(([z, y]) => [latX(z), latY(y)]))}"/>`);
}
for (const r of [RODA.dianteira, RODA.traseira]) {
  put(`<circle class="pneu" cx="${latX(r.z)}" cy="${latY(r.raio)}" r="${n(r.raio * S)}"/>`);
  put(`<circle class="aro" cx="${latX(r.z)}" cy="${latY(r.raio)}" r="${n(r.raio * S * 0.74)}"/>`);
  put(`<path class="arco" d="M ${latX(r.z - r.arco)} ${latY(r.raio)} A ${n(r.arco * S)} ${n(r.arco * S)} 0 0 1 ${latX(r.z + r.arco)} ${latY(r.raio)}"/>`);
}
/* linha de ombro projetada na lateral — curva mestra 3 */
put(`<path class="car" d="${suave([[1325, 900], [700, 935], [0, 950], [-900, 930], [-1500, 900]].map(([z, y]) => [latX(z), latY(y)]))}"/>`);

/* cotas da lateral */
const cotaY = latY(0) + 34;
put(`<line class="cota" x1="${latX(RODA.traseira.z)}" y1="${cotaY}" x2="${latX(RODA.dianteira.z)}" y2="${cotaY}"/>`);
put(`<text x="${(latX(-1325) + latX(1325)) / 2}" y="${cotaY - 5}" class="cotat" text-anchor="middle">entre-eixos 2650</text>`);
const cotaY2 = cotaY + 24;
put(`<line class="cota" x1="${latX(Z_MIN)}" y1="${cotaY2}" x2="${latX(Z_MAX)}" y2="${cotaY2}"/>`);
put(`<text x="${(latX(Z_MIN) + latX(Z_MAX)) / 2}" y="${cotaY2 - 5}" class="cotat" text-anchor="middle">comprimento 4600</text>`);
put(`<line class="cota" x1="${latX(Z_MAX) + 30}" y1="${latY(0)}" x2="${latX(Z_MAX) + 30}" y2="${latY(1190)}"/>`);
put(`<text x="${latX(Z_MAX) + 34}" y="${latY(600)}" class="cotat">altura 1190</text>`);
put(`<text x="${latX(480) + 6}" y="${latY(1080)}" class="cotat">para-brisa 73°</text>`);

/* ---- vista frontal ---- */
put(`<text x="${FRT.x}" y="${FRT.y - 10}" class="sub">FRONTAL — vista ao longo de z</text>`);
put(`<line class="eixo" x1="${frtX(0)}" y1="${frtY(1190) - 20}" x2="${frtX(0)}" y2="${frtY(0) + 20}"/>`);
put(`<line class="eixo" x1="${frtX(-X_MAX) - 16}" y1="${frtY(0)}" x2="${frtX(X_MAX) + 16}" y2="${frtY(0)}"/>`);
const frtDir = FRONTAL.map(([y, w]) => [frtX(w), frtY(y)]);
const frtEsq = [...FRONTAL].reverse().map(([y, w]) => [frtX(-w), frtY(y)]);
put(`<path class="corpo" d="${suave(frtDir)}"/>`);
put(`<path class="corpo" d="${suave(frtEsq)}"/>`);
put(`<path class="corpo" d="M ${frtX(-860)} ${frtY(105)} L ${frtX(860)} ${frtY(105)}"/>`);
put(`<path class="corpo" d="M ${frtX(-625)} ${frtY(1185)} L ${frtX(625)} ${frtY(1185)}"/>`);
for (const s of [-1, 1]) {
  const r = RODA.dianteira;
  put(`<rect class="pneu" x="${frtX(s * r.x - 122)}" y="${frtY(r.raio * 2)}" width="${n(245 * S)}" height="${n(r.raio * 2 * S)}" rx="6"/>`);
}
put(`<line class="cota" x1="${frtX(-965)}" y1="${frtY(0) + 34}" x2="${frtX(965)}" y2="${frtY(0) + 34}"/>`);
put(`<text x="${frtX(0)}" y="${frtY(0) + 29}" class="cotat" text-anchor="middle">ombro dianteiro 1930</text>`);
put(`<line class="cota" x1="${frtX(-830)}" y1="${frtY(0) + 56}" x2="${frtX(830)}" y2="${frtY(0) + 56}"/>`);
put(`<text x="${frtX(0)}" y="${frtY(0) + 51}" class="cotat" text-anchor="middle">bitola diant. 1660</text>`);

/* ---- planta ---- */
put(`<text x="${PLN.x}" y="${PLN.y - 10}" class="sub">SUPERIOR — planta, frente à direita</text>`);
put(`<line class="eixo" x1="${plnX(Z_MIN) - 20}" y1="${plnY(0)}" x2="${plnX(Z_MAX) + 20}" y2="${plnY(0)}"/>`);
put(`<path class="corpo" d="${suave(PLANTA.map(([z, w]) => [plnX(z), plnY(w)]))}"/>`);
put(`<path class="corpo" d="${suave(PLANTA.map(([z, w]) => [plnX(z), plnY(-w)]))}"/>`);
put(`<path class="corpo" d="M ${plnX(2200)} ${plnY(300)} Q ${plnX(2265)} ${plnY(0)} ${plnX(2200)} ${plnY(-300)}"/>`);
put(`<path class="corpo" d="M ${plnX(-2335)} ${plnY(660)} L ${plnX(-2335)} ${plnY(-660)}"/>`);
for (const r of [RODA.dianteira, RODA.traseira]) {
  const larg = r === RODA.dianteira ? 245 : 305;
  for (const s of [-1, 1]) {
    put(`<rect class="pneu" x="${plnX(r.z - r.raio)}" y="${plnY(s * r.x - larg / 2)}" width="${n(r.raio * 2 * S)}" height="${n(larg * S)}" rx="5"/>`);
  }
}
put(`<line class="cota" x1="${plnX(Z_MIN) - 34}" y1="${plnY(-980)}" x2="${plnX(Z_MIN) - 34}" y2="${plnY(980)}"/>`);
put(`<text x="${plnX(Z_MIN) - 40}" y="${plnY(0) - 8}" class="cotat" text-anchor="middle" transform="rotate(-90 ${plnX(Z_MIN) - 40} ${plnY(0) - 8})">largura máx. 2000</text>`);
put(`<line class="cota" x1="${plnX(-1325 - 840)}" y1="${plnY(X_MAX) + 30}" x2="${plnX(-1325 + 840)}" y2="${plnY(X_MAX) + 30}"/>`);
put(`<text x="${plnX(-1325)}" y="${plnY(X_MAX) + 25}" class="cotat" text-anchor="middle">bitola tras. 1680</text>`);

/* ---- landmarks ---- */
for (const [id, , x, y, z] of LANDMARKS) {
  const noPlano = x === 0;
  if (noPlano || ['L14', 'L15'].includes(id)) {
    put(`<circle class="lm" cx="${latX(z)}" cy="${latY(y)}" r="2.6"/>`);
    const dy = z < Z_MIN + 300 ? -12 : -6;
    put(`<text class="lmt" x="${latX(z) + 6}" y="${latY(y) + dy}">${id}</text>`);
  } else {
    put(`<circle class="lm" cx="${plnX(z)}" cy="${plnY(x)}" r="2.6"/>`);
    put(`<text class="lmt" x="${plnX(z) + 5}" y="${plnY(x) - 5}">${id}</text>`);
    put(`<circle class="lm" cx="${latX(z)}" cy="${latY(y)}" r="2.6" opacity="0.45"/>`);
  }
}

/* ---- legenda ---- */
const lx = 900, ly = 420;
put(`<text x="${lx}" y="${ly}" class="sub">LEGENDA</text>`);
const itens = [
  ['#12233b', 'silhueta alvo — curvas mestras 1, 2 e 4'],
  ['#b3593d', 'linha de ombro (curva mestra 3) e cotas'],
  ['#8a94a2', 'roda: 680 mm diant., 716 mm tras.'],
  ['#1f6f5c', 'landmarks L01–L15, tolerância 6 mm'],
];
itens.forEach(([cor, txt], i) => {
  const y = ly + 22 + i * 20;
  put(`<line x1="${lx}" y1="${y - 4}" x2="${lx + 22}" y2="${y - 4}" stroke="${cor}" stroke-width="2.2"/>`);
  put(`<text x="${lx + 30}" y="${y}" class="sub">${txt}</text>`);
});
put(`<text x="${lx}" y="${ly + 128}" class="sub">Fonte: CHASSI-P0-ALVO-E-LIMIARES.md</text>`);
put(`<text x="${lx}" y="${ly + 146}" class="sub">Alvo, não geometria. Nenhuma peça foi modelada.</text>`);
put(`</svg>`);

mkdirSync(path.dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, O.join('\n') + '\n');
console.log(`prancha-chassi-p0: ${path.relative(REPO, SAIDA)} (${ENVELOPE.comprimento}×${ENVELOPE.largura}×${ENVELOPE.altura} mm)`);
