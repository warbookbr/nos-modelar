/* geometria.js — da geometria resolvida a anéis em milímetro e às medidas derivadas.

   Recebe os pontos já resolvidos (`{ nome: [h, v] }`) e os raios dos círculos, e devolve para cada parte um anel fechado: o
   polígono pelos seus pontos, o círculo e o arco discretizados com um número fixo de segmentos por quarto de volta, e a barra pelo
   retângulo em volta do eixo (a espessura não entra no resolvedor). Todo anel sai anti-horário, arredondado a 0,001 mm, sem
   ponto repetido e começando no menor ponto, de modo que a mesma geometria dá os mesmos números.

   O canto arredondado (`raioDoCanto` do polígono e da barra) não passa pelo resolvedor: as relações valem para os pontos de canto
   vivo, como numa cotagem, e o arco tangente às duas arestas é traçado depois de resolver, com o raio dado. Puro. */
import { areaDoAnel, iniciarNoMenor } from './booleanas.js';
import { extremosDaLinha, pontosDaReferencia } from './traducao.js';

export const SEGMENTOS_POR_QUARTO = 16;
export const GRADE_MM = 0.001;

export const r3 = (x) => Math.round(x * 1000) / 1000 || 0;
export const distancia = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/* O ângulo da direção a→b em graus, de 0 (para a direita, +h) a 360, anti-horário (+v para cima). */
export const anguloEmGraus = (a, b) => {
  const g = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return g < 0 ? g + 360 : g;
};

/* Arredonda, tira o ponto que repete o anterior (e o último que repete o primeiro) e começa no menor ponto. */
export function limparAnel(anel) {
  const r = anel.map(([h, v]) => [r3(h), r3(v)]);
  const sem = r.filter((p, i) => i === 0 || p[0] !== r[i - 1][0] || p[1] !== r[i - 1][1]);
  while (sem.length > 1 && sem[0][0] === sem.at(-1)[0] && sem[0][1] === sem.at(-1)[1]) sem.pop();
  return sem;
}

/* O anel orientado no sentido anti-horário. */
export const antiHorario = (anel) => (areaDoAnel(anel) < 0 ? [...anel].reverse() : anel);

function anelDoArco(parte, pontos, segmentos) {
  const c = pontos[parte.centro]; const a = pontos[parte.inicio]; const b = pontos[parte.fim];
  const raio = distancia(c, a);
  const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
  let varredura = Math.atan2(b[1] - c[1], b[0] - c[0]) - a0;
  while (varredura <= 0) varredura += 2 * Math.PI;
  const n = Math.max(2, Math.ceil((varredura / (Math.PI / 2)) * segmentos));
  const anel = [];
  for (let k = 0; k <= n; k += 1) {
    if (k === 0) anel.push([...a]);
    else if (k === n) anel.push([...b]);
    else anel.push([c[0] + raio * Math.cos(a0 + (varredura * k) / n), c[1] + raio * Math.sin(a0 + (varredura * k) / n)]);
  }
  if (parte.fecha === 'centro') anel.push([...c]);
  return anel;
}

/* O retângulo em volta do eixo de uma barra: os quatro vértices, a partir do ponto P (um de cada lado) e depois do Q. */
function retanguloDaBarra(parte, pontos) {
  const [p, q] = parte.pontos.map((n) => pontos[n]);
  const L = distancia(p, q) || 1;
  const nh = (-(q[1] - p[1]) / L) * (parte.espessura / 2); const nv = ((q[0] - p[0]) / L) * (parte.espessura / 2);
  return [[p[0] - nh, p[1] - nv], [q[0] - nh, q[1] - nv], [q[0] + nh, q[1] + nv], [p[0] + nh, p[1] + nv]];
}

/* Os vértices de canto vivo de um polígono ou de uma barra, o raio de cada canto (0 é canto vivo) e como chamar cada vértice numa
   frase; null quando a parte não pede canto arredondado. */
function cantosDaParte(parte, pontos) {
  if (parte.tipo === 'poligono' && parte.raiosDosCantos) return { vertices: parte.pontos.map((n) => pontos[n]), raios: parte.raiosDosCantos, rotulos: parte.pontos.map((n) => `"${n}"`) };
  if (parte.tipo === 'barra' && parte.raioDoCanto) {
    const [p, q] = parte.pontos;
    return { vertices: retanguloDaBarra(parte, pontos), raios: [1, 1, 1, 1].map(() => parte.raioDoCanto), rotulos: [`a ponta de "${p}"`, `a ponta de "${q}"`, `a ponta de "${q}"`, `a ponta de "${p}"`] };
  }
  return null;
}

/* O anel com o canto de raio r traçado como arco tangente às duas arestas. A tangente do canto de ângulo θ mede r / tan(θ/2) a partir
   do vértice, e o centro fica na bissetriz a r / sen(θ/2). Um canto reto de raio r gasta r de cada aresta. `falhas` lista a aresta
   em que as tangentes dos dois cantos somam mais que ela; com falha o anel ainda sai (as tangentes são limitadas à metade da aresta,
   só para a geometria não virar), mas quem grava recusa o desenho. Um vértice reto (θ = 180 graus) ou sem raio fica como está. */
