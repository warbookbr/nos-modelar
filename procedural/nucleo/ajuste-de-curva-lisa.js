/* ajuste-de-curva-lisa.js — a curva lida de pontos (da prancha, de uma imagem) ajustada a poucos trechos de curvatura monótona, com o desvio de cada ponto medido
 *
 * FICHA ajustarCurvaLisa
 * serve: trocar uma curva dada por muitos pontos, com ruído de leitura, por uma curva plana e lisa de poucos trechos: cadeia de clotoides (a curvatura
 *   cresce ou cai linear com o comprimento de arco em cada trecho, e é contínua entre trechos), com a tolerância declarada e o desvio a cada ponto medido.
 * quando: a curva-guia de uma chapa (planta, nível, queda) vem de pontos lidos, e a curva de Catmull-Rom por eles faz de cada ponto uma lombada de curvatura que
 *   a zebra mostra como onda; aqui sai uma curva de curvatura mínima em trechos, e os pontos que a rede consome saem dela.
 * unidades: as dos pontos (mm, como a TABELA); a tolerância e o passo, na mesma unidade. A curva é plana: `eixos` diz quais duas coordenadas dos pontos de 3
 *   componentes entram (padrão [0, 1]); a terceira vira constante (o meio da faixa dela), e a metade da faixa entra em quadratura no desvio: o plano fica com sqrt(tolerância² - metade²), e metade que já gasta a tolerância é recusada.
 * campos:
 *   pontos: [[u, v] | [x, y, z], ...] em ordem ao longo da curva, todos do mesmo tamanho, de 3 pontos em diante (a curva é aberta; a fechada se ajusta em dois arcos).
 *   tolerancia: o maior desvio aceito de qualquer ponto à curva (1 por padrão), número maior que zero.
 *   maximoDeClotoides: o teto de clotoides (8 por padrão); passado ele a curva sai com `cabe: false` e o desvio que ficou.
 *   duros: lista de índices de pontos por onde a curva passa de perto (um nó da rede): pesam 20 vezes mais no ajuste, e o desvio deles é medido como os outros.
 *   eixos: [i, j] as duas coordenadas lidas dos pontos de 3 componentes.
 *   objetivo: 'menosClotoides' (padrão) ou 'lisura'. O padrão fica, de todos os ajustes que cabem, com o de menos clotoides. 'lisura' fica com o de menor variação de
 *     curvatura (`variacaoDaCurvatura`): refaz os 3 ajustes que cabem de menor variação com o peso da variação dobrado enquanto cabem (e a média geométrica entre o último
 *     que coube e o que falhou, até 20% entre eles, no máximo 1024 vezes o peso padrão), e faz a mesma busca nos pontos invertidos (os duros e os rumos acompanham), de modo
 *     que os pontos na ordem inversa dão a mesma curva, percorrida ao contrário (a variação de uma curva e a da invertida são o mesmo número; no empate exato fica a do
 *     sentido dado). Custa de 1,3 a 7 vezes o padrão, mais com mais pontos (a planta de um carro, 432 pontos: 17 s contra 2,4 s): o resultado se guarda.
 *   esparsos: false (padrão) ou true. Com true a poligonal dos pontos é corda e não curva: o desvio da curva à poligonal e o comprimento contra ela saem do ajuste e de `cabe`,
 *     que passa a cobrar que a curva gire menos de pi entre as projeções de dois pontos seguidos (a volta inteira entre dois pontos não cabe). Serve a poucos pontos medidos.
 *   trechoMinimo: null (padrão, 1% do arco) ou o comprimento mínimo de cada clotoide, na unidade dos pontos, menor que o comprimento da poligonal; ele limita o número de
 *     clotoides ao que cabe no arco.
 *   rumoInicio, rumoFim: null (padrão, livres) ou o rumo da tangente na ponta (radiano contra o primeiro eixo), que a curva tem exato: o do início é o parâmetro, e o do fim tira a
 *     última curvatura da conta do giro. Cada um vai para a volta (múltiplo de 2 pi) mais perto da que os pontos dão, e o do fim, para o giro que eles dão.
 *   As opções da forma (objetivo, esparsos, trechoMinimo, rumoInicio, rumoFim) entram na impressão do ajuste guardado só fora do padrão.
 * devolve: { cabe, motivo, tolerancia, desvioMaximo, desvios, trechos, clotoides, inflexoes, variacaoDaCurvatura, comprimento, joelhos, inicio, rumo, ponto(s), rumoEm(s), valorEm(a, opcoes), amostrar(passo), pontosDaRede(passo, opcoes) }
 *   motivo: null quando cabe; senão o texto de cada condição que falhou (desvio, desvio da curva à poligonal, ordem dos pontos, comprimento), com os valores.
 *   desvioMaximo: o maior desvio de um ponto à curva (3D, quando os pontos têm 3 componentes); desvioDaCurva: o maior desvio da curva à poligonal dos pontos (o outro sentido, que tira da conta a densidade da entrada).
 *   cabe: os dois desvios, medidos na curva integrada a passo fino, estão dentro da tolerância, os pontos se projetam na curva em ordem e o comprimento dela não passa
 *     do da poligonal dos pontos além da tolerância; senão `cabe: false`, e o resto do resultado descreve o que ficou.
 *   variacaoDaCurvatura: a soma de |k_j+1 - k_j| entre os joelhos (1/unidade): a variação total da curvatura, que vezes o comprimento é adimensional.
 *   joelhos: [{ s, k }] o comprimento de arco e a curvatura (1/unidade, positiva para a esquerda) de cada vértice da curvatura; entre dois a curvatura é linear.
 *   trechos: as corridas de curvatura monótona, { de, ate, k0, k1, sentido: 'cresce' | 'cai' | 'constante', joelhos } (de e ate em comprimento de arco); `clotoides`: os
 *     trechos de curvatura linear de que a cadeia é feita, um por par de joelhos.
 *   inflexoes: quantas vezes a curvatura troca de sinal entre faixas que movem a curva mais que a tolerância (a sagita da faixa, medida na curva integrada, é a
 *     distância máxima dela à corda; a faixa abaixo da tolerância é a reta que a tolerância não distingue).
 *     É diagnóstico e não critério: o lóbulo estreito contra a corda curta conta 0 onde a inflexão é obrigatória (a lombada de 3 mm, sigma 40, entre ±300 e ±800),
 *     e nenhum gate aprova ou reprova por este número até a contagem medir o lóbulo contra a ponte entre as faixas vizinhas.
 *   ponto(s) e rumoEm(s): o ponto [u, v] e o rumo (radiano, o ângulo da tangente contra o primeiro eixo) da curva no comprimento de arco s, exatos: o rumo é a integral
 *     fechada da curvatura, e o ponto sai dele por Gauss-Legendre de 5 pontos em pedaços de giro até 0,125 rad, a partir do começo do pedaço, sem corda entre amostras
 *     (erro na ordem de 1e-13 do comprimento, em qualquer escala). Fora de 0 a `comprimento` vale a ponta; s que não é número finito recusa. `rumo` (sem o Em) é o
 *     número do rumo no início, o mesmo de `guardado`. `amostrar` e `pontosDaRede` leem de `ponto`.
 *     O desvio, `cabe` e as inflexões são medidos sobre essa mesma curva: os vértices da curva de passo fino são pontos exatos, o desvio de cada ponto é refinado até
 *     o pé da perpendicular na curva exata, e onde o refino não vale (o ponto além do centro de curvatura) entra o desvio à corda com a flecha dela somada.
 *     O laço do ajuste continua na curva integrada de passo grosso, com o alvo 5% abaixo da tolerância.
 *   valorEm(a, { eixo, fora }): a curva lida como função: o valor da outra coordenada onde a coordenada `eixo` (0 ou 1 do plano da curva, 0 por padrão) vale `a`.
 *     Recusa quando a coordenada `eixo` não cresce nem cai sempre ao longo da curva (o rumo fica perpendicular ao eixo ou o cruza, e a recusa diz entre quais arcos),
 *     e quando `a` cai fora das pontas da curva, salvo com `fora: 'ponta'`, que devolve o valor da ponta mais perto (`fora: 'recusa'` é o padrão).
 *   pontosDaRede(passo, { nome, completar }): { nome, pontos } no formato de `curvas` de `gaiolaPorRede`: pontos-chave sobre a curva ajustada a cada `passo` de arco,
 *     com a ponta exata; `completar(u, v)` devolve [x, y, z] (sem ele, a terceira coordenada é a constante do ajuste).
 * exemplo:
 *   const aj = ajustarCurvaLisa(pontosDaPrancha, { tolerancia: 3 }); // aj.clotoides.length, aj.inflexoes, aj.desvioMaximo
 *   gaiolaPorRede({ ..., curvas: [aj.pontosDaRede(60, { nome: 'planta' }), ...] })
 *   guardado: { inicio, rumo, comprimento, joelhos: [{ f, k }], tolerancia } o que basta para refazer a mesma curva sem ajustar (`f` é a fração do arco de cada joelho e
 *     `tolerancia`, a do plano, que escolhe o passo da integração); é dado puro, que passa por JSON sem perder um bit.
 * guardar o ajuste: o ajuste leva segundos, e quem o usa na importação de uma receita guarda o resultado como dado versionado. `impressaoDoAjuste(pontos, opcoes)` dá a
 *   impressão da entrada ({ versao, pontos, soma, opcoes }: `VERSAO_DO_AJUSTE`, a contagem, a soma dos pontos em milionésimo da unidade e as opções),
 *   `curvaLisaGuardada(guardado)` refaz a curva ({ inicio, rumo, comprimento, joelhos, clotoides, ponto, rumoEm, valorEm, amostrar }, os mesmos números do ajuste, sem medir) e
 *   `curvaLisaDoGuardado({ nome, pontos, opcoes, guardados })` devolve o resultado de `ajustarCurvaLisa` com `doGuardado`: da curva guardada em `guardados[nome]`, medida
 *   contra os pontos de agora (`cabe` e os desvios são dessa medida), quando a impressão dela confere com a entrada (`doGuardado: true`), e do ajuste feito na hora
 *   quando não confere (`doGuardado: false`, com `mudou`, a lista do que difere), para quem chama avisar; só o dado guardado malformado recusa.
 *   Quem muda o algoritmo soma 1 em `VERSAO_DO_AJUSTE`, e o dado guardado antes deixa de conferir.
 *   Nada aqui lê nem escreve disco: quem guarda é a receita, e quem regrava é `tools/modelar/regravar-ajustes-de-curva.mjs`.
 * peça: procedural/nucleo/ajuste-de-curva-lisa.test.mjs (arco, clotoide, elipse e S analíticos, com ruído, a escala, a ordem e as recusas; `ponto`, `rumoEm` e `valorEm`
 *   contra a reta, o arco e a clotoide em forma fechada) e ajuste-de-curva-lisa-lisura.test.mjs (a lisura, os pontos invertidos, os esparsos, o trecho mínimo e os rumos, a
 *   ×1e-3, ×1 e ×1e3 e em mais de uma densidade).
 * FIM DA FICHA
 *
 * POR QUE CLOTOIDE. Uma curva lisa do ponto de vista da zebra é a de curvatura que não oscila: a ondulação longa vem de variações de 0,1 1/m. A clotoide
 * (curvatura linear em s) é a de variação mínima entre duas curvaturas dadas, é fechada sob o ajuste (a cadeia com curvatura contínua é G2 por construção, sem
 * condição de emenda), e a inflexão cai onde a curvatura passa por zero, sem lóbulo. A cônica tem curvatura monótona só em cada metade e pede a posição do
 * eixo; a cúbica de curvatura monótona pede a condição de monotonia sobre os coeficientes. Para o mesmo desvio, a cadeia de clotoides tem os mesmos graus de
 * liberdade (um par de curvaturas e um comprimento por trecho) sem restrição sobre eles.
 *
 * COMO AJUSTA. A curva é { início, rumo, comprimento L, joelhos (fração do arco, curvatura) }; a posição sai de integrar a curvatura (Simpson na curvatura e ponto
 * médio no rumo), com o passo escolhido pelo comprimento, pela curvatura e pela tolerância (a flecha da corda abaixo de 1/40 dela) e os joelhos como quebra do
 * passo. O resíduo de cada ponto é a distância com sinal à curva (ao ponto mais perto da curva amostrada), mais as duas pontas e uma penalidade pequena sobre a
 * variação de curvatura (0,1 × tolerância × Δk × L, adimensional em Δk × L, de modo que a mesma forma em outra escala dá o mesmo ajuste, e pequena perto dos desvios: só prefere a rampa ao salto quando o desvio empata); o ajuste
 * é de Levenberg-Marquardt, com jacobiano por diferença finita, sobre o início, o rumo, L, as curvaturas e as frações dos joelhos, e para por convergência. Com mais de
 * 400 pontos o ajuste usa 400 deles (espaçados, com as pontas e os duros, e os piores de cada ajuste anterior), e o desvio de todos é medido depois. Parte de uma clotoide só, com o rumo lido da corda dos
 * pontos numa janela de 3% do arco (um ruído do tamanho do espaçamento não o desvia); enquanto o desvio máximo passa da tolerância, entra um joelho no ponto de maior
 * desvio e o ajuste refaz de onde estava; no fim tenta tirar cada joelho e guarda a retirada que ainda cabe, e de todos os ajustes que cabem fica o de menos clotoides
 * (e, a igual, o de menor custo): sai o menor número de trechos que o ajuste achou, e não o menor possível. O resultado é determinístico (nenhum sorteio, nenhum relógio). */

