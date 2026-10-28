/* perfil2d.js — perfil 2D com furos e deslocamento de contorno, sobre a CrossSection da Manifold (Clipper2).

   Um perfil é um contorno externo menos zero ou mais furos. `montarPerfil` recebe o que a receita escreve (listas de
   pontos [u, v] ou formas prontas) e devolve contornos canônicos, sem a IA calcular ponto nenhum:
     - `externo`: lista de pontos [u, v], ou {retangulo: {largura, profundidade, centro?, cantos?}} (os `cantos` são os de
       `retanguloArredondado`), ou {circulo: {raio, centro?}} (4 × `segmentosArco` pontos);
     - `furos`: lista de formas, cada uma nas mesmas três escritas; o centro de retângulo e círculo é [u, v];
     - `deslocar`: {para: 'dentro' | 'fora', distancia > 0, canto: 'redondo' | 'reto' | 'esquadria', limite?}. Para dentro,
       o externo recua e cada furo cresce; para fora, o contrário. `redondo` põe arcos nos cantos que abrem; `reto` corta
       o canto com uma aresta tangente ao círculo de raio `distancia` centrado no vértice; `esquadria` prolonga as arestas até se encontrarem, e `limite` (padrão 4, em múltiplos da
       distância) é até onde a ponta pode ir antes de ser cortada reta;
     - `segmentosArco`: segmentos por quarto de volta, no círculo, nos cantos redondos e nos arcos do contorno por trechos
       (inteiro >= 1, padrão 4);
     - `segmentosSpline`: segmentos por vão de spline do contorno por trechos (inteiro >= 1, padrão 8).

   A saída é {componentes: [{externo, furos}], area}. Um recuo pode partir o perfil em pedaços, e cada pedaço é um
   componente. O externo sai anti-horário e os furos horários, em [u, v].

   DETERMINISMO. A Manifold e o Clipper2 são determinísticos, mas a ordem e o ponto de partida de cada contorno não são
   contrato deles. Aqui cada contorno começa pelo menor ponto (u, depois v), os furos de um componente saem ordenados pelo
   ponto inicial e os componentes também. Os números saem na grade de 1e-8, que é a precisão do Clipper2 (as contas dele erram alguns 1e-9 e a grade tira o ruído). O número de
   segmentos do arco é argumento da receita e entra em `circularSegments` como 4 × `segmentosArco`; nada vem de
   padrão da biblioteca. Mesma entrada, mesma lista de números.

   FURO. O furo precisa ficar inteiro dentro do externo, a mais de `folga` da borda e dos outros furos, e um furo não pode
   conter outro. `folga` é 1e-6 da diagonal do externo (no mínimo 1e-7). Furo que encosta, cruza ou sai é recusado com o
   índice, a distância medida e o conserto; nada é consertado em silêncio.

   `deslocarContorno` (contorno.js) NÃO delega a esta função: ele preserva o número de vértices e a correspondência vértice
   a vértice, de que o `loft` com casca depende, e fica puro, sem WebAssembly. Esta função muda a topologia (arcos, furos,
   pedaços), por isso serve a perfis, não a seções do loft.

   O núcleo continua sem Three.js. A Manifold vem de manifold.js, a mesma instância das booleanas. */
import { manifoldCarregada, erroDaCargaDaManifold } from './manifold.js';
import { areaDoContorno, diagnosticarContorno, ehSimples, retanguloArredondado } from './contorno.js';
import { ErroDeCurva, contornoPorTrechos } from './curva2d.js';

export const CANTOS_DO_DESLOCAMENTO = Object.freeze(['redondo', 'reto', 'esquadria']);
export const SENTIDOS_DO_DESLOCAMENTO = Object.freeze(['dentro', 'fora']);
export const SEGMENTOS_ARCO_PADRAO = 4;
export const SEGMENTOS_SPLINE_PADRAO = 8;
export const LIMITE_DA_ESQUADRIA_PADRAO = 4;
const JUNTAS = { redondo: 'Round', reto: 'Square', esquadria: 'Miter' };
const GRADE = 1e8;

export class ErroDePerfil extends Error {
  constructor(campo, mensagem) {
    super(`${campo}: ${mensagem}`);
    this.name = 'ErroDePerfil';
    this.campo = campo;
  }
}

