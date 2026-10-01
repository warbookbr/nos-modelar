/* Esboço de opções de forma: lê a declaração de cilindros, anéis e caixas em
   milímetro, resolve as posições relativas (sobre, ponta) e desenha as opções
   lado a lado na mesma escala, em SVG. Não depende de Three.js nem de domínio;
   a conversão para PNG fica na ferramenta de linha de comando. */

import { expandirArranjos, expandirEsboco } from './expandir.js';

const EIXOS = ['x', 'y', 'z'];
const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z'];
const SEGMENTOS = 128;
/* A esfera é uma pilha de anéis: 40 lados por anel e 20 faixas de polo a polo (inscrita, no máximo 0,3% menor). */
const LADOS_DA_ESFERA = 40;
const FAIXAS_DA_ESFERA = 20;
/* Cada seção cilíndrica de um tubo tem 48 lados (0,2% menor que o círculo). */
const LADOS_DO_TUBO = 48;
/* Elipse de uma seção do loft, e a contagem de pontos quando as seções misturam formas (amostragem radial). */
const LADOS_DA_ELIPSE = 48;
const LADOS_DA_REVOLUCAO = 48;
/* Passo angular máximo, em graus, de cada seção reta numa curva do tubo. */
const PASSO_DA_CURVA = 6;
const PAINEL_L = 620;
const PAINEL_A = 560;
const TOPO = 70;
const RODAPE = 90;

export class ErroDeEsboco extends Error {}

function exigir(cond, msg) { if (!cond) throw new ErroDeEsboco(msg); }
const numPos = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/* Perfil 2D (u, v) de cada forma e o eixo em que ele é extrudado. */
function circuloN(r, n) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    p.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return p;
}
const circulo = (r) => circuloN(r, SEGMENTOS);

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

/* Retângulo com os quatro cantos cortados a 45° (perfil de uma caixa chanfrada), anti-horário. */
function retanguloChanfrado(l, p, c) {
  return [[-l / 2 + c, -p / 2], [l / 2 - c, -p / 2], [l / 2, -p / 2 + c], [l / 2, p / 2 - c],
    [l / 2 - c, p / 2], [-l / 2 + c, p / 2], [-l / 2, p / 2 - c], [-l / 2, -p / 2 + c]];
}

/* Perfil convexo anti-horário recuado de `d` para dentro: cada vértice anda pela bissetriz (meia-esquadria),
   de modo que cada aresta fica paralela à original. Devolve null se alguma aresta some ou inverte. */
function recuarPerfil(perfil, d) {
  const n = perfil.length;
  const dir = (a, b) => { const x = b[0] - a[0]; const y = b[1] - a[1]; const t = Math.hypot(x, y); return [x / t, y / t]; };
  const novo = perfil.map((q, i) => {
    const e1 = dir(perfil[(i - 1 + n) % n], q);
    const e2 = dir(q, perfil[(i + 1) % n]);
    const n1 = [-e1[1], e1[0]];
    const n2 = [-e2[1], e2[0]];
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [q[0] + (n1[0] + n2[0]) * k, q[1] + (n1[1] + n2[1]) * k];
  });
  for (let i = 0; i < n; i++) {
    const a = perfil[i]; const b = perfil[(i + 1) % n];
    const c = novo[i]; const e = novo[(i + 1) % n];
    if ((b[0] - a[0]) * (e[0] - c[0]) + (b[1] - a[1]) * (e[1] - c[1]) <= 1e-9) return null;
  }
  return novo;
}

/* Perfil convexo? (sem voltas para dentro; pontos colineares são aceitos) */
function ehConvexo(perfil) {
  let sinal = 0;
  for (let i = 0; i < perfil.length; i++) {
    const a = perfil[i]; const b = perfil[(i + 1) % perfil.length]; const c = perfil[(i + 2) % perfil.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-9) continue;
    if (sinal === 0) sinal = Math.sign(z);
    else if (Math.sign(z) !== sinal) return false;
  }
  return sinal !== 0;
}

/* Polígono simples? (3 pontos ou mais, sem ponto repetido, sem área nula e sem arestas que se cruzem ou se toquem
   fora dos extremos comuns) */
function ehSimples(perfil) {
  const n = perfil.length;
  const area = perfil.reduce((acc, q, i) => acc + q[0] * perfil[(i + 1) % n][1] - perfil[(i + 1) % n][0] * q[1], 0);
  if (Math.abs(area) < 1e-9) return false;
  const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const noSegmento = (a, b, c) => Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
  const cruza = (a, b, c, d) => {
    const o1 = orient(a, b, c); const o2 = orient(a, b, d); const o3 = orient(c, d, a); const o4 = orient(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    return (o1 === 0 && noSegmento(a, b, c)) || (o2 === 0 && noSegmento(a, b, d)) || (o3 === 0 && noSegmento(c, d, a)) || (o4 === 0 && noSegmento(c, d, b));
  };
  for (let i = 0; i < n; i++) {
    const a = perfil[i]; const b = perfil[(i + 1) % n];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) return false;
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (cruza(a, b, perfil[j], perfil[(j + 1) % n])) return false;
    }
  }
  return true;
}

/* Amostra um polígono convexo em `n` raios igualmente espaçados em ângulo, a partir da média dos vértices
   (a correspondência ponto a ponto entre seções de contagens diferentes). Começa no ângulo 0, anti-horário. */
function amostrarRadial(poli, n) {
  const c = [poli.reduce((a, q) => a + q[0], 0) / poli.length, poli.reduce((a, q) => a + q[1], 0) / poli.length];
  const saida = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    const d = [Math.cos(a), Math.sin(a)];
    let melhor = 0;
    for (let i = 0; i < poli.length; i++) {
      const p = poli[i]; const q = poli[(i + 1) % poli.length];
      const e = [q[0] - p[0], q[1] - p[1]];
      const den = d[0] * e[1] - d[1] * e[0];
      if (Math.abs(den) < 1e-12) continue;
      const t = ((p[0] - c[0]) * e[1] - (p[1] - c[1]) * e[0]) / den;
      const s = ((p[0] - c[0]) * d[1] - (p[1] - c[1]) * d[0]) / den;
      if (s >= -1e-9 && s <= 1 + 1e-9 && t > melhor) melhor = t;
    }
    saida.push([c[0] + d[0] * melhor, c[1] + d[1] * melhor]);
  }
  return saida;
}

const CHAVES_DA_SECAO = ['pos', 'forma', 'tamanho', 'perfil', 'raio', 'centro', 'nome'];
const FORMAS_DA_SECAO = ['retangulo', 'elipse', 'poligono'];
const NOMES_RESERVADOS = ['centro', 'inicio', 'fim', ...LADOS];

