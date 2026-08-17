/* Prova publicação imutável, falha recuperável e conflito explícito. */
import { mkdtemp, readFile, readdir, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço MJS exercitado pelo contrato de armazenamento.
import { lerHistoricoAutoria, lerRevisaoAtivaAutoria, limparOrfaosAutoria, materializarRevisaoAutoria, planejarRevisaoAutoria, publicarRevisaoAutoria } from './repositorio-autoria.mjs';

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

  it('materializa criação e alteração, lê somente a revisão ativa e registra métricas', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-ativa-'));
    const eventos: any[] = [];
    const inicial = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    await materializarRevisaoAutoria({ raiz, plano: inicial, telemetria: (evento: any) => eventos.push(evento) });
    expect(await lerRevisaoAtivaAutoria(raiz, 'montagem-a')).toMatchObject({ commit: inicial.commit, conteudo: { valor: 1 } });

    const alteracao = planejarRevisaoAutoria({ entidade: 'montagem-a', pai: inicial.commit, conteudo: { valor: 2 } });
    await materializarRevisaoAutoria({ raiz, plano: alteracao, telemetria: (evento: any) => eventos.push(evento) });
    expect(await lerRevisaoAtivaAutoria(raiz, 'montagem-a')).toMatchObject({ commit: alteracao.commit, pai: inicial.commit, conteudo: { valor: 2 } });
    expect(eventos.some((evento) => evento.tipo === 'bytes-escritos')).toBe(true);
    expect(eventos.some((evento) => evento.tipo === 'chamada' && evento.nome === 'link')).toBe(true);
    expect(eventos.some((evento) => evento.tipo === 'arquivo-visivel')).toBe(true);
    expect(eventos.some((evento) => evento.tipo === 'duracao' && Number.isFinite(evento.ms))).toBe(true);
  });

  it('recusa revisão velha e mantém a revisão ativa após falha antes da transição', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-stale-'));
    const inicial = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    await materializarRevisaoAutoria({ raiz, plano: inicial });
    const alteracao = planejarRevisaoAutoria({ entidade: 'montagem-a', pai: inicial.commit, conteudo: { valor: 2 } });
    await expect(materializarRevisaoAutoria({ raiz, plano: alteracao, falhaInjetada(etapa: string) {
      if (etapa === 'antes-publicar-transicao') throw new Error('queda na visibilidade');
    } })).rejects.toThrow('queda na visibilidade');
    expect(await lerRevisaoAtivaAutoria(raiz, 'montagem-a')).toMatchObject({ commit: inicial.commit, conteudo: { valor: 1 } });
    await expect(materializarRevisaoAutoria({ raiz, plano: alteracao })).resolves.toMatchObject({ commit: alteracao.commit });
  });

  it('permite somente um vencedor para cem alterações concorrentes do mesmo pai', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-corrida-'));
    const inicial = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 0 } });
    await materializarRevisaoAutoria({ raiz, plano: inicial });
    const planos = Array.from({ length: 100 }, (_, valor) => planejarRevisaoAutoria({ entidade: 'montagem-a', pai: inicial.commit, conteudo: { valor: valor + 1 } }));
    const resultados = await Promise.allSettled(planos.map((plano) => materializarRevisaoAutoria({ raiz, plano })));
    expect(resultados.filter((resultado) => resultado.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((resultado) => resultado.status === 'rejected')).toHaveLength(99);
    expect(resultados.filter((resultado) => resultado.status === 'rejected').every((resultado) => (resultado as PromiseRejectedResult).reason.codigo === 'revisao-desatualizada')).toBe(true);
    const ativa = await lerRevisaoAtivaAutoria(raiz, 'montagem-a');
    expect(planos.map((plano) => plano.commit)).toContain(ativa?.commit);
  });

  it('recusa raiz symlink, filesystem sem hard link e objeto adulterado', async () => {
    const real = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-raiz-'));
    const raizSymlink = join(real, 'atalho');
    await symlink(real, raizSymlink);
    const plano = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    await expect(materializarRevisaoAutoria({ raiz: raizSymlink, plano })).rejects.toMatchObject({ codigo: 'raiz-insegura' });

    const raizFs = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-fs-'));
    const semHardLink = { link: async () => { const erro: any = new Error('cross-device'); erro.code = 'EXDEV'; throw erro; } };
    await expect(materializarRevisaoAutoria({ raiz: raizFs, plano, fs: semHardLink })).rejects.toMatchObject({ codigo: 'filesystem-inadequado' });

    const raizAdulterada = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-hash-'));
    await materializarRevisaoAutoria({ raiz: raizAdulterada, plano });
    await writeFile(join(raizAdulterada, 'objetos', `${plano.objeto}.json`), 'adulterado\n');
    await expect(lerRevisaoAtivaAutoria(raizAdulterada, 'montagem-a')).rejects.toMatchObject({ codigo: 'objeto-adulterado' });
  });

  it('reaplica o vencedor sem escrever e recusa proposta com pai antigo', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-idempotente-'));
    const inicial = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    await materializarRevisaoAutoria({ raiz, plano: inicial });
    const antes = await Promise.all((await readdir(join(raiz, 'objetos'))).map(async (nome) => [nome, await readFile(join(raiz, 'objetos', nome), 'utf8')]));
    const resultado = await materializarRevisaoAutoria({ raiz, plano: inicial });
    expect(resultado).toMatchObject({ estado: 'aplicado', idempotente: true, commit: inicial.commit });
    const depois = await Promise.all((await readdir(join(raiz, 'objetos'))).map(async (nome) => [nome, await readFile(join(raiz, 'objetos', nome), 'utf8')]));
    expect(depois).toEqual(antes);

    const concorrente = planejarRevisaoAutoria({ entidade: 'montagem-a', pai: null, conteudo: { valor: 2 } });
    await expect(materializarRevisaoAutoria({ raiz, plano: concorrente })).rejects.toMatchObject({ codigo: 'revisao-desatualizada' });
  });

  it('falha fechado para transição malformada e symlink interno', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-transicao-'));
    const plano = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    await materializarRevisaoAutoria({ raiz, plano });
    const transicao = join(raiz, 'transicoes', 'montagem-a', 'raiz.json');
    const copia = join(raiz, 'transicoes', 'montagem-a', 'copia.json');
    await symlink(join(raiz, 'commits', `${plano.commit}.json`), copia);
    await expect(lerRevisaoAtivaAutoria(raiz, 'montagem-a')).resolves.toMatchObject({ commit: plano.commit });
    await unlink(transicao);
    await symlink(copia, transicao);
    await expect(lerRevisaoAtivaAutoria(raiz, 'montagem-a')).rejects.toMatchObject({ codigo: 'transicao-insegura' });
    await unlink(transicao);
    await writeFile(transicao, '{ quebrado');
    await expect(lerRevisaoAtivaAutoria(raiz, 'montagem-a')).rejects.toMatchObject({ codigo: 'transicao-invalida' });
  });

  it('simula e remove apenas snapshots órfãos após validar as transições', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-autoria-limpeza-'));
    const ativo = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 1 } });
    const orfao = planejarRevisaoAutoria({ entidade: 'montagem-a', conteudo: { valor: 2 } });
    await materializarRevisaoAutoria({ raiz, plano: ativo });
    await publicarRevisaoAutoria({ raiz, plano: orfao });
    const simulado = await limparOrfaosAutoria({ raiz });
    expect(simulado.estado).toBe('simulado');
    expect(simulado.aplicar).toBe(false);
    expect(simulado.objetos).toContain(join(raiz, 'objetos', `${orfao.objeto}.json`));
    expect(simulado.commits).toContain(join(raiz, 'commits', `${orfao.commit}.json`));
    expect(await readFile(join(raiz, 'objetos', `${orfao.objeto}.json`), 'utf8')).toBe(orfao.objetoBytes);
    const limpo = await limparOrfaosAutoria({ raiz, aplicar: true });
    expect(limpo.estado).toBe('limpo');
    await expect(readFile(join(raiz, 'objetos', `${orfao.objeto}.json`))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(join(raiz, 'commits', `${orfao.commit}.json`))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(lerRevisaoAtivaAutoria(raiz, 'montagem-a')).resolves.toMatchObject({ commit: ativo.commit });
  });
});
