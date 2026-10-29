/* chapa.js — a conta da chapa dobrada: contorno da seção com as dobras no raio pedido e as medidas de chapa.

   Função pura sobre números, sem Three.js, malha nem domínio: a mesma entrada dá sempre os mesmos números. A implementação
   da extensão só extrusa o contorno que esta conta devolve; as medidas (comprimento planificado entre elas) saem pela
   mesma conta, por `medidasDaChapa`, porque a extensão não devolve nada além de vértices e faces.

   Convenções
   - A seção vive no plano x-y e a largura corre em z, de -largura/2 a +largura/2. A linha média da primeira aba começa em
     (0, 0) e segue +x; ângulo positivo gira a chapa para +y (anti-horário visto de +z), negativo para -y.
   - A chapa é descrita pela linha média (o meio da espessura). Raio interno é o da face de dentro da dobra; a linha média
     dobra em raio + espessura/2 e a face de fora em raio + espessura. Raio 0 dá canto vivo por dentro e raio externo igual
     à espessura.
   - `abas` descreve a chapa por aba: `comprimento` é o trecho RETO da aba (sem as dobras das pontas) e `angulo` é quanto a
     chapa gira depois dela, de 0 a 360 graus sem os extremos (uma dobra sozinha faz um rolo de 270, por exemplo); a última aba
     não leva `angulo`. O trecho reto pode ser 0 em toda aba menos a primeira: 0 liga duas dobras sem trecho reto entre elas, e
     0 na última aba fecha a chapa na ponta do arco, sem trecho reto sobrando. `perfil` descreve a mesma chapa pelos pontos da
     linha média onde cada dobra se cruzaria sem raio (o vértice virtual), e então o trecho reto é o que sobra do segmento
     depois do recuo das dobras das duas pontas; o vértice virtual só existe abaixo de 180 graus, e por isso `perfil` não dá
     dobra de 180 ou mais. As duas formas dão a mesma chapa, vértice por vértice, onde ambas valem.
   - Recuo da dobra: (raio + espessura/2) · tan(|ângulo|/2), a distância do vértice virtual ao começo do arco na linha média;
     abaixo de 180 graus. De 180 em diante não há vértice virtual, e a medida `recuo` da dobra sai `null`.
   - Desenvolvimento da dobra (a folga de dobra, `bend allowance`): |ângulo| · (raio + fatorK · espessura), com o ângulo em
     radianos. Comprimento planificado: soma dos trechos retos mais o desenvolvimento de cada dobra. O fator K é a posição
     da linha neutra na espessura, contada da face de dentro: 0 é a face de dentro e 1 a de fora. Com K = 0,5 a linha neutra
     é a linha média e o planificado é o comprimento da linha média; o padrão é 0,44, o valor corrente para dobra ao ar em
     aço macio quando o fabricante não informa outro. */
import { areaDoContorno, ehSimples } from '../../nucleo/contorno.js';

export const FATOR_K_PADRAO = 0.44;
export const SEGMENTOS_POR_QUARTO_PADRAO = 6;
export const MAXIMO_DE_VERTICES_NO_CONTORNO = 500;

const CAMPOS = ['espessura', 'raioInterno', 'fatorK', 'largura', 'abas', 'perfil', 'segmentosPorQuarto', 'origemId', 'tampas'];
const MAXIMO_DE_ABAS = 32;
const TAMPAS = ['inteiras', 'em-tiras'];
const EPS = 1e-9;
const RAD = Math.PI / 180;

const arredondar = (x) => Number(x.toFixed(9)) + 0;
const mostrar = (v) => (typeof v === 'string' ? JSON.stringify(v) : Array.isArray(v) || (v && typeof v === 'object') ? JSON.stringify(v) : String(v));
const recusar = (campo, valor, aceito) => { throw new Error(`${campo}: veio ${mostrar(valor)}; aceito ${aceito}`); };
const plano = (v) => v && typeof v === 'object' && !Array.isArray(v);

