/* Gera as vistas globais isoladas da primeira compilação R2. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCageDireta, espelharCage } from './cage-direta.mjs';
import { subdividirUmNivel } from './subdividir.mjs';
import { capturarVistas, pngsDaCaptura, validarPacoteDeVistas } from '../prova-captura-r1b/renderizador-profundo.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const briefing = JSON.parse(readFileSync(path.join(aqui, 'briefing-r2.json')));
const malha = subdividirUmNivel(espelharCage(criarCageDireta()));
const vistas = capturarVistas(malha, { largura: 320, altura: 220, quadros: undefined, quadro: briefing.cameras.frontal, geometria: 'inteira', finalidade: 'conjunto' });
/* Os quadros são próprios de cada orientação; recria cada vista com seu quadro. */
for (const nome of Object.keys(vistas)) vistas[nome] = capturarVistas(malha, { largura: 320, altura: 220, quadro: briefing.cameras[nome], geometria: 'inteira', finalidade: 'conjunto' })[nome];
validarPacoteDeVistas(vistas);
const destino = path.join(aqui, 'evidencias', 'forma-global-16'); mkdirSync(destino, { recursive: true });
for (const [vista, captura] of Object.entries(vistas)) for (const [modalidade, png] of Object.entries(pngsDaCaptura(captura))) writeFileSync(path.join(destino, `${vista}-${modalidade}.png`), png);
writeFileSync(path.join(destino, 'manifesto.json'), `${JSON.stringify({ nivel: 1, faces: malha.F.size, vistas: Object.keys(vistas), assinaturaMalha: vistas.frontal.assinaturaMalha }, null, 2)}\n`);
