#!/usr/bin/env node
/* Comparação regional: o arco interno não é silhueta exterior. Desenha o loop
   da abertura da malha contra o arco declarado do P0, em mm e vista lateral. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirPeleDianteira } from './secoes-de-carater.mjs';
import { encodePng } from '../../../tools/bancadas/bench/pngwrite.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const alvo = { z: 1325, y: 340, raio: 385 };
const unidadeParaTela = 0.48;
const tela = ([z, y]) => `${(38 + (z - 790) * unidadeParaTela).toFixed(1)},${(390 - (y - 100) * unidadeParaTela).toFixed(1)}`;
const arcoAlvo = Array.from({ length: 41 }, (_, i) => {
  const t = Math.PI * i / 40;
  return [alvo.z + alvo.raio * Math.cos(t), alvo.y + alvo.raio * Math.sin(t)];
});

export function desenharArco({ mostrarAlvo = true, mostrarModelo = true } = {}, pele = construirPeleDianteira()) {
  const modelo = pele.aberturas.arcoDeRoda.loop.map((id) => {
    const [, y, z] = pele.V.get(id);
    return [z, y];
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="440" viewBox="0 0 620 440" font-family="ui-sans-serif,system-ui,sans-serif">
<rect width="100%" height="100%" fill="#fbfbfa"/>
<text x="28" y="32" font-size="17" fill="#273342">Arco dianteiro — leitura regional</text>
<text x="28" y="55" font-size="12" fill="#687585">cinza: P0 (raio 385 mm) · azul: loop real da abertura atual</text>
<line x1="38" y1="390" x2="590" y2="390" stroke="#d9dddf"/>
${mostrarAlvo ? `<polyline points="${arcoAlvo.map(tela).join(' ')}" fill="none" stroke="#8e98a3" stroke-width="4"/>` : ''}
${mostrarModelo ? `<polyline points="${modelo.map(tela).join(' ')}" fill="none" stroke="#2f5d9e" stroke-width="3"/>${modelo.map((p) => `<circle cx="${tela(p).split(',')[0]}" cy="${tela(p).split(',')[1]}" r="3" fill="#2f5d9e"/>`).join('')}` : ''}
<text x="28" y="422" font-size="12" fill="#687585">Recorte isolado; não mede silhueta exterior, farol ou carro completo.</text>
</svg>`;
}

export const compararArco = (pele) => desenharArco({}, pele);

/* A cópia PNG é a entrada visual do crítico: ela deriva dos mesmos pontos do
   SVG, mas não exige que o revisor interprete marcação ou código vetorial. */
export function desenharArcoPng({ mostrarAlvo = true, mostrarModelo = true } = {}, pele = construirPeleDianteira()) {
  const W = 620; const H = 440; const pixels = Buffer.alloc(W * H * 3, 251);
  const pintar = (x, y, cor) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const indice = (Math.round(y) * W + Math.round(x)) * 3;
    pixels[indice] = cor[0]; pixels[indice + 1] = cor[1]; pixels[indice + 2] = cor[2];
  };
  const linha = (a, b, cor, espessura) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const passos = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= passos; i += 1) for (let oy = -espessura; oy <= espessura; oy += 1) for (let ox = -espessura; ox <= espessura; ox += 1) pintar(a[0] + dx * i / passos + ox, a[1] + dy * i / passos + oy, cor);
  };
  const pontos = (raio, centro) => Array.from({ length: 81 }, (_, i) => {
    const t = Math.PI * i / 80;
    return [38 + (centro.z + raio * Math.cos(t) - 790) * unidadeParaTela, 390 - (centro.y + raio * Math.sin(t) - 100) * unidadeParaTela];
  });
  const modelo = pele.aberturas.arcoDeRoda.loop.map((id) => {
    const [, y, z] = pele.V.get(id); return [38 + (z - 790) * unidadeParaTela, 390 - (y - 100) * unidadeParaTela];
  });
  const polilinha = (pontosDaLinha, cor, espessura) => pontosDaLinha.slice(1).forEach((ponto, i) => linha(pontosDaLinha[i], ponto, cor, espessura));
  if (mostrarAlvo) polilinha(pontos(alvo.raio, alvo), [142, 152, 163], 2);
  if (mostrarModelo) polilinha(modelo, [47, 93, 158], 2);
  return encodePng({ W, H, ch: 3, pixels });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const destino = path.join(aqui, 'evidencias');
  mkdirSync(destino, { recursive: true });
  const arquivos = [
    ['arco-dianteiro-alvo.svg', desenharArco({ mostrarModelo: false })],
    ['arco-dianteiro-modelo.svg', desenharArco({ mostrarAlvo: false })],
    ['arco-dianteiro-p0-vs-loop.svg', compararArco()],
  ];
  for (const [nome, svg] of arquivos) {
    const arquivo = path.join(destino, nome);
    writeFileSync(arquivo, `${svg}\n`);
    console.log(arquivo);
  }
  for (const [nome, opcoes] of [
    ['arco-dianteiro-alvo.png', { mostrarModelo: false }],
    ['arco-dianteiro-modelo.png', { mostrarAlvo: false }],
    ['arco-dianteiro-p0-vs-loop.png', {}],
  ]) writeFileSync(path.join(destino, nome), desenharArcoPng(opcoes));
}
