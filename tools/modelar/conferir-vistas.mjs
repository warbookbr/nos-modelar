#!/usr/bin/env node
/* conferir-vistas.mjs — a rodada inteira de conferência de um rascunho contra as imagens de referência num comando só: o esboço é
 * montado uma vez, e para cada vista com referência saem as linhas do modelo, o casamento, a captura com luz e a leitura por regiões,
 * e depois a sobra entre as partes declaradas.
 *
 * POR QUE ELE EXISTE. Na traseira da empilhadeira (2026-11-10) quem conduzia rodava, vista por vista, `linhas:modelo`,
 * `casamento:vista`, `leitura:regioes` e `sobra:partes`, além da captura do `esboco:nucleo`, e cada comando montava o esboço de novo,
 * cerca de 50 s por montagem. As bandeiras de cada um (as cores, a classe de cada parte, a caixa e o ignorado da referência) eram as
 * mesmas em todos e se repetiam à mão. Aqui elas ficam numa config, a opção é montada uma vez, e as funções puras dos quatro
 * comandos medem e desenham sobre a mesma malha.
 *
 * O QUE ELE FAZ. Para cada vista da config, na subpasta `<saida>/<vista>/`: `linhas.png` (o desenho de `linhas:modelo`),
 * `casamento.json` e `casamento.png` (as medidas de `casamento:vista`), `captura.png` (o rascunho com cor e luz) e a leitura por
 * regiões (`indice.png`, `folha-NN.png`, `pedido.md`, `leitura.json`), com as linhas como terceiro painel e o `fora` da vista no
 * pedido. Ao fim do pedido entra a ordem sugerida das regiões pela nota do casamento, sem os números. A `captura.png` sai, por padrão
 * (`--captura=rapida`), da vista rápida (`vista-rapida.mjs`), desenhada em JavaScript sobre a mesma opção montada, em um ou dois
 * segundos, com a cor que o esboço pinta em cada parte e, na parte sem cor, a da classe dela na config. Com `--captura=bancada` ela
 * sai da bancada pelo navegador, cerca de um minuto por vista, com duas tentativas. Com `--captura=nenhuma` (ou `--sem-captura`), ou
 * quando a captura falha, o desenho das linhas ocupa o lugar do rascunho com luz, e o resumo e o pedido dizem isso; uma captura que
 * falha não derruba a rodada. O resumo diz de onde veio a imagem de cada vista.
 *
 * Depois, `tres-quartos/` com a vista rápida da opção em quatro direções, de frente pela direita, de frente pela esquerda, de trás
 * pela direita e de trás pela esquerda, todas com a elevação da isométrica da bancada. Elas existem porque o que avança ou recua para
 * o observador numa vista ortográfica só aparece na vizinha (ATRITOS da empilhadeira, item 12), e quem conduz abre as quatro antes de
 * levar a rodada à pessoa; `"tresQuartos": false` na config as desliga. Depois, `sobra/` com o desenho de cada par de `dentro` que
 * passa da tolerância nas `vistasDaSobra`. Em `--saida` ficam `resumo.md`, para quem conduz, e `resumo.json`
 * (`modelar.conferir-vistas@1`), com os mesmos números e os caminhos.
 *
 * O LIMITE. O número ordena as regiões e diz onde olhar primeiro; ele não aprova forma, quem aprova forma é a pessoa. O crítico
 * recebe a ordem e não os números, para ler a região e não a nota.
 *
 * A CONFIG. Um JSON, com os caminhos relativos a ele:
 *   { "objeto": "a traseira de uma máquina", "cores": { "laranja": "#e2641e", ... }, "partes": { "capo": "laranja", ... },
 *     "dentro": { "grade": "capo" }, "vistasDaSobra": ["superior", "direita"], "toleranciaDaSobraMm": 3,
 *     "vistas": { "traseira": { "referencia": "x.png", "caixaRef": [x0, y0, x1, y1], "ignorar": [[x0, y0, x1, y1]],
 *                               "fora": "o eixo e as rodas", "grade": [4, 3], "visto": "de trás" } } }
 * Opcionais: "fundo" (#rrggbb da referência), "largura" (px do raster e das vistas rápidas, 1200), "toleranciaMm" (do casamento,
 * 12, também por vista) e "tresQuartos" (true; false não grava as quatro vistas de três quartos). O valor de "dentro" é uma parte ou
 * uma lista delas. Por vista, "girar" (0, 90, 180 ou 270 graus no sentido horário, padrão 0) e "espelhar" (true para o espelho
 * horizontal depois do giro, padrão false) acertam a referência que veio noutra orientação, como a vista de cima gerada com a frente à
 * esquerda, que a bancada põe embaixo: a imagem é girada e espelhada em memória antes de tudo, e "caixaRef" e "ignorar" valem na
 * imagem já girada. Toda parte de "partes" tem de existir na opção montada e toda parte da opção tem de ter classe; a parte que
 * sumiu da opção (um comentário mal fechado no módulo engoliu o piso e o tapete) é recusada com a lista das que faltam.
 *
 * DUAS ESCALAS. Por vista, "escalaVertical" (os mm por px da altura da referência sobre os da largura, como a vista de frente de IA
 * que tem a altura 25% maior que a largura na mesma escala) vai ao casamento, que leva a largura de caixa a caixa e a altura pela
 * escala da largura vezes o fator, com a base na base (`casamento-da-vista.mjs`); o resumo diz que a vista foi conferida com duas
 * escalas. A leitura por regiões do crítico continua de caixa a caixa.
 *
 * A VISTA SÓ DE CONTORNOS. Uma vista pode ter, no lugar de "referencia", "contornos": um arquivo `mecanifica.contornos@1` (o contorno
 * em mm de cada parte da referência, em `regioes.<nome>.pedacos[].contornoMm`, com x para a direita e y para cima da imagem). O
 * contorno vai ao modelo por "escala" (mm do modelo por mm do contorno, padrão 1), "ancora" ({ "contorno": [x, y], "modelo":
 * [x, y, z] }, o ponto do contorno e o ponto do modelo que caem no mesmo lugar da vista; padrão a origem nos dois) e "espelhar"
 * (true para o contorno desenhado olhando para o outro lado). "partes" mapeia cada parte do arquivo que se mede (ou várias juntas por
 * "+", como "lateral+piso", quando o arquivo divide o que o modelo tem numa parte só) para uma parte do modelo ou uma lista delas, e
 * "ignorarRegioes" tira partes do arquivo do conjunto (a sombra), e "foraDaConta": [{ "partes": [...], "motivo": "..." }] tira partes do
 * MODELO da silhueta e da conta, as que a referência não tem (o chassi sob a lataria), com o motivo no resumo. Para cada parte mapeada e para o
 * conjunto (todas as partes do modelo contra as do arquivo menos as ignoradas) sai, na silhueta visível do modelo na vista: a
 * sobreposição (interseção sobre união), a caixa em mm nos eixos do modelo com a diferença por lado da imagem (positiva quando o
 * modelo passa da referência para fora), a sobra e a falta (a área do modelo fora da referência e a da referência fora do modelo, em mm² e
 * em parte da área da referência) e o maior afastamento entre os dois contornos, de um contorno até o outro, com a posição. O afastamento
 * mede só o contorno de fora da silhueta. Os furos da silhueta do modelo mais estreitos que "fendaMm" (20 mm por padrão, por vista) saem à
 * parte, no conjunto, como lista de fendas com posição, largura e comprimento: a junta de 4 mm entre portas por onde se vê o outro lado.
 * Grava `<vista>/contornos.png`, o modelo na cor da classe com os contornos por cima, e `<vista>/contornos.json`. Essa vista não tem
 * casamento, captura nem pedido ao crítico, que não tem imagem para comparar.
 *
 * A SOBRA POR PAR. "dentro" é o objeto { "contida": "continente" } ou uma lista de pares, cada um o texto "contida:continente" ou
 * { "par": "contida:continente", "vistas": ["superior"] }; o par com vistas próprias só é medido nelas, e o sem, nas "vistasDaSobra".
 * A silhueta da continente é a real, com os furos (`sobra-entre-partes.mjs`).
 *
 * A MESMA PASTA A CADA RODADA. O número da rodada registrada e a checagem de contradição com a rodada anterior saem de
 * `<saida>/<vista>/rodadas/`; numa pasta nova a numeração recomeça em 01 e a checagem não vê nada. A rodada seguinte usa então a
 * mesma pasta (as imagens são regravadas e `rodadas/` se acumula), ou `--rodadas-de=<pasta de uma conferência anterior>`, que copia
 * para a pasta nova as `rodadas/` de cada vista que ainda não as tem.
 *
 * USO
 *   npm run conferir:vistas -- <esboço> --config=<json> --saida=<pasta> [--opcao=1] [--captura=rapida|bancada|nenhuma]
 *     [--vistas=traseira,superior] [--rodadas-de=<pasta>]
 *   npm run conferir:vistas -- --saida=<pasta> --registrar=<vista>:<respostas.json>
 * O primeiro roda a rodada; o segundo repassa as respostas do crítico ao registro da leitura daquela vista. `--sem-captura` vale como
 * `--captura=nenhuma`. Sai 0 quando a rodada rodou, 2 em config ou argumento ruim, e 1 quando o esboço é recusado ou o registro recusa a rodada. */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { GRADE_PADRAO, dePng, escrever, imagem, executar as executarLeitura, gravarLeitura, montarLeitura, paraPng, regioesDaGrade } from './leitura-por-regioes.mjs';
import { LINHA, baseDaVista, desenharLinhas, facesDoNeutro, linhasDoRaster, rasterizar } from './linhas-do-modelo.mjs';
import { LARGURA_PADRAO, TOLERANCIA_PADRAO_MM, desenharCasamento, medirCasamento, paraJson as casamentoParaJson } from './casamento-da-vista.mjs';
import { TOLERANCIA_MM as TOLERANCIA_DA_SOBRA, VISTAS_PADRAO as VISTAS_DA_SOBRA, desenharSobra, distanciaAoConjunto, normalizarPares, quadroDaVista, sobraEntrePartes } from './sobra-entre-partes.mjs';
import { FUNDO_PADRAO, lerClasses, lerCor } from './perfil-por-cor.mjs';
import { rgbDoHex } from './vista-rapida.mjs';
import { coresDasPartes, facesDaOpcao, rasterSombreado } from './vista-rapida.mjs';
import { abrirModelo, acharReceita } from './modelo-aberto.mjs';

