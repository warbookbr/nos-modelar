// Gera a folha de amostras da madeira:
//   node modulos/textura/scripts/folha-madeira.mjs <pasta-de-saida> [--blender <pasta com blender-A.png ... blender-E.png>]
// A folha tem uma linha por amostra: Blender à esquerda (se houver) e a textura em Node à direita.
// A folha de repetição mostra o tile repetido 2x2, para a emenda aparecer se existir.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { gerarTextura, texturaParaPng } from '../src/index.js';

export const COR_CADEIRA = [95, 48, 30]; // cores.madeira de cadeira_ripada_simples
export const AMOSTRAS = [
  { id: 'A', material: { tipo: 'madeira', cor: COR_CADEIRA, desgaste: 0, veio: 1 } },
  { id: 'B', material: { tipo: 'madeira', cor: COR_CADEIRA, desgaste: 0.3, veio: 1 } },
  { id: 'C', material: { tipo: 'madeira', cor: COR_CADEIRA, desgaste: 0.6, veio: 1 } },
  { id: 'D', material: { tipo: 'madeira', cor: COR_CADEIRA, desgaste: 0.3, veio: 3 } },
  { id: 'E', material: { tipo: 'madeira', cor: COR_CADEIRA, desgaste: 0.3, veio: 1, tabuas: 4, borda: 0.5 } },
];

function ler(arquivo) {
  const p = PNG.sync.read(readFileSync(arquivo));
  return { largura: p.width, altura: p.height, rgba: p.data };
}

// Grade de imagens (linhas x colunas), cada uma repetida `repeticao` x `repeticao` vezes, com folga branca.
function compor(grade, repeticao, folga) {
  const lado = grade[0][0].largura * repeticao;
  const linhas = grade.length;
  const colunas = grade[0].length;
  const W = colunas * lado + (colunas + 1) * folga;
  const H = linhas * lado + (linhas + 1) * folga;
  const png = new PNG({ width: W, height: H });
  png.data.fill(255);
  grade.forEach((linha, r) => linha.forEach((img, c) => {
    const ox = folga + c * (lado + folga);
    const oy = folga + r * (lado + folga);
    for (let y = 0; y < lado; y += 1) {
      for (let x = 0; x < lado; x += 1) {
        const s = ((y % img.altura) * img.largura + (x % img.largura)) * 4;
        const d = ((oy + y) * W + ox + x) * 4;
        for (let k = 0; k < 4; k += 1) png.data[d + k] = img.rgba[s + k];
      }
    }
  }));
  return PNG.sync.write(png);
}

const saida = process.argv[2];
if (saida) {
  mkdirSync(saida, { recursive: true });
  const px = 512;
  const texturas = AMOSTRAS.map((a) => gerarTextura(a.material, { px, semente: 1 }));
  AMOSTRAS.forEach((a, n) => writeFileSync(join(saida, `madeira-${a.id}.png`), texturaParaPng(texturas[n])));
  const i = process.argv.indexOf('--blender');
  const pastaBlender = i > 0 ? process.argv[i + 1] : null;
  const grade = AMOSTRAS.map((a, n) => (pastaBlender ? [ler(join(pastaBlender, `blender-${a.id}.png`)), texturas[n]] : [texturas[n]]));
  writeFileSync(join(saida, 'madeira-folha.png'), compor(grade, 1, 16));
  writeFileSync(join(saida, 'madeira-repeticao.png'), compor([[texturas[0], texturas[4]]], 2, 16));
}
