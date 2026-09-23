/* vinculos-de-medida.test.mjs — fatias 1 e 2 do plano "a peça nasce
   encaixada": formato v5 da montagem, ordem de construção, arestas de medida no
   mapa, e a resolução que leva a medida real de uma peça para a vizinha.
   Tudo provado na fixture neutra `tools/fixtures/tres-blocos-vinculados/`. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ErroMontagemPersistida, lerMontagemPersistida } from '../../src/autoria/ler-montagem-persistida.js';
import { ordemPorVinculos } from '../../src/autoria/vinculos-de-medida.js';
import { derivarMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
import { consultarImpactoGlobal } from '../../src/autoria/consultar-impacto-global.js';
import { criarSnapshotUniversoAutoria } from '../../src/autoria/snapshot-universo-autoria.js';
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';
import { ErroResolucaoMontagemPersistida, resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { carregadoresDeReceitas, receitaComParametros } from './peca-com-parametros.mjs';
import { RECEITAS } from '../fixtures/tres-blocos-vinculados/receitas/bloco.js';

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
      { id: 'furoDoMeioNoPinoDaBase', alvo: { instancia: 'meio', param: 'raioDoFuro' }, de: { instancia: 'base', porta: 'pino', medida: 'raio' }, unidade: 'mm', acrescimo: 0.2 },
      { id: 'furoDoTopoNoPinoDoMeio', alvo: { instancia: 'topo', param: 'raioDoFuro' }, de: { instancia: 'meio', porta: 'pino', medida: 'raio' }, unidade: 'mm', acrescimo: 0.2 },
      { id: 'pinoDoMeioPeloPinoDaBase', alvo: { instancia: 'meio', param: 'raioDoPino' }, de: { instancia: 'base', porta: 'pino', medida: 'raio' }, unidade: 'mm', acrescimo: -2 },
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
      de: { instancia: 'topo', porta: 'furo', medida: 'raio' }, unidade: 'mm', acrescimo: 0,
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
    const semUnidade = montagem();
    delete semUnidade.vinculos[0].unidade;
    recusar(semUnidade, 'vinculo-invalido');
    const unidadeErrada = montagem();
    unidadeErrada.vinculos[0].unidade = 'cm';
    recusar(unidadeErrada, 'vinculo-invalido');
    const duplicado = montagem();
    duplicado.vinculos[1].alvo = { ...duplicado.vinculos[0].alvo };
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
      'base.pino -> meio.raioDoPino (pinoDoMeioPeloPinoDaBase)',
    ]);
  });
});

/* Fatia 2. A medida vem da porta da peça já construída, e não do número que a
   receita da vizinha trouxe. As receitas dos blocos têm raios de propósito
   errados (1 mm) nos parâmetros vinculados: se a resolução usasse o valor da
   receita, os testes abaixo veriam 1. */
const raioDaPorta = (instancia, porta) => instancia.definicao.neutro.portas.get(porta).interface.raio;
const porId = (resolvida, id) => resolvida.instancias.find((instancia) => instancia.id === id);

async function resolver(receitas = RECEITAS, dado = montagem()) {
  return resolverMontagemPersistida(dado, carregadoresDeReceitas(receitas));
}

async function recusarResolucao(promessa, codigo) {
  let erro;
  try { await promessa; } catch (capturado) { erro = capturado; }
  expect(erro, `esperava recusa '${codigo}'`).toBeInstanceOf(ErroResolucaoMontagemPersistida);
  expect(erro.codigo).toBe(codigo);
}

