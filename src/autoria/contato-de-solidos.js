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

function triangulacaoDaFace(pontos, caminho) {
  if (pontos.length === 3) return [[pontos[0], pontos[1], pontos[2]]];
  const normal = normalDaFace(pontos);
  const eixo = normal.reduce((melhor, valor, indice) => (
    Math.abs(normal[indice]) > Math.abs(normal[melhor]) ? indice : melhor
  ), 0);
  if (comprimento2(normal) <= EPS) throw new Error(`${caminho}: face degenerada não permite triangulação.`);
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
    try { triangulos.push(...triangulacaoDaFace(pontos, `${nome}.F[${face.id}]`)); }
    catch (erro) { invalida = erro.message; break; }
  }
  if (invalida || triangulos.length === 0) return { rotulo, inconclusivo: invalida ?? 'malha-vazia' };
  const degenerada = triangulos.some(([a, b, c]) => comprimento2(cross(sub(b, a), sub(c, a))) <= EPS);
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
  const adicionar = (eixo) => { if (comprimento2(eixo) > EPS) eixos.push(eixo); };
  const normalA = cross(sub(a[1], a[0]), sub(a[2], a[0]));
  const normalB = cross(sub(b[1], b[0]), sub(b[2], b[0]));
  adicionar(normalA); adicionar(normalB);
  for (const arestaA of [sub(a[1], a[0]), sub(a[2], a[1]), sub(a[0], a[2])]) {
    for (const arestaB of [sub(b[1], b[0]), sub(b[2], b[1]), sub(b[0], b[2])]) adicionar(cross(arestaA, arestaB));
  }
  for (const eixo of eixos) {
    const valoresA = a.map((ponto) => dot(eixo, ponto));
    const valoresB = b.map((ponto) => dot(eixo, ponto));
    if (Math.max(...valoresA) < Math.min(...valoresB) - tolerancia
      || Math.max(...valoresB) < Math.min(...valoresA) - tolerancia) return false;
  }
  return true;
}

function pontoNoTriangulo(ponto, triangulo, tolerancia) {
  const [a, b, c] = triangulo;
  const normal = cross(sub(b, a), sub(c, a));
  const distancia = Math.abs(dot(normal, sub(ponto, a))) / Math.sqrt(comprimento2(normal));
  if (distancia > tolerancia) return false;
  const ab = sub(b, a); const bc = sub(c, b); const ca = sub(a, c);
  const ap = sub(ponto, a); const bp = sub(ponto, b); const cp = sub(ponto, c);
  return dot(cross(ab, ap), normal) >= -tolerancia
    && dot(cross(bc, bp), normal) >= -tolerancia
    && dot(cross(ca, cp), normal) >= -tolerancia;
}

function raioAtravessaTriangulo(origem, triangulo, tolerancia) {
  const [a, b, c] = triangulo;
  const direcao = DIRECAO_RAIO;
  const aresta1 = sub(b, a); const aresta2 = sub(c, a);
  const h = cross(direcao, aresta2); const determinante = dot(aresta1, h);
  if (Math.abs(determinante) <= tolerancia) return null;
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
