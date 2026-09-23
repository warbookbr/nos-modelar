/* vinculos-de-medida.test.mjs — fatia 1 do plano "a peça nasce encaixada":
   formato v5 da montagem, ordem de construção e arestas de medida no mapa.
   Tudo provado na fixture neutra `tools/fixtures/tres-blocos-vinculados/`. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ErroMontagemPersistida, lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { ordemPorVinculos } from '../../src/autoria/vinculos-de-medida.js';
import { derivarMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
import { criarSnapshotUniversoAutoria } from '../../src/autoria/snapshot-universo-autoria.js';
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';

const raiz = new URL('../fixtures/tres-blocos-vinculados/', import.meta.url);
const lerJson = (nome) => JSON.parse(readFileSync(new URL(nome, raiz), 'utf8'));
const montagem = () => lerJson('montagens/tres-blocos.json');

function recusar(dado, codigo) {
  let erro;
  try { lerMontagemPersistida(dado); } catch (capturado) { erro = capturado; }
  expect(erro, `esperava recusa '${codigo}'`).toBeInstanceOf(ErroMontagemPersistida);
  expect(erro.codigo).toBe(codigo);
}

describe('montagem v5 — vínculos de medida e etapas', () => {
  it('lê a ordem de construção e os vínculos da fixture neutra', () => {
    const lida = lerMontagemPersistida(montagem());
    expect(lida.versao).toBe(5);
    expect(lida.etapas).toEqual(['base', 'meio', 'topo']);
    expect(lida.vinculos).toEqual([
      { id: 'furoDoMeioNoPinoDaBase', alvo: { instancia: 'meio', param: 'raioDoFuro' }, de: { instancia: 'base', porta: 'pino', medida: 'raio' }, acrescimo: 0.0002 },
      { id: 'furoDoTopoNoPinoDoMeio', alvo: { instancia: 'topo', param: 'raioDoFuro' }, de: { instancia: 'meio', porta: 'pino', medida: 'raio' }, acrescimo: 0.0002 },
    ]);
  });

  it('deriva a ordem topológica pelos vínculos, e desempata por nome', () => {
    const lida = lerMontagemPersistida(montagem());
    expect(ordemPorVinculos(lida.vinculos, new Set(['topo', 'meio', 'base']))).toEqual(['base', 'meio', 'topo']);
    expect(ordemPorVinculos([], new Set(['c', 'a', 'b']))).toEqual(['a', 'b', 'c']);
  });

  it('recusa ciclo entre instâncias', () => {
    const dado = montagem();
    dado.vinculos.push({
      id: 'volta', alvo: { instancia: 'base', param: 'raioDoPino' },
      de: { instancia: 'topo', porta: 'furo', medida: 'raio' }, acrescimo: 0,
    });
    recusar(dado, 'vinculo-ciclo');
    const proprio = montagem();
    proprio.vinculos[0].de.instancia = 'meio';
    recusar(proprio, 'vinculo-ciclo');
  });

  it('recusa vínculo que aponta para instância construída depois', () => {
    const dado = montagem();
    dado.etapas = ['meio', 'base', 'topo'];
    recusar(dado, 'vinculo-fora-de-ordem');
  });

  it('recusa etapas incompletas, repetidas ou com instância que não existe', () => {
    recusar({ ...montagem(), etapas: ['base', 'meio'] }, 'etapas-invalidas');
    recusar({ ...montagem(), etapas: ['base', 'meio', 'meio', 'topo'] }, 'etapas-invalidas');
    recusar({ ...montagem(), etapas: ['base', 'meio', 'topo', 'fantasma'] }, 'etapas-invalidas');
    recusar({ ...montagem(), etapas: [] }, 'etapas-invalidas');
  });

  it('recusa medida que porta não publica, acréscimo ausente e parâmetro com duas origens', () => {
    const medida = montagem();
    medida.vinculos[0].de.medida = 'centro';
    recusar(medida, 'vinculo-invalido');
    const semAcrescimo = montagem();
    delete semAcrescimo.vinculos[0].acrescimo;
    recusar(semAcrescimo, 'vinculo-invalido');
    const duplicado = montagem();
    duplicado.vinculos[1].alvo = { ...duplicado.vinculos[0].alvo };
    duplicado.vinculos[1].de.instancia = 'base';
    recusar(duplicado, 'vinculo-duplicado');
    const chave = montagem();
    chave.vinculos[0].extra = 1;
    recusar(chave, 'chave-desconhecida');
  });

  it('versões anteriores não aceitam os campos novos', () => {
    recusar({ ...montagem(), versao: 3 }, 'chave-desconhecida');
  });

  it('o mapa de dependências ganha as arestas de medida e a ordem de construção', async () => {
    const carregadores = criarCarregadoresUniverso({
      raizMontagens: fileURLToPath(new URL('montagens/', raiz)),
      raizPecas: fileURLToPath(new URL('pecas/', raiz)),
    });
    const snapshot = await criarSnapshotUniversoAutoria({ universo: lerJson('universo.json'), ...carregadores, hash: sha256Canonico });
    const mapa = derivarMapaDependencias(snapshot);
    expect(mapa.construcao).toEqual([{ montagem: 'tres-blocos', etapas: ['base', 'meio', 'topo'] }]);
    expect(mapa.vinculos.map(({ id, alvo, de }) => `${de.instancia}.${de.porta} -> ${alvo.instancia}.${alvo.param} (${id})`)).toEqual([
      'base.pino -> meio.raioDoFuro (furoDoMeioNoPinoDaBase)',
      'meio.pino -> topo.raioDoFuro (furoDoTopoNoPinoDoMeio)',
    ]);
  });
});
