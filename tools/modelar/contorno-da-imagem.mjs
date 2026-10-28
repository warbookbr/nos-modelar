#!/usr/bin/env node
/* contorno-da-imagem.mjs — a porta de linha de comando do módulo
 * `modulos/contorno-da-imagem`, que separa as partes de uma imagem de
 * referência por watershed com sementes nomeadas.
 *
 * Aqui entram o que o módulo não sabe: a calibração por duas âncoras do
 * `conferir:referencia`, que leva o contorno de pixel a milímetro, os arquivos
 * em disco e as rodadas entre desenhador e crítico. O fluxo está na skill
 * `.claude/skills/contorno-da-imagem`.
 *
 * USO
 *   npm run contorno -- <imagem.png> --regioes=<regioes.json> [--saida=<json>]
 *     [--opacidade=0.2]
 *   npm run contorno -- --regioes=<regioes.json> --acao
 *   npm run contorno -- --regioes=<regioes.json> --registrar=<veredito.json>
 *   npm run contorno -- --regioes=<regioes.json> --nova-serie --por=<quem decidiu>
 *   npm run contorno -- --regioes=<regioes.json> --aceite-humano --por="<quem, data: motivo>" --pendencias="<texto>"
 *
 * `--nova-serie` só vale quando a série parou na decisão humana: as rodadas
 * dela vão para `serie-NN/`, com quem autorizou, e a contagem recomeça.
 *
 * O comando grava sempre, em `<nome>.pacote` ao lado da imagem, para o crítico e a pessoa, o mapa de partes com a opacidade
 * pedida (20% por padrão), um recorte ampliado de cada divisa entre partes
 * vizinhas, com o original ao lado, as folhas `divisas-NN.png`, uma divisa por
 * folha em objeto de poucas partes e até seis nos maiores, e o `roteiro.md`
 * que o crítico segue, uma etapa por folha, e
 * `medidas.json` com a fração do contorno de cada parte que segue uma borda
 * da imagem.
 *
 * O ARQUIVO DE REGIÕES
 *   { "ancoras": [ { "nome": "...", "px": [x, y], "mm": [z, y] }, { ... } ],
 *     "limiar": 225, "realce": false,
 *     "regioes": { "base": [390, 470], "anelCintura": [[345, 405], [430, 405]] } }
 *   `realce` liga o realce de contraste e nitidez do módulo para o watershed.
 *   `foraDoModelo` lista as partes que têm semente só para a vizinha não as
 *   engolir, como um cabo: elas saem da silhueta e da prancha. A silhueta guarda
 *   todos os pedaços em que elas a deixam (`silhueta.pedacos`).
 *   `buracoMaximo` (padrão 64) é a área, em px², até a qual um buraco de fundo
 *   cercado pela silhueta, como um reflexo claro, é fechado; 0 desliga.
 *   `denteMaximo` (padrão 9) é a área, em px², até a qual um dente ou uma
 *   reentrância da borda da silhueta é alisado (abertura e fechamento 3 x 3); 0
 *   desliga. `alcanceSemDono` (padrão 4) é a distância, em px, até a qual o pixel
 *   da silhueta que nenhuma parte pegou passa à parte vizinha mais próxima; 0
 *   desliga.
 *   `bordaSubpixel` (padrão true) traça a linha de cada borda pelo meio-tom da
 *   imagem, dentro do pixel, e não pelo contorno da máscara de pixel; false volta
 *   ao contorno da máscara (o braço robótico, de cotas aprovadas, declara false).
 *   `toleranciaDoTraco` (padrão 0.35) é, em px, o quanto a linha simplificada
 *   pode se afastar da borda subpixel. `fundo` (0 a 255) é o tom do fundo da
 *   imagem para o meio-tom; sem ele vale a mediana do cinza fora da silhueta.
 *   `formas` declara, por parte, trechos da borda e o que eles são:
 *   { "asaEsq": [ { "de": [x, y], "ate": [x, y], "forma": "reta" | "curva" | "detalhe",
 *   "nome": "bordo de ataque" } ] }, com os pontos em pixel da imagem. A reta e a
 *   curva são ajustadas nos pontos da borda subpixel do trecho; se a imagem se
 *   afasta do declarado mais que `toleranciaDaForma` (padrão 1.5 px), nada é
 *   ajustado e o relatório avisa o trecho, a parte e o desvio.
 *
 * As rodadas ficam em `<regioes>.rodadas/`, uma por arquivo, com as sementes
 * julgadas e o veredito do crítico. A saída do contorno é
 * `<imagem>.contornos.json`, igual a cada execução. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  segmentar, silhuetaEmPedacos, sobreposicao, svgDoMapa, etiquetasFora, FONTE_DA_ETIQUETA, recortesDasDivisas, folhasDasDivisas, roteiroDoCritico, proximidadeDaBorda, MINIMO_NA_BORDA,
} from '../../modulos/contorno-da-imagem/src/index.js';
import { calibrarPorAncoras } from './conferir-contra-referencia.mjs';
import { acaoDaPasta, aceitar, lerRodadas as lerRodadasDaPasta, registrarRodada as registrarNaPasta, novaSerie as novaSerieDaPasta } from './rodadas-com-critico.mjs';

export const FORMATO = 'mecanifica.contornos@1';
const arred = (x) => (Math.round(x * 100) / 100) || 0;

export async function contornosDaImagem(pngBuffer, config) {
  const calibracao = calibrarPorAncoras(config.ancoras);
  const seg = await segmentar(pngBuffer, config);
  const foraDoModelo = config.foraDoModelo ?? [];
  const mm2 = calibracao.mmPorPx ** 2;
  const regioes = {};
  for (const [nome, r] of Object.entries(seg.regioes)) {
    regioes[nome] = {
      ...(foraDoModelo.includes(nome) ? { foraDoModelo: true } : {}),
      semente: r.semente,
      areaMm2: Math.round(r.areaPx * mm2),
      contornoPx: r.contornoPx,
      contornoMm: r.contornoPx.map(([x, y]) => calibracao.paraMm(x, y).map(arred)),
      /* Todos os pedaços da parte, do maior para o menor; o primeiro repete os
         campos acima. É daqui que a prancha tira a medida de uma parte que a
         imagem mostra em pedaços, como a hélice cortada pelo cone. */
      pedacos: r.pedacos.map((p) => ({
        areaMm2: Math.round(p.areaPx * mm2),
        contornoPx: p.contornoPx,
        contornoMm: p.contornoPx.map(([x, y]) => calibracao.paraMm(x, y).map(arred)),
      })),
    };
  }
  /* A silhueta em todos os pedaços, do maior para o menor: a parte fora do
     modelo corta a silhueta onde passa (o corpo escuro sobre a asa da frontal do
     avião deixa a ponta da asa num pedaço à parte), e só o maior pedaço perdia a
     ponta. Os campos de sempre são os do maior; `pedacos` traz todos, como nas
     partes, e `linhasDeForaMm` as linhas de fora de todos. */
  const { pedacos: pedacosPx, linhasDeFora } = await silhuetaEmPedacos(seg, { sem: foraDoModelo });
  const paraMm = (pts) => pts.map(([x, y]) => calibracao.paraMm(x, y).map(arred));
  const pedacos = pedacosPx.map((p) => ({ areaMm2: Math.round(p.areaPx * mm2), contornoPx: p.contornoPx, contornoMm: paraMm(p.contornoPx) }));
  const linhasDeForaMm = linhasDeFora.map(paraMm);
  const formas = config.formas && Object.keys(config.formas).length ? formasEmMm(seg.formas, calibracao.mmPorPx) : null;
  return {
    resultado: {
      formato: FORMATO,
      imagem: { sha256: createHash('sha256').update(pngBuffer).digest('hex'), largura: seg.largura, altura: seg.altura },
      mmPorPx: Number(calibracao.mmPorPx.toFixed(5)),
      residuo: calibracao.residuo,
      /* `contornoMm` é a silhueta medida do maior pedaço; `linhaDeForaMm` passa
         um pixel além dela, para a prancha desenhar as partes por dentro. */
      silhueta: {
        contornoPx: pedacos[0].contornoPx,
        contornoMm: pedacos[0].contornoMm,
        linhaDeForaMm: linhasDeForaMm[0],
        pedacos,
        linhasDeForaMm,
      },
      regioes,
      ...(formas ? { formas } : {}),
    },
    segmentacao: seg,
  };
}

