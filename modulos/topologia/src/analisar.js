/* analisar.js — organizador de topologia: diz o que há de errado no traçado de
 * uma malha, e nunca a reescreve.
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

export const FORMATO = 'mecanifica.topologia@1';

const EPS_AREA = 1e-12;
const EPS_POS = 1e-9;

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

function chaveAresta(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function analisarTopologia(malhaBruta, { limiteValencia = 6, aridadeMaxima = 4 } = {}) {
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
  let componentes = 0;
  for (const v of adj.keys()) {
    if (visto.has(v)) continue;
    componentes++;
    const fila = [v];
    visto.add(v);
    while (fila.length) {
      const atual = fila.pop();
      for (const w of adj.get(atual) ?? []) if (!visto.has(w)) { visto.add(w); fila.push(w); }
    }
  }
  if (componentes > 1) {
    anota('alerta', 'ilhas', `A malha tem ${componentes} componentes desconexos.`, { componentes });
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