const MINIMO_DA_FRACAO = 0.01;
const PESO_DA_PONTA = 10;
const PESO_DO_DURO = 20;
const MAXIMO_NO_AJUSTE = 400;
const REGULARIZACAO = 0.1;
/* a faixa de curvatura de um sinal só conta como lóbulo se a sagita dela, na curva integrada, passa de 80% da tolerância: abaixo disso o ajuste não distingue o lóbulo da reta */
const LIMIAR_DO_LOBULO = 0.8;

const erro = (texto) => { throw new Error(`ajustarCurvaLisa: ${texto}`); };
const citar = (v) => { try { return typeof v === 'number' ? String(v) : JSON.stringify(v) ?? String(v); } catch { return String(v); } };

/* ---------- a curva por joelhos ---------- */

function curvaturaEm(f, fr, k) {
  const n = fr.length;
  if (f <= fr[0]) return k[0];
  if (f >= fr[n - 1]) return k[n - 1];
  let i = 1; while (fr[i] < f) i += 1;
  return k[i - 1] + ((k[i] - k[i - 1]) * (f - fr[i - 1])) / (fr[i] - fr[i - 1]);
}

/** o passo de integração: o comprimento dividido por 60 (por 400 no fino), a flecha da corda abaixo de 1/40 (1/200 no fino) da tolerância e o giro de 0,1 radiano por passo: tudo cresce e encolhe com a escala */
function passoDe(L, kmax, tolerancia, fino) {
  const k = kmax + 1e-300;
  return Math.min(L / (fino ? 400 : 60), Math.sqrt((8 * tolerancia) / ((fino ? 200 : 40) * k)), 0.1 / k);
}

/** o número de passos de cada trecho de curvatura linear, pelo passo de `passoDe` */
function passosPorTrecho(fr, L, k, tolerancia, fino) {
  const h = passoDe(L, Math.max(...k.map(Math.abs)), tolerancia, fino);
  return fr.slice(1).map((f, j) => Math.max(2, Math.ceil(((f - fr[j]) * L) / h)));
}

/** integra a curva: devolve { x, y, th, s, n } em Float64Array; a curvatura é linear em cada trecho, então Simpson nela é exato */
function integrar({ x0, y0, th0, L, k }, fr, passos) {
  const total = passos.reduce((a, b) => a + b, 1);
  const x = new Float64Array(total); const y = new Float64Array(total); const th = new Float64Array(total); const s = new Float64Array(total);
  x[0] = x0; y[0] = y0; th[0] = th0; let i = 0;
  for (let j = 0; j < fr.length - 1; j += 1) {
    const s0 = fr[j] * L; const len = (fr[j + 1] - fr[j]) * L; const q = passos[j]; const h = len / q; const ka = k[j]; const dk = k[j + 1] - k[j];
    for (let t = 0; t < q; t += 1) {
      const k0 = ka + (dk * t) / q; const k1 = ka + (dk * (t + 0.5)) / q; const k2 = ka + (dk * (t + 1)) / q;
      const meio = th[i] + ((k0 + k1) * h) / 4;
      x[i + 1] = x[i] + Math.cos(meio) * h; y[i + 1] = y[i] + Math.sin(meio) * h;
      th[i + 1] = th[i] + (((k0 + 4 * k1 + k2) / 6) * h); s[i + 1] = s0 + (len * (t + 1)) / q; i += 1;
    }
  }
  return { x, y, th, s, n: total - 1 };
}

/* as frações dos joelhos interiores, apertadas para ficarem em ordem com folga mínima */
function fracoes(interiores, n, minimo = MINIMO_DA_FRACAO) {
  const fr = [0, ...interiores, 1];
  for (let i = 1; i < n - 1; i += 1) fr[i] = Math.min(1 - minimo * (n - 1 - i), Math.max(fr[i - 1] + minimo, fr[i]));
  return fr;
}

/* a forma padrão da curva: o trecho mínimo de 1% do arco e os rumos das pontas livres */
const FORMA_LIVRE = Object.freeze({ minimoDe: () => MINIMO_DA_FRACAO, rumoInicio: null, rumoFim: null });

/* os parâmetros p = [x0, y0, th0, L, k_0..k_{n-1}, f_1..f_{n-2}]; com `forma.rumoInicio` o rumo do início é o declarado (o parâmetro fica sem efeito), e com
 * `forma.rumoFim` a última curvatura sai da conta que faz o rumo do fim, th0 + soma de (k_j + k_j+1) / 2 vezes o comprimento de cada trecho, ser o declarado */
const desempacotar = (p, n, forma = FORMA_LIVRE) => {
  /* com a forma declarada, o comprimento negativo (a curva percorrida para trás, que com o rumo do início preso vira o rumo em pi) vale o positivo: o rumo declarado é o rumo */
  const L = forma === FORMA_LIVRE ? p[3] : Math.abs(p[3]); const k = p.slice(4, 4 + n); const fr = fracoes(p.slice(4 + n), n, forma.minimoDe(L));
  const th0 = forma.rumoInicio ?? p[2];
  if (forma.rumoFim !== null) {
    let giro = 0; for (let j = 0; j < n - 2; j += 1) giro += ((k[j] + k[j + 1]) / 2) * (fr[j + 1] - fr[j]);
    k[n - 1] = (2 * ((forma.rumoFim - th0) / L - giro)) / (fr[n - 1] - fr[n - 2]) - k[n - 2];
  }
  return { x0: p[0], y0: p[1], th0, L, k, fr };
};

/** a distância com sinal (positiva à esquerda da curva) de cada ponto à curva amostrada, e o arco da projeção; `janela` guarda o índice mais perto de cada ponto
 *  (negativo: busca global) e a busca local, se acaba na borda da janela, refaz-se global */
