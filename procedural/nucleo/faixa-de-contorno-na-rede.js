/* faixa-de-contorno-na-rede.js — gera anéis concêntricos de relevo (chanfro, ombro vincado, bojo suave e aba interna)
 *   para composição direta em `gaiolaPorRede`, sem domínio de objeto.
 *
 * FICHA faixaDeContornoNaRede
 * serve: gera curvas paralelas, nós de ancoragem, vincos e retalhos de quadriláteros ao longo de um contorno aberto ou
 *   fechado sobre uma superfície curva, prontos para espalhar em `gaiolaPorRede`.
 * quando: relevos estampados ou moldados na própria chapa em volta de aberturas ou linhas de caráter (chanfro para dentro,
 *   ombro saliente com vinco externo, alargamento suave G1 e aba dobrada para dentro), antes do corte de painéis.
 * unidades: contorno, larguraMm, deslocamentoMm, profundidadeMm e passo em mm; saída em mm no formato de `gaiolaPorRede`.
 * campos:
 *   nome?: texto (padrão 'faixa') — prefixo determinístico de curvas, nós e retalhos gerados.
 *   contorno: [[x, y, z], ...] em mm — pontos-chave ao longo da curva base (mínimo 2 abertos ou 3 fechados).
 *   fechada?: booleano (padrão false) — indica se o contorno fecha em laço.
 *   fora: [nx, ny, nz] — sentido de referência da normal externa da superfície.
 *   projetar?: (ponto3d) => [x, y, z] | { ponto, normal } — projeta cada ponto deslocado sobre a superfície-guia.
 *   lado?: 'fora' | 'dentro' | 1 | -1 (padrão 'fora') — lado da curva no plano tangente para onde os anéis se expandem.
 *   faixas: [{ larguraMm, deslocamentoMm, vinco?, continuidade?, passo? }, ...] — estações do perfil transversal da borda para fora.
 *   deslocamentoBaseMm?: número (padrão 0) — deslocamento normal na própria curva base (multiplicado por `modulacao`).
 *   vincoBase?: número | 'viva' — nitidez de vinco opcional na curva base.
 *   modulacao?: (s) => fator | [[s, fator], ...] — modulação longitudinal do deslocamento normal ao longo de s em [0, 1].
 *   abaInterna?: { profundidadeMm, anguloGraus?, vinco? } — aba dobrada para o lado interno a partir da curva base.
 *   ancoras?: [indice, ...] — índices de `contorno` onde se criam nós e ligações radiais (padrão: pontas na aberta; 4 quadrantes na fechada).
 * devolve: { nos, curvas, retalhos, curvaBase, curvaExterna, curvaAba, nosExternos, estatisticas, avisos }.
 * exemplo:
 *   faixaDeContornoNaRede({ nome: 'borda', contorno: [[0, 0, 0], [50, 0, 50], [100, 0, 0]], fora: [0, 1, 0], lado: 'dentro', faixas: [{ larguraMm: 18, deslocamentoMm: 14 }, { larguraMm: 22, deslocamentoMm: 0, vinco: 0.7 }], deslocamentoBaseMm: 10, abaInterna: { profundidadeMm: 14 } })
 * peça: procedural/nucleo/fixtures/faixa-de-contorno-prova.js (chapa curva neutra com chanfro, ombro vincado, bojo G1 e corte multipainel).
 * FIM DA FICHA
 */

export const FICHA = Object.freeze({
  nome: 'faixaDeContornoNaRede',
  serve: 'gera anéis concêntricos de quadriláteros com perfil transversal livre, vincos, modulação longitudinal e aba interna para composição em gaiolaPorRede',
  quando: 'relevos estampados ou moldados na própria chapa em volta de aberturas ou curvas de caráter antes do corte de painéis',
  unidades: 'mm (entrada e saída compatíveis com gaiolaPorRede)',
  campos: ['nome', 'contorno', 'fechada', 'fora', 'projetar', 'lado', 'faixas', 'deslocamentoBaseMm', 'vincoBase', 'modulacao', 'abaInterna', 'ancoras'],
  devolve: '{ nos, curvas, retalhos, curvaBase, curvaExterna, curvaAba, nosExternos, estatisticas, avisos }',
});

