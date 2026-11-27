/* promessa-medida.mjs — duas promessas do PLANO que a malha responde por número, conferidas na medição da rodada.
 *
 * A calibração do crítico de 2026-11-27 mostrou que o crítico não vê o vidro 30 mm saliente sobre o casco nem a revolução de 12 lados
 * onde o plano prometia 96 (0 de 3 julgamentos em cada caso). As duas são relação entre o texto da promessa e a malha, e passam a ser
 * medidas aqui, sem nome de peça:
 *
 *  - LADOS. A parte cuja `forma` ou `tecnica` diz "N lados" tem de sair com pelo menos N lados efetivos. Os lados efetivos são 360°
 *    dividido pelo passo angular mediano entre as normais das faces em volta de um eixo principal (x, y ou z), e vale o eixo que dá
 *    mais lados. O passo mediano, e não a contagem, deixa a meia revolução e a revolução recortada com o número de lados que têm. A
 *    revolução inclinada ou varrida numa curva conta lados a mais e passa sem ser conferida; a parte que junta uma revolução facetada
 *    e outra lisa no mesmo eixo passa pela lisa.
 *
 *  - RENTE. A parte cuja `forma` diz "rente a <palavra>", quando a palavra é o nome de outra parte ou a primeira palavra da `forma` de
 *    uma só outra parte, tem de ficar com a face de fora na superfície dessa vizinha. O degrau é a maior altura de um vértice da parte
 *    sobre a superfície exposta da vizinha ao lado dele, medida na normal da face da vizinha: positivo quando a parte sai, negativo
 *    quando afunda. Face exposta é a que a parte não cobre (nenhum raio saído da face, na normal, acha a parte), o que tira da conta
 *    o fundo e as paredes do rebaixo em que a parte assenta, e a altura só vale entre faces viradas para o mesmo lado e quando o
 *    meio do caminho do vértice até a face não fica dentro da vizinha, o que pede a vizinha de malha fechada. Só entram os vértices a até `vizinhanca` de lado da face exposta,
 *    para a curvatura da vizinha não virar degrau. Na vizinha oca, a parte que passa da parede para dentro também conta como saída, e
 *    na parte vazada o fundo do rebaixo que aparece pelo furo conta como superfície da vizinha. A promessa cuja palavra não se resolve
 *    numa parte não é conferida.
 *
 * As coordenadas da malha estão em metro, como em todo o `descrever`, e os números saem em milímetro. Lê só `neutro.V` e `neutro.F`. */

/** Quanto a face de fora da parte prometida rente pode sair ou afundar em relação à vizinha, em mm. O controle medido dá 0,0 mm e o
 *  defeito que a pessoa reprovou tinha de 30 a 41 mm; 5 mm é a folga em volta que os planos do acervo declaram. */
export const TOLERANCIA_DO_RENTE_MM = 5;
/** Até que distância de lado a face exposta da vizinha vale para um vértice da parte, em mm: maior que a folga em volta da parte e
 *  pequena o bastante para a curvatura de um casco não somar mais de 1 mm. */
export const VIZINHANCA_DO_RENTE_MM = 25;
/** A fração dos lados prometidos que a parte tem de ter. As receitas arredondam o contorno ao milímetro, e num círculo pequeno dois lados
 *  vizinhos ficam com a mesma direção: a haste de Ø 36 prometida com 96 lados, aceita pela pessoa, tem 81 lados efetivos, e o cilindro
 *  inclinado aceito tem 90. O defeito medido tinha 12 de 96. */
export const FRACAO_DOS_LADOS = 0.75;
/* normais a menos de 0,05° uma da outra são o mesmo lado */
const PASSO_DO_AZIMUTE = 0.05;
const MM = 1000;
/* a face da parte e a da vizinha olham para o mesmo lado quando as normais fazem menos de 45° */
const MESMO_LADO = Math.SQRT1_2;
const PESOS_DOS_RAIOS = [[1 / 3, 1 / 3, 1 / 3], [0.8, 0.1, 0.1], [0.1, 0.8, 0.1], [0.1, 0.1, 0.8]];

