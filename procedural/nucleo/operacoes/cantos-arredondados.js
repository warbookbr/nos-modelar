/* cantos-arredondados.js — o remate do vértice onde duas ou três arestas arredondadas (ou chanfradas) se encontram.

   Uma faixa de `arredondarAresta` ou `filete` é um prisma de painéis planos (os painéis [P_k, Q_k, Q_{k-1}, P_{k-1}] que o
   registro de origem lista em `paineis`) que vai de um anel de pontas a outro. Quando a aresta seguinte termina num
   vértice que já é ponta de uma faixa, o painel dessa faixa não pode ganhar pontos do arco novo: eles ficam fora do plano
   dele. O remate é a junção dos dois prismas pela interseção das faixas (a esquadria): cada reta de vértice da faixa nova
   encontra a reta de vértice correspondente da faixa antiga, o anel de pontas da antiga escorrega ao longo do próprio eixo
   até esse encontro e passa a ser também o anel da nova. Nenhum vértice nasce no canto e todo painel segue plano e sobre o
   cilindro do raio pedido.

   Dois casos, sempre com o mesmo raio e o mesmo número de painéis, e com as retas de vértice concorrentes (arestas a 90°):
   - remate de dois: a faixa antiga termina na face de ponta Z da aresta nova. O anel antigo vira o anel novo, e Z perde
     os pontos do anel menos o último, que fica na quina com a face seguinte;
   - remate de três: as duas faixas antigas já compartilham o anel (o remate de dois). A aresta nova passa pelo ponto onde
     as três esquadrias se encontram, a 45° do arco, e por isso pede um número par de painéis: a metade do anel perto da
     aresta se parte em duas cópias, uma para cada faixa antiga, e o anel novo percorre a primeira cópia, o vértice triplo
     e a segunda cópia.
   Tudo que não fecha com essas condições (raios diferentes, ângulo que não é reto, faixa editada depois, ponto no meio do
   anel, número ímpar de painéis no canto de três) volta como erro com a causa, e nada é escrito. */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const tam = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = tam(a); return l > 0 ? mul(a, 1 / l) : a; };
const chave = (p, q) => `${p}:${q}`;

/* o registro de origem de arredondarAresta ou filete que lista este painel, ou null */
export function painelRegistrado(st, fid) {
  for (const registros of st.origens.values()) {
    for (const r of registros) {
      if ((r.op === 'arredondarAresta' || r.op === 'filete') && Array.isArray(r.paineis) && r.paineis.includes(fid)) return r;
    }
  }
  return null;
}

/* a faixa a que o painel pertence, vista do vértice v: o anel de pontas que começa em v, o anel do outro lado (as pontas
   opostas de cada reta de vértice) e os painéis na ordem de v para o outro extremo do anel. */
export function descreverFaixa(st, fid, v) {
  const reg = painelRegistrado(st, fid);
  if (!reg) return { erro: `a face ${fid} não é painel de um arredondamento` };
  const n = reg.paineis.length;
  const faces = reg.paineis.map((id) => st.F.get(id));
  if (faces.some((f) => !f || f.vs.length !== 4)) return { erro: 'a faixa vizinha foi editada depois de arredondada: um painel deixou de ser um quadrilátero' };
  const P = [faces[0].vs[3], ...faces.map((f) => f.vs[0])];
  const Q = [faces[0].vs[2], ...faces.map((f) => f.vs[1])];
  for (let k = 1; k < n; k++) {
    if (faces[k].vs[3] !== P[k] || faces[k].vs[2] !== Q[k]) return { erro: 'a faixa vizinha foi editada depois de arredondada: os painéis não se encadeiam' };
  }
  if (new Set([...P, ...Q]).size !== 2 * (n + 1)) return { erro: 'a faixa vizinha foi editada depois de arredondada: os anéis repetem vértice' };
  for (const [anel, par] of [[P, Q], [Q, P]]) {
    if (anel[0] === v) return { n, reg, anel, par, paineis: [...reg.paineis] };
    if (anel[n] === v) return { n, reg, anel: [...anel].reverse(), par: [...par].reverse(), paineis: [...reg.paineis].reverse() };
  }
  if (P.includes(v) || Q.includes(v)) return { erro: `o vértice ${v} fica no meio do anel de pontas da faixa vizinha, não numa ponta dela` };
  return { erro: `o vértice ${v} não pertence à faixa vizinha` };
}

