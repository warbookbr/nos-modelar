/* conferir.js — o conferidor do cobre de uma placa declarada: as regras de projeto e a conectividade, medidas pelo cobre.

   Entra o cobre de cada face como peças convexas (as ilhas dos terminais, as cápsulas das trilhas e os anéis das vias), o
   contorno da placa, a lista de redes (cada uma com os terminais que ela une e, opcionais, a largura e a distância mínimas) e
   as regras. Sai `{ violacoes, redes, minimos }`.

   A CONECTIVIDADE NÃO LÊ O RÓTULO. Duas peças da mesma face que se tocam ou se sobrepõem são o mesmo cobre; a ilha de um
   terminal que atravessa a placa liga a face de cima à de baixo, e a via também. O cobre de cada rede é o pedaço que contém os
   terminais dela: a rede cujos terminais caem em mais de um pedaço está aberta, e o pedaço com terminais de duas redes é um
   curto. Trocar o rótulo de rede de um trecho no traçado não muda nada aqui, porque o rótulo só diz a quem o trecho deveria
   servir; a exigência de largura e de distância de uma rede vale para o cobre que ela de fato ocupa.

   AS REGRAS. A largura de cada trilha contra a maior entre a mínima da regra e a da rede; a distância entre cobres de pedaços
   diferentes na mesma face contra a maior entre a folga da regra e a das duas redes; a distância de todo cobre até a borda; e
   o furo e o anel de cada via. Cada violação diz a regra, a rede, os terminais da rede, a face, o ponto [x, z] e o valor
   medido contra o exigido. Os mínimos medidos de cada grandeza saem em `minimos`. */

const TOQUE = 1e-6;

function arestas(p) { return p.map((a, k) => [a, p[(k + 1) % p.length]]); }
function pontoNoSegmento(p, [a, b]) {
  const d = [b[0] - a[0], b[1] - a[1]];
  const L2 = d[0] * d[0] + d[1] * d[1];
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / L2)) : 0;
  return [a[0] + t * d[0], a[1] + t * d[1]];
}
function dentroDoConvexo(p, poligono) {
  let sinal = 0;
  for (const [a, b] of arestas(poligono)) {
    const z = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(z) < 1e-12) continue;
    if (sinal && Math.sign(z) !== sinal) return false;
    sinal = Math.sign(z);
  }
  return true;
}
function cruzam([a, b], [c, d]) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

/** A distância entre dois polígonos convexos e o ponto médio do par mais próximo; 0 quando se tocam ou se sobrepõem. */
export function distanciaEntreConvexos(a, b) {
  if (a.some((p) => dentroDoConvexo(p, b)) || b.some((p) => dentroDoConvexo(p, a))) return { d: 0, ponto: a.find((p) => dentroDoConvexo(p, b)) ?? b.find((p) => dentroDoConvexo(p, a)) };
  for (const e of arestas(a)) for (const f of arestas(b)) if (cruzam(e, f)) return { d: 0, ponto: e[0] };
  let melhor = { d: Infinity, ponto: null };
  for (const [x, y] of [[a, b], [b, a]]) {
    for (const p of x) {
      for (const e of arestas(y)) {
        const q = pontoNoSegmento(p, e);
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d < melhor.d) melhor = { d, ponto: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] };
      }
    }
  }
  return melhor;
}

function caixa(p) {
  const xs = p.map((q) => q[0]); const zs = p.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}
const longe = (a, b, margem) => a[0] - margem > b[2] || b[0] - margem > a[2] || a[1] - margem > b[3] || b[1] - margem > a[3];
const limpo = (x) => Math.round(x * 1e4) / 1e4 + 0;
const pt = (p) => p.map(limpo);

/**
 * conferirCobre({ contorno, ilhas, pecas, lista, regras })
 *   contorno: [[x, z], ...] da placa; ilhas: [{ peca, terminal, face, poligono, atravessa }] do placaDeclarada; pecas: as do
 *   `pecasDoTracado` (trilhas e vias); lista: [{ id, terminais: [{ peca, porta }], larguraMinima?, distanciaMinima? }];
 *   regras: { trilhaMinima, folga, borda, via: { furo, anel } }.
 */
