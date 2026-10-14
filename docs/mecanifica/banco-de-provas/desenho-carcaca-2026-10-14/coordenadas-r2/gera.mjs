/* gera.mjs — gera lateral.partes.json da carcaça da empilhadeira (vista lateral, frente à esquerda, base em v = 0) por coordenadas
   escritas à mão a partir só da DESCRICAO.md, sem imagem nem resolvedor. Cada parte é um polígono em milímetro; arcos, curvas e
   cantos arredondados viram pontos aqui. Rodada de correção (r2), a partir da primeira. Uso: node gera.mjs, e depois o coordenadas.mjs da prova do braço sobre o JSON gravado. */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const L = 2150, H = 846;
const r1 = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

// Medidas da descrição, corrigidas pela crítica da primeira rodada, em fração do comprimento L e da altura H.
const xFace = 0.095 * L;           // paralama avança 9,5% de L além da face da frente da lateral
const vFace = 0.555 * H;           // topo da face da frente: pouco acima da metade da altura
const espParalama = 0.02 * H;      // paralama é chapa fina
const vArcoD = vFace - 2.4 * 156.5; // face da frente 2,4 vezes mais alta que na primeira rodada
const xArcoDBase = xFace + 0.6 * 358.3; // arco dianteiro avança 0,6 do que avançava
const rArcoD = 0.4 * H;
const vFundo = 0.73 * 282;         // fundo do poço mais baixo
const angRampa = 37 * Math.PI / 180;
const xRampa = 0.40 * L;           // rampa começa a 40% de L
const xTopoRampa = 0.63 * L;       // e chega ao topo a 63% de L
const vOmbro = vFundo + (xTopoRampa - xRampa) * Math.tan(angRampa);
const xBloco = 0.73 * L;           // ombro plano até o bloco traseiro
const vCostura = 616;              // costura de baixo do capô (capô com 0,44 da altura da primeira rodada)
const vTampa = 776;                // tampa grossa, 70 mm até o topo H
// Arco traseiro largo e arredondado, sob a frente do bloco traseiro.
const aArcoT = 1.75 * (L / 8) / 2, bArcoT = 330, cArcoT = 1635;
const vBlocoBase = bArcoT;         // o bloco traseiro de cima termina na altura do topo do arco
// Face traseira inclinada com o topo recuado e um degrau na costura do capô.
const xTrasBaixo = L, xTrasCostura = 2100, xCapoCostura = 2070, xTampaTopo = 2025;
const xTrasCapo = (v) => xCapoCostura - (xCapoCostura - xTampaTopo) * (v - vCostura) / (H - vCostura);

function bezier(p0, c, p2, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * p0[0] + 2 * s * t * c[0] + t * t * p2[0], s * s * p0[1] + 2 * s * t * c[1] + t * t * p2[1]]); }
  return out;
}
// Arco de círculo de a até b, centro c, pelo menor ângulo.
function arco(c, a, b, n) {
  const r = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const t0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
  let t1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
  let d = t1 - t0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
  return Array.from({ length: n + 1 }, (_, i) => [c[0] + r * Math.cos(t0 + d * i / n), c[1] + r * Math.sin(t0 + d * i / n)]);
}
// Ponto do arco traseiro (semielipse) no ângulo t, 0 = traseira na base, PI = frente na base.
const elipseT = (t) => [cArcoT + aArcoT * Math.cos(t), bArcoT * Math.sin(t)];
// Polígono com cantos arredondados: raios[i] é o raio no vértice i (0 deixa vivo).
function arredondar(pts, raios, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length], r = raios[i];
    if (!r) { out.push(p); continue; }
    const u = norm([a[0] - p[0], a[1] - p[1]]), w = norm([b[0] - p[0], b[1] - p[1]]);
    const ang = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1])));
    const t = r / Math.tan(ang / 2), bis = norm([u[0] + w[0], u[1] + w[1]]), dc = r / Math.sin(ang / 2);
    const c = [p[0] + bis[0] * dc, p[1] + bis[1] * dc];
    out.push(...arco(c, [p[0] + u[0] * t, p[1] + u[1] * t], [p[0] + w[0] * t, p[1] + w[1] * t], n));
  }
  return out;
}
function norm(v) { const m = Math.hypot(v[0], v[1]); return [v[0] / m, v[1] / m]; }

// Centro do arco dianteiro: raio rArcoD pelos dois pontos, do lado de fora da chapa (embaixo à esquerda).
function centroArcoD() {
  const a = [xFace, vArcoD], b = [xArcoDBase, 0];
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ch = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = Math.sqrt(rArcoD ** 2 - (ch / 2) ** 2), dir = norm([b[0] - a[0], b[1] - a[1]]), nrm = [-dir[1], dir[0]];
  const c1 = [m[0] + nrm[0] * d, m[1] + nrm[1] * d], c2 = [m[0] - nrm[0] * d, m[1] - nrm[1] * d];
  return c1[1] < c2[1] ? c1 : c2;
}

// Borda de cima da lateral na frente: face vertical, curva até o fundo do poço (tangente inicial a 60 graus para baixo).
const pFundo0 = [480, vFundo];
const ctlPoco = [xFace + (vFace - vFundo) / Math.tan(Math.PI / 3), vFundo];
const curvaPoco = bezier([xFace, vFace], ctlPoco, pFundo0, 16);

