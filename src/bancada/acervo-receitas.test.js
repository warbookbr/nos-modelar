/* acervo-receitas.test.js — a lista que a bancada abre vem do acervo inteiro.
 *
 * O caso guardado é o do arquivo que não é receita: teste ao lado da peça não
 * pode virar linha na janela de abrir, porque quem clica recebe erro sem
 * entender o motivo. E montagem em pasta precisa aparecer com o nome da pasta,
 * que é o nome pelo qual todo o resto do repositório a chama. */
import { describe, expect, it, vi } from 'vitest';
import { listarAcervo, listarParaBancada } from './acervo-receitas.js';
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
    expect(lista.filter((e) => !e.ensaio).length).toBe(pecasDoAcervo().length);
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
