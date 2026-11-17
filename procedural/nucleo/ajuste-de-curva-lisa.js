/* ajuste-de-curva-lisa.js — a curva lida de pontos (da prancha, de uma imagem) ajustada a poucos trechos de curvatura monótona, com o desvio de cada ponto medido
 *
 * FICHA ajustarCurvaLisa
 * serve: trocar uma curva dada por muitos pontos, com ruído de leitura, por uma curva plana e lisa de poucos trechos: cadeia de clotoides (a curvatura
 *   cresce ou cai linear com o comprimento de arco em cada trecho, e é contínua entre trechos), com a tolerância declarada e o desvio a cada ponto medido.
 * quando: a curva-guia de uma chapa (planta, nível, queda) vem de pontos lidos, e a curva de Catmull-Rom por eles faz de cada ponto uma lombada de curvatura que
 *   a zebra mostra como onda; aqui sai uma curva de curvatura mínima em trechos, e os pontos que a rede consome saem dela.
 * unidades: mm, como a TABELA. A curva é plana: `eixos` diz quais duas coordenadas dos pontos de 3 componentes entram (padrão [0, 1]); a terceira, constante.
 * campos:
 *   pontos: [[u, v] | [x, y, z], ...] em ordem ao longo da curva, de 3 pontos em diante (a curva é aberta; a fechada se ajusta em dois arcos).
 *   tolerancia: o maior desvio aceito de qualquer ponto à curva, em mm (1 por padrão).
 *   maximoDeTrechos: o teto de clotoides (8 por padrão); passado ele a curva sai com `cabe: false` e o desvio que ficou.
 *   duros: índices de pontos por onde a curva passa de perto (um nó da rede): pesam 20 vezes mais no ajuste, e o desvio deles é medido como os outros.
 *   eixos: [i, j] as duas coordenadas lidas dos pontos de 3 componentes.
 * devolve: { cabe, tolerancia, desvioMaximo, desvios, trechos, inflexoes, comprimento, joelhos, inicio, rumo, ponto(s), amostrar(passoMm), pontosDaRede(passoMm, opcoes) }
 *   joelhos: [{ s, k }] o comprimento de arco (mm) e a curvatura (1/mm, positiva para a esquerda) de cada vértice da curvatura; entre dois a curvatura é linear.
 *   trechos: as corridas de curvatura monótona, { de, ate, k0, k1, sentido: 'cresce' | 'cai' | 'constante', joelhos } (de e ate em mm de arco); `clotoides`: os
 *     trechos de curvatura linear de que a cadeia é feita, um por par de joelhos.
 *   inflexoes: quantas vezes a curvatura troca de sinal (a faixa de um sinal só que move a curva menos que a tolerância, giro × comprimento / 8, não conta: é a reta que a tolerância não distingue).
 *   pontosDaRede(passoMm, { nome, completar }): { nome, pontos } no formato de `curvas` de `gaiolaPorRede`: pontos-chave sobre a curva ajustada a cada passoMm de arco,
 *     com a ponta exata; `completar(u, v)` devolve [x, y, z] (sem ele, a terceira coordenada é a constante dos pontos de entrada).
 * exemplo:
 *   const aj = ajustarCurvaLisa(pontosDaPrancha, { tolerancia: 3 }); // aj.trechos.length, aj.inflexoes, aj.desvioMaximo
 *   gaiolaPorRede({ ..., curvas: [aj.pontosDaRede(60, { nome: 'planta' }), ...] })
 * peça: procedural/nucleo/ajuste-de-curva-lisa.test.mjs (arco, clotoide, cônica e S analíticos, com ruído, e a planta do carro).
 * FIM DA FICHA
 *
 * POR QUE CLOTOIDE. Uma curva lisa do ponto de vista da zebra é a de curvatura que não oscila: a ondulação de 200 a 500 mm vem de variações de 0,1 1/m. A clotoide
 * (curvatura linear em s) é a de variação mínima entre duas curvaturas dadas, é fechada sob o ajuste (a cadeia com curvatura contínua é G2 por construção, sem
 * condição de emenda), e a inflexão cai onde a curvatura passa por zero, sem lobo. A cônica tem curvatura monótona só em cada metade e pede a posição do
 * eixo; a cúbica de curvatura monótona pede a condição de monotonia sobre os coeficientes. Para o mesmo desvio, a cadeia de clotoides tem os mesmos graus de
 * liberdade (um par de curvaturas e um comprimento por trecho) sem restrição sobre eles.
 *
 * COMO AJUSTA. A curva é { início, rumo, comprimento L, joelhos (fração do arco, curvatura) }; a posição sai de integrar a curvatura (Simpson, passo de 2 mm).
 * O resíduo de cada ponto é a distância com sinal à curva (ao ponto mais perto da curva amostrada), mais as duas pontas, e o ajuste é de mínimos quadrados
 * de Levenberg-Marquardt, com jacobiano por diferença finita, sobre o início, o rumo, L, as curvaturas e as frações dos joelhos. Parte de uma clotoide só
 * (curvaturas por mínimos quadrados sobre o rumo lido dos pontos); enquanto o desvio máximo passa da tolerância, entra um joelho no ponto de maior desvio e o
 * ajuste refaz de onde estava; no fim, tenta tirar cada joelho (o de menor custo primeiro) e guarda a retirada que ainda cabe na tolerância: sai o menor número de
 * trechos que o ajuste achou, e não o menor possível. O resultado é determinístico (nenhum sorteio, nenhum relógio). */