function numero(resolver, campo, valor, aceito) {
  let n;
  try { n = resolver(valor); } catch (erro) { recusar(campo, valor, `${aceito} (não resolve: ${String(erro.message).replace(/^oficina: /, '')})`); }
  if (typeof n !== 'number' || !Number.isFinite(n)) recusar(campo, valor, aceito);
  return n;
}

const rotacionar = ([x, y], graus) => { const c = Math.cos(graus), s = Math.sin(graus); return [x * c - y * s, x * s + y * c]; };
const esquerda = ([x, y]) => [-y, x];

/* Retângulo do trecho reto de cada aba (a linha média com meia espessura de cada lado) e o primeiro par de abas não vizinhas
   cujos retângulos se cruzam ou se encostam, por eixos separadores; o diagnóstico só roda quando o contorno já falhou. `pontas[i]`
   são o começo e o fim do trecho reto da aba i; a aba de comprimento zero não tem retângulo. */
function abasQueSeEncostam(pontas, direcoes, meia) {
  const retangulos = pontas.map(([a, b], i) => {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) <= EPS) return null;
    const n = esquerda(direcoes[i]);
    return [[a[0] + n[0] * meia, a[1] + n[1] * meia], [b[0] + n[0] * meia, b[1] + n[1] * meia], [b[0] - n[0] * meia, b[1] - n[1] * meia], [a[0] - n[0] * meia, a[1] - n[1] * meia]];
  });
  const separados = (r, s) => [...r, ...s].some((_, k) => {
    const lista = k < 4 ? r : s, a = lista[k % 4], b = lista[(k + 1) % 4], eixo = [b[1] - a[1], a[0] - b[0]];
    const projetar = (q) => q[0] * eixo[0] + q[1] * eixo[1], pr = r.map(projetar), ps = s.map(projetar);
    return Math.min(...pr) > Math.max(...ps) + EPS || Math.min(...ps) > Math.max(...pr) + EPS;
  });
  for (let i = 0; i < retangulos.length; i++) for (let j = i + 2; j < retangulos.length; j++) if (retangulos[i] && retangulos[j] && !separados(retangulos[i], retangulos[j])) return [i, j];
  return null;
}

function lerParametros(argumentos, resolver) {
  if (!plano(argumentos)) recusar('argumentos', argumentos, 'um objeto com espessura, raioInterno, largura e abas ou perfil');
  for (const chave of Object.keys(argumentos)) if (!CAMPOS.includes(chave)) recusar(chave, argumentos[chave], `um destes campos: ${CAMPOS.join(', ')}`);
  for (const obrigatorio of ['espessura', 'raioInterno', 'largura']) if (argumentos[obrigatorio] === undefined) recusar(obrigatorio, undefined, 'um número (campo obrigatório)');
  const espessura = numero(resolver, 'espessura', argumentos.espessura, 'um número maior que 0');
  if (!(espessura > 0)) recusar('espessura', argumentos.espessura, 'um número maior que 0');
  const raioInterno = numero(resolver, 'raioInterno', argumentos.raioInterno, 'um número maior ou igual a 0');
  if (raioInterno < 0) recusar('raioInterno', argumentos.raioInterno, 'um número maior ou igual a 0 (raio 0 dá canto vivo por dentro)');
  const fatorK = argumentos.fatorK === undefined ? FATOR_K_PADRAO : numero(resolver, 'fatorK', argumentos.fatorK, `um número de 0 a 1 (padrão ${FATOR_K_PADRAO})`);
  if (fatorK < 0 || fatorK > 1) recusar('fatorK', argumentos.fatorK, `um número de 0 a 1 (padrão ${FATOR_K_PADRAO}); 0 é a face de dentro da dobra e 1 a de fora`);
  if (argumentos.origemId !== undefined && !(Number.isSafeInteger(argumentos.origemId) && argumentos.origemId >= 0)) recusar('origemId', argumentos.origemId, 'um inteiro não negativo (a identidade da chapa; sem ele a chapa não publica origem)');
  const largura = numero(resolver, 'largura', argumentos.largura, 'um número maior que 0');
  if (!(largura > 0)) recusar('largura', argumentos.largura, 'um número maior que 0');
  const segmentosPorQuarto = argumentos.segmentosPorQuarto === undefined ? SEGMENTOS_POR_QUARTO_PADRAO : numero(resolver, 'segmentosPorQuarto', argumentos.segmentosPorQuarto, 'um inteiro de 1 a 64');
  if (!Number.isInteger(segmentosPorQuarto) || segmentosPorQuarto < 1 || segmentosPorQuarto > 64) recusar('segmentosPorQuarto', argumentos.segmentosPorQuarto, 'um inteiro de 1 a 64 (segmentos do arco de cada 90 graus de dobra)');
  if (argumentos.tampas !== undefined && !TAMPAS.includes(argumentos.tampas)) recusar('tampas', argumentos.tampas, `um destes: ${TAMPAS.map((t) => `'${t}'`).join(', ')} (padrão 'inteiras')`);
  return { espessura, raioInterno, fatorK, largura, segmentosPorQuarto, tampas: argumentos.tampas ?? 'inteiras' };
}

