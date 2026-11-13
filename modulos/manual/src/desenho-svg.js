/* desenho-svg.js — a página do desenho técnico: três vistas em terceiro diedro (cima sobre a frente, lado direito à direita da frente),
   linha visível cheia, escondida tracejada e as cotas declaradas. Função pura: recebe as projeções e as cotas, devolve o SVG. */
import { VISTAS_DO_DESENHO } from './projecao.js';

export const LARGURA_DA_PAGINA = 1400;
const MARGEM = 90;
const VAO = 130;
const TITULO = 100;
const ALTURA_MAXIMA = 1100;
const LADOS_DA_COTA = ['cima', 'baixo', 'esquerda', 'direita'];
const PASSO_ENTRE_COTAS = 26;
const AFASTAMENTO_PADRAO_PX = 30;
const LARGURA_DO_CARACTERE = 9;
const SEGURO = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (n) => (Math.round(n * 10) / 10).toString();

/** Número em mm no formato pt-BR, até duas casas, sem zeros à direita. */
export function medidaEmTexto(mm) {
  return (Math.round(mm * 100) / 100).toString().replace('.', ',');
}

export function paginaDoDesenho({ titulo, projecoes, cotas = [], limiarGraus }) {
  const { frente, cima, lado } = projecoes;
  const dim = (p) => ({ w: p.caixa.umax - p.caixa.umin, h: p.caixa.vmax - p.caixa.vmin });
  const df = dim(frente); const dc = dim(cima); const dl = dim(lado);
  const larguraUtil = LARGURA_DA_PAGINA - 2 * MARGEM - VAO;
  const alturaUtil = ALTURA_MAXIMA - 2 * MARGEM - VAO - TITULO;
  const escala = Math.min(larguraUtil / (df.w + dl.w), alturaUtil / (dc.h + df.h));
  const altura = Math.round(2 * MARGEM + TITULO + VAO + (dc.h + df.h) * escala);
  const origens = {
    cima: [MARGEM, MARGEM + TITULO],
    frente: [MARGEM, MARGEM + TITULO + dc.h * escala + VAO],
    lado: [MARGEM + df.w * escala + VAO, MARGEM + TITULO + dc.h * escala + VAO],
  };
  const paraPagina = (vista, u, v) => {
    const c = projecoes[vista].caixa; const [ox, oy] = origens[vista];
    return [ox + (u - c.umin) * escala, oy + (c.vmax - v) * escala];
  };
  const partes = [];
  const caminho = (segmentos, vista) => segmentos.map(([a, b, c, d]) => {
    const [x1, y1] = paraPagina(vista, a, b); const [x2, y2] = paraPagina(vista, c, d);
    return `M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}`;
  }).join('');
  for (const vista of ['cima', 'frente', 'lado']) {
    const p = projecoes[vista];
    partes.push(`<g id="vista-${vista}" data-visiveis="${p.visiveis.length}" data-escondidos="${p.escondidos.length}">`);
    if (p.escondidos.length) partes.push(`<path class="escondida" d="${caminho(p.escondidos, vista)}"/>`);
    if (p.visiveis.length) partes.push(`<path class="visivel" d="${caminho(p.visiveis, vista)}"/>`);
    partes.push('</g>');
  }
  /* os rótulos ficam acima de cada vista, à esquerda, longe das cotas de baixo */
  const rotulos = ['cima', 'frente', 'lado'].map((vista) => {
    const [ox, oy] = origens[vista];
    return `<text class="rotulo" x="${f1(ox)}" y="${f1(oy - 62)}">${SEGURO(VISTAS_DO_DESENHO[vista].rotulo)}</text>`;
  });
  const obstaculos = { segmentos: [], retangulos: [] };
  for (const vista of ['cima', 'frente', 'lado']) {
    for (const [a, b, c, d] of [...projecoes[vista].visiveis, ...projecoes[vista].escondidos]) {
      const [x1, y1] = paraPagina(vista, a, b); const [x2, y2] = paraPagina(vista, c, d);
      obstaculos.segmentos.push([x1, y1, x2, y2]);
    }
  }
  const pilhas = new Map();
  const cotasSvg = cotas.map((cota) => {
    const chave = `${cota.vista}|${cota.lado}`;
    const n = pilhas.get(chave) ?? 0;
    pilhas.set(chave, cota.afastamentoMm ? n : n + 1);
    if (cota.tipo === 'diametro') return cotaDeDiametro(cota, paraPagina, escala, obstaculos, altura);
    const linear = cotaLinear(cota, paraPagina, escala, n);
    obstaculos.retangulos.push(...linear.retangulos);
    return linear.svg;
  });
  const corpo = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA_DA_PAGINA}" height="${altura}" viewBox="0 0 ${LARGURA_DA_PAGINA} ${altura}" font-family="DejaVu Sans, Arial, sans-serif">`,
    '<style>.visivel{fill:none;stroke:#111;stroke-width:1.6;stroke-linecap:round}.escondida{fill:none;stroke:#444;stroke-width:1;stroke-dasharray:6 4}'
    + '.cota{fill:none;stroke:#0b5ea8;stroke-width:1}.seta{fill:#0b5ea8}.valor{fill:#0b5ea8;font-size:15px;text-anchor:middle}.valor.solto{text-anchor:start}'
    + '.rotulo{fill:#222;font-size:16px;font-weight:bold}.titulo{fill:#111;font-size:22px;font-weight:bold}.nota{fill:#555;font-size:13px}.eixo{fill:none;stroke:#0b5ea8;stroke-width:.8;stroke-dasharray:10 3 2 3}</style>',
    `<rect width="100%" height="100%" fill="#fff"/>`,
    `<text class="titulo" x="${MARGEM}" y="40">${SEGURO(titulo)}</text>`,
    `<text class="nota" x="${MARGEM}" y="64">Terceiro diedro (vista de cima sobre a de frente, lado direito à direita). Cheio: aresta visível; tracejado: escondida. Arestas vivas acima de ${limiarGraus}°. Medidas em mm. Escala ${medidaEmTexto(escala)} px/mm.</text>`,
    ...rotulos,
    ...partes,
    ...cotasSvg,
    '</svg>',
  ];
  return `${corpo.join('\n')}\n`;
}

