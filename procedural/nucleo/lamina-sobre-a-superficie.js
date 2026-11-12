/* lamina-sobre-a-superficie.js — a lâmina de vão varrida sobre a superfície de uma chapa, com a seção perpendicular a ela
 *
 * Função pura, sem domínio. A linha de vão é desenhada numa vista ortogonal; aqui cada ponto dela é projetado na chapa pelo raio da vista
 * (a primeira camada tocada, dentro do alcance), e a lâmina é o sólido varrido ao longo dessa curva 3D: a seção é um retângulo de largura
 * `largura` medida no plano tangente e perpendicular à curva, com as paredes na direção da normal da chapa, de modo que o vão da pele e a
 * folga entre as paredes são a mesma medida, qualquer que seja a inclinação da chapa em relação à vista. O sólido sai como um passo
 * `subdivisao` de `niveis: 0` (vértices e triângulos), que o `subtrair` do núcleo aceita como qualquer sólido fechado.
 *
 * AS ESTAÇÕES. A linha é amostrada a cada `amostragem` mm; entre duas estações cuja normal gira mais de 8 graus o trecho é bipartido até a
 * normal girar menos que isso (3 graus: a corda entre duas estações fica a menos de 0,3 mm da chapa em 40 mm) (ou o trecho medir menos que um décimo da largura), e a dobra viva que sobra (giro maior que 8 graus entre duas
 * estações coladas) parte a lâmina em duas, uma varrida sobre cada face, que se encontram na quina e cobrem juntas a espessura sob ela. Os cantos da
 * linha são em esquadria, pelo vetor lateral de cada trecho. Onde o raio não toca a chapa (a linha sai pela borda, ou passa por uma
 * abertura) a estação usa o plano da estação válida mais próxima, tocado pelo mesmo raio da vista: a lâmina segue a chapa além da borda,
 * sem alargar. O raio rasante (a normal a mais de 80 graus do eixo da vista) é recusado.
 *
 * A PROFUNDIDADE. Acima da pele, um quarto do vão; abaixo, a espessura lida (o próximo toque do raio ao longo da normal, no máximo cinco vezes
 * o vão) mais meio vão, ou `profundidade` (mm abaixo da pele) quando dada, ou dois vãos quando não há espessura para ler. A lâmina corta só a camada
 * lida, e não as outras do raio. */

const GRAUS = 180 / Math.PI;
const GIRO_LISO = 8;
/* na curva 3D as estações já são adensadas até a normal girar menos que GIRO_LISO (ou o passo chegar a um décimo da largura); só a dobra mais viva que isto, entre duas estações coladas, vira uma estação só */
const GIRO_DA_CURVA = 25;
const RASANTE = 0.17;

const erro = (texto) => { throw new Error(`paineisPorVaos: ${texto}`); };
const br = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const L = norma(a); return L > 0 ? mul(a, 1 / L) : null; };
const giro = (n1, n2) => Math.acos(Math.max(-1, Math.min(1, dot(n1, n2)))) * GRAUS;

/**
 * A dobra viva que sobrou entre duas estações coladas (giro maior que 8 graus) vira UMA estação: o ponto médio, de normal a bissetriz; o encontro dos planos de
 * parede dos dois trechos dá a direção e a profundidade da seção nela, de modo que a lâmina atravessa a quina côncava ou convexa numa varredura só. A espessura lida
 * junto da quina corre ao longo da outra face: vale no máximo 1,2 vez a mediana lida na linha. Serve às duas entradas, a linha da vista e a curva 3D.
 */
function fundirQuinas(todas, fechada, nome, limite = GIRO_LISO) {
  let quinas = 0;
  const lista = [];
  for (let i = 0; i < todas.length; i += 1) {
    const s = todas[i];
    const j = (i + 1) % todas.length;
    const prox = todas[j];
    const tem = (fechada || j !== 0) && s.real && prox.real;
    const g = tem ? giro(s.n, prox.n) : 0;
    if (g > limite) {
      if (g > 150) erro(`a chapa dobra ${br(g)} graus sobre a linha '${nome}': a dobra é mais fechada que a largura da lâmina e a lâmina não a atravessa; divida a linha dos dois lados da dobra`);
      quinas += 1;
      lista.push({ c: mul(soma(s.c, prox.c), 0.5), n: unit(soma(s.n, prox.n)), esp: Math.max(s.esp ?? 0, prox.esp ?? 0) || null, mIn: s.mOut, mOut: s.mOut });
      i += 1;
    } else lista.push({ c: s.c, n: s.n, esp: s.esp, mIn: s.mIn, mOut: s.mOut });
  }
  /* a espessura lida junto da quina corre ao longo da outra face: vale no máximo 1,2 vez a mediana lida na linha */
  const lidas = lista.map((s) => s.esp).filter((x) => x != null).sort((x, y) => x - y);
  if (lidas.length) { const teto = 1.2 * lidas[Math.floor(lidas.length / 2)]; for (const s of lista) s.esp = s.esp == null ? null : Math.min(s.esp, teto); }
  return { lista, quinas };
}

/**
 * Projeta a polilinha 2D da vista na chapa.
 * @param {{ ler: (a: number, b: number) => ({ c: number[], n: number[], esp: number | null } | null), plano: (a: number, b: number, v: any) => number[] | null,
 *   pontos: number[][], fechada: boolean, amostragem: number, largura: number, eixoIdx: number, indices: number[], nome: string }} o
 * @returns {{ segmentos: { c: number[], n: number[], esp: number | null }[][], fechadaInteira: boolean, quinas: number, inclinacaoMaxima: number, semChapa: number }}
 */
