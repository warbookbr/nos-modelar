/* arestas-em-grupos.js — arredondar ou chanfrar uma aresta cujo lado é uma face PARTIDA em várias coplanares.

   A tampa de um perfil com furo ou de um contorno por trechos sai da extrusão como várias peças convexas coplanares
   (pedacos-convexos.js), e o leque de peças que chega a cada canto da borda foge ao que `arredondarAresta` e `filete`
   aceitam: três faces por ponta. Aqui as faces coplanares que se tocam por aresta contam como UMA face só (o grupo), e
   a aresta é tratada contra o grupo inteiro.

   O QUE MUDA NA MALHA. Cada ponta da aresta (v0, v1) é um vértice cercado por um leque do grupo de um lado, um leque do
   grupo do outro lado e UMA face de ponta (C em v0, D em v1) entre os dois. Como na costura simples, o vértice anda para
   a tangência do lado A (mesmo id, e com ele todo o leque do grupo A) e nasce o gêmeo do lado B (todo o leque do grupo B
   passa a usá-lo). A face de ponta ganha os pontos do arco. O que muda em relação à costura simples é onde a tangência
   cai: o vértice não anda perpendicular à aresta, anda até o plano da face de ponta ao longo da própria aresta
   (a direção do eixo), de modo que a face de ponta continua plana mesmo quando a quina dela com a aresta não é de 90°.
   Numa quina de 90° as duas contas coincidem.

   O QUE É CONFERIDO ANTES DE ESCREVER (nada é escrito se uma conferência falhar): a ponta é fechada por uma única face
   além dos dois grupos; a face de ponta é plana; nenhum vértice dos grupos cai na faixa que o arredondamento retira;
   toda face tocada continua com a área do mesmo sinal, e convexa se era convexa. Raio que não cabe, canto composto e
   ponta complexa gritam com a causa.

   O CANTO. Quando a face de ponta é o painel de uma faixa arredondada ou chanfrada por outra chamada (ou são dois painéis,
   um de cada faixa), a ponta não é plana e o arco novo não cabe nela: o canto é remate de dois ou de três e cantos-arredondados.js
   devolve o plano da ponta (o anel compartilhado com a faixa antiga, escorregado até a esquadria). Este arquivo escreve esse
   plano com a mesma conferência das pontas planas e, em canto de remate, confere também que toda face plana continua plana.

   TRÊS CASOS QUE ESTE ARQUIVO TAMBÉM ATENDE (arredondar-chapa-furada.test.ts).
   Ponta em leque: a ponta ao longo da espessura de uma chapa com furos é a outra tampa, triangulada em leque (dezenas de
   faces em torno do vértice). As faces dela em torno do vértice vão de A até B; a vizinha de B recebe os pontos do arco e as
   outras só levam o vértice à tangência.
   Peça côncava: a peça de tampa convexa que a quina quase reta deixa côncava ao mover as pontas é partida em peças convexas
   (ear clipping e fusão de Hertel e Mehlhorn), que entram na tampa registrada na extrusão. Só o que se atravessa ou se
   inverte é recusado.
   Ponta oblíqua: quando a face de ponta é quase paralela à aresta, o escorregamento do anel até o plano dela passa muito além
   da face e o recuo cai sobre vértices do contorno. Só depois de o modo comum recusar, o arco termina na seção perpendicular
   (modo 'degrau'): o vértice velho continua como canto, a tampa ganha o triângulo canto-vizinho-tangência, e um degrau plano,
   em leque a partir do canto, fecha o fim do arco. A área que a tampa perde é conferida contra a da faixa retirada, o que pega
   o contorno que volta sobre a faixa. */

import { painelRegistrado, remateDeDois, remateDeTres } from './cantos-arredondados.js';
import { pedacosConvexos } from '../pedacos-convexos.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const tam = (a) => Math.hypot(a[0], a[1], a[2]);

/* normal bruta (módulo = 2 × área) pela soma de Newell, no sentido anti-horário */
function newell(pos, ids) {
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < ids.length; k++) {
    const c = pos(ids[k]), n = pos(ids[(k + 1) % ids.length]);
    nx += (c[1] - n[1]) * (c[2] + n[2]);
    ny += (c[2] - n[2]) * (c[0] + n[0]);
    nz += (c[0] - n[0]) * (c[1] + n[1]);
  }
  return [nx, ny, nz];
}

const chave = (p, q) => `${p}:${q}`;

/* a recusa com a causa: lançada dentro de `costurar` e apanhada na própria `costurar`, que tenta o degrau antes de gritar */
class Falha extends Error {}

/* O aviso de um arredondamento (ou chanfro) que terminou em degrau. `pontasEmDegrau` traz [nome da ponta, plano, ponta]; o ângulo
   que a face vizinha faz com a aresta vem de `cosDaPonta`. O texto vale para qualquer operação que passe pela costura. */
