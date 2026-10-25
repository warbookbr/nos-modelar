/* termos-proibidos.mjs — normalização e varredura do gate de vazamento (termos proibidos e malha ou cena no índice).

   O gate compara o HMAC-SHA256 de cada palavra, par e trio de palavras consecutivas com a lista embaralhada em
   `termos-proibidos.hashes.json`. A chave do HMAC vem de `MECANIFICA_CHAVE_TERMOS` (no CI, o segredo do repositório com esse
   nome) ou do arquivo apontado por `MECANIFICA_CHAVE_TERMOS_ARQUIVO`, fora do repositório; sem ela a lista não diz nada, porque
   o repositório é público e um sha256 simples de palavra comum se desfaz por dicionário. A lista guarda também o HMAC de um
   texto fixo, o verificador, para que chave errada falhe com aviso, no lugar de deixar o gate verde sem achar nada. Nem este
   arquivo nem a lista trazem o termo em claro, e a varredura devolve só caminho e linha, commit e linha da mensagem, ou o
   objeto para onde aponta o ramo, nunca o trecho; caminho que contém termo sai como o objeto do índice (`blob <id>`).

   Normalização: minúsculas, sem acento, separando por qualquer caractere que não seja letra ou dígito (espaço, hífen, `_`,
   ponto, barra). Cada sequência de 1 a 3 palavras consecutivas gera duas formas, a unida por um espaço e a unida sem
   separador (esta só contra os termos de mais de uma palavra); assim "dois termos", "dois-termos", "dois_termos" e "doistermos"
   coincidem. Palavra com mais de 20 caracteres hexadecimais é um hash e não participa.

   A varredura cobre o conteúdo e o caminho dos arquivos rastreados, as mensagens de commit, os nomes de ramo e de tag e, no
   CI, o nome do ramo do pull request. O índice também não aceita arquivo de malha ou de cena (EXTENSOES_DE_MALHA_OU_CENA),
   salvo os de EXCECOES_DE_MALHA, cada um preso ao objeto do índice e com motivo.

   Para mudar a lista: `node tools/arquitetura/termos-proibidos.mjs --gerar <arquivo de termos, um por linha>`, com a chave no
   ambiente; o comando regrava a lista e imprime só as contagens. O arquivo de termos fica fora do repositório. */
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LIMITE_DE_PALAVRAS = 3;
export const VARIAVEL_DA_CHAVE = 'MECANIFICA_CHAVE_TERMOS';
export const VARIAVEL_DO_ARQUIVO_DA_CHAVE = 'MECANIFICA_CHAVE_TERMOS_ARQUIVO';
export const TEXTO_DO_VERIFICADOR = 'mecanifica:termos-proibidos:verificador';
export const ARQUIVO_DA_LISTA = join(dirname(fileURLToPath(import.meta.url)), 'termos-proibidos.hashes.json');
export const COMO_FORNECER_A_CHAVE =
  `falta a chave da lista de termos proibidos: defina ${VARIAVEL_DA_CHAVE} com a chave, ou ${VARIAVEL_DO_ARQUIVO_DA_CHAVE} ` +
  'com o caminho de um arquivo fora do repositório que a contenha (por exemplo ' +
  `${VARIAVEL_DO_ARQUIVO_DA_CHAVE}=~/.config/mecanifica/chave-termos npm run test:rapidos); no CI ela vem do segredo ` +
  `${VARIAVEL_DA_CHAVE} do repositório, e a pessoa responsável guarda a cópia`;

export const EXTENSOES_BINARIAS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'gz', 'zip', 'tgz', 'bz2', 'xz', '7z', 'wasm', 'glb', 'gltf', 'bin',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'pdf', 'mp3', 'mp4', 'webm', 'ogg', 'wav', 'step', 'stp', 'stl', 'obj', 'npy', 'npz',
]);

/* Malha ou cena não entra no índice: é o formato em que um modelo de referência externa chegaria inteiro. STEP e STP entram
   na recusa pelo mesmo motivo (é o formato de troca de CAD), e `.blend1` é a cópia de segurança que o Blender grava ao lado.
   O arquivo comprimido conta pela extensão de dentro: `peca.stl.gz` é STL. */
