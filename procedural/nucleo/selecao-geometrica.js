/* selecao-geometrica.js — o seletor `onde` de `sel`: face ou aresta por propriedade geométrica.

   `sel:{ onde: {...} }` não é uma gramática paralela. É a nona chave de `sel`, ao lado de `grupo`, `regiao`, `origem`,
   `porta` e `alias`, com UMA diferença deliberada: as outras chaves se UNEM, e `onde` FILTRA. Com outras chaves na mesma
   seleção, `onde` escolhe dentro do que elas selecionaram (a interseção: "as faces de cima desta origem"); sozinha,
   escolhe entre todas as faces vivas da malha. Quem quer a união escreve duas seleções.

   Critérios, aplicados nesta ordem (a ordem é parte do contrato, porque `extremo` mede entre os que sobraram):
     alvo     'face' (padrão) ou 'aresta'. Se `tipo` só existe para um alvo, o alvo se deduz dele.
     tipo     face: 'plana' | 'empenada'. aresta: 'viva' | 'lisa' | 'borda'.
              viva/lisa pedem `angulo` (graus entre as normais das duas faces: 0 é liso, 90 é a quina de uma caixa);
              viva é estritamente acima, lisa é até ele, com folga de 1e-6 graus para o ruído do acos. Aresta de uma
              face só é 'borda'; aresta de uma face ou de três ou mais não tem diedro e não é viva nem lisa.
     normal   {dir:[x,y,z], ate:graus}: a normal da face a até `ate` graus de `dir`. Numa aresta vale se alguma das
              faces vizinhas passa.
     extremo  {eixo:'x'|'y'|'z', lado:'max'|'min', tol?}: o elemento cujo CENTRO (média dos cantos da face, ponto médio
              da aresta) está no maior ou menor valor do eixo entre os candidatos, e os que ficam a até `tol` dele
              (padrão 1e-6, em unidades do mundo).
     conexo   {de:[x,y,z], dir:[x,y,z], ate?}: só de face. O pedaço conexo (faces ligadas por aresta, entre as candidatas que
              sobraram dos critérios acima) que contém a primeira face que o raio de `de` na direção `dir` toca. É a
              semente de um pedaço: depois de uma booleana que parte uma chapa em várias, o ponto visto de uma vista
              nomeia o pedaço sem citar id. O raio que não toca nenhuma candidata grita, dizendo que a semente caiu fora
              ou num vão. Empate de distância vai para a face de menor id.
              `ate` é a distância máxima de `de` ao primeiro toque, na unidade do mundo: a semente salva guarda onde viu a chapa,
              e se a chapa ou a linha mudarem a ponto de o raio atravessar um vão e tocar a camada de trás, o primeiro toque passa
              de `ate` e a seleção grita em vez de nomear o pedaço errado. `de` e `ate` são medidas (o conversor de mm para metro
              converte as duas); `dir` é só direção.

   Uma aresta é a ligação entre dois cantos consecutivos de uma face, identificada pelo par de vértices (ordenado). Ela
   pertence à base quando alguma face vizinha está na base. A saída é determinística: faces por id e arestas pelo par
   de vértices, em ordem crescente. Nada aqui lê relógio nem sorteia. */

import { triangularFace } from './triangulacao-face.js';

