/* acervo-receitas.test.js — a lista que a bancada abre vem do acervo inteiro.
 *
 * O caso guardado é o do arquivo que não é receita: teste ao lado da peça não
 * pode virar linha na janela de abrir, porque quem clica recebe erro sem
 * entender o motivo. E montagem em pasta precisa aparecer com o nome da pasta,
 * que é o nome pelo qual todo o resto do repositório a chama. */
import { describe, expect, it, vi } from 'vitest';
import { CATEGORIAS, CATEGORIA_DA_FAMILIA, categoriaDoPlano, classificarEntradas, listarAcervo, listarParaBancada } from './acervo-receitas.js';
import { pecasDoAcervo } from '../../tools/modelar/guardas/guarda-acervo.mjs';

describe('acervo de receitas da bancada', () => {
  it('nomeia peça pelo arquivo, montagem pela pasta, e ordena', () => {
    const acervo = listarAcervo({
      '../../procedural/pecas/quadro.js': async () => ({}),
      '../../procedural/pecas/prensa/montagem.js': async () => ({}),
      '../../procedural/pecas/aro.js': async () => ({}),
    });
    expect(acervo.map((e) => e.id)).toEqual(['aro', 'prensa', 'quadro']);
    expect(acervo.find((e) => e.id === 'prensa').montagem).toBe(true);
    expect(acervo.find((e) => e.id === 'aro').montagem).toBe(false);
  });

  it('deixa de fora arquivo de teste que mora junto da peça', () => {
    const acervo = listarAcervo({
      '../../procedural/pecas/quadro.js': async () => ({}),
      '../../procedural/pecas/quadro.test.js': async () => ({}),
      '../../procedural/pecas/quadro.spec.js': async () => ({}),
    });
    expect(acervo.map((e) => e.id)).toEqual(['quadro']);
  });

  it('carrega preguiçosamente e devolve a receita sem o invólucro do módulo', async () => {
    const receita = { PASSOS: [] };
    const importar = vi.fn(async () => ({ default: receita }));
    const acervo = listarAcervo({ '../../procedural/pecas/quadro.js': importar });
    expect(importar).not.toHaveBeenCalled();
    expect(await acervo[0].carregar()).toBe(receita);
    expect(importar).toHaveBeenCalledTimes(1);
  });

  /* DUAS LISTAS, E NÃO UMA. `listarAcervo` é o acervo, porque é o que as
     ferramentas que medem o acervo esperam: juntar ensaio ali fez a varredura
     de parâmetros saltar de 96 declarados para 102, contando requisito de
     fixture como parâmetro de peça. Quem precisa dos dois é a bancada, que tem
     de poder abrir a peça de prova das guardas. */
  it('o acervo não traz ensaio, mesmo com o ensaio existindo no disco', () => {
    expect(listarAcervo().map((e) => e.id)).not.toContain('peca-de-prova');
    expect(listarAcervo().every((e) => e.ensaio === false)).toBe(true);
  });

  it('a lista da bancada junta os dois, marcando qual é qual', () => {
    const lista = listarParaBancada(
      { '../../procedural/pecas/quadro.js': async () => ({}) },
      { '../../tools/fixtures/acervo/peca-de-prova/receita.js': async () => ({}) },
      {},
    );
    expect(lista.map((e) => e.id)).toEqual(['peca-de-prova', 'quadro']);
    expect(lista.find((e) => e.id === 'peca-de-prova').ensaio).toBe(true);
    expect(lista.find((e) => e.id === 'quadro').ensaio).toBe(false);
  });

  it('a bancada enxerga o acervo real e a peça de prova', async () => {
    const lista = listarParaBancada();
    /* O acervo é conferido por CONTAGEM CONTRA A PASTA, e não por nome nem por
       piso: nomear uma peça faz a bancada depender de conteúdo, e exigir pelo
       menos uma faz este caso morrer no dia em que o acervo fica legitimamente
       sem peça. O que ele afirma é que a bancada mostra o acervo inteiro e nem
       uma peça a mais. */
    expect(lista.filter((e) => !e.ensaio && !e.emDados).length).toBe(pecasDoAcervo().length);
    expect(lista.map((e) => e.id)).toContain('peca-de-prova');
    const prova = await lista.find((e) => e.id === 'peca-de-prova').carregar();
    expect(Array.isArray(prova.PASSOS)).toBe(true);
  });
});