function seta(x, y, dx, dy) {
  const nx = -dy; const ny = dx;
  const a = [x - dx * 9 + nx * 3, y - dy * 9 + ny * 3]; const b = [x - dx * 9 - nx * 3, y - dy * 9 - ny * 3];
  return `<polygon class="seta" points="${f1(x)},${f1(y)} ${f1(a[0])},${f1(a[1])} ${f1(b[0])},${f1(b[1])}"/>`;
}

function cotaLinear(cota, paraPagina, escala, empilhada) {
  const uv = VISTAS_DO_DESENHO[cota.vista].uv;
  const [u1, v1] = uv(cota.de); const [u2, v2] = uv(cota.ate);
  const [x1, y1] = paraPagina(cota.vista, u1, v1); const [x2, y2] = paraPagina(cota.vista, u2, v2);
  const texto = cota.texto ?? `${medidaEmTexto(cota.medidaMm)}`;
  const base = cota.afastamentoMm ? cota.afastamentoMm * escala : AFASTAMENTO_PADRAO_PX + empilhada * PASSO_ENTRE_COTAS;
  const saida = [];
  const retangulos = [];
  const larguraDoTexto = texto.length * LARGURA_DO_CARACTERE;
  if (cota.lado === 'cima' || cota.lado === 'baixo') {
    const sinal = cota.lado === 'cima' ? -1 : 1;
    const yl = (sinal < 0 ? Math.min(y1, y2) : Math.max(y1, y2)) + sinal * base;
    for (const [x, y] of [[x1, y1], [x2, y2]]) saida.push(`<line class="cota" x1="${f1(x)}" y1="${f1(y + sinal * 3)}" x2="${f1(x)}" y2="${f1(yl + sinal * 5)}"/>`);
    const [xa, xb] = x1 <= x2 ? [x1, x2] : [x2, x1];
    saida.push(`<line class="cota" x1="${f1(xa)}" y1="${f1(yl)}" x2="${f1(xb)}" y2="${f1(yl)}"/>`, seta(xa, yl, 1, 0), seta(xb, yl, -1, 0));
    saida.push(`<text class="valor" x="${f1((xa + xb) / 2)}" y="${f1(yl - 5)}">${SEGURO(texto)}</text>`);
    retangulos.push([xa, yl - 2, xb, yl + 2]);
    retangulos.push([(xa + xb) / 2 - larguraDoTexto / 2, yl - 19, (xa + xb) / 2 + larguraDoTexto / 2, yl]);
  } else {
    const sinal = cota.lado === 'esquerda' ? -1 : 1;
    const xl = (sinal < 0 ? Math.min(x1, x2) : Math.max(x1, x2)) + sinal * base;
    for (const [x, y] of [[x1, y1], [x2, y2]]) saida.push(`<line class="cota" x1="${f1(x + sinal * 3)}" y1="${f1(y)}" x2="${f1(xl + sinal * 5)}" y2="${f1(y)}"/>`);
    const [ya, yb] = y1 <= y2 ? [y1, y2] : [y2, y1];
    saida.push(`<line class="cota" x1="${f1(xl)}" y1="${f1(ya)}" x2="${f1(xl)}" y2="${f1(yb)}"/>`, seta(xl, ya, 0, 1), seta(xl, yb, 0, -1));
    const xt = xl + sinal * -5;
    saida.push(`<text class="valor" text-anchor="middle" transform="translate(${f1(xt)} ${f1((ya + yb) / 2)}) rotate(-90)">${SEGURO(texto)}</text>`);
    retangulos.push([xl - 2, ya, xl + 2, yb]);
    retangulos.push([xt - 16, (ya + yb) / 2 - larguraDoTexto / 2, xt + 3, (ya + yb) / 2 + larguraDoTexto / 2]);
  }
  return { svg: `<g class="cota-linear" data-vista="${cota.vista}" data-medida="${cota.medidaMm}">${saida.join('')}</g>`, retangulos };
}

