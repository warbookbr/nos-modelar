/* Esboço de opções de forma: lê a declaração de cilindros, anéis e caixas em
   milímetro, resolve as posições relativas (sobre, ponta) e desenha as opções
   lado a lado na mesma escala, em SVG. Não depende de Three.js nem de domínio;
   a conversão para PNG fica na ferramenta de linha de comando. */

import { expandirArranjos, expandirEsboco } from './expandir.js';

const EIXOS = ['x', 'y', 'z'];
const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z'];
const SEGMENTOS = 128;
const PAINEL_L = 620;
const PAINEL_A = 560;
const TOPO = 70;
const RODAPE = 90;

export class ErroDeEsboco extends Error {}

function exigir(cond, msg) { if (!cond) throw new ErroDeEsboco(msg); }
const numPos = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/* Perfil 2D (u, v) de cada forma e o eixo em que ele é extrudado. */
function circulo(r) {
  const p = [];
  for (let i = 0; i < SEGMENTOS; i++) {
    const a = (2 * Math.PI * i) / SEGMENTOS;
    p.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return p;
}

function retanguloArredondado(l, p, r) {
  const rr = Math.min(r ?? 0, l / 2, p / 2);
  if (!(rr > 0)) return [[-l / 2, -p / 2], [l / 2, -p / 2], [l / 2, p / 2], [-l / 2, p / 2]];
  const pts = [];
  const cantos = [[l / 2 - rr, -p / 2 + rr, -90], [l / 2 - rr, p / 2 - rr, 0], [-l / 2 + rr, p / 2 - rr, 90], [-l / 2 + rr, -p / 2 + rr, 180]];
  for (const [cx, cy, a0] of cantos) {
    for (let i = 0; i <= 8; i++) {
      const a = ((a0 + (90 * i) / 8) * Math.PI) / 180;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  }
  return pts;
}

/* Corta o perfil convexo pelo semiplano n·p <= limite. */
function cortar(perfil, n, limite) {
  const saida = [];
  for (let i = 0; i < perfil.length; i++) {
    const a = perfil[i];
    const b = perfil[(i + 1) % perfil.length];
    const da = a[0] * n[0] + a[1] * n[1] - limite;
    const db = b[0] * n[0] + b[1] * n[1] - limite;
    if (da <= 0) saida.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      saida.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return saida;
}

/* Base local: eixo de extrusão e os dois eixos do perfil. */
function base(eixo) {
  if (eixo === 'x') return { e: 0, u: 2, v: 1 };
  if (eixo === 'z') return { e: 2, u: 0, v: 1 };
  return { e: 1, u: 0, v: 2 };
}

function ponto3(b, u, v, w) {
  const p = [0, 0, 0];
  p[b.u] = u; p[b.v] = v; p[b.e] = w;
  return p;
}

function matrizRotacao(rot) {
  if (!rot) return null;
  let rx = 0, ry = 0, rz = 0;
  if (Array.isArray(rot)) {
    [rx = 0, ry = 0, rz = 0] = rot;
  } else if (typeof rot === 'object') {
    if (rot.eixo && rot.angulo !== undefined) {
      if (rot.eixo === 'x') rx = rot.angulo;
      else if (rot.eixo === 'y') ry = rot.angulo;
      else if (rot.eixo === 'z') rz = rot.angulo;
    } else {
      rx = rot.x ?? 0;
      ry = rot.y ?? 0;
      rz = rot.z ?? 0;
    }
  } else if (typeof rot === 'number') {
    ry = rot;
  }
  if (!rx && !ry && !rz) return null;
  const radX = (rx * Math.PI) / 180;
  const radY = (ry * Math.PI) / 180;
  const radZ = (rz * Math.PI) / 180;

  const cx = Math.cos(radX), sx = Math.sin(radX);
  const cy = Math.cos(radY), sy = Math.sin(radY);
  const cz = Math.cos(radZ), sz = Math.sin(radZ);

  return [
    [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
    [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
    [-sy,     cy * sx,                cy * cx],
  ];
}

function aplicarMatriz(v, m) {
  if (!m) return v;
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/* Converte uma forma declarada em prisma local centrado na origem. */
function prisma(f, onde) {
  const tipo = f.tipo;
  if (tipo === 'cilindro') {
    exigir(numPos(f.diametro), `${onde}: cilindro precisa de "diametro" positivo em mm`);
    exigir(numPos(f.comprimento), `${onde}: cilindro precisa de "comprimento" positivo em mm`);
    const eixo = f.eixo ?? 'y';
    exigir(EIXOS.includes(eixo), `${onde}: "eixo" deve ser "x", "y" ou "z"`);
    const b = base(eixo);
    let perfil = circulo(f.diametro / 2);
    if (f.achatado) {
      const { lado, profundidade } = f.achatado;
      exigir(LADOS.includes(lado), `${onde}: "achatado.lado" deve ser um de ${LADOS.join(', ')}`);
      exigir(numPos(profundidade) && profundidade < f.diametro, `${onde}: "achatado.profundidade" deve ser positiva e menor que o diâmetro`);
      const k = EIXOS.indexOf(lado[1]);
      exigir(k !== b.e, `${onde}: o achatado precisa ser num lado perpendicular ao eixo do cilindro`);
      const s = lado[0] === '+' ? 1 : -1;
      const n = k === b.u ? [s, 0] : [0, s];
      perfil = cortar(perfil, n, f.diametro / 2 - profundidade);
    }
    return { b, perfil, furos: [], furo: null, comprimento: f.comprimento };
  }
  if (tipo === 'anel') {
    exigir(numPos(f.diametroExterno), `${onde}: anel precisa de "diametroExterno" positivo em mm`);
    exigir(typeof f.diametroInterno === 'number' && f.diametroInterno >= 0 && f.diametroInterno < f.diametroExterno,
      `${onde}: anel precisa de "diametroInterno" entre 0 e o diâmetro externo`);
    exigir(numPos(f.espessura), `${onde}: anel precisa de "espessura" positiva em mm`);
    const eixo = f.eixo ?? 'y';
    exigir(EIXOS.includes(eixo), `${onde}: "eixo" deve ser "x", "y" ou "z"`);
    const furos = f.diametroInterno > 0 ? [circulo(f.diametroInterno / 2)] : [];
    return { b: base(eixo), perfil: circulo(f.diametroExterno / 2), furos, furo: furos[0] ?? null, comprimento: f.espessura };
  }
  if (tipo === 'caixa') {
    exigir(numPos(f.largura) && numPos(f.altura) && numPos(f.profundidade), `${onde}: caixa precisa de "largura", "altura" e "profundidade" positivas em mm`);
    /* u = x (largura), v = z (profundidade), extrusão em y (altura). */
    const furos = [];
    if (Array.isArray(f.furos)) {
      for (const [idx, item] of f.furos.entries()) {
        exigir(numPos(item.diametro), `${onde}: furos[${idx}] precisa de "diametro" positivo em mm`);
        const cf = item.centro ?? [0, 0];
        exigir(Array.isArray(cf) && cf.length === 2 && cf.every((n) => typeof n === 'number'),
          `${onde}: furos[${idx}] precisa de "centro" [x, z] numérico`);
        const r = item.diametro / 2;
        furos.push(circulo(r).map(([u, v]) => [u + cf[0], v + cf[1]]));
      }
    } else if (f.furo && typeof f.furo === 'object') {
      exigir(numPos(f.furo.diametro), `${onde}: furo precisa de "diametro" positivo em mm`);
      const cf = f.furo.centro ?? [0, 0];
      exigir(Array.isArray(cf) && cf.length === 2 && cf.every((n) => typeof n === 'number'),
        `${onde}: furo precisa de "centro" [x, z] numérico`);
      const r = f.furo.diametro / 2;
      furos.push(circulo(r).map(([u, v]) => [u + cf[0], v + cf[1]]));
    }
    return { b: base('y'), perfil: retanguloArredondado(f.largura, f.profundidade, f.raio), furos, furo: furos[0] ?? null, comprimento: f.altura };
  }
  throw new ErroDeEsboco(`${onde}: tipo "${tipo}" desconhecido; use cilindro, anel ou caixa`);
}

function caixaLocal(pr, m) {
  if (!m) {
    const min = [0, 0, 0];
    const max = [0, 0, 0];
    min[pr.b.e] = -pr.comprimento / 2; max[pr.b.e] = pr.comprimento / 2;
    min[pr.b.u] = Math.min(...pr.perfil.map((p) => p[0])); max[pr.b.u] = Math.max(...pr.perfil.map((p) => p[0]));
    min[pr.b.v] = Math.min(...pr.perfil.map((p) => p[1])); max[pr.b.v] = Math.max(...pr.perfil.map((p) => p[1]));
    return { min, max };
  }
  const vertices = [];
  const half = pr.comprimento / 2;
  for (const w of [-half, half]) {
    for (const [u, v] of pr.perfil) {
      vertices.push(aplicarMatriz(ponto3(pr.b, u, v, w), m));
    }
  }
  const min = [
    Math.min(...vertices.map((p) => p[0])),
    Math.min(...vertices.map((p) => p[1])),
    Math.min(...vertices.map((p) => p[2])),
  ];
  const max = [
    Math.max(...vertices.map((p) => p[0])),
    Math.max(...vertices.map((p) => p[1])),
    Math.max(...vertices.map((p) => p[2])),
  ];
  return { min, max };
}

function lerPonta(f) {
  if (Array.isArray(f.ponta)) return { id: f.ponta[0], lado: f.ponta[1] };
  if (typeof f.ponta === 'object') return { id: f.ponta.id, lado: f.ponta.lado };
  return { id: f.ponta, lado: f.lado };
}

/* Âncoras nomeadas: `centro`; `inicio` e `fim` nas pontas do eixo (cilindro e anel); e o centro
   de cada face da caixa mínima (`+x` ... `-z`), na orientação do mundo depois da rotação. */
export function nomesDeAncoras(tipo) {
  return ['centro', ...(tipo === 'cilindro' || tipo === 'anel' ? ['inicio', 'fim'] : []), ...LADOS];
}

export function ancorasDe(r) {
  const a = { centro: [...r.centro] };
  if (r.forma.tipo === 'cilindro' || r.forma.tipo === 'anel') {
    const h = r.prisma.comprimento / 2;
    for (const [nome, w] of [['inicio', -h], ['fim', h]]) {
      const d = aplicarMatriz(ponto3(r.prisma.b, 0, 0, w), r.matriz);
      a[nome] = [r.centro[0] + d[0], r.centro[1] + d[1], r.centro[2] + d[2]];
    }
  }
  const meio = r.min.map((v, i) => (v + r.max[i]) / 2);
  for (const lado of LADOS) {
    const k = EIXOS.indexOf(lado[1]);
    a[lado] = meio.map((v, i) => (i === k ? (lado[0] === '+' ? r.max[k] : r.min[k]) : v));
  }
  return a;
}

/* Resolve `"<id>.<ancora>"` no lugar de um vetor (`centro`, `de`, `para`, `alinha.com`). */
function ancoraDe(ref, onde, porId, resolver, visitando, campo = 'centro') {
  const ponto = ref.lastIndexOf('.');
  const id = ponto > 0 ? ref.slice(0, ponto) : ref;
  const nome = ponto > 0 ? ref.slice(ponto + 1) : '';
  exigir(ponto > 0, `${onde}: "${campo}" como referência "${ref}" deve ter a forma "<id>.<ancora>", por exemplo "${id}.centro"`);
  exigir(porId.has(id), `${onde}: "${campo}" aponta para "${ref}", mas a forma "${id}" não existe nesta opção (ids: ${[...porId.keys()].join(', ')})`);
  const validas = nomesDeAncoras(porId.get(id).tipo);
  exigir(validas.includes(nome), `${onde}: "${campo}" aponta para "${ref}", mas a forma "${id}" (${porId.get(id).tipo}) não tem a âncora "${nome}" (válidas: ${validas.join(', ')})`);
  exigir(!visitando.has(id), `${onde}: referência circular em "${campo}": "${ref}" volta a depender desta forma (âncoras válidas de "${id}": ${validas.join(', ')})`);
  return ancorasDe(resolver(id))[nome];
}

const unit = (v) => { const n = Math.hypot(...v); return v.map((c) => c / n); };
const escalarV = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* Rotação de Rodrigues que leva o unitário `a` ao unitário `b` pelo menor ângulo (a mesma
   regra de `poseQueEncaixa`, copiada: o arquivo dela importa outros módulos do Mecanifica).
   Devolve null quando já coincidem, como `matrizRotacao` sem rotação. */
function rotacaoEntre(a, b) {
  const c = escalarV(a, b);
  if (c > 1 - 1e-12) return null;
  if (c < -1 + 1e-12) {
    const apoio = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const k = unit([a[1] * apoio[2] - a[2] * apoio[1], a[2] * apoio[0] - a[0] * apoio[2], a[0] * apoio[1] - a[1] * apoio[0]]);
    return [0, 1, 2].map((i) => [0, 1, 2].map((j) => 2 * k[i] * k[j] - (i === j ? 1 : 0)));
  }
  const v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const x = [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]];
  const x2 = [0, 1, 2].map((i) => [0, 1, 2].map((j) => x[i][0] * x[0][j] + x[i][1] * x[1][j] + x[i][2] * x[2][j]));
  const f = 1 / (1 + c);
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) + x[i][j] + x2[i][j] * f));
}

/* Vértices do prisma girado, relativos ao centro (o anel entra como o disco externo). */
function verticesLocais(pr, m) {
  const h = pr.comprimento / 2;
  const saida = [];
  for (const w of [-h, h]) for (const [u, v] of pr.perfil) saida.push(aplicarMatriz(ponto3(pr.b, u, v, w), m));
  return saida;
}

const EIXOS_ALINHA = ['x', 'y', 'z'];
const CHAVES_ENCOSTA = ['referencia', 'direcao', 'folga'];
const CHAVES_ALINHA = ['com', 'eixos'];

/* Relações de posição de uma forma, em texto, para a leitura `--descrever`. */
export function relacaoDe(f) {
  const partes = [];
  const v = (x) => (Array.isArray(x) ? `[${x.join(' ')}]` : x);
  if (f.espelha) partes.push(`espelho de ${f.espelha.forma} no eixo ${f.espelha.eixo} em ${f.espelha.pos ?? 0} mm`);
  if (f.arranjoDe) {
    const a = f.arranjoDe;
    partes.push(`cópia ${a.indice} de ${a.total} de ${a.fonte}, ${a.modo === 'linear' ? `linear, passo ${v(a.passo)}` : `radial, eixo ${a.eixo} em ${v(a.centro)}, ${a.graus} graus`}`);
  }
  if (f.de !== undefined) partes.push(`de ${v(f.de)} para ${v(f.para)}`);
  if (f.alinha) partes.push(`alinha com ${f.alinha.com} nos eixos ${(f.alinha.eixos ?? []).join(' ')}`);
  if (f.encosta) partes.push(`encosta em ${f.encosta.referencia} na direção ${v(f.encosta.direcao)}${f.encosta.folga ? ` com folga ${f.encosta.folga} mm` : ''}`);
  if ((f.de !== undefined || f.alinha || f.encosta || f.espelha) && f.desloca) partes.push(`desloca ${v(f.desloca)}`);
  return partes.join('; ');
}

/* Pontos nomeados: `pontos` na raiz do esboço e na opção (a opção sobrepõe a raiz). */
function lerPontos(raiz, opcao, rotuloOpcao) {
  const saida = {};
  for (const [origem, lista] of [['raiz', raiz], ['opção', opcao?.pontos]]) {
    if (lista === undefined) continue;
    exigir(lista && typeof lista === 'object' && !Array.isArray(lista), `${rotuloOpcao}: "pontos" (${origem}) deve ser um objeto { nome: [x, y, z] }`);
    for (const [nome, v] of Object.entries(lista)) {
      exigir(Array.isArray(v) && v.length === 3 && v.every(Number.isFinite), `${rotuloOpcao}: o ponto "${nome}" deve ser [x, y, z] em mm`);
      saida[nome] = v;
    }
  }
  return saida;
}

const IDENTIDADE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const limpo = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

function multiplicar(a, b) {
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => limpo(a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j])));
}

