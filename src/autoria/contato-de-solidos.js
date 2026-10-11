import earcut from 'earcut';

/* contato-de-solidos — o núcleo geométrico que decide se dois sólidos se
 * separam, se encostam ou se invadem. Serviço neutro, sem Three.js.
 *
 * POR QUE ELE EXISTE COMO MÓDULO PRÓPRIO. Este código nasceu dentro de
 * `auditar-intersecoes-montagem.js` e respondia só sobre instâncias de
 * MONTAGEM. A mesma pergunta vale para as PARTES de uma peça — o pneu que
 * engoliu o aro e o tubo que atravessa a roda são o mesmo defeito medido pela
 * mesma régua — e a resposta estava trancada atrás de um formato de montagem.
 * Extrair foi reusar o mecanismo em vez de escrever um segundo; duas
 * implementações da mesma pergunta é o defeito, não a cura.
 *
 * A CAIXA É SOMENTE A FASE AMPLA. O resultado geométrico vem da malha: teste de
 * contenção por ponto e cruzamento de triângulos. Malha que não permite
 * concluir sobre um sólido é marcada como INCONCLUSIVA, nunca como livre —
 * responder "separadas" sobre uma malha aberta seria inventar garantia.
 *
 * O que mudou na extração: `prepararSolido` recebe `neutro` e `pose` em vez de
 * uma instância de montagem. Nada mais. O corpo das funções veio verbatim, para
 * que a auditoria de montagem, que quatro suítes já provam, siga idêntica.
 */

export const TOLERANCIA_CONTATO_SOLIDO = 1e-9;

const DIRECAO_RAIO = [1, 0.3713906763541037, 0.1932731453127433];
const EPS = 1e-12;

function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function mult(a, n) { return [a[0] * n, a[1] * n, a[2] * n]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function comprimento2(a) { return dot(a, a); }

function transformar(ponto, pose) {
  const escala = pose?.escala ?? 1;
  return add(pose?.deslocamento ?? [0, 0, 0], mult([
    dot(pose?.rotacao?.[0] ?? [1, 0, 0], ponto),
    dot(pose?.rotacao?.[1] ?? [0, 1, 0], ponto),
    dot(pose?.rotacao?.[2] ?? [0, 0, 1], ponto),
  ], escala));
}

export function exigirToleranciaDeContato(valor, quem = 'contato de sólidos') {
  if (!Number.isFinite(valor) || valor < 0) throw new Error(`${quem}: tolerância precisa ser finita e >= 0.`);
  return Object.is(valor, -0) ? 0 : valor;
}

function exigirPonto(ponto, caminho) {
  if (!Array.isArray(ponto) || ponto.length !== 3 || ponto.some((n) => !Number.isFinite(n))) {
    throw new Error(`${caminho}: vértice precisa ser [x,y,z] finito.`);
  }
}

function caixaDosPontos(pontos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const ponto of pontos) for (let eixo = 0; eixo < 3; eixo += 1) {
    min[eixo] = Math.min(min[eixo], ponto[eixo]);
    max[eixo] = Math.max(max[eixo], ponto[eixo]);
  }
  return { min, max };
}

export function caixasSeparadas(a, b, tolerancia) {
  return [0, 1, 2].some((eixo) => a.max[eixo] < b.min[eixo] - tolerancia
    || b.max[eixo] < a.min[eixo] - tolerancia);
}

function normalDaFace(pontos) {
  const normal = [0, 0, 0];
  for (let i = 0; i < pontos.length; i += 1) {
    const atual = pontos[i];
    const proximo = pontos[(i + 1) % pontos.length];
    normal[0] += (atual[1] - proximo[1]) * (atual[2] + proximo[2]);
    normal[1] += (atual[2] - proximo[2]) * (atual[0] + proximo[0]);
    normal[2] += (atual[0] - proximo[0]) * (atual[1] + proximo[1]);
  }
  return normal;
}