export const ALVOS_DE_SELECAO = Object.freeze(['face', 'aresta']);
export const TIPOS_DE_FACE = Object.freeze(['plana', 'empenada']);
export const TIPOS_DE_ARESTA = Object.freeze(['viva', 'lisa', 'borda']);
const CHAVES_ONDE = ['alvo', 'tipo', 'angulo', 'normal', 'extremo', 'conexo'];
const EIXOS = { x: 0, y: 1, z: 2 };
const FOLGA_ANGULO = 1e-6;
const TOL_PADRAO = 1e-6;

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const graus = (rad) => (rad * 180) / Math.PI;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* planaridade de uma face: o maior desvio dos cantos ao plano de Newell, contra o tamanho da própria face */
function desvioDoPlano(V, vs, n) {
  const pontos = vs.map((v) => V.get(v));
  const c = [0, 1, 2].map((e) => pontos.reduce((s, p) => s + p[e], 0) / pontos.length);
  let desvio = 0, diagonal = 0;
  for (const p of pontos) {
    desvio = Math.max(desvio, Math.abs(dot([p[0] - c[0], p[1] - c[1], p[2] - c[2]], n)));
    diagonal = Math.max(diagonal, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
  }
  return { desvio, limite: 1e-6 * diagonal + 1e-9 };
}

function lerNumero(st, valor, campo) {
  let n;
  try { n = st.num(valor); } catch (e) { return { erro: `${campo} não resolve: ${String(e.message).replace(/^oficina: /, '')}` }; }
  if (typeof n !== 'number' || !Number.isFinite(n)) return { erro: `${campo} precisa ser um número finito (recebido ${JSON.stringify(valor)})` };
  return { valor: n };
}

/* Valida e normaliza `onde` sem tocar a malha. { erro } fala o campo e o que estava errado. */
export function lerOnde(st, onde) {
  if (!ehObjeto(onde)) return { erro: `precisa ser um objeto com ${CHAVES_ONDE.join(', ')}` };
  for (const chave of Object.keys(onde)) if (!CHAVES_ONDE.includes(chave)) return { erro: `chave desconhecida '${chave}' (só ${CHAVES_ONDE.join(', ')})` };
  if (!Object.keys(onde).length) return { erro: `vazio: informe ao menos um entre ${CHAVES_ONDE.filter((c) => c !== 'alvo' && c !== 'angulo').join(', ')}` };

  let alvo = onde.alvo;
  if (alvo != null && !ALVOS_DE_SELECAO.includes(alvo)) return { erro: `alvo só aceita ${ALVOS_DE_SELECAO.map((a) => `'${a}'`).join(' ou ')}; recebido ${JSON.stringify(alvo)}` };
  const r = { alvo: null, tipo: null, angulo: null, normal: null, extremo: null, conexo: null };

  if (onde.tipo != null) {
    const daFace = TIPOS_DE_FACE.includes(onde.tipo), daAresta = TIPOS_DE_ARESTA.includes(onde.tipo);
    if (!daFace && !daAresta) return { erro: `tipo '${onde.tipo}' desconhecido (face: ${TIPOS_DE_FACE.join(', ')}; aresta: ${TIPOS_DE_ARESTA.join(', ')})` };
    const doTipo = daFace ? 'face' : 'aresta';
    if (alvo != null && alvo !== doTipo) return { erro: `tipo '${onde.tipo}' é de ${doTipo}, e alvo pediu '${alvo}'` };
    alvo = doTipo;
    r.tipo = onde.tipo;
  }
  r.alvo = alvo ?? 'face';

  const precisaAngulo = r.tipo === 'viva' || r.tipo === 'lisa';
  if (precisaAngulo) {
    if (onde.angulo == null) return { erro: `tipo '${r.tipo}' pede angulo (graus entre as normais das duas faces, de 0 a 180)` };
    const a = lerNumero(st, onde.angulo, 'angulo');
    if (a.erro) return a;
    if (a.valor < 0 || a.valor > 180) return { erro: `angulo precisa estar entre 0 e 180 graus; recebido ${a.valor}` };
    r.angulo = a.valor;
  } else if (onde.angulo != null) {
    return { erro: `angulo só acompanha tipo 'viva' ou 'lisa'` };
  }

  if (onde.normal != null) {
    const n = onde.normal;
    if (!ehObjeto(n) || Object.keys(n).some((k) => k !== 'dir' && k !== 'ate') || n.dir == null || n.ate == null) return { erro: `normal precisa ser {dir:[x,y,z], ate:graus}` };
    let dir;
    try { dir = st.vec(n.dir); } catch (e) { return { erro: `normal.dir não resolve: ${String(e.message).replace(/^oficina: /, '')}` }; }
    if (!Array.isArray(dir) || dir.length !== 3 || dir.some((x) => typeof x !== 'number' || !Number.isFinite(x))) return { erro: `normal.dir precisa ser [x,y,z] finito` };
    const len = Math.hypot(...dir);
    if (!(len > 1e-9)) return { erro: `normal.dir não pode ser o vetor nulo` };
    const ate = lerNumero(st, n.ate, 'normal.ate');
    if (ate.erro) return ate;
    if (ate.valor < 0 || ate.valor > 180) return { erro: `normal.ate precisa estar entre 0 e 180 graus; recebido ${ate.valor}` };
    r.normal = { dir: dir.map((x) => x / len), ate: ate.valor, pedido: { dir: [...dir], ate: ate.valor } };
  }

  if (onde.extremo != null) {
    const e = onde.extremo;
    if (!ehObjeto(e) || Object.keys(e).some((k) => k !== 'eixo' && k !== 'lado' && k !== 'tol')) return { erro: `extremo precisa ser {eixo:'x'|'y'|'z', lado:'max'|'min', tol?}` };
    if (!Object.hasOwn(EIXOS, e.eixo)) return { erro: `extremo.eixo só aceita 'x', 'y' ou 'z'; recebido ${JSON.stringify(e.eixo)}` };
    if (e.lado !== 'max' && e.lado !== 'min') return { erro: `extremo.lado só aceita 'max' ou 'min'; recebido ${JSON.stringify(e.lado)}` };
    let tol = TOL_PADRAO;
    if (e.tol != null) {
      const t = lerNumero(st, e.tol, 'extremo.tol');
      if (t.erro) return t;
      if (t.valor < 0) return { erro: `extremo.tol não pode ser negativa; recebido ${t.valor}` };
      tol = t.valor;
    }
    r.extremo = { eixo: e.eixo, lado: e.lado, tol };
  }

  if (onde.conexo != null) {
    const c = onde.conexo;
    if (!ehObjeto(c) || Object.keys(c).some((k) => k !== 'de' && k !== 'dir' && k !== 'ate') || c.de == null || c.dir == null) return { erro: `conexo precisa ser {de:[x,y,z], dir:[x,y,z], ate?}: o ponto de onde o raio sai, a direção dele e, se quiser, a distância máxima do primeiro toque` };
    if (r.alvo !== 'face') return { erro: `conexo escolhe o pedaço de faces ligadas por aresta e só vale para alvo 'face'` };
    const vetor = (valor, campo) => {
      let v;
      try { v = st.vec(valor); } catch (e) { return { erro: `${campo} não resolve: ${String(e.message).replace(/^oficina: /, '')}` }; }
      if (!Array.isArray(v) || v.length !== 3 || v.some((x) => typeof x !== 'number' || !Number.isFinite(x))) return { erro: `${campo} precisa ser [x,y,z] finito` };
      return { v };
    };
    const de = vetor(c.de, 'conexo.de');
    if (de.erro) return de;
    const dir = vetor(c.dir, 'conexo.dir');
    if (dir.erro) return dir;
    const len = Math.hypot(...dir.v);
    if (!(len > 1e-9)) return { erro: `conexo.dir não pode ser o vetor nulo` };
    r.conexo = { de: de.v, dir: dir.v.map((x) => x / len), ate: null };
    if (c.ate != null) {
      const ate = lerNumero(st, c.ate, 'conexo.ate');
      if (ate.erro) return ate;
      if (!(ate.valor > 0)) return { erro: `conexo.ate precisa ser maior que zero; recebido ${ate.valor}` };
      r.conexo.ate = ate.valor;
    }
  }

  if (!r.tipo && !r.normal && !r.extremo && !r.conexo) return { erro: `informe ao menos um critério entre tipo, normal, extremo e conexo (alvo e angulo sozinhos não escolhem nada)` };
  return { onde: r };
}

/* arestas da malha: par ordenado de vértices -> faces que a usam, em ordem de id */
function arestasDaMalha(F) {
  const mapa = new Map();
  for (const f of [...F.values()].sort((a, b) => a.id - b.id)) {
    for (let k = 0; k < f.vs.length; k++) {
      const p = f.vs[k], q = f.vs[(k + 1) % f.vs.length];
      if (p === q) continue;
      const a = Math.min(p, q), b = Math.max(p, q), chave = `${a}>${b}`;
      let e = mapa.get(chave);
      if (!e) { e = { a, b, faces: [] }; mapa.set(chave, e); }
      if (e.faces[e.faces.length - 1] !== f.id) e.faces.push(f.id);
    }
  }
  return [...mapa.values()].sort((x, y) => x.a - y.a || x.b - y.b);
}

function descreve(onde) {
  const partes = [];
  if (onde.tipo) partes.push(`tipo ${onde.tipo}${onde.angulo != null ? ` (angulo ${onde.angulo})` : ''}`);
  if (onde.normal) partes.push(`normal a ate ${onde.normal.ate}° de [${onde.normal.pedido.dir.join(', ')}]`);
  if (onde.extremo) partes.push(`${onde.extremo.lado} em ${onde.extremo.eixo} (tol ${onde.extremo.tol})`);
  if (onde.conexo) partes.push(`pedaço conexo tocado pelo raio de [${onde.conexo.de.join(', ')}] na direção [${onde.conexo.dir.map((x) => Math.round(x * 1e6) / 1e6).join(', ')}]`);
  return partes.join(' + ');
}

/* Resolve `onde` (já lido por lerOnde) sobre a malha. `base`: null (toda a malha viva) ou { faces:Set } com o que as
   outras chaves de `sel` escolheram. Devolve { faces:[ids], arestas:[[a,b]…], vertices:[ids] } ou { erro } de seleção
   vazia, dizendo quantos candidatos havia e quantos sobraram a cada critério. */
export function resolverOnde(st, onde, base, normalDaFace) {
  const { V, F } = st;
  const normais = new Map();
  for (const [id, f] of F) normais.set(id, f.vs.length >= 3 && f.vs.every((v) => V.has(v)) ? normalDaFace(V, f.vs) : [0, 0, 0]);
  const normalValida = (id) => Math.hypot(...normais.get(id)) > 0.5;
  const funil = [];

  const passaNormal = (id) => {
    if (!normalValida(id)) return false;
    const c = Math.max(-1, Math.min(1, dot(normais.get(id), onde.normal.dir)));
    return graus(Math.acos(c)) <= onde.normal.ate + FOLGA_ANGULO;
  };

  let itens;     // faces: ids; arestas: { a, b, faces }
  let centro;    // item -> [x,y,z]
  if (onde.alvo === 'face') {
    itens = [...F.keys()].filter((id) => !base || base.faces.has(id)).sort((x, y) => x - y);
    funil.push(`${itens.length} face(s) candidata(s)`);
    if (onde.tipo) {
      itens = itens.filter((id) => {
        const n = normais.get(id);
        if (!normalValida(id)) return onde.tipo === 'empenada';
        const { desvio, limite } = desvioDoPlano(V, F.get(id).vs, n);
        return (desvio <= limite) === (onde.tipo === 'plana');
      });
      funil.push(`${itens.length} após tipo ${onde.tipo}`);
    }
    if (onde.normal) { itens = itens.filter(passaNormal); funil.push(`${itens.length} após normal`); }
    centro = (id) => { const vs = F.get(id).vs; return [0, 1, 2].map((e) => vs.reduce((s, v) => s + V.get(v)[e], 0) / vs.length); };
  } else {
    itens = arestasDaMalha(F).filter((e) => e.faces.some((id) => !base || base.faces.has(id)));
    funil.push(`${itens.length} aresta(s) candidata(s)`);
    if (onde.tipo) {
      itens = itens.filter((e) => {
        if (onde.tipo === 'borda') return e.faces.length === 1;
        if (e.faces.length !== 2 || !e.faces.every(normalValida)) return false;
        const d = graus(Math.acos(Math.max(-1, Math.min(1, dot(normais.get(e.faces[0]), normais.get(e.faces[1]))))));
        return onde.tipo === 'viva' ? d > onde.angulo + FOLGA_ANGULO : d <= onde.angulo + FOLGA_ANGULO;
      });
      funil.push(`${itens.length} após tipo ${onde.tipo}`);
    }
    if (onde.normal) { itens = itens.filter((e) => e.faces.some(passaNormal)); funil.push(`${itens.length} após normal`); }
    centro = (e) => { const p = V.get(e.a), q = V.get(e.b); return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]; };
  }

  if (onde.extremo && itens.length) {
    const e = EIXOS[onde.extremo.eixo], sinal = onde.extremo.lado === 'max' ? 1 : -1;
    const valor = (item) => sinal * centro(item)[e];
    let melhor = -Infinity;
    for (const item of itens) melhor = Math.max(melhor, valor(item));
    itens = itens.filter((item) => valor(item) >= melhor - onde.extremo.tol);
    funil.push(`${itens.length} após extremo`);
  }

  if (onde.conexo && itens.length) {
    const raios = prepararRaios(V, F, itens);
    const acerto = raios.primeiro(onde.conexo.de, onde.conexo.dir);
    if (!acerto) {
      return { erro: `seleção onde vazia: o raio de [${onde.conexo.de.join(', ')}] na direção [${onde.conexo.dir.map((x) => Math.round(x * 1e6) / 1e6).join(', ')}] não toca nenhuma das ${itens.length} face(s) candidata(s) (${funil.join(' → ')}); a semente cai fora da peça ou num vão, e o ponto precisa estar na vista de um pedaço, com o raio vindo de fora dele` };
    }
    if (onde.conexo.ate != null && acerto.t > onde.conexo.ate) {
      return { erro: `seleção onde recusada: o primeiro toque do raio de [${onde.conexo.de.join(', ')}] está a ${Math.round(acerto.t * 1e6) / 1e6}, além de ate (${onde.conexo.ate}): a semente passou por um vão ou a chapa mudou desde que ela foi lida, e o raio tocaria a camada de trás; leve a semente para dentro do pedaço (ou reescreva o ate)` };
    }
    itens = componenteDe(F, itens, acerto.face);
    funil.push(`${itens.length} no pedaço da face ${acerto.face}`);
  }

  if (!itens.length) {
    return { erro: `seleção onde vazia: nenhuma ${onde.alvo} satisfaz ${descreve(onde)}${base ? ' dentro do que as outras chaves de sel escolheram' : ''} (${funil.join(' → ')})` };
  }
  if (onde.alvo === 'face') {
    const vertices = [...new Set(itens.flatMap((id) => F.get(id).vs))].sort((x, y) => x - y);
    return { faces: itens, arestas: [], vertices };
  }
  const vertices = [...new Set(itens.flatMap((e) => [e.a, e.b]))].sort((x, y) => x - y);
  return { faces: [], arestas: itens.map((e) => [e.a, e.b]), vertices };
}