const PASSO = 2;
const MINIMO_DA_FRACAO = 0.01;
const PESO_DA_PONTA = 10;

const erro = (texto) => { throw new Error(`ajustarCurvaLisa: ${texto}`); };

/* ---------- a curva por joelhos ---------- */

function curvaturaEm(f, fr, k) {
  const n = fr.length;
  if (f <= fr[0]) return k[0];
  if (f >= fr[n - 1]) return k[n - 1];
  let i = 1; while (fr[i] < f) i += 1;
  return k[i - 1] + ((k[i] - k[i - 1]) * (f - fr[i - 1])) / (fr[i] - fr[i - 1]);
}

/** integra a curva em passos de PASSO mm: devolve { x, y, th } em Float64Array, do arco 0 ao L, e o passo efetivo h */
function integrar(p, fr) {
  const { x0, y0, th0, L, k } = p;
  const n = Math.max(2, Math.ceil(L / PASSO)); const h = L / n;
  const x = new Float64Array(n + 1); const y = new Float64Array(n + 1); const th = new Float64Array(n + 1);
  x[0] = x0; y[0] = y0; th[0] = th0;
  /* a curvatura nos 2n + 1 pontos de meio e de ponta, andando pelos joelhos uma vez só */
  const kk = new Float64Array(2 * n + 1); let j = 1;
  for (let i = 0; i <= 2 * n; i += 1) {
    const f = i / (2 * n);
    while (j < fr.length - 1 && fr[j] < f) j += 1;
    kk[i] = f <= fr[0] ? k[0] : f >= fr[fr.length - 1] ? k[fr.length - 1] : k[j - 1] + ((k[j] - k[j - 1]) * (f - fr[j - 1])) / (fr[j] - fr[j - 1]);
  }
  for (let i = 0; i < n; i += 1) {
    const k0 = kk[2 * i]; const k1 = kk[2 * i + 1]; const k2 = kk[2 * i + 2];
    const meio = th[i] + ((k0 + k1) * h) / 4;
    x[i + 1] = x[i] + Math.cos(meio) * h; y[i + 1] = y[i] + Math.sin(meio) * h;
    th[i + 1] = th[i] + (((k0 + 4 * k1 + k2) / 6) * h);
  }
  return { x, y, th, h, n };
}

/* as frações dos joelhos interiores, apertadas para ficarem em ordem com folga mínima */
function frações(interiores, n) {
  const fr = [0, ...interiores, 1];
  for (let i = 1; i < n - 1; i += 1) fr[i] = Math.min(1 - MINIMO_DA_FRACAO * (n - 1 - i), Math.max(fr[i - 1] + MINIMO_DA_FRACAO, fr[i]));
  return fr;
}

/* os parâmetros p = [x0, y0, th0, L, k_0..k_{n-1}, f_1..f_{n-2}] */
const desempacotar = (p, n) => ({ x0: p[0], y0: p[1], th0: p[2], L: p[3], k: p.slice(4, 4 + n), fr: frações(p.slice(4 + n), n) });

