/* tentativas-dos-planos.test.mjs — a conferência que recusa o plano de modelagem concluído sem a tabela de tentativas, nos dois sentidos. */
import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LINHA_DE_EXEMPLO, bancosDeProvasDe, ehPlanoDeModelagem, problemasDeTentativas, tabelaDeTentativasEm, temTabelaDeTentativas } from './tentativas-dos-planos.mjs';
import { conferirPlanos, encerrarPlano } from './planos.mjs';
import { conferirDossie, gerarDossie } from '../modelar/dossie-do-objeto.mjs';

const AQUI_DOS_DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOSS = ['DOSSIE', 'md'].join('.');
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

describe('o critério de plano de modelagem desconta documento, teste e dado', () => {
  it('o DOSSIE.md, o teste e o json de dado do território não fazem plano de modelagem', () => {
    const t = (...c) => plano('ativo', c.map((x) => `\`${x}\``).join(', '));
    expect(ehPlanoDeModelagem(t(`procedural/pecas/a/${DOSS}`, 'procedural/pecas/a/a.test.mjs', 'procedural/familias/b/alvos.json'))).toBe(false);
    expect(ehPlanoDeModelagem(t('tools/x.mjs', `procedural/pecas/a/${DOSS}`, 'procedural/familias/b/b.test.mjs'))).toBe(false);
    expect(ehPlanoDeModelagem(t(`procedural/pecas/a/${DOSS}`, 'procedural/pecas/a/receita.js'))).toBe(true);
  });
  it('o caminho com ./ na frente conta', () => {
    expect(ehPlanoDeModelagem(plano('ativo', '`./procedural/pecas/a/`'))).toBe(true);
  });
});

describe('o banco de provas não se empresta', () => {
  it('só vale subpasta do banco, nunca a raiz dele nem caminho com ..', () => {
    const t = plano('concluído', `\`procedural/pecas/a/\`, \`${BANCO}\`, \`${BANCO}/\`, \`${BANCO}/../../x/\`, \`${BANCO}/x/../y/\``);
    expect(bancosDeProvasDe(t)).toEqual([]);
    expect(bancosDeProvasDe(plano('concluído', `\`${BANCO}/x/sub\``))).toEqual([`${BANCO}/x/sub/`]);
  });
  it('recusa o território de plano concluído com .. e diz qual caminho', () => {
    const r = raiz({ [`${BANCO}/x/README.md`]: TABELA });
    const p = problemasDeTentativas([{ nome: 'a.md', estado: 'concluído', texto: plano('concluído', `\`tools/a.mjs\`, \`${BANCO}/../../x/\``) }], r);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/a\.md: o \*\*Território:\*\* de plano concluído tem `\.\.` em .*\.\.\/\.\.\/x\//);
  });
  it('a raiz do banco no território não basta: o plano concluído de modelagem fica sem banco', () => {
    const r = raiz({ [`${BANCO}/qualquer/README.md`]: TABELA });
    const p = problemasDeTentativas([{ nome: 'a.md', estado: 'concluído', texto: plano('concluído', `\`procedural/pecas/a/\`, \`${BANCO}/\``) }], r);
    expect(p[0]).toMatch(/sem banco de provas no \*\*Território:\*\*/);
  });
});

describe('o que é tabela de tentativas', () => {
  const CAB = '| Hipótese | Ensaio | Resultado medido | Destino |';
  it('o cabeçalho sozinho, ou com o separador e células vazias, é o modelo copiado e não conta', () => {
    expect(temTabelaDeTentativas(`${CAB}\n`)).toBe(false);
    expect(temTabelaDeTentativas(`${CAB}\n| --- | --- | --- | --- |\n`)).toBe(false);
    expect(temTabelaDeTentativas(`${CAB}\n| --- | --- | --- | --- |\n|  |  |  |  |\n`)).toBe(false);
  });
  it('a linha de exemplo literal do modelo, copiada sem as cercas, não conta, e a linha de exemplo é a que o modelo traz', () => {
    const modelo = readFileSync(join(AQUI_DOS_DOCS, BANCO, 'MODELO-DE-TENTATIVAS.md'), 'utf8');
    expect(modelo).toContain(`| ${LINHA_DE_EXEMPLO.join(' | ')} |`);
    expect(temTabelaDeTentativas(`${CAB}\n| --- | --- | --- | --- |\n| ${LINHA_DE_EXEMPLO.join(' | ')} |\n`)).toBe(false);
    expect(temTabelaDeTentativas(`${CAB}\n| --- | --- | --- | --- |\n| ${LINHA_DE_EXEMPLO.join(' | ')} |\n| a | b | 1 mm | ficou |\n`)).toBe(true);
  });
  it('a tabela dentro de bloco de código (o próprio modelo) não conta', () => {
    expect(temTabelaDeTentativas(`\`\`\`\n${CAB}\n| --- | --- | --- | --- |\n| a | b | c | d |\n\`\`\`\n`)).toBe(false);
    expect(temTabelaDeTentativas(`\`\`\`\ncódigo\n\`\`\`\n${TABELA}`)).toBe(true);
  });
  it('o cabeçalho com negrito e espaços a mais conta', () => {
    expect(temTabelaDeTentativas('|**Hipótese**|  Ensaio |Resultado   medido| __Destino__ |\n|-|-|-|-|\n| a | b | c | d |\n')).toBe(true);
    expect(temTabelaDeTentativas('| **Hipótese** | Ensaio | Resultado  medido | Destino | Data |\n| - | - | - | - | - |\n| a | b | c | d | e |\n')).toBe(true);
  });
  it('a citação em bloco (>) não conta', () => {
    expect(temTabelaDeTentativas(`> ${CAB}\n> | --- | --- | --- | --- |\n> | a | b | c | d |\n`)).toBe(false);
  });
});