const ANGULO_DO_LADO = { cima: 60, baixo: -60, esquerda: 150, direita: 30 };
const COMPRIMENTO_BASE_DO_TIRANTE = 40;
const PASSO_DO_TIRANTE = 25;
const TENTATIVAS_DE_TIRANTE = 10;
const BORDA_DA_PAGINA = 12;

/** O segmento (x1,y1)-(x2,y2) cruza o retângulo [x0,y0,x1,y1]? (Liang-Barsky) */
export function segmentoCruzaRetangulo([ax, ay, bx, by], [x0, y0, x1, y1]) {
  let t0 = 0; let t1 = 1;
  const dx = bx - ax; const dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
const retangulosSeCruzam = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * A cota de diâmetro: círculo e cruz de centro finos, tirante saindo do círculo no lado declarado e o texto numa prateleira. Se o
 * texto declarado cruzaria uma aresta do desenho, outro texto de cota ou a borda da página, o tirante cresce em passos e, esgotados
 * os passos, tenta os outros lados, e fica com a primeira posição livre (a declarada se nenhuma for).
 */
function cotaDeDiametro(cota, paraPagina, escala, obstaculos, alturaDaPagina) {
  const uv = VISTAS_DO_DESENHO[cota.vista].uv;
  const [u, v] = uv(cota.centro);
  const [cx, cy] = paraPagina(cota.vista, u, v);
  const r = (cota.diametro / 2) * escala;
  const texto = cota.texto ?? `Ø${medidaEmTexto(cota.diametro)}`;
  const larguraDoTexto = texto.length * LARGURA_DO_CARACTERE;
  const proposta = (lado, k) => {
    const ang = (ANGULO_DO_LADO[lado] * Math.PI) / 180;
    const dx = Math.cos(ang); const dy = -Math.sin(ang);
    const fx = cx + dx * (r + COMPRIMENTO_BASE_DO_TIRANTE + k * PASSO_DO_TIRANTE); const fy = cy + dy * (r + COMPRIMENTO_BASE_DO_TIRANTE + k * PASSO_DO_TIRANTE);
    const sentido = dx >= 0 ? 1 : -1;
    const prateleira = sentido * 36;
    const texto0 = fx + prateleira + sentido * 4;
    const caixa = [Math.min(fx, texto0, texto0 + sentido * larguraDoTexto), fy - 17, Math.max(fx, texto0, texto0 + sentido * larguraDoTexto), fy + 6];
    return { lado, dx, dy, fx, fy, sentido, prateleira, texto0, caixa };
  };
  const livre = (p) => {
    if (p.caixa[0] < BORDA_DA_PAGINA || p.caixa[2] > LARGURA_DA_PAGINA - BORDA_DA_PAGINA || p.caixa[1] < 100 || p.caixa[3] > alturaDaPagina - BORDA_DA_PAGINA) return false;
    if (obstaculos.retangulos.some((rect) => retangulosSeCruzam(rect, p.caixa))) return false;
    return !obstaculos.segmentos.some((seg) => segmentoCruzaRetangulo(seg, p.caixa));
  };
  const ordem = [cota.lado, ...LADOS_DA_COTA.filter((l) => l !== cota.lado)];
  let escolhida = proposta(cota.lado, 0);
  procura: for (const lado of ordem) {
    for (let k = 0; k < TENTATIVAS_DE_TIRANTE; k += 1) {
      const candidata = proposta(lado, k);
      if (livre(candidata)) { escolhida = candidata; break procura; }
    }
  }
  obstaculos.retangulos.push(escolhida.caixa);
  const { dx, dy, fx, fy, prateleira, texto0, sentido } = escolhida;
  const px = cx + dx * r; const py = cy + dy * r;
  return `<g class="cota-diametro" data-vista="${cota.vista}" data-diametro="${cota.diametro}" data-lado="${escolhida.lado}" data-texto="${f1(escolhida.caixa[0])},${f1(escolhida.caixa[1])},${f1(escolhida.caixa[2])},${f1(escolhida.caixa[3])}">`
    + `<circle class="eixo" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/>`
    + `<line class="eixo" x1="${f1(cx - r - 6)}" y1="${f1(cy)}" x2="${f1(cx + r + 6)}" y2="${f1(cy)}"/><line class="eixo" x1="${f1(cx)}" y1="${f1(cy - r - 6)}" x2="${f1(cx)}" y2="${f1(cy + r + 6)}"/>`
    + `<polyline class="cota" points="${f1(px)},${f1(py)} ${f1(fx)},${f1(fy)} ${f1(fx + prateleira)},${f1(fy)}"/>${seta(px, py, -dx, -dy)}`
    + `<text class="valor solto" style="text-anchor:${sentido > 0 ? 'start' : 'end'}" x="${f1(texto0)}" y="${f1(fy + 5)}">${SEGURO(texto)}</text></g>`;
}