export function projetarLinha(o) {
  const { ler, plano, pontos, fechada, amostragem, largura, eixoIdx, nome } = o;
  const [ia, ib] = o.indices;
  const perp3 = (u, v) => { const r = [0, 0, 0]; r[ia] = u; r[ib] = v; return r; };
  const n = pontos.length;
  const nSeg = fechada ? n : n - 1;
  /* a lista densa de pontos 2D, com a marca dos que são vértices da linha */
  const densos = [];
  /* o perpendicular da linha no plano da vista, de cada trecho, como vetor 3D: a direção lateral da lâmina, antes de ir ao plano tangente */
  const perpendicular = (A, B) => {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (!(L > 0)) erro(`a linha '${nome}' tem dois pontos iguais em [${br(A[0])}, ${br(A[1])}]`);
    return perp3(-(B[1] - A[1]) / L, (B[0] - A[0]) / L);
  };
  for (let k = 0; k < nSeg; k += 1) {
    const A = pontos[k]; const B = pontos[(k + 1) % n];
    const m = perpendicular(A, B);
    const M = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / amostragem));
    for (let j = 0; j < M; j += 1) densos.push({ q: [A[0] + (B[0] - A[0]) * (j / M), A[1] + (B[1] - A[1]) * (j / M)], mOut: m, mIn: j === 0 ? null : m });
  }
  if (!fechada) densos.push({ q: [...pontos[n - 1]], mOut: densos[densos.length - 1].mOut, mIn: densos[densos.length - 1].mOut });
  /* a marca de entrada do vértice da linha é a saída do trecho anterior */
  densos.forEach((d, i) => { if (!d.mIn) d.mIn = (densos[(i + densos.length - 1) % densos.length]).mOut; });
  const lidos = densos.map((d) => ({ q: d.q, mIn: d.mIn, mOut: d.mOut, v: ler(d.q[0], d.q[1]) }));
  if (lidos.every((s) => !s.v)) return { segmentos: [], fechadaInteira: false, quinas: 0, inclinacaoMaxima: 0, semChapa: lidos.length };
  let semChapa = 0;
  /* a estação sem chapa herda o plano da válida mais próxima, no mesmo raio da vista */
  const proximaValida = (i) => {
    for (let d = 1; d < lidos.length; d += 1) {
      for (const j of [i - d, i + d]) {
        const jj = fechada ? ((j % lidos.length) + lidos.length) % lidos.length : j;
        if (jj >= 0 && jj < lidos.length && lidos[jj].v) return lidos[jj].v;
      }
    }
    return null;
  };
  const cheias = lidos.map((s, i) => {
    if (s.v) return { q: s.q, ...s.v, real: true, mIn: s.mIn, mOut: s.mOut };
    semChapa += 1;
    const v = proximaValida(i);
    const c = plano(s.q[0], s.q[1], v);
    if (!c) erro(`a linha '${nome}' sai da chapa num ponto em que a chapa mais próxima é rasante à vista (raio rasante): desenhe essa linha na vista em que a chapa aparece de frente`);
    return { q: s.q, c, n: v.n, esp: v.esp, real: false, mIn: s.mIn, mOut: s.mOut };
  });
  /* a bipartição entre duas estações reais de normal muito diferente */
  const refinar = (A, B, prof) => {
    if (!A.real || !B.real || giro(A.n, B.n) <= GIRO_LISO || prof >= 10) return [];
    if (Math.hypot(A.q[0] - B.q[0], A.q[1] - B.q[1]) <= 0.1 * largura) return [];
    const q = [(A.q[0] + B.q[0]) / 2, (A.q[1] + B.q[1]) / 2];
    const v = ler(q[0], q[1]);
    if (!v) return [];
    const M = { q, ...v, real: true, mIn: A.mOut, mOut: A.mOut };
    return [...refinar(A, M, prof + 1), M, ...refinar(M, B, prof + 1)];
  };
  const todas = [];
  for (let i = 0; i < cheias.length; i += 1) {
    todas.push(cheias[i]);
    const prox = fechada ? cheias[(i + 1) % cheias.length] : cheias[i + 1];
    if (prox) todas.push(...refinar(cheias[i], prox, 0));
  }
  /* a dobra viva que sobrou entre duas estações coladas ganha uma seção do meio: o ponto médio, de normal a bissetriz e profundidade alongada por 1 / cos do meio giro.
     É uma lâmina só, sem duas varreduras que dividam parede: a seção do meio cobre sob a quina a espessura das duas faces, côncava ou convexa */
  let inclinacaoMaxima = 0;
  todas.forEach((s) => {
    const cos = Math.abs(dot(s.n, [0, 1, 2].map((e) => (e === eixoIdx ? 1 : 0))));
    if (cos < RASANTE) {
      erro(`a chapa fica a ${br(Math.acos(Math.min(1, cos)) * GRAUS)} graus da vista no ponto [${br(s.q[0])}, ${br(s.q[1])}] da linha '${nome}' (raio rasante): desenhe essa linha na vista em que a chapa aparece de frente`);
    }
    inclinacaoMaxima = Math.max(inclinacaoMaxima, Math.acos(Math.min(1, cos)) * GRAUS);
  });
  const { lista, quinas } = fundirQuinas(todas, fechada, nome);
  const segmentos = [lista];
  return { segmentos, fechadaInteira: fechada, quinas, inclinacaoMaxima, semChapa };
}

/** O vetor lateral de cada estação: o perpendicular da linha no plano da vista, levado ao plano tangente da chapa, com a esquadria nos cantos. */
function lateraisDe(est) {
  const lado = (m, n) => unit(sub(m, mul(n, dot(m, n))));
  return est.map((s) => {
    const sIn = lado(s.mIn, s.n); const sOut = lado(s.mOut, s.n);
    if (!sIn || !sOut) return null;
    const sm = unit(soma(sIn, sOut));
    if (!sm) return null;
    const k = 1 / Math.max(Math.min(dot(sm, sIn), dot(sm, sOut)), 0.25);
    return { sm, k };
  });
}