// Arco traseiro: t do topo (PI/2) até onde cruza a frente do bloco, e da frente do bloco até a base dianteira (t = PI).
const tBloco = Math.acos((xBloco - cArcoT) / aArcoT);
const arcoT = (t0, t1, n) => Array.from({ length: n + 1 }, (_, i) => elipseT(t0 + (t1 - t0) * i / n));

const lateral = [
  [xFace, vArcoD],
  ...curvaPoco,
  [xRampa, vFundo],
  [xTopoRampa, vOmbro],
  [xBloco, vOmbro],
  ...arcoT(tBloco, Math.PI, 16),
  [xArcoDBase, 0],
  ...arco(centroArcoD(), [xArcoDBase, 0], [xFace, vArcoD], 20).slice(1, -1),
];

const espPiso = 35;
const vAnteparo = (2 / 3) * H;
const xAnteparo = xFace - (vAnteparo - vFace) / Math.tan(Math.PI / 3); // continua a tangente da curva, inclinado para a esquerda
const linhaPiso = [[xAnteparo, vAnteparo], ...curvaPoco, [xRampa, vFundo]];
// Deslocamento para cima e para a direita (lado de dentro do poço), pela normal média em cada ponto.
const deslocada = linhaPiso.map((p, i) => {
  const a = linhaPiso[Math.max(0, i - 1)], b = linhaPiso[Math.min(linhaPiso.length - 1, i + 1)];
  const t = norm([b[0] - a[0], b[1] - a[1]]), n = [-t[1], t[0]]; // à esquerda do sentido de percurso = para cima/direita
  return [p[0] + n[0] * espPiso, p[1] + n[1] * espPiso];
});
deslocada[deslocada.length - 1] = [xRampa + espPiso / Math.tan(angRampa), vFundo + espPiso]; // o piso termina encostado no pé da rampa
const piso = [...linhaPiso.slice().reverse(), ...deslocada];

const paralama = [[0, vFace - espParalama], [xFace, vFace - espParalama], [xFace, vFace], [0, vFace]];

// Encosto: topo como antes, base alta flutuando sobre o poço, altura 0,75 da primeira rodada; termina antes do ombro.
const xEncosto = L / 2, xEncostoTras = 1385;
const vEncosto = 760, vEncostoBase = vEncosto - 0.75 * 388;
const encosto = arredondar([[xEncosto, vEncostoBase], [xEncostoTras, vEncostoBase], [xEncostoTras, vEncosto], [xEncosto, vEncosto]], [70, 50, 90, 110]);

// Degrau cinza escalonado sobre o ombro, entre o encosto e o bloco traseiro.
const degrau = [[1450, vOmbro], [xBloco, vOmbro], [xBloco, 675], [1510, 675], [1510, 625], [1450, 625]];

// Capô baixo, da costura até a tampa, com a traseira inclinada; recortado onde a aba da tampa desce.
const vAba = 705, xAbaFrente = 1990;
const capo = [
  [xBloco, vCostura], [xCapoCostura, vCostura], [xTrasCapo(vAba), vAba], [xAbaFrente, vAba], [xAbaFrente - 5, vTampa], [xBloco, vTampa],
];

// Tampa grossa, sem passar do bloco, com a aba que desce na traseira.
const xTampa = xTrasCapo(vAba) - 0.75 * 562;
const tampa = arredondar([
  [xTampa, vTampa], [xAbaFrente - 5, vTampa], [xAbaFrente, vAba], [xTrasCapo(vAba), vAba], [xTampaTopo, H], [xTampa, H],
], [18, 0, 8, 6, 22, 22], 5);

// Contrapeso: bloco traseiro de cima, da costura do capô até o topo do arco, com degrau para fora e traseira inclinada.
const contra = [
  [xBloco, vCostura], ...arcoT(tBloco, Math.PI / 2, 6), [xTrasBaixo, vBlocoBase], [xTrasCostura, vCostura],
];

// Fecho cinza atrás do arco traseiro, da base do bloco até a base.
const fecho = [...arcoT(Math.PI / 2, 0, 14), [xTrasBaixo - 15, 0], [xTrasBaixo, 30], [xTrasBaixo, vBlocoBase]];

const d = {
  objeto: 'carcaca-lateral',
  vista: 'lateral',
  frenteParaFundo: ['paralama', 'piso', 'encosto', 'degrau', 'tampa', 'capo', 'fecho', 'contrapeso', 'lateral'],
  partes: Object.fromEntries(Object.entries({ lateral, paralama, piso, encosto, degrau, capo, tampa, contrapeso: contra, fecho }).map(([k, v]) => [k, v.map(r1)])),
};
const saida = resolve(new URL('.', import.meta.url).pathname, 'lateral.partes.json');
writeFileSync(saida, `${JSON.stringify(d, null, 1)}\n`);
const total = Object.values(d.partes).reduce((s, p) => s + p.length, 0);
console.log(`gravado ${saida}: ${Object.keys(d.partes).length} partes, ${total} pontos`);
