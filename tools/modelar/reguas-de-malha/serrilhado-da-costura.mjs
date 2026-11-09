/* serrilhado-da-costura.mjs — régua de malha: degraus e pontas de serra na linha onde as faces de um `arredondarCostura` encontram o resto
   do sólido (plano "costuras e furos limpos", fatia 1). Lê só o estado neutro de uma peça executada (`V`, `F`, `procedencia`).

   Quais são as faces da costura: as que o passo `arredondarCostura` criou e que ficaram lisas (`liso`), que é como a operação marca o
   arredondamento (`liso: 45` em `booleanas.js`). Os pedaços de face que ele cortou das faces de entrada também nascem no passo dele, mas
   ficam sem `liso`, e por isso não entram. Quem já sabe os ids passa `faces` e a régua não consulta a procedência.

   A linha da costura são as arestas entre uma face da costura e uma face de fora, agrupadas em laços e cadeias de vértices de grau 2
   (nos nós de grau diferente de 2 a cadeia termina).

   O critério é a direção que vira e volta. Em cada vértice interno da cadeia, ponta de serra é a virada de mais de `LIMITE_DA_VIRADA` (90
   graus): o produto escalar das duas arestas que chegam nele é negativo, e a linha dá meia-volta. Trecho de serrilhado é a corrida de pontas
   separadas por no máximo `ALCANCE_DO_TRECHO` vértices (o gancho de 1 mm entre arestas de 3 mm que o Blender mostra como dente tem duas ou
   três pontas seguidas), contada uma vez. Por que 90 graus: na peça aceita da união de tubos (`tools/fixtures/uniao-de-tubos/`)
   a linha da costura tem 815 vértices e só 4 passam de 90 graus, os do bico de 175 graus onde o arredondamento some; os outros viram menos de 90
   graus, a escada de arestas longas e curtas que a fatia deixa em toda união. No braço superior passam de 90 graus 61 vértices (o Blender
   mostrou dentes no fim do arredondamento dele). Abaixo de 90 a linha sempre avança; acima, dá meia-volta. O bico legítimo conta como ponta e fica no número: a prova da fatia 2 compara
   contra o que a peça limpa dá. Também sai o maior desvio da linha suavizada, em mm, para quem quiser
   o degrau: o vértice menos o ponto de mesmo parâmetro na corda dos dois vizinhos. */

export const LIMITE_DA_VIRADA = 90;
export const ALCANCE_DO_TRECHO = 3;
export const ABERTURA_DO_FIM_SECO_MM = 0.5;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);

/** Os ids das faces do arredondamento: criadas por um `arredondarCostura` e lisas. Com `passo`, só as desse passo. */
export function facesDaCostura(neutro, { passo = null } = {}) {
  const ids = new Set();
  for (const [id, eventos] of neutro.procedencia?.faces ?? []) {
    const primeiro = eventos[0];
    if (!primeiro || !String(primeiro.operacao).endsWith('arredondarCostura')) continue;
    if (passo != null && primeiro.passo !== passo) continue;
    if (neutro.F.get(id)?.liso) ids.add(id);
  }
  return ids;
}

/** As cadeias da linha da costura: listas de ids de vértice, `fechada` quando o fim volta ao começo. Ordem determinística. */
export function linhasDaCostura(neutro, faces) {
  const arestas = new Map();
  for (const f of neutro.F.values()) {
    const n = f.vs.length;
    for (let i = 0; i < n; i++) {
      const a = f.vs[i], b = f.vs[(i + 1) % n];
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const e = arestas.get(k);
      if (e) e.dentro.push(faces.has(f.id)); else arestas.set(k, { a, b, dentro: [faces.has(f.id)] });
    }
  }
  const adj = new Map();
  const liga = (x, y) => { if (!adj.has(x)) adj.set(x, []); adj.get(x).push(y); };
  for (const e of arestas.values()) if (e.dentro.length === 2 && e.dentro[0] !== e.dentro[1]) { liga(e.a, e.b); liga(e.b, e.a); }
  const visto = new Set();
  const chave = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const cadeias = [];
  const andar = (inicio, segundo) => {
    const ids = [inicio];
    let ant = inicio, atual = segundo;
    visto.add(chave(ant, atual));
    while (true) {
      ids.push(atual);
      const viz = adj.get(atual);
      if (viz.length !== 2) return { ids, fechada: false };
      const prox = viz[0] === ant ? viz[1] : viz[0];
      if (visto.has(chave(atual, prox))) return { ids, fechada: false };
      visto.add(chave(atual, prox));
      if (prox === inicio) return { ids, fechada: true };
      ant = atual; atual = prox;
    }
  };
  const nos = [...adj.keys()].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  for (const v of nos) if (adj.get(v).length !== 2) for (const w of adj.get(v)) if (!visto.has(chave(v, w))) cadeias.push(andar(v, w));
  for (const v of nos) for (const w of adj.get(v)) if (!visto.has(chave(v, w))) cadeias.push(andar(v, w));
  return cadeias;
}

