/* borda-subpixel.js — a linha de cada parte passa pela borda da imagem dentro
 * do pixel, e não pela borda da máscara.
 *
 * A partição em partes é a do watershed: cada pixel tem dono, e a divisa entre
 * duas partes é a linha de 1 px que o watershed deixa (rótulo -1). O que muda
 * aqui é só onde a linha de cada borda passa. A máscara binária dava um degrau
 * de 1 px em toda borda inclinada, e as peças pequenas (hélice, cone, escapes,
 * janelas) saíam amassadas. A imagem tem tons intermediários na borda, e o
 * tom diz onde a borda cruza o pixel.
 *
 * O caminho é este:
 *  1. Campo de tom `w`. Na vizinhança da borda da silhueta (`FAIXA_DA_BORDA_PX`),
 *     `w = cinza - (fundo + tinta) / 2`, onde `tinta` é o menor cinza em 5 x 5
 *     em volta do pixel: a isolinha `w = 0` é o meio-tom entre o fundo e o traço
 *     escuro que a borda tem ali. Fora da faixa, `w` só tem o sinal da máscara
 *     (dentro negativo, fora positivo). Dentro da faixa a máscara continua
 *     mandando no que ela pôs fora (o dente que a abertura tirou não volta), e o
 *     tom no que ela pôs dentro, salvo o pixel claro que o fundo não alcança
 *     (o buraco fechado, ou o claro de dentro de uma linha escura fina), que
 *     fica dentro.
 *  2. Cada pixel do quadrado entre quatro centros de pixel é repartido em
 *     `SUBAMOSTRAS_DA_BORDA` por lado. A subamostra fora do tom (w interpolado
 *     bilinear, positivo) é fundo; dentro, é da parte cujo rótulo, suavizado
 *     (binomial 3 x 3 e interpolação bilinear), tem o maior peso, e a linha de 1
 *     px da divisa conta metade para cada vizinha. A divisa entre duas partes
 *     fica no meio da linha do watershed e sai sem degrau.
 *  3. As fronteiras entre rótulos distintos formam um grafo planar na grade das
 *     subamostras. Cada cadeia entre duas junções é simplificada uma vez
 *     (Douglas-Peucker) e as duas partes que a dividem usam a mesma, uma de
 *     frente e outra de trás: não sobra buraco nem sobreposição. O contorno de
 *     uma parte, e o da silhueta, são anéis montados com essas cadeias.
 *
 * Coordenada: o centro do pixel (x, y) é o ponto (x, y), e a borda da imagem
 * fica em -0.5 e em largura - 0.5. Um retângulo de pixels de x = 10 a 109 sai de
 * 9.5 a 109.5, e não de 10 a 109 como no contorno de pixel de borda. */

export const SUBAMOSTRAS_DA_BORDA = 8;
export const TOLERANCIA_DO_TRACO_PX = 0.35;
export const FAIXA_DA_BORDA_PX = 3;
const TOLERANCIA_MINIMA_DO_TRACO_PX = 0.05;
/* Até onde o traço escuro da borda é procurado em volta do pixel, para o meio-tom:
   o halo claro do desenho tem 1 a 2 px entre o fundo e a linha. */
const RAIO_DA_TINTA_PX = 2;
const GRANDE = 1000;
const EPS = 0.01;
const MAXIMO_DE_CELULAS = 60e6;

const arred = (v) => Math.round(v * 1e6) / 1e6;

/* Verdadeiro em todo pixel que tem algum `bin` a até `r` pixels (Chebyshev). */
function dilatarQuadrado(bin, largura, altura, r) {
  const meio = new Uint8Array(bin.length); const saida = new Uint8Array(bin.length);
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    let alg = 0;
    for (let d = -r; d <= r && !alg; d += 1) { const a = x + d; if (a >= 0 && a < largura && bin[y * largura + a]) alg = 1; }
    meio[y * largura + x] = alg;
  }
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    let alg = 0;
    for (let d = -r; d <= r && !alg; d += 1) { const b = y + d; if (b >= 0 && b < altura && meio[b * largura + x]) alg = 1; }
    saida[y * largura + x] = alg;
  }
  return saida;
}

