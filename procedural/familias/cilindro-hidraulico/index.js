/* index.js — a família `cilindro-hidraulico`: atuador linear de dupla ação, camisa de casca nativa e haste ligada a ela por
   uma articulação prismática, com a montagem v5 gerada pela família.

   `CILINDRO_HIDRAULICO` é a família carregada por `definirFamilia` (contrato `familia.json`, as composições e o
   `derivar`) mais `montar(parametros)`, que devolve a montagem v5 com a camisa e a haste e o necessário para conferir o
   curso. `chamar(CILINDRO_HIDRAULICO, id, parametros)` devolve o conjunto recolhido numa peça só. */
import { readFileSync } from 'node:fs';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';
import { montarCilindro } from './montagem.js';

const contrato = JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8'));
const base = definirFamilia({ contrato, composicoes: COMPOSICOES, derivar });

export const CILINDRO_HIDRAULICO = Object.freeze({ ...base, montar: (parametros) => montarCilindro(base, parametros) });