function avisoDeDegrau({ i, op, origemId, v0, v1, P, Q, e, raio, pontasEmDegrau, cosDaPonta, degraus }) {
  const arred = (x) => Number(x.toPrecision(5));
  const nomes = pontasEmDegrau.map(([nome]) => nome);
  const angulos = pontasEmDegrau.map(([, , ponta]) => Number((Math.asin(Math.min(1, cosDaPonta(ponta))) * 180 / Math.PI).toPrecision(3)));
  const alvo = `${op}:${origemId}`;
  const ondeFica = nomes.length === 2 ? 'nas duas pontas' : `na ponta ${nomes[0]}`;
  return {
    passo: i,
    op,
    ref: 'degrau',
    origemId,
    aresta: { vertices: [v0, v1], de: P.map(arred), ate: Q.map(arred), direcao: e.map((x) => Number(x.toFixed(6))) },
    pontas: nomes,
    anguloDaFaceVizinha: angulos.length === 1 ? angulos[0] : angulos,
    degraus,
    motivo: `o ${op} da origem ${alvo} (aresta ${v0}-${v1}, de [${P.map(arred).join(', ')}] a [${Q.map(arred).join(', ')}]) terminou em degrau ${ondeFica}: a face vizinha continua a aresta em tangência (dobra só ${angulos.join('° e ')}° em relação a ela), o arco não cabe no plano dela e termina na seção perpendicular, onde um degrau plano de ${degraus.length} face(s) fecha o fim. A peça fecha, mas o arredondamento acaba numa quina visível.`,
    sugestao: `arredonde a cadeia que continua em tangência numa chamada só, com cadeia: { ate: 30 } no mesmo passo (a varredura segue as facetas até o canto vivo, sem degrau), ou termine a aresta num canto vivo em vez de num trecho em curva${raio != null ? ` (raio ${raio})` : ''}.`,
  };
}

/* O lugar da tampa, no registro de origem de uma extrusão, que guarda esta peça: { tampas, nome } ou null quando a face não
   é peça de tampa registrada. A tampa é uma face só ou uma lista de peças. */
function lugarDaTampa(st, fid) {
  for (const registros of st.origens.values()) {
    for (const r of registros) {
      if (!r.tampas || typeof r.tampas !== 'object') continue;
      for (const [nome, lista] of Object.entries(r.tampas)) {
        if (lista === fid || (Array.isArray(lista) && lista.includes(fid))) return { tampas: r.tampas, nome };
      }
    }
  }
  return null;
}
const naTampa = (st, fid) => lugarDaTampa(st, fid) != null;
/* Peça nova que nasce de uma peça de tampa entra na tampa da extrusão, para continuar nela e na parte que a cita. */
function registraNaTampa(st, pai, nova) {
  const lugar = lugarDaTampa(st, pai);
  if (!lugar) return;
  const { tampas, nome } = lugar;
  tampas[nome] = Array.isArray(tampas[nome]) ? [...tampas[nome], nova] : [tampas[nome], nova];
}

/* Parte um polígono plano que deixou de ser convexo em peças convexas, sem mexer na fronteira: ele é cortado em
   triângulos pelas orelhas (só as de área positiva, para o canto de uma quina quase reta continuar com os dois lados) e os
   triângulos se fundem de novo enquanto o resultado é convexo (pedacos-convexos.js). `un` é a normal unitária do sentido
   de percurso e `pos(id)` a posição do canto. Devolve a lista de listas de ids, ou null se o polígono não é simples. */
function partirEmConvexas(pos, vs, un) {
  const P = vs.map(pos);
  let escala = 0;
  for (const q of P) escala = Math.max(escala, tam(sub(q, P[0])));
  const piso = 1e-9 * escala * escala;
  const giro = (a, b, c) => ponto(cruz(sub(P[b], P[a]), sub(P[c], P[b])), un);
  const dentroOuNaBorda = (a, b, c, x) => {
    const t = 1e-9 * escala;
    for (const [u, w] of [[a, b], [b, c], [c, a]]) {
      const e = sub(P[w], P[u]);
      if (ponto(cruz(e, sub(P[x], P[u])), un) < -t * tam(e)) return false;
    }
    return true;
  };
  let resto = vs.map((_, k) => k);
  const triangulos = [];
  while (resto.length > 3) {
    const m = resto.length;
    let orelha = -1;
    for (let k = 0; k < m && orelha < 0; k++) {
      const a = resto[(k - 1 + m) % m], b = resto[k], c = resto[(k + 1) % m];
      if (!(giro(a, b, c) > piso)) continue;
      if (resto.some((x) => x !== a && x !== b && x !== c && dentroOuNaBorda(a, b, c, x))) continue;
      orelha = k;
    }
    if (orelha < 0) return null;
    triangulos.push([resto[(orelha - 1 + m) % m], resto[orelha], resto[(orelha + 1) % m]]);
    resto = resto.filter((_, k) => k !== orelha);
  }
  if (!(giro(resto[0], resto[1], resto[2]) > piso)) return null;
  triangulos.push(resto);
  const pecas = pedacosConvexos((id) => pos(id), triangulos.map((t) => t.map((k) => vs[k])), un);
  return pecas;
}

