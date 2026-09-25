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

export async function sobreposicao(pngBuffer, segmentacao, { opacidade = 0.2, rotular = true } = {}) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const img = cv.matFromImageData({ data: png.data, width: png.width, height: png.height });
  /* `clone` desta versão do OpenCV divide a memória com a original, e a pintura
     saía opaca qualquer que fosse a opacidade; a cópia tem de ser explícita. */
  const tinta = new cv.Mat(); img.copyTo(tinta);
  const mistura = new cv.Mat();
  try {
    const nomes = Object.keys(segmentacao.regioes);
    nomes.forEach((nome, i) => {
      const r = segmentacao.regioes[nome];
      const pontos = cv.matFromArray(r.contornoPx.length, 1, cv.CV_32SC2, r.contornoPx.flat());
      const lista = new cv.MatVector(); lista.push_back(pontos);
      cv.fillPoly(tinta, lista, new cv.Scalar(...corDe(i), 255));
      pontos.delete(); lista.delete();
    });
    cv.addWeighted(tinta, opacidade, img, 1 - opacidade, 0, mistura);
    if (rotular) {
      for (const nome of nomes) {
        const [x, y] = segmentacao.regioes[nome].semente[0];
        cv.putText(mistura, nome, new cv.Point(x - 20, y), cv.FONT_HERSHEY_SIMPLEX, 0.4, new cv.Scalar(0, 0, 0, 255), 1);
      }
    }
    const saida = new PNG({ width: png.width, height: png.height });
    saida.data = Buffer.from(mistura.data);
    return PNG.sync.write(saida);
  } finally {
    img.delete(); tinta.delete(); mistura.delete();
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