function desviosDos(P, c, janela, projecoes = null) {
  const { x, y, s, n } = c; const m = P.length; const d = new Float64Array(m);
  const mais = (i, de, ate, passo) => { let melhor = de; let menor = Infinity; for (let j = de; j <= ate; j += passo) { const q = (x[j] - P[i][0]) ** 2 + (y[j] - P[i][1]) ** 2; if (q < menor) { menor = q; melhor = j; } } return melhor; };
  for (let i = 0; i < m; i += 1) {
    let melhor;
    const global = () => { const passo = Math.max(1, Math.floor(n / 200)); const g = mais(i, 0, n, passo); return mais(i, Math.max(0, g - passo), Math.min(n, g + passo), 1); };
    if (janela[i] < 0) melhor = global();
    else {
      const de = Math.max(0, janela[i] - 24); const ate = Math.min(n, janela[i] + 24); melhor = mais(i, de, ate, 1);
      if ((melhor === de && de > 0) || (melhor === ate && ate < n)) melhor = global();
    }
    janela[i] = melhor;
    /* a projeção na reta do segmento mais perto, para o desvio não depender da amostragem */
    let dist = Math.hypot(x[melhor] - P[i][0], y[melhor] - P[i][1]); let sinal = 0; let arco = s[melhor];
    for (const [a, b] of [[Math.max(0, melhor - 1), melhor], [melhor, Math.min(n, melhor + 1)]]) {
      if (a === b) continue;
      const ex = x[b] - x[a]; const ey = y[b] - y[a]; const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((P[i][0] - x[a]) * ex + (P[i][1] - y[a]) * ey) / l2)) : 0;
      const dx = P[i][0] - (x[a] + ex * t); const dy = P[i][1] - (y[a] + ey * t); const q = Math.hypot(dx, dy);
      if (q <= dist + 1e-12) { dist = q; sinal = ex * dy - ey * dx; arco = s[a] + t * (s[b] - s[a]); }
    }
    d[i] = sinal >= 0 ? dist : -dist;
    if (projecoes) projecoes[i] = arco;
  }
  return d;
}

/** o maior desvio da curva à poligonal dos pontos (o outro sentido do desvio de cada ponto à curva): amostra a curva em até 600 pontos e mede a distância ao
 *  segmento mais perto da poligonal; com ele o resultado não depende de a entrada ter 200 ou 5000 pontos sobre a mesma forma. Devolve { maximo, arco } */
function desvioDaCurva(P, c) {
  const passo = Math.max(1, Math.floor(c.n / 600)); let maximo = 0; let arco = 0;
  for (let i = 0; i <= c.n; i += i + passo > c.n && i < c.n ? c.n - i : passo) {
    let menor = Infinity;
    for (let j = 0; j < P.length - 1; j += 1) {
      const ex = P[j + 1][0] - P[j][0]; const ey = P[j + 1][1] - P[j][1]; const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((c.x[i] - P[j][0]) * ex + (c.y[i] - P[j][1]) * ey) / l2)) : 0;
      const q = (c.x[i] - P[j][0] - ex * t) ** 2 + (c.y[i] - P[j][1] - ey * t) ** 2; if (q < menor) menor = q;
    }
    if (menor > maximo * maximo) { maximo = Math.sqrt(menor); arco = c.s[i]; }
  }
  return { maximo, arco };
}

/* ---------- mínimos quadrados de Levenberg-Marquardt ---------- */

function resolver(A, b) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i += 1) {
    let pv = i; for (let r = i + 1; r < n; r += 1) if (Math.abs(M[r][i]) > Math.abs(M[pv][i])) pv = r;
    [M[i], M[pv]] = [M[pv], M[i]];
    if (!(Math.abs(M[i][i]) > 1e-300)) return null;
    for (let r = i + 1; r < n; r += 1) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c += 1) M[r][c] -= f * M[i][c]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) { let t = M[i][n]; for (let c = i + 1; c < n; c += 1) t -= M[i][c] * x[c]; x[i] = t / M[i][i]; }
  return x;
}

const somaDeQuadrados = (r) => { let t = 0; for (const v of r) t += v * v; return Number.isFinite(t) ? t : Infinity; };

/** LM que para por convergência (ganho relativo do custo abaixo de 1e-7 em dois passos seguidos) ou no teto de 80 iterações, e devolve o melhor visto */
function lm(residuo, p0, escala) {
  let p = [...p0]; let r = residuo(p); let custo = somaDeQuadrados(r); let lambda = 1e-3; let parados = 0;
  for (let it = 0; it < 80 && Number.isFinite(custo); it += 1) {
    const J = p.map((_, j) => { const h = escala[j] * 1e-4; const q = [...p]; q[j] += h; const rq = residuo(q); return rq.map((v, i) => (v - r[i]) / h); });
    const m = r.length; const np = p.length;
    const JTJ = Array.from({ length: np }, () => new Array(np).fill(0)); const g = new Array(np).fill(0);
    for (let a = 0; a < np; a += 1) { for (let i = 0; i < m; i += 1) g[a] += J[a][i] * r[i]; for (let b = a; b < np; b += 1) { let t = 0; for (let i = 0; i < m; i += 1) t += J[a][i] * J[b][i]; JTJ[a][b] = t; JTJ[b][a] = t; } }
    let aceitou = false;
    for (let tentativa = 0; tentativa < 8 && !aceitou; tentativa += 1) {
      const A = JTJ.map((linha, i) => linha.map((v, j) => (i === j ? v + lambda * (v + 1e-12) : v)));
      const passo = resolver(A, g.map((v) => -v));
      if (!passo) { lambda *= 10; continue; }
      const q = p.map((v, i) => v + passo[i]); const rq = residuo(q); const cq = somaDeQuadrados(rq);
      if (cq < custo) { const ganho = (custo - cq) / (custo + 1e-300); p = q; r = rq; custo = cq; lambda = Math.max(1e-9, lambda / 5); aceitou = true; parados = ganho < 1e-7 ? parados + 1 : 0; } else lambda *= 8;
    }
    if (!aceitou || parados >= 2) break;
  }
  return { p, custo };
}

/* ---------- a entrada ---------- */

function lerEntrada(entrada, { tolerancia, maximoDeClotoides, duros, eixos }) {
  if (typeof tolerancia !== 'number' || !(tolerancia > 0) || !Number.isFinite(tolerancia)) erro(`tolerancia espera um número maior que zero (a mesma unidade dos pontos), e veio ${citar(tolerancia)}`);
  if (!Number.isInteger(maximoDeClotoides) || maximoDeClotoides < 1) erro(`maximoDeClotoides espera um inteiro de 1 em diante, e veio ${citar(maximoDeClotoides)}`);
  if (!Array.isArray(eixos) || eixos.length !== 2 || !eixos.every((e) => [0, 1, 2].includes(e)) || eixos[0] === eixos[1]) erro(`eixos espera dois dos índices 0, 1 e 2, e veio ${citar(eixos)}`);
  if (!Array.isArray(duros)) erro(`duros espera uma lista de índices de pontos, e veio ${citar(duros)}`);
  if (!Array.isArray(entrada) || entrada.length < 3) erro(`pontos espera uma lista de 3 pontos ou mais, e veio ${Array.isArray(entrada) ? `${entrada.length} ponto(s)` : typeof entrada}`);
  const tamanho = Array.isArray(entrada[0]) ? entrada[0].length : null;
  entrada.forEach((q, k) => {
    if (Array.isArray(q) && q.some((c) => Number.isFinite(c) && Math.abs(c) > 1e100)) erro(`o ponto ${k} tem coordenada de módulo acima de 1e100 (${citar(q)}): as contas do ajuste perdem o desvio; passe pontos numa unidade em que a curva tenha a ordem de grandeza do uso`);
    if (!Array.isArray(q) || !(q.length === 2 || q.length === 3) || !q.every((c) => Number.isFinite(c))) erro(`o ponto ${k} precisa ser [u, v] ou [x, y, z] de números finitos, e veio ${citar(q)}`);
    if (q.length !== tamanho) erro(`os pontos misturam ${tamanho} e ${q.length} componentes (o ponto ${k} tem ${q.length}): passe todos com 2 ou todos com 3`);
  });
  for (const i of duros) if (!Number.isInteger(i) || i < 0 || i >= entrada.length) erro(`duros espera índices de 0 a ${entrada.length - 1}, e veio ${citar(i)}`);
  const [i, j] = eixos; const tem3 = tamanho === 3;
  const P = entrada.map((q) => (tem3 ? [q[i], q[j]] : [q[0], q[1]]));
  const livre = tem3 ? [0, 1, 2].find((e) => e !== i && e !== j) : null;
  let constante = 0; let meio = 0; let livres = null; let tolEfetiva = tolerancia;
  if (tem3) {
    livres = entrada.map((q) => q[livre]); const lo = Math.min(...livres); const hi = Math.max(...livres);
    constante = (lo + hi) / 2; meio = (hi - lo) / 2;
    /* o desvio na coordenada livre (até meio) e o no plano somam em quadratura no desvio 3D: o plano fica com o que sobra da tolerância */
    if (!(meio < tolerancia)) erro(`a coordenada livre (índice ${livre}) varia ${citar(hi - lo)} entre os pontos, e metade disso (${citar(meio)}) já gasta a tolerância ${citar(tolerancia)}: a curva não é plana nos eixos ${citar(eixos)}; passe os eixos certos ou projete os pontos antes`);
    tolEfetiva = Math.sqrt(tolerancia * tolerancia - meio * meio);
  }
  let L = 0; for (let k = 1; k < P.length; k += 1) L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]);
  if (!(L > 4 * tolerancia)) erro(`o comprimento da poligonal dos pontos (${citar(Math.round(L * 1e6) / 1e6)}) é nulo ou desprezível perto da tolerância ${citar(tolerancia)} (pede mais de ${citar(4 * tolerancia)}): não há curva a ajustar`);
  return { P, constante, livre, tem3, livres, tolEfetiva, comprimentoDosPontos: L };
}

/* ---------- o ajuste ---------- */

/** os pontos que o LM usa: todos até MAXIMO_NO_AJUSTE, e acima disso os espaçados, com as pontas e os duros */
function reduzir(P, duros) {
  if (P.length <= MAXIMO_NO_AJUSTE) return P.map((_, i) => i);
  const passo = Math.ceil(P.length / MAXIMO_NO_AJUSTE); const fica = new Set([0, P.length - 1, ...duros]);
  for (let i = 0; i < P.length; i += passo) fica.add(i);
  return [...fica].sort((a, b) => a - b);
}

