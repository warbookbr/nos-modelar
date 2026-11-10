/* dois-bracos-numa-carcaca-curva/receita.js — peça de prova do defeito "o `arredondarCostura` recusa a costura de dois braços chatos numa
 * carcaça curva" (plano "costuras e furos limpos"): uma carcaça de 200 x 350 mm, de frente plana e costas em concha de 110 mm de profundidade
 * (um `loft` de seções de cantos redondos que encolhem por superelipse), e dois braços chatos de 52 mm de altura e 56 mm de profundidade que
 * entram nas costas dela, 76 mm um do outro, unidos a ela por `unir`; a costura de cada braço com a concha é o `arredondarCostura`.
 *
 * Referencial em mm: y para cima, a frente da carcaça em z = -16 e as costas até z = 94; o centro da carcaça em x = 335; os braços vêm do
 * lado de x = 190 e entram na concha até x = 295. As medidas são as do retrovisor do banco de provas do furgão realista, sem a lente, os vidros
 * nem a base. */
const m = (mm) => mm / 1000;

export const TABELA = {
  centroX: 335,
  yBaixo: -110,
  altura: 350,
  largAlta: 204,
  largBaixa: 172,
  frenteReta: 20,
  profundidade: 110,
  frenteZ: -16,
  costasPassos: 16,
  expoente: 3,
  /* os braços */
  alturaDoBraco: 52,
  vao: 76,
  profundidadeDoBraco: 56,
  eixoZ: 24,
  yBaixoDoBraco: -25,
  xDoCorpo: 104,
  xDaPonta: 295,
  /* o arredondamento */
  raioDoEncontro: 6,
  raioMinimo: 2,
  afinarPontas: 20,
  lados: 36,
};

/* contorno [a, b] de um polígono com cada canto concordado por um arco de raio r (um número ou um por vértice, limitado ao que cabe) */
function arredondado(vertices, r, n = 8) {
  const saida = [];
  const k = vertices.length;
  for (let i = 0; i < k; i += 1) {
    const p = vertices[i]; const a = vertices[(i + k - 1) % k]; const b = vertices[(i + 1) % k];
    const ri = Array.isArray(r) ? r[i] : r;
    if (!ri) { saida.push([p[0], p[1]]); continue; }
    const u = [a[0] - p[0], a[1] - p[1]]; const v = [b[0] - p[0], b[1] - p[1]];
    const lu = Math.hypot(...u); const lv = Math.hypot(...v);
    const e1 = [u[0] / lu, u[1] / lu]; const e2 = [v[0] / lv, v[1] / lv];
    const alfa = Math.acos(Math.max(-1, Math.min(1, e1[0] * e2[0] + e1[1] * e2[1])));
    const rr = Math.min(ri, 0.95 * Math.min(lu, lv) * Math.tan(alfa / 2));
    const d = rr / Math.tan(alfa / 2);
    const mm = [e1[0] + e2[0], e1[1] + e2[1]]; const lm = Math.hypot(...mm);
    const c = [p[0] + (mm[0] / lm) * (rr / Math.sin(alfa / 2)), p[1] + (mm[1] / lm) * (rr / Math.sin(alfa / 2))];
    const t1 = [p[0] + e1[0] * d, p[1] + e1[1] * d]; const t2 = [p[0] + e2[0] * d, p[1] + e2[1] * d];
    const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]); const a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
    let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    for (let j = 0; j <= n; j += 1) { const t = a1 + (da * j) / n; saida.push([c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t)]); }
  }
  return saida;
}

export function gerarPassos(T = TABELA) {
  const cx = T.centroX, yBaixo = T.yBaixo, yTopo = yBaixo + T.altura, cy = (yBaixo + yTopo) / 2;
  const zF = T.frenteZ, zFim = zF + T.profundidade;
  const larg = (y) => T.largBaixa + ((T.largAlta - T.largBaixa) * (y - yBaixo)) / T.altura;
  const trapezio = [[cx - larg(yTopo) / 2, yTopo], [cx - larg(yBaixo) / 2, yBaixo], [cx + larg(yBaixo) / 2, yBaixo], [cx + larg(yTopo) / 2, yTopo]];
  const secao = (z, s) => {
    const v = trapezio.map(([x, y]) => [(x - cx) * s, (y - cy) * s]);
    return { pos: [m(cx), m(cy), m(z)], contorno: arredondado(v, 40 + 55 * (1 - s)).map(([x, y]) => [m(x), m(-y)]).reverse() };
  };
  const secoes = [secao(zF, 1), secao(zF + T.frenteReta, 1)];
  const costas = T.profundidade - T.frenteReta;
  for (let i = 1; i <= T.costasPassos; i += 1) {
    const t = (i / T.costasPassos) * 0.985;
    secoes.push(secao(zF + T.frenteReta + costas * t, (1 - t ** T.expoente) ** (1 / T.expoente)));
  }
  const polo = (z) => ({ pos: [m(cx), m(cy), m(z)], raio: 0 });
  const loft = [polo(zF - 0.05), ...secoes, polo(zFim)];
  const yB = T.yBaixoDoBraco, yT = yB + 2 * T.alturaDoBraco + T.vao;
  const braco = (id, y0) => ['cubo', {
    origemId: id, larg: m(T.xDaPonta - T.xDoCorpo + 40), alt: m(T.alturaDoBraco), prof: m(T.profundidadeDoBraco),
    em: [m((T.xDoCorpo - 40 + T.xDaPonta) / 2), m(y0 + T.alturaDoBraco / 2), m(T.eixoZ)],
  }];
  return [
    ['loft', { origemId: 1, secoes: loft, lados: T.lados }],
    braco(2, yB),
    braco(3, yT - T.alturaDoBraco),
    ['unir', { origemId: 4, solidos: [{ origem: { op: 'loft', id: 1 } }, { origem: { op: 'cubo', id: 2 } }, { origem: { op: 'cubo', id: 3 } }] }],
    ['arredondarCostura', { origemId: 5, de: { op: 'unir', id: 4 }, raio: m(T.raioDoEncontro), raioMinimo: m(T.raioMinimo), afinarPontas: m(T.afinarPontas) }],
    ['parte', { nome: 'conjunto', sel: { tudo: true } }],
  ];
}

const receita = {
  meta: { nome: 'dois-bracos-numa-carcaca-curva', desc: 'carcaça de costas em concha com dois braços chatos unidos por unir; o arredondarCostura recusa a costura' },
  TABELA,
  PARAMS: TABELA,
  TOPO: {},
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