/* O relatório das formas declaradas, com o desvio também em milímetro. */
export function formasEmMm({ ajustadas, avisos, detalhes }, mmPorPx) {
  const comMm = (l) => l.map((f) => ({ ...f, ...(f.desvioPx !== undefined ? { desvioMm: Math.round(f.desvioPx * mmPorPx * 10) / 10 } : {}) }));
  return { ajustadas: comMm(ajustadas), avisos: comMm(avisos).map((a) => ({ ...a, mensagem: `${a.mensagem} (${a.desvioMm} mm)` })), detalhes };
}

/* O pacote que o crítico recebe. A pasta é refeita a cada chamada, para
   nenhum recorte de uma rodada anterior sobrar com cara de atual. */
/* O mapa de partes com nomes em fonte de verdade. O navegador mede cada
   texto na fonte do SVG, o módulo arruma as caixas com essa largura e o
   navegador rasteriza o SVG no tamanho exato da tela. O módulo fica sem
   playwright; a composição mora aqui. */
export async function mapaRotulado(pngBuffer, segmentacao, { opacidade = 0.2 } = {}) {
  const semNome = await sobreposicao(pngBuffer, segmentacao, { opacidade, rotular: false });
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    const ordem = (segmentacao.ordem ?? Object.keys(segmentacao.regioes)).filter((n) => segmentacao.regioes[n]);
    const textos = ordem.map((nome, n) => `${n + 1}- ${nome}`);
    const fonte = `${FONTE_DA_ETIQUETA.tamanho}px ${FONTE_DA_ETIQUETA.familia}`;
    const larguras = await pagina.evaluate(([ts, f]) => {
      const c = document.createElement('canvas').getContext('2d'); c.font = f;
      return ts.map((t) => c.measureText(t).width);
    }, [textos, fonte]);
    const medida = new Map(textos.map((t, i) => [t, larguras[i]]));
    const arranjo = etiquetasFora(segmentacao, { larguraDoTexto: (t) => medida.get(t) });
    await pagina.setViewportSize({ width: arranjo.largura, height: arranjo.altura });
    await pagina.setContent(`<body style="margin:0">${svgDoMapa(semNome, arranjo)}</body>`);
    return await pagina.screenshot({ clip: { x: 0, y: 0, width: arranjo.largura, height: arranjo.altura } });
  } finally {
    await navegador.close();
  }
}

