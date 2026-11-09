/* retrovisor.esboco.mjs — o retrovisor externo do furgão (lado direito, +x), em mm, na bancada neutra, com a carcaça aprovada e os
 * braços e a base refeitos pela referência. A carcaça é a de antes: 200 x 350 mm a 275 mm da porta, frente plana com a borda fina de
 * 12 mm, costas em concha de 110 mm no meio, os dois vidros rebaixados e a lente do pisca cortada do canto de baixo de fora.
 *
 * O apoio é um pedaço plano de porta (face de fora em x 0, frente do furgão em +z, y 0 = canto de baixo da janela). A base é uma
 * placa alta e estreita, de 40 mm, que termina em ponta em cima: um quadrilátero irregular de 670 mm de altura, com o topo em ponta,
 * a borda longa inclinada que desce do topo para a frente (a coluna do para-brisa), o lado de trás quase vertical e a borda de baixo
 * curta, tudo de cantos arredondados (`extrusao` em x de um contorno com arcos). Na parte de baixo da face de fora, onde os braços se
 * prendem, a placa tem um relevo abaulado de 22 mm (`loft` em x de seções de cantos redondos que encolhem por superelipse).
 *
 * Os dois braços e o corpo de apoio são uma peça só: uma `extrusao` em z de 56 mm do perfil lateral em colchete (x, y), com os cantos
 * do vão e das pontas arredondados no perfil. O braço de cima sobe, e o de baixo desce, numa curva de 30 mm de raio até o corpo de
 * apoio, que se apoia no relevo da placa; o vão entre os braços é um retângulo de cantos redondos aberto para a carcaça. A dobradiça
 * é uma peça retangular de 40 x 90 mm, 4 mm mais funda que os braços de cada lado, colada no fundo do vão. Placa, relevo, colchete
 * e dobradiça são um sólido só (`unir`), que se une à carcaça. O `arredondarCostura` não entra: ele recusa com dois braços numa
 * carcaça curva. */

const Z0 = 24; // o eixo da estrutura em z
const BASE_CARCACA = -110; // y da base da carcaça
const ALT = 350; // altura da carcaça
const LARG_ALTA = 204; // largura em cima do contorno; com os cantos redondos a caixa da malha mede 200
const LARG_BAIXA = 172; // largura embaixo
const BORDA = 12; // a borda fina da frente
const FRENTE_RETA = 20; // trecho reto da lateral antes de as costas fecharem
const Y_QUADRO = -25; // base do braço de baixo; o quadro fica centrado na altura da carcaça
const ALT_BRACO = 52;
const VAO = 76;
const ALT_QUADRO = ALT_BRACO * 2 + VAO; // 180
const PROF_BRACO = 56;
const RAIO_VAO = 10; // os cantos do vão, no perfil
const RAIO_CURVA = 30; // a curva dos braços até o corpo de apoio
const X_CORPO = 58; // onde o perfil do colchete entra no relevo
const X_VAO = 104; // o fundo do vão: o corpo de apoio tem 46 mm de espessura além de X_CORPO
const PLACA_E = 40; // espessura da placa
const RELEVO = 22; // altura do relevo abaulado sobre a placa
const GIRO = 10; // graus em torno do eixo vertical; positivo leva a ponta da carcaça para -z (para cima na vista superior)
const X_DOBRA = X_VAO + RAIO_VAO; // onde os braços deixam o corpo de apoio e dobram: depois dos cantos do vão
const DOBRADICA = { larg: 40, alt: 90, prof: PROF_BRACO + 8 };

