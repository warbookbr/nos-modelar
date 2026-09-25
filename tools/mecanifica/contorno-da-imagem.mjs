#!/usr/bin/env node
/* contorno-da-imagem.mjs — o contorno de cada parte, tirado da própria imagem.
 *
 * A prancha da lateral do braço robótico foi traçada à mão com retângulos
 * lidos a olho, e a pessoa julgou que ela não serve para conferir proporção
 * nem posição: o contorno carregava o erro de quem leu a imagem. Aqui o
 * contorno sai da imagem, por medida.
 *
 * COMO. A silhueta é o que fica abaixo do limiar do fundo claro. Quem conhece
 * o objeto semeia cada parte no arquivo de regiões, com um ponto ou uma linha
 * traçada dentro dela, e o watershed do OpenCV faz cada semente crescer até
 * encontrar a vizinha, com a divisa onde a imagem muda mais. Assim partes do
 * mesmo cinza sem borda forte entre elas, como o ombro atrás da coluna, saem
 * separadas. Parte que não é do modelo, como o cabo, também precisa de semente,
 * senão a vizinha a engole. O contorno sai em pixel e em milímetro, pela
 * calibração por duas âncoras do `conferir:referencia`.
 *
 * Ensaio de 2026-09-25 na `lateral.png`: Potrace e OpenCV traçam a silhueta a
 * até 2 px da borda, mas o Potrace só separa por limiar de cor e é GPL. O corte
 * só por bordas de sombra (Canny) juntava antebraço e carcaça do punho e
 * deixava o ombro dentro da coluna; o watershed com sementes separa as 13
 * partes e o cabo.
 *
 * USO
 *   npm run contorno -- <imagem.png> --regioes=<regioes.json> [--saida=<json>] [--desenho=<png>]
 *
 * `--desenho` grava a imagem com cada região pintada por cima e o nome dela,
 * para a pessoa julgar se a divisa segue a parte.
 *
 * O ARQUIVO DE REGIÕES
 *   { "ancoras": [ { "nome": "...", "px": [x, y], "mm": [z, y] }, { ... } ],
 *     "limiar": 225,
 *     "regioes": { "base": [390, 470], "anelCintura": [[345, 405], [430, 405]] } }
 *
 * A saída padrão é `<imagem>.contornos.json` ao lado da imagem. Rodar duas
 * vezes na mesma imagem e no mesmo arquivo de regiões dá o mesmo arquivo. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import { calibrarPorAncoras } from './conferir-contra-referencia.mjs';

export const FORMATO = 'mecanifica.contornos@1';

/* Devolve o módulo dentro de um objeto: o módulo do OpenCV tem `then` próprio,
   e um `await` direto nele tenta tratá-lo como promessa e quebra no vitest. */
async function carregarOpenCV() {
  /* Carregado por require, e só quando usado: importado como módulo ES, o
     pacote quebra dentro do vitest. */
  const base = createRequire(import.meta.url)('@techstark/opencv-js');
  if (base instanceof Promise) return { cv: await base };
  if (base.Mat) return { cv: base };
  return new Promise((pronto) => { base.onRuntimeInitialized = () => pronto({ cv: base }); });
}

const arred = (x) => (Math.round(x * 100) / 100) || 0;

/* Uma semente é um ponto `[x, y]` ou uma linha `[[x, y], [x, y], ...]` traçada
   dentro da parte; a linha serve a parte estreita, como um anel escuro. */
export function tracosDaSemente(semente) {
  const lista = Array.isArray(semente?.[0]) ? semente : [semente];
  if (!lista.length || lista.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
    throw new Error(`semente inválida: ${JSON.stringify(semente)}; use [x, y] ou [[x, y], ...].`);
  }
  return lista;
}

/* Regiões da imagem por watershed. O fundo é semente de tudo o que está fora
   da silhueta; cada parte nomeada é semente dos pontos dela. Cada semente
   cresce até encontrar a vizinha, e a divisa fica onde a imagem muda mais,
   mesmo quando a borda entre duas partes do mesmo cinza é fraca. */
export async function regioesDaImagem(pngBuffer, { limiar = 225, sementes = [] } = {}) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const mats = [];
  const novo = (m) => { mats.push(m); return m; };
  try {
    const src = novo(cv.matFromImageData({ data: png.data, width: png.width, height: png.height }));
    const cor = novo(new cv.Mat()); cv.cvtColor(src, cor, cv.COLOR_RGBA2RGB);
    const cinza = novo(new cv.Mat()); cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY);
    const silhueta = novo(new cv.Mat()); cv.threshold(cinza, silhueta, limiar, 255, cv.THRESH_BINARY_INV);
    const nucleo = novo(cv.Mat.ones(3, 3, cv.CV_8U));
    const larga = novo(new cv.Mat()); cv.dilate(silhueta, larga, nucleo, new cv.Point(-1, -1), 3);
    const marcas = novo(new cv.Mat(png.height, png.width, cv.CV_32S, new cv.Scalar(0)));
    const largura = png.width;
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
    cv.watershed(cor, marcas);
    const contornoDe = (rotulo) => {
      const so = novo(new cv.Mat(png.height, png.width, cv.CV_8U, new cv.Scalar(0)));
      for (let p = 0; p < marcas.data32S.length; p += 1) if (marcas.data32S[p] === rotulo && silhueta.data[p]) so.data[p] = 255;
      const contornos = novo(new cv.MatVector()); const hierarquia = novo(new cv.Mat());
      cv.findContours(so, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
      let maior = null; let area = -1;
      for (let i = 0; i < contornos.size(); i += 1) {
        const c = contornos.get(i); const a = cv.contourArea(c);
        if (a > area) { if (maior) maior.delete(); area = a; maior = c; } else c.delete();
      }
      if (!maior) return { pontos: [], areaPx: 0 };
      const simples = novo(new cv.Mat()); cv.approxPolyDP(maior, simples, 1, true);
      const pontos = [];
      for (let k = 0; k < simples.data32S.length; k += 2) pontos.push([simples.data32S[k], simples.data32S[k + 1]]);
      maior.delete();
      return { pontos, areaPx: area };
    };
    return { largura: png.width, altura: png.height, contornoDe, liberar: () => mats.forEach((m) => m.delete()) };
  } catch (erro) {
    mats.forEach((m) => m.delete());
    throw erro;
  }
}