const ehNumero = (x) => typeof x === 'number' && Number.isFinite(x);
const arredondar = (x) => Math.round(x * GRADE) / GRADE + 0;
const texto = (v) => { try { const t = JSON.stringify(v); return t === undefined ? String(v) : (t.length > 80 ? `${t.slice(0, 77)}...` : t); } catch { return String(v); } };
const comparar = (a, b) => (a[0] - b[0]) || (a[1] - b[1]);

function numeroDe(num, valor, campo, regra) {
  const x = num(valor);   // sem try: valor ou PARAM inválido derruba a peça, como em todo campo dimensional
  if (!ehNumero(x)) throw new ErroDePerfil(campo, `precisa ser um número finito (veio ${texto(valor)})`);
  if (regra === 'positivo' && !(x > 0)) throw new ErroDePerfil(campo, `precisa ser maior que zero (veio ${x})`);
  return x;
}

function inteiroDe(valor, campo, minimo, padrao) {
  if (valor == null) return padrao;
  if (!Number.isInteger(valor) || valor < minimo) throw new ErroDePerfil(campo, `precisa ser um inteiro >= ${minimo} (veio ${texto(valor)})`);
  return valor;
}

function centroDe(forma, campo, num) {
  if (forma.centro == null) return [0, 0];
  if (!Array.isArray(forma.centro) || forma.centro.length !== 2) throw new ErroDePerfil(`${campo}.centro`, `precisa ser [u, v] (veio ${texto(forma.centro)})`);
  return [numeroDe(num, forma.centro[0], `${campo}.centro[0]`), numeroDe(num, forma.centro[1], `${campo}.centro[1]`)];
}

function resolverCantos(cantos, campo, num) {
  if (Array.isArray(cantos)) return cantos.map((c, k) => (Array.isArray(c) ? c.map((r, j) => numeroDe(num, r, `${campo}.cantos[${k}][${j}]`)) : numeroDe(num, c, `${campo}.cantos[${k}]`)));
  return numeroDe(num, cantos, `${campo}.cantos`);
}

/* A razão da recusa de `ehSimples`, com o ponto ou as arestas (os índices contam da lista de pontos que chegou aqui, a partir de 0). */
const porQueNaoESimples = (pontos) => diagnosticarContorno(pontos)?.mensagem ?? 'área nula, ponto repetido ou arestas que se cruzam';

/* Uma forma (lista de pontos, retângulo ou círculo) vira lista de pontos [u, v] com números. */
export function formaParaContorno(forma, campo, { num = (x) => x, segmentosArco = SEGMENTOS_ARCO_PADRAO, segmentosSpline } = {}) {
  if (Array.isArray(forma)) {
    if (forma.length < 3) throw new ErroDePerfil(campo, `a lista precisa de 3 pontos [u, v] ou mais (veio ${forma.length})`);
    return forma.map((p, k) => {
      if (!Array.isArray(p) || p.length !== 2) throw new ErroDePerfil(`${campo}[${k}]`, `o ponto precisa ser [u, v] (veio ${texto(p)})`);
      return [numeroDe(num, p[0], `${campo}[${k}][0]`), numeroDe(num, p[1], `${campo}[${k}][1]`)];
    });
  }
  const aceito = `lista de pontos [u, v], {retangulo: {largura, profundidade, centro?, cantos?}}, {circulo: {raio, centro?}} ou {contorno: {inicio, trechos}}`;
  if (!forma || typeof forma !== 'object') throw new ErroDePerfil(campo, `não é uma forma aceita (veio ${texto(forma)}); aceito: ${aceito}`);
  const chaves = Object.keys(forma);
  if (chaves.length !== 1 || !['retangulo', 'circulo', 'contorno'].includes(chaves[0]) || !forma[chaves[0]] || typeof forma[chaves[0]] !== 'object') {
    throw new ErroDePerfil(campo, `forma desconhecida (veio ${texto(forma)}); aceito: ${aceito}`);
  }
  const tipo = chaves[0];
  const corpo = forma[tipo];
  if (tipo === 'contorno') {
    try {
      return contornoPorTrechos(corpo, { campo: `${campo}.contorno`, num, segmentosArco, segmentosSpline });
    } catch (e) {
      if (e instanceof ErroDeCurva) throw new ErroDePerfil(e.campo, e.detalhe);
      throw e;
    }
  }
  const permitidas = tipo === 'retangulo' ? ['largura', 'profundidade', 'centro', 'cantos'] : ['raio', 'centro'];
  for (const k of Object.keys(corpo)) if (!permitidas.includes(k)) throw new ErroDePerfil(`${campo}.${tipo}.${k}`, `campo desconhecido; aceito em ${tipo}: ${permitidas.join(', ')}`);
  const [cu, cv] = centroDe(corpo, `${campo}.${tipo}`, num);
  if (tipo === 'circulo') {
    const raio = numeroDe(num, corpo.raio, `${campo}.circulo.raio`, 'positivo');
    const n = 4 * segmentosArco;
    return Array.from({ length: n }, (_, k) => { const a = (2 * Math.PI * k) / n; return [cu + raio * Math.cos(a), cv + raio * Math.sin(a)]; });
  }
  const largura = numeroDe(num, corpo.largura, `${campo}.retangulo.largura`, 'positivo');
  const profundidade = numeroDe(num, corpo.profundidade, `${campo}.retangulo.profundidade`, 'positivo');
  let pontos;
  try {
    pontos = retanguloArredondado({ largura, profundidade, cantos: corpo.cantos == null ? 0 : resolverCantos(corpo.cantos, `${campo}.retangulo`, num), segmentosPorCanto: segmentosArco });
  } catch (e) { throw new ErroDePerfil(`${campo}.retangulo`, e.message.replace(/^retanguloArredondado: /, '')); }
  return pontos.map(([u, v]) => [u + cu, v + cv]);
}

