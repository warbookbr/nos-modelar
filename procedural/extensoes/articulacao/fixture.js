/* fixture.js — articulação sintética da extensão: a folha de uma porta que gira
   noventa graus no eixo da porta publicada pelo batente. As peças e as portas
   vêm do teste; aqui está só a declaração. */
export const ARTICULACAO = Object.freeze({
  id: 'porta-no-batente', tipo: 'revolucao',
  fixo: Object.freeze({ caminho: Object.freeze(['batente']), porta: 'eixo-da-dobradica' }),
  movel: Object.freeze({ caminho: Object.freeze(['folha']), porta: 'eixo-da-dobradica' }),
  unidade: 'graus', curso: Object.freeze({ minimo: 0, maximo: 90 }), passos: 18,
  folga: Object.freeze({ valor: 0, unidade: 'mm' }),
});
export const PASSOS = [['articulacao', ARTICULACAO]];
