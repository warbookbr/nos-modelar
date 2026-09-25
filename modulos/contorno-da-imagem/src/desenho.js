/* desenho.js — o que o crítico e a pessoa olham.
 *
 * A sobreposição pinta cada parte por cima da imagem original, com opacidade
 * baixa (20% por padrão), para a sombra e o volume da parte continuarem
 * visíveis através da cor. O zoom por divisa recorta cada encontro entre duas
 * partes vizinhas e mostra, lado a lado e ampliados, o original e o mesmo
 * trecho pintado. Em 2026-09-25 três críticos olhando a imagem inteira não
 * viram uma ponta de 3 px da carcaça do punho dentro do antebraço; a pessoa a
 * achou pedindo o zoom. Por isso o zoom é passo fixo do pacote. */
import { PNG } from 'pngjs';
import { carregarOpenCV } from './opencv.js';

/* Matiz pelo ângulo de ouro: dois índices seguidos caem longe um do outro no
   círculo de cores. Com a divisão igual do círculo, partes vizinhas na ordem
   alfabética, como garfoPunho e flange, saíam no mesmo tom. */
function corDe(i) {
  const h = (i * 137.508) % 360;
  const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)))); };
  return [f(5), f(3), f(1)];
}

/* A pintura vai pela máscara de cada região, pixel a pixel, e não pelo
   polígono do contorno: o polígono enche o vão de fundo que uma região envolve,
   e na lateral do braço o pescoço do punho saía pintando fundo branco. */
export async function sobreposicao(pngBuffer, segmentacao, { opacidade = 0.2, rotular = true } = {}) {
  const png = PNG.sync.read(pngBuffer);
  const { rotulos, silhueta, regioes } = segmentacao;
  const nomes = Object.keys(regioes);
  const corPor = new Map(nomes.map((nome, i) => [regioes[nome].rotulo, corDe(i)]));
  const saida = new PNG({ width: png.width, height: png.height });
  for (let p = 0; p < rotulos.length; p += 1) {
    const o = p * 4;
    const cor = silhueta[p] ? corPor.get(rotulos[p]) : null;
    for (let c = 0; c < 3; c += 1) saida.data[o + c] = cor ? Math.round(png.data[o + c] * (1 - opacidade) + cor[c] * opacidade) : png.data[o + c];
    saida.data[o + 3] = 255;
  }
  if (!rotular) return PNG.sync.write(saida);
  const { cv } = await carregarOpenCV();
  const img = cv.matFromImageData({ data: saida.data, width: png.width, height: png.height });
  try {
    for (const nome of nomes) {
      const [x, y] = regioes[nome].semente[0];
      cv.putText(img, nome, new cv.Point(x - 20, y), cv.FONT_HERSHEY_SIMPLEX, 0.4, new cv.Scalar(0, 0, 0, 255), 1);
    }
    saida.data = Buffer.from(img.data);
    return PNG.sync.write(saida);
  } finally {
    img.delete();
  }
}

/* Cada par de partes vizinhas, com a caixa que cobre a divisa entre elas. */
export function divisas(segmentacao) {
  const { largura, altura, rotulos, regioes } = segmentacao;
  const nomePor = new Map(Object.entries(regioes).map(([nome, r]) => [r.rotulo, nome]));
  const caixas = new Map();
  for (let y = 1; y < altura - 1; y += 1) {
    for (let x = 1; x < largura - 1; x += 1) {
      if (rotulos[y * largura + x] !== -1) continue;
      const vizinhos = new Set();
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const r = rotulos[(y + dy) * largura + x + dx];
        if (nomePor.has(r)) vizinhos.add(nomePor.get(r));
      }
      const lista = [...vizinhos].sort();
      for (let i = 0; i < lista.length; i += 1) for (let j = i + 1; j < lista.length; j += 1) {
        const chave = `${lista[i]}|${lista[j]}`;
        const c = caixas.get(chave) ?? { x0: x, y0: y, x1: x, y1: y, pixels: 0 };
        c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x); c.y1 = Math.max(c.y1, y); c.pixels += 1;
        caixas.set(chave, c);
      }
    }
  }
  return [...caixas.entries()]
    .filter(([, c]) => c.pixels >= 4)
    .map(([chave, c]) => { const [a, b] = chave.split('|'); return { a, b, caixa: [c.x0, c.y0, c.x1, c.y1] }; });
}