function triangulacaoDaFace(pontos, caminho, piso2 = EPS) {
  if (pontos.length === 3) return [[pontos[0], pontos[1], pontos[2]]];
  const normal = normalDaFace(pontos);
  const eixo = normal.reduce((melhor, valor, indice) => (
    Math.abs(normal[indice]) > Math.abs(normal[melhor]) ? indice : melhor
  ), 0);
  if (comprimento2(normal) <= piso2) throw new Error(`${caminho}: face degenerada não permite triangulação.`);
  const eixos = [[1, 2], [0, 2], [0, 1]][eixo];
  const plano = pontos.flatMap((ponto) => [ponto[eixos[0]], ponto[eixos[1]]]);
  /* Earcut já é dependência direta e neutra do projeto; esta é a mesma porta
     de triangulação usada pelo núcleo, sem importar o núcleo ou Three.js. */
  const indices = earcut(plano, null, 2);
  if (!Array.isArray(indices) || indices.length < 3 || indices.length % 3 !== 0) {
    throw new Error(`${caminho}: triangulação não produziu triângulos.`);
  }
  const saida = [];
  for (let i = 0; i < indices.length; i += 3) {
    saida.push([pontos[indices[i]], pontos[indices[i + 1]], pontos[indices[i + 2]]]);
  }
  return saida;
}

function chaveAresta(a, b) {
  const primeiro = JSON.stringify(a) < JSON.stringify(b) ? a : b;
  const segundo = primeiro === a ? b : a;
  return `${primeiro}|${segundo}`;
}

/**
 * Prepara um sólido para o teste de contato: triângulos no mundo, caixa e se a
 * malha é FECHADA. `neutro` é `{V, F}`; `pose` é opcional e, ausente, vale
 * identidade. `rotulo` só nomeia o sólido nos diagnósticos.
 *
 * Malha aberta, não-manifold ou degenerada não vira erro: vira sólido marcado,
 * e quem audita devolve `inconclusivo` em vez de fingir resposta.
 */
