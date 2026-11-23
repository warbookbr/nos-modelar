/* conformar-na-chapa.js — conforma peças em trilho aberto ou contorno fechado sobre a superfície real de uma malha
 *
 * FICHA conformarNaChapa
 * serve: gera os passos de uma peça (trilho aberto varrido por `gaiolaVarrida` ou placa/lente fechada por contorno) colada à
 *   curvatura real da malha-alvo, com deslocamento normal em mm (positivo para fora, negativo para recuo).
 * quando: frisos, molduras, barras envolventes, placas ou lentes sobre qualquer superfície curva, para acompanhar
 *   automaticamente alterações da malha-alvo sem digitar coordenadas 3D manuais.
 * unidades: `deslocamentoMm`, `espessuraMm`, `secao` ({ largura, altura, chanfro? }), `amostragemMm` e `gradeMm` em mm;
 *   `unidade` ('mm' padrão ou 'm') define a escala da malha-alvo, de `trilho`/`contorno` e dos passos emitidos.
 * campos:
 *   malha (ou chapa): { passos, origem?, selecao?, parametros?, topo? } | { V, F, ids? } | { st, ids? } | função de amostragem.
 *   vista: 'x' | 'y' | 'z' | [vx, vy, vz] — direção da projeção ortogonal sobre a malha.
 *   sentido?: '+' | '-' (padrão '+') — lado da vista de onde os raios partem.
 *   trilho?: [[u, v], ...] — modo trilho aberto (pelo menos 2 pontos), com `secao: { largura, altura, chanfro? }` em mm.
 *   contorno?: [[u, v], ...] — modo contorno fechado (pelo menos 3 pontos), com `espessuraMm` (> 0).
 *   deslocamentoMm?: número (padrão 0) — deslocamento ao longo da normal da superfície em mm.
 *   nome?: texto (padrão 'peca') — nome da parte e prefixo dos pontos.
 *   parte?: texto | false — nome do passo `parte` emitido (false omite o passo `parte`).
 *   material?: texto — se informado, emite o passo `material` correspondente.
 *   origemId?: inteiro positivo — id da origem do passo `subdivisao` emitido.
 *   amostragemMm?: número — passo de amostragem ao longo do trilho ou borda do contorno, em mm.
 *   gradeMm?: número — tamanho máximo de aresta interna no contorno fechado, em mm.
 *   suavizarNormal?: booleano | inteiro >= 0 (padrão 3) — passagens de suavização da normal ao longo do trilho.
 *   niveis?: inteiro >= 0 (padrão 0) — níveis de subdivisão do passo emitido.
 *   simetria?: 'x' — espelha a metade x >= 0 em relação ao plano x = 0.
 * devolve: { modo, passos, pontos, origem, gaiola, estatisticas }.
 * exemplo:
 *   conformarNaChapa({
 *     malha: { passos: chapaPassos, origem: { op: 'subdivisao', id: 1 } },
 *     vista: 'z', sentido: '+',
 *     trilho: [[-100, 0], [0, 0], [100, 0]],
 *     secao: { largura: 16, altura: 8, chanfro: 2 },
 *     deslocamentoMm: 2,
 *     nome: 'friso', material: 'plastico',
 *   })
 * FIM DA FICHA
 */

import { nucleo } from './nucleo.js';
import { prepararPontoNaMalha } from './ponto-na-malha.js';
import { prepararRaios } from './selecao-geometrica.js';
import { seCruza2d } from './lamina-sobre-a-superficie.js';
import { gaiolaVarrida } from './gaiola-varrida.js';
import { conferirNormalDaGaiola } from './normal-da-gaiola.js';
import { triangularRegiao } from './forma-exata/triangular-regiao.js';

export const FICHA = Object.freeze({
  nome: 'conformarNaChapa',
  serve: 'gera os passos de uma peça em trilho aberto ou contorno fechado conformada à superfície real de uma ou mais malhas-alvo, com deslocamento normal em mm',
  quando: 'peças externas, molduras multipainel ou placas recuadas sobre superfícies curvas que precisam acompanhar automaticamente alterações da malha-alvo',
  unidades: {
    parametros: 'mm (deslocamentoMm, espessuraMm, secao, perfil, frestaMaximaMm, amostragemMm, gradeMm)',
    malha: "definida por `unidade` ('mm' padrão ou 'm')",
  },
  campos: ['malha', 'chapa', 'malhas', 'vista', 'sentido', 'trilho', 'contorno', 'secao', 'perfil', 'modulacao', 'frestaMaximaMm', 'deslocamentoMm', 'espessuraMm', 'nome', 'parte', 'material', 'origemId', 'amostragemMm', 'gradeMm', 'suavizarNormal', 'niveis', 'simetria', 'unidade'],
  devolve: '{ modo, passos, pontos, origem, gaiola, estatisticas }',
});

export class ErroConformarNaChapa extends Error {
  constructor(mensagem) {
    super(`conformarNaChapa: ${mensagem}`);
    this.name = 'ErroConformarNaChapa';
  }
}

const EPS = 1e-9;
const RASANTE_COS = 0.17;
const LIMITE_SUAVE_COS = 0.9063; // cos(25 deg)
const EIXOS = { x: 0, y: 1, z: 2 };

