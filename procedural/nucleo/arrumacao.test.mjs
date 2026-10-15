/* arrumacao.test.mjs — segura a arrumação do plano "o núcleo mora num lugar
   só" (2026-09-22). Antes dele, os testes do núcleo moravam espalhados por
   `tools/` e ninguém sabia, olhando a pasta, o que provava o núcleo e o que
   provava ferramenta. Nada impedia a bagunça de voltar no próximo teste novo.

   Duas recusas:

   (1) Teste fora de `procedural/nucleo/` que prova só o núcleo. O critério é
       medido no arquivo: todos os imports locais dele apontam para
       `procedural/`, e ele não lê arquivo nenhum. Teste que importa o núcleo e
       também uma ferramenta, ou que lê um documento para cobrar dele o que o
       núcleo faz, prova a ferramenta ou o documento e fica onde está.

   (2) Pasta chamada `motor`. A palavra servia a duas coisas diferentes, o
       núcleo e o motor de prancha, e a mesma palavra em dois lugares foi o que
       espalhou o núcleo. Documento de histórico pode citar o nome antigo; pasta
       de programa não. A pasta de uma peça do acervo (`procedural/pecas/`) não
       é pasta de programa: ela tem o nome da parte do objeto, e o avião e a
       picape têm motor.

   A raiz vem do diretório onde o vitest roda, e o teste recusa em voz alta se
   ali não estiver o `package.json` deste repositório ou se a varredura não
   achar teste nenhum: varredura vazia passaria calada. */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';

const RAIZ = process.cwd();
const PULAR = new Set(['node_modules', 'dist', '.git', 'coverage', 'test-results']);

function exigirRaiz() {
  const pacote = join(RAIZ, 'package.json');
  if (!existsSync(pacote) || JSON.parse(readFileSync(pacote, 'utf8')).name !== 'mecanifica') {
    throw new Error(`o teste precisa rodar da raiz do repositório; rodou de ${RAIZ}.`);
  }
}

function varrer(pasta, achados = { testes: [], pastas: [] }) {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    if (PULAR.has(entrada.name)) continue;
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      achados.pastas.push(relative(RAIZ, caminho));
      varrer(caminho, achados);
    } else if (/\.test\.(m?js|ts)$/.test(entrada.name)) {
      achados.testes.push(relative(RAIZ, caminho));
    }
  }
  return achados;
}

const IMPORT_LOCAL = /(?:from\s+|import\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g;
const LE_ARQUIVO = /\breadFile(Sync)?\s*\(/;

export function provaSoONucleo(arquivo, texto) {
  const alvos = [...texto.matchAll(IMPORT_LOCAL)]
    .map((m) => relative(RAIZ, resolve(RAIZ, dirname(arquivo), m[1])));
  if (alvos.length === 0) return false;
  if (!alvos.some((alvo) => alvo.startsWith(`procedural${sep}nucleo${sep}`))) return false;
  if (LE_ARQUIVO.test(texto)) return false;
  return alvos.every((alvo) => alvo.startsWith(`procedural${sep}`));
}

describe('a arrumação do núcleo', () => {
  exigirRaiz();
  const { testes, pastas } = varrer(RAIZ);

  it('a varredura enxerga os testes do repositório', () => {
    expect(testes.length).toBeGreaterThan(100);
    expect(testes).toContain(join('procedural', 'nucleo', 'arrumacao.test.mjs'));
  });

  it('teste que prova só o núcleo mora na pasta do núcleo', () => {
    const fora = testes
      .filter((arquivo) => !arquivo.startsWith(`procedural${sep}nucleo${sep}`))
      .filter((arquivo) => provaSoONucleo(arquivo, readFileSync(join(RAIZ, arquivo), 'utf8')));
    expect(fora, 'mova para procedural/nucleo/, na pasta da operação que o teste prova').toEqual([]);
  });

  it('nenhuma pasta de programa se chama motor', () => {
    const acervo = `procedural${sep}pecas${sep}`;
    const erradas = pastas.filter((pasta) => !pasta.startsWith(acervo) && pasta.split(sep).includes('motor'));
    expect(erradas, 'o núcleo se chama nucleo; o motor de prancha ganha nome próprio').toEqual([]);
  });

  it('o critério reconhece o caso que ele recusa e deixa passar os outros', () => {
    const soNucleo = "import { nucleo } from '../../procedural/nucleo/entrada.js';";
    expect(provaSoONucleo('tools/x/a.test.ts', soNucleo)).toBe(true);
    expect(provaSoONucleo('tools/x/a.test.ts', `${soNucleo}\nimport { f } from './ferramenta.mjs';`)).toBe(false);
    expect(provaSoONucleo('tools/x/a.test.ts', `${soNucleo}\nreadFileSync(DOC, 'utf8');`)).toBe(false);
    expect(provaSoONucleo('tools/x/a.test.ts', "import { f } from './ferramenta.mjs';")).toBe(false);
  });
});
