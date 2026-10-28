/* curva2d.js — contorno 2D escrito por trechos (reto, arco, arco tangente, concordância e spline), puro.

   A receita descreve o contorno e o núcleo calcula os pontos. A entrada é
     {inicio: [u, v], trechos: [...], segmentosSpline?}
   e a saída é a lista de pontos [u, v] que `montarPerfil` (perfil2d.js) já aceita. O contorno é sempre fechado: se o último
   trecho não termina em `inicio`, um reto implícito leva de volta a ele. Cada trecho é um objeto de uma chave só e começa
   onde o anterior terminou:
     - {reto: [u, v]}                      segmento reto até o ponto;
     - {arco: {por: [u, v], ate: [u, v]}}  arco que passa por `por` e termina em `ate` (três pontos: o atual, `por` e `ate`);
     - {arco: {centro: [u, v], angulo}}    arco em volta de `centro`, `angulo` em graus (positivo anti-horário, 0 < |angulo| < 360);
     - {arcoTangente: [u, v]}              arco que sai tangente ao fim do trecho anterior e termina no ponto;
     - {concordancia: raio}                filete de `raio` no canto atual, entre o reto que chegou e o reto que vem (também
                                           {concordancia: {raio}}). Na primeira posição vale para o canto de `inicio`, e na
                                           última, para o canto antes do reto de fechamento;
     - {spline: [[u, v], ...]}             curva suave que passa, em ordem, por todos os pontos (o ponto atual vem antes), ou
                                           {spline: {pontos, tangente?}} com tangente 'anterior' (parte tangente ao trecho
                                           anterior; é o padrão quando há trecho anterior) ou 'livre' (parte na direção da
                                           primeira corda).

   DISCRETIZAÇÃO. Fixada por argumento, nunca por tolerância calculada: um arco ou filete de varredura S usa
   ceil(S / 90° × segmentosArco) segmentos iguais em ângulo (segmentosArco por quarto de volta, padrão 4, o mesmo de
   perfil2d.js e de `retanguloArredondado`), e cada vão da spline usa `segmentosSpline` segmentos iguais no parâmetro
   (padrão 8). Os pontos de passagem e as pontas dos arcos saem exatamente nos pontos escritos; os demais caem na curva.
   Os números saem arredondados à grade de 1e-9 (a mesma de `retanguloArredondado`), o que tira o ruído de última casa de
   cos e sin: mesma entrada, mesma lista de números, byte a byte.

   SPLINE: Catmull-Rom centrípeta (parâmetro com o intervalo de cada vão igual à raiz do comprimento da corda). Ela passa
   pelos pontos, o que a B-spline não faz (a B-spline só se aproxima dos pontos de controle), é local (mexer num ponto
   altera no máximo os quatro vãos vizinhos, e por isso o parâmetro da peça mexe só onde deve) e, diferente da variedade
   uniforme e da cordal, não faz laço nem ponta dentro de um vão. A tangente é contínua em cada ponto de passagem.

   O contorno devolvido mantém o sentido em que foi escrito; a conferência de polígono simples e a orientação canônica são
   de `montarPerfil`. Sem Three.js, sem WebAssembly.

   `recortarArcoNoPerfil` (no fim do arquivo) é outra função pura, sobre um contorno já pronto: recorta no perfil o arco poligonal
   de uma roda ou de um vão redondo na borda de baixo, fundindo o corte que cai perto de um vértice, para a extrusão não ganhar
   lateral de lasca. */

import { diagnosticarContorno } from './contorno.js';

const EPS = 1e-9;
export const SEGMENTOS_SPLINE_PADRAO = 8;
const SEGMENTOS_ARCO_PADRAO = 4;
export const TRECHOS_ACEITOS = Object.freeze(['reto', 'arco', 'arcoTangente', 'concordancia', 'spline']);

export class ErroDeCurva extends Error {
  constructor(campo, detalhe) {
    super(`${campo}: ${detalhe}`);
    this.name = 'ErroDeCurva';
    this.campo = campo;
    this.detalhe = detalhe;
  }
}

