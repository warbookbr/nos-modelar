/* carcaca-traseira.esboco.mjs — o rascunho da traseira da carcaça (capô, tampa, grade e contrapeso) pelas três vistas.
 *
 * O contorno lateral de cada parte vem do mapa de partes da lateral (`carcaca-lado.ia.contornos.json`). A meia largura em cada altura e os
 * vãos foram medidos por cor na vista de trás (`carcaca-tras.ia.png`), linha a linha, em px dela; a altura dá a escala (topo da tampa a
 * 1.152 mm na linha 272, 4,03 mm/px). A planta é a curva da traseira medida na vista de cima. Os três corpos saem de
 * `lacosPelasVistas`: laços horizontais em que a ponta de trás acompanha a planta em toda altura.
 * Eixos: x lateral, y altura, z comprimento com a frente em +z (a traseira vai a z = -2178).
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a peça para os três quartos de trás. */
import { readFileSync } from 'node:fs';
import { gaiolaPorLacos } from '../../../nucleo/gaiola-por-lacos.js';
import { lacosPelasVistas } from '../../../nucleo/lacos-pelas-vistas.js';

const REGIOES = JSON.parse(readFileSync(new URL('./carcaca-lado.ia.contornos.json', import.meta.url), 'utf8')).regioes;
const MM = 4.03;
const FIM = 2178;
const H = (ypx) => Math.round((1152 - (ypx - 272) * MM) * 10) / 10;
const LARANJA = '#e2641e'; const CINZA_CLARO = '#73797d'; const CINZA = '#565b60'; const ESCURO = '#1c1e20';
const SINAL = { x: 1, y: 1, z: -1 };

/* Ramer-Douglas-Peucker sobre o anel, partido no ponto mais distante do primeiro */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [x1, y1] = pts[0]; const [x2, y2] = pts[pts.length - 1];
  const n = Math.hypot(x2 - x1, y2 - y1) || 1e-9;
  let dmax = 0; let idx = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const d = Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / n;
    if (d > dmax) { dmax = d; idx = i; }
  }
  return dmax > eps ? [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)] : [pts[0], pts[pts.length - 1]];
}
function simplifica(c, eps = 6) {
  let longe = 0;
  c.forEach((p, i) => { if (Math.hypot(p[0] - c[0][0], p[1] - c[0][1]) > Math.hypot(c[longe][0] - c[0][0], c[longe][1] - c[0][1])) longe = i; });
  return [...rdp(c.slice(0, longe + 1), eps).slice(0, -1), ...rdp([...c.slice(longe), c[0]], eps).slice(0, -1)];
}
const area = (p) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2;
const r1 = (v) => Math.round(v * 10) / 10;

/** O contorno lateral da parte em [c, a]: c é o z do modelo (a frente em +z) e a, a altura; `ajuste` acerta um ponto [z, y] da lateral. */
function lado(regiao, ajuste = (p) => p) {
  const c = simplifica(REGIOES[regiao].contornoMm).map(ajuste);
  return c.filter((p, i) => { const q = c[(i + c.length - 1) % c.length]; return p[0] !== q[0] || p[1] !== q[1]; }).map(([z, y]) => [-z, y]);
}

