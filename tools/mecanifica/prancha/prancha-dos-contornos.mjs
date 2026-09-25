#!/usr/bin/env node
/* prancha-dos-contornos.mjs — a prancha lateral desenhada com os contornos que
 * `npm run contorno` tirou da imagem de referência, em milímetro.
 *
 * A primeira prancha do braço robótico foi traçada à mão com retângulos lidos
 * a olho, e a pessoa julgou que ela não serve para medir proporção nem
 * posição. Aqui nenhuma coordenada é digitada: a silhueta e cada parte vêm do
 * arquivo de contornos, e o motor de prancha mede o que desenhou. A prancha é
 * `parcial`, só com a vista lateral, porque é a única que a referência mostra.
 *
 * USO
 *   npm run contorno:prancha -- <imagem>.contornos.json [--saida=<svg>] [--titulo=<texto>]
 *
 * A saída padrão é `<imagem>.prancha.svg` ao lado do arquivo de contornos. */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prancha, imprimirRelatorio } from './prancha.mjs';

const TELA = { largura: 1200, altura: 900 };
const MARGEM = { esquerda: 90, topo: 110, direita: 260, baixo: 90 };

export function specDosContornos(contornos, { titulo = 'Prancha lateral pelos contornos da imagem', fonte = 'imagem de referência' } = {}) {
  const silhueta = contornos.silhueta?.contornoMm;
  if (!Array.isArray(silhueta) || silhueta.length < 3) throw new Error('o arquivo de contornos não traz a silhueta; gere de novo com `npm run contorno`.');
  const zs = silhueta.map(([z]) => z); const ys = silhueta.map(([, y]) => y);
  const zMin = Math.min(...zs); const zMax = Math.max(...zs); const yMin = Math.min(...ys); const yMax = Math.max(...ys);
  const escala = Math.min(
    (TELA.largura - MARGEM.esquerda - MARGEM.direita) / (zMax - zMin),
    (TELA.altura - MARGEM.topo - MARGEM.baixo) / (yMax - yMin),
  );
  const nomes = Object.keys(contornos.regioes).filter((nome) => !contornos.regioes[nome].foraDoModelo);
  const centro = (pts) => [pts.reduce((s, [z]) => s + z, 0) / pts.length, pts.reduce((s, [, y]) => s + y, 0) / pts.length];
  const mm = (v) => Math.round(v);
  return {
    autoria: {
      versao: 'mecanifica.prancha-autoria@1', estado: 'pronta', modo: 'parcial', confianca: 'media',
      intencao: 'vista lateral com a silhueta e o contorno de cada parte tirados da imagem de referência',
      procedencias: [{ id: 'contornos', tipo: 'referencia-raster-derivada', evidencia: `${fonte}, ${contornos.mmPorPx} mm por pixel, calibrada por duas âncoras` }],
      incertezas: [],
    },
    titulo,
    subtitulo: `Milímetros. ${nomes.length} partes pelo watershed com sementes. Parte escondida atrás de outra aparece só no pedaço visível.`,
    escala,
    tela: TELA,
    limites: { zMin, zMax, xMax: 0, yMax },
    vistas: { lateral: { x: MARGEM.esquerda, y: MARGEM.topo, rotulo: 'LATERAL — projeção' } },
    camadas: [
      /* A linha de fora passa um pixel além da silhueta, para as partes, que
         tocam a borda, ficarem dentro dela; as cotas usam a silhueta medida. */
      { vista: 'lateral', contorno: true, nome: 'silhuetaLateral', tipo: 'poli', pts: contornos.silhueta.linhaDeForaMm ?? silhueta, fechado: true },
      ...nomes.map((nome) => ({ vista: 'lateral', classe: 'painel', nome, tipo: 'poli', pts: contornos.regioes[nome].contornoMm, fechado: true })),
    ],
    cotas: [
      { vista: 'lateral', de: [zMin, yMin], ate: [zMax, yMin], desloca: [0, 36], texto: `largura ${mm(zMax - zMin)}` },
      { vista: 'lateral', de: [zMax, yMin], ate: [zMax, yMax], desloca: [34, 0], texto: `altura ${mm(yMax - yMin)}` },
    ],
    landmarks: nomes.map((nome) => ({ vista: 'lateral', id: nome, em: centro(contornos.regioes[nome].contornoMm) })),
  };
}

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  if (!alvo) { process.stderr.write('uso: npm run contorno:prancha -- <imagem>.contornos.json [--saida=<svg>] [--titulo=<texto>]\n'); return 2; }
  const arquivo = resolve(alvo);
  const contornos = JSON.parse(readFileSync(arquivo, 'utf8'));
  const { svg, relatorio } = prancha(specDosContornos(contornos, { titulo: valor('titulo'), fonte: basename(arquivo) }));
  const saida = valor('saida') ? resolve(valor('saida')) : arquivo.replace(/\.contornos\.json$/i, '.prancha.svg');
  writeFileSync(saida, svg);
  process.stdout.write(`${imprimirRelatorio(relatorio)}\nprancha gravada em ${saida}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`contorno:prancha: ${e.message}\n`); process.exitCode = 1; });
}