/** Alonga a ponta de uma linha aberta de `ext` mm na direção do último trecho, no plano tangente. */
export function alongar(estacoes, fim, ext) {
  const N = estacoes.length;
  const a = fim ? estacoes[N - 1] : estacoes[0];
  const b = fim ? estacoes[N - 2] : estacoes[1];
  let e = unit(sub(a.c, b.c));
  if (!e) return;
  e = unit(sub(e, mul(a.n, dot(e, a.n)))) ?? e;
  const nova = { c: soma(a.c, mul(e, ext)), n: a.n, esp: a.esp, mIn: fim ? a.mOut : a.mIn, mOut: fim ? a.mOut : a.mIn, cima: a.cima, alongada: true };
  if (fim) estacoes.push(nova); else estacoes.unshift(nova);
}

const R3 = (v) => Math.round(v * 1e6) / 1e6;

/** Os laterais de cada estação de uma curva 3D: o perpendicular da curva no plano tangente da chapa, antes e depois da estação. */
function lateraisDaCurva(lista, fechada) {
  const N = lista.length;
  const tang = (a, b) => unit(sub(b.c, a.c));
  lista.forEach((s, i) => {
    const ant = fechada ? lista[(i + N - 1) % N] : lista[i - 1];
    const dep = fechada ? lista[(i + 1) % N] : lista[i + 1];
    const tIn = ant ? tang(ant, s) : tang(s, dep);
    const tOut = dep ? tang(s, dep) : tIn;
    if (!tIn || !tOut) erro('a curva tem dois pontos iguais sobre a chapa');
    s.mIn = cruz(s.n, tIn); s.mOut = cruz(s.n, tOut); s.cima = s.n;
  });
}

/**
 * Leva a curva 3D à chapa: cada ponto vai à pele pelo ponto mais próximo (`projetar`), a curva é reamostrada a cada `amostragem` mm (cada ponto novo também vai à pele),
 * o trecho entre duas estações cuja normal gira mais de 8 graus é bipartido até a normal girar menos (ou o passo chegar a um décimo da largura), e a dobra viva que sobra vira uma
 * estação só, como na linha da vista. Não há eixo de vista: a seção da lâmina olha, em cada estação, para a normal da chapa.
 * @param {{ projetar: (q: number[], limite: number) => ({ c: number[], n: number[], esp: number | null, d: number } | null), pontos: number[][], fechada: boolean,
 *   amostragem: number, largura: number, nome: string, alem?: [number, number], tolerancia: number }} o
 * @returns {{ segmentos: any[][], fechadaInteira: boolean, quinas: number, inclinacaoMaxima: number, semChapa: number, desvioMaximo: number, podadas: number }}
 */
export function projetarCurva(o) {
  const { projetar, pontos, fechada, amostragem, largura, nome, tolerancia } = o;
  const alem = o.alem ?? [0, 0];
  const pt = (q) => `[${q.map((x) => br(x)).join(', ')}]`;
  const lidos = pontos.map((q) => ({ q, v: projetar(q, tolerancia) }));
  if (lidos.every((x) => !x.v)) erro(`a curva '${nome}' não corta a chapa: nenhum dos ${pontos.length} pontos dela fica a menos de ${br(tolerancia)} mm da pele da chapa; confira a unidade (mm) e se a curva é desta chapa (a opção distanciaDaCurva muda a tolerância)`);
  let ini = 0; let fim = lidos.length - 1;
  if (!fechada) { while (!lidos[ini].v) ini += 1; while (!lidos[fim].v) fim -= 1; }
  const podadas = ini + (lidos.length - 1 - fim);
  for (const [k, cortadas, dada] of [[0, ini, alem[0]], [lidos.length - 1, lidos.length - 1 - fim, alem[1]]]) {
    if (cortadas && !(dada > 0)) {
      erro(`a curva '${nome}' sai da chapa pela ponta ${k === 0 ? 'inicial' : 'final'}: o ponto ${k} ${pt(lidos[k].q)} fica a mais de ${br(tolerancia)} mm da pele, e ${cortadas === 1 ? 'a ponta além dele' : `as ${cortadas} pontas além dele`} não tem chapa; termine a curva na borda e dê \`alem\` (mm) para a ponta passar dela, ou traga o ponto para a chapa`);
    }
  }
  const uteis = lidos.slice(ini, fim + 1);
  uteis.forEach((x, k) => { if (!x.v) erro(`a curva '${nome}' tem o ponto ${ini + k} ${pt(x.q)} a mais de ${br(tolerancia)} mm da pele, no meio da curva: ela sai da chapa e volta (uma abertura, ou a curva fora do lugar); leve o ponto à chapa ou parta a curva`); });
  let desvioMaximo = 0;
  const base = [];
  const minimo = 0.2 * largura;
  const dist = (a, b) => norma(sub(a.c, b.c));
  uteis.forEach((x, k) => {
    desvioMaximo = Math.max(desvioMaximo, x.v.d);
    const s = { c: x.v.c, n: x.v.n, esp: x.v.esp, real: true };
    const ult = base[base.length - 1];
    if (ult && dist(ult, s) < minimo) { if (k === uteis.length - 1 && base.length > 1) base[base.length - 1] = s; return; }
    base.push(s);
  });
  if (fechada && base.length > 1 && dist(base[0], base[base.length - 1]) < minimo) base.pop();
  if (base.length < 2) erro(`a curva '${nome}' ficou com menos de dois pontos distintos sobre a chapa`);
  /* os trechos longos ganham pontos, cada um levado à pele */
  const densa = [];
  const N = base.length;
  for (let i = 0; i < N; i += 1) {
    const a = base[i]; const b = base[(i + 1) % N];
    densa.push(a);
    if (!fechada && i === N - 1) break;
    const M = Math.ceil(dist(a, b) / amostragem);
    for (let m = 1; m < M; m += 1) {
      const q = soma(mul(a.c, 1 - m / M), mul(b.c, m / M));
      const v = projetar(q, tolerancia);
      if (!v) erro(`a curva '${nome}' passa a mais de ${br(tolerancia)} mm da pele entre dois pontos dela, perto de ${pt(q)}: a corda sai da chapa; ponha mais pontos`);
      desvioMaximo = Math.max(desvioMaximo, v.d);
      densa.push({ c: v.c, n: v.n, esp: v.esp, real: true });
    }
  }
  /* a bipartição entre duas estações de normal muito diferente */
  const refinar = (A, B, prof) => {
    if (giro(A.n, B.n) <= GIRO_LISO || prof >= 10 || dist(A, B) <= 0.1 * largura) return [];
    const v = projetar(mul(soma(A.c, B.c), 0.5), tolerancia);
    if (!v) return [];
    const M = { c: v.c, n: v.n, esp: v.esp, real: true };
    return [...refinar(A, M, prof + 1), M, ...refinar(M, B, prof + 1)];
  };
  const todas = [];
  for (let i = 0; i < densa.length; i += 1) {
    todas.push(densa[i]);
    const prox = fechada ? densa[(i + 1) % densa.length] : densa[i + 1];
    if (prox) todas.push(...refinar(densa[i], prox, 0));
  }
  const { lista, quinas } = fundirQuinas(todas, fechada, nome, GIRO_DA_CURVA);
  lateraisDaCurva(lista, fechada);
  return { segmentos: [lista], fechadaInteira: fechada, quinas, inclinacaoMaxima: 0, semChapa: 0, desvioMaximo: Math.round(desvioMaximo * 1e6) / 1e6, podadas };
}

