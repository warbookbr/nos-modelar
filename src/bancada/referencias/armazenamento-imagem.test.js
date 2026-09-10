/* armazenamento-imagem.test.js — isolamento de referências locais por alvo. */
import { describe, expect, it } from 'vitest';
import { criarArmazenamentoImagem } from './armazenamento-imagem.js';

describe('armazenamento de imagem de referência', () => {
  it('isola cada registro pelo alvo e o remove sem afetar os demais', async () => {
    const memoria = new Map();
    const banco = {
      put: async (chave, valor) => memoria.set(chave, valor),
      get: async (chave) => memoria.get(chave) ?? null,
      delete: async (chave) => memoria.delete(chave),
    };
    const armazenamento = criarArmazenamentoImagem({ banco });
    const registro = { id: 'foto-a', fonte: 'upload', blob: new Blob(['imagem']), rotulo: 'Vista lateral' };

    await armazenamento.salvar('alvo-a', registro);
    expect(await armazenamento.ler('alvo-a')).toMatchObject({ id: 'foto-a', rotulo: 'Vista lateral' });
    expect(await armazenamento.ler('alvo-b')).toBeNull();

    await armazenamento.remover('alvo-a');
    expect(await armazenamento.ler('alvo-a')).toBeNull();
  });
});
