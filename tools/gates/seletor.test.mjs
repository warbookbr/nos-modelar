/* seletor.test.mjs — o gate roda só se algo do que ele lê mudou desde a última rodada verde, e os testes vão pelo grafo de
   imports só quando tudo o que mudou é código que o grafo acompanha. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decidir, fechoDosImports, fotografar, mudadosEntre, registroVerde, rodouInteiro, visivelNoGrafo } from './seletor.mjs';

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
    expect(visivelNoGrafo('tools/modelar/descrever-peca.mjs')).toBe(true);
    expect(visivelNoGrafo('procedural/pecas/trator/receita.js')).toBe(false);
    expect(visivelNoGrafo('tools/modelar/fixtures/x.js')).toBe(false);
    expect(visivelNoGrafo('docs/modelar/INDEX.md')).toBe(false);
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

  it('o dado mudado roda só os testes cujo registro diz lê-lo; código apagado e arquivo não lido pelo fs rodam o modo inteiro', () => {
    const raiz = repositorio({ 'src/a.js': 'a', 'src/b.js': 'b', [DOC]: 'x', 'docs/y.json': '{}', 'tools/blender/c.py': 'c' });
    const foto = fotografar(raiz);
    const verdes = { 'test:lentos': registroVerde('test:lentos', foto) };
    const leituras = {
      'tools/le-doc.test.mjs': { arquivos: new Set([DOC]), pastas: new Set(), tudo: false },
      'tools/lista-docs.test.mjs': { arquivos: new Set(), pastas: new Set(['docs']), tudo: false },
      'tools/nada.test.mjs': { arquivos: new Set(['package.json']), pastas: new Set(), tudo: false },
    };
    const comTestes = { ...foto, 'tools/le-doc.test.mjs': '1', 'tools/lista-docs.test.mjs': '2', 'tools/nada.test.mjs': '3' };
    writeFileSync(join(raiz, DOC), 'x2');
    const soDoc = { ...fotografar(raiz), 'tools/le-doc.test.mjs': '1', 'tools/lista-docs.test.mjs': '2', 'tools/nada.test.mjs': '3' };
    const v = { 'test:lentos': registroVerde('test:lentos', comTestes) };
    /* o documento só mudou de conteúdo: quem lista a pasta dele não muda de resposta */
    expect(decidir('test:lentos', soDoc, v, leituras)).toMatchObject({ rodar: true, testes: ['tools/le-doc.test.mjs'] });
    const novo = { ...soDoc, 'docs/novo.json': '9' };
    expect(decidir('test:lentos', novo, v, leituras)).toMatchObject({ rodar: true, testes: ['tools/le-doc.test.mjs', 'tools/lista-docs.test.mjs'] });
    expect(decidir('test:lentos', soDoc, v, {})).toMatchObject({ rodar: false });
    expect(decidir('test:lentos', soDoc, { 'test:lentos': { ...v['test:lentos'], leiturasCompletas: false } }, leituras)).toMatchObject({ testes: null });
    writeFileSync(join(raiz, 'tools/blender/c.py'), 'c2');
    expect(decidir('test:lentos', fotografar(raiz), verdes, leituras)).toMatchObject({ rodar: true, testes: null });
    writeFileSync(join(raiz, 'tools/blender/c.py'), 'c');
    rmSync(join(raiz, 'src/b.js'));
    expect(decidir('test:lentos', fotografar(raiz), verdes, leituras).motivo).toMatch(/apagado/);
    rmSync(raiz, { recursive: true, force: true });
  });

  it('o registro de leituras fica completo depois do modo inteiro e continua completo nas rodadas parciais', () => {
    const inteiro = registroVerde('test:rapidos', {}, { testes: null });
    expect(inteiro.leiturasCompletas).toBe(true);
    expect(registroVerde('test:rapidos', {}, { testes: ['a'], anterior: inteiro }).leiturasCompletas).toBe(true);
    expect(registroVerde('test:rapidos', {}, { testes: ['a'], anterior: null }).leiturasCompletas).toBe(false);
  });

  it('o test:lentos sem lista do seletor e fora do --completo não grava verde, porque não rodou o modo inteiro', () => {
    expect(rodouInteiro('test:lentos', null, false)).toBe(false);
    expect(rodouInteiro('test:lentos', null, true)).toBe(true);
    expect(rodouInteiro('test:lentos', ['src/a.js'], false)).toBe(true);
    expect(rodouInteiro('test:rapidos', null, false)).toBe(true);
  });

  it('o fecho dos imports segue import, export, import dinâmico com texto fixo e caminho absoluto do servidor', () => {
    const raiz = repositorio({
      'src/e.js': "import { a } from './a.js';\nexport * from '../lib/b';\nconst c = () => import('/src/c.js');",
      'src/a.js': "import x from 'three';", 'lib/b/index.js': "export const b = 1;", 'src/c.js': '', 'src/solto.js': '',
    });
    const fecho = fechoDosImports(raiz, ['src/e.js'], fotografar(raiz));
    expect([...fecho].sort()).toEqual(['lib/b/index.js', 'src/a.js', 'src/c.js', 'src/e.js']);
    rmSync(raiz, { recursive: true, force: true });
  });
});