/**
 * As bordas da lâmina de uma curva 3D se cruzam? Sem eixo de vista não há projeção que dê o polígono; uma borda se cruza quando algum trecho dela corre contra a curva
 * (o canto mais fechado que meia largura, ou a volta menor que o vão). Devolve 'aberta', 'volta' ou null.
 */
export function bordasSeCruzamNaCurva(estacoes, fechada, largura) {
  const lat = lateraisDe(estacoes);
  if (lat.some((l) => !l)) return fechada ? 'volta' : 'aberta';
  const N = estacoes.length;
  const h = largura / 2;
  const lado = (sinal) => estacoes.map((s, i) => soma(s.c, mul(lat[i].sm, sinal * h * lat[i].k)));
  const nSeg = fechada ? N : N - 1;
  for (const sinal of [1, -1]) {
    const B = lado(sinal);
    for (let i = 0; i < nSeg; i += 1) {
      const j = (i + 1) % N;
      if (dot(sub(estacoes[j].c, estacoes[i].c), sub(B[j], B[i])) < 0) return fechada ? 'volta' : 'aberta';
    }
  }
  return null;
}

/** Folga entre a parede do corte e a perna da aba, em fração do vão: a perna nunca fica rente à parede (a face coplanar da união é a lasca que a booleana deixa). */
const RECUO_DA_ABA = 0.01;
const SEGMENTOS_DO_FILETE = 4;

/**
 * O perfil da perna da aba, em (u, w): u para dentro do painel a partir da parede do corte, w para cima a partir da pele de fora (a chapa ocupa w de -espessura a 0).
 * A perna é um retângulo de `largura` (comprimento) e `espessura`, que sai da quina de baixo da parede (u = recuo, w = -espessura) na direção do giro de `angulo` graus
 * da chapa (90: reto para baixo; menos: inclinada para debaixo do próprio painel), com o começo embutido na chapa para a união pegar; `raio` enche o canto de dentro da dobra
 * (a pele de baixo do painel com a face de dentro da perna) com um filete. Devolve o polígono, de u não menor que o recuo, que a varredura leva ao longo da linha.
 */
export function perfilDaAba({ espessura: t, largura: L, angulo, raio = 0, recuo }) {
  const th = (angulo * Math.PI) / 180;
  const d = [Math.cos(th), -Math.sin(th)];
  const p = [Math.sin(th), Math.cos(th)];
  /* o embutimento: meia espessura, e menos quando a perna inclinada sairia acima da pele (a ponta de cima fica a um quarto da espessura abaixo dela, no mais) */
  const embute = Math.max(0, Math.min(0.5 * t, (0.75 * t - t * Math.cos(th)) / Math.sin(th)));
  const Q0 = [recuo + embute * -d[0], -t + embute * -d[1]];
  const Q1 = [Q0[0] + t * p[0], Q0[1] + t * p[1]];
  const Q2 = [Q1[0] + L * d[0], Q1[1] + L * d[1]];
  const Q3 = [Q0[0] + L * d[0], Q0[1] + L * d[1]];
  let poligono = [Q0, Q1, Q2, Q3];
  if (raio > 0) {
    /* o canto de dentro: a face de fora da perna (a reta de Q1 a Q2) cruza a pele de baixo do painel (w = -t) em C, e o filete de raio `raio` fica entre as duas semirretas que
       saem de C, uma para +u (a pele de baixo) e outra para baixo pela perna, com `angulo` entre elas; o contorno sobe depois por dentro da chapa até a ponta mais alta do retângulo */
    const C = (() => { const s = (Q1[1] + t) / Math.sin(th); return [Q1[0] + s * d[0], Q1[1] + s * d[1]]; })();
    const metade = th / 2;
    const dist = raio / Math.tan(metade);
    const T1 = [C[0] + dist, C[1]];
    const Tf = [C[0] + dist * d[0], C[1] + dist * d[1]];
    const bis = [1 + d[0], d[1]]; const nb = Math.hypot(bis[0], bis[1]);
    const centro = [C[0] + (bis[0] / nb) * (raio / Math.sin(metade)), C[1] + (bis[1] / nb) * (raio / Math.sin(metade))];
    const a0 = Math.atan2(Tf[1] - centro[1], Tf[0] - centro[0]);
    let varre = Math.atan2(T1[1] - centro[1], T1[0] - centro[0]) - a0;
    while (varre > Math.PI) varre -= 2 * Math.PI;
    while (varre <= -Math.PI) varre += 2 * Math.PI;
    const arco = Array.from({ length: SEGMENTOS_DO_FILETE + 1 }, (_, k) => { const a = a0 + (varre * k) / SEGMENTOS_DO_FILETE; return [centro[0] + raio * Math.cos(a), centro[1] + raio * Math.sin(a)]; });
    const wTopo = Math.max(Q0[1], Q1[1]);
    const sTopo = (Q0[1] - wTopo) / Math.sin(th);
    poligono = [[Q0[0] + sTopo * d[0], Q0[1] + sTopo * d[1]], Q3, Q2, ...arco, [T1[0], wTopo]];
  }
  const menor = Math.min(...poligono.map((q) => q[0]));
  const deslocamento = menor < recuo ? recuo - menor : 0;
  return poligono.map(([u, w]) => [u + deslocamento, w]);
}