/* Rotação de `graus` em torno do eixo de mundo, pela regra da mão direita (a mesma de `rotacao`). */
function rotacaoEmTorno(eixo, graus) {
  const a = (graus * Math.PI) / 180;
  const c = limpo(Math.cos(a)); const s = limpo(Math.sin(a));
  if (eixo === 'x') return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (eixo === 'y') return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

const CHAVES_ESPELHA = ['forma', 'eixo', 'pos'];
/* Campos de posição e de aparência que a cópia não herda da forma-fonte (a cópia refaz a posição
   a partir da fonte já resolvida; `rotulo`, `oculto` e `opacidade` são só dela). */
const NAO_HERDADOS = ['id', 'centro', 'sobre', 'ponta', 'de', 'para', 'rotacao', 'encosta', 'alinha', 'desloca', 'rotulo', 'oculto', 'opacidade', 'espelha', 'arranja', 'arranjoDe'];
const CAMPOS_DO_ESPELHO = ['id', 'cor', 'rotulo', 'oculto', 'opacidade', 'desloca', 'espelha'];

/* Cópia refletida (`espelha`) ou repetida (`arranjoDe`, vinda de `arranja`) de uma forma já resolvida:
   a geometria sai da fonte resolvida, e não de uma regravação das relações dela. */
function copiaResolvida(f, id, onde, referencia, pontoDe) {
  const espelho = f.espelha !== undefined;
  let fonte;
  let m;
  let centro;
  let marca;
  if (espelho) {
    const e = f.espelha;
    exigir(e && typeof e === 'object' && !Array.isArray(e), `${onde}: "espelha" deve ser { "forma": "<id>", "eixo": "x" | "y" | "z", "pos": mm }`);
    const fora = Object.keys(e).filter((k) => !CHAVES_ESPELHA.includes(k));
    exigir(fora.length === 0, `${onde}: "espelha" não tem o campo "${fora[0]}" (campos: ${CHAVES_ESPELHA.join(', ')})`);
    exigir(EIXOS.includes(e.eixo), `${onde}: "espelha.eixo" deve ser "x", "y" ou "z" (o plano de reflexão é perpendicular a ele)`);
    const pos = e.pos ?? 0;
    exigir(Number.isFinite(pos), `${onde}: "espelha.pos" deve ser um número em mm`);
    exigir(e.forma !== id, `${onde}: "espelha.forma" não pode ser a própria forma`);
    const extras = Object.keys(f).filter((k) => !CAMPOS_DO_ESPELHO.includes(k));
    exigir(extras.length === 0, `${onde}: uma forma com "espelha" copia a fonte e só aceita ${CAMPOS_DO_ESPELHO.filter((k) => k !== 'espelha').map((k) => `"${k}"`).join(', ')}; retire "${extras[0]}"`);
    fonte = referencia('espelha.forma', e.forma);
    const k = EIXOS.indexOf(e.eixo);
    const S = IDENTIDADE.map((linha, i) => linha.map((v) => (i === k ? -v : v)));
    m = multiplicar(S, fonte.matriz ?? IDENTIDADE);
    centro = [...fonte.centro];
    centro[k] = 2 * pos - centro[k];
    marca = { espelha: { forma: e.forma, eixo: e.eixo, pos } };
  } else {
    const a = f.arranjoDe;
    fonte = referencia('arranja.forma', a.fonte);
    if (a.modo === 'linear') {
      m = fonte.matriz;
      centro = fonte.centro.map((c, i) => c + a.indice * a.passo[i]);
    } else {
      const eixoCentro = typeof a.centro === 'string' ? pontoDe(a.centro, 'arranja.centro') : a.centro;
      const passo = Math.abs(a.graus) >= 360 ? a.graus / a.total : a.graus / (a.total - 1);
      const R = rotacaoEmTorno(a.eixo, a.indice * passo);
      const rel = fonte.centro.map((c, i) => c - eixoCentro[i]);
      const girado = [0, 1, 2].map((i) => R[i][0] * rel[0] + R[i][1] * rel[1] + R[i][2] * rel[2]);
      centro = girado.map((c, i) => eixoCentro[i] + c);
      m = multiplicar(R, fonte.matriz ?? IDENTIDADE);
    }
    marca = { arranjoDe: a };
  }
  if (f.desloca !== undefined) {
    exigir(Array.isArray(f.desloca) && f.desloca.length === 3 && f.desloca.every(Number.isFinite), `${onde}: "desloca" deve ser [dx, dy, dz] em mm`);
    centro = centro.map((c, i) => c + f.desloca[i]);
  }
  const herdado = Object.fromEntries(Object.entries(fonte.forma).filter(([k]) => !NAO_HERDADOS.includes(k)));
  const forma = {
    ...herdado, id, cor: f.cor ?? fonte.forma.cor, ...marca,
    ...(f.rotulo !== undefined ? { rotulo: f.rotulo } : {}),
    ...(f.oculto !== undefined ? { oculto: f.oculto } : {}),
    ...(f.opacidade !== undefined ? { opacidade: f.opacidade } : {}),
  };
  if (forma.cor === undefined) delete forma.cor;
  const local = caixaLocal(fonte.prisma, m);
  return {
    id, forma, prisma: fonte.prisma, centro, matriz: m,
    min: local.min.map((val, i) => val + centro[i]),
    max: local.max.map((val, i) => val + centro[i]),
  };
}

/* Resolve a posição de cada forma. Devolve formas com centro e caixa no mundo. `pontosDaRaiz` é o
   `pontos` da raiz do esboço. Ordem de aplicação: centro, sobre, ponta ou haste (`de`/`para`);
   depois `alinha`, `encosta` e `desloca`. */
export function resolverOpcao(opcao, rotuloOpcao = 'opção', pontosDaRaiz = undefined) {
  exigir(Array.isArray(opcao.formas) && opcao.formas.length > 0, `${rotuloOpcao}: "formas" precisa ser uma lista não vazia`);
  const pontos = lerPontos(pontosDaRaiz, opcao, rotuloOpcao);
  const formas = expandirArranjos(opcao.formas, rotuloOpcao);
  const porId = new Map();
  for (const [i, f] of formas.entries()) {
    exigir(typeof f.id === 'string' && f.id, `${rotuloOpcao}, forma ${i + 1}: falta "id"`);
    exigir(!porId.has(f.id), `${rotuloOpcao}: id "${f.id}" repetido`);
    porId.set(f.id, f);
  }
  const prontas = new Map();
  const visitando = new Set();
  const resolver = (id) => {
    if (prontas.has(id)) return prontas.get(id);
    const f = porId.get(id);
    const onde = `${rotuloOpcao}, forma "${id}"`;
    exigir(!visitando.has(id), `${onde}: referência circular em sobre/ponta`);
    visitando.add(id);
    /* ponto: vetor, ponto nomeado ou "<id>.<ancora>" */
    const pontoDe = (v, campo) => {
      if (Array.isArray(v)) {
        exigir(v.length === 3 && v.every(Number.isFinite), `${onde}: "${campo}" deve ser [x, y, z] em mm, um ponto nomeado ou "<id>.<ancora>"`);
        return [...v];
      }
      exigir(typeof v === 'string', `${onde}: "${campo}" deve ser [x, y, z] em mm, um ponto nomeado ou "<id>.<ancora>"`);
      if (Object.hasOwn(pontos, v)) return [...pontos[v]];
      exigir(v.includes('.') || campo === 'centro', `${onde}: "${campo}" aponta para "${v}", que não é um ponto nomeado (pontos: ${Object.keys(pontos).join(', ') || 'nenhum'}) nem "<id>.<ancora>"`);
      return [...ancoraDe(v, onde, porId, resolver, visitando, campo)];
    };
    const referencia = (campo, refId) => {
      exigir(typeof refId === 'string' && porId.has(refId), `${onde}: "${campo}" aponta para "${refId}", que não existe nesta opção (ids: ${[...porId.keys()].join(', ')})`);
      exigir(!visitando.has(refId), `${onde}: referência circular em "${campo}": "${refId}" volta a depender desta forma`);
      return resolver(refId);
    };
    if (f.espelha !== undefined || f.arranjoDe !== undefined) {
      const r = copiaResolvida(f, id, onde, referencia, pontoDe);
      visitando.delete(id);
      prontas.set(id, r);
      return r;
    }
    const haste = f.de !== undefined || f.para !== undefined;
    let fPrisma = f;
    let m;
    let centro = [0, 0, 0];
    if (haste) {
      exigir(f.de !== undefined && f.para !== undefined, `${onde}: "de" e "para" vêm juntos`);
      exigir(f.tipo === 'cilindro' || f.tipo === 'caixa', `${onde}: "de"/"para" valem só em cilindro e caixa (a forma vira uma haste entre dois pontos)`);
      const proibidos = ['centro', 'sobre', 'ponta', 'rotacao', 'encosta', 'alinha'].filter((k) => f[k] !== undefined);
      exigir(proibidos.length === 0, `${onde}: "de"/"para" já definem o centro e a rotação; retire ${proibidos.map((k) => `"${k}"`).join(', ')} (use "desloca" para afastar a haste)`);
      const campoLongo = f.tipo === 'cilindro' ? 'comprimento' : 'altura';
      exigir(f[campoLongo] === undefined, `${onde}: "${campoLongo}" não pode vir junto de "de"/"para": o comprimento sai da distância entre os dois pontos`);
      const p0 = pontoDe(f.de, 'de');
      const p1 = pontoDe(f.para, 'para');
      const d = p1.map((c, i) => c - p0[i]);
      const comprimento = Math.hypot(...d);
      exigir(comprimento > 1e-9, `${onde}: "de" e "para" são o mesmo ponto`);
      const eixoLocal = f.tipo === 'caixa' ? 'y' : (f.eixo ?? 'y');
      exigir(EIXOS.includes(eixoLocal), `${onde}: "eixo" deve ser "x", "y" ou "z"`);
      fPrisma = { ...f, [campoLongo]: comprimento };
      m = rotacaoEntre(EIXOS.map((e) => (e === eixoLocal ? 1 : 0)), unit(d));
      centro = p0.map((c, i) => (c + p1[i]) / 2);
    } else {
      m = matrizRotacao(f.rotacao);
    }
    const pr = prisma(fPrisma, onde);
    const local = caixaLocal(pr, m);
    const modos = ['centro', 'sobre', 'ponta'].filter((k) => f[k] !== undefined);
    exigir(modos.length <= 1, `${onde}: use só um entre "centro", "sobre" e "ponta"`);
    if (haste) {
      /* o centro já saiu dos dois pontos */
    } else if (typeof f.centro === 'string') {
      centro = pontoDe(f.centro, 'centro');
    } else if (f.centro !== undefined) {
      exigir(Array.isArray(f.centro) && f.centro.length === 3 && f.centro.every(Number.isFinite), `${onde}: "centro" deve ser [x, y, z] em mm`);
      centro = [...f.centro];
    } else if (f.sobre !== undefined) {
      exigir(porId.has(f.sobre), `${onde}: "sobre" aponta para "${f.sobre}", que não existe nesta opção (ids: ${[...porId.keys()].join(', ')})`);
      const alvo = resolver(f.sobre);
      centro = [alvo.centro[0], alvo.max[1] - local.min[1], alvo.centro[2]];
    } else if (f.ponta !== undefined) {
      const { id: idAlvo, lado } = lerPonta(f);
      exigir(porId.has(idAlvo), `${onde}: "ponta" aponta para "${idAlvo}", que não existe nesta opção (ids: ${[...porId.keys()].join(', ')})`);
      exigir(LADOS.includes(lado), `${onde}: o lado da ponta deve ser um de ${LADOS.join(', ')}`);
      const alvo = resolver(idAlvo);
      const k = EIXOS.indexOf(lado[1]);
      centro = [...alvo.centro];
      centro[k] = lado[0] === '+' ? alvo.max[k] - local.min[k] : alvo.min[k] - local.max[k];
    }
    if (f.alinha !== undefined) {
      const al = f.alinha;
      exigir(al && typeof al === 'object' && !Array.isArray(al), `${onde}: "alinha" deve ser { "com": "<id>", "eixos": ["x", "z"] }`);
      const extras = Object.keys(al).filter((k) => !CHAVES_ALINHA.includes(k));
      exigir(extras.length === 0, `${onde}: "alinha" não tem o campo "${extras[0]}" (campos: ${CHAVES_ALINHA.join(', ')})`);
      exigir(Array.isArray(al.eixos) && al.eixos.length > 0 && al.eixos.every((e) => EIXOS_ALINHA.includes(e)) && new Set(al.eixos).size === al.eixos.length,
        `${onde}: "alinha.eixos" deve listar eixos distintos entre "x", "y" e "z"`);
      exigir(typeof al.com === 'string' && al.com, `${onde}: "alinha.com" deve ser o id de uma forma, "<id>.<ancora>" ou um ponto nomeado`);
      const alvo = porId.has(al.com) ? referencia('alinha.com', al.com).centro : pontoDe(al.com, 'alinha.com');
      for (const e of al.eixos) centro[EIXOS.indexOf(e)] = alvo[EIXOS.indexOf(e)];
    }
    if (f.encosta !== undefined) {
      const en = f.encosta;
      exigir(en && typeof en === 'object' && !Array.isArray(en), `${onde}: "encosta" deve ser { "referencia": "<id>", "direcao": [dx, dy, dz], "folga": mm }`);
      const extras = Object.keys(en).filter((k) => !CHAVES_ENCOSTA.includes(k));
      exigir(extras.length === 0, `${onde}: "encosta" não tem o campo "${extras[0]}" (campos: ${CHAVES_ENCOSTA.join(', ')})`);
      const direcao = typeof en.direcao === 'string' && LADOS.includes(en.direcao)
        ? EIXOS.map((e) => (e === en.direcao[1] ? (en.direcao[0] === '+' ? 1 : -1) : 0))
        : en.direcao;
      exigir(Array.isArray(direcao) && direcao.length === 3 && direcao.every(Number.isFinite) && Math.hypot(...direcao) > 0,
        `${onde}: "encosta.direcao" deve ser um vetor [dx, dy, dz] não nulo ou um lado (${LADOS.join(', ')})`);
      const folga = en.folga ?? 0;
      exigir(Number.isFinite(folga), `${onde}: "encosta.folga" deve ser um número em mm`);
      exigir(en.referencia !== id, `${onde}: "encosta" não pode ter a própria forma como referência`);
      const alvo = referencia('encosta', en.referencia);
      const dn = unit(direcao);
      const maxMovel = Math.max(...verticesLocais(pr, m).map((v) => escalarV(dn, v))) + escalarV(dn, centro);
      const minRef = Math.min(...verticesLocais(alvo.prisma, alvo.matriz).map((v) => escalarV(dn, v))) + escalarV(dn, alvo.centro);
      const t = minRef - maxMovel - folga;
      centro = centro.map((c, i) => c + dn[i] * t);
    }
    if (f.desloca !== undefined) {
      exigir(Array.isArray(f.desloca) && f.desloca.length === 3 && f.desloca.every(Number.isFinite), `${onde}: "desloca" deve ser [dx, dy, dz] em mm`);
      centro = centro.map((c, i) => c + f.desloca[i]);
    }
    const r = {
      id, forma: f, prisma: pr, centro, matriz: m,
      min: local.min.map((val, i) => val + centro[i]),
      max: local.max.map((val, i) => val + centro[i]),
    };
    visitando.delete(id);
    prontas.set(id, r);
    return r;
  };
  return formas.map((f) => resolver(f.id));
}

/* Projeções: tela (x para a direita, y para baixo) e profundidade para o observador. */
const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;
export const VISTAS = {
  isometrica: { olho: [1, 1, 1], p: ([x, y, z]) => [(x - z) * C30, -y + (x + z) * S30] },
  frontal: { olho: [0, 0, 1], p: ([x, y]) => [x, -y] },
  lateral: { olho: [1, 0, 0], p: ([, y, z]) => [-z, -y] },
  superior: { olho: [0, 1, 0], p: ([x, , z]) => [x, z] },
};
const LUZ = normalizar([-0.35, 1, 0.55]);

function normalizar(v) { const n = Math.hypot(...v) || 1; return v.map((c) => c / n); }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* Decompõe uma forma em blocos/fatias axiais discretas para Z-sorting robusto. */
function extrairArcosBorda(anel, normais, olho, mundo, w) {
  const N = anel.length;
  const vis = normais.map((n) => (!olho || dot(n, olho) > 1e-6));
  const arcos = [];

  let inicio = 0;
  while (inicio < N && vis[inicio]) inicio++;

  if (inicio === N) {
    const pts = anel.map((p) => mundo(p[0], p[1], w));
    pts.push(mundo(anel[0][0], anel[0][1], w));
    arcos.push(pts);
    return arcos;
  }

  for (let count = 0; count < N; count++) {
    const idx = (inicio + count) % N;
    if (vis[idx]) {
      const run = [anel[idx]];
      let j = idx;
      while (count < N && vis[j]) {
        run.push(anel[(j + 1) % N]);
        count++;
        j = (inicio + count) % N;
      }
      arcos.push(run.map((p) => mundo(p[0], p[1], w)));
    }
  }

  return arcos;
}

export function fatiarForma(r, olho) {
  const { b, perfil, furos, furo, comprimento } = r.prisma;
  const furosLista = furos ?? (furo ? [furo] : []);
  const c = r.centro;
  const m = r.matriz;
  const mundo = (u, v, w) => {
    const pl = ponto3(b, u, v, w);
    const pr = aplicarMatriz(pl, m);
    return [pr[0] + c[0], pr[1] + c[1], pr[2] + c[2]];
  };
  const rotNormal = (nl) => normalizar(aplicarMatriz(nl, m));
  const eixoN = (s) => rotNormal(ponto3(b, 0, 0, s));

  const area = (pl) => pl.reduce((s, p, i) => s + p[0] * pl[(i + 1) % pl.length][1] - pl[(i + 1) % pl.length][0] * p[1], 0);
  const anti = (pl) => (area(pl) >= 0 ? pl : [...pl].reverse());
  const pe = anti(perfil);
  const fus = furosLista.map((fu) => anti(fu));

  const fatias = comprimento <= 10 ? 1 : Math.max(1, Math.min(36, Math.ceil(comprimento / 5)));
  const chunks = [];

  for (let j = 0; j < fatias; j++) {
    const w0 = -comprimento / 2 + (j * comprimento) / fatias;
    const w1 = -comprimento / 2 + ((j + 1) * comprimento) / fatias;
    const wMid = (w0 + w1) / 2;
    const centroChunk = mundo(0, 0, wMid);
    const prof = dot(centroChunk, olho);

    const lados = [];
    const dentro = [];
    const linhas = [];
    const arcos = [];

    const procLateral = (anel, para, destino) => {
      const N = anel.length;
      const s = para === 'fora' ? 1 : -1;
      const normais = [];
      for (let i = 0; i < N; i++) {
        const a = anel[i];
        const d = anel[(i + 1) % N];
        const du = d[0] - a[0];
        const dv = d[1] - a[1];
        normais.push(rotNormal(ponto3(b, s * dv, -s * du, 0)));
      }

      for (let i = 0; i < N; i++) {
        const a = anel[i];
        const d = anel[(i + 1) % N];
        const n = normais[i];
        if (olho && dot(n, olho) <= 1e-6) continue;

        const nPrev = normais[(i - 1 + N) % N];
        const nNext = normais[(i + 1) % N];

        const silA = olho ? dot(n, olho) > 0 && dot(nPrev, olho) <= 0 : false;
        const silD = olho ? dot(n, olho) > 0 && dot(nNext, olho) <= 0 : false;
        const cos25 = Math.cos((25 * Math.PI) / 180);
        const vincA = dot(n, nPrev) < cos25 && (!olho || dot(n, olho) >= dot(nPrev, olho));
        const vincD = dot(n, nNext) < cos25 && (!olho || dot(n, olho) > dot(nNext, olho));

        const pts = [
          mundo(a[0], a[1], w0),
          mundo(d[0], d[1], w0),
          mundo(d[0], d[1], w1),
          mundo(a[0], a[1], w1),
        ];

        if (para === 'fora' && (silA || vincA)) linhas.push([mundo(a[0], a[1], w0), mundo(a[0], a[1], w1)]);
        if (para === 'fora' && (silD || vincD)) linhas.push([mundo(d[0], d[1], w0), mundo(d[0], d[1], w1)]);

        destino.push({ papel: para === 'fora' ? 'lado' : 'dentro', n, pts });
      }

      if (para === 'fora' && j === 0 && olho && dot(eixoN(-1), olho) <= 0) {
        for (const arc of extrairArcosBorda(anel, normais, olho, mundo, w0)) {
          arcos.push(arc);
        }
      }
    };

    procLateral(pe, 'fora', lados);
    for (const fu of fus) {
      procLateral(fu, 'dentro', dentro);
    }

    if (j === 0) {
      const n = eixoN(-1);
      if (!olho || dot(n, olho) > 1e-6) {
        chunks.push({
          r,
          prof: dot(mundo(0, 0, w0), olho),
          lados: [],
          dentro: [],
          linhas: [],
          arcos: [],
          tampas: [{
            papel: 'tampa',
            n,
            pts: perfil.map((p) => mundo(p[0], p[1], w0)),
            furos: fus.map((fu) => fu.map((p) => mundo(p[0], p[1], w0))),
            furo: fus[0] ? fus[0].map((p) => mundo(p[0], p[1], w0)) : null,
          }],
        });
      }
    }

    chunks.push({ r, prof, lados, dentro, linhas, arcos, tampas: [] });

    if (j === fatias - 1) {
      const n = eixoN(1);
      if (!olho || dot(n, olho) > 1e-6) {
        chunks.push({
          r,
          prof: dot(mundo(0, 0, w1), olho),
          lados: [],
          dentro: [],
          linhas: [],
          arcos: [],
          tampas: [{
            papel: 'tampa',
            n,
            pts: perfil.map((p) => mundo(p[0], p[1], w1)),
            furos: fus.map((fu) => fu.map((p) => mundo(p[0], p[1], w1))),
            furo: fus[0] ? fus[0].map((p) => mundo(p[0], p[1], w1)) : null,
          }],
        });
      }
    }
  }

  return chunks;
}

export function faces(r, olho) {
  const chunks = fatiarForma(r, olho);
  return chunks.flatMap((ch) => [...ch.lados, ...ch.dentro, ...ch.tampas]);
}

function cor(hex, fator) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  const v = m ? parseInt(m[1], 16) : 0x9aa3ad;
  const canal = (k) => Math.max(0, Math.min(255, Math.round(((v >> k) & 255) * fator)));
  return `#${[16, 8, 0].map((k) => canal(k).toString(16).padStart(2, '0')).join('')}`;
}

