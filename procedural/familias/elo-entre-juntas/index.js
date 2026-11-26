/* index.js — a família `elo-entre-juntas`: a carenagem oca do membro de um robô, de uma flange de atuador de junta à outra, por
   seção (elíptica, redonda ou de cantos arredondados), cintura ou barriga, parede e furação de fixação das duas bocas.
   `parametrosDoElo` (em `tabela.js`) dá os parâmetros pelas duas flanges que o elo liga. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const ELO_ENTRE_JUNTAS = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