/* o encontro de duas retas (ponto + direção unitária); devolve o ponto médio dos dois pés e a distância entre eles */
function encontro(p1, d1, p2, d2) {
  const b = ponto(d1, d2);
  const det = 1 - b * b;
  if (!(Math.abs(det) > 1e-9)) return null;
  const w = sub(p2, p1);
  const d = ponto(d1, w), e = ponto(d2, w);
  const t = (d - b * e) / det;
  const s = (b * d - e) / det;
  const x1 = soma(p1, mul(d1, t)), x2 = soma(p2, mul(d2, s));
  return { ponto: mul(soma(x1, x2), 0.5), dist: tam(sub(x1, x2)) };
}

/* contexto: { st, pos, indice, GA, GB, e, paineis, anel, novoId(nome, k) }; ponta: { A, B, fora | foraA, foraB } */
export function remateDeDois(ctx, nome, v, ponta) {
  const { st, pos, indice, GA, GB, e, paineis, anel } = ctx;
  const d = descreverFaixa(st, ponta.fora, v);
  if (d.erro) return { erro: d.erro };
  if (d.n !== paineis) return { erro: `o canto pede o mesmo número de painéis da faixa vizinha (${d.n}), e a aresta pediu ${paineis}` };
  if (d.paineis[0] !== ponta.fora) return { erro: 'o painel do canto não é o primeiro da faixa vizinha vista da ponta' };
  const doAnel = new Set(d.paineis);
  let Z = null;
  for (let k = 0; k < d.n; k++) {
    const vizinhas = [indice.get(chave(d.anel[k], d.anel[k + 1])), indice.get(chave(d.anel[k + 1], d.anel[k]))].filter((f) => f != null && !doAnel.has(f));
    if (vizinhas.length !== 1) return { erro: 'o anel da faixa vizinha não margeia uma face só' };
    if (Z == null) Z = vizinhas[0];
    else if (Z !== vizinhas[0]) return { erro: 'o anel da faixa vizinha margeia mais de uma face' };
  }
  const zEmA = GA.has(Z), zEmB = GB.has(Z);
  if (zEmA === zEmB) return { erro: `a face ${Z}, de ponta da faixa vizinha, não é uma das duas faces da aresta` };
  const leque = zEmA ? ponta.A : ponta.B;
  if (leque.length !== 1 || leque[0] !== Z) return { erro: `a face ${Z}, de ponta da faixa vizinha, é uma tampa partida: o remate do canto pede uma face só ali` };
  /* o lado W é o da face da aresta que a faixa vizinha não margeia: nele a ponta v permanece */
  const wEmA = !zEmA;
  const padrao = anel(pos(v));
  const ringIds = wEmA ? [...d.anel] : [...d.anel].reverse();
  const posAnel = [];
  const escala = Math.max(1, tam(sub(pos(d.par[0]), pos(d.anel[0]))));
  for (let k = 0; k <= d.n; k++) {
    const j = wEmA ? k : d.n - k;
    const dir = unit(sub(pos(d.par[j]), pos(d.anel[j])));
    const c = encontro(pos(d.anel[j]), dir, padrao[k], e);
    if (!c) return { erro: 'a aresta é paralela à faixa vizinha: não há esquadria' };
    if (c.dist > 1e-7 * escala) return { erro: `as retas de vértice do arco novo e da faixa vizinha não se cruzam (distância ${Number(c.dist.toPrecision(3))} no ponto ${k}): o remate do canto pede o mesmo raio e arestas a 90°` };
    posAnel.push(c.ponto);
  }
  const removidos = new Set(d.anel.slice(0, d.n));
  return {
    tipo: 'dois',
    ring: ringIds,
    pos: posAnel,
    novos: [],
    mover: ringIds.map((id, k) => [id, posAnel[k]]),
    ignorar: new Set(d.anel),
    validar: [...ponta.A, ...ponta.B, ...d.paineis],
    edicoes: [{ fase: 'B', fids: [Z], fn: (vs) => vs.filter((x) => !removidos.has(x)) }],
  };
}

