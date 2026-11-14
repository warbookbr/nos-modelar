/* furgao-realista, receita/retrovisor.js — os dois retrovisores externos (2026-11-12), traduzidos do esboço aprovado
 * `docs/modelar/banco-de-provas/furgao-realista-2026-10-30/detalhes/retrovisor.esboco.mjs`: a carcaça em concha de 200 por 350 mm, de frente plana com a borda fina de 12 mm, os dois vidros
 * rebaixados e a lente do pisca cortada do canto de baixo de fora; os dois braços e o corpo de apoio numa peça só, em colchete, girados 10 graus em torno do eixo vertical da dobra, com a
 * dobradiça no fundo do vão; e o relevo abaulado sobre o qual o corpo de apoio assenta. A base em vela do esboço não entra: o relevo assenta na peça preta `baseRetrovisor*` (receita/janela.js),
 * na parte de baixo da face de fora dela, na superfície da peça, e o conjunto todo é inclinado como a lateral ali.
 *
 * As medidas do esboço (em mm, com a face da placa em x 40, o eixo dos braços em z 24 e o relevo no centro [y 60, z 34]) são os parâmetros `retrovisor_*` da TABELA. O relevo e o colchete são
 * reduzidos em y e em z por `retrovisor_escala_apoio` em torno do centro deles, porque a peça preta tem 277 mm de altura e a placa do esboço, 670: nada do apoio passa da base. A carcaça fica
 * com as medidas do esboço. O lado esquerdo (+x) leva o desenho e o direito o espelha: x vira -x, o perfil do colchete percorre ao contrário e o giro e a inclinação trocam de sinal. */

import { m } from './geometria.js';

const Z0 = 24; // o eixo dos braços em z, no esboço
const Y_CARCACA = -110; // a base da carcaça em y
const Y_QUADRO = -25; // a base do braço de baixo
const X_FACE = 40; // a face de fora da placa do esboço: o plano em que o relevo assenta aqui
const CENTRO_RELEVO = [60, 34]; // [y, z] do centro do relevo no esboço
const Y_MEIO_QUADRO = 65; // y do meio do colchete: a escala do apoio gira em torno dele

/** Contorno [a, b] de um polígono com cada canto concordado por um arco de raio `r` (um número ou um por vértice), `n` pontos por canto: o `arredondado` do esboço. `parte` é a fração de uma aresta que o arco de um canto
 *  pode tomar: com 0,95 dois cantos de uma aresta curta se atravessam e o contorno volta sobre si mesmo; com 0,48 os arcos quase se encontram, sem se tocar. */
function arredondado(vertices, r, n = 8, parte = 0.95) {
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
    const rr = Math.min(ri, parte * Math.min(lu, lv) * Math.tan(alfa / 2));
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
const retangulo = (x0, x1, y0, y1, r) => arredondado([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], r);
const paraZ = (pts) => pts.map(([x, y]) => [x, -y]);

/** Os campos de comprimento de um passo, de mm para metro (a conversão mora aqui): os que são medidas e as listas de pontos. */
const CAMPOS_EM_MM = new Set(['larg', 'alt', 'prof', 'altura', 'em', 'perfil', 'pos', 'contorno', 'pivo', 'd']);
function emMetros(valor, medida = false) {
  if (typeof valor === 'number') return medida ? m(valor) : valor;
  if (Array.isArray(valor)) return valor.map((v) => emMetros(v, medida));
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, emMetros(v, medida || CAMPOS_EM_MM.has(k))]));
  return valor;
}

/** Os passos de um retrovisor, de lado `s` (+1 esquerdo em +x, -1 direito), com `onde` o ponto [x, y, z] do mundo em que o centro do relevo assenta e `inclinacao` o giro, em graus em torno de z,
 *  que põe a face do relevo paralela à lateral. As partes saem na ordem: estrutura, lente do pisca, espelho plano e espelho convexo. */
