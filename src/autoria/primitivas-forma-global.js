/* Primitivas do nível zero na forma global N2: cone (com tronco), esfera, anel, revolução de perfil, extrusão de perfil
   côncavo e tubo por pontos com raio de curva. Cada uma é um volume do andaime: `normalizarPrimitiva` valida e devolve o
   volume normalizado, e `malhaPrimitiva` gera a blocagem, uma malha de triângulos fechada e com a normal para fora, sem
   dependência de Three.js, DOM ou domínio. Mesmo volume, mesma malha: nenhuma etapa usa acaso ou relógio.

   Convenções
   - `centro` é o ponto de referência do volume. No cone, no anel e na revolução é o meio do comprimento ao longo do eixo; na
     extrusão e no tubo é a origem dos pontos do perfil e do caminho, como no `prisma`.
   - Os eixos x, y, z formam o ciclo (a, b, e) = (y, z, x), (z, x, y), (x, y, z) para o eixo e = x, y, z. Os anéis de pontos
     giram de a para b, o que dá a volta anti-horária vista da ponta de e.
   - A esfera tem os polos em y; a quantidade de segmentos é múltipla de 4 para que o equador e os quatro pontos cardeais caiam
     em vértices e o envelope medido seja exatamente o raio.
   - O arco da curva do tubo é cortado em seções retas de no máximo PASSO_DA_CURVA_GRAUS, como o tubo do esboço; as juntas são
     meias-esquadrias, e o canto sem raio de curva também (o raio de curva, quando existe, precisa passar do raio do tubo).

   Reaproveita `areaDoContorno` e `ehSimples` do núcleo (`procedural/nucleo/contorno.js`) e o `earcut` do núcleo para as
   tampas côncavas. */
import earcut from 'earcut';
import { areaDoContorno, ehSimples } from '../../procedural/nucleo/contorno.js';
import { chavesExatas, falhar, objeto } from './base-forma-global.js';

export const TIPOS_PRIMITIVA_FORMA_GLOBAL = Object.freeze(['cone', 'esfera', 'anel', 'revolucao', 'extrusao', 'tubo']);
export const PASSO_DA_CURVA_GRAUS = 6;

const EIXOS = ['x', 'y', 'z'];
const INDICE = { x: 0, y: 1, z: 2 };
const CICLO = { x: ['y', 'z'], y: ['z', 'x'], z: ['x', 'y'] };
const COMUNS = ['id', 'regioes', 'tipo', 'centro'];
const LIMITE_PERFIL_REVOLUCAO = 256;
const LIMITE_PERFIL_EXTRUSAO = 512;
const LIMITE_PONTOS_TUBO = 64;
const EPS = 1e-9;

const CAMPOS = {
  cone: ['eixo', 'raioBase', 'raioTopo', 'comprimento', 'segmentos'],
  esfera: ['raio', 'segmentos'],
  anel: ['eixo', 'raioExterno', 'raioInterno', 'espessura', 'segmentos'],
  revolucao: ['eixo', 'perfil', 'segmentos'],
  extrusao: ['eixoExtrusao', 'eixosPerfil', 'comprimento', 'perfil'],
  tubo: ['caminho', 'raio', 'raioCurva', 'segmentos'],
};

/* ---------- mensagens ---------- */

function mostrar(valor) {
  if (typeof valor === 'number') return String(valor);
  const texto = JSON.stringify(valor);
  if (texto === undefined) return String(valor);
  return texto.length > 80 ? `${texto.slice(0, 77)}...` : texto;
}
function recusar(codigo, caminho, valor, aceito) { falhar(codigo, caminho, `recebeu ${mostrar(valor)}; aceita ${aceito}.`); }
const ehNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor);