const dobrar = (texto) => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/* as faces de uma parte, na ordem dos ids: os cantos e a normal de Newell */
function facesDaParte(neutro, parte) {
  const faces = [];
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    if (face.parte !== parte || !Array.isArray(face.vs) || face.vs.length < 3) continue;
    const pontos = face.vs.map((v) => neutro.V.get(v));
    if (pontos.some((p) => !p)) continue;
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < pontos.length; k += 1) {
      const a = pontos[k], b = pontos[(k + 1) % pontos.length];
      x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const n = Math.hypot(x, y, z);
    if (!(n > 0)) continue;
    faces.push({ pontos, ids: face.vs, normal: [x / n, y / n, z / n] });
  }
  return faces;
}

/* ---------- lados ---------- */

/** O maior número de lados que o texto promete ("círculo de 96 lados", "tampa de 8 lados"), ou null. */
export function ladosPrometidos(...textos) {
  const numeros = textos.flatMap((t) => [...String(t ?? '').matchAll(/(\d+)\s+lados\b/g)].map((m) => Number(m[1]))).filter((n) => n >= 3);
  return numeros.length ? Math.max(...numeros) : null;
}

function ladosEmVoltaDoEixo(faces, eixo) {
  const [u, v] = [[1, 2], [2, 0], [0, 1]][eixo];
  const lados = [];
  for (const f of faces) {
    if (Math.abs(f.normal[eixo]) > 0.9999) continue;
    lados.push((Math.atan2(f.normal[v], f.normal[u]) * 180) / Math.PI);
  }
  if (lados.length === 0) return 0;
  lados.sort((a, b) => a - b);
  const grupos = [];
  for (const l of lados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && l - ultimo.fim <= PASSO_DO_AZIMUTE) ultimo.fim = l; else grupos.push({ ini: l, fim: l });
  }
  if (grupos.length > 1 && grupos[0].ini + 360 - grupos[grupos.length - 1].fim <= PASSO_DO_AZIMUTE) grupos.pop();
  const centros = grupos.map((g) => (g.ini + g.fim) / 2);
  if (centros.length < 3) return centros.length;
  const passos = centros.map((c, i) => (i + 1 < centros.length ? centros[i + 1] - c : centros[0] + 360 - c)).sort((a, b) => a - b);
  const meio = passos.length >> 1;
  const passo = passos.length % 2 ? passos[meio] : (passos[meio - 1] + passos[meio]) / 2;
  return passo > 0 ? Math.round(360 / passo) : 0;
}

/** Os lados efetivos da parte: `{ lados, eixo }`, com o eixo principal ('x', 'y' ou 'z') que dá mais lados; null quando a parte não tem face. */
export function ladosEfetivos(neutro, parte) {
  const faces = facesDaParte(neutro, parte);
  if (faces.length === 0) return null;
  let melhor = { lados: -1, eixo: null };
  for (const eixo of [0, 1, 2]) {
    const lados = ladosEmVoltaDoEixo(faces, eixo);
    if (lados > melhor.lados) melhor = { lados, eixo: 'xyz'[eixo] };
  }
  return melhor;
}

/* ---------- rente ---------- */

/**
 * As promessas de rente do plano que se resolvem numa vizinha: `[{ parte, vizinha, palavra }]`. A palavra depois de "rente a" (ao, à,
 * aos, às) vale quando é o nome de outra parte ou a primeira palavra da `forma` de uma só outra parte.
 */
export function rentesPrometidos(plano) {
  const partes = plano?.partes ?? [];
  const achados = [];
  for (const p of partes) {
    for (const m of dobrar(p.forma).matchAll(/\brente\s+(?:a|ao|aos|as)\s+([a-z][a-z0-9-]*)/g)) {
      const palavra = m[1];
      const vizinhas = partes.filter((q) => q.nome !== p.nome && (dobrar(q.nome) === palavra || dobrar(q.forma).trim().split(/[^a-z0-9-]+/)[0] === palavra));
      if (vizinhas.length === 1 && !achados.some((a) => a.parte === p.nome && a.vizinha === vizinhas[0].nome)) achados.push({ parte: p.nome, vizinha: vizinhas[0].nome, palavra });
    }
  }
  return achados;
}

