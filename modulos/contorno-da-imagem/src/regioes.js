/* regioes.js — as partes da imagem, separadas por watershed com sementes.
 *
 * A silhueta é o que fica abaixo do limiar do fundo claro. Quem conhece o
 * objeto semeia cada parte com um ponto ou uma linha traçada dentro dela, e o
 * watershed faz cada semente crescer até encontrar a vizinha, com a divisa
 * onde a imagem muda mais. Assim partes do mesmo cinza sem borda forte entre
 * elas saem separadas. Parte que não será modelada, como um cabo, também
 * precisa de semente, senão a vizinha a engole. A região é o que aparece: parte
 * escondida atrás de outra fica só com o pedaço visível.
 *
 * Ensaio de 2026-09-25 na lateral do braço robótico: Potrace e OpenCV traçam a
 * silhueta a até 2 px da borda, mas o Potrace só separa por limiar de cor e é
 * GPL; o corte só por bordas de sombra juntava partes vizinhas do mesmo cinza. */
import { PNG } from 'pngjs';
import { carregarOpenCV } from './opencv.js';

/* Uma semente é um ponto `[x, y]` ou uma linha `[[x, y], [x, y], ...]`. */
export function tracosDaSemente(semente) {
  const lista = Array.isArray(semente?.[0]) ? semente : [semente];
  if (!lista.length || lista.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
    throw new Error(`semente inválida: ${JSON.stringify(semente)}; use [x, y] ou [[x, y], ...].`);
  }
  return lista;
}

/* Devolve, para cada nome, a semente, o contorno externo em pixel e a área, e
   também o rótulo de cada pixel (`rotulos`, -1 na divisa, 1 no fundo, 2 em
   diante nas partes na ordem de `nomes`), a máscara da silhueta e os pixels
   dela sem dono. */
/* Realce para o watershed, que é onde a divisa é escolhida. O contraste local
   (CLAHE na luminância) puxa a diferença pequena entre duas partes do mesmo
   cinza, e a nitidez (máscara de desfoque) afina a costura entre elas. A
   silhueta e a medida de borda continuam na imagem original: o realce só
   decide por onde a semente cresce. `realce: true` usa os valores padrão. */
export const REALCE_PADRAO = { contraste: 3, grade: 16, nitidez: 1, raio: 1.5 };

function realcar(cv, cor, novo, realce) {
  const { contraste, grade, nitidez, raio } = { ...REALCE_PADRAO, ...(realce === true ? {} : realce) };
  const lab = novo(new cv.Mat()); cv.cvtColor(cor, lab, cv.COLOR_RGB2Lab);
  const canais = novo(new cv.MatVector()); cv.split(lab, canais);
  const l = canais.get(0); const l2 = novo(new cv.Mat());
  const clahe = new cv.CLAHE(contraste, new cv.Size(grade, grade));
  clahe.apply(l, l2); clahe.delete();
  l2.copyTo(l); canais.set(0, l); l.delete();
  const junto = novo(new cv.Mat()); cv.merge(canais, junto);
  const volta = novo(new cv.Mat()); cv.cvtColor(junto, volta, cv.COLOR_Lab2RGB);
  const borrada = novo(new cv.Mat()); cv.GaussianBlur(volta, borrada, new cv.Size(0, 0), raio);
  const saida = novo(new cv.Mat()); cv.addWeighted(volta, 1 + nitidez, borrada, -nitidez, 0, saida);
  return saida;
}

