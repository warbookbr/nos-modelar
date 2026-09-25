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
 * (`{ "cotas": [{ "parte": "base", "medida": "largura", "lado": "abaixo" }] }`,
 * com `medida` largura ou altura). `lado` escolhe onde a cota é desenhada
 * para não cair em cima de outra: a de largura `dentro` da parte (padrão),
 * `acima` ou `abaixo` dela; a de altura à `direita` (padrão) ou à `esquerda`.
 * As cotas gerais da silhueta saem sempre.
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
  /* Cotas por parte que o agente escolheu, com o texto só no número; o nome
     fica no marcador da parte. A largura atravessa a parte numa linha
     horizontal a um terço da altura dela e mede a seção ali. A altura é
     medida na seção vertical a três quartos da largura e desenhada do lado de
     fora, à direita da parte, como cota de desenho técnico; dentro, as
     alturas de partes empilhadas caíam na mesma coluna e o texto se
     sobrepunha. A
     primeira versão punha a largura na borda de baixo da caixa da parte e a
     altura na borda esquerda, e o crítico achou a largura do braço no pé do
     ombro e as alturas empilhadas umas sobre as outras. */
  const secao = (pts, eixo, valor) => {
    const cortes = [];
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i]; const b = pts[(i + 1) % pts.length];
      const [ua, va] = eixo === 'y' ? [a[1], a[0]] : [a[0], a[1]];
      const [ub, vb] = eixo === 'y' ? [b[1], b[0]] : [b[0], b[1]];
      if ((ua - valor) * (ub - valor) <= 0 && ua !== ub) cortes.push(va + ((valor - ua) * (vb - va)) / (ub - ua));
    }
    return cortes.length >= 2 ? [Math.min(...cortes), Math.max(...cortes)] : null;
  };
  const cotasDasPartes = (escolhas.cotas ?? []).map(({ parte, medida, lado }) => {
    const pts = contornos.regioes[parte]?.contornoMm;
    if (!pts) throw new Error(`a cota pede a parte '${parte}', que não está nos contornos.`);
    if (medida !== 'largura' && medida !== 'altura') throw new Error(`a medida da cota de '${parte}' é largura ou altura, e veio '${medida}'.`);
    const zs = pts.map(([z]) => z); const ys = pts.map(([, y]) => y);
    const zc = Math.min(...zs) + 0.75 * (Math.max(...zs) - Math.min(...zs));
    const yc = Math.min(...ys) + 0.33 * (Math.max(...ys) - Math.min(...ys));
    if (medida === 'largura') {
      const [z0, z1] = secao(pts, 'y', yc) ?? [Math.min(...pts.map(([z]) => z)), Math.max(...pts.map(([z]) => z))];
      const lados = { dentro: 0, acima: -(Math.max(...ys) - yc) * escala - 12, abaixo: (yc - Math.min(...ys)) * escala + 14 };
      if (lado !== undefined && !(lado in lados)) throw new Error(`o lado da largura de '${parte}' é dentro, acima ou abaixo, e veio '${lado}'.`);
      return { vista: 'lateral', de: [z0, yc], ate: [z1, yc], desloca: [0, lados[lado ?? 'dentro']], texto: `${mm(z1 - z0)}` };
    }
    const [y0, y1] = secao(pts, 'z', zc) ?? [Math.min(...pts.map(([, y]) => y)), Math.max(...pts.map(([, y]) => y))];
    const lados = { direita: (Math.max(...zs) - zc) * escala + 12, esquerda: -(zc - Math.min(...zs)) * escala - 14 };
    if (lado !== undefined && !(lado in lados)) throw new Error(`o lado da altura de '${parte}' é direita ou esquerda, e veio '${lado}'.`);
    return { vista: 'lateral', de: [zc, y0], ate: [zc, y1], desloca: [lados[lado ?? 'direita'], 0], texto: `${mm(y1 - y0)}` };
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
    /* O nome da parte fica no alto à esquerda dela, longe das linhas de cota,
       que passam a um terço da altura e do lado de fora. No centro, o nome e
       o número da cota caíam um sobre o outro. */
    landmarks: nomes.map((nome) => {
      const pts = contornos.regioes[nome].contornoMm;
      const zs = pts.map(([z]) => z); const ys = pts.map(([, y]) => y);
      const [z0, z1, y0, y1] = [Math.min(...zs), Math.max(...zs), Math.min(...ys), Math.max(...ys)];
      return { vista: 'lateral', id: nome, em: [z0 + 0.12 * (z1 - z0), y1 - 0.2 * (y1 - y0)] };
    }),
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
