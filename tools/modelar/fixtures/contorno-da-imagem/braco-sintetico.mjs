/* braco-sintetico.mjs — as duas imagens sintéticas, desenhadas por código, com que o teste do contorno da imagem prova a ferramenta:
   uma vista lateral de um braço simplificado (base, ombro, braço e punho, com o ombro e o braço no mesmo cinza) e uma vista frontal
   com uma parte que aparece em dois pedaços (a carcaça do punho, dos dois lados do antebraço). Nada vem de foto: cada retângulo está
   escrito aqui, com o tom e a posição, e o arquivo `*.contornos.json` ao lado é o que a ferramenta grava para a lateral.

   Para regravar o arquivo depois de mudar a ferramenta de propósito: `node tools/modelar/fixtures/contorno-da-imagem/braco-sintetico.mjs`. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const FUNDO = 250;

/* Pinta retângulos [x0, y0, x1, y1, tom] em ordem, o último por cima, sobre o fundo claro. */
function pintar(largura, altura, retangulos) {
  const png = new PNG({ width: largura, height: altura });
  for (let y = 0; y < altura; y += 1) for (let x = 0; x < largura; x += 1) {
    let v = FUNDO;
    for (const [x0, y0, x1, y1, tom] of retangulos) if (x >= x0 && x < x1 && y >= y0 && y < y1) v = tom;
    const o = (y * largura + x) * 4;
    png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255;
  }
  return PNG.sync.write(png);
}

/* A lateral: 200 por 400 px. A base (150) embaixo, o ombro (150, o mesmo cinza) sobre ela, o braço (150) subindo do ombro, o punho
   (110, mais escuro) no alto e um cabo (60) que sai da base e fica fora do modelo. A divisa entre o ombro e o braço não tem borda
   de tom: quem a decide são as sementes. */
export const LATERAL = {
  png: () => pintar(200, 400, [
    [60, 330, 140, 380, 150], // base
    [70, 270, 130, 330, 150], // ombro
    [88, 70, 112, 270, 150], // braço
    [76, 30, 124, 70, 110], // punho
    [140, 350, 190, 362, 60], // cabo
  ]),
  regioes: {
    ancoras: [
      { nome: 'borda esquerda da base, meia altura', px: [60, 355], mm: [-100, 100] },
      { nome: 'borda direita da base, meia altura', px: [139, 355], mm: [100, 100] },
    ],
    limiar: 225,
    denteMaximo: 0,
    alcanceSemDono: 0,
    bordaSubpixel: false,
    foraDoModelo: ['cabo'],
    regioes: {
      base: [100, 355],
      ombro: [[80, 290], [120, 290], [100, 310]],
      braco: [[100, 100], [100, 255]],
      punho: [100, 50],
      cabo: [165, 356],
    },
  },
};

/* A frontal: 240 por 300 px. O antebraço (90) sobe no meio, e a carcaça do punho (150) aparece dos dois lados dele, em dois pedaços
   que não se tocam. */
export const FRONTAL = {
  png: () => pintar(240, 300, [
    [100, 40, 140, 280, 90], // antebraço
    [50, 100, 98, 180, 150], // carcaça, pedaço da esquerda
    [142, 100, 190, 170, 150], // carcaça, pedaço da direita
  ]),
  regioes: {
    ancoras: [
      { nome: 'borda esquerda do antebraço', px: [100, 220], mm: [-40, 100] },
      { nome: 'borda direita do antebraço', px: [139, 220], mm: [40, 100] },
    ],
    limiar: 225,
    denteMaximo: 0,
    alcanceSemDono: 0,
    bordaSubpixel: false,
    regioes: {
      antebraco: [[120, 50], [120, 270]],
      carcacaPunho: [[[60, 120], [85, 160]], [[155, 120], [175, 150]]],
    },
  },
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { contornosDaImagem } = await import('../../contorno-da-imagem.mjs');
  const { resultado } = await contornosDaImagem(LATERAL.png(), LATERAL.regioes);
  const destino = fileURLToPath(new URL('./braco-sintetico.lateral.contornos.json', import.meta.url));
  writeFileSync(destino, `${JSON.stringify(resultado, null, 1)}\n`);
  console.log(`gravado ${destino}`);
}
