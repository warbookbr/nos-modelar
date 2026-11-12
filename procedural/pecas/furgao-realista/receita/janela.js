/* furgao-realista, receita/janela.js — os contornos da janela da cabine (2026-11-11, pelo alvo aprovado pela pessoa): um vão de vidro só, dividido por uma coluninha fina de chapa,
 * com o vidro grande atrás dela, o triângulo fixo na frente e, na metade da frente do triângulo, uma peça preta (a base do retrovisor). O vidro grande e o triângulo são dois vãos
 * abertos na chapa pronta por `aberturaPorContorno`, separados pela coluninha, e a borracha de cada um passa sobre ela; a peça preta é um terceiro vão cuja lente tem o tamanho dele
 * (recuo 0) e é preta, e cobre o ponto em que a fresta da porta entra por baixo dela. Cada contorno é visto pelo eixo x ([z, y] em mm, com u = -z no lado esquerdo, +x), como o
 * pisca lateral; o lado direito espelha.
 *
 * As cotas da TABELA são as da moldura: a borda de fora da borracha (a aresta de fora do preto) nos lados de cima, de baixo e de trás, e a borda do vidro que se vê junto da coluninha
 * e da peça preta. O vão sai delas por lado: recuado `janela_borracha_fora` para dentro onde a cota é a borda de fora da moldura, e aberto `janela_borracha_dentro` para fora onde ela é
 * a borda do vidro, porque a borracha cobre essa tira do vidro. */

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
  /* a coluninha: a borda de trás dela (a da frente do vidro grande) é a reta do alto ao pé, inclinada para trás no alto; a da frente dela fica `janela_coluna_largura` adiante */
  const kCol = (T.janela_coluna_z_pe - T.janela_coluna_z_topo) / (T.janela_coluna_y_topo - T.janela_coluna_y_pe);
  const zColTras = (y) => T.janela_coluna_z_topo + kCol * (T.janela_coluna_y_topo - y);
  const zColFrente = (y) => zColTras(y) + T.janela_coluna_largura;
  /* a borda da frente do vidro: paralela ao para-brisa, `janela_frente_recuo` atrás dele, medidos na perpendicular */
  const zFrenteVidro = (y) => f.zLinhaVidro(y) - T.janela_frente_recuo / Math.sin(T.para_brisa_angulo * grau);
  const yFrenteVidro = (z) => 1000 + (zFrenteVidro(1000) - z) * Math.tan(T.para_brisa_angulo * grau);
  return { zColTras, zColFrente, zFrenteVidro, yFrenteVidro };
}

/** Os quatro vãos em mm [u, y]: o vidro grande e o triângulo, de cada lado, com o nome das partes e o raio de cada canto. A moldura de cada um vem em `moldura`, em [z, y] e sem recuo. */
export function derivarJanelas(T, f) {
  const F = T.janela_borracha_fora; const D = T.janela_borracha_dentro;
  const { zColTras, zColFrente, zFrenteVidro, yFrenteVidro } = retasDaJanela(T, f);

  /* o vidro grande, do pé da frente (na coluninha) em sentido horário: o pé de trás, o alto de trás e o alto da frente na coluninha; o fundo é uma reta própria */
  const grande = [
    [zColTras(T.janela_pe_coluna_y), T.janela_pe_coluna_y],
    [T.janela_tras_z_pe, T.janela_tras_pe_y],
    [T.janela_tras_z_topo, T.janela_topo_tras_y],
    [zColTras(T.janela_topo_frente_y), T.janela_topo_frente_y],
  ];
  const raiosGrande = [T.janela_raio, T.janela_raio_pe_tras, T.janela_raio_topo_tras, T.janela_raio];
  const distGrande = [F, F, F, -D];

  /* o triângulo: a base sai do pé da coluninha e vai à ponta (onde ela encontra a borda da frente do vidro), a borda de trás é a coluninha, o alto vira para a descida paralela ao
     para-brisa numa curva aberta, logo em cima da coluninha, e a frente acaba na vertical da peça preta */
  const yPonta = T.janela_ponta_y;
  const zPonta = zFrenteVidro(yPonta);
  const zPe = zColFrente(T.janela_triangulo_pe_y);
  const kFundo = (yPonta - T.janela_triangulo_pe_y) / (zPonta - zPe);
  const yFundo = (z) => T.janela_triangulo_pe_y + kFundo * (z - zPe);
  const zV = T.janela_retrovisor_tras_z;
  /* o alto do triângulo: a coluninha e a borda da frente do vidro se cruzam logo em cima, e a curva aberta é o raio desse canto, sem trecho reto */
  const yTopoT = (() => { const d = (y) => zColFrente(y) - zFrenteVidro(y); return 1000 + (0 - d(1000)) * 1000 / (d(2000) - d(1000)); })();
  const triangulo = [
    [zV, yFundo(zV)],
    [zColFrente(T.janela_triangulo_pe_y), T.janela_triangulo_pe_y],
    [zColFrente(yTopoT), yTopoT],
    [zV, yFrenteVidro(zV)],
  ];
  const raiosTriangulo = [T.janela_raio, T.janela_raio, T.janela_raio_curva, T.janela_raio_frente];
  const distTriangulo = [F, -D, F, -D];

  /* o raio do canto do vão: o da moldura menos a metade do recuo dos dois lados dele, no mínimo `janela_raio_minimo` */
  const raioDoVao = (raios, dists) => raios.map((r, k) => Math.max(T.janela_raio_minimo, r - (dists[k] + dists[(k + raios.length - 1) % raios.length]) / 2));
  const esq = (pts) => pts.map(([z, y]) => [-z, y]);
  const dir = (pts) => pts.map(([z, y]) => [z, y]).reverse();
  const lista = [
    { tipo: 'porta', nome: 'Porta', pts: recuarLados(grande, distGrande), raios: raioDoVao(raiosGrande, distGrande) },
    { tipo: 'triangulo', nome: 'Triangulo', pts: recuarLados(triangulo, distTriangulo), raios: raioDoVao(raiosTriangulo, distTriangulo) },
  ];
  const feitos = [];
  for (const { tipo, nome, pts, raios } of lista) {
    for (const [lado, vista, contorno, rs] of [['Esquerda', [1, 0, 0], esq(pts), raios], ['Direita', [-1, 0, 0], dir(pts), [...raios].reverse()]]) {
      feitos.push({ tipo, lado, vista, contorno, raios: rs, cristal: `vidro${nome}Cabine${lado}`, aba: `abaVao${nome}Cabine${lado}`, borracha: `borracha${nome}Cabine${lado}` });
    }
  }
  feitos.moldura = { grande, triangulo };
  return feitos;
}

