/* topologia.js — organizador de topologia: diz o que há de errado no traçado de
 * uma malha, e nunca a reescreve. Até 2026-10-27 morava em `modulos/topologia/`;
 * veio para o núcleo porque é geometria que vira veredito, como a espessura.
 *
 * POR QUE SÓ VEREDITO. A arquitetura deste repositório fixa que geometria→número
 * ou veredito cabe no núcleo, e geometria→geometria nova não, porque a
 * autoridade de nomear face não se delega. Um analisador que "conserta sozinho"
 * decidiria, em silêncio, qual face vira qual — que é exatamente a autoria que
 * a IA não pode terceirizar. Então este arquivo devolve `{veredito, achados}` e
 * quem conserta é quem autora, sabendo o que está consertando.
 *
 * O QUE ELE SERVE. Duas tarefas, a mesma resposta: ao MODELAR, dizer se o que
 * acabou de sair tem defeito de traçado; ao REVISAR peça pronta, dizer onde
 * mexer. O `conferente-topologico` responde manifold e volume — se a malha é um
 * sólido. Esta responde se ela é um sólido BEM TRAÇADO, que é outra pergunta e
 * a que decide se dá para subdividir, deformar e otimizar depois.
 *
 * SEVERIDADE, e por que ela não é gosto. `reprova` é defeito que quebra
 * consumo a jusante: face degenerada, casca aberta, orientação incoerente,
 * aresta não-manifold. `alerta` é o que encarece ou limita sem quebrar: n-gon,
 * polo de valência alta, ilha solta. Um n-gon plano não impede nada; ele impede
 * subdividir bem, e por isso avisa em vez de barrar.
 */
import { triangularSemDegenerado } from './triangulacao-face.js';

export const FORMATO = 'mecanifica.topologia@1';

const EPS_AREA = 1e-12;
const EPS_POS = 1e-9;
/* Distância, em unidade da malha, abaixo da qual um vértice está sobre a aresta. */
const EPS_EM_ARESTA = 1e-6;
export const LIMITE_DE_FACE_FINA = 0.003;
/* Desvio máximo de uma face ao próprio plano, como fração do tamanho dela. No acervo medido a distribuição tem dois grupos sem
   meio-termo: face de caixa desvia 1e-17 (ruído) e face de loft que torce desvia de 1e-2 para cima; 1e-9 fica longe dos dois. */
const TOLERANCIA_PLANARIDADE = 1e-9;
/* Área mínima de um triângulo da triangulação da face, em unidade da malha ao quadrado (1e-14 cm² com a malha em metro). */
const EPS_AREA_TRIANGULO = 1e-18;