/* Os pedaços conexos de um conjunto de faces: duas faces estão no mesmo pedaço quando dividem uma aresta (o par de vértices).
   Devolve os pedaços como listas de ids em crescente, ordenados pelo menor id. */
export function pedacosConexos(F, ids) {
  const lista = [...ids].sort((a, b) => a - b);
  const pai = new Map(lista.map((id) => [id, id]));
  const raiz = (x) => { while (pai.get(x) !== x) { pai.set(x, pai.get(pai.get(x))); x = pai.get(x); } return x; };
  const dono = new Map();
  for (const id of lista) {
    const vs = F.get(id).vs;
    for (let k = 0; k < vs.length; k++) {
      const p = vs[k], q = vs[(k + 1) % vs.length];
      if (p === q) continue;
      const chave = p < q ? `${p}>${q}` : `${q}>${p}`;
      if (dono.has(chave)) { const a = raiz(dono.get(chave)), b = raiz(id); if (a !== b) pai.set(Math.max(a, b), Math.min(a, b)); } else dono.set(chave, id);
    }
  }
  const grupos = new Map();
  for (const id of lista) { const r = raiz(id); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(id); }
  return [...grupos.values()].sort((x, y) => x[0] - y[0]);
}

function componenteDe(F, ids, face) {
  return pedacosConexos(F, ids).find((g) => g.includes(face)) ?? [face];
}

