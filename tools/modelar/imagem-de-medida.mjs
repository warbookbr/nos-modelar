/* imagem-de-medida.mjs — o desenho das imagens das ferramentas de medida da superfície: o quadro de pixels RGBA com a fonte de 5 por 7,
 * a base da câmera ortográfica de uma direção, as vistas nomeadas e o número redondo das réguas e barras de escala.
 *
 * POR QUE ELE EXISTE. O mapa de desvio, o pente de curvatura, a continuidade nas emendas e o índice de suavidade gravam PNG com
 * texto, régua e barra de cor sem navegador nem biblioteca de desenho; o que é comum às quatro fica aqui, uma vez. A fonte só tem
 * maiúsculas, dígitos e alguns sinais, sem acento: o texto da imagem é escrito sem acento.
 *
 * Uso: `import { Quadro, baseDaVista, VISTAS, numeroRedondo, FUNDO, TINTA } from './imagem-de-medida.mjs'`. */
import { PNG } from 'pngjs';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';

/** As direções (de onde a câmera olha) das vistas da bancada, mais a isométrica de trás. */
export const VISTAS = Object.freeze({ ...Object.fromEntries(Object.entries(VISTAS_BANCADA).map(([k, v]) => [k, v.direcao])), 'isometrica-traseira': Object.freeze([-1, 0.72, -1]) });
export const FUNDO = Object.freeze([242, 244, 243]);
export const TINTA = Object.freeze([30, 34, 38]);

const GLIFOS = {};
{
  const t = (s) => s.split('/');
  const lista = {
    0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', 1: '..#../.##../..#../..#../..#../..#../.###.', 2: '.###./#...#/....#/...#./..#../.#.../#####',
    3: '####./....#/....#/.###./....#/....#/####.', 4: '#...#/#...#/#...#/#####/....#/....#/....#', 5: '#####/#..../####./....#/....#/#...#/.###.',
    6: '.###./#..../#..../####./#...#/#...#/.###.', 7: '#####/....#/...#./..#../.#.../.#.../.#...', 8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
    9: '.###./#...#/#...#/.####/....#/....#/.###.', A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.',
    C: '.###./#...#/#..../#..../#..../#...#/.###.', D: '####./#...#/#...#/#...#/#...#/#...#/####.', E: '#####/#..../#..../####./#..../#..../#####',
    F: '#####/#..../#..../####./#..../#..../#....', G: '.###./#...#/#..../#.###/#...#/#...#/.###.', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    I: '.###./..#../..#../..#../..#../..#../.###.', J: '..###/...#./...#./...#./...#./#..#./.##..', K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    L: '#..../#..../#..../#..../#..../#..../#####', M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
    O: '.###./#...#/#...#/#...#/#...#/#...#/.###.', P: '####./#...#/#...#/####./#..../#..../#....', Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    R: '####./#...#/#...#/####./#.#../#..#./#...#', S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..',
    U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.', V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..', W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#', Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
    '.': '...../...../...../...../...../.##../.##..', ',': '...../...../...../...../.##../..#../.#...', '-': '...../...../...../#####/...../...../.....',
    '+': '...../..#../..#../#####/..#../..#../.....', '/': '....#/....#/...#./..#../.#.../#..../#....', ':': '...../.##../.##../...../.##../.##../.....',
    '=': '...../...../#####/...../#####/...../.....', '(': '...#./..#../.#.../.#.../.#.../..#../...#.', ')': '.#.../..#../...#./...#./...#./..#../.#...',
    '%': '##..#/##..#/...#./..#../.#.../#..##/#..##', _: '...../...../...../...../...../...../#####', m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
    '<': '...#./..#../.#.../#..../.#.../..#../...#.', '>': '.#.../..#../...#./....#/...#./..#../.#...',
  };
  for (const [k, v] of Object.entries(lista)) GLIFOS[k] = t(v);
}

/** O quadro de pixels RGBA. */
export class Quadro {
  constructor(largura, altura, fundo = FUNDO) {
    this.W = largura; this.H = altura; this.d = new Uint8Array(largura * altura * 4);
    for (let i = 0; i < largura * altura; i++) { this.d[4 * i] = fundo[0]; this.d[4 * i + 1] = fundo[1]; this.d[4 * i + 2] = fundo[2]; this.d[4 * i + 3] = 255; }
  }

  ponto(x, y, cor) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const i = 4 * (y * this.W + x); this.d[i] = cor[0]; this.d[i + 1] = cor[1]; this.d[i + 2] = cor[2];
  }

  retangulo(x0, y0, x1, y1, cor) { for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) this.ponto(x, y, cor); }

  linha(x0, y0, x1, y1, cor, espessura = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    const r = Math.floor((espessura - 1) / 2);
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n; const y = y0 + ((y1 - y0) * k) / n;
      for (let a = -r; a <= r + ((espessura - 1) % 2); a++) for (let b = -r; b <= r + ((espessura - 1) % 2); b++) this.ponto(x + a, y + b, cor);
    }
  }

  /** O texto em fonte de 5 por 7 (maiúsculas, dígitos e alguns sinais; sem acento), ancorado no canto superior esquerdo; devolve a largura em pixels. */
  texto(x, y, texto, { escala = 2, cor = TINTA } = {}) {
    let cx = x;
    for (const ch of String(texto)) {
      const g = GLIFOS[ch] ?? GLIFOS[ch.toUpperCase()];
      if (g) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') this.retangulo(cx + c * escala, y + r * escala, cx + (c + 1) * escala, y + (r + 1) * escala, cor);
      cx += 6 * escala;
    }
    return cx - x;
  }

  larguraDoTexto(texto, escala = 2) { return String(texto).length * 6 * escala; }

  png() { const p = new PNG({ width: this.W, height: this.H }); Buffer.from(this.d.buffer).copy(p.data); return PNG.sync.write(p); }
}

/** A base da câmera ortográfica de uma direção (de onde ela olha): `{ direita, cima, perto }`, com y para cima (z quando olha de cima). */
export function baseDaVista(direcao) {
  const m = Math.hypot(...direcao); const d = direcao.map((x) => x / m);
  const ajuda = Math.abs(d[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0];
  let r = [ajuda[1] * d[2] - ajuda[2] * d[1], ajuda[2] * d[0] - ajuda[0] * d[2], ajuda[0] * d[1] - ajuda[1] * d[0]];
  const mr = Math.hypot(...r); r = r.map((x) => x / mr);
  const c = [d[1] * r[2] - d[2] * r[1], d[2] * r[0] - d[0] * r[2], d[0] * r[1] - d[1] * r[0]];
  return { direita: r, cima: c, perto: d };
}

/** Número "redondo" de escala (1, 2, 2,5, 5 vezes uma potência de dez) igual ou acima de `x`. */
export function numeroRedondo(x) {
  if (!(x > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(x)); const f = x / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
