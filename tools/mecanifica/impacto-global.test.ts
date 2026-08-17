/* impacto-global.test.ts — provas da R03 sobre o mapa canônico v1. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { consultarImpactoGlobal, ErroImpactoGlobal } from '../../src/autoria/consultar-impacto-global.js';
// @ts-expect-error — serviços das R01/R02.
import { criarSnapshotUniversoAutoria } from '../../src/autoria/snapshot-universo-autoria.js';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { derivarMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
// @ts-expect-error — adaptador Node da bancada.
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';

const raizFixture = new URL('./fixtures/mapa-dependencias/', import.meta.url);
const lerJson = (nome: string) => JSON.parse(readFileSync(new URL(nome, raizFixture), 'utf8'));

async function mapaBase() {
  const carregadores = criarCarregadoresUniverso({
    raizMontagens: fileURLToPath(new URL('montagens/', raizFixture)),
    raizPecas: fileURLToPath(new URL('pecas/', raizFixture)),
  });
  const snapshot = await criarSnapshotUniversoAutoria({ universo: lerJson('universo.json'), ...carregadores, hash: sha256Canonico });
  return derivarMapaDependencias(snapshot);
}

describe('consulta de impacto global — R03', () => {
  it('encontra dependência direta, transitiva, caminhos e ramo isolado de peça', async () => {
    const impacto = consultarImpactoGlobal(await mapaBase(), { tipo: 'peca', id: 'peca-compartilhada' });

    expect(impacto.dependentesDiretos).toEqual([{ tipo: 'montagem', id: 'subconjunto-compartilhado' }]);
    expect(impacto.dependentesTransitivos).toEqual([
      { tipo: 'montagem', id: 'sistema-a', distancia: 2 },
      { tipo: 'montagem', id: 'sistema-b', distancia: 2 },
    ]);
    expect(impacto.raizesAfetadas).toEqual(['sistema-a', 'sistema-b']);
    expect(impacto.raizesNaoAfetadas).toEqual(['sistema-isolado']);
    expect(impacto.caminhos).toHaveLength(2);
    expect(impacto.roteiroRevalidacao.map((item: any) => `${item.ordem}:${item.id}`)).toEqual([
      '1:subconjunto-compartilhado', '2:sistema-a', '3:sistema-b',
    ]);
    expect(impacto.cobertura).toMatchObject({ completa: true, entidadesConsideradas: 8, entidadesAfetadas: 4 });
    expect(impacto.limitacoes).toContain('nao-executa-revalidacao');
  });

  it('consulta montagem como alvo e não inventa dependente transitivo', async () => {
    const impacto = consultarImpactoGlobal(await mapaBase(), { tipo: 'montagem', id: 'subconjunto-compartilhado' });

    expect(impacto.dependentesDiretos).toEqual([
      { tipo: 'montagem', id: 'sistema-a' },
      { tipo: 'montagem', id: 'sistema-b' },
    ]);
    expect(impacto.dependentesTransitivos).toEqual([]);
    expect(impacto.raizesAfetadas).toEqual(['sistema-a', 'sistema-b']);
    expect(impacto.caminhos.every((item: any) => item.caminho.length === 1)).toBe(true);
  });

  it('separa peça isolada, raízes não afetadas e roteiro mínimo', async () => {
    const impacto = consultarImpactoGlobal(await mapaBase(), { tipo: 'peca', id: 'peca-isolada' });

    expect(impacto.dependentesDiretos).toEqual([{ tipo: 'montagem', id: 'sistema-isolado' }]);
    expect(impacto.dependentesTransitivos).toEqual([]);
    expect(impacto.raizesAfetadas).toEqual(['sistema-isolado']);
    expect(impacto.raizesNaoAfetadas).toEqual(['sistema-a', 'sistema-b']);
    expect(impacto.roteiroRevalidacao.map((item: any) => item.id)).toEqual(['sistema-isolado']);
  });

  it('retorna somente relações tocadas pelo alvo', async () => {
    const mapa = await mapaBase();
    const sistemaA = mapa.entidades.find((item: any) => item.id === 'sistema-a');
    expect(sistemaA.proveniencia).toBeDefined();
    const snapshot = await (async () => {
      const carregadores = criarCarregadoresUniverso({
        raizMontagens: fileURLToPath(new URL('montagens/', raizFixture)),
        raizPecas: fileURLToPath(new URL('pecas/', raizFixture)),
      });
      return criarSnapshotUniversoAutoria({ universo: lerJson('universo.json'), ...carregadores, hash: sha256Canonico });
    })();
    const documento = snapshot.montagens.find((item: any) => item.id === 'sistema-a').documento;
    documento.versao = 3;
    documento.relacoes = [{
      id: 'separacao-a', tipo: 'mantemSeparacaoDirecional',
      referencia: { caminho: ['exclusivo-a'], parte: 'corpo' },
      movel: { caminho: ['compartilhado', 'peca'], parte: 'corpo' },
      especificacao: { eixo: [1, 0, 0], separacaoMinima: 0.1, toleranciaNumerica: 0.001 },
    }];
    const comRelacao = derivarMapaDependencias(snapshot);
    expect(consultarImpactoGlobal(comRelacao, { tipo: 'peca', id: 'peca-compartilhada' }).relacoes.map((item: any) => item.id)).toEqual(['separacao-a']);
    expect(consultarImpactoGlobal(comRelacao, { tipo: 'peca', id: 'peca-isolada' }).relacoes).toEqual([]);
  });

  it('recusa alvo ausente e cobertura incompleta sem alterar o mapa', async () => {
    const mapa = await mapaBase();
    const antes = JSON.stringify(mapa);
    expect(() => consultarImpactoGlobal(mapa, { tipo: 'peca', id: 'nao-existe' })).toThrow(ErroImpactoGlobal);
    expect(() => consultarImpactoGlobal({ ...mapa, cobertura: { ...mapa.cobertura, completa: false } }, { tipo: 'peca', id: 'peca-a' })).toThrow(/cobertura completa/);
    expect(JSON.stringify(mapa)).toBe(antes);
  });
});
