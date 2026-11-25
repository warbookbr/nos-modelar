/* index.js — a família `esteira`: a esteira de sapatas de aço em volta da roda motriz (com o dente da roda dentada da
   ISO 606) e da roda guia, com os roletes por baixo, por passo. A tabela está em `tabela.js`, e `parametrosDaEsteira` dá
   os parâmetros pelo passo, com a distância e os roletes. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const ESTEIRA = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