/** a distância com sinal (positiva à esquerda da curva) de cada ponto à curva amostrada; `janela` guarda o índice mais perto de cada ponto */
function desviosDos(P, c, janela) {
  const { x, y, n } = c; const m = P.length; const d = new Float64Array(m);
  for (let i = 0; i < m; i += 1) {
    const [px, py] = P[i];
    let melhor = -1; let menor = Infinity;
    const grosso = janela[i] < 0;
    const [de, ate, passo] = grosso ? [0, n, Math.max(1, Math.floor(n / 200))] : [Math.max(0, janela[i] - 16), Math.min(n, janela[i] + 16), 1];
    for (let j = de; j <= ate; j += passo) { const q = (x[j] - px) ** 2 + (y[j] - py) ** 2; if (q < menor) { menor = q; melhor = j; } }
    if (grosso) { const a = Math.max(0, melhor - passo); const b = Math.min(n, melhor + passo); for (let j = a; j <= b; j += 1) { const q = (x[j] - px) ** 2 + (y[j] - py) ** 2; if (q < menor) { menor = q; melhor = j; } } }
    janela[i] = melhor;
    /* a projeção na reta do segmento mais perto, para o desvio não depender da amostragem */
    let dist = Math.sqrt(menor); let sinal = 0;
    for (const [a, b] of [[Math.max(0, melhor - 1), melhor], [melhor, Math.min(n, melhor + 1)]]) {
      if (a === b) continue;
      const ex = x[b] - x[a]; const ey = y[b] - y[a]; const l2 = ex * ex + ey * ey;
      const t = Math.max(0, Math.min(1, ((px - x[a]) * ex + (py - y[a]) * ey) / l2));
      const dx = px - (x[a] + ex * t); const dy = py - (y[a] + ey * t); const q = Math.hypot(dx, dy);
      if (q <= dist + 1e-12) { dist = q; sinal = ex * dy - ey * dx; }
    }
    d[i] = sinal >= 0 ? dist : -dist;
  }
  return d;
}

/* ---------- mínimos quadrados de Levenberg-Marquardt ---------- */

function resolver(A, b) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i += 1) {
    let pv = i; for (let r = i + 1; r < n; r += 1) if (Math.abs(M[r][i]) > Math.abs(M[pv][i])) pv = r;
    [M[i], M[pv]] = [M[pv], M[i]];
    if (Math.abs(M[i][i]) < 1e-300) return null;
    for (let r = i + 1; r < n; r += 1) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c += 1) M[r][c] -= f * M[i][c]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) { let t = M[i][n]; for (let c = i + 1; c < n; c += 1) t -= M[i][c] * x[c]; x[i] = t / M[i][i]; }
  return x;
}

function lm(residuo, p0, escala, { iteracoes = 40 } = {}) {
  let p = [...p0]; let r = residuo(p); let custo = r.reduce((s, v) => s + v * v, 0); let lambda = 1e-3;
  for (let it = 0; it < iteracoes; it += 1) {
    const J = p.map((_, j) => { const h = escala[j] * 1e-4; const q = [...p]; q[j] += h; const rq = residuo(q); return rq.map((v, i) => (v - r[i]) / h); });
    const m = r.length; const np = p.length;
    const JTJ = Array.from({ length: np }, () => new Array(np).fill(0)); const g = new Array(np).fill(0);
    for (let a = 0; a < np; a += 1) { for (let i = 0; i < m; i += 1) g[a] += J[a][i] * r[i]; for (let b = a; b < np; b += 1) { let s = 0; for (let i = 0; i < m; i += 1) s += J[a][i] * J[b][i]; JTJ[a][b] = s; JTJ[b][a] = s; } }
    let melhorou = false;
    for (let tentativa = 0; tentativa < 8; tentativa += 1) {
      const A = JTJ.map((linha, i) => linha.map((v, j) => (i === j ? v + lambda * (v + 1e-12) : v)));
      const passo = resolver(A, g.map((v) => -v));
      if (!passo) { lambda *= 10; continue; }
      const q = p.map((v, i) => v + passo[i]); const rq = residuo(q); const cq = rq.reduce((s, v) => s + v * v, 0);
      if (cq < custo) { const ganho = custo - cq; p = q; r = rq; custo = cq; lambda = Math.max(1e-9, lambda / 5); melhorou = ganho > 1e-9 * (1 + custo); if (!melhorou) return { p, custo }; break; }
      lambda *= 8;
    }
    if (!melhorou) break;
  }
  return { p, custo };
}

/* ---------- o ajuste ---------- */