/* A linha média, na forma que o contorno lê, venha de `abas` ou de `perfil`: `direcoes[i]` é a direção do trecho reto i,
   `pontas[i]` o começo e o fim dele, `inicios[k]` onde começa o arco da dobra k (o fim do trecho reto que a precede), `giros[k]` o
   giro dela em radianos com sinal, e `fim` a ponta livre da chapa. Nada aqui usa o vértice virtual onde a dobra se cruzaria sem
   raio, de modo que a dobra pode passar de 180 graus, quando esse vértice deixa de existir. */

/* Linha média a partir de `abas`: trechos retos e giros (em radianos, com sinal) entre elas. */
function linhaPorAbas(abas, resolver, raioMedio) {
  if (!Array.isArray(abas) || abas.length < 2 || abas.length > MAXIMO_DE_ABAS) recusar('abas', abas, `uma lista de 2 a ${MAXIMO_DE_ABAS} abas {comprimento, angulo}; a última aba não leva angulo`);
  const retos = [], giros = [];
  abas.forEach((aba, i) => {
    const campo = `abas[${i}]`, ultima = i === abas.length - 1;
    if (!plano(aba)) recusar(campo, aba, ultima ? '{comprimento}' : '{comprimento, angulo}');
    for (const chave of Object.keys(aba)) if (chave !== 'comprimento' && chave !== 'angulo') recusar(`${campo}.${chave}`, aba[chave], 'apenas comprimento e angulo');
    const comprimento = numero(resolver, `${campo}.comprimento`, aba.comprimento, i === 0 ? 'o trecho reto da aba em número maior que 0' : 'o trecho reto da aba em número maior ou igual a 0');
    if (i === 0 ? !(comprimento > EPS) : !(comprimento >= 0)) {
      recusar(`${campo}.comprimento`, aba.comprimento, i === 0 ? 'o trecho reto da aba, maior que 0 (sem contar as dobras das pontas)'
        : 'o trecho reto da aba, maior ou igual a 0 (0 liga a dobra à seguinte, ou fecha a chapa na ponta do arco, sem trecho reto)');
    }
    retos.push(comprimento);
    if (ultima) {
      if (aba.angulo !== undefined) recusar(`${campo}.angulo`, aba.angulo, 'nenhum: a última aba não tem dobra depois dela');
      return;
    }
    if (aba.angulo === undefined) recusar(`${campo}.angulo`, undefined, 'o ângulo da dobra depois desta aba, em graus, entre -360 e 360 sem os extremos e sem 0');
    const graus = numero(resolver, `${campo}.angulo`, aba.angulo, 'graus entre -360 e 360, sem 0');
    if (!(Math.abs(graus) > EPS && Math.abs(graus) < 360 - EPS)) recusar(`${campo}.angulo`, aba.angulo, 'graus com módulo maior que 0 e menor que 360 (0 não é dobra: junte as duas abas num comprimento só; 360 fecha a chapa sobre si mesma)');
    giros.push(graus * RAD);
  });
  const direcoes = [], pontas = [], inicios = [];
  let ponto = [0, 0], direcao = [1, 0];
  retos.forEach((reto, i) => {
    const fim = [ponto[0] + direcao[0] * reto, ponto[1] + direcao[1] * reto];
    direcoes.push(direcao); pontas.push([ponto, fim]);
    if (i === giros.length) { ponto = fim; return; }
    inicios.push(fim);
    const n = esquerda(direcao), sinal = Math.sign(giros[i]);
    const centro = [fim[0] + n[0] * raioMedio * sinal, fim[1] + n[1] * raioMedio * sinal], r = rotacionar([fim[0] - centro[0], fim[1] - centro[1]], giros[i]);
    ponto = [centro[0] + r[0], centro[1] + r[1]];
    direcao = rotacionar(direcao, giros[i]);
  });
  return { giros, retos, direcoes, pontas, inicios, fim: ponto, nome: (i) => `abas[${i}]` };
}

