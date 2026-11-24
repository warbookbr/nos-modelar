/* index.js — a família `guia-linear`: o trilho de perfil com a furação e o carro de esferas montado sobre ele, por tamanho
   (15, 20, 25 e 30). A tabela está em `tabela.js`, e `parametrosDaGuia` dá os parâmetros pelo tamanho. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const GUIA_LINEAR = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
