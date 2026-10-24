/* gaiola-por-rede-liso.js — o miolo dos retalhos alisado pela normal, para a tangente não quebrar nas curvas compartilhadas
 *
 * Função pura, sem Three.js e sem domínio. O preenchimento de Coons de cada retalho passa pelas curvas, mas dois retalhos vizinhos só se
 * encontram em posição (C0): a inclinação com que cada um sai da curva é a que o retalho tira das quatro curvas dele, e a gaiola chega à
 * subdivisão com uma dobra de alguns graus ao longo da curva compartilhada. A subdivisão alisa essa dobra e a deixa como um calombo de
 * algumas décimas de milímetro, proporcional à dobra e ao tamanho da face (0,43 mm na chapa de prova, com a face de 40 mm). Esta função tira
 * a dobra da gaiola antes: mexe só nos pontos que o chamador marca como livres (o miolo dos retalhos de quatro lados; as curvas ficam
 * onde estão), cada um ao longo da normal que o preenchimento lhe deu, por um deslocamento escalar h.
 *
 * A energia. O laplaciano discreto L de um ponto é o desvio dele à média ponderada dos vizinhos, com peso 1/comprimento (a segunda
 * diferença de uma grade irregular). Dividido pela escala do ponto (a soma dos comprimentos das arestas sobre a soma dos pesos), vale
 * metade da curvatura numa forma quadrática, qualquer que seja o espaçamento. Minimizar a soma dos L ao quadrado é o alisamento de placa
 * fina, que acha a superfície mais lisa pelas curvas mas achata a curvatura (uma calota sai plana) e perde a inclinação da borda. Aqui a
 * energia é a variação do laplaciano: a soma, sobre as arestas da gaiola, do quadrado da diferença entre os L das duas pontas. Ela é zero
 * para qualquer forma de laplaciano constante, as quadráticas entre elas, e por isso mantém a curvatura que o preenchimento deu; uma dobra
 * ao longo de uma curva é um salto do L ali, e é isso que a energia tira. Os pontos que o chamador marca como pulados não têm L e as arestas
 * deles ficam fora da soma: a borda livre (sem vizinhos do outro lado), o vinco (a dobra declarada continua dobra, e cada lado dele se
 * alisa sozinho) e os vértices de valência diferente de 4, onde a vizinhança não é a de uma grade. Na calota de prova de um retalho de cinco
 * lados com o centro livre, o alisamento deslocava o centro 15 mm; com o centro e os retalhos de n lados fora, nada se mexe neles.
 *
 * Uma âncora pequena (0,1‰ da maior diagonal do sistema por padrão) prende cada ponto à posição que o preenchimento lhe deu, e dá ao
 * sistema uma solução única. Na chapa de prova, sem âncora (1e-9) o maior deslocamento é 1,7 mm; com 1e-4, 0,85 mm, e a leitura de ondulação
 * dá 0,17 mm; com 2e-3 o deslocamento cai a 0,37 mm, mas a âncora também segura o salto que se quer tirar e a leitura sobe a 0,27 mm. O desvio
 * médio à forma desenhada fica em 0,23 a 0,25 mm nos três, e na energia de placa fina sobe a 0,57 mm.
 *
 * O deslocamento é linear em h para as normais dadas; a normal se refaz e o sistema se resolve de novo `iteracoes` vezes. O sistema
 * normal é esparso e simétrico e se resolve por gradiente conjugado com pré-condicionador de Jacobi, em ordem fixa de pontos e de
 * vizinhos, de modo que a mesma gaiola dá a mesma saída. */

const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const norma = (u) => Math.hypot(u[0], u[1], u[2]);
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