/* Linha média a partir de `perfil`: os giros saem dos pontos e o trecho reto é o que o recuo das pontas deixa. */
function linhaPorPerfil(perfil, resolver, raioMedio) {
  if (!Array.isArray(perfil) || perfil.length < 3 || perfil.length > MAXIMO_DE_ABAS + 1) recusar('perfil', perfil, `uma lista de 3 a ${MAXIMO_DE_ABAS + 1} pontos [u, v] da linha média, com ao menos uma dobra`);
  const pontos = perfil.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) recusar(`perfil[${i}]`, p, 'um ponto [u, v]');
    return [numero(resolver, `perfil[${i}][0]`, p[0], 'um número'), numero(resolver, `perfil[${i}][1]`, p[1], 'um número')];
  });
  const segmentos = pontos.slice(0, -1).map((p, i) => {
    const dx = pontos[i + 1][0] - p[0], dy = pontos[i + 1][1] - p[1], t = Math.hypot(dx, dy);
    if (!(t > EPS)) recusar(`perfil[${i + 1}]`, perfil[i + 1], `um ponto diferente de perfil[${i}] (${mostrar(perfil[i])})`);
    return { u: [dx / t, dy / t], comprimento: t };
  });
  const giros = [];
  for (let i = 1; i < pontos.length - 1; i++) {
    const a = segmentos[i - 1].u, b = segmentos[i].u, g = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    if (Math.abs(g) < 1e-6) recusar(`perfil[${i}]`, perfil[i], 'um ponto onde a linha dobra; este é colinear com os vizinhos, retire-o');
    if (Math.abs(g) > Math.PI - 1e-6) recusar(`perfil[${i}]`, perfil[i], 'um ponto onde a linha dobra menos de 180 graus; este volta sobre o trecho anterior');
    giros.push(g);
  }
  const recuos = giros.map((g) => raioMedio * Math.tan(Math.abs(g) / 2));
  const retos = segmentos.map((d, i) => {
    const tomado = (i > 0 ? recuos[i - 1] : 0) + (i < recuos.length ? recuos[i] : 0), reto = d.comprimento - tomado;
    if (!(reto > EPS)) {
      recusar(`perfil[${i}]..perfil[${i + 1}]`, [perfil[i], perfil[i + 1]],
        `um trecho de mais de ${arredondar(tomado)} (o recuo das dobras das pontas, com raio interno + espessura/2 = ${arredondar(raioMedio)}); este tem ${arredondar(d.comprimento)}, mais curto que a dobra. Afaste os pontos, ou diminua raioInterno ou espessura`);
    }
    return reto;
  });
  const direcoes = segmentos.map((d) => d.u);
  const pontas = segmentos.map((d, i) => [
    i > 0 ? [pontos[i][0] + d.u[0] * recuos[i - 1], pontos[i][1] + d.u[1] * recuos[i - 1]] : pontos[0],
    i < recuos.length ? [pontos[i + 1][0] - d.u[0] * recuos[i], pontos[i + 1][1] - d.u[1] * recuos[i]] : pontos[pontos.length - 1],
  ]);
  return { giros, retos, direcoes, pontas, inicios: giros.map((_, k) => pontas[k][1]), fim: pontos[pontos.length - 1], nome: (i) => `perfil[${i}]..perfil[${i + 1}]` };
}