/* Lê uma seção do loft: o polígono convexo dela (relativo ao centro da seção, anti-horário) ou null para um ponto. */
function lerSecao(s, onde, extremo) {
  exigir(s && typeof s === 'object' && !Array.isArray(s), `${onde}: a seção deve ser { "pos": mm, "forma": "retangulo" | "elipse" | "poligono", "tamanho": [u, v], "centro": [u, v], "nome": "..." }`);
  const fora = Object.keys(s).filter((k) => !CHAVES_DA_SECAO.includes(k));
  exigir(fora.length === 0, `${onde}: a seção não tem o campo "${fora[0]}" (campos: ${CHAVES_DA_SECAO.join(', ')})`);
  exigir(typeof s.pos === 'number' && Number.isFinite(s.pos), `${onde}: falta "pos", a posição da seção ao longo do eixo em mm`);
  const forma = s.forma ?? 'retangulo';
  exigir(FORMAS_DA_SECAO.includes(forma), `${onde}: "forma" deve ser um de ${FORMAS_DA_SECAO.join(', ')}`);
  const centro = s.centro ?? [0, 0];
  exigir(Array.isArray(centro) && centro.length === 2 && centro.every(Number.isFinite), `${onde}: "centro" deve ser [u, v] em mm, o deslocamento do centro da seção no plano do perfil`);
  exigir(s.nome === undefined || (typeof s.nome === 'string' && s.nome), `${onde}: "nome" deve ser um texto não vazio`);
  let pts;
  if (forma === 'poligono') {
    exigir(s.tamanho === undefined && s.raio === undefined, `${onde}: a seção "poligono" se define só por "perfil"; retire "tamanho" e "raio"`);
    exigir(Array.isArray(s.perfil) && s.perfil.length >= 3 && s.perfil.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite)), `${onde}: a seção "poligono" precisa de "perfil": [[u, v], ...] com 3 ou mais pontos em mm`);
    exigir(ehConvexo(s.perfil) && ehSimples(s.perfil), `${onde}: o "perfil" da seção precisa ser um polígono convexo (o loft não aceita seção côncava; use "extrusao" para o perfil côncavo)`);
    pts = s.perfil.map((q) => [q[0], q[1]]);
  } else {
    exigir(s.perfil === undefined, `${onde}: "perfil" só vale na seção "poligono"`);
    exigir(Array.isArray(s.tamanho) && s.tamanho.length === 2 && s.tamanho.every((x) => Number.isFinite(x) && x >= 0), `${onde}: falta "tamanho": [u, v] em mm (as duas medidas da seção no plano do perfil; [0, 0] fecha a ponta num ponto)`);
    const [a, b] = s.tamanho;
    if (a === 0 && b === 0) {
      exigir(extremo, `${onde}: o tamanho [0, 0] (ponto) só vale na primeira e na última seção`);
      pts = null;
    } else {
      exigir(a > 0 && b > 0, `${onde}: "tamanho" [${a}, ${b}] tem uma medida nula; use [0, 0] para um ponto ou medidas positivas`);
      if (forma === 'elipse') {
        exigir(s.raio === undefined, `${onde}: "raio" só vale na seção "retangulo"`);
        pts = Array.from({ length: LADOS_DA_ELIPSE }, (_, i) => [(a / 2) * Math.cos((2 * Math.PI * i) / LADOS_DA_ELIPSE), (b / 2) * Math.sin((2 * Math.PI * i) / LADOS_DA_ELIPSE)]);
      } else {
        exigir(s.raio === undefined || (typeof s.raio === 'number' && Number.isFinite(s.raio) && s.raio >= 0), `${onde}: "raio" deve ser um número em mm, maior ou igual a zero`);
        pts = retanguloArredondado(a, b, s.raio);
      }
    }
  }
  return { pos: s.pos, centro, nome: s.nome, pts };
}

/* Nomes das âncoras de seção (loft) ou de ponto do perfil (revolução), na ordem em que foram declarados. */
function nomesDasPartes(lista) {
  return Array.isArray(lista) ? lista.filter((q) => q && typeof q === 'object' && !Array.isArray(q) && typeof q.nome === 'string').map((q) => q.nome) : [];
}

function exigirNomes(nomes, onde) {
  const vistos = new Set();
  for (const n of nomes) {
    exigir(!NOMES_RESERVADOS.includes(n), `${onde}: o nome "${n}" já é uma âncora da forma (${NOMES_RESERVADOS.join(', ')}); escolha outro`);
    exigir(!vistos.has(n), `${onde}: o nome "${n}" está repetido`);
    vistos.add(n);
  }
}

/* Sólido em seções paralelas, centrado na caixa. Cada faixa entre duas seções é convexa (o gate a mede por faixa)
   e o desenho fatia o sólido ao longo do eixo. `ancoras` são [u, v, w] antes de centrar. */
