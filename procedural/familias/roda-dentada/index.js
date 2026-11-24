/* index.js — a família `roda-dentada`: a roda dentada simples de corrente de rolos com a forma de dente da ISO 606, série
   B europeia (06B a 16B), com o cubo e o furo. A tabela está em `tabela.js`, e `parametrosDaRoda` dá os parâmetros pela
   corrente e o número de dentes. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const RODA_DENTADA = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
