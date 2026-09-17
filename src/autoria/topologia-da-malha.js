/* topologia-da-malha.js — extrudar, duplicar, apagar e criar face.
 *
 * As operações que MUDAM a malha, e não só movem o que já existe. Elas moram no
 * núcleo, sem Three.js e sem interface, porque o que fazem é aritmética sobre
 * `V` e `F` do estado neutro — a mesma estrutura que a receita produz e que a
 * medida lê.
 *
 * ID NOVO NÃO É IDENTIDADE. Vértice e face criados aqui recebem o próximo número
 * livre, e esse número não é gravado em lugar nenhum: ele vale enquanto a malha
 * está aberta. O que a rodada de absorção lê é a MEDIDA do resultado, e o que a
 * receita escreve são passos. Se o id fosse identidade, a primeira reexecução da
 * receita apontaria para o vazio.
 *
 * O QUE NÃO SE FAZ AQUI. Nada decide se a peça ficou boa, nada mexe em parte
 * declarada, e nada inventa parte nova: a face criada herda a parte das faces de
 * onde ela nasceu. Batizar parte é decisão de receita, e a rodada de absorção
 * cobra o plano e os contatos quando o número de partes muda. */

const MINIMO = 1e-12;

function proximoId(mapa) {
  let maior = -1;
  for (const chave of mapa.keys()) {
    const numero = Number(chave);
    if (Number.isFinite(numero) && numero > maior) maior = numero;
  }
  return maior + 1;
}

const chaveDaAresta = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Cópia rasa com `V` e `F` novos, para nenhuma operação escrever na entrada. */
function clonar(neutro) {
  return {
    ...neutro,
    V: new Map([...neutro.V].map(([id, ponto]) => [id, [...ponto]])),
    F: new Map([...neutro.F].map(([id, face]) => [id, { ...face, vs: [...face.vs] }])),
  };
}

/** Os vértices que a seleção alcança, em números como `V` os guarda. */
export function verticesAlcancados(neutro, { modo, selecionados }) {
  const escolhidos = new Set((selecionados ?? []).map(String));
  const alcancados = new Set();
  if (modo === 'vertice') {
    for (const id of neutro.V.keys()) if (escolhidos.has(String(id))) alcancados.add(id);
    return alcancados;
  }
  if (modo === 'aresta') {
    for (const face of neutro.F.values()) {
      for (let i = 0; i < face.vs.length; i += 1) {
        const a = face.vs[i];
        const b = face.vs[(i + 1) % face.vs.length];
        if (escolhidos.has(chaveDaAresta(String(a), String(b)))) { alcancados.add(a); alcancados.add(b); }
      }
    }
    return alcancados;
  }
  for (const face of neutro.F.values()) {
    if (escolhidos.has(String(face.id))) for (const v of face.vs) alcancados.add(v);
  }
  return alcancados;
}

/** As faces cujos vértices estão TODOS na seleção. */
function facesInteirasNaSelecao(neutro, alcancados) {
  return [...neutro.F.values()].filter((face) => face.vs.every((v) => alcancados.has(v)));
}

/**
 * Extrudar: as faces selecionadas ganham uma cópia deslocada, e as bordas viram
 * paredes ligando a face antiga à nova.
 *
 * A FACE NOVA NASCE JÁ AFASTADA, e não em cima da antiga. A ideia de nascer no
 * mesmo lugar e deixar o gesto seguinte mover vem do Blender, mas ali a malha
 * não é conferida: aqui o motor recusa face degenerada, e parede de área zero é
 * exatamente isso — medido, `adaptarThree` reprovou com "face 14043 é degenerada
 * — os 4 cantos não definem um plano". O afastamento é um quarto da aresta média
 * da face, na direção da normal dela, então ele acompanha a escala da peça em
 * vez de ser um número fixo que some num tubo grande e atravessa um pequeno.
 *
 * Devolve `{ neutro, selecionados }`, com a seleção já apontando para a face
 * nova — mover logo em seguida move o que acabou de nascer, e não o que ficou.
 */
const subtrair = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruzar = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norma = (v) => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);

/** Normal e tamanho de uma face, para saber a direção e a medida da extrusão. */
function planoDaFace(neutro, face) {
  const pontos = face.vs.map((v) => neutro.V.get(v)).filter(Boolean);
  if (pontos.length < 3) return null;
  let normal = [0, 0, 0];
  /* Soma dos produtos vetoriais das arestas consecutivas: é estável em polígono
     de mais de três lados, onde escolher só três cantos pode cair num trio
     quase alinhado e devolver direção sem sentido. */
  for (let i = 0; i < pontos.length; i += 1) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    const c = pontos[(i + 2) % pontos.length];
    const parcial = cruzar(subtrair(b, a), subtrair(c, b));
    normal = [normal[0] + parcial[0], normal[1] + parcial[1], normal[2] + parcial[2]];
  }
  const comprimento = norma(normal);
  if (!(comprimento > MINIMO)) return null;

  let somaDeArestas = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    somaDeArestas += norma(subtrair(pontos[(i + 1) % pontos.length], pontos[i]));
  }
  return {
    normal: normal.map((c) => c / comprimento),
    arestaMedia: somaDeArestas / pontos.length,
  };
}

