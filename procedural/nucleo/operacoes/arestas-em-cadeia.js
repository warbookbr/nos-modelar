/* arestas-em-cadeia.js — arredondar de uma vez a cadeia de arestas que continua em tangência a partir da escolhida.

   A borda de uma tampa que segue um contorno por trechos (reto, arco tangente, concordância de facetas) é uma cadeia de
   arestas: cada faceta é uma aresta entre a tampa e uma parede, e as paredes vizinhas dobram poucos graus entre si.
   `arredondarAresta` arredonda uma aresta por chamada, e na ponta em que ela encontra a faceta seguinte o arco não cabe no
   plano da vizinha quase paralela: termina em degrau (arestas-em-grupos.js) ou é recusado. Aqui a cadeia inteira, da escolhida
   até o canto vivo ou até fechar o laço, é uma varredura só: as paredes continuam em tangência, não há tampa nem degrau nas
   junções, e o raio pode passar do comprimento das facetas.

   A GEOMETRIA. A tampa é um grupo de faces coplanares (a tampa partida de uma extrusão) e cada aresta da cadeia a separa de uma
   parede perpendicular a ela: o diedro é de 90° e todas as paredes descem na mesma direção. O arredondamento de cada aresta é
   o cilindro de raio r cujo eixo corre a r da tampa e a r da parede. Em cada vértice interior da cadeia o anel (os n+1 pontos
   do arco) é a seção desse cilindro pelo plano bissetor das duas arestas vizinhas, a esquadria entre dois cilindros de mesmo
   raio, e sai da conta fechada
       anel_k = vértice + r·(u·(1 − cos ψ_k) + m·(1 − sen ψ_k)),    ψ_k = k/n · 90°
   com u a direção que desce pela parede, m = (d1 + d2)/(1 + d1·d2) o vetor que anda r para dentro da tampa em cada uma das
   duas arestas (d1 e d2 são as normais para dentro da tampa) e k = 0 na tampa, k = n na parede. Num trecho reto m é a normal
   da própria aresta e o anel é o da aresta simples; cada painel liga o anel de um vértice ao do seguinte e fica plano, porque
   os dois pontos de mesmo k estão na mesma geratriz do cilindro. O contorno interno da tampa é o contorno original deslocado
   r para dentro com esquadria (o mesmo que a CrossSection de perfil2d.js dá com junta em esquadria).

   AS PONTAS. Uma cadeia aberta termina num canto vivo, onde a aresta seguinte dobra mais que `ate` graus. Nessa ponta o anel
   escorrega ao longo da aresta até o plano da face de ponta, que recebe os pontos do arco, exatamente como a ponta plana de
   arestas-em-grupos.js. Cadeia fechada não tem ponta.

   O QUE É CONFERIDO ANTES DE ESCREVER (nada é escrito se uma conferência falhar): a tampa é plana e as paredes são
   perpendiculares a ela; o raio cabe na altura de cada parede; nenhuma faceta convexa some (o recuo das duas pontas chega ao
   comprimento dela, o que acontece quando o raio passa do raio de curvatura de um trecho convexo); nenhum vértice da tampa cai
   na faixa retirada; a área que a tampa perde é exatamente a da faixa; toda peça da tampa continua com área e convexa (a que
   deixa de ser é partida em convexas); cada painel sai plano e para fora. */

import { grupoCoplanar, indiceDeArestas, newell, naTampa, registraNaTampa, partirEmConvexas } from './arestas-em-grupos.js';
import { painelRegistrado } from './cantos-arredondados.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const tam = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = tam(a); return l > 0 ? mul(a, 1 / l) : a; };
const chave = (p, q) => `${p}:${q}`;
const graus = (rad) => (rad * 180) / Math.PI;
const num = (x) => Number(x.toPrecision(4));

/* o ângulo máximo, em graus, entre arestas consecutivas que ainda contam como continuação em tangência */
export const ATE_PADRAO_DA_CADEIA = 30;

class Falha extends Error {}

