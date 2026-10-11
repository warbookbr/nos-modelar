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
   plano com a mesma conferência das pontas planas e, em canto de remate, confere também que toda face plana continua plana. */

import { painelRegistrado, remateDeDois, remateDeTres } from './cantos-arredondados.js';

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
       sai pela aresta que chega a v0 e a B pela que sai de v0; em v1 é o contrário. Quando a face de ponta é o painel de
       uma faixa arredondada antes, o canto é de remate (cantos-arredondados.js): com dois painéis diferentes entre os
       leques, é o canto de três arestas. */
    const ponta = (nome, v, chaveA, chaveB) => {
      const la = andarLeque(st, GA, faceAId, (f) => indice.get(chaveA(f, v)));
      const lb = andarLeque(st, GB, faceBId, (f) => indice.get(chaveB(f, v)));
      const msg = `a ponta ${nome} da aresta não fecha com uma única face entre a tampa de ${GA.size} face(s) e a de ${GB.size}: o canto tem outras faces ao redor (canto composto)`;
      if (!la || !lb) return falha(msg);
      if (la.fora === lb.fora) {
        return { A: la.faces, B: lb.faces, fora: la.fora, tipo: painelRegistrado(st, la.fora) ? 'dois' : 'plano' };
      }
      if (painelRegistrado(st, la.fora) && painelRegistrado(st, lb.fora)) {
        return { A: la.faces, B: lb.faces, foraA: la.fora, foraB: lb.fora, tipo: 'tres' };
      }
      return falha(msg);
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
    /* os ids dos vértices que nascem em cada ponta: os do lado de v0 em b + 2(k-1) e os do lado de v1 logo depois */
    const novoId = (nome, k) => b + (k - 1) * 2 + (nome === 'v0' ? 0 : 1);
    const idPonta = (nome, v) => {
      const ids = [v];
      for (let k = 1; k <= paineis; k++) ids.push(novoId(nome, k));
      return ids;
    };
    const ctx = { st, pos, indice, GA, GB, e, paineis, anel, novoId };

    /* o plano de cada ponta: o anel (ids e pontos, do lado A ao B), o que nasce, o que anda, as listas de cantos que
       mudam (fase 'B': as faces do leque; fase 'fora': as de ponta) e os vértices que a conferência da faixa ignora */
    const planejar = (nome, v, ponta, base) => {
      if (ponta.tipo === 'dois' || ponta.tipo === 'tres') {
        const plano = ponta.tipo === 'dois' ? remateDeDois(ctx, nome, v, ponta) : remateDeTres(ctx, nome, v, ponta);
        if (plano.erro) return falha(`o canto da ponta ${nome} não fecha: ${plano.erro}`);
        return plano;
      }
      const aneis = noPlano(ponta.fora, base, anel(base), nome);
      if (!aneis) return null;
      const ids = idPonta(nome, v);
      return {
        tipo: 'plano',
        ring: ids,
        pos: aneis,
        novos: ids.slice(1).map((id, k) => [id, aneis[k + 1]]),
        mover: [[v, aneis[0]]],
        ignorar: new Set(),
        validar: ponta.A,
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
      };
    };
    const plano0 = planejar('v0', v0, p0, P);
    if (!plano0) return false;
    const plano1 = planejar('v1', v1, p1, Q);
    if (!plano1) return false;
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
    if (!faixa(GA, 'A', plano0.pos[0], plano1.pos[0])) return false;
    if (!faixa(GB, 'B', plano0.pos[paineis], plano1.pos[paineis])) return false;

    /* cada face tocada continua válida; no canto de remate, também plana se era plana */
    const desvioDoPlano = (posFn, vs) => {
      const nn = newell(posFn, vs);
      const l = tam(nn);
      if (!(l > 0)) return 0;
      const u = mul(nn, 1 / l);
      const p0v = posFn(vs[0]);
      return Math.max(...vs.map((x) => Math.abs(ponto(sub(posFn(x), p0v), u))));
    };
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

    /* tudo conferido: escreve */
    for (let k = 0; k < paineis; k++) {
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
    registraOrigem(st, i, op, origemId, { paineis: ids });
    return true;
  }

  /* o vértice v0 ou v1 da aresta é ponta de uma faixa arredondada antes: o caminho em grupos cuida do remate do canto */
  function temCantoArredondado(st, v0, v1, faceAId, faceBId) {
    for (const [fid, f] of st.F) {
      if (fid === faceAId || fid === faceBId) continue;
      if ((f.vs.includes(v0) || f.vs.includes(v1)) && painelRegistrado(st, fid)) return true;
    }
    return false;
  }

  return { costurar, temCantoArredondado };
}
