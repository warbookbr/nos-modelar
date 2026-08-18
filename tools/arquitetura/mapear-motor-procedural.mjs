/* Mapa estático da fachada procedural. É uma evidência de arquitetura: não é
   importado pelo motor e não participa da execução de receitas. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const rel = (arquivo) => relative(raiz, arquivo).replaceAll('\\', '/');
const arquivoFachada = resolve(raiz, 'prototipos/procedural/v3/motor/oficina.js');
const arquivoNucleo = resolve(raiz, 'prototipos/procedural/v3/motor/nucleo.js');
const ignorados = new Set(['.git', 'node_modules', 'dist', 'coverage']);

function arquivosSob(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const arquivo = resolve(dir, entrada.name);
    if (entrada.isDirectory()) return ignorados.has(entrada.name) ? [] : arquivosSob(arquivo);
    return entrada.isFile() ? [arquivo] : [];
  });
}

function linhaDe(texto, indice) { return texto.slice(0, indice).split('\n').length; }

function importsDo(texto) {
  return [...texto.matchAll(/^import\s+(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"];?/gm)]
    .map((m) => m[1]).sort();
}

function operacoesDo(texto) {
  const inicio = texto.indexOf('export const OPS = {');
  if (inicio < 0) throw new Error('OPS não encontrado na fachada procedural.');
  const trecho = texto.slice(inicio);
  const achados = [...trecho.matchAll(/^  ([a-zA-Z][\w]*)\(st, a, i\) \{/gm)];
  return achados.map((m, indice) => {
    const posicao = inicio + m.index;
    const proxima = achados[indice + 1];
    const fim = proxima ? inicio + proxima.index : texto.indexOf('\n};', posicao);
    return { nome: m[1], linhaInicial: linhaDe(texto, posicao), linhas: linhaDe(texto, fim) - linhaDe(texto, posicao) };
  });
}

function exportsDo(texto) {
  return [...texto.matchAll(/^export\s+(?:const|function|class)\s+([\w$]+)/gm)].map((m) => m[1]).sort();
}

export function mapearMotorProcedural() {
  const fonte = readFileSync(arquivoNucleo, 'utf8');
  const moduloMotor = arquivosSob(resolve(raiz, 'prototipos/procedural/v3/motor')).map(rel).sort();
  const consumidores = arquivosSob(raiz)
    .filter((arquivo) => arquivo !== arquivoNucleo && /\.(?:[cm]?[jt]sx?)$/.test(arquivo))
    .filter((arquivo) => readFileSync(arquivo, 'utf8').includes('motor/oficina.js'))
    .map((arquivo) => rel(arquivo)).sort();
  return {
    formato: 'mecanifica.mapa-motor-procedural',
    versao: 1,
    fachada: { arquivo: rel(arquivoFachada), linhas: readFileSync(arquivoFachada, 'utf8').split('\n').length },
    fonte: { arquivo: rel(arquivoNucleo), sha256: createHash('sha256').update(fonte).digest('hex'), linhas: fonte.split('\n').length },
    exportacoes: exportsDo(fonte),
    operacoes: operacoesDo(fonte),
    dependenciasDiretas: importsDo(fonte),
    modulosDoMotor: moduloMotor,
    consumidores,
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const mapa = mapearMotorProcedural();
  if (process.argv.includes('--json')) console.log(JSON.stringify(mapa, null, 2));
  else console.log(`${mapa.operacoes.length} operações; ${mapa.exportacoes.length} exportações; ${mapa.consumidores.length} consumidores.`);
  if (process.argv.includes('--check') && (!mapa.operacoes.length || !mapa.consumidores.length || !existsSync(arquivoFachada) || !existsSync(arquivoNucleo))) process.exitCode = 1;
}
