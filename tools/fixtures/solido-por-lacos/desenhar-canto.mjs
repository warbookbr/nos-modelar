#!/usr/bin/env node
/* desenhar-canto.mjs — desenha o terceiro limite da peça de teste do sólido por laços: o canto de cima em +x da seção da parte
 * deitada, no corte z = 0, em três traços na mesma escala: o arco exato de 32 mm (tracejado), o corte da caixa com
 * `arredondarAresta` de 32 mm (azul) e o corte da peça de teste, que sai da gaiola com os pontos no mesmo arco (vermelho). Grava
 * um PNG no caminho dado.
 *
 *   node tools/fixtures/solido-por-lacos/desenhar-canto.mjs <saida.png> */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import receita from './receita.js';
import arestaArredondada from './aresta-arredondada.js';
import { TABELA } from './forma.js';
import { cantoDaSecao, cortePorPlano, malhaDaParte } from './medir.mjs';

const saida = process.argv[2];
if (!saida) { process.stderr.write('uso: node tools/fixtures/solido-por-lacos/desenhar-canto.mjs <saida.png>\n'); process.exit(2); }

const L = TABELA.meiaLargura; const yTopo = TABELA.alturaDoEixo + L; const r = TABELA.raioDosCantos;
/* janela de 50 mm em volta do canto, 16 px por mm */
const u0 = L - 45; const w0 = yTopo - 45; const lado = 50; const px = 16; const tam = lado * px;
const X = (u) => (u - u0) * px; const Y = (w) => tam - (w - w0) * px;
const dentro = (p) => p[0] >= u0 && p[0] <= u0 + lado && p[1] >= w0 && p[1] <= w0 + lado && p[0] >= L - r - 15 && p[1] >= yTopo - r - 15;
/* o corte em ordem: pela posição angular em volta do centro do arco */
const centro = [L - r, yTopo - r];
const ordenado = (pts) => pts.filter(dentro).sort((a, b) => Math.atan2(b[1] - centro[1], b[0] - centro[0]) - Math.atan2(a[1] - centro[1], a[0] - centro[0]));
const caminho = (pts) => pts.map((p, k) => `${k ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');

const peca = malhaDaParte(executarReceita(receita).neutro, 'corpo');
const caixa = malhaDaParte(executarReceita(arestaArredondada).neutro);
const arco = Array.from({ length: 91 }, (_, k) => { const t = (Math.PI / 2) * (k / 90); return [centro[0] + r * Math.cos(t), centro[1] + r * Math.sin(t)]; });
const mPeca = cantoDaSecao(peca, TABELA); const mCaixa = cantoDaSecao(caixa, TABELA);

const grade = [];
for (let k = 0; k <= lado; k += 5) grade.push(`<line x1="${X(u0 + k)}" y1="0" x2="${X(u0 + k)}" y2="${tam}"/><line x1="0" y1="${Y(w0 + k)}" x2="${tam}" y2="${Y(w0 + k)}"/>`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam + 120}" viewBox="0 0 ${tam} ${tam + 120}">
<rect width="100%" height="100%" fill="#ffffff"/>
<g stroke="#e3e6e8" stroke-width="1">${grade.join('')}</g>
<line x1="${X(L)}" y1="0" x2="${X(L)}" y2="${tam}" stroke="#9aa3a8" stroke-width="1"/>
<line x1="0" y1="${Y(yTopo)}" x2="${tam}" y2="${Y(yTopo)}" stroke="#9aa3a8" stroke-width="1"/>
<path d="${caminho(arco)}" fill="none" stroke="#333" stroke-width="3" stroke-dasharray="10 8"/>
<path d="${caminho(ordenado(cortePorPlano(caixa, 'z', 0)))}" fill="none" stroke="#2f6db5" stroke-width="4"/>
<path d="${caminho(ordenado(cortePorPlano(peca, 'z', 0)))}" fill="none" stroke="#c0392b" stroke-width="4"/>
<g font-family="sans-serif" font-size="17" fill="#222">
<text x="16" y="${tam + 34}">tracejado: arco exato de ${r} mm (recuo da quina ${(r * (Math.SQRT2 - 1)).toFixed(2)} mm)</text>
<text x="16" y="${tam + 66}" fill="#2f6db5">azul: arredondarAresta de ${r} mm (recuo ${mCaixa.recuoMm.toFixed(2)} mm, topo plano até x = ${mCaixa.faixaPlanaMm.toFixed(1)})</text>
<text x="16" y="${tam + 98}" fill="#c0392b">vermelho: gaiola de laços (recuo ${mPeca.recuoMm.toFixed(2)} mm, raio equivalente ${mPeca.raioEquivalenteMm.toFixed(1)}, topo plano até x = ${mPeca.faixaPlanaMm.toFixed(1)})</text>
</g>
</svg>`;
writeFileSync(saida, await sharp(Buffer.from(svg)).png().toBuffer());
process.stdout.write(`${saida}\n`);
