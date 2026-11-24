/* index.js — a família `engrenagem`: a engrenagem reta de dente evolvente pelo perfil de referência da ISO 53 e a catraca
   de dente de serra, com cubo e furo. `chamar(ENGRENAGEM, id, parametros)` devolve a engrenagem numa peça só, com a porta do eixo. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const ENGRENAGEM = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