const passos = []; const topo = {}; let origem = 0;
function extrusao(eixo, perfil, em, altura) {
  origem += 1;
  let p = perfil.map(([u, v]) => [r1(u), r1(v)]);
  if ((area(p) > 0) !== (SINAL[eixo] > 0)) p = p.reverse();
  passos.push(['extrusao', { origemId: origem, eixo, altura: r1(altura), perfil: p, em: em.map(r1) }]);
  return { origem: { op: 'extrusao', id: origem } };
}
const extX = (zy, x0, x1) => extrusao('x', zy.map(([z, y]) => [-y, z]), [x0, 0, 0], x1 - x0);
const extY = (xz, y0, y1) => extrusao('y', xz, [0, y0, 0], y1 - y0);
const extZ = (xy, z0, z1) => extrusao('z', xy.map(([x, y]) => [x, -y]), [0, 0, Math.min(z0, z1)], Math.abs(z1 - z0));
function booleana(op, solidos) {
  origem += 1;
  passos.push([op, { origemId: origem, solidos }]);
  return { origem: { op, id: origem } };
}
function parte(nome, sel, cor) {
  passos.push(['parte', { nome, sel }], ['pincel', { modo: 'face', sel, cor }], ['liso', { sel, angulo: 35 }]);
}
/** O corpo de `lacosPelasVistas`, subdividido. Sem `compensar`: nestes laços ela passou de 10 a 30 mm do pedido e ondulou o capô. */
function corpo(nome, vistas, extra = {}) {
  const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas(vistas);
  const g = gaiolaPorLacos({ nome, eixo: 'y', ...lacos, ...extra });
  Object.assign(topo, g.pontosMm);
  origem += 1;
  passos.push(['subdivisao', { origemId: origem, ...g.passo, niveis: 2 }]);
  return { origem: { op: 'subdivisao', id: origem } };
}

/* (linha em px, meia largura em px) de baixo para cima -> [altura, meia largura] em mm, e o polígono simétrico (x, y) */
/* a face da frente de cada corpo é plana e fica escondida no conjunto: as duas quinas dela levam vinco */
export const QUINAS = { vincos: [{ nome: 'quinaDireita', entre: ['direita', 'fim'], nitidez: 'viva' }, { nome: 'quinaEsquerda', entre: ['fim', 'esquerda'], nitidez: 'viva' }] };

const perfil = (meias) => meias.map(([y, w]) => [H(y), w * MM]);
const simetrico = (meias) => [...meias.map(([y, w]) => [w * MM, H(y)]), ...[...meias].reverse().map(([y, w]) => [-w * MM, H(y)])];

/* a curva da traseira na vista de cima: (recuo a partir da ponta, fração da meia largura) */
const ARRED = [[233, 1], [221, 0.98], [205, 0.969], [189, 0.945], [173, 0.916], [157, 0.885], [141, 0.84], [125, 0.785], [109, 0.728],
  [93, 0.669], [77, 0.609], [61, 0.538], [45, 0.462], [29, 0.366], [13, 0.256], [0, 0.129]];
function plantaTraseira(meia, frente) {
  const d = [[meia, -frente], ...ARRED.map(([dz, f]) => [meia * f, -(FIM - dz)])];
  return [...d, ...[...d].reverse().map(([x, z]) => [-x, z])];
}
function zDaTraseira(x, meia) {
  const f = Math.min(1, Math.abs(x) / meia);
  const pts = ARRED.map(([dz, ff]) => [ff, dz]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < pts.length; i += 1) {
    if (f >= pts[i - 1][0] && f <= pts[i][0]) return -(FIM - (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (f - pts[i - 1][0]) / ((pts[i][0] - pts[i - 1][0]) || 1)));
  }
  return -FIM;
}
/* a faixa em planta que acompanha a borda de trás, entre `de` e `ate` mm para dentro dela */
function tira(x0, x1, meia, de, ate) {
  const borda = Array.from({ length: 13 }, (_, k) => x0 + (x1 - x0) * k / 12).map((x) => [x, zDaTraseira(x, meia)]);
  return [...borda.map(([x, z]) => [x, z + de]), ...[...borda].reverse().map(([x, z]) => [x, z + ate])];
}

/* perfis da vista de trás, com o centro na coluna 536 */
const CAPO = [[401, 140], [398, 145], [394, 148], [370, 148], [350, 147], [334, 146], [330, 145], [326, 142], [322, 140], [314, 139],
  [306, 138], [298, 137], [294, 135], [290, 131], [286, 127], [283, 119], [281, 106]];
