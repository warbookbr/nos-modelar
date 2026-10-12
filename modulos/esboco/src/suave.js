/* Superfície suave por seções: o loft e a revolução com `suave: true` passam uma curva de tangente contínua pelas seções que o
   esbocista declarou, em vez de ligar duas vizinhas por um tronco plano. Foi o que o capô do avião pediu (um loft de 5 a 20
   seções saía em degraus), junto do amortecedor, da ponta da asa e do cone de cauda, que o crítico leu como facetados (atritos 15,
   30 e 34 do esboço do avião): a curva só ficava lisa multiplicando as seções à mão.

   A INTERPOLAÇÃO. Cada ponto do contorno anda ao longo do eixo numa cúbica de Hermite por trechos, com a tangente de Fritsch e
   Carlson (a mesma do PCHIP): passa por todas as seções, tem tangente contínua nelas e não passa do valor de nenhuma seção entre
   duas vizinhas, de modo que uma cintura não vira barriga e dois degraus próximos não estouram. Onde os dados são uma reta a
   cúbica é a própria reta, e o trecho fica com uma faixa só. Os pontos são interpolados um a um, então a correspondência ponto a
   ponto entre as seções é a de sempre. O perfil de uma revolução é uma curva no plano (raio, altura) e a cúbica anda pelo
   comprimento de corda dele (`densificarPerfil`), porque a parede quase vertical de um pneu tem inclinação enorme contra a altura.

   A ARESTA VIVA. A tangente só é contínua onde a forma não declara uma quebra: uma seção é aresta quando o campo `aresta: true` a
   marca, ou, sem o campo, quando as duas cordas que chegam a ela e saem dela fazem mais de `ANGULO_DE_ARESTA` graus (o degrau
   de uma cabine, o ombro de uma caçamba); `aresta: false` obriga a suavidade. Na aresta a curva se parte em duas, e cada metade
   termina nela como uma curva termina na ponta (entre duas arestas vizinhas, em reta). O degrau da revolução (duas alturas
   iguais) é aresta. O desenho não alisa a normal através da aresta e a desenha como linha.

   A DENSIDADE. O módulo escolhe quantas estações pôr entre duas seções pela flecha: a distância da curva à corda de cada
   subtrecho tem de ficar abaixo de `TOLERANCIA_RELATIVA` da maior extensão da forma, o que num quadro de uns 500 px é a flecha de 0,35
   px que `ladosPorEscala` já usa (o tamanho na vista é o da forma contra o quadro: o módulo não sabe a escala do painel quando
   resolve a forma, e uma forma que ocupa o conjunto inteiro, como a fuselagem do avião, é a que mais precisa). Trecho reto fica com uma
   faixa, trecho curvo com até `ESTACOES_POR_TRECHO`, e a forma inteira com no máximo `ESTACOES_MAXIMAS`. O contorno curvo (a
   elipse, o canto arredondado, a revolução) usa o passo angular que mantém a mesma flecha, com no máximo `PASSO_ANGULAR_MAXIMO`
   graus por lado. O resultado é determinístico: a mesma forma dá as mesmas estações.

   Puro: não importa o resto do módulo. */

/* A quebra entre as duas cordas de uma seção, em graus, a partir da qual a seção é aresta viva sem ninguém declarar. */
export const ANGULO_DE_ARESTA = 40;
/* A flecha admitida, como fração da maior extensão da forma: os 0,35 px de `FLECHA_PX` (a flecha de `ladosPorEscala`) num conjunto de
   500 px (`PX_DO_CONJUNTO`), e o mínimo em mm. */
export const TOLERANCIA_RELATIVA = 0.35 / 500;
export const TOLERANCIA_MINIMA_MM = 0.02;
/* O maior passo angular de um contorno curvo, em graus por lado. */
export const PASSO_ANGULAR_MAXIMO = 6;
export const ESTACOES_POR_TRECHO = 16;
export const ESTACOES_MAXIMAS = 200;
/* Duas alturas a menos disto uma da outra são a mesma (o degrau da revolução). */
const MESMA_ALTURA = 1e-9;

