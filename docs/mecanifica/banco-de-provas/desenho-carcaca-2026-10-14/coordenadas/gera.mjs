/* gera.mjs — gera lateral.partes.json da carcaça da empilhadeira (vista lateral, frente à esquerda, base em v = 0) por coordenadas
   escritas à mão a partir só da DESCRICAO.md, sem imagem nem resolvedor. Cada parte é um polígono em milímetro; arcos, curvas e
   cantos arredondados viram pontos aqui. Uso: node gera.mjs, e depois o coordenadas.mjs da prova do braço sobre o JSON gravado. */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const L = 2150, H = 846;
const r1 = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

// Medidas tiradas da descrição, em fração do comprimento L e da altura H.
const xFace = 0.05 * L;            // paralama avança L/20 além da face da frente da lateral
const vFace = 0.555 * H;           // face da frente: pouco acima da metade da altura
const vFundo = H / 3;              // fundo do poço
const vCapoRampa = 0.75 * H;       // rampa encontra a face da frente do capô
const xCapo = 1600;                // capô: perto de um quarto do comprimento, terminando em xTras
const xTras = 2125;                // traseira do capô e do contrapeso; a tampa passa um pouco além, até L
const xRampa = xCapo - (vCapoRampa - vFundo) / Math.tan(Math.PI / 6); // rampa de 30 graus
const vArcoD = (2 / 3) * vFace;    // arco dianteiro começa a dois terços da altura do poço (a face da frente)
const xArcoDBase = xFace + L / 6;  // e chega à base um sexto do comprimento para trás da face
const rArcoD = 0.4 * H;
const xArcoT0 = L - (3 / 8) * L;   // arco traseiro: começa a 3/8 do comprimento a contar da traseira
const aArcoT = L / 8 / 2, bArcoT = 0.4 * H, cArcoT = xArcoT0 + aArcoT;
const vContra = 0.5 * H;           // contrapeso até perto da metade da altura
const vTampa = 786;                // espessura da tampa: 60 mm até o topo H

const rampa = (h) => vFundo + (h - xRampa) * Math.tan(Math.PI / 6);

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
const pFundo0 = [500, vFundo];
const ctlPoco = [xFace + (vFace - vFundo) / Math.tan(Math.PI / 3), vFundo];
const curvaPoco = bezier([xFace, vFace], ctlPoco, pFundo0, 16);

// Frente do contrapeso: sobe pelo lado de trás do arco traseiro até v = 300 e curva até o topo dele.
const tCorte = Math.asin(300 / bArcoT);
const ladoTrasArco = Array.from({ length: 11 }, (_, i) => elipseT(tCorte * i / 10)); // da base (t=0) até v=300
const pCorte = ladoTrasArco.at(-1);
const curvaContra = bezier(pCorte, [pCorte[0] + 2, 400], [xCapo, vContra], 8); // de v=300 até o topo do contrapeso

const lateral = [
  [xFace, vArcoD],
  ...curvaPoco,
  [xRampa, vFundo],
  [xCapo, vCapoRampa],
  ...curvaContra.slice().reverse(),
  ...Array.from({ length: 25 }, (_, i) => elipseT(tCorte + (Math.PI - tCorte) * i / 24)).slice(1),
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
deslocada[deslocada.length - 1] = [xRampa + espPiso / Math.tan(Math.PI / 6), vFundo + espPiso]; // o piso termina encostado no pé da rampa
const piso = [...linhaPiso.slice().reverse(), ...deslocada];

const paralama = [[0, vFace - 0.04 * L], [xFace, vFace - 0.04 * L], [xFace, vFace], [0, vFace]];

const xEncosto = L / 2;
const vEncosto = 760;
const encosto = arredondar([[xEncosto, rampa(xEncosto)], [xCapo, vCapoRampa], [xCapo, vEncosto], [xEncosto, vEncosto]], [55, 30, 110, 110]);

const capo = arredondar([
  [xCapo, vContra], [xTras - 20, vContra], [xTras - 20, vContra + 55], [xTras, vContra + 55], [xTras, vTampa], [xCapo, vTampa],
], [0, 0, 0, 0, 90, 0]);

const tampa = arredondar([[xCapo - 12, vTampa], [L, vTampa], [L, H], [xCapo - 12, H]], [22, 22, 22, 22], 5);

// base (atrás do arco) → traseira quase vertical → topo → curva da frente descendo até o arco
const contra = [ladoTrasArco[0], [xTras - 10, 0], [xTras, vContra], ...curvaContra.slice().reverse(), ...ladoTrasArco.slice(1, -1).reverse()];

const d = {
  objeto: 'carcaca-lateral',
  vista: 'lateral',
  frenteParaFundo: ['paralama', 'piso', 'encosto', 'tampa', 'capo', 'contrapeso', 'lateral'],
  partes: Object.fromEntries(Object.entries({ lateral, paralama, piso, encosto, capo, tampa, contrapeso: contra }).map(([k, v]) => [k, v.map(r1)])),
};
const saida = resolve(new URL('.', import.meta.url).pathname, 'lateral.partes.json');
writeFileSync(saida, `${JSON.stringify(d, null, 1)}\n`);
const total = Object.values(d.partes).reduce((s, p) => s + p.length, 0);
console.log(`gravado ${saida}: ${Object.keys(d.partes).length} partes, ${total} pontos`);
