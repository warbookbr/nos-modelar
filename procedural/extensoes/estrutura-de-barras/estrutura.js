/* estrutura.js — valida e constrói a estrutura de barras: barras entre nós nomeados, cortadas ou encaixadas em cada nó, unidas num sólido só. */

/* Cada barra é um prisma do seu perfil entre dois nós. O que acontece na ponta depende do que mais chega ao nó:
   - livre: uma barra só; corte reto no nó.
   - continuacao: duas barras alinhadas (180°); as duas terminam num corte reto no plano do nó, sem fresta.
   - passante: há um par alinhado (a barra que atravessa o nó). As demais barras (chegadas) terminam retas no nó e são encaixadas
     na barra passante: do que sobra delas sai o volume que cai dentro da seção da passante, e a chegada precisa caber nessa seção.
   - esquadria: nenhum par alinhado; as barras têm a mesma seção e cada uma é cortada pelo plano bissetor com cada vizinha
     (n - d) . (p - nó) >= 0, em que d são os sentidos unitários das barras que saem do nó. Os planos particionam o espaço em torno do nó,
     as barras se tocam em faces planas e a união não deixa fresta nem ponta.
   O corte plano que passa pelo ponto do eixo no nó não muda o volume de uma seção cujo centroide está no eixo, e daí vêm as conferências. */

import { manifoldCarregada, erroDaCargaDaManifold } from '../../nucleo/manifold.js';
import { ErroDeEstrutura, mostrar, normalizarPerfil, recusar, secao } from './perfis.js';

export const FORMATO_MEDIDAS_ESTRUTURA = 'mecanifica.estrutura-de-barras.medidas@1';
export const ANGULO_MINIMO_NO_NO = 15;
const LIMITE_DE_NOS = 64, LIMITE_DE_BARRAS = 128, COS_COLINEAR = -Math.cos(0.5 * Math.PI / 180), EPS = 1e-9;
const UNIDADES = Object.freeze({ mm: 1e-3, cm: 1e-2, m: 1 });
const CHAVES = Object.freeze(['nos', 'barras', 'perfil', 'densidade', 'unidade']);

/* Resolvedor puro: usado fora do núcleo, onde não há PARAMS. No núcleo entra o contexto (`numero` e `vetor`). */
export const RESOLVEDOR_PURO = Object.freeze({
  numero(valor) { if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new Error(`oficina: ${mostrar(valor)} não é número finito`); return valor; },
  vetor(valor) { if (!Array.isArray(valor) || valor.length !== 3 || valor.some((n) => typeof n !== 'number' || !Number.isFinite(n))) throw new Error(`oficina: ${mostrar(valor)} não é um ponto [x, y, z]`); return valor.slice(); },
});

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]), unit = (a) => mul(a, 1 / norma(a));
const graus = (rad) => rad * 180 / Math.PI;

/* ---------- 1. validação ---------- */

function nomeValido(campo, valor) {
  if (typeof valor !== 'string' || valor.trim() === '') recusar(campo, valor, 'texto com pelo menos um caractere visível');
  return valor;
}

