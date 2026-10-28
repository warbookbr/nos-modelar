/* Provas R01: persistência canônica, retomada, idempotência e conflito. */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — contrato JavaScript público.
import { criarCampanhaRevalidacao } from '../../src/autoria/protocolo-revalidacao.js';
// @ts-expect-error — repositório JavaScript público.
import { ErroRepositorioRevalidacao, lerCampanhaRevalidacao, persistirCampanhaRevalidacao } from './repositorio-revalidacao.mjs';

function campanhaBase() {
  const mapa = {
    formato: 'mecanifica.mapa-dependencias', versao: 1,
    universo: { id: 'universo-r01' }, cobertura: { completa: true },
    entidades: [
      { tipo: 'peca', id: 'causa-r01', proveniencia: { fonte: 'revisao-ativa', revisao: 'rev-causa', sha256: 'sha256:causa' } },
      { tipo: 'montagem', id: 'montagem-r01', proveniencia: { fonte: 'revisao-ativa', revisao: 'rev-montagem', sha256: 'sha256:montagem' } },
    ],
  };
  const impacto = {
    formato: 'mecanifica.impacto-global', versao: 1,
    alvo: { tipo: 'peca', id: 'causa-r01' },
    roteiroRevalidacao: [{ ordem: 1, tipo: 'montagem', id: 'montagem-r01', caminhos: [{ raiz: 'montagem-r01', caminho: [] }] }],
    cobertura: { completa: true, universo: 'universo-r01', entidadesConsideradas: 2, entidadesAfetadas: 2 },
  };
  return criarCampanhaRevalidacao({
    mapa, impacto,
    causa: { tipo: 'peca', id: 'causa-r01', revisao: 'rev-causa', sha256: 'sha256:causa' },
    mapaSha256: 'sha256:mapa-r01',
  });
}

async function raizTemporaria() {
  return mkdtemp(join(tmpdir(), 'mecanifica-revalidacao-r01-'));
}

describe('repositório de revalidação — R01', () => {
  it('persiste, relê em nova sessão e mantém bytes determinísticos', async () => {
    const raizA = await raizTemporaria();
    const raizB = await raizTemporaria();
    try {
      const campanha = campanhaBase();
      const a = await persistirCampanhaRevalidacao({ raiz: raizA, campanha });
      const b = await persistirCampanhaRevalidacao({ raiz: raizB, campanha });
      const lida = await lerCampanhaRevalidacao(raizA, campanha.identidade);
      expect(lida).toMatchObject({ estado: 'aplicado', revisao: a.revisao, campanha });
      expect(b.revisao).toBe(a.revisao);
      expect(b.objeto).toBe(a.objeto);
    } finally {
      await rm(raizA, { recursive: true, force: true });
      await rm(raizB, { recursive: true, force: true });
    }
  });

  it('repete sem duplicar e recusa duas escritas contra o mesmo pai', async () => {
    const raiz = await raizTemporaria();
    try {
      const inicial = campanhaBase();
      const primeira = await persistirCampanhaRevalidacao({ raiz, campanha: inicial });
      const repetida = await persistirCampanhaRevalidacao({ raiz, campanha: inicial, pai: '0'.repeat(64) });
      expect(repetida.idempotente).toBe(true);

      const uma = { ...inicial, itens: [{ ...inicial.itens[0], estado: 'em-validacao', versao: 1 }] };
      const duas = { ...inicial, itens: [{ ...inicial.itens[0], estado: 'obsoleto', versao: 1 }] };
      await persistirCampanhaRevalidacao({ raiz, campanha: uma, pai: primeira.revisao });
      await expect(persistirCampanhaRevalidacao({ raiz, campanha: duas, pai: primeira.revisao })).rejects.toMatchObject({ codigo: 'revisao-desatualizada' });
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('recusa objeto adulterado ao reler a campanha', async () => {
    const raiz = await raizTemporaria();
    try {
      const campanha = campanhaBase();
      const aplicada = await persistirCampanhaRevalidacao({ raiz, campanha });
      const caminho = join(raiz, 'objetos', `${aplicada.objeto}.json`);
      const bytes = await readFile(caminho, 'utf8');
      await writeFile(caminho, `${bytes} `, 'utf8');
      await expect(lerCampanhaRevalidacao(raiz, campanha.identidade)).rejects.toMatchObject({ codigo: 'objeto-adulterado' });
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});