const triangulos = (faces) => faces.flatMap((f) => Array.from({ length: f.pontos.length - 2 }, (_, k) => ({ a: f.pontos[0], b: f.pontos[k + 1], c: f.pontos[k + 2], normal: f.normal })));

/* a que distância o raio de `o` na direção unitária `d` cruza o triângulo, ou null (Möller–Trumbore); negativa quando cruza para trás */
function alcanceDoRaio(o, d, t) {
  const e1 = sub(t.b, t.a), e2 = sub(t.c, t.a);
  const h = cross(d, e2);
  const det = dot(e1, h);
  if (Math.abs(det) < 1e-18) return null;
  const s = sub(o, t.a);
  const u = dot(s, h) / det;
  if (u < 0 || u > 1) return null;
  const q = cross(s, e1);
  const v = dot(d, q) / det;
  if (v < 0 || u + v > 1) return null;
  return dot(e2, q) / det;
}
const MICRO = 1e-6;
const raioAcha = (o, d, t) => { const alcance = alcanceDoRaio(o, d, t); return alcance !== null && alcance > MICRO; };
/* o ponto está dentro do sólido? Pela paridade dos cruzamentos de um raio de direção fixa e oblíqua; vale em malha fechada */
const OBLIQUA = (() => { const d = [0.5773, 0.7571, 0.3011]; const n = Math.hypot(...d); return d.map((c) => c / n); })();
const dentro = (p, tris) => tris.reduce((n, t) => { const alcance = alcanceDoRaio(p, OBLIQUA, t); return alcance !== null && alcance > 0 ? n + 1 : n; }, 0) % 2 === 1;

/* o ponto do triângulo mais perto de `p` (Ericson, Real-Time Collision Detection, 5.1.5) */
function maisPertoNoTriangulo(p, { a, b, c }) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b);
  const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]; }
  const cp = sub(p, c);
  const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]; }
  const den = 1 / (va + vb + vc);
  const v = vb * den, w = vc * den;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/**
 * O degrau da face de fora de `parte` sobre a superfície exposta de `vizinha`, em mm: `{ degrauMm, ponto, amostras, expostas }`.
 * `degrauMm` é a maior altura entre os vértices da parte que têm face exposta da vizinha a até `vizinhancaMm` de lado (positivo sai,
 * negativo afunda), `ponto` é o vértice que a deu, em mm, e `amostras` quantos vértices entraram. Sem amostra, `degrauMm` é null.
 */
export function degrauDaParte(neutro, parte, vizinha, { vizinhancaMm = VIZINHANCA_DO_RENTE_MM } = {}) {
  const daParte = facesDaParte(neutro, parte);
  const trisDaParte = triangulos(daParte);
  /* a face da vizinha é exposta quando nenhum de quatro raios (do centro e de perto de cada canto, na normal) acha a parte */
  const trisDaVizinha = triangulos(facesDaParte(neutro, vizinha));
  const expostas = trisDaVizinha.filter((t) => !PESOS_DOS_RAIOS.some(([wa, wb, wc]) => {
    const o = [0, 1, 2].map((k) => wa * t.a[k] + wb * t.b[k] + wc * t.c[k]);
    return trisDaParte.some((p) => raioAcha(o, t.normal, p));
  }));
  /* cada vértice com as normais das faces da parte que o usam: a altura só vale contra a face da vizinha virada para o mesmo lado */
  const vertices = new Map();
  for (const f of daParte) {
    f.ids.forEach((id, k) => {
      if (!vertices.has(id)) vertices.set(id, { ponto: f.pontos[k], normais: [] });
      vertices.get(id).normais.push(f.normal);
    });
  }
  const R = vizinhancaMm / MM;
  let degrau = null, ponto = null, amostras = 0;
  for (const id of [...vertices.keys()].sort((a, b) => a - b)) {
    const { ponto: v, normais } = vertices.get(id);
    let perto = Infinity, altura = null, lado = null, ida = null;
    for (const t of expostas) {
      if (!normais.some((n) => dot(n, t.normal) >= MESMO_LADO)) continue;
      const d = sub(v, maisPertoNoTriangulo(v, t));
      const dist = Math.hypot(...d);
      if (dist >= perto) continue;
      const h = dot(d, t.normal);
      perto = dist; altura = h; lado = Math.sqrt(Math.max(0, dist * dist - h * h)); ida = d;
    }
    if (altura === null || lado > R) continue;
    /* a face da vizinha só vale quando se chega a ela pelo ar: o meio do caminho do vértice até ela não fica dentro da vizinha (a
       face de baixo da parte não se mede contra o outro lado da vizinha) */
    if (perto > MICRO && dentro(v.map((c, k) => c - ida[k] / 2), trisDaVizinha)) continue;
    amostras += 1;
    if (degrau === null || altura > degrau) { degrau = altura; ponto = v; }
  }
  const mm = (n) => Math.round(n * MM * 10) / 10 + 0;
  return { degrauMm: degrau === null ? null : mm(degrau), ponto: ponto ? ponto.map(mm) : null, amostras, expostas: expostas.length };
}