function lerEntrada(args, res, maciço = false) {
  const cheio = (perfil) => (maciço && perfil.parede ? Object.freeze({ ...perfil, parede: null }) : perfil);
  if (!args || typeof args !== 'object' || Array.isArray(args)) recusar('argumentos', args, 'objeto com nos, barras e, opcionalmente, perfil, densidade e unidade');
  for (const chave of Object.keys(args)) if (!CHAVES.includes(chave)) recusar(chave, args[chave], `campo da chamada: ${CHAVES.join(', ')}`);
  const { nos: nosBrutos, barras: barrasBrutas } = args;
  if (!Array.isArray(nosBrutos) || nosBrutos.length < 2 || nosBrutos.length > LIMITE_DE_NOS) recusar('nos', nosBrutos, `lista de 2 a ${LIMITE_DE_NOS} nós { nome, posicao: [x, y, z] }`);
  if (!Array.isArray(barrasBrutas) || barrasBrutas.length < 1 || barrasBrutas.length > LIMITE_DE_BARRAS) recusar('barras', barrasBrutas, `lista de 1 a ${LIMITE_DE_BARRAS} barras { nome, de, para, perfil }`);
  const unidade = args.unidade === undefined ? 'mm' : args.unidade;
  if (!Object.hasOwn(UNIDADES, unidade)) recusar('unidade', args.unidade, `uma destas: ${Object.keys(UNIDADES).join(', ')} (unidade das posições e medidas; o padrão é mm)`);
  let densidade = null;
  if (args.densidade !== undefined) {
    try { densidade = res.numero(args.densidade); } catch { densidade = NaN; }
    if (!(densidade > 0) || !Number.isFinite(densidade)) recusar('densidade', args.densidade, 'número maior que zero, em kg/m³ (aço: 7850)');
  }
  const nos = new Map();
  nosBrutos.forEach((no, i) => {
    const campo = `nos[${i}]`;
    if (!no || typeof no !== 'object' || Array.isArray(no)) recusar(campo, no, 'objeto { nome, posicao: [x, y, z] }');
    for (const chave of Object.keys(no)) if (!['nome', 'posicao'].includes(chave)) recusar(`${campo}.${chave}`, no[chave], 'campo do nó: nome, posicao');
    const nome = nomeValido(`${campo}.nome`, no.nome);
    if (nos.has(nome)) recusar(`${campo}.nome`, nome, 'nome que ainda não foi usado por outro nó');
    let p;
    try { p = res.vetor(no.posicao); } catch { p = null; }
    if (!p || p.length !== 3 || p.some((n) => !Number.isFinite(n))) recusar(`${campo}.posicao`, no.posicao, 'ponto [x, y, z] finito, nome de ponto ou expressão');
    nos.set(nome, { nome, p, indice: i, barras: [] });
  });
  const perfilPadrao = args.perfil === undefined ? null : normalizarPerfil(args.perfil, 'perfil', res.numero);
  const barras = [], nomes = new Set(), pares = new Map();
  barrasBrutas.forEach((b, i) => {
    const campo = `barras[${i}]`;
    if (!b || typeof b !== 'object' || Array.isArray(b)) recusar(campo, b, 'objeto { nome, de, para, perfil }');
    for (const chave of Object.keys(b)) if (!['nome', 'de', 'para', 'perfil', 'orientacao'].includes(chave)) recusar(`${campo}.${chave}`, b[chave], 'campo da barra: nome, de, para, perfil, orientacao');
    const nome = nomeValido(`${campo}.nome`, b.nome);
    if (nomes.has(nome)) recusar(`${campo}.nome`, nome, 'nome que ainda não foi usado por outra barra');
    nomes.add(nome);
    for (const ponta of ['de', 'para']) {
      if (typeof b[ponta] !== 'string' || !nos.has(b[ponta])) recusar(`${campo}.${ponta}`, b[ponta], `nome de um nó declarado em nos (${[...nos.keys()].join(', ')})`);
    }
    const A = nos.get(b.de), B = nos.get(b.para), eixo = sub(B.p, A.p), L = norma(eixo);
    if (b.de === b.para || !(L > EPS)) recusar(`${campo}.para`, b.para, `nó em posição diferente da de '${b.de}'; a barra '${nome}' teria comprimento 0`);
    const chavePar = [b.de, b.para].sort().join('\u0000');
    if (pares.has(chavePar)) recusar(`${campo}`, nome, `par de nós ainda sem barra; '${pares.get(chavePar)}' já liga '${b.de}' e '${b.para}'`);
    pares.set(chavePar, nome);
    const bruto = b.perfil ?? args.perfil;
    if (bruto === undefined) recusar(`${campo}.perfil`, undefined, 'perfil na barra ou um perfil padrão em perfil');
    const perfil = cheio(b.perfil === undefined ? perfilPadrao : normalizarPerfil(b.perfil, `${campo}.perfil`, res.numero));
    let orientacao = null;
    if (b.orientacao !== undefined) {
      try { orientacao = res.vetor(b.orientacao); } catch { orientacao = null; }
      if (!orientacao || !(norma(orientacao) > EPS)) recusar(`${campo}.orientacao`, b.orientacao, 'vetor [x, y, z] não nulo, a direção "para cima" do perfil');
      if (Math.abs(dot(unit(orientacao), unit(eixo))) > 1 - 1e-6) recusar(`${campo}.orientacao`, b.orientacao, 'vetor que não seja paralelo ao eixo da barra');
    }
    barras.push({ nome, indice: i, de: b.de, para: b.para, A: A.p, B: B.p, L, dir: unit(eixo), secao: secao(perfil), orientacao });
    A.barras.push({ barra: barras.length - 1, extremo: 'inicio' }); B.barras.push({ barra: barras.length - 1, extremo: 'fim' });
  });
  for (const no of nos.values()) {
    if (!no.barras.length) recusar(`nos[${no.indice}].nome`, no.nome, 'nó ligado a pelo menos uma barra; remova o nó ou ligue uma barra a ele');
  }
  /* nó que cai no meio de uma barra: a barra teria de ser dividida nele */
  for (const b of barras) {
    for (const no of nos.values()) {
      if (no.nome === b.de || no.nome === b.para) continue;
      const t = dot(sub(no.p, b.A), b.dir);
      if (t > 1e-9 && t < b.L - 1e-9 && norma(sub(no.p, soma(b.A, mul(b.dir, t)))) < 1e-6 * Math.max(1, b.L)) {
        recusar(`barras[${b.indice}]`, b.nome, `barra que não atravesse o nó '${no.nome}'; divida-a em '${b.de}' a '${no.nome}' e '${no.nome}' a '${b.para}'`);
      }
    }
  }
  return { nos, barras, unidade, densidade };
}