/* a face que percorre a aresta p→q, por (p,q): numa malha fechada, a vizinha de quem percorre q→p */
export function indiceDeArestas(st) {
  const m = new Map();
  for (const [fid, f] of st.F) {
    for (let k = 0; k < f.vs.length; k++) m.set(chave(f.vs[k], f.vs[(k + 1) % f.vs.length]), fid);
  }
  return m;
}

/* As faces que se tocam por aresta e estão no mesmo plano da semente, com a mesma orientação. Um canto fora do plano
   por mais de 1e-6 (mínimo de 1 unidade de escala) tira a face do grupo. */
export function grupoCoplanar(st, indice, semente) {
  const pos = (v) => st.V.get(v);
  const f0 = st.F.get(semente);
  const n0 = newell(pos, f0.vs);
  const l0 = tam(n0);
  const grupo = new Set([semente]);
  if (!(l0 > 0)) return grupo;
  const u0 = mul(n0, 1 / l0);
  const p0 = pos(f0.vs[0]);
  let escala = 0;
  for (const v of f0.vs) escala = Math.max(escala, tam(sub(pos(v), p0)));
  const tol = 1e-6 * Math.max(1, escala);
  const coplanar = (fid) => {
    const f = st.F.get(fid);
    if (f.vs.some((v) => !pos(v))) return false;
    if (ponto(newell(pos, f.vs), u0) < 0) return false;
    return f.vs.every((v) => Math.abs(ponto(sub(pos(v), p0), u0)) <= tol);
  };
  const fila = [semente];
  while (fila.length) {
    const f = st.F.get(fila.pop());
    for (let k = 0; k < f.vs.length; k++) {
      const viz = indice.get(chave(f.vs[(k + 1) % f.vs.length], f.vs[k]));
      if (viz == null || grupo.has(viz)) continue;
      if (coplanar(viz)) { grupo.add(viz); fila.push(viz); }
    }
  }
  return grupo;
}