export const FORMATO = 'modelar.conferir-vistas@1';
export const TENTATIVAS_DE_CAPTURA = 2;
export const CAPTURAS = Object.freeze(['rapida', 'bancada', 'nenhuma']);
export const GIROS = Object.freeze([0, 90, 180, 270]);
/* os três quartos: a direção da isométrica da bancada com os sinais de x (direita) e z (frente) trocados, a mesma elevação */
const [ISO_X, ISO_Y, ISO_Z] = VISTAS_BANCADA.isometrica.direcao;
export const TRES_QUARTOS = Object.freeze([
  Object.freeze({ nome: 'frente-direita', texto: 'de frente pela direita', direcao: Object.freeze([ISO_X, ISO_Y, ISO_Z]) }),
  Object.freeze({ nome: 'frente-esquerda', texto: 'de frente pela esquerda', direcao: Object.freeze([-ISO_X, ISO_Y, ISO_Z]) }),
  Object.freeze({ nome: 'tras-direita', texto: 'de trás pela direita', direcao: Object.freeze([ISO_X, ISO_Y, -ISO_Z]) }),
  Object.freeze({ nome: 'tras-esquerda', texto: 'de trás pela esquerda', direcao: Object.freeze([-ISO_X, ISO_Y, -ISO_Z]) }),
]);
const BRANCO = [255, 255, 255];

export class ErroDaConferencia extends Error {
  constructor(mensagem, codigo = 2) { super(mensagem); this.name = 'ErroDaConferencia'; this.codigo = codigo; }
}

/* --- a referência girada ------------------------------------------------------------------------------------------------------ */
/** A imagem (no formato de `dePng`) girada de `graus` no sentido horário, um de `GIROS`; com 0 devolve a mesma imagem. */
export function girarImagem(im, graus) {
  if (!GIROS.includes(graus)) throw new ErroDaConferencia(`girar espera ${GIROS.join(', ')} e veio ${JSON.stringify(graus)}`);
  if (graus === 0) return im;
  const { largura: L, altura: A } = im;
  const deitada = graus !== 180;
  const nova = imagem(deitada ? A : L, deitada ? L : A);
  /* o pixel (x, y) da imagem girada vem do pixel (sx, sy) da original */
  const origem = { 90: (x, y) => [y, A - 1 - x], 180: (x, y) => [L - 1 - x, A - 1 - y], 270: (x, y) => [L - 1 - y, x] }[graus];
  for (let y = 0; y < nova.altura; y += 1) for (let x = 0; x < nova.largura; x += 1) {
    const [sx, sy] = origem(x, y);
    const i = (sy * L + sx) * 3; const j = (y * nova.largura + x) * 3;
    nova.dados[j] = im.dados[i]; nova.dados[j + 1] = im.dados[i + 1]; nova.dados[j + 2] = im.dados[i + 2];
  }
  return nova;
}

/** A imagem espelhada na horizontal: a coluna x vai para largura - 1 - x. */
export function espelharImagem(im) {
  const nova = imagem(im.largura, im.altura);
  for (let y = 0; y < im.altura; y += 1) for (let x = 0; x < im.largura; x += 1) {
    const i = (y * im.largura + x) * 3; const j = (y * im.largura + (im.largura - 1 - x)) * 3;
    nova.dados[j] = im.dados[i]; nova.dados[j + 1] = im.dados[i + 1]; nova.dados[j + 2] = im.dados[i + 2];
  }
  return nova;
}

/* --- a config ------------------------------------------------------------------------------------------------------------------- */
const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const quatro = (v) => Array.isArray(v) && v.length === 4 && v.every(Number.isFinite);

/**
 * Lê e confere a config. A conferência que depende da opção (as partes) fica em `conferirPartes`. Devolve a config normalizada, com
 * os caminhos absolutos e as imagens de referência lidas; recusa com `ErroDaConferencia` e a lista de campos e motivos.
 */
