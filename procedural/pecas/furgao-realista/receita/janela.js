/* furgao-realista, receita/janela.js — os contornos da janela da cabine (2026-11-12, pelo alvo aprovado pela pessoa): um vão de vidro só, com uma borracha contínua em volta do conjunto
 * (o vidro grande atrás e o triângulo fixo na frente), uma barra preta de 25 mm da própria moldura (a coluninha) de cima a baixo sobre o vidro, e, na metade da frente do triângulo, uma
 * peça preta (a base do retrovisor) que emenda no canto de baixo da frente da moldura. O vão é aberto na chapa pronta por `aberturaPorContorno`, visto pelo eixo x ([z, y] em mm, com
 * u = -z no lado esquerdo, +x), como o pisca lateral; o lado direito espelha. A barra e a base são placas de plástico que seguem a lateral, porque a fresta da porta passa por baixo da
 * base e um vão não pode cruzar a fresta.
 *
 * As cotas da TABELA são as da moldura: a borda de fora da borracha (a aresta de fora do preto) nos lados de cima, de baixo e de trás, e a borda do vidro que se vê junto da frente
 * (onde a peça preta começa). O vão sai delas recuado `janela_borracha_fora` para dentro nos lados de fora e aberto `janela_borracha_dentro` para fora na frente, porque a borracha
 * cobre essa tira do vidro. */