/* ---------- a conferência ---------- */

const numero = (n) => String(n).replace('.', ',');

/**
 * Confere as promessas de lados e de rente do plano contra a malha. Devolve `{ falhas, medidas }`: `falhas` são textos com a parte, o
 * prometido, o medido e o que fazer; `medidas` é cada conferência feita, `{ tipo, parte, ... , ok }`, na ordem das partes do plano.
 * Plano ausente ou sem essas promessas devolve as duas listas vazias.
 */
export function conferirPromessasMedidas(plano, neutro, { toleranciaMm = TOLERANCIA_DO_RENTE_MM, vizinhancaMm = VIZINHANCA_DO_RENTE_MM, fracaoDosLados = FRACAO_DOS_LADOS } = {}) {
  const falhas = [];
  const medidas = [];
  const comMalha = new Set([...neutro.F.values()].map((f) => f.parte));
  for (const p of plano?.partes ?? []) {
    const prometidos = ladosPrometidos(p.forma, p.tecnica);
    if (prometidos === null || !comMalha.has(p.nome)) continue;
    const medido = ladosEfetivos(neutro, p.nome);
    if (!medido) continue;
    const minimo = Math.ceil(prometidos * fracaoDosLados);
    const ok = medido.lados >= minimo;
    medidas.push({ tipo: 'lados', parte: p.nome, prometidos, minimo, efetivos: medido.lados, eixo: medido.eixo, ok });
    if (!ok) falhas.push(`a parte '${p.nome}' saiu com ${medido.lados} lados em volta de ${medido.eixo}, e o PLANO promete ${prometidos} lados (mínimo ${minimo}): a revolução está facetada. Refaça a parte com os lados prometidos, ou mude a promessa no PLANO se o número de lados é o desenho.`);
  }
  for (const r of rentesPrometidos(plano)) {
    if (!comMalha.has(r.parte) || !comMalha.has(r.vizinha)) continue;
    const d = degrauDaParte(neutro, r.parte, r.vizinha, { vizinhancaMm });
    if (d.degrauMm === null) { medidas.push({ tipo: 'rente', ...r, degrauMm: null, ok: true }); continue; }
    const ok = Math.abs(d.degrauMm) <= toleranciaMm;
    medidas.push({ tipo: 'rente', ...r, degrauMm: d.degrauMm, ponto: d.ponto, amostras: d.amostras, toleranciaMm, ok });
    if (!ok) {
      falhas.push(`a parte '${r.parte}' ${d.degrauMm > 0 ? 'sai' : 'afunda'} ${numero(Math.abs(d.degrauMm))} mm em relação à superfície de '${r.vizinha}', e o PLANO a promete rente (até ${numero(toleranciaMm)} mm); o maior degrau está em [${d.ponto.map(numero).join('; ')}] mm. `
        + 'Leve a face de fora da parte à superfície da vizinha, ou tire o rente da promessa no PLANO se o degrau é o desenho.');
    }
  }
  return { falhas, medidas };
}
