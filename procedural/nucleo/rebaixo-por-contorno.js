/* rebaixo-por-contorno.js — os passos de um rebaixo, faixa em volta ou sulco estampado num sólido sem atravessá-lo
 *
 * FICHA rebaixoPorContorno
 * serve: os passos (arranja, extrusao, subtrair, limparLascas e opcionalmente arredondarCostura) que rebaixam, numa vista,
 *   a região de um contorno fechado, uma faixa de largura dada em volta dele ou um sulco ao longo de uma linha aberta,
 *   a uma profundidade ao longo da vista, com o fundo acompanhando a superfície original do corpo.
 * quando: rebaixo de placa, concha de maçaneta, tomadas do capô, degrau em volta de um vão de grade ou sulco estampado
 *   em carroceria sem furar a chapa inteira. Para vãos que atravessam a chapa use `aberturaPorContorno` ou `furoPassante`.
 * unidades: profundidade, largura, comprimento, raio e tolerancia em mm; contorno e linha em mm (ou { inicio, trechos } em m,
 *   como em curva2d); os passos saem em metro, como a receita.
 * campos:
 *   corpo: seleção do sólido a rebaixar, com origem citável, ex. { origem: { op: 'subdivisao', id: 1 } }.
 *   vista: 'x', 'y' ou 'z', o eixo de onde se olha o rebaixo.
 *   sentido: '+' (padrão, olha do lado positivo e rebaixa para o negativo) ou '-' (olha do negativo e rebaixa para o positivo).
 *   profundidade: profundidade do rebaixo ao longo da vista, em mm (> 0).
 *   contorno: contorno fechado ({ inicio, trechos } em m de curva2d, ou lista [[u, v], ...] em mm na vista) para rebaixo fechado
 *     ou (com `largura`) para faixa em volta do contorno.
 *   linha: polilinha aberta [[u, v], ...] em mm na vista (com >= 2 pontos), usada junto com `largura` para sulco.
 *   largura: largura em mm (> 0) da faixa em volta de `contorno` ou do sulco ao longo de `linha`.
 *   comprimento: altura do prisma de corte ao longo da vista em mm (padrão 2000; precisa ultrapassar o corpo dos dois lados).
 *   centroDaVista: posição central do prisma ao longo do eixo da vista em mm (padrão 0).
 *   segmentosArco: segmentos por quarto de arco ao discretizar `contorno` de curva2d (padrão 16).
 *   raio: raio opcional de arredondamento da borda via `arredondarCostura`, em mm (> 0).
 *   arestas: 'convexas' (padrão), 'internas' ou 'todas' para `arredondarCostura` quando `raio` é declarado.
 *   paineis: painéis do arco de `arredondarCostura` (padrão 4).
 *   tolerancia: tolerância de `limparLascas` em mm (padrão 0,05; 0 pula a limpeza).
 *   ids: { copia, prisma, ferramenta, subtrair, arredondar? } inteiros distintos para `origemId` dos passos.
 * devolve: { passos, origem, geometria } com `passos` para espalhar na receita, `origem` { op: 'subtrair', id: ids.subtrair }
 *   (o sólido rebaixado) e `geometria` (vista, sentido, profundidadeMm, modo).
 * exemplo:
 *   rebaixoPorContorno({ corpo: { origem: { op: 'subdivisao', id: 1 } }, vista: 'z', sentido: '-', profundidade: 14, contorno: [[-180, 420], [180, 420], [180, 560], [-180, 560]], ids: { copia: 20, prisma: 21, ferramenta: 22, subtrair: 23 } })
 * peça: procedural/pecas/carro-quadrado/partes/lataria/receita.js (rebaixo da placa traseira).
 * FIM DA FICHA
 *
 * Função pura, sem Three.js e sem domínio: só monta passos que o registro já tem (`arranja`, `extrusao`, `subtrair`,
 * `limparLascas` e `arredondarCostura`). A técnica é: `corpo - (prisma - copia(corpo, -profundidade * eixo))`.
 * Assim o fundo do rebaixo acompanha exatamente a superfície original do corpo deslocada da profundidade pedida ao longo
 * da vista. Atenção: a booleana exige `profundidade < espessura` da parede local (caso contrário fura passante) e, em
 * corpos ocos ou de duas camadas (como uma carroceria inteira), `centroDaVista` e `comprimento` devem restringir o prisma
 * à parede-alvo para não alcançar a parede oposta. */
