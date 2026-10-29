/* A medida do desenho de linhas: o que sobra e o que falta nos traços, contra uma referência que não olha a lógica de arestas.

   O desenhista traça as arestas da malha que ele escolhe (vinco, silhueta, o que a oclusão deixa ver). Conferir isso contra as mesmas
   arestas é conferir o desenhista com ele mesmo. A referência é outra: a mesma malha, com a mesma projeção, a mesma escala e o mesmo
   enquadramento, renderizada com profundidade e normal por pixel (a ferramenta usa o Three.js num WebGL do Chromium, com supersampling),
   e as arestas são tiradas no espaço da tela, onde só existe o que se vê: a descontinuidade de profundidade (silhueta e oclusão) e a
   mudança de normal de 30 graus ou mais (o vinco, `COSSENO_DO_VINCO`, e o degrau, `DEGRAU_DE_PROFUNDIDADE`, os mesmos que o desenho usa em `limites-do-desenho.js`: o desenho e a referência discordam só na conta, no pixel contra o vetor). Ela não olha a topologia da malha, a divisão em partes nem a
   lista de arestas do desenho.

   Este módulo só prepara dados e compara máscaras, sem navegador: os triângulos da referência (`triangulosDaReferencia`), o que é traço
   na imagem do desenho (`mascaraDosTracos`) e a comparação (`compararComAReferencia`). Vazamento é pixel de traço do desenho a mais de
   `tolerancia` pixels de qualquer aresta da referência; falha é pixel de aresta da referência a mais de `tolerancia` pixels de
   qualquer traço do desenho. Os dois saem em grupos (componentes de oito vizinhos), com a caixa e o centro de cada um. */
import { COR_DO_TRACO } from './camada.js';
import { ErroDeEsboco } from './index.js';
import { DEGRAU_DE_PROFUNDIDADE } from './limites-do-desenho.js';

/* a tolerância, em pixels do PNG, entre um traço e a aresta que ele deve cobrir (a fita tem 2 px de largura) */
export const TOLERANCIA_DO_DESENHO = 2;
/* o que a comparação soma à tolerância: a distância é entre centros de pixel, e o canto da fita (que passa do vértice em meia largura,
   um pixel para o lado e dois para a frente) fica a 2,24 do pixel de aresta mais perto; sem este quarto de pixel toda quina de caixa
   saía acusada em um ou dois pixels */
export const FOLGA_DO_PIXEL = 0.25;
/* amostras por lado de pixel do PNG na referência */
export const SUPERAMOSTRAGEM_DA_REFERENCIA = 4;
/* a fração da fita que um pixel precisa ter para ser traço */
export const LIMIAR_DO_TRACO = 0.5;
/* A aresta da referência passa por histerese. Um pixel do PNG tem aresta forte quando `AMOSTRAS_FORTES_DA_REFERENCIA` das dezesseis amostras
   dele (quatro por lado) têm: a aresta de verdade cruza várias. O que tem de uma a duas amostras só entra quando encosta (oito vizinhos,
   em cadeia) num pixel forte, que é como a ponta da aresta, que cruza só o canto do último pixel, continua aresta. A amostra isolada, que é
   um degrau de um décimo de milímetro que a conta de ponto flutuante põe de um lado ou do outro do limite e deixa em pontos regulares de
   um círculo, é ruído da referência e não da imagem. */
export const AMOSTRAS_FORTES_DA_REFERENCIA = 3;
/* O grupo de aresta da referência com menos pixels que isto é faísca: uma amostra que enxerga por uma fresta de um décimo de milímetro na
   malha (a emenda de dois discos de malhas diferentes, que deixa a ponta de um triângulo sem cobrir) dá dois ou três pixels de aresta
   isolados, que nenhum desenho de linhas traça, e um traço de verdade, de um milímetro de comprimento, já passa de dez pixels. */
export const PIXELS_MINIMOS_DE_UM_GRUPO_DA_REFERENCIA = 4;
/* a profundidade só conta como degrau, em mm ao longo do olho, acima desta folga somada à que a inclinação da superfície explica */
export const DEGRAU_MINIMO_DA_REFERENCIA = DEGRAU_DE_PROFUNDIDADE;

const unitario = (v) => { const m = Math.hypot(...v) || 1; return v.map((c) => c / m); };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* A base da vista: as linhas da matriz de `V.p` (a projeção é linear), o olho e quantos pixels de plano a vista dá a um milímetro
   (as vistas isométricas escalam o plano por 1,2247, e a profundidade não). */
export function baseDaVista(V) {
  const colunas = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => V.p(e));
  const u = [0, 1, 2].map((i) => colunas[i][0]);
  const v = [0, 1, 2].map((i) => colunas[i][1]);
  const olho = unitario(V.olho);
  const nu = Math.hypot(...u); const nv = Math.hypot(...v);
  if (!(Math.abs(nu - nv) < 1e-9 * nu && Math.abs(dot(u, v)) < 1e-9 * nu * nv && Math.abs(dot(u, olho)) < 1e-9 * nu && Math.abs(dot(v, olho)) < 1e-9 * nv)) {
    throw new ErroDeEsboco('a vista não é uma projeção ortogonal com escala uniforme: a referência não sabe levar a normal à tela');
  }
  return { u: u.map((c) => c / nu), v: v.map((c) => c / nv), olho, mmPorUnidade: 1 / nu };
}