export async function gravarPacote(pngBuffer, segmentacao, pasta, { opacidade = 0.2, imagemAlvo = '(imagem alvo)', formas = null } = {}) {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(join(pasta, 'divisas'), { recursive: true });
  const pintada = await mapaRotulado(pngBuffer, segmentacao, { opacidade });
  writeFileSync(join(pasta, 'mapa-de-partes.png'), pintada);
  /* Nos recortes vai a pintura sem os nomes, que cobririam a divisa. */
  const semNome = await sobreposicao(pngBuffer, segmentacao, { opacidade, rotular: false });
  const recortes = recortesDasDivisas(pngBuffer, semNome, segmentacao);
  for (const { a, b, png } of recortes) writeFileSync(join(pasta, 'divisas', `${a}--${b}.png`), png);
  /* As folhas e o roteiro saem sempre: é por eles que o crítico passa por
     todas as divisas. */
  const folhas = (await folhasDasDivisas(recortes, semNome)).map((f, i) => {
    const arquivo = join(pasta, `divisas-${String(i + 1).padStart(2, '0')}.png`);
    writeFileSync(arquivo, f.png);
    return { arquivo, pares: f.pares };
  });
  writeFileSync(join(pasta, 'roteiro.md'), roteiroDoCritico({ alvo: imagemAlvo, mapaDePartes: join(pasta, 'mapa-de-partes.png'), folhas, buracos: segmentacao.buracosFechados }));
  const naBorda = await proximidadeDaBorda(pngBuffer, segmentacao);
  const abaixo = Object.entries(naBorda).filter(([, v]) => v < MINIMO_NA_BORDA).map(([nome]) => nome);
  const medidas = { naBorda, minimo: MINIMO_NA_BORDA, abaixo, semDonoPx: segmentacao.semDono, semDonoAnexadosPx: segmentacao.semDonoAnexados, mascaraSuavizada: segmentacao.mascaraSuavizada, buracosFechados: segmentacao.buracosFechados, divisas: recortes.map(({ a, b, caixa }) => ({ a, b, caixa })) };
  /* O traço: se a borda passou pelo meio-tom ou pela máscara de pixel, e o
     que a imagem tem de fundo; a máscara dá degrau de 1 px na borda inclinada. */
  medidas.traco = { bordaSubpixel: Boolean(segmentacao.tracado), ...(segmentacao.tracado ? { fundoTom: segmentacao.fundoTom, tolerancia: segmentacao.tracado.tolerancia, subamostras: segmentacao.tracado.K } : {}) };
  if (formas) medidas.formas = formas;
  writeFileSync(join(pasta, 'medidas.json'), `${JSON.stringify(medidas, null, 1)}\n`);
  return medidas;
}

