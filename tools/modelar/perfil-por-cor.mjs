#!/usr/bin/env node
/* perfil-por-cor.mjs — os pixels de uma vista classificados pela cor do material e, linha a linha, os trechos de cada cor e a meia
 * largura de cada uma em cada altura.
 *
 * POR QUE ELE EXISTE. Na traseira da empilhadeira (2026-11-09) a largura de cada parte em cada altura foi lida no olho na imagem de
 * referência, e o topo das colunas do encosto, que aparece atrás do capô, foi tomado por aba da tampa: a tampa saiu mais larga que o
 * capô. O que acertou foi classificar os pixels da vista pela cor de cada material e listar, linha a linha, onde começa e onde acaba
 * cada cor. Esta ferramenta faz essa medida sem saber de que objeto se trata: quem chama declara as classes pelo nome e por uma cor
 * típica de cada uma.
 *
 * A CLASSIFICAÇÃO. A luz e a sombra mudam o brilho de um material muito mais que o matiz dele, e por isso a regra não procura a cor
 * declarada mais próxima. O pixel com saturação (máximo menos mínimo dos três canais) acima de SATURACAO_MINIMA vai para a classe
 * saturada de matiz mais próximo, se a distância de matiz couber em TOLERANCIA_DE_MATIZ. O pixel perto do fundo (saturação abaixo de
 * SATURACAO_DO_FUNDO e luminância a menos de DISTANCIA_DO_FUNDO da do fundo) é fundo. O resto vai para a classe sem saturação de
 * luminância mais próxima, o que põe o limiar entre duas delas no meio das luminâncias declaradas. Luminância é a média dos três
 * canais. Com laranja, cinza e escuro sobre branco, o laranja (saturação acima de 70, matiz a até 30 graus do declarado) e o fundo
 * (luminância acima de 200, saturação abaixo de 30) coincidem pixel a pixel com os do script que mediu a traseira; o limiar entre
 * escuro e cinza fica no meio das duas cores declaradas, perto de 72, onde o script usava 62.
 *
 * O QUE ELE GRAVA. `--saida` é o JSON `modelar.perfil-por-cor@1`: a caixa, o centro, as classes, as linhas (para cada linha y da
 * caixa a cada `--passo` px, os trechos `[classe, x0, x1]` com pelo menos `--minimo` px, x1 incluído, em px da imagem) e os perfis
 * (para cada classe, `[y, meiaLargura]` nas linhas em que ela aparece, com a meia largura medida do centro até a borda de fora do
 * pixel mais distante dela). `--mapa` é um PNG da caixa com cada pixel pintado na cor declarada da sua classe e o fundo em branco,
 * para conferir a classificação a olho.
 *
 * USO
 *   npm run perfil:cor -- --imagem=<png> --caixa=x0,y0,x1,y1 --cores=laranja:#e2641e,cinza:#6b7074,escuro:#1e2022
 *     [--fundo=#ffffff] [--centro=<x>] [--passo=4] [--minimo=3] [--saida=<json>] [--mapa=<png>]
 *
 * A caixa vai de x0 a x1 e de y0 a y1 sem incluir x1 e y1, como em `leitura:regioes`. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dePng, imagem, paraPng } from './leitura-por-regioes.mjs';

export const FORMATO = 'modelar.perfil-por-cor@1';
export const SATURACAO_MINIMA = 70;      // acima disto o pixel e a cor declarada são saturados
export const TOLERANCIA_DE_MATIZ = 30;   // graus: o pixel saturado mais longe que isto de toda classe saturada é tratado como sem saturação
export const SATURACAO_DO_FUNDO = 30;    // abaixo disto, e perto do fundo em luminância, o pixel é fundo
export const DISTANCIA_DO_FUNDO = 55;    // luminância: com fundo branco, fundo é luminância acima de 200
export const PASSO_PADRAO = 4;
export const MINIMO_PADRAO = 3;
export const FUNDO_PADRAO = [255, 255, 255];
export const FUNDO = -1;                 // o índice de classe do pixel de fundo

export class ErroDoPerfil extends Error {
  constructor(mensagem) { super(mensagem); this.name = 'ErroDoPerfil'; }
}

/* --- a cor ----------------------------------------------------------------------------------------------------------------------- */
export const saturacao = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
export const luminancia = ([r, g, b]) => (r + g + b) / 3;
/** O matiz em graus, de 0 a 360; o de uma cor sem saturação nenhuma é 0. */
export function matiz([r, g, b]) {
  const mx = Math.max(r, g, b); const d = mx - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const distanciaDeMatiz = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

export function lerCor(texto, nome) {
  if (!/^#[0-9a-fA-F]{6}$/.test(String(texto))) throw new ErroDoPerfil(`${nome} espera #rrggbb e veio "${texto}"`);
  return [1, 3, 5].map((i) => parseInt(texto.slice(i, i + 2), 16));
}
const paraHex = (cor) => `#${cor.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** As classes de `nome:#rrggbb,nome:#rrggbb`: [{ nome, cor, saturada, matiz, luminancia }]. */
export function lerClasses(texto) {
  const classes = [];
  for (const parte of String(texto).split(',')) {
    const m = /^([^:\s,]+):(.*)$/.exec(parte.trim());
    if (!m) throw new ErroDoPerfil(`--cores espera nome:#rrggbb separados por vírgula e veio "${parte}"`);
    if (classes.some((c) => c.nome === m[1])) throw new ErroDoPerfil(`--cores repete a classe "${m[1]}"`);
    if (m[1] === 'fundo') throw new ErroDoPerfil('--cores não aceita a classe "fundo": o fundo se declara com --fundo');
    const cor = lerCor(m[2], `a classe "${m[1]}"`);
    classes.push({ nome: m[1], cor, saturada: saturacao(cor) > SATURACAO_MINIMA, matiz: matiz(cor), luminancia: luminancia(cor) });
  }
  return classes;
}

/** O índice da classe do pixel, ou FUNDO. A regra está no cabeçalho. */
export function classificar(cor, classes, fundo = FUNDO_PADRAO) {
  const s = saturacao(cor);
  const saturadas = classes.filter((c) => c.saturada); const neutras = classes.filter((c) => !c.saturada);
  const maisPerto = (lista, medida) => lista.reduce((melhor, c) => (medida(c) < medida(melhor) ? c : melhor));
  if (s > SATURACAO_MINIMA && saturadas.length) {
    const h = matiz(cor); const c = maisPerto(saturadas, (k) => distanciaDeMatiz(k.matiz, h));
    if (distanciaDeMatiz(c.matiz, h) <= TOLERANCIA_DE_MATIZ || !neutras.length) return classes.indexOf(c);
  }
  const l = luminancia(cor);
  if (s < SATURACAO_DO_FUNDO && Math.abs(l - luminancia(fundo)) < DISTANCIA_DO_FUNDO) return FUNDO;
  if (!neutras.length) { const h = matiz(cor); return classes.indexOf(maisPerto(saturadas, (k) => distanciaDeMatiz(k.matiz, h))); }
  return classes.indexOf(maisPerto(neutras, (k) => Math.abs(k.luminancia - l)));
}

/* --- a medida -------------------------------------------------------------------------------------------------------------------- */
/** A classe de cada pixel da caixa, linha a linha, num Int8Array de largura x altura da caixa. */
export function classificarCaixa(im, [x0, y0, x1, y1], classes, fundo = FUNDO_PADRAO) {
  const w = x1 - x0; const sai = new Int8Array(w * (y1 - y0));
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
    const i = (y * im.largura + x) * 3;
    sai[(y - y0) * w + x - x0] = classificar([im.dados[i], im.dados[i + 1], im.dados[i + 2]], classes, fundo);
  }
  return sai;
}

/** Os trechos contínuos de uma mesma classe numa fileira de índices, com pelo menos `minimo` px: [[índice, x0, x1]], x1 incluído. */
export function trechos(fileira, x0, minimo = MINIMO_PADRAO) {
  const sai = [];
  for (let a = 0; a < fileira.length;) {
    let b = a; while (b + 1 < fileira.length && fileira[b + 1] === fileira[a]) b += 1;
    if (fileira[a] !== FUNDO && b - a + 1 >= minimo) sai.push([fileira[a], x0 + a, x0 + b]);
    a = b + 1;
  }
  return sai;
}

/**
 * Mede a vista.
 * @param {{ imagem, caixa: number[], classes: object[], fundo?: number[], centro?: number, passo?: number, minimo?: number }} o  a imagem no formato de `dePng`
 * @returns {{ caixa, centro, classes, linhas: { y: number, trechos: any[][] }[], perfis: Record<string, number[][]>, fracoes: Record<string, number>, mapa }}
 */
export function medirPerfil(o) {
  const { caixa, classes } = o; const [x0, y0, x1, y1] = caixa;
  if (!caixa.every(Number.isInteger) || !(x1 > x0 && y1 > y0) || x0 < 0 || y0 < 0 || x1 > o.imagem.largura || y1 > o.imagem.altura) {
    throw new ErroDoPerfil(`--caixa ${caixa.join(',')} não cabe na imagem de ${o.imagem.largura} x ${o.imagem.altura} px`);
  }
  if (!classes.length) throw new ErroDoPerfil('--cores precisa de pelo menos uma classe');
  const fundo = o.fundo ?? FUNDO_PADRAO; const passo = o.passo ?? PASSO_PADRAO; const minimo = o.minimo ?? MINIMO_PADRAO;
  const centro = o.centro ?? (x0 + x1) / 2;
  for (const [n, v] of [['--passo', passo], ['--minimo', minimo]]) if (!Number.isInteger(v) || v < 1) throw new ErroDoPerfil(`${n} espera um inteiro positivo e veio ${v}`);
  if (!Number.isFinite(centro)) throw new ErroDoPerfil(`--centro espera um número e veio ${o.centro}`);
  const w = x1 - x0; const indices = classificarCaixa(o.imagem, caixa, classes, fundo);
  const linhas = []; const perfis = Object.fromEntries(classes.map((c) => [c.nome, []]));
  for (let y = y0; y < y1; y += passo) {
    const t = trechos(indices.subarray((y - y0) * w, (y - y0 + 1) * w), x0, minimo);
    linhas.push({ y, trechos: t.map(([k, a, b]) => [classes[k].nome, a, b]) });
    classes.forEach((c, k) => {
      const meus = t.filter(([j]) => j === k);
      if (meus.length) perfis[c.nome].push([y, Math.max(...meus.map(([, a, b]) => Math.max(centro - a, b + 1 - centro)))]);
    });
  }
  const contagem = new Array(classes.length + 1).fill(0);
  for (const k of indices) contagem[k === FUNDO ? classes.length : k] += 1;
  const fracoes = Object.fromEntries([...classes.map((c, k) => [c.nome, contagem[k] / indices.length]), ['fundo', contagem[classes.length] / indices.length]]);
  const mapa = imagem(w, y1 - y0);
  indices.forEach((k, i) => { const cor = k === FUNDO ? FUNDO_PADRAO : classes[k].cor; mapa.dados.set(cor, i * 3); });
  return { caixa: [...caixa], centro, classes, passo, minimo, fundo, linhas, perfis, fracoes, mapa };
}

/** O JSON `modelar.perfil-por-cor@1` da medida. */
export function paraJson(r, origem = null) {
  return {
    formato: FORMATO, imagem: origem, caixa: r.caixa, centro: r.centro, passo: r.passo, minimo: r.minimo, fundo: paraHex(r.fundo),
    classes: r.classes.map((c) => ({ nome: c.nome, cor: paraHex(c.cor), saturada: c.saturada })),
    linhas: r.linhas, perfis: r.perfis,
  };
}

/* --- linha de comando ------------------------------------------------------------------------------------------------------------ */
const AJUDA = `npm run perfil:cor -- --imagem=<png> --caixa=x0,y0,x1,y1 --cores=nome:#rrggbb,nome:#rrggbb,...
    [--fundo=#ffffff] [--centro=<x>] [--passo=${PASSO_PADRAO}] [--minimo=${MINIMO_PADRAO}] [--saida=<json>] [--mapa=<png>]

Classifica os pixels da caixa pela cor de cada classe e lista, a cada --passo linhas, os trechos de cada classe e a meia largura dela
a partir do --centro (padrão: o meio da caixa). --saida grava o JSON ${FORMATO}; --mapa grava a classificação pintada.`;

const inteiro = (texto, nome) => { const v = Number(texto); if (!Number.isInteger(v)) throw new ErroDoPerfil(`${nome} espera um inteiro e veio "${texto}"`); return v; };

export function executar(argv) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.length === 0) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    for (const n of ['imagem', 'caixa', 'cores']) if (!valor(n)) throw new ErroDoPerfil(`falta --${n}`);
    const caixa = valor('caixa').split(',').map((v) => inteiro(v, '--caixa'));
    if (caixa.length !== 4) throw new ErroDoPerfil(`--caixa espera 4 inteiros separados por vírgula e veio ${caixa.length}`);
    const classes = lerClasses(valor('cores'));
    const centro = valor('centro') === null ? undefined : Number(valor('centro'));
    if (centro !== undefined && !Number.isFinite(centro)) throw new ErroDoPerfil(`--centro espera um número e veio "${valor('centro')}"`);
    const r = medirPerfil({
      imagem: dePng(readFileSync(resolve(valor('imagem')))), caixa, classes, centro,
      fundo: valor('fundo') ? lerCor(valor('fundo'), '--fundo') : undefined,
      passo: valor('passo') ? inteiro(valor('passo'), '--passo') : undefined, minimo: valor('minimo') ? inteiro(valor('minimo'), '--minimo') : undefined,
    });
    const gravados = [];
    if (valor('saida')) {
      const arquivo = resolve(valor('saida')); mkdirSync(dirname(arquivo), { recursive: true });
      writeFileSync(arquivo, `${JSON.stringify(paraJson(r, valor('imagem')))}\n`); gravados.push(arquivo);
    }
    if (valor('mapa')) {
      const arquivo = resolve(valor('mapa')); mkdirSync(dirname(arquivo), { recursive: true });
      writeFileSync(arquivo, paraPng(r.mapa)); gravados.push(arquivo);
    }
    const fracoes = Object.entries(r.fracoes).map(([n, f]) => `${n} ${(f * 100).toFixed(1)}%`).join(', ');
    return { codigo: 0, stdout: `${r.linhas.length} linhas de ${r.caixa[1]} a ${r.caixa[3] - 1}, a cada ${r.passo} px, centro em x = ${r.centro}\nfração da caixa: ${fracoes}\n${gravados.length ? gravados.join('\n') : 'nada gravado: use --saida=<json> ou --mapa=<png>'}\n`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDoPerfil || erro?.code === 'ENOENT') return { codigo: 2, stdout: '', stderr: `perfil:cor: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
