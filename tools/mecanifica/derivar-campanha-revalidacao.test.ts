/* Provas R02: compartilhamento, múltiplas raízes, isolamento e persistência. */
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público.
import { criarSnapshotUniversoAutoria, serializarCanonico } from '../../src/autoria/snapshot-universo-autoria.js';
// @ts-expect-error — serviço JavaScript público.
import { consultarImpactoGlobal } from '../../src/autoria/consultar-impacto-global.js';
// @ts-expect-error — serviço JavaScript público.
import { derivarMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
// @ts-expect-error — adaptador Node da fixture.
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';
// @ts-expect-error — ponte Node JavaScript pública.
import { derivarCampanhaDeImpacto, derivarEPersistirCampanhaRevalidacao } from './derivar-campanha-revalidacao.mjs';
// @ts-expect-error — serviço Node JavaScript público.
import { lerCampanhaRevalidacao } from './repositorio-revalidacao.mjs';

const raizFixture = new URL('./fixtures/mapa-dependencias/', import.meta.url);
const ler = (nome: string) => JSON.parse(readFileSync(new URL(nome, raizFixture), 'utf8'));

async function contexto(alvo: { tipo: string; id: string }) {
  const carregadores = criarCarregadoresUniverso({
    raizMontagens: fileURLToPath(new URL('montagens/', raizFixture)),
    raizPecas: fileURLToPath(new URL('pecas/', raizFixture)),
  });
  const snapshot = await criarSnapshotUniversoAutoria({ universo: ler('universo.json'), ...carregadores, hash: sha256Canonico });
  const mapa = derivarMapaDependencias(snapshot);
  const impacto = consultarImpactoGlobal(mapa, alvo);
  const entidade = mapa.entidades.find((item: any) => item.tipo === alvo.tipo && item.id === alvo.id);
  return {
    mapa,
    impacto,
    causa: { tipo: alvo.tipo, id: alvo.id, ...entidade.proveniencia },
    mapaSha256: sha256Canonico(serializarCanonico(mapa)),
  };
}

const raizTemporaria = () => mkdtemp(join(tmpdir(), 'mecanifica-r02-'));

describe('derivação de campanha por impacto — R02', () => {
  it('mantém uma ocorrência semântica por montagem compartilhada em duas raízes', async () => {
    const contextoBase = await contexto({ tipo: 'peca', id: 'peca-compartilhada' });
    const campanha = derivarCampanhaDeImpacto(contextoBase);
    expect(campanha.alcance).toEqual({ raizesAfetadas: ['sistema-a', 'sistema-b'], raizesNaoAfetadas: ['sistema-isolado'] });
    expect(campanha.itens.map((item: any) => item.chave)).toEqual([
      'montagem:subconjunto-compartilhado', 'montagem:sistema-a', 'montagem:sistema-b',
    ]);
    expect(new Set(campanha.itens.map((item: any) => item.chave)).size).toBe(campanha.itens.length);
    expect(campanha.itens.every((item: any) => item.revisaoObservada.sha256)).toBe(true);
  });

  it('preserva ramo isolado sem incluir raízes não afetadas', async () => {
    const contextoBase = await contexto({ tipo: 'peca', id: 'peca-isolada' });
    const campanha = derivarCampanhaDeImpacto(contextoBase);
    expect(campanha.alcance).toEqual({ raizesAfetadas: ['sistema-isolado'], raizesNaoAfetadas: ['sistema-a', 'sistema-b'] });
    expect(campanha.itens.map((item: any) => item.chave)).toEqual(['montagem:sistema-isolado']);
  });

  it('persiste a campanha derivada e rejeita impacto de outro universo', async () => {
    const contextoBase = await contexto({ tipo: 'peca', id: 'peca-compartilhada' });
    const raiz = await raizTemporaria();
    try {
      const resultado = await derivarEPersistirCampanhaRevalidacao({ ...contextoBase, raiz });
      const lida = await lerCampanhaRevalidacao(raiz, resultado.campanha.identidade);
      expect(lida?.campanha).toEqual(resultado.campanha);
      expect(() => derivarCampanhaDeImpacto({
        ...contextoBase,
        impacto: { ...contextoBase.impacto, cobertura: { ...contextoBase.impacto.cobertura, universo: 'outro-universo' } },
      })).toThrow(/mesmo universo/);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});