export const toleranciaDe = (extensao) => Math.max(extensao * TOLERANCIA_RELATIVA, TOLERANCIA_MINIMA_MM);

/* O passo angular, em graus, de um arco de raio `raio` cuja flecha fica abaixo de `tol`: o menor entre o máximo e o da flecha. */
export function passoAngularDe(raio, tol) {
  if (!(raio > tol)) return PASSO_ANGULAR_MAXIMO;
  return Math.min(PASSO_ANGULAR_MAXIMO, (2 * Math.acos(1 - tol / raio) * 180) / Math.PI);
}

/* Os lados de um contorno que dá a volta inteira com raio `raio` (a elipse, a revolução): múltiplo de 4, entre 48 e 96. */
export function ladosDoContorno(raio, tol) {
  const lados = Math.ceil(360 / passoAngularDe(raio, tol) / 4) * 4;
  return Math.min(96, Math.max(48, lados));
}

/* Os segmentos de um canto arredondado de 90 graus de raio `raio`: os 4 de sempre num canto que cabe na flecha, no máximo 12. */
export function segmentosDoCanto(raio, tol) {
  if (!(raio > tol)) return 4;
  return Math.min(12, Math.max(4, Math.ceil(90 / passoAngularDe(raio, tol))));
}

/* ---------- a tangente ---------- */

/* A tangente de um nó entre dois trechos (h0 e h1 de largura, d0 e d1 de inclinação da corda): média harmônica ponderada, zero
   quando a inclinação troca de sinal (um extremo) ou some. */
function tangenteInterna(h0, h1, d0, d1) {
  if (d0 * d1 <= 0) return 0;
  const a = 2 * h1 + h0;
  const b = h1 + 2 * h0;
  return (a + b) / (a / d0 + b / d1);
}

/* A tangente da ponta de uma curva pelos três pontos mais próximos, limitada para não passar do dado (a fórmula de forma
   preservada do PCHIP). `h0, d0` são o trecho da ponta e `h1, d1` o seguinte. */
function tangenteDaPonta(h0, h1, d0, d1) {
  let d = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(d) !== Math.sign(d0)) d = 0;
  else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(d) > 3 * Math.abs(d0)) d = 3 * d0;
  return d;
}

/* As tangentes à esquerda e à direita de cada nó, para cada coordenada. `Y[k]` é a lista de coordenadas do nó k, `w[k]` a posição
   dele e `viva[k]` diz se é aresta. Devolve { esq, dir }, cada um uma lista por nó de uma lista por coordenada (undefined onde o
   nó não tem aquele lado). */
function tangentes(w, Y, viva) {
  const m = w.length;
  const C = Y[0].length;
  const h = Array.from({ length: m - 1 }, (_, k) => w[k + 1] - w[k]);
  const util = h.map((x) => x > MESMA_ALTURA);
  const inclinacao = (k) => Y[k].map((y, c) => (Y[k + 1][c] - y) / h[k]);
  const sec = h.map((_, k) => (util[k] ? inclinacao(k) : null));
  const esq = new Array(m);
  const dir = new Array(m);
  for (let k = 0; k < m; k++) {
    const temEsq = k > 0 && util[k - 1];
    const temDir = k < m - 1 && util[k];
    const lisoDe = (j) => !viva[j] && j > 0 && j < m - 1 && util[j - 1] && util[j];
    if (temEsq && temDir && !viva[k]) {
      const t = Array.from({ length: C }, (_, c) => tangenteInterna(h[k - 1], h[k], sec[k - 1][c], sec[k][c]));
      esq[k] = t; dir[k] = t;
    } else {
      if (temEsq) {
        /* a ponta direita de um trecho que acaba aqui: os três pontos, se o vizinho de lá é liso, senão a própria corda */
        esq[k] = k >= 2 && util[k - 2] && lisoDe(k - 1) ? Array.from({ length: C }, (_, c) => tangenteDaPonta(h[k - 1], h[k - 2], sec[k - 1][c], sec[k - 2][c])) : sec[k - 1];
      }
      if (temDir) {
        dir[k] = k + 2 < m && util[k + 1] && lisoDe(k + 1) ? Array.from({ length: C }, (_, c) => tangenteDaPonta(h[k], h[k + 1], sec[k][c], sec[k + 1][c])) : sec[k];
      }
    }
  }
  return { esq, dir, h, util };
}