/* Quadro da barra: z ao longo do eixo, y para "cima" (a orientação, ou +Y do mundo, ou +Z se o eixo for vertical), x = y × z. */
function quadroDaBarra(b) {
  const z = b.dir;
  const cima = b.orientacao ? unit(b.orientacao) : (Math.abs(z[1]) > 0.9999 ? [0, 0, 1] : [0, 1, 0]);
  const y = unit(sub(cima, mul(z, dot(cima, z)))), x = cruz(y, z);
  return { x, y, z, matriz: [...x, 0, ...y, 0, ...z, 0, ...b.A, 1] };
}
const inversaRigida = (m) => [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0,
  -(m[0] * m[12] + m[1] * m[13] + m[2] * m[14]), -(m[4] * m[12] + m[5] * m[13] + m[6] * m[14]), -(m[8] * m[12] + m[9] * m[13] + m[10] * m[14]), 1];
function compor(a, b) { // a · b, ambas em coluna
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let l = 0; l < 4; l++) for (let k = 0; k < 4; k++) r[c * 4 + l] += a[k * 4 + l] * b[c * 4 + k];
  return r;
}

/* ---------- 2. classificação dos nós ---------- */

const TEXTO_DO_NO = 'nós de esquadria: barras de mesma seção; nós com barra passante: as chegadas cabem na seção dela';
function classificarNos(nos, barras) {
  const resultado = [];
  for (const no of nos.values()) {
    const pontas = no.barras.map(({ barra, extremo }) => ({ barra, extremo, dir: extremo === 'inicio' ? barras[barra].dir : mul(barras[barra].dir, -1) }));
    for (let i = 0; i < pontas.length; i++) for (let j = i + 1; j < pontas.length; j++) {
      const c = dot(pontas[i].dir, pontas[j].dir);
      if (c > Math.cos(ANGULO_MINIMO_NO_NO * Math.PI / 180) - 1e-12) {
        recusar(`nó '${no.nome}'`, `${barras[pontas[i].barra].nome} e ${barras[pontas[j].barra].nome} a ${graus(Math.acos(Math.min(1, c))).toFixed(2)}°`, `barras que saiam do mesmo nó com pelo menos ${ANGULO_MINIMO_NO_NO}° entre si`);
      }
    }
    /* pares alinhados (180°): a passante é o de maior seção; empate, o primeiro declarado */
    const alinhados = [];
    for (let i = 0; i < pontas.length; i++) for (let j = i + 1; j < pontas.length; j++) if (dot(pontas[i].dir, pontas[j].dir) < COS_COLINEAR) alinhados.push([i, j]);
    const raio = (par) => Math.max(...par.map((i) => barras[pontas[i].barra].secao.raioCircunscrito));
    let passante = null;
    for (const par of alinhados) if (!passante || raio(par) > raio(passante) + EPS) passante = par;
    let tipo, anguloMin = 180;
    for (let i = 0; i < pontas.length; i++) for (let j = i + 1; j < pontas.length; j++) anguloMin = Math.min(anguloMin, graus(Math.acos(Math.max(-1, Math.min(1, dot(pontas[i].dir, pontas[j].dir))))));
    if (pontas.length === 1) tipo = 'livre';
    else if (passante && pontas.length === 2) tipo = 'continuacao';
    else if (passante) tipo = 'passante';
    else {
      tipo = 'esquadria';
      const primeira = barras[pontas[0].barra];
      for (const ponta of pontas) {
        const outra = barras[ponta.barra];
        if (outra.secao.chave !== primeira.secao.chave) recusar(`nó '${no.nome}'`, `${primeira.nome} (${primeira.secao.perfil.tipo}) e ${outra.nome} (${outra.secao.perfil.tipo}) com seções diferentes`, `${TEXTO_DO_NO}; use a mesma seção ou faça uma das barras atravessar o nó`);
      }
    }
    resultado.push({ no, tipo, pontas, passante: passante ? passante.map((i) => pontas[i]) : null, anguloMin });
  }
  return resultado;
}

