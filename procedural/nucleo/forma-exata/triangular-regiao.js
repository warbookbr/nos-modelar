/* triangular-regiao.js — a triangulação de uma região plana delimitada por laços de pontos, com pontos novos por dentro
   (protótipo do estudo do método, plano "forma exata antes da malha", fatia 3).

   Entrada: os pontos [u, v] e os laços, cada um a lista dos índices dos pontos dele em ordem (o de fora e os furos, em qualquer
   sentido). Saída: os pontos (os de entrada, na mesma ordem, e depois os novos) e os triângulos anti-horários que cobrem a região.
   Nenhum ponto novo cai sobre o contorno: as arestas dos laços saem inteiras, e é isso que deixa a face vizinha dividir os mesmos
   vértices.

   O MÉTODO. Triangulação de Delaunay incremental (o ponto entra dividindo o triângulo ou a aresta em que cai, e as arestas
   vizinhas trocam de diagonal enquanto o círculo de um triângulo contiver o vértice oposto), depois a recuperação das arestas
   dos laços por troca das diagonais que as cruzam, a marcação do lado de dentro por paridade a partir de fora, e o refino: o
   triângulo de dentro cuja razão entre o raio do círculo e o menor lado passa de `qualidade` (padrão raiz de 2, ângulo mínimo
   de 20,7 graus) recebe um ponto no centro do círculo dele. O ponto novo fica a mais de `qualidade` vezes o menor lado de
   qualquer vértice, e por isso o refino termina. Ele não entra quando o centro cai atrás de uma aresta do contorno ou a menos
   de um quarto do comprimento de uma delas: como o contorno não se divide, o triângulo ruim que só se consertaria dividindo
   o contorno fica, e `naoRefinados` conta quantos.

   `tamanhoMaximo` também divide o triângulo com aresta interna maior que ele (para a face curva desenrolada, onde o tamanho
   limita o desvio da corda). Tudo é determinístico: ordem fixa, sem sorteio. As contas rodam com as coordenadas levadas à
   caixa unitária, e os testes de orientação e de círculo têm a margem de erro do arredondamento. */

const erro = (texto) => { throw new Error(`triangularRegiao: ${texto}`); };

