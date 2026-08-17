/* Provas R02: planejar, confirmar, validar e materializar montagem persistida. */
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço MJS exercitado pelo contrato de autoria interna.
import { ErroAutoriaMontagem, confirmarAutoriaMontagem, materializarAutoriaMontagem, observarAutoriaMontagem, planejarAutoriaMontagem, prepararPromocaoAutoriaMontagem, promoverAutoriaMontagem, validarAutoriaMontagem } from './autoria-montagem.mjs';

const montagem = JSON.parse(readFileSync(new URL('./fixtures/montagens-persistidas/duas-pecas.json', import.meta.url), 'utf8'));
const peca = JSON.parse(readFileSync(new URL('./fixtures/pecas-resolvidas/bloco-gabarito.json', import.meta.url), 'utf8'));
const montagemV3 = JSON.parse(readFileSync(new URL('./fixtures/montagens-persistidas/v3-separacao-direcional.json', import.meta.url), 'utf8'));
const carregadores = {
  carregarPeca: async () => peca,
};

describe('autoria interna de montagem R02', () => {
  it('planeja sem escrever e produz confirmação vinculada aos bytes', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-r02-plano-'));
    const plano: any = planejarAutoriaMontagem({ entidade: 'montagem-a', montagem });
    expect(await readdir(raiz)).toEqual([]);
    expect(plano.resumo).toMatchObject({ operacao: 'criacao', montagem: 'duas-pecas', versao: 1 });
    expect(plano.montagemBytes.endsWith('\n')).toBe(true);
    await expect(materializarAutoriaMontagem({ raiz, plano, ...carregadores })).rejects.toMatchObject({ codigo: 'confirmacao-ausente' });
    const confirmado: any = confirmarAutoriaMontagem(plano);
    expect(confirmado.confirmacao).toMatchObject({ entidade: 'montagem-a', pai: null, commit: plano.repositorio.commit });
    expect(() => confirmarAutoriaMontagem(plano, { ...confirmado.confirmacao, commit: '0'.repeat(64) })).toThrowError(ErroAutoriaMontagem);

    const bytesOriginais = `${JSON.stringify(montagem, null, 2)}\n`;
    const importado: any = planejarAutoriaMontagem({ entidade: 'montagem-importada', montagemBytes: bytesOriginais });
    expect(importado.montagemBytes).toBe(bytesOriginais);
  });

  it('valida referências, materializa criação e observa a revisão ativa', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-r02-criacao-'));
    const plano: any = confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-a', montagem }));
    await expect(validarAutoriaMontagem(plano, carregadores)).resolves.toMatchObject({ estado: 'validado', resumo: { operacao: 'criacao' } });
    const resultado: any = await materializarAutoriaMontagem({ raiz, plano, ...carregadores });
    expect(resultado).toMatchObject({ estado: 'aplicado', entidade: 'montagem-a', commit: plano.repositorio.commit, validacao: { estado: 'validado' } });
    const ativa: any = await observarAutoriaMontagem({ raiz, entidade: 'montagem-a' });
    expect(ativa).toMatchObject({ revisao: plano.repositorio.commit, montagem: { id: 'duas-pecas', versao: 1 } });
    expect(await readFile(join(raiz, 'objetos', `${plano.repositorio.objeto}.json`), 'utf8')).toContain('montagem.json');
  });

  it('materializa alteração e diagnostica candidato sem referência', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-r02-alteracao-'));
    const inicial: any = confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-a', montagem }));
    await materializarAutoriaMontagem({ raiz, plano: inicial, ...carregadores });
    const alterada = { ...montagem, id: 'duas-pecas-alterada', instancias: montagem.instancias.slice(0, 1) };
    const planoAlterado: any = confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-a', montagem: alterada, pai: inicial.repositorio.commit }));
    await expect(materializarAutoriaMontagem({ raiz, plano: planoAlterado, ...carregadores })).resolves.toMatchObject({ commit: planoAlterado.repositorio.commit });

    const velha: any = confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-a', montagem, pai: null }));
    await expect(materializarAutoriaMontagem({ raiz, plano: velha, ...carregadores })).rejects.toMatchObject({ codigo: 'revisao-desatualizada' });
    const invalida: any = confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-a', montagem: { ...montagem, instancias: [{ ...montagem.instancias[0], alvo: { tipo: 'peca', ref: 'ausente' } }] } }));
    await expect(validarAutoriaMontagem(invalida, { carregarPeca: async () => undefined })).rejects.toMatchObject({ codigo: 'candidato-invalido' });
  });

  it('deriva impacto e bloqueia promoção com relação reprovada ou vista ausente', async () => {
    const candidato = { ...montagemV3, instancias: montagemV3.instancias.map((item: any) => item.id === 'movel' ? { ...item, pose: { ...item.pose, deslocamento: [0, 0, 0] } } : item) };
    const plano: any = confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-v3', montagem: candidato }));
    const alvo = { caminho: ['movel'] };
    const recusada: any = await prepararPromocaoAutoriaMontagem({ plano, alvo, carregadores: { carregarPeca: async () => peca }, inspecaoVisual: { necessaria: false } });
    expect(recusada.estado).toBe('recusado');
    expect(recusada.revalidacao.falhas).toBe(1);
    expect(recusada.bloqueios).toContainEqual({ codigo: 'relacao-falhou', id: 'vaoEntreBlocos' });

    const aprovadaVisual: any = await prepararPromocaoAutoriaMontagem({ plano: confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-v3', montagem: montagemV3 })), alvo, carregadores: { carregarPeca: async () => peca } });
    expect(aprovadaVisual.estado).toBe('recusado');
    expect(aprovadaVisual.visual).toMatchObject({ estado: 'pendente', codigo: 'inspecao-visual-ausente' });
  });

  it('promove somente após duas vistas semânticas consistentes', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-r03-promocao-'));
    const plano: any = confirmarAutoriaMontagem(planejarAutoriaMontagem({ entidade: 'montagem-v3', montagem: montagemV3 }));
    const fases: string[] = [];
    const capturarVistas = async ({ fase }: { fase: string }) => { fases.push(fase); return { ok: true, resultado: { capturas: [
      { nome: 'isometrica', instancias: [['movel'], ['referencia']] },
      { nome: 'direita', instancias: [['referencia'], ['movel']] },
    ] } }; };
    const resultado: any = await promoverAutoriaMontagem({ raiz, plano, alvo: { caminho: ['movel'] }, carregadores: { carregarPeca: async () => peca }, capturarVistas });
    expect(resultado).toMatchObject({ estado: 'aprovado', resultado: { estado: 'aplicado' }, visual: { estado: 'aprovada', vistas: ['isometrica', 'direita'] } });
    expect(fases).toEqual(['proposta', 'resultado']);
  });
});