export function extrudar(neutro, estado) {
  const alcancados = verticesAlcancados(neutro, estado);
  const faces = facesInteirasNaSelecao(neutro, alcancados);
  if (faces.length === 0) return { neutro, selecionados: estado.selecionados ?? [], mudou: false };

  const proximo = clonar(neutro);
  let idV = proximoId(proximo.V);
  let idF = proximoId(proximo.F);
  const copiaDe = new Map();
  const novas = [];

  for (const face of faces) {
    const plano = planoDaFace(proximo, face);
    if (!plano) continue;
    const avanco = plano.normal.map((c) => c * plano.arestaMedia * 0.25);
    for (const v of face.vs) {
      if (copiaDe.has(v)) continue;
      const ponto = proximo.V.get(v);
      proximo.V.set(idV, [ponto[0] + avanco[0], ponto[1] + avanco[1], ponto[2] + avanco[2]]);
      copiaDe.set(v, idV);
      idV += 1;
    }
  }
  if (copiaDe.size === 0) return { neutro, selecionados: estado.selecionados ?? [], mudou: false };

  for (const face of faces) {
    const topo = { ...face, id: idF, vs: face.vs.map((v) => copiaDe.get(v)) };
    proximo.F.set(idF, topo);
    novas.push(idF);
    idF += 1;

    /* As paredes: uma por aresta da face original, ligando as duas bordas. A
       ordem dos vértices segue a da face, então a parede herda a orientação e
       não nasce virada para dentro. */
    for (let i = 0; i < face.vs.length; i += 1) {
      const a = face.vs[i];
      const b = face.vs[(i + 1) % face.vs.length];
      proximo.F.set(idF, { ...face, id: idF, vs: [a, b, copiaDe.get(b), copiaDe.get(a)] });
      idF += 1;
    }

    /* A face original vira o fundo e sai da casca: manter as duas deixaria a
       peça com uma parede interna que a medida de contato acusa como corpo
       dentro de corpo. */
    proximo.F.delete(face.id);
  }

  return { neutro: proximo, selecionados: novas.map(String), mudou: true };
}

/**
 * Duplicar: a seleção ganha uma cópia solta, no mesmo lugar, e a seleção passa
 * para ela. Diferente de extrudar, nada liga a cópia ao original.
 */
export function duplicar(neutro, estado) {
  const alcancados = verticesAlcancados(neutro, estado);
  const faces = facesInteirasNaSelecao(neutro, alcancados);
  if (faces.length === 0) return { neutro, selecionados: estado.selecionados ?? [], mudou: false };

  const proximo = clonar(neutro);
  let idV = proximoId(proximo.V);
  let idF = proximoId(proximo.F);
  const copiaDe = new Map();
  const novas = [];

  for (const face of faces) {
    for (const v of face.vs) {
      if (copiaDe.has(v)) continue;
      proximo.V.set(idV, [...proximo.V.get(v)]);
      copiaDe.set(v, idV);
      idV += 1;
    }
    proximo.F.set(idF, { ...face, id: idF, vs: face.vs.map((v) => copiaDe.get(v)) });
    novas.push(idF);
    idF += 1;
  }

  return { neutro: proximo, selecionados: novas.map(String), mudou: true };
}

/**
 * Apagar a seleção.
 *
 * Face some sozinha. Vértice e aresta levam junto TODA face que os usa, porque
 * face com vértice faltando não é face: seria um buraco descrito por uma lista
 * de números que não existem mais.
 *
 * Vértice que deixa de pertencer a qualquer face também sai. Vértice solto não
 * aparece na medida, não vira geometria e continuaria ocupando id.
 */
export function apagar(neutro, estado) {
  const escolhidos = new Set((estado.selecionados ?? []).map(String));
  if (escolhidos.size === 0) return { neutro, selecionados: [], mudou: false };
  const proximo = clonar(neutro);

  if (estado.modo === 'face') {
    for (const id of [...proximo.F.keys()]) if (escolhidos.has(String(id))) proximo.F.delete(id);
  } else {
    const alcancados = verticesAlcancados(neutro, estado);
    for (const [id, face] of [...proximo.F]) {
      if (face.vs.some((v) => alcancados.has(v))) proximo.F.delete(id);
    }
  }

  const usados = new Set();
  for (const face of proximo.F.values()) for (const v of face.vs) usados.add(v);
  for (const id of [...proximo.V.keys()]) if (!usados.has(id)) proximo.V.delete(id);

  return { neutro: proximo, selecionados: [], mudou: proximo.F.size !== neutro.F.size };
}