const pastaDasRodadas = (arquivoRegioes) => arquivoRegioes.replace(/\.json$/i, '.rodadas');
export const lerRodadas = (arquivoRegioes) => lerRodadasDaPasta(pastaDasRodadas(arquivoRegioes));
export const registrarRodada = (arquivoRegioes, veredito) => registrarNaPasta(
  pastaDasRodadas(arquivoRegioes), { campo: 'regioes', julgado: JSON.parse(readFileSync(arquivoRegioes, 'utf8')).regioes }, veredito,
);
export const novaSerie = (arquivoRegioes, por) => novaSerieDaPasta(pastaDasRodadas(arquivoRegioes), por);

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  const valor = (nome) => argv.find((a) => a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=');
  const regioes = valor('regioes') && resolve(valor('regioes'));
  if (!regioes) {
    process.stderr.write('uso: npm run contorno -- <imagem.png> --regioes=<regioes.json> | --regioes=<json> --acao | --regioes=<json> --registrar=<veredito.json>\n');
    return 2;
  }
  if (argv.includes('--acao')) {
    const d = acaoDaPasta(pastaDasRodadas(regioes));
    process.stdout.write(`próxima ação: ${d.acao} — ${d.motivo}\n${(d.defeitos ?? []).map((x) => `  ${JSON.stringify(x)}`).join('\n')}\n`);
    return 0;
  }
  if (argv.includes('--aceite-humano')) {
    const { arquivo: gravadoAceite, proxima } = aceitar(pastaDasRodadas(regioes), { por: valor('por'), pendencias: valor('pendencias') });
    process.stdout.write(`aceite gravado em ${gravadoAceite}\npróxima ação: ${proxima.acao} — ${proxima.motivo}\n`);
    return 0;
  }
  if (argv.includes('--nova-serie')) {
    process.stdout.write(`série arquivada em ${novaSerie(regioes, valor('por'))}\n`);
    return 0;
  }
  if (valor('registrar')) {
    const veredito = JSON.parse(readFileSync(resolve(valor('registrar')), 'utf8'));
    const { arquivo, proxima } = registrarRodada(regioes, veredito);
    process.stdout.write(`rodada gravada em ${arquivo}\npróxima ação: ${proxima.acao} — ${proxima.motivo}\n`);
    return 0;
  }
  if (!alvo) { process.stderr.write('diga a imagem.\n'); return 2; }
  const imagem = resolve(alvo);
  const png = readFileSync(imagem);
  const config = JSON.parse(readFileSync(regioes, 'utf8'));
  const { resultado, segmentacao } = await contornosDaImagem(png, config);
  const saida = valor('saida') ? resolve(valor('saida')) : imagem.replace(/\.png$/i, '.contornos.json');
  writeFileSync(saida, `${JSON.stringify(resultado, null, 1)}\n`, 'utf8');
  process.stdout.write(`contorno — ${basename(imagem)}: ${Object.keys(resultado.regioes).length} região(ões), ${resultado.mmPorPx} mm/px\n  gravado em ${saida}\n`);
  /* O pacote mora sempre ao lado da imagem, em `<nome>.pacote`, que é onde
     `npm run objeto` o procura. A pasta era escolhida por quem chamava, e a
     mesma imagem chegou a ter dois pacotes, um em `lateral-sem-cabo.pacote` e
     outro em `lateral-sem-cabo.png.pacote`, com rodadas diferentes. */
  const pasta = imagem.replace(/\.png$/i, '.pacote');
  if (valor('pacote') && resolve(valor('pacote')) !== pasta) {
    process.stderr.write(`o pacote desta imagem é ${pasta}; não passe --pacote com outra pasta.\n`);
    return 2;
  }
  {
    const medidas = await gravarPacote(png, segmentacao, pasta, { opacidade: valor('opacidade') ? Number(valor('opacidade')) : undefined, imagemAlvo: imagem, formas: resultado.formas ?? null });
    process.stdout.write(`  pacote em ${pasta}: mapa de partes, ${medidas.divisas.length} divisa(s), medidas\n`);
    if (medidas.abaixo.length) process.stdout.write(`  ABAIXO DO MÍNIMO NA BORDA (${medidas.minimo}): ${medidas.abaixo.join(', ')} — volta ao desenhador antes do crítico\n`);
    if (medidas.semDonoPx > 0) process.stdout.write(`  ${medidas.semDonoPx} pixel(s) da silhueta sem dono\n`);
    if (medidas.semDonoAnexadosPx > 0) process.stdout.write(`  ${medidas.semDonoAnexadosPx} pixel(s) sem dono, vizinhos de uma parte, passaram à parte mais próxima; a borda da silhueta perdeu ${medidas.mascaraSuavizada.tirados} pixel(s) de dente e ganhou ${medidas.mascaraSuavizada.postos} de reentrância\n`);
    if (medidas.buracosFechados.buracos > 0) process.stdout.write(`  ${medidas.buracosFechados.buracos} buraco(s) pequeno(s) cercado(s) pela silhueta fechado(s), ${medidas.buracosFechados.pixels} pixel(s)\n`);
    if (!medidas.traco.bordaSubpixel) process.stdout.write('  borda pela máscara de pixel (bordaSubpixel: false): a borda inclinada sai em degrau de 1 px\n');
    for (const f of medidas.formas?.ajustadas ?? []) process.stdout.write(`  forma ajustada: '${f.parte}'${f.nome ? ` (${f.nome})` : ''}, ${f.forma} de [${f.de}] a [${f.ate}], desvio ${f.desvioPx.toFixed(2)} px (${f.desvioMm} mm)\n`);
    for (const a of medidas.formas?.avisos ?? []) process.stdout.write(`  AVISO DE FORMA: ${a.mensagem}\n`);
    if (resultado.silhueta.pedacos.length > 1) process.stdout.write(`  silhueta em ${resultado.silhueta.pedacos.length} pedaço(s), o maior com ${resultado.silhueta.pedacos[0].areaMm2} mm²\n`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`contorno: ${erro.message}\n`); process.exitCode = 1; });
}
