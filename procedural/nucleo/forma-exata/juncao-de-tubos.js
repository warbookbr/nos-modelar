/* juncao-de-tubos.js — o encontro em T de dois cilindros com arredondamento na costura, por construção direta a partir das
   curvas exatas (protótipo do estudo do método, plano "forma exata antes da malha", fatia 3).

   A PEÇA. O tronco é um cilindro de eixo x, centrado na origem, de raio `raioDoTronco` e comprimento `comprimentoDoTronco`. O
   ramo é um cilindro de eixo z, de raio `raioDoRamo` menor ou igual ao do tronco, que sai do eixo do tronco e sobe até
   z = `alturaDoRamo`. Os dois eixos se cruzam em ângulo reto. Na costura rola uma esfera de raio `raio` encostada nos dois.

   AS CURVAS. O centro da esfera fica a `raioDoTronco + raio` do eixo x e a `raioDoRamo + raio` do eixo z, e isso tem forma
   fechada: para o ângulo t em volta do ramo, o centro é ((Rr + r) cos t, (Rr + r) sen t, raiz((Rt + r)² - (Rr + r)² sen² t)).
   O ponto de contato no ramo é o centro levado ao raio do ramo, e o do tronco é o centro levado ao raio do tronco. A seção do
   arredondamento é o arco de círculo de raio r entre os dois contatos. Nenhuma dessas curvas é reta ou arco: são calculadas
   ponto a ponto pela fórmula, e não cabem no contorno de `contorno-exato.js`.

   A MALHA. As estações do ramo são as mesmas no arredondamento, na parede do ramo e na borda do buraco do tronco, e por isso as
   três faces dividem os vértices. O tronco é uma grade de quatro cantos em (x, ângulo), mais fina perto do ramo, com uma janela em volta dele; a
   janela é triangulada no cilindro desenrolado (que não estica nem encolhe) por `triangular-regiao.js`, entre a borda da
   grade e a curva de contato. As tampas são trianguladas do mesmo jeito.

   COBRE: os dois eixos que se cruzam em ângulo reto, o ramo no meio do tronco, raio constante. Com os dois raios iguais o
   arredondamento some nos dois pontos em que as paredes ficam tangentes; ali os pontos do arco se fundem num vértice só.
   NÃO COBRE: eixos que não se cruzam ou inclinados; o ramo que chega à ponta do tronco, onde o arredondamento encontra a tampa
   ou o chanfro dela (é o caso da peça de prova da agulha, com o tubo rente às duas faces do outro); três corpos; raio que
   varia. Não é uma operação geral de costura: é a prova de que a malha sai limpa quando a curva da costura é conhecida. */
import { triangularRegiao } from './triangular-regiao.js';

const erro = (campo, texto) => { throw new Error(`juncaoDeTubos.${campo}: ${texto}`); };
const fmt = (x) => String(Number(x.toPrecision(6)));

