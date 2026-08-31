/* estrutura-docs.test.mjs — cada gate é visto REPROVANDO antes de ser aceito.
 *
 * Um gate que nunca foi visto vermelho não prova nada: ele pode estar
 * medindo a coisa errada, ou coisa nenhuma. Este repositório já registrou
 * essa falha mais de uma vez, então cada regra aqui ganha um caso que a
 * dispara de propósito, além do caso real que precisa continuar verde. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');
const FERRAMENTA = path.join(AQUI, 'estrutura-docs.mjs');

/* Cada caso monta um repositório git de mentira com a estrutura mínima, porque
   a ferramenta lê o índice do git para saber o que existe. Assim o teste
   dispara a regra sem sujar o repositório de verdade. */
const temporarios = [];
function repoFalso({ docsUsar = {}, skill = '', index = '# INDEX\n', portaUsar }) {
  const raiz = mkdtempSync(path.join(tmpdir(), 'estrutura-'));
  temporarios.push(raiz);
  mkdirSync(path.join(raiz, 'docs/mecanifica/usar'), { recursive: true });
  mkdirSync(path.join(raiz, '.claude/skills/alguma'), { recursive: true });
  writeFileSync(path.join(raiz, 'docs/mecanifica/INDEX.md'), index);
  writeFileSync(
    path.join(raiz, 'docs/mecanifica/usar/README.md'),
    portaUsar ?? '# Usar\n\nporta curta.\n',
  );
  for (const [nome, conteudo] of Object.entries(docsUsar)) {
    writeFileSync(path.join(raiz, 'docs/mecanifica/usar', nome), conteudo);
  }
  writeFileSync(path.join(raiz, '.claude/skills/alguma/SKILL.md'), skill || '# skill\n');
  execFileSync('git', ['init', '-q'], { cwd: raiz });
  execFileSync('git', ['add', '-A'], { cwd: raiz });
  return raiz;
}

function rodar(raiz) {
  try {
    const saida = execFileSync('node', [FERRAMENTA, '--check', `--raiz=${raiz}`], { cwd: raiz, encoding: 'utf8' });
    return { codigo: 0, saida };
  } catch (erro) {
    return { codigo: erro.status ?? 1, saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}` };
  }
}

afterAll(() => {
  for (const dir of temporarios) rmSync(dir, { recursive: true, force: true });
});

describe('gates de estrutura da documentação', () => {
  it('G1 reprova documento de uso que cita documento de desenvolvimento', () => {
    const raiz = repoFalso({
      docsUsar: {
        'CONTRATO.md': 'ver [arquitetura](../ARQUITETURA.md) para a regra.\n',
      },
      skill: 'aplica CONTRATO.md\n',
    });
    const { codigo, saida } = rodar(raiz);
    expect(codigo).toBe(1);
    expect(saida).toContain('G1');
    expect(saida).toContain('ARQUITETURA.md');
  });

  it('G1 aceita a mesma citação quando ela está na allowlist com motivo', () => {
    /* A allowlist é do repositório real, então o caso positivo dela é o próprio
       repositório: as duas exceções escritas continuam passando. */
    const { codigo } = rodar(REPO);
    expect(codigo).toBe(0);
  });

  it('G3 reprova documento de uso que nenhuma skill cita', () => {
    const raiz = repoFalso({
      docsUsar: { 'ORFAO.md': 'regra qualquer.\n' },
      skill: 'não menciona nada\n',
    });
    const { codigo, saida } = rodar(raiz);
    expect(codigo).toBe(1);
    expect(saida).toContain('G3');
    expect(saida).toContain('ORFAO.md');
  });

  it('G3 aceita o documento assim que uma skill passa a citá-lo', () => {
    const raiz = repoFalso({
      docsUsar: { 'ADOTADO.md': 'regra qualquer.\n' },
      skill: 'leia ADOTADO.md antes de gerar forma\n',
    });
    expect(rodar(raiz).codigo).toBe(0);
  });

  it('G5 reprova porta que passou do teto de linhas', () => {
    const raiz = repoFalso({ portaUsar: `# Usar\n${'linha\n'.repeat(100)}` });
    const { codigo, saida } = rodar(raiz);
    expect(codigo).toBe(1);
    expect(saida).toContain('G5');
    expect(saida).toContain('o teto é 60');
  });

  it('reprova quando a pasta de uso some', () => {
    const raiz = mkdtempSync(path.join(tmpdir(), 'estrutura-vazia-'));
    temporarios.push(raiz);
    mkdirSync(path.join(raiz, 'docs/mecanifica'), { recursive: true });
    writeFileSync(path.join(raiz, 'docs/mecanifica/INDEX.md'), '# INDEX\n');
    execFileSync('git', ['init', '-q'], { cwd: raiz });
    execFileSync('git', ['add', '-A'], { cwd: raiz });
    const { codigo, saida } = rodar(raiz);
    expect(codigo).toBe(1);
    expect(saida).toContain('pasta de uso vazia ou ausente');
  });

  it('o repositório real passa nos três gates', () => {
    const { codigo, saida } = rodar(REPO);
    expect(codigo).toBe(0);
    expect(saida).toContain('docs:estrutura ok');
  });
});