function minimoDeRaio(cinza, largura, altura, r) {
  const meio = new Uint8Array(cinza.length); const saida = new Uint8Array(cinza.length);
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    let m = 255;
    for (let d = -r; d <= r; d += 1) { const a = Math.min(largura - 1, Math.max(0, x + d)); const v = cinza[y * largura + a]; if (v < m) m = v; }
    meio[y * largura + x] = m;
  }
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    let m = 255;
    for (let d = -r; d <= r; d += 1) { const b = Math.min(altura - 1, Math.max(0, y + d)); const v = meio[b * largura + x]; if (v < m) m = v; }
    saida[y * largura + x] = m;
  }
  return saida;
}

/* O tom do fundo: a mediana do cinza dos pixels fora da silhueta e a mais de 4
   px dela. Sem nenhum pixel assim, o do fundo fora da silhueta; sem nenhum, 255. */
export function tomDoFundo(cinza, silhueta, largura, altura) {
  const perto = dilatarQuadrado(silhueta.map((v) => (v ? 1 : 0)), largura, altura, 4);
  const mediana = (aceita) => {
    const h = new Uint32Array(256); let n = 0;
    for (let p = 0; p < cinza.length; p += 1) if (aceita(p)) { h[cinza[p]] += 1; n += 1; }
    if (!n) return null;
    let soma = 0;
    for (let v = 0; v < 256; v += 1) { soma += h[v]; if (soma * 2 >= n) return v; }
    return 255;
  };
  return mediana((p) => !silhueta[p] && !perto[p]) ?? mediana((p) => !silhueta[p]) ?? 255;
}

/* O campo de tom (negativo dentro, positivo fora). */
export function campoDeTom(cinza, silhueta, largura, altura, { limiar, fundo, faixa = FAIXA_DA_BORDA_PX }) {
  const dentro = silhueta.map((v) => (v ? 1 : 0));
  const fora = dentro.map((v) => 1 - v);
  const temDentro = dilatarQuadrado(dentro, largura, altura, faixa);
  const temFora = dilatarQuadrado(fora, largura, altura, faixa);
  const tinta = minimoDeRaio(cinza, largura, altura, RAIO_DA_TINTA_PX);
  const w = new Float32Array(cinza.length);
  const naFaixa = new Uint8Array(w.length);
  for (let p = 0; p < w.length; p += 1) {
    if (!(temDentro[p] && temFora[p])) { w[p] = dentro[p] ? -GRANDE : GRANDE; continue; }
    naFaixa[p] = 1;
    const v = cinza[p] - (fundo + tinta[p]) / 2;
    /* O tom manda no que a máscara pôs dentro (a reentrância que o fechamento
       preencheu é de tom claro e fica fora, como a imagem mostra; o buraco
       fechado, cercado de pixels escuros, volta a ser dentro mais abaixo). A
       máscara manda no que ela pôs fora: o dente que a abertura tirou fica fora,
       à mesma distância do meio-tom, e só a posição da borda vem do tom. */
    w[p] = dentro[p] ? v : Math.max(Math.abs(v), EPS);
  }
  /* Só é fundo o pixel de tom claro que o fundo alcança por vizinhos de lado, a
     até `faixa` pixels da máscara. O pixel claro de dentro do desenho encostado
     numa linha escura fina (a parte de cor clara com contorno de 1 px) tem o meio-tom
     acima do tom dele, e sem esta regra sairia como fundo e a borda daria a volta
     pela linha, por dentro. Uma linha de 1 px de largura fecha a passagem. */
  const fundoAlcancado = new Uint8Array(w.length);
  let fila = [];
  for (let p = 0; p < w.length; p += 1) if (naFaixa[p] && !dentro[p] && w[p] >= 0) { fundoAlcancado[p] = 1; fila.push(p); }
  for (let passo = 0; passo < faixa && fila.length; passo += 1) {
    const prox = [];
    for (const p of fila) {
      const x = p % largura; const y = (p - x) / largura;
      for (const q of [x > 0 ? p - 1 : -1, x < largura - 1 ? p + 1 : -1, y > 0 ? p - largura : -1, y < altura - 1 ? p + largura : -1]) {
        if (q >= 0 && !fundoAlcancado[q] && naFaixa[q] && w[q] >= 0) { fundoAlcancado[q] = 1; prox.push(q); }
      }
    }
    fila = prox;
  }
  for (let p = 0; p < w.length; p += 1) if (naFaixa[p] && w[p] >= 0 && !fundoAlcancado[p]) w[p] = -EPS;
  return w;
}