export function juncaoDeTubos({ raioDoTronco: Rt, comprimentoDoTronco: L, raioDoRamo: Rr, alturaDoRamo: H, raio: r, lados = 144, ladosDoRamo = null, paineis = 4, qualidade } = {}) {
  for (const [nome, v] of [['raioDoTronco', Rt], ['comprimentoDoTronco', L], ['raioDoRamo', Rr], ['alturaDoRamo', H], ['raio', r]]) if (!(typeof v === 'number' && v > 0)) erro(nome, `precisa ser um número maior que zero (veio ${v})`);
  if (Rr > Rt * (1 + 1e-12)) erro('raioDoRamo', `${fmt(Rr)} passa do raio do tronco ${fmt(Rt)}; o ramo é o tubo menor`);
  if (!Number.isInteger(lados) || lados < 16 || lados % 4) erro('lados', `precisa ser um múltiplo de 4, de 16 para cima (veio ${lados})`);
  const Nr = ladosDoRamo ?? Math.max(16, 4 * Math.round((lados * Rr) / Rt / 4));
  if (!Number.isInteger(Nr) || Nr < 8 || Nr % 4) erro('ladosDoRamo', `precisa ser um múltiplo de 4, de 8 para cima (veio ${Nr})`);
  if (!Number.isInteger(paineis) || paineis < 1) erro('paineis', `precisa ser um inteiro de 1 para cima (veio ${paineis})`);
  const ds = (2 * Math.PI * Rt) / lados;
  const meia = Rr + r + 2 * ds;
  if (!(meia < L / 2)) erro('comprimentoDoTronco', `o arredondamento alcança ${fmt(Rr + r)} do eixo do ramo e pede ${fmt(2 * meia)} de tronco; veio ${fmt(L)} (o ramo na ponta do tronco fica fora do protótipo)`);
  if (!(Rt + r + ds < H)) erro('alturaDoRamo', `o arredondamento sobe até ${fmt(Rt + r)}; a altura do ramo precisa passar de ${fmt(Rt + r + ds)} (veio ${fmt(H)})`);

  const V = [], F = [], superficie = [];
  const vertice = (p) => { V.push(p); return V.length - 1; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const face = (q, tipo) => {
    const ids = q.filter((v, i) => v !== q[(i + q.length - 1) % q.length]);
    if (ids.length < 3) return;
    if (ids.length === 3) { F.push(ids); superficie.push(tipo); return; }
    const P = ids.map((v) => V[v]);
    const n = cruz(sub(P[1], P[0]), sub(P[2], P[0]));
    const fora = Math.abs(n[0] * (P[3][0] - P[0][0]) + n[1] * (P[3][1] - P[0][1]) + n[2] * (P[3][2] - P[0][2])) / (Math.hypot(...n) || 1);
    const d02 = Math.hypot(...sub(P[2], P[0])), d13 = Math.hypot(...sub(P[3], P[1]));
    if (fora <= 1e-9 * Math.max(d02, d13)) { F.push(ids); superficie.push(tipo); return; }
    if (d02 <= d13) F.push([ids[0], ids[1], ids[2]], [ids[0], ids[2], ids[3]]);
    else F.push([ids[0], ids[1], ids[3]], [ids[1], ids[2], ids[3]]);
    superficie.push(tipo, tipo);
  };

  /* o arredondamento: em cada estação do ramo, o arco do contato no tronco (i = 0) ao contato no ramo (i = paineis) */
  const arcos = [], contatoNoTronco = [];
  for (let j = 0; j < Nr; j++) {
    const t = (2 * Math.PI * j) / Nr;
    const c = j % (Nr / 2) === Nr / 4 ? 0 : Math.cos(t), s = Math.sin(t);
    const ys = (Rr + r) * s;
    const zs = Math.sqrt(Math.max(0, (Rt + r) ** 2 - ys * ys));
    const S = [(Rr + r) * c, ys, zs];
    const u0 = [0, -ys / (Rt + r), -zs / (Rt + r)], u1 = [-c, -s, 0];
    const alfa = Math.acos(Math.min(1, u0[0] * u1[0] + u0[1] * u1[1] + u0[2] * u1[2]));
    const noTronco = [S[0], (ys * Rt) / (Rt + r), (zs * Rt) / (Rt + r)];
    contatoNoTronco.push([noTronco[0], Rt * Math.atan2(noTronco[1], noTronco[2])]);
    if (alfa < 1e-9) { const v = vertice(noTronco); arcos.push(Array(paineis + 1).fill(v)); continue; }
    const ids = [];
    for (let i = 0; i <= paineis; i++) {
      if (i === 0) { ids.push(vertice(noTronco)); continue; }
      if (i === paineis) { ids.push(vertice([Rr * c, Rr * s, zs])); continue; }
      const f = i / paineis, a = Math.sin((1 - f) * alfa) / Math.sin(alfa), b = Math.sin(f * alfa) / Math.sin(alfa);
      ids.push(vertice([S[0] + r * (a * u0[0] + b * u1[0]), S[1] + r * (a * u0[1] + b * u1[1]), S[2] + r * (a * u0[2] + b * u1[2])]));
    }
    arcos.push(ids);
  }
  for (let j = 0; j < Nr; j++) {
    const A = arcos[j], B = arcos[(j + 1) % Nr];
    for (let i = 0; i < paineis; i++) face([A[i], B[i], B[i + 1], A[i + 1]], 'arredondamento');
  }

  /* a parede e a tampa do ramo */
  const topo = [];
  for (let j = 0; j < Nr; j++) { const t = (2 * Math.PI * j) / Nr; topo.push([Rr * (j % (Nr / 2) === Nr / 4 ? 0 : Math.cos(t)), Rr * Math.sin(t)]); }
  const idsDoTopo = topo.map((p) => vertice([p[0], p[1], H]));
  for (let j = 0; j < Nr; j++) { const k = (j + 1) % Nr; face([arcos[j][paineis], arcos[k][paineis], idsDoTopo[k], idsDoTopo[j]], 'cilindro'); }
  let naoRefinados = 0;
  const tampa = (pontos, ids, ponto3d, inverter) => {
    const t = triangularRegiao(pontos, [pontos.map((_, k) => k)], { qualidade });
    naoRefinados += t.naoRefinados;
    const todos = [...ids];
    for (let k = pontos.length; k < t.pontos.length; k++) todos.push(vertice(ponto3d(t.pontos[k])));
    for (const [a, b, c] of t.triangulos) { F.push(inverter ? [todos[a], todos[c], todos[b]] : [todos[a], todos[b], todos[c]]); superficie.push('plano'); }
  };
  tampa(topo, idsDoTopo, (p) => [p[0], p[1], H], false);

  /* o tronco: a grade em (x, ângulo), com a janela em volta do ramo */
  const nFino = Math.ceil((2 * meia) / ds - 1e-9);
  /* da janela às pontas do tronco as células crescem 1,6 vez por passo, até 8 vezes a largura: o quadro comprido demais ao lado
     do quadro pequeno, na mesma faceta, é o triângulo fino da régua */
  const larguras = [];
  for (let w = ds * 1.6, soma = 0; soma < L / 2 - meia; w = Math.min(w * 1.6, 8 * ds)) { larguras.push(w); soma += w; }
  const encaixe = (L / 2 - meia) / larguras.reduce((x, y) => x + y, 0);
  const fora = [];
  larguras.reduce((x, w, k) => { const y = k === larguras.length - 1 ? L / 2 : x + w * encaixe; fora.push(y); return y; }, meia);
  const xs = [...fora.map((x) => -x).reverse()];
  for (let b = 0; b <= nFino; b++) xs.push(-meia + (2 * meia * b) / nFino);
  xs.push(...fora);
  const angulo = (a) => -Math.PI + (2 * Math.PI * a) / lados;
  const alcance = Math.asin(Math.min(1, (Rr + r) / (Rt + r)));
  const centro = lados / 2;   /* a estação de ângulo zero, no alto do tronco */
  const abertura = Math.min(lados / 2 - 2, Math.ceil(alcance / ((2 * Math.PI) / lados) - 1e-9) + 2);
  const aDe = centro - abertura, aAte = centro + abertura, bDe = fora.length, bAte = fora.length + nFino;
  const grade = [];
  for (let a = 0; a < lados; a++) {
    const f = angulo(a), sen = a % (lados / 2) === 0 ? 0 : Math.sin(f), cos = a % (lados / 2) === lados / 4 ? 0 : Math.cos(f);
    grade.push(xs.map((x, b) => (a > aDe && a < aAte && b > bDe && b < bAte ? -1 : vertice([x, Rt * sen, Rt * cos]))));
  }
  for (let a = 0; a < lados; a++) {
    const k = (a + 1) % lados;
    for (let b = 0; b + 1 < xs.length; b++) {
      if (a >= aDe && a < aAte && b >= bDe && b < bAte) continue;
      face([grade[a][b], grade[a][b + 1], grade[k][b + 1], grade[k][b]], 'cilindro');
    }
  }
  {
    const pontos = [], ids = [];
    const por = (a, b) => { pontos.push([xs[b], Rt * angulo(a)]); ids.push(grade[a][b]); };
    for (let b = bDe; b < bAte; b++) por(aDe, b);
    for (let a = aDe; a < aAte; a++) por(a, bAte);
    for (let b = bAte; b > bDe; b--) por(aAte, b);
    for (let a = aAte; a > aDe; a--) por(a, bDe);
    const borda = pontos.map((_, k) => k);
    const buraco = contatoNoTronco.map((_, k) => pontos.length + k);
    pontos.push(...contatoNoTronco);
    ids.push(...arcos.map((A) => A[0]));
    const t = triangularRegiao(pontos, [borda, buraco], { qualidade, tamanhoMaximo: 1.5 * ds });
    naoRefinados += t.naoRefinados;
    for (let k = pontos.length; k < t.pontos.length; k++) { const [x, s] = t.pontos[k]; ids.push(vertice([x, Rt * Math.sin(s / Rt), Rt * Math.cos(s / Rt)])); }
    for (const [a, b, c] of t.triangulos) { F.push([ids[a], ids[b], ids[c]]); superficie.push('cilindro'); }
  }
  for (const [b, inverter] of [[0, true], [xs.length - 1, false]]) {
    const pontos = grade.map((_, a) => [V[grade[a][b]][1], V[grade[a][b]][2]]);
    tampa(pontos, grade.map((g) => g[b]), (p) => [xs[b], p[0], p[1]], inverter);
  }
  return { V, F, superficie, naoRefinados, ladosDoRamo: Nr };
}
