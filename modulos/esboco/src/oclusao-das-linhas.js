/* O que uma forma esconde de si: as linhas de uma forma que as faces de frente da própria forma cobrem.

   A parede do furo de um anel, vista de fora, tem face de frente e arestas de silhueta, e o corpo do anel as cobre; a face de trás de
   uma forma côncava (a perna de um U vista de frente) cobre da mesma maneira as linhas da perna de trás. O pintor resolve isso
   pintando a face da frente por cima, e só enquanto a linha é pintada antes dela: a linha pintada depois das faces, para o traço da
   silhueta não ser coberto pela borda da face vizinha (a de 0,8 px com a cor do preenchimento), precisa sair daqui já sem o trecho
   escondido. O desenho das formas (`index.js`) e o desenho da blocagem (`desenho-da-blocagem.js`) usam esta mesma conta.

   As faces de frente chegam em um de dois formatos: o triângulo `{ ids: [i, j, k] }`, com `vertices` na opção (a malha da blocagem),
   e o polígono `{ pts, furos? }`, com os vértices `[x, y, z]` na própria face (o desenho das formas; `furos` é a lista de anéis de
   uma tampa vazada, e `furo` o anel único das tampas antigas). O polígono é repartido em triângulos (earcut no plano da tela, com os
   furos), e a conta é a mesma para os dois: um ponto de uma linha está escondido quando algum triângulo de frente o cobre na tela e
   passa à frente dele, ao longo do olho, por mais que a folga. A borda do triângulo conta como dentro, e a linha que corre sobre a
   borda de uma face, na mesma profundidade, não some. Cada linha é repartida em pedaços e fica o que tem o meio livre: o pedaço
   escondido some, e o resto sai como um ou mais segmentos. Sem `refinar` as pontas dos segmentos caem nas divisões dos pedaços (é o
   que a blocagem sempre fez); com `refinar` a bissecção acha onde a oclusão começa. É determinística: a mesma entrada dá a mesma
   saída, e não olha o tempo nem sorteia nada. */
import earcut from 'earcut';

/* o quanto uma face de frente pode estar à frente de uma linha (mm ao longo do olho) sem escondê-la: cobre o arredondamento das
   coordenadas (1e-6 mm) e a face que a própria linha divide */
export const FOLGA_DA_OCLUSAO = 0.02;
/* no máximo, em quantos pedaços uma linha é repartida para tirar só a parte que a própria forma esconde */
export const PEDACOS_DA_LINHA = 12;
const CELULAS_DA_GRADE = 48;
const PASSOS_DA_BISSECCAO = 8;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* Os triângulos das faces de frente na tela (`q`, os três cantos em x e y), com a profundidade de cada canto (`z`, ao longo do olho) e
   a caixa na tela. O triângulo da malha sai como veio; o polígono é repartido por earcut nas coordenadas da tela. */
function triangulosDasFaces(frentes, vertices, V, olho) {
  const saida = [];
  const juntar = (p3) => {
    const q = p3.map((p) => V.p(p));
    const z = p3.map((p) => dot(p, olho));
    saida.push({ q, z, caixa: [Math.min(...q.map((a) => a[0])), Math.min(...q.map((a) => a[1])), Math.max(...q.map((a) => a[0])), Math.max(...q.map((a) => a[1]))] });
  };
  for (const f of frentes) {
    if (f.ids) { juntar(f.ids.map((i) => vertices[i])); continue; }
    const furos = f.furos && f.furos.length > 0 ? f.furos : f.furo ? [f.furo] : [];
    if (furos.length === 0 && f.pts.length === 3) { juntar(f.pts); continue; }
    const aneis = [f.pts, ...furos];
    const todos = aneis.flat();
    const buracos = [];
    let n = f.pts.length;
    for (const fu of furos) { buracos.push(n); n += fu.length; }
    const idx = earcut(todos.flatMap((p) => V.p(p)), buracos, 2);
    for (let k = 0; k + 2 < idx.length; k += 3) juntar([todos[idx[k]], todos[idx[k + 1]], todos[idx[k + 2]]]);
  }
  return saida;
}

