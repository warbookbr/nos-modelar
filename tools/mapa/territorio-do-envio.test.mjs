/* territorio-do-envio.test.mjs — o arquivo mudado sem plano dono nem declaração reprova; o do território, o compartilhado, o gerado
   e o declarado como defeito pontual passam; e, em repositórios de verdade, a main andada por outra sessão não entra na conta, a
   renomeação e o acento são vistos, a declaração solta reprova e a ref ausente reprova no CI. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { conferirTerritorio, declaracoesFora, principal, soMudouAsSecoesAMao } from './territorio-do-envio.mjs';

/* a extensão entra por interpolação: o gate de links lê caminho de documento escrito inteiro como link */
const MD = 'md';
const territorios = [{ plano: '2026-11-26-a.md', caminhos: ['tools/a/', 'notas/x.md'] }];
const mudados = (...caminhos) => caminhos.map((c) => (typeof c === 'string' ? { caminho: c, novo: false } : c));

describe('território do envio, a conta', () => {
  it('passa o que tem dono, o compartilhado e o gerado', () => {
    expect(conferirTerritorio(mudados('tools/a/um.mjs', 'notas/x.md', 'package.json', 'docs/MAPA.md', 'CLAUDE.md', 'docs/modelar/decisoes/README.md'), territorios).fora).toEqual([]);
  });

  it('o DOSSIE.md de objeto é gerado e passa, e o .md à mão na pasta do objeto não', () => {
    expect(conferirTerritorio(mudados(`procedural/pecas/roda/DOSSIE.${MD}`, `procedural/pecas/carro/partes/porta/DOSSIE.${MD}`), territorios).fora).toEqual([]);
    expect(conferirTerritorio(mudados(`procedural/pecas/roda/NOTAS.${MD}`, `docs/DOSSIE.${MD}`, `tools/DOSSIE.${MD}`), territorios).fora).toHaveLength(3);
  });

  it('só o DOSSIE.md da raiz do objeto e o de partes/<parte>/ são gerados; o de qualquer outra pasta, escrito à mão, não', () => {
    const fora = ['rodadas', 'referencias', 'partes/porta/rodadas', 'partes/porta/x', 'a/b'].map((p) => `procedural/pecas/carro/${p}/DOSSIE.${MD}`);
    expect(conferirTerritorio(mudados(...fora), territorios).fora).toEqual(fora);
    expect(conferirTerritorio(mudados(`procedural/pecas/carro/DOSSIE.${MD}`, `procedural/pecas/carro/partes/porta/DOSSIE.${MD}`), territorios).fora).toEqual([]);
  });

  it('o dossiê que só mudou nas seções à mão deixa de ser gerado e precisa do território do plano que cobre o objeto', () => {
    const arquivo = `procedural/pecas/carro/DOSSIE.${MD}`;
    const ini = '<!-- dossie:a-mao:peca:inicio -->'; const fim = '<!-- dossie:a-mao:peca:fim -->';
    const antes = `# D\n\ngerado\n\n${ini}\n- a escrever\n${fim}\n`;
    expect(soMudouAsSecoesAMao(antes, antes.replace('a escrever', 'escolha: porque'))).toBe(true);
    expect(soMudouAsSecoesAMao(antes, antes.replace('gerado', 'regerado'))).toBe(false);
    expect(soMudouAsSecoesAMao(antes, antes)).toBe(false);
    expect(conferirTerritorio([{ caminho: arquivo, novo: false, soAMao: true }], territorios).fora).toEqual([arquivo]);
    expect(conferirTerritorio([{ caminho: arquivo, novo: false, soAMao: true }], [{ plano: 'p', caminhos: ['procedural/pecas/carro/'] }]).fora).toEqual([]);
    expect(conferirTerritorio([{ caminho: arquivo, novo: false }], territorios).fora).toEqual([]);
  });

  it('reprova o arquivo sem dono, e a declaração do arquivo exato o libera', () => {
    expect(conferirTerritorio(mudados('tools/b/dois.mjs', 'tools/a/um.mjs'), territorios).fora).toEqual(['tools/b/dois.mjs']);
    const declarados = declaracoesFora('Conserta o link\n\nFora-do-territorio: tools/b/dois.mjs, defeito pontual do link\n');
    expect(declarados).toEqual([{ caminho: 'tools/b/dois.mjs', motivo: 'defeito pontual do link' }]);
    expect(conferirTerritorio(mudados('tools/b/dois.mjs'), territorios, declarados)).toEqual({ fora: [], soltas: [] });
  });

  it('a pasta declarada vale só quando o envio cria todos os arquivos dela', () => {
    const pasta = [{ caminho: 'notas/nova/', motivo: 'pasta nova' }];
    expect(conferirTerritorio(mudados({ caminho: 'notas/nova/a.md', novo: true }, { caminho: 'notas/nova/b.md', novo: true }), territorios, pasta).fora).toEqual([]);
    const r = conferirTerritorio(mudados({ caminho: 'notas/nova/a.md', novo: true }, 'notas/nova/velho.md'), territorios, pasta);
    expect(r.fora).toEqual(['notas/nova/a.md', 'notas/nova/velho.md']);
    expect(r.soltas).toEqual(pasta);
  });

  it('a declaração sem motivo não vale, e a que não casa com arquivo mudado sai como solta', () => {
    expect(declaracoesFora('Fora-do-territorio: tools/b/dois.mjs\n')).toEqual([]);
    expect(conferirTerritorio(mudados('tools/a/um.mjs'), territorios, [{ caminho: 'tools/b/dosi.mjs', motivo: 'erro' }]).soltas).toHaveLength(1);
  });
});

