/* ligacao-parte-parametro.test.js — qual parâmetro move qual parte, MEDIDO.
 *
 * O caso guardado é o punho ligado por palpite de nome: `tuboSelimComprimento`
 * parece governar o tubo do selim e NÃO governa — na bicicleta ele move os
 * balanços superiores, porque o tubo do selim nasce entre a caixa de movimento
 * central e um ponto de solda medido, e o comprimento entra só na conta de onde
 * os balanços encontram o selim. Ligar por nome poria o punho na peça errada
 * com confiança. */
import { describe, expect, it } from 'vitest';
import { ligarPartesAParametros, parametrosDaParte } from './ligacao-parte-parametro.js';
import receita from '../../prototipos/procedural/v3/pecas/bicicleta-quadro.js';

const PECA_SIMPLES = {
  meta: { nome: 'duas barras' },
  PARAMS: { alturaA: 100, alturaB: 200, enfeite: 7 },
  TOPO: { origem: 'centro' },
  get PASSOS() {
    return [
      ['cubo', { origemId: 10, larg: 0.05, alt: this.PARAMS.alturaA / 1000, prof: 0.05 }],
      ['parte', { nome: 'barraA', sel: { origem: { op: 'cubo', id: 10 } } }],
      ['cubo', { origemId: 20, larg: 0.05, alt: this.PARAMS.alturaB / 1000, prof: 0.05, em: [0.2, 0, 0] }],
      ['parte', { nome: 'barraB', sel: { origem: { op: 'cubo', id: 20 } } }],
    ];
  },
};

describe('ligação entre parte e parâmetro', () => {
  it('liga cada parte só ao parâmetro que a move, e separa o inerte', () => {
    const ligacao = ligarPartesAParametros(PECA_SIMPLES);

    expect(parametrosDaParte(ligacao, 'barraA').map((p) => p.id)).toEqual(['alturaA']);
    expect(parametrosDaParte(ligacao, 'barraB').map((p) => p.id)).toEqual(['alturaB']);
    expect(ligacao.inertes).toEqual(['enfeite']);
    expect(ligacao.porParametro.enfeite).toBeUndefined();
  });

  it('ordena pelo tamanho do movimento, do maior para o menor', () => {
    const peca = {
      ...PECA_SIMPLES,
      PARAMS: { grande: 100, pequeno: 100 },
      get PASSOS() {
        return [
          ['cubo', { origemId: 10, larg: this.PARAMS.grande / 1000, alt: this.PARAMS.pequeno / 100000, prof: 0.05 }],
          ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 10 } } }],
        ];
      },
    };
    expect(parametrosDaParte(ligarPartesAParametros(peca), 'bloco').map((p) => p.id))
      .toEqual(['grande', 'pequeno']);
  });

  it('peça sem parâmetro declarado devolve ligação vazia, sem inventar', () => {
    const ligacao = ligarPartesAParametros({
      PARAMS: {},
      TOPO: { origem: 'c' },
      PASSOS: [
        ['cubo', { origemId: 10, larg: 0.1, alt: 0.1, prof: 0.1 }],
        ['parte', { nome: 'bloco', sel: { origem: { op: 'cubo', id: 10 } } }],
      ],
    });
    expect(ligacao.partes).toEqual(['bloco']);
    expect(parametrosDaParte(ligacao, 'bloco')).toEqual([]);
    expect(ligacao.inertes).toEqual([]);
  });

  it('parte que não existe devolve lista vazia', () => {
    expect(parametrosDaParte(ligarPartesAParametros(PECA_SIMPLES), 'inexistente')).toEqual([]);
  });

  it('na bicicleta, a contagem de inertes bate com o retrato de parâmetros vivos', () => {
    const ligacao = ligarPartesAParametros(receita);
    /* 23 declarados, 13 vivos no retrato do acervo — então 10 inertes. Duas
       medidas independentes que precisam concordar. */
    expect(ligacao.inertes).toHaveLength(10);
    expect(ligacao.inertes).toContain('garfoAvanco');
  });

  it('MEDIDO: o comprimento do tubo do selim move os balanços, e não o tubo do selim', () => {
    const ligacao = ligarPartesAParametros(receita);
    expect(ligacao.porParametro.tuboSelimComprimento.map((m) => m.parte).sort())
      .toEqual(['balancoSuperiorDir', 'balancoSuperiorEsq']);
    expect(parametrosDaParte(ligacao, 'tuboSelim').map((p) => p.id))
      .not.toContain('tuboSelimComprimento');
  });

  it('MEDIDO: o tubo inferior não é movido por nenhum parâmetro escalar declarado', () => {
    /* Ele nasce de `tuboEntreBordas`, com as duas bordas medidas guardadas em
       LISTAS na tabela, e a pergunta de parâmetros só enxerga número solto.
       Enquanto isso não mudar, a bancada não tem punho para oferecer nele — e é
       melhor não ter do que ter um punho que move outra coisa. */
    expect(parametrosDaParte(ligarPartesAParametros(receita), 'tuboInferior')).toEqual([]);
  });
});