const CORES_NOMEADAS = { roxo: '#7b4fb0', verde: '#3f9b52', azul: '#3d6fb5', vermelho: '#c24a3a', laranja: '#e0892b', amarelo: '#e3c23a', cinza: '#9aa3ad', preto: '#333333', branco: '#eeeeee' };
const hexDe = (c) => CORES_NOMEADAS[c] ?? c;

/* Casco convexo 2D (cadeia monótona) para o contorno da silhueta. */
function casco(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inf = [];
  for (const q of p) { while (inf.length >= 2 && cruz(inf[inf.length - 2], inf[inf.length - 1], q) <= 0) inf.pop(); inf.push(q); }
  const sup = [];
  for (const q of p.reverse()) { while (sup.length >= 2 && cruz(sup[sup.length - 2], sup[sup.length - 1], q) <= 0) sup.pop(); sup.push(q); }
  return inf.slice(0, -1).concat(sup.slice(0, -1));
}

function pontoEmPoligono(p, poly) {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > p[1]) !== (yj > p[1])) &&
      (p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi);
    if (intersect) dentro = !dentro;
  }
  return dentro;
}

function distSegmento(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function distPoligono(p, poly) {
  if (pontoEmPoligono(p, poly)) return 0;
  let minD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = distSegmento(p, poly[i], poly[(i + 1) % poly.length]);
    if (d < minD) minD = d;
  }
  return minD;
}