function positivo(valor, caminho) {
  if (!(ehNumero(valor) && valor > 0)) recusar('numero-invalido', caminho, valor, 'número finito maior que zero, em mm');
  return valor;
}
function naoNegativo(valor, caminho) {
  if (!(ehNumero(valor) && valor >= 0)) recusar('numero-invalido', caminho, valor, 'número finito maior ou igual a zero, em mm');
  return valor;
}
function inteiroEntre(valor, caminho, minimo, maximo, sufixo = '') {
  if (!(Number.isInteger(valor) && valor >= minimo && valor <= maximo)) {
    recusar('numero-invalido', caminho, valor, `inteiro de ${minimo} a ${maximo}${sufixo}`);
  }
  return valor;
}
function eixoDe(valor, caminho) {
  if (!EIXOS.includes(valor)) recusar('eixo-invalido', caminho, valor, "'x', 'y' ou 'z'");
  return valor;
}
function exigirCampos(valor, tipo, caminho) {
  objeto(valor, caminho);
  const campos = [...COMUNS, ...CAMPOS[tipo]];
  const extras = Object.keys(valor).filter((campo) => !campos.includes(campo)).sort();
  const ausentes = campos.filter((campo) => !Object.hasOwn(valor, campo)).sort();
  if (extras.length || ausentes.length) {
    falhar('campos-invalidos', caminho, `campos ausentes: ${ausentes.join(', ') || '(nenhum)'}; extras: ${extras.join(', ') || '(nenhum)'}; `
      + `o tipo '${tipo}' aceita exatamente: ${[...campos].sort().join(', ')}.`);
  }
}
function paresDoPerfil(valor, caminho, minimo, maximo, descricao) {
  if (!Array.isArray(valor) || valor.length < minimo || valor.length > maximo) {
    recusar('perfil-invalido', caminho, valor, `lista de ${minimo} a ${maximo} pontos ${descricao}`);
  }
  return valor.map((ponto, indice) => {
    if (!Array.isArray(ponto) || ponto.length !== 2 || !ponto.every(ehNumero)) {
      recusar('ponto-invalido', `${caminho}[${indice}]`, ponto, `ponto ${descricao} com dois números finitos`);
    }
    return [ponto[0], ponto[1]];
  });
}

/* ---------- normalização ---------- */

function normalizarCone(valor, caminho, base) {
  const eixo = eixoDe(valor.eixo, `${caminho}.eixo`);
  const raioBase = naoNegativo(valor.raioBase, `${caminho}.raioBase`);
  const raioTopo = naoNegativo(valor.raioTopo, `${caminho}.raioTopo`);
  const comprimento = positivo(valor.comprimento, `${caminho}.comprimento`);
  if (raioBase === 0 && raioTopo === 0) recusar('cone-degenerado', `${caminho}.raioBase`, raioBase, 'raioBase ou raioTopo maior que zero (os dois nulos não têm volume)');
  if (raioBase === raioTopo) {
    recusar('cone-degenerado', `${caminho}.raioTopo`, raioTopo, `valor diferente de raioBase (${raioBase}); raios iguais formam um cilindro, use o tipo 'cilindro'`);
  }
  return { ...base, eixo, raioBase, raioTopo, comprimento, segmentos: inteiroEntre(valor.segmentos, `${caminho}.segmentos`, 8, 128) };
}

function normalizarEsfera(valor, caminho, base) {
  const raio = positivo(valor.raio, `${caminho}.raio`);
  const segmentos = inteiroEntre(valor.segmentos, `${caminho}.segmentos`, 8, 128, ', múltiplo de 4');
  if (segmentos % 4 !== 0) recusar('numero-invalido', `${caminho}.segmentos`, segmentos, 'inteiro de 8 a 128, múltiplo de 4 (o equador e os pontos cardeais caem em vértices)');
  return { ...base, raio, segmentos };
}