export const EXTENSOES_DE_MALHA_OU_CENA = new Set([
  'obj', 'blend', 'blend1', 'fbx', 'glb', 'gltf', 'stl', 'ply', 'dae', '3mf', 'usd', 'usda', 'usdc', 'usdz', 'step', 'stp',
]);
const COMPRESSAO = /\.(gz|xz|bz2|zst|zip|7z)$/i;

/* Cada exceção vale para um caminho e um objeto do índice (`git ls-files -s`): trocar o conteúdo do arquivo reprova até a
   exceção ser revista, e a exceção cujo arquivo saiu do índice também reprova. */
/* Os STEP e STL sintéticos dos importadores saíram com eles em 2026-10-25, e hoje não há exceção. */
export const EXCECOES_DE_MALHA = [];

/* lê a chave do ambiente: a variável com a chave, ou o arquivo apontado; devolve null quando nenhuma das duas existe */
export function lerChave(ambiente = process.env) {
  const direta = (ambiente[VARIAVEL_DA_CHAVE] ?? '').trim();
  if (direta) return direta;
  const arquivo = (ambiente[VARIAVEL_DO_ARQUIVO_DA_CHAVE] ?? '').trim().replace(/^~(?=\/)/, ambiente.HOME ?? '~');
  if (!arquivo) return null;
  if (!existsSync(arquivo)) throw new Error(`${VARIAVEL_DO_ARQUIVO_DA_CHAVE} aponta um arquivo que não existe: ${arquivo}`);
  const chave = readFileSync(arquivo, 'utf8').trim();
  if (!chave) throw new Error(`${VARIAVEL_DO_ARQUIVO_DA_CHAVE} aponta um arquivo vazio: ${arquivo}`);
  return chave;
}

