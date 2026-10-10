/* casca.js — casca com espessura constante de um sólido facetado: função pura sobre posições e listas de vértices.

   Dado um sólido fechado (vértices e faces com o enrolamento do núcleo, normal para fora) e uma espessura t, devolve a
   parede interna e a borda das faces abertas. A superfície externa fica como está: as faces fechadas mantêm vértices e
   ids, e as faces abertas saem da peça. A função calcula só o que se soma a ela:

     - internos: os vértices da cavidade, que é o sólido recuado: cada face fechada vai t para dentro e cada face aberta
       fica no plano dela (recuo 0), de modo que a cavidade termina rente à abertura;
     - internas: uma face por face fechada, com a ordem de cantos invertida (a normal aponta para a cavidade);
     - bordas: para cada aresta de uma face aberta que encosta numa face fechada, o quadrilátero que liga a aresta
       externa à interna, no plano da face aberta.

   OS DOIS CÁLCULOS DA CAVIDADE. O primeiro é o `deslocarContorno` de contorno.js em 3D: cada vértice do sólido vai até onde
   se encontram os planos das faces que o tocam, recuados; a cavidade tem a topologia do sólido e cada vértice interno
   fica ligado ao externo. Com três faces por vértice (caixa, cilindro, loft de duas seções com tampas) a solução é
   exata. Com quatro ou mais, os planos recuados em geral não passam por um ponto só (a quina de um loft de várias seções
   com vincos diferentes, ou uma face aberta no meio de uma fileira), e o desvio medido tira o cálculo do jogo. Aí, se o
   sólido é convexo, a cavidade é a interseção dos semiespaços recuados, achada pelos vértices de cada trio de planos:
   exata em qualquer valência, e a topologia da cavidade pode diferir da do sólido (uma quina de valência 4 vira duas de
   valência 3). Sólido côncavo com vértice de valência 4 ou mais é recusado, porque a interseção de semiespaços não é a
   cavidade dele.

   POR QUE NÃO O `levelSet` DO MANIFOLD. Foi medido antes (caixa 40×30×20, parede 2, aresta de grade 2): 9056 triângulos
   para uma caixa de 6 faces e 19864 para um cilindro de 24 lados, contra 1000 ids por passo; e o cilindro erra a parede em
   até 0,45 (23% de t) porque o marching tetrahedra arredonda as quinas. Com aresta 1 o erro cai a 0,17 e os triângulos
   vão a 68624; com 0,5, a 269552 triângulos e 3,5 s. O recuo por plano dá a mesma parede com as faces que o sólido já
   tem, sem resolução a fixar, e o resultado sai igual byte a byte em toda execução.

   O QUE ELA GARANTE, medido sobre a malha que devolve e não sobre a conta: toda face interna dista t do plano da sua face
   externa (`desvioDePlano`), nenhum ponto amostrado da parede interna fica a menos de t(1 - TOLERANCIA_CASCA) da superfície
   fechada (`espessuraMinima`), a superfície nova fecha (toda aresta usada uma vez em cada sentido) e nenhuma face interna
   se inverte. O que ela não faz: em aresta côncava (ângulo reentrante do sólido) a parede fica mais grossa perto do
   vértice, até t/cos(θ/2) pela bissetriz, e `espessuraMaxima` registra quanto; e face não plana (quadrilátero torcido)
   é recuada pelo plano médio, de modo que o desvio entra na medida e acima da tolerância a casca é recusada. */

export const TOLERANCIA_CASCA = 0.02;
/* a interseção de semiespaços testa todos os trios de planos: n³/6 trios por n planos */
export const MAXIMO_DE_FACES_CONVEXO = 150;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const comprimento = (a) => Math.hypot(a[0], a[1], a[2]);
const ehNumero = (x) => typeof x === 'number' && Number.isFinite(x);
const fmt = (x) => String(Math.round(x * 1e6) / 1e6);

