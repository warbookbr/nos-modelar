/* mapa-dependencias.test.ts — provas da R02 sobre o snapshot da R01. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { derivarMapaDependencias, ErroMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
// @ts-expect-error — adaptador Node da bancada.
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';
// @ts-expect-error — snapshot da R01.
import { criarSnapshotUniversoAutoria } from '../../src/autoria/snapshot-universo-autoria.js';

const raizFixture = new URL('./fixtures/mapa-dependencias/', import.meta.url);
const lerJson = (nome: string) => JSON.parse(readFileSync(new URL(nome, raizFixture), 'utf8'));

async function snapshotBase() {
  const carregadores = criarCarregadoresUniverso({
    raizMontagens: fileURLToPath(new URL('montagens/', raizFixture)),
    raizPecas: fileURLToPath(new URL('pecas/', raizFixture)),
  });
  return criarSnapshotUniversoAutoria({
    universo: lerJson('universo.json'),
    ...carregadores,
    hash: sha256Canonico,
  });
}

const alvo = (mapa: any, tipo: string, id: string) => mapa.usos.find((item: any) => item.alvo.tipo === tipo && item.alvo.id === id);

describe('mapa canônico de dependências — R02', () => {
  it('deriva composição, ocorrências por raiz e usos reversos', async () => {
    const mapa = derivarMapaDependencias(await snapshotBase());

    expect(mapa.formato).toBe('mecanifica.mapa-dependencias');
    expect(mapa.cobertura).toMatchObject({ completa: true, entidades: 8, raizes: 3 });
    expect(mapa.entidades).toHaveLength(8);
    expect(mapa.composicao).toHaveLength(6);
    expect(mapa.ocorrencias).toHaveLength(7);
    expect(alvo(mapa, 'montagem', 'subconjunto-compartilhado').declaracoes).toEqual([
      { montagem: 'sistema-a', instancia: 'compartilhado' },
      { montagem: 'sistema-b', instancia: 'compartilhado' },
    ]);
    expect(alvo(mapa, 'montagem', 'subconjunto-compartilhado').ocorrencias).toHaveLength(2);
    expect(alvo(mapa, 'peca', 'peca-compartilhada').ocorrencias).toHaveLength(2);
    expect(alvo(mapa, 'peca', 'peca-isolada').ocorrencias).toEqual([
      { raiz: 'sistema-isolado', caminho: [{ montagem: 'sistema-isolado', instancia: 'isolada' }] },
    ]);
    expect(mapa.ocorrencias.some((item: any) => item.raiz === 'sistema-isolado' && item.alvo.id === 'peca-a')).toBe(false);
    expect(mapa.entidades.find((item: any) => item.id === 'peca-a').proveniencia).toMatchObject({ fonte: 'base-estatica' });
  });

  it('mantém bytes canônicos sob permutação do manifesto e das instâncias', async () => {
    const original = await snapshotBase();
    const permutado = structuredClone(original);
    permutado.universo.pecas.reverse();
    permutado.universo.montagens.reverse();
    permutado.universo.raizes.reverse();
    permutado.montagens.reverse();
    for (const entrada of permutado.montagens) entrada.documento.instancias.reverse();

    expect(JSON.stringify(derivarMapaDependencias(original))).toBe(JSON.stringify(derivarMapaDependencias(permutado)));
  });

  it('distingue declaração única de montagem compartilhada e ocorrências repetidas', async () => {
    const snapshot = await snapshotBase();
    const sistemaA = snapshot.montagens.find((item: any) => item.id === 'sistema-a');
    sistemaA.documento.instancias.push({
      id: 'compartilhado-dois',
      alvo: { tipo: 'montagem', ref: 'subconjunto-compartilhado' },
      pose: { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] },
    });
    const mapa = derivarMapaDependencias(snapshot);
    const compartilhado = alvo(mapa, 'montagem', 'subconjunto-compartilhado');
    expect(compartilhado.declaracoes).toHaveLength(3);
    expect(compartilhado.ocorrencias.filter((item: any) => item.raiz === 'sistema-a')).toHaveLength(2);
    expect(alvo(mapa, 'peca', 'peca-compartilhada').ocorrencias).toHaveLength(3);
  });

  it('preserva relações declaradas, endpoints semânticos e proveniência', async () => {
    const snapshot = await snapshotBase();
    const sistemaA = snapshot.montagens.find((item: any) => item.id === 'sistema-a');
    sistemaA.documento.versao = 3;
    sistemaA.documento.relacoes = [{
      id: 'separacao-a',
      tipo: 'mantemSeparacaoDirecional',
      referencia: { caminho: ['exclusivo-a'], parte: 'corpo' },
      movel: { caminho: ['compartilhado', 'peca'], parte: 'corpo' },
      especificacao: { eixo: [1, 0, 0], separacaoMinima: 0.1, toleranciaNumerica: 0.001 },
    }];
    const mapa = derivarMapaDependencias(snapshot);
    expect(mapa.relacoes).toHaveLength(1);
    expect(mapa.relacoes[0]).toMatchObject({
      montagem: 'sistema-a', id: 'separacao-a', tipo: 'mantemSeparacaoDirecional',
      referencia: { alvo: { tipo: 'peca', id: 'peca-a' }, parte: 'corpo' },
      movel: { alvo: { tipo: 'peca', id: 'peca-compartilhada' }, parte: 'corpo' },
      ocorrencias: [{ raiz: 'sistema-a', caminho: [] }],
    });
    expect(mapa.relacoes[0].proveniencia).toMatchObject({ fonte: 'base-estatica', sha256: expect.stringMatching(/^sha256:/) });
  });

  it('recusa snapshot sem cobertura completa', async () => {
    const snapshot = await snapshotBase();
    snapshot.cobertura.completa = false;
    expect(() => derivarMapaDependencias(snapshot)).toThrow(ErroMapaDependencias);
    expect(() => derivarMapaDependencias(snapshot)).toThrowError(/snapshots? completos?/);
  });
});