/* A cúbica de Hermite do trecho k em t (0 a 1), para todas as coordenadas. */
function hermite(Y, T, h, k, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const [h00, h10, h01, h11] = [2 * t3 - 3 * t2 + 1, t3 - 2 * t2 + t, -2 * t3 + 3 * t2, t3 - t2];
  const d0 = T.dir[k];
  const d1 = T.esq[k + 1];
  return Y[k].map((y0, c) => h00 * y0 + h10 * h * d0[c] + h01 * Y[k + 1][c] + h11 * h * d1[c]);
}

/* ---------- as arestas ---------- */

/* O ângulo, em graus, entre a corda que chega à seção k e a que sai dela, o maior entre os pontos do contorno (o vetor de cada
   ponto é [du, dv, dw] em mm). */
function quebraEm(secoes, k) {
  const a = secoes[k - 1];
  const b = secoes[k];
  const c = secoes[k + 1];
  let maior = 0;
  for (let i = 0; i < b.perfil.length; i++) {
    const v0 = [b.perfil[i][0] - a.perfil[i][0], b.perfil[i][1] - a.perfil[i][1], b.w - a.w];
    const v1 = [c.perfil[i][0] - b.perfil[i][0], c.perfil[i][1] - b.perfil[i][1], c.w - b.w];
    const n = Math.hypot(...v0) * Math.hypot(...v1);
    if (!(n > 1e-12)) continue;
    const cos = Math.min(1, Math.max(-1, (v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2]) / n));
    maior = Math.max(maior, (Math.acos(cos) * 180) / Math.PI);
  }
  return maior;
}

/* ---------- a densidade ---------- */

/* Quantos subtrechos o trecho k pede: a flecha no meio de cada subtrecho, contra a corda dele, fica abaixo de `tol`. */
function subtrechosDe(Y, T, k, tol, maximo) {
  const h = T.h[k];
  const flecha = (s) => {
    let pior = 0;
    for (let j = 0; j < s; j++) {
      const [t0, t1] = [j / s, (j + 1) / s];
      const [a, b, m] = [hermite(Y, T, h, k, t0), hermite(Y, T, h, k, t1), hermite(Y, T, h, k, (t0 + t1) / 2)];
      for (let c = 0; c + 1 < m.length; c += 2) pior = Math.max(pior, Math.hypot(m[c] - (a[c] + b[c]) / 2, m[c + 1] - (a[c + 1] + b[c + 1]) / 2));
    }
    return pior;
  };
  const meio = flecha(1);
  if (meio <= tol) return 1;
  let s = Math.min(maximo, Math.max(2, Math.ceil(Math.sqrt(meio / tol))));
  while (s < maximo && flecha(s) > tol) s++;
  return s;
}

/* Densifica as seções `secoes` do loft ([{ w, perfil: [[u, v], ...] }], todas com o mesmo número de pontos, em ordem crescente de
   w; a revolução usa `densificarPerfil`) em estações que passam por todas elas. `extensao` é a maior extensão da forma, em mm;
   `arestas[k]` é true, false ou undefined (decide o ângulo). `nos` (opcional) são as posições w das estações já escolhidas por
   outra superfície (a parede de dentro de uma casca acompanha a de fora): então só avalia a curva nelas. Devolve
   { secoes, declaradas, vivas, arestas, nos }: as estações (as seções declaradas entram como vieram, nos índices `declaradas`),
   o conjunto dos índices das estações que são aresta viva, a aresta de cada seção declarada e o w de cada estação. */