const TAMPA = [[318, 100], [314, 101.5], [284, 101.5], [279, 100], [276, 96], [274, 88], [272, 76]];
const VAO_GRADE = [[361, 70], [360, 80], [358, 87], [354, 92], [350, 94], [342, 96], [334, 98], [326, 99], [318, 101], [312, 101]];
const FUROS_GRADE = [
  [[-70, 320], [70, 320], [65.5, 336], [-65.5, 336]],
  [[-64.5, 340], [64.5, 340], [60, 358], [-60, 358]],
  [[74, 319], [97, 319], [91, 350], [86, 356], [66, 356]],
  [[-74, 319], [-97, 319], [-91, 350], [-86, 356], [-66, 356]],
];
const CONTRA = [[505, 92], [503, 98], [499, 100.5], [486, 101], [478, 103], [470, 105], [462, 107.5], [454, 110.5], [446, 114],
  [438, 119], [430, 125.5], [424, 131], [419, 137], [417, 141], [415, 143.5], [400, 143.5]];
const PONTA_DO_CAPO = 2172;  // o extremo de trás da silhueta do capô, no bico
const TOPO_CAPO = 1112;      // os ombros do capô, na linha 282 da vista de trás
const TOPO_CONTRA = 645;     // o contrapeso acaba reto, 12 mm para dentro do capô, e a divisa fica fechada; a cunha que sobe atrás fica de fora

/* capô: o casco laranja, com o vão da grade ------------------------------------------------------------------------------------
   O degrau que a lateral mostra acima do bico não é do laranja: é a soleira do vão da grade. Acima dela, o que a lateral vê de mais
   recuado é a borda do vão, que fica aquém da ponta pelo recuo da planta naquela largura (55 a 95 mm). A seção do meio do capô é
   então a silhueta lateral mais esse recuo, sem degrau, e o vão é que a corta. */
const meiaCapo = 148 * MM;
const recuoDaPlanta = (x) => FIM + zDaTraseira(x, meiaCapo);
const interpolar = (tabela, v) => {
  if (v <= tabela[0][0]) return tabela[0][1];
  for (let i = 1; i < tabela.length; i += 1) if (v <= tabela[i][0]) return tabela[i - 1][1] + (tabela[i][1] - tabela[i - 1][1]) * (v - tabela[i - 1][0]) / (tabela[i][0] - tabela[i - 1][0]);
  return tabela[tabela.length - 1][1];
};
/* o vão vai da soleira da grade ao topo: sob a tampa o capô é aberto, e a aba dela cobre a traseira */
const VAO = [...VAO_GRADE, [281, 101.5], [268, 101.5]];
const meiaDoVao = (y) => interpolar(perfil(VAO), y);
const secaoDoMeio = ([z, y]) => (z > 1970 && y >= 800 ? [Math.min(z + recuoDaPlanta(meiaDoVao(y)), PONTA_DO_CAPO - 6), y] : [z, y]);
export const VISTAS_DO_CAPO = {
  lado: lado('capo', ([z, y]) => secaoDoMeio([z, y > 1100 ? TOPO_CAPO : y])),
  perfil: perfil(CAPO), planta: plantaTraseira(meiaCapo, 1400),
  estacoes: [632.5, 650, 666, 720, 790, 850, 910, 980, 1030, 1075, 1100, TOPO_CAPO],
};
let capo = corpo('capo', VISTAS_DO_CAPO, QUINAS);
capo = booleana('subtrair', [capo, extZ(simetrico(VAO.map(([y, w]) => [y, w + 1])), -1950, -2300)]);
parte('capo', capo, LARANJA);

/* grade: a moldura cinza em U apoiada na rampa do vão (de z 2058 a y 980 até z 2110 a y 812, na lateral), e o fundo escuro -------- */
const rampa = (de, ate) => [[-(2052 + de), 990], [-(2052 + ate), 990], [-(2112 + ate), 795], [-(2112 + de), 795]];
const u = simetrico(VAO_GRADE);
const placa = (de, ate) => booleana('intersectar', [extZ(u, -1900, -2300), extX(rampa(de, ate), -450, 450)]);
const furos = FUROS_GRADE.map((f) => extZ(f.map(([x, y]) => [x * MM, H(y)]), -1900, -2300));
parte('grade', booleana('subtrair', [placa(-40, 14), ...furos]), CINZA_CLARO);
parte('fundoGrade', placa(-95, -70), ESCURO);