import { contornoPorTrechos } from './curva2d.js';
import { quadroDaVista } from './operacoes/abertura-por-contorno.js';

const falha = (texto) => { throw new RangeError(`rebaixoPorContorno: ${texto}`); };
const numero = (x) => typeof x === 'number' && Number.isFinite(x);
const positivo = (x) => numero(x) && x > 0;
const m = (mm) => mm / 1000;
const arredonda = (x) => Math.round(x * 1e9) / 1e9;

/** Converte um ponto [u, v] do plano de `quadroDaVista(vista)` para o plano 2D de `extrusao({ eixo: vista })`. */
const paraExtrusao = (vista, [u, v]) => {
  if (vista === 'y') return [arredonda(u), arredonda(v)];
  if (vista === 'x') return [arredonda(-v), arredonda(u)];
  return [arredonda(u), arredonda(-v)];
};

/** Área com sinal de um polígono 2D (> 0 anti-horário). */
const areaComSinal = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};

/** Desloca um polígono fechado simples para fora por `dist` (> 0 expande) com junção chanfrada/miter limitada. */
function offsetPoligono(pts, dist) {
  const n = pts.length;
  const ccw = areaComSinal(pts) >= 0 ? 1 : -1;
  const norm = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    if (!(l > 1e-12)) falha('contorno tem dois pontos consecutivos coincidentes');
    /* normal externa: à direita de (a->b) quando CCW, à esquerda quando CW */
    return [(ccw * dy) / l, (-ccw * dx) / l];
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
    const n1 = norm(prev, cur), n2 = norm(cur, next);
    const bx = n1[0] + n2[0], by = n1[1] + n2[1];
    const bl = Math.hypot(bx, by);
    if (bl < 1e-9) {
      out.push([cur[0] + n1[0] * dist, cur[1] + n1[1] * dist]);
    } else {
      const cos = n1[0] * (bx / bl) + n1[1] * (by / bl);
      const escala = Math.min(4, 1 / Math.max(0.25, cos));
      out.push([cur[0] + (bx / bl) * dist * escala, cur[1] + (by / bl) * dist * escala]);
    }
  }
  return out;
}

/** Engrossa uma polilinha aberta `linha` em um polígono fechado de largura `largura` (meia-largura para cada lado). */
function poligonoDeSulco(linha, largura) {
  const h = largura / 2;
  const n = linha.length;
  const dir = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    if (!(l > 1e-12)) falha('linha do sulco tem dois pontos consecutivos coincidentes');
    return [dx / l, dy / l];
  };
  const esq = [];
  const dirPts = [];
  for (let i = 0; i < n; i++) {
    let nx, ny;
    if (i === 0) {
      const d = dir(linha[0], linha[1]);
      nx = -d[1]; ny = d[0];
    } else if (i === n - 1) {
      const d = dir(linha[n - 2], linha[n - 1]);
      nx = -d[1]; ny = d[0];
    } else {
      const d1 = dir(linha[i - 1], linha[i]), d2 = dir(linha[i], linha[i + 1]);
      const n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]];
      const bx = n1[0] + n2[0], by = n1[1] + n2[1], bl = Math.hypot(bx, by);
      if (bl < 1e-9) { nx = n1[0]; ny = n1[1]; }
      else {
        const cos = n1[0] * (bx / bl) + n1[1] * (by / bl);
        const escala = Math.min(4, 1 / Math.max(0.25, cos));
        nx = (bx / bl) * escala; ny = (by / bl) * escala;
      }
    }
    esq.push([linha[i][0] + nx * h, linha[i][1] + ny * h]);
    dirPts.push([linha[i][0] - nx * h, linha[i][1] - ny * h]);
  }
  return [...esq, ...dirPts.reverse()];
}

