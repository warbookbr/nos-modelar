/* vistas-da-bancada.js — as direções das vistas nomeadas da bancada, em dado puro, para quem roda sem navegador (o esboço 2.0)
   e para a própria bancada, que as reexporta. Saíram de src/bancada/estado-bancada.js pela fronteira da bancada. */
export const VISTAS_BANCADA = Object.freeze({
  isometrica: Object.freeze({
    nome: 'Isométrica',
    direcao: Object.freeze([1, 0.72, 1]),
    atalho: '0',
  }),
  frontal: Object.freeze({
    nome: 'Frontal',
    direcao: Object.freeze([0, 0, 1]),
    atalho: '1',
  }),
  traseira: Object.freeze({
    nome: 'Traseira',
    direcao: Object.freeze([0, 0, -1]),
    atalho: 'Shift+1',
  }),
  direita: Object.freeze({
    nome: 'Direita',
    direcao: Object.freeze([1, 0, 0]),
    atalho: '3',
  }),
  esquerda: Object.freeze({
    nome: 'Esquerda',
    direcao: Object.freeze([-1, 0, 0]),
    atalho: 'Shift+3',
  }),
  superior: Object.freeze({
    nome: 'Superior',
    direcao: Object.freeze([0, 1, 0]),
    atalho: '7',
  }),
  inferior: Object.freeze({
    nome: 'Inferior',
    direcao: Object.freeze([0, -1, 0]),
    atalho: 'Shift+7',
  }),
});
