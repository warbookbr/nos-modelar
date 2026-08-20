#!/usr/bin/env node
/* Prancha R4, escrita sem reutilizar as receitas P0 ou cupê. É um briefing
   ficcional completo: o arquivo é a autoria declarativa, não uma malha. */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prancha, imprimirRelatorio } from './prancha.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(REPO, 'docs/mecanifica/img/r4-furgoneta-tecnica-prancha.svg');

const D = { comprimento: 3900, largura: 1760, altura: 1780, entreEixos: 2450 };
const zMin = -2100;
const zMax = 1800;
const xMax = D.largura / 2;
const yMax = D.altura;
const lateral = [[zMin, 150], [-1850, 860], [-720, 1640], [950, 1660], [1100, yMax], [zMax, 1420], [zMax, 150]];
const plantaDireita = [[zMin, 560], [-1650, 790], [-250, 880], [1100, 840], [zMax, 650]];
const espelhar = (pts) => pts.map(([a, b]) => [a, -b]);
const fecharPlanta = () => [...plantaDireita, ...espelhar(plantaDireita).reverse()];
const fecharPerfil = (alto, ombro) => [[0, 150], [ombro, 420], [880, 1240], [700, alto], [-700, alto], [-880, 1240], [-ombro, 420]];

export const spec = {
  autoria: {
    versao: 'mecanifica.prancha-autoria@1', estado: 'pronta', modo: 'quatro-vistas', confianca: 'alta',
    intencao: 'furgoneta técnica ficcional, alta e curta, para prova independente de quatro vistas',
    procedencias: [{ id: 'briefing-r4', tipo: 'briefing-ficcional', evidencia: 'dimensões, envelope e relações declarados neste arquivo antes do traçado' }],
    incertezas: [],
  },
  titulo: 'Furgoneta técnica — prancha ortográfica R4',
  subtitulo: 'Briefing ficcional independente. Milímetros. Frente à direita.',
  escala: 0.16,
  tela: { largura: 1300, altura: 860 },
  limites: { zMin, zMax, xMax, yMax },
  vistas: {
    lateral: { x: 50, y: 92, rotulo: 'LATERAL — projeção' },
    frontal: { x: 830, y: 92, rotulo: 'FRONTAL — projeção' },
    planta: { x: 50, y: 470, rotulo: 'SUPERIOR — projeção' },
    traseira: { x: 830, y: 470, rotulo: 'TRASEIRA — projeção' },
  },
  envelope: { comprimento: D.comprimento, largura: D.largura, altura: D.altura },
  camadas: [
    { vista: 'lateral', contorno: true, nome: 'silhuetaLateral', tipo: 'poli', pts: lateral, fechado: true },
    { vista: 'lateral', classe: 'painel', tipo: 'poli', fechado: true, pts: [[-950, 520], [-810, 1420], [520, 1450], [640, 560]] },
    { vista: 'lateral', classe: 'painel', tipo: 'poli', pts: [[860, 500], [860, 1380]] },
    { vista: 'planta', contorno: true, nome: 'plantaDireita', tipo: 'poli', pts: fecharPlanta(), fechado: true },
    { vista: 'frontal', contorno: true, nome: 'frenteDireita', tipo: 'poli', pts: fecharPerfil(yMax, 850), fechado: true },
    { vista: 'traseira', contorno: true, nome: 'traseiraDireita', tipo: 'poli', pts: fecharPerfil(yMax, 860), fechado: true },
  ],
  cotas: [
    { vista: 'lateral', de: [zMin, 0], ate: [zMax, 0], desloca: [0, 40], texto: 'comprimento 3900' },
    { vista: 'lateral', de: [zMax, 0], ate: [zMax, yMax], desloca: [38, 0], texto: 'altura 1780' },
    { vista: 'planta', de: [0, -xMax], ate: [0, xMax], desloca: [55, 0], texto: 'largura 1760' },
  ],
  landmarks: [
    { vista: 'lateral', id: 'R4-01', em: [zMin, 150], sobre: 'silhuetaLateral' },
    { vista: 'lateral', id: 'R4-02', em: [-720, 1640], sobre: 'silhuetaLateral' },
    { vista: 'lateral', id: 'R4-03', em: [950, 1660], sobre: 'silhuetaLateral' },
    { vista: 'planta', id: 'R4-04', em: [-250, 880], sobre: 'plantaDireita' },
  ],
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { svg, relatorio } = prancha(spec);
  mkdirSync(path.dirname(SAIDA), { recursive: true });
  writeFileSync(SAIDA, svg);
  console.log(`prancha-r4-independente: ${path.relative(REPO, SAIDA)}`);
  console.log(imprimirRelatorio(relatorio));
}
