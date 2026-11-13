/* indice-do-banco.test.mjs — o índice do banco de provas sai das pastas, e o repositório está em dia com ele. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FIM, INDICE, INICIO, PASTA_DO_BANCO, conferirIndice, indiceGerado, linhasDoIndice, tituloDe } from './indice-do-banco.mjs';

const raizes = [];
function banco(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'indice-banco-'));
  raizes.push(raiz);
  const todos = { [INDICE]: `Abertura à mão.\n\n- [Solto](SOLTO.md)\n${INICIO}\n${FIM}\n`, ...arquivos };
  for (const [c, t] of Object.entries(todos)) { mkdirSync(dirname(join(raiz, c)), { recursive: true }); writeFileSync(join(raiz, c), t); }
  return raiz;
}
afterEach(() => { for (const r of raizes.splice(0)) rmSync(r, { recursive: true, force: true }); });
const pasta = (n, f) => `${PASTA_DO_BANCO}/${n}/${f}`;

describe('índice do banco de provas', () => {
  it('o título é a primeira linha de nível 1', () => {
    expect(tituloDe('texto\n# O título\n## outro\n')).toBe('O título');
    expect(tituloDe('sem título')).toBeNull();
  });

  it('cada pasta ganha uma linha em ordem alfabética, pelo README ou pelo primeiro .md, e a sem .md entra pelo nome', () => {
    const raiz = banco({
      [pasta('b-com-readme', 'README.md')]: '# Pasta B\n',
      [pasta('b-com-readme', 'A.md')]: '# Não é a entrada\n',
      [pasta('a-sem-readme', 'Z.md')]: '# Z\n',
      [pasta('a-sem-readme', 'M.md')]: '# Primeiro em ordem\n',
      [pasta('c-vazia', 'dado.json')]: '{}',
    });
    expect(linhasDoIndice(raiz).filter((l) => !l.startsWith('  '))).toEqual([
      '- [Primeiro em ordem](a-sem-readme/M.md) — `a-sem-readme`',
      '- [Pasta B](b-com-readme/README.md) — `b-com-readme`',
      '- `c-vazia`',
    ]);
  });

  it('o documento que a entrada não alcança entra recuado, e o que ela liga não', () => {
    const raiz = banco({
      [pasta('p', 'README.md')]: '# P\n\n[filho](filho.md)\n',
      [pasta('p', 'filho.md')]: '# Filho\n',
      [pasta('p', 'solto.md')]: '# Solto da pasta\n',
    });
    expect(linhasDoIndice(raiz)).toEqual([
      '- [P](p/README.md) — `p`',
      '  - [Solto da pasta](p/solto.md) — `p`',
    ]);
  });

  it('em dia passa; pasta nova ou título mudado reprova, dizendo o comando', () => {
    const raiz = banco({ [pasta('p', 'README.md')]: '# P\n' });
    expect(conferirIndice(raiz)).toHaveLength(1);
    writeFileSync(join(raiz, INDICE), indiceGerado(raiz).esperado);
    expect(conferirIndice(raiz)).toEqual([]);
    expect(readFileSync(join(raiz, INDICE), 'utf8')).toContain('Abertura à mão.');
    expect(readFileSync(join(raiz, INDICE), 'utf8')).toContain('- [Solto](SOLTO.md)');
    writeFileSync(join(raiz, pasta('p', 'README.md')), '# Outro título\n');
    expect(conferirIndice(raiz)[0]).toContain('npm run banco:indice:gerar');
    mkdirSync(join(raiz, PASTA_DO_BANCO, 'nova'));
    writeFileSync(join(raiz, pasta('nova', 'README.md')), '# Nova\n');
    writeFileSync(join(raiz, pasta('p', 'README.md')), '# P\n');
    expect(conferirIndice(raiz)).toHaveLength(1);
  });

  it('sem marcadores reprova', () => {
    const raiz = banco({ [INDICE]: 'sem marcadores\n' });
    expect(conferirIndice(raiz)[0]).toContain('marcadores');
  });

  it('o índice do repositório está em dia com as pastas', () => {
    expect(conferirIndice()).toEqual([]);
  });
});
