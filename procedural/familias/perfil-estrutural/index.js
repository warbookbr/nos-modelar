/* index.js — a família `perfil-estrutural`: o perfil I e H (IPE, HE A), o U (UPN) e o alumínio ranhurado, reto ou com
   corte a 45° nas pontas. A tabela de norma está em `tabela.js`, e `parametrosDoPerfil` dá os parâmetros pelo nome. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const PERFIL_ESTRUTURAL = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