/* Vetor de área do polígono (Newell): a direção é a normal da face e o comprimento é a área. */
function areaVetor(pontos) {
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < pontos.length; k++) {
    const c = pontos[k], n = pontos[(k + 1) % pontos.length];
    nx += (c[1] - n[1]) * (c[2] + n[2]);
    ny += (c[2] - n[2]) * (c[0] + n[0]);
    nz += (c[0] - n[0]) * (c[1] + n[1]);
  }
  return [nx / 2, ny / 2, nz / 2];
}

/* Distância de um ponto a um triângulo (Ericson, Real-Time Collision Detection, 5.1.5). */
function distanciaAoTriangulo(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return comprimento(ap);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return comprimento(bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return comprimento(sub(ap, mul(ab, d1 / (d1 - d3))));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return comprimento(cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return comprimento(sub(ap, mul(ac, d2 / (d2 - d6))));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return comprimento(sub(bp, mul(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6)))));
  const denom = 1 / (va + vb + vc);
  return comprimento(sub(ap, soma(mul(ab, vb * denom), mul(ac, vc * denom))));
}

/* Resolve A x = b (3×3) por eliminação com pivô parcial; A é simétrica e já regularizada. */
function resolver3(A, b) {
  const M = A.map((linha, i) => [...linha, b[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = col + 1; r < 3; r++) {
      const f = M[r][col] / M[col][col];
      for (let k = col; k < 4; k++) M[r][k] -= f * M[col][k];
    }
  }
  const x = [0, 0, 0];
  for (let r = 2; r >= 0; r--) {
    let s = M[r][3];
    for (let k = r + 1; k < 3; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/* Cada aresta dirigida do sólido tem de aparecer uma vez e ter a oposta uma vez. Devolve quantas não têm. */
function arestasSemPar(faces, chave = (v) => v) {
  const dirigidas = new Map();
  for (const vs of faces) for (let k = 0; k < vs.length; k++) {
    const c = `${chave(vs[k])}>${chave(vs[(k + 1) % vs.length])}`;
    dirigidas.set(c, (dirigidas.get(c) ?? 0) + 1);
  }
  let abertas = 0;
  for (const [c, n] of dirigidas) {
    const [x, y] = c.split('>');
    if (n !== 1 || dirigidas.get(`${y}>${x}`) !== 1) abertas++;
  }
  return abertas;
}

function volumeComSinal(posicao, faces) {
  let v = 0;
  for (const vs of faces) for (let k = 1; k < vs.length - 1; k++) {
    const a = posicao(vs[0]), b = posicao(vs[k]), c = posicao(vs[k + 1]);
    v += dot(a, cruz(b, c)) / 6;
  }
  return v;
}

/* Bordas: cada aresta a→b de face aberta cuja oposta b→a é de face fechada. `interna(fechada, a, b)` devolve os dois
   vértices internos [perto de a, perto de b] da face interna dessa face fechada, ou null. */
function montarBordas(faces, abertasSet, interna) {
  const dona = new Map();
  for (const [id, vs] of faces) for (let k = 0; k < vs.length; k++) dona.set(`${vs[k]}>${vs[(k + 1) % vs.length]}`, id);
  const bordas = [];
  for (const [id, vs] of faces) {
    if (!abertasSet.has(id)) continue;
    for (let k = 0; k < vs.length; k++) {
      const a = vs[k], b = vs[(k + 1) % vs.length], vizinha = dona.get(`${b}>${a}`);
      if (abertasSet.has(vizinha)) continue;
      const par = interna(vizinha, a, b, id);
      /* a face interna vizinha que só encosta no plano da abertura num ponto dá um triângulo, não um quadrilátero */
      if (par) bordas.push({ de: id, vs: par[0] === par[1] ? [['e', a], ['e', b], ['i', par[1]]] : [['e', a], ['e', b], ['i', par[1]], ['i', par[0]]] });
    }
  }
  return bordas;
}

/* Cálculo 1: cada vértice do sólido recua até onde os planos recuados das faces que o tocam se encontram (mínima correção
   por mínimos quadrados, exata quando os planos concorrem). */
function recuoPorVertice(ctx) {
  const { faces, pos, plano, abertasSet, fechadas, espessura } = ctx;
  const planosDoVertice = new Map();
  for (const [id, vs] of faces) for (const v of vs) {
    if (!planosDoVertice.has(v)) planosDoVertice.set(v, []);
    planosDoVertice.get(v).push(id);
  }
  const indice = new Map(), internos = [];
  for (const [v, ids] of [...planosDoVertice].sort((a, b) => a[0] - b[0])) {
    if (!ids.some((f) => !abertasSet.has(f))) continue;
    const p = pos.get(v);
    const A = [[1e-12, 0, 0], [0, 1e-12, 0], [0, 0, 1e-12]], b = [0, 0, 0];
    for (const f of ids) {
      const { n, d } = plano.get(f);
      const r = d - (abertasSet.has(f) ? 0 : espessura) - dot(n, p);
      for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += n[i] * n[j]; b[i] += n[i] * r; }
    }
    const q = soma(p, resolver3(A, b));
    if (!q.every(ehNumero)) return { erro: 'o recuo de um vértice não tem solução (faces vizinhas degeneradas)' };
    indice.set(v, internos.length); internos.push([internos.length, q]);
  }
  const internas = [];
  for (const [id, vs] of fechadas) {
    const { n } = plano.get(id);
    const av = areaVetor(vs.map((v) => internos[indice.get(v)][1]));
    if (!(dot(av, n) > 1e-12)) return { erro: `espessura ${fmt(espessura)} inverte a face interna da face ${id} (área ${fmt(dot(av, n))}): a parede passa por dentro de si; reduza a espessura` };
    internas.push({ de: id, vs: vs.map((v) => indice.get(v)).reverse() });
  }
  const bordas = montarBordas(faces, abertasSet, (fechada, a, b) => (indice.has(a) && indice.has(b) ? [indice.get(a), indice.get(b)] : null));
  return { internos, internas, bordas, metodo: 'vertice' };
}

/* Cálculo 2 (sólido convexo): a cavidade é a interseção dos semiespaços recuados. Os vértices são os trios de planos que
   cumprem todos os demais; cada face é o conjunto de vértices sobre o plano dela, em ordem angular. */
function recuoPorPlanos(ctx) {
  const { faces, plano, abertasSet, fechadas, espessura, escala } = ctx;
  const eps = 1e-9 * Math.max(1, escala), epsPonto = 1e-7 * Math.max(1, escala);
  const lista = faces.map(([id]) => ({ id, n: plano.get(id).n, c: plano.get(id).d - (abertasSet.has(id) ? 0 : espessura) }));
  const pontos = [];
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    const nij = cruz(lista[i].n, lista[j].n);
    if (comprimento(nij) < 1e-9) continue;
    for (let k = j + 1; k < lista.length; k++) {
      const det = dot(nij, lista[k].n);
      if (Math.abs(det) < 1e-9) continue;
      const p = mul(soma(soma(mul(cruz(lista[j].n, lista[k].n), lista[i].c), mul(cruz(lista[k].n, lista[i].n), lista[j].c)), mul(nij, lista[k].c)), 1 / det);
      if (!p.every(ehNumero) || lista.some((l) => dot(l.n, p) > l.c + eps)) continue;
      if (!pontos.some((q) => comprimento(sub(q, p)) <= epsPonto)) pontos.push(p);
    }
  }
  if (pontos.length < 4) return { erro: `espessura ${fmt(espessura)}: a cavidade some (o recuo das faces não deixa volume); reduza a espessura` };
  const sobre = (l, p) => Math.abs(dot(l.n, p) - l.c) <= eps * 10;
  const indice = new Map(), internos = [];
  const idxDe = (p) => { if (!indice.has(p)) { indice.set(p, internos.length); internos.push([internos.length, p]); } return indice.get(p); };
  const poligonos = new Map();
  const internas = [];
  const mesmoPlano = (a, b) => comprimento(sub(a.n, b.n)) <= 1e-9 && Math.abs(a.c - b.c) <= eps;
  const vistos = [];
  for (const [id] of fechadas) {
    const l = lista.find((x) => x.id === id);
    /* faces vizinhas no mesmo plano dão uma cavidade só nesse plano: o polígono fica com a primeira */
    const gemea = vistos.find((v) => mesmoPlano(v, l));
    if (gemea) { poligonos.set(id, poligonos.get(gemea.id)); continue; }
    vistos.push(l);
    const meus = pontos.filter((p) => sobre(l, p));
    if (meus.length < 3) continue;
    const centro = mul(meus.reduce(soma, [0, 0, 0]), 1 / meus.length);
    const eixo = Math.abs(l.n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = mul(cruz(l.n, eixo), 1 / comprimento(cruz(l.n, eixo))), v = cruz(l.n, u);
    const ordenados = meus.map((p) => ({ p, a: Math.atan2(dot(sub(p, centro), v), dot(sub(p, centro), u)) })).sort((x, y) => x.a - y.a || x.p[0] - y.p[0] || x.p[1] - y.p[1] || x.p[2] - y.p[2]).map((x) => x.p);
    if (!(dot(areaVetor(ordenados), l.n) > 1e-12)) continue;
    poligonos.set(id, ordenados);
  }
  /* os índices dos vértices seguem a ordem das faces do sólido, não a das descobertas */
  const emitidos = new Set();
  for (const [id] of fechadas) {
    const poli = poligonos.get(id);
    if (!poli || emitidos.has(poli)) continue;
    emitidos.add(poli);
    internas.push({ de: id, vs: poli.map(idxDe).reverse() });
  }
  for (const l of lista) {
    if (!abertasSet.has(l.id)) continue;
    const folga = Math.min(...pontos.map((p) => Math.abs(dot(l.n, p) - l.c)));
    if (folga > eps * 10) return { erro: `abertas: com espessura ${fmt(espessura)} as paredes das faces vizinhas se encontram antes de chegar ao plano da face aberta ${l.id} (a cavidade para a ${fmt(folga)} dele) e a parede cobriria a abertura; reduza a espessura ou abra uma face menos oblíqua` };
  }
  const bordas = montarBordas(faces, abertasSet, (fechada, a, b, aberta) => {
    const poli = poligonos.get(fechada);
    const lo = lista.find((x) => x.id === aberta);
    if (!poli) return null;
    const sobreO = poli.filter((p) => sobre(lo, p));
    if (sobreO.length < 1) return null;
    const e = sub(ctx.pos.get(b), ctx.pos.get(a));
    const ordem = sobreO.slice().sort((x, y) => dot(e, x) - dot(e, y));
    return [idxDe(ordem[0]), idxDe(ordem[ordem.length - 1])];
  });
  return { internos, internas, bordas, metodo: 'planos' };
}

/* vertices: [[id, [x,y,z]], …]; faces: [[id, [v, …]], …]; abertas: ids de face a abrir.
   Devolve internos [[k, ponto]], internas [{de, vs: [k]}], bordas [{de, vs: [['e', vérticeDoSólido] | ['i', k], …]}]
   e as medidas. Lança Error com campo, valor e o que é aceito. */
export function calcularCasca({ vertices, faces, abertas = [], espessura, limiteDeIds = Infinity } = {}) {
  if (!ehNumero(espessura) || espessura <= 0) throw new Error(`espessura precisa ser um número finito maior que zero (veio ${fmt(espessura)})`);
  if (!Array.isArray(vertices) || !Array.isArray(faces) || faces.length < 4) throw new Error('solido: o sólido precisa de 4 faces ou mais');
  const pos = new Map(vertices.map(([id, p]) => [id, p]));
  const vsPorFace = new Map(faces.map(([id, vs]) => [id, vs]));
  for (const [id, vs] of faces) {
    if (!Array.isArray(vs) || vs.length < 3 || vs.some((v) => !pos.has(v))) throw new Error(`solido: a face ${id} cita vértice fora do sólido ou tem menos de 3 cantos`);
  }
  for (const [id, p] of vertices) if (!Array.isArray(p) || p.length !== 3 || !p.every(ehNumero)) throw new Error(`solido: o vértice ${id} tem coordenada não finita`);
  const faltam = abertas.filter((f) => !vsPorFace.has(f));
  if (faltam.length) throw new Error(`abertas: a(s) face(s) ${faltam.join(', ')} não está(ão) no sólido; as faces abertas precisam ser faces do sólido`);
  const abertasSet = new Set(abertas);
  const fechadas = faces.filter(([id]) => !abertasSet.has(id));
  if (!fechadas.length) throw new Error('abertas: todas as faces do sólido estão abertas e não sobraria parede; deixe pelo menos uma face fechada');

  const semPar = arestasSemPar(faces.map(([, vs]) => vs));
  if (semPar) throw new Error(`solido: o sólido não é fechado (${semPar} aresta(s) dirigida(s) sem par oposto); a casca só aceita superfície fechada e orientada, com a normal para fora`);
  if (volumeComSinal((v) => pos.get(v), faces.map(([, vs]) => vs)) <= 0) throw new Error('solido: o volume com sinal é nulo ou negativo, a orientação das faces está invertida (a normal precisa apontar para fora)');

  /* plano de cada face: normal unitária (Newell) e d = n·centroide */
  const plano = new Map();
  let desvioDePlanarEntrada = 0, escala = 0;
  for (const [, p] of vertices) escala = Math.max(escala, ...p.map(Math.abs));
  for (const [id, vs] of faces) {
    const pontos = vs.map((v) => pos.get(v));
    const av = areaVetor(pontos), tam = comprimento(av);
    if (tam <= 1e-12) throw new Error(`solido: a face ${id} tem área nula`);
    const n = mul(av, 1 / tam);
    const d = pontos.reduce((s, p) => s + dot(n, p), 0) / pontos.length;
    plano.set(id, { n, d });
    for (const p of pontos) desvioDePlanarEntrada = Math.max(desvioDePlanarEntrada, Math.abs(dot(n, p) - d));
  }

  /* menor medida: por face fechada, a largura do sólido na direção da normal dela. A parede dos dois lados pede menos que
     a metade; se o lado oposto é todo de faces abertas, a cavidade vai até ele e basta a largura inteira. */
  let larguraMinima = Infinity, limite = Infinity;
  for (const [id] of fechadas) {
    const { n, d } = plano.get(id);
    let menor = Infinity;
    for (const [, p] of vertices) menor = Math.min(menor, dot(n, p));
    const largura = d - menor;
    larguraMinima = Math.min(larguraMinima, largura);
    const noApoio = (vs) => vs.every((v) => Math.abs(dot(n, pos.get(v)) - menor) <= 1e-9 * Math.max(1, escala));
    const apoios = faces.filter(([, vs]) => noApoio(vs));
    const apoioAberto = apoios.length > 0 && apoios.every(([fid]) => abertasSet.has(fid));
    limite = Math.min(limite, apoioAberto ? largura : largura / 2);
  }
  if (!(espessura < limite)) throw new Error(`espessura ${fmt(espessura)} não cabe no sólido: a menor medida entre paredes é ${fmt(larguraMinima)} e a parede de cada lado precisa de menos que a metade; aceito: maior que 0 e menor que ${fmt(limite)}`);

  const tolerancia = TOLERANCIA_CASCA * espessura;
  if (desvioDePlanarEntrada > tolerancia) throw new Error(`solido: há face não plana, que desvia ${fmt(desvioDePlanarEntrada)} do plano médio, acima da tolerância ${fmt(tolerancia)} (${TOLERANCIA_CASCA * 100}% da espessura ${fmt(espessura)}); a casca recua cada face pelo plano e só aceita faces planas`);

  const ctx = { faces, pos, plano, abertasSet, fechadas, espessura, escala };
  const convexo = faces.every(([id]) => {
    const { n, d } = plano.get(id);
    return vertices.every(([, p]) => dot(n, p) <= d + tolerancia);
  });
  const desvioDe = (parede) => {
    let desvio = 0;
    for (const { de, vs } of parede.internas) {
      const { n, d } = plano.get(de);
      for (const k of vs) desvio = Math.max(desvio, Math.abs(dot(n, parede.internos[k][1]) - (d - espessura)));
    }
    return desvio;
  };
  let parede = recuoPorVertice(ctx), motivo = parede.erro;
  if (!motivo && desvioDe(parede) > tolerancia) motivo = `os planos recuados das faces que se encontram num vértice não passam por um ponto só (a espessura medida desvia ${fmt(desvioDe(parede))} da pedida, ${fmt(espessura)}, acima da tolerância ${fmt(tolerancia)})`;
  if (motivo) {
    if (!convexo) throw new Error(`solido: ${motivo}; o sólido não é convexo, e a cavidade por interseção de semiespaços só vale para sólido convexo. Simplifique a forma ou use seções semelhantes`);
    if (faces.length > MAXIMO_DE_FACES_CONVEXO) throw new Error(`solido: ${motivo}; o sólido convexo tem ${faces.length} faces e o cálculo por semiespaços aceita até ${MAXIMO_DE_FACES_CONVEXO}`);
    parede = recuoPorPlanos(ctx);
    if (parede.erro) throw new Error(parede.erro);
  }
  const { internos, internas, bordas } = parede;
  if (!internas.length) throw new Error(`espessura ${fmt(espessura)}: a cavidade não tem face; reduza a espessura`);
  if (internos.length > limiteDeIds || internas.length + bordas.length > limiteDeIds) throw new Error(`solido: a casca precisa de ${internos.length} vértices e ${internas.length + bordas.length} faces novos e o bloco do passo comporta ${limiteDeIds}; esvazie um sólido com menos faces`);

  /* a superfície nova fecha? faces fechadas externas + internas + bordas */
  const rotulo = (t) => (Array.isArray(t) ? t.join(':') : `e:${t}`);
  const todas = [
    ...fechadas.map(([, vs]) => vs.map((v) => ['e', v])),
    ...internas.map(({ vs }) => vs.map((v) => ['i', v])),
    ...bordas.map(({ vs }) => vs),
  ];
  const abertasDepois = arestasSemPar(todas, rotulo);
  if (abertasDepois) throw new Error(`${abertas.length ? 'abertas' : 'solido'}: a casca não fecha (${abertasDepois} aresta(s) sem par); ${abertas.length ? 'as faces abertas não podem se tocar só por um vértice, e a parede precisa alcançar o plano de cada abertura' : 'a espessura deixa a cavidade sem alcançar uma face'}; reduza a espessura ou mude as faces abertas`);

  /* medida sobre a malha devolvida: amostras de cada face interna contra a superfície fechada externa */
  const triangulosFechados = [];
  for (const [, vs] of fechadas) for (let k = 1; k < vs.length - 1; k++) triangulosFechados.push([pos.get(vs[0]), pos.get(vs[k]), pos.get(vs[k + 1])]);
  let espessuraMinima = Infinity, espessuraMaxima = 0, amostras = 0;
  for (const { vs } of internas) {
    const q = vs.slice().reverse().map((k) => internos[k][1]);
    for (let k = 1; k < q.length - 1; k++) {
      const a = q[0], b = q[k], c = q[k + 1];
      for (const p of [a, b, c, mul(soma(a, b), 0.5), mul(soma(b, c), 0.5), mul(soma(c, a), 0.5), mul(soma(soma(a, b), c), 1 / 3)]) {
        let menor = Infinity;
        for (const [ta, tb, tc] of triangulosFechados) menor = Math.min(menor, distanciaAoTriangulo(p, ta, tb, tc));
        espessuraMinima = Math.min(espessuraMinima, menor); espessuraMaxima = Math.max(espessuraMaxima, menor); amostras++;
      }
    }
  }
  const desvioDePlano = desvioDe(parede);
  if (desvioDePlano > tolerancia) throw new Error(`solido: a espessura medida desvia ${fmt(desvioDePlano)} da pedida (${fmt(espessura)}), acima da tolerância ${fmt(tolerancia)}`);
  if (espessuraMinima < espessura - tolerancia) throw new Error(`espessura ${fmt(espessura)} faz a parede invadir a si mesma: a menor distância medida entre a face interna e a superfície é ${fmt(espessuraMinima)}, abaixo de ${fmt(espessura - tolerancia)}; reduza a espessura`);

  return {
    internos, internas, bordas,
    medidas: { metodo: parede.metodo, espessura, larguraMinima, limite, espessuraMinima, espessuraMaxima, desvioDePlano, tolerancia, amostras },
  };
}
