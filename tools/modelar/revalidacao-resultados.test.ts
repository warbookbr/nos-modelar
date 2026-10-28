/* Provas R03: resultado vinculado, histórico, obsolescência e CAS persistidos. */
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público.
import { criarCampanhaRevalidacao } from '../../src/autoria/protocolo-revalidacao.js';
// @ts-expect-error — repositório JavaScript público.
import { ErroRepositorioRevalidacao, lerCampanhaRevalidacao, obsoletarItemRevalidacao, persistirCampanhaRevalidacao, registrarResultadoRevalidacao } from './repositorio-revalidacao.mjs';

function campanhaBase() {
  const mapa = {
    formato: 'mecanifica.mapa-dependencias', versao: 1, universo: { id: 'universo-r03' },
    cobertura: { completa: true }, entidades: [
      { tipo: 'peca', id: 'causa-r03', proveniencia: { fonte: 'revisao-ativa', revisao: 'rev-causa', sha256: 'sha256:causa' } },
      { tipo: 'montagem', id: 'montagem-r03', proveniencia: { fonte: 'revisao-ativa', revisao: 'rev-montagem', sha256: 'sha256:montagem' } },
    ],
  };
  return criarCampanhaRevalidacao({
    mapa,
    impacto: {
      formato: 'mecanifica.impacto-global', versao: 1, alvo: { tipo: 'peca', id: 'causa-r03' },
      roteiroRevalidacao: [{ ordem: 1, tipo: 'montagem', id: 'montagem-r03', caminhos: [] }],
      raizesAfetadas: ['montagem-r03'], raizesNaoAfetadas: [], cobertura: { completa: true, universo: 'universo-r03' },
    },
    causa: { tipo: 'peca', id: 'causa-r03', revisao: 'rev-causa', sha256: 'sha256:causa' },
    mapaSha256: 'sha256:mapa-r03',
  });
}

function resultado(campanha: any, estado = 'aprovado', revisao = campanha.itens[0].revisaoObservada) {
  return {
    formato: 'mecanifica.resultado-revalidacao', versao: 1,
    item: campanha.itens[0].alvo, revisaoValidada: revisao, estado,
    gates: ['contrato-r03'], diagnostico: estado === 'aprovado' ? null : { codigo: 'falha-exemplo' },
  };
}

const raizTemporaria = () => mkdtemp(join(tmpdir(), 'mecanifica-r03-'));

describe('resultados persistidos de revalidação — R03', () => {
  it('registra aprovação na revisão exata e repete idempotentemente', async () => {
    const raiz = await raizTemporaria();
    try {
      const campanha = campanhaBase();
      await persistirCampanhaRevalidacao({ raiz, campanha });
      const primeira = await registrarResultadoRevalidacao({ raiz, identidade: campanha.identidade, resultado: resultado(campanha), versaoEsperada: 0 });
      const repetida = await registrarResultadoRevalidacao({ raiz, identidade: campanha.identidade, resultado: resultado(campanha), versaoEsperada: 0 });
      const lida = await lerCampanhaRevalidacao(raiz, campanha.identidade);
      expect(primeira.idempotente).toBe(false);
      expect(repetida.idempotente).toBe(true);
      expect(lida?.campanha.itens[0]).toMatchObject({ estado: 'aprovado', versao: 2 });
      expect(lida?.campanha.historicoResultados).toHaveLength(1);
    } finally { await rm(raiz, { recursive: true, force: true }); }
  });

  it('preserva histórico e recusa resultado conflitante para a mesma revisão', async () => {
    const raiz = await raizTemporaria();
    try {
      const campanha = campanhaBase();
      await persistirCampanhaRevalidacao({ raiz, campanha });
      await registrarResultadoRevalidacao({ raiz, identidade: campanha.identidade, resultado: resultado(campanha), versaoEsperada: 0 });
      await expect(registrarResultadoRevalidacao({
        raiz, identidade: campanha.identidade, resultado: resultado(campanha, 'reprovado'), versaoEsperada: 2,
      })).rejects.toMatchObject({ codigo: 'resultado-conflitante' });
      const lida = await lerCampanhaRevalidacao(raiz, campanha.identidade);
      expect(lida?.campanha.historicoResultados).toHaveLength(1);
    } finally { await rm(raiz, { recursive: true, force: true }); }
  });

  it('recusa revisão diferente, obsoleta item sem apagar resultado e fecha CAS velho', async () => {
    const raiz = await raizTemporaria();
    try {
      const campanha = campanhaBase();
      await persistirCampanhaRevalidacao({ raiz, campanha });
      const velha = resultado(campanha);
      await expect(registrarResultadoRevalidacao({
        raiz, identidade: campanha.identidade, resultado: resultado(campanha, 'aprovado', { ...velha.revisaoValidada, sha256: 'sha256:nova' }), versaoEsperada: 0,
      })).rejects.toMatchObject({ codigo: 'revisao-desatualizada' });
      await registrarResultadoRevalidacao({ raiz, identidade: campanha.identidade, resultado: velha, versaoEsperada: 0 });
      await expect(obsoletarItemRevalidacao({
        raiz, identidade: campanha.identidade, item: campanha.itens[0].alvo, versaoEsperada: 0,
        revisaoAtual: { ...campanha.itens[0].revisaoObservada, sha256: 'sha256:nova' },
      })).rejects.toMatchObject({ codigo: 'conflito-concorrencia' });
      const obsoleta = await obsoletarItemRevalidacao({
        raiz, identidade: campanha.identidade, item: campanha.itens[0].alvo, versaoEsperada: 2,
        revisaoAtual: { ...campanha.itens[0].revisaoObservada, sha256: 'sha256:nova' },
      });
      const lida = await lerCampanhaRevalidacao(raiz, campanha.identidade);
      expect(obsoleta.idempotente).toBe(false);
      expect(lida?.campanha.itens[0].estado).toBe('obsoleto');
      expect(lida?.campanha.historicoResultados).toHaveLength(1);
      expect(lida?.campanha.itens[0].ultimoResultado).toBeDefined();
    } finally { await rm(raiz, { recursive: true, force: true }); }
  });
});