function solidoEmSecoes(b, secoes, ancoras) {
  const vs = secoes.flatMap((sc) => sc.perfil.map(([u, v]) => [u, v, sc.w]));
  const lo = [0, 1, 2].map((i) => Math.min(...vs.map((p) => p[i])));
  const hi = [0, 1, 2].map((i) => Math.max(...vs.map((p) => p[i])));
  const c = lo.map((v, i) => (v + hi[i]) / 2);
  const centradas = secoes.map((sc) => ({ w: sc.w - c[2], perfil: sc.perfil.map(([u, v]) => [u - c[0], v - c[1]]) }));
  const ancorasLocais = Object.fromEntries(Object.entries(ancoras).map(([nome, p]) => [nome, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]]));
  return { b, perfil: centradas[0].perfil, furos: [], furo: null, comprimento: hi[2] - lo[2], secoes: centradas, porFaixas: true, naoConvexo: true, ancorasLocais };
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
    let perfil = f.lados ? circuloN(f.diametro / 2, f.lados) : circulo(f.diametro / 2);
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
    exigir(f.lados === undefined || (Number.isInteger(f.lados) && f.lados >= 32 && f.lados <= SEGMENTOS), `${onde}: "lados" do anel deve ser um inteiro de 32 a ${SEGMENTOS} (padrão ${SEGMENTOS})`);
    const poligono = (r) => (f.lados ? circuloN(r, f.lados) : circulo(r));
    const furos = f.diametroInterno > 0 ? [poligono(f.diametroInterno / 2)] : [];
    return { b: base(eixo), perfil: poligono(f.diametroExterno / 2), furos, furo: furos[0] ?? null, comprimento: f.espessura };
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
    if (f.chanfro !== undefined) {
      const c = f.chanfro;
      exigir(numPos(c), `${onde}: "chanfro" deve ser um número positivo em mm`);
      exigir(f.raio === undefined, `${onde}: use "raio" ou "chanfro" na caixa, não os dois`);
      exigir(furos.length === 0, `${onde}: a caixa com "chanfro" não aceita "furo" nem "furos"`);
      exigir(2 * c < Math.min(f.largura, f.altura, f.profundidade), `${onde}: "chanfro" de ${c} mm é grande demais para a caixa ${f.largura}x${f.altura}x${f.profundidade} (precisa ser menor que a metade da menor medida)`);
      const cheio = retanguloChanfrado(f.largura, f.profundidade, c);
      const topo = recuarPerfil(cheio, c);
      exigir(topo, `${onde}: "chanfro" de ${c} mm é grande demais: a face de cima some antes de a aresta ser chanfrada`);
      const h = f.altura / 2;
      return {
        b: base('y'), perfil: cheio, furos: [], furo: null, comprimento: f.altura,
        secoes: [{ w: -h, perfil: topo }, { w: -h + c, perfil: cheio }, { w: h - c, perfil: cheio }, { w: h, perfil: topo }],
      };
    }
    return { b: base('y'), perfil: retanguloArredondado(f.largura, f.profundidade, f.raio), furos, furo: furos[0] ?? null, comprimento: f.altura };
  }
  if (tipo === 'cone') {
    exigir(numPos(f.diametro), `${onde}: cone precisa de "diametro" positivo em mm (o da base, no início do eixo)`);
    exigir(numPos(f.comprimento), `${onde}: cone precisa de "comprimento" positivo em mm`);
    const topo = f.diametroTopo ?? 0;
    exigir(typeof topo === 'number' && Number.isFinite(topo) && topo >= 0, `${onde}: "diametroTopo" deve ser um número em mm, maior ou igual a zero (0 é o cone, maior que 0 é o tronco)`);
    exigir(topo !== f.diametro, `${onde}: cone com "diametroTopo" igual ao "diametro" é um cilindro; use "cilindro"`);
    const eixo = f.eixo ?? 'y';
    exigir(EIXOS.includes(eixo), `${onde}: "eixo" deve ser "x", "y" ou "z"`);
    const h = f.comprimento / 2;
    const base0 = circulo(f.diametro / 2);
    return { b: base(eixo), perfil: base0, furos: [], furo: null, comprimento: f.comprimento, secoes: [{ w: -h, perfil: base0 }, { w: h, perfil: circulo(topo / 2) }] };
  }
  if (tipo === 'esfera') {
    exigir(numPos(f.diametro), `${onde}: esfera precisa de "diametro" positivo em mm`);
    const R = f.diametro / 2;
    const secoes = [];
    for (let k = 0; k <= FAIXAS_DA_ESFERA; k++) {
      const t = (Math.PI * k) / FAIXAS_DA_ESFERA;
      secoes.push({ w: k === 0 ? -R : k === FAIXAS_DA_ESFERA ? R : -R * Math.cos(t), perfil: circuloN(k === 0 || k === FAIXAS_DA_ESFERA ? 0 : R * Math.sin(t), LADOS_DA_ESFERA) });
    }
    return { b: base('y'), perfil: circuloN(R, LADOS_DA_ESFERA), furos: [], furo: null, comprimento: f.diametro, secoes };
  }
  if (tipo === 'extrusao') {
    exigir(numPos(f.comprimento), `${onde}: extrusao precisa de "comprimento" positivo em mm (a altura do prisma ao longo do eixo)`);
    const eixo = f.eixo ?? 'y';
    exigir(EIXOS.includes(eixo), `${onde}: "eixo" deve ser "x", "y" ou "z"`);
    const dica = `${onde}: extrusao precisa de "perfil": [[u, v], ...] com 3 ou mais pontos em mm, um polígono simples convexo ou côncavo (u e v são os eixos do plano perpendicular ao eixo: x e z para eixo y, z e y para eixo x, x e y para eixo z)`;
    exigir(Array.isArray(f.perfil) && f.perfil.length >= 3 && f.perfil.every((q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite)), dica);
    exigir(ehSimples(f.perfil), `${onde}: o "perfil" da extrusao precisa ser um polígono simples: sem ponto repetido, sem área nula e sem arestas que se cruzem`);
    const convexo = ehConvexo(f.perfil);
    const area = f.perfil.reduce((acc, q, i) => acc + q[0] * f.perfil[(i + 1) % f.perfil.length][1] - f.perfil[(i + 1) % f.perfil.length][0] * q[1], 0);
    /* o centro da forma é o centro da caixa do perfil, qualquer que seja a origem em que ele foi declarado */
    const cu = (Math.min(...f.perfil.map((q) => q[0])) + Math.max(...f.perfil.map((q) => q[0]))) / 2;
    const cv = (Math.min(...f.perfil.map((q) => q[1])) + Math.max(...f.perfil.map((q) => q[1]))) / 2;
    const centrado = f.perfil.map((q) => [q[0] - cu, q[1] - cv]);
    return { b: base(eixo), perfil: area >= 0 ? centrado : [...centrado].reverse(), furos: [], furo: null, comprimento: f.comprimento, ...(convexo ? {} : { naoConvexo: true }) };
  }
  if (tipo === 'loft') {
    exigir(f.comprimento === undefined, `${onde}: o loft tem o comprimento dado pelas posições das seções; retire "comprimento"`);
    const eixo = f.eixo ?? 'y';
    exigir(EIXOS.includes(eixo), `${onde}: "eixo" deve ser "x", "y" ou "z"`);
    exigir(Array.isArray(f.secoes) && f.secoes.length >= 2, `${onde}: loft precisa de "secoes": lista de 2 ou mais seções { "pos": mm, "forma": "retangulo" | "elipse" | "poligono", "tamanho": [u, v] } em ordem crescente de "pos" (u e v são os eixos do plano perpendicular ao eixo: x e z para eixo y, z e y para eixo x, x e y para eixo z)`);
    const lidas = f.secoes.map((s, i) => lerSecao(s, `${onde}, secoes[${i}]`, i === 0 || i === f.secoes.length - 1));
    lidas.forEach((sc, i) => { if (i > 0) exigir(sc.pos > lidas[i - 1].pos + 1e-9, `${onde}, secoes[${i}]: "pos" ${sc.pos} não passa da seção anterior (${lidas[i - 1].pos}); as seções vão em ordem crescente de posição`); });
    exigirNomes(nomesDasPartes(f.secoes), onde);
    const contagens = new Set(lidas.filter((sc) => sc.pts).map((sc) => sc.pts.length));
    exigir(contagens.size > 0, `${onde}: o loft precisa de pelo menos uma seção com tamanho (todas são pontos)`);
    const sentidos = new Set(lidas.filter((sc) => sc.pts).map((sc) => Math.sign(sc.pts.reduce((acc, q, i) => acc + q[0] * sc.pts[(i + 1) % sc.pts.length][1] - sc.pts[(i + 1) % sc.pts.length][0] * q[1], 0))));
    exigir(sentidos.size === 1, `${onde}: os polígonos das seções têm sentidos opostos (horário e anti-horário); escreva todos no mesmo sentido`);
    const horario = [...sentidos][0] < 0;
    const n = contagens.size === 1 ? [...contagens][0] : LADOS_DA_ELIPSE;
    const secoes = lidas.map((sc) => {
      let pts = sc.pts && (horario ? [...sc.pts].reverse() : sc.pts);
      if (pts && contagens.size > 1) pts = amostrarRadial(pts, n);
      if (!pts) pts = Array.from({ length: n }, () => [0, 0]);
      return { w: sc.pos, perfil: pts.map(([u, v]) => [u + sc.centro[0], v + sc.centro[1]]) };
    });
    const ancoras = { inicio: [...lidas[0].centro, lidas[0].pos], fim: [...lidas[lidas.length - 1].centro, lidas[lidas.length - 1].pos] };
    lidas.forEach((sc) => { if (sc.nome) ancoras[sc.nome] = [...sc.centro, sc.pos]; });
    return solidoEmSecoes(base(eixo), secoes, ancoras);
  }
  if (tipo === 'revolucao') {
    exigir(f.comprimento === undefined, `${onde}: a revolução tem o comprimento dado pela altura do perfil; retire "comprimento"`);
    const eixo = f.eixo ?? 'y';
    exigir(EIXOS.includes(eixo), `${onde}: "eixo" deve ser "x", "y" ou "z"`);
    const lados = f.lados ?? LADOS_DA_REVOLUCAO;
    exigir(Number.isInteger(lados) && lados >= 6 && lados <= 128, `${onde}: "lados" deve ser um inteiro de 6 a 128 (padrão ${LADOS_DA_REVOLUCAO})`);
    const dica = `${onde}: revolucao precisa de "perfil": [[raio, altura], ...] com 2 ou mais pontos em mm, do começo ao fim do eixo; cada ponto também pode ser { "raio": mm, "altura": mm, "nome": "..." } para virar âncora`;
    exigir(Array.isArray(f.perfil) && f.perfil.length >= 2, dica);
    const pts = f.perfil.map((q, i) => {
      if (Array.isArray(q)) { exigir(q.length === 2 && q.every(Number.isFinite), dica); return { raio: q[0], altura: q[1] }; }
      exigir(q && typeof q === 'object' && Object.keys(q).every((k) => ['raio', 'altura', 'nome'].includes(k)) && Number.isFinite(q.raio) && Number.isFinite(q.altura), `${dica} (perfil[${i}])`);
      exigir(q.nome === undefined || (typeof q.nome === 'string' && q.nome), `${onde}: perfil[${i}]: "nome" deve ser um texto não vazio`);
      return q;
    });
    exigirNomes(nomesDasPartes(f.perfil), onde);
    pts.forEach((q, i) => {
      exigir(q.raio >= 0, `${onde}: perfil[${i}]: o raio ${q.raio} é negativo; o perfil dá o raio (maior ou igual a zero) e a altura ao longo do eixo`);
      if (i === 0) return;
      const a = pts[i - 1];
      exigir(q.altura >= a.altura - 1e-9, `${onde}: perfil[${i}]: a altura ${q.altura} volta atrás (anterior ${a.altura}); o perfil sobe ao longo do eixo (dois pontos na mesma altura formam um degrau)`);
      exigir(Math.hypot(q.raio - a.raio, q.altura - a.altura) > 1e-9, `${onde}: perfil[${i}] repete o ponto anterior`);
      exigir(!(i < pts.length - 1 && q.raio === 0), `${onde}: perfil[${i}]: raio zero só vale no primeiro e no último ponto (uma cintura de raio zero parte o sólido em dois)`);
    });
    exigir(pts.some((q) => q.raio > 0), `${onde}: o perfil da revolução tem raio zero em todos os pontos`);
    const secoes = pts.map((q) => ({ w: q.altura, perfil: circuloN(q.raio, lados) }));
    const ancoras = { inicio: [0, 0, pts[0].altura], fim: [0, 0, pts[pts.length - 1].altura] };
    pts.forEach((q) => { if (q.nome) ancoras[q.nome] = [0, 0, q.altura]; });
    return solidoEmSecoes(base(eixo), secoes, ancoras);
  }
  throw new ErroDeEsboco(`${onde}: tipo "${tipo}" desconhecido; use cilindro, anel, caixa, cone, esfera, extrusao, loft, revolucao ou tubo`);
}