function normalizarAnel(valor, caminho, base) {
  const eixo = eixoDe(valor.eixo, `${caminho}.eixo`);
  const raioExterno = positivo(valor.raioExterno, `${caminho}.raioExterno`);
  const raioInterno = positivo(valor.raioInterno, `${caminho}.raioInterno`);
  if (raioInterno >= raioExterno) recusar('anel-degenerado', `${caminho}.raioInterno`, raioInterno, `número maior que zero e menor que raioExterno (${raioExterno})`);
  const espessura = positivo(valor.espessura, `${caminho}.espessura`);
  return { ...base, eixo, raioExterno, raioInterno, espessura, segmentos: inteiroEntre(valor.segmentos, `${caminho}.segmentos`, 8, 128) };
}

function normalizarRevolucao(valor, caminho, base) {
  const eixo = eixoDe(valor.eixo, `${caminho}.eixo`);
  const perfil = paresDoPerfil(valor.perfil, `${caminho}.perfil`, 2, LIMITE_PERFIL_REVOLUCAO, '[raio, altura] em mm');
  perfil.forEach(([raio, altura], indice) => {
    const onde = `${caminho}.perfil[${indice}]`;
    if (raio < 0) recusar('perfil-invalido', `${onde}[0]`, raio, 'raio maior ou igual a zero');
    if (indice === 0) return;
    const [raioAnterior, alturaAnterior] = perfil[indice - 1];
    if (altura < alturaAnterior - EPS) recusar('perfil-invalido', `${onde}[1]`, altura, `altura que não volte atrás (anterior ${alturaAnterior}); o perfil sobe ao longo do eixo, e dois pontos na mesma altura formam um degrau`);
    if (Math.hypot(raio - raioAnterior, altura - alturaAnterior) <= EPS) recusar('perfil-invalido', onde, perfil[indice], `ponto diferente do anterior (${mostrar(perfil[indice - 1])})`);
    if (raio === 0 && indice < perfil.length - 1) recusar('perfil-invalido', `${onde}[0]`, raio, 'raio zero só no primeiro e no último ponto (uma cintura de raio zero parte o sólido em dois)');
  });
  if (!perfil.some(([raio]) => raio > 0)) recusar('perfil-invalido', `${caminho}.perfil`, perfil, 'ao menos um ponto com raio maior que zero');
  return { ...base, eixo, perfil, segmentos: inteiroEntre(valor.segmentos, `${caminho}.segmentos`, 8, 128) };
}

function normalizarExtrusao(valor, caminho, base) {
  const eixoExtrusao = eixoDe(valor.eixoExtrusao, `${caminho}.eixoExtrusao`);
  const eixosPerfil = valor.eixosPerfil;
  if (!Array.isArray(eixosPerfil) || eixosPerfil.length !== 2 || !eixosPerfil.every((eixo) => EIXOS.includes(eixo))
    || new Set([eixoExtrusao, ...eixosPerfil]).size !== 3) {
    recusar('eixos-perfil-invalidos', `${caminho}.eixosPerfil`, eixosPerfil, `dois eixos entre 'x', 'y' e 'z' distintos entre si e de eixoExtrusao ('${eixoExtrusao}')`);
  }
  const comprimento = positivo(valor.comprimento, `${caminho}.comprimento`);
  const perfil = paresDoPerfil(valor.perfil, `${caminho}.perfil`, 3, LIMITE_PERFIL_EXTRUSAO, '[u, v] em mm, nos eixos de eixosPerfil');
  if (!ehSimples(perfil)) {
    recusar('perfil-nao-simples', `${caminho}.perfil`, perfil, 'polígono simples, convexo ou côncavo, sem ponto repetido, sem área nula e sem arestas que se cruzem ou se toquem');
  }
  return { ...base, eixoExtrusao, eixosPerfil: [...eixosPerfil], comprimento, perfil };
}

