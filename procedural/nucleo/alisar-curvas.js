/* alisar-curvas.js — os pontos-chave de uma curva declarada alisados pela curva de variação mínima linearizada
 *
 * FICHA alisarPontosDaCurva
 * serve: alisar os pontos-chave digitados de uma curva (lidos de imagem, ponto a ponto) sem tirá-la dos pontos duros nem de um limite.
 * quando: a curva ondula porque cada ponto-chave tem o erro da leitura; numa gaiolaPorRede use a opção alisarCurvas, que chama esta função
 *   em cada curva antes de montar a gaiola; para o miolo dos retalhos já há o `liso` da rede.
 * unidades: mm na entrada e na saída.
 * campos:
 *   pontos: [[x, y, z]] os pontos-chave da curva, em ordem.
 *   fechada: true se a curva dá a volta (o último ponto não repete o primeiro).
 *   duros: índices dos pontos que não se mexem; na curva aberta as duas pontas são sempre duras.
 *   partir: índices onde a curva se parte em trechos alisados à parte (o canto); são duros também.
 *   energia: 'variacao' (padrão, a terceira diferença) ou 'curvatura' (a segunda, que achata o arco).
 *   rigidez: o peso da energia contra o desvio aos pontos dados (1000 por padrão).
 *   tolerancia: o maior deslocamento de um ponto, em mm (1 por padrão).
 *   silhueta: { vista: 'x' | 'y' | 'z', tolerancia } o maior deslocamento visto ao longo do eixo da vista, em mm.
 *   iteracoes: quantas vezes a parametrização se refaz pelo comprimento da corda da curva alisada (2 por padrão).
 * devolve: { pontos, deslocamentos, limitados, duros, variacaoAntes, variacaoDepois, maiorDeslocamento }.
 * exemplo:
 *   alisarPontosDaCurva([[0, 0, 0], [100, 1.5, 0], [200, -1, 0], [300, 0.8, 0], [400, 0, 0]], { tolerancia: 2 })
 * peça: tools/fixtures/correcao-de-superficie/rede-com-ruido (a rede com ruído de 2 mm, alisada pela opção alisarCurvas da gaiolaPorRede).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio. A curva de variação mínima (Moreton e Séquin, 1992) minimiza a integral do quadrado da derivada
 * da curvatura, e não a da curvatura: por isso não achata um arco legítimo e tira o ziguezague de curvatura que o pente mostra. O problema
 * exato não é linear; a versão linearizada usada aqui troca a derivada da curvatura pela terceira derivada da curva em relação ao
 * comprimento de arco, medida pela terceira diferença dividida dos pontos sobre o parâmetro do comprimento da corda (a soma das distâncias
 * entre pontos seguidos). Cada quatro pontos seguidos dão um resíduo r = 3! · h³ · f[t0, t1, t2, t3], com h a corda média do trecho, que
 * na curva de espaçamento uniforme é a terceira diferença comum, em mm. A terceira derivada de uma curva de curvatura constante não é
 * zero: no arco ela é -κ² vezes a tangente. Por isso a energia pesa só a parte do resíduo fora da tangente da corda do meio dos quatro
 * pontos (no círculo amostrado por igual a terceira diferença é exatamente tangente a essa corda), e o arco, o círculo e a parábola
 * amostrada ficam onde estão; sem isso, um quarto de círculo de 1 m em dez trechos andava 52 mm. A tangente sai da curva da volta
 * anterior. Com `energia: 'curvatura'` o resíduo é o de três pontos, 2! · h² · f[t0, t1, t2], inteiro, a viga de menor flexão, que puxa
 * a curva para a reta.
 *
 * O sistema. A curva alisada p minimiza Σ |p_i - p0_i|² (os pontos livres) + rigidez · Σ |Q_j r_j|², com Q_j = I - T_j T_jᵀ (a
 * identidade na energia de curvatura) e os pontos duros fixos e eliminados do sistema. A matriz é simétrica, definida positiva e em banda
 * (cada ponto toca os três vizinhos de cada lado, com as três coordenadas acopladas pela tangente), e se resolve pelo gradiente conjugado
 * do núcleo (`gradienteConjugado`, de `gaiola-por-rede-liso.js`), em ordem fixa de pontos. Com a rigidez de 1000, a componente de mais alta frequência (a do ziguezague ponto a ponto) cai a menos de 1/60 000
 * e a de dez pontos por onda a 1/57; a de grau 2 fica onde está. A parametrização e as tangentes se refazem pela curva alisada `iteracoes` vezes.
 *
 * Os pontos duros, os trechos e o limite. Os pontos duros (os que o chamador marca, mais as pontas da curva aberta) ficam onde estão,
 * bit a bit. Os pontos de `partir` são duros e cortam a curva: cada trecho entre dois deles se alisa sozinho, e a energia não atravessa
 * o canto. Depois de resolver, o ponto que andou mais que `tolerancia` (em mm, a distância em 3D), ou cujo deslocamento visto pela
 * `silhueta` (o que sobra tirando a componente ao longo do eixo da vista, isto é, o que a vista da prancha mostra) passa da tolerância
 * dela, tem o peso do desvio multiplicado (por 1,5 vezes o quadrado da razão ao limite, no mínimo 2; só nas duas coordenadas da vista,
 * se é a silhueta que passa), e o sistema se resolve de novo, até nenhum passar ou 40 voltas; os de peso subido saem em `limitados`. Com
 * peso, a curva continua o mínimo de uma energia em que a dada é candidata, e por isso a variação nunca sobe pelo limite (prender o ponto
 * no deslocamento cortado, o primeiro jeito tentado, fazia a variação de curvas lidas de prancha subir até 26%). O limite nunca é
 * ultrapassado: o ponto que ainda passar depois das voltas é cortado ao limite, como última operação.
 *
 * O relatório. `deslocamentos[i]` é quanto o ponto i andou (mm), `variacaoAntes` e `variacaoDepois` são Σ |r_j|² (mm²) com a parametrização
 * da curva dada, que é a medida do quanto a curva ondula, e `maiorDeslocamento` é o maior dos deslocamentos. Tudo é determinístico: a mesma
 * curva dá os mesmos números, bit a bit. */