/**
 * O sólido da lâmina: vértices e triângulos de um passo `subdivisao` de niveis 0.
 * @returns {{ vertices: number[][], faces: number[][], pontosDeDentro: number[][] | null }}
 */
export function varrer({ estacoes, fechada, largura, profundidade, descarta, nome, cima, areaPorNorma = false, alemDaPele = null, aba = null }) {
  const est = estacoes.filter((s, i) => i === 0 || norma(sub(s.c, estacoes[i - 1].c)) > 1e-6);
  if (fechada && est.length > 1 && norma(sub(est[0].c, est[est.length - 1].c)) <= 1e-6) est.pop();
  if (est.length < 2) erro(`a linha '${nome}' ficou com menos de duas estações sobre a chapa`);
  const N = est.length;
  const nSeg = fechada ? N : N - 1;
  const h = largura / 2;
  const topo = 0.5 * largura;
  /* cada trecho tem o seu plano de parede, que contém o trecho e a normal da chapa: o lateral é normal aos dois, e a parede de cada lado é um plano só */
  const seg = [];
  for (let k = 0; k < nSeg; k += 1) {
    const a = est[k]; const b = est[(k + 1) % N];
    const e = sub(b.c, a.c);
    const nk = unit(soma(a.n, b.n)) ?? a.n;
    let sk = unit(cruz(nk, e));
    if (!sk) erro(`a linha '${nome}' volta sobre si mesma sobre a chapa (um trecho some contra o vizinho); afaste os pontos`);
    if (dot(sk, a.mOut) < 0) sk = mul(sk, -1);
    seg.push({ n: nk, s: sk });
  }
  /* a altura acima da pele e a profundidade abaixo dela de cada estação. Na curva 3D, numa quina arredondada de raio R, a seção funda demais passa do centro do filete e as seções
     vizinhas se cruzam embaixo (a alta demais, no filete côncavo, em cima): onde o ponto de baixo (ou o de cima) de duas estações vizinhas anda menos que 30% do que a curva anda, as
     duas ficam 20% menos fundas (ou altas), até o ponto andar, sem passar da espessura lida mais 0,3 mm (ou de 0,3 mm acima da pele) */
  const altura = est.map(() => topo);
  const profundidadeDe = est.map((s) => (profundidade != null ? profundidade : s.esp != null ? s.esp + 0.5 * largura : 2 * largura));
  if (est.every((s) => s.cima)) {
    const regular = (dist, sinal, minimo) => {
      for (let rodada = 0; rodada < 16; rodada += 1) {
        let mexeu = false;
        for (let i = 0; i < nSeg; i += 1) {
          const j = (i + 1) % N;
          const t = sub(est[j].c, est[i].c);
          const Pa = soma(est[i].c, mul(est[i].cima, sinal * dist[i])); const Pb = soma(est[j].c, mul(est[j].cima, sinal * dist[j]));
          if (dot(sub(Pb, Pa), t) >= 0.3 * dot(t, t)) continue;
          for (const k of [i, j]) { const novo = Math.max(minimo(k), dist[k] * 0.8); if (novo < dist[k]) { dist[k] = novo; mexeu = true; } }
        }
        if (!mexeu) break;
      }
    };
    const inicial = [...profundidadeDe];
    regular(profundidadeDe, -1, (k) => Math.min(inicial[k], (est[k].esp ?? 0) + 0.3));
    regular(altura, 1, () => Math.min(topo, 0.3));
  }
  /* os dois pontos de uma estação num lado (em cima e embaixo da pele): na quina entre dois trechos, o encontro dos dois planos de parede (a esquadria em 3D); a linha de
     encontro dá a direção da profundidade, e a profundidade vale a espessura lida (ou a pedida) dividida pelo cosseno entre essa direção e a normal de cada face */
  const doLado = (i, sinal) => {
    const antes = fechada ? seg[(i + N - 1) % N] : seg[i - 1];
    const depois = fechada ? seg[i % N] : seg[i];
    const A = antes ?? depois; const B = depois ?? antes;
    const sA = mul(A.s, sinal); const sB = mul(B.s, sinal);
    const g = dot(sA, sB);
    const nm = unit(soma(A.n, B.n)) ?? A.n;
    const s = est[i];
    /* a direção de cima: a da vista, ou, na curva 3D, a normal de cada estação (cada uma olha para fora da chapa onde está) */
    const cimaDe = s.cima ?? cima;
    let X0; let L;
    if (g > 0.9999) {
      X0 = soma(s.c, mul(sB, h));
      /* a seção vertical: a direção da vista tirada da componente lateral. Seções de normais diferentes numa quina girariam uma contra a outra e dobrariam a lâmina sobre si */
      L = unit(sub(cimaDe, mul(sB, dot(cimaDe, sB)))) ?? nm;
    } else {
      X0 = soma(s.c, mul(soma(sA, sB), h / (1 + g)));
      const soma2 = unit(soma(sA, sB));
      L = unit(cruz(sA, sB));
      if (L && dot(L, cimaDe) < 0) L = mul(L, -1);
      /* na curva 3D os laterais de dois trechos quase paralelos dão uma interseção de planos mal condicionada (o ruído da normal a inclina por dezenas de graus, e a profundidade, dividida
         pelo cosseno, cresce); a seção fica então perpendicular à média dos laterais e olha para a normal da estação */
      if (!L || s.cima || dot(L, nm) < 0.17) L = soma2 ? unit(sub(cimaDe, mul(soma2, dot(cimaDe, soma2)))) ?? nm : nm;
    }
    const cos = Math.max(Math.min(dot(L, A.n), dot(L, B.n)), 0.17);
    return { acima: soma(X0, mul(L, altura[i] / cos)), abaixo: sub(X0, mul(L, profundidadeDe[i] / cos)), X0 };
  };
  /* O FUNDO CONTRA A PELE DE DENTRO. Na curva 3D, num canto da chapa onde a normal gira muito de uma estação à vizinha, a seção encolhida (espessura lida mais 0,3 mm) deixa a corda do fundo, entre dois cantos de baixo,
     sobre a pele de dentro ou antes dela: a lâmina não atravessa a chapa ali e sobra uma ponte. Com `alemDaPele(ponto, paraBaixo)` (o ponto está além da pele de dentro, do lado de fora do material), os cantos de baixo e quatro pontos
     de cada corda, nos dois lados, têm de ficar além dela; onde não ficam, a profundidade das duas estações cresce 25% por rodada, até a espessura lida mais duas larguras, e sem chegar lá a lâmina é recusada com o ponto. Só vale
     onde a espessura foi lida nas duas estações e a profundidade não foi pedida (a pedida é do autor, e a conferida contra a espessura lida já existe). */
  if (alemDaPele && profundidade == null && est.every((s) => s.cima)) {
    const teto = est.map((s) => (s.esp ?? 0) + 2 * largura);
    const baixos = () => [1, -1].map((sinal) => est.map((_, i) => doLado(i, sinal).abaixo));
    const furos = () => {
      const achados = [];
      const B = baixos();
      for (const lado of B) {
        for (let i = 0; i < nSeg; i += 1) {
          const j = (i + 1) % N;
          if (est[i].esp == null || est[j].esp == null) continue;
          for (const u of (i === nSeg - 1 && !fechada ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.25, 0.5, 0.75])) {
            const q = soma(mul(lado[i], 1 - u), mul(lado[j], u));
            const baixo = unit(mul(soma(mul(est[i].n, 1 - u), mul(est[j].n, u)), -1)) ?? mul(est[i].n, -1);
            if (!alemDaPele(q, baixo)) achados.push({ i, j, q });
          }
        }
      }
      return achados;
    };
    /* a seção mais funda não pode cruzar a vizinha: o ponto de baixo anda ao menos 2% do que a curva anda (sem inverter) */
    const cruzam = () => {
      const B = baixos();
      for (const lado of B) for (let i = 0; i < nSeg; i += 1) {
        const j = (i + 1) % N;
        const t = sub(est[j].c, est[i].c);
        if (dot(sub(lado[j], lado[i]), t) < 0.02 * dot(t, t)) return true;
      }
      return false;
    };
    let ruins = furos();
    for (let rodada = 0; rodada < 12 && ruins.length; rodada += 1) {
      const antes = [...profundidadeDe];
      let mexeu = false;
      for (const { i, j } of ruins) for (const k of [i, j]) { const novo = Math.min(profundidadeDe[k] * 1.25, teto[k]); if (novo > profundidadeDe[k]) { profundidadeDe[k] = novo; mexeu = true; } }
      if (!mexeu) break;
      if (cruzam()) { antes.forEach((x, k) => { profundidadeDe[k] = x; }); break; }
      ruins = furos();
    }
    if (ruins.length) {
      const { i, j, q } = ruins[0];
      erro(`a lâmina da linha '${nome}' não atravessou a chapa perto de [${q.map(br).join(', ')}] (entre as estações ${i} e ${j}, cuja normal gira ${br(giro(est[i].n, est[j].n))} graus): o fundo dela fica sobre a pele de dentro, ou antes dela, mesmo na profundidade máxima de ${br(teto[i])} mm, e deixaria uma ponte; afaste a linha do canto ou da borda da chapa, ou parta a linha dos dois lados do canto`);
    }
  }
  const vertices = [];
  const faces = [];
  if (descarta) {
    /* o furo: o prisma da borda de fora; o lado de fora é o de maior área vista da normal média */
    const lado = (sinal) => est.map((s, i) => doLado(i, sinal));
    const L = lado(1); const R = lado(-1);
    const area = (pts) => { let t = [0, 0, 0]; pts.forEach((p, i) => { t = soma(t, cruz(p.X0, pts[(i + 1) % pts.length].X0)); }); return areaPorNorma ? norma(t) : Math.abs(dot(t, est[0].n)); };
    const borda = area(L) >= area(R) ? L : R;
    borda.forEach((q) => vertices.push(q.acima, q.abaixo));
    for (let i = 0; i < N; i += 1) faces.push([2 * i, 2 * ((i + 1) % N), 2 * ((i + 1) % N) + 1, 2 * i + 1]);
    const capa = (k) => Array.from({ length: N }, (_, i) => 2 * i + k);
    faces.push(capa(0).reverse(), capa(1));
  } else {
    est.forEach((_, i) => {
      const l = doLado(i, 1); const r = doLado(i, -1);
      vertices.push(l.acima, r.acima, r.abaixo, l.abaixo);
    });
    for (let i = 0; i < nSeg; i += 1) {
      const j = (i + 1) % N;
      for (let a = 0; a < 4; a += 1) {
        const b = (a + 1) % 4;
        if (a === 1 || a === 3) faces.push([4 * i + a, 4 * i + b, 4 * j + b, 4 * j + a]);
        else faces.push([4 * i + a, 4 * i + b, 4 * j + b], [4 * i + a, 4 * j + b, 4 * j + a]);
      }
    }
    if (!fechada) faces.push([3, 2, 1, 0], [4 * (N - 1), 4 * (N - 1) + 1, 4 * (N - 1) + 2, 4 * (N - 1) + 3]);
  }
  /* de fora: o volume com sinal manda no sentido das faces */
  const orientar = (vs, fs) => {
    let vol = 0;
    for (const f of fs) for (let k = 1; k + 1 < f.length; k += 1) vol += dot(vs[f[0]], cruz(vs[f[k]], vs[f[k + 1]])) / 6;
    return vol < 0 ? fs.map((f) => [...f].reverse()) : fs;
  };
  const saida = orientar(vertices, faces);
  const r5 = (v) => Math.round(v * 1e5) / 1e5;
  /* A ABA: a perna dobrada de cada lado da lâmina, um sólido fechado por lado (vértices e faces de um passo `subdivisao` de niveis 0), varrido ao longo das mesmas estações, com a
     mesma esquadria nos cantos. O ponto do perfil (u, w) fica em c + M (h + u) + L w: M é o vetor lateral da estação (com a esquadria) que dá a parede do corte a `h`, e L a direção
     da seção, para cima. As estações alongadas (as que passam da borda da chapa) ficam de fora, e a perna acaba na última estação sobre a chapa. */
  let abas = null;
  if (aba && !descarta) {
    const quina = (i, sinal) => {
      const antes = fechada ? seg[(i + N - 1) % N] : seg[i - 1];
      const depois = fechada ? seg[i % N] : seg[i];
      const A = antes ?? depois; const B = depois ?? antes;
      const sA = mul(A.s, sinal); const sB = mul(B.s, sinal);
      const g = dot(sA, sB);
      const nm = unit(soma(A.n, B.n)) ?? A.n;
      const cimaDe = est[i].cima ?? cima;
      let M; let L;
      if (g > 0.9999) {
        M = sB;
        L = unit(sub(cimaDe, mul(sB, dot(cimaDe, sB)))) ?? nm;
      } else {
        M = mul(soma(sA, sB), 1 / (1 + g));
        const soma2 = unit(soma(sA, sB));
        L = unit(cruz(sA, sB));
        if (L && dot(L, cimaDe) < 0) L = mul(L, -1);
        if (!L || est[i].cima || dot(L, nm) < 0.17) L = soma2 ? unit(sub(cimaDe, mul(soma2, dot(cimaDe, soma2)))) ?? nm : nm;
      }
      return { M, L };
    };
    const uteis = est.map((s, i) => i).filter((i) => !est[i].alongada && !(aba.perto && aba.perto(est[i].c)));
    const volta = fechada && uteis.length === N;
    /* os trechos contíguos de estações com perna: cada um é um sólido, e a perna não passa pelas estações que ficaram de fora */
    const corridas = [];
    /* o trecho entre duas estações também não pode passar perto: a corda de 40 mm cruza o vão da outra linha entre duas estações que ficam a mais que o alcance dela */
    const trechoLivre = (i, j) => !aba.perto || [0.25, 0.5, 0.75].every((u) => !aba.perto(soma(mul(est[i].c, 1 - u), mul(est[j % N].c, u))));
    for (const i of uteis) { const ultima = corridas[corridas.length - 1]; if (ultima && ultima[ultima.length - 1] === i - 1 && trechoLivre(i - 1, i)) ultima.push(i); else corridas.push([i]); }
    const validas = volta && corridas.length === 1 && uteis.every((i, k) => k === 0 || trechoLivre(uteis[k - 1], i)) && trechoLivre(uteis[uteis.length - 1], uteis[0]) ? [uteis] : corridas.filter((c) => c.length >= 2);
    const perfil = perfilDaAba({ espessura: aba.espessura, largura: aba.largura, angulo: aba.angulo, raio: aba.raio ?? 0, recuo: RECUO_DA_ABA * largura });
    abas = validas.flatMap((corrida) => [1, -1].map((sinal) => {
      const vs = []; const fs = [];
      const nP = perfil.length;
      corrida.forEach((i) => {
        const { M, L } = quina(i, sinal);
        for (const [u, w] of perfil) vs.push(soma(soma(est[i].c, mul(M, h + u)), mul(L, w)));
      });
      const nE = corrida.length;
      const trechos = volta ? nE : nE - 1;
      for (let e = 0; e < trechos; e += 1) {
        const f = e; const g2 = (e + 1) % nE;
        for (let m = 0; m < nP; m += 1) {
          const m2 = (m + 1) % nP;
          fs.push([f * nP + m, f * nP + m2, g2 * nP + m2], [f * nP + m, g2 * nP + m2, g2 * nP + m]);
        }
      }
      if (!volta) {
        fs.push(Array.from({ length: nP }, (_, m) => nP - 1 - m), Array.from({ length: nP }, (_, m) => (nE - 1) * nP + m));
      }
      return { lado: sinal, estacoes: corrida.length, vertices: vs.map((q) => q.map(r5)), faces: orientar(vs, fs) };
    }));
    const reais = est.filter((q) => !q.alongada).length;
    abas.trechosSemPerna = (volta ? reais : reais - 1) - validas.reduce((t, c) => t + (volta && c === uteis ? c.length : c.length - 1), 0);
  }
  return { vertices: vertices.map((p) => p.map(r5)), faces: saida, dentro: null, estacoes: est, abas };
}