export function embaralhar(chave, texto) {
  return createHmac('sha256', chave).update(texto).digest('hex');
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
/* resultado já calculado por forma, separado por chave; vale entre arquivos porque o vocabulário se repete muito */
const memorias = new Map();
const LIMITE_DA_MEMORIA = 400_000;

function memoriaDa(chave) {
  let m = memorias.get(chave);
  if (!m) { m = new Map(); memorias.set(chave, m); }
  return m;
}

/* os HMAC de um termo: `separados` é a forma com espaço; `unidos` é a forma sem separador e `iniciais` o HMAC da primeira
   palavra, os dois só para termo de mais de uma palavra */
export function hashesDoTermo(termo, chave) {
  const ps = palavras(termo);
  const varias = ps.length > 1;
  return {
    separados: [embaralhar(chave, ps.join(' '))],
    unidos: varias ? [embaralhar(chave, ps.join(''))] : [],
    iniciais: varias ? [embaralhar(chave, ps[0])] : [],
  };
}

/* a lista gravada em JSON para os termos dados, sem repetição e em ordem */
export function montarLista(termos, chave) {
  const c = { separados: new Set(), unidos: new Set(), iniciais: new Set() };
  for (const t of termos) {
    const h = hashesDoTermo(t, chave);
    for (const k of Object.keys(c)) for (const x of h[k]) c[k].add(x);
  }
  return {
    algoritmo: 'hmac-sha256',
    chave: `${VARIAVEL_DA_CHAVE} (ou o arquivo em ${VARIAVEL_DO_ARQUIVO_DA_CHAVE}); fora do repositório`,
    normalizacao: 'minúsculas, sem acento, palavras separadas por não alfanumérico; sequências de 1 a 3 palavras; `hashes` é a forma com espaço; `unidos` a forma sem separador e `iniciais` o HMAC da primeira palavra, ambos só dos termos de mais de uma palavra (ver termos-proibidos.mjs)',
    verificador: embaralhar(chave, TEXTO_DO_VERIFICADOR),
    hashes: [...c.separados].sort(),
    unidos: [...c.unidos].sort(),
    iniciais: [...c.iniciais].sort(),
  };
}

export function carregarLista(arquivo = ARQUIVO_DA_LISTA) {
  return JSON.parse(readFileSync(arquivo, 'utf8'));
}

/* os conjuntos da varredura; a chave que não reproduz o verificador falha sem dizer nada da lista */
export function proibidosDaLista(lista, chave) {
  if (!chave) throw new Error(COMO_FORNECER_A_CHAVE);
  if (lista.algoritmo !== 'hmac-sha256' || embaralhar(chave, TEXTO_DO_VERIFICADOR) !== lista.verificador) {
    throw new Error(
      `a chave fornecida não confere com a lista de termos proibidos (o verificador de termos-proibidos.hashes.json não bate); ` +
      `confira o valor de ${VARIAVEL_DA_CHAVE} ou o arquivo de ${VARIAVEL_DO_ARQUIVO_DA_CHAVE}`,
    );
  }
  return { chave, separados: new Set(lista.hashes), unidos: new Set(lista.unidos), iniciais: new Set(lista.iniciais) };
}

/* varre um texto e devolve os números das linhas em que alguma sequência de 1 a 3 palavras tem HMAC proibido.
   `proibidos` é { chave, separados, unidos, iniciais }, os três últimos Sets. A forma unida de várias palavras só vale
   contra `unidos` (sem isso, "c c 0" em código coincidiria com um termo de uma palavra só), e uma sequência de várias palavras
   só é calculada quando a primeira palavra é inicial de algum termo, o que evita um HMAC por trio do repositório inteiro. */
export function linhasProibidas(texto, proibidos) {
  const achadas = new Set();
  const lista = [];
  const linhaDe = [];
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    for (const p of palavras(linhas[i])) { lista.push(EH_HASH.test(p) ? '' : p); linhaDe.push(i + 1); }
  }
  const memo = memoriaDa(proibidos.chave);
  const hash = (forma) => {
    let r = memo.get(forma);
    if (r === undefined) {
      if (memo.size > LIMITE_DA_MEMORIA) memo.clear();
      r = embaralhar(proibidos.chave, forma);
      memo.set(forma, r);
    }
    return r;
  };
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

const git = (raiz, ...args) => execFileSync('git', args, { cwd: raiz, maxBuffer: 1 << 30 }).toString('utf8');

/* [{ caminho, blob }] do índice */
export function indice(raiz) {
  return git(raiz, 'ls-files', '-s', '-z')
    .split('\0')
    .filter(Boolean)
    .map((l) => { const [meta, caminho] = l.split('\t'); return { caminho, blob: meta.split(' ')[1] }; });
}

export function arquivosRastreados(raiz) {
  return indice(raiz).map(({ caminho }) => caminho);
}

export function ehBinario(caminho, buffer) {
  const ext = caminho.includes('.') ? caminho.split('.').pop().toLowerCase() : '';
  return EXTENSOES_BINARIAS.has(ext) || buffer.includes(0);
}

/* devolve [{ caminho, linha }] sem nunca incluir o trecho; linha 0 quer dizer o próprio caminho do arquivo, e o caminho que
   contém termo sai como `blob <id>` (ache-o com `git ls-files -s | grep <id>`) */
export function varrerRepositorio(raiz, proibidos) {
  const achados = [];
  for (const { caminho, blob } of indice(raiz)) {
    if (/(^|\/)(node_modules|dist)\//.test(caminho)) continue;
    const nomeProibido = linhasProibidas(caminho.replace(/\//g, '\n'), proibidos).length > 0;
    const rotulo = nomeProibido ? `blob ${blob}` : caminho;
    if (nomeProibido) achados.push({ caminho: rotulo, linha: 0 });
    const absoluto = join(raiz, caminho);
    if (!existsSync(absoluto) || !statSync(absoluto).isFile()) continue;
    const buffer = readFileSync(absoluto);
    if (ehBinario(caminho, buffer)) continue;
    for (const linha of linhasProibidas(buffer.toString('utf8'), proibidos)) achados.push({ caminho: rotulo, linha });
  }
  return achados;
}

/* mensagens de commit das revisões dadas (padrão: tudo o que algum ref alcança); devolve [{ commit, linha }] e quantos leu */
export function varrerMensagens(raiz, proibidos, { revisoes = ['--all'] } = {}) {
  const saida = git(raiz, 'log', ...revisoes, '--format=%x1e%H%x1f%B');
  const achados = [];
  let lidos = 0;
  for (const bloco of saida.split('\x1e')) {
    if (!bloco) continue;
    const [commit, mensagem = ''] = bloco.split('\x1f');
    lidos++;
    for (const linha of linhasProibidas(mensagem, proibidos)) achados.push({ commit, linha });
  }
  return { achados, lidos };
}

const TIPO_DO_REF = [
  [/^refs\/heads\//, 'ramo'], [/^refs\/remotes\//, 'ramo remoto'], [/^refs\/tags\//, 'tag'],
];

/* nomes de ramo, tag e outros refs, mais nomes avulsos (o ramo do pull request no CI); devolve [{ tipo, aponta }] sem o nome:
   o ref se acha com `git for-each-ref --points-at <aponta>` */
export function varrerReferencias(raiz, proibidos, { avulsos = {} } = {}) {
  const achados = [];
  let lidos = 0;
  for (const l of git(raiz, 'for-each-ref', '--format=%(objectname) %(refname)').split('\n')) {
    if (!l) continue;
    const [aponta, ref] = [l.slice(0, l.indexOf(' ')), l.slice(l.indexOf(' ') + 1)];
    lidos++;
    const curto = ref.replace(/^refs\/(heads|remotes|tags)\//, '');
    if (linhasProibidas(curto, proibidos).length) achados.push({ tipo: TIPO_DO_REF.find(([re]) => re.test(ref))?.[1] ?? 'ref', aponta });
  }
  for (const [origem, nome] of Object.entries(avulsos)) {
    if (!nome) continue;
    lidos++;
    if (linhasProibidas(nome, proibidos).length) achados.push({ tipo: `nome em ${origem}`, aponta: '-' });
  }
  return { achados, lidos };
}

export function ehMalhaOuCena(caminho) {
  const nome = caminho.split('/').pop().replace(COMPRESSAO, '');
  const ext = nome.includes('.') ? nome.split('.').pop().toLowerCase() : '';
  return EXTENSOES_DE_MALHA_OU_CENA.has(ext);
}

/* arquivos de malha ou cena no índice fora das exceções, e exceções que não valem mais (arquivo fora do índice ou com outro
   conteúdo) */
export function malhasNoIndice(raiz, excecoes = EXCECOES_DE_MALHA) {
  const itens = indice(raiz);
  const recusados = itens
    .filter(({ caminho }) => ehMalhaOuCena(caminho))
    .filter(({ caminho, blob }) => !excecoes.some((e) => e.caminho === caminho && e.blob === blob))
    .map(({ caminho, blob }) => (excecoes.some((e) => e.caminho === caminho) ? `${caminho} (conteúdo diferente do da exceção: ${blob})` : caminho));
  const vencidas = excecoes
    .filter((e) => !e.motivo || !itens.some(({ caminho, blob }) => caminho === e.caminho && blob === e.blob))
    .map((e) => e.caminho);
  return { recusados, vencidas };
}

/* `--gerar <arquivo>`: regrava a lista a partir de um arquivo de termos fora do repositório, imprimindo só contagens */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--gerar');
  if (i < 0 || !process.argv[i + 1]) {
    console.error('uso: node tools/arquitetura/termos-proibidos.mjs --gerar <arquivo de termos, um por linha>');
    process.exit(2);
  }
  const chave = lerChave();
  if (!chave) { console.error(COMO_FORNECER_A_CHAVE); process.exit(1); }
  const termos = [...new Set(readFileSync(process.argv[i + 1], 'utf8').split('\n').map((t) => palavras(t).join(' ')).filter(Boolean))];
  if (termos.some((t) => t.split(' ').length > LIMITE_DE_PALAVRAS)) {
    console.error(`há termo de mais de ${LIMITE_DE_PALAVRAS} palavras, que a varredura não alcança`);
    process.exit(1);
  }
  const lista = montarLista(termos, chave);
  writeFileSync(ARQUIVO_DA_LISTA, `${JSON.stringify(lista, null, 2)}\n`);
  console.log(`lista regravada: ${termos.length} termos, ${lista.hashes.length} hashes, ${lista.unidos.length} unidos, ${lista.iniciais.length} iniciais`);
}