/* Normais dos vértices: a soma das normais de Newell das faces que os tocam, normalizada. */
function normaisDosVertices(P, F) {
  const n = P.map(() => [0, 0, 0]);
  for (const f of F) {
    const m = [0, 0, 0];
    for (let k = 0; k < f.length; k++) {
      const a = P[f[k]]; const b = P[f[(k + 1) % f.length]];
      m[0] += (a[1] - b[1]) * (a[2] + b[2]); m[1] += (a[2] - b[2]) * (a[0] + b[0]); m[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    for (const v of f) { n[v][0] += m[0]; n[v][1] += m[1]; n[v][2] += m[2]; }
  }
  return n.map((m) => { const l = norma(m); return l > 0 ? [m[0] / l, m[1] / l, m[2] / l] : [0, 0, 0]; });
}

/**
 * alisarMioloNaNormal(posicoes, faces, livres, pulados, { iteracoes, energia }) -> { posicoes, deslocamentoMaximo, iteracoes }
 *   posicoes: [[x, y, z]] da gaiola; faces: índices; livres: Set dos pontos que se mexem; pulados: Set dos pontos sem laplaciano (borda
 *   livre e vinco, que o chamador marca). energia: 'variacao' (padrão) ou 'placa'. Devolve as posições novas, sem mexer nas dadas.
 */
export function alisarMioloNaNormal(posicoes, faces, livres, pulados, { iteracoes = 2, energia = 'variacao', ancora = 1e-4 } = {}) {
  const n = posicoes.length;
  const viz = Array.from({ length: n }, () => new Set());
  for (const f of faces) for (let k = 0; k < f.length; k++) { const a = f[k]; const b = f[(k + 1) % f.length]; viz[a].add(b); viz[b].add(a); }
  const vizinhos = viz.map((s) => [...s].sort((a, b) => a - b));
  const lista = [...livres].sort((a, b) => a - b);
  const indiceDoLivre = new Map(lista.map((v, i) => [v, i]));
  let P = posicoes.map((p) => [...p]);
  let maior = 0;
  for (let volta = 0; volta < iteracoes; volta++) {
    const N = normaisDosVertices(P, faces);
    /* o laplaciano de cada ponto que tem um: o valor L0 de agora e o coeficiente de cada ponto livre sobre o seu h */
    const L = new Array(n).fill(null);
    for (let s = 0; s < n; s++) {
      if (pulados.has(s) || !vizinhos[s].length) continue;
      const dists = vizinhos[s].map((j) => norma(sub(P[j], P[s])));
      const pesos = dists.map((d) => 1 / d);
      const total = pesos.reduce((x, y) => x + y, 0);
      /* a escala do ponto: L vale (curvatura / 2) vezes ela numa forma quadrática, qualquer que seja o espaçamento e a valência */
      const escala = energia === 'placa' ? 1 : dists.reduce((x, y) => x + y, 0) / total;
      const L0 = [0, 0, 0]; const coef = new Map();
      vizinhos[s].forEach((j, k) => {
        const a = pesos[k] / total / escala;
        L0[0] += a * (P[j][0] - P[s][0]); L0[1] += a * (P[j][1] - P[s][1]); L0[2] += a * (P[j][2] - P[s][2]);
        if (indiceDoLivre.has(j)) coef.set(indiceDoLivre.get(j), (coef.get(indiceDoLivre.get(j)) ?? 0) + a);
      });
      if (indiceDoLivre.has(s)) coef.set(indiceDoLivre.get(s), (coef.get(indiceDoLivre.get(s)) ?? 0) - 1 / escala);
      L[s] = { L0, coef };
    }
    /* os termos da energia: o próprio L (placa) ou a diferença dos L nas pontas de cada aresta (variação) */
    const termos = [];
    if (energia === 'placa') {
      for (let s = 0; s < n; s++) if (L[s]) termos.push({ peso: 1, L0: L[s].L0, coef: L[s].coef });
    } else {
      for (let s = 0; s < n; s++) {
        if (!L[s]) continue;
        for (const t of vizinhos[s]) {
          if (t < s || !L[t]) continue;
          const peso = 1;
          const coef = new Map(L[s].coef);
          for (const [u, c] of L[t].coef) coef.set(u, (coef.get(u) ?? 0) - c);
          termos.push({ peso, L0: sub(L[s].L0, L[t].L0), coef });
        }
      }
    }
    const linhas = lista.map(() => new Map());
    const b = new Array(lista.length).fill(0);
    for (const { peso, L0, coef } of termos) {
      const itens = [...coef].filter(([, c]) => c !== 0).sort((x, y) => x[0] - y[0]);
      for (const [u, cu] of itens) {
        const nu = N[lista[u]];
        b[u] -= peso * cu * dot(nu, L0);
        for (const [v, cv] of itens) linhas[u].set(v, (linhas[u].get(v) ?? 0) + peso * cu * cv * dot(nu, N[lista[v]]));
      }
    }
    /* gradiente conjugado, com Jacobi, na ordem fixa dos pontos e das colunas */
    const colunas = linhas.map((m) => [...m].sort((x, y) => x[0] - y[0]));
    const escala = colunas.reduce((m, c, i) => Math.max(m, ...c.filter(([j]) => j === i).map(([, v]) => v)), 0) || 1;
    const folga = ancora * escala;
    const diag = colunas.map((c, i) => { const d = c.find(([j]) => j === i); return (d ? d[1] : 0) + folga; });
    const Mv = (v) => colunas.map((c, i) => { let t = folga * v[i]; for (const [j, m] of c) t += m * v[j]; return t; });
    let h = new Array(lista.length).fill(0);
    let r = b.slice();
    let z = r.map((x, i) => x / diag[i]);
    let p = z.slice();
    let rz = r.reduce((x, y, i) => x + y * z[i], 0);
    const limite = 1e-20 * (b.reduce((x, y) => x + y * y, 0) || 1);
    for (let it = 0; it < 8 * lista.length + 100; it++) {
      if (r.reduce((x, y) => x + y * y, 0) <= limite) break;
      const Ap = Mv(p);
      const alfa = rz / p.reduce((x, y, i) => x + y * Ap[i], 0);
      h = h.map((x, i) => x + alfa * p[i]);
      r = r.map((x, i) => x - alfa * Ap[i]);
      z = r.map((x, i) => x / diag[i]);
      const rzNovo = r.reduce((x, y, i) => x + y * z[i], 0);
      p = z.map((x, i) => x + (rzNovo / rz) * p[i]);
      rz = rzNovo;
    }
    const novo = P.map((q) => [...q]);
    lista.forEach((v, i) => {
      novo[v] = [P[v][0] + h[i] * N[v][0], P[v][1] + h[i] * N[v][1], P[v][2] + h[i] * N[v][2]];
      maior = Math.max(maior, norma(sub(novo[v], posicoes[v])));
    });
    P = novo;
  }
  return { posicoes: P, deslocamentoMaximo: maior, iteracoes };
}