export async function contornosDaImagem(pngBuffer, config) {
  if (!config?.regioes || !Object.keys(config.regioes).length) throw new Error('o arquivo de regiões não nomeia nenhuma região.');
  const calibracao = calibrarPorAncoras(config.ancoras);
  const nomes = Object.keys(config.regioes).sort();
  const sementes = nomes.map((nome) => ({ nome, tracos: tracosDaSemente(config.regioes[nome]) }));
  const imagem = await regioesDaImagem(pngBuffer, { limiar: config.limiar, sementes });
  try {
    const regioes = {};
    const mm2 = calibracao.mmPorPx ** 2;
    sementes.forEach(({ nome, tracos }, i) => {
      const { pontos, areaPx } = imagem.contornoDe(i + 2);
      if (!pontos.length) throw new Error(`'${nome}' não ficou com região nenhuma; a semente foi engolida pelas vizinhas.`);
      regioes[nome] = {
        semente: tracos,
        areaMm2: Math.round(areaPx * mm2),
        contornoPx: pontos,
        contornoMm: pontos.map(([x, y]) => calibracao.paraMm(x, y).map(arred)),
      };
    });
    return {
      formato: FORMATO,
      imagem: { sha256: createHash('sha256').update(pngBuffer).digest('hex'), largura: imagem.largura, altura: imagem.altura },
      mmPorPx: Number(calibracao.mmPorPx.toFixed(5)),
      residuo: calibracao.residuo,
      regioes,
    };
  } finally {
    imagem.liberar();
  }
}

/* A imagem original com cada região pintada por cima, meio transparente, com
   uma cor por região e o nome dela. */
export async function desenharContornos(pngBuffer, resultado) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const img = cv.matFromImageData({ data: png.data, width: png.width, height: png.height });
  const tinta = img.clone();
  const nomes = Object.keys(resultado.regioes);
  const corDe = (i) => {
    const h = (i * 360) / nomes.length; const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)))); };
    return new cv.Scalar(f(5), f(3), f(1), 255);
  };
  nomes.forEach((nome, i) => {
    const r = resultado.regioes[nome];
    const pontos = cv.matFromArray(r.contornoPx.length, 1, cv.CV_32SC2, r.contornoPx.flat());
    const lista = new cv.MatVector(); lista.push_back(pontos);
    cv.fillPoly(tinta, lista, corDe(i));
    pontos.delete(); lista.delete();
  });
  cv.addWeighted(tinta, 0.5, img, 0.5, 0, img);
  nomes.forEach((nome, i) => {
    const [x, y] = resultado.regioes[nome].semente[0];
    cv.putText(img, nome, new cv.Point(x - 20, y), cv.FONT_HERSHEY_SIMPLEX, 0.4, new cv.Scalar(0, 0, 0, 255), 1);
  });
  const saida = new PNG({ width: png.width, height: png.height });
  saida.data = Buffer.from(img.data);
  img.delete(); tinta.delete();
  return PNG.sync.write(saida);
}

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  if (!alvo || !valor('regioes')) {
    process.stderr.write('uso: npm run contorno -- <imagem.png> --regioes=<regioes.json> [--saida=<json>]\n');
    return 2;
  }
  const imagem = resolve(alvo);
  const config = JSON.parse(readFileSync(resolve(valor('regioes')), 'utf8'));
  const resultado = await contornosDaImagem(readFileSync(imagem), config);
  const saida = valor('saida') ? resolve(valor('saida')) : imagem.replace(/\.png$/i, '.contornos.json');
  writeFileSync(saida, `${JSON.stringify(resultado, null, 1)}\n`, 'utf8');
  if (valor('desenho')) writeFileSync(resolve(valor('desenho')), await desenharContornos(readFileSync(imagem), resultado));
  process.stdout.write(`contorno — ${basename(imagem)}: ${Object.keys(resultado.regioes).length} região(ões), ${resultado.mmPorPx} mm/px\n`);
  for (const [nome, r] of Object.entries(resultado.regioes)) process.stdout.write(`  ${nome.padEnd(16)} ${String(r.contornoMm.length).padStart(4)} pontos  ${r.areaMm2} mm²\n`);
  process.stdout.write(`  gravado em ${saida}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`contorno: ${erro.message}\n`); process.exitCode = 1; });
}