/* Interpreta e valida os argumentos e devolve tudo o que a malha e as medidas precisam. `resolver` é o `numero` do contexto da
   extensão (PARAM, TOPO e expressão); fora do núcleo, o padrão é aceitar só número. */
export function construirChapa(argumentos, resolver = (v) => v) {
  const { espessura, raioInterno, fatorK, largura, segmentosPorQuarto, tampas } = lerParametros(argumentos, resolver);
  if ((argumentos.abas === undefined) === (argumentos.perfil === undefined)) recusar(argumentos.abas === undefined ? 'abas' : 'perfil', undefined, 'exatamente um entre abas (comprimento reto e ângulo de cada aba) e perfil (pontos da linha média); vieram os dois ou nenhum');
  const h = espessura / 2, raioMedio = raioInterno + h;
  const linha = argumentos.abas !== undefined ? linhaPorAbas(argumentos.abas, resolver, raioMedio) : linhaPorPerfil(argumentos.perfil, resolver, raioMedio);
  const { giros, retos, direcoes, pontas, inicios, fim, nome } = linha;

  // contorno: a face da direita indo, a da esquerda voltando (anti-horário); os arcos são cortados em segmentos de ângulo igual.
  // `trecho` leva, junto de cada estação, o que é o segmento que sai dela: uma aba reta ou um pedaço do arco de uma dobra.
  const esq = [], dir = [], trecho = [];
  const empurrar = (p, d, seguinte) => { const n = esquerda(d); esq.push([p[0] + n[0] * h, p[1] + n[1] * h]); dir.push([p[0] - n[0] * h, p[1] - n[1] * h]); trecho.push(seguinte); };
  empurrar(pontas[0][0], direcoes[0], { aba: 0 });
  const divisoes = [];
  giros.forEach((giro, k) => {
    const entra = direcoes[k], inicio = inicios[k], sinal = Math.sign(giro), n = esquerda(entra);
    const centro = [inicio[0] + n[0] * raioMedio * sinal, inicio[1] + n[1] * raioMedio * sinal], raio = [inicio[0] - centro[0], inicio[1] - centro[1]];
    const partes = Math.max(1, Math.ceil((Math.abs(giro) / RAD) * segmentosPorQuarto / 90 - 1e-9));
    divisoes.push(partes);
    for (let s = 0; s <= partes; s++) {
      const a = giro * s / partes, r = rotacionar(raio, a);
      empurrar([centro[0] + r[0], centro[1] + r[1]], rotacionar(entra, a), s < partes ? { dobra: k } : { aba: k + 1 });
    }
  });
  empurrar(fim, direcoes[direcoes.length - 1], null);

  // as arestas do contorno, na ordem dele: a aresta i sai do vértice i e dá o lado i da peça; cada uma diz de que é
  const m = dir.length, bruto = [], rotulos = [];
  for (let j = 0; j < m; j++) { bruto.push(dir[j]); rotulos.push(j < m - 1 ? { ...trecho[j], lado: 'direita' } : { borda: 'fim' }); }
  for (let j = m - 1; j >= 0; j--) { bruto.push(esq[j]); rotulos.push(j > 0 ? { ...trecho[j - 1], lado: 'esquerda' } : { borda: 'inicio' }); }
  let contorno = bruto.map(([x, y]) => [arredondar(x), arredondar(y)]);
  const mantidos = contorno.map((p, i) => { const q = contorno[(i + 1) % contorno.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]) > EPS; });
  let arestas = rotulos.filter((_, i) => mantidos[i]);
  // o vértice descartado (igual ao seguinte) conta como o seguinte que ficou; `estacoes` liga o lado da direita ao da esquerda
  const nosMantidos = mantidos.reduce((a, k, i) => { a.depois[i] = a.n; if (k) a.n++; return a; }, { n: 0, depois: [] });
  const totalMantido = nosMantidos.n, posicaoNoContorno = (i) => nosMantidos.depois[i] % totalMantido;
  let estacoes = dir.map((_, j) => [posicaoNoContorno(j), posicaoNoContorno(2 * m - 1 - j)]);
  contorno = contorno.filter((_, i) => mantidos[i]);
  if (contorno.length > MAXIMO_DE_VERTICES_NO_CONTORNO) {
    recusar('segmentosPorQuarto', segmentosPorQuarto, `um valor que mantenha o contorno em ${MAXIMO_DE_VERTICES_NO_CONTORNO} vértices ou menos (este dá ${contorno.length}); reduza segmentosPorQuarto ou o número de dobras`);
  }
  if (!ehSimples(contorno)) {
    const par = abasQueSeEncostam(pontas, direcoes, h);
    if (par) recusar(`${nome(par[0])} e ${nome(par[1])}`, 'abas que se cruzam ou se encostam', `abas separadas por folga positiva (a espessura é ${espessura}); mude comprimentos ou ângulos`);
    recusar('abas', 'contorno que se cruza ou se toca', 'abas e dobras que não se cruzem nem se encostem (as dobras vizinhas ou uma aba e uma dobra de outra se atravessam); mude comprimentos, ângulos, raioInterno ou espessura');
  }
  if (areaDoContorno(contorno) < 0) { contorno.reverse(); estacoes = estacoes.map(([a, b]) => [contorno.length - 1 - a, contorno.length - 1 - b]); arestas = arestas.map((_, j) => arestas[(arestas.length * 2 - 2 - j) % arestas.length]); }

  const dobras = giros.map((giro, k) => ({
    angulo: arredondar(giro / RAD), raioInterno, raioExterno: arredondar(raioInterno + espessura),
    recuo: Math.abs(giro) < Math.PI - EPS ? arredondar(raioMedio * Math.tan(Math.abs(giro) / 2)) : null, desenvolvimento: arredondar(Math.abs(giro) * (raioInterno + fatorK * espessura)),
  }));
  const comprimentoReto = retos.reduce((a, b) => a + b, 0), comprimentoDasDobras = dobras.reduce((a, d) => a + d.desenvolvimento, 0);
  const comprimentoPlanificado = arredondar(comprimentoReto + comprimentoDasDobras);
  const medidas = Object.freeze({
    espessura, raioInterno, raioExterno: arredondar(raioInterno + espessura), fatorK, largura,
    abas: Object.freeze(retos.map((reto) => Object.freeze({ comprimentoReto: arredondar(reto) }))),
    dobras: Object.freeze(dobras.map((d) => Object.freeze(d))),
    comprimentoReto: arredondar(comprimentoReto), desenvolvimentoDasDobras: arredondar(comprimentoDasDobras),
    comprimentoPlanificado, areaPlanificada: arredondar(comprimentoPlanificado * largura),
  });
  // quais lados das dobras são de dentro: o lado para onde a dobra gira (esquerda quando o ângulo é positivo)
  const arestasDaChapa = arestas.map((a) => {
    if (a.dobra === undefined) return Object.freeze({ ...a });
    return Object.freeze({ ...a, dentro: (giros[a.dobra] > 0) === (a.lado === 'esquerda') });
  });
  return Object.freeze({ contorno, largura, espessura, medidas, divisoesPorDobra: Object.freeze(divisoes), arestas: Object.freeze(arestasDaChapa), estacoes: Object.freeze(estacoes), trechos: Object.freeze(trecho.slice(0, -1).map((t) => Object.freeze({ ...t }))), tampas, abas: retos.length, dobras: giros.length });
}

/* As medidas de chapa dos argumentos de `chapaDobrada`, sem montar malha: espessura, raios, fator K, trechos retos, ângulo,
   recuo e desenvolvimento de cada dobra, comprimento planificado (o da tira de chapa antes de dobrar) e a área dela. */
export function medidasDaChapa(argumentos, resolver) {
  return construirChapa(argumentos, resolver).medidas;
}