export class ErroFaixaDeContorno extends RangeError {
  constructor(mensagem, detalhes = {}) {
    super(`faixaDeContornoNaRede: ${mensagem}`);
    this.name = 'ErroFaixaDeContorno';
    Object.assign(this, detalhes);
  }
}

const EPS = 1e-9;
const finito = (x) => typeof x === 'number' && Number.isFinite(x);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const esc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => { const l = norm(a); return l > EPS ? esc(a, 1 / l) : null; };
const arred = (x) => Math.round(x * 1e6) / 1e6;
const arredP = (p) => [arred(p[0]), arred(p[1]), arred(p[2])];

function avaliarModulacao(modulacao, s) {
  if (modulacao === undefined || modulacao === null) return 1;
  if (typeof modulacao === 'function') {
    const v = modulacao(s);
    if (!finito(v)) throw new ErroFaixaDeContorno(`modulacao(${s}) devolveu valor não finito`, { motivo: 'modulacao-invalida', s });
    return v;
  }
  if (!Array.isArray(modulacao) || modulacao.length === 0) {
    throw new ErroFaixaDeContorno('modulacao deve ser função ou lista não vazia de pares [s, fator]', { motivo: 'modulacao-invalida' });
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

function normalLocal(ponto, foraUnit, projetar) {
  if (!projetar) return { ponto, normal: foraUnit };
  const res = projetar(ponto);
  if (Array.isArray(res) && res.length === 3) {
    return { ponto: res, normal: foraUnit };
  }
  if (res && Array.isArray(res.ponto) && Array.isArray(res.normal)) {
    const n = unit(res.normal) ?? foraUnit;
    return { ponto: res.ponto, normal: dot(n, foraUnit) < 0 ? esc(n, -1) : n };
  }
  throw new ErroFaixaDeContorno('projetar deve devolver [x, y, z] ou { ponto, normal }', { motivo: 'projetar-invalido' });
}

function tangenteNoIndice(pts, k, fechada) {
  const n = pts.length;
  const prev = fechada ? pts[(k - 1 + n) % n] : (k > 0 ? pts[k - 1] : pts[k]);
  const next = fechada ? pts[(k + 1) % n] : (k < n - 1 ? pts[k + 1] : pts[k]);
  const t = unit(sub(next, prev));
  if (!t) throw new ErroFaixaDeContorno(`contorno tem pontos coincidentes perto do índice ${k}`, { motivo: 'ponto-repetido', indice: k });
  return t;
}

/** Raio de curvatura local no plano tangente, com sinal (> 0 quando o centro de curvatura está no lado `direcaoOffset`). */
function raioConcavoNoIndice(pts, k, fechada, direcaoOffset) {
  const n = pts.length;
  if (!fechada && (k === 0 || k === n - 1)) return Infinity;
  const pPrev = pts[(k - 1 + n) % n];
  const pCur = pts[k];
  const pNext = pts[(k + 1) % n];
  const a = sub(pCur, pPrev);
  const b = sub(pNext, pCur);
  const c = sub(pNext, pPrev);
  const la = norm(a);
  const lb = norm(b);
  const lc = norm(c);
  if (la < EPS || lb < EPS || lc < EPS) return Infinity;
  const area2 = norm(cruz(a, b));
  if (area2 < EPS) return Infinity;
  const raio = (la * lb * lc) / (2 * area2);
  /* vetor apontando para o lado côncavo (centro de curvatura): b/|b| - a/|a| */
  const curvDir = sub(esc(b, 1 / lb), esc(a, 1 / la));
  const sentidoConcavo = dot(curvDir, direcaoOffset);
  return sentidoConcavo > EPS ? raio : Infinity;
}

function normalizarAncoras(n, fechada, ancoras) {
  if (Array.isArray(ancoras) && ancoras.length > 0) {
    const limpas = [...new Set(ancoras.map((i) => Math.trunc(i)))].sort((a, b) => a - b);
    for (const i of limpas) {
      if (i < 0 || i >= n) throw new ErroFaixaDeContorno(`âncora ${i} fora do intervalo [0, ${n - 1}]`, { motivo: 'ancora-invalida', indice: i });
    }
    if (!fechada) {
      if (limpas[0] !== 0) limpas.unshift(0);
      if (limpas[limpas.length - 1] !== n - 1) limpas.push(n - 1);
    } else if (limpas.length < 2) {
      throw new ErroFaixaDeContorno('contorno fechado exige pelo menos 2 âncoras', { motivo: 'ancora-invalida' });
    }
    return limpas;
  }
  if (!fechada) return [0, n - 1];
  const passo = Math.max(1, Math.floor(n / 4));
  const res = [];
  for (let i = 0; i < 4 && i * passo < n; i += 1) res.push(i * passo);
  return res.length >= 2 ? res : [0, Math.floor(n / 2)];
}

export function faixaDeContornoNaRede({
  nome = 'faixa',
  contorno,
  fechada = false,
  fora,
  projetar = null,
  lado = 'fora',
  faixas,
  deslocamentoBaseMm = 0,
  vincoBase = undefined,
  modulacao = null,
  abaInterna = null,
  ancoras = null,
} = {}) {
  if (!Array.isArray(contorno) || contorno.length < (fechada ? 3 : 2)) {
    throw new ErroFaixaDeContorno(`contorno precisa de pelo menos ${fechada ? 3 : 2} pontos`, { motivo: 'contorno-curto' });
  }
  const foraUnit = Array.isArray(fora) && fora.length === 3 ? unit(fora) : null;
  if (!foraUnit) throw new ErroFaixaDeContorno('fora deve ser vetor 3D não nulo', { motivo: 'fora-invalido' });
  if (!Array.isArray(faixas) || faixas.length === 0) {
    throw new ErroFaixaDeContorno('faixas deve ser lista não vazia de { larguraMm, deslocamentoMm }', { motivo: 'faixas-vazias' });
  }
  if (!finito(deslocamentoBaseMm)) {
    throw new ErroFaixaDeContorno('deslocamentoBaseMm deve ser número finito', { motivo: 'deslocamento-invalido' });
  }
  const sinalLado = lado === 'dentro' || lado === -1 ? -1 : 1;

  let larguraTotalMm = 0;
  for (let i = 0; i < faixas.length; i += 1) {
    const f = faixas[i];
    if (!f || !finito(f.larguraMm) || f.larguraMm <= 0) {
      throw new ErroFaixaDeContorno(`faixas[${i}].larguraMm deve ser > 0`, { motivo: 'largura-invalida', indice: i });
    }
    if (!finito(f.deslocamentoMm)) {
      throw new ErroFaixaDeContorno(`faixas[${i}].deslocamentoMm deve ser número finito`, { motivo: 'deslocamento-invalido', indice: i });
    }
    larguraTotalMm += f.larguraMm;
  }

  if (abaInterna !== null && abaInterna !== undefined) {
    if (!finito(abaInterna.profundidadeMm) || abaInterna.profundidadeMm <= 0) {
      throw new ErroFaixaDeContorno('abaInterna.profundidadeMm deve ser > 0', { motivo: 'aba-invalida' });
    }
  }

  const n = contorno.length;
  const avisos = [];

  /* comprimentos acumulados para s em [0, 1] */
  const acum = [0];
  const nTrechos = fechada ? n : n - 1;
  for (let k = 0; k < nTrechos; k += 1) {
    acum.push(acum[k] + norm(sub(contorno[(k + 1) % n], contorno[k])));
  }
  const compTotal = acum[nTrechos];
  if (!(compTotal > EPS)) throw new ErroFaixaDeContorno('contorno tem comprimento nulo', { motivo: 'contorno-nulo' });

  /* quadro local (ponto, normal, direcaoOffset) e conferência de auto-interseção por raio mínimo */
  const quadros = [];
  let raioMinimoConcavoMm = Infinity;
  let indiceRaioMin = -1;

  for (let k = 0; k < n; k += 1) {
    const base = normalLocal(contorno[k], foraUnit, projetar);
    const tang = tangenteNoIndice(contorno, k, fechada);
    const uBruto = cruz(base.normal, tang);
    const dirOff = unit(esc(uBruto, sinalLado));
    if (!dirOff) {
      throw new ErroFaixaDeContorno(`tangente paralela à normal no ponto ${k}`, { motivo: 'tangente-paralela', indice: k });
    }
    const s = acum[k] / compTotal;
    const fator = avaliarModulacao(modulacao, s);
    const rConc = raioConcavoNoIndice(contorno, k, fechada, dirOff);
    if (rConc < raioMinimoConcavoMm) {
      raioMinimoConcavoMm = rConc;
      indiceRaioMin = k;
    }
    quadros.push({ ...base, dirOff, s, fator });
  }

  if (larguraTotalMm >= raioMinimoConcavoMm) {
    throw new ErroFaixaDeContorno(
      `largura total (${larguraTotalMm.toFixed(1)} mm) atinge ou excede o raio côncavo mínimo (${raioMinimoConcavoMm.toFixed(1)} mm) no índice ${indiceRaioMin}; reduzir larguraMm ou suavizar o contorno`,
      {
        motivo: 'auto-intersecao-por-raio',
        indice: indiceRaioMin,
        ponto: arredP(contorno[indiceRaioMin]),
        raioMinimoMm: arred(raioMinimoConcavoMm),
        larguraTotalMm: arred(larguraTotalMm),
      },
    );
  }

  /* gerar anéis 0..K (0 = curva base, 1..K = anéis das faixas) */
  const aneis = [];
  let deslocamentoMaximoMm = 0;

  /* anel 0 (base) */
  const anel0 = quadros.map((q) => {
    const d = deslocamentoBaseMm * q.fator;
    deslocamentoMaximoMm = Math.max(deslocamentoMaximoMm, Math.abs(d));
    return arredP(soma(q.ponto, esc(q.normal, d)));
  });
  aneis.push({
    nome: `${nome}_anel0`,
    pontos: anel0,
    vinco: vincoBase,
    continuidade: undefined,
    passo: undefined,
  });

  /* anéis 1..K */
  let larguraAcum = 0;
  for (let i = 0; i < faixas.length; i += 1) {
    const f = faixas[i];
    larguraAcum += f.larguraMm;
    const ptsAnel = quadros.map((q) => {
      const pBruto = soma(q.ponto, esc(q.dirOff, larguraAcum));
      const proj = normalLocal(pBruto, q.normal, projetar);
      const d = f.deslocamentoMm * q.fator;
      deslocamentoMaximoMm = Math.max(deslocamentoMaximoMm, Math.abs(d));
      return arredP(soma(proj.ponto, esc(proj.normal, d)));
    });
    aneis.push({
      nome: `${nome}_anel${i + 1}`,
      pontos: ptsAnel,
      vinco: f.vinco,
      continuidade: f.continuidade,
      passo: f.passo,
    });
  }

  /* aba interna opcional (anel -1 antes do anel 0) */
  let anelAba = null;
  if (abaInterna) {
    const ang = ((abaInterna.anguloGraus ?? 90) * Math.PI) / 180;
    const prof = abaInterna.profundidadeMm;
    const compNormal = -prof * Math.sin(ang);
    const compTang = -prof * Math.cos(ang);
    const ptsAba = quadros.map((q, k) => {
      const p0 = anel0[k];
      return arredP(soma(p0, soma(esc(q.normal, compNormal), esc(q.dirOff, compTang))));
    });
    anelAba = {
      nome: `${nome}_aba`,
      pontos: ptsAba,
      vinco: abaInterna.vinco,
      continuidade: undefined,
      passo: undefined,
    };
  }

  /* montar nós, curvas e retalhos de quadriláteros para gaiolaPorRede */
  const listaAncoras = normalizarAncoras(n, fechada, ancoras);
  const todosAneis = anelAba ? [anelAba, ...aneis] : aneis;
  const nos = {};
  const curvas = [];
  const retalhos = [];

  const nomeNo = (aIdx, ancPos) => `${nome}_a${aIdx}_n${ancPos}`;

  for (let aIdx = 0; aIdx < todosAneis.length; aIdx += 1) {
    const anel = todosAneis[aIdx];
    const ptsCurva = anel.pontos.map((p) => p);
    for (let j = 0; j < listaAncoras.length; j += 1) {
      const k = listaAncoras[j];
      const idNo = nomeNo(aIdx, j);
      nos[idNo] = anel.pontos[k];
      ptsCurva[k] = idNo;
    }
    const curva = { nome: anel.nome, pontos: ptsCurva };
    if (fechada) curva.fechada = true;
    if (anel.vinco !== undefined) curva.vinco = anel.vinco;
    if (anel.continuidade !== undefined) curva.continuidade = anel.continuidade;
    if (anel.passo !== undefined) curva.passo = anel.passo;
    curvas.push(curva);
  }

  /* ligações radiais entre anéis consecutivos em cada âncora + retalhos de 4 lados */
  const nTrechosAnc = fechada ? listaAncoras.length : listaAncoras.length - 1;
  for (let aIdx = 0; aIdx < todosAneis.length - 1; aIdx += 1) {
    const anelA = todosAneis[aIdx];
    const anelB = todosAneis[aIdx + 1];
    for (let j = 0; j < listaAncoras.length; j += 1) {
      curvas.push({
        nome: `${nome}_lig_${aIdx}_${j}`,
        pontos: [nomeNo(aIdx, j), nomeNo(aIdx + 1, j)],
      });
    }
    for (let t = 0; t < nTrechosAnc; t += 1) {
      const j0 = t;
      const j1 = (t + 1) % listaAncoras.length;
      const lig0 = `${nome}_lig_${aIdx}_${j0}`;
      const lig1 = `${nome}_lig_${aIdx}_${j1}`;
      const bordaA = (!fechada && listaAncoras.length === 2)
        ? anelA.nome
        : { curva: anelA.nome, de: nomeNo(aIdx, j0), ate: nomeNo(aIdx, j1) };
      const bordaB = (!fechada && listaAncoras.length === 2)
        ? anelB.nome
        : { curva: anelB.nome, de: nomeNo(aIdx + 1, j0), ate: nomeNo(aIdx + 1, j1) };
      retalhos.push({
        nome: `${nome}_ret_${aIdx}_${t}`,
        borda: [bordaA, lig1, bordaB, lig0],
      });
    }
  }

  const ultimoIdx = todosAneis.length - 1;
  const nosExternos = listaAncoras.map((_, j) => nomeNo(ultimoIdx, j));

  return {
    nos,
    curvas,
    retalhos,
    curvaBase: `${nome}_anel0`,
    curvaExterna: `${nome}_anel${faixas.length}`,
    curvaAba: anelAba ? anelAba.nome : null,
    nosExternos,
    estatisticas: {
      numeroAneis: faixas.length,
      larguraTotalMm: arred(larguraTotalMm),
      raioMinimoConcavoMm: Number.isFinite(raioMinimoConcavoMm) ? arred(raioMinimoConcavoMm) : null,
      deslocamentoMaximoMm: arred(deslocamentoMaximoMm),
      numeroRetalhos: retalhos.length,
    },
    avisos,
  };
}
