/* edicao-de-malha.js — seleção temporária por topologia na bancada.
 *
 * A edição não persiste estes nomes. Eles existem somente enquanto a malha
 * aberta está na cena, para converter seleção entre vértice, aresta e face sem
 * depender da posição de um passo da receita. O alvo salvo continua sendo a
 * medida geométrica, nunca a seleção da interface. */

import * as THREE from 'three';

const MODOS = new Set(['vertice', 'aresta', 'face']);
export const TAMANHO_PONTO_EM_EDICAO = 2.5;

function chaveDaAresta(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function ordenar(itens) {
  return [...itens].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function construirTopologia({ vertices = [], faces = [] } = {}) {
  const verticesValidos = new Set(vertices.filter((id) => typeof id === 'string' && id));
  const facesPorId = new Map();
  const arestas = new Map();
  const facesPorVertice = new Map();
  const facesPorAresta = new Map();

  for (const entrada of faces) {
    if (typeof entrada?.id !== 'string' || !entrada.id || !Array.isArray(entrada.vertices)) continue;
    const pontos = entrada.vertices.filter((id) => verticesValidos.has(id));
    if (pontos.length < 3) continue;
    facesPorId.set(entrada.id, { id: entrada.id, vertices: pontos });
    for (let i = 0; i < pontos.length; i++) {
      const a = pontos[i];
      const b = pontos[(i + 1) % pontos.length];
      if (a === b) continue;
      const chave = chaveDaAresta(a, b);
      arestas.set(chave, [a, b]);
      if (!facesPorVertice.has(a)) facesPorVertice.set(a, new Set());
      facesPorVertice.get(a).add(entrada.id);
      if (!facesPorAresta.has(chave)) facesPorAresta.set(chave, new Set());
      facesPorAresta.get(chave).add(entrada.id);
    }
  }

  return { vertices: verticesValidos, facesPorId, arestas, facesPorVertice, facesPorAresta };
}

function arestasDaFace(face) {
  const resultado = [];
  for (let i = 0; i < face.vertices.length; i++) {
    resultado.push(chaveDaAresta(face.vertices[i], face.vertices[(i + 1) % face.vertices.length]));
  }
  return resultado;
}

function converterSelecao(topologia, origem, destino, selecionados) {
  if (origem === destino) return new Set(selecionados);

  let vertices = new Set();
  let arestas = new Set();
  let faces = new Set();

  if (origem === 'vertice') vertices = new Set(selecionados);
  if (origem === 'aresta') {
    arestas = new Set(selecionados);
    for (const chave of arestas) for (const vertice of topologia.arestas.get(chave) ?? []) vertices.add(vertice);
  }
  if (origem === 'face') {
    faces = new Set(selecionados);
    for (const id of faces) {
      const face = topologia.facesPorId.get(id);
      if (!face) continue;
      for (const vertice of face.vertices) vertices.add(vertice);
      for (const aresta of arestasDaFace(face)) arestas.add(aresta);
    }
  }

  if (destino === 'vertice') return vertices;
  if (destino === 'aresta') {
    if (arestas.size) return arestas;
    return new Set([...topologia.arestas.keys()].filter((chave) => {
      const [a, b] = topologia.arestas.get(chave);
      return vertices.has(a) && vertices.has(b);
    }));
  }
  if (faces.size) return faces;
  return new Set([...topologia.facesPorId.values()]
    .filter((face) => face.vertices.every((vertice) => vertices.has(vertice)))
    .map((face) => face.id));
}

function verticesDaSelecao(topologia, modo, selecionados) {
  if (modo === 'vertice') return new Set(selecionados);
  if (modo === 'aresta') {
    return new Set([...selecionados].flatMap((id) => topologia.arestas.get(id) ?? []));
  }
  return new Set([...selecionados].flatMap((id) => topologia.facesPorId.get(id)?.vertices ?? []));
}

function adjacentes(topologia, modo, id) {
  if (modo === 'vertice') {
    const resultado = new Set();
    for (const faceId of topologia.facesPorVertice.get(id) ?? []) {
      for (const vertice of topologia.facesPorId.get(faceId).vertices) resultado.add(vertice);
    }
    return resultado;
  }
  if (modo === 'aresta') {
    const resultado = new Set();
    for (const faceId of topologia.facesPorAresta.get(id) ?? []) {
      for (const aresta of arestasDaFace(topologia.facesPorId.get(faceId))) resultado.add(aresta);
    }
    return resultado;
  }
  const resultado = new Set();
  for (const aresta of arestasDaFace(topologia.facesPorId.get(id))) {
    for (const faceId of topologia.facesPorAresta.get(aresta) ?? []) resultado.add(faceId);
  }
  return resultado;
}

export function topologiaDaMalhaNeutra(neutro) {
  const vertices = [...(neutro?.V?.keys?.() ?? [])].map(String).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const faces = [...(neutro?.F?.values?.() ?? [])]
    .filter((face) => Array.isArray(face?.vs))
    .map((face) => ({ id: String(face.id), vertices: face.vs.map(String) }))
    .sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));
  return { vertices, faces };
}