describe('montagem v5 — resolução dos vínculos', () => {
  it('cada peça nasce com a medida da porta da vizinha, na unidade do parâmetro', async () => {
    const resolvida = await resolver();
    const base = porId(resolvida, 'base');
    const meio = porId(resolvida, 'meio');
    const topo = porId(resolvida, 'topo');
    expect(raioDaPorta(base, 'pino')).toBeCloseTo(0.010, 9);
    expect(raioDaPorta(meio, 'furo')).toBeCloseTo(0.0102, 9);
    expect(raioDaPorta(meio, 'pino')).toBeCloseTo(0.008, 9);
    expect(raioDaPorta(topo, 'furo')).toBeCloseTo(0.0082, 9);
    expect(meio.parametrosDerivados).toEqual([
      { vinculo: 'furoDoMeioNoPinoDaBase', param: 'raioDoFuro', valor: expect.closeTo(10.2, 9), unidade: 'mm' },
      { vinculo: 'pinoDoMeioPeloPinoDaBase', param: 'raioDoPino', valor: expect.closeTo(8, 9), unidade: 'mm' },
    ]);
    expect(base).not.toHaveProperty('parametrosDerivados');
    expect(resolvida.instancias.map(({ id }) => id)).toEqual(['base', 'meio', 'topo']);
  });

  it('mudar o pino da base muda o meio e, em cadeia, o topo', async () => {
    const pinoMaior = receitaComParametros(RECEITAS['bloco-com-pino'], { raioDoPino: 14 });
    const resolvida = await resolver({ ...RECEITAS, 'bloco-com-pino': pinoMaior });
    expect(raioDaPorta(porId(resolvida, 'meio'), 'furo')).toBeCloseTo(0.0142, 9);
    expect(raioDaPorta(porId(resolvida, 'meio'), 'pino')).toBeCloseTo(0.012, 9);
    expect(raioDaPorta(porId(resolvida, 'topo'), 'furo')).toBeCloseTo(0.0122, 9);
  });

  it('a resolução é determinística', async () => {
    const [a, b] = [await resolver(), await resolver()];
    const impressao = (r) => JSON.stringify(r.instancias.map((i) => [i.id, i.parametrosDerivados ?? null, [...i.definicao.neutro.portas.values()]]));
    expect(impressao(a)).toBe(impressao(b));
  });

  it('recusa porta que a vizinha não publica', async () => {
    const dado = montagem();
    dado.vinculos[0].de.porta = 'fantasma';
    await recusarResolucao(resolver(RECEITAS, dado), 'vinculo-porta-ausente');
  });

  it('recusa medida que a porta não tem', async () => {
    const dado = montagem();
    dado.vinculos[0].de.medida = 'raioInterno';
    await recusarResolucao(resolver(RECEITAS, dado), 'vinculo-medida-ausente');
  });

  it('recusa parâmetro que a receita não declara, em vez de ignorar', async () => {
    const dado = montagem();
    dado.vinculos[0].alvo.param = 'raioQueNaoExiste';
    await recusarResolucao(resolver(RECEITAS, dado), 'vinculo-execucao-falhou');
  });

  it('a consulta de impacto lista as instâncias que mudam em cadeia', async () => {
    const carregadores = criarCarregadoresUniverso({
      raizMontagens: fileURLToPath(new URL('montagens/', raiz)),
      raizPecas: fileURLToPath(new URL('pecas/', raiz)),
    });
    const snapshot = await criarSnapshotUniversoAutoria({ universo: lerJson('universo.json'), ...carregadores, hash: sha256Canonico });
    const mapa = derivarMapaDependencias(snapshot);
    const impacto = consultarImpactoGlobal(mapa, { tipo: 'peca', id: 'bloco-com-pino' });
    expect(impacto.roteiroRevalidacao.map(({ id }) => id)).toEqual(['tres-blocos']);
    expect(impacto.instanciasDerivadas.map(({ instancia, param, de }) => `${de} -> ${instancia}.${param}`)).toEqual([
      'base -> meio.raioDoFuro',
      'base -> meio.raioDoPino',
      'meio -> topo.raioDoFuro',
    ]);
    expect(consultarImpactoGlobal(mapa, { tipo: 'peca', id: 'bloco-com-furo' }).instanciasDerivadas).toEqual([]);
  });

  it('exige o carregador com parâmetros quando há vínculo', async () => {
    const { carregarPeca } = carregadoresDeReceitas(RECEITAS);
    await recusarResolucao(resolverMontagemPersistida(montagem(), { carregarPeca }), 'carregador-invalido');
  });
});