function pontosDe(entrada, eixos) {
  if (!Array.isArray(entrada) || entrada.length < 3) erro(`pontos espera uma lista de 3 pontos ou mais, e veio ${Array.isArray(entrada) ? `${entrada.length} ponto(s)` : typeof entrada}`);
  const [i, j] = eixos;
  const P = entrada.map((q, k) => {
    if (!Array.isArray(q) || q.length < 2 || !q.every((c) => Number.isFinite(c))) erro(`o ponto ${k} precisa ser [u, v] ou [x, y, z] de números finitos, e veio ${JSON.stringify(q)}`);
    if (q.length === 2) return [q[0], q[1]];
    return [q[i], q[j]];
  });
  const livre = [0, 1, 2].find((e) => e !== i && e !== j);
  const constante = entrada[0].length >= 3 ? entrada.reduce((s, q) => s + q[livre], 0) / entrada.length : 0;
  return { P, constante, livre };
}

/* a curvatura inicial por mínimos quadrados sobre o rumo lido dos pontos, com os joelhos em fr */
function iniciar(P, fr) {
  const m = P.length; const s = [0];
  for (let i = 1; i < m; i += 1) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = s[m - 1];
  /* o rumo no meio de cada segmento, desenrolado */
  const rumo = []; let anterior = null;
  for (let i = 0; i < m - 1; i += 1) { let a = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]); if (anterior !== null) { while (a - anterior > Math.PI) a -= 2 * Math.PI; while (a - anterior < -Math.PI) a += 2 * Math.PI; } rumo.push(a); anterior = a; }
  const n = fr.length;
  /* a integral de cada chapéu até f, numérica */
  const N = 400; const tabela = fr.map((_, j) => { const t = [0]; for (let q = 1; q <= N; q += 1) { const f0 = (q - 1) / N; const f1 = q / N; const chapeu = (f) => { if (j > 0 && f >= fr[j - 1] && f <= fr[j]) return (f - fr[j - 1]) / (fr[j] - fr[j - 1]); if (j < n - 1 && f >= fr[j] && f <= fr[j + 1]) return (fr[j + 1] - f) / (fr[j + 1] - fr[j]); return 0; }; t.push(t[q - 1] + ((chapeu(f0) + chapeu(f1)) / 2) * (f1 - f0) * L); } return t; });
  const em = (j, f) => { const x = f * N; const a = Math.min(N - 1, Math.floor(x)); return tabela[j][a] + (tabela[j][a + 1] - tabela[j][a]) * (x - a); };
  /* o rumo de saída: a corda dos pontos até 5% do comprimento (no mínimo dois segmentos), e só as curvaturas saem dos mínimos quadrados */
  let fim = 1; while (fim < m - 1 && s[fim] < 0.05 * L) fim += 1;
  const th0 = Math.atan2(P[fim][1] - P[0][1], P[fim][0] - P[0][0]);
  const A = Array.from({ length: n }, () => new Array(n).fill(0)); const b = new Array(n).fill(0);
  for (let i = 0; i < m - 1; i += 1) {
    const f = ((s[i] + s[i + 1]) / 2) / L; const linha = fr.map((_, j) => em(j, f));
    const alvo = rumo[i] - th0;
    for (let a = 0; a < n; a += 1) { b[a] += linha[a] * alvo; for (let c = 0; c < n; c += 1) A[a][c] += linha[a] * linha[c]; }
  }
  for (let a = 0; a < n; a += 1) A[a][a] += 1e-9;
  const sol = resolver(A, b) ?? new Array(n).fill(0);
  return { th0, k: sol, L };
}