export function criarArestasEmGrupos({ addV, addF, registraOrigem, grita }) {
  /* O leque de um grupo em torno de um vértice, andando de uma face-semente até a primeira face fora do grupo.
     `proximo(f)` devolve a face do outro lado da aresta de saída de f. */
  function andarLeque(st, grupo, semente, vizinha) {
    const faces = [];
    let f = semente;
    for (;;) {
      if (faces.includes(f)) return null;
      faces.push(f);
      const g = vizinha(st.F.get(f));
      if (g == null) return null;
      if (!grupo.has(g)) return { faces, fora: g };
      f = g;
    }
  }

  /* p.anel(base) devolve os n+1 pontos do arco (ou do chanfro) numa seção perpendicular à aresta que passa por base,
     do lado A ao lado B. Devolve true quando escreveu e false depois de gritar. */
  function costurar(st, i, op, p) {
    try {
      costurarOuFalhar(st, i, op, p);
      return true;
    } catch (e) {
      if (!(e instanceof Falha)) throw e;
      grita(st, i, op, 'aresta', e.message);
      return false;
    }
  }

  function costurarOuFalhar(st, i, op, p) {
    const { b, origemId, faceAId, faceBId, v0, v1, e, paineis, anel, GA, GB, indice } = p;
    const pos = (v) => st.V.get(v);
    const F = (fid) => st.F.get(fid);
    const antes = (f, v) => f.vs[(f.vs.indexOf(v) - 1 + f.vs.length) % f.vs.length];
    const depois = (f, v) => f.vs[(f.vs.indexOf(v) + 1) % f.vs.length];
    const falha = (msg) => { throw new Falha(msg); };

    /* Os cantos de uma tampa partida em leque em torno de v: da face de ponta vizinha de A até a vizinha de B, andando de
       face em face pela aresta que sai de v. Todas no plano da tampa, e a última é a vizinha de B. Null se não fecha. */
    const lequeDaTampa = (v, daA, daB) => {
      const tampa = grupoCoplanar(st, indice, daA);
      if (!tampa.has(daB)) return null;
      const faces = [];
      let atual = daA, veio = faceAId;
      for (;;) {
        if (faces.includes(atual)) return null;
        faces.push(atual);
        if (atual === daB) return faces;
        const f = F(atual);
        const entrada = indice.get(chave(v, antes(f, v)));
        const saida = indice.get(chave(depois(f, v), v));
        const proxima = entrada === veio ? saida : saida === veio ? entrada : null;
        if (proxima == null || !tampa.has(proxima)) return null;
        veio = atual;
        atual = proxima;
      }
    };

    /* as duas pontas: leque de A, leque de B e a face de ponta, que precisa ser a mesma dos dois lados. Em v0 a face A
       sai pela aresta que chega a v0 e a B pela que sai de v0; em v1 é o contrário. Quando a face de ponta é o painel de
       uma faixa arredondada antes, o canto é de remate (cantos-arredondados.js): com dois painéis diferentes entre os
       leques, é o canto de três arestas. Quando a ponta é a tampa partida em leque (a chapa com furos vista de cima, com
       a aresta ao longo da espessura), as faces da tampa em torno do vértice formam um leque de A até B: a última, a
       vizinha de B, recebe os pontos do arco e as outras só levam o vértice para a tangência. */
    const ponta = (nome, v, chaveA, chaveB) => {
      const la = andarLeque(st, GA, faceAId, (f) => indice.get(chaveA(f, v)));
      const lb = andarLeque(st, GB, faceBId, (f) => indice.get(chaveB(f, v)));
      const msg = `a ponta ${nome} da aresta não fecha com uma única face entre a tampa de ${GA.size} face(s) e a de ${GB.size}: o canto tem outras faces ao redor (canto composto)`;
      if (!la || !lb) return falha(msg);
      if (la.fora === lb.fora) {
        return { A: la.faces, B: lb.faces, fora: la.fora, tipo: painelRegistrado(st, la.fora) ? 'dois' : 'plano' };
      }
      if (!painelRegistrado(st, la.fora) && !painelRegistrado(st, lb.fora)) {
        const tampa = lequeDaTampa(v, la.fora, lb.fora);
        if (tampa) return { A: la.faces, B: lb.faces, fora: lb.fora, tampa, tipo: 'plano' };
      }
      if (painelRegistrado(st, la.fora) && painelRegistrado(st, lb.fora)) {
        return { A: la.faces, B: lb.faces, foraA: la.fora, foraB: lb.fora, tipo: 'tres' };
      }
      return falha(msg);
    };
    const p0 = ponta('v0', v0, (f, v) => chave(v, antes(f, v)), (f, v) => chave(depois(f, v), v));
    const p1 = ponta('v1', v1, (f, v) => chave(depois(f, v), v), (f, v) => chave(v, antes(f, v)));

    /* o cosseno do ângulo entre a aresta e a normal da face de ponta: 1 quando a ponta é reta (a seção já está no plano) */
    const cosDaPonta = (ponta) => {
      const nC = newell(pos, F(ponta.fora).vs);
      const lC = tam(nC);
      return lC > 0 ? Math.abs(ponto(e, mul(nC, 1 / lC))) : 0;
    };
    /* A ponta que o degrau atende: face de ponta única e plana, oblíqua à aresta. */
    const oblíqua = (ponta) => ponta.tipo === 'plano' && !ponta.tampa && cosDaPonta(ponta) < 1 - 1e-9 && cosDaPonta(ponta) > 1e-6;

    /* a posição do vértice e a normal a que o canto de remate responde são as da malha ANTES de escrever */
    const P = pos(v0), Q = pos(v1);
    /* os ids dos vértices que nascem em cada ponta: os do lado de v0 em b + 2(k-1) e os do lado de v1 logo depois; o
       vértice que o degrau deixa no canto velho nasce depois deles, em b + 2n */
    const novoId = (nome, k) => b + (k - 1) * 2 + (nome === 'v0' ? 0 : 1);
    const idPonta = (nome, v) => {
      const ids = [v];
      for (let k = 1; k <= paineis; k++) ids.push(novoId(nome, k));
      return ids;
    };
    const idDoCanto = (nome) => b + 2 * paineis + (nome === 'v0' ? 0 : 1);
    const ctx = { st, pos, indice, GA, GB, e, paineis, anel, novoId };

    /* onde cada ponto do anel cai: na seção perpendicular, escorregado ao longo de e até o plano da face de ponta */
    const noPlano = (fora, base, pontos, nome) => {
      const f = F(fora);
      const nC = newell(pos, f.vs);
      const lC = tam(nC);
      if (!(lC > 0)) return falha(`a face ${fora}, de ponta ${nome}, é degenerada`);
      const uC = mul(nC, 1 / lC);
      let escala = 0;
      for (const v of f.vs) escala = Math.max(escala, tam(sub(pos(v), pos(f.vs[0]))));
      const tol = 1e-6 * Math.max(1, escala);
      for (const v of f.vs) {
        const d = ponto(sub(pos(v), pos(f.vs[0])), uC);
        if (Math.abs(d) > tol) return falha(`a face ${fora}, de ponta ${nome}, não é plana: o canto ${v} está a ${d.toFixed(6)} do plano médio`);
      }
      const cosE = ponto(e, uC);
      if (Math.abs(cosE) < 1e-6) return falha(`a face ${fora}, de ponta ${nome}, é paralela à aresta: não há onde apoiar o arco`);
      /* quina de 90°: a seção já está no plano da ponta e a conta fica como na costura simples */
      if (Math.abs(Math.abs(cosE) - 1) < 1e-9) return pontos;
      return pontos.map((x) => soma(x, mul(e, -ponto(sub(x, base), uC) / cosE)));
    };

    /* o plano de cada ponta: o anel (ids e pontos, do lado A ao B), o que nasce, o que anda, as listas de cantos que
       mudam (fase 'B': as faces do leque; fase 'fora': as de ponta), as faces que nascem e os vértices que a conferência
       da faixa ignora. No modo 'degrau', a ponta oblíqua não leva o anel para o plano dela (a conta de escorregar ao longo
       da aresta passa muito além da face quando ela é quase paralela à aresta): o anel fica na seção perpendicular e o
       canto velho, que continua onde estava, fecha o que sobra com a tampa e com um degrau plano. */
    const planejar = (nome, v, ponta, base, modo) => {
      if (ponta.tipo === 'dois' || ponta.tipo === 'tres') {
        const plano = ponta.tipo === 'dois' ? remateDeDois(ctx, nome, v, ponta) : remateDeTres(ctx, nome, v, ponta);
        if (plano.erro) return falha(`o canto da ponta ${nome} não fecha: ${plano.erro}`);
        return plano;
      }
      const ids = idPonta(nome, v);
      if (modo === 'degrau') {
        const aneis = anel(base);
        const fora = F(ponta.fora);
        const vizinhoDeA = nome === 'v0' ? depois(fora, v) : antes(fora, v);
        const vizinhoDeB = nome === 'v0' ? antes(fora, v) : depois(fora, v);
        const ultimoA = ponta.A[ponta.A.length - 1], ultimoB = ponta.B[ponta.B.length - 1];
        const tampaEmA = naTampa(st, ultimoA);
        if (!tampaEmA && !naTampa(st, ultimoB)) return falha(`a ponta ${nome} é oblíqua e o degrau do arredondamento precisa de um lado que seja peça da tampa de uma extrusão, e nenhum dos lados é`);
        const pai = tampaEmA ? ultimoA : ultimoB;
        const vizinhoDaTampa = tampaEmA ? vizinhoDeA : vizinhoDeB;
        /* o que substitui v na face de ponta, do lado de B ao lado de A em v0 e ao contrário em v1: o canto velho junto do
           vizinho que fica na tampa e a tangência que sobe a parede junto do outro */
        const canto = idDoCanto(nome);
        const tangenciaDaTampa = tampaEmA ? v : ids[paineis];
        const corrente = nome === 'v0'
          ? (tampaEmA ? [ids[paineis], canto] : [canto, v])
          : (tampaEmA ? [canto, ids[paineis]] : [v, canto]);
        const sentido = nome === 'v0' ? 1 : -1;
        const degrau = [];
        for (let k = 0; k < paineis; k++) degrau.push(nome === 'v0' ? [ids[k + 1], ids[k], canto] : [ids[k], ids[k + 1], canto]);
        return {
          tipo: 'degrau',
          tampaEm: tampaEmA ? 'A' : 'B',
          ring: ids,
          pos: aneis,
          novos: [...ids.slice(1).map((id, k) => [id, aneis[k + 1]]), [canto, pos(v)]],
          mover: [[v, aneis[0]]],
          ignorar: new Set(),
          validar: ponta.A,
          edicoes: [
            { fase: 'B', fids: ponta.B, fn: (vs) => vs.map((x) => (x === v ? ids[paineis] : x)) },
            { fase: 'fora', fids: [ponta.fora], fn: (vs) => vs.flatMap((x) => (x === v ? corrente : [x])) },
          ],
          faces: [
            { vs: [vizinhoDaTampa, canto, tangenciaDaTampa], de: pai, destino: 'tampa', normal: null },
            ...degrau.map((vs) => ({ vs, de: faceAId, destino: 'degrau', normal: mul(e, sentido) })),
          ],
        };
      }
      const aneis = noPlano(ponta.fora, base, anel(base), nome);
      return {
        tipo: 'plano',
        ring: ids,
        pos: aneis,
        novos: ids.slice(1).map((id, k) => [id, aneis[k + 1]]),
        mover: [[v, aneis[0]]],
        ignorar: new Set(),
        validar: [...ponta.A, ...(ponta.tampa ?? []).filter((f) => f !== ponta.fora)],
        edicoes: [
          { fase: 'B', fids: ponta.B, fn: (vs) => vs.map((x) => (x === v ? ids[paineis] : x)) },
          {
            fase: 'fora',
            fids: [ponta.fora],
            fn: nome === 'v0'
              ? (vs) => vs.flatMap((x) => (x === v ? [...ids.slice(1).reverse(), v] : [x]))
              : (vs) => vs.flatMap((x) => (x === v ? [v, ...ids.slice(1)] : [x])),
          },
        ],
        faces: [],
      };
    };

    /* a conferência inteira e a escrita adiada: devolve a função que escreve, ou lança Falha sem ter escrito nada */
    const tentativa = (modo0, modo1) => {
      const plano0 = planejar('v0', v0, p0, P, modo0);
      const plano1 = planejar('v1', v1, p1, Q, modo1);
      const comRemate = plano0.tipo !== 'plano' || plano1.tipo !== 'plano';

      /* a nova lista de cantos de cada face tocada e as posições novas */
      const idP = plano0.ring, idQ = plano1.ring;
      const novaPos = new Map();
      for (const plano of [plano0, plano1]) {
        for (const [id, x] of plano.mover) novaPos.set(id, x);
        for (const [id, x] of plano.novos) novaPos.set(id, x);
      }
      const posNova = (v) => novaPos.get(v) ?? pos(v);
      const listas = new Map();
      const lista = (fid) => listas.get(fid) ?? F(fid).vs;
      for (const fid of [...plano0.validar, ...plano1.validar]) listas.set(fid, F(fid).vs);
      for (const fase of ['B', 'fora']) {
        for (const plano of [plano0, plano1]) {
          for (const ed of plano.edicoes) {
            if (ed.fase === fase) for (const fid of ed.fids) listas.set(fid, ed.fn(lista(fid)));
          }
        }
      }

      /* nenhum vértice dos grupos pode cair na faixa que sai: o raio não cabe nesse caso */
      const ignorados = new Set([...plano0.ignorar, ...plano1.ignorar]);
      const faixa = (grupo, nome, extremoP, extremoQ) => {
        const poli = [P, Q, extremoQ, extremoP];
        const nT = newell((k) => poli[k], [0, 1, 2, 3]);
        const lT = tam(nT);
        if (!(lT > 0)) return falha(`a faixa do lado ${nome} é degenerada`);
        const uT = mul(nT, 1 / lT);
        let escala = 0;
        for (const q of poli) escala = Math.max(escala, tam(sub(q, P)));
        const tol = 1e-8 * Math.max(1, escala);
        const dentro = (x) => {
          for (let k = 0; k < 4; k++) {
            const a = poli[k], c = poli[(k + 1) % 4];
            if (ponto(cruz(sub(c, a), sub(x, a)), uT) < -tol * Math.max(1, tam(sub(c, a)))) return false;
          }
          return true;
        };
        for (const fid of grupo) {
          for (const v of F(fid).vs) {
            if (v === v0 || v === v1 || ignorados.has(v)) continue;
            if (dentro(pos(v))) {
              const d = sub(pos(v), P);
              const fora = tam(sub(d, mul(e, ponto(d, e))));
              return falha(`o raio não cabe: o vértice ${v} (face ${fid}, lado ${nome}) fica a ${Number(fora.toPrecision(3))} da aresta e ${p.recuoTexto} chega além dele`);
            }
          }
        }
        return true;
      };
      faixa(GA, 'A', plano0.pos[0], plano1.pos[0]);
      faixa(GB, 'B', plano0.pos[paineis], plano1.pos[paineis]);

      /* cada face tocada continua válida; no canto de remate, também plana se era plana. Uma peça de tampa convexa que
         uma quina quase reta deixa côncava é partida em peças convexas, e só o que se atravessa ou inverte é recusado. */
      const desvioDoPlano = (posFn, vs) => {
        const nn = newell(posFn, vs);
        const l = tam(nn);
        if (!(l > 0)) return 0;
        const u = mul(nn, 1 / l);
        const p0v = posFn(vs[0]);
        return Math.max(...vs.map((x) => Math.abs(ponto(sub(posFn(x), p0v), u))));
      };
      const partidas = [];
      for (const [fid, nova] of listas) {
        const f = F(fid);
        const antiga = newell(pos, f.vs);
        const lA = tam(antiga);
        const depoisN = newell(posNova, nova);
        const un = mul(antiga, 1 / lA);
        const area = ponto(depoisN, un);
        if (!(area > 1e-6 * lA)) return falha(`o raio não cabe: a face ${fid} ficaria sem área ou invertida (área ${(area / 2).toExponential(2)} contra ${(lA / 2).toExponential(2)})`);
        const eraConvexa = (() => {
          for (let k = 0; k < f.vs.length; k++) {
            const a = pos(f.vs[k]), c = pos(f.vs[(k + 1) % f.vs.length]), d = pos(f.vs[(k + 2) % f.vs.length]);
            const t = 1e-7 * tam(sub(c, a)) * tam(sub(d, c));
            if (ponto(cruz(sub(c, a), sub(d, c)), un) < -t) return false;
          }
          return true;
        })();
        if (eraConvexa) {
          let concavo = null;
          for (let k = 0; k < nova.length && concavo == null; k++) {
            const a = posNova(nova[k]), c = posNova(nova[(k + 1) % nova.length]), d = posNova(nova[(k + 2) % nova.length]);
            const t = 1e-7 * tam(sub(c, a)) * tam(sub(d, c));
            if (ponto(cruz(sub(c, a), sub(d, c)), un) < -t) concavo = nova[(k + 1) % nova.length];
          }
          if (concavo != null) {
            const partes = naTampa(st, fid) ? partirEmConvexas(posNova, nova, un) : null;
            if (!partes) return falha(`o raio não cabe: a face ${fid} ficaria côncava (canto ${concavo})`);
            partidas.push([fid, partes]);
          }
        }
        if (comRemate) {
          let escala = 0;
          for (const x of f.vs) escala = Math.max(escala, tam(sub(pos(x), pos(f.vs[0]))));
          const tolPlano = 1e-7 * Math.max(1, escala);
          const depoisDev = desvioDoPlano(posNova, nova);
          if (desvioDoPlano(pos, f.vs) <= tolPlano && depoisDev > tolPlano) {
            return falha(`o canto deixaria a face ${fid} fora do plano (${Number((depoisDev * 1000).toPrecision(3))} mm)`);
          }
        }
      }
      if (comRemate) {
        /* a faixa nova: cada painel precisa ficar plano, com área e no sentido da face A */
        for (let k = 1; k <= paineis; k++) {
          const vs = [idP[k], idQ[k], idQ[k - 1], idP[k - 1]];
          const nn = newell(posNova, vs);
          const lado = Math.max(tam(sub(posNova(vs[0]), posNova(vs[1]))), tam(sub(posNova(vs[1]), posNova(vs[2]))));
          if (!(tam(nn) > 1e-12 * Math.max(1, lado))) return falha(`o raio não cabe: o painel ${k} da faixa nova ficaria sem área`);
          if (desvioDoPlano(posNova, vs) > 1e-7 * Math.max(1, lado)) return falha(`o raio não cabe: o painel ${k} da faixa nova ficaria fora do plano`);
        }
      }

      /* as faces que o degrau acrescenta: a tampa que fecha o canto velho e o degrau plano que fecha o fim do arco, cada
         uma no sentido da normal esperada (a da peça de tampa; a do eixo, para fora da faixa) */
      const novasFaces = [];
      for (const plano of [plano0, plano1]) {
        for (const nf of plano.faces ?? []) {
          let vs = nf.vs;
          const nn = newell(posNova, vs);
          const esperada = nf.normal ?? newell(pos, F(nf.de).vs);
          if (ponto(nn, esperada) < 0) vs = [...vs].reverse();
          const lado = Math.max(...vs.map((x, k) => tam(sub(posNova(x), posNova(vs[(k + 1) % vs.length])))));
          if (!(tam(nn) > 1e-12 * Math.max(1, lado * lado))) return falha('o raio não cabe: o degrau da ponta oblíqua ficaria sem área');
          novasFaces.push({ vs, de: nf.de, destino: nf.destino });
        }
      }

      /* a tampa que o degrau reparte: a área que ela perde tem de ser exatamente a da faixa retirada. Peças que se
         atravessam ou se invertem pelo deslocamento do vértice tinham área positiva cada uma e ainda assim o total
         não fecharia; esta conta é o que pega esse caso. */
      const comDegrau = [plano0, plano1].filter((pl) => pl.tipo === 'degrau');
      if (comDegrau.length) {
        const lados = new Set(comDegrau.map((pl) => pl.tampaEm));
        if (lados.size !== 1) return falha('o degrau das duas pontas pede a tampa do mesmo lado da aresta');
        const ladoA = comDegrau[0].tampaEm === 'A';
        const grupo = ladoA ? GA : GB;
        const areaDe = (posFn, vs) => tam(newell(posFn, vs)) / 2;
        let antes = 0, depois = 0;
        for (const fid of grupo) {
          antes += areaDe(pos, F(fid).vs);
          const parte = partidas.find(([x]) => x === fid);
          if (parte) for (const vs of parte[1]) depois += areaDe(posNova, vs);
          else depois += areaDe(posNova, listas.get(fid) ?? F(fid).vs);
        }
        for (const nf of novasFaces) if (nf.destino === 'tampa') depois += areaDe(posNova, nf.vs);
        const extremoP = ladoA ? plano0.pos[0] : plano0.pos[paineis];
        const extremoQ = ladoA ? plano1.pos[0] : plano1.pos[paineis];
        const retirada = areaDe((k) => [P, Q, extremoQ, extremoP][k], [0, 1, 2, 3]);
        if (Math.abs((antes - depois) - retirada) > 1e-9 * antes + 1e-14) {
          return falha('o raio não cabe: o contorno volta sobre a faixa e as peças da tampa se atravessariam');
        }
      }

      return () => {
        /* tudo conferido: escreve */
        const limite = paineis + (plano0.tipo === 'degrau' || plano1.tipo === 'degrau' ? 1 : 0);
        for (let k = 0; k < limite; k++) {
          if (plano0.novos[k]) addV(st, plano0.novos[k][0], plano0.novos[k][1]);
          if (plano1.novos[k]) addV(st, plano1.novos[k][0], plano1.novos[k][1]);
        }
        for (const plano of [plano0, plano1]) for (const [id, x] of plano.mover) st.V.set(id, x);
        const ids = [];
        const A = F(faceAId);
        for (let k = 1; k <= paineis; k++) {
          const id = b + k - 1;
          addF(st, id, [idP[k], idQ[k], idQ[k - 1], idP[k - 1]]);
          const painel = st.F.get(id);
          painel.cor = A.cor; painel.material = A.material; painel.parte = A.parte;
          painel.liso = A.liso; painel.solido = A.solido;
          ids.push(id);
        }
        for (const [fid, nova] of listas) F(fid).vs = nova;
        /* a peça nova copia o acabamento da que a originou; a de tampa entra na lista da tampa da extrusão */
        let proximo = b + paineis;
        const nascer = (vs, de, naTampaDoPai) => {
          const id = proximo++;
          addF(st, id, vs);
          const nova = st.F.get(id), mae = F(de);
          nova.cor = mae.cor; nova.material = mae.material; nova.parte = mae.parte;
          nova.liso = mae.liso; nova.solido = mae.solido; nova.tinta = [...(mae.tinta ?? [])];
          if (naTampaDoPai) registraNaTampa(st, de, id);
          return id;
        };
        for (const [fid, partes] of partidas) {
          F(fid).vs = partes[0];
          for (const vs of partes.slice(1)) nascer(vs, fid, true);
        }
        const degraus = [];
        for (const nf of novasFaces) {
          const id = nascer(nf.vs, nf.de, nf.destino === 'tampa');
          if (nf.destino === 'degrau') degraus.push(id);
        }
        registraOrigem(st, i, op, origemId, degraus.length ? { paineis: ids, degraus } : { paineis: ids });
        /* o degrau é o arredondamento terminando no meio de uma curva: a peça fecha, mas o fim do arco fica visível. O aviso
           diz qual aresta, em que ponta e o que fazer (`neutro.avisos`, fora da forma canônica). */
        const pontasEmDegrau = [['v0', plano0, p0], ['v1', plano1, p1]].filter(([, plano]) => plano.tipo === 'degrau');
        if (pontasEmDegrau.length) st.avisos.push(avisoDeDegrau({ i, op, origemId, v0, v1, P, Q, e, raio: p.raio, pontasEmDegrau, cosDaPonta, degraus }));
      };
    };

    /* O modo comum primeiro; só se ele recusa, as pontas oblíquas passam ao degrau (uma de cada vez, depois as duas), e
       a recusa que se grita é a do modo comum. */
    let escreve = null;
    let primeira = null;
    const modos = [['plano', 'plano']];
    const o0 = oblíqua(p0), o1 = oblíqua(p1);
    if (o0) modos.push(['degrau', 'plano']);
    if (o1) modos.push(['plano', 'degrau']);
    if (o0 && o1) modos.push(['degrau', 'degrau']);
    for (const [m0, m1] of modos) {
      try {
        escreve = tentativa(m0, m1);
        break;
      } catch (erro) {
        if (!(erro instanceof Falha)) throw erro;
        primeira ??= erro;
      }
    }
    if (!escreve) throw primeira;
    escreve();
  }

  /* o vértice v0 ou v1 da aresta é ponta de uma faixa arredondada antes: o caminho em grupos cuida do remate do canto */
  function temCantoArredondado(st, v0, v1, faceAId, faceBId) {
    for (const [fid, f] of st.F) {
      if (fid === faceAId || fid === faceBId) continue;
      if ((f.vs.includes(v0) || f.vs.includes(v1)) && painelRegistrado(st, fid)) return true;
    }
    return false;
  }

  /* o vértice v0 ou v1 tem mais de duas faces além das da aresta: a tampa partida em leque, que só este caminho trata */
  function temLeque(st, v0, v1, faceAId, faceBId) {
    let em0 = 0, em1 = 0;
    for (const [fid, f] of st.F) {
      if (fid === faceAId || fid === faceBId) continue;
      if (f.vs.includes(v0)) em0++;
      if (f.vs.includes(v1)) em1++;
    }
    return em0 > 2 || em1 > 2;
  }

  return { costurar, temCantoArredondado, temLeque };
}