/* O dono de cada pixel para o traçado: 0 fora da silhueta, 1 dentro dela sem
   parte, 2 em diante a parte, -1 na divisa entre partes. */
export function donosDoTraco(rotulos, silhueta) {
  const dono = new Int16Array(rotulos.length);
  for (let p = 0; p < dono.length; p += 1) {
    if (!silhueta[p]) continue;
    dono[p] = rotulos[p] >= 2 ? rotulos[p] : (rotulos[p] === -1 ? -1 : 1);
  }
  return dono;
}

/* Os rótulos da grade de subamostras. A grade tem (largura + 1) * K colunas: o
   quadrado entre os centros dos pixels x e x + 1 vai de x a x + 1, e o primeiro
   começa em -1, de modo que a borda da imagem (-0.5) cai numa linha da grade. */
export function rotularSubamostras({ dono, w, largura, altura, K, maiorRotulo }) {
  const RX = (largura + 1) * K; const RY = (altura + 1) * K;
  const R = maiorRotulo < 255 ? new Uint8Array(RX * RY) : new Uint16Array(RX * RY);
  const grampo = (v, m) => (v < 0 ? 0 : v > m ? m : v);
  const partilhas = new Map();
  /* Contribuição de um pixel a cada rótulo: o dono inteiro, e a linha de 1 px da
     divisa repartida entre as vizinhas de 8 em proporção ao número delas, de
     modo que a divisa entre duas partes cai no meio da linha do watershed. */
  const contribuicao = (p) => {
    const d = dono[p];
    if (d >= 1) return [[d, 1]];
    if (d === 0) return null;
    let c = partilhas.get(p);
    if (c) return c;
    const x = p % largura; const y = (p - x) / largura; const conta = new Map(); let total = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const a = x + dx; const b = y + dy;
      if ((!dx && !dy) || a < 0 || b < 0 || a >= largura || b >= altura) continue;
      const v = dono[b * largura + a];
      if (v >= 1) { conta.set(v, (conta.get(v) ?? 0) + 1); total += 1; }
    }
    c = total ? [...conta].sort((a, b) => a[0] - b[0]).map(([r, n]) => [r, n / total]) : [];
    partilhas.set(p, c);
    return c;
  };
  const pesos = [1, 2, 1];
  for (let cj = 0; cj <= altura; cj += 1) {
    for (let ci = 0; ci <= largura; ci += 1) {
      const cx = ci - 1; const cy = cj - 1;
      const x0 = grampo(cx, largura - 1); const x1 = grampo(cx + 1, largura - 1);
      const y0 = grampo(cy, altura - 1); const y1 = grampo(cy + 1, altura - 1);
      const p00 = y0 * largura + x0; const p10 = y0 * largura + x1; const p01 = y1 * largura + x0; const p11 = y1 * largura + x1;
      const d = dono[p00];
      const w00 = w[p00]; const w10 = w[p10]; const w01 = w[p01]; const w11 = w[p11];
      const todosIguais = dono[p10] === d && dono[p01] === d && dono[p11] === d;
      if (todosIguais && d === 0) continue;
      const sinais = (w00 < 0) + (w10 < 0) + (w01 < 0) + (w11 < 0);
      if (todosIguais && d >= 1 && sinais === 0) continue;
      if (todosIguais && d >= 1 && sinais === 4) {
        for (let b = 0; b < K; b += 1) R.fill(d, (cj * K + b) * RX + ci * K, (cj * K + b) * RX + ci * K + K);
        continue;
      }
      /* Os rótulos que pesam na vizinhança 4 x 4 de pixels em volta do quadrado. */
      const janela = []; const rotulosDaJanela = [];
      for (let oy = 0; oy < 4; oy += 1) for (let ox = 0; ox < 4; ox += 1) {
        const c = contribuicao(grampo(cy - 1 + oy, altura - 1) * largura + grampo(cx - 1 + ox, largura - 1));
        janela.push(c);
        if (c) for (const [r] of c) if (!rotulosDaJanela.includes(r)) rotulosDaJanela.push(r);
      }
      rotulosDaJanela.sort((a, b) => a - b);
      const n = rotulosDaJanela.length;
      const B = new Float64Array(4 * Math.max(1, n));
      if (n > 1) {
        for (let oy = 0; oy < 2; oy += 1) for (let ox = 0; ox < 2; ox += 1) {
          for (let dy = 0; dy < 3; dy += 1) for (let dx = 0; dx < 3; dx += 1) {
            const c = janela[(oy + dy) * 4 + ox + dx];
            if (!c) continue;
            const peso = (pesos[dx] * pesos[dy]) / 16;
            for (const [r, q] of c) B[(oy * 2 + ox) * n + rotulosDaJanela.indexOf(r)] += peso * q;
          }
        }
      }
      const unico = n === 1 ? rotulosDaJanela[0] : 1;
      for (let b = 0; b < K; b += 1) {
        const v = (b + 0.5) / K; const y = cy + v;
        if (y < -0.5 || y > altura - 0.5) continue;
        for (let a = 0; a < K; a += 1) {
          const u = (a + 0.5) / K; const x = cx + u;
          if (x < -0.5 || x > largura - 0.5) continue;
          const t = (1 - u) * (1 - v) * w00 + u * (1 - v) * w10 + (1 - u) * v * w01 + u * v * w11;
          if (t >= 0) continue;
          let rotulo = unico;
          if (n > 1) {
            let melhor = -1;
            for (let k = 0; k < n; k += 1) {
              const m = (1 - u) * (1 - v) * B[k] + u * (1 - v) * B[n + k] + (1 - u) * v * B[2 * n + k] + u * v * B[3 * n + k];
              if (m > melhor + 1e-12) { melhor = m; rotulo = rotulosDaJanela[k]; }
            }
          }
          R[(cj * K + b) * RX + ci * K + a] = rotulo;
        }
      }
    }
  }
  return { R, RX, RY };
}