function ajustarComJoelhos(P, pesos, ext, joelhos, partida) {
  const n = joelhos.length;
  const m = P.length;
  const residuo = (p) => {
    const q = desempacotar(p, n); const c = integrar(q, q.fr);
    const d = desviosDos(P, c, ext.janela.slice());
    const r = new Array(m + 4);
    for (let i = 0; i < m; i += 1) r[i] = d[i] * pesos[i];
    r[m] = (c.x[0] - P[0][0]) * PESO_DA_PONTA; r[m + 1] = (c.y[0] - P[0][1]) * PESO_DA_PONTA;
    r[m + 2] = (c.x[c.n] - P[m - 1][0]) * PESO_DA_PONTA; r[m + 3] = (c.y[c.n] - P[m - 1][1]) * PESO_DA_PONTA;
    return r;
  };
  const base = partida ?? (() => { const ini = iniciar(P, joelhos); return [P[0][0], P[0][1], ini.th0, ini.L, ...ini.k, ...joelhos.slice(1, -1)]; })();
  /* a primeira busca global dos pontos mais perto, para as janelas */
  { const q = desempacotar(base, n); desviosDos(P, integrar(q, q.fr), ext.janela.fill(-1)); }
  const L0 = base[3];
  const escala = base.map((_, j) => (j < 2 ? 1 : j === 2 ? 1e-2 : j === 3 ? 1 : j < 4 + n ? 1 / L0 : 1e-2));
  /* o ajuste em duas rodadas: a janela de busca se refaz entre elas */
  let { p, custo } = lm(residuo, base, escala);
  { const q = desempacotar(p, n); desviosDos(P, integrar(q, q.fr), ext.janela.fill(-1)); }
  ({ p, custo } = lm(residuo, p, escala));
  const q = desempacotar(p, n); const c = integrar(q, q.fr); const d = desviosDos(P, c, ext.janela.fill(-1));
  let maximo = 0; let onde = 0; for (let i = 0; i < m; i += 1) if (Math.abs(d[i]) > maximo) { maximo = Math.abs(d[i]); onde = i; }
  return { p, custo, d, maximo, onde, q, c };
}

/** ajustarCurvaLisa(pontos, { tolerancia, maximoDeTrechos, duros, eixos }) -> o ajuste descrito na ficha */
export function ajustarCurvaLisa(entrada, { tolerancia = 1, maximoDeTrechos = 8, duros = [], eixos = [0, 1] } = {}) {
  if (!(tolerancia > 0)) erro(`tolerancia espera mm maior que zero, e veio ${tolerancia}`);
  if (!Number.isInteger(maximoDeTrechos) || maximoDeTrechos < 1) erro(`maximoDeTrechos espera um inteiro de 1 em diante, e veio ${maximoDeTrechos}`);
  if (!Array.isArray(eixos) || eixos.length !== 2 || !eixos.every((e) => [0, 1, 2].includes(e)) || eixos[0] === eixos[1]) erro(`eixos espera dois dos índices 0, 1 e 2, e veio ${JSON.stringify(eixos)}`);
  const { P, constante, livre } = pontosDe(entrada, eixos);
  for (const i of duros) if (!Number.isInteger(i) || i < 0 || i >= P.length) erro(`duros espera índices de 0 a ${P.length - 1}, e veio ${JSON.stringify(i)}`);
  const pesos = P.map((_, i) => (duros.includes(i) ? 20 : 1));
  const ext = { janela: new Array(P.length).fill(-1) };
  let joelhos = [0, 1]; let melhor = ajustarComJoelhos(P, pesos, ext, joelhos, null);
  const reajustar = (fr, partida) => ajustarComJoelhos(P, pesos, ext, fr, partida);
  /* entra um joelho no ponto de maior desvio, enquanto passa da tolerância */
  while (melhor.maximo > tolerancia && joelhos.length - 1 < maximoDeTrechos) {
    const { q, c } = melhor; const fr = q.fr;
    const s = (ext.janela[melhor.onde] / c.n);
    let f = Math.min(1 - 2 * MINIMO_DA_FRACAO, Math.max(2 * MINIMO_DA_FRACAO, s));
    let i = 1; while (i < fr.length - 1 && fr[i] < f) i += 1;
    if (f - fr[i - 1] < 2 * MINIMO_DA_FRACAO || fr[i] - f < 2 * MINIMO_DA_FRACAO) f = (fr[i - 1] + fr[i]) / 2;
    const novos = [...fr.slice(0, i), f, ...fr.slice(i)]; const kf = curvaturaEm(f, fr, q.k);
    const ks = [...q.k.slice(0, i), kf, ...q.k.slice(i)];
    melhor = reajustar(novos, [q.x0, q.y0, q.th0, q.L, ...ks, ...novos.slice(1, -1)]);
    joelhos = novos;
  }
  /* tira os joelhos que a tolerância dispensa, o de menor custo primeiro */
  let podou = melhor.maximo <= tolerancia;
  while (podou && joelhos.length > 2) {
    podou = false;
    const candidatos = [];
    for (let i = 1; i < joelhos.length - 1; i += 1) {
      const { q } = melhor; const fr = q.fr.filter((_, j) => j !== i); const ks = q.k.filter((_, j) => j !== i);
      const t = reajustar(fr, [q.x0, q.y0, q.th0, q.L, ...ks, ...fr.slice(1, -1)]);
      if (t.maximo <= tolerancia) candidatos.push(t);
    }
    if (candidatos.length) { candidatos.sort((a, b) => a.custo - b.custo); melhor = candidatos[0]; joelhos = melhor.q.fr; podou = true; }
  }
  return montar(melhor, P, tolerancia, constante, livre, eixos, entrada.length > 0 && entrada[0].length >= 3);
}