/* Os triângulos de frente da malha, prontos para a referência: por vértice, a posição no quadro (x, y em pixels do quadro do desenho) e a
   profundidade ao longo do olho (mm), e a normal da face no sistema da tela (direita, baixo, olho). `volumes` lista os volumes que o
   desenho pinta (os ids); `tela` leva o ponto do plano da vista ao pixel do quadro (`geometria(...).tela`). O triângulo de costas e o
   degenerado não entram, como no desenho. */
export function triangulosDaReferencia({ malha, volumes, V, tela }) {
  const base = baseDaVista(V);
  const ids = new Set(volumes.map((v) => (typeof v === 'string' ? v : v.id)));
  const pos = []; const nor = [];
  let zMin = Infinity; let zMax = -Infinity;
  for (const f of malha.faces) {
    if (!ids.has(f.volume)) continue;
    const [a, b, c] = f.vertices.map((i) => malha.vertices[i]);
    const n = cruz(sub(b, a), sub(c, a));
    const m = Math.hypot(...n);
    if (!(m > 1e-9)) continue;
    const un = n.map((x) => x / m);
    if (!(dot(un, base.olho) > 1e-6)) continue;
    const nt = [dot(un, base.u), dot(un, base.v), dot(un, base.olho)];
    for (const p of [a, b, c]) {
      const [x, y] = tela(V.p(p));
      const z = dot(p, base.olho);
      pos.push(x, y, z); nor.push(...nt);
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
  }
  if (pos.length === 0) throw new ErroDeEsboco('a referência não tem nenhum triângulo de frente para desenhar');
  return { pos, nor, zMin, zMax, mmPorUnidade: base.mmPorUnidade };
}

/* A máscara (1 = traço) da região `[x0, y0, x1, y1]` do desenho `png` (RGBA), dado o mesmo desenho `semTracos` sem as fitas: um pixel é
   traço quando a cor dele ficou, pela fita, ao menos `LIMIAR_DO_TRACO` do caminho (de zero a um) entre a cor sem fita e a cor do traço.
   O pixel cuja cor sem fita já é a do traço não decide nada e não conta. */
export function mascaraDosTracos(png, semTracos, regiao, { limiar = LIMIAR_DO_TRACO, cor = COR_DO_TRACO } = {}) {
  const [x0, y0, x1, y1] = regiao;
  const l = x1 - x0; const a = y1 - y0;
  const m = new Uint8Array(l * a);
  const alvo = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
  for (let y = 0; y < a; y++) {
    for (let x = 0; x < l; x++) {
      const i = ((y + y0) * png.width + (x + x0)) * 4;
      let num = 0; let den = 0;
      for (let c = 0; c < 3; c++) {
        const d = semTracos.data[i + c] - alvo[c];
        num += (semTracos.data[i + c] - png.data[i + c]) * d; den += d * d;
      }
      if (den > 1200 && num / den >= limiar) m[y * l + x] = 1;
    }
  }
  return m;
}

/* Os deslocamentos de um disco de raio `r` (em pixels). */
function disco(r) {
  const o = [];
  const n = Math.ceil(r);
  for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (dx * dx + dy * dy <= r * r + 1e-9) o.push([dx, dy]);
  return o;
}

/* A máscara dilatada por um disco de raio `r`: 1 onde há algum pixel marcado a até `r` pixels. */
export function dilatar(m, largura, altura, r) {
  const saida = new Uint8Array(m.length);
  const o = disco(r);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (!m[y * largura + x]) continue;
      for (const [dx, dy] of o) {
        const xx = x + dx; const yy = y + dy;
        if (xx >= 0 && xx < largura && yy >= 0 && yy < altura) saida[yy * largura + xx] = 1;
      }
    }
  }
  return saida;
}

/* Os grupos de pixels ligados (oito vizinhos) de uma máscara, do que tem mais pixels ao que tem menos (e, no empate, por posição):
   `{ pixels, caixa: [x0, y0, x1, y1], centro: [x, y] }`, com as posições somadas de `origem` (a região na imagem). */
export function gruposDaMascara(m, largura, altura, origem = [0, 0]) {
  const visto = new Uint8Array(m.length);
  const grupos = [];
  const fila = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || visto[s]) continue;
    visto[s] = 1; fila.length = 0; fila.push(s);
    let n = 0; let sx = 0; let sy = 0; let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let k = 0; k < fila.length; k++) {
      const p = fila[k];
      const x = p % largura; const y = (p - x) / largura;
      n++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; const yy = y + dy;
          if (xx < 0 || xx >= largura || yy < 0 || yy >= altura) continue;
          const q = yy * largura + xx;
          if (m[q] && !visto[q]) { visto[q] = 1; fila.push(q); }
        }
      }
    }
    grupos.push({ pixels: n, caixa: [x0 + origem[0], y0 + origem[1], x1 + origem[0], y1 + origem[1]], centro: [Math.round((sx / n + origem[0]) * 10) / 10, Math.round((sy / n + origem[1]) * 10) / 10], lista: [...fila] });
  }
  return grupos.sort((a, b) => b.pixels - a.pixels || a.centro[1] - b.centro[1] || a.centro[0] - b.centro[0]);
}

