/* proximidade.js — o cabo contra os sólidos da montagem, em medida: onde a ponta pousa na face de uma peça, a folga do cabo a cada sólido e o ponto do cabo mais fundo dentro de uma peça.

   Trabalha sobre os `triangulos` que `prepararSolido` (`src/autoria/contato-de-solidos.js`) devolve, que já estão na pose da montagem e em metro; os resultados saem em milímetro.

   O POUSO DA PONTA. A porta de cabo de uma peça diz o centro e o eixo da saída. `pousoDaPonta` acha a face plana do sólido em que o centro da porta pousa (os triângulos coplanares ligados que contêm o ponto), toma o centroide dela e o
   sentido para fora, e devolve o desvio do centro da porta ao centroide nas três coordenadas e o ângulo entre o eixo e a normal da face. Uma porta posta à mão fora do centro da saída, ou fora de qualquer face, reprova aqui.

   A FOLGA. `folgaDoCabo` mede, da linha de centro do cabo (amostrada a cada meio diâmetro), a distância à superfície de cada sólido menos o raio do cabo; é a folga que pede o curso amostrado mais fino. `pontoMaisFundo` acha o ponto da linha
   de centro mais dentro de um sólido e a direção mais curta para fora dele, de onde sai o ponto em que uma braçadeira tiraria o cabo do caminho. */

export const TOLERANCIA_DE_ALINHAMENTO = Object.freeze({ posicaoMm: 0.1, anguloGraus: 1 });
const TOLERANCIA_DO_PLANO = 5e-5; // 0,05 mm: a ponta pousa no plano da face
const ANGULO_DO_PLANO = Math.cos((0.05 * Math.PI) / 180); // os triângulos do mesmo plano

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mult = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unitario = (a) => mult(a, 1 / norma(a));
const mm3 = (a) => a.map((v) => Number((v * 1000).toFixed(3)) + 0);

