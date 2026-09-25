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

/* Quantos recortes vão em cada folha. Objeto com poucas divisas tem uma
   divisa por etapa, porque o crítico olha melhor uma coisa de cada vez; com
   mais divisas, elas se agrupam para o roteiro ficar perto de seis etapas de
   divisa, e nenhuma folha passa de seis recortes. */
export const ETAPAS_DE_DIVISA = 6;
export const MAXIMO_POR_FOLHA = 6;
export function recortesPorFolha(divisas) {
  return Math.min(MAXIMO_POR_FOLHA, Math.max(1, Math.ceil(divisas / ETAPAS_DE_DIVISA)));
}

/* As folhas de divisas e o roteiro do crítico.
 *
 * Cada folha leva `recortesPorFolha` recortes, no tamanho em que foram
 * gerados, sem reduzir o zoom, e o número de folhas sai do número de divisas
 * do objeto. Cada recorte vai numa linha: o par lado a lado e, à direita, a
 * imagem inteira em miniatura com a caixa da divisa marcada, para o crítico
 * saber onde está olhando. O crítico só lê arquivo e não lista pasta: na
 * lateral do braço ele abriu 2 e depois 9 de 19 recortes soltos, e numa folha
 * única de 19 o zoom caía à metade. */
export async function folhasDasDivisas(recortes, sobreposicaoBuffer, { porFolha = recortesPorFolha(recortes.length), miniatura = 180, titulo = 20, vao = 10 } = {}) {
  const { cv } = await carregarOpenCV();
  const inteira = PNG.sync.read(sobreposicaoBuffer);
  const escalaMini = miniatura / inteira.width;
  const alturaMini = Math.round(inteira.height * escalaMini);
  const folhas = [];
  for (let inicio = 0; inicio < recortes.length; inicio += porFolha) {
    const grupo = recortes.slice(inicio, inicio + porFolha).map((r) => ({ ...r, lido: PNG.sync.read(r.png) }));
    const largura = Math.max(...grupo.map((r) => r.lido.width)) + vao + miniatura;
    const altura = grupo.reduce((soma, r) => soma + titulo + Math.max(r.lido.height, alturaMini) + vao, 0);
    const folha = new cv.Mat(altura, largura, cv.CV_8UC4, new cv.Scalar(255, 255, 255, 255));
    const base = cv.matFromImageData({ data: inteira.data, width: inteira.width, height: inteira.height });
    try {
      let y = 0;
      for (const { a, b, caixa, lido } of grupo) {
        cv.putText(folha, `${a} / ${b}`, new cv.Point(2, y + 15), cv.FONT_HERSHEY_SIMPLEX, 0.5, new cv.Scalar(0, 0, 0, 255), 1);
        const par = cv.matFromImageData({ data: lido.data, width: lido.width, height: lido.height });
        par.copyTo(folha.roi(new cv.Rect(0, y + titulo, lido.width, lido.height)));
        const mini = new cv.Mat(); cv.resize(base, mini, new cv.Size(miniatura, alturaMini), 0, 0, cv.INTER_AREA);
        const [x0, y0, x1, y1] = caixa.map((v) => Math.round(v * escalaMini));
        cv.rectangle(mini, new cv.Point(x0, y0), new cv.Point(Math.max(x1, x0 + 2), Math.max(y1, y0 + 2)), new cv.Scalar(220, 0, 0, 255), 2);
        mini.copyTo(folha.roi(new cv.Rect(largura - miniatura, y + titulo, miniatura, alturaMini)));
        par.delete(); mini.delete();
        y += titulo + Math.max(lido.height, alturaMini) + vao;
      }
      const saida = new PNG({ width: folha.cols, height: folha.rows });
      saida.data = Buffer.from(folha.data);
      folhas.push({ pares: grupo.map(({ a, b }) => [a, b]), png: PNG.sync.write(saida) });
    } finally {
      folha.delete(); base.delete();
    }
  }
  return folhas;
}

/* O roteiro que o crítico segue, com uma etapa por folha. `arquivos` traz o
   caminho do alvo, da sobreposição e de cada folha, na ordem das folhas. */
export function roteiroDoCritico({ alvo, sobreposicao: pintura, folhas }) {
  const linhas = [
    '# Roteiro da análise', '',
    'Siga as etapas na ordem e não pule nenhuma. Em cada etapa, abra os arquivos dela.', '',
    '## Etapa 1 — visão geral', '',
    `Abra o alvo (${alvo}) e a sobreposição (${pintura}). Confira se cada parte tem cor, se nenhuma região pega o fundo e se cada cor está na parte que o nome diz.`, '',
  ];
  folhas.forEach(({ arquivo, pares }, i) => {
    linhas.push(`## Etapa ${i + 2} — divisas, folha ${i + 1} de ${folhas.length}`, '',
      `Abra ${arquivo}. Cada linha da folha mostra o original à esquerda, a pintura à direita e, no canto, a imagem inteira com a divisa marcada em vermelho. Para cada divisa abaixo, diga se ela está no lugar onde o original mostra a separação:`, '',
      ...pares.map(([a, b]) => `- ${a} / ${b}`), '');
  });
  linhas.push(`## Etapa ${folhas.length + 2} — fechamento`, '',
    'Dê a nota e os defeitos no seu formato de sempre, citando a folha e o par de cada defeito.', '');
  return linhas.join('\n');
}
