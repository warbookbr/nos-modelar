/* nenhum-teste-desligado.test.mjs — recusa teste desligado para sempre.

   Em 2026-08-31 um commit apagou duas definições de que um teste do MCP
   dependia e, em vez de consertar, trocou `it` por `it.skip`. O teste ficou
   três semanas sem medir nada, e a bateria continuou verde, porque teste
   pulado não reprova. Ninguém percebeu até 2026-09-22, quando a pasta de onde
   ele carregava o material foi esvaziada.

   É recusado `it.skip`, `test.skip`, `describe.skip` e os `.todo`, escritos
   direto no arquivo. Teste que depende de condição da máquina continua
   possível, desde que a condição esteja escrita no código, como
   `process.env.MCP_VISUAL_REAL === '1' ? it : it.skip`: aí o motivo de pular
   fica visível e pode ser ligado.

   A raiz vem do diretório onde o vitest roda, e o teste recusa em voz alta se
   ali não estiver o `package.json` do repositório ou se não achar teste. */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const PULAR = new Set(['node_modules', 'dist', '.git', 'coverage', 'test-results']);
const DESLIGADO = /\b(?:it|test|describe)\.(?:skip|todo)\s*\(/;

function testes(pasta, lista = []) {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    if (PULAR.has(entrada.name)) continue;
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) testes(caminho, lista);
    else if (/\.test\.(m?js|ts)$/.test(entrada.name)) lista.push(caminho);
  }
  return lista;
}

describe('nenhum teste desligado', () => {
  const pacote = join(RAIZ, 'package.json');
  if (!existsSync(pacote) || JSON.parse(readFileSync(pacote, 'utf8')).name !== 'modelar') {
    throw new Error(`o teste precisa rodar da raiz do repositório; rodou de ${RAIZ}.`);
  }
  const arquivos = testes(RAIZ);

  it('a varredura enxerga os testes do repositório', () => {
    expect(arquivos.length).toBeGreaterThan(100);
  });

  it('nenhum teste está pulado sem condição escrita', () => {
    const desligados = [];
    for (const arquivo of arquivos) {
      readFileSync(arquivo, 'utf8').split('\n').forEach((linha, indice) => {
        if (DESLIGADO.test(linha)) desligados.push(`${relative(RAIZ, arquivo)}:${indice + 1}`);
      });
    }
    expect(desligados, 'conserte o teste ou apague-o dizendo o que deixou de ser provado').toEqual([]);
  });

  it('o critério recusa o desligamento e aceita a condição escrita', () => {
    /* Montadas por partes para a varredura não acusar este próprio arquivo. */
    const pula = 'it' + ".skip('x', () => {});";
    const pendente = 'describe' + ".todo('x');";
    expect(DESLIGADO.test(pula)).toBe(true);
    expect(DESLIGADO.test(pendente)).toBe(true);
    expect(DESLIGADO.test("const t = process.env.X === '1' ? it : it.skip;")).toBe(false);
  });
});
