/* gabarito-eixos.js — régua de orientação para descobrir, por medição em vez de
   palpite, como os eixos LOCAIS de uma malha caem no mundo quando ela é presa
   ao osso da mão do personagem.

   Três hastes de comprimento diferente, para serem distinguíveis numa foto:
     eixo X = 45 cm (a mais longa)   — onde a lâmina aponta hoje
     eixo Y = 35 cm (media)
     eixo Z = 25 cm (a mais curta)

   Uma foto do personagem segurando isto responde de uma vez o que várias
   rodadas de tentativa e erro em ângulo de Euler não respondem. */

export const receitaGabarito = {
  meta: { nome: 'Gabarito de Eixos', versao: '1.0.0', autor: 'Mecanifica Procedural AI' },
  PARAMS: {},
  MATERIAIS: {
    eixoX: { cor: '#dc2626', metalicidade: 0.1, aspereza: 0.8 },
    eixoY: { cor: '#16a34a', metalicidade: 0.1, aspereza: 0.8 },
    eixoZ: { cor: '#2563eb', metalicidade: 0.1, aspereza: 0.8 },
  },
  /* As tres hastes nascem na mesma origem, entao elas se tocam ali por
     construcao: e o que faz o gabarito ser um gabarito de eixos. */
  contatos: [
    { par: ['hasteX', 'hasteY'], motivo: 'as duas hastes nascem na origem comum do gabarito' },
    { par: ['hasteX', 'hasteZ'], motivo: 'as duas hastes nascem na origem comum do gabarito' },
    { par: ['hasteY', 'hasteZ'], motivo: 'as duas hastes nascem na origem comum do gabarito' },
  ],
  PASSOS: [
    // Cada haste sai da ORIGEM para o lado POSITIVO do seu eixo: assim a foto
    // mostra o sentido, não só a direção.
    ['cubo', { origemId: 1, larg: 0.20, alt: 0.03, prof: 0.03, em: [0.10, -0.015, 0] }],
    ['parte', { nome: 'hasteX', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['material', { usa: 'eixoX', sel: { grupo: 'hasteX' } }],

    ['cubo', { origemId: 2, larg: 0.03, alt: 0.03, prof: 0.45, em: [0, -0.015, 0.225] }],
    ['parte', { nome: 'hasteZ', sel: { origem: { op: 'cubo', id: 2 } }, pai: 'hasteX' }],
    ['material', { usa: 'eixoZ', sel: { grupo: 'hasteZ' } }],

    ['cubo', { origemId: 3, larg: 0.03, alt: 0.60, prof: 0.03, em: [0, 0, 0] }],
    ['parte', { nome: 'hasteY', sel: { origem: { op: 'cubo', id: 3 } }, pai: 'hasteX' }],
    ['material', { usa: 'eixoY', sel: { grupo: 'hasteY' } }],
  ],
};

export default receitaGabarito;