/* A chegada precisa caber na seção da passante: cada canto do corte reto dela, projetado ao longo do eixo da passante, cai dentro da seção. */
function conferirEncaixe(classe, barras, quadros) {
  for (const ponta of classe.pontas) {
    if (classe.passante.includes(ponta)) continue;
    const c = barras[ponta.barra], qc = quadros[ponta.barra];
    for (const par of classe.passante) {
      const spine = barras[par.barra], q = quadros[par.barra], folga = 1e-6 * spine.secao.raioCircunscrito;
      if (!pontosDoContorno(c.secao.externo).every((local) => {
        const mundo = soma(classe.no.p, soma(mul(qc.x, local[0]), mul(qc.y, local[1])));
        /* o centroide do perfil de cada barra está no eixo, e o eixo da passante passa pelo nó */
        const rel = sub(mundo, classe.no.p);
        return spine.secao.contem(dot(rel, q.x), dot(rel, q.y), folga);
      })) {
        recusar(`nó '${classe.no.nome}'`, `${c.nome} (${c.secao.perfil.tipo}) chegando na passante ${spine.nome} (${spine.secao.perfil.tipo})`, 'barra que chegue com o corte reto inteiro dentro da seção da passante; use perfil menor na chegada ou uma passante maior (ou a mesma seção em todas, em esquadria)');
      }
    }
  }
}

/* os cantos do contorno e quatro pontos de cada aresta */
function pontosDoContorno(contorno) {
  const pontos = [];
  contorno.forEach((p0, i) => { const p1 = contorno[(i + 1) % contorno.length]; for (let k = 0; k < 4; k++) pontos.push([p0[0] + (p1[0] - p0[0]) * k / 4, p0[1] + (p1[1] - p0[1]) * k / 4]); });
  return pontos;
}

/* Na esquadria, o plano de corte entre duas barras é o espelho de uma na outra: a seção de uma, refletida nesse plano, precisa cair
   sobre a seção da outra. Seções de mesma forma que giram diferente em torno do eixo (um tubo retangular deitado e outro de pé) não
   fecham a junta, e a recusa manda girar uma delas por `orientacao`. */
function conferirSimetria(classe, barras, quadros) {
  for (let i = 0; i < classe.pontas.length; i++) for (let j = i + 1; j < classe.pontas.length; j++) {
    const a = classe.pontas[i], b = classe.pontas[j], w = unit(sub(a.dir, b.dir));
    const A = barras[a.barra], B = barras[b.barra], qa = quadros[a.barra], qb = quadros[b.barra], folga = 1e-6 * B.secao.raioCircunscrito;
    const cabe = pontosDoContorno(A.secao.externo).every((local) => {
      const rel = soma(mul(qa.x, local[0]), mul(qa.y, local[1])), refletido = sub(rel, mul(w, 2 * dot(rel, w)));
      return B.secao.contem(dot(refletido, qb.x), dot(refletido, qb.y), folga);
    });
    if (!cabe) recusar(`nó '${classe.no.nome}'`, `${A.nome} e ${B.nome} com o perfil ${A.secao.perfil.tipo} girado de modo diferente em torno do eixo`, 'barras cujos perfis, espelhados no plano de corte entre elas, coincidam; gire uma das barras com orientacao (a direção "para cima" do perfil)');
  }
}