const contar = (m) => { let n = 0; for (const x of m) n += x; return n; };

/* A distância (pixels) do pixel de `grupo` mais longe da máscara `outra`, procurada até `ate` pixels (devolve `ate` se passa disso): o quanto o
   grupo está fora da tolerância, para quem lê o relato saber se é uma linha em outro lugar (dezenas de pixels) ou uma ponta a meio pixel. */
function afastamentoDoGrupo(lista, outra, largura, altura, ate = 12) {
  let pior = 0;
  const passo = Math.max(1, Math.ceil(lista.length / 400));
  for (let k = 0; k < lista.length; k += passo) {
    const p = lista[k];
    const x = p % largura; const y = (p - x) / largura;
    let melhor = ate;
    for (let dy = -ate; dy <= ate; dy++) {
      for (let dx = -ate; dx <= ate; dx++) {
        const xx = x + dx; const yy = y + dy;
        if (xx < 0 || xx >= largura || yy < 0 || yy >= altura || !outra[yy * largura + xx]) continue;
        const d = Math.hypot(dx, dy);
        if (d < melhor) melhor = d;
      }
    }
    if (melhor > pior) pior = melhor;
  }
  return Math.round(pior * 10) / 10;
}

/* Compara os traços do desenho com as arestas da referência (duas máscaras do mesmo tamanho). Devolve `{ vazamento, falha }`, cada
   um com `pixels`, `grupos` e a `mascara`. */
export function compararComAReferencia({ tracos, referencia, largura, altura, tolerancia = TOLERANCIA_DO_DESENHO, origem = [0, 0] }) {
  if (tracos.length !== largura * altura || referencia.length !== largura * altura) throw new ErroDeEsboco('as máscaras do desenho e da referência precisam ter o tamanho da região');
  const pertoDaReferencia = dilatar(referencia, largura, altura, tolerancia + FOLGA_DO_PIXEL);
  const pertoDoTraco = dilatar(tracos, largura, altura, tolerancia + FOLGA_DO_PIXEL);
  const vaza = new Uint8Array(tracos.length);
  const falta = new Uint8Array(tracos.length);
  for (let i = 0; i < tracos.length; i++) {
    if (tracos[i] && !pertoDaReferencia[i]) vaza[i] = 1;
    if (referencia[i] && !pertoDoTraco[i]) falta[i] = 1;
  }
  const resumo = (mascara, outra) => ({
    pixels: contar(mascara),
    grupos: gruposDaMascara(mascara, largura, altura, origem).map(({ lista, ...g }) => ({ ...g, afastamento: afastamentoDoGrupo(lista, outra, largura, altura) })),
    mascara,
  });
  return { vazamento: resumo(vaza, referencia), falha: resumo(falta, tracos), tracos: contar(tracos), arestas: contar(referencia) };
}

/* A histerese da aresta: `contagem` (as amostras com aresta de cada pixel), forte a partir de `fortes`, fraca a partir de uma. Devolve a
   máscara com os fortes e os fracos ligados a eles. */
export function arestaPorHisterese(contagem, largura, altura, fortes = AMOSTRAS_FORTES_DA_REFERENCIA) {
  const m = new Uint8Array(contagem.length);
  const fila = [];
  for (let i = 0; i < contagem.length; i++) if (contagem[i] >= fortes) { m[i] = 1; fila.push(i); }
  for (let k = 0; k < fila.length; k++) {
    const p = fila[k];
    const x = p % largura; const y = (p - x) / largura;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx; const yy = y + dy;
        if (xx < 0 || xx >= largura || yy < 0 || yy >= altura) continue;
        const q = yy * largura + xx;
        if (!m[q] && contagem[q] >= 1) { m[q] = 1; fila.push(q); }
      }
    }
  }
  return tirarFaiscas(m, largura, altura);
}

/* A máscara sem os grupos (oito vizinhos) com menos de `minimo` pixels. */
export function tirarFaiscas(m, largura, altura, minimo = PIXELS_MINIMOS_DE_UM_GRUPO_DA_REFERENCIA) {
  const saida = new Uint8Array(m);
  const visto = new Uint8Array(m.length);
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || visto[s]) continue;
    const fila = [s]; visto[s] = 1;
    for (let k = 0; k < fila.length; k++) {
      const p = fila[k];
      const x = p % largura; const y = (p - x) / largura;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; const yy = y + dy;
          if (xx < 0 || xx >= largura || yy < 0 || yy >= altura) continue;
          const q = yy * largura + xx;
          if (m[q] && !visto[q]) { visto[q] = 1; fila.push(q); }
        }
      }
    }
    if (fila.length < minimo) for (const p of fila) saida[p] = 0;
  }
  return saida;
}