import { gradienteConjugado } from './gaiola-por-rede-liso.js';

export const ALISAR_CURVAS_PADRAO = Object.freeze({ energia: 'variacao', rigidez: 1000, tolerancia: 1, iteracoes: 2 });
const ORDEM = Object.freeze({ variacao: 3, curvatura: 2 });
const EIXO = Object.freeze({ x: 0, y: 1, z: 2 });
const VOLTAS_DO_LIMITE = 40;

const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const fatorial = (k) => (k <= 1 ? 1 : k * fatorial(k - 1));

function falha(texto) { throw new TypeError(`alisar curvas: ${texto}`); }

/** Lê e confere as opções do alisamento de uma curva; `onde` diz quem as declarou, para a recusa. */
export function lerOpcoesDoAlisamento(opcoes = {}, onde = 'o alisamento') {
  const o = { ...ALISAR_CURVAS_PADRAO, silhueta: null, ...Object.fromEntries(Object.entries(opcoes ?? {}).filter(([, v]) => v != null)) };
  if (!Object.hasOwn(ORDEM, o.energia)) falha(`${onde} tem energia ${JSON.stringify(o.energia)}; use 'variacao' (a terceira diferença, padrão) ou 'curvatura'`);
  if (!(typeof o.rigidez === 'number' && Number.isFinite(o.rigidez) && o.rigidez > 0)) falha(`${onde} tem rigidez ${JSON.stringify(o.rigidez)}; a rigidez é número finito maior que zero (1000 por padrão)`);
  if (!(typeof o.tolerancia === 'number' && Number.isFinite(o.tolerancia) && o.tolerancia > 0)) falha(`${onde} tem tolerancia ${JSON.stringify(o.tolerancia)}; a tolerância é o maior deslocamento de um ponto, número finito maior que zero, em mm`);
  if (!(Number.isInteger(o.iteracoes) && o.iteracoes >= 1 && o.iteracoes <= 10)) falha(`${onde} tem iteracoes ${JSON.stringify(o.iteracoes)}; use um inteiro de 1 a 10`);
  if (o.silhueta !== null) {
    const s = o.silhueta;
    if (!s || typeof s !== 'object' || Array.isArray(s) || !Object.hasOwn(EIXO, s.vista)) falha(`${onde} tem silhueta ${JSON.stringify(s)}; a silhueta é { vista: 'x' | 'y' | 'z', tolerancia } em mm`);
    const extra = Object.keys(s).filter((k) => k !== 'vista' && k !== 'tolerancia');
    if (extra.length) falha(`${onde} tem na silhueta o campo ${extra.map((k) => `'${k}'`).join(', ')}, que não existe; use vista e tolerancia`);
    if (!(typeof s.tolerancia === 'number' && Number.isFinite(s.tolerancia) && s.tolerancia > 0)) falha(`${onde} tem silhueta.tolerancia ${JSON.stringify(s.tolerancia)}; é o maior deslocamento visto pela vista '${s.vista}', número finito maior que zero, em mm`);
  }
  return o;
}