/** O ponto do triângulo [a, b, c] mais perto de `p` (Ericson, "Real-Time Collision Detection", 5.1.5). */
export function pontoMaisPertoDoTriangulo(p, [a, b, c]) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return soma(a, mult(ab, d1 / (d1 - d3)));
  const cp = sub(p, c); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return soma(a, mult(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return soma(b, mult(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const k = 1 / (va + vb + vc);
  return soma(a, soma(mult(ab, vb * k), mult(ac, vc * k)));
}

/** A caixa dos triângulos de um sólido preparado, em metro: `{ min, max }`. */
function caixaDe(solido) {
  if (solido.caixa) return solido.caixa;
  const min = [Infinity, Infinity, Infinity]; const max = [-Infinity, -Infinity, -Infinity];
  for (const t of solido.triangulos) for (const p of t) for (let e = 0; e < 3; e += 1) { if (p[e] < min[e]) min[e] = p[e]; if (p[e] > max[e]) max[e] = p[e]; }
  return { min, max };
}

/** O ponto da superfície do sólido mais perto de `p`: `{ ponto, distancia }` (metro). */
export function superficieMaisPerto(solido, p, alcance = Infinity) {
  const { min, max } = caixaDe(solido);
  let fora = 0;
  for (let e = 0; e < 3; e += 1) { const d = Math.max(min[e] - p[e], 0, p[e] - max[e]); fora += d * d; }
  if (Math.sqrt(fora) > alcance) return { ponto: null, distancia: Infinity };
  let melhor = null; let menor = Infinity;
  for (const t of solido.triangulos) {
    const q = pontoMaisPertoDoTriangulo(p, t); const d = norma(sub(p, q));
    if (d < menor) { menor = d; melhor = q; }
  }
  return { ponto: melhor, distancia: menor };
}

/** Se `p` está dentro do sólido fechado: o raio numa direção fixa e fora de eixo cruza as faces um número ímpar de vezes. */
export function estaDentro(solido, p) {
  const { min, max } = caixaDe(solido);
  for (let e = 0; e < 3; e += 1) if (p[e] < min[e] || p[e] > max[e]) return false;
  const d = unitario([0.5772157, 0.6931472, 0.4142136]);
  let cruzamentos = 0;
  for (const [a, b, c] of solido.triangulos) {
    const e1 = sub(b, a); const e2 = sub(c, a); const h = cruz(d, e2); const det = dot(e1, h);
    if (Math.abs(det) < 1e-18) continue;
    const s = sub(p, a); const u = dot(s, h) / det;
    if (u < 0 || u > 1) continue;
    const q = cruz(s, e1); const v = dot(d, q) / det;
    if (v < 0 || u + v > 1) continue;
    if (dot(e2, q) / det > 1e-12) cruzamentos += 1;
  }
  return cruzamentos % 2 === 1;
}

const chaveDoPonto = (p) => p.map((v) => v.toFixed(7)).join(',');

/**
 * Onde o centro de uma porta pousa no sólido: a face plana que o contém (os triângulos coplanares ligados), o centroide dela e a normal para fora. `centro` e `eixo` em metro e unitário. Devolve
 * `{ achou, centroide, normal, desvioMm: [dx, dy, dz], anguloGraus }` (o desvio é o do centro da porta ao centroide, em milímetro) ou `{ achou: false }` quando o centro não toca face nenhuma.
 */
export function pousoDaPonta(solido, centro, eixo) {
  if (!solido?.triangulos?.length) return { achou: false, motivo: 'o sólido não é uma malha que se leia' };
  /* o sentido da normal de cada triângulo não é confiável na malha da booleana (há peça com as faces para dentro), e por isso o plano vale sem sinal e o lado de fora se decide por uma sonda a 0,2 mm do centro */
  const faces = solido.triangulos.map((t) => {
    const n = cruz(sub(t[1], t[0]), sub(t[2], t[0])); const dobro = norma(n);
    return dobro > 0 ? { t, n: mult(n, 1 / dobro), area: dobro / 2 } : null;
  }).filter(Boolean);
  let semente = null; let melhor = -Infinity;
  for (const f of faces) {
    if (norma(sub(centro, pontoMaisPertoDoTriangulo(centro, f.t))) > TOLERANCIA_DO_PLANO) continue;
    const alinhamento = Math.abs(dot(f.n, eixo));
    if (alinhamento > melhor) { melhor = alinhamento; semente = f; }
  }
  if (!semente) return { achou: false, motivo: 'o centro da porta não toca nenhuma face do sólido' };
  const plano = dot(semente.n, semente.t[0]);
  const paraFora = estaDentro(solido, soma(centro, mult(semente.n, 2e-4))) ? mult(semente.n, -1) : semente.n;
  const coplanar = faces.filter((f) => Math.abs(dot(f.n, semente.n)) >= ANGULO_DO_PLANO && Math.abs(dot(semente.n, f.t[0]) - plano) <= TOLERANCIA_DO_PLANO);
  /* o trecho ligado à semente, por vértice em comum */
  const porVertice = new Map();
  coplanar.forEach((f, i) => { for (const p of f.t) { const k = chaveDoPonto(p); if (!porVertice.has(k)) porVertice.set(k, []); porVertice.get(k).push(i); } });
  const visto = new Set(); const fila = [coplanar.indexOf(semente)];
  while (fila.length) {
    const i = fila.pop();
    if (visto.has(i)) continue;
    visto.add(i);
    for (const p of coplanar[i].t) for (const j of porVertice.get(chaveDoPonto(p))) if (!visto.has(j)) fila.push(j);
  }
  let area = 0; let soma3 = [0, 0, 0];
  for (const i of visto) { const f = coplanar[i]; area += f.area; soma3 = soma(soma3, mult(soma(soma(f.t[0], f.t[1]), f.t[2]), f.area / 3)); }
  const centroide = mult(soma3, 1 / area);
  const desvio = sub(centro, centroide);
  return {
    achou: true, centroide: mm3(centroide), normal: paraFora, areaMm2: Number((area * 1e6).toFixed(2)),
    desvioMm: mm3(desvio), anguloGraus: Number(((Math.acos(Math.max(-1, Math.min(1, dot(paraFora, eixo)))) * 180) / Math.PI).toFixed(3)),
  };
}

/** A linha de centro do cabo (pontos em metro), com pontos a cada `passo` de comprimento ao longo dos trechos. */
export function amostrarLinha(pontos, passo) {
  const saida = [{ ponto: pontos[0], arco: 0 }]; let arco = 0;
  for (let i = 1; i < pontos.length; i += 1) {
    const trecho = norma(sub(pontos[i], pontos[i - 1])); const n = Math.max(1, Math.ceil(trecho / passo));
    for (let k = 1; k <= n; k += 1) saida.push({ ponto: soma(pontos[i - 1], mult(sub(pontos[i], pontos[i - 1]), k / n)), arco: arco + (trecho * k) / n });
    arco += trecho;
  }
  return saida;
}

/**
 * A folga do cabo ao sólido: a menor distância da linha de centro à superfície, menos o raio (metro). `ignorarAte` e `ignorarDesde` são os comprimentos de arco do começo e do fim da linha que não contam (o trecho em que o cabo
 * sai da face em que está preso). Devolve `{ folga, arco }` em milímetro, ou `{ folga: Infinity }` quando o sólido está além do `alcance`.
 */
export function folgaAoSolido(amostras, raio, solido, { ignorarAte = 0, ignorarDesde = Infinity, alcance = Infinity } = {}) {
  let menor = Infinity; let onde = null;
  for (const { ponto, arco } of amostras) {
    if (arco < ignorarAte || arco > ignorarDesde) continue;
    const { distancia } = superficieMaisPerto(solido, ponto, alcance + raio);
    if (distancia - raio < menor) { menor = distancia - raio; onde = arco; }
  }
  return menor === Infinity ? { folga: Infinity } : { folga: Number((menor * 1000).toFixed(3)), arco: Number((onde * 1000).toFixed(2)) };
}

/**
 * O ponto da linha de centro mais fundo no sólido (ou o mais encostado, se a linha não entra) e por onde sair: devolve `{ ponto, profundidade, direcao, ponteDaBracadeira, deslocamento }` em milímetro, com `direcao` unitária
 * para fora do sólido, `ponteDaBracadeira` o ponto da linha de centro que deixa o tubo a `folga` da superfície e `deslocamento` a distância do ponto fundo a ele.
 */
export function pontoMaisFundo(amostras, raio, solido, folga = 0) {
  let melhor = null;
  for (const { ponto } of amostras) {
    const { ponto: q, distancia } = superficieMaisPerto(solido, ponto, raio * 4);
    if (!q) continue;
    const dentro = estaDentro(solido, ponto);
    const folgaDoPonto = (dentro ? -distancia : distancia) - raio;
    if (!melhor || folgaDoPonto < melhor.folgaDoPonto) melhor = { ponto, q, distancia, dentro, folgaDoPonto };
  }
  if (!melhor) return null;
  const para = melhor.dentro ? sub(melhor.q, melhor.ponto) : sub(melhor.ponto, melhor.q);
  const direcao = norma(para) > 1e-12 ? unitario(para) : [0, 1, 0];
  const alvo = soma(melhor.q, mult(direcao, raio + folga));
  return {
    ponto: mm3(melhor.ponto), dentro: melhor.dentro, profundidade: Number((-melhor.folgaDoPonto * 1000).toFixed(3)),
    direcao: direcao.map((v) => Number(v.toFixed(3))), ponteDaBracadeira: mm3(alvo), deslocamento: Number((norma(sub(alvo, melhor.ponto)) * 1000).toFixed(2)),
  };
}