const ehNumero = (x) => typeof x === 'number' && Number.isFinite(x);
const arredondar = (x) => Math.round(x / EPS) * EPS + 0;
const texto = (v) => { try { const t = JSON.stringify(v); return t === undefined ? String(v) : (t.length > 80 ? `${t.slice(0, 77)}...` : t); } catch { return String(v); } };
const fmt = (x) => String(Number(x.toPrecision(4)));
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const unitario = (a, b) => { const d = dist(a, b); return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
const cruz = (a, b) => a[0] * b[1] - a[1] * b[0];
const VOLTA = 2 * Math.PI;

function inteiroDe(valor, campo, padrao) {
  if (valor == null) return padrao;
  if (!Number.isInteger(valor) || valor < 1) throw new ErroDeCurva(campo, `precisa ser um inteiro >= 1 (veio ${texto(valor)})`);
  return valor;
}

function numeroDe(num, valor, campo) {
  const x = num(valor);   // sem try: valor ou PARAM inválido derruba a peça, como em todo campo dimensional
  if (!ehNumero(x)) throw new ErroDeCurva(campo, `precisa ser um número finito (veio ${texto(valor)})`);
  return x;
}

function pontoDe(num, valor, campo) {
  if (!Array.isArray(valor) || valor.length !== 2) throw new ErroDeCurva(campo, `o ponto precisa ser [u, v] (veio ${texto(valor)})`);
  return [numeroDe(num, valor[0], `${campo}[0]`), numeroDe(num, valor[1], `${campo}[1]`)];
}

function soChaves(objeto, permitidas, campo) {
  for (const k of Object.keys(objeto)) if (!permitidas.includes(k)) throw new ErroDeCurva(`${campo}.${k}`, `campo desconhecido; aceito: ${permitidas.join(', ')}`);
}

/* ---- leitura: cada trecho vira um item com números resolvidos ---- */
function lerTrecho(trecho, campo, num) {
  if (!trecho || typeof trecho !== 'object' || Array.isArray(trecho)) throw new ErroDeCurva(campo, `o trecho precisa ser um objeto de uma chave (${TRECHOS_ACEITOS.join(', ')}) (veio ${texto(trecho)})`);
  const chaves = Object.keys(trecho);
  if (chaves.length !== 1 || !TRECHOS_ACEITOS.includes(chaves[0])) throw new ErroDeCurva(campo, `trecho desconhecido (veio ${texto(trecho)}); aceito, com uma chave só: ${TRECHOS_ACEITOS.join(', ')}`);
  const tipo = chaves[0];
  const corpo = trecho[tipo];
  const c = `${campo}.${tipo}`;
  if (tipo === 'reto') return { tipo, campo: c, ate: pontoDe(num, corpo, c) };
  if (tipo === 'arcoTangente') return { tipo, campo: c, ate: pontoDe(num, corpo, c) };
  if (tipo === 'concordancia') {
    let bruto = corpo;
    if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) { soChaves(corpo, ['raio'], c); bruto = corpo.raio; }
    const raio = numeroDe(num, bruto, `${c}${corpo && typeof corpo === 'object' ? '.raio' : ''}`);
    if (!(raio > 0)) throw new ErroDeCurva(`${c}${corpo && typeof corpo === 'object' ? '.raio' : ''}`, `o raio precisa ser maior que zero (veio ${raio})`);
    return { tipo, campo: c, raio };
  }
  if (tipo === 'arco') {
    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) throw new ErroDeCurva(c, `precisa ser {por, ate} (três pontos) ou {centro, angulo} (veio ${texto(corpo)})`);
    const porTres = 'por' in corpo || 'ate' in corpo;
    const porCentro = 'centro' in corpo || 'angulo' in corpo;
    if (porTres === porCentro) throw new ErroDeCurva(c, `escreva {por, ate} (arco por três pontos) ou {centro, angulo} (arco por centro e ângulo), um dos dois (veio ${texto(corpo)})`);
    if (porTres) {
      soChaves(corpo, ['por', 'ate'], c);
      if (corpo.por == null || corpo.ate == null) throw new ErroDeCurva(c, 'o arco por três pontos precisa de `por` e `ate`');
      return { tipo, modo: 'tres', campo: c, por: pontoDe(num, corpo.por, `${c}.por`), ate: pontoDe(num, corpo.ate, `${c}.ate`) };
    }
    soChaves(corpo, ['centro', 'angulo'], c);
    if (corpo.centro == null || corpo.angulo == null) throw new ErroDeCurva(c, 'o arco por centro e ângulo precisa de `centro` e `angulo`');
    const angulo = numeroDe(num, corpo.angulo, `${c}.angulo`);
    if (!(Math.abs(angulo) > 0 && Math.abs(angulo) < 360)) throw new ErroDeCurva(`${c}.angulo`, `precisa ter módulo maior que 0 e menor que 360 graus (veio ${angulo}); para a volta inteira escreva {circulo} no perfil`);
    return { tipo, modo: 'centro', campo: c, centro: pontoDe(num, corpo.centro, `${c}.centro`), angulo };
  }
  // spline
  let lista = corpo, tangente;
  if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) {
    soChaves(corpo, ['pontos', 'tangente'], c);
    lista = corpo.pontos;
    tangente = corpo.tangente;
    if (tangente != null && !['anterior', 'livre'].includes(tangente)) throw new ErroDeCurva(`${c}.tangente`, `precisa ser 'anterior' ou 'livre' (veio ${texto(tangente)})`);
  }
  if (!Array.isArray(lista) || lista.length < 2) throw new ErroDeCurva(`${c}${corpo && !Array.isArray(corpo) ? '.pontos' : ''}`, `a spline precisa de 2 pontos [u, v] ou mais depois do ponto atual (veio ${Array.isArray(lista) ? `${lista.length} ponto` : texto(lista)}); com um só ponto escreva {reto}`);
  return { tipo, campo: c, pontos: lista.map((p, k) => pontoDe(num, p, `${c}${corpo && !Array.isArray(corpo) ? '.pontos' : ''}[${k}]`)), tangente };
}