export class ErroTopologia extends Error {
  constructor(codigo, mensagem, detalhes = null) {
    super(mensagem);
    this.name = 'ErroTopologia';
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

function normalizarMalha(malha) {
  if (!malha || typeof malha !== 'object') {
    throw new ErroTopologia('malha-invalida', 'Malha precisa ser um objeto com vertices e faces.');
  }
  const brutos = malha.vertices ?? malha.V;
  const brutasFaces = malha.faces ?? malha.F;
  if (!brutos || !brutasFaces) {
    throw new ErroTopologia('malha-invalida', 'Malha precisa declarar vertices e faces.');
  }
  const vertices = new Map();
  const entradas = brutos instanceof Map ? brutos.entries() : Object.entries(brutos);
  for (const [id, ponto] of entradas) {
    if (!Array.isArray(ponto) || ponto.length < 3 || !ponto.slice(0, 3).every(Number.isFinite)) {
      throw new ErroTopologia('vertice-invalido', `Vértice ${id} não tem três números finitos.`, { vertice: id });
    }
    vertices.set(Number(id), ponto.slice(0, 3));
  }
  const faces = [];
  const listaFaces = brutasFaces instanceof Map ? [...brutasFaces.entries()] : Object.entries(brutasFaces);
  for (const [id, face] of listaFaces) {
    const vs = (face?.vs ?? face)?.map?.(Number);
    if (!Array.isArray(vs) || vs.length < 3) {
      throw new ErroTopologia('face-invalida', `Face ${id} tem menos de três cantos.`, { face: id });
    }
    for (const v of vs) {
      if (!vertices.has(v)) {
        throw new ErroTopologia('canto-ausente', `Face ${id} cita o vértice ${v}, que não existe.`, { face: id, vertice: v });
      }
    }
    faces.push({ id: Number(id), vs, parte: face?.parte ?? null });
  }
  return { vertices, faces };
}

function distancia(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

function areaDaFace(vertices, vs) {
  /* Área por Newell: funciona em polígono de qualquer aridade e não assume
     planaridade, ao contrário de somar produtos vetoriais de um leque. */
  let nx = 0; let ny = 0; let nz = 0;
  for (let k = 0; k < vs.length; k++) {
    const a = vertices.get(vs[k]);
    const b = vertices.get(vs[(k + 1) % vs.length]);
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return Math.hypot(nx, ny, nz) / 2;
}

function areaTriangulo(a, b, c) {
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
}

/* Desvio máximo dos cantos ao plano dos três primeiros, relativo ao tamanho da face. */
function planaridade(vertices, vs) {
  const a = vertices.get(vs[0]); const b = vertices.get(vs[1]); const c = vertices.get(vs[2]);
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
  const n = Math.hypot(nx, ny, nz);
  if (n <= 0) return Infinity;
  nx /= n; ny /= n; nz /= n;
  let maior = 0; let escala = 0;
  for (const id of vs) {
    const p = vertices.get(id);
    maior = Math.max(maior, Math.abs(nx * (p[0] - a[0]) + ny * (p[1] - a[1]) + nz * (p[2] - a[2])));
    escala = Math.max(escala, Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]));
  }
  return escala > 0 ? maior / escala : 0;
}

/* Qual diagonal do quadrilátero usar: 0 para a do primeiro canto, 1 para a outra. Só serve a diagonal cujas duas metades
   apontam para o mesmo lado (a outra passa por fora num quad côncavo); entre as que servem, a mais curta. */
export function melhorDiagonal(vertices, vs) {
  const p = vs.map((v) => vertices.get(v));
  const cruz = (a, b, c) => {
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
    const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
  const soma = [0, 0, 0];
  for (let k = 0; k < 4; k++) { const n = cruz(p[k], p[(k + 1) % 4], p[(k + 2) % 4]); for (let e = 0; e < 3; e++) soma[e] += n[e]; }
  const dentro = (i) => [[p[i], p[(i + 1) % 4], p[(i + 2) % 4]], [p[i], p[(i + 2) % 4], p[(i + 3) % 4]]].every((t) => {
    const n = cruz(t[0], t[1], t[2]);
    return n[0] * soma[0] + n[1] * soma[1] + n[2] * soma[2] > 0;
  });
  const d = (i, j) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]);
  const ok0 = dentro(0); const ok1 = dentro(1);
  if (ok0 !== ok1) return ok0 ? 0 : 1;
  return d(1, 3) < d(0, 2) ? 1 : 0;
}

function chaveAresta(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function analisarTopologia(malhaBruta, { limiteValencia = 6, aridadeMaxima = 4, limiteDeFace = LIMITE_DE_FACE_FINA, triangulacao = false } = {}) {
  const { vertices, faces } = normalizarMalha(malhaBruta);
  const achados = [];
  const anota = (severidade, codigo, mensagem, onde) => achados.push({ severidade, codigo, mensagem, onde });

  /* --- face degenerada: canto repetido ou área nula ---
     Vem primeiro porque face de área zero contamina toda medida seguinte:
     normal indefinida, orientação impossível de julgar, e todo exportador a
     jusante ou a descarta em silêncio ou escreve lixo. */
  for (const f of faces) {
    const unicos = new Set(f.vs);
    if (unicos.size !== f.vs.length) {
      anota('reprova', 'canto-repetido', `Face ${f.id} repete um canto.`, { face: f.id });
      continue;
    }
    if (areaDaFace(vertices, f.vs) <= EPS_AREA) {
      anota('reprova', 'area-nula', `Face ${f.id} tem área nula.`, { face: f.id });
      continue;
    }
    /* --- face torta e triângulo de área nula na triangulação ---
       Vieram do preparo de micropolígono, que saiu em 2026-10-25. Face torta triangulada em leque produz silhueta que depende
       de qual canto virou o centro do leque; e um canto colinear dentro de uma face sã produz, no leque do primeiro canto, um
       triângulo de área nula, que os exportadores evitam trocando de leque. O quadrilátero usa a diagonal que fica dentro da
       face. Só com `triangulacao: true`, que o `conferir-malha` liga: a face torta é legítima numa varredura, e quem pergunta
       pela topologia da forma não pergunta pela saída triangulada. */
    if (triangulacao && f.vs.length >= 4) {
      const desvio = planaridade(vertices, f.vs);
      if (desvio > TOLERANCIA_PLANARIDADE) {
        anota('alerta', 'face-torta', `Face ${f.id} desvia ${desvio.toExponential(2)} do próprio plano; o leque de triangulação vira escolha, não consequência.`, { face: f.id, desvio });
      }
      const giro = f.vs.length === 4 ? melhorDiagonal(vertices, f.vs) : 0;
      const vs = giro ? [...f.vs.slice(giro), ...f.vs.slice(0, giro)] : f.vs;
      /* O leque do primeiro canto com triângulo de área nula não reprova mais por si: `triangularSemDegenerado`, a função que os
         exportadores usam, acha outro leque ou as orelhas. Reprova a face que nenhuma triangulação serve. */
      const pontos = vs.map((id) => vertices.get(id));
      const degenerado = (a, b, c) => areaTriangulo(a, b, c) <= EPS_AREA_TRIANGULO;
      if (!triangularSemDegenerado(pontos, degenerado)) {
        const k = pontos.findIndex((_, i) => i >= 1 && i < pontos.length - 1 && degenerado(pontos[0], pontos[i], pontos[i + 1]));
        anota('reprova', 'triangulo-degenerado', `A face ${f.id} produz um triângulo de área nula na triangulação.`, { face: f.id, triangulo: [vs[0], vs[Math.max(k, 1)], vs[Math.max(k, 1) + 1]] });
      }
    }
  }

  /* --- arestas: casca aberta, não-manifold, orientação --- */
  const incidencias = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k];
      const b = f.vs[(k + 1) % f.vs.length];
      const ch = chaveAresta(a, b);
      if (!incidencias.has(ch)) incidencias.set(ch, []);
      incidencias.get(ch).push({ face: f.id, a, b });
    }
  }
  let bordas = 0;
  for (const [ch, lista] of incidencias) {
    if (lista.length === 1) {
      bordas++;
      anota('reprova', 'casca-aberta', `Aresta ${ch} pertence a uma face só.`, { aresta: ch, face: lista[0].face });
    } else if (lista.length > 2) {
      anota('reprova', 'aresta-nao-manifold', `Aresta ${ch} pertence a ${lista.length} faces.`, { aresta: ch, faces: lista.map((i) => i.face) });
    } else {
      /* Duas faces sãs percorrem a aresta compartilhada em sentidos OPOSTOS.
         Mesmo sentido significa que uma delas está com a normal virada, e o
         sintoma aparece longe da causa: sombra errada, exportação furada. */
      const [p, q] = lista;
      if (p.a === q.a && p.b === q.b) {
        anota('reprova', 'orientacao-incoerente', `Faces ${p.face} e ${q.face} percorrem a aresta ${ch} no mesmo sentido.`, { aresta: ch, faces: [p.face, q.face] });
      }
    }
  }

  /* --- n-gon: não quebra, mas encarece ---
     Quadrilátero e triângulo subdividem e deformam de forma previsível; acima
     disso o resultado depende de como o consumidor triangula, e dois
     consumidores podem discordar sobre a MESMA malha. */
  for (const f of faces) {
    if (f.vs.length > aridadeMaxima) {
      anota('alerta', 'n-gon', `Face ${f.id} tem ${f.vs.length} cantos (máximo recomendado ${aridadeMaxima}).`, { face: f.id, cantos: f.vs.length });
    }
  }

  /* --- valência: polos ---
     Vértice com muitas arestas é onde subdivisão e deformação pinçam. Não é
     defeito — toda ponta de cone é um polo —, é um lugar para olhar. */
  const valencia = new Map();
  for (const ch of incidencias.keys()) {
    const [a, b] = ch.split(':').map(Number);
    valencia.set(a, (valencia.get(a) ?? 0) + 1);
    valencia.set(b, (valencia.get(b) ?? 0) + 1);
  }
  for (const [v, grau] of valencia) {
    if (grau > limiteValencia) {
      anota('alerta', 'polo-alto', `Vértice ${v} tem valência ${grau}.`, { vertice: v, valencia: grau });
    }
  }

  /* --- componentes: ilhas soltas ---
     Uma peça que deveria ser um corpo e vem em dois é montagem disfarçada de
     peça, ou sobra de uma operação que não soldou. */
  const adj = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k];
      const b = f.vs[(k + 1) % f.vs.length];
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    }
  }
  const visto = new Set();
  const componenteDe = new Map();
  let componentes = 0;
  for (const v of adj.keys()) {
    if (visto.has(v)) continue;
    componentes++;
    const fila = [v];
    visto.add(v);
    componenteDe.set(v, componentes);
    while (fila.length) {
      const atual = fila.pop();
      for (const w of adj.get(atual) ?? []) if (!visto.has(w)) { visto.add(w); componenteDe.set(w, componentes); fila.push(w); }
    }
  }
  if (componentes > 1) {
    anota('alerta', 'ilhas', `A malha tem ${componentes} componentes desconexos.`, { componentes });
  }

  /* --- face fina demais ---
     Mede cada face pela razão entre a área e o quadrado da maior aresta: um
     triângulo equilátero dá 0,43, e uma lasca comprida e estreita tende a zero.
     No ombro do braço robótico um leque de faces assim, saindo de um vértice
     só, fazia a sombra variar sem regra e o `malha:conferir` aprovava, porque só
     media plano e casca. O limite reprova lasca de verdade (abaixo de 0,003)
     e deixa passar faixa estreita legítima, como o chanfro de um anel, que
     mede perto de 0,05. */
  for (const f of faces) {
    if (new Set(f.vs).size !== f.vs.length) continue;
    const pontos = f.vs.map((v) => vertices.get(v));
    let maior = 0;
    for (let k = 0; k < pontos.length; k++) maior = Math.max(maior, distancia(pontos[k], pontos[(k + 1) % pontos.length]));
    if (maior <= EPS_POS) continue;
    const razao = areaDaFace(vertices, f.vs) / (maior * maior);
    if (razao > EPS_AREA && razao < limiteDeFace) {
      anota('reprova', 'face-fina', `Face ${f.id} é uma lasca: área / maior aresta² = ${razao.toExponential(2)} (limite ${limiteDeFace}).`, { face: f.id, razao });
    }
  }

  /* --- vértice no meio de aresta ---
     Um vértice que cai sobre uma aresta da MESMA superfície sem ser ponta dela
     deixa a malha com um encontro em "T": as faces dos dois lados não
     compartilham esse vértice, e a sombra ou a própria casca rasga ali. Só vale
     dentro do mesmo componente: o centro da tampa do pé da base cai sobre uma
     aresta do fundo do corpo, e são duas partes separadas, sem defeito. */
  const pontasDeAresta = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k];
      const b = f.vs[(k + 1) % f.vs.length];
      if (a !== b) pontasDeAresta.set(a < b ? `${a}|${b}` : `${b}|${a}`, [a, b]);
    }
  }
  const porComponente = new Map();
  for (const [v, c] of componenteDe) {
    if (!porComponente.has(c)) porComponente.set(c, []);
    porComponente.get(c).push(v);
  }
  /* GRADE. Comparar cada aresta com cada vértice do componente é quadrático: uma casca de 27 mil vértices e 54 mil
     arestas levava quase dois minutos. A grade, com célula do tamanho da aresta média, entrega a cada aresta só os
     vértices das células que a caixa dela (alargada em EPS_EM_ARESTA) toca, que contêm todo vértice a menos de
     EPS_EM_ARESTA dela; os candidatos voltam na ordem do componente, e os achados saem os mesmos e na mesma ordem.
     A aresta que cruzaria células demais usa a lista do componente, como antes. */
  const ordemNoComponente = new Map();
  for (const lista of porComponente.values()) lista.forEach((v, k) => ordemNoComponente.set(v, k));
  let somaDasArestas = 0;
  for (const [a, b] of pontasDeAresta.values()) somaDasArestas += distancia(vertices.get(a), vertices.get(b));
  const celula = Math.max(pontasDeAresta.size ? somaDasArestas / pontasDeAresta.size : 0, EPS_EM_ARESTA * 4);
  const MAXIMO_DE_CELULAS_POR_ARESTA = 4096;
  const grade = new Map();
  const indiceDaCelula = (x) => Math.floor(x / celula);
  for (const [v, P] of vertices) {
    if (!componenteDe.has(v)) continue;
    const ch = `${indiceDaCelula(P[0])},${indiceDaCelula(P[1])},${indiceDaCelula(P[2])}`;
    if (!grade.has(ch)) grade.set(ch, []);
    grade.get(ch).push(v);
  }
  const candidatos = (A, B, componente) => {
    const lo = [0, 1, 2].map((e) => indiceDaCelula(Math.min(A[e], B[e]) - EPS_EM_ARESTA));
    const hi = [0, 1, 2].map((e) => indiceDaCelula(Math.max(A[e], B[e]) + EPS_EM_ARESTA));
    if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > MAXIMO_DE_CELULAS_POR_ARESTA) return porComponente.get(componente) ?? [];
    const achados = [];
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      for (const v of grade.get(`${i},${j},${k}`) ?? []) if (componenteDe.get(v) === componente) achados.push(v);
    }
    return achados.sort((p, q) => ordemNoComponente.get(p) - ordemNoComponente.get(q));
  };
  for (const [a, b] of pontasDeAresta.values()) {
    const A = vertices.get(a);
    const B = vertices.get(b);
    const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    if (L2 <= EPS_POS * EPS_POS) continue;
    for (const v of candidatos(A, B, componenteDe.get(a))) {
      if (v === a || v === b) continue;
      const P = vertices.get(v);
      const ap = [P[0] - A[0], P[1] - A[1], P[2] - A[2]];
      const s = (ap[0] * d[0] + ap[1] * d[1] + ap[2] * d[2]) / L2;
      if (s <= 1e-6 || s >= 1 - 1e-6) continue;
      const fora = [ap[0] - s * d[0], ap[1] - s * d[1], ap[2] - s * d[2]];
      if (Math.hypot(fora[0], fora[1], fora[2]) < EPS_EM_ARESTA) {
        anota('reprova', 'vertice-em-aresta', `Vértice ${v} cai no meio da aresta ${a}-${b} sem ser ponta dela.`, { vertice: v, aresta: [a, b] });
      }
    }
  }

  /* --- dobra: duas faces que dividem duas arestas ---
     Duas faces de uma casca sã dividem no máximo uma aresta. Quando dividem
     duas, o vértice entre elas tem só essas duas faces em volta, e uma face
     fica dobrada sobre a outra: a casca parece fechada para as regras de
     aresta acima, mas o sólido não tem interior ali. A primeira seção-aresta
     do loft fazia isso nas pontas da aresta e só o preparo de contato pegava. */
  const paresDeFace = new Map();
  for (const lista of incidencias.values()) {
    if (lista.length !== 2 || lista[0].face === lista[1].face) continue;
    const [f, g] = [lista[0].face, lista[1].face].sort((x, y) => (x < y ? -1 : 1));
    const ch = `${f}|${g}`;
    paresDeFace.set(ch, (paresDeFace.get(ch) ?? 0) + 1);
  }
  for (const [ch, n] of paresDeFace) {
    if (n >= 2) anota('reprova', 'dobra', `Faces ${ch.replace('|', ' e ')} dividem ${n} arestas e dobram uma sobre a outra.`, { faces: ch.split('|') });
  }

  /* --- vértice sem uso ---
     Não quebra nada e infla arquivo; entra como alerta porque some sozinho na
     otimização de saída. */
  const usados = new Set();
  for (const f of faces) for (const v of f.vs) usados.add(v);
  const soltos = [...vertices.keys()].filter((v) => !usados.has(v));
  if (soltos.length) {
    anota('alerta', 'vertice-sem-uso', `${soltos.length} vértice(s) não pertencem a nenhuma face.`, { vertices: soltos.slice(0, 20) });
  }

  const reprovas = achados.filter((a) => a.severidade === 'reprova');
  const alertas = achados.filter((a) => a.severidade === 'alerta');
  return {
    formato: FORMATO,
    veredito: reprovas.length ? 'reprova' : (alertas.length ? 'alerta' : 'aprova'),
    resumo: {
      vertices: vertices.size,
      faces: faces.length,
      arestas: incidencias.size,
      componentes,
      bordas,
      reprovas: reprovas.length,
      alertas: alertas.length,
    },
    achados,
  };
}

/* Distância de um ponto ao seu vizinho mais próximo é a medida que diz se dois
   vértices "no mesmo lugar" existem — o defeito que faz uma malha parecer
   fechada e não estar. Exposto porque a otimização de saída precisa dele. */
export function verticesCoincidentes(malhaBruta, { tolerancia = EPS_POS } = {}) {
  const { vertices } = normalizarMalha(malhaBruta);
  const balde = new Map();
  const pares = [];
  const q = (x) => Math.round(x / Math.max(tolerancia, Number.MIN_VALUE));
  for (const [id, p] of vertices) {
    const ch = `${q(p[0])}|${q(p[1])}|${q(p[2])}`;
    if (balde.has(ch)) pares.push([balde.get(ch), id]);
    else balde.set(ch, id);
  }
  return pares;
}