const falha = (msg) => { throw new ErroConformarNaChapa(msg); };
const finito = (x) => typeof x === 'number' && Number.isFinite(x);
const br = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');

const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const L = norma(a); return L > EPS ? esc(a, 1 / L) : null; };

function normalDaFace(V, vs) {
  let n = [0, 0, 0];
  for (let k = 0; k < vs.length; k += 1) {
    const a = V.get(vs[k]);
    const b = V.get(vs[(k + 1) % vs.length]);
    n = [
      n[0] + (a[1] - b[1]) * (a[2] + b[2]),
      n[1] + (a[2] - b[2]) * (a[0] + b[0]),
      n[2] + (a[0] - b[0]) * (a[1] + b[1]),
    ];
  }
  return unit(n) ?? [0, 0, 1];
}

function maiorOrigem(passos) {
  let max = 0;
  for (const p of passos) {
    if (Array.isArray(p) && p[1] && typeof p[1].origemId === 'number') {
      max = Math.max(max, p[1].origemId);
    }
  }
  return max;
}

function resolverBaseVista(vista, sentido) {
  if (sentido !== '+' && sentido !== '-') {
    falha(`sentido precisa ser '+' ou '-', e veio ${JSON.stringify(sentido)}`);
  }
  const sinal = sentido === '+' ? 1 : -1;
  if (typeof vista === 'string') {
    if (!(vista in EIXOS)) {
      falha(`vista precisa ser 'x', 'y', 'z' ou vetor [vx, vy, vz], e veio ${JSON.stringify(vista)}`);
    }
    if (vista === 'x') return { eu: [0, 1, 0], ev: [0, 0, 1], w: [1, 0, 0], dirRaio: [-sinal, 0, 0], sinal };
    if (vista === 'y') return { eu: [1, 0, 0], ev: [0, 0, 1], w: [0, 1, 0], dirRaio: [0, -sinal, 0], sinal };
    return { eu: [1, 0, 0], ev: [0, 1, 0], w: [0, 0, 1], dirRaio: [0, 0, -sinal], sinal };
  }
  if (Array.isArray(vista) && vista.length === 3 && vista.every(finito)) {
    const w = unit(vista);
    if (!w) falha(`vista vetor não pode ser nulo: ${JSON.stringify(vista)}`);
    const up = Math.abs(w[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    const eu = unit(cruz(up, w));
    const ev = unit(cruz(w, eu));
    return { eu, ev, w, dirRaio: esc(w, -sinal), sinal };
  }
  falha(`vista precisa ser 'x', 'y', 'z' ou vetor [vx, vy, vz], e veio ${JSON.stringify(vista)}`);
}

function prepararAmostrador(malha, base, sentido, escala) {
  if (typeof malha === 'function') {
    return {
      amostrar: (u, v) => {
        const res = malha([u, v], base.w, sentido);
        if (!res) return null;
        const n = unit(res.normal);
        if (!n) return null;
        return { ponto: res.ponto.map((x) => x / escala), normal: n };
      },
      origemSugerida: 1,
    };
  }
  if (!malha || typeof malha !== 'object') {
    falha(`malha precisa ser { passos, origem? }, { V, F, ids? } ou função de amostragem, e veio ${JSON.stringify(malha)}`);
  }

  let st = malha.st ?? null;
  let ids = malha.ids ?? null;
  let origemSugerida = 1;

  if (!st && malha.V instanceof Map && malha.F instanceof Map) {
    st = { V: malha.V, F: malha.F };
  } else if (!st && Array.isArray(malha.passos)) {
    origemSugerida = maiorOrigem(malha.passos) + 1;
    const passos = [...malha.passos];
    let nomeAlvo = null;
    if (malha.origem) {
      const doPasso = malha.origem.op === 'subdivisao'
        ? passos.find((p) => Array.isArray(p) && p[0] === 'subdivisao' && p[1]?.origemId === malha.origem.id)
        : null;
      const selOrigem = (!malha.origem.parte && doPasso?.[1]?.espessura != null)
        ? { ...malha.origem, parte: 'externa' }
        : malha.origem;
      nomeAlvo = '__alvo_conformar__';
      passos.push(['parte', { nome: nomeAlvo, sel: { origem: selOrigem } }]);
    }
    st = nucleo(passos, malha.parametros ?? {}, malha.topo ?? {}, {}, null, malha.aliases ?? []);
    const doAutor = st.orfaos.filter((x) => x.passo < malha.passos.length);
    if (st.orfaos.length) {
      const lista = doAutor.length ? doAutor : st.orfaos;
      falha(`os passos da malha-alvo foram recusados pelo núcleo: ${lista.slice(0, 3).map((x) => x.motivo).join('; ')}`);
    }
    if (nomeAlvo) {
      ids = [...st.F.values()].filter((f) => f.parte === nomeAlvo).map((f) => f.id);
    }
  } else if (!st) {
    falha('malha precisa informar `passos`, `{ V, F }` ou função de amostragem');
  }

  if (!ids) {
    if (typeof malha.selecao === 'function') {
      ids = [...st.F.values()].filter(malha.selecao).map((f) => f.id);
    } else {
      ids = [...st.F.keys()];
    }
  }
  if (!ids.length) falha('malha-alvo não possui nenhuma face selecionada');

  const raios = prepararRaios(st.V, st.F, ids);
  const grade = prepararPontoNaMalha(st.V, st.F, ids);

  let tMin = Infinity;
  let tMax = -Infinity;
  const vistosV = new Set();
  for (const id of ids) {
    const f = st.F.get(id);
    if (!f) continue;
    for (const vid of f.vs) {
      if (vistosV.has(vid)) continue;
      vistosV.add(vid);
      const p = st.V.get(vid);
      const t = dot(p, base.w);
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }
  }
  const margem = Math.max(0.1 * (tMax - tMin), 10 * escala, 1e-3);
  const tPartida = base.sinal > 0 ? tMax + margem : tMin - margem;

  const vizinhas = new Map();
  for (const id of ids) {
    const f = st.F.get(id);
    if (!f) continue;
    for (const v of f.vs) {
      if (!vizinhas.has(v)) vizinhas.set(v, []);
      vizinhas.get(v).push(id);
    }
  }

  const normalNoPonto = (faceId, ponto) => {
    const f = st.F.get(faceId);
    const n0 = normalDaFace(st.V, f.vs);
    const r = grade.maisProximo(ponto);
    let nm = n0;
    if (r && r.vertices) {
      let acc = [0, 0, 0];
      r.vertices.forEach((v, k) => {
        const lista = vizinhas.get(v) ?? [faceId];
        let somaV = [0, 0, 0];
        for (const fid of lista) {
          const ni = normalDaFace(st.V, st.F.get(fid).vs);
          if (dot(ni, n0) >= LIMITE_SUAVE_COS) somaV = soma(somaV, ni);
        }
        const Lv = unit(somaV) ?? n0;
        acc = soma(acc, esc(Lv, r.baricentro[k]));
      });
      nm = unit(acc) ?? n0;
    }
    if (dot(nm, base.dirRaio) > 0) nm = esc(nm, -1);
    return nm;
  };

  return {
    origemSugerida,
    amostrar: (u, v) => {
      const de = soma(soma(esc(base.eu, u * escala), esc(base.ev, v * escala)), esc(base.w, tPartida));
      const hit = raios.primeiro(de, base.dirRaio);
      if (!hit) return null;
      const normal = normalNoPonto(hit.face, hit.ponto);
      return {
        ponto: hit.ponto.map((x) => x / escala),
        normal,
      };
    },
  };
}

function suavizarNormais(estacoes, passagens) {
  const n = estacoes.length;
  if (n < 3 || passagens <= 0) return estacoes.map((e) => ({ ...e, n: [...e.n] }));
  let atuais = estacoes.map((e) => [...e.n]);
  for (let p = 0; p < passagens; p += 1) {
    const prox = atuais.map((v) => [...v]);
    for (let i = 1; i < n - 1; i += 1) {
      const d1 = Math.max(norma(sub(estacoes[i].c, estacoes[i - 1].c)), EPS);
      const d2 = Math.max(norma(sub(estacoes[i + 1].c, estacoes[i].c)), EPS);
      const w1 = 1 / d1;
      const w2 = 1 / d2;
      const w0 = w1 + w2;
      const combinado = soma(soma(esc(atuais[i - 1], w1), esc(atuais[i], w0)), esc(atuais[i + 1], w2));
      prox[i] = unit(combinado) ?? atuais[i];
    }
    atuais = prox;
  }
  return estacoes.map((e, i) => ({ ...e, n: atuais[i] }));
}

function amostrarPolilinha2d(pontos, amostragemMm, fechada) {
  const n = pontos.length;
  const nSeg = fechada ? n : n - 1;
  const saida = [];
  for (let k = 0; k < nSeg; k += 1) {
    const A = pontos[k];
    const B = pontos[(k + 1) % n];
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (!(L > EPS)) falha(`dois pontos consecutivos coincidem em [${br(A[0])}, ${br(A[1])}]`);
    const M = Math.max(1, Math.ceil(L / amostragemMm));
    for (let j = 0; j < M; j += 1) {
      const t = j / M;
      saida.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    }
  }
  if (!fechada) saida.push([...pontos[n - 1]]);
  return saida;
}

function prepararAmostradorMultiplo(malhas, base, sentido, escala) {
  if (!Array.isArray(malhas) || malhas.length === 0) {
    falha('malhas precisa ser uma lista não vazia de malhas-alvo');
  }
  const lista = malhas.map((m) => prepararAmostrador(m, base, sentido, escala));
  const origemSugerida = Math.max(...lista.map((a) => a.origemSugerida));
  return {
    origemSugerida,
    amostrar: (u, v) => {
      let melhor = null;
      let melhorScore = -Infinity;
      for (const a of lista) {
        const hit = a.amostrar(u, v);
        if (!hit) continue;
        const score = dot(hit.ponto, base.w) * base.sinal;
        if (score > melhorScore) {
          melhorScore = score;
          melhor = hit;
        }
      }
      return melhor;
    },
  };
}

function avaliarModulacaoTrilho(modulacao, s) {
  if (modulacao === undefined || modulacao === null) return 1;
  if (typeof modulacao === 'function') {
    const v = modulacao(s);
    if (!finito(v) || v <= 0) falha(`modulacao(${br(s)}) precisa devolver número finito > 0`);
    return v;
  }
  if (!Array.isArray(modulacao) || modulacao.length === 0) {
    falha('modulacao precisa ser função ou lista não vazia de pares [s, fator]');
  }
  if (s <= modulacao[0][0]) return modulacao[0][1];
  const ult = modulacao[modulacao.length - 1];
  if (s >= ult[0]) return ult[1];
  for (let i = 0; i < modulacao.length - 1; i += 1) {
    const [s0, f0] = modulacao[i];
    const [s1, f1] = modulacao[i + 1];
    if (s >= s0 && s <= s1) {
      const t = s1 === s0 ? 0 : (s - s0) / (s1 - s0);
      const smooth = t * t * (3 - 2 * t);
      return f0 + (f1 - f0) * smooth;
    }
  }
  return ult[1];
}

function refinarAmostrasNaSuperficie(pts2d, amostrar, vistaVec, frestaMaximaMm = 0) {
  const lidos = pts2d.map((q) => {
    const hit = amostrar(q[0], q[1]);
    return { q, hit };
  });
  const misses = lidos.filter((x) => !x.hit);
  if (misses.length === lidos.length) {
    falha(`nenhum ponto do traçado atingiu a malha-alvo na vista (primeiro ponto [${br(lidos[0].q[0])}, ${br(lidos[0].q[1])}])`);
  }
  if (misses.length > 0) {
    if (!(frestaMaximaMm > 0)) {
      const m = misses[0];
      falha(`o ponto [${br(m.q[0])}, ${br(m.q[1])}] não atingiu a malha-alvo na vista`);
    }
    /* ponteia frestas internas até frestaMaximaMm por interpolação suave entre os apoios vizinhos */
    let i = 0;
    while (i < lidos.length) {
      if (lidos[i].hit) { i += 1; continue; }
      const ini = i;
      while (i < lidos.length && !lidos[i].hit) i += 1;
      const fim = i - 1;
      if (ini === 0 || fim === lidos.length - 1) {
        const m = lidos[ini];
        falha(`o ponto extremo [${br(m.q[0])}, ${br(m.q[1])}] não atingiu a malha-alvo na vista`);
      }
      const ant = lidos[ini - 1];
      const dep = lidos[fim + 1];
      const vao = Math.hypot(dep.q[0] - ant.q[0], dep.q[1] - ant.q[1]);
      if (vao > frestaMaximaMm) {
        falha(`fresta de ${br(vao)} mm entre [${br(ant.q[0])}, ${br(ant.q[1])}] e [${br(dep.q[0])}, ${br(dep.q[1])}] excede frestaMaximaMm (${br(frestaMaximaMm)} mm)`);
      }
      for (let k = ini; k <= fim; k += 1) {
        const t = (k - (ini - 1)) / (fim + 1 - (ini - 1));
        const ponto = [
          ant.hit.ponto[0] + (dep.hit.ponto[0] - ant.hit.ponto[0]) * t,
          ant.hit.ponto[1] + (dep.hit.ponto[1] - ant.hit.ponto[1]) * t,
          ant.hit.ponto[2] + (dep.hit.ponto[2] - ant.hit.ponto[2]) * t,
        ];
        const nInterp = unit(soma(esc(ant.hit.normal, 1 - t), esc(dep.hit.normal, t))) ?? ant.hit.normal;
        lidos[k].hit = { ponto, normal: nInterp };
      }
    }
  }

  for (const s of lidos) {
    const cos = Math.abs(dot(s.hit.normal, vistaVec));
    if (cos < RASANTE_COS) {
      falha(`a superfície fica rasante à vista no ponto [${br(s.q[0])}, ${br(s.q[1])}] (ângulo ${br(Math.acos(Math.min(1, cos)) * 180 / Math.PI)} graus)`);
    }
  }

  const refinar = (A, B, prof) => {
    const cos = Math.max(-1, Math.min(1, dot(A.hit.normal, B.hit.normal)));
    const ang = Math.acos(cos) * 180 / Math.PI;
    if (ang <= 8 || prof >= 8) return [];
    if (Math.hypot(A.q[0] - B.q[0], A.q[1] - B.q[1]) <= 1) return [];
    const q = [(A.q[0] + B.q[0]) / 2, (A.q[1] + B.q[1]) / 2];
    const hit = amostrar(q[0], q[1]);
    if (!hit) return [];
    const M = { q, hit };
    return [...refinar(A, M, prof + 1), M, ...refinar(M, B, prof + 1)];
  };

  const todos = [];
  for (let i = 0; i + 1 < lidos.length; i += 1) {
    todos.push(lidos[i], ...refinar(lidos[i], lidos[i + 1], 0));
  }
  todos.push(lidos[lidos.length - 1]);
  return todos.map((s) => ({ q: s.q, c: s.hit.ponto, n: s.hit.normal }));
}

function construirSecao(largura, altura, chanfro, deslocamentoMm) {
  const hw = largura / 2;
  const u0 = deslocamentoMm;
  const u1 = deslocamentoMm + altura;
  if (!(chanfro > 0)) {
    return [
      [u0, -hw],
      [u1, -hw],
      [u1, hw],
      [u0, hw],
    ];
  }
  return [
    [u0, -hw + chanfro],
    [u0 + chanfro, -hw],
    [u1 - chanfro, -hw],
    [u1, -hw + chanfro],
    [u1, hw - chanfro],
    [u1 - chanfro, hw],
    [u0 + chanfro, hw],
    [u0, hw - chanfro],
  ];
}

function conferirCurvaturaEAbaixoDaMeiaSecao(estacoes, secao, deslocamentoMm) {
  const { largura, altura } = secao;
  const meiaLargura = largura / 2;
  const meiaAltura = altura / 2;
  const dMax = Math.max(Math.abs(deslocamentoMm), Math.abs(deslocamentoMm + altura), meiaAltura);

  for (let i = 0; i + 1 < estacoes.length; i += 1) {
    const a = estacoes[i];
    const b = estacoes[i + 1];
    const dp = sub(b.c, a.c);
    const ds = norma(dp);
    if (!(ds > EPS)) continue;
    const T = esc(dp, 1 / ds);

    // Curvatura normal: quando as normais convergem no lado do deslocamento/seção
    const dn = sub(b.n, a.n);
    const convN = -dot(T, dn);
    const angN = Math.acos(Math.max(-1, Math.min(1, dot(a.n, b.n))));
    if (angN > 1e-4) {
      const raioNormal = ds / angN;
      if (convN > EPS && raioNormal < meiaAltura && (ds + dot(dn, esc(T, dMax))) <= 0) {
        falha(`raio local de curvatura normal (${br(raioNormal)} mm) menor que a meia-seção (${br(meiaAltura)} mm) causa dobra/auto-interseção no ponto [${br(a.q[0])}, ${br(a.q[1])}]`);
      }
      for (const off of [deslocamentoMm, deslocamentoMm + altura]) {
        const pA = soma(a.c, esc(a.n, off));
        const pB = soma(b.c, esc(b.n, off));
        if (dot(sub(pB, pA), T) <= 0) {
          falha(`dobra/auto-interseção na seção (deslocamento ${br(off)} mm) no ponto [${br(a.q[0])}, ${br(a.q[1])}] (raio ${br(raioNormal)} mm para meia-seção ${br(meiaAltura)} mm)`);
        }
      }
    }

    // Curvatura lateral no plano tangente (projetada no plano perpendicular a a.n)
    if (i > 0) {
      const prev = estacoes[i - 1];
      const dpPrev = sub(a.c, prev.c);
      const dsPrev = norma(dpPrev);
      if (dsPrev > EPS) {
        const Tprev = esc(dpPrev, 1 / dsPrev);
        const TprevTan = unit(sub(Tprev, esc(a.n, dot(Tprev, a.n))));
        const TTan = unit(sub(T, esc(a.n, dot(T, a.n))));
        if (TprevTan && TTan) {
          const angLat = Math.acos(Math.max(-1, Math.min(1, dot(TprevTan, TTan))));
          if (angLat > 0.05) {
            const dsMed = (dsPrev + ds) / 2;
            const raioLat = dsMed / angLat;
            if (raioLat < meiaLargura) {
              falha(`raio local de curvatura lateral (${br(raioLat)} mm) menor que a meia-largura da seção (${br(meiaLargura)} mm) causa dobra/auto-interseção no ponto [${br(a.q[0])}, ${br(a.q[1])}]`);
            }
          }
        }
      }
    }
  }
}

function executarTrilho(o, amostrador, base, escala, origemId) {
  if (!Array.isArray(o.trilho) || o.trilho.length < 2 || o.trilho.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(finito))) {
    falha('trilho precisa ser lista de pelo menos 2 pontos [[u, v], ...] com números finitos');
  }
  const temPerfil = o.perfil != null;
  const sec = o.secao;
  let secao2d;
  let caixaSecao;
  const deslocamentoMm = o.deslocamentoMm ?? 0;
  if (!finito(deslocamentoMm)) falha(`deslocamentoMm precisa ser número finito, e veio ${JSON.stringify(o.deslocamentoMm)}`);

  if (temPerfil) {
    if (!Array.isArray(o.perfil) || o.perfil.length < 3 || o.perfil.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(finito))) {
      falha('perfil precisa ser lista de pelo menos 3 pontos [[u, v], ...] em mm');
    }
    secao2d = o.perfil.map(([u, v]) => [u + deslocamentoMm, v]);
    const us = o.perfil.map(([u]) => u);
    const vs = o.perfil.map(([, v]) => v);
    caixaSecao = {
      largura: Math.max(...vs) - Math.min(...vs),
      altura: Math.max(...us) - Math.min(...us),
      chanfro: 0,
    };
  } else {
    if (!sec || typeof sec !== 'object' || !finito(sec.largura) || !(sec.largura > 0) || !finito(sec.altura) || !(sec.altura > 0)) {
      falha(`secao precisa informar { largura > 0, altura > 0, chanfro? } em mm, e veio ${JSON.stringify(sec)}`);
    }
    const chanfro = sec.chanfro ?? 0;
    if (!finito(chanfro) || chanfro < 0 || chanfro >= Math.min(sec.largura, sec.altura) / 2) {
      falha(`secao.chanfro precisa ser >= 0 e menor que metade de largura e altura (${br(Math.min(sec.largura, sec.altura) / 2)} mm), e veio ${JSON.stringify(chanfro)}`);
    }
    secao2d = construirSecao(sec.largura, sec.altura, chanfro, deslocamentoMm);
    caixaSecao = { largura: sec.largura, altura: sec.altura, chanfro };
  }

  const amostragemMm = o.amostragemMm ?? 10;
  if (!finito(amostragemMm) || !(amostragemMm > 0)) falha(`amostragemMm precisa ser > 0, e veio ${JSON.stringify(o.amostragemMm)}`);

  const suavizarPassagens = o.suavizarNormal === false ? 0 : o.suavizarNormal === true ? 3 : (o.suavizarNormal ?? 3);
  if (!Number.isInteger(suavizarPassagens) || suavizarPassagens < 0) {
    falha(`suavizarNormal precisa ser booleano ou inteiro >= 0, e veio ${JSON.stringify(o.suavizarNormal)}`);
  }

  const frestaMaximaMm = o.frestaMaximaMm ?? (Array.isArray(o.malhas) ? 12 : 0);
  if (!finito(frestaMaximaMm) || frestaMaximaMm < 0) {
    falha(`frestaMaximaMm precisa ser número >= 0, e veio ${JSON.stringify(o.frestaMaximaMm)}`);
  }

  const trilhoMm = o.trilho.map(([u, v]) => [u / escala, v / escala]);
  const pts2d = amostrarPolilinha2d(trilhoMm, amostragemMm, false);
  const amostradas = refinarAmostrasNaSuperficie(pts2d, amostrador.amostrar, base.w, frestaMaximaMm);
  const estacoes = suavizarNormais(amostradas, suavizarPassagens);

  conferirCurvaturaEAbaixoDaMeiaSecao(estacoes, caixaSecao, deslocamentoMm);
  const pontos3d = estacoes.map((s) => s.c);
  const marcos = [];
  let sAcum = 0;
  marcos.push({ em: 0 });
  for (let i = 1; i < pontos3d.length; i += 1) {
    sAcum += norma(sub(pontos3d[i], pontos3d[i - 1]));
    marcos.push({ em: sAcum });
  }

  const nome = o.nome ?? 'peca';
  const g = gaiolaVarrida({
    nome,
    trilho: { pontos: pontos3d },
    quadro: { u: estacoes[0].n, modo: 'acompanha' },
    secao: secao2d,
    fechada: true,
    tampas: true,
    estacoes: marcos,
  });

  // Garante alinhamento exato de cada estação com a normal suavizada da superfície real
  // mesmo em curvas 3D com torção onde o transporte paralelo do quadro possa derivar.
  const nEst = estacoes.length;
  for (let i = 0; i < nEst; i += 1) {
    const s = estacoes[i];
    const ant = i > 0 ? estacoes[i - 1].c : s.c;
    const dep = i + 1 < nEst ? estacoes[i + 1].c : s.c;
    const T = unit(sub(dep, ant)) ?? unit(sub(estacoes[1].c, estacoes[0].c));
    if (!T) continue;
    const uDir = s.n;
    const vDir = unit(cruz(T, uDir));
    if (!vDir) continue;
    const sNorm = sAcum > EPS ? marcos[i].em / sAcum : 0;
    const fator = avaliarModulacaoTrilho(o.modulacao, sNorm);
    for (let j = 0; j < secao2d.length; j += 1) {
      const [suBase, svBase] = secao2d[j];
      const su = deslocamentoMm + (suBase - deslocamentoMm) * fator;
      const sv = svBase * fator;
      const nomeV = g.nomeDe(i, j);
      const posReal = soma(s.c, soma(esc(uDir, su), esc(vDir, sv)));
      g.posicoes.set(nomeV, posReal);
      g.pontos[nomeV] = posReal.map((x) => x / 1000);
    }
  }

  // Confere orientação fechada via normalDaGaiola
  const posObj = Object.fromEntries(g.posicoes);
  const conf = conferirNormalDaGaiola({ pontos: posObj, faces: g.faces });
  if (conf.volume != null && conf.volume < 0) {
    g.faces = g.faces.map((f) => [...f].reverse());
  }

  const niveis = o.niveis ?? 0;
  const pontosNoPasso = {};
  const folgaSim = 1e-4 * escala;
  const verticesNumericos = g.vertices.map((nomeV) => {
    const pMm = g.posicoes.get(nomeV);
    const pUnidade = pMm.map((x) => x * escala);
    if (o.simetria === 'x') {
      if (pUnidade[0] < -folgaSim) {
        falha(`simetria: 'x' exige que toda a peça esteja no lado x >= 0 (achado x = ${br(pUnidade[0])})`);
      }
      if (Math.abs(pUnidade[0]) <= folgaSim) pUnidade[0] = 0;
    }
    pontosNoPasso[nomeV] = pUnidade;
    return pUnidade;
  });

  const idxDe = new Map(g.vertices.map((nomeV, k) => [nomeV, k]));
  let facesNumericas = g.faces.map((f) => f.map((nomeV) => idxDe.get(nomeV)));

  if (o.simetria === 'x') {
    const naCostura = (f) => f.every((idx) => verticesNumericos[idx][0] === 0);
    facesNumericas = facesNumericas.filter((f) => !naCostura(f));
    g.faces = g.faces.filter((f) => !f.every((nomeV) => pontosNoPasso[nomeV][0] === 0));
    g.vincos = g.vincos.filter((v) => !v.pontos.every((nomeV) => pontosNoPasso[nomeV][0] === 0));
  }

  const passoSubdivisao = niveis > 0 && g.vincos.length
    ? ['subdivisao', {
        origemId,
        vertices: g.vertices,
        faces: g.faces,
        vincos: g.vincos,
        cantos: g.cantos,
        niveis,
        ...(o.simetria ? { simetria: o.simetria } : {}),
      }]
    : ['subdivisao', {
        origemId,
        vertices: verticesNumericos,
        faces: facesNumericas,
        niveis,
        ...(o.simetria ? { simetria: o.simetria } : {}),
      }];

  return {
    gaiola: g,
    pontos: pontosNoPasso,
    passoSubdivisao,
    estatisticas: {
      estacoes: estacoes.length,
      comprimentoMm: g.comprimento,
      vertices: g.vertices.length,
      faces: g.faces.length,
    },
  };
}

