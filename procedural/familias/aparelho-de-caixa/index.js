/* index.js — a família `aparelho-de-caixa` carregada: o contrato `familia.json`, as composições e o `derivar`.

   Eletrodoméstico e eletrônico de caixa com uma frente: corpo chanfrado, porta com visor de vidro recuado, painel de comando
   à direita ou em cima com botões giratórios e de pressão, puxador e pés curtos. Uma peça só, com as partes nomeadas. Sem
   materiais, sem cor e sem parafuso: o contrato não os declara. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const CONTRATO_DO_APARELHO_DE_CAIXA = contratoJson;

export const APARELHO_DE_CAIXA = Object.freeze(definirFamilia({ contrato: CONTRATO_DO_APARELHO_DE_CAIXA, composicoes: COMPOSICOES, derivar }));