export function lerConfig(config, pastaDaConfig, { vistasPedidas = null } = {}) {
  const recusas = [];
  const recusa = (campo, motivo) => recusas.push(`${campo}: ${motivo}`);
  if (!ehObjeto(config)) throw new ErroDaConferencia('config: precisa ser um objeto JSON');
  if (config.objeto !== undefined && typeof config.objeto !== 'string') recusa('objeto', 'precisa ser um texto');
  let classes = [];
  if (!ehObjeto(config.cores) || !Object.keys(config.cores).length) recusa('cores', 'precisa ser um objeto { "classe": "#rrggbb" } com pelo menos uma classe');
  else {
    try { classes = lerClasses(Object.entries(config.cores).map(([n, c]) => `${n}:${c}`).join(',')); } catch (e) { recusa('cores', e.message.replace(/--cores/g, 'a lista')); }
  }
  let fundo = FUNDO_PADRAO;
  if (config.fundo !== undefined) { try { fundo = lerCor(config.fundo, 'fundo'); } catch (e) { recusa('fundo', e.message); } }
  const largura = config.largura ?? LARGURA_PADRAO;
  if (!Number.isInteger(largura) || largura < 16) recusa('largura', `espera um inteiro de pelo menos 16 e veio ${JSON.stringify(config.largura)}`);
  const toleranciaMm = config.toleranciaMm ?? TOLERANCIA_PADRAO_MM;
  if (!(Number.isFinite(toleranciaMm) && toleranciaMm >= 0)) recusa('toleranciaMm', 'espera um número não negativo');
  const nomesDasClasses = classes.map((c) => c.nome);
  const partes = {};
  if (!ehObjeto(config.partes) || !Object.keys(config.partes).length) recusa('partes', 'precisa ser um objeto { "parte": "classe" }');
  else for (const [p, c] of Object.entries(config.partes)) {
    if (classes.length && !nomesDasClasses.includes(c)) recusa(`partes.${p}`, `a classe "${c}" não está em cores (${nomesDasClasses.join(', ')})`);
    partes[p] = c;
  }
  let pares = [];
  if (config.dentro !== undefined) {
    if (Array.isArray(config.dentro)) {
      try { pares = normalizarPares(config.dentro); } catch (e) { recusa('dentro', e.message); }
      for (const p of pares) for (const v of p.vistas ?? []) if (!VISTAS_BANCADA[v]) recusa(`dentro.${p.contida}`, `a vista "${v}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
    } else if (!ehObjeto(config.dentro)) recusa('dentro', 'precisa ser um objeto { "contida": "continente" } ou uma lista de pares ("contida:continente" ou { "par", "vistas" })');
    else for (const [a, v] of Object.entries(config.dentro)) {
      const lista = Array.isArray(v) ? v : [v];
      if (!lista.length || lista.some((b) => typeof b !== 'string' || !b)) { recusa(`dentro.${a}`, 'espera o nome de uma parte ou uma lista deles'); continue; }
      for (const b of lista) { if (b === a) recusa(`dentro.${a}`, 'põe a parte dentro dela mesma'); else pares.push({ contida: a, continente: b, vistas: null }); }
    }
  }
  const vistasDaSobra = config.vistasDaSobra ?? [...VISTAS_DA_SOBRA];
  if (!Array.isArray(vistasDaSobra) || !vistasDaSobra.length) recusa('vistasDaSobra', 'espera uma lista de vistas');
  else for (const v of vistasDaSobra) if (!VISTAS_BANCADA[v]) recusa('vistasDaSobra', `a vista "${v}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
  const tresQuartos = config.tresQuartos ?? true;
  if (typeof tresQuartos !== 'boolean') recusa('tresQuartos', `espera true ou false e veio ${JSON.stringify(config.tresQuartos)}`);
  const toleranciaDaSobraMm = config.toleranciaDaSobraMm ?? TOLERANCIA_DA_SOBRA;
  if (!(Number.isFinite(toleranciaDaSobraMm) && toleranciaDaSobraMm >= 0)) recusa('toleranciaDaSobraMm', 'espera um número não negativo');

  const vistas = [];
  if (!ehObjeto(config.vistas) || !Object.keys(config.vistas).length) recusa('vistas', 'precisa ter pelo menos uma vista com referência');
  else {
    for (const nome of vistasPedidas ?? []) if (!(nome in config.vistas)) recusa('--vistas', `a vista "${nome}" não está na config (${Object.keys(config.vistas).join(', ')})`);
    for (const [nome, v] of Object.entries(config.vistas)) {
      if (vistasPedidas && !vistasPedidas.includes(nome)) continue;
      const campo = `vistas.${nome}`;
      if (!VISTAS_BANCADA[nome]) { recusa(campo, `a vista "${nome}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`); continue; }
      if (!ehObjeto(v)) { recusa(campo, 'precisa ser um objeto'); continue; }
      if (v.contornos !== undefined) {
        if (v.referencia !== undefined) { recusa(campo, 'tem "referencia" e "contornos"; a vista é de uma imagem ou de um arquivo de contornos'); continue; }
        const lida = lerVistaDeContornos(v, campo, pastaDaConfig, recusa);
        if (lida) vistas.push({ nome, tipo: 'contornos', ...lida, fora: typeof v.fora === 'string' ? v.fora : null, visto: typeof v.visto === 'string' ? v.visto : null });
        continue;
      }
      let referencia = null;
      const caminho = typeof v.referencia === 'string' ? resolve(pastaDaConfig, v.referencia) : null;
      if (!caminho) recusa(`${campo}.referencia`, 'falta o caminho da imagem de referência');
      else if (!existsSync(caminho)) recusa(`${campo}.referencia`, `${caminho} não existe`);
      else { try { referencia = dePng(readFileSync(caminho)); } catch (e) { recusa(`${campo}.referencia`, `${caminho} não é um PNG legível (${e.message})`); } }
      const girar = v.girar ?? 0;
      const giroValido = GIROS.includes(girar);
      if (!giroValido) recusa(`${campo}.girar`, `espera ${GIROS.join(', ')} (graus no sentido horário) e veio ${JSON.stringify(v.girar)}`);
      const espelhar = v.espelhar ?? false;
      if (typeof espelhar !== 'boolean') recusa(`${campo}.espelhar`, `espera true ou false e veio ${JSON.stringify(v.espelhar)}`);
      if (referencia && giroValido && typeof espelhar === 'boolean') {
        referencia = girarImagem(referencia, girar);
        if (espelhar) referencia = espelharImagem(referencia);
      } else if (!giroValido || typeof espelhar !== 'boolean') referencia = null;
      if (!quatro(v.caixaRef) || !(v.caixaRef[2] > v.caixaRef[0] && v.caixaRef[3] > v.caixaRef[1])) recusa(`${campo}.caixaRef`, 'espera [x0, y0, x1, y1] com x1 > x0 e y1 > y0');
      else if (referencia && (v.caixaRef[0] < 0 || v.caixaRef[1] < 0 || v.caixaRef[2] > referencia.largura || v.caixaRef[3] > referencia.altura)) {
        recusa(`${campo}.caixaRef`, `${v.caixaRef.join(',')} está fora da imagem de ${referencia.largura} x ${referencia.altura} px${girar || espelhar ? ` (já ${textoDoGiro(girar, espelhar)})` : ''}`);
      }
      const ignorar = v.ignorar ?? [];
      if (!Array.isArray(ignorar) || ignorar.some((r) => !quatro(r))) recusa(`${campo}.ignorar`, 'espera uma lista de [x0, y0, x1, y1]');
      const grade = v.grade ?? GRADE_PADRAO;
      if (!Array.isArray(grade) || grade.length !== 2) recusa(`${campo}.grade`, 'espera [colunas, linhas]');
      else { try { regioesDaGrade(100, 100, grade); } catch (e) { recusa(`${campo}.grade`, e.message); } }
      for (const t of ['fora', 'visto']) if (v[t] !== undefined && typeof v[t] !== 'string') recusa(`${campo}.${t}`, 'precisa ser um texto');
      const tol = v.toleranciaMm ?? toleranciaMm;
      if (!(Number.isFinite(tol) && tol >= 0)) recusa(`${campo}.toleranciaMm`, 'espera um número não negativo');
      const escalaVertical = v.escalaVertical ?? null;
      if (escalaVertical !== null && !(Number.isFinite(escalaVertical) && escalaVertical > 0)) recusa(`${campo}.escalaVertical`, `espera um número maior que zero (os mm por px da altura sobre os da largura) e veio ${JSON.stringify(v.escalaVertical)}`);
      vistas.push({ nome, tipo: 'imagem', referencia, caminhoDaReferencia: caminho, textoDaReferencia: v.referencia, girar, espelhar, caixaRef: v.caixaRef, ignorar, grade, fora: v.fora ?? null, visto: v.visto ?? null, toleranciaMm: tol, escalaVertical });
    }
  }
  if (recusas.length) throw new ErroDaConferencia(`a config foi recusada:\n${recusas.map((r) => `- ${r}`).join('\n')}`);
  return { objeto: config.objeto ?? null, cores: config.cores, classes, fundo, largura, partes, pares, vistasDaSobra, toleranciaDaSobraMm, tresQuartos, vistas };
}

/* o giro de uma vista em palavras, para o resumo e as recusas */
const textoDoGiro = (girar, espelhar) => [girar ? `girada ${girar} graus no sentido horário` : null, espelhar ? `espelhada na horizontal${girar ? ' depois do giro' : ''}` : null].filter(Boolean).join(' e ');

/* --- a vista só de contornos ------------------------------------------------------------------------------------------------- */
export const FORMATO_DOS_CONTORNOS = 'mecanifica.contornos@1';
/* a largura, em mm, até a qual um furo da silhueta do modelo é fenda: a de uma junta entre painéis, por onde se vê o outro lado */
export const FENDA_MAXIMA_MM = 20;
const PALETA_DOS_CONTORNOS = [[0, 90, 255], [220, 0, 40], [0, 150, 60], [200, 0, 200], [255, 130, 0], [0, 170, 190], [120, 60, 0], [90, 0, 200], [150, 150, 0], [255, 0, 120]];
const CINZA_DO_CONTORNO = [150, 150, 150];
const par = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
const trio = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/* os campos de uma vista com "contornos", conferidos; devolve null quando algum foi recusado */
function lerVistaDeContornos(v, campo, pastaDaConfig, recusa) {
  const antes = [];
  const r = (c, m) => { antes.push(c); recusa(c, m); };
  const caminho = typeof v.contornos === 'string' && v.contornos ? resolve(pastaDaConfig, v.contornos) : null;
  let regioes = null;
  if (!caminho) r(`${campo}.contornos`, 'espera o caminho de um arquivo de contornos');
  else if (!existsSync(caminho)) r(`${campo}.contornos`, `${caminho} não existe`);
  else {
    let d = null;
    try { d = JSON.parse(readFileSync(caminho, 'utf8')); } catch (e) { r(`${campo}.contornos`, `${caminho} não é JSON válido (${e.message})`); }
    if (d && (d.formato !== FORMATO_DOS_CONTORNOS || !ehObjeto(d.regioes))) r(`${campo}.contornos`, `${caminho} não é um ${FORMATO_DOS_CONTORNOS} com "regioes"`);
    else if (d) {
      regioes = {};
      for (const [nome, g] of Object.entries(d.regioes)) {
        const pedacos = (Array.isArray(g?.pedacos) ? g.pedacos : []).map((q) => q?.contornoMm).filter((c) => Array.isArray(c) && c.length >= 3 && c.every(par));
        if (!pedacos.length) { r(`${campo}.contornos`, `a parte "${nome}" do arquivo não tem pedaço com contornoMm de pelo menos três pontos`); continue; }
        regioes[nome] = pedacos;
      }
    }
  }
  const escala = v.escala ?? 1;
  if (!(Number.isFinite(escala) && escala > 0)) r(`${campo}.escala`, `espera um número maior que zero (mm do modelo por mm do contorno) e veio ${JSON.stringify(v.escala)}`);
  const ancora = v.ancora ?? { contorno: [0, 0], modelo: [0, 0, 0] };
  if (!ehObjeto(ancora) || !par(ancora.contorno) || !trio(ancora.modelo)) r(`${campo}.ancora`, 'espera { "contorno": [x, y], "modelo": [x, y, z] }');
  const espelhar = v.espelhar ?? false;
  if (typeof espelhar !== 'boolean') r(`${campo}.espelhar`, `espera true ou false e veio ${JSON.stringify(v.espelhar)}`);
  const partes = {};
  if (!ehObjeto(v.partes) || !Object.keys(v.partes).length) r(`${campo}.partes`, 'espera { "parte do arquivo": "parte do modelo" | ["parte", ...] } com pelo menos uma parte');
  else for (const [regiao, alvo] of Object.entries(v.partes)) {
    const lista = Array.isArray(alvo) ? alvo : [alvo];
    if (!lista.length || lista.some((x) => typeof x !== 'string' || !x)) { r(`${campo}.partes.${regiao}`, 'espera o nome de uma parte do modelo ou uma lista deles'); continue; }
    const doArquivo = regiao.split('+').map((x) => x.trim());
    const faltam = regioes ? doArquivo.filter((x) => !regioes[x]) : [];
    if (faltam.length) { r(`${campo}.partes.${regiao}`, `o arquivo não tem ${faltam.length === 1 ? 'a parte' : 'as partes'} ${faltam.map((x) => `"${x}"`).join(', ')} (${Object.keys(regioes).join(', ')})`); continue; }
    partes[regiao] = [...lista];
  }
  const ignorarRegioes = v.ignorarRegioes ?? [];
  if (!Array.isArray(ignorarRegioes) || ignorarRegioes.some((x) => typeof x !== 'string')) r(`${campo}.ignorarRegioes`, 'espera uma lista de partes do arquivo');
  else if (regioes) for (const x of ignorarRegioes) if (!regioes[x]) r(`${campo}.ignorarRegioes`, `o arquivo não tem a parte "${x}"`);
  if (regioes && Array.isArray(ignorarRegioes)) for (const x of ignorarRegioes) if (Object.keys(partes).some((k) => k.split('+').map((y) => y.trim()).includes(x))) r(`${campo}.ignorarRegioes`, `a parte "${x}" está em "partes" e no ignorado`);
  /* as partes do modelo que a referência não tem (o chassi sob a lataria): saem da silhueta do modelo e da conta, cada grupo com o motivo */
  const foraDaConta = v.foraDaConta ?? [];
  if (!Array.isArray(foraDaConta)) r(`${campo}.foraDaConta`, 'espera uma lista de { partes: [...], motivo }');
  else foraDaConta.forEach((g, i) => {
    const onde = `${campo}.foraDaConta[${i}]`;
    if (!ehObjeto(g) || !Array.isArray(g.partes) || !g.partes.length || g.partes.some((x) => typeof x !== 'string' || !x)) r(onde, 'espera { partes: [nome, ...], motivo } com pelo menos uma parte');
    else if (typeof g.motivo !== 'string' || !g.motivo.trim()) r(`${onde}.motivo`, 'espera o texto que diz por que a referência não tem essas partes');
  });
  const fendaMm = v.fendaMm ?? FENDA_MAXIMA_MM;
  if (!(Number.isFinite(fendaMm) && fendaMm > 0)) r(`${campo}.fendaMm`, `espera a largura máxima de uma fenda, em mm, maior que zero (veio ${JSON.stringify(v.fendaMm)})`);
  for (const t of ['fora', 'visto']) if (v[t] !== undefined && typeof v[t] !== 'string') r(`${campo}.${t}`, 'precisa ser um texto');
  for (const c of ['caixaRef', 'ignorar', 'girar', 'grade', 'escalaVertical']) if (v[c] !== undefined) r(`${campo}.${c}`, 'não vale numa vista só de contornos, que não tem imagem');
  if (antes.length) return null;
  return { caminhoDosContornos: caminho, textoDosContornos: v.contornos, regioes, escala, ancora: { contorno: [...ancora.contorno], modelo: [...ancora.modelo] }, espelhar, partes, ignorarRegioes: [...ignorarRegioes], foraDaConta: foraDaConta.map((g) => ({ partes: [...g.partes], motivo: g.motivo })), fendaMm };
}

/** A máscara de um polígono em px (pares [x, y]), pelo centro de cada pixel e pela regra par-ímpar, somada a `mascara`. */
export function preencherPoligono(mascara, L, A, pts) {
  let ya = Infinity; let yb = -Infinity;
  for (const [, y] of pts) { if (y < ya) ya = y; if (y > yb) yb = y; }
  const cortes = [];
  for (let y = Math.max(0, Math.floor(ya)); y <= Math.min(A - 1, Math.ceil(yb)); y += 1) {
    const cy = y + 0.5; cortes.length = 0;
    for (let i = 0; i < pts.length; i += 1) {
      const [x1, y1] = pts[i]; const [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= cy) !== (y2 <= cy)) cortes.push(x1 + ((cy - y1) * (x2 - x1)) / (y2 - y1));
    }
    cortes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cortes.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(cortes[k] - 0.5)); x <= Math.min(L - 1, Math.floor(cortes[k + 1] - 0.5)); x += 1) mascara[y * L + x] = 1;
    }
  }
  return mascara;
}

