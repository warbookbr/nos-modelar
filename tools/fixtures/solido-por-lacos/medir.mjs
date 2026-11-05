/* medir.mjs — as medidas da fatia 1 do plano do sólido por laços sobre a malha que o núcleo entrega: o desvio entre duas malhas
 * (a peça de teste contra o corpo feito à mão, ou uma variante contra a forma de referência), o corte da malha por um plano e,
 * no corte, o canto da seção (o recuo da superfície em relação à quina viva e a faixa plana do topo), que mede o terceiro limite
 * contra o `arredondarAresta`; e, na gaiola, a menor distância entre planos de corte e a maior razão entre dois trechos vizinhos
 * do laço, que medem o segundo e o quarto limites antes de subdividir. O fechamento (aresta sem par, vínculo não manifold e triângulo sem área) é medido pelas funções de
 * `tools/oficina/conferir-malha.ts`, no teste ao lado, e a ondulação e o calombo pela ferramenta `ondulacao`. Entra em metro;
 * as medidas saem em milímetro. */
import { derivar } from './forma.js';

const MM = 1000;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** malhaDaParte(neutro, parte?) -> { pontos, triangulos }: as faces da parte (ou todas), em leque, com os vértices que elas usam. */
export function malhaDaParte(neutro, parte = null) {
  const indice = new Map(); const pontos = []; const triangulos = [];
  const idx = (v) => { if (!indice.has(v)) { indice.set(v, pontos.length); pontos.push(neutro.V.get(v)); } return indice.get(v); };
  for (const f of neutro.F.values()) {
    if (parte !== null && f.parte !== parte) continue;
    const vs = f.vs.map(idx);
    for (let k = 1; k + 1 < vs.length; k++) triangulos.push([vs[0], vs[k], vs[k + 1]]);
  }
  return { pontos, triangulos };
}

/* distância de p ao triângulo abc (Ericson, Real-Time Collision Detection, 5.1.5) */
function distanciaAoTriangulo(p, a, b, c) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
  const bp = sub(p, b); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return Math.hypot(...sub(ap, ab.map((x) => x * v))); }
  const cp = sub(p, c); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return Math.hypot(...sub(ap, ac.map((x) => x * w))); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return Math.hypot(...sub(p, [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]));
  }
  const n = cross(ab, ac); const l = Math.hypot(...n);
  return l > 0 ? Math.abs(dot(ap, n)) / l : Math.hypot(...ap);
}

/* grade de triângulos por célula, para a busca do mais perto sem varrer a malha inteira */
function gradeDe(malha, celula) {
  const grade = new Map();
  const chave = (i, j, k) => `${i},${j},${k}`;
  malha.triangulos.forEach((t, n) => {
    const ps = t.map((v) => malha.pontos[v]);
    const lo = [0, 1, 2].map((e) => Math.floor(Math.min(...ps.map((p) => p[e])) / celula));
    const hi = [0, 1, 2].map((e) => Math.floor(Math.max(...ps.map((p) => p[e])) / celula));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const c = chave(i, j, k); if (!grade.has(c)) grade.set(c, []); grade.get(c).push(n);
    }
  });
  return { grade, celula, chave };
}

function distanciaAMalha(p, malha, g, teto) {
  const { grade, celula, chave } = g;
  const c = p.map((x) => Math.floor(x / celula));
  let melhor = Infinity;
  const vistos = new Set();
  for (let anel = 0; anel * celula <= Math.min(melhor, teto) + celula; anel++) {
    for (let i = -anel; i <= anel; i++) for (let j = -anel; j <= anel; j++) for (let k = -anel; k <= anel; k++) {
      if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== anel) continue;
      const lista = grade.get(chave(c[0] + i, c[1] + j, c[2] + k));
      if (!lista) continue;
      for (const n of lista) {
        if (vistos.has(n)) continue; vistos.add(n);
        const [a, b, d] = malha.triangulos[n].map((v) => malha.pontos[v]);
        const x = distanciaAoTriangulo(p, a, b, d);
        if (x < melhor) melhor = x;
      }
    }
  }
  return melhor;
}

/** desvioEntreMalhas(A, B) -> { deAParaB, deBParaA, maximo, ondeA, ondeB } em mm: a maior distância de um vértice de uma malha à
 *  superfície da outra, nos dois sentidos (a distância de Hausdorff pelos vértices), e onde ela fica, em mm. */
export function desvioEntreMalhas(A, B, { celula = 0.01, teto = 0.5 } = {}) {
  const lado = (X, Y) => {
    const g = gradeDe(Y, celula);
    let maximo = 0; let onde = null;
    for (const p of X.pontos) { const d = distanciaAMalha(p, Y, g, teto); if (d > maximo) { maximo = d; onde = p; } }
    return { maximo: maximo * MM, onde: onde && onde.map((x) => Number((x * MM).toFixed(1))) };
  };
  const ab = lado(A, B); const ba = lado(B, A);
  return { deAParaB: ab.maximo, deBParaA: ba.maximo, maximo: Math.max(ab.maximo, ba.maximo), ondeA: ab.onde, ondeB: ba.onde };
}

/** cortePorPlano(malha, eixo, valor) -> pontos (em mm, as duas outras coordenadas na ordem x, y, z sem o eixo) onde as arestas dos
 *  triângulos cruzam o plano eixo = valor (valor em mm). */
