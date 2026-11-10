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

/** As ferramentas que escrevem passos num estado { passos, topo, origem }: o contador de origem é do estado, para que dois módulos
 *  possam escrever na mesma lista sem repetir id. */
export function ferramentas(estado) {
  function extrusao(eixo, perfil, em, altura) {
    estado.origem += 1;
    let p = perfil.map(([u, v]) => [r1(u), r1(v)]);
    if ((area(p) > 0) !== (SINAL[eixo] > 0)) p = p.reverse();
    estado.passos.push(['extrusao', { origemId: estado.origem, eixo, altura: r1(altura), perfil: p, em: em.map(r1) }]);
    return { origem: { op: 'extrusao', id: estado.origem } };
  }
  const extX = (zy, x0, x1) => extrusao('x', zy.map(([z, y]) => [-y, z]), [x0, 0, 0], x1 - x0);
  const extY = (xz, y0, y1) => extrusao('y', xz, [0, y0, 0], y1 - y0);
  const extZ = (xy, z0, z1) => extrusao('z', xy.map(([x, y]) => [x, -y]), [0, 0, Math.min(z0, z1)], Math.abs(z1 - z0));
  function booleana(op, solidos) {
    estado.origem += 1;
    estado.passos.push([op, { origemId: estado.origem, solidos }]);
    return { origem: { op, id: estado.origem } };
  }
  function parte(nome, sel, cor) {
    estado.passos.push(['parte', { nome, sel }], ['pincel', { modo: 'face', sel, cor }], ['liso', { sel, angulo: 35 }]);
  }
  /** O corpo de `lacosPelasVistas`, subdividido. Sem `compensar`: nestes laços ela passou de 10 a 30 mm do pedido e ondulou o capô. */
  function corpo(nome, vistas, extra = {}) {
    const { meiaPlanta, avisos, ...lacos } = lacosPelasVistas(vistas);
    const g = gaiolaPorLacos({ nome, eixo: 'y', ...lacos, ...extra });
    Object.assign(estado.topo, g.pontosMm);
    estado.origem += 1;
    estado.passos.push(['subdivisao', { origemId: estado.origem, ...g.passo, niveis: 2 }]);
    return { origem: { op: 'subdivisao', id: estado.origem } };
  }
  return { extrusao, extX, extY, extZ, booleana, parte, corpo };
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
/* o capô: o canto de baixo quase vivo, o degrau do flanco entre as linhas 330 e 326 e o ombro chanfrado, com o topo plano a 117 px */
const CAPO = [[401, 143], [398, 146], [394, 148], [370, 148], [350, 147], [334, 146], [330, 145], [326, 142], [322, 140], [314, 139],
  [306, 138], [298, 136], [290, 131], [286, 127], [283, 121], [281.9, 117]];
const TAMPA = [[318, 92], [316.5, 98], [313, 101.5], [284, 101.5], [278, 100], [275, 96], [273, 90], [272, 84]];
const VAO_GRADE = [[361.5, 58], [361, 70], [360, 79], [358.5, 85.5], [356.5, 89.5], [354, 92], [350, 94], [342, 96], [334, 98], [326, 99], [318, 101], [306, 101]];
/* os furos começam sob a aba da tampa (linha 313) e têm o canto de baixo de fora redondo, como o vão */
const FUROS_GRADE = [
  [[-71.5, 313], [71.5, 313], [65.5, 336], [-65.5, 336]],
  [[-64.5, 339.5], [64.5, 339.5], [60, 358], [-60, 358]],
  [[75, 313], [98, 313], [96.5, 334], [94, 346], [91, 352], [87, 355.5], [82, 357.5], [66, 357.5]],
  [[-75, 313], [-98, 313], [-96.5, 334], [-94, 346], [-91, 352], [-87, 355.5], [-82, 357.5], [-66, 357.5]],
];
/* o contrapeso: o arco côncavo da roda e a faixa de cima reta, de 143,5 px, da linha 416 à 400. O alargamento que a referência
   mostra ao pé (111 px nas linhas 494 a 502) é a sombra do chão: com ele as linhas do modelo passavam 10 px por fora do corpo. */
const CONTRA = [[505.5, 92], [503.5, 98], [499, 100.5], [486, 101], [478, 103], [470, 105], [462, 107.5], [454, 110.5],
  [446, 114], [438, 119], [430, 125.5], [424, 131], [418.5, 137], [416.5, 143.5], [400, 143.5]];
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
/* A borda rebaixada em volta do vão (BORDA px de largura, 16 mm de fundo, em `montarTraseira`) tira a silhueta lateral da beira do
   vão: o que a lateral vê é a superfície cheia logo fora da borda. A seção do meio leva então o recuo da planta na largura do vão mais
   a borda, e o teto passa a 20 mm além do bico. Com o recuo só na largura do vão e o teto em PONTA_DO_CAPO - 6, o canto de cima e de
   trás do laranja ficava 17 a 45 mm aquém da referência na vista da direita (coluna 870 da lateral: laranja da linha 299 na
   referência e da 320 no rascunho; coluna 876: 317 e 351), a aba da tampa sobrava solta sobre um vão branco, e a borda de trás
   descia em degraus (leitura da direita, rodada 4, A4 e B4). */
const BORDA_DO_VAO_PX = 5;
const secaoDoMeio = ([z, y]) => (z > 1970 && y >= 800
  ? [Math.min(z + recuoDaPlanta(meiaDoVao(y) + BORDA_DO_VAO_PX * MM), PONTA_DO_CAPO + 20), y] : [z, y]);
export const VISTAS_DO_CAPO = {
  lado: lado('capo', ([z, y]) => secaoDoMeio([z, y > 1100 ? TOPO_CAPO : y])),
  perfil: perfil(CAPO), planta: plantaTraseira(meiaCapo, 1400),
  estacoes: [632.5, 650, 666, 720, 790, 850, 905, 918, 934, 950, 1010, 1047, 1079, 1100, TOPO_CAPO],
};
/* a borda de baixo com raio pequeno (a leitura deu viva demais com o vinco inteiro e redonda demais sem ele) e o ombro com quina */
const VINCOS_DO_CAPO = { vincos: [...QUINAS.vincos, { nome: 'base', laco: 'primeiro', nitidez: 0.5 }, { nome: 'ombro', laco: 'ultimo', nitidez: 0.6 }] };
/** Monta a traseira (capô, grade, fundo da grade, tampa, contrapeso e os rebaixos) no estado { passos, topo, origem } e devolve as
 *  meias larguras usadas. */
export function montarTraseira(estado) {
  const { extY, extZ, booleana, parte, corpo } = ferramentas(estado);
  let capo = corpo('capo', VISTAS_DO_CAPO, VINCOS_DO_CAPO);
  /* a borda em volta do vão: um degrau de BORDA_MM de fundo e BORDA px de largura, que acompanha a superfície do capô. Sai do vão
     alargado menos o mesmo capô recuado BORDA_MM. */
  const BORDA = BORDA_DO_VAO_PX; const BORDA_MM = 16;
  /* o vão vai até z 1760: o fundo escuro da grade acompanha a curva e, nos cantos, fica a z 1887, atrás de um vão mais raso */
  const FUNDO_DO_VAO = -1760;
  const recuado = corpo('capoRecuado', { ...VISTAS_DO_CAPO, lado: VISTAS_DO_CAPO.lado.map(([c, a]) => [c < -1900 ? c + BORDA_MM : c, a]) }, VINCOS_DO_CAPO);
  const vaoAlargado = extZ(simetrico(VAO.map(([y, w]) => [y > 345 ? y + BORDA : y, w + BORDA])), FUNDO_DO_VAO, -2300);
  capo = booleana('subtrair', [capo, booleana('subtrair', [vaoAlargado, recuado]), extZ(simetrico(VAO.map(([y, w]) => [y, w + 1])), FUNDO_DO_VAO, -2300)]);
  parte('capo', capo, LARANJA);

  /* grade: a moldura cinza em U apoiada na rampa do vão (de z 2058 a y 980 até z 2110 a y 812, na lateral), e o fundo escuro.
     A moldura acompanha a curva da planta do capô, como o laranja: reta de lado a lado, ela sobrava para fora dele nos cantos das
     lanternas (a pessoa viu nos três quartos). É um bloco fundo, de que só a face de trás aparece, para o laço não ficar curto. */
  /* a ponta de baixo fica a z 2094 e não a 2112: o teto PONTA_DO_CAPO - 6 de `secaoDoMeio` deixa a face do capô 20 mm aquém ali, e a
     moldura passava 40,7 mm para trás do laranja na vista da direita (medido com `sobra-entre-partes`, grade em capo) */
  const rampa = (de, ate) => [[-(2052 + de), 990], [-(2052 + ate), 990], [-(2094 + ate), 795], [-(2094 + de), 795]];
  const placa = (nome, ate) => corpo(nome, { lado: rampa(-320, ate), perfil: perfil([[363, 58], ...VAO_GRADE]), planta: plantaTraseira(meiaCapo, 1400),
    estacoes: [796, 806, 820, 850, 900, 950, 989] }, QUINAS);
  const furos = FUROS_GRADE.map((f) => extZ(f.map(([x, y]) => [x * MM, H(y)]), -1700, -2300));
  parte('grade', booleana('subtrair', [placa('grade', 14), ...furos]), CINZA_CLARO);
  parte('fundoGrade', placa('fundoGrade', -70), ESCURO);

  /* tampa: o painel central com a aba de trás ------------------------------------------------------------------------------------ */
  const meiaTampa = 101.5 * MM;
  const bordaDaTampa = [0, 0.25, 0.5, 0.7, 0.85, 0.95, 1].map((f) => [f, 2142 - 75 * f * f - (f === 1 ? 45 : 0)]);
  const plantaDaTampa = [[meiaTampa, -1490], ...[...bordaDaTampa].reverse().map(([f, z]) => [meiaTampa * f, -z]),
    ...bordaDaTampa.slice(1).map(([f, z]) => [-meiaTampa * f, -z]), [-meiaTampa, -1490]];
  const tampa = corpo('tampa', {
    /* a face de dentro da aba vai a z 1850, escondida no capô: com a aba de 23 a 80 mm de fundo o laço ficava curto, o recuo da planta
       encolhia e a aba saía quase reta, sobrando para fora do laranja nos cantos */
    lado: lado('tampa', ([z, y]) => [z > 1970 && z < 2065 && y < 1125 ? 1850 : z, y > 1140 ? 1150 : (y > 1100 && y < 1125 ? TOPO_CAPO : y)]),
    perfil: perfil(TAMPA), planta: plantaDaTampa,
    estacoes: [985, 1000, 1050, 1090, 1107, 1117, 1135, 1150],
  }, QUINAS);
  parte('tampa', tampa, CINZA_CLARO);

  /* contrapeso: a faixa de cima larga e os lados côncavos ---------------------------------------------------------------------- */
  const meiaContra = 143.5 * MM;
  let contra = corpo('contrapeso', {
    lado: lado('contrapeso', ([z, y]) => [z > 2100 && y > 600 ? 2150 : z, y > 620 || (z > 2100 && y > 600) ? TOPO_CONTRA : (y < 245 ? 221 : y)]),
    perfil: perfil(CONTRA), planta: plantaTraseira(meiaContra, 1700),
    estacoes: [221.5, 232, 250, 285, 329, 393, 424, 442, 507, 540, 558, 571, 600, 626, TOPO_CONTRA],
  }, { vincos: [...QUINAS.vincos, { nome: 'faixa', laco: 'e11', nitidez: 'viva' }] });
  /* os rebaixos, em px da vista de trás com x medido do centro (+ é o +x do modelo, a esquerda de quem olha de trás): o contorno de
     cantos redondos é cortado ao longo de z, do fundo do rebaixo para fora, a partir da borda da planta naquele x */
  function arredondado(x0, x1, y0, y1, r) {
    const pts = [];
    for (const [cx, cy, a0] of [[x1 - r, y1 + r, 270], [x1 - r, y0 - r, 0], [x0 + r, y0 - r, 90], [x0 + r, y1 + r, 180]]) {
      for (let k = 0; k <= 4; k += 1) { const a = (a0 + 22.5 * k) * Math.PI / 180; pts.push([(cx + r * Math.cos(a)) * MM, H(cy + r * Math.sin(a))]); }
    }
    return pts;
  }
  const meiaLua = (cx, base, r) => Array.from({ length: 13 }, (_, k) => [(cx + r * Math.cos(Math.PI * k / 12)) * MM, H(base - r * Math.sin(Math.PI * k / 12))]);
  const REBAIXOS = {
    rasgo: { contorno: arredondado(-46, 46, 422, 403, 5), x: 0, fundo: 90, escuro: true },
    nicho: { contorno: arredondado(-27, 27, 479, 453, 5), x: 0, fundo: 95, escuro: true },
    rebaixoEsq: { contorno: arredondado(105, 118, 415, 404, 2), x: 111.5, fundo: 45 },
    rebaixoDir: { contorno: arredondado(-118, -105, 415, 404, 2), x: -111.5, fundo: 45 },
    meiaLua: { contorno: [...meiaLua(36, 506, 9), [27 * MM, H(512)], [45 * MM, H(512)]], x: 36, fundo: 200 },   // a base recua 130 mm ali
  };
  const cortar = (v, de, ate) => { const z = zDaTraseira(v.x * MM, meiaContra); return extZ(v.contorno, z + de, ate === null ? -2300 : z + ate); };
  contra = booleana('subtrair', [contra, ...Object.values(REBAIXOS).map((v) => cortar(v, v.fundo, null))]);
  parte('contrapeso', contra, CINZA);
  parte('fundoRasgo', cortar(REBAIXOS.rasgo, REBAIXOS.rasgo.fundo, REBAIXOS.rasgo.fundo - 12), ESCURO);
  parte('fundoNicho', cortar(REBAIXOS.nicho, REBAIXOS.nicho.fundo, REBAIXOS.nicho.fundo - 12), ESCURO);
  parte('pino', extY([[-14, -2152], [14, -2152], [14, -2124], [-14, -2124]], H(479), H(453)), CINZA);
  parte('trinco', extY([[-30 * MM, -2186], [30 * MM, -2186], [30 * MM, -2150], [-30 * MM, -2150]], H(440), H(425)), CINZA);
  return { meiaCapo, meiaTampa, meiaContra };
}

const estado = { passos: [], topo: {}, origem: 0 };
montarTraseira(estado);
const { passos, topo } = estado;
if (process.env.GIRAR) passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -1830] }]);

export default {
  plano: 'Traseira da carcaça (capô, tampa, grade e contrapeso) pelas três vistas, com a ponta de trás acompanhando a planta.',
  vista: 'traseira',
  opcoes: [{ titulo: 'traseira pelas três vistas', nota: `capô com ${Math.round(2 * meiaCapo)} mm de largura`, passos, topo }],
};

export { REGIOES, LARANJA, CINZA_CLARO, CINZA, ESCURO, simplifica, lado, area, r1, interpolar };