const f1 = (x) => Math.round(x * 10) / 10;
const caminho = (pts) => `M${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join('L')}Z`;
const caminhoAberto = (pts) => `M${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join('L')}`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Quebra a frase em linhas de até n caracteres. */
function quebrar(texto, n) {
  const linhas = [];
  let atual = '';
  for (const p of String(texto ?? '').split(/\s+/).filter(Boolean)) {
    if ((atual + ' ' + p).trim().length > n) { if (atual) linhas.push(atual); atual = p; } else atual = (atual + ' ' + p).trim();
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/* Elementos do desenho que "ocultar" pode desligar. */
export const OCULTAVEIS = ['linhasCentro', 'legendas', 'numeracao', 'marcadores', 'escala', 'titulo', 'nota'];

function lerOcultar(lista, onde) {
  if (lista === undefined) return undefined;
  exigir(Array.isArray(lista), `${onde}: "ocultar" deve ser uma lista de nomes (válidos: ${OCULTAVEIS.join(', ')})`);
  for (const n of lista) {
    exigir(OCULTAVEIS.includes(n), `${onde}: "ocultar" não conhece "${n}" (válidos: ${OCULTAVEIS.join(', ')})`);
  }
  return new Set(lista);
}

/* Nível mais interno que declara "ocultar" vence; [] religa tudo. */
function ocultosDe(...niveis) {
  for (const n of niveis) if (n !== undefined) return n;
  return new Set();
}

/* Modos de legenda: "colunas" (padrão: linha de chamada até colunas laterais) e
   "lista" (balão numerado sobre a peça e chave numerada abaixo do desenho). */
export const MODOS_LEGENDAS = ['colunas', 'lista'];

function lerModoLegendas(v, onde) {
  if (v === undefined) return undefined;
  exigir(MODOS_LEGENDAS.includes(v), `${onde}: "legendas" deve ser ${MODOS_LEGENDAS.map((m) => `"${m}"`).join(' ou ')}`);
  return v;
}

/* Explosão: afasta as formas do centro do conjunto ao longo de um eixo, só no desenho.
   `{ eixo: "x" | "y" | "z", fator }`, com fator >= 1 (padrão 1,6). */
export const FATOR_DA_EXPLOSAO = 1.6;

export function lerExplosao(v, onde) {
  if (v === undefined) return undefined;
  const dica = '"explosao" deve ser { "eixo": "x" | "y" | "z", "fator": número maior ou igual a 1, por exemplo 1.6 }';
  exigir(v && typeof v === 'object' && !Array.isArray(v), `${onde}: ${dica}`);
  exigir(EIXOS.includes(v.eixo), `${onde}: ${dica}; o eixo "${v.eixo}" não existe`);
  const fator = v.fator ?? FATOR_DA_EXPLOSAO;
  exigir(typeof fator === 'number' && Number.isFinite(fator) && fator >= 1, `${onde}: ${dica}; o fator ${JSON.stringify(v.fator)} não serve`);
  return { eixo: v.eixo, fator };
}

/* Formas resolvidas com o centro afastado do centro do conjunto (a caixa que envolve todas
   elas) ao longo do eixo. Devolve cópias; as originais, e a geometria do gate, não mudam. */
export function explodir(formas, explosao) {
  if (!explosao || formas.length === 0) return formas;
  const k = EIXOS.indexOf(explosao.eixo);
  const c = (Math.min(...formas.map((r) => r.min[k])) + Math.max(...formas.map((r) => r.max[k]))) / 2;
  return formas.map((r) => {
    const delta = (r.centro[k] - c) * (explosao.fator - 1);
    if (delta === 0) return r;
    const desloca = (v) => v.map((x, i) => (i === k ? x + delta : x));
    return { ...r, centro: desloca(r.centro), min: desloca(r.min), max: desloca(r.max) };
  });
}

/* Opacidade da forma, de 0 a 1 (padrão 1, que não muda o desenho). */
function lerOpacidade(v, onde) {
  if (v === undefined) return undefined;
  exigir(typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1, `${onde}: "opacidade" deve ser um número de 0 a 1`);
  return v;
}

export function validarEsboco(bruto) {
  exigir(bruto && typeof bruto === 'object', 'o esboço precisa ser um objeto JSON');
  const esboco = expandirEsboco(bruto);
  exigir(Array.isArray(esboco.opcoes) && esboco.opcoes.length > 0, 'o esboço precisa de "opcoes": [{ titulo, nota, formas }]');
  const vista = esboco.vista ?? 'isometrica';
  exigir(VISTAS[vista], `"vista" deve ser uma de ${Object.keys(VISTAS).join(', ')}`);
  const topo = lerOcultar(esboco.ocultar, 'esboço');
  const modoTopo = lerModoLegendas(esboco.legendas, 'esboço');
  const explosaoTopo = lerExplosao(esboco.explosao, 'esboço');
  return {
    vista,
    opcoes: esboco.opcoes.map((o, i) => {
      const onde = `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`;
      const daOpcao = lerOcultar(o.ocultar, onde);
      const todas = resolverOpcao(o, onde, esboco.pontos);
      for (const r of todas) {
        r.ocultar = lerOcultar(r.forma.ocultar, `${onde}, forma "${r.id}"`);
        r.opacidade = lerOpacidade(r.forma.opacidade, `${onde}, forma "${r.id}"`);
      }
      const visiveis = todas.filter((r) => r.forma.oculto !== true);
      exigir(visiveis.length > 0, `${onde}: todas as formas estão com "oculto": true`);
      const modo = lerModoLegendas(o.legendas, onde) ?? modoTopo ?? 'colunas';
      const formas = explodir(visiveis, lerExplosao(o.explosao, onde) ?? explosaoTopo);
      return { opcao: o, formas, ocultosOpcao: ocultosDe(daOpcao, topo), modo };
    }),
  };
}

/* Grupos de fatias na ordem de itens (fatias contíguas; divide só penetrações em furos). */
function gruposDeFormas(p) {
  // 1. Spans de formas (mantém fatias contíguas e divide apenas penetrações em furos)
  const splitPoints = new Map();
  for (const itA of p.itens) {
    for (const itB of p.itens) {
      if (itA === itB) continue;
      const bTemFuro = itB.r.forma.diametroInterno !== undefined || itB.r.forma.furo !== undefined;
      if (bTemFuro) {
        const distEixo = Math.hypot(itA.r.centro[0] - itB.r.centro[0], itA.r.centro[1] - itB.r.centro[1]);
        const rFuro = (itB.r.forma.diametroInterno ?? 0) / 2;
        const minA = Math.min(...itA.chunks.map((c) => c.prof));
        const maxA = Math.max(...itA.chunks.map((c) => c.prof));
        const minB = Math.min(...itB.chunks.map((c) => c.prof));
        const maxB = Math.max(...itB.chunks.map((c) => c.prof));
        if (distEixo < rFuro && minA < minB && maxA > maxB) {
          if (!splitPoints.has(itA.r.forma.id)) splitPoints.set(itA.r.forma.id, []);
          splitPoints.get(itA.r.forma.id).push(maxB);
        }
      }
    }
  }

  const gruposChunks = [];
  for (const it of p.itens) {
    const splits = (splitPoints.get(it.r.forma.id) ?? []).sort((a, b) => a - b);
    if (splits.length === 0) {
      const minP = Math.min(...it.chunks.map((c) => c.prof));
      const maxP = Math.max(...it.chunks.map((c) => c.prof));
      gruposChunks.push({ tipo: 'forma', r: it.r, chunks: it.chunks, profMedia: (minP + maxP) / 2 });
    } else {
      let curr = [];
      let splitIdx = 0;
      for (const ch of it.chunks) {
        if (splitIdx < splits.length && ch.prof > splits[splitIdx] + 0.1) {
          if (curr.length > 0) {
            gruposChunks.push({
              tipo: 'forma',
              r: it.r,
              chunks: curr,
              profMedia: (curr[0].prof + curr[curr.length - 1].prof) / 2,
            });
            curr = [];
          }
          splitIdx++;
        }
        curr.push(ch);
      }
      if (curr.length > 0) {
        gruposChunks.push({
          tipo: 'forma',
          r: it.r,
          chunks: curr,
          profMedia: (curr[0].prof + curr[curr.length - 1].prof) / 2,
        });
      }
    }
  }
  return gruposChunks;
}

/* ---- Modo "lista": balão numerado sobre a peça e chave numerada abaixo do desenho ---- */
const CELULA = 2;
const RAIO_BALAO = 9;
const SEPARACAO_BALAO = 2 * RAIO_BALAO + 3;
const MARGEM_LISTA = 48;
const RESERVA_FOLGA = 16;
const NUMERO_PROPRIO = /^\s*\d+\s*[.\-–)]/;

/* Formas com rótulo e sem "legendas" oculto, na ordem do desenho. */
function entradasDaLista(p) {
  return p.itens
    .filter((it) => it.r.forma.rotulo && !ocultosDe(it.r.ocultar, p.ocultosOpcao).has('legendas'))
    .map((it, idx) => {
      const oc = ocultosDe(it.r.ocultar, p.ocultosOpcao);
      const texto = String(typeof it.r.forma.rotulo === 'object' ? it.r.forma.rotulo.texto : it.r.forma.rotulo);
      const proprio = NUMERO_PROPRIO.test(texto);
      return {
        it, texto, numero: idx + 1, proprio,
        exibido: proprio ? parseInt(texto, 10) : idx + 1,
        semNumero: oc.has('numeracao'), semMarcador: oc.has('marcadores'),
      };
    });
}

/* Chave em colunas (1 a 3), preenchidas de cima para baixo na ordem dos números. */
function layoutChave(entradas, ocultas) {
  const n = entradas.length;
  if (!n) return { altura: 0, colunas: 0, itens: [] };
  const colunas = n <= 4 ? 1 : n <= 10 ? 2 : 3;
  const porColuna = Math.ceil(n / colunas);
  const larguraColuna = (PAINEL_L - 40) / colunas;
  const chars = Math.max(10, Math.floor((larguraColuna - 32) / 7.4));
  const somas = new Array(colunas).fill(0);
  const itens = entradas.map((e, i) => {
    const c = Math.floor(i / porColuna);
    const comNumero = !e.semNumero && !e.proprio;
    const linhas = quebrar(e.texto + (ocultas.has(e.it) ? ' (oculta nesta vista)' : ''), comNumero ? chars : chars + 3);
    const y = somas[c];
    somas[c] += Math.max(1, linhas.length) * 17 + 4;
    return { e, c, y, linhas, comNumero, larguraColuna };
  });
  return { altura: Math.max(...somas), colunas, itens };
}

/* Preenche as células cujo centro está dentro dos anéis (par-ímpar) com o id. */
function preencherCelulas(alvo, W, H, x0, aneis, id) {
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const a of aneis) for (const q of a) { if (q[1] < ymin) ymin = q[1]; if (q[1] > ymax) ymax = q[1]; }
  const j0 = Math.max(0, Math.ceil(ymin / CELULA - 0.5));
  const j1 = Math.min(H - 1, Math.floor(ymax / CELULA - 0.5));
  let n = 0;
  for (let j = j0; j <= j1; j++) {
    const y = (j + 0.5) * CELULA;
    const xs = [];
    for (const a of aneis) {
      for (let k = 0; k < a.length; k++) {
        const p1 = a[k];
        const p2 = a[(k + 1) % a.length];
        if ((p1[1] <= y) !== (p2[1] <= y)) xs.push(p1[0] + ((y - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let m = 0; m + 1 < xs.length; m += 2) {
      const i0 = Math.max(0, Math.ceil((xs[m] - x0) / CELULA - 0.5));
      const i1 = Math.min(W - 1, Math.floor((xs[m + 1] - x0) / CELULA - 0.5));
      for (let i = i0; i <= i1; i++) { alvo[j * W + i] = id; n++; }
    }
  }
  if (n === 0 && aneis[0]?.length) {
    /* Face mais fina que uma célula: marca a célula do centróide. */
    const c = aneis[0].reduce((acc, q) => [acc[0] + q[0] / aneis[0].length, acc[1] + q[1] / aneis[0].length], [0, 0]);
    const i = Math.floor((c[0] - x0) / CELULA);
    const j = Math.floor(c[1] / CELULA);
    if (i >= 0 && i < W && j >= 0 && j < H) { alvo[j * W + i] = id; n = 1; }
  }
  return n;
}

/* Pinta os grupos na ordem do desenho (mesma oclusão: o último a pintar fica por cima). */
function pintarGrupos(alvo, W, H, x0, grupos, idxDe, V, tela) {
  const proj = (pts) => pts.map(V.p).map(tela);
  for (const g of grupos) {
    const id = idxDe.get(g.r);
    for (const ch of g.chunks) for (const f of [...ch.dentro, ...ch.lados]) preencherCelulas(alvo, W, H, x0, [proj(f.pts)], id);
    for (const ch of g.chunks) {
      for (const t of ch.tampas) {
        const furos = t.furos && t.furos.length > 0 ? t.furos : t.furo ? [t.furo] : [];
        preencherCelulas(alvo, W, H, x0, [proj(t.pts), ...furos.map(proj)], id);
      }
    }
  }
}

/* Distância (em células) de cada célula do id até a célula de outro dono, ou até a borda do painel. */
function folgaInterna(dono, W, H, id) {
  const d = new Float32Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = dono[i] === id ? 1e9 : 0;
  const R2 = Math.SQRT2;
  const viz = (i, j, v) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : d[j * W + i]) + v;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (d[k] === 0) continue;
      d[k] = Math.min(d[k], viz(i - 1, j, 1), viz(i, j - 1, 1), viz(i - 1, j - 1, R2), viz(i + 1, j - 1, R2));
    }
  }
  for (let j = H - 1; j >= 0; j--) {
    for (let i = W - 1; i >= 0; i--) {
      const k = j * W + i;
      if (d[k] === 0) continue;
      d[k] = Math.min(d[k], viz(i + 1, j, 1), viz(i, j + 1, 1), viz(i + 1, j + 1, R2), viz(i - 1, j + 1, R2));
    }
  }
  return d;
}

/* Escolhe o ponto de cada balão sobre a região visível da peça (mesma oclusão do desenho).
   Devolve { baloes: [{ id, numero, exibido, x, y, oculta, semNumero, semMarcador, u, v }], ocultas: Set(item) }. */
function planejarLista(p, entradas, geo, escala, V) {
  const { x0, tela } = geo;
  const W = Math.ceil(PAINEL_L / CELULA);
  const H = Math.ceil((TOPO + PAINEL_A) / CELULA);
  const grupos = gruposDeFormas(p).sort((a, b) => a.profMedia - b.profMedia);
  const idxDe = new Map(p.itens.map((it, i) => [it.r, i]));
  const dono = new Int16Array(W * H).fill(-1);
  pintarGrupos(dono, W, H, x0, grupos, idxDe, V, tela);

  const centroDe = (i, j) => [x0 + (i + 0.5) * CELULA, (j + 0.5) * CELULA];
  const celulasDe = new Map();
  for (let k = 0; k < dono.length; k++) {
    if (dono[k] < 0) continue;
    if (!celulasDe.has(dono[k])) celulasDe.set(dono[k], []);
    celulasDe.get(dono[k]).push(k);
  }
  const ocupados = [];
  const livre = (x, y) => ocupados.every((o) => Math.hypot(o[0] - x, o[1] - y) >= SEPARACAO_BALAO);
  const ocultas = new Set();
  const escolhidos = new Map();
  const idxItem = (e) => idxDe.get(e.it.r);

  /* Peças visíveis: das menores para as maiores, para as finas ficarem com o melhor ponto. */
  const visiveis = entradas.filter((e) => celulasDe.has(idxItem(e)));
  visiveis.sort((a, b) => celulasDe.get(idxItem(a)).length - celulasDe.get(idxItem(b)).length || a.numero - b.numero);
  for (const e of visiveis) {
    const id = idxItem(e);
    const cel = celulasDe.get(id);
    const folga = folgaInterna(dono, W, H, id);
    const mc = cel.reduce((acc, k) => [acc[0] + (k % W) / cel.length, acc[1] + Math.floor(k / W) / cel.length], [0, 0]);
    let melhor = cel[0];
    let notaMelhor = -Infinity;
    for (const k of cel) {
      const nota = folga[k] * 1000 - Math.hypot((k % W) - mc[0], Math.floor(k / W) - mc[1]);
      if (nota > notaMelhor) { notaMelhor = nota; melhor = k; }
    }
    const [bx, by] = centroDe(melhor % W, Math.floor(melhor / W));
    let escolha = melhor;
    let pos = [bx, by];
    if (!e.semMarcador && !livre(bx, by)) {
      /* Colide com outro balão: afasta do ponto ideal até a célula visível livre mais próxima. */
      let notaAfasta = Infinity;
      for (const k of cel) {
        const [x, y] = centroDe(k % W, Math.floor(k / W));
        if (!livre(x, y)) continue;
        const nota = Math.hypot(x - bx, y - by) - 0.5 * folga[k] * CELULA;
        if (nota < notaAfasta) { notaAfasta = nota; escolha = k; pos = [x, y]; }
      }
    }
    if (!e.semMarcador) ocupados.push(pos);
    escolhidos.set(e, { pos, oculta: false });
  }

  /* Peças sem nenhum ponto visível: balão tracejado na borda da silhueta de quem as oculta. */
  for (const e of entradas.filter((x) => !celulasDe.has(idxItem(x)))) {
    const id = idxItem(e);
    ocultas.add(e.it);
    const pegada = new Int16Array(W * H).fill(-1);
    pintarGrupos(pegada, W, H, x0, grupos.filter((g) => g.r === e.it.r), idxDe, V, tela);
    const contagem = new Map();
    let sx = 0; let sy = 0; let n = 0;
    for (let k = 0; k < pegada.length; k++) {
      if (pegada[k] < 0) continue;
      sx += k % W; sy += Math.floor(k / W); n++;
      if (dono[k] >= 0 && dono[k] !== id) contagem.set(dono[k], (contagem.get(dono[k]) ?? 0) + 1);
    }
    const alvo = n ? centroDe(sx / n - 0.5, sy / n - 0.5) : tela(V.p(e.it.r.centro));
    let oclusor = -1;
    let mais = 0;
    for (const [c, q] of [...contagem].sort((a, b) => a[0] - b[0])) if (q > mais) { mais = q; oclusor = c; }
    if (oclusor < 0) { /* sem cobertura identificável: usa a peça visível mais próxima do ponto */
      let dmin = Infinity;
      for (const [c, cel] of celulasDe) {
        for (const k of cel) { const [x, y] = centroDe(k % W, Math.floor(k / W)); const d = Math.hypot(x - alvo[0], y - alvo[1]); if (d < dmin) { dmin = d; oclusor = c; } }
      }
    }
    const cel = celulasDe.get(oclusor) ?? [];
    const dv = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : dono[j * W + i]);
    const bordaCom = (k, aceita) => {
      const i = k % W; const j = Math.floor(k / W);
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => aceita(dv(i + a, j + b)));
    };
    let borda = cel.filter((k) => bordaCom(k, (o) => o === -1));
    if (!borda.length) borda = cel.filter((k) => bordaCom(k, (o) => o !== oclusor));
    let pos = alvo;
    let dmin = Infinity;
    for (const k of borda) {
      const [x, y] = centroDe(k % W, Math.floor(k / W));
      if (!livre(x, y)) continue;
      const d = Math.hypot(x - alvo[0], y - alvo[1]);
      if (d < dmin) { dmin = d; pos = [x, y]; }
    }
    if (!e.semMarcador) ocupados.push(pos);
    escolhidos.set(e, { pos, oculta: true });
  }

  const inversa = (x, y) => {
    /* Coordenadas no plano da vista (mm), para conferência. */
    const a = tela([0, 0]);
    const b = tela([1, 1]);
    return [(x - a[0]) / (b[0] - a[0]), (y - a[1]) / (b[1] - a[1])];
  };
  const baloes = entradas.map((e) => {
    const { pos, oculta } = escolhidos.get(e);
    const [u, v] = inversa(pos[0], pos[1]);
    return { id: e.it.r.id, numero: e.numero, exibido: e.exibido, x: pos[0], y: pos[1], u, v, oculta, semNumero: e.semNumero, semMarcador: e.semMarcador };
  });
  return { baloes, ocultas };
}