/**
 * Os furos de uma máscara: o fundo que não alcança a moldura da imagem. Devolve `{ cheia, furos }`, a máscara com os furos preenchidos e a
 * lista de furos, cada um com os índices dos pixels dele.
 */
export function furosDaMascara(m, L, A) {
  const visto = new Uint8Array(L * A); const pilha = [];
  const empurra = (i) => { if (!m[i] && !visto[i]) { visto[i] = 1; pilha.push(i); } };
  for (let x = 0; x < L; x += 1) { empurra(x); empurra((A - 1) * L + x); }
  for (let y = 0; y < A; y += 1) { empurra(y * L); empurra(y * L + L - 1); }
  while (pilha.length) {
    const i = pilha.pop(); const x = i % L; const y = (i - x) / L;
    if (x > 0) empurra(i - 1); if (x < L - 1) empurra(i + 1); if (y > 0) empurra(i - L); if (y < A - 1) empurra(i + L);
  }
  const cheia = Uint8Array.from(m); const furos = [];
  for (let i = 0; i < m.length; i += 1) {
    if (m[i] || visto[i] || cheia[i]) continue;
    const fila = [i]; const pixels = []; cheia[i] = 1;
    while (fila.length) {
      const j = fila.pop(); pixels.push(j); const x = j % L; const y = (j - x) / L;
      for (const k of [x > 0 ? j - 1 : -1, x < L - 1 ? j + 1 : -1, y > 0 ? j - L : -1, y < A - 1 ? j + L : -1]) if (k >= 0 && !m[k] && !cheia[k]) { cheia[k] = 1; fila.push(k); }
    }
    furos.push(pixels);
  }
  return { cheia, furos };
}

/* o eixo do modelo que uma direção da vista segue, com o sinal: (0, 0, -1) é "-z"; a direção oblíqua fica sem eixo */
function eixoDaDirecao(d) {
  const i = d.findIndex((c) => Math.abs(c) > 0.999);
  return i < 0 ? null : { nome: 'xyz'[i], sinal: Math.sign(d[i]) };
}

/**
 * A comparação da silhueta do modelo com a das partes de um arquivo de contornos, numa vista. `faces` no formato de `facesDoNeutro`,
 * `partes` os nomes da opção, `v` a vista lida de "contornos". Devolve as medidas do conjunto e de cada parte mapeada, e o raster.
 */
export function medirContornos({ faces: todasAsFaces, partes, vista, largura, v }) {
  const { direita, cima } = baseDaVista(vista);
  /* as partes fora da conta não entram na silhueta: sem o chassi atrás, a junta entre dois painéis é um furo e não o chassi cinza */
  const foraDaConta = new Set((v.foraDaConta ?? []).flatMap((g) => g.partes));
  const indiceDasFora = new Set(partes.map((n, i) => (foraDaConta.has(n) ? i + 1 : 0)).filter(Boolean));
  const faces = indiceDasFora.size ? todasAsFaces.filter((f) => !indiceDasFora.has(f.parte)) : todasAsFaces;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ua = dot(v.ancora.modelo, direita); const va = dot(v.ancora.modelo, cima);
  const sx = v.espelhar ? -1 : 1; const [cx, cy] = v.ancora.contorno;
  const naVista = ([x, y]) => [ua + v.escala * sx * (x - cx), va + v.escala * (y - cy)];
  const ignoradas = new Set(v.ignorarRegioes);
  const poligonos = Object.fromEntries(Object.entries(v.regioes).map(([n, ps]) => [n, ps.map((p) => p.map(naVista))]));
  /* o quadro: o do modelo somado ao dos contornos que entram, com 2% de folga em volta */
  const q = quadroDaVista(faces, vista);
  for (const [n, ps] of Object.entries(poligonos)) if (!ignoradas.has(n)) for (const p of ps) for (const [u, w] of p) { q.u0 = Math.min(q.u0, u); q.u1 = Math.max(q.u1, u); q.v0 = Math.min(q.v0, w); q.v1 = Math.max(q.v1, w); }
  const folga = 0.02 * Math.max(q.u1 - q.u0, q.v1 - q.v0);
  const quadro = { u0: q.u0 - folga, u1: q.u1 + folga, v0: q.v0 - folga, v1: q.v1 + folga };
  const r = rasterizar(faces, vista, largura, quadro);
  const { largura: L, altura: A, mmPorPx: mm } = r;
  const emPx = ([u, w]) => [(u - quadro.u0) / mm, (quadro.v1 - w) / mm];
  const mascaraDe = (nomes) => { const m = new Uint8Array(L * A); for (const n of nomes) for (const p of poligonos[n]) preencherPoligono(m, L, A, p.map(emPx)); return m; };
  const eh = eixoDaDirecao(direita); const ev = eixoDaDirecao(cima);
  const eixos = { horizontal: eh ? `${eh.sinal < 0 ? '-' : ''}${eh.nome}` : 'u', vertical: ev ? `${ev.sinal < 0 ? '-' : ''}${ev.nome}` : 'v' };
  /* do pixel ao ponto do modelo nos eixos dele */
  const nosEixos = (u, w) => ({ [eh?.nome ?? 'u']: (eh?.sinal ?? 1) * u, [ev?.nome ?? 'v']: (ev?.sinal ?? 1) * w });
  const intervalo = (a, b, e) => (e && e.sinal < 0 ? [-b, -a] : [a, b]);
  /* os furos estreitos da silhueta do modelo, por onde se vê o outro lado: posição, largura e comprimento em mm; o furo mais largo só se conta */
  const fendasDoModelo = (mod) => {
    const { furos } = furosDaMascara(mod, L, A);
    if (!furos.length) return { estreitas: [], largas: 0, limiteMm: v.fendaMm ?? FENDA_MAXIMA_MM };
    const d2 = distanciaAoConjunto(mod, L, A);
    const limiteMm = v.fendaMm ?? FENDA_MAXIMA_MM; const estreitas = []; let largas = 0;
    for (const pixels of furos) {
      let rmax = 0; let sx = 0; let sy = 0; let x0 = L; let x1 = -1; let y0 = A; let y1 = -1;
      for (const i of pixels) {
        const x = i % L; const y = (i - x) / L;
        if (d2[i] > rmax) rmax = d2[i];
        sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      /* a largura é a maior entre a dobra da maior distância ao modelo e a área sobre o comprimento, a que a junta reta dá certo */
      const comprimentoMm = Math.max(x1 - x0 + 1, y1 - y0 + 1) * mm; const areaMm2 = pixels.length * mm * mm;
      const larguraMm = Math.max(Math.max(1, 2 * Math.sqrt(rmax) - 1) * mm, areaMm2 / comprimentoMm);
      if (larguraMm > limiteMm) { largas += 1; continue; }
      estreitas.push({ em: nosEixos(quadro.u0 + (sx / pixels.length + 0.5) * mm, quadro.v1 - (sy / pixels.length + 0.5) * mm), larguraMm, comprimentoMm, areaMm2 });
    }
    estreitas.sort((a, b) => b.comprimentoMm - a.comprimentoMm);
    return { estreitas, largas, limiteMm };
  };
  const medir = (mod, ref, { comFendas = false } = {}) => {
    let inter = 0; let uni = 0; let x0 = L; let x1 = -1; let y0 = A; let y1 = -1;
    const caixa = (m) => { let a = L; let b = -1; let c = A; let d = -1; for (let i = 0; i < m.length; i += 1) if (m[i]) { const x = i % L; const y = (i - x) / L; if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; } return b < 0 ? null : [a, c, b, d]; };
    let nSobra = 0; let nFalta = 0;
    for (let i = 0; i < mod.length; i += 1) { if (mod[i] && ref[i]) inter += 1; if (mod[i] || ref[i]) uni += 1; if (mod[i] && !ref[i]) nSobra += 1; if (ref[i] && !mod[i]) nFalta += 1; }
    const cm = caixa(mod); const cr = caixa(ref);
    const emMm = (c) => (c ? { u0: quadro.u0 + c[0] * mm, u1: quadro.u0 + (c[2] + 1) * mm, v0: quadro.v1 - (c[3] + 1) * mm, v1: quadro.v1 - c[1] * mm } : null);
    const bm = emMm(cm); const br = emMm(cr);
    const caixaNosEixos = (b) => (b ? { [eh?.nome ?? 'u']: intervalo(b.u0, b.u1, eh), [ev?.nome ?? 'v']: intervalo(b.v0, b.v1, ev) } : null);
    const sai = { sobreposicao: uni ? inter / uni : 0, sobraMm2: (nSobra) * mm * mm, faltaMm2: nFalta * mm * mm, areaModeloMm2: 0, areaReferenciaMm2: 0, caixaModelo: caixaNosEixos(bm), caixaReferencia: caixaNosEixos(br), lados: null, afastamento: null };
    let nm = 0; let nr = 0; for (let i = 0; i < mod.length; i += 1) { nm += mod[i]; nr += ref[i]; }
    sai.areaModeloMm2 = nm * mm * mm; sai.areaReferenciaMm2 = nr * mm * mm;
    if (comFendas) sai.fendas = fendasDoModelo(mod);
    if (!bm || !br) return sai;
    sai.lados = { esquerda: br.u0 - bm.u0, direita: bm.u1 - br.u1, baixo: br.v0 - bm.v0, cima: bm.v1 - br.v1 };
    /* o afastamento, no recorte que cobre as duas caixas: a borda de cada uma até a borda da outra */
    x0 = Math.min(cm[0], cr[0]); y0 = Math.min(cm[1], cr[1]); x1 = Math.max(cm[2], cr[2]); y1 = Math.max(cm[3], cr[3]);
    const l = x1 - x0 + 1; const a = y1 - y0 + 1;
    const borda = (m) => {
      const b = new Uint8Array(l * a);
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
        const i = y * L + x;
        if (!m[i]) continue;
        if (x === 0 || y === 0 || x === L - 1 || y === A - 1 || !m[i - 1] || !m[i + 1] || !m[i - L] || !m[i + L]) b[(y - y0) * l + (x - x0)] = 1;
      }
      return b;
    };
    /* o afastamento mede só o contorno de fora da silhueta: o furo do modelo (a junta entre painéis) sai nas fendas, e o da referência (a janela) não conta */
    const em = borda(furosDaMascara(mod, L, A).cheia); const er = borda(furosDaMascara(ref, L, A).cheia);
    const longe = (de, ate) => {
      const d2 = distanciaAoConjunto(ate, l, a); let max = -1; let onde = 0;
      for (let i = 0; i < de.length; i += 1) if (de[i] && d2[i] > max) { max = d2[i]; onde = i; }
      const x = x0 + (onde % l); const y = y0 + Math.floor(onde / l);
      return { mm: Math.sqrt(max) * mm, em: nosEixos(quadro.u0 + (x + 0.5) * mm, quadro.v1 - (y + 0.5) * mm) };
    };
    const doModelo = longe(em, er); const daReferencia = longe(er, em);
    sai.afastamento = { doModelo, daReferencia, maior: doModelo.mm >= daReferencia.mm ? { ...doModelo, de: 'modelo' } : { ...daReferencia, de: 'referencia' } };
    return sai;
  };
  const indice = new Map(partes.map((n, i) => [n, i + 1]));
  const mascaraDoModelo = (nomes) => { const ks = new Set(nomes.map((n) => indice.get(n))); const m = new Uint8Array(L * A); for (let i = 0; i < m.length; i += 1) if (ks.has(r.parte[i])) m[i] = 1; return m; };
  const todasDoModelo = new Uint8Array(L * A); for (let i = 0; i < todasDoModelo.length; i += 1) if (r.parte[i]) todasDoModelo[i] = 1;
  const entram = Object.keys(poligonos).filter((n) => !ignoradas.has(n));
  const conjunto = medir(todasDoModelo, mascaraDe(entram), { comFendas: true });
  const porParte = Object.fromEntries(Object.entries(v.partes).map(([regiao, lista]) => [regiao, { partes: lista, ...medir(mascaraDoModelo(lista), mascaraDe(regiao.split('+').map((x) => x.trim()))) }]));
  return { largura: L, altura: A, mmPorPx: mm, quadro, eixos, conjunto, partes: porParte, raster: r, poligonosEmPx: Object.fromEntries(entram.map((n) => [n, poligonos[n].map((p) => p.map(emPx))])) };
}