/* ---- arcos: pontos sobre a circunferência, de a0 variando `varredura` (rad), em n segmentos iguais ---- */
function pontosDoArco(centro, raio, a0, varredura, segmentosArco) {
  const n = Math.max(1, Math.ceil((Math.abs(varredura) / (Math.PI / 2)) * segmentosArco - 1e-9));
  const pts = [];
  for (let k = 1; k <= n; k++) { const a = a0 + (varredura * k) / n; pts.push([centro[0] + raio * Math.cos(a), centro[1] + raio * Math.sin(a)]); }
  return pts;
}
const tangenteDoArco = (a, sentido) => (sentido > 0 ? [-Math.sin(a), Math.cos(a)] : [Math.sin(a), -Math.cos(a)]);

function arcoPorTresPontos(P0, item, segmentosArco) {
  const { por: M, ate: P1, campo } = item;
  if (dist(P0, M) < EPS) throw new ErroDeCurva(`${campo}.por`, `coincide com o ponto atual ${texto(P0)}; os três pontos do arco precisam ser distintos`);
  if (dist(M, P1) < EPS) throw new ErroDeCurva(`${campo}.ate`, `coincide com \`por\` ${texto(M)}; os três pontos do arco precisam ser distintos`);
  if (dist(P0, P1) < EPS) throw new ErroDeCurva(`${campo}.ate`, `coincide com o ponto atual ${texto(P0)}; um arco que volta ao início é uma volta inteira, escreva {circulo} no perfil`);
  const b = [M[0] - P0[0], M[1] - P0[1]], c = [P1[0] - P0[0], P1[1] - P0[1]];
  const sen = cruz(b, c) / (Math.hypot(...b) * Math.hypot(...c));
  if (Math.abs(sen) < 1e-9) throw new ErroDeCurva(campo, `os três pontos ${texto(P0)}, ${texto(M)} e ${texto(P1)} são colineares (seno do ângulo ${fmt(sen)}); não há circunferência por eles. Afaste \`por\` da reta ou escreva {reto}`);
  const d = 2 * cruz(b, c);
  const q1 = b[0] * b[0] + b[1] * b[1], q2 = c[0] * c[0] + c[1] * c[1];
  const centro = [P0[0] + (c[1] * q1 - b[1] * q2) / d, P0[1] + (b[0] * q2 - c[0] * q1) / d];
  const raio = dist(centro, P0);
  const sentido = Math.sign(cruz(b, [P1[0] - M[0], P1[1] - M[1]]));   // P0 → M → P1 anti-horário: +1
  const a0 = Math.atan2(P0[1] - centro[1], P0[0] - centro[0]), a1 = Math.atan2(P1[1] - centro[1], P1[0] - centro[0]);
  let varredura = a1 - a0;
  if (sentido > 0) { while (varredura <= 0) varredura += VOLTA; while (varredura > VOLTA) varredura -= VOLTA; }
  else { while (varredura >= 0) varredura -= VOLTA; while (varredura < -VOLTA) varredura += VOLTA; }
  const pts = pontosDoArco(centro, raio, a0, varredura, segmentosArco);
  pts[pts.length - 1] = [P1[0], P1[1]];
  return { pts, tangenteFim: tangenteDoArco(a1, sentido) };
}