export function arredondarCantos(vertices, raios, segmentos = SEGMENTOS_POR_QUARTO) {
  const n = vertices.length;
  const unit = (de, para) => { const L = distancia(de, para) || 1; return [(para[0] - de[0]) / L, (para[1] - de[1]) / L]; };
  const cantos = vertices.map((P, i) => {
    const A = vertices[(i + n - 1) % n]; const B = vertices[(i + 1) % n];
    const u = unit(P, A); const w = unit(P, B);
    const theta = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1])));
    if (!(raios[i] > 0) || theta < 1e-9 || theta > Math.PI - 1e-9) return { P, u, w, theta, t: 0, r: 0 };
    return { P, u, w, theta, t: raios[i] / Math.tan(theta / 2), r: raios[i] };
  });
  const falhas = [];
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const L = distancia(vertices[i], vertices[j]);
    if (cantos[i].t + cantos[j].t > L + 1e-6) falhas.push({ de: i, ate: j, comprimentoMm: r3(L), pedeMm: r3(cantos[i].t + cantos[j].t) });
  }
  if (falhas.length) {
    cantos.forEach((c, i) => {
      const limite = Math.min(distancia(vertices[i], vertices[(i + n - 1) % n]), distancia(vertices[i], vertices[(i + 1) % n])) / 2;
      if (c.t > limite) { c.t = limite; c.r = limite * Math.tan(c.theta / 2); }
    });
  }
  const anel = [];
  for (const { P, u, w, theta, t, r } of cantos) {
    if (!t) { anel.push([...P]); continue; }
    const T1 = [P[0] + u[0] * t, P[1] + u[1] * t]; const T2 = [P[0] + w[0] * t, P[1] + w[1] * t];
    const b = [u[0] + w[0], u[1] + w[1]]; const Lb = Math.hypot(b[0], b[1]);
    const dc = r / Math.sin(theta / 2);
    const C = [P[0] + (b[0] / Lb) * dc, P[1] + (b[1] / Lb) * dc];
    const a1 = Math.atan2(T1[1] - C[1], T1[0] - C[0]);
    let varredura = Math.atan2(T2[1] - C[1], T2[0] - C[0]) - a1;
    while (varredura > Math.PI) varredura -= 2 * Math.PI;
    while (varredura <= -Math.PI) varredura += 2 * Math.PI;
    const k = Math.max(2, Math.ceil((Math.abs(varredura) / (Math.PI / 2)) * segmentos));
    for (let m = 0; m <= k; m += 1) {
      if (m === 0) anel.push(T1);
      else if (m === k) anel.push(T2);
      else anel.push([C[0] + r * Math.cos(a1 + (varredura * m) / k), C[1] + r * Math.sin(a1 + (varredura * m) / k)]);
    }
  }
  return { anel, falhas };
}

/* As frases dos cantos que não cabem na parte, para recusar o desenho: a aresta, quanto ela mede e quanto os dois cantos pedem. */
export function cantosQueNaoCabem(modelo, pontos) {
  const frases = [];
  for (const nome of Object.keys(modelo.partes).sort()) {
    const c = cantosDaParte(modelo.partes[nome], pontos);
    if (!c) continue;
    for (const f of arredondarCantos(c.vertices, c.raios).falhas) {
      frases.push(`na parte "${nome}" o raio de canto não cabe entre ${c.rotulos[f.de]} e ${c.rotulos[f.ate]}: essa aresta mede ${f.comprimentoMm} mm e os dois cantos pedem ${f.pedeMm} mm de tangência. Reduza o "raioDoCanto" ou alongue a aresta`);
    }
  }
  return frases;
}

/* O anel de uma parte, antes do arredondamento. */
export function anelBrutoDaParte(parte, pontos, raios, nome, segmentos = SEGMENTOS_POR_QUARTO) {
  const cantos = cantosDaParte(parte, pontos);
  if (cantos) return arredondarCantos(cantos.vertices, cantos.raios, segmentos).anel;
  if (parte.tipo === 'poligono') return parte.pontos.map((n) => pontos[n]);
  if (parte.tipo === 'barra') return retanguloDaBarra(parte, pontos);
  if (parte.tipo === 'circulo') {
    const c = pontos[parte.centro]; const r = raios[nome];
    const n = 4 * segmentos;
    return Array.from({ length: n }, (_, k) => [c[0] + r * Math.cos((2 * Math.PI * k) / n), c[1] + r * Math.sin((2 * Math.PI * k) / n)]);
  }
  return anelDoArco(parte, pontos, segmentos);
}

export function anelDaParte(parte, pontos, raios, nome, segmentos) {
  return iniciarNoMenor(limparAnel(antiHorario(anelBrutoDaParte(parte, pontos, raios, nome, segmentos))));
}

export function caixaDe(aneis) {
  const pts = aneis.flat();
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

/* O polígono se cruza em si mesmo? Procura dois lados não vizinhos que se cortam. */
export function seCruza(anel) {
  const n = anel.length;
  const lado = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const [a, b] = [anel[i], anel[(i + 1) % n]]; const [c, d] = [anel[j], anel[(j + 1) % n]];
      if (lado(a, b, c) * lado(a, b, d) < 0 && lado(c, d, a) * lado(c, d, b) < 0) return true;
    }
  }
  return false;
}