/* Os coeficientes da diferença dividida de ordem k sobre os parâmetros t: Σ f_i / Π_{j≠i} (t_i - t_j). */
function coeficientesDaDiferenca(t) {
  return t.map((ti, i) => { let p = 1; for (let j = 0; j < t.length; j++) if (j !== i) p *= ti - t[j]; return 1 / p; });
}

/* Os resíduos de um trecho: cada um a lista [[índice do ponto, coeficiente]] de k + 1 pontos seguidos, com o parâmetro do comprimento
   da corda de `P`. `indices` é a sequência de pontos do trecho e `ciclico` diz se ele dá a volta. */
function residuosDoTrecho(indices, P, k, ciclico) {
  const m = indices.length;
  const cordas = [];
  const voltas = ciclico ? m : m - 1;
  for (let a = 0; a < voltas; a++) cordas.push(distancia(P[indices[a]], P[indices[(a + 1) % m]]));
  const h = cordas.reduce((s, c) => s + c, 0) / cordas.length;
  const escala = fatorial(k) * h ** k;
  const linhas = [];
  const inicios = ciclico ? m : m - k;
  for (let j = 0; j < inicios; j++) {
    const t = [0];
    for (let a = 0; a < k; a++) t.push(t[a] + cordas[(j + a) % cordas.length]);
    const c = coeficientesDaDiferenca(t);
    linhas.push(c.map((v, a) => [indices[(j + a) % m], v * escala]));
  }
  return linhas;
}

/* Σ |Q r|² dos resíduos sobre as posições P, com a tangente de cada resíduo tirada quando `tangentes` é dada. */
function variacao(linhas, P, tangentes) {
  let s = 0;
  linhas.forEach((L, j) => {
    const r = [0, 0, 0];
    for (const [i, c] of L) { r[0] += c * P[i][0]; r[1] += c * P[i][1]; r[2] += c * P[i][2]; }
    const T = tangentes ? tangentes[j] : null;
    if (T) { const t = r[0] * T[0] + r[1] * T[1] + r[2] * T[2]; r[0] -= t * T[0]; r[1] -= t * T[1]; r[2] -= t * T[2]; }
    s += r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
  });
  return s;
}

/* Os trechos da curva: listas de índices, cada uma aberta com as pontas em `partir` (ou nas pontas da curva), ou a volta inteira. */
function trechosDaCurva(n, fechada, partir) {
  const cortes = [...partir].sort((a, b) => a - b);
  if (!fechada) {
    const marcos = [...new Set([0, ...cortes, n - 1])].sort((a, b) => a - b);
    const trechos = [];
    for (let q = 0; q + 1 < marcos.length; q++) trechos.push({ indices: Array.from({ length: marcos[q + 1] - marcos[q] + 1 }, (_, a) => marcos[q] + a), ciclico: false });
    return trechos;
  }
  if (!cortes.length) return [{ indices: Array.from({ length: n }, (_, a) => a), ciclico: true }];
  const trechos = [];
  for (let q = 0; q < cortes.length; q++) {
    const a = cortes[q]; const b = cortes[(q + 1) % cortes.length];
    const comp = ((b - a + n - 1) % n) + 1;
    trechos.push({ indices: Array.from({ length: comp + 1 }, (_, s) => (a + s) % n), ciclico: false });
  }
  return trechos;
}

/* A tangente de cada resíduo da energia de variação: a direção da corda do meio dos quatro pontos, sobre as posições P. Na curva de
   curvatura constante a terceira diferença é tangente a essa corda (no círculo amostrado por igual, exatamente), e é essa parte que sai
   da energia: o que sobra é a variação da curvatura. */
function tangentesDosResiduos(linhas, P) {
  return linhas.map((L) => {
    const a = P[L[1][0]]; const b = P[L[2][0]];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...d);
    return l > 0 ? d.map((v) => v / l) : null;
  });
}

/* Resolve um trecho: as posições novas dos pontos livres dele, com os fixos em `fixos` (Map índice -> posição). Com tangentes, cada
   resíduo pesa só a parte fora da tangente dele, Q r com Q = I - T Tᵀ, e as três coordenadas se acoplam num sistema só de 3m variáveis. */
