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
 * O que o comando não sabe decidir fica em `<imagem>.prancha.json`, que o
 * agente de prancha edita: as cotas que importam em cada parte
 * (`{ "cotas": [{ "parte": "base", "medida": "largura" }] }`, com `medida`
 * largura ou altura). As cotas gerais da silhueta saem sempre.
 *
 * USO
 *   npm run contorno:prancha -- <imagem>.contornos.json [--titulo=<texto>]
 *   npm run contorno:prancha -- <imagem>.contornos.json --acao
 *   npm run contorno:prancha -- <imagem>.contornos.json --registrar=<veredito.json>
 *   npm run contorno:prancha -- <imagem>.contornos.json --nova-serie --por=<quem decidiu>
 *
 * Grava `<imagem>.prancha.svg` e `<imagem>.prancha.png` ao lado do arquivo de
 * contornos. As rodadas entre o agente e o crítico ficam em
 * `<imagem>.prancha.rodadas/`, com a mesma regra da separação. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prancha, imprimirRelatorio } from './prancha.mjs';
import { lerRodadas, registrarRodada, novaSerie } from '../rodadas-com-critico.mjs';
import { proximaAcao } from '../../../modulos/contorno-da-imagem/src/index.js';

const TELA = { largura: 1200, altura: 900 };
const MARGEM = { esquerda: 90, topo: 110, direita: 260, baixo: 90 };

export function specDosContornos(contornos, { titulo = 'Prancha lateral pelos contornos da imagem', fonte = 'imagem de referência', escolhas = {} } = {}) {
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
  /* Cotas por parte que o agente escolheu, medidas na caixa do contorno. As
     de largura vão abaixo da parte e as de altura à esquerda dela. */
  const cotasDasPartes = (escolhas.cotas ?? []).map(({ parte, medida }) => {
    const pts = contornos.regioes[parte]?.contornoMm;
    if (!pts) throw new Error(`a cota pede a parte '${parte}', que não está nos contornos.`);
    if (medida !== 'largura' && medida !== 'altura') throw new Error(`a medida da cota de '${parte}' é largura ou altura, e veio '${medida}'.`);
    const z0 = Math.min(...pts.map(([z]) => z)); const z1 = Math.max(...pts.map(([z]) => z));
    const y0 = Math.min(...pts.map(([, y]) => y)); const y1 = Math.max(...pts.map(([, y]) => y));
    return medida === 'largura'
      ? { vista: 'lateral', de: [z0, y0], ate: [z1, y0], desloca: [0, 14], texto: `${parte} ${mm(z1 - z0)}` }
      : { vista: 'lateral', de: [z0, y0], ate: [z0, y1], desloca: [-14, 0], texto: `${parte} ${mm(y1 - y0)}` };
  });
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
      ...cotasDasPartes,
    ],
    landmarks: nomes.map((nome) => ({ vista: 'lateral', id: nome, em: centro(contornos.regioes[nome].contornoMm) })),
  };
}

/* O PNG é o que o crítico e o modelador abrem: eles só leem imagem. */
async function svgParaPng(svg, destino) {
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  try {
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/) ?? [0, 1200, 900];
    const pagina = await navegador.newPage({ viewport: { width: Number(w), height: Number(h) } });
    await pagina.setContent(`<body style="margin:0">${svg}</body>`);
    await pagina.screenshot({ path: destino });
  } finally {
    await navegador.close();
  }
}

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  if (!alvo) { process.stderr.write('uso: npm run contorno:prancha -- <imagem>.contornos.json [--acao | --registrar=<veredito.json> | --nova-serie --por=<quem>]\n'); return 2; }
  const arquivo = resolve(alvo);
  const base = arquivo.replace(/\.contornos\.json$/i, '');
  const arquivoEscolhas = `${base}.prancha.json`;
  const pastaRodadas = `${base}.prancha.rodadas`;
  if (argv.includes('--acao')) {
    const d = proximaAcao(lerRodadas(pastaRodadas));
    process.stdout.write(`próxima ação: ${d.acao} — ${d.motivo}\n${(d.defeitos ?? []).map((x) => `  ${JSON.stringify(x)}`).join('\n')}\n`);
    return 0;
  }
  if (valor('registrar')) {
    const julgado = existsSync(arquivoEscolhas) ? JSON.parse(readFileSync(arquivoEscolhas, 'utf8')) : {};
    const { arquivo: gravado, proxima } = registrarRodada(pastaRodadas, { campo: 'julgado', julgado }, JSON.parse(readFileSync(resolve(valor('registrar')), 'utf8')));
    process.stdout.write(`rodada gravada em ${gravado}\npróxima ação: ${proxima.acao} — ${proxima.motivo}\n`);
    return 0;
  }
  if (argv.includes('--nova-serie')) {
    process.stdout.write(`série arquivada em ${novaSerie(pastaRodadas, valor('por'))}\n`);
    return 0;
  }
  const contornos = JSON.parse(readFileSync(arquivo, 'utf8'));
  const escolhas = existsSync(arquivoEscolhas) ? JSON.parse(readFileSync(arquivoEscolhas, 'utf8')) : {};
  const { svg, relatorio } = prancha(specDosContornos(contornos, { titulo: valor('titulo'), fonte: basename(arquivo), escolhas }));
  writeFileSync(`${base}.prancha.svg`, svg);
  await svgParaPng(svg, `${base}.prancha.png`);
  process.stdout.write(`${imprimirRelatorio(relatorio)}\nprancha gravada em ${base}.prancha.svg e ${base}.prancha.png\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`contorno:prancha: ${e.message}\n`); process.exitCode = 1; });
}