/**
 * Os pares de pontos de cada lado da linha, para provar que ela separa: no meio de cada trecho entre estações, o ponto a `h` mm de cada lado, no plano tangente e
 * perpendicular ao trecho. `c` é o meio do trecho e `n` a normal da chapa nele. Quem chama leva cada ponto à pele e vê se caem em pedaços diferentes.
 */
export function amostrasLaterais(estacoes, fechada, h) {
  const N = estacoes.length;
  const nSeg = fechada ? N : N - 1;
  const saida = [];
  for (let i = 0; i < nSeg; i += 1) {
    const A = estacoes[i]; const B = estacoes[(i + 1) % N];
    const n = unit(soma(A.n, B.n)); const t = unit(sub(B.c, A.c));
    const sm = n && t ? unit(cruz(n, t)) : null;
    if (!sm) continue;
    const c = mul(soma(A.c, B.c), 0.5);
    saida.push({ i, c, n, a: soma(c, mul(sm, h)), b: sub(c, mul(sm, h)) });
  }
  return saida;
}

/** A volta fechada cujo contorno de dentro, deslocado meia largura, inverte algum trecho (a volta é menor que o vão): a lâmina o deixaria como ilha. */
export function voltaMenorQueOVao(estacoes, largura) {
  const lat = lateraisDe(estacoes);
  if (lat.some((l) => !l)) return true;
  const N = estacoes.length;
  const h = largura / 2;
  const area = (pts) => { let t = [0, 0, 0]; pts.forEach((p, i) => { t = soma(t, cruz(p, pts[(i + 1) % pts.length])); }); return Math.abs(dot(t, estacoes[0].n)); };
  const lado = (sinal) => estacoes.map((s, i) => soma(s.c, mul(lat[i].sm, sinal * h * lat[i].k)));
  const A = lado(1); const B = lado(-1);
  const dentro = area(A) <= area(B) ? A : B;
  for (let i = 0; i < N; i += 1) {
    const j = (i + 1) % N;
    if (dot(sub(estacoes[j].c, estacoes[i].c), sub(dentro[j], dentro[i])) < 0) return true;
  }
  return false;
}

