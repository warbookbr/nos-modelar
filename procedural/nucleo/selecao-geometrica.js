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

   Uma aresta é a ligação entre dois cantos consecutivos de uma face, identificada pelo par de vértices (ordenado). Ela
   pertence à base quando alguma face vizinha está na base. A saída é determinística: faces por id e arestas pelo par
   de vértices, em ordem crescente. Nada aqui lê relógio nem sorteia. */

export const ALVOS_DE_SELECAO = Object.freeze(['face', 'aresta']);
export const TIPOS_DE_FACE = Object.freeze(['plana', 'empenada']);
export const TIPOS_DE_ARESTA = Object.freeze(['viva', 'lisa', 'borda']);
const CHAVES_ONDE = ['alvo', 'tipo', 'angulo', 'normal', 'extremo'];
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
  const r = { alvo: null, tipo: null, angulo: null, normal: null, extremo: null };

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

  if (!r.tipo && !r.normal && !r.extremo) return { erro: `informe ao menos um critério entre tipo, normal e extremo (alvo e angulo sozinhos não escolhem nada)` };
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
    const melhor = Math.max(...itens.map(valor));
    itens = itens.filter((item) => valor(item) >= melhor - onde.extremo.tol);
    funil.push(`${itens.length} após extremo`);
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