function arcoPorCentro(P0, item, segmentosArco) {
  const { centro, angulo, campo } = item;
  const raio = dist(centro, P0);
  if (raio < EPS) throw new ErroDeCurva(`${campo}.centro`, `coincide com o ponto atual ${texto(P0)}; o raio do arco seria zero`);
  const a0 = Math.atan2(P0[1] - centro[1], P0[0] - centro[0]);
  const varredura = (angulo * Math.PI) / 180;
  const pts = pontosDoArco(centro, raio, a0, varredura, segmentosArco);
  return { pts, tangenteFim: tangenteDoArco(a0 + varredura, Math.sign(angulo)) };
}

function arcoTangente(P0, tangente, item, segmentosArco) {
  const { ate: Q, campo } = item;
  if (!tangente) throw new ErroDeCurva(campo, `não há trecho anterior para dar a tangente (é o primeiro trecho); comece por um reto, um arco ou uma spline, ou escreva o arco por três pontos`);
  const d = [Q[0] - P0[0], Q[1] - P0[1]];
  const comprimento = Math.hypot(...d);
  if (comprimento < EPS) throw new ErroDeCurva(campo, `o ponto ${texto(Q)} coincide com o ponto atual; o arco teria comprimento zero`);
  const n = [-tangente[1], tangente[0]];
  const dn = d[0] * n[0] + d[1] * n[1];
  if (Math.abs(dn) < 1e-9 * comprimento) {
    throw new ErroDeCurva(campo, `tangente impossível: o ponto ${texto(Q)} está sobre a reta da tangente em ${texto(P0)} (direção ${texto(tangente.map(fmt))}), e um arco tangente a essa reta só a toca nesse ponto. Tire o ponto da reta ou escreva {reto}`);
  }
  const rs = (comprimento * comprimento) / (2 * dn);   // raio com sinal: positivo, o centro fica à esquerda
  const centro = [P0[0] + n[0] * rs, P0[1] + n[1] * rs];
  const sentido = Math.sign(rs);
  const a0 = Math.atan2(P0[1] - centro[1], P0[0] - centro[0]), a1 = Math.atan2(Q[1] - centro[1], Q[0] - centro[0]);
  let varredura = a1 - a0;
  if (sentido > 0) { while (varredura <= 0) varredura += VOLTA; while (varredura > VOLTA) varredura -= VOLTA; }
  else { while (varredura >= 0) varredura -= VOLTA; while (varredura < -VOLTA) varredura += VOLTA; }
  const pts = pontosDoArco(centro, Math.abs(rs), a0, varredura, segmentosArco);
  pts[pts.length - 1] = [Q[0], Q[1]];
  return { pts, tangenteFim: tangenteDoArco(a1, sentido) };
}

/* ---- spline Catmull-Rom centrípeta, em forma de Hermite ---- */
function splineCentripeta(P0, item, tangenteAnterior, segmentosSpline) {
  const { campo } = item;
  const Q = [P0, ...item.pontos];
  for (let k = 0; k + 1 < Q.length; k++) {
    if (dist(Q[k], Q[k + 1]) < EPS) throw new ErroDeCurva(campo, `${k === 0 ? 'o primeiro ponto coincide com o ponto atual' : `os pontos ${k - 1} e ${k} coincidem`} (${texto(Q[k + 1])}); pontos de passagem consecutivos precisam ser distintos`);
  }
  let modo = item.tangente;
  if (modo === 'anterior' && !tangenteAnterior) throw new ErroDeCurva(`${campo}.tangente`, "'anterior' não tem a que ser tangente: a spline é o primeiro trecho; use 'livre' ou comece por outro trecho");
  if (modo == null) modo = tangenteAnterior ? 'anterior' : 'livre';
  const n = Q.length - 1;
  const dt = Array.from({ length: n }, (_, k) => Math.sqrt(dist(Q[k], Q[k + 1])));
  const m = Q.map((q, k) => {
    if (k === 0) {
      const corda = dist(Q[0], Q[1]);
      return modo === 'anterior' ? [tangenteAnterior[0] * (corda / dt[0]), tangenteAnterior[1] * (corda / dt[0])] : [(Q[1][0] - Q[0][0]) / dt[0], (Q[1][1] - Q[0][1]) / dt[0]];
    }
    if (k === n) return [(Q[n][0] - Q[n - 1][0]) / dt[n - 1], (Q[n][1] - Q[n - 1][1]) / dt[n - 1]];
    return [0, 1].map((e) => (Q[k][e] - Q[k - 1][e]) / dt[k - 1] - (Q[k + 1][e] - Q[k - 1][e]) / (dt[k - 1] + dt[k]) + (Q[k + 1][e] - Q[k][e]) / dt[k]);
  });
  const pts = [];
  for (let k = 0; k < n; k++) {
    for (let j = 1; j < segmentosSpline; j++) {
      const u = j / segmentosSpline, u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      pts.push([0, 1].map((e) => h00 * Q[k][e] + h10 * dt[k] * m[k][e] + h01 * Q[k + 1][e] + h11 * dt[k] * m[k + 1][e]));
    }
    pts.push([Q[k + 1][0], Q[k + 1][1]]);
  }
  const mf = m[n], tamanho = Math.hypot(mf[0], mf[1]);
  return { pts, tangenteFim: [mf[0] / tamanho, mf[1] / tamanho] };
}