const cruz2 = (a, b) => a[0] * b[1] - a[1] * b[0];
/** O polígono 2D tem duas arestas não vizinhas que se cruzam? */
export function seCruza2d(pol) {
  const n = pol.length;
  const lado = (a, b, c) => Math.sign(cruz2([b[0] - a[0], b[1] - a[1]], [c[0] - a[0], c[1] - a[1]]));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue;
      const [a, b, c, d] = [pol[i], pol[(i + 1) % n], pol[j], pol[(j + 1) % n]];
      if (lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0) return true;
    }
  }
  return false;
}

/**
 * As bordas da lâmina, vistas de cima da vista (a coordenada do eixo da vista descartada), cruzam-se? Na linha aberta, o polígono de uma borda e a outra de volta;
 * na volta fechada, cada borda é um anel. Devolve 'aberta', 'volta' ou null.
 */
export function bordasSeCruzam(estacoes, fechada, largura, eixoIdx) {
  const lat = lateraisDe(estacoes);
  if (lat.some((l) => !l)) return fechada ? 'volta' : 'aberta';
  const h = largura / 2;
  const proj = (p) => p.filter((_, k) => k !== eixoIdx);
  const lado2 = (sinal) => estacoes.map((s, i) => proj(soma(s.c, mul(lat[i].sm, sinal * h * lat[i].k))));
  const L = lado2(1); const R = lado2(-1);
  if (fechada) return seCruza2d(L) || seCruza2d(R) ? 'volta' : null;
  return seCruza2d([...L, ...[...R].reverse()]) ? 'aberta' : null;
}