describe('o plano que sai da raiz no envio', () => {
  const AQUI = dirname(fileURLToPath(import.meta.url));
  const git = (r, ...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: r, encoding: 'utf8' });
  const concluido = (t) => `# P\n\n**Estado:** concluído\n\n**Núcleo:** não\n\n**Território:** ${t}\n\n## Fechamento\n\nfeito\n`;
  const CRONICA = 'docs/modelar/decisoes/PLANOS-ENCERRADOS.md';
  const base = (extra = {}) => {
    const r = raiz({ [`${PLANOS}/README.md`]: '**Planos ativos:** nenhum.\n', [CRONICA]: '# C\n\n- `x.md`: y. O texto está no commit `abc`, em `x`.\n', ...extra });
    git(r, 'init', '-q'); git(r, 'add', '.'); git(r, 'commit', '-qm', 'base');
    git(r, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    return r;
  };
  const planoSemTabela = { [`${BANCO}/x/README.md`]: '# sem tabela', [`${PLANOS}/2026-11-27-a.md`]: concluido(`\`procedural/pecas/a/\`, \`${BANCO}/x/\``) };

  it('encerrarPlano recusa o plano de modelagem sem tabela antes de mexer em qualquer coisa', () => {
    const r = base(planoSemTabela);
    expect(() => encerrarPlano('2026-11-27-a.md', 'feito', { raiz: r })).toThrow(/plano de modelagem concluído e o banco de provas .* não tem a tabela de tentativas/);
    expect(existsSync(join(r, PLANOS, '2026-11-27-a.md'))).toBe(true);
    expect(readFileSync(join(r, CRONICA), 'utf8')).not.toContain('2026-11-27-a.md');
    expect(git(r, 'status', '--porcelain')).toBe('');
  });

  it('a conferência pega o git rm à mão do plano de modelagem concluído, e o plano com tabela passa', () => {
    const r = base(planoSemTabela);
    git(r, 'rm', '-q', '--', `${PLANOS}/2026-11-27-a.md`);
    git(r, 'commit', '-qm', 'tira o plano');
    const p = conferirPlanos({ pasta: join(r, PLANOS), raiz: r }).problemas;
    expect(p.filter((x) => /tabela de tentativas/.test(x))).toHaveLength(1);
    expect(p.join('\n')).toContain('2026-11-27-a.md: plano de modelagem concluído');
    writeFileSync(join(r, `${BANCO}/x/README.md`), TABELA);
    expect(conferirPlanos({ pasta: join(r, PLANOS), raiz: r }).problemas).toEqual([]);
  });

  it('pega o plano movido para subpasta, e não cobra o removido que não é de modelagem nem o cancelado', () => {
    const r = base({ ...planoSemTabela, [`${PLANOS}/2026-11-27-b.md`]: concluido('`tools/b.mjs`'), [`${PLANOS}/2026-11-27-c.md`]: concluido('`procedural/pecas/c/`').replace('concluído', 'cancelado') });
    mkdirSync(join(r, PLANOS, 'concluidos'), { recursive: true });
    for (const n of ['a', 'b', 'c']) git(r, 'mv', `${PLANOS}/2026-11-27-${n}.md`, `${PLANOS}/concluidos/2026-11-27-${n}.md`);
    git(r, 'commit', '-qm', 'move');
    const p = conferirPlanos({ pasta: join(r, PLANOS), raiz: r }).problemas;
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/^2026-11-27-a\.md: plano de modelagem concluído/);
  });

  it('o fechamento normal com tabela passa e deixa o DOSSIE.md do objeto em dia, sem link para o plano que saiu', async () => {
    const r = raiz({ [`${BANCO}/x/README.md`]: TABELA, [`${PLANOS}/README.md`]: '**Planos ativos:** nenhum.\n', [CRONICA]: '# C\n\n- `x.md`: y. O texto está no commit `abc`, em `x`.\n', [`${PLANOS}/2026-11-27-a.md`]: concluido(`\`procedural/pecas/objeto-de-prova/\`, \`${BANCO}/x/\``) });
    cpSync(join(AQUI, '../fixtures/dossie/procedural/pecas/objeto-de-prova/receita.js'), join(r, 'procedural/pecas/objeto-de-prova/receita.js'), { recursive: true });
    await gerarDossie('objeto-de-prova', { raiz: r });
    const dossie = join(r, 'procedural', 'pecas', 'objeto-de-prova', 'DOSSIE.md');
    expect(readFileSync(dossie, 'utf8')).toContain('2026-11-27-a.md');
    git(r, 'init', '-q'); git(r, 'add', '.'); git(r, 'commit', '-qm', 'plano fechado');
    const { regerados } = encerrarPlano('2026-11-27-a.md', 'a objeto-de-prova ficou', { raiz: r });
    expect(regerados).toMatch(/dossie ok/);
    expect(existsSync(join(r, PLANOS, '2026-11-27-a.md'))).toBe(false);
    expect(readFileSync(dossie, 'utf8')).toContain('`2026-11-27-a.md`: a objeto-de-prova ficou');
    expect(readFileSync(dossie, 'utf8')).not.toContain('planos/2026-11-27-a.md)');
    expect((await conferirDossie('objeto-de-prova', { raiz: r })).problemas).toEqual([]);
  });

  it('o plano tirado da raiz no envio com o último Estado ativo (nem concluído nem cancelado) é recusado, e o movido para subpasta não', () => {
    const emJogo = (estado) => concluido('`tools/b.mjs`').replace('concluído', estado);
    const r = base({ [`${PLANOS}/2026-11-27-a.md`]: emJogo('ativo'), [`${PLANOS}/2026-11-27-b.md`]: emJogo('cancelado'), [`${PLANOS}/2026-11-27-c.md`]: emJogo('concluído') });
    git(r, 'rm', '-q', '--', `${PLANOS}/2026-11-27-a.md`);
    mkdirSync(join(r, PLANOS, 'arquivo'), { recursive: true });
    git(r, 'mv', `${PLANOS}/2026-11-27-b.md`, `${PLANOS}/arquivo/2026-11-27-b.md`);
    git(r, 'rm', '-q', '--', `${PLANOS}/2026-11-27-c.md`);
    git(r, 'commit', '-qm', 'tira');
    const p = conferirPlanos({ pasta: join(r, PLANOS), raiz: r }).problemas.join('\n');
    expect(p).toMatch(/2026-11-27-a\.md: o envio tirou o plano da raiz de planos\/ com o último Estado gravado 'ativo'/);
    expect(p).not.toContain('2026-11-27-b.md: o envio tirou');
    expect(p).not.toContain('2026-11-27-c.md: o envio tirou');
  });

  it('encerrarPlano com um dossiê que falha diz quais foram regravados e quais não, e não se declara sucesso', async () => {
    const r = raiz({ [`${BANCO}/x/README.md`]: TABELA, [`${PLANOS}/README.md`]: '**Planos ativos:** nenhum.\n', [CRONICA]: '# C\n\n- `x.md`: y. O texto está no commit `abc`, em `x`.\n', [`${PLANOS}/2026-11-27-a.md`]: concluido(`\`procedural/pecas/oa/\`, \`procedural/pecas/ob/\`, \`${BANCO}/x/\``) });
    for (const o of ['oa', 'ob']) { cpSync(join(AQUI, '../fixtures/dossie/procedural/pecas/objeto-de-prova/receita.js'), join(r, `procedural/pecas/${o}/receita.js`)); await gerarDossie(o, { raiz: r }); }
    const duplo = join(r, 'procedural', 'pecas', 'ob', DOSS);
    const t = readFileSync(duplo, 'utf8');
    const secao = t.match(/<!-- dossie:a-mao:peca:inicio -->[\s\S]*?<!-- dossie:a-mao:peca:fim -->/)[0];
    writeFileSync(duplo, `${t}\n${secao}\n`);
    git(r, 'init', '-q'); git(r, 'add', '.'); git(r, 'commit', '-qm', 'plano fechado');
    const { regerados, dossiesFalharam } = encerrarPlano('2026-11-27-a.md', 'oa ficou', { raiz: r });
    expect(dossiesFalharam).toBe(true);
    expect(regerados).toMatch(/regravados: oa; não regravados \(e por quê\): ob:/);
    expect(regerados).not.toMatch(/não foram regerados/);
    expect(readFileSync(join(r, 'procedural', 'pecas', 'oa', DOSS), 'utf8')).toContain('`2026-11-27-a.md`: oa ficou');
  });
});