export function densificar(secoes, { extensao, arestas = [], nos = null }) {
  const m = secoes.length;
  const viva = secoes.map((_, k) => {
    if (k === 0 || k === m - 1) return false;
    const antes = secoes[k].w - secoes[k - 1].w;
    const depois = secoes[k + 1].w - secoes[k].w;
    if (antes <= MESMA_ALTURA || depois <= MESMA_ALTURA) return true;
    return arestas[k] === undefined ? quebraEm(secoes, k) > ANGULO_DE_ARESTA : arestas[k] === true;
  });
  const reta = m < 3 && secoes.every((sc, k) => k === 0 || sc.w - secoes[k - 1].w > MESMA_ALTURA);
  const Y = secoes.map((sc) => sc.perfil.flatMap((q) => [q[0], q[1]]));
  const w = secoes.map((sc) => sc.w);
  const T = reta ? null : tangentes(w, Y, viva);
  let estacoes;
  if (nos) {
    estacoes = T ? T.h.map((_, k) => nos.filter((x) => x > w[k] + MESMA_ALTURA && x < w[k + 1] - MESMA_ALTURA)) : [];
  } else if (T) {
    const tol = toleranciaDe(extensao);
    const pedidos = T.h.map((_, k) => (T.util[k] ? subtrechosDe(Y, T, k, tol, ESTACOES_POR_TRECHO) : 0));
    const total = pedidos.reduce((a, s) => a + s, 0);
    const escala = total > ESTACOES_MAXIMAS ? ESTACOES_MAXIMAS / total : 1;
    estacoes = pedidos.map((s, k) => {
      const quantas = s === 0 ? 0 : Math.max(1, Math.floor(s * escala));
      return Array.from({ length: Math.max(0, quantas - 1) }, (_, j) => w[k] + ((j + 1) / quantas) * T.h[k]);
    });
  } else {
    estacoes = [];
  }
  const resultado = [];
  const declaradas = [];
  const vivas = new Set();
  for (let k = 0; k < m; k++) {
    declaradas.push(resultado.length);
    if (viva[k]) vivas.add(resultado.length);
    resultado.push(secoes[k]);
    if (k === m - 1) continue;
    for (const x of estacoes[k] ?? []) {
      const y = hermite(Y, T, T.h[k], k, (x - w[k]) / T.h[k]);
      resultado.push({ w: x, perfil: secoes[k].perfil.map((_, i) => [y[2 * i], y[2 * i + 1]]) });
    }
  }
  return { secoes: resultado, declaradas, vivas, arestas: viva, nos: resultado.map((sc) => sc.w) };
}

/* O perfil de uma revolução (`[{ raio, altura }, ...]`, a altura sempre crescente ou igual) como curva suave. O contorno que gira é
   uma curva no plano (raio, altura) e não um gráfico sobre a altura: a parede quase vertical de um pneu, o ombro de um cone, o degrau
   de uma flange têm inclinação enorme contra a altura, e uma cúbica em função da altura os arredondaria para longe do perfil. Por isso
   a cúbica anda pelo comprimento de corda (cada coordenada, raio e altura, em função dele), com as mesmas tangentes, arestas e flecha
   de `densificar`. Devolve { pontos, declaradas, vivas } como `densificar`, os pontos como { raio, altura }. */