/* ---------- 3. construção ---------- */

function exigirManifold() {
  const wasm = manifoldCarregada();
  if (!wasm) throw new ErroDeEstrutura(`a biblioteca de sólidos (manifold-3d) não carregou: ${erroDaCargaDaManifold()?.message ?? 'causa desconhecida'}`);
  return wasm;
}

/* O que não depende da biblioteca de sólidos: entrada validada, quadros, classes de nó e o que cada ponta de barra pede. */
function preparar(args, res, maciço, verificarSimetria = true) {
  const entrada = lerEntrada(args, res, maciço), { nos, barras } = entrada;
  const quadros = barras.map(quadroDaBarra), classes = classificarNos(nos, barras);
  classes.filter((c) => c.tipo === 'passante').forEach((c) => conferirEncaixe(c, barras, quadros));
  if (verificarSimetria) classes.filter((c) => c.tipo === 'esquadria').forEach((c) => conferirSimetria(c, barras, quadros));
  const pontas = barras.map(() => ({ inicio: null, fim: null })), infoDeNos = [];
  for (const classe of classes) {
    const { no, tipo } = classe;
    for (const ponta of classe.pontas) {
      const b = barras[ponta.barra], planos = [], encaixes = [];
      let extensao = 0, fim = 'reto';
      if (tipo === 'esquadria') {
        for (const outra of classe.pontas) if (outra !== ponta) planos.push(unit(sub(ponta.dir, outra.dir)));
        const cosMax = Math.max(...classe.pontas.filter((o) => o !== ponta).map((o) => dot(ponta.dir, o.dir)));
        extensao = 1.05 * b.secao.raioCircunscrito / Math.tan(Math.acos(Math.min(1, cosMax)) / 2) + 1e-6;
        fim = 'esquadria';
      } else if (tipo === 'passante' && !classe.passante.includes(ponta)) {
        for (const s of classe.passante) encaixes.push(s);
        fim = 'encaixe';
      }
      pontas[ponta.barra][ponta.extremo] = { no: no.nome, tipo: fim, planos, extensao, encaixes, livre: tipo === 'livre' };
    }
    infoDeNos.push({ nome: no.nome, tipo, barras: classe.pontas.map((p) => barras[p.barra].nome), anguloMinimo: classe.pontas.length > 1 ? classe.anguloMin : null });
  }
  return { ...entrada, quadros, classes, pontas, infoDeNos };
}

/* Os sólidos: cada barra montada no seu quadro (z ao longo do eixo), com o recuo e os planos de esquadria e o encaixe de cada ponta.
   Barras que se tocam só por uma face plana não viram um sólido na união da biblioteca; por isso a peça que vai para a união invade o
   vizinho por `invasao`, uma fração mínima do raio (1e-6), e a medida (corte, volume) sai da peça montada sem invasão. */
function criarFabrica(prep, g) {
  const { barras, quadros, pontas } = prep, { Manifold, CrossSection } = exigirManifold();
  const invasao = 1e-8 * Math.max(...barras.map((b) => b.secao.raioCircunscrito));
  const contornos = (s, soAExterno) => (s.furo && !soAExterno ? [s.externo, s.furo.slice().reverse()] : [s.externo]);
  const prisma = (b, z0, z1, soAExterno, encolher = 0) => {
    let corte = g(CrossSection.ofPolygons(contornos(b.secao, soAExterno), 'EvenOdd'));
    if (encolher > 0) corte = g(corte.offset(-encolher, 'Miter', 2));
    return g(g(Manifold.extrude(corte, z1 - z0)).translate([0, 0, z0]));
  };
  /* a passante, no quadro da chegada, de que se tira o volume que a chegada divide com ela */
  const envelope = (indiceDaChegada, s, encolher) => {
    const spine = barras[s.barra], c = barras[indiceDaChegada];
    const l = Math.min(spine.L, 20 * (c.secao.raioCircunscrito + spine.secao.raioCircunscrito));
    const solido = s.extremo === 'inicio' ? prisma(spine, 0, l, true, encolher) : prisma(spine, spine.L - l, spine.L, true, encolher);
    return g(solido.transform(compor(inversaRigida(quadros[indiceDaChegada].matriz), quadros[s.barra].matriz)));
  };
  const montar = (i, invade) => {
    const b = barras[i], { inicio, fim } = pontas[i], q = quadros[i];
    const recuo = (p) => (p.livre ? 0 : p.extensao + invade);
    let peca = prisma(b, -recuo(inicio), b.L + recuo(fim), false);
    for (const [extremo, ponta] of [['inicio', inicio], ['fim', fim]]) {
      for (const w of ponta.planos) {
        const noPos = extremo === 'inicio' ? b.A : b.B;
        peca = g(peca.trimByPlane([dot(w, q.x), dot(w, q.y), dot(w, q.z)], dot(w, sub(noPos, b.A)) - invade));
      }
      for (const s of ponta.encaixes) peca = g(peca.subtract(envelope(i, s, invade)));
    }
    return peca;
  };
  /* o prisma reto da barra entre os nós, já encaixado na passante: o que a junta deve conter */
  const nucleo = (i) => {
    let n = prisma(barras[i], 0, barras[i].L, false);
    for (const extremo of ['inicio', 'fim']) for (const s of pontas[i][extremo].encaixes) n = g(n.subtract(envelope(i, s, 0)));
    return n;
  };
  const uniao = () => g(Manifold.union(barras.map((_, i) => g(montar(i, invasao).transform(quadros[i].matriz)))));
  return { montar, nucleo, uniao, Manifold };
}

