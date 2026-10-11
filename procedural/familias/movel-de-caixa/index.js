/* index.js — a família `movel-de-caixa` carregada: o contrato `familia.json`, as composições, o `derivar` e o gerador da
   montagem v5. A família é o objeto de `definirFamilia` com mais uma chave, `montar(parametros)`, que a aprovação mecânica usa
   para conferir o curso de cada porta e de cada gaveta; quem só chama a família por `chamar` recebe o corpo, as portas e as
   gavetas fechadas numa peça só. O perfil `roupeiro` é o roupeiro de portas de abrir embutidas que a família tinha antes de
   ganhar gavetas, portas sobrepostas, pés e vão aberto. */
import { readFileSync } from 'node:fs';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';
import { montarMovel } from './montagem.js';

export const CONTRATO_DO_MOVEL_DE_CAIXA = JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8'));

const definida = definirFamilia({ contrato: CONTRATO_DO_MOVEL_DE_CAIXA, composicoes: COMPOSICOES, derivar });

export const MOVEL_DE_CAIXA = Object.freeze({
  ...definida,
  montar: (parametros = {}) => montarMovel(definida, parametros),
});
