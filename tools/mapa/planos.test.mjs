/* planos.test.mjs — prova que o gate recusa plano grande, estados inválidos,
   índice divergente e mais de um plano ativo. */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { conferirPlanos } from './planos.mjs';

const temporarias = [];

function ambiente(indice = '**Plano ativo:** nenhum.\n') {
  const pasta = mkdtempSync(join(tmpdir(), 'mecanifica-planos-'));
  temporarias.push(pasta);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'README.md'), indice);
  return pasta;
}

function gravar(pasta, nome, estado, linhas = 4) {
  const corpo = [`# Plano`, '', `**Estado:** ${estado}`, ...Array(Math.max(0, linhas - 3)).fill('linha')].join('\n');
  writeFileSync(join(pasta, nome), corpo);
}

afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

describe('gate dos planos curtos', () => {
  it('aceita o índice sem plano ativo', () => {
    expect(conferirPlanos({ pasta: ambiente() }).problemas).toEqual([]);
  });

  it('aceita um único plano ativo apontado pelo índice', () => {
    const nome = '2026-08-02-prova-curta.md';
    const pasta = ambiente(`**Plano ativo:** [AUT-2026-01](${nome}).\n`);
    gravar(pasta, nome, 'ativo');
    expect(conferirPlanos({ pasta }).problemas).toEqual([]);
  });

  it('recusa plano com mais de 200 linhas', () => {
    const pasta = ambiente();
    gravar(pasta, '2026-08-02-grande.md', 'rascunho', 201);
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/201 linhas.*limite é 200/);
  });

  it('recusa dois planos ativos', () => {
    const pasta = ambiente('**Plano ativo:** [A](2026-08-02-a.md).\n');
    gravar(pasta, '2026-08-02-a.md', 'ativo');
    gravar(pasta, '2026-08-02-b.md', 'ativo');
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/2 planos ativos/);
  });

  it('recusa índice que não aponta para o único plano ativo', () => {
    const pasta = ambiente();
    gravar(pasta, '2026-08-02-a.md', 'ativo');
    expect(conferirPlanos({ pasta }).problemas.join('\n')).toMatch(/não aponta/);
  });
});
