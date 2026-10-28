/* A MESMA promessa de anel da fixture cumprida, entregue como sólido SEM furo
   passante. Reprova por forma, e só por forma.

   É o defeito da roda em miniatura: lá, a leitura de anel foi prometida "pela
   diferença de raio na silhueta" entre dois cilindros concêntricos, e o de fora
   era maciço. Malha aprovada, identidade perfeita, zero órfãos — nenhuma medida
   perguntava se a forma prometida saiu.

   POR QUE NÃO É FEITA COM `lathe`, como a fixture cumprida. Todo perfil de
   revolução que encosta no eixo produz órfão ("polo↔polo adjacente — perfil
   degenerado"), e um perfil que não encosta produz anel de verdade, por menor
   que seja o furo — medido: raio interno 0,001 já dá furos=1. A versão com
   `lathe` reprovava por DOIS motivos ao mesmo tempo, e fixture que falha por
   dois motivos não prova qual conferência a pegou. */
export const meta = { nome: 'forma_anel_quebrada' };
export const formas = { aro: 'anel' };
export const PASSOS = [
  ['cubo', { origemId: 1, larg: 20, alt: 20, prof: 20 }],
  ['parte', { nome: 'aro', sel: { origem: { op: 'cubo', id: 1 } } }],
];
