/* estado-local.test.js — preferências visuais locais da bancada. */
import { describe, expect, it } from 'vitest';
import { criarPreferenciaDeVisao, criarPreferenciasBancada } from './estado-local.js';

function memoria() {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
}

const quebrado = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceededError'); },
};

describe('visão lembrada entre sessões', () => {
  const conhecidas = ['solida', 'arame', 'raio-x'];

  it('começa na sólida, guarda a escolhida e uma bancada nova lê o que ficou', () => {
    const armazenamento = memoria();
    expect(criarPreferenciaDeVisao({ armazenamento, conhecidas }).ler()).toBe('solida');
    criarPreferenciaDeVisao({ armazenamento, conhecidas }).salvar('raio-x');
    expect(criarPreferenciaDeVisao({ armazenamento, conhecidas }).ler()).toBe('raio-x');
  });

  it('nome guardado que deixou de valer volta ao padrão', () => {
    const armazenamento = memoria();
    armazenamento.setItem('mecanifica.bancada.visao', JSON.stringify('curvatura'));
    expect(criarPreferenciaDeVisao({ armazenamento, conhecidas }).ler()).toBe('solida');
    armazenamento.setItem('mecanifica.bancada.visao', '{quebrado');
    expect(criarPreferenciaDeVisao({ armazenamento, conhecidas }).ler()).toBe('solida');
  });

  it('armazenamento que lança na leitura ou na escrita não derruba a bancada', () => {
    const preferencia = criarPreferenciaDeVisao({ armazenamento: quebrado, conhecidas });
    expect(preferencia.ler()).toBe('solida');
    expect(preferencia.salvar('arame')).toBe('arame');
    expect(criarPreferenciasBancada({ armazenamento: quebrado }).salvar({ grade: false })).toEqual({ grade: false, chao: false });
  });
});

describe('preferências locais da bancada', () => {
  it('começa com a grade ligada e o chão desligado, e persiste atualizações parciais', () => {
    const memoria = new Map();
    const armazenamento = {
      getItem: (chave) => memoria.get(chave) ?? null,
      setItem: (chave, valor) => memoria.set(chave, valor),
    };

    const preferencias = criarPreferenciasBancada({ armazenamento });
    expect(preferencias.ler()).toEqual({ grade: true, chao: false });

    preferencias.salvar({ grade: false });
    expect(criarPreferenciasBancada({ armazenamento }).ler()).toEqual({ grade: false, chao: false });
  });
});
