/* composicoes.js — a composição da família `cremalheira`: a barra é uma `extrusao` do retângulo em [x, z], ao longo de y; o
   vão de um dente é outra `extrusao`, repetida ao longo de x por `arranja` linear (dentes + 1 vãos, o primeiro e o último
   pela metade nas pontas), e o `subtrair` tira os vãos da barra. A parte é `cremalheira`. */
import { FORMATO_COMPOSICAO_PROCEDURAL } from '../../nucleo/entrada.js';
import { PONTOS_DO_VAO } from './geometria.js';

export const ID_DA_CREMALHEIRA = 'cremalheira.reta';
const p = (nome) => ({ parametro: nome });
const VAO = { op: 'extrusao', id: 20 };

export const COMPOSICOES = Object.freeze([Object.freeze({
  formato: FORMATO_COMPOSICAO_PROCEDURAL, id: ID_DA_CREMALHEIRA, versao: '1.0.0',
  parametros: Object.fromEntries([
    ...Array.from({ length: 4 }, (_, k) => [[`bx${k}`, 'numero'], [`bz${k}`, 'numero']]).flat(),
    ...Array.from({ length: PONTOS_DO_VAO }, (_, k) => [[`vx${k}`, 'numero'], [`vz${k}`, 'numero']]).flat(),
    ['largura', 'numero'], ['alturaDoVao', 'numero'], ['emVao', 'vetor3'], ['vaos', 'inteiro'], ['passo', 'vetor3'],
  ].map(([nome, tipo]) => [nome, { tipo }])),
  artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1', 'mecanifica.parte@1'] },
  nos: [
    { id: 'barra', operacao: 'extrusao', argumentos: { origemId: 10, perfil: Array.from({ length: 4 }, (_, k) => [p(`bx${k}`), p(`bz${k}`)]), altura: p('largura') } },
    { id: 'vao', operacao: 'extrusao', argumentos: { origemId: 20, perfil: Array.from({ length: PONTOS_DO_VAO }, (_, k) => [p(`vx${k}`), p(`vz${k}`)]), altura: p('alturaDoVao'), em: p('emVao') } },
    { id: 'vaos', operacao: 'arranja', argumentos: { modo: 'linear', total: p('vaos'), d: p('passo'), origemId: 21, derivaDe: VAO, sel: { origem: VAO } } },
    { id: 'dentes', operacao: 'subtrair', argumentos: { origemId: 30, solidos: [{ origem: { op: 'extrusao', id: 10 } }, { origem: VAO }, { origem: { op: 'arranja', id: 21, de: VAO } }] } },
    { id: 'parte-da-cremalheira', operacao: 'parte', argumentos: { nome: 'cremalheira', sel: { origem: { op: 'subtrair', id: 30 } } } },
  ],
})]);
