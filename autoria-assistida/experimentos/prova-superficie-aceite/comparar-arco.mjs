#!/usr/bin/env node
/* Comparação regional: o arco interno não é silhueta exterior. Desenha o loop
   da abertura da malha contra o arco declarado do P0, em mm e vista lateral. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirPeleDianteira } from './secoes-de-carater.mjs';

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
}
