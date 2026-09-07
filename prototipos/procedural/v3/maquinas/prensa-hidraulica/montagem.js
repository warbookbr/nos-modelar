/* montagem.js — montagem integrada da prensa hidráulica industrial H-frame com unidade de potência. */
import { receitaEstrutura } from './estrutura.js';
import { receitaCinematico } from './cinematico.js';
import { receitaFerramentas } from './ferramentas.js';

export const receitaPrensaHidraulica = {
  meta: {
    nome: 'Prensa Hidráulica H-Frame Industrial',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural AI',
    categoria: 'maquinas-industriais',
    descricao: 'Prensa hidráulica tipo H-frame com cilindro superior, mesa ajustável, unidade de potência lateral e manômetro.',
  },
  PARAMS: {
    ...receitaEstrutura.PARAMS,
    ...receitaCinematico.PARAMS,
    ...receitaFerramentas.PARAMS,
  },
  MATERIAIS: {
    ...receitaEstrutura.MATERIAIS,
    ...receitaCinematico.MATERIAIS,
    ...receitaFerramentas.MATERIAIS,
  },
  ALIASES: [
    ...(receitaEstrutura.ALIASES ?? []),
    ...(receitaCinematico.ALIASES ?? []),
    ...(receitaFerramentas.ALIASES ?? []),
  ],
  PASSOS: [
    ...receitaEstrutura.PASSOS,
    ...receitaCinematico.PASSOS,
    ...receitaFerramentas.PASSOS,
  ],
};

export default receitaPrensaHidraulica;