/** O polígono (z, y) em mm, percorrido no sentido horário nesse plano, com cada lado k recuado `dists[k]` para dentro (negativo, para fora): os vizinhos se encontram na esquadria. */
export function recuarLados(pts, dists) {
  const n = pts.length;
  const area = pts.reduce((s, p, k) => s + (p[0] * pts[(k + 1) % n][1] - pts[(k + 1) % n][0] * p[1]), 0);
  const giro = area < 0 ? 1 : -1; /* horário: área negativa; a normal para dentro fica à direita do lado */
  const retas = pts.map((p, k) => {
    const q = pts[(k + 1) % n]; const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const t = [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; const nm = [giro * t[1], -giro * t[0]];
    return { p: [p[0] + nm[0] * dists[k], p[1] + nm[1] * dists[k]], t };
  });
  return pts.map((_, k) => {
    const a = retas[(k - 1 + n) % n]; const b = retas[k];
    const s = ((b.p[0] - a.p[0]) * b.t[1] - (b.p[1] - a.p[1]) * b.t[0]) / (a.t[0] * b.t[1] - a.t[1] * b.t[0]);
    return [a.p[0] + a.t[0] * s, a.p[1] + a.t[1] * s];
  });
}

/** A geometria comum da janela, em mm [z, y] do lado esquerdo: a coluninha (as duas bordas, de trás e da frente) e a borda da frente do vidro, paralela ao para-brisa. */
function retasDaJanela(T, f) {
  const grau = Math.PI / 180;
  /* a coluninha: a borda de trás dela é a reta do alto ao pé, inclinada para trás no alto; a da frente dela fica `janela_coluna_largura` adiante */
  const kCol = (T.janela_coluna_z_pe - T.janela_coluna_z_topo) / (T.janela_coluna_y_topo - T.janela_coluna_y_pe);
  const zColTras = (y) => T.janela_coluna_z_topo + kCol * (T.janela_coluna_y_topo - y);
  const zColFrente = (y) => zColTras(y) + T.janela_coluna_largura;
  /* a borda da frente do vidro: paralela ao para-brisa, `janela_frente_recuo` atrás dele, medidos na perpendicular */
  const zFrenteVidro = (y) => f.zLinhaVidro(y) - T.janela_frente_recuo / Math.sin(T.para_brisa_angulo * grau);
  const yFrenteVidro = (z) => 1000 + (zFrenteVidro(1000) - z) * Math.tan(T.para_brisa_angulo * grau);
  return { zColTras, zColFrente, zFrenteVidro, yFrenteVidro };
}

/** O contorno de fora da moldura, em mm [z, y], em sentido horário: a ponta do triângulo na frente embaixo, o pé do triângulo e o pé do vidro grande (o fundo de cada um, com a coluninha no meio),
 *  o pé e o alto de trás do vidro grande, o canto onde o alto da moldura vira para a descida paralela ao para-brisa (uma curva só) e o alto da vertical da frente. */
function contornoDaMoldura(T, f) {
  const { zColTras, zColFrente, zFrenteVidro, yFrenteVidro } = retasDaJanela(T, f);
  const zV = T.janela_retrovisor_tras_z;
  const zPeT = zColFrente(T.janela_triangulo_pe_y);
  const kFundo = (T.janela_ponta_y - T.janela_triangulo_pe_y) / (zFrenteVidro(T.janela_ponta_y) - zPeT);
  const yFundo = (z) => T.janela_triangulo_pe_y + kFundo * (z - zPeT);
  /* o alto: a reta do alto do vidro grande, prolongada até a borda da frente */
  const zRT = T.janela_tras_z_topo; const yRT = T.janela_topo_tras_y;
  const kTopo = (T.janela_topo_frente_y - yRT) / (zColTras(T.janela_topo_frente_y) - zRT);
  const dif = (z) => (yRT + kTopo * (z - zRT)) - yFrenteVidro(z);
  let z0 = zRT; let z1 = zRT + 2000;
  for (let k = 0; k < 60; k += 1) { const zm = (z0 + z1) / 2; if (dif(z0) * dif(zm) <= 0) z1 = zm; else z0 = zm; }
  const zT = (z0 + z1) / 2;
  const pts = [
    [zV, yFundo(zV)],
    [zPeT, T.janela_triangulo_pe_y],
    [zColTras(T.janela_pe_coluna_y), T.janela_pe_coluna_y],
    [T.janela_tras_z_pe, T.janela_tras_pe_y],
    [zRT, yRT],
    [zT, yRT + kTopo * (zT - zRT)],
    [zV, yFrenteVidro(zV)],
  ];
  const raios = [T.janela_raio, T.janela_raio, T.janela_raio, T.janela_raio_pe_tras, T.janela_raio_topo_tras, T.janela_raio_curva, T.janela_raio_frente];
  return { pts, raios, dists: [T.janela_borracha_fora, T.janela_borracha_fora, T.janela_borracha_fora, T.janela_borracha_fora, T.janela_borracha_fora, T.janela_borracha_fora, -T.janela_borracha_dentro] };
}

/** Os dois vãos (um por lado) em mm [u, y]: o do conjunto dos dois vidros, com o nome das partes e o raio de cada canto. A moldura vem em `moldura`, em [z, y] e sem recuo. */
export function derivarJanelas(T, f) {
  const { pts, raios, dists } = contornoDaMoldura(T, f);
  const vao = recuarLados(pts, dists);
  const raiosDoVao = raios.map((r, k) => Math.max(T.janela_raio_minimo, r - (dists[k] + dists[(k + raios.length - 1) % raios.length]) / 2));
  const esq = (p) => p.map(([z, y]) => [-z, y]);
  const dir = (p) => p.map(([z, y]) => [z, y]).reverse();
  const feitos = [['Esquerda', [1, 0, 0], esq(vao), raiosDoVao], ['Direita', [-1, 0, 0], dir(vao), [...raiosDoVao].reverse()]].map(([lado, vista, contorno, rs]) => ({
    tipo: 'porta', lado, vista, contorno, raios: rs, cristal: `vidroPortaCabine${lado}`, aba: `abaVaoPortaCabine${lado}`, borracha: `borrachaPortaCabine${lado}`,
  }));
  feitos.moldura = { contorno: pts };
  return feitos;
}

/** Os três cantos da peça preta em mm [z, y]: a ponta, o pé da vertical de trás e o alto dela. */
export function pontasDaBase(T, f) {
  const { yFrenteVidro } = retasDaJanela(T, f);
  const zP = T.janela_retrovisor_tras_z + T.janela_borracha_dentro + T.janela_borracha_fora - T.janela_retrovisor_sobreposicao;
  return [[T.janela_retrovisor_ponta_z, T.janela_retrovisor_base_y], [zP, T.janela_retrovisor_base_y], [zP, yFrenteVidro(zP)]];
}

/** Os quatro cantos da barra da coluninha em mm [z, y]: pé de trás, pé da frente, alto da frente e alto de trás; as pontas ficam dentro da borracha. */
export function cantosDaColuna(T, f) {
  const { zColTras, zColFrente } = retasDaJanela(T, f);
  const yb = T.janela_pe_coluna_y + T.janela_coluna_pe_folga; const yt = T.janela_topo_frente_y - T.janela_coluna_topo_folga;
  return [[zColTras(yb), yb], [zColFrente(yb), yb], [zColFrente(yt), yt], [zColTras(yt), yt]];
}

/** Uma placa de plástico sobre a lateral, no formato do plástico (`nome`, `vertices`, `faces`, `vincos`, `cantos`, `posicoes`, e a `espessura` e o `material` próprios): `cantos2d` são três ou
 *  quatro cantos [z, y] em mm, e a malha de `divisoes` partes por lado segue a superfície da lateral inclinada e o arco da quina (`superficie`), `saida` para fora pela normal. */
function placaSobreLateral(T, f, nome, cantos2d, { saida, espessura, material, divisoes, divisoesAcima }) {
  const superficie = (z, y) => {
    const xS = f.xs(y); const rF = f.raioFrente(y); const zc = f.zF(y) - rF; const xc = xS - rF;
    if (z <= zc) return { x: xS, n: [1, 0] };
    const dz = Math.min(z - zc, rF);
    const dx = Math.sqrt(rF * rF - dz * dz);
    return { x: xc + dx, n: [dx / rF, dz / rF] };
  };
  const tri = cantos2d.length === 3;
  const N = divisoes; const M = tri ? divisoes : divisoesAcima;
  const ponto = (a, b) => (tri
    ? [0, 1].map((e) => cantos2d[0][e] + (cantos2d[1][e] - cantos2d[0][e]) * a / N + (cantos2d[2][e] - cantos2d[0][e]) * b / N)
    : [0, 1].map((e) => (1 - b / M) * ((1 - a / N) * cantos2d[0][e] + (a / N) * cantos2d[1][e]) + (b / M) * ((1 - a / N) * cantos2d[3][e] + (a / N) * cantos2d[2][e])));
  return [['Esquerda', 'e', 1], ['Direita', 'd', -1]].map(([lado, suf, s]) => {
    const id = (a, b) => `${nome}_${a}_${b}_${suf}`;
    const posicoes = new Map(); const faces = [];
    for (let a = 0; a <= N; a += 1) {
      for (let b = 0; tri ? a + b <= N : b <= M; b += 1) {
        const [z, y] = ponto(a, b); const { x, n } = superficie(z, y);
        posicoes.set(id(a, b), [s * (x + n[0] * saida), y, z + n[1] * saida]);
      }
    }
    const horario = (t) => {
      const [A, B, C] = t.slice(0, 3).map((v) => posicoes.get(v));
      const nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
      return nx * s > 0 ? t : [...t].reverse();
    };
    if (tri) {
      for (let a = 0; a < N; a += 1) {
        for (let b = 0; a + b < N; b += 1) {
          faces.push(horario([id(a, b), id(a + 1, b), id(a, b + 1)]));
          if (a + b + 2 <= N) faces.push(horario([id(a + 1, b), id(a + 1, b + 1), id(a, b + 1)]));
        }
      }
    } else {
      for (let a = 0; a < N; a += 1) for (let b = 0; b < M; b += 1) faces.push(horario([id(a, b), id(a + 1, b), id(a + 1, b + 1), id(a, b + 1)]));
    }
    return { nome: `${nome}${lado}`, vertices: [...posicoes.keys()].sort(), faces, vincos: [], cantos: [], espessura, material, posicoes };
  });
}

/** A peça preta da frente do triângulo, a base do retrovisor, de cada lado: uma placa triangular que segue a lateral e a quina, `janela_retrovisor_saida` para fora e engrossada
 *  `janela_retrovisor_espessura` para dentro (entra 1 mm na chapa). A vertical de trás começa `janela_retrovisor_sobreposicao` sobre a borracha do vão, que emenda nela sem chapa no meio. */
export function derivarBasesDoRetrovisor(T, f) {
  return placaSobreLateral(T, f, 'baseRetrovisor', pontasDaBase(T, f), { saida: T.janela_retrovisor_saida, espessura: T.janela_retrovisor_espessura, material: 'plastico', divisoes: T.janela_retrovisor_malha });
}

/** A coluninha de cada lado: uma barra preta da moldura, do pé ao alto do vão, na altura da borracha (`borracha_altura`) e do mesmo material, que atravessa o vidro e acaba dentro da borracha. */
export function derivarColunasDaJanela(T, f) {
  return placaSobreLateral(T, f, 'colunaJanela', cantosDaColuna(T, f), { saida: T.borracha_altura, espessura: T.janela_coluna_espessura, material: 'borracha', divisoes: 4, divisoesAcima: 16 });
}
