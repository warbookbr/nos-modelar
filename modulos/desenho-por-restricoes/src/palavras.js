/* palavras.js — as palavras fechadas do formato que dizem de que lado uma relação vale: o `lado` (acima, abaixo, esquerda, direita),
   o `por` da tangência entre círculos (fora, dentro) e o `eixo` de uma distância só em h ou só em v. Um parâmetro pode ser uma
   dessas palavras (a peça recebe a orientação do uso), e um sinal escolhe entre os dois lados de um eixo. Puro, sem import. */

export const LADOS = ['acima', 'abaixo', 'esquerda', 'direita'];
export const TOQUES = ['fora', 'dentro'];
export const EIXOS = ['h', 'v'];
export const PALAVRAS = [...LADOS, ...TOQUES, ...EIXOS];

/* O lado que o sinal de um número escolhe em cada eixo: positivo é o lado de h ou de v maior. */
export const LADO_DO_SINAL = { h: { positivo: 'direita', negativo: 'esquerda' }, v: { positivo: 'acima', negativo: 'abaixo' } };