/* As duas pontas (em mm) de uma reta citada numa relação, nos pontos já resolvidos. */
export function retaResolvida(modelo, linha, pontos) {
  if (linha.via === 'referencia') return pontosDaReferencia(modelo.referencias[linha.nome]);
  return extremosDaLinha(modelo, linha).map((id) => pontos[id.slice('ponto:'.length)]);
}

/* De que lado da reta a→b o ponto p fica, pelo sinal da distância na direção pedida: acima é o lado de v maior, direita o de h
   maior. `valor` é a distância com sinal em mm (positiva do lado pedido), `ficou` o lado em que o ponto está e `inaplicavel`
   diz que a reta não tem esse par de lados (acima numa reta vertical). */
export function ladoDoPonto(p, a, b, pedido) {
  const L = distancia(a, b) || 1;
  const nh = -(b[1] - a[1]) / L; const nv = (b[0] - a[0]) / L;
  const eixoV = pedido === 'acima' || pedido === 'abaixo';
  let [uh, uv] = [nh, nv];
  if (eixoV ? uv < 0 : uh < 0) { uh = -uh; uv = -uv; }
  const inaplicavel = Math.abs(eixoV ? uv : uh) < 1e-9;
  const s = (p[0] - a[0]) * uh + (p[1] - a[1]) * uv;
  const positivo = eixoV ? 'acima' : 'direita'; const negativo = eixoV ? 'abaixo' : 'esquerda';
  const ficou = Math.abs(s) < 1e-6 ? 'sobre a reta' : s > 0 ? positivo : negativo;
  const sinal = pedido === positivo ? 1 : -1;
  return { valor: s * sinal, ficou, inaplicavel, ok: !inaplicavel && s * sinal > 1e-6 };
}

/* O ponto refletido pela reta a→b. */
export function refletir(p, a, b) {
  const L = distancia(a, b) || 1;
  const uh = (b[0] - a[0]) / L; const uv = (b[1] - a[1]) / L;
  const t = (p[0] - a[0]) * uh + (p[1] - a[1]) * uv;
  const pe = [a[0] + t * uh, a[1] + t * uv];
  return [2 * pe[0] - p[0], 2 * pe[1] - p[1]];
}

/* As medidas que a IA não escreveu e precisa conferir: a caixa da vista, os pontos resolvidos, e por parte a caixa, o comprimento e
   o ângulo da barra, o raio do círculo e os lados do polígono. `aneis` traz o anel de cada parte; `foraDoModelo` não entra na vista. */
export function medidasDerivadas(modelo, pontos, raios, aneis) {
  const caixa = (anel) => {
    const [h0, v0, h1, v1] = caixaDe([anel]);
    return { hMin: r3(h0), hMax: r3(h1), vMin: r3(v0), vMax: r3(v1), larguraMm: r3(h1 - h0), alturaMm: r3(v1 - v0) };
  };
  const partes = {};
  for (const nome of Object.keys(modelo.partes)) {
    const p = modelo.partes[nome];
    const m = { tipo: p.tipo, ...caixa(aneis[nome]) };
    if (p.tipo === 'barra') {
      const [a, b] = p.pontos.map((n) => pontos[n]);
      m.comprimentoMm = r3(distancia(a, b)); m.anguloGraus = r3(anguloEmGraus(a, b)); m.espessuraMm = p.espessura;
      if (p.raioDoCanto) m.raioDoCantoMm = p.raioDoCanto;
    } else if (p.tipo === 'circulo') m.raioMm = r3(raios[nome]);
    else if (p.tipo === 'arco') {
      m.raioMm = r3(distancia(pontos[p.centro], pontos[p.inicio]));
    } else {
      m.lados = p.pontos.map((n, i) => {
        const a = pontos[n]; const b = pontos[p.pontos[(i + 1) % p.pontos.length]];
        return { de: n, ate: p.pontos[(i + 1) % p.pontos.length], comprimentoMm: r3(distancia(a, b)), anguloGraus: r3(anguloEmGraus(a, b)) };
      });
      if (p.raiosDosCantos) m.cantos = p.pontos.map((n, i) => ({ ponto: n, raioMm: p.raiosDosCantos[i] })).filter((c) => c.raioMm > 0);
    }
    partes[nome] = m;
  }
  const dentro = Object.keys(modelo.partes).filter((n) => !modelo.partes[n].foraDoModelo);
  const todas = dentro.length ? dentro : Object.keys(modelo.partes);
  const [h0, v0, h1, v1] = caixaDe(todas.map((n) => aneis[n]));
  return {
    vista: { hMin: r3(h0), hMax: r3(h1), vMin: r3(v0), vMax: r3(v1), larguraMm: r3(h1 - h0), alturaMm: r3(v1 - v0) },
    pontos: Object.fromEntries(Object.keys(pontos).sort().map((n) => [n, [r3(pontos[n][0]), r3(pontos[n][1])]])),
    partes,
  };
}