/* uma linha grossa de (xa, ya) a (xb, yb), em px */
function traco(im, xa, ya, xb, yb, cor, espessura = 2) {
  const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, yb - ya)));
  for (let k = 0; k <= n; k += 1) {
    const x = Math.round(xa + ((xb - xa) * k) / n); const y = Math.round(ya + ((yb - ya) * k) / n);
    for (let dy = 0; dy < espessura; dy += 1) for (let dx = 0; dx < espessura; dx += 1) {
      const px = x + dx - (espessura >> 1); const py = y + dy - (espessura >> 1);
      if (px < 0 || py < 0 || px >= im.largura || py >= im.altura) continue;
      im.dados.set(cor, (py * im.largura + px) * 3);
    }
  }
}

/**
 * O desenho da vista só de contornos: o modelo na cor da classe de cada parte, clareada, com o contorno e a divisa dele em cinza
 * escuro, e por cima o contorno de cada parte do arquivo, na cor da paleta as mapeadas (com o número dela na ordem de "partes", que
 * o resumo repete, porque a fonte do desenho não tem todas as letras) e em cinza as que só entram no conjunto.
 */
export function desenharContornos(m, { partes, classeDaParte, cores, mapeadas }) {
  const { largura: L, altura: A, raster: r } = m;
  const im = imagem(L, A);
  const cor = [[255, 255, 255], ...partes.map((p) => rgbDoHex(cores[classeDaParte[p]] ?? '#8c8c8c'))];
  const linhas = linhasDoRaster(r);
  for (let i = 0; i < L * A; i += 1) {
    const k = r.parte[i];
    if (!k) continue;
    const c = cor[k] ?? [140, 140, 140];
    const escuro = linhas[i] === LINHA.contorno || linhas[i] === LINHA.divisa;
    im.dados.set(escuro ? [70, 70, 70] : c.map((x) => Math.round(x * 0.45 + 255 * 0.55)), i * 3);
  }
  const nomes = Object.keys(m.poligonosEmPx);
  /* a entrada de "partes" de cada parte do arquivo ("lateral+piso" junta duas), a primeira que a cita */
  const entrada = new Map(); mapeadas.forEach((k, i) => { for (const n of k.split('+').map((x) => x.trim())) if (!entrada.has(n)) entrada.set(n, i); });
  const corDe = (n) => (entrada.has(n) ? PALETA_DOS_CONTORNOS[entrada.get(n) % PALETA_DOS_CONTORNOS.length] : CINZA_DO_CONTORNO);
  const espessura = Math.max(2, Math.round(L / 600));
  for (const n of [...nomes.filter((x) => !entrada.has(x)), ...nomes.filter((x) => entrada.has(x))]) {
    for (const p of m.poligonosEmPx[n]) for (let i = 0; i < p.length; i += 1) traco(im, p[i][0], p[i][1], p[(i + 1) % p.length][0], p[(i + 1) % p.length][1], corDe(n), entrada.has(n) ? espessura : 1);
  }
  for (const n of nomes.filter((x) => entrada.has(x))) {
    let xa = Infinity; let ya = Infinity;
    for (const p of m.poligonosEmPx[n]) for (const [x, y] of p) { if (y < ya || (y === ya && x < xa)) { ya = y; xa = x; } }
    escrever(im, String(entrada.get(n) + 1), Math.max(0, Math.round(xa)), Math.max(0, Math.round(ya) - 16), corDe(n), 2);
  }
  return im;
}

/* os números de uma medida de contornos para o JSON, arredondados */
function medidaParaJson(x) {
  const um = (y) => arredonda(y, 1) || 0;
  const r1 = (o) => (o ? Object.fromEntries(Object.entries(o).map(([k, w]) => [k, Array.isArray(w) ? w.map(um) : um(w)])) : null);
  const ponto = (a) => (a ? { mm: arredonda(a.mm, 1), em: r1(a.em), ...(a.de ? { de: a.de } : {}) } : null);
  return {
    sobreposicao: arredonda(x.sobreposicao, 4),
    sobraMm2: Math.round(x.sobraMm2), sobraDaReferencia: arredonda(x.areaReferenciaMm2 ? x.sobraMm2 / x.areaReferenciaMm2 : 0, 4),
    faltaMm2: Math.round(x.faltaMm2), faltaDaReferencia: arredonda(x.areaReferenciaMm2 ? x.faltaMm2 / x.areaReferenciaMm2 : 0, 4),
    areaModeloMm2: Math.round(x.areaModeloMm2), areaReferenciaMm2: Math.round(x.areaReferenciaMm2),
    caixaModelo: r1(x.caixaModelo), caixaReferencia: r1(x.caixaReferencia), lados: r1(x.lados),
    afastamento: x.afastamento ? { maior: ponto(x.afastamento.maior), doModelo: ponto(x.afastamento.doModelo), daReferencia: ponto(x.afastamento.daReferencia) } : null,
    ...(x.fendas ? { fendas: { limiteMm: x.fendas.limiteMm, largas: x.fendas.largas, estreitas: x.fendas.estreitas.map((f) => ({ em: r1(f.em), larguraMm: arredonda(f.larguraMm, 1), comprimentoMm: Math.round(f.comprimentoMm), areaMm2: Math.round(f.areaMm2) })) } } : {}),
  };
}

/* a frase das fendas do conjunto: quantas, e as maiores com a posição e a largura */
function fraseDasFendas(f) {
  if (!f) return '';
  const n0 = (w) => `${Math.round(w) || 0}`;
  const onde = (o) => Object.entries(o).map(([e, w]) => `${e} ${n0(w)}`).join(', ');
  if (!f.estreitas.length) return `Nenhuma fenda de até ${f.limiteMm} mm na silhueta do modelo${f.largas ? `; ${f.largas} furo(s) mais largo(s)` : ''}.`;
  const maiores = f.estreitas.slice(0, 5).map((x) => `${n0(x.comprimentoMm)} mm de comprimento e ${x.larguraMm.toFixed(1)} mm de largura em ${onde(x.em)}`);
  return `${f.estreitas.length} fenda(s) de até ${f.limiteMm} mm na silhueta do modelo, por onde se vê o outro lado${f.largas ? ` (e ${f.largas} furo(s) mais largo(s))` : ''}; as ${Math.min(5, f.estreitas.length)} mais compridas: ${maiores.join('; ')}.`;
}

/* a frase de uma medida de contornos para o resumo */
function fraseDosContornos(x) {
  const n0 = (w) => `${Math.round(w) || 0}`;
  const mm = (w) => `${Math.round(w) >= 0 ? '+' : ''}${n0(w)}`;
  const caixa = (c) => Object.entries(c).map(([e, [a, b]]) => `${e} ${n0(a)} a ${n0(b)}`).join(', ');
  const onde = (o) => Object.entries(o).map(([e, w]) => `${e} ${n0(w)}`).join(', ');
  if (!x.caixaModelo || !x.caixaReferencia) return `sobreposição ${pct(x.sobreposicao)}; ${x.caixaModelo ? 'a referência' : 'o modelo'} não tem pixel nesta vista.`;
  const a = x.afastamento.maior;
  const area = (m2, f) => `${Math.round(m2)} mm² (${pct(x.areaReferenciaMm2 ? f : 0)} da área da referência)`;
  return `sobreposição ${pct(x.sobreposicao)}, sobra ${area(x.sobraMm2, x.areaReferenciaMm2 ? x.sobraMm2 / x.areaReferenciaMm2 : 0)} e falta ${area(x.faltaMm2, x.areaReferenciaMm2 ? x.faltaMm2 / x.areaReferenciaMm2 : 0)}; caixa do modelo ${caixa(x.caixaModelo)} e da referência ${caixa(x.caixaReferencia)} mm, o modelo passa ${mm(x.lados.esquerda)} à esquerda, ${mm(x.lados.direita)} à direita, ${mm(x.lados.baixo)} embaixo e ${mm(x.lados.cima)} em cima; maior afastamento ${a.mm.toFixed(0)} mm em ${onde(a.em)}, ${a.de === 'modelo' ? 'do contorno do modelo até o da referência' : 'do contorno da referência até o do modelo'} (só o contorno de fora da silhueta).`;
}

/**
 * Confere as partes da config contra as da opção montada, nos dois sentidos: a parte declarada em `partes` que a opção não tem (a que
 * um comentário mal fechado no módulo engoliu) e a parte da opção sem classe; e o par de `dentro` sem parte.
 */