/* Douglas-Peucker com os extremos fixos; devolve os índices que ficam. A
   distância é a do ponto ao segmento, e a cadeia fechada sobre si mesma (o
   mesmo ponto nos dois extremos) também funciona. */
export function indicesSimplificados(pts, eps) {
  const n = pts.length;
  const fica = new Uint8Array(n);
  fica[0] = 1; fica[n - 1] = 1;
  const distancia = (p, a, b) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const q = dx * dx + dy * dy;
    const t = q ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / q)) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };
  const pilha = [[0, n - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop();
    if (b <= a + 1) continue;
    let m = -1; let dm = -1;
    for (let i = a + 1; i < b; i += 1) { const d = distancia(pts[i], pts[a], pts[b]); if (d > dm) { dm = d; m = i; } }
    if (dm > eps) { fica[m] = 1; pilha.push([a, m], [m, b]); }
  }
  const lista = [];
  for (let i = 0; i < n; i += 1) if (fica[i]) lista.push(i);
  return lista;
}

/* As cadeias de fronteira entre rótulos distintos, entre duas junções (vértice
   da grade com três ou mais fronteiras) ou fechadas sobre si mesmas. Cada uma
   leva o rótulo da esquerda (`esq`) e o da direita (`dir`) de quem a percorre de
   `a` para `b`, em coordenada de imagem (y para baixo), os pontos densos
   (`bruto`) e os simplificados (`simpl`, com o índice de cada um em `bruto`). */
