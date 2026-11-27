/* curva.js — a curva do cabo: a elástica discreta entre duas pontas, em milímetro.

   O cabo é uma haste inextensível que sai de cada ponta na direção declarada e tem o comprimento pedido. A forma de menor energia de
   dobra é a que minimiza a soma dos quadrados da segunda diferença entre os nós, com o comprimento de cada trecho fixo; é a elástica
   de Euler, a forma que uma haste elástica de peso desprezível toma entre dois engastes. Com o caimento, entra a energia potencial da
   gravidade em −y, e a curva é a mesma haste pendurada.

   O método: M nós de trechos iguais (h = L / (M − 1)); os dois primeiros e os dois últimos nós ficam fixos (cada ponta sai reta, na
   direção dela, por um trecho). A energia é quadrática (½ yᵀ K y + bᵀ y nos nós livres, K constante) e os M − 3 comprimentos são
   restrições quadráticas. Cada iteração resolve o problema quadrático linearizado nas restrições (o complemento de Schur de K, de
   m × m), e uma projeção de Newton leva os comprimentos ao zero de máquina. Nenhum sorteio, nenhum relógio, nenhum passo que dependa
   da ordem de execução: o número de iterações é fixo e a mesma entrada dá os mesmos bytes.

   A elástica tem mais de uma solução quando a entrada é simétrica (as duas pontas viradas uma para a outra: o cabo arqueia para
   qualquer lado). O palpite inicial, uma Bézier de quarta ordem com a flecha de um lado só, escolhe o lado por uma regra fixa
   (`ladoDoArco`), e a minimização refina a forma nesse lado.

   A curva fechada em volta de si (o laço que se cruza) não existe no plano e a elástica não a desfaz: o cabo recusa o que sai com
   autocontato (`autocontato` em `caminho.js`). */

const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mult = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unitario = (a) => { const n = norma(a); return [a[0] / n, a[1] / n, a[2] / n]; };

export class ErroDaCurva extends Error {
  constructor(mensagem) { super(`curva: ${mensagem}`); this.name = 'ErroDaCurva'; }
}

export const NOS_MINIMOS = 17;
export const NOS_MAXIMOS = 97;
export const ITERACOES = 160;

/** Quantos nós a haste tem: um trecho de 2,5 diâmetros, entre o mínimo e o máximo. */
export function nosDaHaste(comprimento, diametro) {
  return Math.max(NOS_MINIMOS, Math.min(NOS_MAXIMOS, Math.round(comprimento / (2.5 * diametro)) + 1));
}

/* ---- álgebra densa pequena ---- */