export function conferirPartes(cfg, partesDaOpcao) {
  const recusas = [];
  const sumidas = Object.keys(cfg.partes).filter((p) => !partesDaOpcao.includes(p));
  if (sumidas.length) recusas.push(`partes: a opção montada não tem ${sumidas.length === 1 ? 'a parte' : 'as partes'} ${sumidas.join(', ')}, que a config declara; as partes da opção são ${partesDaOpcao.join(', ') || 'nenhuma'}`);
  const semClasse = partesDaOpcao.filter((p) => cfg.partes[p] === undefined);
  if (semClasse.length) recusas.push(`partes: falta a classe de ${semClasse.join(', ')}`);
  for (const { contida, continente } of cfg.pares) for (const p of [contida, continente]) if (!partesDaOpcao.includes(p)) recusas.push(`dentro.${contida}: a parte "${p}" não existe na opção (${partesDaOpcao.join(', ')})`);
  for (const v of cfg.vistas) if (v.tipo === 'contornos') {
    for (const [regiao, lista] of Object.entries(v.partes)) for (const p of lista) if (!partesDaOpcao.includes(p)) recusas.push(`vistas.${v.nome}.partes.${regiao}: a parte "${p}" não existe na opção (${partesDaOpcao.join(', ')})`);
    for (const g of v.foraDaConta ?? []) for (const p of g.partes) {
      if (!partesDaOpcao.includes(p)) recusas.push(`vistas.${v.nome}.foraDaConta: a parte "${p}" não existe na opção (${partesDaOpcao.join(', ')})`);
      else if (Object.values(v.partes).some((l) => l.includes(p))) recusas.push(`vistas.${v.nome}.foraDaConta: a parte "${p}" está em "partes" e fora da conta`);
    }
  }
  if (recusas.length) throw new ErroDaConferencia(`a config foi recusada:\n${[...new Set(recusas)].map((r) => `- ${r}`).join('\n')}`);
}

/* --- a rodada ------------------------------------------------------------------------------------------------------------------- */
const arredonda = (v, casas = 2) => Number(v.toFixed(casas));
const pct = (v) => `${(v * 100).toFixed(1)}%`;

/* a captura de uma vista, com até TENTATIVAS_DE_CAPTURA tentativas; devolve a imagem ou o motivo da falha */
async function capturar(capturador, painel, vista, saida, titulo) {
  let motivo = null;
  for (let k = 1; k <= TENTATIVAS_DE_CAPTURA; k += 1) {
    try {
      await capturador({ paineis: [{ ...painel, rotulos: null }], vista, saida, titulo, cores: false, rodape: 'Captura da conferência das vistas, com a cor dos materiais e a luz da bancada.' });
      return { imagem: dePng(readFileSync(saida)), motivo: null };
    } catch (e) { motivo = String(e?.message ?? e).split('\n')[0]; }
  }
  return { imagem: null, motivo: `a captura falhou ${TENTATIVAS_DE_CAPTURA} vezes (${motivo})` };
}

/* as faces da vista rápida: a cor que o esboço pinta em cada parte e, na parte que sai sem cor (cinza), a da classe dela na config */
function facesDaVistaRapida(cfg, painel) {
  const semCor = Object.entries(coresDasPartes(painel.neutro, painel.partes)).filter(([, c]) => c.origem === 'cinza').map(([n]) => n);
  const sobrepor = Object.fromEntries(semCor.filter((n) => cfg.partes[n] !== undefined).map((n) => [n, cfg.cores[cfg.partes[n]]]));
  return facesDaOpcao(painel.neutro, sobrepor);
}

/* a vista rápida gravada em png; devolve a imagem ou o motivo da falha */
function capturarRapida(facesRapidas, direcao, largura, saida) {
  try {
    const r = rasterSombreado(facesRapidas, { direcao: [...direcao], largura });
    writeFileSync(saida, paraPng(r.imagem));
    return { imagem: r.imagem, motivo: null };
  } catch (e) { return { imagem: null, motivo: `a vista rápida falhou (${String(e?.message ?? e).split('\n')[0]})` }; }
}

/* a frase do cabeçalho e do fim do resumo sobre a pasta da rodada seguinte */
const MESMA_PASTA = (pasta) => `A rodada seguinte usa a mesma pasta (${pasta}): as imagens são regravadas e rodadas/ de cada vista se acumula, de onde saem o número da rodada registrada e a checagem de contradição com a anterior; numa pasta nova, passe --rodadas-de=${pasta}.`;
/* os arquivos de rodada de uma pasta rodadas/, em ordem */
const rodadasEm = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => /^rodada-\d+\.json$/.test(f)).sort() : []);

const ORIGEM_DA_CAPTURA = {
  rapida: 'da vista rápida (vista-rapida.mjs), desenhada da malha sem navegador, com luz e material simplificados',
  bancada: 'da bancada pelo navegador, com a cor dos materiais e a luz dela',
};

/* o texto acrescentado ao fim do pedido: a ordem sugerida, sem os números */
function ordemNoPedido(ordem, semCaptura) {
  return `${semCaptura ? `
Nesta rodada não houve captura com luz: o painel RASCUNHO mostra o mesmo desenho de linhas do modelo, sobre branco, no lugar do
rascunho. Leia a forma pelo contorno e pelas divisas dele.
` : ''}
Ordem sugerida para ler as regiões, da que a medida acha mais diferente da referência para a que acha menos: ${ordem.join(', ')}.
A ordem só diz por onde começar; responda todas as regiões do mesmo jeito.
`;
}

/** A frase de números de uma região do casamento, para o resumo. */
function frasesDaRegiao(r) {
  const mm = (c) => (c.maiorMm === null ? 'sem px' : `${c.fora} de ${c.px} px fora da tolerância, máximo ${c.maiorMm} mm`);
  const pares = r.troca.pares.map((p) => `${p.referencia} na referência e ${p.modelo} no modelo em ${pct(p.fracao)}`).join('; ');
  return `${r.nome}, nota ${r.nota.toFixed(2)}. Troca de classe em ${pct(r.troca.fracao)} da região${pares ? ` (${pares})` : ''}. Linha sem borda: ${mm(r.linhaSemBorda)}. Borda sem linha: ${mm(r.bordaSemLinha)}.`;
}

/**
 * A rodada. `deps` troca a leitura, a montagem e a captura (o teste conta as montagens e roda sem navegador).
 * @returns {Promise<{ resumo: object, gravados: string[], linhas: string[] }>}
 */