export function extrairCadeias(R, RX, RY, K, tolerancia) {
  const ev0 = []; const ev1 = []; const eE = []; const eD = [];
  const largV = RX + 1;
  for (let j = 0; j <= RY; j += 1) {
    for (let i = 0; i < RX; i += 1) {
      const acima = j > 0 ? R[(j - 1) * RX + i] : 0; const abaixo = j < RY ? R[j * RX + i] : 0;
      if (acima !== abaixo) { ev0.push(j * largV + i); ev1.push(j * largV + i + 1); eE.push(acima); eD.push(abaixo); }
    }
  }
  for (let i = 0; i <= RX; i += 1) {
    for (let j = 0; j < RY; j += 1) {
      const esq = i > 0 ? R[j * RX + i - 1] : 0; const dir = i < RX ? R[j * RX + i] : 0;
      if (esq !== dir) { ev0.push(j * largV + i); ev1.push((j + 1) * largV + i); eE.push(dir); eD.push(esq); }
    }
  }
  const nE = ev0.length;
  const adj = new Map();
  const liga = (v, e) => { const l = adj.get(v); if (l) l.push(e); else adj.set(v, [e]); };
  for (let e = 0; e < nE; e += 1) { liga(ev0[e], e); liga(ev1[e], e); }
  const ehNo = (v) => adj.get(v).length >= 3;
  const nos = [...adj].filter(([, l]) => l.length >= 3).map(([v]) => v).sort((a, b) => a - b);
  const visto = new Uint8Array(nE);
  const xy = (v) => { const i = v % largV; return [i / K - 1, (v - i) / largV / K - 1]; };
  const cadeias = [];
  const caminhar = (v0, e0) => {
    const verts = [v0]; let e = e0; let v = v0;
    for (;;) {
      visto[e] = 1;
      const w = ev0[e] === v ? ev1[e] : ev0[e];
      verts.push(w);
      if (ehNo(w) || w === v0) break;
      const l = adj.get(w); e = l[0] === e ? l[1] : l[0]; v = w;
    }
    const direta = ev0[e0] === v0;
    const bruto = verts.map(xy);
    const sinal = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
    const n = bruto.length;
    const fechada = !ehNo(v0);
    let idx;
    if (fechada) {
      let m = 1; let dm = -1;
      for (let i = 1; i < n - 1; i += 1) { const d = Math.hypot(bruto[i][0] - bruto[0][0], bruto[i][1] - bruto[0][1]); if (d > dm) { dm = d; m = i; } }
      const a = indicesSimplificados(bruto.slice(0, m + 1), tolerancia);
      const b = indicesSimplificados(bruto.slice(m), tolerancia).map((i) => i + m);
      idx = [...a, ...b.slice(1)];
    } else idx = indicesSimplificados(bruto, tolerancia);
    cadeias.push({
      a: fechada ? -1 : v0, b: fechada ? -1 : verts[n - 1],
      esq: direta ? eE[e0] : eD[e0], dir: direta ? eD[e0] : eE[e0],
      bruto, idx, simpl: idx.map((i) => bruto[i]),
      dIni: sinal(bruto[0], bruto[1]), dFim: sinal(bruto[n - 2], bruto[n - 1]),
    });
  };
  for (const v of nos) for (const e of adj.get(v)) if (!visto[e]) caminhar(v, e);
  for (let e = 0; e < nE; e += 1) if (!visto[e]) caminhar(ev0[e], e);
  return cadeias;
}

/* Os usos de uma cadeia: um para cada lado. O uso de frente tem a cadeia à
   direita de quem anda e `esq` à esquerda; o de trás, o contrário. */
export function usosDaCadeia(cadeia, indice, lado) {
  const frente = lado === 'esq';
  return {
    cadeia: indice, inv: !frente, rotulo: frente ? cadeia.esq : cadeia.dir,
    ini: frente ? cadeia.a : cadeia.b, fim: frente ? cadeia.b : cadeia.a,
    dIni: frente ? cadeia.dIni : cadeia.dFim.map((v) => -v), dFim: frente ? cadeia.dFim : cadeia.dIni.map((v) => -v),
  };
}