/** Os três cantos da peça preta em mm [z, y]: a ponta, o pé da vertical de trás e o alto dela. */
export function pontasDaBase(T, f) {
  const { yFrenteVidro } = retasDaJanela(T, f);
  const zP = T.janela_retrovisor_tras_z + T.janela_borracha_dentro + T.janela_borracha_fora - T.janela_retrovisor_sobreposicao;
  return [[T.janela_retrovisor_ponta_z, T.janela_retrovisor_base_y], [zP, T.janela_retrovisor_base_y], [zP, yFrenteVidro(zP)]];
}

/** A peça preta da frente do triângulo, a base do retrovisor, de cada lado: um triângulo sobre a lateral, em milímetro [x, y, z]. A vertical de trás começa `janela_retrovisor_sobreposicao`
 *  sobre a borracha do triângulo (que acaba `janela_borracha_dentro + janela_borracha_fora` depois da vertical do vidro), a ponta fica na base, e a borda da frente sai da borda do vidro e abre.
 *  Os pontos da malha seguem a superfície da lateral e da quina (`superficie`), `janela_retrovisor_saida` para fora pela normal; como o plástico, a peça entra a `janela_retrovisor_espessura` menos
 *  essa saída na chapa. Devolve as partes no formato do plástico (`nome`, `vertices`, `faces`, `vincos`, `cantos`, `posicoes`), com a `espessura` própria. */
export function derivarBasesDoRetrovisor(T, f) {
  const tri = pontasDaBase(T, f);
  const N = T.janela_retrovisor_malha;
  /* a superfície da lateral na altura y: plana e inclinada até o fim da lateral, e dali o arco da quina (raio da frente): o ponto da superfície em (z, y) e a normal de fora */
  const superficie = (z, y) => {
    const xS = f.xs(y); const rF = f.raioFrente(y); const zc = f.zF(y) - rF; const xc = xS - rF;
    if (z <= zc) return { x: xS, n: [1, 0] };
    const dz = Math.min(z - zc, rF);
    const dx = Math.sqrt(rF * rF - dz * dz);
    return { x: xc + dx, n: [dx / rF, dz / rF] };
  };
  /* a malha triangular do triângulo, em N partes por lado: os cantos têm uma face só, e a borda `cantos` os segura vivos */
  const ponto = (a, b) => [0, 1].map((e) => tri[0][e] + (tri[1][e] - tri[0][e]) * a / N + (tri[2][e] - tri[0][e]) * b / N);
  return [['Esquerda', 'e', 1], ['Direita', 'd', -1]].map(([lado, suf, s]) => {
    const nome = (a, b) => `baseRetrovisor_${a}_${b}_${suf}`;
    const posicoes = new Map(); const faces = [];
    for (let a = 0; a <= N; a += 1) {
      for (let b = 0; a + b <= N; b += 1) {
        const [z, y] = ponto(a, b); const { x, n } = superficie(z, y);
        posicoes.set(nome(a, b), [s * (x + n[0] * T.janela_retrovisor_saida), y, z + n[1] * T.janela_retrovisor_saida]);
      }
    }
    const horario = (t) => {
      const [A, B, C] = t.map((v) => posicoes.get(v));
      const nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
      return nx * s > 0 ? t : [...t].reverse();
    };
    for (let a = 0; a < N; a += 1) {
      for (let b = 0; a + b < N; b += 1) {
        faces.push(horario([nome(a, b), nome(a + 1, b), nome(a, b + 1)]));
        if (a + b + 2 <= N) faces.push(horario([nome(a + 1, b), nome(a + 1, b + 1), nome(a, b + 1)]));
      }
    }
    return { nome: `baseRetrovisor${lado}`, vertices: [...posicoes.keys()].sort(), faces, vincos: [], cantos: [], espessura: T.janela_retrovisor_espessura, posicoes };
  });
}