/* Chave numerada abaixo do desenho e balões sobre as peças. */
function desenharLegendasLista(partes, chave, plano, x0) {
  if (chave.itens.length) {
    const topo = TOPO + PAINEL_A + 6;
    partes.push(`<line x1="${x0 + 24}" y1="${topo - 10}" x2="${x0 + PAINEL_L - 24}" y2="${topo - 10}" stroke="#dddddd" stroke-width="1.5"/>`);
    for (const it of chave.itens) {
      const xc = x0 + 20 + it.c * it.larguraColuna;
      it.linhas.forEach((l, i) => {
        const y = topo + it.y + 13 + i * 17;
        if (it.comNumero) {
          if (i === 0) partes.push(`<text x="${f1(xc)}" y="${f1(y)}" font-size="14" font-weight="bold">${it.e.exibido}</text>`);
          partes.push(`<text x="${f1(xc + 26)}" y="${f1(y)}" font-size="14">${esc(l)}</text>`);
        } else {
          partes.push(`<text x="${f1(xc)}" y="${f1(y)}" font-size="14" font-weight="${i === 0 ? 'bold' : 'normal'}">${esc(l)}</text>`);
        }
      });
    }
  }
  for (const b of plano.baloes) {
    if (b.semMarcador) continue;
    const tracejado = b.oculta ? ' stroke-dasharray="3,2.5"' : '';
    partes.push(`<circle data-balao="${b.exibido}" cx="${f1(b.x)}" cy="${f1(b.y)}" r="${RAIO_BALAO}" fill="#ffffff" stroke="#111111" stroke-width="1.5"${tracejado}/>`);
    if (!b.semNumero) partes.push(`<text x="${f1(b.x)}" y="${f1(b.y + 4)}" font-size="12" font-weight="bold" text-anchor="middle">${b.exibido}</text>`);
  }
}