/* Os pontos de um uso, na ordem em que ele é percorrido. */
export const pontosDoUso = (cadeias, uso) => (uso.inv ? [...cadeias[uso.cadeia].simpl].reverse() : cadeias[uso.cadeia].simpl);

/* Liga os usos em anéis: o fim de um é o começo do próximo. Onde mais de um
   uso começa na mesma junção (duas regiões que só se tocam pelo canto), vale a
   curva mais à esquerda, que segura cada região em 4 vizinhos. */
export function montarAneis(usos) {
  const porIni = new Map();
  usos.forEach((u, k) => { if (u.ini >= 0) { const l = porIni.get(u.ini); if (l) l.push(k); else porIni.set(u.ini, [k]); } });
  const usado = new Uint8Array(usos.length);
  const aneis = [];
  for (let k = 0; k < usos.length; k += 1) {
    if (usado[k]) continue;
    const anel = [k]; usado[k] = 1;
    if (usos[k].ini >= 0) {
      for (let atual = k; ;) {
        const u = usos[atual];
        const candidatos = (porIni.get(u.fim) ?? []).filter((c) => !usado[c] || c === k);
        if (!candidatos.length) throw new Error('a fronteira de uma região não fecha; o traço subpixel parou numa junção sem saída.');
        const esquerda = (c) => usos[c].dIni[0] * u.dFim[1] - usos[c].dIni[1] * u.dFim[0];
        const prox = candidatos.reduce((m, c) => (esquerda(c) > esquerda(m) ? c : m));
        if (prox === k) break;
        anel.push(prox); usado[prox] = 1; atual = prox;
      }
    }
    aneis.push(anel);
  }
  return aneis;
}

export function pontosDoAnel(cadeias, usos, anel) {
  const pts = [];
  /* Uma cadeia menor que a tolerância, que sai de uma junção e volta a ela, fica
     reduzida a um ponto, e o ponto repetido sai. */
  const poe = (q) => { const u = pts[pts.length - 1]; if (!u || u[0] !== q[0] || u[1] !== q[1]) pts.push(q); };
  for (const k of anel) { const p = pontosDoUso(cadeias, usos[k]); for (let i = 0; i < p.length - 1; i += 1) poe(p[i]); }
  while (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts;
}

/* Área com sinal (fórmula do cadarço, y para baixo): o anel de fora de uma
   região, percorrido com ela à esquerda, sai negativo. */
export function areaComSinal(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) { const [ax, ay] = pts[i]; const [bx, by] = pts[(i + 1) % pts.length]; s += ax * by - bx * ay; }
  return s / 2;
}

export function perimetro(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) { const [ax, ay] = pts[i]; const [bx, by] = pts[(i + 1) % pts.length]; s += Math.hypot(bx - ax, by - ay); }
  return s;
}

/* Área mínima, em px², de um pedaço de parte além do maior, medida na linha
   subpixel (a área de verdade, e não a do contorno de pixel de borda, que é menor
   por meio perímetro). O que a grade de subamostras deixa de ilha é de 3 px² ou
   menos (a divisa do watershed, que o desfoque do rótulo quase sempre absorve), e
   o menor pedaço que é parte, uma janela vista de cima, tem 35 px². O trecho do chão
   da frontal do avião, de 1,2 px de altura e 12 a 15 px de comprimento, tem 17 a 21,
   e é pedaço. 8 é o mesmo quadrado de 3 x 3 px do mínimo do contorno de máscara
   (`MINIMO_DO_PEDACO_PX2`, 9), com os cantos cortados pelo meio-tom. */
export const MINIMO_DO_PEDACO_SUBPIXEL_PX2 = 8;

/* Os pedaços externos de um conjunto de anéis, do maior para o menor, sem os de
   área abaixo do mínimo, salvo o maior. */
