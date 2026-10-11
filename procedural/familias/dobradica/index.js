/* index.js — a família `dobradica` carregada: o contrato `familia.json`, as composições, o `derivar` e o gerador da
   montagem v5. A família é o objeto de `definirFamilia` com mais uma chave, `montar(parametros)`, que a aprovação
   mecânica usa para conferir o curso da articulação; quem só chama a família por `chamar` não precisa dela. */
import { readFileSync } from 'node:fs';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';
import { montarDobradica } from './montagem.js';

export const CONTRATO_DA_DOBRADICA = JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8'));

const definida = definirFamilia({ contrato: CONTRATO_DA_DOBRADICA, composicoes: COMPOSICOES, derivar });

export const DOBRADICA = Object.freeze({
  ...definida,
  montar: (parametros = {}) => montarDobradica(definida, parametros),
});