/* Cholesky de uma matriz simétrica positiva (lista de linhas); devolve o triângulo inferior. */
function cholesky(A) {
  const n = A.length; const L = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let s = A[i][j];
      for (let k = 0; k < j; k += 1) s -= L[i][k] * L[j][k];
      if (i === j) L[i][i] = Math.sqrt(Math.max(s, 1e-300)); else L[i][j] = s / L[j][j];
    }
  }
  return L;
}
function resolverCholesky(L, b) {
  const n = L.length; const y = new Float64Array(n); const x = new Float64Array(n);
  for (let i = 0; i < n; i += 1) { let s = b[i]; for (let k = 0; k < i; k += 1) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
  for (let i = n - 1; i >= 0; i -= 1) { let s = y[i]; for (let k = i + 1; k < n; k += 1) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
  return x;
}

/* ---- o palpite: Bézier de quarta ordem com a flecha de um lado ---- */

/** O lado do arco: a direção, perpendicular à corda, para onde a flecha do palpite aponta. */
export function ladoDoArco({ A, B, dA, dB, caimento }) {
  const corda = unitario(sub(B, A));
  const lateral = (v) => { const p = sub(v, mult(corda, dot(v, corda))); return norma(p) > 1e-3 ? unitario(p) : null; };
  const baixo = [0, -1, 0];
  return (caimento > 0 ? lateral(baixo) : null)
    ?? lateral(sub(dA, mult(dB, -1)))
    ?? lateral(baixo)
    ?? lateral([0, 0, 1])
    ?? lateral([1, 0, 0]);
}

function bezier4(Q, t) {
  const u = 1 - t;
  const w = [u ** 4, 4 * u ** 3 * t, 6 * u * u * t * t, 4 * u * t ** 3, t ** 4];
  return [0, 1, 2].map((c) => Q.reduce((s, q, k) => s + q[c] * w[k], 0));
}
function comprimentoDoPolinomio(Q) {
  let total = 0; let anterior = Q[0];
  for (let k = 1; k <= 400; k += 1) { const p = bezier4(Q, k / 400); total += norma(sub(p, anterior)); anterior = p; }
  return total;
}

/* Os cinco pontos de controle: a alça de cada ponta (uma fração `rho` do comprimento) e a flecha do meio, que carrega o resto. */
const controle = ({ A, B, dA, dB, lado }, L, rho, flecha) => [A, soma(A, mult(dA, rho * L)), soma(mult(soma(A, B), 0.5), mult(lado, flecha)), soma(B, mult(dB, rho * L)), B];
const FRACOES_DA_ALCA = [0.04, 0.07, 0.1, 0.15, 0.22, 0.3, 0.4, 0.5];

/* Os M nós a espaços iguais de comprimento de arco sobre a Bézier. */
function nosDaBezier(Q, M) {
  const N = 600; const acumulado = [0]; let anterior = Q[0]; const pontos = [Q[0]];
  for (let k = 1; k <= N; k += 1) { const p = bezier4(Q, k / N); acumulado.push(acumulado[k - 1] + norma(sub(p, anterior))); pontos.push(p); anterior = p; }
  const total = acumulado[N]; const nos = []; let j = 0;
  for (let i = 0; i < M; i += 1) {
    const alvo = (total * i) / (M - 1);
    while (j < N - 1 && acumulado[j + 1] < alvo) j += 1;
    const t = (alvo - acumulado[j]) / Math.max(acumulado[j + 1] - acumulado[j], 1e-12);
    nos.push(soma(mult(pontos[j], 1 - t), mult(pontos[j + 1], t)));
  }
  return nos;
}
const flexao = (nos) => { let e = 0; for (let i = 1; i < nos.length - 1; i += 1) { const d = sub(soma(nos[i - 1], nos[i + 1]), mult(nos[i], 2)); e += dot(d, d); } return e; };

/* O palpite: para cada fração de alça, a flecha que dá o comprimento pedido (bisseção) e os nós; vale o de menor flexão. */
export function palpite(entrada, L, M) {
  let melhor = null;
  for (const sinal of [1, -1]) for (const rho of FRACOES_DA_ALCA) {
    const alvo = { ...entrada, lado: mult(entrada.lado, sinal) };
    if (comprimentoDoPolinomio(controle(alvo, L, rho, 0)) > L) continue;
    let inferior = 0; let superior = 1.5 * L;
    if (comprimentoDoPolinomio(controle(alvo, L, rho, superior)) < L) continue;
    for (let k = 0; k < 50; k += 1) {
      const meio = 0.5 * (inferior + superior);
      if (comprimentoDoPolinomio(controle(alvo, L, rho, meio)) < L) inferior = meio; else superior = meio;
    }
    const nos = nosDaBezier(controle(alvo, L, rho, 0.5 * (inferior + superior)), M);
    const e = flexao(nos);
    if (!melhor || e < melhor.e * (1 - 1e-9)) melhor = { nos, e, rho, sinal };
  }
  return melhor;
}

/* ---- a minimização ---- */

/** Resolve a haste. `entrada`: { A, B, dA, dB, L, caimento, nos }; A, B em milímetro, dA e dB unitários (a direção em que o cabo sai de cada ponta). */
export function resolverElastica(entrada) {
  const { A, B, L, caimento = 0 } = entrada;
  const M = entrada.nos;
  const dA = unitario(entrada.dA); const dB = unitario(entrada.dB);
  const h = L / (M - 1);
  const n = M - 4; const m = M - 3;
  let chute = entrada.partida ?? null;
  if (!chute) {
    const inicio = palpite({ A, B, dA, dB, lado: ladoDoArco({ A, B, dA, dB, caimento }) }, L, M);
    if (!inicio) throw new ErroDaCurva('nenhum palpite de Bézier chega ao comprimento pedido');
    chute = inicio.nos;
  }
  const P = chute.map((p) => [...p]);
  P[0] = [...A]; P[1] = soma(A, mult(dA, h)); P[M - 1] = [...B]; P[M - 2] = soma(B, mult(dB, h));

  /* a segunda diferença de todos os nós interiores (1 a M − 2), cada linha com os três nós; K = SᵀS nos nós livres 2 a M − 3 */
  const K = Array.from({ length: n }, () => new Float64Array(n));
  const coef = [1, -2, 1];
  for (let i = 1; i <= M - 2; i += 1) {
    for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) {
      const ja = i - 1 + a - 2; const jb = i - 1 + b - 2;
      if (ja >= 0 && ja < n && jb >= 0 && jb < n) K[ja][jb] += coef[a] * coef[b];
    }
  }
  const fatorK = cholesky(K);
  /* o vetor linear: nós fixos da segunda diferença e a gravidade (−y), com Γ h⁴ / L³ por nó */
  const gravidade = (caimento * h ** 4) / L ** 3;
  const linear = Array.from({ length: n }, () => [0, 0, 0]);
  for (let i = 1; i <= M - 2; i += 1) {
    for (let a = 0; a < 3; a += 1) {
      const ja = i - 1 + a;
      if (ja < 2 || ja > M - 3) continue;
      for (let b = 0; b < 3; b += 1) {
        const jb = i - 1 + b;
        if (jb >= 2 && jb <= M - 3) continue;
        const c = coef[a] * coef[b];
        for (let q = 0; q < 3; q += 1) linear[ja - 2][q] += c * P[jb][q];
      }
    }
  }
  for (let k = 0; k < n; k += 1) linear[k][1] += gravidade;
  /* o mínimo sem restrição, por componente: K y0 = −linear */
  const y0 = [0, 1, 2].map((q) => resolverCholesky(fatorK, Float64Array.from(linear, (v) => -v[q])));
  const Kinv = Array.from({ length: n }, (_, j) => { const e = new Float64Array(n); e[j] = 1; return resolverCholesky(fatorK, e); });

  const restricoes = () => Array.from({ length: m }, (_, k) => { const i = k + 1; const e = sub(P[i + 1], P[i]); return { e, g: 0.5 * (dot(e, e) - h * h) }; });
  /* cada restrição (o trecho entre os nós i e i + 1) toca no máximo dois nós livres: −e no nó i e +e no nó i + 1, o que deixa G esparsa */
  const linhasDe = (rs) => rs.map(({ e }, k) => {
    const i = k + 1; const nosL = []; const coef = [];
    if (i >= 2 && i <= M - 3) { nosL.push(i - 2); coef.push([-e[0], -e[1], -e[2]]); }
    if (i + 1 >= 2 && i + 1 <= M - 3) { nosL.push(i - 1); coef.push(e); }
    return { nosL, coef };
  });
  const complementoDeSchur = (G) => {
    const S = Array.from({ length: m }, () => new Float64Array(m));
    for (let a = 0; a < m; a += 1) for (let b = 0; b <= a; b += 1) {
      let t = 0;
      for (let x = 0; x < G[a].nosL.length; x += 1) for (let y = 0; y < G[b].nosL.length; y += 1) {
        const kinv = Kinv[G[a].nosL[x]][G[b].nosL[y]];
        t += kinv * (G[a].coef[x][0] * G[b].coef[y][0] + G[a].coef[x][1] * G[b].coef[y][1] + G[a].coef[x][2] * G[b].coef[y][2]);
      }
      S[a][b] = t; S[b][a] = t;
    }
    return S;
  };
  /* K⁻¹ Gᵀ μ por componente */
  const dobrar = (G, mu) => {
    const v = [0, 1, 2].map(() => new Float64Array(n));
    for (let k = 0; k < m; k += 1) for (let x = 0; x < G[k].nosL.length; x += 1) for (let q = 0; q < 3; q += 1) v[q][G[k].nosL[x]] += G[k].coef[x][q] * mu[k];
    return v.map((vq) => Float64Array.from({ length: n }, (_, a) => { let t = 0; const linha = Kinv[a]; for (let b = 0; b < n; b += 1) t += linha[b] * vq[b]; return t; }));
  };
  const livres = () => Array.from({ length: n }, (_, k) => P[k + 2]);
  const gravar = (Y) => { for (let k = 0; k < n; k += 1) P[k + 2] = [Y[0][k], Y[1][k], Y[2][k]]; };
  const maiorViolacao = () => restricoes().reduce((mx, { g }) => Math.max(mx, Math.abs(g) / (h * h)), 0);

  let iteracoesFeitas = 0;
  for (let it = 0; it < ITERACOES; it += 1) {
    const rs = restricoes();
    const G = linhasDe(rs);
    const S = complementoDeSchur(G);
    const atual = livres();
    /* G (y0 − y) + g */
    const rhs = new Float64Array(m);
    for (let k = 0; k < m; k += 1) {
      let t = rs[k].g;
      for (let x = 0; x < G[k].nosL.length; x += 1) { const a = G[k].nosL[x]; for (let q = 0; q < 3; q += 1) t += G[k].coef[x][q] * (y0[q][a] - atual[a][q]); }
      rhs[k] = t;
    }
    const traco = S.reduce((acc, linha, k) => acc + linha[k], 0) / m;
    for (let k = 0; k < m; k += 1) S[k][k] += 1e-12 * traco;
    const mu = resolverCholesky(cholesky(S), rhs);
    const D = dobrar(G, mu);
    const novo = [0, 1, 2].map((q) => Float64Array.from({ length: n }, (_, a) => y0[q][a] - D[q][a]));
    let passo = 0;
    for (let a = 0; a < n; a += 1) for (let q = 0; q < 3; q += 1) passo = Math.max(passo, Math.abs(novo[q][a] - atual[a][q]));
    /* o passo cheio, limitado a um quarto do trecho por nó, para a linearização valer */
    const limite = 0.25 * h;
    const escala = passo > limite ? limite / passo : 1;
    const Y = [0, 1, 2].map((q) => Float64Array.from({ length: n }, (_, a) => atual[a][q] + escala * (novo[q][a] - atual[a][q])));
    gravar(Y);
    iteracoesFeitas = it + 1;
    if (passo * escala < 1e-7 * h && maiorViolacao() < 1e-9) break;
  }
  /* a projeção de Newton sobre os comprimentos, de norma mínima */
  for (let k = 0; k < 8; k += 1) {
    const rs = restricoes();
    if (rs.every(({ g }) => Math.abs(g) / (h * h) < 1e-13)) break;
    const G = linhasDe(rs);
    const S = Array.from({ length: m }, () => new Float64Array(m));
    for (let a = 0; a < m; a += 1) for (let b = 0; b <= a; b += 1) {
      let t = 0;
      for (let x = 0; x < G[a].nosL.length; x += 1) for (let y = 0; y < G[b].nosL.length; y += 1) if (G[a].nosL[x] === G[b].nosL[y]) t += dot(G[a].coef[x], G[b].coef[y]);
      S[a][b] = t; S[b][a] = t;
    }
    const traco = S.reduce((acc, linha, i) => acc + linha[i], 0) / m;
    for (let i = 0; i < m; i += 1) S[i][i] += 1e-14 * traco;
    const mu = resolverCholesky(cholesky(S), Float64Array.from(rs, ({ g }) => g));
    for (let r = 0; r < m; r += 1) for (let x = 0; x < G[r].nosL.length; x += 1) for (let q = 0; q < 3; q += 1) P[G[r].nosL[x] + 2][q] -= G[r].coef[x][q] * mu[r];
  }
  const violacao = maiorViolacao();
  let energia = 0;
  for (let i = 1; i <= M - 2; i += 1) { const d = sub(soma(P[i - 1], P[i + 1]), mult(P[i], 2)); energia += 0.5 * dot(d, d); }
  return { nos: P, h, iteracoes: iteracoesFeitas, violacao, energia: energia / h ** 3, M };
}