export function conferirCobre({ contorno, ilhas, pecas, lista, regras }) {
  const violacoes = [];
  const nos = [
    ...ilhas.map((i) => ({ ...i, tipo: 'ilha' })),
    ...pecas,
  ].map((n, k) => ({ ...n, k, caixa: caixa(n.poligono) }));
  const pai = nos.map((_, k) => k);
  const raiz = (x) => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  const unir = (a, b) => { const ra = raiz(a); const rb = raiz(b); if (ra !== rb) pai[Math.max(ra, rb)] = Math.min(ra, rb); };

  /* a rede de cada terminal pela lista, e as exigências de cada rede */
  const redeDoTerminal = new Map();
  const redes = new Map(lista.map((r) => [r.id, r]));
  for (const r of lista) for (const t of r.terminais) redeDoTerminal.set(`${t.peca}.${t.porta}`, r.id);

  /* o cobre que se toca na mesma face, e as passagens entre as faces: o terminal que atravessa e a via */
  const porFace = { cima: [], baixo: [] };
  for (const n of nos) porFace[n.face].push(n);
  const pares = [];
  /* os pares perto o bastante para a distância importar: a maior exigência de distância, e 2 mm para o mínimo medido sair */
  const maiorFolga = Math.max(regras.folga, 2, ...lista.map((r) => r.distanciaMinima ?? 0));
  for (const face of ['cima', 'baixo']) {
    const l = porFace[face];
    for (let a = 0; a < l.length; a += 1) {
      for (let b = a + 1; b < l.length; b += 1) {
        if (longe(l[a].caixa, l[b].caixa, maiorFolga)) continue;
        const { d, ponto } = distanciaEntreConvexos(l[a].poligono, l[b].poligono);
        if (d <= TOQUE) unir(l[a].k, l[b].k); else pares.push({ a: l[a], b: l[b], d, ponto, face });
      }
    }
  }
  const passagem = new Map();
  for (const n of nos) {
    const chave = n.tipo === 'ilha' ? (n.atravessa ? `t:${n.peca}.${n.terminal}` : null) : n.tipo === 'via' ? `v:${n.rede}.${n.via}` : null;
    if (!chave) continue;
    if (passagem.has(chave)) unir(passagem.get(chave), n.k); else passagem.set(chave, n.k);
  }

  /* os pedaços de cobre e as redes que cada um contém */
  const redesDoPedaco = new Map();
  const pedacosDaRede = new Map(lista.map((r) => [r.id, new Set()]));
  const terminalNaPlaca = new Set();
  for (const n of nos) {
    if (n.tipo !== 'ilha') continue;
    const chave = `${n.peca}.${n.terminal}`;
    terminalNaPlaca.add(chave);
    const rede = redeDoTerminal.get(chave);
    if (!rede) continue;
    const r = raiz(n.k);
    if (!redesDoPedaco.has(r)) redesDoPedaco.set(r, new Set());
    redesDoPedaco.get(r).add(rede);
    pedacosDaRede.get(rede).add(r);
  }
  for (const r of lista) {
    for (const t of r.terminais) {
      if (!terminalNaPlaca.has(`${t.peca}.${t.porta}`)) violacoes.push({ regra: 'terminal-inexistente', rede: r.id, terminais: [`${t.peca}.${t.porta}`], mensagem: `a rede ${r.id} cita o terminal ${t.porta} de ${t.peca}, que não está na placa` });
    }
  }
  const visto = new Map();
  for (const r of lista) {
    for (const t of r.terminais) {
      const chave = `${t.peca}.${t.porta}`;
      if (visto.has(chave)) violacoes.push({ regra: 'terminal-em-duas-redes', rede: r.id, terminais: [chave], mensagem: `o terminal ${t.porta} de ${t.peca} está nas redes ${visto.get(chave)} e ${r.id}` });
      else visto.set(chave, r.id);
    }
  }
  const terminaisDoPedaco = (r, rede) => nos.filter((n) => n.tipo === 'ilha' && raiz(n.k) === r && (!rede || redeDoTerminal.get(`${n.peca}.${n.terminal}`) === rede)).map((n) => `${n.peca}.${n.terminal}`).filter((x, i, l) => l.indexOf(x) === i);
  for (const r of lista) {
    const pedacos = [...pedacosDaRede.get(r.id)];
    if (pedacos.length > 1) violacoes.push({ regra: 'rede-aberta', rede: r.id, terminais: pedacos.map((p) => terminaisDoPedaco(p, r.id)), mensagem: `a rede ${r.id} está em ${pedacos.length} pedaços de cobre separados: ${pedacos.map((p) => `[${terminaisDoPedaco(p, r.id).join(', ')}]`).join(' e ')}` });
  }
  for (const [r, conjunto] of redesDoPedaco) {
    if (conjunto.size > 1) {
      const ponto = nos.find((n) => raiz(n.k) === r && n.tipo !== 'ilha')?.poligono[0];
      violacoes.push({ regra: 'curto', rede: [...conjunto].sort().join(' e '), terminais: terminaisDoPedaco(r), ...(ponto ? { ponto: pt(ponto) } : {}), mensagem: `o mesmo cobre une as redes ${[...conjunto].sort().join(', ')}` });
    }
  }

  /* a rede de cada pedaço, para as exigências: a do terminal que ele contém (o cobre solto fica sem rede) */
  const redeDoPedaco = (n) => { const c = redesDoPedaco.get(raiz(n.k)); return c && c.size === 1 ? [...c][0] : null; };
  const minimos = { largura: Infinity, distancia: Infinity, borda: Infinity, furo: Infinity, anel: Infinity };

  for (const n of nos) {
    if (n.tipo === 'trilha') {
      const rede = redeDoPedaco(n);
      const exigida = Math.max(regras.trilhaMinima, rede ? (redes.get(rede).larguraMinima ?? 0) : 0);
      minimos.largura = Math.min(minimos.largura, n.largura);
      if (n.largura < exigida - 1e-9) violacoes.push({ regra: 'largura', rede, terminais: rede ? redes.get(rede).terminais.map((t) => `${t.peca}.${t.porta}`) : [], face: n.face, ponto: pt(n.poligono[0]), medido: n.largura, exigido: exigida, mensagem: `a trilha do trecho ${n.trecho} da rede ${n.rede} tem ${n.largura} mm, e a exigida é ${exigida} mm` });
    }
    if (n.tipo === 'via' && n.face === 'cima') {
      minimos.furo = Math.min(minimos.furo, n.furoDaVia); minimos.anel = Math.min(minimos.anel, n.anel);
      if (n.furoDaVia < regras.via.furo - 1e-9) violacoes.push({ regra: 'furo-da-via', rede: redeDoPedaco(n), face: 'cima', ponto: pt(n.centro), medido: n.furoDaVia, exigido: regras.via.furo, mensagem: `a via ${n.via} da rede ${n.rede} tem furo de ${n.furoDaVia} mm, e o mínimo é ${regras.via.furo} mm` });
      if (n.anel < regras.via.anel - 1e-9) violacoes.push({ regra: 'anel-da-via', rede: redeDoPedaco(n), face: 'cima', ponto: pt(n.centro), medido: n.anel, exigido: regras.via.anel, mensagem: `a via ${n.via} da rede ${n.rede} tem anel de ${n.anel} mm, e o mínimo é ${regras.via.anel} mm` });
    }
    if (n.tipo !== 'ilha') {
      for (const p of n.poligono) {
        const d = Math.min(...arestas(contorno).map((e) => { const q = pontoNoSegmento(p, e); return Math.hypot(p[0] - q[0], p[1] - q[1]); }));
        minimos.borda = Math.min(minimos.borda, d);
        if (d < regras.borda - 1e-9) { violacoes.push({ regra: 'borda', rede: redeDoPedaco(n), face: n.face, ponto: pt(p), medido: limpo(d), exigido: regras.borda, mensagem: `o cobre da rede ${n.rede} fica a ${limpo(d)} mm da borda, e o mínimo é ${regras.borda} mm` }); break; }
      }
    }
  }
  /* a distância entre cobres de pedaços diferentes, só onde algum dos dois é trilha ou via (a das ilhas a placa já confere) */
  for (const { a, b, d, ponto, face } of pares) {
    if (raiz(a.k) === raiz(b.k)) continue;
    if (a.tipo === 'ilha' && b.tipo === 'ilha') continue;
    const ra = redeDoPedaco(a); const rb = redeDoPedaco(b);
    const exigida = Math.max(regras.folga, ra ? (redes.get(ra).distanciaMinima ?? 0) : 0, rb ? (redes.get(rb).distanciaMinima ?? 0) : 0);
    minimos.distancia = Math.min(minimos.distancia, d);
    if (d < exigida - 1e-9) violacoes.push({ regra: 'distancia', rede: [ra, rb].filter(Boolean).join(' e ') || null, terminais: [a, b].filter((n) => n.tipo === 'ilha').map((n) => `${n.peca}.${n.terminal}`), face, ponto: pt(ponto), medido: limpo(d), exigido: exigida, mensagem: `o cobre ${[ra, rb].map((r) => r ?? 'solto').join(' e ')} fica a ${limpo(d)} mm na face de ${face}, e o mínimo é ${exigida} mm` });
  }
  for (const k of Object.keys(minimos)) minimos[k] = minimos[k] === Infinity ? null : limpo(minimos[k]);
  const relatorio = lista.map((r) => ({ id: r.id, terminais: r.terminais.length, pedacos: pedacosDaRede.get(r.id).size, fechada: pedacosDaRede.get(r.id).size === 1 }));
  return { violacoes, redes: relatorio, minimos };
}
