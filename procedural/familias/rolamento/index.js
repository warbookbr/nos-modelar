/* index.js — a família `rolamento`: o rolamento rígido de esferas das séries 60 e 62, aberto, vedado ou alojado no mancal
   de pedestal. A tabela está em `tabela.js`, e `parametrosDoRolamento` dá os parâmetros pela designação. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const ROLAMENTO = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
