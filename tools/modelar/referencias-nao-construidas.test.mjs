/* referencias-nao-construidas.test.mjs — `PLANO.referenciasNaoConstruidas`: a variante que a receita não constrói sai da comparação do
   crítico e o pedido diz que ela não é construída; o plano recusa a declaração malformada. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { montarPedido, referenciasDoPlano } from './vistas-para-critica.mjs';

const bruto = () => JSON.parse(readFileSync(new URL('../fixtures/referencias-nao-construidas/plano.json', import.meta.url), 'utf8'));
const existe = () => true;

describe('referências que a receita não constrói', () => {
  const plano = normalizarPlanoDeModelagem(bruto());

  it('tira a variante não construída das imagens e a lista à parte', () => {
    const r = referenciasDoPlano(plano, { raiz: '/repo', pastaDaReceita: '/r', existe });
    expect(r.imagens).toEqual([resolve('/repo/ref/variante-a.jpg')]);
    expect(r.naoConstruidas).toEqual([resolve('/repo/ref/variante-b.jpg')]);
  });

  it('o pedido diz que a variante não é construída e só põe a construída como referência', () => {
    const r = referenciasDoPlano(plano, { raiz: '/repo', pastaDaReceita: '/r', existe });
    const pedido = montarPedido({ peca: 'x/y', referencias: r.imagens.map((caminho) => ({ caminho })), naoConstruidas: r.naoConstruidas });
    expect(pedido).toContain('variante-b.jpg: não construída');
    expect(pedido).toContain(`variante-a.jpg: ${resolve('/repo/ref/variante-a.jpg')}`);
    expect(pedido).not.toContain('variante-b.jpg: '+resolve('/repo/ref/variante-b.jpg'));
  });

  it('plano sem o campo não ganha a chave nem a seção', () => {
    expect(referenciasDoPlano({ referencias: ['a.png'] }, { raiz: '/repo', existe })).not.toHaveProperty('naoConstruidas');
    expect(montarPedido({ peca: 'x/y' })).not.toContain('NÃO constrói');
  });

  it('o plano recusa referência fora da lista, repetida, todas ou vazia, com recebido, esperado e comando', () => {
    const com = (v) => () => normalizarPlanoDeModelagem({ ...bruto(), referenciasNaoConstruidas: v });
    expect(com(['ref/outra.jpg'])).toThrow(/cita "ref\/outra.jpg".*esperado um de.*npm run vistas:critica/);
    expect(com(['ref/variante-b.jpg', 'ref/variante-b.jpg'])).toThrow(/repetido/);
    expect(com(['ref/alvo.md', 'ref/variante-a.jpg', 'ref/variante-b.jpg'])).toThrow(/todas as 3 referências.*ao menos uma construída/);
    expect(com([])).toThrow(/recebeu \[\].*esperado lista não vazia/);
  });
});