export function prepararSolido(neutro, pose, rotulo) {
  const nome = Array.isArray(rotulo) ? rotulo.join('/') : String(rotulo ?? '');
  if (!neutro?.V || !neutro?.F || typeof neutro.V.values !== 'function' || typeof neutro.F.values !== 'function') {
    return { rotulo, inconclusivo: 'geometria-resolvida-ausente' };
  }
  const vertices = new Map();
  for (const [id, ponto] of neutro.V.entries()) {
    exigirPonto(ponto, `${nome}.V[${id}]`);
    vertices.set(id, transformar(ponto, pose));
  }
  /* PISO DE ÁREA RELATIVO AO TAMANHO. O piso era 1e-12 no quadrado do
     produto vetorial, absoluto: numa peça em metros ele chama de degenerado
     todo triângulo com menos de 0,5 mm² de área. A união de sólidos deixa
     triângulos assim, legítimos, junto da costura, e o ombro unido saía
     "inconclusivo" em todo par (achado da rodada do ombro, 2026-09-29). O
     piso passa a ser o da guarda de malha, 1e-9·escala² de área, com a
     escala medida pela meia diagonal da caixa do sólido; numa peça de escala 1
     ele é mais fino que o antigo, e nunca mais grosso. */
  const caixaDoSolido = caixaDosPontos([...vertices.values()]);
  const escalaDoSolido = Math.hypot(...[0, 1, 2].map((e) => caixaDoSolido.max[e] - caixaDoSolido.min[e]));
  /* meia diagonal: a mesma ordem de grandeza do |p| máximo da guarda de
     malha numa peça centrada, para as duas medidas não discordarem sobre o
     mesmo triângulo (o ombro arredondado tinha um de 1,7e-10 que a guarda
     aceitava e o contato recusava) */
  const meiaDiagonal = escalaDoSolido / 2;
  const piso2 = Math.min(EPS, (2e-9 * meiaDiagonal * meiaDiagonal) ** 2);
  const triangulos = [];
  const arestas = new Map();
  const vizinhancaDosVertices = new Map();
  const verticesUsados = new Set();
  let invalida = null;
  const faces = [...neutro.F.values()].sort((a, b) => compararTexto(String(a.id), String(b.id)));
  for (const face of faces) {
    if (!Array.isArray(face.vs) || face.vs.length < 3) { invalida = 'face-sem-tres-vertices'; break; }
    const pontos = face.vs.map((id) => vertices.get(id));
    if (pontos.some((ponto) => !ponto)) { invalida = 'face-referencia-vertice-ausente'; break; }
    for (let i = 0; i < face.vs.length; i += 1) {
      const a = face.vs[i]; const b = face.vs[(i + 1) % face.vs.length];
      const chave = chaveAresta(a, b); arestas.set(chave, (arestas.get(chave) ?? 0) + 1);
      verticesUsados.add(a);
      if (!vizinhancaDosVertices.has(a)) vizinhancaDosVertices.set(a, new Map());
      const vizinhos = vizinhancaDosVertices.get(a);
      const anterior = face.vs[(i + face.vs.length - 1) % face.vs.length];
      if (!vizinhos.has(anterior)) vizinhos.set(anterior, new Set());
      if (!vizinhos.has(b)) vizinhos.set(b, new Set());
      vizinhos.get(anterior).add(b);
      vizinhos.get(b).add(anterior);
    }
    try { triangulos.push(...triangulacaoDaFace(pontos, `${nome}.F[${face.id}]`, piso2)); }
    catch (erro) { invalida = erro.message; break; }
  }
  if (invalida || triangulos.length === 0) return { rotulo, inconclusivo: invalida ?? 'malha-vazia' };
  const degenerada = triangulos.some(([a, b, c]) => comprimento2(cross(sub(b, a), sub(c, a))) <= piso2);
  const arestasFechadas = [...arestas.values()].every((contagem) => contagem === 2);
  const verticesSemUso = [...vertices.keys()].some((id) => !verticesUsados.has(id));
  const linksDeVerticeValidos = [...vizinhancaDosVertices.values()].every((vizinhos) => {
    if (vizinhos.size < 3 || [...vizinhos.values()].some((ligacoes) => ligacoes.size !== 2)) return false;
    const visitados = new Set(); const fila = [vizinhos.keys().next().value];
    while (fila.length) {
      const atual = fila.pop();
      if (visitados.has(atual)) continue;
      visitados.add(atual);
      for (const proximo of vizinhos.get(atual) ?? []) if (!visitados.has(proximo)) fila.push(proximo);
    }
    return visitados.size === vizinhos.size;
  });
  const fechada = !degenerada && !verticesSemUso && arestasFechadas && linksDeVerticeValidos;
  return {
    rotulo,
    triangulos,
    caixa: caixaDosPontos([...vertices.values()]),
    fechada,
    ...(degenerada ? { inconclusivo: 'triangulo-degenerado' } : {}),
    ...(fechada ? {} : { diagnosticoTopologia: 'malha-aberta-ou-nao-manifold' }),
  };
}