/* `cadeia: true` usa o ângulo padrão; `cadeia: { ate: graus }` o escolhe. Devolve { ate } ou { erro }. */
export function lerCadeia(st, cadeia) {
  if (cadeia === true) return { ate: ATE_PADRAO_DA_CADEIA };
  if (cadeia === false) return { ate: null };
  if (cadeia === null || typeof cadeia !== 'object' || Array.isArray(cadeia)) {
    return { erro: `cadeia precisa ser true ou { ate: graus }; recebido ${JSON.stringify(cadeia)}` };
  }
  for (const k of Object.keys(cadeia)) if (k !== 'ate') return { erro: `cadeia tem chave desconhecida '${k}' (só ate: o ângulo máximo, em graus, entre arestas consecutivas da cadeia)` };
  if (cadeia.ate == null) return { ate: ATE_PADRAO_DA_CADEIA };
  let ate;
  try { ate = st.num(cadeia.ate); } catch (e) { return { erro: `cadeia.ate não resolve: ${String(e.message).replace(/^oficina: /, '')}` }; }
  if (typeof ate !== 'number' || !Number.isFinite(ate) || !(ate > 0) || !(ate < 90)) {
    return { erro: `cadeia.ate precisa estar entre 0 e 90 graus (exclusive); recebido ${JSON.stringify(cadeia.ate)}` };
  }
  return { ate };
}