const pastas = [];
afterEach(() => { while (pastas.length) rmSync(pastas.pop(), { recursive: true, force: true }); });
const ambienteGit = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', env: ambienteGit }).trim();
const escrever = (cwd, arquivo, texto) => { mkdirSync(dirname(join(cwd, arquivo)), { recursive: true }); writeFileSync(join(cwd, arquivo), texto); };
const plano = (territorio) => `# Plano\n\n**Estado:** ativo\n\n**Núcleo:** não\n\n**Território:** ${territorio}\n`;

/* a origem com a main e um plano ativo dono de tools/a/; o ramo da sessão; a outra sessão */
function cenario() {
  const raiz = mkdtempSync(join(tmpdir(), 'territorio-')); pastas.push(raiz);
  const origem = join(raiz, 'origem.git'); git(raiz, 'init', '-q', '--bare', '-b', 'main', origem);
  const ramo = join(raiz, 'ramo'); git(raiz, 'clone', '-q', origem, ramo);
  escrever(ramo, 'docs/modelar/planos/' + '2026-11-26-a.md', plano('`tools/a/`'));
  escrever(ramo, 'solto.md', 'antes\n'); escrever(ramo, 'procedural/nucleo/x.js', 'x\n');
  git(ramo, 'add', '-A'); git(ramo, 'commit', '-qm', 'base'); git(ramo, 'push', '-q', 'origin', 'HEAD:main');
  git(ramo, 'checkout', '-qb', 'claude/x');
  const outra = join(raiz, 'outra'); git(raiz, 'clone', '-q', origem, outra);
  const rodar = (argv = [], ambiente = {}) => {
    const erros = []; const saidas = [];
    const e = vi.spyOn(console, 'error').mockImplementation((t) => erros.push(t));
    const s = vi.spyOn(console, 'log').mockImplementation((t) => saidas.push(t));
    try { return { codigo: principal(ramo, argv, ambiente), texto: [...saidas, ...erros].join('\n') }; } finally { e.mockRestore(); s.mockRestore(); }
  };
  const gravar = (arquivo, texto, mensagem = 'muda') => { escrever(ramo, arquivo, texto); git(ramo, 'add', '-A'); git(ramo, 'commit', '-qm', mensagem); };
  return { ramo, outra, rodar, gravar };
}