/* Raios contra um conjunto de faces, triangulando cada uma uma vez. `primeiro(de, dir)` devolve { face, t, ponto } da
   primeira face tocada à frente de `de` (t >= 0, dir unitária), ou null; empate de t, a face de menor id. O triângulo
   inclui a borda, com folga relativa de 1e-9. */
export function prepararRaios(V, F, ids) {
  const tris = [];
  for (const id of [...ids].sort((a, b) => a - b)) {
    const f = F.get(id);
    const pts = f.vs.map((v) => V.get(v));
    if (pts.length < 3 || pts.some((p) => !p)) continue;
    for (const [i, j, k] of triangularFace(pts)) {
      const a = pts[i], b = pts[j], c = pts[k];
      tris.push({ face: id, a, e1: [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2: [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
        min: [0, 1, 2].map((e) => Math.min(a[e], b[e], c[e])), max: [0, 1, 2].map((e) => Math.max(a[e], b[e], c[e])) });
    }
  }
  const EPS = 1e-9;
  const primeiro = (de, dir) => {
    let melhor = null;
    for (const T of tris) {
      /* a caixa do triângulo contra o raio, eixo por eixo (o raio dos ajudantes corre ao longo de um eixo) */
      let fora = false;
      for (let e = 0; e < 3 && !fora; e++) {
        if (Math.abs(dir[e]) < 1e-12 && (de[e] < T.min[e] - 1e-7 * (1 + Math.abs(de[e])) || de[e] > T.max[e] + 1e-7 * (1 + Math.abs(de[e])))) fora = true;
      }
      if (fora) continue;
      const h = [dir[1] * T.e2[2] - dir[2] * T.e2[1], dir[2] * T.e2[0] - dir[0] * T.e2[2], dir[0] * T.e2[1] - dir[1] * T.e2[0]];
      const det = T.e1[0] * h[0] + T.e1[1] * h[1] + T.e1[2] * h[2];
      if (Math.abs(det) < 1e-14) continue;
      const s = [de[0] - T.a[0], de[1] - T.a[1], de[2] - T.a[2]];
      const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
      if (u < -EPS || u > 1 + EPS) continue;
      const q = [s[1] * T.e1[2] - s[2] * T.e1[1], s[2] * T.e1[0] - s[0] * T.e1[2], s[0] * T.e1[1] - s[1] * T.e1[0]];
      const v = (dir[0] * q[0] + dir[1] * q[1] + dir[2] * q[2]) / det;
      if (v < -EPS || u + v > 1 + EPS) continue;
      const t = (T.e2[0] * q[0] + T.e2[1] * q[1] + T.e2[2] * q[2]) / det;
      if (t < -1e-9) continue;
      if (!melhor || t < melhor.t - 1e-9 || (Math.abs(t - melhor.t) <= 1e-9 && T.face < melhor.face)) melhor = { face: T.face, t, ponto: [de[0] + dir[0] * t, de[1] + dir[1] * t, de[2] + dir[2] * t] };
    }
    return melhor;
  };
  /* todos os acertos ao longo do raio, do mais perto ao mais longe, uma face por vez */
  const todos = (de, dir) => {
    const achados = new Map();
    for (const T of tris) {
      const h = [dir[1] * T.e2[2] - dir[2] * T.e2[1], dir[2] * T.e2[0] - dir[0] * T.e2[2], dir[0] * T.e2[1] - dir[1] * T.e2[0]];
      const det = T.e1[0] * h[0] + T.e1[1] * h[1] + T.e1[2] * h[2];
      if (Math.abs(det) < 1e-14) continue;
      const s = [de[0] - T.a[0], de[1] - T.a[1], de[2] - T.a[2]];
      const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
      if (u < -EPS || u > 1 + EPS) continue;
      const q = [s[1] * T.e1[2] - s[2] * T.e1[1], s[2] * T.e1[0] - s[0] * T.e1[2], s[0] * T.e1[1] - s[1] * T.e1[0]];
      const v = (dir[0] * q[0] + dir[1] * q[1] + dir[2] * q[2]) / det;
      if (v < -EPS || u + v > 1 + EPS) continue;
      const t = (T.e2[0] * q[0] + T.e2[1] * q[1] + T.e2[2] * q[2]) / det;
      if (t < -1e-9) continue;
      if (!achados.has(T.face) || t < achados.get(T.face)) achados.set(T.face, t);
    }
    return [...achados].map(([face, t]) => ({ face, t })).sort((x, y) => x.t - y.t || x.face - y.face);
  };
  return { primeiro, todos };
}
