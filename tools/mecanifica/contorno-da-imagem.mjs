#!/usr/bin/env node
/* contorno-da-imagem.mjs — o contorno de cada parte, tirado da própria imagem.
 *
 * A prancha da lateral do braço robótico foi traçada à mão com retângulos
 * lidos a olho, e a pessoa julgou que ela não serve para conferir proporção
 * nem posição: o contorno carregava o erro de quem leu a imagem. Aqui o
 * contorno sai da imagem, por medida.
 *
 * COMO. A silhueta é o que fica abaixo do limiar do fundo claro. Dentro dela,
 * as bordas de sombra (Canny) separam partes que têm o mesmo cinza, como a
 * coluna e o cotovelo, e cada região conexa que sobra é uma parte candidata.
 * Quem nomeia a região é quem conhece o objeto: o arquivo de regiões dá um
 * ponto dentro de cada parte, e a região que contém o ponto recebe o nome.
 * O contorno é o externo da região, crescido de volta o pixel que a borda
 * comeu, e sai em milímetros pela calibração por duas âncoras, a mesma do
 * `conferir:referencia`.
 *
 * Por que OpenCV e não Potrace: ensaiados em 2026-09-25 na `lateral.png`, os
 * dois traçam a silhueta a até 2 px da borda (100% e 99,9% do perímetro), mas
 * o Potrace só separa por limiar de cor e não distingue partes do mesmo cinza,
 * e é GPL.
 *
 * USO
 *   npm run contorno -- <imagem.png> --regioes=<regioes.json> [--saida=<json>] [--desenho=<png>]
 *
 * `--desenho` grava a imagem com o contorno de cada região por cima e o nome
 * dela, para a pessoa julgar se o contorno segue a parte.
 *
 * O ARQUIVO DE REGIÕES
 *   { "ancoras": [ { "nome": "...", "px": [x, y], "mm": [z, y] }, { ... } ],
 *     "limiar": 225, "canny": [20, 60],
 *     "regioes": { "base": [380, 480], "cotovelo": [385, 100] } }
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

const arred = (x) => Math.round(x * 100) / 100;

/* Regiões rotuladas da imagem: silhueta menos as bordas. Devolve o rótulo de
   cada pixel e a função que tira o contorno de um rótulo. */
export async function regioesDaImagem(pngBuffer, { limiar = 225, canny = [20, 60] } = {}) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const mats = [];
  const novo = (m) => { mats.push(m); return m; };
  try {
    const src = novo(cv.matFromImageData({ data: png.data, width: png.width, height: png.height }));
    const cinza = novo(new cv.Mat()); cv.cvtColor(src, cinza, cv.COLOR_RGBA2GRAY);
    const silhueta = novo(new cv.Mat()); cv.threshold(cinza, silhueta, limiar, 255, cv.THRESH_BINARY_INV);
    const suave = novo(new cv.Mat()); cv.GaussianBlur(cinza, suave, new cv.Size(3, 3), 0);
    const bordas = novo(new cv.Mat()); cv.Canny(suave, bordas, canny[0], canny[1]);
    const nucleo = novo(cv.Mat.ones(3, 3, cv.CV_8U));
    const grossas = novo(new cv.Mat()); cv.dilate(bordas, grossas, nucleo);
    const miolo = novo(new cv.Mat()); cv.subtract(silhueta, grossas, miolo);
    const rotulos = novo(new cv.Mat());
    cv.connectedComponents(miolo, rotulos, 4, cv.CV_32S);
    const largura = png.width;
    const rotuloEm = ([x, y]) => rotulos.data32S[Math.round(y) * largura + Math.round(x)];
    const contornoDe = (rotulo) => {
      const so = novo(new cv.Mat(png.height, png.width, cv.CV_8U, new cv.Scalar(0)));
      for (let p = 0; p < rotulos.data32S.length; p += 1) if (rotulos.data32S[p] === rotulo) so.data[p] = 255;
      const crescida = novo(new cv.Mat()); cv.dilate(so, crescida, nucleo);
      const contornos = novo(new cv.MatVector()); const hierarquia = novo(new cv.Mat());
      cv.findContours(crescida, contornos, hierarquia, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
      let maior = null; let area = -1;
      for (let i = 0; i < contornos.size(); i += 1) {
        const c = contornos.get(i); const a = cv.contourArea(c);
        if (a > area) { area = a; maior = c; } else c.delete();
      }
      const simples = novo(new cv.Mat()); cv.approxPolyDP(maior, simples, 1, true);
      const pontos = [];
      for (let k = 0; k < simples.data32S.length; k += 2) pontos.push([simples.data32S[k], simples.data32S[k + 1]]);
      maior.delete();
      return { pontos, areaPx: area };
    };
    return { largura: png.width, altura: png.height, rotuloEm, contornoDe, liberar: () => mats.forEach((m) => m.delete()) };
  } catch (erro) {
    mats.forEach((m) => m.delete());
    throw erro;
  }
}

export async function contornosDaImagem(pngBuffer, config) {
  if (!config?.regioes || !Object.keys(config.regioes).length) throw new Error('o arquivo de regiões não nomeia nenhuma região.');
  const calibracao = calibrarPorAncoras(config.ancoras);
  const imagem = await regioesDaImagem(pngBuffer, config);
  try {
    const regioes = {};
    const donos = new Map();
    for (const nome of Object.keys(config.regioes).sort()) {
      const ponto = config.regioes[nome];
      const rotulo = imagem.rotuloEm(ponto);
      if (!rotulo) throw new Error(`o ponto de '${nome}' ${JSON.stringify(ponto)} cai numa borda ou fora da silhueta; mova o ponto para dentro da parte.`);
      if (donos.has(rotulo)) throw new Error(`'${nome}' e '${donos.get(rotulo)}' caem na mesma região da imagem; a imagem não separa as duas partes.`);
      donos.set(rotulo, nome);
      const { pontos, areaPx } = imagem.contornoDe(rotulo);
      const mm2 = calibracao.mmPorPx ** 2;
      regioes[nome] = {
        ponto,
        areaMm2: Math.round(areaPx * mm2),
        contornoPx: pontos,
        contornoMm: pontos.map(([x, y]) => calibracao.paraMm(x, y).map(arred)),
      };
    }
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

/* A imagem original com os contornos desenhados por cima, uma cor por região. */
export async function desenharContornos(pngBuffer, resultado) {
  const { cv } = await carregarOpenCV();
  const png = PNG.sync.read(pngBuffer);
  const img = cv.matFromImageData({ data: png.data, width: png.width, height: png.height });
  const cores = [[220, 40, 40, 255], [30, 120, 220, 255], [20, 160, 70, 255], [200, 120, 0, 255], [150, 50, 190, 255], [0, 150, 150, 255]];
  Object.entries(resultado.regioes).forEach(([nome, r], i) => {
    const cor = new cv.Scalar(...cores[i % cores.length]);
    const pontos = cv.matFromArray(r.contornoPx.length, 1, cv.CV_32SC2, r.contornoPx.flat());
    const lista = new cv.MatVector(); lista.push_back(pontos);
    cv.polylines(img, lista, true, cor, 2);
    cv.putText(img, nome, new cv.Point(r.ponto[0] - 20, r.ponto[1]), cv.FONT_HERSHEY_SIMPLEX, 0.45, cor, 1);
    pontos.delete(); lista.delete();
  });
  const saida = new PNG({ width: png.width, height: png.height });
  saida.data = Buffer.from(img.data);
  img.delete();
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
