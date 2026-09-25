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
 *     [--pacote=<pasta>] [--opacidade=0.2]
 *   npm run contorno -- --regioes=<regioes.json> --acao
 *   npm run contorno -- --regioes=<regioes.json> --registrar=<veredito.json>
 *   npm run contorno -- --regioes=<regioes.json> --nova-serie --por=<quem decidiu>
 *
 * `--nova-serie` só vale quando a série parou na decisão humana: as rodadas
 * dela vão para `serie-NN/`, com quem autorizou, e a contagem recomeça.
 *
 * `--pacote` grava, para o crítico e a pessoa, a sobreposição com a opacidade
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
 *   engolir, como um cabo: elas saem da silhueta e da prancha.
 *
 * As rodadas ficam em `<regioes>.rodadas/`, uma por arquivo, com as sementes
 * julgadas e o veredito do crítico. A saída do contorno é
 * `<imagem>.contornos.json`, igual a cada execução. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  segmentar, contornoDaSilhueta, sobreposicao, recortesDasDivisas, folhasDasDivisas, roteiroDoCritico, proximidadeDaBorda, MINIMO_NA_BORDA, proximaAcao,
} from '../../modulos/contorno-da-imagem/src/index.js';
import { calibrarPorAncoras } from './conferir-contra-referencia.mjs';
import { lerRodadas as lerRodadasDaPasta, registrarRodada as registrarNaPasta, novaSerie as novaSerieDaPasta } from './rodadas-com-critico.mjs';

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
    };
  }
  const silhuetaPx = await contornoDaSilhueta(seg, { sem: foraDoModelo });
  const linhaDeForaPx = await contornoDaSilhueta(seg, { folga: 1, sem: foraDoModelo });
  return {
    resultado: {
      formato: FORMATO,
      imagem: { sha256: createHash('sha256').update(pngBuffer).digest('hex'), largura: seg.largura, altura: seg.altura },
      mmPorPx: Number(calibracao.mmPorPx.toFixed(5)),
      residuo: calibracao.residuo,
      /* `contornoMm` é a silhueta medida; `linhaDeForaMm` passa um pixel além
         dela, para a prancha desenhar as partes por dentro. */
      silhueta: {
        contornoPx: silhuetaPx,
        contornoMm: silhuetaPx.map(([x, y]) => calibracao.paraMm(x, y).map(arred)),
        linhaDeForaMm: linhaDeForaPx.map(([x, y]) => calibracao.paraMm(x, y).map(arred)),
      },
      regioes,
    },
    segmentacao: seg,
  };
}

/* O pacote que o crítico recebe. A pasta é refeita a cada chamada, para
   nenhum recorte de uma rodada anterior sobrar com cara de atual. */
export async function gravarPacote(pngBuffer, segmentacao, pasta, { opacidade = 0.2, imagemAlvo = '(imagem alvo)' } = {}) {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(join(pasta, 'divisas'), { recursive: true });
  const pintada = await sobreposicao(pngBuffer, segmentacao, { opacidade });
  writeFileSync(join(pasta, 'sobreposicao.png'), pintada);
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
  writeFileSync(join(pasta, 'roteiro.md'), roteiroDoCritico({ alvo: imagemAlvo, sobreposicao: join(pasta, 'sobreposicao.png'), folhas }));
  const naBorda = await proximidadeDaBorda(pngBuffer, segmentacao);
  const abaixo = Object.entries(naBorda).filter(([, v]) => v < MINIMO_NA_BORDA).map(([nome]) => nome);
  const medidas = { naBorda, minimo: MINIMO_NA_BORDA, abaixo, semDonoPx: segmentacao.semDono, divisas: recortes.map(({ a, b, caixa }) => ({ a, b, caixa })) };
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
    process.stderr.write('uso: npm run contorno -- <imagem.png> --regioes=<regioes.json> [--pacote=<pasta>] | --regioes=<json> --acao | --regioes=<json> --registrar=<veredito.json>\n');
    return 2;
  }
  if (argv.includes('--acao')) {
    const d = proximaAcao(lerRodadas(regioes));
    process.stdout.write(`próxima ação: ${d.acao} — ${d.motivo}\n${(d.defeitos ?? []).map((x) => `  ${JSON.stringify(x)}`).join('\n')}\n`);
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
  if (valor('pacote')) {
    const pasta = resolve(valor('pacote'));
    const medidas = await gravarPacote(png, segmentacao, pasta, { opacidade: valor('opacidade') ? Number(valor('opacidade')) : undefined, imagemAlvo: imagem });
    process.stdout.write(`  pacote em ${pasta}: sobreposição, ${medidas.divisas.length} divisa(s), medidas\n`);
    if (medidas.abaixo.length) process.stdout.write(`  ABAIXO DO MÍNIMO NA BORDA (${medidas.minimo}): ${medidas.abaixo.join(', ')} — volta ao desenhador antes do crítico\n`);
    if (medidas.semDonoPx > 0) process.stdout.write(`  ${medidas.semDonoPx} pixel(s) da silhueta sem dono\n`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo; }, (erro) => { process.stderr.write(`contorno: ${erro.message}\n`); process.exitCode = 1; });
}