export function remateDeTres(ctx, nome, v, ponta) {
  const { st, pos, e, paineis, anel, novoId } = ctx;
  const dA = descreverFaixa(st, ponta.foraA, v);
  if (dA.erro) return { erro: dA.erro };
  const dB = descreverFaixa(st, ponta.foraB, v);
  if (dB.erro) return { erro: dB.erro };
  const n = dA.n;
  if (dA.reg === dB.reg) return { erro: 'as duas faixas do canto são a mesma' };
  if (dB.n !== n || n !== paineis) return { erro: `o canto pede o mesmo número de painéis nas três arestas (${dA.n}, ${dB.n} e ${paineis})` };
  if (n % 2 !== 0) return { erro: `o canto onde três arestas arredondadas ou chanfradas se encontram pede um número par de painéis (recebeu ${n}): o vértice triplo cai a 45° do arco` };
  if (dA.paineis[0] !== ponta.foraA || dB.paineis[0] !== ponta.foraB) return { erro: 'os painéis do canto não são os primeiros das faixas vizinhas vistas da ponta' };
  for (let k = 0; k <= n; k++) {
    if (dA.anel[k] !== dB.anel[k]) return { erro: 'as duas faixas do canto não compartilham o anel de pontas: falta o remate das duas antes da terceira aresta' };
  }
  const m = n / 2;
  const padrao = anel(pos(v));
  const R = dA.anel;
  const escala = Math.max(1, tam(sub(pos(dA.par[0]), pos(R[0]))));
  const reta = (d, j) => unit(sub(pos(d.par[j]), pos(R[j])));
  /* o ponto do anel novo k: a reta de vértice k da aresta nova encontra a da faixa A (metade perto da face A) ou a da B */
  const posAnel = [];
  for (let k = 0; k <= n; k++) {
    if (k === m) {
      const c = encontro(pos(R[m]), reta(dA, m), padrao[k], e);
      if (!c) return { erro: 'a aresta é paralela à faixa vizinha: não há esquadria' };
      if (c.dist > 1e-7 * escala) return { erro: `o vértice triplo do canto não cai na reta de vértice do meio do arco (distância ${Number(c.dist.toPrecision(3))}): o remate do canto pede o mesmo raio e arestas a 90°` };
      posAnel.push(pos(R[m]));
      continue;
    }
    const lado = k < m ? dA : dB;
    const j = k < m ? k : n - k;
    const c = encontro(pos(R[j]), reta(lado, j), padrao[k], e);
    if (!c) return { erro: 'a aresta é paralela à faixa vizinha: não há esquadria' };
    if (c.dist > 1e-7 * escala) return { erro: `as retas de vértice do arco novo e da faixa vizinha não se cruzam (distância ${Number(c.dist.toPrecision(3))} no ponto ${k}): o remate do canto pede o mesmo raio e arestas a 90°` };
    posAnel.push(c.ponto);
  }
  /* as cópias da faixa B: os vértices R[0..m-1] ficam com a A e a B ganha uma cópia de cada, nos pontos k > m do anel novo */
  const copia = [];
  for (let i = 0; i < m; i++) copia.push(novoId(nome, i + 1));
  const ringIds = [];
  for (let k = 0; k <= n; k++) ringIds.push(k < m ? R[k] : k === m ? R[m] : copia[n - k]);
  const novos = copia.map((id, i) => [id, posAnel[n - i]]);
  const mover = [];
  for (let k = 0; k < m; k++) mover.push([R[k], posAnel[k]]);
  const troca = new Map(copia.map((id, i) => [R[i], id]));
  const edicoes = [
    { fase: 'B', fids: ponta.B, fn: (vs) => vs.map((x) => (x === v ? copia[0] : x)) },
    ...dB.paineis.slice(0, m).map((fid) => ({ fase: 'fora', fids: [fid], fn: (vs) => vs.map((x) => troca.get(x) ?? x) })),
  ];
  return {
    tipo: 'tres',
    ring: ringIds,
    pos: posAnel,
    novos,
    mover,
    ignorar: new Set(R),
    validar: [...ponta.A, ...ponta.B, ...dA.paineis.slice(0, m), ...dB.paineis.slice(0, m)],
    edicoes,
  };
}