/* A seleção usa nomes temporários enquanto a bancada está aberta, mas a
   deformação resultante é só outra cópia de V: faces, peças e quaisquer outros
   metadados neutros continuam exatamente os que vieram da receita. */
export function moverSelecaoDaMalha(neutro, entradaTopologia, estado, deslocamento) {
  if (!neutro?.V || !Array.isArray(deslocamento) || deslocamento.length !== 3) return neutro;
  const topologia = construirTopologia(entradaTopologia);
  const selecionados = new Set(estado?.selecionados ?? []);
  const ids = verticesDaSelecao(topologia, estado?.modo, selecionados);
  if (!ids.size) return neutro;
  const chaves = new Map([...neutro.V.keys()].map((id) => [String(id), id]));
  const V = new Map(neutro.V);
  for (const id of ids) {
    const chave = chaves.get(id);
    const ponto = neutro.V.get(chave);
    if (!ponto) continue;
    V.set(chave, ponto.map((valor, indice) => valor + deslocamento[indice]));
  }
  return { ...neutro, V };
}

export function criarEstadoEdicaoDeMalha(entrada) {
  const topologia = construirTopologia(entrada);
  let ativo = false;
  let modo = 'vertice';
  let selecionados = new Set();

  function disponiveis() {
    if (modo === 'vertice') return topologia.vertices;
    if (modo === 'aresta') return new Set(topologia.arestas.keys());
    return new Set(topologia.facesPorId.keys());
  }

  function estado() {
    return { ativo, modo, selecionados: ordenar(selecionados) };
  }

  return {
    estado,
    alternar() { ativo = !ativo; return estado(); },
    definirAtivo(valor) { ativo = Boolean(valor); if (!ativo) selecionados.clear(); return estado(); },
    definirModo(proximo) {
      if (!MODOS.has(proximo)) return estado();
      selecionados = converterSelecao(topologia, modo, proximo, selecionados);
      modo = proximo;
      return estado();
    },
    selecionar(id, { aditiva = false, remover = false } = {}) {
      if (!ativo || !disponiveis().has(id)) return estado();
      if (remover) selecionados.delete(id);
      else if (aditiva) selecionados.add(id);
      else selecionados = new Set([id]);
      return estado();
    },
    selecionarMuitos(ids, { aditiva = false, remover = false } = {}) {
      if (!ativo) return estado();
      const validos = [...ids].filter((id) => disponiveis().has(id));
      if (remover) {
        for (const id of validos) selecionados.delete(id);
      } else if (aditiva) {
        for (const id of validos) selecionados.add(id);
      } else {
        selecionados = new Set(validos);
      }
      return estado();
    },
    selecionarTudo() { selecionados = new Set(disponiveis()); return estado(); },
    limpar() { selecionados.clear(); return estado(); },
    selecionarIlha() {
      const inicio = selecionados.values().next().value;
      if (!inicio) return estado();
      const visitados = new Set([inicio]);
      const fila = [inicio];
      while (fila.length) {
        const atual = fila.shift();
        for (const vizinho of adjacentes(topologia, modo, atual)) {
          if (!visitados.has(vizinho)) { visitados.add(vizinho); fila.push(vizinho); }
        }
      }
      selecionados = visitados;
      return estado();
    },
  };
}