export function criarArestasEmCadeia({ addV, addF, registraOrigem, grita, idDoPasso }) {
  /* A cadeia de arestas de borda do grupo `GA` a partir da aresta dirigida s→t (a tampa a percorre nesse sentido): adiante
     até o canto vivo, depois para trás, ou até fechar o laço. Devolve os vértices em ordem (sem repetir o primeiro no laço). */
  function montar(st, indice, { tampa, s, t }, ate) {
    const pos = (v) => st.V.get(v);
    const GA = grupoCoplanar(st, indice, tampa);
    const cosAte = Math.cos((ate * Math.PI) / 180) - 1e-12;
    const dir = (a, b) => unit(sub(pos(b), pos(a)));
    const vizinho = (v, passo) => {
      const achados = new Map();
      for (const fid of GA) {
        const f = st.F.get(fid);
        const k = f.vs.indexOf(v);
        if (k < 0) continue;
        const w = f.vs[(k + passo + f.vs.length) % f.vs.length];
        const oposta = passo > 0 ? indice.get(chave(w, v)) : indice.get(chave(v, w));
        if (oposta != null && !GA.has(oposta)) achados.set(w, fid);
      }
      return achados;
    };
    const vertices = [s, t];
    let fechada = false;
    let fimDoFim = 'canto', fimDoInicio = 'canto';
    for (;;) {
      const u = vertices[vertices.length - 2], v = vertices[vertices.length - 1];
      const cand = vizinho(v, +1);
      if (cand.size !== 1) { fimDoFim = cand.size ? 'pinca' : 'sem-borda'; break; }
      const w = [...cand.keys()][0];
      if (ponto(dir(u, v), dir(v, w)) < cosAte) break;
      if (w === vertices[0]) {
        if (ponto(dir(v, w), dir(w, vertices[1])) >= cosAte) fechada = true;
        else { vertices.push(w); fimDoFim = 'volta'; }
        break;
      }
      if (vertices.includes(w)) { fimDoFim = 'pinca'; break; }
      vertices.push(w);
    }
    if (!fechada && fimDoFim !== 'volta') {
      for (;;) {
        const v = vertices[0], u = vertices[1];
        const cand = vizinho(v, -1);
        if (cand.size !== 1) { fimDoInicio = cand.size ? 'pinca' : 'sem-borda'; break; }
        const w = [...cand.keys()][0];
        if (ponto(dir(w, v), dir(v, u)) < cosAte) break;
        if (vertices.includes(w)) {
          if (w === vertices[vertices.length - 1]) { vertices.unshift(w); fimDoInicio = 'volta'; } else fimDoInicio = 'pinca';
          break;
        }
        vertices.unshift(w);
      }
    }
    return { GA, vertices, fechada, fimDoInicio, fimDoFim };
  }

  /* devolve 'unica' quando a cadeia é só a aresta (o chamador segue pelo caminho comum), true se escreveu, false depois de gritar */
  function arredondar(st, i, op, p) {
    try {
      return arredondarOuFalhar(st, i, op, p);
    } catch (e) {
      if (!(e instanceof Falha)) throw e;
      grita(st, i, op, e.campo ?? 'cadeia', e.message);
      return false;
    }
  }

  function arredondarOuFalhar(st, i, op, p) {
    const { origemId, v0, v1, faceAId, raio, paineis, ate } = p;
    const falha = (msg, campo = 'cadeia') => { const e = new Falha(msg); e.campo = campo; throw e; };
    const pos = (v) => st.V.get(v);
    const F = (fid) => st.F.get(fid);
    const indice = indiceDeArestas(st);

    /* a tampa é o lado cuja borda continua em tangência: as duas leituras são tentadas e vale a mais longa */
    const faceB0 = indice.get(chave(v1, v0));
    const leituras = [{ tampa: faceAId, s: v0, t: v1 }];
    if (faceB0 != null) leituras.push({ tampa: faceB0, s: v1, t: v0 });
    const cadeias = leituras.map((c) => montar(st, indice, c, ate));
    const tamanho = (c) => (c.fechada ? c.vertices.length : c.vertices.length - 1);
    let escolhida = cadeias[0];
    if (cadeias.length > 1 && (tamanho(cadeias[1]) > tamanho(cadeias[0])
      || (tamanho(cadeias[1]) === tamanho(cadeias[0]) && cadeias[1].GA.size > cadeias[0].GA.size))) escolhida = cadeias[1];
    if (tamanho(escolhida) < 2) return 'unica';

    const { GA, vertices, fechada } = escolhida;
    /* na ordem dos ids, para a numeração das peças que nascem e a mensagem não dependerem de qual aresta da cadeia foi escolhida */
    const GAordenada = [...GA].sort((x, y) => x - y);
    const V = vertices.length;
    const m = fechada ? V : V - 1;
    if (new Set(vertices).size !== V) falha(`a cadeia volta ao próprio vértice num canto vivo (${V} vértices, ${new Set(vertices).size} distintos): arredonde as duas metades em passos separados, cada uma terminando no canto`);
    const nome = (j) => vertices[j % V];
    const emCadeia = new Set(vertices);

    const arestaA = [], faceTampa = [], faceParede = [];
    for (let j = 0; j < m; j++) {
      const a = nome(j), b = nome(j + 1);
      arestaA.push([a, b]);
      faceTampa.push(indice.get(chave(a, b)));
      faceParede.push(indice.get(chave(b, a)));
    }
    const descricaoDaAresta = (j) => `${arestaA[j][0]}-${arestaA[j][1]}`;

    /* a tampa: plana, com a normal para fora; cada parede perpendicular a ela, para fora do lado oposto ao da tampa */
    const nA = unit(newell(pos, F(faceTampa[0]).vs));
    if (!(tam(nA) > 0)) falha(`a tampa da aresta ${descricaoDaAresta(0)} é degenerada`);
    const u = mul(nA, -1);
    const e = [], dA = [], comprimento = [], altura = [];
    for (let j = 0; j < m; j++) {
      const [a, b] = arestaA[j];
      const P = pos(a), Q = pos(b);
      const L = tam(sub(Q, P));
      if (!(L > 1e-12)) falha(`a aresta ${descricaoDaAresta(j)} da cadeia tem comprimento ~0`);
      const ej = mul(sub(Q, P), 1 / L);
      e.push(ej); comprimento.push(L);
      dA.push(unit(cruz(nA, ej)));
      const nB = unit(newell(pos, F(faceParede[j]).vs));
      const esperada = cruz(ej, nA);
      if (ponto(nB, esperada) < 1 - 1e-9) {
        const diedro = 180 - graus(Math.acos(Math.max(-1, Math.min(1, ponto(nA, nB)))));
        falha(`a aresta ${descricaoDaAresta(j)} da cadeia faz diedro de ${num(diedro)}° com a tampa: a cadeia só segue arestas de 90° (parede perpendicular à tampa, como a de uma extrusão reta); arredonde essa aresta sozinha`);
      }
      /* a altura da parede é a do vértice mais raso fora da aresta: a faixa retirada não pode sair pela borda de baixo */
      let h = Infinity;
      for (const v of F(faceParede[j]).vs) if (v !== a && v !== b) h = Math.min(h, -ponto(sub(pos(v), P), nA));
      if (!Number.isFinite(h)) h = 0;
      altura.push(h);
    }

    /* os vértices em torno de cada vértice da cadeia: a tampa, as paredes das duas arestas e, na ponta, uma única face de ponta */
    const facesEm = new Map(vertices.map((v) => [v, []]));
    for (const [fid, f] of st.F) for (const v of f.vs) if (emCadeia.has(v)) facesEm.get(v).push(fid);
    const fora = new Map();
    for (let j = 0; j < V; j++) {
      const v = vertices[j];
      const interior = fechada || (j > 0 && j < V - 1);
      const paredes = interior ? [faceParede[(j - 1 + m) % m], faceParede[j]] : [faceParede[j === 0 ? 0 : m - 1]];
      const outras = facesEm.get(v).filter((fid) => !GA.has(fid) && !paredes.includes(fid));
      if (outras.length) {
        if (interior) falha(`o vértice ${v} da cadeia tem ${outras.length} face(s) além da tampa e das duas paredes: o canto não é uma junção simples de paredes`);
        if (outras.length > 1) falha(`a ponta da cadeia no vértice ${v} tem ${outras.length} faces além da tampa e da parede (canto composto)`);
        if (painelRegistrado(st, outras[0])) falha(`a ponta da cadeia no vértice ${v} encontra um arredondamento feito antes; arredonde a cadeia primeiro e as arestas do canto depois`);
        fora.set(j, outras[0]);
      } else if (!interior) {
        falha(`a ponta da cadeia no vértice ${v} não tem face de ponta`);
      }
    }

    for (let j = 0; j < m; j++) {
      if (!(altura[j] > raio * (1 + 1e-9))) falha(`o raio não cabe: a parede da aresta ${descricaoDaAresta(j)} tem altura ${num(altura[j])} e o raio ${num(raio)} chega ao fim dela`, 'raio');
    }

    /* o anel de cada vértice: n+1 pontos da tampa (k = 0) à parede (k = n) */
    const aneis = [];
    const ponta = [];
    for (let j = 0; j < V; j++) {
      const v = vertices[j];
      const interior = fechada || (j > 0 && j < V - 1);
      const entra = interior ? (j - 1 + m) % m : null;
      const sai = j < m ? j : null;
      let mA;
      let eixoDaPonta = null;
      if (interior) {
        const d1 = dA[entra], d2 = dA[sai];
        mA = mul(soma(d1, d2), 1 / (1 + ponto(d1, d2)));
      } else {
        const k = j === 0 ? 0 : m - 1;
        mA = dA[k];
        eixoDaPonta = e[k];
      }
      const base = pos(v);
      const pts = [];
      for (let k = 0; k <= paineis; k++) {
        const psi = (k / paineis) * (Math.PI / 2);
        const cu = k === 0 ? 0 : k === paineis ? 1 : 1 - Math.cos(psi);
        const cm = k === 0 ? 1 : k === paineis ? 0 : 1 - Math.sin(psi);
        pts.push(soma(base, mul(soma(mul(u, cu), mul(mA, cm)), raio)));
      }
      if (!interior) {
        const f = F(fora.get(j));
        const nC = newell(pos, f.vs);
        const lC = tam(nC);
        if (!(lC > 0)) falha(`a face ${f.id}, de ponta da cadeia no vértice ${v}, é degenerada`);
        const uC = mul(nC, 1 / lC);
        let escala = 0;
        for (const x of f.vs) escala = Math.max(escala, tam(sub(pos(x), pos(f.vs[0]))));
        const tol = 1e-6 * Math.max(1, escala);
        for (const x of f.vs) {
          const d = ponto(sub(pos(x), pos(f.vs[0])), uC);
          if (Math.abs(d) > tol) falha(`a face ${f.id}, de ponta da cadeia no vértice ${v}, não é plana: o canto ${x} está a ${d.toFixed(6)} do plano médio`);
        }
        const cosE = ponto(eixoDaPonta, uC);
        if (Math.abs(cosE) < 0.05) {
          falha(`a ponta da cadeia no vértice ${v} termina numa face quase paralela à aresta (${num(graus(Math.asin(Math.abs(cosE))))}° entre elas): a cadeia deveria seguir por ela em tangência e parou antes; aumente cadeia.ate`);
        }
        /* a ponta fica à vista dos dois sentidos: a conta é a mesma de arestas-em-grupos.js, o anel escorrega ao longo da aresta */
        if (Math.abs(Math.abs(cosE) - 1) >= 1e-9) {
          for (let k = 0; k <= paineis; k++) pts[k] = soma(pts[k], mul(eixoDaPonta, -ponto(sub(pts[k], base), uC) / cosE));
        }
        ponta.push(j);
      }
      aneis.push(pts);
    }

    /* a faceta que some: o recuo das duas pontas chega ao comprimento dela */
    let maisApertado = null;
    for (let j = 0; j < m; j++) {
      const A = aneis[j][0], B = aneis[(j + 1) % V][0];
      const restante = ponto(sub(B, A), e[j]);
      if (!(restante > 1e-9 * comprimento[j])) {
        const noFim = !fechada && (j === 0 || j === m - 1);
        const turno = (idx) => Math.acos(Math.max(-1, Math.min(1, ponto(dA[(idx - 1 + m) % m], dA[idx % m]))));
        const alfa = noFim ? 0 : (turno(j) + turno(j + 1)) / 2;
        const curvatura = alfa > 1e-9 ? comprimento[j] / (2 * Math.sin(alfa / 2)) : Infinity;
        if (!maisApertado || (noFim ? -1 : curvatura) < (maisApertado.noFim ? -1 : maisApertado.curvatura)) maisApertado = { j, curvatura, noFim };
      }
    }
    if (maisApertado) {
      const { j, curvatura, noFim } = maisApertado;
      const causa = noFim
        ? `o raio ${num(raio)} passa do raio de curvatura do trecho convexo que chega à ponta, ou o canto vivo da ponta é agudo demais para ele`
        : `o raio ${num(raio)} passa do raio de curvatura do trecho convexo do contorno${Number.isFinite(curvatura) ? ` (cerca de ${num(curvatura)})` : ''}`;
      falha(`o raio não cabe: a faceta ${descricaoDaAresta(j)} da cadeia some antes de o arredondamento terminar, porque ${causa}; o trecho convexo só admite raio menor que isso`, 'raio');
    }

    /* as posições novas: o vértice anda para a tangência na tampa e nascem os pontos do arco */
    const novaPos = new Map();
    const idsDoAnel = aneis.map(() => []);
    for (let j = 0; j < V; j++) {
      idsDoAnel[j].push(vertices[j]);
      novaPos.set(vertices[j], aneis[j][0]);
      for (let k = 1; k <= paineis; k++) {
        const id = idDoPasso(i, j * paineis + (k - 1));
        idsDoAnel[j].push(id);
        novaPos.set(id, aneis[j][k]);
      }
    }
    const posNova = (v) => novaPos.get(v) ?? pos(v);

    /* a faixa retirada da tampa: nenhum outro vértice da tampa pode cair nela, e a área que a tampa perde é a da faixa */
    const faixaDe = (j) => [pos(arestaA[j][0]), pos(arestaA[j][1]), aneis[(j + 1) % V][0], aneis[j][0]];
    let areaDaFaixa = 0;
    for (let j = 0; j < m; j++) {
      const poli = faixaDe(j);
      const nn = newell((k) => poli[k], [0, 1, 2, 3]);
      const a = ponto(nn, nA) / 2;
      if (!(a > 0)) falha(`o raio não cabe: a faixa da aresta ${descricaoDaAresta(j)} ficaria sem área ou invertida`, 'raio');
      areaDaFaixa += a;
      const escala = Math.max(comprimento[j], raio);
      const tol = 1e-9 * escala;
      const dentro = (x) => {
        for (let k = 0; k < 4; k++) {
          const a0 = poli[k], c = poli[(k + 1) % 4];
          if (!(ponto(cruz(sub(c, a0), sub(x, a0)), nA) > tol * Math.max(tam(sub(c, a0)), escala))) return false;
        }
        return true;
      };
      for (const fid of GAordenada) {
        for (const v of F(fid).vs) {
          if (v === arestaA[j][0] || v === arestaA[j][1]) continue;
          if (dentro(pos(v))) {
            const d = sub(pos(v), poli[0]);
            const longe = tam(sub(d, mul(e[j], ponto(d, e[j]))));
            falha(`o raio não cabe: o vértice ${v} da tampa fica a ${num(longe)} da aresta ${descricaoDaAresta(j)} e a faixa de raio ${num(raio)} chega além dele`, 'raio');
          }
        }
      }
    }

    /* cada peça da tampa tocada continua válida; a que deixa de ser convexa é partida em convexas */
    const tocadas = GAordenada.filter((fid) => F(fid).vs.some((v) => emCadeia.has(v)));
    const partidas = [];
    let antes = 0, depois = 0;
    for (const fid of GAordenada) antes += tam(newell(pos, F(fid).vs)) / 2;
    const concavo = (vs, un, posFn) => {
      for (let k = 0; k < vs.length; k++) {
        const a = posFn(vs[k]), c = posFn(vs[(k + 1) % vs.length]), d = posFn(vs[(k + 2) % vs.length]);
        const t = 1e-7 * tam(sub(c, a)) * tam(sub(d, c));
        if (ponto(cruz(sub(c, a), sub(d, c)), un) < -t) return vs[(k + 1) % vs.length];
      }
      return null;
    };
    for (const fid of GAordenada) {
      const f = F(fid);
      const velha = newell(pos, f.vs);
      const lA = tam(velha);
      const un = mul(velha, 1 / lA);
      if (!tocadas.includes(fid)) { depois += lA / 2; continue; }
      const area = ponto(newell(posNova, f.vs), un);
      if (!(area > 1e-6 * lA)) falha(`o raio não cabe: a peça ${fid} da tampa ficaria sem área ou invertida (área ${(area / 2).toExponential(2)} contra ${(lA / 2).toExponential(2)})`, 'raio');
      if (concavo(f.vs, un, pos) == null) {
        const c = concavo(f.vs, un, posNova);
        if (c != null) {
          const partes = naTampa(st, fid) ? partirEmConvexas(posNova, f.vs, un) : null;
          if (!partes) falha(`o raio não cabe: a peça ${fid} da tampa ficaria côncava (canto ${c})`, 'raio');
          partidas.push([fid, partes]);
          for (const vs of partes) depois += tam(newell(posNova, vs)) / 2;
          continue;
        }
      }
      depois += area / 2;
    }
    if (Math.abs((antes - depois) - areaDaFaixa) > 1e-8 * antes) {
      falha(`o raio não cabe: a faixa de raio ${num(raio)} sai da tampa em outro lugar além da borda da cadeia (a tampa perde ${num(antes - depois)} e a faixa mede ${num(areaDaFaixa)}); há contorno, furo ou vizinho da tampa mais perto que o raio`, 'raio');
    }

    /* as listas novas das paredes e das faces de ponta */
    const novas = new Map();
    const lista = (fid) => novas.get(fid) ?? F(fid).vs;
    for (let j = 0; j < m; j++) {
      const a = nome(j), b = nome(j + 1);
      const wall = faceParede[j];
      novas.set(wall, lista(wall).map((x) => (x === a ? idsDoAnel[j % V][paineis] : x === b ? idsDoAnel[(j + 1) % V][paineis] : x)));
    }
    for (const j of ponta) {
      const f = fora.get(j);
      const ids = idsDoAnel[j];
      const v = vertices[j];
      const inicio = j === 0;
      novas.set(f, lista(f).flatMap((x) => (x === v ? (inicio ? [...ids.slice(1).reverse(), v] : [v, ...ids.slice(1)]) : [x])));
    }
    /* a face de ponta continua com área positiva e convexa; a parede continua um quadrilátero com altura */
    for (const [fid, nova] of novas) {
      const f = F(fid);
      const velha = newell(pos, f.vs);
      const lA = tam(velha);
      const un = mul(velha, 1 / lA);
      const area = ponto(newell(posNova, nova), un);
      if (!(area > 1e-6 * lA)) falha(`o raio não cabe: a face ${fid} ficaria sem área ou invertida (área ${(area / 2).toExponential(2)} contra ${(lA / 2).toExponential(2)})`, 'raio');
      if (concavo(f.vs, un, pos) == null && concavo(nova, un, posNova) != null) {
        falha(`o raio não cabe: a face ${fid} ficaria côncava (canto ${concavo(nova, un, posNova)})`, 'raio');
      }
    }

    /* cada painel: plano, com área e para fora do eixo do cilindro da aresta */
    const quadrilateros = [];
    for (let j = 0; j < m; j++) {
      const P = idsDoAnel[j], Q = idsDoAnel[(j + 1) % V];
      const eixoPonto = soma(pos(arestaA[j][0]), mul(soma(dA[j], u), raio));
      for (let k = 1; k <= paineis; k++) {
        const vs = [P[k], Q[k], Q[k - 1], P[k - 1]];
        const nn = newell(posNova, vs);
        const lado = Math.max(tam(sub(posNova(vs[0]), posNova(vs[1]))), tam(sub(posNova(vs[1]), posNova(vs[2]))));
        if (!(tam(nn) > 1e-12 * Math.max(1, lado * lado))) falha(`o raio não cabe: o painel ${k} da aresta ${descricaoDaAresta(j)} ficaria sem área`, 'raio');
        const p0 = posNova(vs[0]);
        let desvio = 0;
        const un = unit(nn);
        for (const x of vs) desvio = Math.max(desvio, Math.abs(ponto(sub(posNova(x), p0), un)));
        if (desvio > 1e-7 * Math.max(lado, raio)) falha(`o painel ${k} da aresta ${descricaoDaAresta(j)} ficaria fora do plano (${num(desvio)})`);
        const centro = mul(vs.reduce((c, x) => soma(c, posNova(x)), [0, 0, 0]), 0.25);
        const d = sub(centro, eixoPonto);
        const radial = sub(d, mul(e[j], ponto(d, e[j])));
        if (!(ponto(nn, radial) > 0)) falha(`o painel ${k} da aresta ${descricaoDaAresta(j)} ficaria virado para dentro`);
        quadrilateros.push([j, k, vs]);
      }
    }

    /* tudo conferido: escreve */
    for (let j = 0; j < V; j++) {
      st.V.set(vertices[j], aneis[j][0]);
      for (let k = 1; k <= paineis; k++) addV(st, idsDoAnel[j][k], aneis[j][k]);
    }
    const idsDosPaineis = [];
    for (const [j, k, vs] of quadrilateros) {
      const id = idDoPasso(i, j * paineis + (k - 1));
      addF(st, id, vs);
      const painel = st.F.get(id), A = F(faceTampa[j]);
      painel.cor = A.cor; painel.material = A.material; painel.parte = A.parte;
      painel.liso = A.liso; painel.solido = A.solido;
      idsDosPaineis.push(id);
    }
    for (const [fid, nova] of novas) F(fid).vs = nova;
    let proximo = m * paineis;
    for (const [fid, partes] of partidas) {
      F(fid).vs = partes[0];
      for (const vs of partes.slice(1)) {
        const id = idDoPasso(i, proximo++);
        addF(st, id, vs);
        const nova = st.F.get(id), mae = F(fid);
        nova.cor = mae.cor; nova.material = mae.material; nova.parte = mae.parte;
        nova.liso = mae.liso; nova.solido = mae.solido; nova.tinta = [...(mae.tinta ?? [])];
        registraNaTampa(st, fid, id);
      }
    }
    registraOrigem(st, i, op, origemId, { paineis: idsDosPaineis, cadeia: { arestas: m, paineisPorAresta: paineis, fechada, ate } });
    return true;
  }

  return { arredondar };
}