/** Confere se um polígono fechado simples tem dois lados não-adjacentes que se cruzam. */
function seAutoIntersecta(pts) {
  const n = pts.length;
  const ccw = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const cruza = (a, b, c, d) => {
    const d1 = ccw(a, b, c), d2 = ccw(a, b, d), d3 = ccw(c, d, a), d4 = ccw(c, d, b);
    return ((d1 > 1e-12 && d2 < -1e-12) || (d1 < -1e-12 && d2 > 1e-12)) && ((d3 > 1e-12 && d4 < -1e-12) || (d3 < -1e-12 && d4 > 1e-12));
  };
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (cruza(a, b, pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
}

/** Resolve contorno de entrada (curva2d em m ou polígono [[u,v],...] em mm) para pontos [[u,v],...] em m. */
function resolverContornoEmMetros(contorno, segmentosArco) {
  let pts;
  if (Array.isArray(contorno)) {
    if (contorno.length < 3 || !contorno.every((p) => Array.isArray(p) && p.length === 2 && numero(p[0]) && numero(p[1]))) {
      falha('contorno em lista precisa de pelo menos 3 pontos [u, v] em mm');
    }
    pts = contorno.map(([u, v]) => [m(u), m(v)]);
  } else if (contorno && typeof contorno === 'object' && Array.isArray(contorno.inicio) && Array.isArray(contorno.trechos)) {
    const res = contornoPorTrechos(contorno, { segmentosArco });
    if (res?.erro) falha(`contorno inválido: ${res.erro}`);
    pts = Array.isArray(res) ? res : res.pontos;
  } else {
    falha('contorno precisa ser { inicio, trechos } (em m) ou lista de pontos [[u, v], ...] (em mm)');
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (!(Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-12)) falha('contorno tem dois pontos consecutivos coincidentes');
  }
  if (seAutoIntersecta(pts)) falha('contorno se cruza (auto-intersecção)');
  if (!(Math.abs(areaComSinal(pts)) > 1e-12)) falha('contorno degenerado (área zero ou pontos colineares)');
  return pts;
}

export function rebaixoPorContorno(o = {}) {
  if (!o.corpo || typeof o.corpo !== 'object' || Array.isArray(o.corpo) || !o.corpo.origem?.op || !Number.isInteger(o.corpo.origem?.id)) {
    falha(`corpo precisa ser uma seleção por origem citável, ex. { origem: { op: 'subdivisao', id: 1 } }, e veio ${JSON.stringify(o.corpo)}`);
  }
  if (!['x', 'y', 'z'].includes(o.vista)) falha(`vista precisa ser 'x', 'y' ou 'z', e veio ${JSON.stringify(o.vista)}`);
  const sentido = o.sentido ?? '+';
  if (sentido !== '+' && sentido !== '-') falha(`sentido precisa ser '+' ou '-', e veio ${JSON.stringify(o.sentido)}`);
  if (!positivo(o.profundidade)) falha(`profundidade precisa ser número positivo em mm, e veio ${JSON.stringify(o.profundidade)}`);

  const temContorno = o.contorno !== undefined;
  const temLinha = o.linha !== undefined;
  const temLargura = o.largura !== undefined;
  if (temContorno && temLinha) falha('declare contorno OU linha, não os dois ao mesmo tempo');
  if (!temContorno && !temLinha) falha('declare contorno (rebaixo ou faixa) ou linha com largura (sulco)');
  if (temLinha && !positivo(o.largura)) falha(`sulco por linha exige largura positiva em mm, e veio ${JSON.stringify(o.largura)}`);
  if (temLargura && !positivo(o.largura)) falha(`largura precisa ser número positivo em mm, e veio ${JSON.stringify(o.largura)}`);

  const comprimento = o.comprimento ?? 2000;
  if (!positivo(comprimento)) falha(`comprimento precisa ser número positivo em mm, e veio ${JSON.stringify(o.comprimento)}`);
  const centroDaVista = o.centroDaVista ?? 0;
  if (!numero(centroDaVista)) falha(`centroDaVista precisa ser número finito em mm, e veio ${JSON.stringify(o.centroDaVista)}`);
  const segmentosArco = o.segmentosArco ?? 16;
  if (!Number.isInteger(segmentosArco) || segmentosArco < 1 || segmentosArco > 4096) {
    falha(`segmentosArco precisa ser inteiro de 1 a 4096, e veio ${JSON.stringify(o.segmentosArco)}`);
  }
  const tolerancia = o.tolerancia ?? 0.05;
  if (!numero(tolerancia) || tolerancia < 0 || tolerancia > 0.5) {
    falha(`tolerancia precisa ser número em mm de 0 a 0,5, e veio ${JSON.stringify(o.tolerancia)}`);
  }
  const temRaio = o.raio !== undefined;
  if (temRaio && !positivo(o.raio)) falha(`raio precisa ser número positivo em mm, e veio ${JSON.stringify(o.raio)}`);
  const arestas = o.arestas ?? 'convexas';
  if (!['convexas', 'internas', 'todas'].includes(arestas)) falha(`arestas precisa ser 'convexas', 'internas' ou 'todas', e veio ${JSON.stringify(o.arestas)}`);
  const paineis = o.paineis ?? 4;
  if (!Number.isInteger(paineis) || paineis < 1 || paineis > 32) falha(`paineis precisa ser inteiro de 1 a 32, e veio ${JSON.stringify(o.paineis)}`);

  const ids = o.ids;
  const reqIds = temRaio ? ['copia', 'prisma', 'ferramenta', 'subtrair', 'arredondar'] : ['copia', 'prisma', 'ferramenta', 'subtrair'];
  if (!ids || typeof ids !== 'object' || reqIds.some((k) => !Number.isInteger(ids[k]))) {
    falha(`ids precisa trazer inteiros para ${reqIds.join(', ')}, e veio ${JSON.stringify(ids)}`);
  }
  const usados = new Set(reqIds.map((k) => ids[k]));
  if (usados.size !== reqIds.length) falha(`ids não podem se repetir: ${JSON.stringify(ids)}`);

  const modo = temLinha ? 'sulco' : temLargura ? 'faixa' : 'rebaixo';
  let perfil;
  let furos;
  if (modo === 'rebaixo') {
    const pts = resolverContornoEmMetros(o.contorno, segmentosArco);
    perfil = pts.map((p) => paraExtrusao(o.vista, p));
  } else if (modo === 'faixa') {
    const interno = resolverContornoEmMetros(o.contorno, segmentosArco);
    const externo = offsetPoligono(interno, m(o.largura));
    perfil = externo.map((p) => paraExtrusao(o.vista, p));
    furos = [interno.map((p) => paraExtrusao(o.vista, p))];
  } else {
    if (!Array.isArray(o.linha) || o.linha.length < 2 || !o.linha.every((p) => Array.isArray(p) && p.length === 2 && numero(p[0]) && numero(p[1]))) {
      falha('linha do sulco precisa de pelo menos 2 pontos [u, v] em mm');
    }
    const pts = poligonoDeSulco(o.linha.map(([u, v]) => [m(u), m(v)]), m(o.largura));
    if (seAutoIntersecta(pts)) falha('sulco se cruza na dobra (reduza a largura ou abra o ângulo da linha)');
    perfil = pts.map((p) => paraExtrusao(o.vista, p));
  }

  const q = quadroDaVista(o.vista);
  const sinalDeslocamento = sentido === '+' ? -1 : 1;
  const d = [0, 0, 0];
  d[q.eixo] = arredonda(sinalDeslocamento * m(o.profundidade));
  const em = [0, 0, 0];
  em[q.eixo] = arredonda(m(centroDaVista - comprimento / 2));

  const origCorpo = o.corpo.origem;
  const passos = [
    ['arranja', { origemId: ids.copia, derivaDe: origCorpo, sel: o.corpo, modo: 'linear', total: 2, d }],
    ['extrusao', { origemId: ids.prisma, perfil, ...(furos ? { furos } : {}), altura: arredonda(m(comprimento)), eixo: o.vista, em }],
    ['subtrair', { origemId: ids.ferramenta, solidos: [{ origem: { op: 'extrusao', id: ids.prisma } }, { origem: { op: 'arranja', id: ids.copia, de: origCorpo, copia: 0 } }] }],
    ['subtrair', { origemId: ids.subtrair, solidos: [o.corpo, { origem: { op: 'subtrair', id: ids.ferramenta } }] }],
  ];
  if (tolerancia > 0) {
    passos.push(['limparLascas', { sel: { origem: { op: 'subtrair', id: ids.subtrair } }, tolerancia: arredonda(m(tolerancia)) }]);
  }
  if (temRaio) {
    passos.push(['arredondarCostura', { origemId: ids.arredondar, de: { op: 'subtrair', id: ids.subtrair }, raio: arredonda(m(o.raio)), paineis, arestas }]);
  }

  return {
    passos,
    origem: { op: 'subtrair', id: ids.subtrair },
    geometria: { vista: o.vista, sentido, profundidadeMm: o.profundidade, modo },
  };
}