function normalizarTubo(valor, caminho, base) {
  const pontos = valor.caminho;
  if (!Array.isArray(pontos) || pontos.length < 2 || pontos.length > LIMITE_PONTOS_TUBO) {
    recusar('caminho-invalido', `${caminho}.caminho`, pontos, `lista de 2 a ${LIMITE_PONTOS_TUBO} pontos [x, y, z] em mm`);
  }
  const caminhoNormal = pontos.map((ponto, indice) => {
    if (!Array.isArray(ponto) || ponto.length !== 3 || !ponto.every(ehNumero)) recusar('ponto-invalido', `${caminho}.caminho[${indice}]`, ponto, 'ponto [x, y, z] com três números finitos');
    return [ponto[0], ponto[1], ponto[2]];
  });
  const raio = positivo(valor.raio, `${caminho}.raio`);
  const raioCurva = naoNegativo(valor.raioCurva, `${caminho}.raioCurva`);
  if (raioCurva > 0 && raioCurva <= raio) {
    recusar('raio-curva-invalido', `${caminho}.raioCurva`, raioCurva, `0 (canto em meia-esquadria) ou número maior que o raio do tubo (${raio}), para a curva interna não se fechar`);
  }
  const segmentos = inteiroEntre(valor.segmentos, `${caminho}.segmentos`, 8, 128);
  linhaDoTubo(caminhoNormal, raio, raioCurva, caminho);
  return { ...base, caminho: caminhoNormal, raio, raioCurva, segmentos };
}

/* `base` traz id, regioes, tipo e centro já validados pelo contrato. */
export function normalizarPrimitiva(valor, caminho, base) {
  exigirCampos(valor, base.tipo, caminho);
  if (base.tipo === 'cone') return normalizarCone(valor, caminho, base);
  if (base.tipo === 'esfera') return normalizarEsfera(valor, caminho, base);
  if (base.tipo === 'anel') return normalizarAnel(valor, caminho, base);
  if (base.tipo === 'revolucao') return normalizarRevolucao(valor, caminho, base);
  if (base.tipo === 'extrusao') return normalizarExtrusao(valor, caminho, base);
  return normalizarTubo(valor, caminho, base);
}

/* ---------- malhas ---------- */

const limpo = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
function quadro(eixo) { const [a, b] = CICLO[eixo]; return { e: INDICE[eixo], a: INDICE[a], b: INDICE[b] }; }
const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const soma = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const mul = (p, k) => [p[0] * k, p[1] * k, p[2] * k];
const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cruz = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const norma = (p) => Math.hypot(p[0], p[1], p[2]);
const unitario = (p) => mul(p, 1 / norma(p));

/* Sólido de revolução em torno do eixo: cada ponto do perfil é um anel de `n` vértices (um polo se o raio é zero). Perfil
   aberto: tampas de disco nas pontas de raio positivo. Perfil fechado (`fechado`): o último ponto volta ao primeiro, sem
   tampas, para o anel de seção retangular. As alturas sobem com o perfil e os anéis giram anti-horário em torno de +eixo. */
function malhaDeRevolucao(centro, eixo, perfil, n, { fechado = false } = {}) {
  const q = quadro(eixo), vertices = [], faces = [], aneis = [];
  for (const [raio, altura] of perfil) {
    if (raio === 0) {
      const polo = [...centro]; polo[q.e] += altura; aneis.push({ polo: vertices.push(polo) - 1 });
      continue;
    }
    const inicio = vertices.length;
    for (let i = 0; i < n; i++) {
      const angulo = 2 * Math.PI * i / n, ponto = [...centro];
      ponto[q.e] += altura; ponto[q.a] += limpo(raio * Math.cos(angulo)); ponto[q.b] += limpo(raio * Math.sin(angulo));
      vertices.push(ponto);
    }
    aneis.push({ inicio });
  }
  const pares = aneis.slice(0, -1).map((anel, i) => [anel, aneis[i + 1]]);
  if (fechado) pares.push([aneis[aneis.length - 1], aneis[0]]);
  for (const [A, B] of pares) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (A.polo !== undefined) faces.push([A.polo, B.inicio + j, B.inicio + i]);
    else if (B.polo !== undefined) faces.push([A.inicio + i, A.inicio + j, B.polo]);
    else faces.push([A.inicio + i, A.inicio + j, B.inicio + j], [A.inicio + i, B.inicio + j, B.inicio + i]);
  }
  if (!fechado) {
    const [primeiro, ultimo] = [aneis[0], aneis[aneis.length - 1]];
    const centroDa = (altura) => { const c = [...centro]; c[q.e] += altura; return c; };
    if (primeiro.inicio !== undefined) {
      const c = vertices.push(centroDa(perfil[0][1])) - 1;
      for (let i = 0; i < n; i++) faces.push([c, primeiro.inicio + (i + 1) % n, primeiro.inicio + i]);
    }
    if (ultimo.inicio !== undefined) {
      const c = vertices.push(centroDa(perfil[perfil.length - 1][1])) - 1;
      for (let i = 0; i < n; i++) faces.push([c, ultimo.inicio + i, ultimo.inicio + (i + 1) % n]);
    }
  }
  return { vertices, faces };
}