describe('território do envio, em repositórios de verdade', () => {
  it('o que a outra sessão pôs na main depois não entra na conta', () => {
    const c = cenario();
    c.gravar('tools/a/um.mjs', 'um\n');
    escrever(c.outra, 'solto.md', 'depois\n'); git(c.outra, 'commit', '-qam', 'outra\n\nFora-do-territorio: solto.md, da outra sessão'); git(c.outra, 'push', '-q', 'origin', 'HEAD:main');
    git(c.ramo, 'fetch', '-q', 'origin');
    const r = c.rodar();
    expect(r.codigo, r.texto).toBe(0);
    expect(r.texto).toMatch(/1 arquivo\(s\) mudados desde a base/);
  });

  it('a renomeação para dentro do território não esconde o arquivo que saiu do núcleo', () => {
    const c = cenario();
    mkdirSync(join(c.ramo, 'tools/a'), { recursive: true }); git(c.ramo, 'mv', 'procedural/nucleo/x.js', 'tools/a/x.js'); git(c.ramo, 'commit', '-qm', 'move');
    git(c.ramo, 'fetch', '-q', 'origin');
    const r = c.rodar();
    expect(r.codigo).toBe(1);
    expect(r.texto).toMatch(/- procedural\/nucleo\/x\.js/);
  });

  it('o caminho com acento é lido como é e se declara', () => {
    const c = cenario();
    c.gravar('docs/análise.md', 'a\n', 'nova\n\nFora-do-territorio: docs/análise.md, prova do acento');
    git(c.ramo, 'fetch', '-q', 'origin');
    expect(c.rodar().codigo).toBe(0);
    c.gravar('docs/ação.md', 'b\n');
    const r = c.rodar();
    expect(r.codigo).toBe(1);
    expect(r.texto).toMatch(/- docs\/ação\.md/);
  });

  it('em repositório de verdade, a edição só das seções à mão do dossiê fora do território reprova, e a regeração passa', () => {
    const c = cenario();
    const ini = '<!-- dossie:a-mao:peca:inicio -->'; const fim = '<!-- dossie:a-mao:peca:fim -->';
    const dossie = `procedural/pecas/obj/DOSSIE.${MD}`;
    const texto = (g, m) => `# D\n${g}\n${ini}\n${m}\n${fim}\n`;
    c.gravar(dossie, texto('gerado', '- a escrever'), 'dossie\n\nFora-do-territorio: procedural/pecas/obj/, objeto novo');
    git(c.ramo, 'push', '-q', 'origin', 'HEAD:main');
    git(c.ramo, 'fetch', '-q', 'origin');
    c.gravar(dossie, texto('gerado', '- escolha: porque'));
    const r = c.rodar();
    expect(r.codigo, r.texto).toBe(1);
    expect(r.texto).toContain(dossie);
    c.gravar(dossie, texto('regerado', '- escolha: porque'));
    expect(c.rodar().codigo).toBe(0);
  });

  it('a ref ausente passa fora do CI e reprova no CI e com --base explícito', () => {
    const c = cenario();
    c.gravar('solto.md', 'mudou\n');
    expect(c.rodar(['--base=nao-existe']).codigo).toBe(1);
    expect(c.rodar(['--base=']).codigo).toBe(1);
    git(c.ramo, 'update-ref', '-d', 'refs/remotes/origin/main');
    expect(c.rodar([], {}).codigo).toBe(0);
    expect(c.rodar([], { CI: 'true' }).codigo).toBe(1);
  });

  it('a declaração que sobra só avisa, e a pasta que já existia na base não se libera inteira', () => {
    const c = cenario();
    c.gravar('solto.md', 'conserto\n', 'conserta\n\nFora-do-territorio: solto.md, conserto');
    c.gravar('solto.md', 'antes\n', 'desfaz');
    git(c.ramo, 'fetch', '-q', 'origin');
    const r = c.rodar();
    expect(r.codigo, r.texto).toBe(0);
    expect(r.texto).toMatch(/aviso: 1 declaração\(ões\) que não liberam nada/);
    c.gravar('procedural/nucleo/nova.js', 'n\n', 'nova\n\nFora-do-territorio: procedural/nucleo/, arquivo novo');
    const r2 = c.rodar();
    expect(r2.codigo).toBe(1);
    expect(r2.texto).toMatch(/- procedural\/nucleo\/nova\.js/);
  });

  it('o rótulo sozinho no fim da linha não pega a frase de baixo', () => {
    expect(declaracoesFora('Fora-do-territorio:\nDepois disso, outra coisa\n')).toEqual([]);
  });

  it('o plano que se encerra no envio continua dono do que ele mudou', () => {
    const c = cenario();
    c.gravar('tools/a/um.mjs', 'um\n');
    rmSync(join(c.ramo, 'docs/modelar/planos/' + '2026-11-26-a.md')); git(c.ramo, 'commit', '-qam', 'encerra');
    git(c.ramo, 'fetch', '-q', 'origin');
    const r = c.rodar();
    expect(r.codigo, r.texto).toBe(0);
  });
});