export function pedacosDosAneis(aneis, minimo = MINIMO_DO_PEDACO_SUBPIXEL_PX2) {
  const externos = [];
  for (const pts of aneis) {
    const s = areaComSinal(pts);
    if (s < 0) externos.push({ areaPx: arred(-s), contornoPx: pts.map(([x, y]) => [arred(x), arred(y)]) });
  }
  externos.sort((p, q) => q.areaPx - p.areaPx);
  return externos.filter((p, k) => k === 0 || p.areaPx >= minimo);
}

/* Tudo o que o traço subpixel precisa: o rótulo de cada subamostra, as cadeias
   e, por rótulo, os usos e os anéis. */
export function tracarSubpixel({ dono, w, largura, altura, maiorRotulo, K = SUBAMOSTRAS_DA_BORDA, tolerancia = TOLERANCIA_DO_TRACO_PX }) {
  let k = K;
  while ((largura + 1) * (altura + 1) * k * k > MAXIMO_DE_CELULAS && k > 2) k -= 2;
  const { R, RX, RY } = rotularSubamostras({ dono, w, largura, altura, K: k, maiorRotulo });
  const cadeias = extrairCadeias(R, RX, RY, k, tolerancia);
  const usosPorRotulo = new Map();
  cadeias.forEach((c, i) => {
    for (const lado of ['esq', 'dir']) {
      const uso = usosDaCadeia(c, i, lado);
      if (uso.rotulo < 1) continue;
      const l = usosPorRotulo.get(uso.rotulo); if (l) l.push(uso); else usosPorRotulo.set(uso.rotulo, [uso]);
    }
  });
  const aneisPorRotulo = new Map();
  for (const [rotulo, usos] of usosPorRotulo) {
    const aneis = montarAneis(usos);
    /* Uma parte de poucos pixels, como a saliência de um flap, pode sair da
       simplificação com duas ou três cadeias de dois pontos, e o anel fica sem
       área. Nesse caso as cadeias do anel voltam quase sem simplificar. */
    for (const anel of aneis) {
      if (pontosDoAnel(cadeias, usos, anel).length >= 3) continue;
      for (const k of anel) {
        const c = cadeias[usos[k].cadeia];
        c.idx = indicesSimplificados(c.bruto, TOLERANCIA_MINIMA_DO_TRACO_PX);
        c.simpl = c.idx.map((i) => c.bruto[i]);
      }
    }
    aneisPorRotulo.set(rotulo, aneis);
  }
  /* A posição de cada junção, que a forma declarada pode mover. */
  const nos = new Map();
  for (const c of cadeias) { if (c.a >= 0) nos.set(c.a, c.simpl[0]); if (c.b >= 0) nos.set(c.b, c.simpl[c.simpl.length - 1]); }
  return { K: k, tolerancia, cadeias, nos, usosPorRotulo, aneisPorRotulo };
}

/* Os anéis de um rótulo, como lista de pontos. */
export function aneisDoRotulo(tracado, rotulo) {
  const usos = tracado.usosPorRotulo.get(rotulo) ?? [];
  return (tracado.aneisPorRotulo.get(rotulo) ?? []).map((anel) => pontosDoAnel(tracado.cadeias, usos, anel));
}

/* Preenche, numa grade de K px por lado, o interior dos anéis (par-ímpar). */
function preencherAneis(aneis, largura, altura, K) {
  const RX = (largura + 1) * K; const RY = (altura + 1) * K;
  const R = new Uint8Array(RX * RY);
  for (const pts of aneis) {
    const porLinha = new Map();
    for (let i = 0; i < pts.length; i += 1) {
      const [ax, ay] = pts[i]; const [bx, by] = pts[(i + 1) % pts.length];
      if (ay === by) continue;
      const [y0, y1, xa, xb] = ay < by ? [ay, by, ax, bx] : [by, ay, bx, ax];
      const s0 = Math.max(0, Math.ceil((y0 + 1) * K - 0.5)); const s1 = Math.min(RY - 1, Math.ceil((y1 + 1) * K - 0.5) - 1);
      for (let s = s0; s <= s1; s += 1) {
        const y = (s + 0.5) / K - 1;
        const x = xa + ((y - y0) * (xb - xa)) / (y1 - y0);
        const l = porLinha.get(s); if (l) l.push(x); else porLinha.set(s, [x]);
      }
    }
    for (const [s, xs] of porLinha) {
      xs.sort((a, b) => a - b);
      for (let m = 0; m + 1 < xs.length; m += 2) {
        const c0 = Math.max(0, Math.ceil((xs[m] + 1) * K - 0.5)); const c1 = Math.min(RX - 1, Math.ceil((xs[m + 1] + 1) * K - 0.5) - 1);
        for (let c = c0; c <= c1; c += 1) R[s * RX + c] = 1;
      }
    }
  }
  return { R, RX, RY };
}