function malhaCone(volume) {
  const metade = volume.comprimento / 2;
  return malhaDeRevolucao(volume.centro, volume.eixo, [[volume.raioBase, -metade], [volume.raioTopo, metade]], volume.segmentos);
}

function malhaEsfera(volume) {
  const faixas = volume.segmentos / 2, perfil = [];
  for (let k = 0; k <= faixas; k++) {
    const t = Math.PI * k / faixas;
    perfil.push([k === 0 || k === faixas ? 0 : limpo(volume.raio * Math.sin(t)), limpo(-volume.raio * Math.cos(t))]);
  }
  return malhaDeRevolucao(volume.centro, 'y', perfil, volume.segmentos);
}

function malhaAnel(volume) {
  const metade = volume.espessura / 2;
  const perfil = [[volume.raioInterno, -metade], [volume.raioExterno, -metade], [volume.raioExterno, metade], [volume.raioInterno, metade]];
  return malhaDeRevolucao(volume.centro, volume.eixo, perfil, volume.segmentos, { fechado: true });
}

/* O perfil da revolução é medido a partir do meio da faixa de alturas, que fica em `centro`. */
function malhaRevolucao(volume) {
  const alturas = volume.perfil.map(([, altura]) => altura), meio = (alturas[0] + alturas[alturas.length - 1]) / 2;
  return malhaDeRevolucao(volume.centro, volume.eixo, volume.perfil.map(([raio, altura]) => [raio, altura - meio]), volume.segmentos);
}

/* Põe a tampa de um polígono côncavo: earcut sobre o perfil e cada triângulo virado para que a normal aponte no `sentido`
   (+1 ou -1) de `e`. Devolve os triângulos como índices de `vertices` somados a `base`. */
function tampaPorOrelhas(perfil, vertices, base, e, sentido) {
  const indices = earcut(perfil.flat(), null, 2), triangulos = [];
  if (indices.length !== 3 * (perfil.length - 2)) {
    falhar('perfil-nao-triangulavel', 'perfil', 'a triangulação das tampas não cobriu o perfil; revise pontos quase colineares ou arestas quase coincidentes.');
  }
  for (let t = 0; t < indices.length; t += 3) {
    const [i, j, k] = [indices[t], indices[t + 1], indices[t + 2]];
    const normalE = cruz(sub(vertices[base + j], vertices[base + i]), sub(vertices[base + k], vertices[base + i]))[e];
    triangulos.push(normalE * sentido >= 0 ? [base + i, base + j, base + k] : [base + i, base + k, base + j]);
  }
  return triangulos;
}