/* a curvatura inicial por mínimos quadrados sobre o rumo lido dos pontos pela corda numa janela de 3% do arco, com os joelhos em fr */
function iniciar(P, fr) {
  const m = P.length; const s = [0];
  for (let i = 1; i < m; i += 1) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = s[m - 1]; const janela = 0.03 * L;
  const rumo = []; let anterior = null;
  for (let i = 0; i < m; i += 1) {
    let a = i; while (a > 0 && s[i] - s[a - 1] <= janela) a -= 1;
    let b = i; while (b < m - 1 && s[b + 1] - s[i] <= janela) b += 1;
    if (a === b) { a = Math.max(0, i - 1); b = Math.min(m - 1, i + 1); }
    let r = Math.atan2(P[b][1] - P[a][1], P[b][0] - P[a][0]);
    if (anterior !== null) { while (r - anterior > Math.PI) r -= 2 * Math.PI; while (r - anterior < -Math.PI) r += 2 * Math.PI; }
    rumo.push(r); anterior = r;
  }
  const n = fr.length; const N = 400;
  const chapeu = (j, f) => { if (j > 0 && f >= fr[j - 1] && f <= fr[j]) return (f - fr[j - 1]) / (fr[j] - fr[j - 1]); if (j < n - 1 && f >= fr[j] && f <= fr[j + 1]) return (fr[j + 1] - f) / (fr[j + 1] - fr[j]); return 0; };
  const tabela = fr.map((_, j) => { const t = [0]; for (let q = 1; q <= N; q += 1) t.push(t[q - 1] + ((chapeu(j, (q - 1) / N) + chapeu(j, q / N)) / 2) * (1 / N) * L); return t; });
  const em = (j, f) => { const x = f * N; const a = Math.min(N - 1, Math.floor(x)); return tabela[j][a] + (tabela[j][a + 1] - tabela[j][a]) * (x - a); };
  const A = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0)); const b = new Array(n + 1).fill(0);
  for (let i = 0; i < m; i += 1) {
    const f = s[i] / L; const linha = [1, ...fr.map((_, j) => em(j, f))];
    for (let a = 0; a <= n; a += 1) { b[a] += linha[a] * rumo[i]; for (let c = 0; c <= n; c += 1) A[a][c] += linha[a] * linha[c]; }
  }
  for (let a = 0; a <= n; a += 1) A[a][a] += 1e-12 * (1 + A[a][a]);
  const sol = resolver(A, b) ?? [rumo[0], ...new Array(n).fill(0)];
  return { th0: sol[0], k: sol.slice(1), L };
}

