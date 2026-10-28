/* calibracao-impressao.test.mjs — a impressão do brief do crítico não muda quando a pasta do conjunto ou o repositório mudam de lugar
   (tools/modelar/calibracao-do-critico.mjs, impressaoDoBrief). Em 2026-10-28, mover docs/mecanifica para docs/modelar invalidou os
   julgamentos das doze imagens sem que nada do que o crítico vê tivesse mudado. */
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { impressaoDoBrief, PASTA_DO_CONJUNTO } from './calibracao-do-critico.mjs';

describe('a impressão do brief do crítico', () => {
  it('é a mesma em outra cópia do repositório e com a pasta do conjunto em outro lugar', () => {
    const texto = (raiz, pasta) => `Olhe as vistas:\n${resolve(raiz, pasta, 'imagens/c01/frontal.png')}\nNota de 0 a 10.\n`;
    const aqui = impressaoDoBrief(texto('/repo/a', PASTA_DO_CONJUNTO), '/repo/a');
    expect(impressaoDoBrief(texto('/outra/copia', PASTA_DO_CONJUNTO), '/outra/copia')).toBe(aqui);
    /* o nome da pasta do conjunto não entra na conta: o texto que vira impressão traz `<conjunto>` no lugar dela */
    const semPasta = 'Olhe as vistas:\n<conjunto>/imagens/c01/frontal.png\nNota de 0 a 10.\n';
    expect(aqui).toBe(`sha256:${createHash('sha256').update(semPasta).digest('hex')}`);
  });

  it('muda quando muda o que o crítico lê', () => {
    const a = impressaoDoBrief(`Olhe ${resolve('/r', PASTA_DO_CONJUNTO, 'imagens/c01/frontal.png')}\n`, '/r');
    const b = impressaoDoBrief(`Olhe ${resolve('/r', PASTA_DO_CONJUNTO, 'imagens/c02/frontal.png')}\n`, '/r');
    expect(a).not.toBe(b);
  });
});