function executarContorno(o, amostrador, base, escala, origemId) {
  if (!Array.isArray(o.contorno) || o.contorno.length < 3 || o.contorno.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(finito))) {
    falha('contorno precisa ser lista de pelo menos 3 pontos [[u, v], ...] com números finitos');
  }
  const contornoMm = o.contorno.map(([u, v]) => [u / escala, v / escala]);
  if (seCruza2d(contornoMm)) {
    falha('contorno fechado se auto-intercepta no plano da vista');
  }
  if (!finito(o.espessuraMm) || !(o.espessuraMm > 0)) {
    falha(`espessuraMm precisa ser número finito maior que zero, e veio ${JSON.stringify(o.espessuraMm)}`);
  }
  const deslocamentoMm = o.deslocamentoMm ?? 0;
  if (!finito(deslocamentoMm)) {
    falha(`deslocamentoMm precisa ser número finito, e veio ${JSON.stringify(o.deslocamentoMm)}`);
  }

  const amostragemMm = o.amostragemMm ?? 15;
  if (!finito(amostragemMm) || !(amostragemMm > 0)) {
    falha(`amostragemMm precisa ser > 0, e veio ${JSON.stringify(o.amostragemMm)}`);
  }
  const gradeMm = o.gradeMm ?? amostragemMm;
  if (!finito(gradeMm) || !(gradeMm > 0)) {
    falha(`gradeMm precisa ser > 0, e veio ${JSON.stringify(o.gradeMm)}`);
  }

  const borda2d = amostrarPolilinha2d(contornoMm, amostragemMm, true);
  const nBorda = borda2d.length;
  const laco = Array.from({ length: nBorda }, (_, i) => i);
  const regiao = triangularRegiao(borda2d, [laco], { tamanhoMaximo: gradeMm });

  // triangularRegiao sempre devolve triângulos CCW no plano 2D; se o contorno de entrada for CW (área < 0),
  // invertemos o laço da borda para manter as paredes consistentes com topo e base.
  let area2d = 0;
  for (let i = 0; i < nBorda; i += 1) {
    const a = borda2d[i];
    const b = borda2d[(i + 1) % nBorda];
    area2d += a[0] * b[1] - b[0] * a[1];
  }
  const lacoCCW = area2d >= 0 ? laco : [...laco].reverse();

  const amostradas = regiao.pontos.map((q) => {
    const hit = amostrador.amostrar(q[0], q[1]);
    if (!hit) {
      falha(`o ponto [${br(q[0])}, ${br(q[1])}] do contorno não atingiu a malha-alvo na vista`);
    }
    const cos = Math.abs(dot(hit.normal, base.w));
    if (cos < RASANTE_COS) {
      falha(`a superfície fica rasante à vista no ponto [${br(q[0])}, ${br(q[1])}] do contorno`);
    }
    return { q, c: hit.ponto, n: hit.normal };
  });

  const nPts = amostradas.length;
  const basePts = amostradas.map((s) => soma(s.c, esc(s.n, deslocamentoMm)));
  const topoPts = amostradas.map((s) => soma(s.c, esc(s.n, deslocamentoMm + o.espessuraMm)));

  // Garante orientação consistente do topo com a normal da superfície
  let somaOrient = 0;
  for (const [a, b, c] of regiao.triangulos) {
    const e1 = sub(topoPts[b], topoPts[a]);
    const e2 = sub(topoPts[c], topoPts[a]);
    const fn = cruz(e1, e2);
    const nMed = soma(soma(amostradas[a].n, amostradas[b].n), amostradas[c].n);
    somaOrient += dot(fn, nMed);
  }
  const trisTopo = somaOrient >= 0
    ? regiao.triangulos.map((t) => [...t])
    : regiao.triangulos.map(([a, b, c]) => [a, c, b]);

  // Monta faces fechadas: topo (0..nPts-1), base (nPts..2*nPts-1), e parede lateral na borda
  const facesTopo = trisTopo.map(([a, b, c]) => [nPts + a, nPts + b, nPts + c]);
  const facesBase = trisTopo.map(([a, b, c]) => [a, c, b]);
  const ordemBorda = somaOrient >= 0
    ? lacoCCW
    : [...lacoCCW].reverse();

  const facesParede = [];
  for (let k = 0; k < nBorda; k += 1) {
    const a = ordemBorda[k];
    const b = ordemBorda[(k + 1) % nBorda];
    facesParede.push([nPts + b, nPts + a, a, b]);
  }

  const verticesMm = [...basePts, ...topoPts];
  const faces = [...facesBase, ...facesTopo, ...facesParede];

  const nome = o.nome ?? 'peca';
  const nomesVertices = verticesMm.map((_, idx) => `${nome}_v${idx}`);
  const pontosObj = Object.fromEntries(nomesVertices.map((nm, idx) => [nm, verticesMm[idx]]));
  const facesNomeadas = faces.map((f) => f.map((idx) => nomesVertices[idx]));

  const conf = conferirNormalDaGaiola({ pontos: pontosObj, faces: facesNomeadas });
  let facesCorrigidas = conf.volume != null && conf.volume < 0
    ? faces.map((f) => [...f].reverse())
    : faces;

  const folgaSim = 1e-4 * escala;
  const verticesUnidade = verticesMm.map((p) => {
    const u = p.map((x) => x * escala);
    if (o.simetria === 'x') {
      if (u[0] < -folgaSim) {
        falha(`simetria: 'x' exige que toda a peça esteja no lado x >= 0 (achado x = ${br(u[0])})`);
      }
      if (Math.abs(u[0]) <= folgaSim) u[0] = 0;
    }
    return u;
  });

  if (o.simetria === 'x') {
    facesCorrigidas = facesCorrigidas.filter((f) => !f.every((idx) => verticesUnidade[idx][0] === 0));
  }

  const pontosNoPasso = Object.fromEntries(nomesVertices.map((nm, idx) => [nm, verticesUnidade[idx]]));
  const niveis = o.niveis ?? 0;

  const passoSubdivisao = ['subdivisao', {
    origemId,
    vertices: verticesUnidade,
    faces: facesCorrigidas,
    niveis,
    ...(o.simetria ? { simetria: o.simetria } : {}),
  }];

  return {
    gaiola: {
      nome,
      vertices: nomesVertices,
      faces: facesCorrigidas.map((f) => f.map((idx) => nomesVertices[idx])),
      pontos: pontosNoPasso,
      vincos: [],
      cantos: [],
    },
    pontos: pontosNoPasso,
    passoSubdivisao,
    estatisticas: {
      pontosBorda: nBorda,
      pontosInternos: nPts - nBorda,
      triangulosSuperficie: trisTopo.length,
      vertices: verticesUnidade.length,
      faces: facesCorrigidas.length,
    },
  };
}