/* O contorno por trechos. `opcoes.num` resolve cada número da receita (PARAM e expressões); `opcoes.campo` é o nome do
   contorno nas mensagens. */
export function contornoPorTrechos(contorno, { campo = 'contorno', num = (x) => x, segmentosArco = SEGMENTOS_ARCO_PADRAO, segmentosSpline } = {}) {
  if (!contorno || typeof contorno !== 'object' || Array.isArray(contorno)) throw new ErroDeCurva(campo, `precisa ser {inicio: [u, v], trechos: [...]} (veio ${texto(contorno)})`);
  soChaves(contorno, ['inicio', 'trechos', 'segmentosSpline'], campo);
  const nArco = inteiroDe(segmentosArco, `${campo}.segmentosArco`, SEGMENTOS_ARCO_PADRAO);
  const nSpline = inteiroDe(contorno.segmentosSpline ?? segmentosSpline, `${campo}.segmentosSpline`, SEGMENTOS_SPLINE_PADRAO);
  if (contorno.inicio == null) throw new ErroDeCurva(`${campo}.inicio`, 'é obrigatório: o ponto [u, v] onde o contorno começa');
  const inicio = pontoDe(num, contorno.inicio, `${campo}.inicio`);
  if (!Array.isArray(contorno.trechos) || contorno.trechos.length < 1) throw new ErroDeCurva(`${campo}.trechos`, `precisa ser uma lista com ao menos um trecho (veio ${texto(contorno.trechos)}); aceito: ${TRECHOS_ACEITOS.join(', ')}`);
  const itens = contorno.trechos.map((t, k) => lerTrecho(t, `${campo}.trechos[${k}]`, num));

  /* percurso: cada elemento tem de, ate, pts (do ponto seguinte ao de partida até `ate`, inclusive) e a tangente no fim */
  const elementos = [];
  const marcas = new Map();   // posição de canto (elementos já escritos) → {raio, campo}
  let atual = inicio, tangente = null;
  for (const item of itens) {
    if (item.tipo === 'concordancia') {
      const pos = elementos.length;
      if (marcas.has(pos)) throw new ErroDeCurva(item.campo, `já há uma concordância neste canto (${marcas.get(pos).campo}); escreva uma só por canto`);
      marcas.set(pos, item);
      continue;
    }
    let r;
    if (item.tipo === 'reto') {
      if (dist(atual, item.ate) < EPS) throw new ErroDeCurva(item.campo, `o ponto ${texto(item.ate)} coincide com o ponto atual; o reto teria comprimento zero`);
      r = { pts: [[item.ate[0], item.ate[1]]], tangenteFim: unitario(atual, item.ate) };
    } else if (item.tipo === 'arco') {
      r = item.modo === 'tres' ? arcoPorTresPontos(atual, item, nArco) : arcoPorCentro(atual, item, nArco);
    } else if (item.tipo === 'arcoTangente') {
      r = arcoTangente(atual, tangente, item, nArco);
    } else {
      r = splineCentripeta(atual, item, tangente, nSpline);
    }
    elementos.push({ tipo: item.tipo, campo: item.campo, de: atual, ate: r.pts[r.pts.length - 1], pts: r.pts, tangenteFim: r.tangenteFim });
    atual = r.pts[r.pts.length - 1];
    tangente = r.tangenteFim;
  }
  if (!elementos.length) throw new ErroDeCurva(`${campo}.trechos`, 'só há concordâncias; escreva ao menos um trecho de curva ou reto');
  const n = elementos.length;
  if (dist(atual, inicio) < EPS) {
    elementos[n - 1].ate = inicio;
    elementos[n - 1].pts[elementos[n - 1].pts.length - 1] = [inicio[0], inicio[1]];
  } else {
    elementos.push({ tipo: 'reto', campo: `${campo} (fecho)`, de: atual, ate: inicio, pts: [[inicio[0], inicio[1]]], tangenteFim: unitario(atual, inicio), fecho: true });
  }
  const m = elementos.length;
  if (m < 2) throw new ErroDeCurva(`${campo}.trechos`, 'um trecho só que volta ao início não delimita área; acrescente mais um trecho');

  /* concordâncias: o canto j fica entre o elemento j-1 e o elemento j (em ciclo) */
  const cantos = new Map();   // j → {raio, t, centro, a0, varredura, T1, T2}
  const cortes = elementos.map(() => ({ ini: 0, fim: 0 }));
  for (const [pos, item] of marcas) {
    const j = pos % m;
    if (cantos.has(j)) throw new ErroDeCurva(item.campo, `este canto já tem concordância (o início do contorno é o mesmo ponto do fim); escreva uma só`);
    const esq = elementos[(j - 1 + m) % m], dir = elementos[j];
    if (esq.tipo !== 'reto' || dir.tipo !== 'reto') {
      const quem = esq.tipo !== 'reto' ? `o trecho que chega é ${esq.tipo} (${esq.campo})` : `o trecho que sai é ${dir.tipo} (${dir.campo})`;
      throw new ErroDeCurva(item.campo, `a concordância liga dois retos, e ${quem}; para suavizar um arco use arcoTangente ou a spline com tangente 'anterior'`);
    }
    const V = dir.de;
    const d1 = unitario(esq.de, esq.ate), d2 = unitario(dir.de, dir.ate);
    const z = cruz(d1, d2), ponto = d1[0] * d2[0] + d1[1] * d2[1];
    const giro = Math.atan2(z, ponto);
    if (Math.abs(giro) < 1e-9) throw new ErroDeCurva(item.campo, `os dois retos em ${texto(V)} seguem na mesma direção; não há canto para concordar`);
    if (Math.abs(giro) > Math.PI - 1e-9) throw new ErroDeCurva(item.campo, `o reto que sai de ${texto(V)} volta sobre o que chegou; a concordância precisa de um canto com abertura`);
    const tg = item.raio * Math.tan(Math.abs(giro) / 2);
    cortes[(j - 1 + m) % m].fim += tg;
    cortes[j].ini += tg;
    const T1 = [V[0] - d1[0] * tg, V[1] - d1[1] * tg], T2 = [V[0] + d2[0] * tg, V[1] + d2[1] * tg];
    const lado = Math.sign(giro);
    const centro = [T1[0] - d1[1] * lado * item.raio, T1[1] + d1[0] * lado * item.raio];
    cantos.set(j, { item, giro, tg, T1, T2, centro, a0: Math.atan2(T1[1] - centro[1], T1[0] - centro[0]) });
  }
  for (const [j, canto] of cantos) {
    for (const idx of [(j - 1 + m) % m, j]) {
      const e = elementos[idx];
      const comprimento = dist(e.de, e.ate);
      const usado = cortes[idx].ini + cortes[idx].fim;
      if (usado > comprimento + 1e-9) {
        const folga = comprimento - (usado - canto.tg);
        const raioMax = folga > 0 ? folga / Math.tan(Math.abs(canto.giro) / 2) : 0;
        throw new ErroDeCurva(canto.item.campo, `o raio ${fmt(canto.item.raio)} pede ${fmt(canto.tg)} de cada reto vizinho, mas o reto ${e.campo} mede ${fmt(comprimento)} e já cede ${fmt(usado - canto.tg)} a outra concordância; o raio máximo que cabe aqui é aproximadamente ${fmt(raioMax)}`);
      }
    }
  }

  /* emissão em ordem: o canto j (ponto ou arco) e depois o miolo do elemento j */
  const saida = [];
  const empurrar = (p) => {
    const q = [arredondar(p[0]), arredondar(p[1])];
    const u = saida[saida.length - 1];
    if (u && Math.abs(q[0] - u[0]) <= EPS && Math.abs(q[1] - u[1]) <= EPS) return;
    saida.push(q);
  };
  for (let j = 0; j < m; j++) {
    const canto = cantos.get(j);
    if (canto) {
      empurrar(canto.T1);
      for (const p of pontosDoArco(canto.centro, canto.item.raio, canto.a0, canto.giro, nArco).slice(0, -1)) empurrar(p);
      empurrar(canto.T2);
    } else {
      empurrar(elementos[j].de);
    }
    for (const p of elementos[j].pts.slice(0, -1)) empurrar(p);
  }
  const primeiro = saida[0], ultimo = saida[saida.length - 1];
  if (saida.length > 1 && Math.abs(primeiro[0] - ultimo[0]) <= EPS && Math.abs(primeiro[1] - ultimo[1]) <= EPS) saida.pop();
  if (saida.length < 3) throw new ErroDeCurva(`${campo}.trechos`, `o contorno ficou com ${saida.length} ponto(s); um contorno precisa de 3 ou mais`);
  return saida;
}

