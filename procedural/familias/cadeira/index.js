/* index.js — a família `cadeira` carregada: o contrato `familia.json`, as composições e o `derivar`.

   Cadeira de encosto alto: assento (placa ou tábuas), quatro pernas, postes opcionais, saia e travessão opcionais, e um encosto de
   ripas (ou de uma tábua larga) com travessas em cima e embaixo. Uma peça só, com as partes nomeadas (assento, perna-frente-esq,
   poste-esq, ripa-1, travessa-alta...) para que um material possa ser ligado a cada uma depois. Sem materiais, sem cor e sem
   parafuso: o contrato não os declara. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const CONTRATO_DA_CADEIRA = contratoJson;

export const CADEIRA = Object.freeze(definirFamilia({ contrato: CONTRATO_DA_CADEIRA, composicoes: COMPOSICOES, derivar }));