/**
 * Conforma uma peça (trilho aberto ou contorno fechado) sobre a superfície real de uma malha-alvo.
 * @param {object} opcoes
 */
export function conformarNaChapa(opcoes) {
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) {
    falha(`opcoes precisa ser um objeto, e veio ${JSON.stringify(opcoes)}`);
  }

  const temTrilho = opcoes.trilho != null;
  const temContorno = opcoes.contorno != null;
  if (temTrilho === temContorno) {
    falha('declare exatamente um modo: `trilho` (aberto) ou `contorno` (fechado)');
  }

  const unidade = opcoes.unidade ?? 'mm';
  if (unidade !== 'mm' && unidade !== 'm') {
    falha(`unidade precisa ser 'mm' ou 'm', e veio ${JSON.stringify(unidade)}`);
  }
  const escala = unidade === 'm' ? 0.001 : 1;

  if (opcoes.simetria != null && opcoes.simetria !== 'x') {
    falha(`simetria só aceita 'x', e veio ${JSON.stringify(opcoes.simetria)}`);
  }

  const sentido = opcoes.sentido ?? '+';
  const base = resolverBaseVista(opcoes.vista, sentido);
  const amostrador = Array.isArray(opcoes.malhas)
    ? prepararAmostradorMultiplo(opcoes.malhas, base, sentido, escala)
    : prepararAmostrador(opcoes.malha ?? opcoes.chapa, base, sentido, escala);

  const origemId = opcoes.origemId ?? amostrador.origemSugerida;
  if (!Number.isSafeInteger(origemId) || origemId < 1) {
    falha(`origemId precisa ser inteiro positivo, e veio ${JSON.stringify(opcoes.origemId)}`);
  }

  const niveis = opcoes.niveis ?? 0;
  if (!Number.isInteger(niveis) || niveis < 0) {
    falha(`niveis precisa ser inteiro >= 0, e veio ${JSON.stringify(opcoes.niveis)}`);
  }

  const resultado = temTrilho
    ? executarTrilho(opcoes, amostrador, base, escala, origemId)
    : executarContorno(opcoes, amostrador, base, escala, origemId);

  const origem = { op: 'subdivisao', id: origemId };
  const sel = { origem };
  const passos = [resultado.passoSubdivisao];
  const nome = opcoes.nome ?? 'peca';
  if (opcoes.parte !== false) {
    passos.push(['parte', { nome: opcoes.parte ?? nome, sel }]);
  }
  if (typeof opcoes.material === 'string' && opcoes.material.length > 0) {
    passos.push(['material', { sel, usa: opcoes.material }]);
  }

  return {
    modo: temTrilho ? 'trilho' : 'contorno',
    passos,
    pontos: resultado.pontos,
    origem,
    gaiola: resultado.gaiola,
    estatisticas: resultado.estatisticas,
  };
}