/* ---- geometria de conferência dos furos ---- */
function distPontoSegmento(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const q = dx * dx + dy * dy;
  const t = q === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / q));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
function distSegmentos(a, b, c, d) {
  if (orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0) return 0;
  return Math.min(distPontoSegmento(a, c, d), distPontoSegmento(b, c, d), distPontoSegmento(c, a, b), distPontoSegmento(d, a, b));
}
function distanciaEntreContornos(P, Q) {
  let menor = Infinity;
  for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++) menor = Math.min(menor, distSegmentos(P[i], P[(i + 1) % P.length], Q[j], Q[(j + 1) % Q.length]));
  return menor;
}
function pontoDentro(poligono, p) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i], b = poligono[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro;
  }
  return dentro;
}

function conferirFuros(externo, furos, nomes) {
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [u, v] of externo) { minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
  const folga = Math.max(1e-6 * Math.hypot(maxU - minU, maxV - minV), 1e-7);
  const fmt = (x) => String(Number(x.toPrecision(3)));
  furos.forEach((f, k) => {
    const campo = `${nomes.furos}[${k}]`;
    const d = distanciaEntreContornos(externo, f);
    if (d <= folga) throw new ErroDePerfil(campo, `o furo encosta ou cruza a borda do contorno externo (${nomes.externo}): distância ${fmt(d)}, mínimo ${fmt(folga)}; afaste ou reduza o furo, ou, se ele deve abrir na borda, escreva o recorte no próprio contorno externo`);
    if (!pontoDentro(externo, f[0])) throw new ErroDePerfil(campo, `o furo está fora do contorno externo (${nomes.externo}); o furo precisa ficar inteiro dentro dele`);
  });
  for (let a = 0; a < furos.length; a++) for (let b = a + 1; b < furos.length; b++) {
    const d = distanciaEntreContornos(furos[a], furos[b]);
    if (d <= folga) throw new ErroDePerfil(`${nomes.furos}[${b}]`, `o furo se sobrepõe ou encosta no furo ${a} (distância ${fmt(d)}, mínimo ${fmt(folga)}); separe os furos ou junte-os num só contorno`);
    if (pontoDentro(furos[a], furos[b][0]) || pontoDentro(furos[b], furos[a][0])) throw new ErroDePerfil(`${nomes.furos}[${b}]`, `um dos furos ${a} e ${b} está dentro do outro; furo dentro de furo (ilha) não é aceito`);
  }
}