function sobreposicaoTriangulo(a, b, tolerancia) {
  const eixos = [];
  /* O eixo é o produto vetorial de dois vetores e só é descartado quando é nulo diante deles (vetores paralelos): a
     comparação é relativa ao tamanho dos dois, porque o piso absoluto de 1e-12 sobre o quadrado do eixo jogava fora os
     eixos de qualquer triângulo de milímetros (a metro por unidade), e com eles a separação. */
  const adicionar = (u, v) => {
    const eixo = cross(u, v);
    if (comprimento2(eixo) > 1e-18 * comprimento2(u) * comprimento2(v)) eixos.push(eixo);
  };
  const arestasA = [sub(a[1], a[0]), sub(a[2], a[1]), sub(a[0], a[2])];
  const arestasB = [sub(b[1], b[0]), sub(b[2], b[1]), sub(b[0], b[2])];
  const normalA = cross(arestasA[0], sub(a[2], a[0]));
  const normalB = cross(arestasB[0], sub(b[2], b[0]));
  adicionar(arestasA[0], sub(a[2], a[0])); adicionar(arestasB[0], sub(b[2], b[0]));
  for (const arestaA of arestasA) {
    for (const arestaB of arestasB) adicionar(arestaA, arestaB);
  }
  /* DOIS TRIÂNGULOS NO MESMO PLANO. As arestas de um e de outro são paralelas ao plano, então todos os produtos acima
     dão a normal, e nenhum eixo enxerga a separação dentro do plano: dois triângulos coplanares e afastados saíam como
     "se cruzam". O eixo que separa é a perpendicular de cada aresta dentro do plano do próprio triângulo. */
  for (const [normal, arestas] of [[normalA, arestasA], [normalB, arestasB]]) {
    if (comprimento2(normal) > 0) for (const aresta of arestas) adicionar(normal, aresta);
  }
  for (const eixo of eixos) {
    /* o eixo vai normalizado para a tolerância ser uma distância, e não depender do tamanho do triângulo */
    const norma = Math.sqrt(comprimento2(eixo));
    const valoresA = a.map((ponto) => dot(eixo, ponto) / norma);
    const valoresB = b.map((ponto) => dot(eixo, ponto) / norma);
    if (Math.max(...valoresA) < Math.min(...valoresB) - tolerancia
      || Math.max(...valoresB) < Math.min(...valoresA) - tolerancia) return false;
  }
  return true;
}

/* O PONTO NO TRIÂNGULO MEDE DISTÂNCIA. Os três testes de lado comparavam a tolerância com o produto de dois vetores e da
   normal, que escala com o tamanho do triângulo ao cubo: num triângulo de milímetros (a metro por unidade) esse produto
   fica abaixo de 1e-9 e qualquer ponto coplanar com a face passava por "dentro" dela, longe que estivesse. Aqui cada
   lado é a distância do ponto à reta da aresta, em unidade de mundo, e a tolerância é a mesma do plano. */
function pontoNoTriangulo(ponto, triangulo, tolerancia) {
  const [a, b, c] = triangulo;
  const normal = cross(sub(b, a), sub(c, a));
  const tamanhoDaNormal = Math.sqrt(comprimento2(normal));
  const distancia = Math.abs(dot(normal, sub(ponto, a))) / tamanhoDaNormal;
  if (distancia > tolerancia) return false;
  const doLado = (de, para) => {
    const aresta = sub(para, de);
    const tamanho = Math.sqrt(comprimento2(aresta));
    return tamanho > 0 ? dot(cross(aresta, sub(ponto, de)), normal) / (tamanhoDaNormal * tamanho) : 0;
  };
  return doLado(a, b) >= -tolerancia && doLado(b, c) >= -tolerancia && doLado(c, a) >= -tolerancia;
}

function raioAtravessaTriangulo(origem, triangulo, tolerancia) {
  const [a, b, c] = triangulo;
  const direcao = DIRECAO_RAIO;
  const aresta1 = sub(b, a); const aresta2 = sub(c, a);
  const h = cross(direcao, aresta2); const determinante = dot(aresta1, h);
  /* raio paralelo ao plano do triângulo: o determinante é adimensional só depois de dividido pelo tamanho dos dois
     vetores. Comparado direto com a tolerância (uma distância), ele jogava fora todo triângulo de poucos milímetros
     quadrados como "paralelo", e a contagem de cruzamentos do raio perdia faces. */
  if (Math.abs(determinante) <= 1e-12 * Math.sqrt(comprimento2(aresta1) * comprimento2(h))) return null;
  const inverso = 1 / determinante;
  const s = sub(origem, a); const u = inverso * dot(s, h);
  if (u < -tolerancia || u > 1 + tolerancia) return null;
  const q = cross(s, aresta1); const v = inverso * dot(direcao, q);
  if (v < -tolerancia || u + v > 1 + tolerancia) return null;
  const t = inverso * dot(aresta2, q);
  return t > tolerancia ? t : null;
}

