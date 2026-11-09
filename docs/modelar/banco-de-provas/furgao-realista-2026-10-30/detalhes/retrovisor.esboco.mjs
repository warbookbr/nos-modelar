/* retrovisor.esboco.mjs — duas formas do retrovisor externo do furgão (lado direito, +x), em mm, na bancada neutra, refeitas depois
 * de a pessoa reprovar o primeiro esboço por estar tudo reto, quadrado e plano. A carcaça de 200 x 350 mm a 275 mm da porta e os
 * dois braços em quadro com a base triangular estão aprovados; o que muda é a superfície.
 *
 * O apoio é um pedaço plano de porta (face de fora em x 0, frente do furgão em +z, y 0 = canto de baixo da janela). Em todas as
 * opções fica igual: a base é uma placa triangular de 40 mm, de 360 mm de base e 640 de altura, de cantos redondos de 40 mm e com o
 * alto inclinado para trás; um bloco de junção de 100 x 212 mm e dois braços chatos de seção 56 x 52 mm de cantos de 13 mm, com 76
 * mm de vão entre eles. Placa, bloco e braços são um sólido só (`unir`) e as costuras côncavas levam `arredondarCostura` de 10 mm,
 * o que arredonda o vão e a entrada dos braços no bloco. Os braços entram na carcaça por `unir` simples: o `arredondarCostura` da
 * costura braço e carcaça foi recusado nas duas opções, porque a lateral da carcaça é curva e os braços ficam perto das costas.
 *
 * A carcaça é um `loft` de seções de cantos arredondados: uma frente plana, com a borda fina de 12 mm, e as costas em concha por
 * superelipse de expoente 3 que fecha num polo, mais larga em cima (200 mm) que embaixo (168 mm). Os dois vidros são rebaixos
 * cortados na frente (`subtrair`), 5 mm abaixo da borda e separados por uma faixa de 8 mm: o plano em cima, com 2/3 da altura (210
 * mm), e o convexo embaixo (108 mm), os dois planos. A lente do pisca é o pedaço do canto de baixo de fora da própria carcaça
 * (`intersectar` com uma caixa de 78 x 60 mm, atrás da borda da frente), e por isso acompanha a curva e não sobra para fora.
 * (a) as costas bem abauladas, 110 mm de profundidade no meio; (b) as costas contidas, 80 mm. */

const Z0 = 24; // o eixo da estrutura em z
const BASE_CARCACA = -110; // y da base da carcaça
const ALT = 350; // altura da carcaça
const LARG_ALTA = 204; // largura em cima do contorno; com os cantos redondos a caixa da malha mede 200
const LARG_BAIXA = 172; // largura embaixo
const BORDA = 12; // a borda fina da frente
const FRENTE_RETA = 20; // trecho reto da lateral antes de as costas fecharem
const Y_QUADRO = -25; // base do bloco e do braço de baixo; o quadro fica centrado na altura da carcaça
const ALT_BRACO = 52;
const VAO = 76;
const ALT_QUADRO = ALT_BRACO * 2 + VAO; // 180
const PROF_BRACO = 56;
const RAIO_BRACO = 13;
const RAIO_COSTURA = 10;

/** Contorno [x, y] de um polígono convexo com cada canto concordado por um arco de raio `r` (limitado ao que cabe), `n` pontos por canto. */
function arredondado(vertices, r, n = 8) {
  const saida = [];
  const k = vertices.length;
  for (let i = 0; i < k; i += 1) {
    const p = vertices[i]; const a = vertices[(i + k - 1) % k]; const b = vertices[(i + 1) % k];
    const u = [a[0] - p[0], a[1] - p[1]]; const v = [b[0] - p[0], b[1] - p[1]];
    const lu = Math.hypot(...u); const lv = Math.hypot(...v);
    const e1 = [u[0] / lu, u[1] / lu]; const e2 = [v[0] / lv, v[1] / lv];
    const alfa = Math.acos(Math.max(-1, Math.min(1, e1[0] * e2[0] + e1[1] * e2[1])));
    const rr = Math.min(r, 0.48 * Math.min(lu, lv) * Math.tan(alfa / 2));
    const d = rr / Math.tan(alfa / 2);
    const m = [e1[0] + e2[0], e1[1] + e2[1]]; const lm = Math.hypot(...m);
    const c = [p[0] + (m[0] / lm) * (rr / Math.sin(alfa / 2)), p[1] + (m[1] / lm) * (rr / Math.sin(alfa / 2))];
    const t1 = [p[0] + e1[0] * d, p[1] + e1[1] * d]; const t2 = [p[0] + e2[0] * d, p[1] + e2[1] * d];
    let a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]); let a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
    let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    for (let j = 0; j <= n; j += 1) { const t = a1 + (da * j) / n; saida.push([c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t)]); }
  }
  return saida;
}