function lerDeslocar(deslocar, nomes, num) {
  if (deslocar == null) return null;
  const campo = nomes.deslocar;
  if (typeof deslocar !== 'object' || Array.isArray(deslocar)) throw new ErroDePerfil(campo, `precisa ser {para, distancia, canto?, limite?} (veio ${texto(deslocar)})`);
  for (const k of Object.keys(deslocar)) if (!['para', 'distancia', 'canto', 'limite'].includes(k)) throw new ErroDePerfil(`${campo}.${k}`, 'campo desconhecido; aceito: para, distancia, canto, limite');
  if (!SENTIDOS_DO_DESLOCAMENTO.includes(deslocar.para)) throw new ErroDePerfil(`${campo}.para`, `precisa ser ${SENTIDOS_DO_DESLOCAMENTO.map((s) => `'${s}'`).join(' ou ')} (veio ${texto(deslocar.para)}); 'dentro' recua o externo e aumenta os furos, 'fora' faz o contrário`);
  const distancia = numeroDe(num, deslocar.distancia, `${campo}.distancia`, 'positivo');
  const canto = deslocar.canto ?? 'redondo';
  if (!CANTOS_DO_DESLOCAMENTO.includes(canto)) throw new ErroDePerfil(`${campo}.canto`, `precisa ser ${CANTOS_DO_DESLOCAMENTO.map((s) => `'${s}'`).join(', ')} (veio ${texto(deslocar.canto)})`);
  const limite = deslocar.limite == null ? LIMITE_DA_ESQUADRIA_PADRAO : numeroDe(num, deslocar.limite, `${campo}.limite`);
  if (!(limite >= 2)) throw new ErroDePerfil(`${campo}.limite`, `precisa ser um número >= 2 (veio ${texto(deslocar.limite)}); é a distância máxima da ponta da esquadria, em múltiplos de distancia`);
  return { para: deslocar.para, distancia, canto, limite };
}

/* menor ponto primeiro, sem mudar o sentido */
function iniciarNoMenor(pontos) {
  let m = 0;
  for (let k = 1; k < pontos.length; k++) if (comparar(pontos[k], pontos[m]) < 0) m = k;
  return [...pontos.slice(m), ...pontos.slice(0, m)];
}

/* O Clipper2 deixa às vezes dois vértices consecutivos a 1e-8 um do outro (a junção de um arco com a aresta). Sobra o
   primeiro; abaixo de 5e-8 as duas pontas são o mesmo ponto para a grade e para a tampa. */
function semRepetidos(pontos) {
  const saida = [];
  for (const p of pontos) {
    const q = saida[saida.length - 1];
    if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 5e-8) continue;
    saida.push(p);
  }
  while (saida.length > 1 && Math.hypot(saida[0][0] - saida[saida.length - 1][0], saida[0][1] - saida[saida.length - 1][1]) < 5e-8) saida.pop();
  return saida;
}

function componentesDe(wasm, secao) {
  const partes = secao.decompose();
  const componentes = [];
  for (const parte of partes) {
    const externos = [], furos = [];
    for (const poligono of parte.toPolygons()) {
      const pontos = semRepetidos(poligono.map(([u, v]) => [arredondar(u), arredondar(v)]));
      const area = areaDoContorno(pontos);
      if (area > 0) externos.push(iniciarNoMenor(pontos));
      else if (area < 0) furos.push(iniciarNoMenor(pontos));
    }
    parte.delete();
    if (externos.length !== 1) throw new ErroDePerfil('perfil', `a Manifold devolveu um componente com ${externos.length} contornos externos`);
    furos.sort((a, b) => comparar(a[0], b[0]));
    componentes.push({ externo: externos[0], furos });
  }
  componentes.sort((a, b) => comparar(a.externo[0], b.externo[0]));
  return componentes;
}

/* maior distância de recuo que ainda deixa área, para a mensagem de recusa */
function recuoMaximo(CS, contornos, junta, limite, segmentos, teto) {
  let baixo = 0, alto = teto;
  for (let k = 0; k < 40; k++) {
    const meio = (baixo + alto) / 2;
    const base = new CS(contornos, 'EvenOdd');
    const r = base.offset(-meio, junta, limite, segmentos);
    const vazio = r.isEmpty();
    base.delete(); r.delete();
    if (vazio) alto = meio; else baixo = meio;
  }
  return baixo;
}

/* O perfil: contorno externo menos furos, deslocado se pedido. `opcoes.num` resolve cada número da receita (PARAM e
   expressões); `opcoes.nomes` troca os nomes dos campos nas mensagens (o `lathe` chama o externo de `perfil`); `semiPlano`
   (revolução) exige u >= 0 e corta o resultado em u >= 0, porque um deslocamento para fora pode atravessar o eixo. */
