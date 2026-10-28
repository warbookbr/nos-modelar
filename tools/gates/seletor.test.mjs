/* seletor.test.mjs — o gate roda só se algo do que ele lê mudou desde a última rodada verde, e os testes vão pelo grafo de
   imports só quando tudo o que mudou é código que o grafo acompanha. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decidir, fotografar, mudadosEntre, registroVerde, visivelNoGrafo } from './seletor.mjs';

/* montado por partes para o gate de links não tomar o arquivo do repositório de ensaio por citação */
const DOC = ['docs', 'x.md'].join('/');

function repositorio(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'seletor-'));
  const git = (...a) => execFileSync('git', a, { cwd: raiz });
  git('init', '-q'); git('config', 'user.email', 'x@x'); git('config', 'user.name', 'x');
  for (const [c, t] of Object.entries(arquivos)) { mkdirSync(dirname(join(raiz, c)), { recursive: true }); writeFileSync(join(raiz, c), t); }
  git('add', '-A'); git('commit', '-qm', 'base');
  return raiz;
}

describe('seletor de gates', () => {
  it('o grafo de imports acompanha o código, e não a receita, a fixtura, o JSON nem o documento', () => {
    expect(visivelNoGrafo('procedural/nucleo/friso.js')).toBe(true);
    expect(visivelNoGrafo('tools/mecanifica/descrever-peca.mjs')).toBe(true);
    expect(visivelNoGrafo('procedural/pecas/trator/receita.js')).toBe(false);
    expect(visivelNoGrafo('tools/mecanifica/fixtures/x.js')).toBe(false);
    expect(visivelNoGrafo('docs/mecanifica/INDEX.md')).toBe(false);
    expect(visivelNoGrafo('package.json')).toBe(false);
  });

  it('a foto vê o arquivo editado, o novo e o apagado sem commit', () => {
    const raiz = repositorio({ 'src/a.js': 'a', 'src/b.js': 'b' });
    const antes = fotografar(raiz);
    writeFileSync(join(raiz, 'src/a.js'), 'a2');
    writeFileSync(join(raiz, 'src/c.js'), 'c');
    rmSync(join(raiz, 'src/b.js'));
    expect(mudadosEntre(antes, fotografar(raiz))).toEqual(['src/a.js', 'src/b.js', 'src/c.js']);
    rmSync(raiz, { recursive: true, force: true });
  });

  it('depois de uma rodada verde, o gate só roda de novo se o que ele lê mudou', () => {
    const raiz = repositorio({ 'src/a.js': 'a', [DOC]: 'x' });
    const foto = fotografar(raiz);
    const verdes = { build: registroVerde('build', foto), 'test:rapidos': registroVerde('test:rapidos', foto) };
    expect(decidir('build', foto, verdes).rodar).toBe(false);
    expect(decidir('test:rapidos', foto, verdes).rodar).toBe(false);
    expect(decidir('docs:links:check', foto, verdes).rodar).toBe(true);
    writeFileSync(join(raiz, DOC), 'x2');
    const soDoc = fotografar(raiz);
    expect(decidir('build', soDoc, verdes).rodar).toBe(false);
    expect(decidir('test:rapidos', soDoc, verdes)).toMatchObject({ rodar: true, testes: null });
    writeFileSync(join(raiz, DOC), 'x');
    writeFileSync(join(raiz, 'src/a.js'), 'a2');
    const codigo = fotografar(raiz);
    expect(decidir('build', codigo, verdes).rodar).toBe(true);
    expect(decidir('test:rapidos', codigo, verdes)).toMatchObject({ rodar: true, testes: ['src/a.js'] });
    rmSync(raiz, { recursive: true, force: true });
  });
});