export function densificarPerfil(pontos, { extensao, arestas = [] }) {
  const m = pontos.length;
  const Y = pontos.map((q) => [q.raio, q.altura]);
  const s = [0];
  for (let k = 1; k < m; k++) s.push(s[k - 1] + Math.hypot(Y[k][0] - Y[k - 1][0], Y[k][1] - Y[k - 1][1]));
  const viva = pontos.map((_, k) => {
    if (k === 0 || k === m - 1) return false;
    if (arestas[k] !== undefined) return arestas[k] === true;
    const a = [Y[k][0] - Y[k - 1][0], Y[k][1] - Y[k - 1][1]];
    const b = [Y[k + 1][0] - Y[k][0], Y[k + 1][1] - Y[k][1]];
    const cos = Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))));
    return (Math.acos(cos) * 180) / Math.PI > ANGULO_DE_ARESTA;
  });
  const saida = [];
  const declaradas = [];
  const vivas = new Set();
  if (m < 3) return { pontos: pontos.map((q) => ({ ...q })), declaradas: pontos.map((_, k) => k), vivas };
  const T = tangentes(s, Y, viva);
  const tol = toleranciaDe(extensao);
  const pedidos = T.h.map((_, k) => subtrechosDe(Y, T, k, tol, ESTACOES_POR_TRECHO));
  const total = pedidos.reduce((a, x) => a + x, 0);
  const escala = total > ESTACOES_MAXIMAS ? ESTACOES_MAXIMAS / total : 1;
  for (let k = 0; k < m; k++) {
    declaradas.push(saida.length);
    if (viva[k]) vivas.add(saida.length);
    saida.push({ ...pontos[k] });
    if (k === m - 1) continue;
    const quantas = Math.max(1, Math.floor(pedidos[k] * escala));
    for (let j = 1; j < quantas; j++) {
      const [raio, altura] = hermite(Y, T, T.h[k], k, j / quantas);
      /* a altura de uma curva que sobe nunca desce: o arredondamento não a faz voltar */
      saida.push({ raio: Math.max(0, raio), altura: Math.min(Math.max(altura, saida[saida.length - 1].altura), Y[k + 1][1]) });
    }
  }
  return { pontos: saida, declaradas, vivas };
}

/* ---------- as normais ---------- */

/* A normal de cada vértice de cada face lateral de um sólido em seções, no desenho liso: a média das normais das faces que se
   encontram no vértice e fazem menos que `cosLimite` com a da própria face (a aresta viva não se alisa). `nm[k][i]` é a normal da
   face i da faixa k, `N` o número de faces por faixa e `vivas` o conjunto das seções que são aresta declarada. Devolve, por faixa e
   por face, as quatro normais na ordem dos vértices da face: (seção k, ponto i), (k, i+1), (k+1, i+1), (k+1, i). */
export function normaisSuavesDasFaixas(nm, N, vivas, cosLimite) {
  const nb = nm.length;
  const norm = (v) => { const t = Math.hypot(v[0], v[1], v[2]); return t > 1e-12 ? [v[0] / t, v[1] / t, v[2] / t] : v; };
  return nm.map((faixa, k) => faixa.map((n, i) => {
    /* o vértice (seção s, ponto p) é tocado pelas faces (s-1, p-1), (s-1, p), (s, p-1) e (s, p) */
    const em = (s, p) => {
      let soma = [n[0], n[1], n[2]];
      for (const fk of [s - 1, s]) {
        if (fk < 0 || fk >= nb) continue;
        /* a aresta viva é a seção: as faces do outro lado dela não entram */
        if (vivas.has(s) && fk !== k) continue;
        for (const fi of [(p - 1 + N) % N, p % N]) {
          if (fk === k && fi === i) continue;
          const o = nm[fk][fi];
          if (o[0] * n[0] + o[1] * n[1] + o[2] * n[2] >= cosLimite) soma = [soma[0] + o[0], soma[1] + o[1], soma[2] + o[2]];
        }
      }
      return norm(soma);
    };
    const j = (i + 1) % N;
    return [em(k, i), em(k, j), em(k + 1, j), em(k + 1, i)];
  }));
}