function pontoDentroMalha(ponto, malha, tolerancia) {
  let contagem = 0;
  for (const triangulo of malha.triangulos) {
    if (pontoNoTriangulo(ponto, triangulo, tolerancia)) return null;
    if (raioAtravessaTriangulo(ponto, triangulo, tolerancia) !== null) contagem += 1;
  }
  return contagem % 2 === 1;
}

function malhasSeInterseccionam(a, b, tolerancia) {
  for (const trianguloA of a.triangulos) for (const trianguloB of b.triangulos) {
    if (sobreposicaoTriangulo(trianguloA, trianguloB, tolerancia)) return true;
  }
  return false;
}

/**
 * Estado geométrico entre dois sólidos preparados: `separadas`, `encostam`,
 * `interpenetram` ou `inconclusivo`. Sólido de malha aberta nunca recebe
 * veredito de separação nem de invasão — recebe `inconclusivo` com o motivo.
 */
/* O CENTROIDE ENTRA PORQUE O VÉRTICE É JUSTAMENTE ONDE AS MALHAS EMPATAM.
   A contenção amostrava só os vértices dos triângulos. Com dois sólidos de lado
   igual e eixos alinhados, todo vértice de um cai EXATAMENTE na superfície do
   outro, nenhum ponto fica estritamente dentro, e sobreposição real de metade
   do volume era rebaixada de `interpenetram` para `encostam` — a acusação
   continuava, só a gravidade mentia.

   Medido antes de escolher, no caso do empate: dos 36 vértices, nenhum cai
   dentro; o ponto médio de aresta acerta 2 de 36 e o centroide 2 de 12. Os dois
   resolvem, e o centroide resolve com um terço dos pontos, que é o que importa
   porque cada ponto custa um lançamento de raio contra a malha inteira.

   Impacto medido no acervo antes de entrar: nenhuma peça mudou de código de
   saída nem de quantidade de pares acusados. Só a `barricada-de-sucata` mudou o
   estado de três pares, de `encostam` para `interpenetram`, e ela é a peça com
   defeito real de posicionamento. Custo do acervo inteiro: de 6,23 para 7,02
   segundos.

   Uma sonda adversarial tentou cinco ataques com esta amostragem e nenhum
   passou como livre. Ela também mostrou que refinar a malha não abre brecha: o
   cruzamento é testado triângulo contra triângulo, e só a contenção depende de
   amostragem. */
function pontosDeAmostragem(solido) {
  const centroide = (t) => [0, 1, 2].map((i) => (t[0][i] + t[1][i] + t[2][i]) / 3);
  return [...solido.triangulos.flatMap((t) => t), ...solido.triangulos.map(centroide)];
}