function unitario(a) { const n = norma(a); return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : null; }

/* por vértice da cadeia: { virada (graus), desvioMm }, ou null nas pontas de uma cadeia aberta */
function viradas(P, fechada) {
  const n = P.length;
  const saida = [];
  for (let i = 0; i < n; i++) {
    if (!fechada && (i === 0 || i === n - 1)) { saida.push(null); continue; }
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const e1 = sub(b, a), e2 = sub(c, b);
    const u = unitario(e1), v = unitario(e2);
    if (!u || !v) { saida.push(null); continue; }
    const virada = (Math.acos(Math.max(-1, Math.min(1, dot(u, v)))) * 180) / Math.PI;
    const l1 = norma(e1), l2 = norma(e2);
    const alvo = [0, 1, 2].map((k) => (l2 * a[k] + l1 * c[k]) / (l1 + l2));
    saida.push({ virada, desvioMm: norma(sub(b, alvo)) * 1000 });
  }
  return saida;
}

/** Mede o serrilhado de cada linha da costura. { linhas: [{ vertices, fechada, pontas, trechos, maiorDesvioMm }], pontas, trechos, faces } */
export function medirSerrilhadoDaCostura(neutro, { faces = null, limite = LIMITE_DA_VIRADA } = {}) {
  const dentro = faces ?? facesDaCostura(neutro);
  const linhas = [];
  let pontas = 0, trechos = 0, pontasLargas = 0;
  if (dentro.size) {
    for (const { ids, fechada } of linhasDaCostura(neutro, dentro)) {
      const P = ids.map((v) => neutro.V.get(v));
      const vs = viradas(P, fechada);
      const n = vs.length;
      const marcas = [];
      let maior = 0;
      vs.forEach((x, i) => { if (!x) return; maior = Math.max(maior, x.desvioMm); if (x.virada > limite) marcas.push(i); });
      let t = 0;
      for (let k = 0; k < marcas.length; k++) if (k === 0 || marcas[k] - marcas[k - 1] > ALCANCE_DO_TRECHO) t++;
      if (fechada && t > 1 && marcas[0] + n - marcas[marcas.length - 1] <= ALCANCE_DO_TRECHO) t--;
      /* abertura da ponta: a distância entre os dois vizinhos do vértice que dá meia-volta. O bico em que o arredondamento some afina até menos de 0,3 mm; a ponta com
         mais de `ABERTURA_DO_FIM_SECO_MM` de abertura é o tubo que termina numa tampa reta (fim seco). O bico da união de tubos aceita (175°) tem 1,67 mm e conta aqui. */
      const largas = marcas.filter((i) => P[(i + n - 1) % n] && P[(i + 1) % n] && norma(sub(P[(i + n - 1) % n], P[(i + 1) % n])) * 1000 > ABERTURA_DO_FIM_SECO_MM).length;
      pontas += marcas.length; trechos += t; pontasLargas += largas;
      linhas.push({ vertices: n, fechada, pontas: marcas.length, trechos: t, pontasLargas: largas, maiorDesvioMm: +maior.toFixed(3) });
    }
  }
  return { linhas, pontas, trechos, pontasLargas, faces: dentro.size };
}