function malhaExtrusao(volume) {
  const e = INDICE[volume.eixoExtrusao], [pa, pb] = volume.eixosPerfil.map((eixo) => INDICE[eixo]);
  const q = quadro(volume.eixoExtrusao);
  /* o perfil só gira anti-horário em torno de +e quando a área é positiva e (pa, pb) é o ciclo (a, b) de e, ou quando as duas condições faltam */
  const inverter = (areaDoContorno(volume.perfil) > 0) !== (pa === q.a && pb === q.b);
  const perfil = inverter ? [...volume.perfil].reverse() : volume.perfil, n = perfil.length;
  const vertices = [], faces = [];
  for (const sinal of [-1, 1]) for (const [u, v] of perfil) {
    const ponto = [...volume.centro]; ponto[e] += sinal * volume.comprimento / 2; ponto[pa] += u; ponto[pb] += v; vertices.push(ponto);
  }
  faces.push(...tampaPorOrelhas(perfil, vertices, 0, e, -1), ...tampaPorOrelhas(perfil, vertices, n, e, 1));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; faces.push([i, j, n + j], [i, n + j, n + i]);
  }
  return { vertices, faces };
}

/* ---------- tubo ---------- */

/* A linha de centro do tubo: os pontos do caminho, com cada canto trocado por um arco de raio `raioCurva` cortado em seções
   de no máximo PASSO_DA_CURVA_GRAUS (a conta do tubo do esboço) quando há raio de curva. Devolve também as folgas que cada
   canto toma dos dois trechos vizinhos. Recusa ponto repetido, retorno sobre si mesmo e trecho curto demais. */
function linhaDoTubo(pontos, raio, raioCurva, caminho) {
  const trechos = pontos.slice(0, -1).map((p, i) => norma(sub(pontos[i + 1], p)));
  trechos.forEach((comprimento, i) => {
    if (comprimento <= EPS) recusar('caminho-invalido', `${caminho}.caminho[${i + 1}]`, pontos[i + 1], `ponto diferente do anterior (${mostrar(pontos[i])})`);
  });
  const giro = pontos.map(() => 0), folga = pontos.map(() => 0);
  for (let i = 1; i < pontos.length - 1; i++) {
    const d1 = unitario(sub(pontos[i], pontos[i - 1])), d2 = unitario(sub(pontos[i + 1], pontos[i]));
    const g = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2))));
    if (g >= Math.PI - 1e-6) recusar('caminho-invalido', `${caminho}.caminho[${i}]`, pontos[i], 'ponto em que o caminho não volte sobre si mesmo');
    if (g <= 1e-6) continue;
    giro[i] = g; folga[i] = (raioCurva > 0 ? raioCurva : raio) * Math.tan(g / 2);
  }
  trechos.forEach((comprimento, i) => {
    const pedida = folga[i] + folga[i + 1];
    if (raioCurva > 0 ? pedida > comprimento + EPS : pedida >= comprimento - EPS) {
      recusar(raioCurva > 0 ? 'raio-curva-invalido' : 'caminho-invalido', raioCurva > 0 ? `${caminho}.raioCurva` : `${caminho}.caminho[${i + 1}]`,
        raioCurva > 0 ? raioCurva : pontos[i + 1],
        `${raioCurva > 0 ? 'raio de curva' : 'caminho'} que caiba no trecho ${i + 1} (${Math.round(comprimento * 10) / 10} mm): `
        + `${raioCurva > 0 ? 'as duas curvas' : 'as duas juntas em meia-esquadria'} pedem ${Math.round(pedida * 10) / 10} mm; reduza o raio, ou afaste os pontos`);
    }
  });
  const linha = [pontos[0]];
  const acrescentar = (ponto) => { if (norma(sub(ponto, linha[linha.length - 1])) > EPS) linha.push(ponto); };
  for (let i = 1; i < pontos.length - 1; i++) {
    if (!(giro[i] > 0) || !(raioCurva > 0)) { acrescentar(pontos[i]); continue; }
    const d1 = unitario(sub(pontos[i], pontos[i - 1])), d2 = unitario(sub(pontos[i + 1], pontos[i]));
    const inicio = sub(pontos[i], mul(d1, folga[i])), normal = unitario(sub(d2, mul(d1, dot(d1, d2))));
    const centroCurva = soma(inicio, mul(normal, raioCurva));
    const passos = Math.max(1, Math.ceil(giro[i] * 180 / Math.PI / PASSO_DA_CURVA_GRAUS));
    for (let k = 0; k <= passos; k++) {
      const t = giro[i] * k / passos;
      acrescentar(soma(centroCurva, soma(mul(normal, -raioCurva * Math.cos(t)), mul(d1, raioCurva * Math.sin(t)))));
    }
  }
  acrescentar(pontos[pontos.length - 1]);
  return linha;
}