function ajustarComJoelhos(ctx, joelhos, partida) {
  const { P, pesos, tolerancia, forma } = ctx; const indices = ctx.indices; const n = joelhos.length;
  const Pt = indices.map((i) => P[i]); const pt = indices.map((i) => pesos[i]); const pt0 = [...pt]; const m = Pt.length;
  const base = partida ?? (() => { const ini = iniciar(Pt, joelhos); return [Pt[0][0], Pt[0][1], ini.th0, ini.L, ...ini.k, ...joelhos.slice(1, -1)]; })();
  const q0 = desempacotar(base, n, forma);
  let passos = passosPorTrecho(q0.fr, q0.L, q0.k.map((v) => v * 1.5), tolerancia, false);
  
  const janela = new Array(m).fill(-1);
  const residuo = (p) => {
    const q = desempacotar(p, n, forma); const c = integrar(q, q.fr, passos);
    const d = desviosDos(Pt, c, janela.slice());
    const r = new Array(m + 4 + (n - 1));
    for (let i = 0; i < m; i += 1) r[i] = d[i] * pt[i];
    r[m] = (c.x[0] - Pt[0][0]) * PESO_DA_PONTA; r[m + 1] = (c.y[0] - Pt[0][1]) * PESO_DA_PONTA;
    r[m + 2] = (c.x[c.n] - Pt[m - 1][0]) * PESO_DA_PONTA; r[m + 3] = (c.y[c.n] - Pt[m - 1][1]) * PESO_DA_PONTA;
    for (let j = 0; j < n - 1; j += 1) r[m + 4 + j] = ctx.regularizacao * tolerancia * (q.k[j + 1] - q.k[j]) * q.L;
    return r;
  };
  /* os passos se refazem pela curvatura de cada ponto de partida, que cresce quando o ajuste acha a forma */
  const refazerJanela = (p) => { const q = desempacotar(p, n, forma); passos = passosPorTrecho(q.fr, q.L, q.k.map((v) => v * 1.5), tolerancia, false); desviosDos(Pt, integrar(q, q.fr, passos), janela.fill(-1)); };
  refazerJanela(base);
  const L0 = base[3]; const kEscala = 1 / L0;
  const escala = base.map((_, j) => (j < 2 ? Math.max(tolerancia, 1e-9) : j === 2 ? 1e-2 : j === 3 ? L0 * 1e-2 : j < 4 + n ? kEscala : 1e-2));
  let { p, custo } = lm(residuo, base, escala);
  refazerJanela(p);
  ({ p, custo } = lm(residuo, p, escala));
  /* o desvio de todos os pontos, na curva do mesmo passo grosso */
  const medir = (pp) => {
    const q = desempacotar(pp, n, forma); const c = integrar(q, q.fr, passosPorTrecho(q.fr, q.L, q.k, tolerancia, false));
    const proj = new Float64Array(P.length); const d = desviosDos(P, c, new Array(P.length).fill(-1), proj);
    let maximo = 0; let arcoDoErro = 0; for (let i = 0; i < P.length; i += 1) { const v = Math.abs(d[i]); if (v > maximo) { maximo = v; arcoDoErro = proj[i]; } }
    /* com pontos esparsos a poligonal não é a curva, e o desvio da curva a ela não entra */
    const volta = ctx.esparsos ? { maximo: 0, arco: 0 } : desvioDaCurva(P, c);
    if (volta.maximo > maximo) { maximo = volta.maximo; arcoDoErro = volta.arco; }
    return { p: pp, q, d, maximo: Number.isFinite(maximo) ? maximo : Infinity, arcoDoErro };
  };
  let medido = medir(p);
  /* quase dentro da tolerância: duas rodadas com peso maior nos pontos que mais desviam (Lawson), que trocam um pouco do erro médio pelo máximo */
  for (let rodada = 0; rodada < 2 && medido.maximo > ctx.alvo && medido.maximo <= 1.3 * tolerancia; rodada += 1) {
    indices.forEach((gi, k) => { pt[k] = pt0[k] * (1 + 6 * Math.max(0, Math.abs(medido.d[gi]) / tolerancia - 0.6) ** 2); });
    refazerJanela(medido.p);
    const r = lm(residuo, medido.p, escala);
    const novo = medir(r.p);
    if (novo.maximo < medido.maximo) { medido = novo; custo = r.custo; } else break;
  }
  const { d, maximo, arcoDoErro, q } = medido; p = medido.p;
  /* com a entrada reduzida, os piores pontos deste ajuste entram no conjunto dos seguintes: o ajuste não perde de vista o que a inserção de joelho vai mirar */
  if (indices.length < P.length) {
    const piores = Array.from(d, (v, i) => [Math.abs(v), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, 8).map(([, i]) => i);
    const novos = piores.filter((i) => !ctx.indices.includes(i));
    if (novos.length) ctx.indices = [...ctx.indices, ...novos].sort((a, b) => a - b);
  }
  return { p, custo, d, maximo: Number.isFinite(maximo) ? maximo : Infinity, arcoDoErro, q };
}

/** a busca num sentido: entra joelho no ponto de maior desvio, tira os que a tolerância dispensa e devolve o ajuste escolhido pelo objetivo */
function buscar(ctx, maximoDeClotoides, lisura) {
  const { forma } = ctx;
  let joelhos = [0, 1]; let atual = ajustarComJoelhos(ctx, joelhos, null);
  const guardados = [atual];
  /* o teto de clotoides que o trecho mínimo deixa caber no arco */
  const cabemNoArco = (L) => Math.max(1, Math.floor(1 / forma.minimoDe(L) + 1e-9));
  /* entra um joelho no ponto de maior desvio, enquanto passa da tolerância */
  while (atual.maximo > ctx.alvo && joelhos.length - 1 < Math.min(maximoDeClotoides, cabemNoArco(atual.q.L))) {
    const { q } = atual; const fr = q.fr; const minimo = forma.minimoDe(q.L);
    let f = Math.min(1 - 2 * minimo, Math.max(2 * minimo, atual.arcoDoErro / q.L));
    let i = 1; while (i < fr.length - 1 && fr[i] < f) i += 1;
    if (f - fr[i - 1] < 2 * minimo || fr[i] - f < 2 * minimo) f = (fr[i - 1] + fr[i]) / 2;
    const novos = [...fr.slice(0, i), f, ...fr.slice(i)]; const kf = curvaturaEm(f, fr, q.k);
    const ks = [...q.k.slice(0, i), kf, ...q.k.slice(i)];
    atual = ajustarComJoelhos(ctx, novos, [q.x0, q.y0, q.th0, q.L, ...ks, ...novos.slice(1, -1)]);
    joelhos = novos; guardados.push(atual);
  }
  /* tira os joelhos que a tolerância dispensa, o de menor custo primeiro */
  let melhor = atual;
  let podou = melhor.maximo <= ctx.alvo;
  while (podou && melhor.q.fr.length > 2) {
    podou = false;
    const candidatos = [];
    const { q } = melhor;
    for (let i = 1; i < q.fr.length - 1; i += 1) {
      const fr = q.fr.filter((_, j) => j !== i); const ks = q.k.filter((_, j) => j !== i);
      const t = ajustarComJoelhos(ctx, fr, [q.x0, q.y0, q.th0, q.L, ...ks, ...fr.slice(1, -1)]);
      if (t.maximo <= ctx.alvo) candidatos.push(t);
    }
    if (candidatos.length) { candidatos.sort((a, b) => a.custo - b.custo); melhor = candidatos[0]; guardados.push(melhor); podou = true; }
  }
  const cabem = guardados.filter((g) => g.maximo <= ctx.alvo);
  /* nenhum cabe: o de menor desvio, nos dois objetivos */
  if (!cabem.length) return guardados.sort((a, b) => a.maximo - b.maximo)[0];
  /* de todos os ajustes que cabem, o de menos clotoides e, a igual, o de menor custo */
  if (!lisura) return cabem.sort((a, b) => a.q.fr.length - b.q.fr.length || a.custo - b.custo)[0];
  /* lisura: os ALISADOS de menor variação de curvatura sobem o peso da variação enquanto o ajuste cabe, e fica o de menor variação de todos os que cabem */
  const porVariacao = (a, b) => variacaoAdimensional(a.q) - variacaoAdimensional(b.q) || a.maximo - b.maximo;
  const todos = [...cabem];
  for (const partida of [...cabem].sort(porVariacao).slice(0, ALISADOS)) {
    /* o peso dobra enquanto cabe; quando não cabe, a média geométrica entre o último que coube e o que falhou, até os dois ficarem a menos de 20% */
    let daLisura = partida; let coube = 1; let falhou = null;
    for (let tentativa = 0; tentativa < TENTATIVAS_DA_LISURA; tentativa += 1) {
      const fator = falhou === null ? 2 * coube : Math.sqrt(coube * falhou);
      if (fator > FATOR_MAXIMO_DA_LISURA || (falhou !== null && falhou / coube < 1.2)) break;
      ctx.regularizacao = REGULARIZACAO * fator;
      const { q } = daLisura;
      const t = ajustarComJoelhos(ctx, q.fr, [q.x0, q.y0, q.th0, q.L, ...q.k, ...q.fr.slice(1, -1)]);
      if (t.maximo <= ctx.alvo) { todos.push(t); daLisura = t; coube = fator; } else falhou = fator;
    }
    ctx.regularizacao = REGULARIZACAO;
  }
  return todos.sort(porVariacao)[0];
}

/* quantos ajustes de menor variação a lisura alisa, quantas vezes ela refaz cada um com outro peso da variação e o maior peso, em vezes o padrão */
const ALISADOS = 3;
const TENTATIVAS_DA_LISURA = 14;
const FATOR_MAXIMO_DA_LISURA = 1024;

/** a variação total da curvatura vezes o comprimento (adimensional): a soma de |k_j+1 - k_j| L, somada em ordem crescente para dar o mesmo número com a curva invertida */
function variacaoAdimensional({ k, L }) {
  const saltos = k.slice(1).map((v, j) => Math.abs(v - k[j]) * L).sort((a, b) => a - b);
  return saltos.reduce((t, v) => t + v, 0);
}

/** a mesma curva percorrida ao contrário: começa no fim, com o rumo do fim mais pi, e as curvaturas na ordem inversa e de sinal trocado */
function inverter(q) {
  const exata = leituraExata(q); const [x0, y0] = exata.ponto(q.L);
  return { x0, y0, th0: exata.rumoEm(q.L) + Math.PI, L: q.L, k: [...q.k].reverse().map((v) => -v), fr: [...q.fr].reverse().map((f) => 1 - f) };
}

const OBJETIVOS = ['menosClotoides', 'lisura'];
const VOLTA = 2 * Math.PI;
/* o maior rumo declarado aceito, 1000 voltas: além disso a conta da volta mais perto perde dígitos do rumo */
const VOLTAS_DO_MAIOR_RUMO = 1000;
const MAIOR_RUMO = VOLTAS_DO_MAIOR_RUMO * VOLTA;

/** o rumo das duas pontas lido da corda dos pontos numa janela de 3% do arco, com o do fim desenrolado a partir do do início (o giro da curva) */
function rumosDasPontas(P) {
  const s = [0]; for (let i = 1; i < P.length; i += 1) s.push(s[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const janela = 0.03 * s[s.length - 1]; let anterior = null; const rumos = [];
  for (let i = 0; i < P.length; i += 1) {
    let a = i; while (a > 0 && s[i] - s[a - 1] <= janela) a -= 1;
    let b = i; while (b < P.length - 1 && s[b + 1] - s[i] <= janela) b += 1;
    if (a === b) { a = Math.max(0, i - 1); b = Math.min(P.length - 1, i + 1); }
    let r = Math.atan2(P[b][1] - P[a][1], P[b][0] - P[a][0]);
    if (anterior !== null) { while (r - anterior > Math.PI) r -= VOLTA; while (r - anterior < -Math.PI) r += VOLTA; }
    rumos.push(r); anterior = r;
  }
  return [rumos[0], rumos[rumos.length - 1]];
}

/** lê as opções do objetivo e da forma, com a recusa que diz o valor recebido */
function lerOpcoesDaForma({ objetivo, esparsos, trechoMinimo, rumoInicio, rumoFim }) {
  if (!OBJETIVOS.includes(objetivo)) erro(`objetivo espera ${OBJETIVOS.map((o) => `'${o}'`).join(' ou ')}, e veio ${citar(objetivo)}`);
  if (typeof esparsos !== 'boolean') erro(`esparsos espera true ou false, e veio ${citar(esparsos)}`);
  if (trechoMinimo !== null && !(typeof trechoMinimo === 'number' && Number.isFinite(trechoMinimo) && trechoMinimo > 0)) erro(`trechoMinimo espera o comprimento mínimo de uma clotoide, um número maior que zero na unidade dos pontos, ou null, e veio ${citar(trechoMinimo)}`);
  for (const [nome, v] of [['rumoInicio', rumoInicio], ['rumoFim', rumoFim]]) {
    if (v !== null && !(typeof v === 'number' && Number.isFinite(v))) erro(`${nome} espera o rumo da tangente em radiano contra o primeiro eixo, um número finito, ou null, e veio ${citar(v)}`);
    if (v !== null && !(Math.abs(v) <= MAIOR_RUMO)) erro(`${nome} (${citar(v)}) passa de ${VOLTAS_DO_MAIOR_RUMO} voltas (${citar(MAIOR_RUMO)} rad), onde a conta da volta perde o rumo; passe o rumo entre -pi e pi`);
  }
}

/** ajustarCurvaLisa(pontos, { tolerancia, maximoDeClotoides, duros, eixos, objetivo, esparsos, trechoMinimo, rumoInicio, rumoFim }) -> o ajuste descrito na ficha */
export function ajustarCurvaLisa(entrada, {
  tolerancia: toleranciaPedida = 1, maximoDeClotoides = 8, duros = [], eixos = [0, 1],
  objetivo = 'menosClotoides', esparsos = false, trechoMinimo = null, rumoInicio = null, rumoFim = null,
} = {}) {
  let tolerancia = toleranciaPedida;
  const lido = lerEntrada(entrada, { tolerancia, maximoDeClotoides, duros, eixos });
  lerOpcoesDaForma({ objetivo, esparsos, trechoMinimo, rumoInicio, rumoFim });
  const { P } = lido; const original = tolerancia; tolerancia = lido.tolEfetiva;
  if (trechoMinimo !== null && !(trechoMinimo < lido.comprimentoDosPontos)) erro(`trechoMinimo (${citar(trechoMinimo)}) não fica abaixo do comprimento da poligonal dos pontos (${citar(lido.comprimentoDosPontos)}): a curva não teria trecho que coubesse`);
  /* os rumos declarados vão para a volta mais perto da lida nos pontos, e o do fim, para o giro que os pontos dão */
  const [lido0, lido1] = rumosDasPontas(P);
  const perto = (v, alvo) => v + VOLTA * Math.round((alvo - v) / VOLTA);
  const ri = rumoInicio === null ? null : perto(rumoInicio, lido0);
  const rf = rumoFim === null ? null : perto(rumoFim, (ri ?? lido0) + (lido1 - lido0));
  const minimoDe = trechoMinimo === null ? FORMA_LIVRE.minimoDe : (L) => trechoMinimo / L;
  const lisura = objetivo === 'lisura';
  /* o alvo do ajuste é 5% abaixo da tolerância: a medida do ajuste é no passo grosso, e a final, no fino, difere por frações dela */
  const alvo = 0.95 * tolerancia;
  const contexto = (pontos, durosAqui, forma) => ({
    P: pontos, pesos: pontos.map((_, i) => (durosAqui.includes(i) ? PESO_DO_DURO : 1)), indices: reduzir(pontos, durosAqui), tolerancia, alvo, forma, regularizacao: REGULARIZACAO, esparsos,
  });
  const forma = trechoMinimo === null && ri === null && rf === null ? FORMA_LIVRE : { minimoDe, rumoInicio: ri, rumoFim: rf };
  const ida = buscar(contexto(P, duros, forma), maximoDeClotoides, lisura);
  const modo = { esparsos, trechoMinimo };
  if (!lisura) return montar(ida, lido, tolerancia, eixos, original, modo);
  /* a lisura não depende do sentido dos pontos: a mesma busca nos pontos invertidos, com os rumos trocados de ponta e virados, e fica a de menor variação;
   * a variação de uma curva e a da invertida são o mesmo número, então os pontos invertidos escolhem a mesma curva */
  const m = P.length; const Pv = [...P].reverse();
  /* os rumos virados vão para a volta que os pontos invertidos dão, como os declarados foram para a dos pontos dados */
  const [voltaLida0, voltaLida1] = rumosDasPontas(Pv);
  const riVolta = rf === null ? null : perto(rf + Math.PI, voltaLida0);
  const rfVolta = ri === null ? null : perto(ri + Math.PI, (riVolta ?? voltaLida0) + (voltaLida1 - voltaLida0));
  const formaDaVolta = forma === FORMA_LIVRE ? FORMA_LIVRE : { minimoDe, rumoInicio: riVolta, rumoFim: rfVolta };
  const volta = buscar(contexto(Pv, duros.map((i) => m - 1 - i), formaDaVolta), maximoDeClotoides, true);
  const desvirada = inverter(volta.q);
  desvirada.th0 = ri ?? perto(desvirada.th0, ida.q.th0);
  const cabeIda = ida.maximo <= alvo; const cabeVolta = volta.maximo <= alvo;
  const ficaVolta = cabeIda && cabeVolta ? variacaoAdimensional(volta.q) < variacaoAdimensional(ida.q) : cabeVolta || (!cabeIda && volta.maximo < ida.maximo);
  return montar(ficaVolta ? { ...volta, q: desvirada } : ida, lido, tolerancia, eixos, original, modo);
}

/* ---------- o resultado ---------- */

/* o maior giro do rumo num pedaço da leitura exata (radiano): com ele a quadratura de 5 pontos erra abaixo de 1e-16 do comprimento do pedaço */
const GIRO_DO_PEDACO = 0.125;
/* Gauss-Legendre de 5 pontos em [0, 1]: [abscissa, peso] */
const GAUSS_5 = (() => {
  const a = Math.sqrt(5 - 2 * Math.sqrt(10 / 7)) / 3; const b = Math.sqrt(5 + 2 * Math.sqrt(10 / 7)) / 3;
  const wa = (322 + 13 * Math.sqrt(70)) / 900; const wb = (322 - 13 * Math.sqrt(70)) / 900;
  return [[-b, wb], [-a, wa], [0, 128 / 225], [a, wa], [b, wb]].map(([x, w]) => [(1 + x) / 2, w / 2]);
})();
/* o cosseno abaixo do qual o rumo conta como perpendicular ao eixo em valorEm */
const PERPENDICULAR = 1e-12;

/** A leitura exata da curva { x0, y0, th0, L, k, fr }: o ponto e o rumo no comprimento de arco s, a amostra a passo de arco e o valor de uma coordenada onde a outra vale
 *  o pedido. O rumo é a integral fechada da curvatura (quadrático em s dentro de cada clotoide). O ponto não tem forma fechada (é a integral de Fresnel): cada clotoide é
 *  cortada em pedaços de giro até GIRO_DO_PEDACO, com o começo de cada pedaço guardado, e o ponto sai do começo do pedaço por Gauss-Legendre de 5 pontos sobre o rumo
 *  exato, sem corda entre amostras; o erro fica na ordem do arredondamento (1e-13 do comprimento), em qualquer escala. */
function leituraExata({ x0, y0, th0, L, k, fr }) {
  const S = [0]; const X = [x0]; const Y = [y0]; const TH = [th0]; const K = []; const DK = [];
  const avancar = (i, t) => {
    let x = X[i]; let y = Y[i];
    for (const [g, w] of GAUSS_5) { const u = g * t; const th = TH[i] + (K[i] + 0.5 * DK[i] * u) * u; x += w * t * Math.cos(th); y += w * t * Math.sin(th); }
    return [x, y];
  };
  for (let j = 0; j < fr.length - 1; j += 1) {
    const s0 = fr[j] * L; const len = (fr[j + 1] - fr[j]) * L; const dk = (k[j + 1] - k[j]) / len;
    const n = Math.max(1, Math.ceil((Math.max(Math.abs(k[j]), Math.abs(k[j + 1])) * len) / GIRO_DO_PEDACO)); const h = len / n;
    for (let t = 0; t < n; t += 1) {
      const i = S.length - 1; K.push(k[j] + ((k[j + 1] - k[j]) * t) / n); DK.push(dk);
      const [x, y] = avancar(i, h);
      S.push(t + 1 === n ? fr[j + 1] * L : s0 + (len * (t + 1)) / n); X.push(x); Y.push(y); TH.push(TH[i] + (K[i] + 0.5 * dk * h) * h);
    }
  }
  const ultimo = S.length - 1; K.push(k[k.length - 1]); DK.push(0);
  /* o pedaço em que o arco s cai, e quanto dele já passou; fora de [0, L] vale a ponta */
  const onde = (s, quem) => {
    if (typeof s !== 'number' || !Number.isFinite(s)) erro(`${quem} espera o comprimento de arco, um número finito de 0 a ${citar(L)}, e veio ${citar(s)}`);
    const alvo = Math.min(L, Math.max(0, s)); let lo = 0; let hi = ultimo;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (S[mid] <= alvo) lo = mid; else hi = mid; }
    return alvo >= S[hi] ? [hi, 0] : [lo, alvo - S[lo]];
  };
  const ponto = (s) => { const [i, t] = onde(s, 'ponto'); return t > 0 ? avancar(i, t) : [X[i], Y[i]]; };
  const rumoEm = (s) => { const [i, t] = onde(s, 'rumoEm'); return TH[i] + (K[i] + 0.5 * DK[i] * t) * t; };
  const amostrar = (passoMm) => {
    if (typeof passoMm !== 'number' || !(passoMm > 0)) erro(`passo espera um número maior que zero (a unidade dos pontos), e veio ${citar(passoMm)}`);
    const n = Math.max(1, Math.round(L / passoMm)); return Array.from({ length: n + 1 }, (_, i) => ponto((i * L) / n));
  };
  /* a curva como função de uma coordenada: ela cresce ou cai sempre quando o cosseno do rumo contra o eixo não troca de sinal nem fica nulo num pedaço inteiro.
   * O rumo de cada pedaço fica entre os das pontas e o do vértice (onde a curvatura passa por zero), e o cosseno, entre os dessas pontas e ±1 nos múltiplos de pi. */
  const funcoes = [null, null];
  const funcaoDe = (eixo) => {
    if (funcoes[eixo]) return funcoes[eixo];
    const fase = eixo === 0 ? 0 : Math.PI / 2; let sentido = 0; let quebra = null;
    for (let i = 0; i < ultimo && !quebra; i += 1) {
      const h = S[i + 1] - S[i]; const angulos = [TH[i] - fase, TH[i + 1] - fase];
      if (DK[i] !== 0) { const t = -K[i] / DK[i]; if (t > 0 && t < h) angulos.push(TH[i] + 0.5 * K[i] * t - fase); }
      const lo = Math.min(...angulos); const hi = Math.max(...angulos); const cossenos = [Math.cos(lo), Math.cos(hi)];
      for (let m = Math.ceil(lo / Math.PI); m * Math.PI <= hi; m += 1) cossenos.push(m % 2 === 0 ? 1 : -1);
      const maior = Math.max(...cossenos); const menor = Math.min(...cossenos);
      const deste = maior > PERPENDICULAR ? 1 : menor < -PERPENDICULAR ? -1 : 0;
      if ((maior > PERPENDICULAR && menor < -PERPENDICULAR) || deste === 0 || (sentido !== 0 && deste !== sentido)) quebra = i; else sentido = deste;
    }
    const A = eixo === 0 ? X : Y; const B = eixo === 0 ? Y : X;
    funcoes[eixo] = { quebra, sobe: sentido > 0, A, B };
    return funcoes[eixo];
  };
  const valorEm = (a, opcoes = {}) => {
    const { eixo = 0, fora = 'recusa' } = opcoes ?? {};
    if (eixo !== 0 && eixo !== 1) erro(`valorEm espera eixo 0 ou 1 (a coordenada da curva plana em que o pedido é dado), e veio ${citar(eixo)}`);
    if (fora !== 'recusa' && fora !== 'ponta') erro(`valorEm espera fora 'recusa' ou 'ponta' (o que fazer com o pedido além das pontas da curva), e veio ${citar(fora)}`);
    if (typeof a !== 'number' || !Number.isFinite(a)) erro(`valorEm espera o valor da coordenada ${eixo}, um número finito, e veio ${citar(a)}`);
    const { quebra, sobe, A, B } = funcaoDe(eixo);
    if (quebra !== null) erro(`valorEm: a coordenada ${eixo} não cresce nem cai sempre ao longo da curva, que por isso não é função dela: entre os arcos ${citar(S[quebra])} e ${citar(S[quebra + 1])} o rumo (de ${citar(TH[quebra])} a ${citar(TH[quebra + 1])} rad) fica perpendicular ao eixo ${eixo} ou o cruza; peça pelo outro eixo ou leia a curva por ponto(s)`);
    const antes = sobe ? a < A[0] : a > A[0]; const depois = sobe ? a > A[ultimo] : a < A[ultimo];
    if ((antes || depois) && fora === 'recusa') erro(`valorEm: a coordenada ${eixo} da curva vai de ${citar(A[0])} a ${citar(A[ultimo])}, e o pedido ${citar(a)} cai fora; passe { fora: 'ponta' } para valer a ponta mais perto`);
    if (antes) return B[0];
    if (depois) return B[ultimo];
    /* o pedaço em que o pedido cai, e a bisseção do arco dentro dele */
    let lo = 0; let hi = ultimo;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if ((A[mid] <= a) === sobe) lo = mid; else hi = mid; }
    if (a === A[lo]) return B[lo];
    if (a === A[hi]) return B[hi];
    let de = 0; let ate = S[hi] - S[lo];
    for (let it = 0; it < 64 && ate > de; it += 1) { const mid = (de + ate) / 2; if (mid <= de || mid >= ate) break; if ((avancar(lo, mid)[eixo] < a) === sobe) de = mid; else ate = mid; }
    return avancar(lo, (de + ate) / 2)[1 - eixo];
  };
  return { ponto, rumoEm, amostrar, valorEm };
}

function montar(ajuste, lido, tolerancia, eixos, original, { esparsos = false, trechoMinimo = null } = {}) {
  const { P, constante, livre, tem3, livres, comprimentoDosPontos } = lido; const { q } = ajuste; const { fr, k, L } = q;
  const joelhos = fr.map((f, i) => ({ s: f * L, k: k[i] }));
  const clotoides = joelhos.slice(1).map((b, i) => ({ de: joelhos[i].s, ate: b.s, k0: joelhos[i].k, k1: b.k, comprimento: b.s - joelhos[i].s }));
  /* a curva a passo fino, e o desvio de todos os pontos nela */
  const passos = passosPorTrecho(fr, L, k, tolerancia, true);
  const c = integrar(q, fr, passos);
  /* a medida final é sobre a curva de `ponto`: os vértices da curva de passo fino passam a ser os exatos, e o desvio de cada ponto, achado no segmento mais perto, é
   * refinado na curva exata (Newton sobre o pé da perpendicular); onde o refino não vale (o ponto além do centro de curvatura, ou um pé pior que o do segmento mais a
   * flecha), fica o desvio ao segmento com a flecha da corda somada, que é o teto do que a corda esconde */
  const exata = leituraExata(q);
  for (let i = 0; i <= c.n; i += 1) { const [x, y] = exata.ponto(c.s[i]); c.x[i] = x; c.y[i] = y; }
  const proj = new Float64Array(P.length); const desvios = desviosDos(P, c, new Array(P.length).fill(-1), proj);
  const flecha = fr.slice(1).reduce((m, f, j) => Math.max(m, (Math.max(Math.abs(k[j]), Math.abs(k[j + 1])) * (((f - fr[j]) * L) / passos[j]) ** 2) / 8), 0);
  for (let i = 0; i < P.length; i += 1) {
    let s = proj[i]; let pe = null;
    for (let it = 0; it < 12; it += 1) {
      const [x, y] = exata.ponto(s); const th = exata.rumoEm(s); const dx = P[i][0] - x; const dy = P[i][1] - y;
      const aoLongo = dx * Math.cos(th) + dy * Math.sin(th); const aoLado = dy * Math.cos(th) - dx * Math.sin(th);
      pe = { s, d: Math.hypot(dx, dy), aoLado };
      const den = 1 - curvaturaEm(s / L, fr, k) * aoLado;
      if (!(den > 0.1)) { pe = null; break; }
      const novo = Math.min(L, Math.max(0, s + aoLongo / den));
      if (Math.abs(novo - s) <= 1e-14 * L) break;
      s = novo;
    }
    const corda = Math.abs(desvios[i]);
    if (pe && pe.d <= corda + flecha) { desvios[i] = pe.aoLado >= 0 ? pe.d : -pe.d; proj[i] = pe.s; } else desvios[i] = desvios[i] >= 0 ? corda + flecha : -(corda + flecha);
  }
  let desvioMaximo = 0; for (const v of desvios) desvioMaximo = Math.max(desvioMaximo, Math.abs(v));
  const desvioDaCurvaMaximo = desvioDaCurva(P, c).maximo;
  if (![q.x0, q.y0, q.th0, L, ...k, ...fr, desvioMaximo, desvioDaCurvaMaximo].every(Number.isFinite) || !(L > 0)) erro(`o ajuste não convergiu a uma curva finita (comprimento ${citar(L)}, desvio ${citar(desvioMaximo)}); a entrada tem ${P.length} pontos e tolerância ${citar(tolerancia)}`);
  /* a ordem: os pontos se projetam ao longo do arco sem voltar mais que o dobro da tolerância, e as pontas caem junto das pontas da curva */
  let motivoDaOrdem = null;
  if (!(proj[0] <= 2 * tolerancia)) motivoDaOrdem = `o primeiro ponto se projeta a ${citar(proj[0])} do começo da curva, além de 2 tolerâncias`;
  else if (!(L - proj[P.length - 1] <= 2 * tolerancia)) motivoDaOrdem = `o último ponto se projeta a ${citar(L - proj[P.length - 1])} do fim da curva, além de 2 tolerâncias (a curva fechada, que volta ao primeiro ponto, se ajusta em dois arcos)`;
  for (let i = 1; i < P.length && !motivoDaOrdem; i += 1) if (proj[i] < proj[i - 1] - 2 * tolerancia) motivoDaOrdem = `o ponto ${i} se projeta ${citar(proj[i - 1] - proj[i])} antes do ponto ${i - 1} ao longo da curva, além de 2 tolerâncias: os pontos não estão em ordem`;
  const motivos = [];
  if (!(desvioMaximo <= tolerancia)) motivos.push(`o desvio de um ponto à curva (${citar(desvioMaximo)}) passa da tolerância ${citar(tolerancia)}; falta clotoide ou a tolerância é pequena`);
  /* com pontos esparsos a poligonal é corda e não curva: o desvio da curva a ela e o comprimento dela não medem nada, e o que se cobra é que a curva não dê volta entre
   * dois pontos seguidos (o giro do rumo entre as projeções deles fica abaixo de pi) */
  if (!esparsos && !(desvioDaCurvaMaximo <= tolerancia)) motivos.push(`o desvio da curva à poligonal dos pontos (${citar(desvioDaCurvaMaximo)}) passa da tolerância ${citar(tolerancia)}`);
  if (motivoDaOrdem) motivos.push(motivoDaOrdem);
  if (!esparsos && !(L <= 1.05 * comprimentoDosPontos + 2 * tolerancia)) motivos.push(`o comprimento da curva (${citar(L)}) passa do da poligonal (${citar(comprimentoDosPontos)}) além de 5% e 2 tolerâncias`);
  /* o trecho mínimo vale também para a curva de uma clotoide só, que com ruído sai mais curta que a poligonal em que ele foi conferido */
  if (trechoMinimo !== null) {
    const curto = Math.min(...fr.slice(1).map((f, j) => (f - fr[j]) * L));
    if (!(curto >= trechoMinimo * (1 - 1e-9))) motivos.push(`a clotoide mais curta tem ${citar(curto)}, abaixo do trecho mínimo ${citar(trechoMinimo)}`);
  }
  if (esparsos && !motivoDaOrdem) {
    for (let i = 1; i < P.length; i += 1) {
      const giro = Math.abs(exata.rumoEm(proj[i]) - exata.rumoEm(proj[i - 1]));
      if (!(giro < Math.PI)) { motivos.push(`a curva gira ${citar(giro)} rad entre os pontos ${i - 1} e ${i}, pi ou mais: dá volta onde os pontos esparsos não pedem`); break; }
    }
  }
  /* as faixas de um sinal só da curvatura, na curva integrada: a sagita da faixa (a maior distância dela à corda) abaixo da tolerância é reta, e não lóbulo */
  const kk = Array.from(c.s, (s) => curvaturaEm(s / L, fr, k));
  const faixas = []; let inicio = 0; let sinal = 0;
  for (let i = 0; i <= c.n; i += 1) {
    const sg = Math.abs(kk[i]) * L < 1e-9 ? 0 : Math.sign(kk[i]);
    if (sg !== 0 && sinal === 0) sinal = sg;
    if (sg !== 0 && sg !== sinal) { faixas.push({ sg: sinal, de: inicio, ate: i }); inicio = i; sinal = sg; }
  }
  faixas.push({ sg: sinal, de: inicio, ate: c.n });
  const sagita = ({ de, ate }) => {
    const ex = c.x[ate] - c.x[de]; const ey = c.y[ate] - c.y[de]; const l = Math.hypot(ex, ey); let m = 0;
    for (let i = de; i <= ate; i += 1) m = Math.max(m, l > 0 ? Math.abs(ex * (c.y[i] - c.y[de]) - ey * (c.x[i] - c.x[de])) / l : Math.hypot(c.x[i] - c.x[de], c.y[i] - c.y[de]));
    return m;
  };
  const fica = faixas.filter((f) => f.sg !== 0 && sagita(f) >= LIMIAR_DO_LOBULO * tolerancia);
  let inflexoes = 0; for (let i = 1; i < fica.length; i += 1) if (fica[i].sg !== fica[i - 1].sg) inflexoes += 1;
  /* as corridas de curvatura monótona */
  const faixaDeReta = (comp) => (4 * tolerancia) / (comp * comp);
  const direcao = (b) => { const dk = b.k1 - b.k0; return Math.abs(dk) <= faixaDeReta(b.comprimento) * 0.1 ? 0 : Math.sign(dk); };
  const trechos = []; let corrida = null;
  for (const b of clotoides) {
    const d = direcao(b);
    if (corrida && (d === 0 || corrida.d === 0 || d === corrida.d)) { corrida.ate = b.ate; corrida.k1 = b.k1; corrida.joelhos += 1; if (corrida.d === 0) corrida.d = d; } else { if (corrida) trechos.push(corrida); corrida = { de: b.de, ate: b.ate, k0: b.k0, k1: b.k1, d, joelhos: 1 }; }
  }
  if (corrida) trechos.push(corrida);
  const trechosFinais = trechos.map(({ d, ...t }) => ({ ...t, sentido: d > 0 ? 'cresce' : d < 0 ? 'cai' : 'constante' }));
  const { ponto, rumoEm, amostrar, valorEm } = exata;
  const para3d = (u, v) => { const r = [0, 0, 0]; r[eixos[0]] = u; r[eixos[1]] = v; r[livre] = constante; return r; };
  /* o desvio 3D: o do plano e o da coordenada livre (a distância dela à constante) em quadratura */
  const d3 = (v, i) => (tem3 ? Math.hypot(v, livres[i] - constante) : v);
  const desvios3 = Array.from(desvios, (v, i) => d3(v, i));
  return {
    cabe: motivos.length === 0, motivo: motivos.length ? motivos.join('; ') : null, tolerancia: original, desvioMaximo: Math.max(...desvios3.map(Math.abs)),
    desvioDaCurva: tem3 ? Math.hypot(desvioDaCurvaMaximo, Math.max(...livres.map((z) => Math.abs(z - constante)))) : desvioDaCurvaMaximo, desvios: desvios3, comprimento: L,
    joelhos, clotoides, trechos: trechosFinais, inflexoes, variacaoDaCurvatura: variacaoAdimensional(q) / L, inicio: [q.x0, q.y0], rumo: q.th0, ponto, rumoEm, amostrar, valorEm,
    guardado: { inicio: [q.x0, q.y0], rumo: q.th0, comprimento: L, joelhos: fr.map((f, i) => ({ f, k: k[i] })), tolerancia },
    pontosDaRede: (passo, { nome = 'curva', completar = tem3 ? para3d : (u, v) => [u, v, constante] } = {}) => ({ nome, pontos: amostrar(passo).map(([u, v]) => completar(u, v)) }),
  };
}

/* ---------- o ajuste guardado ---------- */

/** A versão do ajuste, que entra na impressão. REGRA: quem muda o que `ajustarCurvaLisa` devolve para a mesma entrada (o ajuste, a escolha entre os ajustes, a integração
 * ou o passo dela, o formato de `guardado`) soma 1 aqui. O dado guardado com a versão antiga deixa de conferir, o ajuste é refeito na hora por quem o usa, e o teste do
 * comando que regrava (`tools/modelar/regravar-ajustes-de-curva.test.mjs`) reprova até o dado de cada receita ser regravado e a malha, conferida.
 * Versão 2 (2026-11-18): `ponto(s)` passou da corda entre as amostras da curva integrada ao ponto exato, e `amostrar` e `pontosDaRede` leem dele; o ajuste escolhido e o
 * `guardado` são os mesmos da versão 1, e o ponto anda uma fração de centésimo da tolerância (a flecha da corda que havia).
 * Versão 3 (2026-11-18): o desvio, `cabe` e as inflexões passam a ser medidos sobre a curva de `ponto` (vértices exatos e o pé de cada ponto refinado nela), e não
 * sobre a integrada de ponto médio; o ajuste escolhido e o `guardado` são os mesmos, e o desvio devolvido anda até a flecha da corda (1/200 da tolerância). */
export const VERSAO_DO_AJUSTE = 3;

const MILIONESIMO = 1e6;
/* as opções da forma entram na impressão só fora do padrão, para o dado guardado antes delas continuar a conferir */
const PADROES_DA_FORMA = Object.freeze({ objetivo: 'menosClotoides', esparsos: false, trechoMinimo: null, rumoInicio: null, rumoFim: null });
const opcoesDoAjuste = ({ tolerancia = 1, maximoDeClotoides = 8, duros = [], eixos = [0, 1], ...resto } = {}) => {
  const forma = Object.fromEntries(Object.entries(PADROES_DA_FORMA).filter(([nome, padrao]) => resto[nome] !== undefined && resto[nome] !== padrao).map(([nome]) => [nome, resto[nome]]));
  return { tolerancia, maximoDeClotoides, duros, eixos, ...forma };
};

/** A impressão da entrada de um ajuste: a versão do ajuste, a contagem dos pontos, a soma deles (cada coordenada em milionésimo da unidade, para o último bit de uma conta
 * não trocar a impressão entre duas máquinas) e as opções com os padrões escritos. A impressão junta as entradas que diferem abaixo do milionésimo: o ajuste guardado vale
 * para todas elas, e por isso quem o usa mede a curva guardada contra os pontos de agora (`curvaLisaDoGuardado`). */
export function impressaoDoAjuste(pontos, opcoes = {}, versao = VERSAO_DO_AJUSTE) {
  if (!Array.isArray(pontos) || !pontos.every((p) => Array.isArray(p) && p.every((c) => Number.isFinite(c)))) erro(`a impressão espera a lista de pontos do ajuste, de números finitos, e veio ${citar(pontos)?.slice(0, 80)}`);
  /* duas somas FNV-1a de 32 bits, uma do texto e outra do texto ao contrário de semente trocada: 64 bits em hexadecimal */
  const texto = pontos.map((p) => p.map((c) => Math.round(c * MILIONESIMO) + 0).join(',')).join(';');
  let a = 0x811c9dc5; let b = 0x01000193;
  for (let i = 0; i < texto.length; i += 1) { a = Math.imul(a ^ texto.charCodeAt(i), 0x01000193); b = Math.imul(b ^ texto.charCodeAt(texto.length - 1 - i), 0x85ebca6b); }
  const hex = (v) => (v >>> 0).toString(16).padStart(8, '0');
  return { versao, pontos: pontos.length, soma: hex(a) + hex(b), opcoes: opcoesDoAjuste(opcoes) };
}

/** lê o dado guardado e devolve os parâmetros da curva, { q: { x0, y0, th0, L, k, fr }, tolerancia }; o dado malformado recusa */
function lerGuardado(guardado) {
  const g = guardado; const finito = (v) => typeof v === 'number' && Number.isFinite(v);
  const J = g?.joelhos;
  if (!g || !Array.isArray(g.inicio) || g.inicio.length !== 2 || !g.inicio.every(finito) || !finito(g.rumo) || !finito(g.comprimento) || !(g.comprimento > 0) || !finito(g.tolerancia) || !(g.tolerancia > 0)
    || !Array.isArray(J) || J.length < 2 || !J.every((j) => j && finito(j.f) && finito(j.k)) || J[0].f !== 0 || J[J.length - 1].f !== 1 || J.some((j, i) => i > 0 && !(j.f > J[i - 1].f))) {
    erro(`o ajuste guardado espera { inicio: [u, v], rumo, comprimento, joelhos: [{ f, k }, ...] de f 0 a 1 em ordem, tolerancia }, e veio ${citar(g)?.slice(0, 200)}`);
  }
  for (let j = 1; j < J.length; j += 1) {
    const comprimento = (J[j].f - J[j - 1].f) * g.comprimento; const dk = (J[j].k - J[j - 1].k) / comprimento;
    if (!(comprimento > 0) || !finito(dk)) erro(`o ajuste guardado tem o trecho ${j - 1} (do joelho de f ${citar(J[j - 1].f)} ao de f ${citar(J[j].f)}) com comprimento ${citar(comprimento)} e variação de curvatura por comprimento ${citar(dk)}: o trecho precisa de comprimento maior que zero e variação finita`);
  }
  return { q: { x0: g.inicio[0], y0: g.inicio[1], th0: g.rumo, L: g.comprimento, k: J.map((j) => j.k), fr: J.map((j) => j.f) }, tolerancia: g.tolerancia };
}

/** A curva de um ajuste guardado (`guardado` do resultado de `ajustarCurvaLisa`, como veio ou depois de passar por JSON), refeita sem ajustar: a mesma leitura
 * exata, com os mesmos números. Devolve { inicio, rumo, comprimento, joelhos, clotoides, ponto(s), rumoEm(s), valorEm(a, opcoes), amostrar(passo) }. Não mede nada contra pontos: quem tem os pontos usa
 * `curvaLisaDoGuardado`, que mede. A tolerância guardada não entra na leitura exata; ela escolhe o passo da curva integrada em que `curvaLisaDoGuardado` mede. */
export function curvaLisaGuardada(guardado) {
  const { q } = lerGuardado(guardado); const { L, fr, k } = q;
  const joelhos = fr.map((f, i) => ({ s: f * L, k: k[i] }));
  const clotoides = joelhos.slice(1).map((b, i) => ({ de: joelhos[i].s, ate: b.s, k0: joelhos[i].k, k1: b.k, comprimento: b.s - joelhos[i].s }));
  return { inicio: [q.x0, q.y0], rumo: q.th0, comprimento: L, joelhos, clotoides, ...leituraExata(q) };
}

/** A curva do ajuste de nome `nome`: a guardada em `guardados` ({ [nome]: { impressao, curva } }), refeita sem ajustar, quando a impressão guardada confere com a da entrada
 * de agora (`pontos`, `opcoes`); quando não confere, ou o nome não está guardado, o ajuste é feito na hora (`ajustarCurvaLisa`, que leva segundos), como para a variante da
 * tabela que o dado guardado não cobre. Nos dois casos o resultado é o de `ajustarCurvaLisa`, com as mesmas chaves: a curva guardada é medida contra os pontos de agora
 * como o ajuste mede a dele (o desvio de cada ponto à curva, o da curva à poligonal dos pontos, a ordem das projeções e o comprimento), e `cabe`, `motivo`, `desvioMaximo`,
 * `desvios`, `trechos` e `inflexoes` saem dessa medida, de modo que o dado guardado que não é a curva destes pontos sai com `cabe: false`. O resultado leva também
 * `doGuardado` (true ou false) e, feito na hora, `mudou`: a lista do que difere do guardado, para quem chama avisar com o comando que regrava. O dado guardado malformado
 * recusa, e também o de tolerância de integração diferente da que a entrada de agora dá. */
export function curvaLisaDoGuardado({ nome, pontos, opcoes = {}, guardados }) {
  const agora = impressaoDoAjuste(pontos, opcoes);
  const dado = guardados?.[nome]; const antes = dado?.impressao;
  const mudou = [];
  if (!dado || !antes) mudou.push('não há ajuste guardado com este nome');
  else {
    if (antes.versao !== agora.versao) mudou.push(`a versão do ajuste era ${citar(antes.versao)} e agora é ${agora.versao}`);
    if (antes.pontos !== agora.pontos) mudou.push(`os pontos eram ${citar(antes.pontos)} e agora são ${agora.pontos}`);
    else if (antes.soma !== agora.soma) mudou.push(`os ${agora.pontos} pontos mudaram de valor (a soma era ${citar(antes.soma)} e agora é ${agora.soma})`);
    for (const campo of new Set([...Object.keys(agora.opcoes), ...Object.keys(antes.opcoes ?? {})])) if (citar(antes.opcoes?.[campo]) !== citar(agora.opcoes[campo])) mudou.push(`a opção ${campo} era ${citar(antes.opcoes?.[campo])} e agora é ${citar(agora.opcoes[campo])}`);
  }
  if (mudou.length) return { ...ajustarCurvaLisa(pontos, opcoes), doGuardado: false, mudou };
  const { tolerancia, maximoDeClotoides, duros, eixos, esparsos = false } = agora.opcoes;
  const lido = lerEntrada(pontos, { tolerancia, maximoDeClotoides, duros, eixos });
  const { q, tolerancia: guardada } = lerGuardado(dado.curva);
  /* a tolerância do plano escolhe o passo da integração: a guardada e a da entrada de agora só diferem no último bit (pontos de 3 componentes que diferem abaixo do milionésimo) */
  if (!(Math.abs(guardada - lido.tolEfetiva) <= 1e-9 * lido.tolEfetiva)) erro(`o ajuste guardado de ${nome} traz a tolerância de integração ${citar(guardada)}, e a entrada de agora dá ${citar(lido.tolEfetiva)}: o dado guardado não é o deste ajuste`);
  return { ...montar({ q }, lido, guardada, eixos, tolerancia, { esparsos }), doGuardado: true };
}