/* Constrói a estrutura. Devolve as medidas e a malha unida (vértices em ponto flutuante e triângulos de vértices), ou lança ErroDeEstrutura.
   Com `conferir`, mede também, nó a nó, a fresta e o excesso (ver `conferirJuntas`). */
export function construirEstrutura(args, res = RESOLVEDOR_PURO, { conferir = false, verificarSimetria = true } = {}) {
  const prep = preparar(args, res, false, verificarSimetria), { barras, quadros, pontas, infoDeNos, unidade, densidade } = prep;
  exigirManifold();
  const lixo = [], g = (objeto) => { lixo.push(objeto); return objeto; };
  try {
    const fabrica = criarFabrica(prep, g);
    const pecas = barras.map((b, i) => {
      const peca = fabrica.montar(i, 0), caixa = peca.boundingBox(), volume = peca.volume();
      if (peca.isEmpty() || !(volume > EPS) || !(caixa.max[2] - caixa.min[2] > EPS)) {
        recusar(`barras[${b.indice}]`, b.nome, 'barra mais curta que o recuo dos cortes nos seus dois nós; afaste os nós, reduza o perfil ou mude os ângulos');
      }
      return { zMin: caixa.min[2], zMax: caixa.max[2], volume };
    });
    const uniao = fabrica.uniao();
    if (uniao.isEmpty()) throw new ErroDeEstrutura('a união saiu vazia');
    /* corpos separados; a cavidade fechada que o furo dos tubos forma num quadro fechado é um casco de volume negativo e não conta */
    const componentes = (() => { const partes = uniao.decompose(); const n = partes.filter((p) => p.volume() > 0).length; partes.forEach((p) => p.delete()); return n; })();
    const fator = UNIDADES[unidade], arredondar = (v) => (v === null ? null : Number(v.toPrecision(12)));
    const medidasDasBarras = barras.map((b, i) => {
      const { zMin, zMax, volume } = pecas[i], s = b.secao, comprimentoDeCorte = zMax - zMin;
      const pesoPorMetro = densidade === null ? null : s.areaNominal * fator * fator * densidade;
      const extremos = ['inicio', 'fim'].map((extremo) => {
        const p = pontas[i][extremo], angulos = p.planos.map((w) => graus(Math.acos(Math.min(1, Math.abs(dot(w, b.dir))))));
        return { no: p.no, tipo: p.tipo, ...(angulos.length ? { angulosDoCorte: angulos.map(arredondar) } : {}) };
      });
      return {
        nome: b.nome, de: b.de, para: b.para, perfil: { ...s.perfil }, comprimentoEntreNos: arredondar(b.L), comprimentoDeCorte: arredondar(comprimentoDeCorte), extremos,
        area: arredondar(s.areaNominal), volume: arredondar(volume), pesoPorMetro: arredondar(pesoPorMetro),
        pesoDoCorte: pesoPorMetro === null ? null : arredondar(pesoPorMetro * comprimentoDeCorte * fator),
      };
    });
    const medidas = {
      formato: FORMATO_MEDIDAS_ESTRUTURA, unidade, densidade,
      barras: medidasDasBarras, nos: infoDeNos, volume: arredondar(uniao.volume()), componentes,
      massaTotal: densidade === null ? null : arredondar(uniao.volume() * fator ** 3 * densidade),
      caixa: (() => { const c = uniao.boundingBox(); return { min: c.min.map(arredondar), max: c.max.map(arredondar) }; })(),
    };
    if (conferir) medidas.juntas = conferirJuntas(args, res, verificarSimetria);
    const malha = uniao.getMesh(), nP = malha.numProp, vertices = [], triangulos = [];
    for (let k = 0; k < malha.vertProperties.length; k += nP) vertices.push([malha.vertProperties[k], malha.vertProperties[k + 1], malha.vertProperties[k + 2]]);
    for (let k = 0; k < malha.triVerts.length; k += 3) triangulos.push([malha.triVerts[k], malha.triVerts[k + 1], malha.triVerts[k + 2]]);
    return { medidas, malha: { vertices, triangulos } };
  } finally {
    for (const objeto of lixo) { try { objeto.delete(); } catch { /* já liberado */ } }
  }
}