/** Retângulo [x0, x1] por [y0, y1] de cantos redondos. */
const retangulo = (x0, x1, y0, y1, r) => arredondado([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], r);

/** [x, y] do plano da vista para o perfil do loft e da extrusão em z (u = x, v = -y). */
const paraZ = (pts) => pts.map(([x, y]) => [x, -y]);
/** [y, z] para o perfil da extrusão em x (u = -y, v = z). */
const paraX = (pts) => pts.map(([y, z]) => [-y, z]);

/** A opção: `dist` é a distância da face de dentro da carcaça, em cima, à porta, e `prof` a profundidade total da carcaça. */
function retrovisor(dist, prof) {
  const cx = dist + 100;
  const yBaixo = BASE_CARCACA; const yTopo = BASE_CARCACA + ALT; const cy = (yBaixo + yTopo) / 2;
  const zF = Z0 - 40; // a frente (vidro) da carcaça, para -z
  const zFim = zF + prof;
  /* a largura da carcaça a cada altura: linear de 168 embaixo a 200 em cima */
  const larg = (y) => LARG_BAIXA + ((LARG_ALTA - LARG_BAIXA) * (y - yBaixo)) / ALT;
  const trapezio = (y0, y1, recuo) => [[cx - larg(y1) / 2 + recuo, y1 - recuo], [cx - larg(y0) / 2 + recuo, y0 + recuo], [cx + larg(y0) / 2 - recuo, y0 + recuo], [cx + larg(y1) / 2 - recuo, y1 - recuo]];

  /* as seções do loft: a frente plana e as costas por superelipse, a escala e o raio dos cantos crescendo para as costas */
  const secoes = [];
  const secao = (z, s) => {
    const v = trapezio(yBaixo, yTopo, 0).map(([x, y]) => [(x - cx) * s, (y - cy) * s]);
    return { pos: [cx, cy, z], contorno: paraZ(arredondado(v, 40 + 55 * (1 - s))).reverse() };
  };
  secoes.push(secao(zF, 1));
  secoes.push(secao(zF + FRENTE_RETA, 1));
  const passosCostas = 16; const expo = 3; const costas = prof - FRENTE_RETA;
  for (let i = 1; i <= passosCostas; i += 1) {
    const t = (i / passosCostas) * 0.985; // fração da profundidade das costas
    const s = (1 - t ** expo) ** (1 / expo);
    secoes.push(secao(zF + FRENTE_RETA + costas * t, s));
  }
  const polo = (z) => ({ pos: [cx, cy, z], raio: 0 });
  const loft = [polo(zF - 0.05), ...secoes, polo(zFim)];

  /* o rebaixo e o vidro de cada espelho: os vidros 5 mm abaixo da borda, com 8 mm de faixa entre eles */
  const yAlto = yTopo - BORDA; const yFundo = yBaixo + BORDA; const faixa = 8;
  const grande = Math.round((yAlto - yFundo - faixa) * 0.66);
  const yPlanoBaixo = yAlto - grande; const yConvexoAlto = yPlanoBaixo - faixa;
  const polReb = (y0, y1, folga, r) => paraZ(arredondado([[cx - larg(y1) / 2 + BORDA + folga, y1 - folga], [cx - larg(y0) / 2 + BORDA + folga, y0 + folga], [cx + larg(y0) / 2 - BORDA - folga, y0 + folga], [cx + larg(y1) / 2 - BORDA - folga, y1 - folga]], r));
  const PROF_REB = 8; const PROF_VIDRO = 3;

  /* a lente do pisca: o canto de baixo de fora, atrás da borda da frente */
  const lenteX0 = cx + larg(yBaixo) / 2 - 78;

  /* a estrutura: placa triangular, bloco, braços */
  const placaYZ = arredondado([[-190, Z0 - 170], [-190, Z0 + 190], [450, Z0 - 30]], 40, 10);
  const blocoYZ = retangulo(Y_QUADRO - 16, Y_QUADRO + ALT_QUADRO + 16, Z0 - 50, Z0 + 50, 20);
  const bracoYZ = (y0) => retangulo(y0, y0 + ALT_BRACO, Z0 - PROF_BRACO / 2, Z0 + PROF_BRACO / 2, RAIO_BRACO);
  const xBraco0 = 70; const xBraco1 = dist + 60;

  const caixaDaLente = (id) => ['cubo', { origemId: id, larg: 100, alt: 70, prof: prof + 20, em: [lenteX0 + 50, yBaixo - 10, zF + 14 + (prof + 20) / 2] }];
  const passos = [
    ['cubo', { origemId: 1, larg: 30, alt: 900, prof: 700, em: [-15, -410, 0] }],
    ['extrusao', { origemId: 2, eixo: 'x', altura: 40, perfil: paraX(placaYZ), segmentosArco: 8 }],
    ['extrusao', { origemId: 3, eixo: 'x', altura: 50, perfil: paraX(blocoYZ), em: [30, 0, 0] }],
    ['extrusao', { origemId: 4, eixo: 'x', altura: xBraco1 - xBraco0, perfil: paraX(bracoYZ(Y_QUADRO)), em: [xBraco0, 0, 0] }],
    ['extrusao', { origemId: 5, eixo: 'x', altura: xBraco1 - xBraco0, perfil: paraX(bracoYZ(Y_QUADRO + ALT_QUADRO - ALT_BRACO)), em: [xBraco0, 0, 0] }],
    /* a carcaça duas vezes, porque cada booleana consome a entrada: uma para a lente, outra para o resto */
    ['loft', { origemId: 6, secoes: loft, lados: 36 }],
    caixaDaLente(7),
    ['intersectar', { origemId: 8, solidos: [{ origem: { op: 'loft', id: 6 } }, { origem: { op: 'cubo', id: 7 } }] }],
    ['loft', { origemId: 9, secoes: loft, lados: 36 }],
    caixaDaLente(10),
    ['subtrair', { origemId: 11, solidos: [{ origem: { op: 'loft', id: 9 } }, { origem: { op: 'cubo', id: 10 } }] }],
    ['extrusao', { origemId: 12, eixo: 'z', altura: PROF_REB + 2, perfil: polReb(yPlanoBaixo, yAlto, 0, 26), em: [0, 0, zF - 2] }],
    ['extrusao', { origemId: 13, eixo: 'z', altura: PROF_REB + 2, perfil: polReb(yFundo, yConvexoAlto, 0, 26), em: [0, 0, zF - 2] }],
    ['subtrair', { origemId: 14, solidos: [{ origem: { op: 'subtrair', id: 11 } }, { origem: { op: 'extrusao', id: 12 } }, { origem: { op: 'extrusao', id: 13 } }] }],
    ['extrusao', { origemId: 15, eixo: 'z', altura: PROF_VIDRO, perfil: polReb(yPlanoBaixo, yAlto, 0.8, 24), em: [0, 0, zF + PROF_REB - PROF_VIDRO] }],
    ['extrusao', { origemId: 16, eixo: 'z', altura: PROF_VIDRO, perfil: polReb(yFundo, yConvexoAlto, 0.8, 24), em: [0, 0, zF + PROF_REB - PROF_VIDRO] }],
    ['unir', { origemId: 17, solidos: [{ origem: { op: 'extrusao', id: 2 } }, { origem: { op: 'extrusao', id: 3 } }, { origem: { op: 'extrusao', id: 4 } }, { origem: { op: 'extrusao', id: 5 } }] }],
    ['arredondarCostura', { origemId: 18, de: { op: 'unir', id: 17 }, raio: RAIO_COSTURA }],
    ['unir', { origemId: 19, solidos: [{ alias: 'base' }, { origem: { op: 'subtrair', id: 14 } }] }],
    ['parte', { nome: 'porta', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['parte', { nome: 'estrutura', sel: { origem: { op: 'unir', id: 19 } } }],
    ['parte', { nome: 'estrutura', sel: { origem: { op: 'arredondarCostura', id: 18 } } }],
    ['parte', { nome: 'lente', sel: { origem: { op: 'intersectar', id: 8 } } }],
    ['parte', { nome: 'vidro plano', sel: { origem: { op: 'extrusao', id: 15 } } }],
    ['parte', { nome: 'vidro convexo', sel: { origem: { op: 'extrusao', id: 16 } } }],
  ];
  const aliases = [['base', { unir: [{ origem: { op: 'unir', id: 17 } }, { origem: { op: 'arredondarCostura', id: 18 } }] }]];
  return { passos, aliases, medidas: { cx, zF, zFim, grande, yPlanoBaixo, yConvexoAlto } };
}

const a = retrovisor(275, 110);
const b = retrovisor(275, 80);

export default {
  formato: 'esboco-nucleo@1',
  opcoes: [
    { titulo: '(a) costas bem abauladas, 110 mm de profundidade', nota: 'Carcaça de 200 x 350 mm a 275 mm da porta, frente plana com borda fina e costas em concha de 110 mm no meio.', passos: a.passos, aliases: a.aliases },
    { titulo: '(b) costas contidas, 80 mm de profundidade', nota: 'A mesma carcaça e os mesmos braços, com as costas de 80 mm no meio.', passos: b.passos, aliases: b.aliases },
  ],
};
