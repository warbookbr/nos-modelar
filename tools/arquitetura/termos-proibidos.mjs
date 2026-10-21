/* termos-proibidos.mjs — normalização e varredura do gate de termos proibidos.

   O gate compara o sha256 de cada palavra, par e trio de palavras consecutivas do repositório com uma lista de hashes em
   `termos-proibidos.hashes.json`. Nem este arquivo nem a lista trazem o termo em claro, e a varredura devolve só caminho e
   linha, nunca o trecho encontrado.

   Normalização: minúsculas, sem acento, separando por qualquer caractere que não seja letra ou dígito (espaço, hífen, `_`,
   ponto, barra). Cada sequência de 1 a 3 palavras consecutivas gera duas formas, a unida por um espaço e a unida sem
   separador (esta só contra os termos de mais de uma palavra); assim "dois termos", "dois-termos", "dois_termos" e "doistermos"
   coincidem. Palavra com mais de 20 caracteres hexadecimais é um hash e não participa. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const LIMITE_DE_PALAVRAS = 3;
export const EXTENSOES_BINARIAS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'gz', 'zip', 'tgz', 'bz2', 'xz', '7z', 'wasm', 'glb', 'gltf', 'bin',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'pdf', 'mp3', 'mp4', 'webm', 'ogg', 'wav', 'step', 'stp', 'stl', 'obj', 'npy', 'npz',
]);

export function sha256(texto) {
  return createHash('sha256').update(texto).digest('hex');
}

/* palavras de um texto: minúsculas, sem acento, separadas por não alfanumérico */
export function palavras(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const EH_HASH = /^[0-9a-f]{21,}$/;
/* resultado já calculado por forma; vale entre arquivos porque o vocabulário se repete muito */
const memo = new Map();
const LIMITE_DA_MEMORIA = 400_000;

function memorizado(chave, calcular) {
  let r = memo.get(chave);
  if (r === undefined) {
    if (memo.size > LIMITE_DA_MEMORIA) memo.clear();
    r = calcular();
    memo.set(chave, r);
  }
  return r;
}

/* os hashes de um termo: `separados` é a forma com espaço; `unidos` é a forma sem separador e `iniciais` o hash da primeira
   palavra, os dois só para termo de mais de uma palavra */
export function hashesDoTermo(termo) {
  const ps = palavras(termo);
  const varias = ps.length > 1;
  return {
    separados: [sha256(ps.join(' '))],
    unidos: varias ? [sha256(ps.join(''))] : [],
    iniciais: varias ? [sha256(ps[0])] : [],
  };
}

/* varre um texto e devolve os números das linhas em que alguma sequência de 1 a 3 palavras tem hash proibido.
   `proibidos` é { separados, unidos, iniciais }, cada um um Set. A forma unida de várias palavras só vale contra `unidos`
   (sem isso, "c c 0" em código coincidiria com um termo de uma palavra só), e uma sequência de várias palavras só é
   calculada quando a primeira palavra é inicial de algum termo, o que evita um sha256 por trio do repositório inteiro. */
export function linhasProibidas(texto, proibidos) {
  const achadas = new Set();
  const lista = [];
  const linhaDe = [];
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    for (const p of palavras(linhas[i])) { lista.push(EH_HASH.test(p) ? '' : p); linhaDe.push(i + 1); }
  }
  const hash = (forma) => memorizado(forma, () => sha256(forma));
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i];
    if (!p) continue;
    const h = hash(p);
    if (proibidos.separados.has(h) || proibidos.unidos.has(h)) achadas.add(linhaDe[i]);
    if (!proibidos.iniciais.has(h)) continue;
    for (let n = 2; n <= LIMITE_DE_PALAVRAS && i + n <= lista.length; n++) {
      const seq = lista.slice(i, i + n);
      if (seq.includes('')) break;
      if (proibidos.separados.has(hash(seq.join(' '))) || proibidos.unidos.has(hash(seq.join('')))) achadas.add(linhaDe[i]);
    }
  }
  return [...achadas].sort((x, y) => x - y);
}

export function arquivosRastreados(raiz) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: raiz, maxBuffer: 1 << 28 })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

export function ehBinario(caminho, buffer) {
  const ext = caminho.includes('.') ? caminho.split('.').pop().toLowerCase() : '';
  return EXTENSOES_BINARIAS.has(ext) || buffer.includes(0);
}

export function carregarHashes(arquivo) {
  const { hashes, unidos, iniciais } = JSON.parse(readFileSync(arquivo, 'utf8'));
  return { separados: new Set(hashes), unidos: new Set(unidos), iniciais: new Set(iniciais) };
}

/* devolve [{ caminho, linha }] sem nunca incluir o trecho; linha 0 quer dizer o próprio caminho do arquivo */
export function varrerRepositorio(raiz, proibidos) {
  const achados = [];
  for (const caminho of arquivosRastreados(raiz)) {
    if (/(^|\/)(node_modules|dist)\//.test(caminho)) continue;
    if (linhasProibidas(caminho.replace(/\//g, '\n'), proibidos).length) achados.push({ caminho, linha: 0 });
    const absoluto = join(raiz, caminho);
    if (!existsSync(absoluto) || !statSync(absoluto).isFile()) continue;
    const buffer = readFileSync(absoluto);
    if (ehBinario(caminho, buffer)) continue;
    for (const linha of linhasProibidas(buffer.toString('utf8'), proibidos)) achados.push({ caminho, linha });
  }
  return achados;
}
