/* index.js — a família `gabinete`: a caixa de equipamento de plástico, partida em base e tampa, com o encaixe entre as
   duas e os ressaltos para parafuso. A geometria está em `geometria.js`. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const GABINETE = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
