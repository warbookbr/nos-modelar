#!/usr/bin/env node
/* capacidade.mjs — a primeira parada de quem vai usar um ajudante de gaiola: `npm run capacidade` lista, `npm run capacidade -- <nome>` dá a ficha.
 *
 * A ficha não tem fonte própria: é o trecho do comentário de cabeçalho do arquivo do ajudante que começa na linha `FICHA <nome>` e termina na
 * linha `FIM DA FICHA`. Este comando só o recorta e imprime sem o prefixo de comentário. O trecho segue uma ordem fixa: `serve:` (para que serve),
 * `quando:` (quando usar em vez das outras), `campos:` (um campo por linha, recuado dois espaços, `nome: texto`), `exemplo:` (código mínimo
 * que o teste executa), `peça:` (uma peça do acervo que usa). A ficha cabe em 60 linhas, e o teste confere isso e que cada campo citado
 * aparece no código do arquivo.
 *
 * Uso: npm run capacidade [-- <nome>]   (node tools/modelar/capacidade.mjs [<nome>] [--ajuda]) */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ESTACOES = 'procedural/nucleo/gaiola-por-estacoes.js';

/* arquivo: onde está o comentário com a ficha; funcao e de: a função que o exemplo chama e o arquivo que a exporta. As opções de
   gaiolaPorEstacoes (interpolada, anéis) têm ficha própria, mas o exemplo delas chama gaiolaPorEstacoes. */
export const CAPACIDADES = Object.freeze({
  gaiolaPorEstacoes: { arquivo: ESTACOES, funcao: 'gaiolaPorEstacoes', de: ESTACOES },
  gaiolaPorRede: { arquivo: 'procedural/nucleo/gaiola-por-rede.js', funcao: 'gaiolaPorRede', de: 'procedural/nucleo/gaiola-por-rede.js' },
  gaiolaVarrida: { arquivo: 'procedural/nucleo/gaiola-varrida.js', funcao: 'gaiolaVarrida', de: 'procedural/nucleo/gaiola-varrida.js' },
  gaiolaInterpolada: { arquivo: 'procedural/nucleo/gaiola-interpolada.js', funcao: 'gaiolaPorEstacoes', de: ESTACOES },
  gaiolaAneis: { arquivo: 'procedural/nucleo/gaiola-aneis.js', funcao: 'gaiolaPorEstacoes', de: ESTACOES },
  gaiolaPorLacos: { arquivo: 'procedural/nucleo/gaiola-por-lacos.js', funcao: 'gaiolaPorLacos', de: 'procedural/nucleo/gaiola-por-lacos.js' },
  lacosPelasVistas: { arquivo: 'procedural/nucleo/lacos-pelas-vistas.js', funcao: 'lacosPelasVistas', de: 'procedural/nucleo/lacos-pelas-vistas.js' },
  paineisPorVaos: { arquivo: 'procedural/nucleo/paineis-por-vaos.js', funcao: 'paineisPorVaos', de: 'procedural/nucleo/paineis-por-vaos.js' },
  vaoEntrePartes: { arquivo: 'tools/modelar/vao-entre-partes.mjs', funcao: 'vaoEntrePartes', de: 'tools/modelar/vao-entre-partes.mjs' },
  contornoComArcos: { arquivo: 'procedural/nucleo/arcos-do-contorno.js', funcao: 'contornoComArcos', de: 'procedural/nucleo/arcos-do-contorno.js' },
});

export const LIMITE_DE_LINHAS = 60;

const AJUDA = `npm run capacidade [-- <nome>]  (node tools/modelar/capacidade.mjs)
Sem nome, lista as capacidades de gaiola com uma linha cada. Com o nome, imprime a ficha: para que serve, quando usar em vez das outras,
os campos com uma linha cada, o exemplo mínimo e uma peça do acervo que a usa. A ficha é recortada do comentário de cabeçalho do arquivo
da capacidade, e não existe em outro lugar.
`;