export function montarPerfil(entrada, { num = (x) => x, nomes = {}, semiPlano = false } = {}) {
  const n = { externo: 'externo', furos: 'furos', deslocar: 'deslocar', segmentosArco: 'segmentosArco', ...nomes };
  if (!entrada || typeof entrada !== 'object') throw new ErroDePerfil('perfil', `precisa ser {externo, furos?, deslocar?, segmentosArco?} (veio ${texto(entrada)})`);
  const segmentosArco = inteiroDe(entrada.segmentosArco, n.segmentosArco, 1, SEGMENTOS_ARCO_PADRAO);
  const segmentosSpline = inteiroDe(entrada.segmentosSpline, 'segmentosSpline', 1, SEGMENTOS_SPLINE_PADRAO);
  if (entrada.externo == null) throw new ErroDePerfil(n.externo, 'é obrigatório: lista de pontos [u, v], {retangulo} ou {circulo}');
  const externoCru = formaParaContorno(entrada.externo, n.externo, { num, segmentosArco, segmentosSpline });
  if (!ehSimples(externoCru)) throw new ErroDePerfil(n.externo, `o contorno não é um polígono simples: ${porQueNaoESimples(externoCru)}`);
  if (entrada.furos != null && !Array.isArray(entrada.furos)) throw new ErroDePerfil(n.furos, `precisa ser uma lista de formas (veio ${texto(entrada.furos)})`);
  const furosCrus = (entrada.furos ?? []).map((f, k) => {
    const pontos = formaParaContorno(f, `${n.furos}[${k}]`, { num, segmentosArco, segmentosSpline });
    if (!ehSimples(pontos)) throw new ErroDePerfil(`${n.furos}[${k}]`, `o contorno do furo não é um polígono simples: ${porQueNaoESimples(pontos)}`);
    return pontos;
  });
  const deslocar = lerDeslocar(entrada.deslocar, n, num);
  if (semiPlano) {
    const todos = [['externo', externoCru, n.externo], ...furosCrus.map((f, k) => ['furo', f, `${n.furos}[${k}]`])];
    for (const [, pontos, campo] of todos) {
      const p = pontos.findIndex((q) => q[0] < 0);
      if (p >= 0) throw new ErroDePerfil(campo, `o ponto ${p} tem raio negativo (${pontos[p][0]}); na revolução o primeiro número de cada ponto é o raio e precisa ser >= 0`);
    }
  }
  conferirFuros(externoCru, furosCrus, n);

  const wasm = manifoldCarregada();
  if (!wasm) throw new ErroDePerfil('perfil', `precisa da biblioteca Manifold, que não carregou: ${erroDaCargaDaManifold()?.message ?? 'motivo desconhecido'}`);
  const { CrossSection: CS } = wasm;
  const limpar = [];
  const guardar = (x) => { limpar.push(x); return x; };
  try {
    const contornos = [externoCru, ...furosCrus];
    let secao = guardar(new CS(contornos, 'EvenOdd'));
    if (deslocar) {
      const delta = deslocar.para === 'fora' ? deslocar.distancia : -deslocar.distancia;
      secao = guardar(secao.offset(delta, JUNTAS[deslocar.canto], deslocar.limite, 4 * segmentosArco));
      if (secao.isEmpty()) {
        let dica = '';
        if (deslocar.para === 'dentro') {
          const diag = Math.hypot(...[0, 1].map((e) => Math.max(...externoCru.map((p) => p[e])) - Math.min(...externoCru.map((p) => p[e]))));
          dica = `; o recuo máximo é aproximadamente ${recuoMaximo(CS, contornos, JUNTAS[deslocar.canto], deslocar.limite, 4 * segmentosArco, diag).toPrecision(3)}`;
        }
        throw new ErroDePerfil(n.deslocar, `o deslocamento ${deslocar.para} de ${deslocar.distancia} apaga o perfil inteiro${dica}`);
      }
    }
    if (semiPlano) {
      const B = 4 * (1 + Math.max(...contornos.flat(2).map(Math.abs)) + (deslocar ? deslocar.distancia : 0));
      const metade = guardar(new CS([[[0, -B], [B, -B], [B, B], [0, B]]], 'EvenOdd'));
      secao = guardar(secao.intersect(metade));
      if (secao.isEmpty()) throw new ErroDePerfil(n.deslocar ?? n.externo, 'depois de cortar no eixo (raio >= 0) não sobra perfil');
    }
    const componentes = componentesDe(wasm, secao);
    if (!componentes.length) throw new ErroDePerfil(n.externo, 'o perfil ficou sem área');
    return { componentes, area: arredondar(secao.area()), segmentosArco };
  } finally {
    for (const x of limpar) x.delete();
  }
}