export function triangularRegiao(pontosDeEntrada, lacos, { qualidade = Math.SQRT2, tamanhoMaximo = Infinity, limiteDePontos = null } = {}) {
  const n0 = pontosDeEntrada.length;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pontosDeEntrada) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const escala = Math.max(x1 - x0, y1 - y0);
  if (!(escala > 0)) erro('os pontos não têm extensão');
  const px = [], py = [];
  for (const p of pontosDeEntrada) { px.push((p[0] - x0) / escala); py.push((p[1] - y0) / escala); }
  const maximo = tamanhoMaximo / escala;

  /* triângulo t: vértices tv[3t+k]; a aresta k vai de tv[3t+k] a tv[3t+(k+1)%3]; tn é o vizinho por ela e tc diz se ela é do contorno */
  const tv = [], tn = [], tc = [];
  const orient = (a, b, c) => {
    const l = (px[b] - px[a]) * (py[c] - py[a]), r = (py[b] - py[a]) * (px[c] - px[a]);
    const d = l - r;
    return Math.abs(d) <= 1e-13 * (Math.abs(l) + Math.abs(r)) ? 0 : d;
  };
  const noCirculo = (a, b, c, d) => {
    const adx = px[a] - px[d], ady = py[a] - py[d], bdx = px[b] - px[d], bdy = py[b] - py[d], cdx = px[c] - px[d], cdy = py[c] - py[d];
    const al = adx * adx + ady * ady, bl = bdx * bdx + bdy * bdy, cl = cdx * cdx + cdy * cdy;
    const det = al * (bdx * cdy - bdy * cdx) + bl * (cdx * ady - cdy * adx) + cl * (adx * bdy - ady * bdx);
    const perm = al * (Math.abs(bdx * cdy) + Math.abs(bdy * cdx)) + bl * (Math.abs(cdx * ady) + Math.abs(cdy * adx)) + cl * (Math.abs(adx * bdy) + Math.abs(ady * bdx));
    return det > 1e-12 * perm;
  };
  const novoTri = (a, b, c, na, nb, nc, ca, cb, cc) => { const t = tv.length / 3; tv.push(a, b, c); tn.push(na, nb, nc); tc.push(ca, cb, cc); return t; };
  const porTri = (t, a, b, c, na, nb, nc, ca, cb, cc) => { const i = 3 * t; tv[i] = a; tv[i + 1] = b; tv[i + 2] = c; tn[i] = na; tn[i + 1] = nb; tn[i + 2] = nc; tc[i] = ca; tc[i + 1] = cb; tc[i + 2] = cc; };
  const trocarVizinho = (t, velho, novo) => { if (t < 0) return; const i = 3 * t; if (tn[i] === velho) tn[i] = novo; else if (tn[i + 1] === velho) tn[i + 1] = novo; else if (tn[i + 2] === velho) tn[i + 2] = novo; };
  const ladoDe = (t, vizinho) => { const i = 3 * t; return tn[i] === vizinho ? 0 : tn[i + 1] === vizinho ? 1 : tn[i + 2] === vizinho ? 2 : -1; };

  /* o triângulo de fora, bem maior que a caixa */
  const s0 = px.length;
  px.push(-20, 21, 0.5); py.push(-20, -20, 40);
  novoTri(s0, s0 + 1, s0 + 2, -1, -1, -1, 0, 0, 0);

  /* anda de `t` até o triângulo que contém o ponto p; com `parar`, devolve -1 ao cruzar uma aresta do contorno */
  const achar = (p, t, parar) => {
    let passos = 0;
    const limite = tv.length + 16;
    for (;;) {
      if (passos++ > limite) return -2;
      const i = 3 * t;
      let andou = false;
      for (let k = 0; k < 3; k++) {
        if (orient(tv[i + k], tv[i + (k + 1) % 3], p) < 0) {
          if (parar && tc[i + k]) return -1;
          if (tn[i + k] < 0) return -2;
          t = tn[i + k]; andou = true; break;
        }
      }
      if (!andou) return t;
    }
  };

  /* troca a diagonal da aresta k do triângulo t; devolve o vizinho, ou -1 se o quadrilátero não é convexo */
  const trocar = (t, k) => {
    const i = 3 * t, n = tn[i + k];
    const kn = ladoDe(n, t), j = 3 * n;
    const a = tv[i + k], b = tv[i + (k + 1) % 3], p = tv[i + (k + 2) % 3], d = tv[j + (kn + 2) % 3];
    if (!(orient(a, d, p) > 0 && orient(d, b, p) > 0)) return -1;
    const nbp = tn[i + (k + 1) % 3], cbp = tc[i + (k + 1) % 3], npa = tn[i + (k + 2) % 3], cpa = tc[i + (k + 2) % 3];
    const nad = tn[j + (kn + 1) % 3], cad = tc[j + (kn + 1) % 3], ndb = tn[j + (kn + 2) % 3], cdb = tc[j + (kn + 2) % 3];
    porTri(t, a, d, p, nad, n, npa, cad, 0, cpa);
    porTri(n, d, b, p, ndb, nbp, t, cdb, cbp, 0);
    trocarVizinho(nad, n, t);
    trocarVizinho(nbp, t, n);
    return n;
  };

  const tocados = [];
  const legalizar = (p, pilha) => {
    while (pilha.length) {
      const t = pilha.pop();
      tocados.push(t);
      const i = 3 * t;
      const kp = tv[i] === p ? 0 : tv[i + 1] === p ? 1 : 2;
      const k = (kp + 1) % 3;   /* a aresta oposta a p */
      const n = tn[i + k];
      if (n < 0 || tc[i + k]) continue;
      const d = tv[3 * n + (ladoDe(n, t) + 2) % 3];
      if (!noCirculo(tv[i + k], tv[i + (k + 1) % 3], p, d)) continue;
      const outro = trocar(t, k);
      if (outro >= 0) pilha.push(t, outro);
    }
  };

  /* insere o ponto p no triângulo t (que o contém); devolve false se ele cai sobre aresta do contorno ou sobre um vértice */
  const inserir = (p, t) => {
    const i = 3 * t;
    const a = tv[i], b = tv[i + 1], c = tv[i + 2];
    const o = [orient(a, b, p), orient(b, c, p), orient(c, a, p)];
    const zeros = o.filter((v) => v === 0).length;
    if (zeros >= 2) return false;
    if (zeros === 0) {
      const nab = tn[i], nbc = tn[i + 1], nca = tn[i + 2], cab = tc[i], cbc = tc[i + 1], cca = tc[i + 2];
      const t1 = tv.length / 3, t2 = t1 + 1;
      porTri(t, a, b, p, nab, t1, t2, cab, 0, 0);
      novoTri(b, c, p, nbc, t2, t, cbc, 0, 0);
      novoTri(c, a, p, nca, t, t1, cca, 0, 0);
      trocarVizinho(nbc, t, t1);
      trocarVizinho(nca, t, t2);
      legalizar(p, [t, t1, t2]);
      return true;
    }
    const k = o.indexOf(0);
    if (tc[i + k]) return false;
    const u = tn[i + k];
    if (u < 0) return false;
    const A = tv[i + k], B = tv[i + (k + 1) % 3], C = tv[i + (k + 2) % 3];
    const nbc = tn[i + (k + 1) % 3], cbc = tc[i + (k + 1) % 3], nca = tn[i + (k + 2) % 3], cca = tc[i + (k + 2) % 3];
    const j = 3 * u, ku = ladoDe(u, t);
    const D = tv[j + (ku + 2) % 3];
    const nad = tn[j + (ku + 1) % 3], cad = tc[j + (ku + 1) % 3], ndb = tn[j + (ku + 2) % 3], cdb = tc[j + (ku + 2) % 3];
    const t1 = tv.length / 3, u1 = t1 + 1;
    porTri(t, A, p, C, u1, t1, nca, 0, 0, cca);
    novoTri(p, B, C, u, nbc, t, 0, cbc, 0);
    porTri(u, B, p, D, t1, u1, ndb, 0, 0, cdb);
    novoTri(p, A, D, t, nad, u, 0, cad, 0);
    trocarVizinho(nbc, t, t1);
    trocarVizinho(nad, u, u1);
    legalizar(p, [t, t1, u, u1]);
    return true;
  };

  /* 1. os pontos do contorno */
  let ultimo = 0;
  for (let p = 0; p < n0; p++) {
    const t = achar(p, ultimo, false);
    if (t < 0) erro(`o ponto ${p} ficou fora da triangulação`);
    if (!inserir(p, t)) erro(`o ponto ${p} [${pontosDeEntrada[p]}] repete outro ponto do contorno`);
    ultimo = tv.length / 3 - 1;
  }

  /* 2. as arestas dos laços */
  const chave = (a, b) => (a < b ? a * (n0 + 3) + b : b * (n0 + 3) + a);
  const pedidas = [];
  for (const laco of lacos) for (let k = 0; k < laco.length; k++) pedidas.push([laco[k], laco[(k + 1) % laco.length]]);
  const existentes = () => { const s = new Set(); for (let i = 0; i < tv.length; i += 3) for (let k = 0; k < 3; k++) s.add(chave(tv[i + k], tv[i + (k + 1) % 3])); return s; };
  const cruza = (a, b, c, d) => a !== c && a !== d && b !== c && b !== d && orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
  let tem = existentes();
  for (const [a, b] of pedidas) {
    if (tem.has(chave(a, b))) continue;
    let guarda = 0;
    for (;;) {
      if (guarda++ > 4 * tv.length) erro(`a aresta do contorno entre os pontos ${a} e ${b} não se recupera (o contorno toca a si mesmo?)`);
      let trocou = false, cruzou = false;
      for (let t = 0; t < tv.length / 3 && !trocou; t++) {
        for (let k = 0; k < 3; k++) {
          const n = tn[3 * t + k];
          if (n < t) continue;
          if (!cruza(a, b, tv[3 * t + k], tv[3 * t + (k + 1) % 3])) continue;
          cruzou = true;
          if (trocar(t, k) >= 0) { trocou = true; break; }
        }
      }
      if (!cruzou) break;
      if (!trocou) erro(`a aresta do contorno entre os pontos ${a} e ${b} não se recupera`);
    }
    tem = existentes();
  }
  const doContorno = new Set(pedidas.map(([a, b]) => chave(a, b)));
  for (const [a, b] of pedidas) if (!tem.has(chave(a, b))) erro(`a aresta do contorno entre os pontos ${a} e ${b} não existe na triangulação`);
  for (let i = 0; i < tv.length; i += 3) for (let k = 0; k < 3; k++) tc[i + k] = tv[i + k] < n0 && tv[i + (k + 1) % 3] < n0 && doContorno.has(chave(tv[i + k], tv[i + (k + 1) % 3])) ? 1 : 0;

  /* 3. dentro e fora, por paridade a partir do triângulo de fora */
  const nivel = new Array(tv.length / 3).fill(-1);
  let partida = 0;
  for (let t = 0; t < tv.length / 3; t++) if (tv[3 * t] >= s0 || tv[3 * t + 1] >= s0 || tv[3 * t + 2] >= s0) { partida = t; break; }
  nivel[partida] = 0;
  const fila = [partida];
  for (let q = 0; q < fila.length; q++) {
    const t = fila[q];
    for (let k = 0; k < 3; k++) {
      const n = tn[3 * t + k];
      if (n < 0 || nivel[n] >= 0) continue;
      nivel[n] = nivel[t] + tc[3 * t + k];
      fila.push(n);
    }
  }
  const dentro = nivel.map((v) => v % 2 === 1);

  /* 4. o refino */
  const bordas = pedidas.map(([a, b]) => ({ a, b, comp: Math.hypot(px[b] - px[a], py[b] - py[a]) }));
  const pertoDaBorda = (cx, cy) => {
    for (const e of bordas) {
      const ex = px[e.b] - px[e.a], ey = py[e.b] - py[e.a];
      const f = Math.min(1, Math.max(0, ((cx - px[e.a]) * ex + (cy - py[e.a]) * ey) / (e.comp * e.comp)));
      if (Math.hypot(cx - px[e.a] - ex * f, cy - py[e.a] - ey * f) < 0.25 * e.comp) return true;
    }
    return false;
  };
  const teto = limiteDePontos ?? 40 * n0 + 20000;
  const candidatos = [];
  for (let t = 0; t < tv.length / 3; t++) if (dentro[t]) candidatos.push(t, tv[3 * t], tv[3 * t + 1], tv[3 * t + 2]);
  let naoRefinados = 0, interrompido = false;
  for (let q = 0; q < candidatos.length; q += 4) {
    const t = candidatos[q], i = 3 * t;
    if (tv[i] !== candidatos[q + 1] || tv[i + 1] !== candidatos[q + 2] || tv[i + 2] !== candidatos[q + 3]) continue;
    const a = tv[i], b = tv[i + 1], c = tv[i + 2];
    const bx = px[b] - px[a], by = py[b] - py[a], cx = px[c] - px[a], cy = py[c] - py[a];
    const d = 2 * (bx * cy - by * cx);
    const lab = Math.hypot(bx, by), lca = Math.hypot(cx, cy), lbc = Math.hypot(cx - bx, cy - by);
    const menor = Math.min(lab, lbc, lca);
    const ux = (cy * (bx * bx + by * by) - by * (cx * cx + cy * cy)) / d, uy = (bx * (cx * cx + cy * cy) - cx * (bx * bx + by * by)) / d;
    const raio = Math.hypot(ux, uy);
    const grande = Math.max(tc[i] ? 0 : lab, tc[i + 1] ? 0 : lbc, tc[i + 2] ? 0 : lca) > maximo;
    if (!(raio > qualidade * menor) && !grande) continue;
    if (px.length - s0 - 3 >= teto) { interrompido = true; naoRefinados++; continue; }
    const ox = px[a] + ux, oy = py[a] + uy;
    const p = px.length;
    px.push(ox); py.push(oy);
    const alvo = achar(p, t, true);
    if (alvo < 0 || !dentro[alvo] || pertoDaBorda(ox, oy)) { px.pop(); py.pop(); naoRefinados++; continue; }
    const antes = tv.length / 3;
    tocados.length = 0;
    if (!inserir(p, alvo)) { px.pop(); py.pop(); naoRefinados++; continue; }
    for (let k = antes; k < tv.length / 3; k++) dentro.push(true);
    for (const k of tocados) candidatos.push(k, tv[3 * k], tv[3 * k + 1], tv[3 * k + 2]);
  }

  const pontos = pontosDeEntrada.map((p) => [p[0], p[1]]);
  const mapa = new Map();
  const triangulos = [];
  for (let t = 0; t < tv.length / 3; t++) {
    if (!dentro[t]) continue;
    const tri = [];
    for (let k = 0; k < 3; k++) {
      const v = tv[3 * t + k];
      if (v < n0) { tri.push(v); continue; }
      if (!mapa.has(v)) { mapa.set(v, pontos.length); pontos.push([x0 + px[v] * escala, y0 + py[v] * escala]); }
      tri.push(mapa.get(v));
    }
    triangulos.push(tri);
  }
  return { pontos, triangulos, naoRefinados, interrompido };
}
