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

export function transformar(ponto, pose) {
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

export function sobreposicaoTriangulo(a, b, tolerancia) {
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

/* O PONTO FORA DA CAIXA NÃO PRECISA DO RAIO. Cada ponto de amostragem custa um
   percurso por todos os triângulos da outra malha, e na montagem do avião, com
   dezenas de milhares de triângulos por peça, o par asa e fuselagem levava 79 s
   quase todo em pontos que nem estão perto da fuselagem. Numa malha FECHADA, um
   ponto fora da caixa dela, com a folga abaixo, não está dentro e não está a
   menos de uma tolerância de triângulo nenhum, então a resposta do percurso é
   "fora". A folga é a do pior triângulo: a região que `pontoNoTriangulo` aceita
   é o triângulo alargado de uma tolerância por lado e uma no plano, e num
   vértice de ângulo θ ela passa do vértice por `tolerância / sen(θ/2)`. Malha
   aberta não usa o atalho, para o veredito dela seguir idêntico. */
const folgasDeCaixa = new WeakMap();

function folgaDaCaixa(malha, tolerancia) {
  const guardada = folgasDeCaixa.get(malha);
  if (guardada?.tolerancia === tolerancia) return guardada.folga;
  let menorSenoDaMetade = 1;
  for (const [a, b, c] of malha.triangulos) {
    for (const [p, q, r] of [[a, b, c], [b, c, a], [c, a, b]]) {
      const u = sub(q, p); const v = sub(r, p);
      const tamanhos = Math.sqrt(comprimento2(u) * comprimento2(v));
      const seno = tamanhos > 0 ? Math.sqrt(Math.max(0, (1 - dot(u, v) / tamanhos) / 2)) : 0;
      if (seno < menorSenoDaMetade) menorSenoDaMetade = seno;
    }
  }
  const folga = menorSenoDaMetade > 0 ? tolerancia * (1 + 1 / menorSenoDaMetade) : Infinity;
  folgasDeCaixa.set(malha, { tolerancia, folga });
  return folga;
}

/* OS DADOS DE CADA TRIÂNGULO SAEM UMA VEZ POR MALHA. A contenção de um ponto percorre todos os triângulos da outra malha, e a
   conta de cada triângulo (arestas, normal, comprimentos, o determinante do raio) não depende do ponto: refazê-la para cada
   um dos milhares de pontos amostrados era a maior parte do tempo da varredura do acervo (2026-10-28). As funções abaixo
   fazem as MESMAS operações de ponto flutuante, na mesma ordem, de `pontoNoTriangulo` e `raioAtravessaTriangulo`, só que
   sobre os valores já calculados e sem alocar vetor por ponto; o teste de equivalência compara o resultado delas com o das
   originais, bit a bit, sobre malhas sorteadas. */
const CAMPOS = 36;
const dadosDasMalhas = new WeakMap();

function dadosDaMalha(malha) {
  const triangulos = malha.triangulos;
  const guardado = dadosDasMalhas.get(triangulos);
  if (guardado && guardado.quantidade === triangulos.length) return guardado.dados;
  const dados = new Float64Array(triangulos.length * CAMPOS);
  triangulos.forEach(([a, b, c], indice) => {
    const aresta1 = sub(b, a); const aresta2 = sub(c, a);
    const normal = cross(aresta1, aresta2);
    const tamanhoDaNormal = Math.sqrt(comprimento2(normal));
    const h = cross(DIRECAO_RAIO, aresta2);
    const determinante = dot(aresta1, h);
    const paralelo = Math.abs(determinante) <= 1e-12 * Math.sqrt(comprimento2(aresta1) * comprimento2(h));
    const bc = sub(c, b); const ca = sub(a, c);
    const base = indice * CAMPOS;
    dados.set(a, base); dados.set(b, base + 3); dados.set(c, base + 6);
    dados.set(aresta1, base + 9); dados.set(aresta2, base + 12);
    dados.set(normal, base + 15);
    dados[base + 18] = tamanhoDaNormal;
    dados.set(h, base + 19);
    dados[base + 22] = paralelo ? 1 : 0;
    dados[base + 23] = 1 / determinante;
    dados.set(bc, base + 24); dados.set(ca, base + 27);
    dados[base + 30] = Math.sqrt(comprimento2(aresta1));
    dados[base + 31] = Math.sqrt(comprimento2(bc));
    dados[base + 32] = Math.sqrt(comprimento2(ca));
  });
  dadosDasMalhas.set(triangulos, { quantidade: triangulos.length, dados });
  return dados;
}

/* a distância do ponto à reta de uma aresta, com o sinal da normal, igual ao `doLado` de `pontoNoTriangulo` */
function ladoDoPonto(d, base, deslocamentoAresta, tamanhoDaAresta, px, py, pz, ox, oy, oz) {
  if (!(tamanhoDaAresta > 0)) return 0;
  const e0 = d[base + deslocamentoAresta]; const e1 = d[base + deslocamentoAresta + 1]; const e2 = d[base + deslocamentoAresta + 2];
  const s0 = px - ox; const s1 = py - oy; const s2 = pz - oz;
  const c0 = e1 * s2 - e2 * s1; const c1 = e2 * s0 - e0 * s2; const c2 = e0 * s1 - e1 * s0;
  return (c0 * d[base + 15] + c1 * d[base + 16] + c2 * d[base + 17]) / (d[base + 18] * tamanhoDaAresta);
}

export function pontoDentroMalha(ponto, malha, tolerancia) {
  if (malha.fechada && malha.caixa) {
    const folga = folgaDaCaixa(malha, tolerancia);
    if ([0, 1, 2].some((eixo) => ponto[eixo] < malha.caixa.min[eixo] - folga || ponto[eixo] > malha.caixa.max[eixo] + folga)) return false;
  }
  const d = dadosDaMalha(malha);
  const quantidade = malha.triangulos.length;
  const px = ponto[0]; const py = ponto[1]; const pz = ponto[2];
  const dir0 = DIRECAO_RAIO[0]; const dir1 = DIRECAO_RAIO[1]; const dir2 = DIRECAO_RAIO[2];
  let contagem = 0;
  for (let indice = 0; indice < quantidade; indice += 1) {
    const base = indice * CAMPOS;
    const ax = d[base]; const ay = d[base + 1]; const az = d[base + 2];
    const s0 = px - ax; const s1 = py - ay; const s2 = pz - az;
    const distancia = Math.abs(d[base + 15] * s0 + d[base + 16] * s1 + d[base + 17] * s2) / d[base + 18];
    if (!(distancia > tolerancia)
      && ladoDoPonto(d, base, 9, d[base + 30], px, py, pz, ax, ay, az) >= -tolerancia
      && ladoDoPonto(d, base, 24, d[base + 31], px, py, pz, d[base + 3], d[base + 4], d[base + 5]) >= -tolerancia
      && ladoDoPonto(d, base, 27, d[base + 32], px, py, pz, d[base + 6], d[base + 7], d[base + 8]) >= -tolerancia) return null;
    if (d[base + 22] === 1) continue;
    const inverso = d[base + 23];
    const u = inverso * (s0 * d[base + 19] + s1 * d[base + 20] + s2 * d[base + 21]);
    if (u < -tolerancia || u > 1 + tolerancia) continue;
    const e0 = d[base + 9]; const e1 = d[base + 10]; const e2 = d[base + 11];
    const q0 = s1 * e2 - s2 * e1; const q1 = s2 * e0 - s0 * e2; const q2 = s0 * e1 - s1 * e0;
    const v = inverso * (dir0 * q0 + dir1 * q1 + dir2 * q2);
    if (v < -tolerancia || u + v > 1 + tolerancia) continue;
    const t = inverso * (d[base + 12] * q0 + d[base + 13] * q1 + d[base + 14] * q2);
    if (t > tolerancia) contagem += 1;
  }
  return contagem % 2 === 1;
}

/* OS EIXOS PRÓPRIOS DE CADA TRIÂNGULO TAMBÉM SAEM UMA VEZ. `sobreposicaoTriangulo` separa por até dezessete eixos, e os
   quatro de cada triângulo (a normal e as perpendiculares às arestas no plano dele) não dependem do outro triângulo. A
   maioria dos pares que a varredura compara está longe, e um desses oito eixos já os separa; o par que sobrevive a eles
   segue para `sobreposicaoTriangulo`, que refaz todos os eixos, de modo que o veredito é o mesmo de antes (quem separa
   pelos eixos pré-calculados separa também lá, pela mesma conta). */
const eixosDasMalhas = new WeakMap();

function eixosDoTriangulo([a, b, c]) {
  const arestas = [sub(b, a), sub(c, b), sub(a, c)];
  const normal = cross(arestas[0], sub(c, a));
  const candidatos = [];
  const registrar = (u, v) => {
    const eixo = cross(u, v);
    if (comprimento2(eixo) > 1e-18 * comprimento2(u) * comprimento2(v)) candidatos.push(eixo);
  };
  registrar(arestas[0], sub(c, a));
  if (comprimento2(normal) > 0) for (const aresta of arestas) registrar(normal, aresta);
  return candidatos.map((eixo) => {
    const norma = Math.sqrt(comprimento2(eixo));
    const valores = [a, b, c].map((ponto) => dot(eixo, ponto) / norma);
    return { e0: eixo[0], e1: eixo[1], e2: eixo[2], norma, min: Math.min(...valores), max: Math.max(...valores) };
  });
}

function eixosDaMalha(malha) {
  const triangulos = malha.triangulos;
  const guardado = eixosDasMalhas.get(triangulos);
  if (guardado && guardado.quantidade === triangulos.length) return guardado.eixos;
  const eixos = triangulos.map(eixosDoTriangulo);
  eixosDasMalhas.set(triangulos, { quantidade: triangulos.length, eixos });
  return eixos;
}

function separadoPor(eixos, [p, q, r], tolerancia) {
  for (const eixo of eixos) {
    const v0 = (eixo.e0 * p[0] + eixo.e1 * p[1] + eixo.e2 * p[2]) / eixo.norma;
    const v1 = (eixo.e0 * q[0] + eixo.e1 * q[1] + eixo.e2 * q[2]) / eixo.norma;
    const v2 = (eixo.e0 * r[0] + eixo.e1 * r[1] + eixo.e2 * r[2]) / eixo.norma;
    if (eixo.max < Math.min(v0, v1, v2) - tolerancia || Math.max(v0, v1, v2) < eixo.min - tolerancia) return true;
  }
  return false;
}

export function malhasSeInterseccionam(a, b, tolerancia) {
  const eixosA = eixosDaMalha(a); const eixosB = eixosDaMalha(b);
  for (let i = 0; i < a.triangulos.length; i += 1) {
    const trianguloA = a.triangulos[i];
    for (let j = 0; j < b.triangulos.length; j += 1) {
      const trianguloB = b.triangulos[j];
      if (separadoPor(eixosA[i], trianguloB, tolerancia) || separadoPor(eixosB[j], trianguloA, tolerancia)) continue;
      if (sobreposicaoTriangulo(trianguloA, trianguloB, tolerancia)) return true;
    }
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

/* O maior afundamento, na superfície de `malha`, dos pontos que a contenção já
   acusou dentro dela. Quem já tem os estados da contenção não a refaz. */
function maiorAfundamento(pontos, estados, malha) {
  let maior = null;
  pontos.forEach((ponto, indice) => {
    if (estados[indice] !== true) return;
    let menor = Infinity;
    for (const triangulo of malha.triangulos) menor = Math.min(menor, distancia2PontoTriangulo(ponto, triangulo));
    const profundidade = Math.sqrt(menor);
    if (maior === null || profundidade > maior) maior = profundidade;
  });
  return maior;
}

const maiorDosDois = (x, y) => (x === null ? y : y === null ? x : Math.max(x, y));

/* Com `{ profundidade: true }` o par que se invade traz `profundidade`, no
   mesmo sentido de `profundidadeDeInterpenetracao` (um piso, porque só amostra
   pontos; `null` quando nenhum ponto cai dentro e as malhas só se cruzam por
   arestas), reaproveitando a contenção que o estado já mediu. */
export function auditarParDeSolidos(a, b, tolerancia, { profundidade = false } = {}) {
  if (a.inconclusivo || b.inconclusivo) return { estado: 'inconclusivo', diagnosticos: [a.inconclusivo, b.inconclusivo].filter(Boolean) };
  if (caixasSeparadas(a.caixa, b.caixa, tolerancia)) return { estado: 'separadas', metodo: 'caixa-mundo' };
  const pontosA = pontosDeAmostragem(a);
  const pontosB = pontosDeAmostragem(b);
  const estadosA = pontosA.map((ponto) => pontoDentroMalha(ponto, b, tolerancia));
  const estadosB = pontosB.map((ponto) => pontoDentroMalha(ponto, a, tolerancia));
  if (estadosA.includes(true) || estadosB.includes(true)) {
    return a.fechada && b.fechada
      ? {
        estado: 'interpenetram',
        metodo: 'contencao-e-malha',
        ...(profundidade ? { profundidade: maiorDosDois(maiorAfundamento(pontosA, estadosA, b), maiorAfundamento(pontosB, estadosB, a)) } : {}),
      }
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
    ? { estado: 'interpenetram', metodo: 'intersecao-de-superficies', ...(profundidade ? { profundidade: null } : {}) }
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
    const pontos = pontosDeAmostragem(de);
    return maiorAfundamento(pontos, pontos.map((ponto) => pontoDentroMalha(ponto, em, tolerancia)), em);
  };
  const deAemB = maiorDentro(a, b); const deBemA = maiorDentro(b, a);
  if (deAemB === null) return deBemA;
  if (deBemA === null) return deAemB;
  return Math.max(deAemB, deBemA);
}