/** A menor distância entre dois segmentos 3D. */
function distanciaEntreSegmentos(p1, q1, p2, q2) {
  const d1 = sub(q1, p1); const d2 = sub(q2, p2); const r = sub(p1, p2);
  const a = dot(d1, d1); const e = dot(d2, d2); const f = dot(d2, r);
  let s; let t;
  if (a <= 1e-12 && e <= 1e-12) return norma(r);
  if (a <= 1e-12) { s = 0; t = Math.max(0, Math.min(1, f / e)); } else {
    const c = dot(d1, r);
    if (e <= 1e-12) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else {
      const b = dot(d1, d2); const den = a * e - b * b;
      s = den > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
    }
  }
  return norma(sub(soma(p1, mul(d1, s)), soma(p2, mul(d2, t))));
}

/**
 * A linha passa a menos de `largura` dela mesma, num trecho distante ao longo dela (separado por mais de duas larguras de arco): a lâmina de um trecho invade a
 * do outro, o contorno de um lado se cruza e sobra ilha ou fresta. Devolve a menor distância achada, ou null.
 */
export function linhaPertoDeSiMesma(estacoes, fechada, largura) {
  const N = estacoes.length;
  const c = estacoes.map((s) => s.c);
  const nSeg = fechada ? N : N - 1;
  const cum = [0];
  for (let i = 1; i <= nSeg; i += 1) cum.push(cum[i - 1] + norma(sub(c[i % N], c[i - 1])));
  const total = cum[nSeg];
  /* o arco entre os trechos i e j (i < j) é o vão entre eles ao longo da curva, indo de i a j ou, na fechada, dando a volta pela emenda (do fim de j ao começo de i) */
  const arco = (i, j) => { const direto = cum[j] - cum[i + 1]; return fechada ? Math.min(direto, total - (cum[j + 1] - cum[i])) : direto; };
  let menor = null;
  for (let i = 0; i < nSeg; i += 1) {
    for (let j = i + 2; j < nSeg; j += 1) {
      if (fechada && i === 0 && j === nSeg - 1) continue;
      if (arco(i, j) < 2 * largura) continue;
      const d = distanciaEntreSegmentos(c[i], c[(i + 1) % N], c[j], c[(j + 1) % N]);
      if (d < largura * 0.99 && (menor == null || d < menor)) menor = d;
    }
  }
  return menor;
}
