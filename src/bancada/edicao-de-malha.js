/* edicao-de-malha.js — seleção temporária por topologia na bancada.
 *
 * A edição não persiste estes nomes. Eles existem somente enquanto a malha
 * aberta está na cena, para converter seleção entre vértice, aresta e face sem
 * depender da posição de um passo da receita. O alvo salvo continua sendo a
 * medida geométrica, nunca a seleção da interface. */

import * as THREE from 'three';
import { criarGizmoDeSetas } from './controles/gizmo-de-setas.js';

const MODOS = new Set(['vertice', 'aresta', 'face']);
/* O vértice desenhado, em pixels na tela. Dois e meio era o valor inicial e o
   autor não conseguia ver nem acertar: sete é o tamanho em que o ponto lê como
   punho e ainda não esconde a forma atrás dele. Tamanho constante na tela, e não
   no mundo — um punho que encolhe com a distância deixa de ser clicável
   justamente quando a pessoa se afasta para ver a peça toda. */
export const TAMANHO_PONTO_EM_EDICAO = 7;

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

/**
 * Topologia da malha, opcionalmente restrita a algumas partes.
 *
 * `partes` limita a edição ao que a pessoa selecionou antes de apertar Tab.
 * Sem esse recorte, entrar no modo de edição de um quadro punha os 502 vértices
 * da bicicleta inteira na tela para quem queria mexer num tubo só, e qualquer
 * clique podia cair num vértice de outra peça. Lista vazia ou ausente significa
 * a peça inteira, que é o comportamento certo quando nada está selecionado.
 *
 * O vértice entra quando ALGUMA face das partes escolhidas o usa: vértice solto,
 * que não pertence a face nenhuma, não tem como ser movido de forma coerente e
 * não aparece.
 */
export function topologiaDaMalhaNeutra(neutro, { partes = null } = {}) {
  const filtro = Array.isArray(partes) && partes.length ? new Set(partes) : null;
  const faces = [...(neutro?.F?.values?.() ?? [])]
    .filter((face) => Array.isArray(face?.vs) && (!filtro || filtro.has(face.parte)))
    .map((face) => ({ id: String(face.id), vertices: face.vs.map(String) }))
    .sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));

  const usados = new Set();
  for (const face of faces) for (const id of face.vertices) usados.add(id);
  const vertices = [...(neutro?.V?.keys?.() ?? [])]
    .map(String)
    .filter((id) => (filtro ? usados.has(id) : true))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

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
/**
 * A camada de edição.
 *
 * `desenharMalha: false` é o modo peça: o movimento, o gizmo, o ímã, o desfazer
 * e o alvo são os mesmos, mas os vértices, arestas e faces não aparecem e não
 * pegam clique. Mover a parte inteira não é outra máquina — é esta, com tudo
 * selecionado e sem o desenho da malha na frente.
 */
