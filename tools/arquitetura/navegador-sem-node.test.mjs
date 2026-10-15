/* navegador-sem-node.test.mjs — o código que a bancada publicada empacota não importa módulo do Node.
   Em 2026-10-15 as famílias `movel-de-caixa`, `dobradica` e `cilindro-hidraulico` liam o contrato com `readFileSync`; o registro
   das famílias as carrega juntas, e toda receita que expande família nos PASSOS (as asas, a hélice, as empenagens e os trens do
   avião) quebrava na bancada com "readFileSync is not a function", enquanto rodava no terminal. Só o `guarda:escolha` pegou, por
   acaso, porque as asas viraram a primeira peça do acervo. O empacotador troca `node:fs` por um módulo vazio sem avisar, e por isso
   a regra é conferida no código: os `.js` de `procedural/` e `src/` não importam módulo do Node; o `.mjs` é ferramenta de terminal. */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
export const PASTAS_DO_NAVEGADOR = ['procedural', 'src'];
const MODULOS_DO_NODE = ['assert', 'buffer', 'child_process', 'crypto', 'fs', 'fs/promises', 'module', 'os', 'path', 'process', 'stream', 'url', 'util', 'worker_threads', 'zlib'];
const IMPORTA_NODE = new RegExp(String.raw`(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"](node:[^'"]+|${MODULOS_DO_NODE.join('|')})['"]`);

function* arquivos(pasta) {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules' || entrada.name === 'tests' || entrada.name.startsWith('.')) continue;
      yield* arquivos(caminho);
    } else if (entrada.name.endsWith('.js') && !/\.test\.js$/.test(entrada.name)) {
      yield caminho;
    }
  }
}

export function importacoesDoNode(raiz = REPO) {
  const problemas = [];
  for (const pasta of PASTAS_DO_NAVEGADOR) {
    for (const arquivo of arquivos(join(raiz, pasta))) {
      readFileSync(arquivo, 'utf8').split('\n').forEach((linha, i) => {
        const limpa = linha.replace(/\/\/.*$/, '');
        const achado = IMPORTA_NODE.exec(limpa);
        if (achado && !/^\s*\*/.test(linha)) problemas.push(`${relative(raiz, arquivo)}:${i + 1}: importa '${achado[1]}', que não existe na bancada publicada`);
      });
    }
  }
  return problemas;
}

describe('o código que a bancada empacota', () => {
  it('não importa módulo do Node', () => {
    expect(importacoesDoNode()).toEqual([]);
  });

  it('a regra reconhece as formas de importar e deixa passar comentário', () => {
    for (const linha of ["import { readFileSync } from 'node:fs';", "import fs from 'fs'", "const p = await import('node:path')", "const os = require('os')"]) {
      expect(IMPORTA_NODE.test(linha), linha).toBe(true);
    }
    for (const linha of ["import contrato from './familia.json' with { type: 'json' };", "import { x } from './fs-helpers.js'", "const nome = 'fs';"]) {
      expect(IMPORTA_NODE.test(linha), linha).toBe(false);
    }
  });
});