function resolverTrecho(trecho, P0, pesos, fixos, linhas, tangentes, rigidez, saida) {
  const livres = [...new Set(trecho.indices)].filter((i) => !fixos.has(i));
  if (!livres.length) return;
  const posDoLivre = new Map(livres.map((i, a) => [i, a]));
  const m = livres.length;
  const A = Array.from({ length: 3 * m }, () => new Map());
  const b = new Float64Array(3 * m);
  const somar = (u, v, x) => A[u].set(v, (A[u].get(v) ?? 0) + x);
  for (let a = 0; a < m; a++) for (let q = 0; q < 3; q++) { const w = pesos[livres[a]][q]; somar(3 * a + q, 3 * a + q, w); b[3 * a + q] = w * P0[livres[a]][q]; }
  linhas.forEach((L, j) => {
    const T = tangentes ? tangentes[j] : null;
    const Q = [0, 1, 2].map((q) => [0, 1, 2].map((s) => (q === s ? 1 : 0) - (T ? T[q] * T[s] : 0)));
    const r = [0, 0, 0];
    for (const [i, c] of L) if (fixos.has(i)) { const p = fixos.get(i); r[0] += c * p[0]; r[1] += c * p[1]; r[2] += c * p[2]; }
    const Qr = Q.map((linha) => linha[0] * r[0] + linha[1] * r[1] + linha[2] * r[2]);
    for (const [i, ci] of L) {
      if (!posDoLivre.has(i)) continue;
      const a = posDoLivre.get(i);
      for (let q = 0; q < 3; q++) b[3 * a + q] -= rigidez * ci * Qr[q];
      for (const [k, ck] of L) {
        if (!posDoLivre.has(k)) continue;
        const d = posDoLivre.get(k);
        for (let q = 0; q < 3; q++) for (let s = 0; s < 3; s++) if (Q[q][s] !== 0) somar(3 * a + q, 3 * d + s, rigidez * ci * ck * Q[q][s]);
      }
    }
  });
  const colunas = A.map((linha) => [...linha].sort((x, y) => x[0] - y[0]));
  const diag = Float64Array.from(colunas.map((linha, u) => linha.find(([v]) => v === u)[1]));
  const x = gradienteConjugado(colunas, diag, 0, b);
  for (let a = 0; a < m; a++) saida[livres[a]] = [x[3 * a], x[3 * a + 1], x[3 * a + 2]];
}

/* Quanto o deslocamento d passa de cada limite: a razão (maior que 1 quando passa) da distância em 3D e da vista da silhueta. */
function excessos(d, tolerancia, silhueta) {
  const total = Math.hypot(...d) / tolerancia;
  if (!silhueta) return { total, visto: 0 };
  const q = EIXO[silhueta.vista];
  return { total, visto: Math.hypot(...d.filter((_, a) => a !== q)) / silhueta.tolerancia };
}

/* O deslocamento d cortado aos limites: primeiro o que a vista da silhueta mostra, depois a distância em 3D. */
function cortarAoLimite(d, tolerancia, silhueta) {
  let e = [...d];
  if (silhueta) {
    const q = EIXO[silhueta.vista];
    const visto = Math.hypot(...e.filter((_, a) => a !== q));
    if (visto > silhueta.tolerancia) { const s = silhueta.tolerancia / visto; e = e.map((v, a) => (a === q ? v : v * s)); }
  }
  const total = Math.hypot(...e);
  if (total > tolerancia) { const s = tolerancia / total; e = e.map((v) => v * s); }
  return e;
}

function passaDoLimite(d, tolerancia, silhueta) {
  if (Math.hypot(...d) > tolerancia) return true;
  if (!silhueta) return false;
  const q = EIXO[silhueta.vista];
  return Math.hypot(...d.filter((_, a) => a !== q)) > silhueta.tolerancia;
}

/**
 * alisarPontosDaCurva(pontos, opcoes) -> { pontos, deslocamentos, limitados, duros, variacaoAntes, variacaoDepois, maiorDeslocamento }
 *   pontos: [[x, y, z]] em mm; opcoes: { fechada, duros, partir, energia, rigidez, tolerancia, silhueta, iteracoes }, descritas na ficha.
 *   Devolve as posições novas sem mexer nas dadas.
 */
