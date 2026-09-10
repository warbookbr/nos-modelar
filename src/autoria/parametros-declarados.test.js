/* parametros-declarados.test.js — a pergunta única não adivinha.
 *
 * O caso guardado é o palpite: antes desta pergunta, o painel da bancada
 * montava controles varrendo argumentos de passo, e numa receita que deriva os
 * passos de uma tabela isso oferece número de saída como se fosse de entrada.
 * Receita que não declara parâmetro precisa responder VAZIO, porque um controle
 * inventado move a peça sem corresponder a decisão nenhuma. */
import { describe, expect, it } from 'vitest';
import { listarParametrosDeclarados, parametroDeclarado } from './parametros-declarados.js';

describe('parâmetros declarados', () => {
  it('lista os números de PARAMS com valor atual e endereço', () => {
    const receita = { PARAMS: { comprimento: 480, raio: 17 }, PASSOS: [] };
    const lista = listarParametrosDeclarados(receita);
    expect(lista.map((p) => p.id)).toEqual(['comprimento', 'raio']);
    expect(lista[0]).toMatchObject({ valor: 480, caminho: ['comprimento'] });
  });

  it('desce em objeto aninhado e usa o caminho com pontos como identificador', () => {
    const receita = { PARAMS: { secao: { raio: 8, lados: 24 } }, PASSOS: [] };
    expect(listarParametrosDeclarados(receita).map((p) => p.id))
      .toEqual(['secao.raio', 'secao.lados']);
  });

  it('responde vazio, e não palpite, quando a receita não declara PARAMS', () => {
    expect(listarParametrosDeclarados({ PASSOS: [['cubo', { larg: 2, raio: 5 }]] })).toEqual([]);
    expect(listarParametrosDeclarados({ PARAMS: null })).toEqual([]);
    expect(listarParametrosDeclarados(null)).toEqual([]);
  });

  it('ignora o que não é número finito', () => {
    const receita = { PARAMS: { nome: 'quadro', ligado: true, nulo: null, valor: 3 } };
    expect(listarParametrosDeclarados(receita).map((p) => p.id)).toEqual(['valor']);
  });

  it('sugere faixa em torno do valor e passo que mantém o número legível', () => {
    const [grande] = listarParametrosDeclarados({ PARAMS: { comprimento: 480 } });
    expect(grande).toMatchObject({ min: 0, max: 960, passo: 1 });

    const [pequeno] = listarParametrosDeclarados({ PARAMS: { folga: 0.5 } });
    expect(pequeno.passo).toBe(0.1);

    /* Zero não tem magnitude para espelhar; sem esta porta a faixa sairia
       [0, 0] e o controle nasceria travado. */
    const [zero] = listarParametrosDeclarados({ PARAMS: { deslocamento: 0 } });
    expect(zero).toMatchObject({ min: -1, max: 1 });
  });

  it('acha um parâmetro pelo identificador e devolve null para o que não existe', () => {
    const receita = { PARAMS: { secao: { raio: 8 } } };
    expect(parametroDeclarado(receita, 'secao.raio').valor).toBe(8);
    expect(parametroDeclarado(receita, 'secao.altura')).toBe(null);
  });
});
