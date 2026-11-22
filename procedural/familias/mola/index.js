/* index.js — a família `mola`: mola de compressão, de tração com ganchos e de torção com braços, varrida ao longo do
   caminho helicoidal do núcleo. `chamar(MOLA, id, parametros)` devolve a mola numa peça só. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const MOLA = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
