/* Prova mapa de impacto local, direto, indireto e determinístico. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público, exercitado pelo contrato.
import { derivarImpactoDefinicaoMontagem, derivarImpactoMontagem, ErroImpactoMontagem } from '../../src/autoria/derivar-impacto-montagem.js';
// @ts-expect-error — resolvedor JavaScript público, exercitado pelo contrato.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';

const peca = () => JSON.parse(readFileSync(new URL('./fixtures/pecas-resolvidas/bloco-gabarito.json', import.meta.url), 'utf8'));
const pose = (y: number) => ({
  rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  deslocamento: [0, y, 0],
});
const endpoint = (id: string) => ({ caminho: [id], parte: 'superficie' });
const relacao = (id: string, referencia: string, movel: string) => ({
  id,
  tipo: 'mantemSeparacaoDirecional',
  referencia: endpoint(referencia),
  movel: endpoint(movel),
  especificacao: { eixo: [0, 1, 0], separacaoMinima: 0.01, toleranciaNumerica: 0.000001 },
});

function autoria(ordemInvertida = false) {
  const instancias = [
    { id: 'a', alvo: { tipo: 'peca', ref: 'bloco' }, pose: pose(0) },
    { id: 'b', alvo: { tipo: 'peca', ref: 'bloco' }, pose: pose(1.02) },
    { id: 'c', alvo: { tipo: 'peca', ref: 'bloco' }, pose: pose(2.04) },
  ];
  const relacoes = [relacao('aComB', 'a', 'b'), relacao('bComC', 'b', 'c')];
  return {
    formato: 'mecanifica.montagem', versao: 3, id: 'corrente',
    instancias: ordemInvertida ? instancias.reverse() : instancias,
    relacoes: ordemInvertida ? relacoes.reverse() : relacoes,
  };
}

function autoriaComPecaCompartilhadaQuatroVezes() {
  return {
    formato: 'mecanifica.montagem', versao: 3, id: 'quatro-consumidores',
    instancias: [
      { id: 'a', alvo: { tipo: 'peca', ref: 'bloco' }, pose: pose(0) },
      { id: 'b', alvo: { tipo: 'peca', ref: 'bloco' }, pose: pose(1.02) },
      { id: 'c', alvo: { tipo: 'peca', ref: 'bloco' }, pose: pose(2.04) },
      { id: 'd', alvo: { tipo: 'peca', ref: 'bloco' }, pose: pose(3.06) },
      { id: 'e', alvo: { tipo: 'peca', ref: 'externa' }, pose: pose(4.08) },
      { id: 'f', alvo: { tipo: 'peca', ref: 'externa' }, pose: pose(5.10) },
    ],
    relacoes: [
      relacao('aComB', 'a', 'b'),
      relacao('cComD', 'c', 'd'),
      relacao('dComE', 'd', 'e'),
      relacao('eComF', 'e', 'f'),
    ],
  };
}

async function resolver(dado = autoria()) {
  return resolverMontagemPersistida(dado, { carregarPeca: async () => peca() }) as any;
}

describe('derivarImpactoMontagem — R02', () => {
  it('separa relações e instâncias diretas das indiretas', async () => {
    const mapa = derivarImpactoMontagem(await resolver(), { caminho: ['a'] });

    expect(mapa.relacoesDiretas.map((item: any) => item.id)).toEqual(['aComB']);
    expect(mapa.relacoesIndiretas.map((item: any) => item.id)).toEqual(['bComC']);
    expect(mapa.instanciasRelacionadas).toEqual([
      { caminho: ['b'], origem: 'direta' },
      { caminho: ['c'], origem: 'indireta' },
    ]);
    expect(mapa.montagensARevalidar).toEqual([{ caminho: [] }]);
    expect(mapa.limitacoes).toContain('uso-global-fora-da-raiz-nao-verificado');
    expect(JSON.stringify(mapa)).not.toContain('pontosLocais');
  });

  it('é determinístico mesmo quando autoria chega em outra ordem', async () => {
    const normal = derivarImpactoMontagem(await resolver(), { caminho: ['a'] });
    const invertido = derivarImpactoMontagem(await resolver(autoria(true)), { caminho: ['a'] });

    expect(invertido).toEqual(normal);
  });

  it('inclui alvo composto, montagem declarante e ancestrais', async () => {
    const filha = autoria();
    const raiz = {
      formato: 'mecanifica.montagem', versao: 1, id: 'raiz',
      instancias: [{ id: 'subconjunto', alvo: { tipo: 'montagem', ref: 'filha' }, pose: pose(0) }],
    };
    const resolvida: any = await resolverMontagemPersistida(raiz, {
      carregarPeca: async () => peca(), carregarMontagem: async () => filha,
    });
    const mapa = derivarImpactoMontagem(resolvida, { caminho: ['subconjunto', 'a'] });

    expect(mapa.relacoesDiretas[0].montagem.caminho).toEqual(['subconjunto']);
    expect(mapa.relacoesDiretas[0].referencia.caminho).toEqual(['subconjunto', 'a']);
    expect(mapa.montagensARevalidar).toEqual([{ caminho: [] }, { caminho: ['subconjunto'] }]);
  });

  it('não muta a árvore nem a consulta', async () => {
    const resolvida = await resolver();
    const alvo = { caminho: ['a'] };
    const antes = JSON.stringify(resolvida);
    derivarImpactoMontagem(resolvida, alvo);

    expect(JSON.stringify(resolvida)).toBe(antes);
    expect(alvo).toEqual({ caminho: ['a'] });
  });

  it('recusa caminho ausente com código, campo e ação', async () => {
    const resolvida = await resolver();
    expect(() => derivarImpactoMontagem(resolvida, { caminho: ['ausente'] })).toThrow();
    try {
      derivarImpactoMontagem(resolvida, { caminho: ['ausente'] });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroImpactoMontagem);
      expect(erro).toMatchObject({ codigo: 'alvo-ausente', campo: 'alvo.caminho' });
      expect((erro as any).acao).toContain('caminhos');
    }
  });

  it('localiza os quatro consumidores de uma definição e propaga relações relevantes', async () => {
    const mapa = derivarImpactoDefinicaoMontagem(
      await resolver(autoriaComPecaCompartilhadaQuatroVezes()),
      { tipo: 'peca', ref: 'bloco' },
    );

    expect(mapa.alvo).toEqual({ tipo: 'peca', ref: 'bloco' });
    expect(mapa.consumidoresDefinicao.map((item: any) => item.caminho)).toEqual([
      ['a'], ['b'], ['c'], ['d'],
    ]);
    expect(mapa.caminhosIniciais).toEqual([
      ['a'], ['b'], ['c'], ['d'],
    ]);
    expect(mapa.relacoesDiretas.map((item: any) => item.id)).toEqual([
      'aComB', 'cComD', 'dComE',
    ]);
    expect(mapa.relacoesIndiretas.map((item: any) => item.id)).toEqual(['eComF']);
    expect(mapa.instanciasRelacionadas).toEqual([
      { caminho: ['e'], origem: 'direta' },
      { caminho: ['f'], origem: 'indireta' },
    ]);
    expect(mapa.montagensARevalidar).toEqual([{ caminho: [] }]);
    expect(mapa.limitacoes).toContain('uso-global-fora-da-raiz-nao-verificado');
  });

  it('falha fechado quando uma definição não é consumida pela raiz', async () => {
    const resolvida = await resolver(autoriaComPecaCompartilhadaQuatroVezes());
    expect(() => derivarImpactoDefinicaoMontagem(
      resolvida,
      { tipo: 'peca', ref: 'ausente' },
    )).toThrow();
    try {
      derivarImpactoDefinicaoMontagem(
        resolvida,
        { tipo: 'peca', ref: 'ausente' },
      );
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroImpactoMontagem);
      expect(erro).toMatchObject({ codigo: 'definicao-nao-usada', campo: 'alvo.ref' });
      expect((erro as any).acao).toContain('catálogo');
    }
  });
});
