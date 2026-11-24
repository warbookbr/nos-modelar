/* index.js — a família `fuso`: o fuso trapezoidal (ISO 2904) e o de esferas (ISO 3408-2, só o volume de fora), com a
   castanha flangeada numa posição ao longo dele. A tabela está em `tabela.js`, e `parametrosDoFuso` dá os parâmetros pelo nome. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const FUSO = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