/* Cresce a máscara `r` células, no quadrado. */
function crescerMascara(R, RX, RY, r) {
  const meio = new Uint8Array(R.length); const saida = new Uint8Array(R.length);
  for (let y = 0; y < RY; y += 1) for (let x = 0; x < RX; x += 1) {
    let alg = 0;
    for (let d = -r; d <= r && !alg; d += 1) { const a = x + d; if (a >= 0 && a < RX && R[y * RX + a]) alg = 1; }
    meio[y * RX + x] = alg;
  }
  for (let y = 0; y < RY; y += 1) for (let x = 0; x < RX; x += 1) {
    let alg = 0;
    for (let d = -r; d <= r && !alg; d += 1) { const b = y + d; if (b >= 0 && b < RY && meio[b * RX + x]) alg = 1; }
    saida[y * RX + x] = alg;
  }
  return saida;
}

const dentroDoAnel = (pts, x, y) => {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
};

/* A silhueta em pedaços, a partir das cadeias: a região é o que não é fundo
   (rótulo 0) nem parte fora do modelo (`fora`, conjunto de rótulos). O contorno
   usa as mesmas cadeias das partes. `linhasDeFora` é a silhueta crescida `folga`
   px e simplificada em 1 px, só as linhas que envolvem algum pedaço guardado. */
export function silhuetaDoTraco(tracado, { largura, altura, fora = new Set(), folga = 1 }) {
  const dentro = (r) => r >= 1 && !fora.has(r);
  const usos = [];
  tracado.cadeias.forEach((c, i) => {
    const e = dentro(c.esq); const d = dentro(c.dir);
    if (e && !d) usos.push(usosDaCadeia(c, i, 'esq'));
    else if (d && !e) usos.push(usosDaCadeia(c, i, 'dir'));
  });
  const aneis = montarAneis(usos).map((anel) => pontosDoAnel(tracado.cadeias, usos, anel));
  const pedacos = pedacosDosAneis(aneis);
  let linhasDeFora = [];
  if (folga > 0 && pedacos.length) {
    const K = 4;
    const externos = aneis.filter((pts) => areaComSinal(pts) < 0);
    const { R, RX, RY } = preencherAneis(externos, largura, altura, K);
    const grande = crescerMascara(R, RX, RY, folga * K);
    const cadeias = extrairCadeias(grande, RX, RY, K, 1);
    const usosG = cadeias.flatMap((c, i) => [usosDaCadeia(c, i, 'esq'), usosDaCadeia(c, i, 'dir')]).filter((u) => u.rotulo === 1);
    const lista = montarAneis(usosG).map((anel) => pontosDoAnel(cadeias, usosG, anel)).filter((pts) => areaComSinal(pts) < 0);
    lista.sort((p, q) => areaComSinal(p) - areaComSinal(q));
    linhasDeFora = lista
      .filter((pts, k) => k === 0 || pedacos.some(({ contornoPx: [[x, y]] }) => dentroDoAnel(pts, x, y)))
      .map((pts) => pts.map(([x, y]) => [arred(x), arred(y)]));
  } else if (folga <= 0) linhasDeFora = pedacos.map((p) => p.contornoPx);
  return { pedacos, linhasDeFora };
}