/* Recorte de um arco poligonal na borda de baixo de um contorno, como o arco de roda no perfil lateral de um veículo, mas sem
   saber de roda nem de veículo: o polígono regular de `lados` lados e `raio` em volta de `centro`, com a face plana em cima (os
   vértices a meio passo do eixo vertical, como o cilindro de eixo horizontal de `lados` lados), é tirado do contorno onde ele
   cruza a aresta horizontal que fica em y = `base`. Os pontos são [x, y]. O contorno pode vir em qualquer sentido e volta
   anti-horário, na mesma ordem de partida, com o arco entre os dois pontos de corte da aresta de base.

   O corte que cai a menos de `fundirAbaixoDe` do vizinho funde com ele, para a extrusão não ganhar lateral de lasca: se o ponto
   de corte fica a menos disso do canto da aresta de base, o canto passa a ser o início do arco e o ponto de corte sai; se fica a
   menos disso do primeiro (ou último) vértice do arco, esse vértice sai e o arco parte do ponto de corte. A forma muda no máximo
   `fundirAbaixoDe` ali, e é a receita que escolhe quanto (padrão 0: só funde o que coincide a 1e-9). Para dois arcos na mesma
   borda, chama-se a função duas vezes, e a segunda acha a aresta de base que sobrou. O resultado precisa ser polígono simples; se o
   arco atravessa outra parte do contorno, a função recusa com o diagnóstico de `diagnosticarContorno`. */