/* Gira o vetor `v` em torno de `eixo` unitário pelo ângulo de cosseno `c` e seno `s`. */
function girar(v, eixo, c, s) {
  return soma(soma(mul(v, c), mul(cruz(eixo, v), s)), mul(eixo, dot(eixo, v) * (1 - c)));
}

function malhaTubo(volume) {
  const linha = linhaDoTubo(volume.caminho, volume.raio, volume.raioCurva, 'tubo').map((p) => soma(p, volume.centro));
  const n = volume.segmentos, ultimo = linha.length - 1;
  const direcoes = linha.slice(0, -1).map((p, i) => unitario(sub(linha[i + 1], p)));
  /* quadro inicial: u perpendicular à primeira direção, escolhido pelo eixo menos alinhado com ela; (u, w) gira anti-horário em torno dela */
  const d0 = direcoes[0], menor = [0, 1, 2].reduce((m, i) => (Math.abs(d0[i]) < Math.abs(d0[m]) ? i : m), 0);
  const referencia = [0, 0, 0]; referencia[menor] = 1;
  let u = unitario(sub(referencia, mul(d0, dot(referencia, d0)))), w = cruz(d0, u);
  const vertices = [], faces = [];
  for (let k = 0; k <= ultimo; k++) {
    /* cada seção usa o quadro do trecho que chega a ela e, nos cantos, é cortada pelo plano que divide o ângulo entre os trechos */
    const meio = k > 0 && k < ultimo ? unitario(soma(direcoes[k - 1], direcoes[k])) : null, chega = direcoes[Math.max(k - 1, 0)];
    for (let j = 0; j < n; j++) {
      const angulo = 2 * Math.PI * j / n;
      let ponto = soma(linha[k], soma(mul(u, volume.raio * Math.cos(angulo)), mul(w, volume.raio * Math.sin(angulo))));
      if (meio) ponto = soma(ponto, mul(chega, dot(sub(linha[k], ponto), meio) / dot(chega, meio)));
      vertices.push(ponto);
    }
    if (meio) {
      const eixo = cruz(direcoes[k - 1], direcoes[k]), seno = norma(eixo), cosseno = dot(direcoes[k - 1], direcoes[k]);
      if (seno > 1e-12) { const e = mul(eixo, 1 / seno); u = girar(u, e, cosseno, seno); w = girar(w, e, cosseno, seno); }
    }
  }
  for (let k = 0; k < ultimo; k++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, atual = k * n, proxima = (k + 1) * n;
    faces.push([atual + i, atual + j, proxima + j], [atual + i, proxima + j, proxima + i]);
  }
  const inicioC = vertices.push(linha[0]) - 1, fimC = vertices.push(linha[ultimo]) - 1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([inicioC, j, i], [fimC, ultimo * n + i, ultimo * n + j]);
  }
  return { vertices, faces };
}

export function malhaPrimitiva(volume) {
  if (volume.tipo === 'cone') return malhaCone(volume);
  if (volume.tipo === 'esfera') return malhaEsfera(volume);
  if (volume.tipo === 'anel') return malhaAnel(volume);
  if (volume.tipo === 'revolucao') return malhaRevolucao(volume);
  if (volume.tipo === 'extrusao') return malhaExtrusao(volume);
  return malhaTubo(volume);
}
