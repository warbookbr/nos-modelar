/* acervo-receitas.test.js — a lista que a bancada abre vem do acervo inteiro.
 *
 * O caso guardado é o do arquivo que não é receita: teste ao lado da peça não
 * pode virar linha na janela de abrir, porque quem clica recebe erro sem
 * entender o motivo. E montagem em pasta precisa aparecer com o nome da pasta,
 * que é o nome pelo qual todo o resto do repositório a chama. */
import { describe, expect, it, vi } from 'vitest';
import { listarAcervo } from './acervo-receitas.js';

describe('acervo de receitas da bancada', () => {
  it('nomeia peça pelo arquivo, montagem pela pasta, e ordena', () => {
    const acervo = listarAcervo({
      '../../prototipos/procedural/v3/pecas/quadro.js': async () => ({}),
      '../../prototipos/procedural/v3/pecas/prensa/montagem.js': async () => ({}),
      '../../prototipos/procedural/v3/pecas/aro.js': async () => ({}),
    });
    expect(acervo.map((e) => e.id)).toEqual(['aro', 'prensa', 'quadro']);
    expect(acervo.find((e) => e.id === 'prensa').montagem).toBe(true);
    expect(acervo.find((e) => e.id === 'aro').montagem).toBe(false);
  });

  it('deixa de fora arquivo de teste que mora junto da peça', () => {
    const acervo = listarAcervo({
      '../../prototipos/procedural/v3/pecas/quadro.js': async () => ({}),
      '../../prototipos/procedural/v3/pecas/quadro.test.js': async () => ({}),
      '../../prototipos/procedural/v3/pecas/quadro.spec.js': async () => ({}),
    });
    expect(acervo.map((e) => e.id)).toEqual(['quadro']);
  });

  it('carrega preguiçosamente e devolve a receita sem o invólucro do módulo', async () => {
    const receita = { PASSOS: [] };
    const importar = vi.fn(async () => ({ default: receita }));
    const acervo = listarAcervo({ '../../prototipos/procedural/v3/pecas/quadro.js': importar });
    expect(importar).not.toHaveBeenCalled();
    expect(await acervo[0].carregar()).toBe(receita);
    expect(importar).toHaveBeenCalledTimes(1);
  });

  it('enxerga o acervo real do repositório', async () => {
    const acervo = listarAcervo();
    expect(acervo.map((e) => e.id)).toContain('bicicleta-quadro');
    const receita = await acervo.find((e) => e.id === 'bicicleta-quadro').carregar();
    expect(Array.isArray(receita.PASSOS)).toBe(true);
  });
});
