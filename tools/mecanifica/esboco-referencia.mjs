/* Lê as referências do esboço para o módulo `modulos/esboco`, que não lê arquivo: um JSON de contornos da imagem
   (`mecanifica.contornos@1`, o que `npm run contorno` grava) ou uma imagem PNG com as duas âncoras de pixel para milímetro no
   formato do `conferir:referencia` (a calibração é a mesma, `calibrarPorAncoras`; a silhueta é o que é mais escuro que o
   limiar, como lá). O módulo recebe a referência pronta: um contorno ou uma forma `{ dentro(h, v), caixa }`. */
import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { ErroDeEsboco } from '../../modulos/esboco/src/index.js';
import { exigirVista, lerContornos, VISTAS_DA_REFERENCIA } from '../../modulos/esboco/src/referencia.js';
import { lerPlano } from '../../modulos/esboco/src/plano.js';
import { lerPng } from './prancha/prancha-referencia.mjs';
import { calibrarPorAncoras } from './conferir-contra-referencia.mjs';

const LIMIAR_PADRAO = 248;

/* A vista que o nome do arquivo diz (`lateral.contornos.json`), ou null. */
export function vistaDoNome(arquivo) {
  const nome = basename(arquivo).toLowerCase();
  return VISTAS_DA_REFERENCIA.find((v) => nome.includes(v)) ?? null;
}

function lerJson(caminho, onde) {
  try { return JSON.parse(readFileSync(caminho, 'utf8')); } catch (e) { throw new ErroDeEsboco(`${onde}: ${caminho} não é um JSON legível (${e.message})`); }
}

/* Uma imagem como referência: a silhueta é o que é mais escuro que o limiar (na imagem inteira ou no recorte), em
   milímetro pelas duas âncoras. */
function referenciaDaImagem(caminho, { ancoras, recorte, limiar }, onde) {
  if (!ancoras) throw new ErroDeEsboco(`${onde}: uma imagem precisa das âncoras de pixel para milímetro ("ancoras": o JSON no formato do conferir:referencia, com duas âncoras { "px": [x, y], "mm": [h, v] })`);
  const cfg = lerJson(ancoras, onde);
  let cal;
  try { cal = calibrarPorAncoras(cfg.ancoras); } catch (e) { throw new ErroDeEsboco(`${onde}: ${e.message}`); }
  const img = lerPng(caminho);
  const rec = recorte ?? cfg.recorte ?? [0, 0, img.largura - 1, img.altura - 1];
  const corte = limiar ?? cfg.limiar ?? LIMIAR_PADRAO;
  const [x0, y0, x1, y1] = [Math.max(0, rec[0]), Math.max(0, rec[1]), Math.min(img.largura - 1, rec[2]), Math.min(img.altura - 1, rec[3])];
  let a0 = Infinity; let a1 = -Infinity; let b0 = Infinity; let b1 = -Infinity;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (img.lum[y * img.largura + x] < corte) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
  }
  if (!Number.isFinite(a0)) throw new ErroDeEsboco(`${onde}: a imagem não tem tinta no recorte (limiar ${corte}): confira o limiar e o recorte`);
  const p = cfg.ancoras[0];
  const escala = cal.mmPorPx;
  const [h0, vTopo] = cal.paraMm(a0, b0); const [h1, vBase] = cal.paraMm(a1 + 1, b1 + 1);
  return {
    silhueta: {
      caixa: [Math.min(h0, h1), Math.min(vTopo, vBase), Math.max(h0, h1), Math.max(vTopo, vBase)],
      dentro: (h, v) => {
        const x = Math.floor(p.px[0] + (h - p.mm[0]) / escala);
        const y = Math.floor(p.px[1] - (v - p.mm[1]) / escala);
        return x >= x0 && x <= x1 && y >= y0 && y <= y1 && img.lum[y * img.largura + x] < corte;
      },
    },
    regioes: {},
    mmPorPx: escala,
  };
}

/* A referência de um arquivo: `entrada` é `{ arquivo, ancoras?, recorte?, limiar? }` (os caminhos relativos valem a partir de
   `base`, a pasta do esboço). */
export function lerReferenciaDeArquivo(entrada, base, onde = `referência "${entrada.arquivo}"`) {
  const aqui = (c) => (isAbsolute(c) ? c : resolve(base, c));
  const caminho = aqui(entrada.arquivo);
  if (!existsSync(caminho)) throw new ErroDeEsboco(`${onde}: o arquivo não existe (procurado em ${caminho})`);
  const ext = extname(caminho).toLowerCase();
  if (ext === '.json') return lerContornos(lerJson(caminho, onde), onde);
  if (ext === '.png') {
    if (entrada.ancoras && !existsSync(aqui(entrada.ancoras))) throw new ErroDeEsboco(`${onde}: o arquivo de âncoras não existe (procurado em ${aqui(entrada.ancoras)})`);
    return referenciaDaImagem(caminho, { ancoras: entrada.ancoras ? aqui(entrada.ancoras) : null, recorte: entrada.recorte, limiar: entrada.limiar }, onde);
  }
  throw new ErroDeEsboco(`${onde}: o arquivo deve ser um JSON de contornos (.json) ou uma imagem PNG (.png), e veio "${ext || 'sem extensão'}"`);
}

/* As referências que o `plano.referencia` do esboço declara, lidas: Map do `arquivo` declarado para a referência. Sem
   `plano.referencia` o mapa é vazio. */
export function referenciasDoEsboco(bruto, base) {
  const mapa = new Map();
  for (const e of lerPlano(bruto?.plano)?.referencia ?? []) {
    exigirVista(e.vista, `referência "${e.arquivo}"`);
    if (!mapa.has(e.arquivo)) mapa.set(e.arquivo, lerReferenciaDeArquivo(e, base));
  }
  return mapa;
}