export function alisarPontosDaCurva(pontos, opcoes = {}) {
  const { fechada = false, duros = [], partir = [], onde = 'o alisamento', ...resto } = opcoes;
  const o = lerOpcoesDoAlisamento(resto, onde);
  if (!Array.isArray(pontos) || pontos.some((p) => !Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite))) falha(`${onde} recebeu pontos que não são [x, y, z] finitos em mm`);
  const n = pontos.length;
  const k = ORDEM[o.energia];
  const P0 = pontos.map((p) => [...p]);
  for (const lista of [duros, partir]) for (const i of lista) if (!(Number.isInteger(i) && i >= 0 && i < n)) falha(`${onde} cita o ponto ${JSON.stringify(i)} como duro ou corte; a curva tem os pontos de 0 a ${n - 1}`);
  const duro = new Set([...duros, ...partir, ...(fechada ? [] : [0, n - 1])]);
  const trechos = trechosDaCurva(n, fechada, new Set(partir));
  /* o trecho curto demais para a energia (menos de k + 1 pontos) não tem resíduo e fica como está */
  const linhasDe = (P) => trechos.map((tr) => (tr.indices.length >= k + 1 ? residuosDoTrecho(tr.indices, P, k, tr.ciclico) : []));
  const linhasDadas = linhasDe(P0);
  const comTangente = o.energia === 'variacao';
  const tangentesDe = (linhas, P) => linhas.map((L) => (comTangente ? tangentesDosResiduos(L, P) : null));
  const tangentesDadas = tangentesDe(linhasDadas, P0);
  const variacaoAntes = linhasDadas.reduce((s, L, q) => s + variacao(L, P0, tangentesDadas[q]), 0);
  const fixos = new Map([...duro].sort((a, b) => a - b).map((i) => [i, P0[i]]));
  /* o peso do desvio de cada coordenada de cada ponto: 1, e sobe no ponto que passa do limite (as três coordenadas, se passa da tolerância;
     as duas que a vista da silhueta mostra, se passa da dela), até nenhum passar */
  const pesos = P0.map(() => [1, 1, 1]);
  const limitados = new Set();
  let P = P0.map((p) => [...p]);
  for (let volta = 0; volta < VOLTAS_DO_LIMITE; volta++) {
    let linhas = linhasDadas; let tangentes = tangentesDadas;
    for (let it = 0; it < o.iteracoes; it++) {
      const novo = P0.map((p, i) => (fixos.has(i) ? [...fixos.get(i)] : [...p]));
      trechos.forEach((tr, q) => resolverTrecho(tr, P0, pesos, fixos, linhas[q], tangentes[q], o.rigidez, novo));
      P = novo;
      if (it + 1 < o.iteracoes) { linhas = linhasDe(P); tangentes = tangentesDe(linhas, P); }
    }
    let passou = false;
    for (let i = 0; i < n; i++) {
      if (fixos.has(i)) continue;
      const { total, visto } = excessos([P[i][0] - P0[i][0], P[i][1] - P0[i][1], P[i][2] - P0[i][2]], o.tolerancia, o.silhueta);
      if (total > 1) { const f = Math.max(2, 1.5 * total * total); for (let q = 0; q < 3; q++) pesos[i][q] *= f; }
      if (visto > 1) { const f = Math.max(2, 1.5 * visto * visto); const e = EIXO[o.silhueta.vista]; for (let q = 0; q < 3; q++) if (q !== e) pesos[i][q] *= f; }
      if (total > 1 || visto > 1) { passou = true; limitados.add(i); }
    }
    if (!passou) break;
  }
  /* o que ainda passar depois das voltas é cortado ao limite: o corte é a última palavra */
  for (let i = 0; i < n; i++) {
    if (duro.has(i)) { P[i] = [...P0[i]]; continue; }
    const d = [P[i][0] - P0[i][0], P[i][1] - P0[i][1], P[i][2] - P0[i][2]];
    if (passaDoLimite(d, o.tolerancia, o.silhueta)) { const e = cortarAoLimite(d, o.tolerancia, o.silhueta); P[i] = [P0[i][0] + e[0], P0[i][1] + e[1], P0[i][2] + e[2]]; limitados.add(i); }
  }
  const deslocamentos = P.map((p, i) => distancia(p, P0[i]));
  return {
    pontos: P,
    deslocamentos,
    limitados: [...limitados].sort((a, b) => a - b),
    duros: [...duro].sort((a, b) => a - b),
    variacaoAntes,
    variacaoDepois: linhasDadas.reduce((s, L, q) => s + variacao(L, P, tangentesDe([L], P)[0]), 0),
    maiorDeslocamento: deslocamentos.reduce((s, d) => Math.max(s, d), 0),
  };
}