/** Contorno [a, b] de um polígono com cada canto concordado por um arco de raio `r` (um número ou um por vértice, limitado ao que
 * cabe), `n` pontos por canto. Vale para vértice convexo e para côncavo. */
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
    const m = [e1[0] + e2[0], e1[1] + e2[1]]; const lm = Math.hypot(...m);
    const c = [p[0] + (m[0] / lm) * (rr / Math.sin(alfa / 2)), p[1] + (m[1] / lm) * (rr / Math.sin(alfa / 2))];
    const t1 = [p[0] + e1[0] * d, p[1] + e1[1] * d]; const t2 = [p[0] + e2[0] * d, p[1] + e2[1] * d];
    const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]); const a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
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

  /* a placa: o topo em ponta, a borda longa que desce para a frente, o lado de trás quase vertical e a borda de baixo curta; os
     vértices são [y, z] e o z é medido do eixo da estrutura */
  const placaYZ = arredondado([[480, Z0 - 190], [210, Z0 + 114], [-190, Z0 + 190], [-190, Z0 - 60]], [14, 40, 30, 30], 10);
  /* o relevo abaulado: seções [z, y] de cantos redondos, centradas na parte de baixo da face de fora, que encolhem por superelipse */
  const relCz = Z0 + 10; const relCy = 60; const relMz = 95; const relMy = 140;
  const relevoSecao = (x, s) => ({ pos: [x, relCy, relCz], contorno: arredondado([[-relMz * s, -relMy * s], [relMz * s, -relMy * s], [relMz * s, relMy * s], [-relMz * s, relMy * s]], 70 * s) });
  const relevo = [{ pos: [PLACA_E - 4.05, relCy, relCz], raio: 0 }, relevoSecao(PLACA_E - 4, 1), relevoSecao(PLACA_E, 1)];
  const passosRelevo = 8;
  for (let i = 1; i <= passosRelevo; i += 1) {
    const t = (i / passosRelevo) * 0.985;
    relevo.push(relevoSecao(PLACA_E + RELEVO * t, (1 - t ** 3) ** (1 / 3)));
  }
  relevo.push({ pos: [PLACA_E + RELEVO, relCy, relCz], raio: 0 });

  /* o colchete: os dois braços e o corpo de apoio, no perfil lateral [x, y]. O braço de baixo sobe e o de cima desce até o corpo
     por uma curva de RAIO_CURVA, e o vão é o retângulo de cantos redondos entre eles, aberto para a carcaça. */
  const xBraco1 = dist + 60;
  const yB = Y_QUADRO; const yT = Y_QUADRO + ALT_QUADRO; const R = RAIO_CURVA; const pe = 6;
  const colchete = arredondado([
    [X_CORPO - 12, yB - R - pe], [X_CORPO, yB - R - pe], [X_CORPO, yB], [xBraco1, yB], [xBraco1, yB + ALT_BRACO], [X_VAO, yB + ALT_BRACO],
    [X_VAO, yT - ALT_BRACO], [xBraco1, yT - ALT_BRACO], [xBraco1, yT], [X_CORPO, yT], [X_CORPO, yT + R + pe], [X_CORPO - 12, yT + R + pe],
  ], [0, 0, R, 0, 0, RAIO_VAO, RAIO_VAO, 0, 0, R, 0, 0], 10);
  const yVaoB = yB + ALT_BRACO; const yVaoT = yT - ALT_BRACO;
  const dobradica = retangulo(X_VAO - 2, X_VAO - 2 + DOBRADICA.larg, (yVaoB + yVaoT) / 2 - DOBRADICA.alt / 2, (yVaoB + yVaoT) / 2 + DOBRADICA.alt / 2, 4);

  const caixaDaLente = (id) => ['cubo', { origemId: id, larg: 100, alt: 70, prof: prof + 20, em: [lenteX0 + 50, yBaixo - 10, zF + 14 + (prof + 20) / 2] }];
  const passos = [
    ['cubo', { origemId: 1, larg: 30, alt: 900, prof: 700, em: [-15, -410, 0] }],
    ['extrusao', { origemId: 2, eixo: 'x', altura: PLACA_E, perfil: paraX(placaYZ), segmentosArco: 8 }],
    ['loft', { origemId: 3, secoes: relevo, lados: 36 }],
    /* o colchete duas vezes, cortado em x na dobra: o corpo de apoio fica reto e os braços giram */
    ['extrusao', { origemId: 4, eixo: 'z', altura: PROF_BRACO, perfil: paraZ(colchete), em: [0, 0, Z0 - PROF_BRACO / 2] }],
    ['cubo', { origemId: 19, larg: X_DOBRA + 50, alt: 600, prof: 200, em: [(X_DOBRA - 50) / 2, 60, Z0] }],
    ['intersectar', { origemId: 20, solidos: [{ origem: { op: 'extrusao', id: 4 } }, { origem: { op: 'cubo', id: 19 } }] }],
    ['extrusao', { origemId: 21, eixo: 'z', altura: PROF_BRACO, perfil: paraZ(colchete), em: [0, 0, Z0 - PROF_BRACO / 2] }],
    ['cubo', { origemId: 22, larg: X_DOBRA + 50, alt: 600, prof: 200, em: [(X_DOBRA - 50) / 2, 60, Z0] }],
    ['subtrair', { origemId: 23, solidos: [{ origem: { op: 'extrusao', id: 21 } }, { origem: { op: 'cubo', id: 22 } }] }],
    ['extrusao', { origemId: 5, eixo: 'z', altura: DOBRADICA.prof, perfil: paraZ(dobradica), em: [0, 0, Z0 - DOBRADICA.prof / 2] }],
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
    /* o fixo: placa, relevo e corpo de apoio; o que gira: braços, dobradiça e carcaça, em torno do eixo y que passa pela dobra */
    ['unir', { origemId: 17, solidos: [{ origem: { op: 'extrusao', id: 2 } }, { origem: { op: 'loft', id: 3 } }, { origem: { op: 'intersectar', id: 20 } }] }],
    ['unir', { origemId: 24, solidos: [{ origem: { op: 'subtrair', id: 23 } }, { origem: { op: 'extrusao', id: 5 } }, { origem: { op: 'subtrair', id: 14 } }] }],
    ...[{ op: 'unir', id: 24 }, { op: 'intersectar', id: 8 }, { op: 'extrusao', id: 15 }, { op: 'extrusao', id: 16 }]
      .map((origem) => ['rotaciona', { eixo: 'y', graus: GIRO, pivo: [X_DOBRA, 0, Z0], sel: { origem } }]),
    ['unir', { origemId: 18, solidos: [{ origem: { op: 'unir', id: 17 } }, { origem: { op: 'unir', id: 24 } }] }],
    ['parte', { nome: 'porta', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['parte', { nome: 'estrutura', sel: { origem: { op: 'unir', id: 18 } } }],
    ['parte', { nome: 'lente', sel: { origem: { op: 'intersectar', id: 8 } } }],
    ['parte', { nome: 'vidro plano', sel: { origem: { op: 'extrusao', id: 15 } } }],
    ['parte', { nome: 'vidro convexo', sel: { origem: { op: 'extrusao', id: 16 } } }],
  ];
  return { passos };
}

const a = retrovisor(235, 110);

export default {
  formato: 'esboco-nucleo@1',
  opcoes: [
    { titulo: 'Carcaça aprovada, braços em colchete e base em vela', nota: 'Carcaça de 200 x 350 mm a 275 mm da porta, costas de 110 mm; os dois braços e o corpo de apoio numa peça só, em perfil de colchete, e a placa alta e estreita, em ponta em cima, com relevo abaulado embaixo.', passos: a.passos },
  ],
};
