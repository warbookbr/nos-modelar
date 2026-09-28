/* Esboço de opções de forma: lê a declaração de cilindros, anéis e caixas em
   milímetro, resolve as posições relativas (sobre, ponta) e desenha as opções
   lado a lado na mesma escala, em SVG. Não depende de Three.js nem de domínio;
   a conversão para PNG fica na ferramenta de linha de comando. */

const EIXOS = ['x', 'y', 'z'];
const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z'];
const SEGMENTOS = 64;
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

/* Resolve a posição de cada forma. Devolve formas com centro e caixa no mundo. */
export function resolverOpcao(opcao, rotuloOpcao = 'opção') {
  exigir(Array.isArray(opcao.formas) && opcao.formas.length > 0, `${rotuloOpcao}: "formas" precisa ser uma lista não vazia`);
  const porId = new Map();
  for (const [i, f] of opcao.formas.entries()) {
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
    const pr = prisma(f, onde);
    const m = matrizRotacao(f.rotacao);
    const local = caixaLocal(pr, m);
    const modos = ['centro', 'sobre', 'ponta'].filter((k) => f[k] !== undefined);
    exigir(modos.length <= 1, `${onde}: use só um entre "centro", "sobre" e "ponta"`);
    let centro = [0, 0, 0];
    if (f.centro !== undefined) {
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
  return opcao.formas.map((f) => resolver(f.id));
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

  const fatias = comprimento <= 15 ? 1 : Math.max(1, Math.min(24, Math.ceil(comprimento / 12)));
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
    const tampas = [];

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

        if (silA || vincA) linhas.push([mundo(a[0], a[1], w0), mundo(a[0], a[1], w1)]);
        if (silD || vincD) linhas.push([mundo(d[0], d[1], w0), mundo(d[0], d[1], w1)]);
        if (j === 0 && olho && dot(eixoN(-1), olho) <= 0) {
          linhas.push([mundo(a[0], a[1], w0), mundo(d[0], d[1], w0)]);
        }

        destino.push({ papel: para === 'fora' ? 'lado' : 'dentro', n, pts });
      }
    };

    procLateral(pe, 'fora', lados);
    for (const fu of fus) {
      procLateral(fu, 'dentro', dentro);
    }

    if (j === 0) {
      const n = eixoN(-1);
      if (!olho || dot(n, olho) > 1e-6) {
        tampas.push({
          papel: 'tampa',
          n,
          pts: perfil.map((p) => mundo(p[0], p[1], w0)),
          furos: fus.map((fu) => fu.map((p) => mundo(p[0], p[1], w0))),
          furo: fus[0] ? fus[0].map((p) => mundo(p[0], p[1], w0)) : null,
        });
      }
    }
    if (j === fatias - 1) {
      const n = eixoN(1);
      if (!olho || dot(n, olho) > 1e-6) {
        tampas.push({
          papel: 'tampa',
          n,
          pts: perfil.map((p) => mundo(p[0], p[1], w1)),
          furos: fus.map((fu) => fu.map((p) => mundo(p[0], p[1], w1))),
          furo: fus[0] ? fus[0].map((p) => mundo(p[0], p[1], w1)) : null,
        });
      }
    }

    chunks.push({ r, prof, lados, dentro, linhas, tampas });
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

const f1 = (x) => Math.round(x * 10) / 10;
const caminho = (pts) => `M${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join('L')}Z`;
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

export function validarEsboco(esboco) {
  exigir(esboco && typeof esboco === 'object', 'o esboço precisa ser um objeto JSON');
  exigir(Array.isArray(esboco.opcoes) && esboco.opcoes.length > 0, 'o esboço precisa de "opcoes": [{ titulo, nota, formas }]');
  const vista = esboco.vista ?? 'isometrica';
  exigir(VISTAS[vista], `"vista" deve ser uma de ${Object.keys(VISTAS).join(', ')}`);
  return { vista, opcoes: esboco.opcoes.map((o, i) => ({ opcao: o, formas: resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`) })) };
}

/* Desenha o esboço inteiro; devolve { svg, largura, altura, escala }. */
export function desenharEsboco(esboco) {
  const { vista, opcoes } = validarEsboco(esboco);
  const V = VISTAS[vista];
  const olho = normalizar(V.olho);
  const projetadas = opcoes.map(({ opcao, formas }) => {
    const itens = formas.map((r) => {
      const chunks = fatiarForma(r, olho);
      const fs = chunks.flatMap((ch) => [...ch.lados, ...ch.dentro, ...ch.tampas]);
      const todos = fs.flatMap((f) => f.pts).map(V.p);
      return { r, chunks, fs, casco: casco(todos), prof: dot(r.centro, olho) };
    });
    const pts = itens.flatMap((i) => i.casco);
    const min = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))];
    const max = [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
    return { opcao, itens, min, max };
  });
  /* Mesma escala para todas: a maior opção cabe no painel, com folga para rótulos. */
  const larg = Math.max(...projetadas.map((p) => p.max[0] - p.min[0]));
  const alt = Math.max(...projetadas.map((p) => p.max[1] - p.min[1]));
  const escala = Math.min((PAINEL_L - 340) / larg, (PAINEL_A - 40) / alt);
  const largura = PAINEL_L * opcoes.length;
  const altura = TOPO + PAINEL_A + RODAPE;
  const partes = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="${largura}" height="${altura}" fill="#ffffff"/>`];
  projetadas.forEach((p, k) => {
    const x0 = k * PAINEL_L;
    const cx = x0 + PAINEL_L / 2 - ((p.min[0] + p.max[0]) / 2) * escala;
    const cy = TOPO + PAINEL_A / 2 - ((p.min[1] + p.max[1]) / 2) * escala;
    const tela = (q) => [cx + q[0] * escala, cy + q[1] * escala];
    if (k > 0) partes.push(`<line x1="${x0}" y1="20" x2="${x0}" y2="${altura - 20}" stroke="#cccccc" stroke-width="2"/>`);
    partes.push(`<text x="${x0 + PAINEL_L / 2}" y="44" font-size="26" font-weight="bold" text-anchor="middle">${esc(p.opcao.titulo ?? `Opção ${k + 1}`)}</text>`);

    const todosChunks = p.itens.flatMap((it) => it.chunks);
    todosChunks.sort((a, b) => {
      if (Math.abs(a.prof - b.prof) > 1e-3) return a.prof - b.prof;
      const rA = a.r.forma.diametro ?? a.r.forma.diametroInterno ?? 0;
      const rB = b.r.forma.diametro ?? b.r.forma.diametroInterno ?? 0;
      if (rA !== rB) return rA - rB;
      return a.r.min[1] - b.r.min[1];
    });

    for (const ch of todosChunks) {
      const base = hexDe(ch.r.forma.cor);
      const tint = (n) => cor(base, 0.55 + 0.5 * Math.max(0, dot(n, LUZ)));

      for (const f of [...ch.dentro, ...ch.lados]) {
        const c = tint(f.n);
        partes.push(`<path d="${caminho(f.pts.map(V.p).map(tela))}" fill="${c}" stroke="${c}" stroke-width="0.8" stroke-linejoin="round"/>`);
      }

      for (const l of ch.linhas) {
        const [p1, p2] = l.map(V.p).map(tela);
        partes.push(`<line x1="${f1(p1[0])}" y1="${f1(p1[1])}" x2="${f1(p2[0])}" y2="${f1(p2[1])}" stroke="#111111" stroke-width="2" stroke-linecap="round"/>`);
      }

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
    /* Rótulos: fora do desenho, à esquerda ou à direita, empilhados sem colidir. */
    const esquerda = x0 + 20;
    const direita = x0 + PAINEL_L - 20;
    const meio = x0 + PAINEL_L / 2;
    const rotulados = p.itens.filter((it) => it.r.forma.rotulo).map((it) => {
      const cs = it.casco.map(tela);
      const centro = [cs.reduce((s, q) => s + q[0], 0) / cs.length, cs.reduce((s, q) => s + q[1], 0) / cs.length];
      const lado = centro[0] < meio ? 'e' : 'd';
      /* A âncora fica na borda da silhueta voltada para o rótulo, que é a
         parte que as outras formas menos cobrem; entra 8 px para dentro. */
      const extremo = lado === 'e' ? Math.min(...cs.map((q) => q[0])) : Math.max(...cs.map((q) => q[0]));
      const naBorda = cs.filter((q) => Math.abs(q[0] - extremo) < 3).sort((a, b) => Math.abs(a[1] - centro[1]) - Math.abs(b[1] - centro[1]))[0];
      const ancora = [naBorda[0] + (lado === 'e' ? 8 : -8), naBorda[1]];
      return { it, ancora, lado };
    });
    for (const lado of ['e', 'd']) {
      const grupo = rotulados.filter((r) => r.lado === lado).sort((a, b) => a.ancora[1] - b.ancora[1]);
      let ultimo = TOPO + 10;
      for (const r of grupo) {
        const linhas = quebrar(r.it.r.forma.rotulo, 15);
        const y = Math.max(r.ancora[1], ultimo + 12);
        ultimo = y + linhas.length * 20;
        const xt = lado === 'e' ? esquerda : direita;
        const xl = lado === 'e' ? esquerda + 135 : direita - 135;
        partes.push(`<polyline points="${f1(xl)},${f1(y)} ${f1(r.ancora[0])},${f1(r.ancora[1])}" fill="none" stroke="#222222" stroke-width="1.5"/><circle cx="${f1(r.ancora[0])}" cy="${f1(r.ancora[1])}" r="4" fill="#222222"/>`);
        linhas.forEach((l, i) => partes.push(`<text x="${xt}" y="${f1(y + 6 + i * 20)}" font-size="16" text-anchor="${lado === 'e' ? 'start' : 'end'}">${esc(l)}</text>`));
      }
    }
    quebrar(p.opcao.nota, 58).slice(0, 3).forEach((l, i) => partes.push(`<text x="${x0 + PAINEL_L / 2}" y="${TOPO + PAINEL_A + 26 + i * 24}" font-size="19" text-anchor="middle">${esc(l)}</text>`));
  });
  /* Barra de escala de 100 mm, igual para todas as opções. */
  const barra = 100 * escala;
  partes.push(`<line x1="20" y1="${altura - 14}" x2="${f1(20 + barra)}" y2="${altura - 14}" stroke="#111111" stroke-width="3"/><text x="${f1(28 + barra)}" y="${altura - 9}" font-size="14">100 mm</text>`);
  partes.push('</svg>');
  return { svg: partes.join('\n'), largura, altura, escala };
}
