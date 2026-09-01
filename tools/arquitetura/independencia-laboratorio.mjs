#!/usr/bin/env node
/* independencia-laboratorio.mjs — a guarda que sustenta a incubação: o núcleo
 * da Mecanifica nunca importa `laboratorio/`. É esta direção, e só ela, que
 * permite o laboratório viver na `main` sem virar dependência de quem só quer
 * modelar — e que permite removê-lo apagando um diretório.
 *
 * Varre os imports estáticos de `git ls-files` (JS, TS e Python) e recusa a
 * aresta proibida nomeando arquivo e linha. Limite conhecido: arquivo ainda não
 * rastreado não é visto, então ela protege a `main`, não o meio da edição.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const EXTENSOES_ESTATICAS = /\.(?:(?:c|m)?js|(?:c|m)?ts|jsx|tsx|py)$/i;
const RAIZES_MECANIFICA = /^(?:src|tools|prototipos|modulos)(?:\/|\.)/;

function normalizar(caminho) {
  return caminho.replaceAll('\\', '/');
}

function importsEstaticos(arquivo, texto) {
  const imports = [];
  const python = arquivo.endsWith('.py');

  if (python) {
    for (const [indice, linha] of texto.split(/\r?\n/).entries()) {
      const de = linha.match(/^\s*from\s+([^\s]+)\s+import\s+/);
      if (de) imports.push({ linha: indice + 1, especificador: de[1] });

      const direto = linha.match(/^\s*import\s+(.+)$/);
      if (direto) {
        const clausula = direto[1].split('#', 1)[0].split(';', 1)[0];
        for (const item of clausula.split(',')) {
          imports.push({ linha: indice + 1, especificador: item.trim().split(/\s+as\s+/)[0] });
        }
      }
    }
    return imports;
  }

  const linhaNaPosicao = (posicao) => texto.slice(0, posicao).split('\n').length;
  const declaracao = /^\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  for (const ocorrencia of texto.matchAll(declaracao)) {
    imports.push({ linha: linhaNaPosicao(ocorrencia.index), especificador: ocorrencia[1] });
  }

  const requireEstatico = /^\s*(?:(?:(?:const|let|var)\s+.+?|module\.exports)\s*=\s*)?require\(\s*['"]([^'"]+)['"]\s*\)/gm;
  for (const ocorrencia of texto.matchAll(requireEstatico)) {
    imports.push({ linha: linhaNaPosicao(ocorrencia.index), especificador: ocorrencia[1] });
  }

  return imports;
}

function destinoRelativo(importador, especificador) {
  if (!especificador.startsWith('.')) return normalizar(especificador);
  return posix.normalize(posix.join(posix.dirname(importador), especificador));
}

function importaLaboratorio(importador, especificador) {
  const destino = destinoRelativo(importador, especificador).replace(/^\.\//, '');
  return destino === 'laboratorio' || destino.startsWith('laboratorio/') || destino.startsWith('laboratorio.');
}

function importaPortaMecanifica(importador, especificador) {
  if (especificador.startsWith('.')) {
    const destino = destinoRelativo(importador, especificador);
    return !destino.startsWith('laboratorio/');
  }
  return RAIZES_MECANIFICA.test(normalizar(especificador)) || especificador === 'mecanifica' || especificador.startsWith('mecanifica.');
}

export function verificarIndependenciaLaboratorio({ repo = REPO } = {}) {
  const lista = execFileSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8' });
  const arquivos = lista.split('\0').filter((arquivo) => EXTENSOES_ESTATICAS.test(arquivo));
  const problemas = [];

  for (const arquivoOriginal of arquivos) {
    const arquivo = normalizar(arquivoOriginal);
    const noLaboratorio = arquivo.startsWith('laboratorio/');
    const noAdaptador = arquivo.startsWith('laboratorio/adaptadores/mecanifica-node/');
    const texto = readFileSync(resolve(repo, arquivoOriginal), 'utf8');

    for (const entrada of importsEstaticos(arquivo, texto)) {
      if (!noLaboratorio && importaLaboratorio(arquivo, entrada.especificador)) {
        problemas.push(`${arquivo}:${entrada.linha}: Mecanifica importa laboratorio: ${entrada.especificador}`);
      } else if (noLaboratorio && !noAdaptador && importaPortaMecanifica(arquivo, entrada.especificador)) {
        problemas.push(`${arquivo}:${entrada.linha}: laboratorio importa porta Mecanifica fora do adaptador: ${entrada.especificador}`);
      }
    }
  }

  return problemas;
}

const chamadoDireto = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (chamadoDireto) {
  const argumentoRepo = process.argv.slice(2).find((argumento) => argumento.startsWith('--repo='));
  const repo = argumentoRepo ? resolve(argumentoRepo.slice('--repo='.length)) : REPO;
  const problemas = verificarIndependenciaLaboratorio({ repo });
  if (problemas.length) {
    console.error(`arquitetura:lab:check FALHOU — ${problemas.length} dependência(s):`);
    for (const problema of problemas) console.error(`  - ${problema}`);
    process.exit(1);
  }
  console.log('arquitetura:lab:check ok — fronteira direcional preservada');
}