/* Fresta e excesso por nó, medidos em sólidos de dupla precisão (não na malha em ponto flutuante simples) e sobre a estrutura MACIÇA:
   o furo de um tubo come o material que a esquadria divide com a barra vizinha, e o que se confere é o corte, não a parede.
   fresta: volume do prisma reto de cada barra do nó (já encaixado na passante) que a união não tem.
   excesso: volume da união, na vizinhança do nó, que não está em nenhum prisma reto. Fora da esquadria deve ser nulo (é a ponta para fora);
   na esquadria é o preenchimento do canto de fora e vale `null`, porque ali a conferência é o volume (ver os testes). */
function conferirJuntas(args, res, verificarSimetria) {
  const prep = preparar(args, res, true, verificarSimetria), { barras, classes, infoDeNos } = prep;
  const lixo = [], g = (objeto) => { lixo.push(objeto); return objeto; };
  try {
    const fabrica = criarFabrica(prep, g), { Manifold } = fabrica;
    const uniao = fabrica.uniao();
    const nucleos = barras.map((_, i) => g(fabrica.nucleo(i).transform(prep.quadros[i].matriz)));
    const todos = g(Manifold.union(nucleos));
    return classes.map((classe, k) => {
      const rMax = Math.max(...classe.pontas.map((p) => barras[p.barra].secao.raioCircunscrito));
      const ro = rMax * (2.5 + (classe.pontas.length > 1 ? 1 / Math.tan(classe.anguloMin * Math.PI / 360) : 0));
      const bola = g(g(Manifold.sphere(ro, 48)).translate(classe.no.p));
      const doNo = g(Manifold.union(classe.pontas.map((p) => nucleos[p.barra])));
      /* a cantoneira não é simétrica no plano da esquadria, e o prisma reto dela entra no canto de fora e no de dentro de modo diferente da
         esquadria correta; nela a fresta não é medida e a junta fica garantida pela simetria exigida na entrada */
      const assimetrica = classe.tipo === 'esquadria' && classe.pontas.some((p) => barras[p.barra].secao.perfil.tipo === 'cantoneira');
      const fresta = assimetrica ? null : g(g(doNo.intersect(bola)).subtract(uniao)).volume();
      const excesso = classe.tipo === 'esquadria' ? null : g(g(uniao.intersect(bola)).subtract(todos)).volume();
      const milionesimo = (v) => (v === null ? null : Math.round(v * 1e6) / 1e6);
      return { no: infoDeNos[k].nome, tipo: classe.tipo, fresta: milionesimo(fresta), excesso: milionesimo(excesso) };
    });
  } finally {
    for (const objeto of lixo) { try { objeto.delete(); } catch { /* já liberado */ } }
  }
}

/* ---------- 4. entradas públicas ---------- */

/* Só as medidas (comprimento de corte e peso por metro de cada barra, juntas, volume), sem a malha. */
export function descreverEstrutura(args, res = RESOLVEDOR_PURO, opcoes = {}) { return construirEstrutura(args, res, opcoes).medidas; }
