/* montagem.js — montagem integrada da prensa mecanica industrial realista de 4 colunas com estampo progressivo. */
import { receitaEstrutura } from './estrutura.js';
import { receitaCinematico } from './cinematico.js';
import { receitaFerramentas } from './ferramentas.js';

export const receitaPrensaIndustrialCompleta = {
  meta: {
    nome: 'Prensa Mecânica Industrial 4 Colunas',
    versao: '2.0.0',
    autor: 'Mecanifica Procedural AI',
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

export default receitaPrensaIndustrialCompleta;