export function passosDoRetrovisor(T, s, onde, inclinacao, base) {
  const dist = T.retrovisor_dist; const prof = T.retrovisor_prof; const k = T.retrovisor_escala_apoio;
  const ALT = T.retrovisor_alt; const BORDA = T.retrovisor_borda;
  const cx = dist + 100; const yBaixo = Y_CARCACA; const yTopo = Y_CARCACA + ALT; const cy = (yBaixo + yTopo) / 2;
  const zF = Z0 - 40; const zFim = zF + prof;
  const larg = (y) => T.retrovisor_larg_baixa + ((T.retrovisor_larg_alta - T.retrovisor_larg_baixa) * (y - yBaixo)) / ALT;
  const trapezio = (y0, y1, recuo) => [[cx - larg(y1) / 2 + recuo, y1 - recuo], [cx - larg(y0) / 2 + recuo, y0 + recuo], [cx + larg(y0) / 2 - recuo, y0 + recuo], [cx + larg(y1) / 2 - recuo, y1 - recuo]];
  /* o apoio (relevo e colchete) é reduzido em y e z em torno do centro dele */
  const ay = (y) => Y_MEIO_QUADRO + (y - Y_MEIO_QUADRO) * k;
  const az = (z) => Z0 + (z - Z0) * k;

  const secao = (z, sc) => {
    const v = trapezio(yBaixo, yTopo, 0).map(([x, y]) => [(x - cx) * sc, (y - cy) * sc]);
    /* parte 0,48: nas últimas seções, bem encolhidas, o raio crescente tomaria mais que a aresta: com 0,95 o contorno se atravessava e as costas saíam com riscos */
    return { pos: [cx, cy, z], contorno: paraZ(arredondado(v, 40 + 55 * (1 - sc), 8, 0.48)).reverse() };
  };
  const secoes = [secao(zF, 1), secao(zF + T.retrovisor_frente_reta, 1)];
  const passosCostas = T.retrovisor_secoes_costas; const expo = 3; const costas = prof - T.retrovisor_frente_reta;
  for (let i = 1; i <= passosCostas; i += 1) {
    const t = (i / passosCostas) * 0.985;
    secoes.push(secao(zF + T.retrovisor_frente_reta + costas * t, (1 - t ** expo) ** (1 / expo)));
  }
  const polo = (z) => ({ pos: [cx, cy, z], raio: 0 });
  const loft = [polo(zF - 0.05), ...secoes, polo(zFim)];

  const yAlto = yTopo - BORDA; const yFundo = yBaixo + BORDA; const faixa = 8;
  const grande = Math.round((yAlto - yFundo - faixa) * 0.66);
  const yPlanoBaixo = yAlto - grande; const yConvexoAlto = yPlanoBaixo - faixa;
  const polReb = (y0, y1, folga, r) => paraZ(arredondado([[cx - larg(y1) / 2 + BORDA + folga, y1 - folga], [cx - larg(y0) / 2 + BORDA + folga, y0 + folga], [cx + larg(y0) / 2 - BORDA - folga, y0 + folga], [cx + larg(y1) / 2 - BORDA - folga, y1 - folga]], r));
  const PROF_REB = 8; const PROF_VIDRO = 3;
  const lenteX0 = cx + larg(yBaixo) / 2 - 78;

  /* o relevo abaulado: seções [z, y] de cantos redondos que encolhem por superelipse, no centro [y 60, z 34] */
  const relCz = Z0 + 10; const relCy = 60; const relMz = 95 * k; const relMy = 140 * k;
  const relevoSecao = (x, sc) => ({ pos: [x, relCy, relCz], contorno: arredondado([[-relMz * sc, -relMy * sc], [relMz * sc, -relMy * sc], [relMz * sc, relMy * sc], [-relMz * sc, relMy * sc]], 70 * k * sc) });
  const RELEVO = T.retrovisor_relevo;
  const relevo = [{ pos: [X_FACE - 4.05, relCy, relCz], raio: 0 }, relevoSecao(X_FACE - 4, 1), relevoSecao(X_FACE, 1)];
  const passosRelevo = T.retrovisor_secoes_relevo;
  for (let i = 1; i <= passosRelevo; i += 1) { const t = (i / passosRelevo) * 0.985; relevo.push(relevoSecao(X_FACE + RELEVO * t, (1 - t ** 3) ** (1 / 3))); }
  relevo.push({ pos: [X_FACE + RELEVO, relCy, relCz], raio: 0 });

  /* o colchete: os dois braços e o corpo de apoio, no perfil lateral [x, y] */
  const ALT_BRACO = T.retrovisor_braco_alt; const VAO = T.retrovisor_vao; const R = T.retrovisor_raio_curva; const RV = T.retrovisor_raio_vao;
  const X_CORPO = T.retrovisor_x_corpo; const X_VAO = T.retrovisor_x_vao; const X_DOBRA = X_VAO + RV; const PROF_BRACO = T.retrovisor_braco_prof * k;
  const yB = Y_QUADRO; const yT = Y_QUADRO + ALT_BRACO * 2 + VAO; const xBraco1 = dist + 60; const pe = 6;
  const vertices = [
    [X_CORPO - 12, yB - R - pe], [X_CORPO, yB - R - pe], [X_CORPO, yB], [xBraco1, yB], [xBraco1, yB + ALT_BRACO], [X_VAO, yB + ALT_BRACO],
    [X_VAO, yT - ALT_BRACO], [xBraco1, yT - ALT_BRACO], [xBraco1, yT], [X_CORPO, yT], [X_CORPO, yT + R + pe], [X_CORPO - 12, yT + R + pe],
  ].map(([x, y]) => [x, ay(y)]);
  const raios = [0, 0, R * k, 0, 0, RV * k, RV * k, 0, 0, R * k, 0, 0];
  const colchete = arredondado(vertices, raios, 10);
  const yVaoB = ay(yB + ALT_BRACO); const yVaoT = ay(yT - ALT_BRACO);
  const DOB = { larg: T.retrovisor_dobradica_larg, alt: T.retrovisor_dobradica_alt * k, prof: PROF_BRACO + 8 * k };
  const dobradica = retangulo(X_VAO - 2, X_VAO - 2 + DOB.larg, (yVaoB + yVaoT) / 2 - DOB.alt / 2, (yVaoB + yVaoT) / 2 + DOB.alt / 2, 4);
  const caixaDaLente = (id) => ['cubo', { origemId: id, larg: 100, alt: 70, prof: prof + 20, em: [s * (lenteX0 + 50), yBaixo - 10, zF + 14 + (prof + 20) / 2] }];

  /* o lado direito espelha: x vira -x (o colchete percorre ao contrário para as faces saírem para fora) e o giro troca de sinal */
  const perfilX = (pts) => (s > 0 ? pts : pts.map(([x, y]) => [-x, y]).reverse());
  const posX = (sec) => (s > 0 ? sec : { ...sec, pos: [-sec.pos[0], sec.pos[1], sec.pos[2]] });
  const id = (n) => base + n;
  const O = (op, n) => ({ origem: { op, id: id(n) } });
  const giro = s * T.retrovisor_giro;
  const passos = [
    ['loft', { origemId: id(3), secoes: relevo.map(posX), lados: 36 }],
    ['extrusao', { origemId: id(4), eixo: 'z', altura: PROF_BRACO, perfil: perfilX(paraZ(colchete)), em: [0, 0, Z0 - PROF_BRACO / 2] }],
    ['cubo', { origemId: id(19), larg: X_DOBRA + 50, alt: 600, prof: 200, em: [s * (X_DOBRA - 50) / 2, 60, Z0] }],
    ['intersectar', { origemId: id(20), solidos: [O('extrusao', 4), O('cubo', 19)] }],
    ['extrusao', { origemId: id(21), eixo: 'z', altura: PROF_BRACO, perfil: perfilX(paraZ(colchete)), em: [0, 0, Z0 - PROF_BRACO / 2] }],
    ['cubo', { origemId: id(22), larg: X_DOBRA + 50, alt: 600, prof: 200, em: [s * (X_DOBRA - 50) / 2, 60, Z0] }],
    ['subtrair', { origemId: id(23), solidos: [O('extrusao', 21), O('cubo', 22)] }],
    ['extrusao', { origemId: id(5), eixo: 'z', altura: DOB.prof, perfil: perfilX(paraZ(dobradica)), em: [0, 0, Z0 - DOB.prof / 2] }],
    ['loft', { origemId: id(6), secoes: loft.map(posX), lados: 36 }],
    caixaDaLente(id(7)),
    ['intersectar', { origemId: id(8), solidos: [O('loft', 6), O('cubo', 7)] }],
    ['loft', { origemId: id(9), secoes: loft.map(posX), lados: 36 }],
    caixaDaLente(id(10)),
    ['subtrair', { origemId: id(11), solidos: [O('loft', 9), O('cubo', 10)] }],
    ['extrusao', { origemId: id(12), eixo: 'z', altura: PROF_REB + 2, perfil: perfilX(polReb(yPlanoBaixo, yAlto, 0, 26)), em: [0, 0, zF - 2] }],
    ['extrusao', { origemId: id(13), eixo: 'z', altura: PROF_REB + 2, perfil: perfilX(polReb(yFundo, yConvexoAlto, 0, 26)), em: [0, 0, zF - 2] }],
    ['subtrair', { origemId: id(14), solidos: [O('subtrair', 11), O('extrusao', 12), O('extrusao', 13)] }],
    ['extrusao', { origemId: id(15), eixo: 'z', altura: PROF_VIDRO, perfil: perfilX(polReb(yPlanoBaixo, yAlto, 0.8, 24)), em: [0, 0, zF + PROF_REB - PROF_VIDRO] }],
    ['extrusao', { origemId: id(16), eixo: 'z', altura: PROF_VIDRO, perfil: perfilX(polReb(yFundo, yConvexoAlto, 0.8, 24)), em: [0, 0, zF + PROF_REB - PROF_VIDRO] }],
    ['unir', { origemId: id(17), solidos: [O('loft', 3), O('intersectar', 20)] }],
    ['unir', { origemId: id(24), solidos: [O('subtrair', 23), O('extrusao', 5), O('subtrair', 14)] }],
    ...[O('unir', 24), O('intersectar', 8), O('extrusao', 15), O('extrusao', 16)].map((sel) => ['rotaciona', { eixo: 'y', graus: giro, pivo: [s * X_DOBRA, 0, Z0], sel }]),
    ['unir', { origemId: id(18), solidos: [O('unir', 17), O('unir', 24)] }],
  ];
  const finais = [O('unir', 18), O('intersectar', 8), O('extrusao', 15), O('extrusao', 16)];
  /* as booleanas e a extrusão do colchete deixam faces finas (lascas) nas costuras: a limpeza tira as que cabem em 10 µm de desvio, sem criar vértice nem mover a superfície além disso */
  const limpezas = [O('unir', 18), O('intersectar', 8)].map((sel) => ['limparLascas', { sel, tolerancia: 0.00001 }]);
  /* a colocação: a face do relevo (x 40 do esboço) passa a x 0, o conjunto gira com a lateral e vai ao ponto do mundo */
  const colocar = finais.flatMap((sel) => [
    ['transladar', { d: [-s * X_FACE, 0, 0], sel }],
    ['rotaciona', { eixo: 'z', graus: s * inclinacao, pivo: [0, 0, 0], sel }],
    ['transladar', { d: [onde[0], onde[1] - CENTRO_RELEVO[0], onde[2] - CENTRO_RELEVO[1]], sel }],
  ]);
  const todos = [...passos, ...limpezas, ...colocar];
  return { passos: todos.map(([op, arg]) => [op, emMetros(arg)]), finais };
}