/**
 * Criar face a partir de três ou mais vértices selecionados.
 *
 * A ordem é a da seleção, porque só quem escolheu sabe o contorno pretendido:
 * quatro vértices de um quadrado admitem o quadrado e a gravata, e nenhuma regra
 * geométrica escolhe entre os dois sem inventar intenção.
 *
 * A parte e o material vêm da face que já usa esses vértices. Sem nenhuma, a
 * criação falha em vez de batizar parte nova por conta própria.
 */
export function criarFace(neutro, estado) {
  const escolhidos = (estado.selecionados ?? []).map(Number).filter((v) => neutro.V.has(v));
  if (estado.modo !== 'vertice' || escolhidos.length < 3) {
    return { neutro, selecionados: estado.selecionados ?? [], mudou: false, motivo: 'escolha três ou mais vértices' };
  }
  const vizinha = [...neutro.F.values()].find((face) => face.vs.some((v) => escolhidos.includes(v)));
  if (!vizinha) {
    return { neutro, selecionados: estado.selecionados ?? [], mudou: false, motivo: 'estes vértices não pertencem a parte nenhuma' };
  }
  const proximo = clonar(neutro);
  const id = proximoId(proximo.F);
  proximo.F.set(id, { ...vizinha, id, vs: escolhidos });
  return { neutro: proximo, selecionados: [String(id)], mudou: true };
}

function centroDe(neutro, alcancados) {
  const pontos = [...alcancados].map((v) => neutro.V.get(v)).filter(Boolean);
  if (pontos.length === 0) return null;
  return [0, 1, 2].map((i) => pontos.reduce((soma, p) => soma + p[i], 0) / pontos.length);
}

/**
 * Girar a seleção em torno do próprio centro, num eixo.
 *
 * `eixo` é 0, 1 ou 2, e `angulo` vem em radianos. Girar em torno do centro da
 * seleção, e não da origem da peça, é o que mantém o gesto no lugar onde a
 * pessoa está olhando.
 */
/* O EIXO ACEITA AS DUAS FORMAS, índice 0/1/2 e nome 'x'/'y'/'z', e um valor que
   não é nenhuma das duas devolve motivo em vez de silêncio. Antes, chamar com
   'y' caía num `undefined` e a função respondia que nada mudou, que é a resposta
   idêntica à de um ângulo nulo: o erro de chamada ficava indistinguível de um
   gesto sem efeito, e quem chamasse errado nunca saberia. */
const EIXO_POR_NOME = { x: 0, y: 1, z: 2 };
function indiceDoEixo(eixo) {
  if (eixo === 0 || eixo === 1 || eixo === 2) return eixo;
  if (typeof eixo === 'string' && eixo in EIXO_POR_NOME) return EIXO_POR_NOME[eixo];
  return null;
}

export function rotacionar(neutro, estado, { eixo, angulo }) {
  const alcancados = verticesAlcancados(neutro, estado);
  const centro = centroDe(neutro, alcancados);
  if (!centro || !Number.isFinite(angulo) || Math.abs(angulo) < MINIMO) {
    return { neutro, mudou: false };
  }
  const indice = indiceDoEixo(eixo);
  if (indice === null) return { neutro, mudou: false, motivo: `eixo desconhecido: ${eixo}` };
  const [a, b] = [[1, 2], [2, 0], [0, 1]][indice];

  const proximo = clonar(neutro);
  const cos = Math.cos(angulo);
  const sen = Math.sin(angulo);
  for (const v of alcancados) {
    const ponto = proximo.V.get(v);
    if (!ponto) continue;
    const da = ponto[a] - centro[a];
    const db = ponto[b] - centro[b];
    ponto[a] = centro[a] + da * cos - db * sen;
    ponto[b] = centro[b] + da * sen + db * cos;
  }
  return { neutro: proximo, mudou: true };
}

/**
 * Escalar a seleção em torno do próprio centro.
 *
 * `fator` menor que um encolhe. `eixo` limita a um eixo só; sem ele, os três.
 */
export function escalar(neutro, estado, { fator, eixo = null }) {
  const alcancados = verticesAlcancados(neutro, estado);
  const centro = centroDe(neutro, alcancados);
  if (!centro || !Number.isFinite(fator) || Math.abs(fator - 1) < MINIMO) {
    return { neutro, mudou: false };
  }
  const indice = eixo === null ? null : indiceDoEixo(eixo);
  if (eixo !== null && indice === null) {
    return { neutro, mudou: false, motivo: `eixo desconhecido: ${eixo}` };
  }
  const proximo = clonar(neutro);
  for (const v of alcancados) {
    const ponto = proximo.V.get(v);
    if (!ponto) continue;
    for (const i of [0, 1, 2]) {
      if (indice !== null && indice !== i) continue;
      ponto[i] = centro[i] + (ponto[i] - centro[i]) * fator;
    }
  }
  return { neutro: proximo, mudou: true };
}
