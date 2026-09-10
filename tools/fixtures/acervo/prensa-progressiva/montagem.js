/* montagem.js — montagem integrada da prensa mecânica com estampo progressivo. */
import { receitaEstrutura } from './estrutura.js';
import { receitaCinematico } from './cinematico.js';
import { receitaFerramentas } from './ferramentas.js';

export const receitaPrensaCompleta = {
  meta: {
    nome: 'Prensa Mecânica com Estampo Progressivo 4 Estágios',
    versao: '1.0.0',
    autor: 'Mecanifica Procedural',
    categoria: 'maquinas-industriais',
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