export async function conferirVistas({ arquivo, cfg, saida, opcao = 1, captura: modo = 'rapida', rodadasDe = null, atePasso = null, composicoes = null }, deps = {}) {
  if (!CAPTURAS.includes(modo)) throw new ErroDaConferencia(`--captura espera ${CAPTURAS.join(', ')} e veio "${modo}"`);
  const t0 = performance.now();
  /* `deps` troca a montagem nos testes; sem ela o alvo abre por `modelo-aberto.mjs`, que aceita o esboço e a receita de peça (nome ou caminho) */
  const montado = deps.lerArquivoDeEsboco && deps.montarOpcoes
    ? deps.montarOpcoes(await deps.lerArquivoDeEsboco(resolve(arquivo)), { nome: basename(arquivo), relato: false })
    : await abrirModelo(arquivo, { ateOPasso: atePasso, composicoes, relato: false });
  if (montado.origem === 'receita' && modo === 'bancada') throw new ErroDaConferencia('--captura=bancada abre o esboço lado a lado na bancada e não abre receita de peça; use --captura=rapida (o padrão), ou tire a vista da peça com olhar:bancada');
  const capturador = deps.capturarLadoALado ?? (modo === 'bancada' ? (await import('./esboco-nucleo.mjs')).capturarLadoALado : null);
  const tempoDaMontagem = (performance.now() - t0) / 1000;
  if (montado.recusas?.length) throw new ErroDaConferencia(`o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r.motivo ?? r}`).join('\n')}`, 1);
  const painel = montado.paineis[opcao - 1];
  if (!painel) throw new ErroDaConferencia(`o esboço tem ${montado.paineis.length} opções e veio --opcao=${opcao}`);
  conferirPartes(cfg, painel.partes);
  const faces = facesDoNeutro(painel.neutro, painel.partes);
  const facesRapidas = modo === 'rapida' || cfg.tresQuartos ? facesDaVistaRapida(cfg, painel) : null;
  const pasta = resolve(saida); mkdirSync(pasta, { recursive: true });
  const gravados = []; const linhas = [];
  const rel = (p) => relative(pasta, p).replaceAll('\\', '/');
  const resumo = { formato: FORMATO, esboco: arquivo, opcao, titulo: painel.titulo, nota: 'o número ordena as regiões e informa; quem aprova forma é a pessoa', captura: modo, vistas: {}, tresQuartos: [], sobras: [] };
  const md = [`# Conferência das vistas`, '',
    `Esboço ${arquivo}, opção ${opcao} (${painel.titulo}), montada uma vez para a rodada inteira. O número ordena as regiões e diz onde olhar primeiro; quem aprova forma é a pessoa.`, '',
    MESMA_PASTA(pasta), ''];
  /* as rodadas de uma conferência anterior, copiadas antes da leitura, que tira delas as aceitas do pedido */
  if (rodadasDe) {
    const copiadas = [];
    for (const v of cfg.vistas) {
      const de = join(resolve(rodadasDe), v.nome, 'rodadas'); const para = join(pasta, v.nome, 'rodadas');
      if (resolve(de) === resolve(para) || !existsSync(de) || rodadasEm(para).length) continue;
      const nomes = rodadasEm(de);
      if (!nomes.length) continue;
      mkdirSync(para, { recursive: true });
      for (const f of nomes) cpSync(join(de, f), join(para, f));
      copiadas.push({ vista: v.nome, rodadas: nomes.length });
    }
    resumo.rodadasDe = { pasta: rodadasDe, copiadas };
    md.push(copiadas.length
      ? `As rodadas registradas vieram de ${resolve(rodadasDe)}: ${copiadas.map((c) => `${c.rodadas} da vista ${c.vista}`).join(', ')}.`
      : `Nenhuma rodada veio de ${resolve(rodadasDe)}: lá não havia rodadas das vistas desta conferência, ou a pasta nova já tinha as suas.`, '');
  }

  for (const v of cfg.vistas) {
    const dir = join(pasta, v.nome); mkdirSync(dir, { recursive: true });
    if (v.tipo === 'contornos') {
      const c = medirContornos({ faces, partes: painel.partes, vista: v.nome, largura: cfg.largura, v });
      const arq = { desenho: join(dir, 'contornos.png'), json: join(dir, 'contornos.json') };
      writeFileSync(arq.desenho, paraPng(desenharContornos(c, { partes: painel.partes, classeDaParte: cfg.partes, cores: cfg.cores, mapeadas: Object.keys(v.partes) })));
      const partesJson = Object.fromEntries(Object.entries(c.partes).map(([n, x], k) => [n, { numero: k + 1, partes: x.partes, ...medidaParaJson(x) }]));
      const numero = Object.fromEntries(Object.keys(c.partes).map((n, k) => [n, k + 1]));
      const dados = {
        tipo: 'contornos', contornos: v.textoDosContornos, escala: v.escala, ancora: v.ancora, espelhar: v.espelhar, ignorarRegioes: v.ignorarRegioes, foraDaConta: v.foraDaConta,
        mmPorPx: arredonda(c.mmPorPx, 3), eixos: c.eixos, conjunto: medidaParaJson(c.conjunto), partes: partesJson,
        arquivos: { contornos: rel(arq.desenho), json: rel(arq.json) },
      };
      writeFileSync(arq.json, `${JSON.stringify({ formato: FORMATO, esboco: arquivo, opcao, vista: v.nome, ...dados }, null, 1)}\n`);
      gravados.push(arq.desenho, arq.json);
      resumo.vistas[v.nome] = dados;
      const ordem = Object.entries(c.partes).sort((a, b) => (b[1].afastamento?.maior.mm ?? Infinity) - (a[1].afastamento?.maior.mm ?? Infinity));
      md.push(`## Vista ${v.nome}, só de contornos`, '',
        `A referência desta vista é o arquivo de contornos ${v.textoDosContornos}, sem imagem: não há casamento, captura nem pedido ao crítico. O contorno foi levado ao modelo na escala ${v.escala} (mm do modelo por mm do contorno), com o ponto ${v.ancora.contorno.join(', ')} do contorno no ponto ${v.ancora.modelo.join(', ')} do modelo${v.espelhar ? ', espelhado na horizontal' : ''}; ${c.mmPorPx.toFixed(2)} mm por px, eixo horizontal da imagem ${c.eixos.horizontal} e vertical ${c.eixos.vertical}. A silhueta do modelo é a visível na vista.${v.ignorarRegioes.length ? ` Fora do conjunto: ${v.ignorarRegioes.join(', ')}.` : ''}`, '',
        ...(v.foraDaConta.length ? [`Fora da conta, sem entrar na silhueta do modelo: ${v.foraDaConta.map((g) => `${g.partes.join(', ')} (${g.motivo})`).join('; ')}.`] : []),
        `O conjunto, todas as partes do modelo contra as do arquivo: ${fraseDosContornos(c.conjunto)}`, '',
        fraseDasFendas(c.conjunto.fendas), '',
        'Por parte, na ordem do maior afastamento:', '',
        ...ordem.map(([n, x]) => `- ${n} (número ${numero[n]} no desenho; ${x.partes.join(', ')}): ${fraseDosContornos(x)}`), '',
        `O desenho, o modelo com os contornos por cima, está em ${arq.desenho}.`, '');
      linhas.push(`vista ${v.nome}: só de contornos; sobreposição do conjunto ${pct(c.conjunto.sobreposicao)}, sobra ${pct(c.conjunto.areaReferenciaMm2 ? c.conjunto.sobraMm2 / c.conjunto.areaReferenciaMm2 : 0)} e falta ${pct(c.conjunto.areaReferenciaMm2 ? c.conjunto.faltaMm2 / c.conjunto.areaReferenciaMm2 : 0)} da referência, ${c.conjunto.fendas.estreitas.length} fenda(s); os três maiores afastamentos: ${ordem.slice(0, 3).map(([n, x]) => `${n} ${x.afastamento ? `${x.afastamento.maior.mm.toFixed(0)} mm` : 'sem pixel'}`).join(', ')}`);
      continue;
    }
    const m = medirCasamento({ faces, partes: painel.partes, classeDaParte: cfg.partes, vista: v.nome, largura: cfg.largura, referencia: v.referencia, caixaRef: v.caixaRef, classes: cfg.classes, fundo: cfg.fundo, ignorar: v.ignorar, grade: v.grade, toleranciaMm: v.toleranciaMm, escalaVertical: v.escalaVertical });
    const desenho = desenharLinhas({ largura: m.largura, altura: m.altura }, m.mapas.linhas);
    const arq = { linhas: join(dir, 'linhas.png'), casamentoJson: join(dir, 'casamento.json'), casamento: join(dir, 'casamento.png'), captura: join(dir, 'captura.png'), pedido: join(dir, 'pedido.md') };
    writeFileSync(arq.linhas, paraPng(desenho));
    writeFileSync(arq.casamentoJson, `${JSON.stringify(casamentoParaJson(m, { esboco: arquivo, opcao, vista: v.nome, referencia: v.textoDaReferencia, caixaRef: v.caixaRef, ignorar: v.ignorar, cores: cfg.cores, partes: cfg.partes }), null, 1)}\n`);
    writeFileSync(arq.casamento, paraPng(desenharCasamento(m)));
    gravados.push(arq.linhas, arq.casamentoJson, arq.casamento);
    /* a captura, e a leitura sobre ela ou sobre as linhas */
    let captura = { imagem: null, motivo: 'a rodada pediu --captura=nenhuma' };
    if (modo === 'bancada') captura = await capturar(capturador, painel, v.nome, arq.captura, `${painel.titulo}, vista ${v.nome}`);
    if (modo === 'rapida') captura = capturarRapida(facesRapidas, VISTAS_BANCADA[v.nome].direcao, cfg.largura, arq.captura);
    const objeto = [cfg.objeto, v.visto ? `vista ${v.visto}` : null].filter(Boolean).join(', ') || null;
    let leitura = null;
    if (captura.imagem) {
      try { leitura = montarLeitura({ referencia: v.referencia, captura: captura.imagem, caixaRef: v.caixaRef, grade: v.grade, linhas: desenho }); gravados.push(arq.captura); } catch (e) { captura = { imagem: null, motivo: `a leitura não achou a peça na captura (${e.message})` }; }
    }
    if (!leitura) leitura = montarLeitura({ referencia: v.referencia, captura: desenho, caixaRef: v.caixaRef, grade: v.grade, linhas: desenho, painel: [0, 0, desenho.largura, desenho.altura], fundo: BRANCO });
    gravarLeitura(dir, leitura, { referencia: v.textoDaReferencia, captura: captura.imagem ? rel(arq.captura) : rel(arq.linhas), caixaRef: v.caixaRef, grade: v.grade, objeto, fora: v.fora });
    const ordem = [...m.regioes.map((r) => r.nome), ...leitura.regioes.map((r) => r.nome).filter((n) => !m.regioes.some((r) => r.nome === n))];
    writeFileSync(arq.pedido, readFileSync(arq.pedido, 'utf8') + ordemNoPedido(ordem, !captura.imagem));
    gravados.push(join(dir, 'indice.png'), ...leitura.folhas.map((_, i) => join(dir, `folha-${String(i + 1).padStart(2, '0')}.png`)), arq.pedido, join(dir, 'leitura.json'));
    const acima = m.regioes.filter((r) => r.nota > 0);
    const desvio = (m.proporcao.modelo / m.proporcao.referencia - 1) * 100;
    resumo.vistas[v.nome] = {
      proporcao: { referencia: arredonda(m.proporcao.referencia, 4), modelo: arredonda(m.proporcao.modelo, 4) },
      captura: captura.imagem ? { feita: true, origem: modo, arquivo: rel(arq.captura) } : { feita: false, motivo: captura.motivo },
      ...(v.girar || v.espelhar ? { giro: { girar: v.girar, espelhar: v.espelhar } } : {}),
      ...(v.escalaVertical !== null ? { escalaVertical: v.escalaVertical, proporcaoDaCaixaEmPx: arredonda(m.proporcao.caixaEmPx, 4) } : {}),
      ordem, ignoradas: m.ignoradas,
      regioes: acima.map((r) => ({ nome: r.nome, nota: r.nota, troca: r.troca, linhaSemBorda: r.linhaSemBorda, bordaSemLinha: r.bordaSemLinha })),
      arquivos: { linhas: rel(arq.linhas), casamento: rel(arq.casamento), casamentoJson: rel(arq.casamentoJson), pedido: rel(arq.pedido), indice: rel(join(dir, 'indice.png')) },
    };
    md.push(`## Vista ${v.nome}`, '',
      ...(v.girar || v.espelhar ? [`A referência ${v.textoDaReferencia} foi ${textoDoGiro(v.girar, v.espelhar)} antes da medida, e a caixa e o ignorado valem na imagem já girada.`] : []),
      ...(v.escalaVertical !== null ? [`A vista foi conferida com duas escalas: a altura da referência tem ${v.escalaVertical} vez os mm por px da largura, a largura vai de caixa a caixa e a altura sai dessa escala, com a base da caixa na base do modelo. A leitura do crítico continua de caixa a caixa.`] : []),
      `Altura sobre largura: referência ${m.proporcao.referencia.toFixed(3)}${v.escalaVertical !== null ? ` em mm (${m.proporcao.caixaEmPx.toFixed(3)} na caixa em px)` : ''}, modelo ${m.proporcao.modelo.toFixed(3)} (${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%). Tolerância das linhas ${m.toleranciaMm} mm, ${m.mmPorPx.toFixed(2)} mm por px.`,
      captura.imagem ? `O rascunho com luz está em ${arq.captura}; ele saiu ${ORIGEM_DA_CAPTURA[modo]}.` : `A leitura saiu sem o rascunho com luz: ${captura.motivo}. O desenho das linhas ocupa o lugar dele no painel do rascunho.`,
      ...(m.ignoradas.length ? [`Regiões inteiras no ignorado, fora da conta: ${m.ignoradas.join(', ')}.`] : []), '',
      acima.length ? 'Regiões na ordem da nota, só as de nota acima de zero:' : 'Nenhuma região tem nota acima de zero.', '',
      ...acima.map((r) => `- ${frasesDaRegiao(r)}`), ...(acima.length ? [''] : []),
      `O desenho do casamento está em ${arq.casamento}, e o pedido ao crítico em ${arq.pedido}.`, '');
    linhas.push(`vista ${v.nome}: ${captura.imagem ? `com captura (${modo})` : `sem captura (${captura.motivo})`}${v.escalaVertical !== null ? `, com duas escalas (${v.escalaVertical})` : ''}; as três regiões de maior nota: ${m.regioes.slice(0, 3).map((r) => `${r.nome} ${r.nota.toFixed(2)}`).join(', ') || 'nenhuma'}`);
  }

  /* os três quartos */
  if (cfg.tresQuartos) {
    const dirTres = join(pasta, 'tres-quartos'); mkdirSync(dirTres, { recursive: true });
    md.push('## Três quartos', '',
      'O que avança ou recua para o observador numa vista ortográfica só aparece na vista vizinha, e por isso a opção também foi desenhada pela vista rápida em quatro direções de três quartos, com a elevação da isométrica da bancada. Abra as quatro antes de levar a rodada à pessoa.', '');
    const falhas = [];
    for (const t of TRES_QUARTOS) {
      const png = join(dirTres, `${t.nome}.png`);
      const r = capturarRapida(facesRapidas, t.direcao, cfg.largura, png);
      if (r.imagem) { gravados.push(png); resumo.tresQuartos.push({ nome: t.nome, visto: t.texto, arquivo: rel(png) }); md.push(`- ${t.texto}: ${png}`); } else { falhas.push(t.nome); md.push(`- ${t.texto}: não saiu, ${r.motivo}.`); }
    }
    md.push('');
    linhas.push(`três quartos: ${falhas.length ? `${TRES_QUARTOS.length - falhas.length} de ${TRES_QUARTOS.length} gravadas, faltam ${falhas.join(', ')}` : `${TRES_QUARTOS.length} vistas gravadas em ${dirTres}`}`);
  }

  /* a sobra entre as partes declaradas */
  md.push('## Sobra entre partes', '');
  if (!cfg.pares.length) md.push('A config não declara pares em "dentro".', '');
  else {
    const proprios = cfg.pares.filter((p) => p.vistas);
    if (proprios.length) md.push(`Pares com vistas próprias, medidos só nelas: ${proprios.map((p) => `${p.contida} em ${p.continente} (${p.vistas.join(', ')})`).join('; ')}. Os outros nas vistas ${cfg.vistasDaSobra.join(', ')}. A silhueta da continente é a real, com os furos.`, '');
    const dirSobra = join(pasta, 'sobra');
    const r = sobraEntrePartes(faces, painel.partes, cfg.pares, { vistas: cfg.vistasDaSobra, toleranciaMm: cfg.toleranciaDaSobraMm, largura: cfg.largura });
    for (const x of r) {
      let png = null;
      if (x.sobra) { mkdirSync(dirSobra, { recursive: true }); png = join(dirSobra, `${x.vista}-${x.contida}-em-${x.continente}.png`); writeFileSync(png, paraPng(desenharSobra(x))); gravados.push(png); }
      resumo.sobras.push({ vista: x.vista, contida: x.contida, continente: x.continente, maxMm: arredonda(x.maxMm, 1), areaMm2: Math.round(x.areaMm2), passa: x.sobra, ...(png ? { arquivo: rel(png) } : {}) });
      md.push(`- ${x.contida} em ${x.continente}, vista ${x.vista}: sobra máxima ${x.maxMm.toFixed(1)} mm e área ${Math.round(x.areaMm2)} mm², ${x.sobra ? `passa da tolerância de ${cfg.toleranciaDaSobraMm} mm; o desenho está em ${png}.` : `dentro da tolerância de ${cfg.toleranciaDaSobraMm} mm.`}`);
    }
    md.push('');
    const passam = r.filter((x) => x.sobra).length;
    linhas.push(`sobra: ${passam ? `${passam} de ${r.length} passam` : `nenhum dos ${r.length} passa`} da tolerância de ${cfg.toleranciaDaSobraMm} mm`);
  }
  md.push('## A rodada seguinte', '', MESMA_PASTA(pasta));
  writeFileSync(join(pasta, 'resumo.md'), `${md.join('\n').trimEnd()}\n`);
  writeFileSync(join(pasta, 'resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
  gravados.push(join(pasta, 'resumo.md'), join(pasta, 'resumo.json'));
  return { resumo, gravados, linhas, tempoDaMontagem };
}

/* --- linha de comando ------------------------------------------------------------------------------------------------------------ */
const AJUDA = `npm run conferir:vistas -- <esboço ou peça> --config=<json> --saida=<pasta> [--opcao=1] [--captura=rapida|bancada|nenhuma]
    [--vistas=traseira,superior] [--rodadas-de=<pasta>] [--ate-passo=N] [--composicoes=<módulo>]
npm run conferir:vistas -- --saida=<pasta> --registrar=<vista>:<respostas.json>

O alvo é um esboço ou uma receita de peça (nome ou caminho, como o descrever); com receita, a captura é a rápida ou nenhuma (a bancada
lado a lado é a do esboço), --ate-passo=N executa a receita só até o passo N, e não há recorte em mm: cada vista confere o objeto
inteiro contra a referência inteira, e a região de perto é o que a leitura por regiões faz.
Monta a opção do esboço uma vez e, para cada vista da config, grava em <saida>/<vista>/ as linhas do modelo, o casamento com a
referência, a captura com luz e a leitura por regiões, com a ordem sugerida das regiões no fim do pedido; depois a opção em quatro
vistas de três quartos em <saida>/tres-quartos/ (que "tresQuartos": false desliga) e a sobra entre as partes de "dentro". Grava
resumo.md e resumo.json em --saida. A captura sai da vista rápida, sem navegador (rapida, o padrão), da bancada pelo navegador
(bancada) ou não sai (nenhuma, ou --sem-captura), e então as linhas ocupam o lugar dela. A config declara cores, partes, dentro, vistasDaSobra,
toleranciaDaSobraMm e vistas (referencia, girar, espelhar, caixaRef, ignorar, fora, grade, visto, escalaVertical), com caminhos
relativos a ela; a vista com "contornos" no lugar de "referencia" (com escala, ancora, espelhar, partes, ignorarRegioes, foraDaConta e fendaMm) mede a
sobreposição, a sobra e a falta, a caixa e o afastamento do contorno de fora das silhuetas por parte, e as fendas do conjunto, sem crítico, e "dentro" aceita pares com vistas próprias. O
número ordena e informa; quem aprova forma é a pessoa. --registrar repassa as respostas ao registro da leitura daquela vista. A rodada
seguinte usa a mesma pasta, onde rodadas/ se acumula; --rodadas-de copia para uma pasta nova as rodadas/ de uma conferência anterior.`;

export async function executar(argv, deps = {}) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.length === 0) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    const saida = valor('saida');
    if (!saida) throw new ErroDaConferencia('falta --saida=<pasta>');
    if (valor('registrar')) {
      const m = /^([^:]+):(.+)$/.exec(valor('registrar'));
      if (!m) throw new ErroDaConferencia('--registrar espera <vista>:<respostas.json>');
      const dir = join(resolve(saida), m[1]);
      if (!existsSync(join(dir, 'leitura.json'))) throw new ErroDaConferencia(`a vista "${m[1]}" não tem leitura em ${dir}; rode a conferência antes`);
      const r = executarLeitura([`--saida=${dir}`, `--registrar=${m[2]}`]);
      return { codigo: r.codigo, stdout: r.stdout, stderr: r.stderr.replace(/^leitura:regioes: /, 'conferir:vistas: ') };
    }
    const arquivo = argv.find((a) => !a.startsWith('--'));
    if (!arquivo) throw new ErroDaConferencia('falta o esboço');
    if (!existsSync(resolve(arquivo)) && !(await acharReceita(arquivo))) throw new ErroDaConferencia(`o esboço ou a peça ${arquivo} não existe`);
    if (!valor('config')) throw new ErroDaConferencia('falta --config=<json>');
    const caminhoDaConfig = resolve(valor('config'));
    if (!existsSync(caminhoDaConfig)) throw new ErroDaConferencia(`a config ${valor('config')} não existe`);
    let bruta;
    try { bruta = JSON.parse(readFileSync(caminhoDaConfig, 'utf8')); } catch (e) { throw new ErroDaConferencia(`a config não é JSON válido (${e.message})`); }
    const opcao = Number(valor('opcao') ?? 1);
    if (!Number.isInteger(opcao) || opcao < 1) throw new ErroDaConferencia(`--opcao espera um inteiro a partir de 1 e veio "${valor('opcao')}"`);
    const captura = valor('captura') ?? (argv.includes('--sem-captura') ? 'nenhuma' : 'rapida');
    if (!CAPTURAS.includes(captura)) throw new ErroDaConferencia(`--captura espera ${CAPTURAS.join(', ')} e veio "${captura}"`);
    if (argv.includes('--sem-captura') && captura !== 'nenhuma') throw new ErroDaConferencia(`--sem-captura contradiz --captura=${captura}`);
    const vistasPedidas = valor('vistas') ? valor('vistas').split(',').map((s) => s.trim()).filter(Boolean) : null;
    const rodadasDe = valor('rodadas-de');
    if (rodadasDe !== null && (!rodadasDe || !existsSync(resolve(rodadasDe)))) throw new ErroDaConferencia(`--rodadas-de: a pasta "${rodadasDe}" não existe`);
    const cfg = lerConfig(bruta, dirname(caminhoDaConfig), { vistasPedidas });
    const t0 = performance.now();
    const atePasso = valor('ate-passo') === null ? null : Number(valor('ate-passo'));
    const r = await conferirVistas({ arquivo, cfg, saida, opcao, captura, rodadasDe, atePasso, composicoes: valor('composicoes') }, deps);
    const total = (performance.now() - t0) / 1000;
    return { codigo: 0, stdout: `${['conferência das vistas: o número ordena e informa; quem aprova forma é a pessoa.', ...r.linhas, `tempo: ${total.toFixed(1)} s, dos quais ${r.tempoDaMontagem.toFixed(1)} s de montagem`, 'gravado:', ...r.gravados.map((g) => `  ${g}`)].join('\n')}\n`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDaConferencia) return { codigo: erro.codigo, stdout: '', stderr: `conferir:vistas: ${erro.message}\n` };
    if (['ErroDoCasamento', 'ErroDaSobra', 'ErroDaLeitura', 'ErroDoPerfil', 'ErroDaVista', 'ErroDoModelo', 'ErroDeConfiguracao'].includes(erro?.name)) return { codigo: 2, stdout: '', stderr: `conferir:vistas: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