export function cortePorPlano(malha, eixo, valorMm) {
  const e = { x: 0, y: 1, z: 2 }[eixo]; const outras = [0, 1, 2].filter((k) => k !== e);
  const v = valorMm / MM; const saida = [];
  for (const t of malha.triangulos) {
    for (let k = 0; k < 3; k++) {
      const a = malha.pontos[t[k]]; const b = malha.pontos[t[(k + 1) % 3]];
      const da = a[e] - v; const db = b[e] - v;
      if ((da < 0) === (db < 0) || da === db) continue;
      const s = da / (da - db);
      saida.push(outras.map((o) => (a[o] + (b[o] - a[o]) * s) * MM));
    }
  }
  return saida;
}

/** cantoDoCorte(pontos, { quina, centro }) -> { recuoMm, raioEquivalenteMm, faixaPlanaMm, ladoMm }: no corte de uma seção (pontos
 *  [u, w] em mm), o canto de quina viva `quina` = [u, w] e bissetriz para dentro até `centro`. O recuo é a distância da quina à
 *  superfície ao longo da bissetriz, pela função suporte: a quina viva dá 0 e o arco exato de raio r dá r(√2 − 1), e o raio
 *  equivalente é o do arco exato com o mesmo recuo. A faixa plana é até onde o topo (w a menos de 0,05 mm da quina) se estende
 *  em u, que no arco exato para em quina − r; o lado é o maior u do corte, que no arco exato é a própria quina. */
export function cantoDoCorte(pontos, { quina, centro }) {
  const d = [quina[0] - centro[0], quina[1] - centro[1]]; const l = Math.hypot(d[0], d[1]); d[0] /= l; d[1] /= l;
  const hQuina = quina[0] * d[0] + quina[1] * d[1];
  const sentidoU = Math.sign(d[0]); const sentidoW = Math.sign(d[1]);
  const doCanto = pontos.filter((p) => (p[0] - centro[0]) * sentidoU >= -1e-9 && (p[1] - centro[1]) * sentidoW >= -1e-9);
  const recuo = hQuina - Math.max(...doCanto.map((p) => p[0] * d[0] + p[1] * d[1]));
  const topo = pontos.filter((p) => Math.abs(p[1] - quina[1]) < 0.05).map((p) => p[0] * sentidoU);
  const arred = (x) => Number(x.toFixed(3));
  return {
    recuoMm: arred(recuo),
    raioEquivalenteMm: arred(recuo / (Math.SQRT2 - 1)),
    faixaPlanaMm: topo.length ? arred(Math.max(...topo) * sentidoU) : null,
    ladoMm: arred(Math.max(...doCanto.map((p) => p[0] * sentidoU)) * sentidoU),
  };
}

/** cantoDaSecao(malha, T) -> o canto de cima em +x da seção da parte deitada no corte z = 0, onde a seção tem o raio
 *  `raioDosCantos` (a quina viva em [meiaLargura, alturaDoEixo + meiaLargura]). */
export function cantoDaSecao(malha, T) {
  const L = T.meiaLargura; const yTopo = T.alturaDoEixo + L; const r = T.raioDosCantos;
  return cantoDoCorte(cortePorPlano(malha, 'z', 0), { quina: [L, yTopo], centro: [L - r, yTopo - r] });
}

/** menorDistanciaEntrePlanos(T) -> a menor distância, em mm, entre dois planos de corte vizinhos da tabela. */
export function menorDistanciaEntrePlanos(T) {
  const p = derivar(T).planos;
  return Math.min(...p.slice(1).map((x, k) => x - p[k]));
}

/** razaoDeAmostragem(T) -> { razao, entre, trechosMm }: no laço do plano x = 0, a maior razão entre os comprimentos de dois
 *  trechos vizinhos do laço que não ficam dos dois lados de um vinco vivo (o chão e a borda da saída), e os dois trechos. */
export function razaoDeAmostragem(T) {
  const { aneis } = derivar(T);
  const an = aneis.find((a) => Math.abs(a.x) < 1e-9);
  /* o laço em ordem: fora (de trás à saída), dentro de volta (da saída ao pé) e o fundo; os pontos de vinco são o primeiro e o
     último de fora e de dentro, e o fundo todo fica no chão */
  const laco = [...an.fora, ...[...an.dentro].reverse(), ...an.fundo];
  const n = laco.length; const nO = an.fora.length;
  const vinco = new Set([0, nO - 1, nO, 2 * nO - 1, ...an.fundo.map((_, j) => 2 * nO + j)]);
  const trecho = (k) => Math.hypot(laco[(k + 1) % n][0] - laco[k][0], laco[(k + 1) % n][1] - laco[k][1]);
  let razao = 1; let entre = null;
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n;
    if (vinco.has(j)) continue;
    const a = trecho(k); const b = trecho(j);
    const q = Math.max(a, b) / Math.min(a, b);
    if (q > razao) { razao = q; entre = [laco[k], laco[j], laco[(j + 1) % n]].map((p) => p.map((x) => Number(x.toFixed(1)))); }
  }
  return { razao: Number(razao.toFixed(2)), pontosZY: entre };
}
