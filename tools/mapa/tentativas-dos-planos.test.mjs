/* tentativas-dos-planos.test.mjs — a conferência que recusa o plano de modelagem concluído sem a tabela de tentativas, nos dois sentidos. */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bancosDeProvasDe, ehPlanoDeModelagem, problemasDeTentativas, tabelaDeTentativasEm, temTabelaDeTentativas } from './tentativas-dos-planos.mjs';
import { conferirPlanos } from './planos.mjs';

const temporarias = [];
afterEach(() => { while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true }); });

const BANCO = ['docs', 'modelar', 'banco-de-provas'].join('/');
const PLANOS = ['docs', 'modelar', 'planos'].join('/');
const TABELA = '| Hipótese | Ensaio | Resultado medido | Destino |\n| --- | --- | --- | --- |\n| a | b | 1 mm | ficou |\n';
const plano = (estado, territorio) => `# Plano\n\n**Estado:** ${estado}\n\n**Núcleo:** não\n\n**Território:** ${territorio}\n`;

function raiz(arquivos = {}) {
  const pasta = mkdtempSync(join(tmpdir(), 'modelar-tentativas-'));
  temporarias.push(pasta);
  for (const [nome, texto] of Object.entries(arquivos)) {
    mkdirSync(join(pasta, nome, '..'), { recursive: true });
    writeFileSync(join(pasta, nome), texto);
  }
  return pasta;
}

describe('o que é plano de modelagem', () => {
  it('é o plano com território em peças, famílias ou núcleo', () => {
    expect(ehPlanoDeModelagem(plano('ativo', '`procedural/pecas/roda-esportiva/`'))).toBe(true);
    expect(ehPlanoDeModelagem(plano('ativo', '`procedural/familias/cabo/`, `docs/x/`'))).toBe(true);
    expect(ehPlanoDeModelagem(plano('ativo', '`procedural/nucleo/operacoes/corte.js`'))).toBe(true);
  });
  it('não é o de ferramenta, de documento nem o que só toca o registro das famílias', () => {
    expect(ehPlanoDeModelagem(plano('ativo', '`tools/modelar/x.mjs`, `' + ['docs', 'modelar', 'guias', 'a.md'].join('/') + '`'))).toBe(false);
    expect(ehPlanoDeModelagem(plano('ativo', '`procedural/familias/index.js`'))).toBe(false);
    expect(ehPlanoDeModelagem(plano('ativo', 'nenhum (aguarda aprovação)'))).toBe(false);
  });
});

describe('a tabela', () => {
  it('reconhece as quatro colunas em ordem e recusa tabela de outra coisa', () => {
    expect(temTabelaDeTentativas(TABELA)).toBe(true);
    expect(temTabelaDeTentativas('| Hipótese | Resultado | Ensaio | Destino |\n| - | - | - | - |')).toBe(false);
    expect(temTabelaDeTentativas('| Hipótese | Ensaio | Destino |\n')).toBe(false);
    expect(temTabelaDeTentativas('texto sem tabela')).toBe(false);
  });
  it('acha a tabela em qualquer arquivo da pasta do banco de provas', () => {
    const r = raiz({ [`${BANCO}/x/A.md`]: 'sem tabela', [`${BANCO}/x/sub/B.md`]: TABELA });
    expect(tabelaDeTentativasEm(r, `${BANCO}/x/`)).toBe(`${BANCO}/x/sub/B.md`);
    expect(tabelaDeTentativasEm(r, `${BANCO}/y/`)).toBeNull();
  });
  it('as pastas do banco de provas saem do território', () => {
    expect(bancosDeProvasDe(plano('ativo', `\`procedural/pecas/a/\`, \`${BANCO}/x-2026/\`, \`${BANCO}/MODELO-DE-TENTATIVAS.md\``))).toEqual([`${BANCO}/x-2026/`]);
  });
});

describe('a recusa do fechamento', () => {
  const t = `\`procedural/pecas/a/\`, \`${BANCO}/x/\``;
  it('recusa o plano de modelagem concluído cujo banco de provas não tem a tabela', () => {
    const r = raiz({ [`${BANCO}/x/README.md`]: '# sem tabela' });
    const p = problemasDeTentativas([{ nome: '2026-11-27-a.md', estado: 'concluído', texto: plano('concluído', t) }], r);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/2026-11-27-a\.md: plano de modelagem concluído e o banco de provas .* não tem a tabela de tentativas, com as colunas hipótese, ensaio, resultado medido, destino; copie o cabeçalho de .*MODELO-DE-TENTATIVAS\.md/);
  });
  it('recusa o plano de modelagem concluído sem banco de provas no território', () => {
    const p = problemasDeTentativas([{ nome: 'a.md', estado: 'concluído', texto: plano('concluído', '`procedural/pecas/a/`') }], raiz());
    expect(p[0]).toMatch(/sem banco de provas no \*\*Território:\*\*/);
  });
  it('aceita com a tabela, e não cobra plano ativo, cancelado nem o que não é de modelagem', () => {
    const r = raiz({ [`${BANCO}/x/README.md`]: TABELA });
    expect(problemasDeTentativas([{ nome: 'a.md', estado: 'concluído', texto: plano('concluído', t) }], r)).toEqual([]);
    expect(problemasDeTentativas([
      { nome: 'b.md', estado: 'ativo', texto: plano('ativo', '`procedural/pecas/b/`') },
      { nome: 'c.md', estado: 'cancelado', texto: plano('cancelado', '`procedural/pecas/c/`') },
      { nome: 'd.md', estado: 'concluído', texto: plano('concluído', '`tools/d.mjs`') },
    ], raiz())).toEqual([]);
  });
  it('o gate dos planos a aplica ao plano concluído da raiz de planos e não ao de subpasta', () => {
    const r = raiz({
      [`${BANCO}/x/README.md`]: '# sem tabela',
      [`${PLANOS}/README.md`]: '**Planos ativos:** nenhum.\n',
      [`${PLANOS}/2026-11-27-a.md`]: plano('concluído', `\`procedural/pecas/a/\`, \`${BANCO}/x/\``),
      [`${PLANOS}/concluidos/2026-08-01-antigo.md`]: plano('concluído', '`procedural/pecas/z/`'),
    });
    const sem = conferirPlanos({ pasta: join(r, PLANOS), raiz: r }).problemas;
    expect(sem.filter((p) => /tabela de tentativas/.test(p))).toHaveLength(1);
    expect(sem.join('\n')).not.toMatch(/antigo/);
    writeFileSync(join(r, `${BANCO}/x/README.md`), TABELA);
    expect(conferirPlanos({ pasta: join(r, PLANOS), raiz: r }).problemas).toEqual([]);
  });
});