export function auditarParDeSolidos(a, b, tolerancia) {
  if (a.inconclusivo || b.inconclusivo) return { estado: 'inconclusivo', diagnosticos: [a.inconclusivo, b.inconclusivo].filter(Boolean) };
  if (caixasSeparadas(a.caixa, b.caixa, tolerancia)) return { estado: 'separadas', metodo: 'caixa-mundo' };
  const pontosA = pontosDeAmostragem(a);
  const pontosB = pontosDeAmostragem(b);
  const estadosA = pontosA.map((ponto) => pontoDentroMalha(ponto, b, tolerancia));
  const estadosB = pontosB.map((ponto) => pontoDentroMalha(ponto, a, tolerancia));
  if (estadosA.includes(true) || estadosB.includes(true)) {
    return a.fechada && b.fechada
      ? { estado: 'interpenetram', metodo: 'contencao-e-malha' }
      : { estado: 'inconclusivo', diagnosticos: ['contencao-em-malha-aberta'] };
  }
  const superficie = estadosA.includes(null) || estadosB.includes(null);
  if (!malhasSeInterseccionam(a, b, tolerancia)) {
    return a.fechada && b.fechada
      ? { estado: 'separadas', metodo: 'malha-canonica' }
      : { estado: 'inconclusivo', diagnosticos: ['malha-aberta-sem-intersecao-superficial'] };
  }
  if (superficie) {
    return a.fechada && b.fechada
      ? { estado: 'encostam', metodo: 'superficie-na-tolerancia' }
      : { estado: 'inconclusivo', diagnosticos: ['contato-em-malha-aberta'] };
  }
  return a.fechada && b.fechada
    ? { estado: 'interpenetram', metodo: 'intersecao-de-superficies' }
    : { estado: 'inconclusivo', diagnosticos: ['intersecao-em-malha-aberta'] };
}

/* DISTÂNCIA DE UM PONTO A UM TRIÂNGULO — o ponto mais próximo do triângulo
   fechado, pelas regiões de Voronoi do triângulo. Só a profundidade de
   interpenetração precisa dela; o estado do par segue vindo de
   `auditarParDeSolidos`. */
function distancia2PontoTriangulo(p, [a, b, c]) {
  const ab = sub(b, a); const ac = sub(c, a); const ap = sub(p, a);
  const d1 = dot(ab, ap); const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return comprimento2(ap);
  const bp = sub(p, b); const d3 = dot(ab, bp); const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return comprimento2(bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return comprimento2(sub(p, add(a, mult(ab, d1 / (d1 - d3)))));
  const cp = sub(p, c); const d5 = dot(ab, cp); const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return comprimento2(cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return comprimento2(sub(p, add(a, mult(ac, d2 / (d2 - d6)))));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    return comprimento2(sub(p, add(b, mult(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))))));
  }
  const soma = 1 / (va + vb + vc);
  return comprimento2(sub(p, add(a, add(mult(ab, vb * soma), mult(ac, vc * soma)))));
}

/**
 * Profundidade de interpenetração entre dois sólidos preparados, em unidade de
 * mundo: o maior afundamento, na superfície do outro sólido, de um dos pontos
 * de amostragem do contato (vértices e centroides) que a contenção acusa
 * estritamente dentro. Mesma amostragem e mesmo teste de contenção que
 * `auditarParDeSolidos`, de modo que as duas medidas não discordam sobre o que
 * está dentro. É um piso da penetração real, porque só amostra pontos.
 *
 * Devolve `null` quando nenhum ponto amostrado fica dentro (o par se cruza só
 * por arestas, ou não se invade) ou quando algum sólido é inconclusivo; quem
 * consome trata `null` num par `interpenetram` como penetração indeterminada,
 * nunca como zero.
 */
export function profundidadeDeInterpenetracao(a, b, tolerancia) {
  if (a.inconclusivo || b.inconclusivo || !a.fechada || !b.fechada) return null;
  if (caixasSeparadas(a.caixa, b.caixa, tolerancia)) return null;
  const maiorDentro = (de, em) => {
    let maior = null;
    for (const ponto of pontosDeAmostragem(de)) {
      if (pontoDentroMalha(ponto, em, tolerancia) !== true) continue;
      let menor = Infinity;
      for (const triangulo of em.triangulos) menor = Math.min(menor, distancia2PontoTriangulo(ponto, triangulo));
      const profundidade = Math.sqrt(menor);
      if (maior === null || profundidade > maior) maior = profundidade;
    }
    return maior;
  };
  const deAemB = maiorDentro(a, b); const deBemA = maiorDentro(b, a);
  if (deAemB === null) return deBemA;
  if (deBemA === null) return deAemB;
  return Math.max(deAemB, deBemA);
}
