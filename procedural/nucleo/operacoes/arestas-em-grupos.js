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
   ponta complexa gritam com a causa. */

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
    const { b, origemId, faceAId, faceBId, v0, v1, e, paineis, anel, GA, GB, indice } = p;
    const campo = 'aresta';
    const pos = (v) => st.V.get(v);
    const F = (fid) => st.F.get(fid);
    const antes = (f, v) => f.vs[(f.vs.indexOf(v) - 1 + f.vs.length) % f.vs.length];
    const depois = (f, v) => f.vs[(f.vs.indexOf(v) + 1) % f.vs.length];
    const falha = (msg) => { grita(st, i, op, campo, msg); return false; };

    /* as duas pontas: leque de A, leque de B e a face de ponta, que precisa ser a mesma dos dois lados. Em v0 a face A
       sai pela aresta que chega a v0 e a B pela que sai de v0; em v1 é o contrário. */
    const ponta = (nome, v, chaveA, chaveB) => {
      const la = andarLeque(st, GA, faceAId, (f) => indice.get(chaveA(f, v)));
      const lb = andarLeque(st, GB, faceBId, (f) => indice.get(chaveB(f, v)));
      if (!la || !lb || la.fora !== lb.fora) {
        return falha(`a ponta ${nome} da aresta não fecha com uma única face entre a tampa de ${GA.size} face(s) e a de ${GB.size}: o canto tem outras faces ao redor (canto composto ou de três arestas)`);
      }
      return { A: la.faces, B: lb.faces, fora: la.fora };
    };
    const p0 = ponta('v0', v0, (f, v) => chave(v, antes(f, v)), (f, v) => chave(depois(f, v), v));
    if (!p0) return false;
    const p1 = ponta('v1', v1, (f, v) => chave(depois(f, v), v), (f, v) => chave(v, antes(f, v)));
    if (!p1) return false;

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
    const P = pos(v0), Q = pos(v1);
    const aneis0 = noPlano(p0.fora, P, anel(P), 'v0');
    if (!aneis0) return false;
    const aneis1 = noPlano(p1.fora, Q, anel(Q), 'v1');
    if (!aneis1) return false;

    /* a nova lista de cantos de cada face tocada e as posições novas */
    const idP = [v0], idQ = [v1];
    for (let k = 1; k <= paineis; k++) { idP.push(b + (k - 1) * 2); idQ.push(b + (k - 1) * 2 + 1); }
    const novaPos = new Map([[v0, aneis0[0]], [v1, aneis1[0]]]);
    for (let k = 1; k <= paineis; k++) { novaPos.set(idP[k], aneis0[k]); novaPos.set(idQ[k], aneis1[k]); }
    const posNova = (v) => novaPos.get(v) ?? pos(v);
    const listas = new Map();
    const lista = (fid) => listas.get(fid) ?? F(fid).vs;
    for (const fid of [...p0.A, ...p1.A]) listas.set(fid, F(fid).vs);
    for (const fid of p0.B) listas.set(fid, lista(fid).map((v) => (v === v0 ? idP[paineis] : v === v1 ? idQ[paineis] : v)));
    for (const fid of p1.B) listas.set(fid, lista(fid).map((v) => (v === v0 ? idP[paineis] : v === v1 ? idQ[paineis] : v)));
    listas.set(p0.fora, lista(p0.fora).flatMap((v) => (v === v0 ? [...idP.slice(1).reverse(), v0] : [v])));
    listas.set(p1.fora, lista(p1.fora).flatMap((v) => (v === v1 ? [v1, ...idQ.slice(1)] : [v])));

    /* nenhum vértice dos grupos pode cair na faixa que sai: o raio não cabe nesse caso */
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
          if (v === v0 || v === v1) continue;
          if (dentro(pos(v))) {
            const d = sub(pos(v), P);
            const fora = tam(sub(d, mul(e, ponto(d, e))));
            return falha(`o raio não cabe: o vértice ${v} (face ${fid}, lado ${nome}) fica a ${Number(fora.toPrecision(3))} da aresta e ${p.recuoTexto} chega além dele. Se ${v} nasceu de outro arredondamento ou filete que divide uma ponta desta aresta, é o canto onde as arestas se encontram, fora de escopo`);
          }
        }
      }
      return true;
    };
    if (!faixa(GA, 'A', aneis0[0], aneis1[0])) return false;
    if (!faixa(GB, 'B', aneis0[paineis], aneis1[paineis])) return false;

    /* cada face tocada continua válida */
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
        for (let k = 0; k < nova.length; k++) {
          const a = posNova(nova[k]), c = posNova(nova[(k + 1) % nova.length]), d = posNova(nova[(k + 2) % nova.length]);
          const t = 1e-7 * tam(sub(c, a)) * tam(sub(d, c));
          if (ponto(cruz(sub(c, a), sub(d, c)), un) < -t) return falha(`o raio não cabe: a face ${fid} ficaria côncava (canto ${nova[(k + 1) % nova.length]})`);
        }
      }
    }

    /* tudo conferido: escreve */
    for (let k = 1; k <= paineis; k++) { addV(st, idP[k], aneis0[k]); addV(st, idQ[k], aneis1[k]); }
    st.V.set(v0, aneis0[0]); st.V.set(v1, aneis1[0]);
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
    registraOrigem(st, i, op, origemId, { paineis: ids });
    return true;
  }

  return { costurar };
}