/* ---------- o resultado ---------- */

function montar(ajuste, P, tolerancia, constante, livre, eixos, tem3) {
  const { q } = ajuste; const { fr, k, L } = q;
  const joelhos = fr.map((f, i) => ({ s: f * L, k: k[i] }));
  const clotoides = joelhos.slice(1).map((b, i) => ({ de: joelhos[i].s, ate: b.s, k0: joelhos[i].k, k1: b.k, comprimento: b.s - joelhos[i].s }));
  /* as faixas de um sinal só da curvatura, amostradas a 1 mm: a faixa que move a curva menos que a tolerância (volta total da tangente × comprimento / 8)
   * é ruído do ajuste, e não lóbulo; a inflexão é a troca de sinal entre as faixas que ficam */
  const faixas = []; const passoS = Math.min(1, L / 200); const nS = Math.round(L / passoS);
  for (let i = 0; i < nS; i += 1) {
    const kk = curvaturaEm((i + 0.5) / nS, fr, k); const sg = Math.sign(kk);
    const ultima = faixas[faixas.length - 1];
    if (ultima && (ultima.sg === sg || sg === 0)) { ultima.l += passoS; ultima.giro += Math.abs(kk) * passoS; } else faixas.push({ sg, l: passoS, giro: Math.abs(kk) * passoS });
  }
  const fica = faixas.filter((f) => (f.giro * f.l) / 8 >= tolerancia);
  let inflexoes = 0; for (let i = 1; i < fica.length; i += 1) if (fica[i].sg !== fica[i - 1].sg) inflexoes += 1;
  const faixa = (comp) => (4 * tolerancia) / (comp * comp);
  /* as corridas de curvatura monótona */
  const direcao = (c) => { const dk = c.k1 - c.k0; const tol = faixa(c.comprimento) * 0.1; return Math.abs(dk) <= tol ? 0 : Math.sign(dk); };
  const trechos = []; let corrida = null;
  for (const c of clotoides) {
    const d = direcao(c);
    if (corrida && (d === 0 || corrida.d === 0 || d === corrida.d)) { corrida.ate = c.ate; corrida.k1 = c.k1; corrida.joelhos += 1; if (corrida.d === 0) corrida.d = d; } else { if (corrida) trechos.push(corrida); corrida = { de: c.de, ate: c.ate, k0: c.k0, k1: c.k1, d, joelhos: 1 }; }
  }
  if (corrida) trechos.push(corrida);
  const trechosFinais = trechos.map(({ d, ...t }) => ({ ...t, sentido: d > 0 ? 'cresce' : d < 0 ? 'cai' : 'constante' }));
  const c = integrar(q, fr);
  const ponto = (s) => { const u = Math.min(c.n, Math.max(0, (s / L) * c.n)); const i = Math.min(c.n - 1, Math.floor(u)); const t = u - i; return [c.x[i] + (c.x[i + 1] - c.x[i]) * t, c.y[i] + (c.y[i + 1] - c.y[i]) * t]; };
  const amostrar = (passoMm) => {
    if (!(passoMm > 0)) erro(`passoMm espera mm maior que zero, e veio ${passoMm}`);
    const n = Math.max(1, Math.round(L / passoMm)); return Array.from({ length: n + 1 }, (_, i) => ponto((i * L) / n));
  };
  const para3d = (u, v) => { const r = [0, 0, 0]; r[eixos[0]] = u; r[eixos[1]] = v; r[livre] = constante; return r; };
  const resultado = {
    cabe: ajuste.maximo <= tolerancia, tolerancia, desvioMaximo: ajuste.maximo, desvios: Array.from(ajuste.d), comprimento: L,
    joelhos, clotoides, trechos: trechosFinais, inflexoes, inicio: [q.x0, q.y0], rumo: q.th0, ponto, amostrar,
    pontosDaRede: (passoMm, { nome = 'curva', completar = tem3 ? para3d : (u, v) => [u, v, constante] } = {}) => ({ nome, pontos: amostrar(passoMm).map(([u, v]) => completar(u, v)) }),
  };
  return resultado;
}