function recortar(png, [x0, y0, x1, y1], zoom) {
  const w = x1 - x0 + 1; const h = y1 - y0 + 1;
  const saida = new PNG({ width: w * zoom, height: h * zoom });
  for (let y = 0; y < h * zoom; y += 1) {
    for (let x = 0; x < w * zoom; x += 1) {
      const o = ((y0 + Math.floor(y / zoom)) * png.width + x0 + Math.floor(x / zoom)) * 4;
      const d = (y * w * zoom + x) * 4;
      saida.data[d] = png.data[o]; saida.data[d + 1] = png.data[o + 1]; saida.data[d + 2] = png.data[o + 2]; saida.data[d + 3] = 255;
    }
  }
  return saida;
}

/* Um PNG por divisa: o original à esquerda e a sobreposição à direita, a mesma
   caixa com margem, ampliadas `zoom` vezes. */
export function recortesDasDivisas(pngBuffer, sobreposicaoBuffer, segmentacao, { margem = 12, zoom = 4, minimo = 40 } = {}) {
  const original = PNG.sync.read(pngBuffer);
  const pintada = PNG.sync.read(sobreposicaoBuffer);
  return divisas(segmentacao).map(({ a, b, caixa }) => {
    let [x0, y0, x1, y1] = caixa;
    const cresce = (lo, hi, max) => {
      lo -= margem; hi += margem;
      const falta = minimo - (hi - lo + 1);
      if (falta > 0) { lo -= Math.ceil(falta / 2); hi += Math.floor(falta / 2); }
      return [Math.max(0, lo), Math.min(max - 1, hi)];
    };
    [x0, x1] = cresce(x0, x1, original.width);
    [y0, y1] = cresce(y0, y1, original.height);
    const esq = recortar(original, [x0, y0, x1, y1], zoom);
    const dir = recortar(pintada, [x0, y0, x1, y1], zoom);
    const vao = 6;
    const par = new PNG({ width: esq.width * 2 + vao, height: esq.height });
    par.data.fill(255);
    PNG.bitblt(esq, par, 0, 0, esq.width, esq.height, 0, 0);
    PNG.bitblt(dir, par, 0, 0, dir.width, dir.height, esq.width + vao, 0);
    return { a, b, caixa: [x0, y0, x1, y1], png: PNG.sync.write(par) };
  });
}

/* Todos os recortes numa folha só, com o nome do par em cima de cada um. O
   crítico só lê arquivo, não lista pasta, e na lateral do braço ele abriu 2 e
   depois 9 dos 19 recortes soltos; numa folha ele vê todos de uma vez. */
export async function folhaDasDivisas(recortes, { colunas = 3, largura = 420, altura = 230, titulo = 18 } = {}) {
  const { cv } = await carregarOpenCV();
  const linhas = Math.max(1, Math.ceil(recortes.length / colunas));
  const folha = new cv.Mat(linhas * (altura + titulo), colunas * largura, cv.CV_8UC4, new cv.Scalar(255, 255, 255, 255));
  try {
    recortes.forEach(({ a, b, png }, i) => {
      const lido = PNG.sync.read(png);
      const m = cv.matFromImageData({ data: lido.data, width: lido.width, height: lido.height });
      const escala = Math.min((largura - 6) / lido.width, (altura - 6) / lido.height);
      const w = Math.max(1, Math.floor(lido.width * escala)); const h = Math.max(1, Math.floor(lido.height * escala));
      const menor = new cv.Mat(); cv.resize(m, menor, new cv.Size(w, h), 0, 0, cv.INTER_AREA);
      const x = (i % colunas) * largura + 3; const y = Math.floor(i / colunas) * (altura + titulo);
      menor.copyTo(folha.roi(new cv.Rect(x, y + titulo, w, h)));
      cv.putText(folha, `${a} / ${b}`, new cv.Point(x, y + 13), cv.FONT_HERSHEY_SIMPLEX, 0.45, new cv.Scalar(0, 0, 0, 255), 1);
      m.delete(); menor.delete();
    });
    const saida = new PNG({ width: folha.cols, height: folha.rows });
    saida.data = Buffer.from(folha.data);
    return PNG.sync.write(saida);
  } finally {
    folha.delete();
  }
}