/* tampa: o painel central com a aba de trás ------------------------------------------------------------------------------------ */
const meiaTampa = 101.5 * MM;
const bordaDaTampa = [0, 0.25, 0.5, 0.7, 0.85, 0.95, 1].map((f) => [f, 2142 - 75 * f * f - (f === 1 ? 45 : 0)]);
const plantaDaTampa = [[meiaTampa, -1490], ...[...bordaDaTampa].reverse().map(([f, z]) => [meiaTampa * f, -z]),
  ...bordaDaTampa.slice(1).map(([f, z]) => [-meiaTampa * f, -z]), [-meiaTampa, -1490]];
const tampa = corpo('tampa', {
  lado: lado('tampa', ([z, y]) => [z, y > 1140 ? 1150 : (y > 1100 && y < 1125 ? TOPO_CAPO : y)]),
  perfil: perfil(TAMPA), planta: plantaDaTampa,
  estacoes: [985, 1000, 1050, 1090, 1107, 1117, 1135, 1150],
}, QUINAS);
parte('tampa', tampa, CINZA_CLARO);

/* contrapeso: a faixa de cima larga e os lados côncavos ---------------------------------------------------------------------- */
const meiaContra = 143.5 * MM;
let contra = corpo('contrapeso', {
  lado: lado('contrapeso', ([z, y]) => [z > 2100 && y > 600 ? 2150 : z, y > 620 || (z > 2100 && y > 600) ? TOPO_CONTRA : (y < 245 ? 221 : y)]),
  perfil: perfil(CONTRA), planta: plantaTraseira(meiaContra, 1700),
  estacoes: [221.5, 250, 285, 329, 393, 424, 442, 507, 540, 572, 600, TOPO_CONTRA],
}, QUINAS);
const RASGO = { x0: -46, x1: 46, y0: 422, y1: 405, fundo: 90 };
const NICHO = { x0: -27, x1: 27, y0: 479, y1: 453, fundo: 95 };
const REBAIXOS = [{ x0: 105, x1: 118, y0: 415, y1: 404, fundo: 60 }, { x0: -118, x1: -105, y0: 415, y1: 404, fundo: 60 }, { x0: 26, x1: 46, y0: 500, y1: 487, fundo: 45 }];
const corte = (v, de, ate) => extY(tira(v.x0 * MM, v.x1 * MM, meiaContra, de, ate), H(v.y0), H(v.y1));
contra = booleana('subtrair', [contra, ...[RASGO, NICHO, ...REBAIXOS].map((v) => corte(v, v.fundo, -80))]);
parte('contrapeso', contra, CINZA);
parte('fundoRasgo', corte(RASGO, RASGO.fundo, RASGO.fundo - 12), ESCURO);
parte('fundoNicho', corte(NICHO, NICHO.fundo, NICHO.fundo - 12), ESCURO);
parte('pino', extY([[-10, -2152], [10, -2152], [10, -2128], [-10, -2128]], H(479), H(453)), CINZA);
parte('trinco', extY([[-30 * MM, -2186], [30 * MM, -2186], [30 * MM, -2150], [-30 * MM, -2150]], H(440), H(425)), CINZA);

if (process.env.GIRAR) passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -1830] }]);

export default {
  plano: 'Traseira da carcaça (capô, tampa, grade e contrapeso) pelas três vistas, com a ponta de trás acompanhando a planta.',
  vista: 'traseira',
  opcoes: [{ titulo: 'traseira pelas três vistas', nota: `capô com ${Math.round(2 * meiaCapo)} mm de largura`, passos, topo }],
};