/* Desenha a seleção como uma camada filha da peça. As coordenadas continuam
   locais à peça, portanto escala e pose do estúdio acompanham naturalmente o
   realce sem entrar no estado salvo. */
export function criarCamadaEdicaoDeMalha({ canvas, cameraAtual, raiz, neutro, aoMudar = () => {}, aoConfirmarMovimento = () => {} }) {
  const topologia = topologiaDaMalhaNeutra(neutro);
  const estrutura = construirTopologia(topologia);
  const estado = criarEstadoEdicaoDeMalha(topologia);
  const posicoes = new Map([...(neutro?.V ?? [])].map(([id, ponto]) => [String(id), ponto]));
  const grupo = new THREE.Group();
  grupo.name = '__edicao_de_malha__';
  grupo.renderOrder = 999;
  raiz.add(grupo);

  const pontos = topologia.vertices;
  const arestas = [...estrutura.arestas.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const geometriaPontos = new THREE.BufferGeometry();
  geometriaPontos.setAttribute('position', new THREE.Float32BufferAttribute(pontos.flatMap((id) => posicoes.get(id) ?? [0, 0, 0]), 3));
  const materialPontos = new THREE.PointsMaterial({ size: TAMANHO_PONTO_EM_EDICAO, sizeAttenuation: false, depthTest: false, transparent: true, opacity: 0.92, vertexColors: true });
  const desenhoPontos = new THREE.Points(geometriaPontos, materialPontos);
  desenhoPontos.visible = false;
  grupo.add(desenhoPontos);

  const geometriaArestas = new THREE.BufferGeometry();
  geometriaArestas.setAttribute('position', new THREE.Float32BufferAttribute(arestas.flatMap((chave) => {
    const [a, b] = estrutura.arestas.get(chave);
    return [...(posicoes.get(a) ?? [0, 0, 0]), ...(posicoes.get(b) ?? [0, 0, 0])];
  }), 3));
  const materialArestas = new THREE.LineBasicMaterial({ depthTest: false, transparent: true, opacity: 0.82, vertexColors: true });
  const desenhoArestas = new THREE.LineSegments(geometriaArestas, materialArestas);
  desenhoArestas.visible = false;
  grupo.add(desenhoArestas);

  const geometriaFaces = new THREE.BufferGeometry();
  const materialFaces = new THREE.MeshBasicMaterial({ color: '#45e0a5', depthTest: false, depthWrite: false, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const desenhoFaces = new THREE.Mesh(geometriaFaces, materialFaces);
  desenhoFaces.visible = false;
  grupo.add(desenhoFaces);

  const caixa = document.createElement('div');
  caixa.className = 'caixa-selecao-malha';
  document.body.append(caixa);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.08;
  raycaster.params.Line.threshold = 0.05;
  const ponteiro = new THREE.Vector2();
  let inicio = null;
  let ultimoPonteiro = null;
  let movimento = null;

  function copiarVertices() {
    return new Map([...(neutro?.V ?? [])].map(([id, ponto]) => [id, [...ponto]]));
  }

  function atualizarCena() {
    raiz.traverse((objeto) => {
      if (!objeto.isMesh || objeto === desenhoFaces) return;
      const origem = objeto.geometry?.getAttribute('origemVertice');
      const posicao = objeto.geometry?.getAttribute('position');
      if (!origem || !posicao) return;
      for (let i = 0; i < posicao.count; i++) {
        const ponto = posicoes.get(String(origem.getX(i)));
        if (ponto) posicao.setXYZ(i, ponto[0], ponto[1], ponto[2]);
      }
      posicao.needsUpdate = true;
      objeto.geometry.computeBoundingBox();
      objeto.geometry.computeBoundingSphere();
    });
    for (let i = 0; i < pontos.length; i++) {
      const ponto = posicoes.get(pontos[i]) ?? [0, 0, 0];
      geometriaPontos.getAttribute('position').setXYZ(i, ponto[0], ponto[1], ponto[2]);
    }
    for (let i = 0; i < arestas.length; i++) {
      const [a, b] = estrutura.arestas.get(arestas[i]);
      const pa = posicoes.get(a) ?? [0, 0, 0];
      const pb = posicoes.get(b) ?? [0, 0, 0];
      geometriaArestas.getAttribute('position').setXYZ(i * 2, pa[0], pa[1], pa[2]);
      geometriaArestas.getAttribute('position').setXYZ(i * 2 + 1, pb[0], pb[1], pb[2]);
    }
    geometriaPontos.getAttribute('position').needsUpdate = true;
    geometriaArestas.getAttribute('position').needsUpdate = true;
  }

  function restaurar(vertices) {
    if (!(vertices instanceof Map)) return estado.estado();
    neutro.V = new Map([...vertices].map(([id, ponto]) => [id, [...ponto]]));
    posicoes.clear();
    for (const [id, ponto] of neutro.V) posicoes.set(String(id), ponto);
    atualizarCena();
    atualizarVisibilidade();
    return estado.estado();
  }

  function centroDaSelecao() {
    const ids = verticesDaSelecao(estrutura, estado.estado().modo, new Set(estado.estado().selecionados));
    const pontosSelecionados = [...ids].map((id) => posicoes.get(id)).filter(Boolean);
    if (!pontosSelecionados.length) return null;
    return pontosSelecionados.reduce((soma, ponto) => soma.map((valor, i) => valor + ponto[i] / pontosSelecionados.length), [0, 0, 0]);
  }

  function pontoNoPlano(evento, plano) {
    raio(evento);
    return raycaster.ray.intersectPlane(plano, new THREE.Vector3());
  }

  function aplicarDeslocamento(deslocamento) {
    if (!movimento) return;
    const base = { ...neutro, V: movimento.origem };
    const proximo = moverSelecaoDaMalha(base, topologia, estado.estado(), deslocamento);
    restaurar(proximo.V);
    movimento.deslocamento = deslocamento;
  }

  function atualizarMovimento(evento) {
    if (!movimento || movimento.entrada) return;
    const ponto = pontoNoPlano(evento, movimento.plano);
    if (!ponto) return;
    const escala = raiz.scale.x || 1;
    const deslocamentoMundo = ponto.sub(movimento.partida);
    const deslocamento = [deslocamentoMundo.x / escala, deslocamentoMundo.y / escala, deslocamentoMundo.z / escala];
    if (movimento.eixo != null) {
      for (let i = 0; i < 3; i++) if (i !== movimento.eixo) deslocamento[i] = 0;
    }
    aplicarDeslocamento(deslocamento);
  }

  function confirmarMovimento() {
    if (!movimento) return null;
    const antes = movimento.origem;
    const depois = copiarVertices();
    const mudou = [...depois].some(([id, ponto]) => ponto.some((valor, i) => valor !== antes.get(id)?.[i]));
    movimento = null;
    const resultado = { antes, depois, mudou };
    /* A confirmação pertence ao gesto mesmo quando ele acabou no mesmo ponto:
       quem registra o histórico decide se a cópia é uma mudança relevante.
       Assim o fechamento por clique e por tecla percorre o mesmo caminho. */
    aoConfirmarMovimento(resultado);
    return mudou ? resultado : null;
  }

  function cancelarMovimento() {
    if (!movimento) return false;
    restaurar(movimento.origem);
    movimento = null;
    return true;
  }

  function preencherCores(geometria, itens, selecionados, repeticao = 1) {
    const cores = new Float32Array(itens.length * repeticao * 3);
    const normal = new THREE.Color('#ffc857');
    const realcado = new THREE.Color('#45e0a5');
    for (let i = 0; i < itens.length; i++) {
      const cor = selecionados.has(itens[i]) ? realcado : normal;
      for (let j = 0; j < repeticao; j++) cor.toArray(cores, (i * repeticao + j) * 3);
    }
    geometria.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  }

  function atualizarFaces(selecionados) {
    const posicoesDasFaces = [];
    for (const id of selecionados) {
      const face = estrutura.facesPorId.get(id);
      if (!face) continue;
      for (let i = 1; i < face.vertices.length - 1; i++) {
        for (const vertice of [face.vertices[0], face.vertices[i], face.vertices[i + 1]]) {
          posicoesDasFaces.push(...(posicoes.get(vertice) ?? [0, 0, 0]));
        }
      }
    }
    geometriaFaces.setAttribute('position', new THREE.Float32BufferAttribute(posicoesDasFaces, 3));
  }

  function atualizarCaixa(origem, fim) {
    const esquerda = Math.min(origem[0], fim[0]);
    const topo = Math.min(origem[1], fim[1]);
    caixa.style.left = `${esquerda}px`;
    caixa.style.top = `${topo}px`;
    caixa.style.width = `${Math.abs(fim[0] - origem[0])}px`;
    caixa.style.height = `${Math.abs(fim[1] - origem[1])}px`;
    caixa.hidden = false;
  }

  function atualizarVisibilidade() {
    const atual = estado.estado();
    grupo.visible = atual.ativo;
    desenhoPontos.visible = atual.ativo && atual.modo === 'vertice';
    desenhoArestas.visible = atual.ativo && atual.modo === 'aresta';
    desenhoFaces.visible = atual.ativo && atual.modo === 'face' && atual.selecionados.length > 0;
    const selecionados = new Set(atual.selecionados);
    preencherCores(geometriaPontos, pontos, selecionados);
    preencherCores(geometriaArestas, arestas, selecionados, 2);
    atualizarFaces(selecionados);
    aoMudar(atual);
    return atual;
  }

  function raio(evento) {
    const rect = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, cameraAtual());
  }

  function faceSobORaio() {
    const alvos = [];
    raiz.traverse((objeto) => {
      if (objeto.isMesh && objeto.geometry?.getAttribute('origemFace')) alvos.push(objeto);
    });
    const hit = raycaster.intersectObjects(alvos, false)[0];
    if (!hit || hit.faceIndex == null) return null;
    return String(hit.object.geometry.getAttribute('origemFace').getX(hit.faceIndex * 3));
  }

  function alvoSobOPonteiro(evento) {
    raio(evento);
    const atual = estado.estado();
    if (atual.modo === 'vertice') {
      const hit = raycaster.intersectObject(desenhoPontos, false)[0];
      return hit ? pontos[hit.index] : null;
    }
    if (atual.modo === 'aresta') {
      const hit = raycaster.intersectObject(desenhoArestas, false)[0];
      return hit?.index == null ? null : arestas[Math.floor(hit.index / 2)];
    }
    return faceSobORaio();
  }

  function dentroDaCaixa(ponto, origem, fim) {
    const camera = cameraAtual();
    raiz.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const projetado = new THREE.Vector3(...ponto).applyMatrix4(raiz.matrixWorld).project(camera);
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + ((projetado.x + 1) / 2) * rect.width;
    const y = rect.top + ((1 - projetado.y) / 2) * rect.height;
    return x >= Math.min(origem[0], fim[0]) && x <= Math.max(origem[0], fim[0])
      && y >= Math.min(origem[1], fim[1]) && y <= Math.max(origem[1], fim[1]);
  }

  function itensNaCaixa(origem, fim) {
    const atual = estado.estado();
    if (atual.modo === 'vertice') return pontos.filter((id) => dentroDaCaixa(posicoes.get(id) ?? [0, 0, 0], origem, fim));
    if (atual.modo === 'aresta') return arestas.filter((chave) => {
      const [a, b] = estrutura.arestas.get(chave);
      const pa = posicoes.get(a) ?? [0, 0, 0];
      const pb = posicoes.get(b) ?? [0, 0, 0];
      return dentroDaCaixa(pa.map((valor, i) => (valor + pb[i]) / 2), origem, fim);
    });
    return [...estrutura.facesPorId.values()].filter((face) => {
      const centro = face.vertices.reduce((soma, id) => {
        const ponto = posicoes.get(id) ?? [0, 0, 0];
        return soma.map((valor, i) => valor + ponto[i] / face.vertices.length);
      }, [0, 0, 0]);
      return dentroDaCaixa(centro, origem, fim);
    }).map((face) => face.id);
  }

  function aoPressionar(evento) {
    if (!estado.estado().ativo) return;
    if (movimento) {
      confirmarMovimento();
      evento.stopPropagation();
      return;
    }
    inicio = [evento.clientX, evento.clientY];
    evento.stopPropagation();
    canvas.setPointerCapture?.(evento.pointerId);
  }

  function aoMover(evento) {
    ultimoPonteiro = { clientX: evento.clientX, clientY: evento.clientY };
    if (!estado.estado().ativo) return;
    if (movimento) {
      atualizarMovimento(evento);
      evento.stopPropagation();
      return;
    }
    if (!inicio) return;
    if (Math.hypot(evento.clientX - inicio[0], evento.clientY - inicio[1]) > 5) {
      atualizarCaixa(inicio, [evento.clientX, evento.clientY]);
    }
    evento.stopPropagation();
  }

  function aoSoltar(evento) {
    if (!estado.estado().ativo || !inicio) return;
    const deslocamento = Math.hypot(evento.clientX - inicio[0], evento.clientY - inicio[1]);
    const origem = inicio;
    inicio = null;
    canvas.releasePointerCapture?.(evento.pointerId);
    evento.stopPropagation();
    caixa.hidden = true;
    if (deslocamento > 5) {
      estado.selecionarMuitos(itensNaCaixa(origem, [evento.clientX, evento.clientY]), { aditiva: evento.shiftKey, remover: evento.altKey });
      atualizarVisibilidade();
      return;
    }
    const alvo = alvoSobOPonteiro(evento);
    if (alvo) estado.selecionar(alvo, { aditiva: evento.shiftKey, remover: evento.altKey });
    else if (!evento.shiftKey && !evento.altKey) estado.limpar();
    atualizarVisibilidade();
  }

  canvas.addEventListener('pointerdown', aoPressionar, true);
  canvas.addEventListener('pointermove', aoMover, true);
  canvas.addEventListener('pointerup', aoSoltar, true);
  atualizarVisibilidade();

  return {
    estado: () => estado.estado(),
    alternar() { estado.alternar(); return atualizarVisibilidade(); },
    definirModo(modo) { estado.definirModo(modo); return atualizarVisibilidade(); },
    selecionarTudo() { estado.selecionarTudo(); return atualizarVisibilidade(); },
    limpar() { estado.limpar(); return atualizarVisibilidade(); },
    selecionarIlha() { estado.selecionarIlha(); return atualizarVisibilidade(); },
    iniciarMovimento() {
      const centro = centroDaSelecao();
      if (!centro) return null;
      const camera = cameraAtual();
      const centroMundo = new THREE.Vector3(...centro).applyMatrix4(raiz.matrixWorld);
      const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
      const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, centroMundo);
      const partida = ultimoPonteiro ? pontoNoPlano(ultimoPonteiro, plano) : centroMundo;
      if (!partida) return null;
      movimento = { origem: copiarVertices(), deslocamento: [0, 0, 0], eixo: null, entrada: '', plano, partida };
      return { ...movimento, origem: undefined, plano: undefined, partida: undefined };
    },
    travarEixo(nome) {
      if (!movimento) return null;
      movimento.eixo = ({ x: 0, y: 1, z: 2 })[String(nome).toLowerCase()] ?? null;
      if (movimento.eixo != null) aplicarDeslocamento(movimento.deslocamento.map((valor, i) => (i === movimento.eixo ? valor : 0)));
      return movimento.eixo;
    },
    digitarValor(valor) {
      if (!movimento || movimento.eixo == null || !/^[0-9.-]$/.test(valor)) return null;
      movimento.entrada += valor;
      const numero = Number(movimento.entrada);
      if (Number.isFinite(numero)) {
        const deslocamento = [0, 0, 0];
        deslocamento[movimento.eixo] = numero;
        aplicarDeslocamento(deslocamento);
      }
      return movimento.entrada;
    },
    confirmarMovimento,
    cancelarMovimento,
    restaurar,
    vertices: copiarVertices,
    get movendo() { return Boolean(movimento); },
    destruir() {
      canvas.removeEventListener('pointerdown', aoPressionar, true);
      canvas.removeEventListener('pointermove', aoMover, true);
      canvas.removeEventListener('pointerup', aoSoltar, true);
      geometriaPontos.dispose(); materialPontos.dispose();
      geometriaArestas.dispose(); materialArestas.dispose();
      geometriaFaces.dispose(); materialFaces.dispose();
      caixa.remove();
      grupo.removeFromParent();
    },
  };
}
