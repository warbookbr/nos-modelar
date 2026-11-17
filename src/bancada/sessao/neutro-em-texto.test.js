/* neutro-em-texto.test.js — o neutro que a ativação grava ao lado da sessão e a página lê em vez de executar a receita (plano do cache
 * por passo, fatia 4): ida e volta dão o mesmo neutro, campo a campo e com a descrição de cada campo, e a sessão com o neutro gravado
 * não executa a receita. */
import { describe, expect, it } from 'vitest';
import { nucleo } from '../../../procedural/nucleo/entrada.js';
import { divergenciaDaImpressao } from '../../../procedural/nucleo/planejador/impressao-do-neutro.js';
import { passosDoCordao } from '../../../procedural/nucleo/fixtures/no-de-tubos.js';
import { importarReceita, receitaDoModulo } from '../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../tools/modelar/resolver-caminho-receita.mjs';
import { executarReceita } from '../../autoria/executar-receita.js';
import { FORMATO_DO_NEUTRO_EM_TEXTO, neutroDoTexto, neutroEmTexto } from '../../../procedural/nucleo/planejador/neutro-em-texto.js';
import { processarPayloadSessao } from './carregar-sessao.js';

const descricoes = (n) => Object.fromEntries(Reflect.ownKeys(n).map((k) => { const { value, ...d } = Object.getOwnPropertyDescriptor(n, k); return [k, d]; }));
const idaEVolta = (n) => {
  const volta = neutroDoTexto(neutroEmTexto(n));
  expect(divergenciaDaImpressao(volta, n)).toBeNull();
  expect(descricoes(volta)).toEqual(descricoes(n));
  return volta;
};

describe('o neutro em texto', () => {
  it('guarda o que o JSON perderia: Map, Set, zero negativo, NaN, infinito, indefinido e o texto que começa pelo caractere nulo', () => {
    const n = { V: new Map([[1, [-0, NaN, Infinity]], [0, [1, 2, 3]]]), F: new Map(), s: new Set(['b', 'a']), u: { x: undefined }, t: '\u0000Map', l: [undefined, -Infinity] };
    Object.defineProperty(n, 'escondido', { value: new Map([['k', 1]]), enumerable: false });
    const volta = idaEVolta(n);
    expect(Object.is(volta.V.get(1)[0], -0)).toBe(true);
    expect([...volta.V.keys()]).toEqual([1, 0]);
    expect('x' in volta.u).toBe(true);
    expect(volta.t).toBe('\u0000Map');
    expect(Object.keys(volta)).not.toContain('escondido');
  });

  it('a lista com buraco e o objeto de classe não se escrevem', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(() => neutroEmTexto({ a: [1, , 2] })).toThrow(/buraco/);
    expect(() => neutroEmTexto({ a: new Date(0) })).toThrow(/classe/);
  });

  it('o neutro de verdade vai e volta igual: a fixture do cordão de solda e duas peças do acervo', async () => {
    idaEVolta(nucleo(passosDoCordao('T reto 17/8', 7)));
    for (const peca of ['braco-robotico/flange', 'aviao/partes/empenagem-vertical']) {
      const receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita(peca)));
      idaEVolta(executarReceita(receita).neutro);
    }
  });

  it('a sessão com o neutro gravado não executa a receita e usa o neutro lido; sem ele, executa', () => {
    const receita = { PASSOS: [['cubo', { lado: 1 }], ['parte', { sel: { tudo: true }, nome: 'a' }]], PARAMS: {}, MATERIAIS: {} };
    const neutro = executarReceita(receita).neutro;
    const lidos = [];
    const lerNeutro = (arquivo) => { lidos.push(arquivo); return neutroDoTexto(neutroEmTexto(neutro)); };
    const comNeutro = processarPayloadSessao({ receita, neutro: { formato: FORMATO_DO_NEUTRO_EM_TEXTO, arquivo: 'x.neutro.json' } }, { lerNeutro });
    expect(lidos).toEqual(['x.neutro.json']);
    expect(divergenciaDaImpressao(comNeutro.neutro, neutro)).toBeNull();
    const semNeutro = processarPayloadSessao({ receita }, { lerNeutro });
    expect(lidos).toHaveLength(1);
    expect(divergenciaDaImpressao(semNeutro.neutro, neutro)).toBeNull();
    /* o neutro que não carrega (fora do navegador, falha de leitura) faz a página executar */
    const naoCarregou = processarPayloadSessao({ receita, neutro: { formato: FORMATO_DO_NEUTRO_EM_TEXTO, arquivo: 'x.neutro.json' } }, { lerNeutro: () => null });
    expect(divergenciaDaImpressao(naoCarregou.neutro, neutro)).toBeNull();
  });
});
