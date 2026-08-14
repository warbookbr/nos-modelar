/* Prova publicação imutável, falha recuperável e conflito explícito. */
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço MJS exercitado pelo contrato de armazenamento.
import { lerHistoricoAutoria, planejarRevisaoAutoria, publicarRevisaoAutoria } from './repositorio-autoria.mjs';

describe('repositório de autoria imutável', () => {
  it('planeja sem escrever e publica somente após o commit completo', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-'));
    const plano = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { 'montagem.json': '{"versao":3}' } });
    expect(await readdir(raiz)).toEqual([]);
    await publicarRevisaoAutoria({ raiz, plano });
    const historico = await lerHistoricoAutoria(raiz);
    expect(historico.commits.map((item: any) => item.id)).toEqual([plano.commit]);
    expect(await readFile(join(raiz, 'objetos', `${plano.objeto}.json`), 'utf8')).toBe(plano.objetoBytes);
  });

  it('falha antes do commit deixa objeto órfão invisível e nenhuma revisão parcial', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-falha-'));
    const plano = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { a: 'bytes' } });
    await expect(publicarRevisaoAutoria({ raiz, plano, falhaInjetada(etapa: string) {
      if (etapa === 'antes-publicar-commit') throw new Error('queda simulada');
    } })).rejects.toThrow('queda simulada');
    expect((await lerHistoricoAutoria(raiz)).commits).toEqual([]);
  });

  it('duas revisões do mesmo pai viram conflito explícito sem sobrescrita', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-conflito-'));
    const a = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    const b = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 2 } });
    await Promise.all([publicarRevisaoAutoria({ raiz, plano: a }), publicarRevisaoAutoria({ raiz, plano: b })]);
    const historico = await lerHistoricoAutoria(raiz);
    expect(historico.commits).toHaveLength(2);
    expect(historico.conflitos).toHaveLength(1);
    expect(historico.conflitos[0].commitsFilhos.sort()).toEqual([a.commit, b.commit].sort());
  });

  it('recusa plano adulterado e valor fora de JSON antes de escrever', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-adulterada-'));
    const plano = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    await expect(publicarRevisaoAutoria({ raiz, plano: { ...plano, commitBytes: `${plano.commitBytes} ` } }))
      .rejects.toMatchObject({ codigo: 'plano-divergente' });
    expect(await readdir(raiz)).toEqual([]);
    expect(() => planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: Infinity } }))
      .toThrow('não é JSON canônico');
  });
});