export function criarCamadaEdicaoDeMalha({
  canvas, cameraAtual, raiz, neutro, partes = null, desenharMalha = true,
  aoMudar = () => {}, aoConfirmarMovimento = () => {},
}) {
  const topologia = topologiaDaMalhaNeutra(neutro, { partes });
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

  /* O REALCE É UM DESENHO À PARTE, e não uma cor diferente no mesmo desenho.
     Trocar a cor de um ponto de sete pixels não diz à pessoa onde ela clicou: o
     autor relatou não conseguir saber o que estava selecionado. O selecionado é
     desenhado de novo por cima, maior e em branco, e por isso ele salta da malha
     mesmo num aglomerado de vértices. */
  const geometriaPontosSel = new THREE.BufferGeometry();
  geometriaPontosSel.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  /* TRANSPARENTE DE PROPÓSITO, com opacidade cheia. O Three desenha a fila
     opaca inteira antes da transparente, e `renderOrder` só ordena dentro da
     mesma fila: um realce opaco era desenhado ANTES dos pontos normais, que são
     transparentes, e apagado por eles. O pixel medido em cima do vértice
     selecionado vinha âmbar, a cor dos outros pontos, em toda posição de câmera.
     Na mesma fila, a ordem volta a valer. */
  const materialPontosSel = new THREE.PointsMaterial({
    color: '#ffffff', size: TAMANHO_PONTO_EM_EDICAO * 2.2, sizeAttenuation: false,
    depthTest: false, depthWrite: false, transparent: true, opacity: 1,
  });
  const desenhoPontosSel = new THREE.Points(geometriaPontosSel, materialPontosSel);
  desenhoPontosSel.renderOrder = 1001;
  desenhoPontosSel.visible = false;
  grupo.add(desenhoPontosSel);

  /* A aresta selecionada ganha as duas pontas em destaque junto com a linha:
     linha em WebGL não engrossa, então a espessura que a pessoa procura vem dos
     pontos. */
  const geometriaArestasSel = new THREE.BufferGeometry();
  geometriaArestasSel.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  const materialArestasSel = new THREE.LineBasicMaterial({ color: '#ffffff', depthTest: false, depthWrite: false, transparent: true, opacity: 1 });
  const desenhoArestasSel = new THREE.LineSegments(geometriaArestasSel, materialArestasSel);
  desenhoArestasSel.renderOrder = 1001;
  desenhoArestasSel.visible = false;
  grupo.add(desenhoArestasSel);

  const geometriaFaces = new THREE.BufferGeometry();
  const materialFaces = new THREE.MeshBasicMaterial({ color: '#45e0a5', depthTest: false, depthWrite: false, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const desenhoFaces = new THREE.Mesh(geometriaFaces, materialFaces);
  desenhoFaces.visible = false;
  grupo.add(desenhoFaces);

  /* O contorno da face selecionada. O preenchimento translúcido some contra a
     peça clara; a borda branca diz onde a face começa e termina. */
  const geometriaContornoFace = new THREE.BufferGeometry();
  geometriaContornoFace.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  const materialContornoFace = new THREE.LineBasicMaterial({ color: '#ffffff', depthTest: false, depthWrite: false, transparent: true, opacity: 1 });
  const desenhoContornoFace = new THREE.LineSegments(geometriaContornoFace, materialContornoFace);
  desenhoContornoFace.renderOrder = 1001;
  desenhoContornoFace.visible = false;
  grupo.add(desenhoContornoFace);

  /* GIZMO DE TRÊS SETAS na seleção. O G com trava de eixo já move, mas ele não
     mostra para onde a seleção vai antes de ela ir: a pessoa aperta a tecla e
     descobre. As setas dizem o eixo antes do gesto e dão um segundo caminho para
     quem prefere o ponteiro. Elas convivem com o G — arrastar a seta abre o
     mesmo movimento que a tecla abre, com o eixo já travado.
     O desenho e o teste de clique moram em `gizmo-de-setas.js`, porque a imagem
     de referência precisa do mesmo punho e duas cópias envelheceriam separadas. */
  const gizmo = criarGizmoDeSetas({ pai: raiz, canvas, cameraAtual, nome: '__gizmo_de_edicao__' });

  function atualizarGizmo() {
    const atual = estado.estado();
    const centro = atual.ativo && atual.selecionados.length ? centroDaSelecao() : null;
    if (!centro) return gizmo.esconder();
    return gizmo.mostrar(centro);
  }

  const eixoDoGizmoSobOPonteiro = (evento) => gizmo.eixoSobOPonteiro(evento);

  const caixa = document.createElement('div');
  caixa.className = 'caixa-selecao-malha';
  document.body.append(caixa);

  const raycaster = new THREE.Raycaster();
  /* ALCANCE DO CLIQUE PROPORCIONAL À DISTÂNCIA. O ponto é desenhado com tamanho
     constante na TELA, mas o alcance do raio é medido no MUNDO: com um número
     fixo, o vértice longe da câmera continuava do mesmo tamanho na imagem e ia
     ficando impossível de acertar. Era o "clico e não acontece nada" em certos
     vértices, e não em outros. Agora o alcance acompanha a distância, então a
     área clicável casa com o que está desenhado em qualquer zoom.
     A fração foi calibrada contra o valor fixo anterior: medido no enquadramento
     padrão, o fixo tolerava vinte pixels de erro de mira e um quarenta e cinco
     avos da distância tolera o mesmo. O ganho é a tolerância não mudar quando a
     pessoa se afasta. */
  const FRACAO_DO_ALCANCE = 1 / 45;
  function ajustarAlcance() {
    const camera = cameraAtual();
    const centro = new THREE.Vector3().setFromMatrixPosition(raiz.matrixWorld);
    const distancia = Math.max(camera.position.distanceTo(centro), 1e-3);
    const escala = raiz.scale.x || 1;
    raycaster.params.Points.threshold = (distancia * FRACAO_DO_ALCANCE) / escala;
    raycaster.params.Line.threshold = (distancia * FRACAO_DO_ALCANCE * 0.7) / escala;
  }
  ajustarAlcance();
  const ponteiro = new THREE.Vector2();
  /* Abaixo disto o gesto é clique, não arrasto. Cinco pixels é menos do que uma
     mão firme produz entre apertar e soltar num mouse comum. */
  const ARRASTO_MINIMO = 8;
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

  /* ÍMÃ. Segurar Ctrl durante o movimento gruda a seleção no vértice mais
     próximo da malha que NÃO está sendo movido. É o gesto mecânico: encostar a
     ponta de um tubo na ponta do outro sem depender de mira, e sem precisar
     descobrir qual número faz isso.
     O ímã trabalha sobre o ponto de referência da seleção — o centro dela antes
     do gesto —, e não sobre cada vértice: puxar cada um para o vizinho mais
     próximo desmontaria a forma que a pessoa selecionou. */
  function candidatosDoIma() {
    const movidos = verticesDaSelecao(estrutura, estado.estado().modo, new Set(estado.estado().selecionados));
    const candidatos = [];
    for (const id of topologia.vertices) {
      if (movidos.has(id)) continue;
      const ponto = movimento.origem.get(Number(id)) ?? movimento.origem.get(id);
      if (ponto) candidatos.push(ponto);
    }
    return candidatos;
  }

  function grudar(deslocamento) {
    if (!movimento?.referencia) return deslocamento;
    const destino = movimento.referencia.map((valor, i) => valor + deslocamento[i]);
    let melhor = null;
    let melhorD2 = Infinity;
    for (const candidato of movimento.candidatos ?? []) {
      const d2 = (candidato[0] - destino[0]) ** 2 + (candidato[1] - destino[1]) ** 2 + (candidato[2] - destino[2]) ** 2;
      if (d2 < melhorD2) { melhorD2 = d2; melhor = candidato; }
    }
    if (!melhor) return deslocamento;
    const grudado = melhor.map((valor, i) => valor - movimento.referencia[i]);
    /* Com eixo travado, o ímã só decide a casa daquele eixo: as outras duas
       continuam zeradas, senão o Ctrl desfaria a trava que a pessoa acabou de
       pedir. */
    if (movimento.eixo != null) {
      const so = [0, 0, 0];
      so[movimento.eixo] = grudado[movimento.eixo];
      return so;
    }
    return grudado;
  }

  function atualizarMovimento(evento) {
    if (!movimento || movimento.entrada) return;
    const ponto = pontoNoPlano(evento, movimento.plano);
    if (!ponto) return;
    const escala = raiz.scale.x || 1;
    const deslocamentoMundo = ponto.sub(movimento.partida);
    let deslocamento = [deslocamentoMundo.x / escala, deslocamentoMundo.y / escala, deslocamentoMundo.z / escala];
    if (movimento.eixo != null) {
      for (let i = 0; i < 3; i++) if (i !== movimento.eixo) deslocamento[i] = 0;
    }
    movimento.ima = Boolean(evento.ctrlKey || evento.metaKey);
    if (movimento.ima) {
      if (!movimento.candidatos) movimento.candidatos = candidatosDoIma();
      deslocamento = grudar(deslocamento);
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

  function atualizarRealce(atual, selecionados) {
    const pontosSel = [];
    const arestasSel = [];
    if (atual.modo === 'vertice') {
      for (const id of selecionados) pontosSel.push(...(posicoes.get(id) ?? [0, 0, 0]));
    } else if (atual.modo === 'aresta') {
      for (const chave of selecionados) {
        const par = estrutura.arestas.get(chave);
        if (!par) continue;
        for (const id of par) {
          arestasSel.push(...(posicoes.get(id) ?? [0, 0, 0]));
          pontosSel.push(...(posicoes.get(id) ?? [0, 0, 0]));
        }
      }
    }
    geometriaPontosSel.setAttribute('position', new THREE.Float32BufferAttribute(pontosSel, 3));
    geometriaArestasSel.setAttribute('position', new THREE.Float32BufferAttribute(arestasSel, 3));
    desenhoPontosSel.visible = desenharMalha && atual.ativo && pontosSel.length > 0;
    desenhoArestasSel.visible = desenharMalha && atual.ativo && arestasSel.length > 0;

    const contorno = [];
    if (atual.modo === 'face') {
      for (const id of selecionados) {
        const face = estrutura.facesPorId.get(id);
        if (!face) continue;
        for (let i = 0; i < face.vertices.length; i++) {
          contorno.push(...(posicoes.get(face.vertices[i]) ?? [0, 0, 0]));
          contorno.push(...(posicoes.get(face.vertices[(i + 1) % face.vertices.length]) ?? [0, 0, 0]));
        }
      }
    }
    geometriaContornoFace.setAttribute('position', new THREE.Float32BufferAttribute(contorno, 3));
    desenhoContornoFace.visible = desenharMalha && atual.ativo && contorno.length > 0;
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
    desenhoPontos.visible = desenharMalha && atual.ativo && atual.modo === 'vertice';
    desenhoArestas.visible = desenharMalha && atual.ativo && atual.modo === 'aresta';
    desenhoFaces.visible = desenharMalha && atual.ativo && atual.modo === 'face' && atual.selecionados.length > 0;
    const selecionados = new Set(atual.selecionados);
    preencherCores(geometriaPontos, pontos, selecionados);
    preencherCores(geometriaArestas, arestas, selecionados, 2);
    atualizarFaces(selecionados);
    atualizarRealce(atual, selecionados);
    atualizarGizmo();
    aoMudar(atual);
    return atual;
  }

  function raio(evento) {
    ajustarAlcance();
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

  /* ESCOLHA POR DISTÂNCIA NA TELA, e não por distância ao raio no espaço.
   *
   * O raio escolhe o primeiro que ele encontra no caminho, e isso não é o que a
   * pessoa vê: dois vértices podem estar a um pixel um do outro na imagem e a
   * vinte centímetros um do outro no espaço, e o raio prefere o mais perto da
   * câmera mesmo que o ponteiro esteja em cima do outro. Era o "clico em um e
   * seleciona outro".
   *
   * Aqui todos os candidatos são projetados na tela e vence o mais perto do
   * ponteiro em PIXELS, que é a mesma conta que o olho faz. Empate a menos de
   * três pixels é desfeito pelo mais perto da câmera, que é o que está à frente.
   */
  const ALCANCE_EM_PIXELS = 18;
  const EMPATE_EM_PIXELS = 3;

  function emPixels(ponto, camera, rect) {
    const v = new THREE.Vector3(...ponto).applyMatrix4(raiz.matrixWorld);
    const distancia = camera.position.distanceTo(v);
    const p = v.project(camera);
    if (p.z > 1) return null;
    return {
      x: rect.left + ((p.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - p.y) / 2) * rect.height,
      distancia,
    };
  }

  /* Distância do ponteiro ao segmento na tela, que é o que decide a aresta. */
  function distanciaAoSegmento(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const comprimento = dx * dx + dy * dy;
    if (comprimento < 1e-9) return Math.hypot(px - a.x, py - a.y);
    let fracao = ((px - a.x) * dx + (py - a.y) * dy) / comprimento;
    fracao = Math.max(0, Math.min(1, fracao));
    return Math.hypot(px - (a.x + fracao * dx), py - (a.y + fracao * dy));
  }

  /* DUAS PASSADAS, E NÃO UMA COMPARAÇÃO ENCADEADA. Comparando cada candidato com
     o melhor corrente, um empate de três pixels puxa o melhor um pouco para
     longe, o seguinte empata com esse novo melhor e puxa mais, e a escolha
     caminha. Medido: o vértice que vinha selecionado chegou a 41,8 pixels do
     ponteiro. Aqui o mínimo é achado primeiro e o empate é sempre medido contra
     ELE, então a escolha não anda. */
  function melhorCandidato(candidatos) {
    let minimo = Infinity;
    for (const candidato of candidatos) {
      if (candidato.pixels < minimo) minimo = candidato.pixels;
    }
    if (!(minimo <= ALCANCE_EM_PIXELS)) return null;

    let melhor = null;
    for (const candidato of candidatos) {
      if (candidato.pixels > minimo + EMPATE_EM_PIXELS) continue;
      if (!melhor || candidato.distancia < melhor.distancia) melhor = candidato;
    }
    return melhor?.id ?? null;
  }

  function alvoSobOPonteiro(evento) {
    const atual = estado.estado();
    const camera = cameraAtual();
    raiz.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const rect = canvas.getBoundingClientRect();

    if (atual.modo === 'vertice') {
      const candidatos = [];
      for (const id of pontos) {
        const tela = emPixels(posicoes.get(id) ?? [0, 0, 0], camera, rect);
        if (!tela) continue;
        candidatos.push({
          id,
          pixels: Math.hypot(evento.clientX - tela.x, evento.clientY - tela.y),
          distancia: tela.distancia,
        });
      }
      return melhorCandidato(candidatos);
    }

    if (atual.modo === 'aresta') {
      const candidatos = [];
      for (const chave of arestas) {
        const [ia, ib] = estrutura.arestas.get(chave);
        const a = emPixels(posicoes.get(ia) ?? [0, 0, 0], camera, rect);
        const b = emPixels(posicoes.get(ib) ?? [0, 0, 0], camera, rect);
        if (!a || !b) continue;
        candidatos.push({
          id: chave,
          pixels: distanciaAoSegmento(evento.clientX, evento.clientY, a, b),
          distancia: Math.min(a.distancia, b.distancia),
        });
      }
      return melhorCandidato(candidatos);
    }

    /* A face continua pelo raio: ali o encontro com a superfície É o que a
       pessoa vê, e projetar polígono na tela não acrescenta nada. */
    raio(evento);
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

  function iniciarMovimentoInterno() {
    const centro = centroDaSelecao();
    if (!centro) return null;
    const camera = cameraAtual();
    const centroMundo = new THREE.Vector3(...centro).applyMatrix4(raiz.matrixWorld);
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
    const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, centroMundo);
    const partida = ultimoPonteiro ? pontoNoPlano(ultimoPonteiro, plano) : centroMundo;
    if (!partida) return null;
    movimento = {
      origem: copiarVertices(), deslocamento: [0, 0, 0], eixo: null, entrada: '',
      plano, partida,
      /* O ponto que o ímã gruda: o centro da seleção antes do gesto. */
      referencia: centro, candidatos: null, ima: false, pelaSeta: false,
    };
    return { ...movimento, origem: undefined, plano: undefined, partida: undefined };
  }

  /* SÓ O BOTÃO ESQUERDO É DA EDIÇÃO. O modo parava a propagação de qualquer
     botão, e com isso a órbita e o arrasto da câmera morriam assim que a pessoa
     apertava Tab: ela entrava para mexer num vértice e ficava presa num ângulo
     só. O botão do meio e o direito seguem para o controlador de câmera, como
     fora do modo. */
  const daEdicao = (evento) => evento.button === undefined || evento.button === 0;

  function aoPressionar(evento) {
    if (!estado.estado().ativo || !daEdicao(evento)) return;
    /* No modo peça o clique continua sendo da bancada, que escolhe PARTES. Só o
       gesto de mover pertence a esta camada. */
    if (!desenharMalha && !movimento && eixoDoGizmoSobOPonteiro(evento) === null) return;
    if (movimento) {
      confirmarMovimento();
      evento.stopPropagation();
      return;
    }
    const eixoPego = eixoDoGizmoSobOPonteiro(evento);
    if (eixoPego !== null) {
      /* Arrastar a seta abre o MESMO movimento que o G abre, já com o eixo
         travado. Dois caminhos, um estado só: cancelar, confirmar, desfazer e o
         ímã continuam valendo igual. */
      evento.preventDefault();
      evento.stopPropagation();
      ultimoPonteiro = { clientX: evento.clientX, clientY: evento.clientY };
      if (iniciarMovimentoInterno()) {
        movimento.eixo = eixoPego;
        movimento.pelaSeta = true;
        canvas.setPointerCapture?.(evento.pointerId);
      }
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
    /* Sem gesto de edição em curso o movimento do ponteiro pertence à câmera.
       Parar a propagação aqui seria o mesmo que desligar a órbita. */
    if (!inicio) return;
    if (Math.hypot(evento.clientX - inicio[0], evento.clientY - inicio[1]) > ARRASTO_MINIMO) {
      atualizarCaixa(inicio, [evento.clientX, evento.clientY]);
    }
    evento.stopPropagation();
  }

  function aoSoltar(evento) {
    if (!daEdicao(evento)) return;
    if (movimento?.pelaSeta) {
      /* PEGAR A SETA E NÃO ARRASTAR É CLIQUE, NÃO MOVIMENTO. Sem isto, todo
         clique que encosta na seta some: ele abre e fecha um movimento de zero e
         a seleção nunca muda. Com o gesto desfeito, o clique segue o caminho
         normal e seleciona o que está sob o ponteiro. */
      const andou = movimento.deslocamento.some((c) => Math.abs(c) > 1e-9);
      if (!andou) {
        restaurar(movimento.origem);
        movimento = null;
        canvas.releasePointerCapture?.(evento.pointerId);
        const alvoDoClique = alvoSobOPonteiro(evento);
        if (alvoDoClique) estado.selecionar(alvoDoClique, { aditiva: evento.shiftKey, remover: evento.altKey });
        else if (!evento.shiftKey && !evento.altKey) estado.limpar();
        atualizarVisibilidade();
        evento.stopPropagation();
        return;
      }
      /* O gesto da seta é apertar, arrastar e soltar. Sem isto ele ficaria
         pendurado esperando um clique, e o clique seguinte da pessoa — que ela
         faria para selecionar outra coisa — confirmaria um movimento que ela já
         considerava terminado. */
      evento.stopPropagation();
      canvas.releasePointerCapture?.(evento.pointerId);
      confirmarMovimento();
      return;
    }
    if (!estado.estado().ativo || !inicio) return;
    const deslocamento = Math.hypot(evento.clientX - inicio[0], evento.clientY - inicio[1]);
    const origem = inicio;
    inicio = null;
    canvas.releasePointerCapture?.(evento.pointerId);
    evento.stopPropagation();
    caixa.hidden = true;
    if (deslocamento > ARRASTO_MINIMO) {
      const naCaixa = itensNaCaixa(origem, [evento.clientX, evento.clientY]);
      /* CAIXA VAZIA VOLTA A SER CLIQUE. Era este o "clico em certos vértices e
         não acontece nada". Mão humana anda alguns pixels entre apertar e
         soltar, e esse gesto virava uma caixa de seleção minúscula: ela passava
         ao lado do vértice, não pegava nada, e ainda limpava a seleção. Medido
         antes da correção, com oito pixels de tremida só 25 de 42 vértices
         respondiam — e acima de doze voltavam a responder, porque aí a caixa já
         era grande o bastante para alcançá-los. Daí parecer aleatório.
         Nenhum número de limite resolve isso sozinho, porque não existe fronteira
         entre clique tremido e arrasto curto. Então a caixa que não pega nada
         não decide nada: o gesto é reavaliado como clique. */
      if (naCaixa.length) {
        estado.selecionarMuitos(naCaixa, { aditiva: evento.shiftKey, remover: evento.altKey });
        atualizarVisibilidade();
        return;
      }
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
    iniciarMovimento: () => iniciarMovimentoInterno(),
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
    get imaLigado() { return Boolean(movimento?.ima); },
    /* Quem pergunta é o teclado da bancada: no modo peça as teclas de nível e de
       seleção não valem, porque ali não existe vértice na tela para escolher. */
    get desenhaMalha() { return desenharMalha; },
    /* A seta tem tamanho constante na tela, então precisa reagir à câmera a cada
       quadro; quem tem o laço de quadro é a bancada. */
    acompanharCamera: () => { atualizarGizmo(); gizmo.acompanharCamera(); },
    destruir() {
      canvas.removeEventListener('pointerdown', aoPressionar, true);
      canvas.removeEventListener('pointermove', aoMover, true);
      canvas.removeEventListener('pointerup', aoSoltar, true);
      geometriaPontos.dispose(); materialPontos.dispose();
      geometriaArestas.dispose(); materialArestas.dispose();
      geometriaFaces.dispose(); materialFaces.dispose();
      geometriaPontosSel.dispose(); materialPontosSel.dispose();
      geometriaArestasSel.dispose(); materialArestasSel.dispose();
      geometriaContornoFace.dispose(); materialContornoFace.dispose();
      gizmo.destruir();
      caixa.remove();
      grupo.removeFromParent();
    },
  };
}
