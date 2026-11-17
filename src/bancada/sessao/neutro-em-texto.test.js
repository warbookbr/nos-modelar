/* neutro-em-texto.test.js — o neutro que a ativação grava ao lado da sessão e a página lê em vez de executar a receita (plano do cache
 * por passo, fatia 4): ida e volta dão o mesmo neutro, campo a campo e com a descrição de cada campo, e a sessão com o neutro gravado
 * não executa a receita. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nucleo } from '../../../procedural/nucleo/entrada.js';
import { divergenciaDaImpressao } from '../../../procedural/nucleo/planejador/impressao-do-neutro.js';
import { passosDoCordao } from '../../../procedural/nucleo/fixtures/no-de-tubos.js';
import { importarReceita, receitaDoModulo } from '../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../tools/modelar/resolver-caminho-receita.mjs';
import { executarReceita } from '../../autoria/executar-receita.js';
import { FORMATO_DO_NEUTRO_EM_TEXTO, impressaoDaReceita, lerNeutroEmTexto, neutroDoTexto, neutroEmTexto } from '../../../procedural/nucleo/planejador/neutro-em-texto.js';
import { processarPayloadSessao, processarReceitaSessao } from './carregar-sessao.js';

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

  it('o texto leva a impressão da entrada, e a leitura a devolve; a receita diferente tem outra impressão', () => {
    const n = nucleo(passosDoCordao('T reto 17/8', 7));
    const impressao = impressaoDaReceita({ PASSOS: [['cubo', { lado: 1 }]] });
    expect(lerNeutroEmTexto(neutroEmTexto(n, { impressao })).impressao).toBe(impressao);
    expect(lerNeutroEmTexto(neutroEmTexto(n)).impressao).toBeNull();
    expect(impressaoDaReceita({ PASSOS: [['cubo', { lado: 2 }]] })).not.toBe(impressao);
    /* a ida e a volta do JSON da sessão não muda a impressão */
    const receita = { PASSOS: [['cubo', { lado: 1, nada: undefined }]], PARAMS: { x: -0 }, MATERIAIS: {} };
    expect(impressaoDaReceita(JSON.parse(JSON.stringify(receita, null, 2)))).toBe(impressaoDaReceita(receita));
  });
});

describe('a página lê o neutro que a ativação gravou, e só o desta receita', () => {
  const receita = { PASSOS: [['cubo', { lado: 1 }], ['parte', { sel: { tudo: true }, nome: 'a' }]], PARAMS: {}, MATERIAIS: {} };
  const outra = { PASSOS: [['cubo', { lado: 3 }], ['parte', { sel: { tudo: true }, nome: 'b' }]], PARAMS: {}, MATERIAIS: {} };
  const citado = { formato: FORMATO_DO_NEUTRO_EM_TEXTO, arquivo: 'x.neutro.json' };
  /* o neutro gravado leva um campo a mais, que a execução da receita nunca produz: o que a página usou se reconhece por ele */
  const gravadoDe = (r, impressao) => () => {
    const n = executarReceita(r).neutro;
    n.lidoDoArquivo = true;
    return lerNeutroEmTexto(neutroEmTexto(n, { impressao }));
  };
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('com o neutro gravado desta receita, usa o do arquivo e não executa a receita', () => {
    const lidos = [];
    const lerNeutro = (arquivo) => { lidos.push(arquivo); return gravadoDe(receita, impressaoDaReceita(receita))(); };
    const modelo = processarPayloadSessao({ receita, neutro: citado }, { lerNeutro });
    expect(lidos).toEqual(['x.neutro.json']);
    expect(modelo.neutro.lidoDoArquivo).toBe(true);
    expect(modelo.origemDoNeutro).toEqual({ origem: 'gravado', arquivo: 'x.neutro.json' });
    delete modelo.neutro.lidoDoArquivo;
    expect(divergenciaDaImpressao(modelo.neutro, executarReceita(receita).neutro)).toBeNull();
  });

  it('o neutro de outra receita é recusado: a página executa a receita dela, avisa e diz o motivo', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const modelo = processarPayloadSessao({ receita, neutro: citado }, { lerNeutro: gravadoDe(outra, impressaoDaReceita(outra)) });
    expect(modelo.neutro.lidoDoArquivo).toBeUndefined();
    expect(divergenciaDaImpressao(modelo.neutro, executarReceita(receita).neutro)).toBeNull();
    expect(modelo.origemDoNeutro).toMatchObject({ origem: 'executado', arquivo: 'x.neutro.json' });
    expect(modelo.origemDoNeutro.motivo).toMatch(/outra entrada/);
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('o neutro sem impressão (de antes dela) também é recusado', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const modelo = processarPayloadSessao({ receita, neutro: citado }, { lerNeutro: gravadoDe(receita, null) });
    expect(modelo.origemDoNeutro.origem).toBe('executado');
    expect(modelo.neutro.lidoDoArquivo).toBeUndefined();
  });

  it('sem neutro na sessão, executa e diz que a sessão não o trouxe; sem aviso, porque ninguém o prometeu', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const modelo = processarPayloadSessao({ receita }, { lerNeutro: () => { throw new Error('não devia ler'); } });
    expect(modelo.origemDoNeutro).toEqual({ origem: 'executado', motivo: 'a sessão não traz o neutro da ativação' });
    expect(aviso).not.toHaveBeenCalled();
  });

  it('o neutro que não carrega (404, erro de leitura, formato desconhecido) faz executar e avisa', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const casos = [
      [{ receita, neutro: citado }, () => ({ motivo: 'o servidor respondeu 404' }), /404/],
      [{ receita, neutro: citado }, () => null, /não carregou/],
      [{ receita, neutro: citado }, () => { throw new Error('rede caiu'); }, /rede caiu/],
      [{ receita, neutro: { ...citado, formato: 'outro@9' } }, () => { throw new Error('não devia ler'); }, /formato/],
    ];
    for (const [payload, lerNeutro, motivo] of casos) {
      const modelo = processarPayloadSessao(payload, { lerNeutro });
      expect(modelo.origemDoNeutro.origem).toBe('executado');
      expect(modelo.origemDoNeutro.motivo).toMatch(motivo);
      expect(divergenciaDaImpressao(modelo.neutro, executarReceita(receita).neutro)).toBeNull();
    }
    expect(aviso).toHaveBeenCalledTimes(casos.length);
  });

  it('a leitura de verdade pelo XMLHttpRequest: 200 com a impressão certa é lido, 404 avisa em vez de calar', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const texto = neutroEmTexto(executarReceita(receita).neutro, { impressao: impressaoDaReceita(receita) });
    const resposta = { status: 200, responseText: texto };
    vi.stubGlobal('XMLHttpRequest', class { open() {} send() {} get status() { return resposta.status; } get responseText() { return resposta.responseText; } });
    expect(processarPayloadSessao({ receita, neutro: citado }).origemDoNeutro.origem).toBe('gravado');
    resposta.status = 404;
    const sem = processarPayloadSessao({ receita, neutro: citado });
    expect(sem.origemDoNeutro).toMatchObject({ origem: 'executado', motivo: expect.stringMatching(/404/) });
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('o neutro que o chamador entrega é `fornecido`, e o que a página executa sozinha é `executado`', () => {
    expect(processarReceitaSessao(receita, { neutro: executarReceita(receita).neutro }).origemDoNeutro).toEqual({ origem: 'fornecido' });
    expect(processarReceitaSessao(receita).origemDoNeutro).toEqual({ origem: 'executado' });
  });
});