function caixaLocal(pr, m) {
  if (pr.secoes) {
    const vs = verticesLocais(pr, m);
    return { min: [0, 1, 2].map((i) => Math.min(...vs.map((p) => p[i]))), max: [0, 1, 2].map((i) => Math.max(...vs.map((p) => p[i]))) };
  }
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
const TIPOS_COM_EIXO = ['cilindro', 'anel', 'cone', 'extrusao', 'loft', 'revolucao'];

/* O loft e a revolução ainda têm as âncoras nomeadas: `nome` de cada seção ou de cada ponto do perfil. */
export function nomesDeAncoras(tipo, forma) {
  const nomeadas = tipo === 'loft' ? nomesDasPartes(forma?.secoes) : tipo === 'revolucao' ? nomesDasPartes(forma?.perfil) : tipo === 'tubo' ? nomesDasPartes(forma?.caminho) : [];
  return ['centro', ...(TIPOS_COM_EIXO.includes(tipo) || tipo === 'tubo' ? ['inicio', 'fim'] : []), ...nomeadas, ...LADOS];
}

/* A parte de um tubo como forma resolvida própria: as partes guardam o centro relativo ao do tubo, e por
   isso o tubo inteiro anda (explosão, cópia, deslocamento) mudando só o `centro` dele. */
export function subforma(r, parte) {
  return { id: r.id, forma: r.forma, prisma: parte.prisma, matriz: parte.matriz, centro: r.centro.map((c, i) => c + parte.dc[i]) };
}

export function ancorasDe(r) {
  const a = { centro: [...r.centro] };
  if (r.partes) {
    a.inicio = r.centro.map((c, i) => c + r.extremos.inicio[i]);
    a.fim = r.centro.map((c, i) => c + r.extremos.fim[i]);
    for (const [nome, d] of Object.entries(r.nomeadas ?? {})) a[nome] = r.centro.map((c, i) => c + d[i]);
  } else if (r.prisma.ancorasLocais) {
    /* loft e revolução: as pontas do eixo e as seções ou pontos nomeados, em coordenadas locais já centradas */
    for (const [nome, [u, v, w]] of Object.entries(r.prisma.ancorasLocais)) {
      const d = aplicarMatriz(ponto3(r.prisma.b, u, v, w), r.matriz);
      a[nome] = [r.centro[0] + d[0], r.centro[1] + d[1], r.centro[2] + d[2]];
    }
  } else if (TIPOS_COM_EIXO.includes(r.forma.tipo)) {
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
  /* uma cópia (espelho ou arranjo) tem as âncoras da forma-fonte */
  let fonteDoTipo = porId.get(id);
  for (let n = 0; n < 20 && fonteDoTipo && fonteDoTipo.tipo === undefined; n++) fonteDoTipo = porId.get(fonteDoTipo.espelha?.forma ?? fonteDoTipo.arranjoDe?.fonte);
  const validas = nomesDeAncoras((fonteDoTipo ?? porId.get(id)).tipo, fonteDoTipo ?? porId.get(id));
  exigir(validas.includes(nome), `${onde}: "${campo}" aponta para "${ref}", mas a forma "${id}" (${(fonteDoTipo ?? porId.get(id)).tipo}) não tem a âncora "${nome}" (válidas: ${validas.join(', ')})`);
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
  if (pr.secoes) return pr.secoes.flatMap((sc) => sc.perfil.map(([u, v]) => aplicarMatriz(ponto3(pr.b, u, v, sc.w), m)));
  const h = pr.comprimento / 2;
  const saida = [];
  for (const w of [-h, h]) for (const [u, v] of pr.perfil) saida.push(aplicarMatriz(ponto3(pr.b, u, v, w), m));
  return saida;
}

/* Normal (unitária, no referencial local x, y, z) de cada face lateral de um sólido em seções: [faixa][aresta].
   A face entre duas seções é o quadrilátero (planar, pois as seções são paralelas entre si) cujas arestas vêm
   do mesmo lado do perfil; num prisma reto dá a normal (dv, -du) do perfil. */
export function normaisDasFaixas({ b, secoes }) {
  const N = secoes[0].perfil.length;
  return secoes.slice(0, -1).map((s0, k) => {
    const s1 = secoes[k + 1];
    return Array.from({ length: N }, (_, i) => {
      const j = (i + 1) % N;
      const P = (sc, q) => [sc.perfil[q][0], sc.perfil[q][1], sc.w];
      const A0 = P(s0, i); const D0 = P(s0, j); const A1 = P(s1, i); const D1 = P(s1, j);
      const tA = [0, 1, 2].map((e) => D0[e] - A0[e] + D1[e] - A1[e]);
      const tW = [0, 1, 2].map((e) => A1[e] - A0[e] + D1[e] - D0[e]);
      const c = [tA[1] * tW[2] - tA[2] * tW[1], tA[2] * tW[0] - tA[0] * tW[2], tA[0] * tW[1] - tA[1] * tW[0]];
      const t = Math.hypot(...c);
      return ponto3(b, ...(t > 1e-12 ? c.map((x) => x / t) : [0, 0, 0]));
    });
  });
}

const EIXOS_ALINHA = ['x', 'y', 'z'];
const CHAVES_ENCOSTA = ['referencia', 'direcao', 'folga'];
const CHAVES_ALINHA = ['com', 'eixos'];

/* Relações de posição de uma forma, em texto, para a leitura `--descrever`. */
export function relacaoDe(f) {
  const partes = [];
  const v = (x) => {
    if (Array.isArray(x)) return `[${x.join(' ')}]`;
    if (x && typeof x === 'object' && Array.isArray(x.entre)) {
      const medida = x.t !== undefined ? `em t ${x.t}` : x.mm !== undefined ? `a ${x.mm} mm do primeiro` : `a ${x.mmAntes} mm do segundo`;
      return `(entre ${v(x.entre[0])} e ${v(x.entre[1])} ${medida})`;
    }
    return x;
  };
  if (f.espelha) partes.push(`espelho de ${f.espelha.forma} no eixo ${f.espelha.eixo} em ${f.espelha.pos ?? 0} mm`);
  if (f.arranjoDe) {
    const a = f.arranjoDe;
    partes.push(`cópia ${a.indice} de ${a.total} de ${a.fonte}, ${a.modo === 'linear' ? `linear, passo ${v(a.passo)}` : `radial, eixo ${a.eixo} em ${v(a.centro)}, ${a.graus} graus`}`);
  }
  if (f.tipo === 'loft' && Array.isArray(f.secoes)) partes.push(`loft de ${f.secoes.length} seções`);
  if (f.tipo === 'revolucao' && Array.isArray(f.perfil)) partes.push(`revolução de um perfil de ${f.perfil.length} pontos`);
  if (f.tipo === 'tubo' && Array.isArray(f.caminho)) partes.push(`caminho de ${f.caminho.length} pontos${f.raioCurva ? `, raio de curva ${f.raioCurva} mm` : ''}`);
  if (f.daInstancia) partes.push(`${f.daInstancia.principal ? 'principal' : 'parte'} do componente ${f.daInstancia.id}`);
  if (f.de !== undefined) partes.push(`de ${v(f.de)} para ${v(f.para)}`);
  if (f.alinha) partes.push(`alinha com ${f.alinha.com} nos eixos ${(f.alinha.eixos ?? []).join(' ')}`);
  if (f.encosta) partes.push(`encosta em ${f.encosta.referencia} na direção ${v(f.encosta.direcao)}${f.encosta.folga ? ` com folga ${f.encosta.folga} mm` : ''}`);
  if ((f.de !== undefined || f.alinha || f.encosta || f.espelha || f.caminho) && f.desloca) partes.push(`desloca ${v(f.desloca)}`);
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
const NAO_HERDADOS = ['id', 'centro', 'sobre', 'ponta', 'de', 'para', 'rotacao', 'encosta', 'alinha', 'desloca', 'rotulo', 'oculto', 'opacidade', 'espelha', 'arranja', 'arranjoDe', 'caminho', 'daInstancia', 'substitui'];
const CAMPOS_DO_ESPELHO = ['id', 'cor', 'rotulo', 'oculto', 'opacidade', 'desloca', 'espelha', 'daInstancia', 'substitui'];

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
    ...(f.substitui !== undefined ? { substitui: f.substitui } : {}),
  };
  if (forma.cor === undefined) delete forma.cor;
  if (fonte.partes) {
    /* tubo: o sólido inteiro sofre a mesma transformação (`m`, que ainda pode ser nula) e as partes seguem o centro */
    const partes = fonte.partes.map((pt) => ({ semTampa: pt.semTampa, prisma: pt.prisma, matriz: m ? multiplicar(m, pt.matriz ?? IDENTIDADE) : pt.matriz, dc: m ? aplicarMatriz(pt.dc, m) : pt.dc }));
    const extremos = { inicio: m ? aplicarMatriz(fonte.extremos.inicio, m) : fonte.extremos.inicio, fim: m ? aplicarMatriz(fonte.extremos.fim, m) : fonte.extremos.fim };
    const nomeadas = fonte.nomeadas ? Object.fromEntries(Object.entries(fonte.nomeadas).map(([nome, d]) => [nome, m ? aplicarMatriz(d, m) : d])) : undefined;
    const r = { id, forma, prisma: null, partes, extremos, ...(nomeadas ? { nomeadas } : {}), centro, matriz: null };
    return { ...r, ...caixaDeTubo(r) };
  }
  const local = caixaLocal(fonte.prisma, m);
  return {
    id, forma, prisma: fonte.prisma, centro, matriz: m,
    min: local.min.map((val, i) => val + centro[i]),
    max: local.max.map((val, i) => val + centro[i]),
  };
}

/* Tubo por pontos: cada trecho reto é um cilindro (seção cilíndrica) e, com `raioCurva`, cada canto vira um
   arco de raio `raioCurva` cortado em seções retas de no máximo PASSO_DA_CURVA graus; sem `raioCurva` cada canto
   leva uma esfera do diâmetro do tubo. `pts` são os pontos do caminho já resolvidos, em mm. Devolve as partes
   com o centro relativo ao centro da caixa do tubo, esse centro e os extremos. */
function construirTubo(f, pts, onde) {
  exigir(numPos(f.diametro), `${onde}: tubo precisa de "diametro" positivo em mm`);
  const curva = f.raioCurva ?? 0;
  exigir(typeof curva === 'number' && Number.isFinite(curva) && curva >= 0, `${onde}: "raioCurva" deve ser um número em mm, maior ou igual a zero`);
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const soma = (a, b) => a.map((x, i) => x + b[i]);
  const mul = (a, k) => a.map((x) => x * k);
  const trechos = pts.slice(0, -1).map((p, i) => Math.hypot(...sub(pts[i + 1], p)));
  trechos.forEach((t, i) => exigir(t > 1e-9, `${onde}: os pontos ${i + 1} e ${i + 2} do "caminho" são o mesmo ponto`));
  /* curva em cada canto interno: comprimento tangente T = raioCurva * tan(giro / 2) de cada lado */
  const giro = pts.map(() => 0);
  const tang = pts.map(() => 0);
  for (let i = 1; i < pts.length - 1; i++) {
    const d1 = unit(sub(pts[i], pts[i - 1]));
    const d2 = unit(sub(pts[i + 1], pts[i]));
    const g = Math.acos(Math.max(-1, Math.min(1, escalarV(d1, d2))));
    exigir(g < Math.PI - 1e-6, `${onde}: o "caminho" volta sobre si mesmo no ponto ${i + 1}`);
    if (g > 1e-6) { giro[i] = g; if (curva > 0) tang[i] = curva * Math.tan(g / 2); }
  }
  trechos.forEach((t, i) => exigir(tang[i] + tang[i + 1] <= t + 1e-9,
    `${onde}: "raioCurva" de ${curva} mm não cabe no trecho ${i + 1} do "caminho" (${Math.round(t * 10) / 10} mm): as duas curvas pedem ${Math.round((tang[i] + tang[i + 1]) * 10) / 10} mm; reduza o raio ou afaste os pontos`));
  const linha = [pts[0]];
  const juntas = [];
  for (let i = 1; i < pts.length - 1; i++) {
    if (!(giro[i] > 0)) continue;
    if (!(tang[i] > 0)) { linha.push(pts[i]); juntas.push(pts[i]); continue; }
    const d1 = unit(sub(pts[i], pts[i - 1]));
    const d2 = unit(sub(pts[i + 1], pts[i]));
    const A = sub(pts[i], mul(d1, tang[i]));
    const nn = unit(sub(d2, mul(d1, escalarV(d1, d2))));
    const C = soma(A, mul(nn, curva));
    const passos = Math.max(1, Math.ceil((giro[i] * 180) / Math.PI / PASSO_DA_CURVA));
    for (let k = 0; k <= passos; k++) {
      const t = (giro[i] * k) / passos;
      linha.push(soma(C, soma(mul(nn, -curva * Math.cos(t)), mul(d1, curva * Math.sin(t)))));
    }
  }
  linha.push(pts[pts.length - 1]);
  const partes = [];
  const brutas = [];
  for (let i = 0; i < linha.length - 1; i++) {
    const d = sub(linha[i + 1], linha[i]);
    const len = Math.hypot(...d);
    if (len < 1e-9) continue;
    const pr = prisma({ tipo: 'cilindro', diametro: f.diametro, comprimento: len, eixo: 'y', lados: LADOS_DO_TUBO }, onde);
    brutas.push({ prisma: pr, matriz: rotacaoEntre([0, 1, 0], unit(d)), centro: mul(soma(linha[i], linha[i + 1]), 0.5), semTampa: { inicio: i > 0, fim: i < linha.length - 2 } });
  }
  for (const p of juntas) brutas.push({ prisma: prisma({ tipo: 'esfera', diametro: f.diametro }, onde), matriz: null, centro: p, semTampa: { inicio: true, fim: true } });
  const caixas = brutas.map((q) => { const l = caixaLocal(q.prisma, q.matriz); return { min: l.min.map((v, i) => v + q.centro[i]), max: l.max.map((v, i) => v + q.centro[i]) }; });
  const min = [0, 1, 2].map((i) => Math.min(...caixas.map((c) => c.min[i])));
  const max = [0, 1, 2].map((i) => Math.max(...caixas.map((c) => c.max[i])));
  const centro = min.map((v, i) => (v + max[i]) / 2);
  for (const q of brutas) partes.push({ prisma: q.prisma, matriz: q.matriz, dc: sub(q.centro, centro), semTampa: q.semTampa });
  return { partes, centro, extremos: { inicio: sub(pts[0], centro), fim: sub(pts[pts.length - 1], centro) } };
}

/* Vértices de uma forma resolvida relativos ao centro dela (o anel entra como o disco externo). */
function verticesDe(r) {
  if (r.partes) return r.partes.flatMap((pt) => verticesLocais(pt.prisma, pt.matriz).map((v) => v.map((x, i) => x + pt.dc[i])));
  return verticesLocais(r.prisma, r.matriz);
}

/* Caixa da forma em tubo, no mundo, a partir das partes. */
function caixaDeTubo(r) {
  const cs = r.partes.map((pt) => { const l = caixaLocal(pt.prisma, pt.matriz); return { min: l.min.map((v, i) => v + pt.dc[i] + r.centro[i]), max: l.max.map((v, i) => v + pt.dc[i] + r.centro[i]) }; });
  return { min: [0, 1, 2].map((i) => Math.min(...cs.map((c) => c.min[i]))), max: [0, 1, 2].map((i) => Math.max(...cs.map((c) => c.max[i]))) };
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
      if (v && typeof v === 'object' && !Array.isArray(v) && v.ancora !== undefined) {
        /* âncora com deslocamento: { "ancora": "<id>.<ancora>", "mm": [dx, dy, dz] } (o ponto nomeado também vale) */
        const dica = `${onde}: "${campo}" como objeto com "ancora" deve ser { "ancora": "<id>.<ancora>", "mm": [dx, dy, dz] } ("mm" é opcional, em mm, e "ancora" pode ser também um ponto nomeado)`;
        exigir(typeof v.ancora === 'string' && v.ancora && Object.keys(v).every((k) => k === 'ancora' || k === 'mm'), dica);
        exigir(v.mm === undefined || (Array.isArray(v.mm) && v.mm.length === 3 && v.mm.every(Number.isFinite)), `${dica}; o "mm" recebido é ${JSON.stringify(v.mm)}`);
        const base = pontoDe(v.ancora, `${campo}.ancora`);
        return v.mm === undefined ? base : base.map((x, i) => x + v.mm[i]);
      }
      if (v && typeof v === 'object') {
        /* ponto entre dois pontos: { "entre": [A, B], "t": fração de A a B } ou { "entre": [A, B], "mm": distância a partir de A } */
        const chaves = Object.keys(v);
        const dica = `${onde}: "${campo}" como objeto deve ser { "entre": [A, B], "t": 0.25 }, { "entre": [A, B], "mm": 90 } (a partir de A) ou { "entre": [A, B], "mmAntes": 40 } (a partir de B, para A), com A e B pontos ([x, y, z], nomeado ou "<id>.<ancora>")`;
        const medida = ['t', 'mm', 'mmAntes'].filter((k) => v[k] !== undefined);
        exigir(Array.isArray(v.entre) && v.entre.length === 2 && chaves.every((k) => ['entre', 't', 'mm', 'mmAntes'].includes(k)) && medida.length === 1, dica);
        exigir(Number.isFinite(v[medida[0]]), `${onde}: "${campo}": "${medida[0]}" deve ser um número`);
        const a = pontoDe(v.entre[0], `${campo}.entre[0]`);
        const b = pontoDe(v.entre[1], `${campo}.entre[1]`);
        const d = b.map((x, i) => x - a[i]);
        const dist = Math.hypot(...d);
        exigir(dist > 1e-9, `${onde}: "${campo}": os dois pontos de "entre" são o mesmo ponto`);
        const t = v.t !== undefined ? v.t : v.mm !== undefined ? v.mm / dist : 1 - v.mmAntes / dist;
        return a.map((x, i) => x + d[i] * t);
      }
      exigir(typeof v === 'string', `${onde}: "${campo}" deve ser [x, y, z] em mm, um ponto nomeado, "<id>.<ancora>" ou { "entre": [A, B], "t": 0.5 }`);
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
    /* alinha, encosta e desloca, nessa ordem, sobre o centro já posicionado; `proprios` dá os vértices da forma relativos ao centro */
    const relacionar = (centroInicial, proprios) => {
      let centro = centroInicial;
      if (f.alinha !== undefined) {
        const al = f.alinha;
        exigir(al && typeof al === 'object' && !Array.isArray(al), `${onde}: "alinha" deve ser { "com": "<id>", "eixos": ["x", "z"] }`);
        const extras = Object.keys(al).filter((k) => !CHAVES_ALINHA.includes(k));
        exigir(extras.length === 0, `${onde}: "alinha" não tem o campo "${extras[0]}" (campos: ${CHAVES_ALINHA.join(', ')})`);
        exigir(Array.isArray(al.eixos) && al.eixos.length > 0 && al.eixos.every((e) => EIXOS_ALINHA.includes(e)) && new Set(al.eixos).size === al.eixos.length,
          `${onde}: "alinha.eixos" deve listar eixos distintos entre "x", "y" e "z"`);
        exigir((typeof al.com === 'string' && al.com) || (al.com && typeof al.com === 'object' && !Array.isArray(al.com)), `${onde}: "alinha.com" deve ser o id de uma forma, "<id>.<ancora>", um ponto nomeado ou um ponto composto ({ "entre": ... } ou { "ancora": ..., "mm": ... })`);
        const alvo = typeof al.com === 'string' && porId.has(al.com) ? referencia('alinha.com', al.com).centro : pontoDe(al.com, 'alinha.com');
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
        const maxMovel = Math.max(...proprios().map((v) => escalarV(dn, v))) + escalarV(dn, centro);
        const minRef = Math.min(...verticesDe(alvo).map((v) => escalarV(dn, v))) + escalarV(dn, alvo.centro);
        const t = minRef - maxMovel - folga;
        centro = centro.map((c, i) => c + dn[i] * t);
      }
      if (f.desloca !== undefined) {
        exigir(Array.isArray(f.desloca) && f.desloca.length === 3 && f.desloca.every(Number.isFinite), `${onde}: "desloca" deve ser [dx, dy, dz] em mm`);
        centro = centro.map((c, i) => c + f.desloca[i]);
      }
      return centro;
    };
    if (f.tipo === 'tubo') {
      const proibidos = ['centro', 'sobre', 'ponta', 'de', 'para', 'rotacao'].filter((k) => f[k] !== undefined);
      exigir(proibidos.length === 0, `${onde}: o tubo se posiciona pelos pontos do "caminho"; retire ${proibidos.map((k) => `"${k}"`).join(', ')} (use "desloca", "alinha" ou "encosta" para afastá-lo)`);
      exigir(Array.isArray(f.caminho) && f.caminho.length >= 2, `${onde}: tubo precisa de "caminho": lista de 2 ou mais pontos, cada um [x, y, z] em mm, um ponto nomeado ou "<id>.<ancora>"`);
      /* ponto-guia nomeado: { "nome": "joelho", "ponto": <qualquer ponto> } vira a âncora `<id>.joelho` */
      const guias = {};
      const pts = f.caminho.map((q, i) => {
        if (q && typeof q === 'object' && !Array.isArray(q) && q.nome !== undefined) {
          exigir(Object.keys(q).every((k) => k === 'nome' || k === 'ponto') && q.ponto !== undefined && typeof q.nome === 'string' && q.nome, `${onde}: "caminho[${i}]" com "nome" deve ser { "nome": "joelho", "ponto": [x, y, z] } (o ponto é qualquer ponto: vetor, nomeado, "<id>.<ancora>", { "entre": ... } ou { "ancora": ..., "mm": [dx, dy, dz] })`);
          exigirNomes([q.nome], `${onde}, "caminho[${i}]"`);
          exigir(!Object.hasOwn(guias, q.nome), `${onde}: o ponto-guia "${q.nome}" está repetido no "caminho"`);
          const p = pontoDe(q.ponto, `caminho[${i}].ponto`);
          guias[q.nome] = p;
          return p;
        }
        return pontoDe(q, `caminho[${i}]`);
      });
      const t = construirTubo(f, pts, onde);
      const centro = relacionar(t.centro, () => verticesDe({ partes: t.partes }));
      const nomeadas = Object.fromEntries(Object.entries(guias).map(([nome, p]) => [nome, p.map((c, k) => c - t.centro[k])]));
      const r = { id, forma: f, prisma: null, partes: t.partes, extremos: t.extremos, ...(Object.keys(nomeadas).length ? { nomeadas } : {}), centro, matriz: null };
      Object.assign(r, caixaDeTubo(r));
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
      exigir(f.tipo === 'cilindro' || f.tipo === 'caixa' || f.tipo === 'cone', `${onde}: "de"/"para" valem só em cilindro, caixa e cone (a forma vira uma haste entre dois pontos; para um caminho com várias pernas use "tubo")`);
      const proibidos = ['centro', 'sobre', 'ponta', 'rotacao', 'encosta', 'alinha'].filter((k) => f[k] !== undefined);
      exigir(proibidos.length === 0, `${onde}: "de"/"para" já definem o centro e a rotação; retire ${proibidos.map((k) => `"${k}"`).join(', ')} (use "desloca" para afastar a haste)`);
      const campoLongo = f.tipo === 'caixa' ? 'altura' : 'comprimento';
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
    } else if (typeof f.centro === 'string' || (f.centro && typeof f.centro === 'object' && !Array.isArray(f.centro))) {
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
    centro = relacionar(centro, () => verticesLocais(pr, m));
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

/* Sólido em seções (cone, tronco, esfera, caixa chanfrada): cada faixa entre duas seções é uma fileira de faces
   planas, fatiada no eixo como o prisma reto para a ordem de sobreposição. O sólido é convexo, então as faces
   voltadas para o observador não se cobrem entre si. Além das silhuetas e dos vincos ao longo das faixas (como no
   prisma), desenha o contorno dos anéis onde a face visível encontra uma face de trás ou um vinco. */
function fatiarSecoes(r, olho) {
  const { b, secoes } = r.prisma;
  const c = r.centro;
  const m = r.matriz;
  const mundo = (u, v, w) => {
    const pr = aplicarMatriz(ponto3(b, u, v, w), m);
    return [pr[0] + c[0], pr[1] + c[1], pr[2] + c[2]];
  };
  const rotNormal = (nl) => normalizar(aplicarMatriz(nl, m));
  const eixoN = (s) => rotNormal(ponto3(b, 0, 0, s));
  const N = secoes[0].perfil.length;
  const nb = secoes.length - 1;
  const nm = normaisDasFaixas(r.prisma).map((fk) => fk.map((n) => rotNormal(n)));
  const cos25 = Math.cos((25 * Math.PI) / 180);
  const visivel = (k, i) => dot(nm[k][i], olho) > 1e-6;
  const raioDe = (sc) => Math.max(...sc.perfil.map((q) => Math.hypot(q[0], q[1])));
  const tampaVisivel = [
    raioDe(secoes[0]) > 1e-9 && dot(eixoN(-1), olho) > 1e-6,
    raioDe(secoes[nb]) > 1e-9 && dot(eixoN(1), olho) > 1e-6,
  ];
  const comprimentos = secoes.slice(1).map((sc, k) => sc.w - secoes[k].w);
  const total = comprimentos.reduce((a, x) => a + x, 0);
  const chunks = [];
  const tampa = (sc, n, ponta) => ({
    r, ponta, prof: dot(mundo(0, 0, sc.w), olho), lados: [], dentro: [], linhas: [], arcos: [],
    tampas: [{ papel: 'tampa', n, pts: sc.perfil.map((q) => mundo(q[0], q[1], sc.w)), furos: [], furo: null }],
  });
  if (tampaVisivel[0]) chunks.push(tampa(secoes[0], eixoN(-1), 'inicio'));
  for (let k = 0; k < nb; k++) {
    const s0 = secoes[k];
    const s1 = secoes[k + 1];
    /* uma fatia por faixa no loft e na revolução: a faixa é convexa, e as linhas de cada face saem coladas a ela */
    const fatias = r.prisma.naoConvexo ? 1 : Math.max(1, Math.min(Math.ceil(comprimentos[k] / 5), Math.round((36 * comprimentos[k]) / total)));
    const noPasso = (t) => ({ w: s0.w + t * (s1.w - s0.w), perfil: s0.perfil.map((q, i) => [q[0] + t * (s1.perfil[i][0] - q[0]), q[1] + t * (s1.perfil[i][1] - q[1])]) });
    for (let j = 0; j < fatias; j++) {
      const a = noPasso(j / fatias);
      const d = noPasso((j + 1) / fatias);
      const P0 = (i) => mundo(a.perfil[i][0], a.perfil[i][1], a.w);
      const P1 = (i) => mundo(d.perfil[i][0], d.perfil[i][1], d.w);
      const lados = [];
      const linhas = [];
      const diferentes = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-9;
      for (let i = 0; i < N; i++) {
        const i2 = (i + 1) % N;
        const n = nm[k][i];
        if (!visivel(k, i)) continue;
        const nPrev = nm[k][(i - 1 + N) % N];
        const nNext = nm[k][i2];
        const silA = dot(n, olho) > 0 && dot(nPrev, olho) <= 0;
        const silD = dot(n, olho) > 0 && dot(nNext, olho) <= 0;
        const vincA = dot(n, nPrev) < cos25 && dot(n, olho) >= dot(nPrev, olho);
        const vincD = dot(n, nNext) < cos25 && dot(n, olho) > dot(nNext, olho);
        const doLado = [];
        if ((silA || vincA) && diferentes(P0(i), P1(i))) doLado.push([P0(i), P1(i)]);
        if ((silD || vincD) && diferentes(P0(i2), P1(i2))) doLado.push([P0(i2), P1(i2)]);
        if (j === 0 && diferentes(P0(i), P0(i2))
          && (k === 0 ? !tampaVisivel[0] : (!visivel(k - 1, i) || dot(n, nm[k - 1][i]) < cos25))) doLado.push([P0(i), P0(i2)]);
        if (j === fatias - 1 && diferentes(P1(i), P1(i2))
          && (k === nb - 1 ? !tampaVisivel[1] : !visivel(k + 1, i))) doLado.push([P1(i), P1(i2)]);
        lados.push({ papel: 'lado', n, pts: [P0(i), P0(i2), P1(i2), P1(i)], ...(r.prisma.naoConvexo ? { linhas: doLado } : {}) });
        linhas.push(...doLado);
      }
      chunks.push({ r, prof: dot(mundo(0, 0, (a.w + d.w) / 2), olho), lados, dentro: [], linhas, arcos: [], tampas: [] });
    }
  }
  if (tampaVisivel[1]) chunks.push(tampa(secoes[nb], eixoN(1), 'fim'));
  /* o loft e a revolução podem ter cintura ou degrau: as fatias vão do fundo para a frente, e a de trás não cobre a da frente */
  if (r.prisma.naoConvexo) chunks.sort((x, y) => x.prof - y.prof);
  return chunks;
}

/* Ordem de desenho (do fundo para a frente) das faces laterais visíveis de um prisma de perfil côncavo: uma face
   vem antes de outra quando, onde as duas se cobrem na tela, a primeira está mais longe do observador. Ordenação
   topológica; no ciclo (que um perfil simples não produz) sobra a ordem pela profundidade do centro. */
function ordemDasFaces(lados, olho) {
  const n = lados.length;
  if (n < 2) return lados.map((_, i) => i);
  const apoio = Math.abs(olho[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const S = normalizar([olho[1] * apoio[2] - olho[2] * apoio[1], olho[2] * apoio[0] - olho[0] * apoio[2], olho[0] * apoio[1] - olho[1] * apoio[0]]);
  const T = [olho[1] * S[2] - olho[2] * S[1], olho[2] * S[0] - olho[0] * S[2], olho[0] * S[1] - olho[1] * S[0]];
  const tela = lados.map((l) => l.pts.map((p) => [dot(p, S), dot(p, T)]));
  const anti = (poli) => (poli.reduce((a, q, i) => a + q[0] * poli[(i + 1) % poli.length][1] - poli[(i + 1) % poli.length][0] * q[1], 0) >= 0 ? poli : [...poli].reverse());
  const polis = tela.map(anti);
  const recortar = (sujeito, clip) => {
    let saida = sujeito;
    for (let i = 0; i < clip.length && saida.length > 0; i++) {
      const a = clip[i]; const b = clip[(i + 1) % clip.length];
      const lado = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const entrada = saida; saida = [];
      for (let j = 0; j < entrada.length; j++) {
        const p = entrada[j]; const q = entrada[(j + 1) % entrada.length];
        const dp = lado(p); const dq = lado(q);
        if (dp >= 0) saida.push(p);
        if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) { const t = dp / (dp - dq); saida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
      }
    }
    return saida;
  };
  const profundidade = (l, q) => {
    const den = dot(l.n, olho);
    return (dot(l.n, l.pts[0]) - q[0] * dot(l.n, S) - q[1] * dot(l.n, T)) / den;
  };
  const antes = Array.from({ length: n }, () => new Set());
  const grau = new Array(n).fill(0);
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const inter = recortar(polis[a], polis[b]);
      if (inter.length < 3) continue;
      const area = Math.abs(inter.reduce((acc, q, i) => acc + q[0] * inter[(i + 1) % inter.length][1] - inter[(i + 1) % inter.length][0] * q[1], 0)) / 2;
      if (area < 1e-6) continue;
      const c = [inter.reduce((acc, q) => acc + q[0], 0) / inter.length, inter.reduce((acc, q) => acc + q[1], 0) / inter.length];
      const d = profundidade(lados[a], c) - profundidade(lados[b], c);
      if (Math.abs(d) < 1e-9) continue;
      const [longe, perto] = d < 0 ? [a, b] : [b, a];
      if (!antes[longe].has(perto)) { antes[longe].add(perto); grau[perto]++; }
    }
  }
  const centro = lados.map((l) => l.pts.reduce((acc, p) => acc + dot(p, olho), 0) / l.pts.length);
  const ordem = [];
  const feito = new Array(n).fill(false);
  for (let k = 0; k < n; k++) {
    let escolha = -1;
    for (let i = 0; i < n; i++) if (!feito[i] && grau[i] === 0 && (escolha < 0 || centro[i] < centro[escolha])) escolha = i;
    if (escolha < 0) for (let i = 0; i < n; i++) if (!feito[i] && (escolha < 0 || centro[i] < centro[escolha])) escolha = i;
    feito[escolha] = true; ordem.push(escolha);
    for (const q of antes[escolha]) grau[q]--;
  }
  return ordem;
}

/* `semFatias`: uma face lateral por lado do perfil em vez de uma por fatia. A ordem de profundidade do desenho
   precisa das fatias, mas a silhueta e a profundidade de cada célula da projeção não (as faces de uma mesma faixa
   são coplanares), e a projeção passa de 36 fatias por forma a uma. */
export function fatiarForma(r, olho, { semFatias = false } = {}) {
  if (r.partes) {
    /* tubo: as partes se sobrepõem nas juntas, então todas as fatias vão juntas para a ordem de profundidade */
    return r.partes.flatMap((pt) => fatiarForma(subforma(r, pt), olho, { semFatias }).filter((ch) => !(ch.ponta && pt.semTampa?.[ch.ponta])).map((ch) => ({ ...ch, r, ...(pt.semTampa?.inicio && ch.arcos?.length ? { arcos: [] } : {}) }))).sort((x, y) => x.prof - y.prof);
  }
  if (r.prisma.secoes) return fatiarSecoes(r, olho);
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

  /* o perfil côncavo vai numa fatia só: o prisma é exato e as faces se ordenam pelo perfil */
  const fatias = semFatias || comprimento <= 10 || r.prisma.naoConvexo ? 1 : Math.max(1, Math.min(36, Math.ceil(comprimento / 5)));
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

        const doLado = [];
        if (para === 'fora' && (silA || vincA)) doLado.push([mundo(a[0], a[1], w0), mundo(a[0], a[1], w1)]);
        if (para === 'fora' && (silD || vincD)) doLado.push([mundo(d[0], d[1], w0), mundo(d[0], d[1], w1)]);
        linhas.push(...doLado);

        destino.push({ papel: para === 'fora' ? 'lado' : 'dentro', n, pts, ...(r.prisma.naoConvexo ? { linhas: doLado } : {}) });
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
          ponta: 'inicio',
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
          ponta: 'fim',
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

  if (r.prisma.naoConvexo) {
    /* perfil côncavo: uma face lateral pode cobrir outra do mesmo sólido, e as fatias vão do fundo para a frente */
    const modelo = chunks.find((ch) => ch.lados.length > 1);
    if (modelo && olho) {
      const ordem = ordemDasFaces(modelo.lados, olho);
      for (const ch of chunks) if (ch.lados.length === ordem.length) ch.lados = ordem.map((i) => ch.lados[i]);
    }
    chunks.sort((x, y) => x.prof - y.prof);
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

export const CORES_NOMEADAS = { roxo: '#7b4fb0', verde: '#3f9b52', azul: '#3d6fb5', vermelho: '#c24a3a', laranja: '#e0892b', amarelo: '#e3c23a', cinza: '#9aa3ad', preto: '#333333', branco: '#eeeeee' };
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

/* Cópia de uma forma resolvida com o centro e a caixa deslocados por `delta`. A cópia lembra de qual forma
   veio e de quanto foi deslocada, para que a projeção reaproveite as faces da original em vez de refatiar. */
const deslocamentos = new WeakMap();
export function deslocarForma(r, delta) {
  const somar = (v) => v.map((x, i) => x + delta[i]);
  const nova = { ...r, centro: somar(r.centro), min: somar(r.min), max: somar(r.max) };
  const origem = deslocamentos.get(r);
  deslocamentos.set(nova, origem ? { base: origem.base, delta: somar0(origem.delta, delta) } : { base: r, delta: [...delta] });
  return nova;
}
const somar0 = (a, b) => a.map((x, i) => x + b[i]);

/* { base, delta } de uma cópia feita por `deslocarForma`, ou null para uma forma que não é cópia. */
export function origemDoDeslocamento(r) {
  return deslocamentos.get(r) ?? null;
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
    return deslocarForma(r, [0, 1, 2].map((i) => (i === k ? delta : 0)));
  });
}

/* Opacidade da forma, de 0 a 1 (padrão 1, que não muda o desenho). */
function lerOpacidade(v, onde) {
  if (v === undefined) return undefined;
  exigir(typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1, `${onde}: "opacidade" deve ser um número de 0 a 1`);
  return v;
}

/* Desenho com menos lados: o círculo de cilindros e anéis tem 128 lados, e numa moto de 66 formas isso dá um SVG de
   10 MB por opção. Com `"ladosPorEscala": true` na raiz, cada cilindro e cada anel sem `lados` declarado recebe o menor
   número de lados cuja flecha (o quanto o polígono inscrito se afasta do círculo) fica abaixo de FLECHA_PX na tela,
   contando a escala que o painel dá ao conjunto. Sem o campo o desenho é o de sempre, byte a byte. Só o desenho lê o
   campo: o gate de contato e a projeção medem sempre o esboço original, com os 128 lados. */
export const FLECHA_PX = 0.35;
const PX_DO_CONJUNTO = 500;
const LADOS_MINIMOS = { cilindro: 16, anel: 32 };

export function ladosPorEscala(rpx, minimo = 16) {
  const passo = Math.acos(Math.max(-1, 1 - FLECHA_PX / Math.max(rpx, FLECHA_PX)));
  return Math.max(minimo, Math.min(SEGMENTOS, Math.ceil(Math.PI / Math.max(passo, 1e-6))));
}

function comLadosPorEscala(esboco) {
  let dimensao = 1;
  for (const [i, o] of esboco.opcoes.entries()) {
    const rs = resolverOpcao(o, `opção ${i + 1}`, esboco.pontos);
    for (let e = 0; e < 3; e++) dimensao = Math.max(dimensao, Math.max(...rs.map((r) => r.max[e])) - Math.min(...rs.map((r) => r.min[e])));
  }
  const pxPorMm = PX_DO_CONJUNTO / dimensao;
  return {
    ...esboco,
    opcoes: esboco.opcoes.map((o) => ({
      ...o,
      formas: (o.formas ?? []).map((f) => {
        if (f.lados !== undefined || !Object.hasOwn(LADOS_MINIMOS, f.tipo)) return f;
        const raio = (f.tipo === 'anel' ? f.diametroExterno : f.diametro) / 2;
        return raio > 0 ? { ...f, lados: ladosPorEscala(raio * pxPorMm, LADOS_MINIMOS[f.tipo]) } : f;
      }),
    })),
  };
}

export function validarEsboco(bruto) {
  exigir(bruto && typeof bruto === 'object', 'o esboço precisa ser um objeto JSON');
  let esboco = expandirEsboco(bruto);
  exigir(esboco.ladosPorEscala === undefined || typeof esboco.ladosPorEscala === 'boolean', '"ladosPorEscala" deve ser true ou false');
  if (esboco.ladosPorEscala === true && Array.isArray(esboco.opcoes) && esboco.opcoes.length > 0) esboco = comLadosPorEscala(esboco);
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

      if (f.tipo === 'cilindro' || f.tipo === 'anel' || f.tipo === 'cone') {
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

      const pintarFaces = (chunks) => {
        for (const ch of chunks) {
          for (const f of [...ch.dentro, ...ch.lados]) {
            const c = tint(f.n);
            partes.push(`<path d="${caminho(f.pts.map(V.p).map(tela))}" fill="${c}" stroke="${c}" stroke-width="0.8" stroke-linejoin="round"/>`);
          }
        }
      };
      const pintarTampas = (chunks) => {
        for (const ch of chunks) {
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
      };
      const pintarArcos = (chunks) => {
        for (const ch of chunks) {
          for (const arc of ch.arcos ?? []) {
            if (arc.length < 2) continue;
            partes.push(`<path d="${caminhoAberto(arc.map(V.p).map(tela))}" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
          }
        }
      };
      const pintarSilhuetas = (chunks) => {
        const todasLinhas2d = chunks.flatMap((ch) => ch.linhas.map((l) => l.map(V.p).map(tela)));
        const cadeias = encadearLinhas(todasLinhas2d);
        for (const cadeia of cadeias) {
          if (cadeia.length < 2) continue;
          if (cadeia.length === 2) {
            partes.push(`<line x1="${f1(cadeia[0][0])}" y1="${f1(cadeia[0][1])}" x2="${f1(cadeia[1][0])}" y2="${f1(cadeia[1][1])}" stroke="#111111" stroke-width="2" stroke-linecap="round"/>`);
          } else {
            partes.push(`<path d="${caminhoAberto(cadeia)}" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
          }
        }
      };
      if (g.r.prisma?.naoConvexo) {
        /* forma côncava ou com cintura (extrusão côncava, loft, revolução): cada face leva as próprias linhas logo
           depois dela, e a face da frente as cobre por cima em vez de as linhas de trás aparecerem sobre ela */
        for (const ch of g.chunks) {
          for (const f of [...ch.dentro, ...ch.lados]) {
            pintarFaces([{ dentro: [], lados: [f] }]);
            for (const l of f.linhas ?? []) {
              const [a, b] = l.map(V.p).map(tela);
              partes.push(`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="#111111" stroke-width="2" stroke-linecap="round"/>`);
            }
          }
          pintarTampas([ch]);
          pintarArcos([ch]);
        }
      } else {
        pintarFaces(g.chunks);
        pintarTampas(g.chunks);
        pintarArcos(g.chunks);
        pintarSilhuetas(g.chunks);
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
  /* `geometria: true` (uso interno da imagem por achado): a correspondência entre o plano da vista e os pixels de cada painel */
  if (esboco.geometria === true) saida.geometria = { vista, escala, paineis: projetadas.map((p, k) => { const { cx, cy } = geometria(p, k, escala); return { cx, cy }; }) };
  return saida;
}