/* Desenha o esboço inteiro; devolve { svg, largura, altura, escala }. */
export function desenharEsboco(esboco) {
  const { vista, opcoes } = validarEsboco(esboco);
  const V = VISTAS[vista];
  const olho = normalizar(V.olho);
  const projetadas = opcoes.map(({ opcao, formas, ocultosOpcao, modo }) => {
    const itens = formas.map((r) => {
      const chunks = fatiarForma(r, olho);
      const fs = chunks.flatMap((ch) => [...ch.lados, ...ch.dentro, ...ch.tampas]);
      const todos = fs.flatMap((f) => f.pts).map(V.p);
      return { r, chunks, fs, casco: casco(todos), prof: dot(r.centro, olho) };
    });
    const pts = itens.flatMap((i) => i.casco);
    const min = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))];
    const max = [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
    return { opcao, itens, min, max, ocultosOpcao, modo };
  });
  /* Mesma escala para todas: a maior opção cabe no painel, com folga para rótulos. */
  const larg = Math.max(...projetadas.map((p) => p.max[0] - p.min[0]));
  const alt = Math.max(...projetadas.map((p) => p.max[1] - p.min[1]));
  const temLista = projetadas.some((p) => p.modo === 'lista');
  const temColunas = projetadas.some((p) => p.modo !== 'lista');
  const escalaColunas = Math.min((PAINEL_L - 340) / larg, (PAINEL_A - 40) / alt);
  /* Modo lista: sem colunas laterais o desenho usa a largura toda; a chave ganha uma faixa
     própria abaixo do desenho, e o quadro cresce em altura o que a chave ocupa. */
  let escala = escalaColunas;
  const planos = new Map();
  let extra = 0;
  const geometria = (p, k, esc) => {
    const x0 = k * PAINEL_L;
    const cx = x0 + PAINEL_L / 2 - ((p.min[0] + p.max[0]) / 2) * esc;
    const cy = TOPO + PAINEL_A / 2 - ((p.min[1] + p.max[1]) / 2) * esc;
    return { x0, cx, cy, tela: (q) => [cx + q[0] * esc, cy + q[1] * esc] };
  };
  if (temLista) {
    escala = Math.min((PAINEL_L - 2 * MARGEM_LISTA) / larg, (PAINEL_A - 40) / alt);
    if (temColunas) escala = Math.min(escala, escalaColunas);
    projetadas.forEach((p, k) => {
      if (p.modo !== 'lista') return;
      const entradas = entradasDaLista(p);
      const plano = planejarLista(p, entradas, geometria(p, k, escala), escala, V);
      planos.set(p, { entradas, plano, chave: layoutChave(entradas, plano.ocultas) });
    });
    const alturaChave = Math.max(0, ...[...planos.values()].map((q) => q.chave.altura));
    if (alturaChave > 0) extra = alturaChave + RESERVA_FOLGA;
  }
  const baloes = [];
  const largura = PAINEL_L * opcoes.length;
  const altura = TOPO + PAINEL_A + extra + RODAPE;
  const partes = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${largura}" height="${altura}" fill="#ffffff"/>`];
  projetadas.forEach((p, k) => {
    const ehLista = p.modo === 'lista';
    const { x0, tela } = geometria(p, k, escala);
    if (k > 0) partes.push(`<line x1="${x0}" y1="20" x2="${x0}" y2="${altura - 20}" stroke="#cccccc" stroke-width="2"/>`);
    if (!p.ocultosOpcao.has('titulo')) partes.push(`<text x="${x0 + PAINEL_L / 2}" y="44" font-size="26" font-weight="bold" text-anchor="middle">${esc(p.opcao.titulo ?? `Opção ${k + 1}`)}</text>`);

    const gruposChunks = gruposDeFormas(p);

    /* Linhas de centro: eixos de rotação (cilindros/anéis) e furos passantes. */
    const ocultosDaForma = (r) => ocultosDe(r.ocultar, p.ocultosOpcao);
    const querLinhasCentroGeral = p.opcao.linhasCentro !== undefined
      ? Boolean(p.opcao.linhasCentro)
      : Boolean(esboco.linhasCentro);
    const segmentosCentro = [];

    for (const it of p.itens) {
      const f = it.r.forma;
      const querCentro = f.linhaCentro !== undefined ? Boolean(f.linhaCentro) : querLinhasCentroGeral;
      if (!querCentro || ocultosDaForma(it.r).has('linhasCentro')) continue;

      const ext = typeof f.linhaCentro === 'object' && typeof f.linhaCentro.extensao === 'number'
        ? f.linhaCentro.extensao
        : Math.max(8, 0.12 * (f.diametroExterno ?? f.diametro ?? 0));

      const mundoDe = (u, v, w) => {
        const pl = ponto3(it.r.prisma.b, u, v, w);
        const pr = aplicarMatriz(pl, it.r.matriz);
        return [pr[0] + it.r.centro[0], pr[1] + it.r.centro[1], pr[2] + it.r.centro[2]];
      };

      if (f.tipo === 'cilindro' || f.tipo === 'anel') {
        const L = it.r.prisma.comprimento;
        const p1 = mundoDe(0, 0, -L / 2);
        const p2 = mundoDe(0, 0, L / 2);
        segmentosCentro.push({ p1, p2, ext, ehEixo: true });
      } else if (f.tipo === 'caixa') {
        const L = it.r.prisma.comprimento;
        const centrosFuros = [];
        if (Array.isArray(f.furos)) {
          for (const item of f.furos) centrosFuros.push(item.centro ?? [0, 0]);
        } else if (f.furo && typeof f.furo === 'object') {
          centrosFuros.push(f.furo.centro ?? [0, 0]);
        }
        for (const cf of centrosFuros) {
          const p1 = mundoDe(cf[0], cf[1], -L / 2);
          const p2 = mundoDe(cf[0], cf[1], L / 2);
          segmentosCentro.push({ p1, p2, ext, ehEixo: false });
        }
      }
    }

    // Fusão de segmentos colineares (mesmo eixo geométrico 3D)
    const gruposColineares = new Map();
    for (const seg of segmentosCentro) {
      const v = [seg.p2[0] - seg.p1[0], seg.p2[1] - seg.p1[1], seg.p2[2] - seg.p1[2]];
      const len = Math.hypot(...v);
      if (len < 1e-4) continue;
      let d = [v[0] / len, v[1] / len, v[2] / len];
      if (d[0] < -1e-4 || (Math.abs(d[0]) <= 1e-4 && (d[1] < -1e-4 || (Math.abs(d[1]) <= 1e-4 && d[2] < -1e-4)))) {
        d = [-d[0], -d[1], -d[2]];
      }
      const proj = seg.p1[0] * d[0] + seg.p1[1] * d[1] + seg.p1[2] * d[2];
      const p0 = [seg.p1[0] - proj * d[0], seg.p1[1] - proj * d[1], seg.p1[2] - proj * d[2]];
      const chave = `${d.map((n) => Math.round(n * 100)).join(',')}|${p0.map((n) => Math.round(n * 2)).join(',')}`;
      if (!gruposColineares.has(chave)) {
        gruposColineares.set(chave, { d, p0, tMin: Infinity, tMax: -Infinity, extMax: 0, ehEixo: false });
      }
      const g = gruposColineares.get(chave);
      const t1 = seg.p1[0] * d[0] + seg.p1[1] * d[1] + seg.p1[2] * d[2];
      const t2 = seg.p2[0] * d[0] + seg.p2[1] * d[1] + seg.p2[2] * d[2];
      g.tMin = Math.min(g.tMin, t1, t2);
      g.tMax = Math.max(g.tMax, t1, t2);
      g.extMax = Math.max(g.extMax, seg.ext);
      if (seg.ehEixo) g.ehEixo = true;
    }

    for (const g of gruposColineares.values()) {
      const pIni = [
        g.p0[0] + (g.tMin - g.extMax) * g.d[0],
        g.p0[1] + (g.tMin - g.extMax) * g.d[1],
        g.p0[2] + (g.tMin - g.extMax) * g.d[2],
      ];
      const pFim = [
        g.p0[0] + (g.tMax + g.extMax) * g.d[0],
        g.p0[1] + (g.tMax + g.extMax) * g.d[1],
        g.p0[2] + (g.tMax + g.extMax) * g.d[2],
      ];
      const q1 = tela(V.p(pIni));
      const q2 = tela(V.p(pFim));
      const prof = g.ehEixo
        ? Math.max(dot(pIni, olho), dot(pFim, olho)) + 0.5
        : dot([(pIni[0] + pFim[0]) / 2, (pIni[1] + pFim[1]) / 2, (pIni[2] + pFim[2]) / 2], olho);

      gruposChunks.push({
        tipo: 'linhaCentro',
        profMedia: prof,
        ch: { q1, q2 },
      });
    }

    gruposChunks.sort((a, b) => a.profMedia - b.profMedia);

    function encadearLinhas(linhas2d) {
      const segs = linhas2d.map(([p1, p2]) => [p1, p2]);
      const cadeias = [];
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

      while (segs.length > 0) {
        let cadeia = segs.pop();
        let expandiu = true;
        while (expandiu) {
          expandiu = false;
          const head = cadeia[0];
          const tail = cadeia[cadeia.length - 1];

          for (let i = 0; i < segs.length; i++) {
            const [p1, p2] = segs[i];
            if (dist(tail, p1) < 0.5) {
              cadeia.push(p2);
              segs.splice(i, 1);
              expandiu = true;
              break;
            } else if (dist(tail, p2) < 0.5) {
              cadeia.push(p1);
              segs.splice(i, 1);
              expandiu = true;
              break;
            } else if (dist(head, p2) < 0.5) {
              cadeia.unshift(p1);
              segs.splice(i, 1);
              expandiu = true;
              break;
            } else if (dist(head, p1) < 0.5) {
              cadeia.unshift(p2);
              segs.splice(i, 1);
              expandiu = true;
              break;
            }
          }
        }
        cadeias.push(cadeia);
      }
      return cadeias;
    }

    for (const g of gruposChunks) {
      if (g.tipo === 'linhaCentro') {
        /* Contorno claro sob o traço: mantém a linha legível sobre peças escuras. */
        partes.push(`<line x1="${f1(g.ch.q1[0])}" y1="${f1(g.ch.q1[1])}" x2="${f1(g.ch.q2[0])}" y2="${f1(g.ch.q2[1])}" stroke="#ffffff" stroke-opacity="0.75" stroke-width="3.2" stroke-linecap="round"/>`);
        partes.push(`<line x1="${f1(g.ch.q1[0])}" y1="${f1(g.ch.q1[1])}" x2="${f1(g.ch.q2[0])}" y2="${f1(g.ch.q2[1])}" stroke="#2d3748" stroke-width="1.2" stroke-dasharray="14,3,2,3" stroke-linecap="round"/>`);
        continue;
      }

      const base = hexDe(g.r.forma.cor);
      const tint = (n) => cor(base, 0.55 + 0.5 * Math.max(0, dot(n, LUZ)));
      /* opacidade: o grupo inteiro da forma é composto de uma vez, sem escurecer onde suas faces se tocam */
      const translucida = g.r.opacidade !== undefined && g.r.opacidade < 1;
      if (translucida) partes.push(`<g opacity="${g.r.opacidade}">`);

      // 1. Faces coloridas
      for (const ch of g.chunks) {
        for (const f of [...ch.dentro, ...ch.lados]) {
          const c = tint(f.n);
          partes.push(`<path d="${caminho(f.pts.map(V.p).map(tela))}" fill="${c}" stroke="${c}" stroke-width="0.8" stroke-linejoin="round"/>`);
        }
      }

      // 2. Tampas
      for (const ch of g.chunks) {
        for (const t of ch.tampas) {
          let d = caminho(t.pts.map(V.p).map(tela));
          if (t.furos && t.furos.length > 0) {
            for (const f of t.furos) {
              d += ' ' + caminho(f.map(V.p).map(tela));
            }
          } else if (t.furo) {
            d += ' ' + caminho(t.furo.map(V.p).map(tela));
          }
          partes.push(`<path d="${d}" fill="${tint(t.n)}" fill-rule="evenodd" stroke="#111111" stroke-width="2" stroke-linejoin="round"/>`);
        }
      }

      // 3. Arcos de borda traseira
      for (const ch of g.chunks) {
        for (const arc of ch.arcos ?? []) {
          if (arc.length < 2) continue;
          partes.push(`<path d="${caminhoAberto(arc.map(V.p).map(tela))}" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
        }
      }

      // 4. Silhuetas axiais contínuas encadeadas
      const todasLinhas2d = g.chunks.flatMap((ch) => ch.linhas.map((l) => l.map(V.p).map(tela)));
      const cadeias = encadearLinhas(todasLinhas2d);
      for (const cadeia of cadeias) {
        if (cadeia.length < 2) continue;
        if (cadeia.length === 2) {
          partes.push(`<line x1="${f1(cadeia[0][0])}" y1="${f1(cadeia[0][1])}" x2="${f1(cadeia[1][0])}" y2="${f1(cadeia[1][1])}" stroke="#111111" stroke-width="2" stroke-linecap="round"/>`);
        } else {
          partes.push(`<path d="${caminhoAberto(cadeia)}" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
        }
      }
      if (translucida) partes.push('</g>');
    }

    if (ehLista) {
      const { plano, chave } = planos.get(p);
      for (const b of plano.baloes) baloes.push({ opcao: k, ...b });
      desenharLegendasLista(partes, chave, plano, x0);
    } else {
      /* Rótulos: fora do desenho, à esquerda ou à direita, empilhados sem colidir. */
      const esquerda = x0 + 20;
      const direita = x0 + PAINEL_L - 20;
      const meio = x0 + PAINEL_L / 2;
      const contagemLados = { e: 0, d: 0 };
      const rotulados = p.itens
        .filter((it) => it.r.forma.rotulo && !ocultosDaForma(it.r).has('legendas'))
        .map((it, idx) => {
          const rotInfo = typeof it.r.forma.rotulo === 'object'
            ? it.r.forma.rotulo
            : { texto: it.r.forma.rotulo };
          const cTela = tela(V.p(it.r.centro));
          const corPeca = hexDe(it.r.forma.cor);
          const fForma = it.r.forma;
          const dimMm = fForma.diametro ?? fForma.diametroExterno ?? fForma.largura ?? 40;
          const raioTela = Math.max(14, (dimMm / 2) * escala * 0.75);

          // Pontos de amostragem da peça nas faces externas (exclui paredes internas de furos)
          const facesExternas = it.chunks.flatMap((ch) => [...ch.lados, ...ch.tampas]);
          const ptsVertices = facesExternas.flatMap((f) => f.pts).map(V.p).map(tela);
          const ptsCentros = facesExternas.map((f) => {
            const m = f.pts.reduce((acc, p) => [acc[0] + p[0] / f.pts.length, acc[1] + p[1] / f.pts.length, acc[2] + p[2] / f.pts.length], [0, 0, 0]);
            return tela(V.p(m));
          });
          const todosPontos = [...ptsVertices, ...ptsCentros];

          // Furos da própria peça projetados na tela
          const furosTela = it.chunks
            .flatMap((ch) => ch.tampas)
            .flatMap((t) => t.furos ?? (t.furo ? [t.furo] : []))
            .map((fu) => fu.map(V.p).map(tela));

          // Peças que estão na frente desta (profundidade maior no espaço isométrico)
          const pecasNaFrente = p.itens.filter((o) => o !== it && o.prof > it.prof - 5);

          // Avalia o melhor ponto de âncora para cada lado ('e' ou 'd')
          const avaliarLado = (ladoCand) => {
            const alvoX = cTela[0] + (ladoCand === 'e' ? -raioTela : raioTela);
            const alvoY = cTela[1];
            let melhor = todosPontos[0] ?? cTela;
            let melhorScore = Infinity;
            let menorOclusao = Infinity;

            for (const pt of todosPontos) {
              // Penaliza pontos que apontam no sentido oposto ao rótulo
              const penalidadeLado = ladoCand === 'e' ? (pt[0] > cTela[0] ? 80 : 0) : (pt[0] < cTela[0] ? 80 : 0);
              
              // Penalidade de oclusão por peças que estão na frente
              let penalidadeOclusao = 0;
              for (const frente of pecasNaFrente) {
                const poly = frente.casco.map(tela);
                const dist = distPoligono(pt, poly);
                if (dist === 0) {
                  penalidadeOclusao += 5000;
                } else if (dist < 18) {
                  penalidadeOclusao += (18 - dist) * 150;
                }
              }

              // Penalidade de proximidade a furos da própria peça (evita ancorar no furo)
              let penalidadeFuro = 0;
              for (const fTela of furosTela) {
                const distF = distPoligono(pt, fTela);
                if (distF === 0) {
                  penalidadeFuro += 6000;
                } else if (distF < 16) {
                  penalidadeFuro += (16 - distF) * 250;
                }
              }

              const distAlvo = Math.hypot(pt[0] - alvoX, pt[1] - alvoY);
              const scoreTotal = distAlvo + penalidadeLado + penalidadeOclusao + penalidadeFuro;
              if (scoreTotal < melhorScore) {
                melhorScore = scoreTotal;
                melhor = pt;
                menorOclusao = penalidadeOclusao;
              }
            }
            return { pt: melhor, score: melhorScore, oclusao: menorOclusao };
          };

          const resE = avaliarLado('e');
          const resD = avaliarLado('d');

          let lado;
          if (rotInfo.lado) {
            lado = String(rotInfo.lado).startsWith('d') ? 'd' : 'e';
          } else {
            // Se um lado tiver oclusão severa e o outro não, escolhe o lado livre
            if (resE.oclusao > 100 && resD.oclusao <= 100) {
              lado = 'd';
            } else if (resD.oclusao > 100 && resE.oclusao <= 100) {
              lado = 'e';
            } else {
              // Ambos os lados livres ou equivalentes: balanceia número de rótulos
              if (contagemLados.e !== contagemLados.d) {
                lado = contagemLados.e < contagemLados.d ? 'e' : 'd';
              } else {
                lado = cTela[0] < meio ? 'e' : 'd';
              }
            }
          }
          contagemLados[lado]++;

          const melhorPt = (lado === 'e' ? resE : resD).pt;
          const dx = melhorPt[0] - cTela[0];
          const dy = melhorPt[1] - cTela[1];
          const distC = Math.hypot(dx, dy) || 1;
          const ancora = [melhorPt[0] - (dx / distC) * 3, melhorPt[1] - (dy / distC) * 3];

          return {
            it,
            texto: rotInfo.texto,
            numero: idx + 1,
            semNumero: ocultosDaForma(it.r).has('numeracao'),
            semMarcador: ocultosDaForma(it.r).has('marcadores'),
            ancora,
            lado,
            corPeca,
          };
        });

      for (const lado of ['e', 'd']) {
        const grupo = rotulados.filter((r) => r.lado === lado).sort((a, b) => a.ancora[1] - b.ancora[1]);
        let ultimo = TOPO + 10;
        for (const r of grupo) {
          const textoCompleto = r.semNumero || /^\s*\d+\s*[.\-–)]/.test(r.texto) ? r.texto : `${r.numero}. ${r.texto}`;
          const linhas = quebrar(textoCompleto, 20);
          const y = Math.max(r.ancora[1], ultimo + 12);
          ultimo = y + linhas.length * 20;
          const xt = lado === 'e' ? esquerda : direita;
          const xl = lado === 'e' ? esquerda + 145 : direita - 145;
          partes.push(`<polyline points="${f1(xl)},${f1(y)} ${f1(r.ancora[0])},${f1(r.ancora[1])}" fill="none" stroke="#222222" stroke-width="1.5"/>`);
          if (!r.semMarcador) partes.push(`<circle cx="${f1(r.ancora[0])}" cy="${f1(r.ancora[1])}" r="5" fill="${r.corPeca}" stroke="#111111" stroke-width="1.5"/>`);
          linhas.forEach((l, i) => partes.push(`<text x="${xt}" y="${f1(y + 6 + i * 20)}" font-size="15" font-weight="${i === 0 ? 'bold' : 'normal'}" text-anchor="${lado === 'e' ? 'start' : 'end'}">${esc(l)}</text>`));
        }
      }
    }
    if (!p.ocultosOpcao.has('nota')) quebrar(p.opcao.nota, 58).slice(0, 3).forEach((l, i) => partes.push(`<text x="${x0 + PAINEL_L / 2}" y="${TOPO + PAINEL_A + extra + 26 + i * 24}" font-size="19" text-anchor="middle">${esc(l)}</text>`));
  });
  /* Barra de escala de 100 mm, igual para todas as opções. */
  const barra = 100 * escala;
  if (!projetadas.every((p) => p.ocultosOpcao.has('escala'))) partes.push(`<line x1="20" y1="${altura - 14}" x2="${f1(20 + barra)}" y2="${altura - 14}" stroke="#111111" stroke-width="3"/><text x="${f1(28 + barra)}" y="${altura - 9}" font-size="14">100 mm</text>`);
  partes.push('</svg>');
  const saida = { svg: partes.join('\n'), largura, altura, escala };
  if (temLista) saida.baloes = baloes;
  return saida;
}