describe('objeto de várias partes na bancada', () => {
  it('a parte aparece pelo nome curto, e a cópia guardada pela rodada não vira peça', () => {
    const importar = () => Promise.resolve({ default: {} });
    const lista = listarAcervo({
      '../../procedural/pecas/objeto/partes/base/receita.js': importar,
      '../../procedural/pecas/objeto/partes/base/rodadas/receita-01.js': importar,
      '../../procedural/pecas/solta/receita.js': importar,
    });
    expect(lista.map((e) => e.id)).toEqual(['objeto/base', 'solta']);
  });
});

describe('montagem em dados na janela Abrir', () => {
  const importar = () => Promise.resolve({ default: {} });
  const dado = { formato: 'mecanifica.montagem' };
  const lista = () => listarParaBancada(
    {
      '../../procedural/pecas/objeto/partes/base/receita.js': importar,
      '../../procedural/pecas/objeto/partes/topo/receita.js': importar,
      '../../procedural/pecas/solta/receita.js': importar,
    },
    {},
    { '../../procedural/pecas/objeto/montagem.json': async () => dado },
  );

  it('o objeto entra como uma entrada de montagem, com o nome da pasta, e carrega o dado cru', async () => {
    const entrada = lista().find((e) => e.id === 'objeto');
    expect(entrada).toMatchObject({ montagem: true, emDados: true, ensaio: false });
    expect(await entrada.carregar()).toBe(dado);
  });

  it('as partes do objeto saem da janela mas continuam abrindo pelo nome; a peça solta fica', () => {
    const entradas = lista();
    expect(entradas.map((e) => e.id)).toEqual(['objeto', 'objeto/base', 'objeto/topo', 'solta']);
    expect(entradas.filter((e) => e.parteDe).map((e) => e.id)).toEqual(['objeto/base', 'objeto/topo']);
  });

  it('o acervo das ferramentas não ganha a montagem em dados', () => {
    expect(listarAcervo({ '../../procedural/pecas/solta/receita.js': importar }).map((e) => e.id)).toEqual(['solta']);
  });
});