export async function segmentar(pngBuffer, { limiar = 225, regioes = {}, realce = false } = {}) {
  const nomes = Object.keys(regioes).sort();
  if (!nomes.length) throw new Error('o arquivo de regiões não nomeia nenhuma região.');
  const sementes = nomes.map((nome) => ({ nome, tracos: tracosDaSemente(regioes[nome]) }));
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const { width: largura, height: altura } = png;
  const mats = [];
  const novo = (m) => { mats.push(m); return m; };
  try {
    const src = novo(cv.matFromImageData({ data: png.data, width: largura, height: altura }));
    const cor = novo(new cv.Mat()); cv.cvtColor(src, cor, cv.COLOR_RGBA2RGB);
    const cinza = novo(new cv.Mat()); cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY);
    const silhueta = novo(new cv.Mat()); cv.threshold(cinza, silhueta, limiar, 255, cv.THRESH_BINARY_INV);
    const nucleo = novo(cv.Mat.ones(3, 3, cv.CV_8U));
    const larga = novo(new cv.Mat()); cv.dilate(silhueta, larga, nucleo, new cv.Point(-1, -1), 3);
    const marcas = novo(new cv.Mat(altura, largura, cv.CV_32S, new cv.Scalar(0)));
    for (let p = 0; p < larga.data.length; p += 1) if (!larga.data[p]) marcas.data32S[p] = 1;
    const dentro = ([x, y]) => silhueta.data[Math.round(y) * largura + Math.round(x)] > 0;
    sementes.forEach(({ nome, tracos }, i) => {
      for (const ponto of tracos) {
        if (!dentro(ponto)) throw new Error(`o ponto ${JSON.stringify(ponto)} de '${nome}' cai fora da silhueta; mova o ponto para dentro da parte.`);
      }
      const rotulo = new cv.Scalar(i + 2);
      if (tracos.length === 1) cv.circle(marcas, new cv.Point(tracos[0][0], tracos[0][1]), 2, rotulo, -1);
      for (let k = 1; k < tracos.length; k += 1) {
        cv.line(marcas, new cv.Point(tracos[k - 1][0], tracos[k - 1][1]), new cv.Point(tracos[k][0], tracos[k][1]), rotulo, 2);
      }
    });
    cv.watershed(realce ? realcar(cv, cor, novo, realce) : cor, marcas);
    const rotulos = Int32Array.from(marcas.data32S);
    const resultado = {};
    sementes.forEach(({ nome, tracos }, i) => {
      const so = novo(new cv.Mat(altura, largura, cv.CV_8U, new cv.Scalar(0)));
      for (let p = 0; p < rotulos.length; p += 1) if (rotulos[p] === i + 2 && silhueta.data[p]) so.data[p] = 255;
      const contornos = novo(new cv.MatVector()); const hierarquia = novo(new cv.Mat());
      cv.findContours(so, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
      let maior = null; let area = -1;
      for (let k = 0; k < contornos.size(); k += 1) {
        const c = contornos.get(k); const a = cv.contourArea(c);
        if (a > area) { if (maior) maior.delete(); area = a; maior = c; } else c.delete();
      }
      if (!maior) throw new Error(`'${nome}' não ficou com região nenhuma; a semente foi engolida pelas vizinhas.`);
      const simples = novo(new cv.Mat()); cv.approxPolyDP(maior, simples, 1, true);
      const contornoPx = [];
      for (let k = 0; k < simples.data32S.length; k += 2) contornoPx.push([simples.data32S[k], simples.data32S[k + 1]]);
      maior.delete();
      resultado[nome] = { semente: tracos, rotulo: i + 2, areaPx: area, contornoPx };
    });
    let semDono = 0;
    for (let p = 0; p < rotulos.length; p += 1) if (silhueta.data[p] && rotulos[p] === 1) semDono += 1;
    return { largura, altura, regioes: resultado, ordem: Object.keys(regioes), rotulos, silhueta: Uint8Array.from(silhueta.data), semDono };
  } finally {
    mats.forEach((m) => m.delete());
  }
}

/* O contorno externo da silhueta inteira, em pixel. É o que a prancha desenha
   como linha de fora; as partes vão por dentro dele. Com `folga`, a máscara é
   crescida esse número de pixels antes: as partes tocam a borda da silhueta
   pixel a pixel, e sem folga caíam em cima da linha e contavam como fora. */
export async function contornoDaSilhueta(segmentacao, { folga = 0, sem = [] } = {}) {
  const { cv } = await carregarOpenCV();
  const { largura, altura, silhueta } = segmentacao;
  const mascara = new cv.Mat(altura, largura, cv.CV_8U, new cv.Scalar(0));
  const contornos = new cv.MatVector(); const hierarquia = new cv.Mat(); const simples = new cv.Mat();
  try {
    mascara.data.set(silhueta);
    /* Parte fora do modelo, como um cabo, sai da silhueta: ela tem semente só
       para a vizinha não a engolir. */
    const fora = new Set(sem.map((nome) => segmentacao.regioes[nome]?.rotulo).filter(Boolean));
    if (fora.size) for (let p = 0; p < mascara.data.length; p += 1) if (fora.has(segmentacao.rotulos[p]) || segmentacao.rotulos[p] === -1) mascara.data[p] = 0;
    if (folga > 0) {
      const nucleo = cv.Mat.ones(3, 3, cv.CV_8U);
      cv.dilate(mascara, mascara, nucleo, new cv.Point(-1, -1), folga);
      nucleo.delete();
    }
    cv.findContours(mascara, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
    let maior = -1; let area = -1;
    for (let k = 0; k < contornos.size(); k += 1) { const a = cv.contourArea(contornos.get(k)); if (a > area) { area = a; maior = k; } }
    /* Sem folga, sem simplificar: simplificada, a silhueta corta os cantos por
       um pixel e as partes, que vêm de dentro dela, apareciam como pontos fora
       dela. Com folga, a simplificação de 1 px cabe dentro da folga. */
    const bruto = folga > 0 ? (cv.approxPolyDP(contornos.get(maior), simples, 1, true), simples.data32S) : contornos.get(maior).data32S;
    const pontos = [];
    for (let k = 0; k < bruto.length; k += 2) pontos.push([bruto[k], bruto[k + 1]]);
    return pontos;
  } finally {
    mascara.delete(); contornos.delete(); hierarquia.delete(); simples.delete();
  }
}