/* `linhas`: os segmentos `[a, b]` (pontos 3D); `frentes`: as faces de frente da forma (ver o topo do arquivo); `V`: a vista (`V.p` leva
   o ponto 3D ao plano dela); `olho`: o vetor unitário para o observador. Opções: `vertices` (os vértices a que os `ids` apontam),
   `pedacos` (em quantos pedaços, no máximo, uma linha é repartida) e `refinar` (a bissecção acha a fronteira da oclusão em vez de a
   dividir nos pedaços). Devolve os segmentos que se veem, na ordem de entrada. */
export function semOQueOVolumeEsconde(linhas, frentes, V, olho, { vertices = null, pedacos = PEDACOS_DA_LINHA, refinar = false } = {}) {
  if (frentes.length === 0 || linhas.length === 0) return linhas;
  const tris = triangulosDasFaces(frentes, vertices, V, olho);
  if (tris.length === 0) return linhas;
  const x0 = Math.min(...tris.map((t) => t.caixa[0])); const y0 = Math.min(...tris.map((t) => t.caixa[1]));
  const x1 = Math.max(...tris.map((t) => t.caixa[2])); const y1 = Math.max(...tris.map((t) => t.caixa[3]));
  const G = Math.max(1, Math.min(CELULAS_DA_GRADE, Math.round(Math.sqrt(tris.length))));
  const lado = Math.max(x1 - x0, y1 - y0, 1e-9) / G;
  const celula = (v, o) => Math.max(0, Math.min(G - 1, Math.floor((v - o) / lado)));
  const grade = new Map();
  for (const t of tris) {
    for (let cx = celula(t.caixa[0], x0); cx <= celula(t.caixa[2], x0); cx++) {
      for (let cy = celula(t.caixa[1], y0); cy <= celula(t.caixa[3], y0); cy++) {
        const c = cy * G + cx;
        if (!grade.has(c)) grade.set(c, []);
        grade.get(c).push(t);
      }
    }
  }
  const extensao = Math.max(x1 - x0, y1 - y0);
  const folga = FOLGA_DA_OCLUSAO + 1e-5 * extensao;
  const escondido = (x, y, z) => {
    for (const t of grade.get(celula(y, y0) * G + celula(x, x0)) ?? []) {
      const [a, b, c] = t.q;
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
      const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
      const w = 1 - u - v;
      if (u < -1e-9 || v < -1e-9 || w < -1e-9) continue;
      if (u * t.z[0] + v * t.z[1] + w * t.z[2] > z + folga) return true;
    }
    return false;
  };
  const saida = [];
  for (const [a, b] of linhas) {
    const pa = V.p(a); const pb = V.p(b);
    const comprimento = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const n = Math.max(1, Math.min(pedacos, Math.ceil((comprimento / extensao) * pedacos)));
    const em = (t) => a.map((c, e) => c + t * (b[e] - c));
    const livreEm = (t) => { const m = em(t); const q = V.p(m); return !escondido(q[0], q[1], dot(m, olho)); };
    const livres = Array.from({ length: n }, (_, i) => livreEm((i + 0.5) / n));
    if (livres.every(Boolean)) { saida.push([a, b]); continue; }
    /* a fronteira entre o pedaço k e o k + 1: a divisão deles, ou, com `refinar`, o ponto onde o estado muda entre os dois meios */
    const fronteira = (k) => {
      if (!refinar) return (k + 1) / n;
      let lo = (k + 0.5) / n; let hi = (k + 1.5) / n;
      const livreLo = livres[k];
      for (let i = 0; i < PASSOS_DA_BISSECCAO; i++) { const m = (lo + hi) / 2; if (livreEm(m) === livreLo) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    for (let i = 0; i < n;) {
      if (!livres[i]) { i++; continue; }
      let j = i;
      while (j + 1 < n && livres[j + 1]) j++;
      saida.push([em(i === 0 ? 0 : fronteira(i - 1)), em(j === n - 1 ? 1 : fronteira(j))]);
      i = j + 1;
    }
  }
  return saida;
}

/* A oclusão exata. `semOQueOVolumeEsconde` reparte a linha em pedaços e decide cada um pelo meio dele, e o trecho escondido que cai no
   meio de um pedaço visível (ou o contrário) passa inteiro: o traço da aresta que some atrás da própria chapa sobrava como um toco de
   quinze pixels, e o que ia além da divisão sumia. Aqui a conta é sobre a linha inteira. Para cada triângulo de frente, a linha ao
   longo do parâmetro `t` tem coordenadas baricêntricas e profundidade que são funções de primeiro grau de `t`: o trecho dentro do
   triângulo é um intervalo (o corte pelos três lados), e dentro dele a linha está atrás do plano do triângulo, por mais que a folga, num
   segundo intervalo. O escondido é a união desses intervalos de todos os triângulos, e o que fica é o visível, sem divisão arbitrária.

   Serve a qualquer conjunto de faces de frente, de um volume ou de todos: o triângulo de outro volume esconde a linha como o do próprio,
   e a linha que corre sobre a face de outro volume na mesma profundidade (a aresta da divisão, o contato) não some, porque a folga a
   deixa. Devolve os segmentos visíveis, na ordem de entrada. É determinística. */
const COMPRIMENTO_MINIMO_DO_TRECHO = 1e-3;
const EMENDA_DO_ESCONDIDO = 1e-5;

export function visiveisContraAsFaces(linhas, frentes, V, olho, opcoes = {}) {
  return oclusaoExata(frentes, V, olho, opcoes)(linhas);
}

/* A mesma conta com a grade das faces montada uma vez: devolve a função que tira de um conjunto de linhas o que as faces escondem. */
export function oclusaoExata(frentes, V, olho, { vertices = null, folga: folgaPedida = null } = {}) {
  const tris = frentes.length === 0 ? [] : triangulosDasFaces(frentes, vertices, V, olho);
  if (tris.length === 0) return (linhas) => linhas;
  const x0 = Math.min(...tris.map((t) => t.caixa[0])); const y0 = Math.min(...tris.map((t) => t.caixa[1]));
  const x1 = Math.max(...tris.map((t) => t.caixa[2])); const y1 = Math.max(...tris.map((t) => t.caixa[3]));
  const G = Math.max(1, Math.min(CELULAS_DA_GRADE, Math.round(Math.sqrt(tris.length))));
  const lado = Math.max(x1 - x0, y1 - y0, 1e-9) / G;
  const celula = (v, o) => Math.max(0, Math.min(G - 1, Math.floor((v - o) / lado)));
  const grade = new Map();
  tris.forEach((t, k) => {
    /* o triângulo de área nula na tela (a face de perfil) não cobre nada */
    const [a, b, c] = t.q;
    t.d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(t.d) < 1e-12) return;
    t.k = k;
    for (let cx = celula(t.caixa[0], x0); cx <= celula(t.caixa[2], x0); cx++) {
      for (let cy = celula(t.caixa[1], y0); cy <= celula(t.caixa[3], y0); cy++) {
        const c2 = cy * G + cx;
        if (!grade.has(c2)) grade.set(c2, []);
        grade.get(c2).push(t);
      }
    }
  });
  const extensao = Math.max(x1 - x0, y1 - y0);
  const folga = folgaPedida ?? FOLGA_DA_OCLUSAO + 1e-5 * extensao;
  const BARI = 1e-9;
  return (linhas) => {
  const saida = [];
  for (const [a, b] of linhas) {
    const pa = V.p(a); const pb = V.p(b);
    const za = dot(a, olho); const zb = dot(b, olho);
    const dx = pb[0] - pa[0]; const dy = pb[1] - pa[1];
    const comprimento = Math.hypot(dx, dy);
    if (!(comprimento > 1e-12)) { saida.push([a, b]); continue; }
    /* os triângulos das células que a caixa da linha toca, sem repetir */
    const vistos = new Set(); const candidatos = [];
    for (let cx = celula(Math.min(pa[0], pb[0]), x0); cx <= celula(Math.max(pa[0], pb[0]), x0); cx++) {
      for (let cy = celula(Math.min(pa[1], pb[1]), y0); cy <= celula(Math.max(pa[1], pb[1]), y0); cy++) {
        for (const t of grade.get(cy * G + cx) ?? []) if (!vistos.has(t.k)) { vistos.add(t.k); candidatos.push(t); }
      }
    }
    const escondidos = [];
    for (const t of candidatos) {
      const [qa, qb, qc] = t.q;
      /* as baricêntricas (u para qa, v para qb, w para qc) de P(t) = pa + t (pb - pa): alfa + beta t */
      const ux = (qb[1] - qc[1]); const uy = (qc[0] - qb[0]);
      const vx = (qc[1] - qa[1]); const vy = (qa[0] - qc[0]);
      const al = [(ux * (pa[0] - qc[0]) + uy * (pa[1] - qc[1])) / t.d, (vx * (pa[0] - qc[0]) + vy * (pa[1] - qc[1])) / t.d];
      const be = [(ux * dx + uy * dy) / t.d, (vx * dx + vy * dy) / t.d];
      al.push(1 - al[0] - al[1]); be.push(-be[0] - be[1]);
      let lo = 0; let hi = 1; let vazio = false;
      for (let m = 0; m < 3 && !vazio; m++) {
        /* al + be t >= -BARI */
        if (Math.abs(be[m]) < 1e-14) { if (al[m] < -BARI) vazio = true; continue; }
        const r = (-BARI - al[m]) / be[m];
        if (be[m] > 0) lo = Math.max(lo, r); else hi = Math.min(hi, r);
      }
      if (vazio || !(hi > lo)) continue;
      /* a profundidade do plano do triângulo menos a da linha: C + D t, e escondida quando passa de `folga` */
      const A = al[0] * t.z[0] + al[1] * t.z[1] + al[2] * t.z[2];
      const B = be[0] * t.z[0] + be[1] * t.z[1] + be[2] * t.z[2];
      const C = A - za; const D = B - (zb - za);
      if (Math.abs(D) < 1e-14) { if (!(C > folga)) continue; } else {
        const r = (folga - C) / D;
        if (D > 0) lo = Math.max(lo, r); else hi = Math.min(hi, r);
      }
      if (hi > lo) escondidos.push([lo, hi]);
    }
    if (escondidos.length === 0) { saida.push([a, b]); continue; }
    escondidos.sort((p, q) => p[0] - q[0]);
    const emenda = EMENDA_DO_ESCONDIDO / comprimento;
    const unidos = [];
    for (const iv of escondidos) {
      const ultimo = unidos[unidos.length - 1];
      if (ultimo && iv[0] <= ultimo[1] + emenda) ultimo[1] = Math.max(ultimo[1], iv[1]); else unidos.push([...iv]);
    }
    const em = (t) => a.map((c, e) => c + t * (b[e] - c));
    const minimo = COMPRIMENTO_MINIMO_DO_TRECHO / comprimento;
    let cursor = 0;
    for (const [h0, h1] of unidos) {
      if (h0 - cursor > minimo) saida.push([em(cursor), em(h0)]);
      cursor = Math.max(cursor, h1);
    }
    if (1 - cursor > minimo) saida.push([em(cursor), em(1)]);
  }
  return saida;
  };
}
