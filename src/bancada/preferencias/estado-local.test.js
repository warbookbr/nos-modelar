/* estado-local.test.js — preferências visuais locais da bancada. */
import { describe, expect, it } from 'vitest';
import { criarPreferenciasBancada } from './estado-local.js';

describe('preferências locais da bancada', () => {
  it('começa com grade e chão ativos e persiste atualizações parciais', () => {
    const memoria = new Map();
    const armazenamento = {
      getItem: (chave) => memoria.get(chave) ?? null,
      setItem: (chave, valor) => memoria.set(chave, valor),
    };

    const preferencias = criarPreferenciasBancada({ armazenamento });
    expect(preferencias.ler()).toEqual({ grade: true, chao: true });

    preferencias.salvar({ grade: false });
    expect(criarPreferenciasBancada({ armazenamento }).ler()).toEqual({ grade: false, chao: true });
  });
});