/* Triangulação da região do perfil (externo menos furos), para as tampas de uma extrusão. Os pontos saem enfileirados na
   ordem canônica (componente por componente, o externo e depois os furos) e cada triângulo é uma tripla de índices dessa
   fila, anti-horária em [u, v]. A triangulação é a da Manifold (extrude de uma altura), que trata pontos colineares entre
   furos alinhados sem criar triângulo de área nula; o earcut criava, e a tampa saía com aresta solta. Os triângulos saem
   ordenados (cada um começando pelo menor índice) para a ordem não depender da lista que a biblioteca devolve. */
export function triangularPerfil(perfil) {
  const wasm = manifoldCarregada();
  if (!wasm) throw new ErroDePerfil('perfil', `precisa da biblioteca Manifold, que não carregou: ${erroDaCargaDaManifold()?.message ?? 'motivo desconhecido'}`);
  const pontos = [], componenteDe = [], aneis = [];
  perfil.componentes.forEach((c, k) => {
    for (const anel of [c.externo, ...c.furos]) { aneis.push(anel); for (const p of anel) { pontos.push(p); componenteDe.push(k); } }
  });
  /* A Manifold devolve os vértices em Float32 e a partir de uma cópia interna dos pontos, então o ponto de volta pode
     diferir do nosso na sétima casa. O vértice volta ao ponto mais próximo, desde que os pontos do perfil estejam
     separados por mais que o dobro dessa tolerância. */
  const escala = Math.max(1, ...pontos.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
  const tolerancia = 1e-6 * escala;
  for (let g = 0; g < pontos.length; g++) for (let h = g + 1; h < pontos.length; h++) {
    if (Math.hypot(pontos[g][0] - pontos[h][0], pontos[g][1] - pontos[h][1]) <= 4 * tolerancia) {
      throw new ErroDePerfil('perfil', `os pontos ${g} e ${h} do perfil ficam a menos de ${4 * tolerancia} um do outro (${texto(pontos[g])} e ${texto(pontos[h])}); a tampa não distingue os dois`);
    }
  }
  const maisProximo = (x, y) => {
    let melhor = -1, menor = Infinity;
    for (let g = 0; g < pontos.length; g++) { const d = Math.hypot(pontos[g][0] - x, pontos[g][1] - y); if (d < menor) { menor = d; melhor = g; } }
    return menor <= tolerancia ? melhor : undefined;
  };
  const doVertice = new Map();
  const secao = new wasm.CrossSection(aneis, 'EvenOdd');
  const solido = secao.extrude(1);
  try {
    const { vertProperties: V, triVerts: T, numProp } = solido.getMesh();
    const triangulos = [];
    for (let k = 0; k < T.length; k += 3) {
      const t = [0, 1, 2].map((j) => T[k + j]);
      if (!t.every((v) => V[numProp * v + 2] === 0)) continue;   // só a face de baixo (z = 0)
      const g = t.map((v) => {
        if (!doVertice.has(v)) doVertice.set(v, maisProximo(V[numProp * v], V[numProp * v + 1]));
        return doVertice.get(v);
      });
      if (g.some((x) => x === undefined)) throw new ErroDePerfil('perfil', 'a Manifold criou um ponto novo na tampa do perfil');
      const orient = (pontos[g[1]][0] - pontos[g[0]][0]) * (pontos[g[2]][1] - pontos[g[0]][1]) - (pontos[g[1]][1] - pontos[g[0]][1]) * (pontos[g[2]][0] - pontos[g[0]][0]);
      if (orient === 0) throw new ErroDePerfil('perfil', `a Manifold devolveu um triângulo de área nula na tampa (pontos ${g.join(', ')})`);
      if (orient < 0) [g[1], g[2]] = [g[2], g[1]];
      const m = g.indexOf(Math.min(...g));
      triangulos.push([g[m], g[(m + 1) % 3], g[(m + 2) % 3]]);
    }
    triangulos.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]));
    const esperado = perfil.componentes.reduce((s, c) => s + c.externo.length + c.furos.reduce((t, f) => t + f.length + 2, 0) - 2, 0);
    if (triangulos.length !== esperado) throw new ErroDePerfil('perfil', `a tampa saiu com ${triangulos.length} triângulos e a contagem fechada é ${esperado}`);
    return { pontos, componenteDe, triangulos };
  } finally {
    solido.delete();
    secao.delete();
  }
}