/** O comentário de cabeçalho do arquivo (o primeiro bloco `/* ... *\/`), com o prefixo de comentário tirado de cada linha. */
function cabecalho(fonte) {
  const m = /\/\*([\s\S]*?)\*\//.exec(fonte);
  if (!m) return { linhas: [], fim: 0 };
  return { linhas: m[1].split('\n').map((l) => l.replace(/^\s*\* ?/, '')), fim: m.index + m[0].length };
}

/** lerFicha(fonte) -> { nome, linhas, serve, campos, codigo } ou null; `codigo` é o arquivo sem o comentário de cabeçalho. */
export function lerFicha(fonte) {
  const { linhas, fim } = cabecalho(fonte);
  const de = linhas.findIndex((l) => /^FICHA \S+\s*$/.test(l));
  const ate = linhas.findIndex((l, i) => i > de && /^FIM DA FICHA\s*$/.test(l));
  if (de < 0 || ate < 0) return null;
  const corpo = linhas.slice(de + 1, ate);
  const serve = (corpo.find((l) => l.startsWith('serve: ')) ?? '').slice('serve: '.length).trim();
  const iCampos = corpo.findIndex((l) => l === 'campos:');
  const campos = [];
  for (let i = iCampos + 1; iCampos >= 0 && i < corpo.length && /^ {2}\S/.test(corpo[i]); i += 1) {
    const m = /^ {2}(\w+): /.exec(corpo[i]);
    if (m) campos.push(m[1]);
  }
  const exemploDe = corpo.findIndex((l) => l === 'exemplo:');
  const exemploAte = corpo.findIndex((l, i) => i > exemploDe && !/^ {2}/.test(l));
  const exemplo = exemploDe < 0 ? '' : corpo.slice(exemploDe + 1, exemploAte < 0 ? corpo.length : exemploAte).join('\n');
  return { nome: linhas[de].slice('FICHA '.length).trim(), linhas: corpo, serve, campos, exemplo, codigo: fonte.slice(fim) };
}

function fichaDe(nome) {
  return lerFicha(readFileSync(resolve(REPO, CAPACIDADES[nome].arquivo), 'utf8'));
}

const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const listar = () => Object.keys(CAPACIDADES).map((n) => `${n.padEnd(20)} ${fichaDe(n)?.serve ?? '(sem ficha)'}`).join('\n');

export function executar(args) {
  if (args.includes('--ajuda')) return { codigo: 0, stdout: AJUDA, stderr: '' };
  const nome = args.find((a) => !a.startsWith('--'));
  if (!nome) return { codigo: 0, stdout: `${listar()}\n`, stderr: '' };
  const achado = Object.keys(CAPACIDADES).find((n) => n.toLowerCase() === nome.toLowerCase());
  if (!achado) {
    /* a palavra que não é nome: as capacidades cuja ficha a cita em `serve` ou `quando` (painel, vão, linha de vão, porta, capô) */
    const palavras = semAcento(args.filter((a) => !a.startsWith('--')).join(' ')).split(/\s+/).filter((w) => w.length >= 3);
    const citam = Object.keys(CAPACIDADES).filter((n) => {
      const f = fichaDe(n);
      const texto = semAcento((f?.linhas ?? []).filter((l) => l.startsWith('serve: ') || l.startsWith('quando: ')).join(' '));
      return palavras.length > 0 && palavras.every((w) => texto.includes(w));
    });
    if (citam.length) return { codigo: 0, stdout: `'${nome}' não é o nome de uma capacidade; as que a citam:\n${citam.map((n) => `${n.padEnd(20)} ${fichaDe(n).serve}`).join('\n')}\n`, stderr: '' };
  }
  if (!achado) return { codigo: 2, stdout: '', stderr: `capacidade '${nome}' não existe; as que existem:\n${listar()}\n` };
  const ficha = fichaDe(achado);
  if (!ficha) return { codigo: 2, stdout: '', stderr: `${CAPACIDADES[achado].arquivo} não tem o trecho FICHA ... FIM DA FICHA no comentário de cabeçalho\n` };
  return { codigo: 0, stdout: `${achado}  (${CAPACIDADES[achado].arquivo})\n${ficha.linhas.join('\n')}\n`, stderr: '' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const r = executar(process.argv.slice(2));
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exit(r.codigo);
}
