/* index.js — a família `roupeiro` carregada: o contrato `familia.json`, as composições, o `derivar` e o gerador da montagem
   v5. A família é o objeto de `definirFamilia` com mais uma chave, `montar(parametros)`, que a aprovação mecânica usa para
   conferir o curso de cada porta; quem só chama a família por `chamar` recebe o corpo e as portas fechadas numa peça só. */
import { readFileSync } from 'node:fs';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';
import { montarRoupeiro } from './montagem.js';

export const CONTRATO_DO_ROUPEIRO = JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8'));

const definida = definirFamilia({ contrato: CONTRATO_DO_ROUPEIRO, composicoes: COMPOSICOES, derivar });

export const ROUPEIRO = Object.freeze({
  ...definida,
  montar: (parametros = {}) => montarRoupeiro(definida, parametros),
});