describe('categoria e situação da lista da bancada', () => {
  const receita = (plano) => async () => ({ default: { PLANO: plano } });

  it('a categoria sai de PLANO.familia ou PLANO.familiaProcedural, e o que nada declara cai em outros', async () => {
    const lista = listarParaBancada(
      {
        '../../procedural/pecas/carro/receita.js': receita({ familia: 'veiculo' }),
        '../../procedural/pecas/poltrona/receita.js': receita({ familia: 'assento' }),
        '../../procedural/pecas/roda/receita.js': receita({ familiaProcedural: 'roda-pneu', familia: 'veiculo' }),
        '../../procedural/pecas/copo/receita.js': receita({ objeto: 'copo' }),
        '../../procedural/pecas/faca/receita.js': receita({ categoria: 'utensilios' }),
        '../../procedural/pecas/sofa/receita.js': receita({ categoria: 'moveis', familia: 'assento' }),
        '../../procedural/pecas/fora/receita.js': receita({ categoria: 'brinquedos' }),
        '../../procedural/pecas/sem-plano/receita.js': async () => ({ default: {} }),
        '../../procedural/pecas/quebrada/receita.js': async () => { throw new Error('falha'); },
      },
      { '../../tools/fixtures/acervo/prova/receita.js': receita({}) },
      { '../../procedural/pecas/objeto/montagem.json': async () => ({ categoria: 'robotica' }), '../../procedural/pecas/outro/montagem.json': async () => ({}) },
    );
    expect(lista.every((e) => e.categoria === null)).toBe(true);
    await classificarEntradas(lista);
    const por = Object.fromEntries(lista.map((e) => [e.id, e.categoria]));
    expect(por).toEqual({
      carro: 'veiculos', poltrona: 'moveis', roda: 'veiculos', copo: 'outros', faca: 'utensilios', sofa: 'moveis', fora: 'outros', outro: 'outros', 'sem-plano': 'outros', quebrada: 'outros', prova: 'outros', objeto: 'robotica',
    });
  });

  it('a situação é de ensaio para o que vem de fixtures e de trabalho para o resto, montagem em dados incluída', () => {
    const lista = listarParaBancada(
      { '../../procedural/pecas/quadro.js': async () => ({}) },
      { '../../tools/fixtures/acervo/prova/receita.js': async () => ({}) },
      { '../../procedural/pecas/objeto/montagem.json': async () => ({}) },
    );
    expect(Object.fromEntries(lista.map((e) => [e.id, e.situacao]))).toEqual({ objeto: 'trabalho', prova: 'ensaio', quadro: 'trabalho' });
  });

  it('o carregamento da categoria não baixa a receita duas vezes', async () => {
    const importar = vi.fn(async () => ({ default: { PLANO: { familia: 'veiculo' } } }));
    const [entrada] = listarParaBancada({ '../../procedural/pecas/carro/receita.js': importar }, {}, {});
    await Promise.all([entrada.classificar(), entrada.classificar()]);
    expect(importar).toHaveBeenCalledTimes(1);
  });

  it('categoriaDoPlano aceita plano ausente', () => {
    expect(categoriaDoPlano(undefined)).toBe('outros');
    expect(categoriaDoPlano({ familia: 'inexistente' })).toBe('outros');
  });

  /* O ACERVO REAL. Duas coisas que um objeto novo pode quebrar sem que ninguém olhe a janela: declarar uma família que a
     tabela não conhece (cairia em outros sem aviso) e fazer o outros passar de um décimo do acervo de trabalho (eram 18 de 58 antes de os objetos declararem a categoria; o plano mandava parar em um terço), o ponto em
     que o plano manda parar e voltar à pessoa em vez de inventar categoria. */
  it('toda receita do acervo cai numa categoria, e a família declarada tem categoria na tabela', async () => {
    const lista = listarParaBancada().filter((e) => !e.parteDe);
    await classificarEntradas(lista);
    const ids = new Set(CATEGORIAS.map((c) => c.id));
    expect(lista.every((e) => ids.has(e.categoria))).toBe(true);
    for (const entrada of lista.filter((e) => !e.emDados)) {
      const plano = (await entrada.carregar()).PLANO;
      for (const familia of [plano?.familia, plano?.familiaProcedural].filter(Boolean)) {
        expect(Object.keys(CATEGORIA_DA_FAMILIA), `${entrada.id} declara a família ${familia}, que a tabela não conhece`).toContain(familia);
      }
      if (entrada.categoria === 'outros') expect(plano?.categoria ?? plano?.familia ?? plano?.familiaProcedural).toBeUndefined();
    }
  }, 120_000);

  it('o outros não passa de um décimo do acervo de trabalho, e as categorias declaradas existem no acervo', async () => {
    const trabalho = listarParaBancada().filter((e) => !e.parteDe && e.situacao === 'trabalho');
    await classificarEntradas(trabalho);
    const outros = trabalho.filter((e) => e.categoria === 'outros');
    expect(outros.length / trabalho.length, `outros: ${outros.map((e) => e.id).join(', ')}`).toBeLessThanOrEqual(1 / 10);
    expect(trabalho.filter((e) => e.categoria === 'veiculos').length).toBeGreaterThan(0);
    for (const { id } of CATEGORIAS.filter((c) => c.id !== 'outros')) {
      expect(trabalho.filter((e) => e.categoria === id).length, `nenhuma entrada em ${id}`).toBeGreaterThan(0);
    }
  }, 120_000);
});
