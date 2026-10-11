/* Fixture de teste: a família `tubo-de-prova` carregada (contrato, composições e `derivar`) e a receita que a chama. A
   receita é um objeto com `get CHAMADAS_COMPOSICOES`, porque um módulo ES não exporta getter: o teste passa o objeto a
   `executarReceita` como se fosse o módulo. */
import { readFileSync } from 'node:fs';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { chamar } from '../../../procedural/familias/index.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const TUBO_DE_PROVA = definirFamilia({
  contrato: JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8')),
  composicoes: COMPOSICOES,
  derivar,
});

export const receitaDoTubo = (parametros = {}) => ({
  get CHAMADAS_COMPOSICOES() { return [chamar(TUBO_DE_PROVA, 'corpo', parametros)]; },
  PARAMS: {},
  TOPO: {},
  ALIASES: [],
  MATERIAIS: { aco: { cor: '#8a929b', aspereza: 0.45, metalicidade: 0.8 } },
});
