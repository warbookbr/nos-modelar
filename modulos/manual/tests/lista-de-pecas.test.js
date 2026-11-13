import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { listaEmJson, listaEmMarkdown, listarPecas } from '../src/lista-de-pecas.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

/* Montagem resolvida mínima: uma receita com dois parâmetros diferentes, uma submontagem, um cubo de 10 x 20 x 30 mm. */
function neutroCaixa(l, a, p, material) {
  const V = new Map([['a', [0, 0, 0]], ['b', [l / 1000, 0, 0]], ['c', [l / 1000, a / 1000, 0]], ['d', [0, a / 1000, p / 1000]]]);
  const F = new Map([['f', { vs: ['a', 'b', 'c', 'd'], ...(material ? { material } : {}) }]]);
  return { V, F, portas: new Map() };
}
const peca = (id, ref, parametros, neutro, caminho = [id]) => ({
  id, caminho, alvo: { tipo: 'peca', ref }, definicao: { ref, ...(parametros ? { parametros } : {}), neutro },
});
const sintetica = () => {
  const bloco = neutroCaixa(10, 20, 30, 'aco');
  const longo = neutroCaixa(10, 20, 60.4, null);
  return {
    id: 'amostra',
    instancias: [
      peca('b1', 'x/bloco', null, bloco),
      peca('b2', 'x/bloco', null, bloco),
      peca('l1', 'x/bloco', { comprimento: 60 }, longo),
      { id: 'sub', caminho: ['sub'], alvo: { tipo: 'montagem', ref: 's' }, montagem: { id: 's', instancias: [peca('b3', 'x/bloco', null, bloco, ['sub', 'b3'])] } },
    ],
  };
};

describe('lista de peças', () => {
  it('agrupa por receita e parâmetros, abre submontagem e arredonda a caixa a 1 mm', () => {
    const lista = listarPecas(sintetica());
    expect(lista.pecas.map((p) => [p.quantidade, p.caixaMm, p.materiais])).toEqual([
      [1, { largura: 10, altura: 20, profundidade: 60 }, []],
      [3, { largura: 10, altura: 20, profundidade: 30 }, ['aco']],
    ]);
    expect(lista.totalDeInstancias).toBe(4);
    expect(lista.pecas[1].instancias).toEqual(['b1', 'b2', 'sub/b3']);
  });

  it('dá a mesma saída, byte a byte, e a ordem das chaves dos parâmetros não conta', () => {
    const a = sintetica();
    const b = sintetica();
    b.instancias[2].definicao.parametros = { z: 1, a: 2 };
    a.instancias[2].definicao.parametros = { a: 2, z: 1 };
    expect(listaEmJson(listarPecas(a))).toBe(listaEmJson(listarPecas(b)));
    expect(listaEmMarkdown(listarPecas(a))).toBe(listaEmMarkdown(listarPecas(b)));
  });

  it('recusa entrada que não é montagem resolvida', () => {
    expect(() => listarPecas({})).toThrow(/montagem resolvida/);
  });

  it('o módulo não cita nenhuma peça do acervo pelo nome', () => {
    const nomes = ['instalacao-solar', 'haste', 'telhado', 'braco-robotico', 'empilhadeira', 'aviao', 'furgao'];
    const fonte = readFileSync(join(AQUI, '../src/lista-de-pecas.js'), 'utf8').toLowerCase();
    for (const nome of nomes) expect(fonte).not.toContain(nome);
  });
});