export function recortarArcoNoPerfil(perfil, { centro, raio, lados, base, fundirAbaixoDe = 0 } = {}) {
  const campo = 'recortarArcoNoPerfil';
  const par = (p) => Array.isArray(p) && p.length >= 2 && ehNumero(p[0]) && ehNumero(p[1]);
  if (!Array.isArray(perfil) || perfil.length < 3 || !perfil.every(par)) throw new ErroDeCurva(campo, `"perfil" precisa ser uma lista de 3 pontos [x, y] ou mais, com números finitos (veio ${texto(perfil)})`);
  if (!par(centro) || centro.length !== 2) throw new ErroDeCurva(campo, `"centro" precisa ser [x, y] com números finitos (veio ${texto(centro)})`);
  if (!ehNumero(raio) || !(raio > 0)) throw new ErroDeCurva(campo, `"raio" precisa ser um número maior que zero (veio ${texto(raio)})`);
  if (!Number.isInteger(lados) || lados < 3) throw new ErroDeCurva(campo, `"lados" precisa ser um inteiro >= 3 (veio ${texto(lados)})`);
  if (!ehNumero(base)) throw new ErroDeCurva(campo, `"base" precisa ser o y da aresta de baixo, um número finito (veio ${texto(base)})`);
  if (!ehNumero(fundirAbaixoDe) || fundirAbaixoDe < 0) throw new ErroDeCurva(campo, `"fundirAbaixoDe" precisa ser um número finito maior ou igual a zero (veio ${texto(fundirAbaixoDe)})`);

  let P = perfil.map((p) => [p[0], p[1]]);
  const area = P.reduce((acc, q, i) => acc + q[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * q[1], 0);
  if (Math.abs(area) < EPS) throw new ErroDeCurva(campo, 'o perfil não tem área');
  if (area < 0) P = P.reverse();

  /* o polígono do arco, do vértice de cima à esquerda para a direita por cima (ângulo decrescente), e a cadeia dele acima da base */
  const passo = VOLTA / lados;
  const W = Array.from({ length: lados }, (_, k) => { const a = Math.PI - passo / 2 - k * passo; return [centro[0] + raio * Math.cos(a), centro[1] + raio * Math.sin(a)]; });
  const acima = W.map((q) => q[1] > base);
  const nAcima = acima.filter(Boolean).length;
  if (nAcima === 0 || nAcima === lados) {
    const ys = W.map((q) => q[1]);
    throw new ErroDeCurva(campo, `o arco (centro ${texto(centro)}, raio ${fmt(raio)}, ${lados} lados, de y ${fmt(Math.min(...ys))} a ${fmt(Math.max(...ys))}) não cruza a linha da base y = ${fmt(base)}; confira o centro, o raio e a base`);
  }
  const inicio = acima.findIndex((v, k) => v && !acima[(k - 1 + lados) % lados]);
  let fim = inicio;
  while (acima[(fim + 1) % lados]) fim = (fim + 1) % lados;
  const cadeia = [];
  for (let k = inicio; ; k = (k + 1) % lados) { cadeia.push(W[k]); if (k === fim) break; }
  const corte = (a, b) => { const t = (base - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), base]; };
  const corteEsq = corte(W[(inicio - 1 + lados) % lados], W[inicio]);
  const corteDir = corte(W[fim], W[(fim + 1) % lados]);

  /* a aresta de base do perfil que contém o trecho cortado */
  const n = P.length;
  const folga = EPS * Math.max(1, Math.abs(base), ...P.map((p) => Math.abs(p[0])));
  let i = -1;
  for (let k = 0; k < n; k++) {
    const a = P[k], b = P[(k + 1) % n];
    if (Math.abs(a[1] - base) <= folga && Math.abs(b[1] - base) <= folga && a[0] < b[0] && corteEsq[0] >= a[0] - folga && corteDir[0] <= b[0] + folga) { i = k; break; }
  }
  if (i < 0) {
    const bases = P.map((a, k) => [a, P[(k + 1) % n]]).filter(([a, b]) => Math.abs(a[1] - base) <= folga && Math.abs(b[1] - base) <= folga && a[0] < b[0]);
    throw new ErroDeCurva(campo, `nenhuma aresta horizontal do perfil em y = ${fmt(base)} contém o trecho cortado pelo arco, de x ${fmt(corteEsq[0])} a x ${fmt(corteDir[0])}`
      + (bases.length ? `; as arestas de base são ${bases.map(([a, b]) => `x ${fmt(a[0])} a ${fmt(b[0])}`).join(' e ')}` : '; o perfil, no sentido anti-horário, não tem aresta horizontal nessa altura'));
  }
  const a = P[i], b = P[(i + 1) % n];

  /* a fusão com o vizinho: primeiro os vértices do arco colados no corte, depois os cantos da aresta de base */
  const limite = Math.max(fundirAbaixoDe, EPS);
  const arco = cadeia.map((q) => [q[0], q[1]]);
  while (arco.length > 0 && dist(corteEsq, arco[0]) < limite) arco.shift();
  while (arco.length > 0 && dist(corteDir, arco[arco.length - 1]) < limite) arco.pop();
  if (arco.length === 0) throw new ErroDeCurva(campo, `o arco inteiro cabe em menos de ${fmt(fundirAbaixoDe)} de largura junto à base y = ${fmt(base)} e some na fusão; use um fundirAbaixoDe menor`);
  const entre = [];
  if (corteEsq[0] - a[0] >= limite) entre.push(corteEsq);
  entre.push(...arco);
  if (b[0] - corteDir[0] >= limite) entre.push(corteDir);

  const saida = [];
  const empurrar = (p) => {
    const q = [arredondar(p[0]), arredondar(p[1])];
    const u = saida[saida.length - 1];
    if (u && Math.abs(q[0] - u[0]) <= EPS && Math.abs(q[1] - u[1]) <= EPS) return;
    saida.push(q);
  };
  P.slice(0, i + 1).forEach(empurrar);
  entre.forEach(empurrar);
  P.slice(i + 1).forEach(empurrar);
  const primeiro = saida[0], ultimo = saida[saida.length - 1];
  if (saida.length > 1 && Math.abs(primeiro[0] - ultimo[0]) <= EPS && Math.abs(primeiro[1] - ultimo[1]) <= EPS) saida.pop();
  const diagnostico = diagnosticarContorno(saida);
  if (diagnostico) throw new ErroDeCurva(campo, `o arco recortado não deixa um polígono simples (o arco atravessa outra parte do perfil, ou o raio passa de um vizinho): ${diagnostico.mensagem}`);
  return saida;
}
