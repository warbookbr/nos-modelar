/* Fixture de teste: a família `roda-com-esboco` carregada (contrato, composição e `derivar`). `criarRodaDeProva` a monta com
   o contrato escrito em `familia.json` ou com um contrato alterado, e com um defeito de `derivar.js` quando o teste precisa
   de uma família que não bate com o esboço. */
import { readFileSync } from 'node:fs';
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { criarDerivar } from './derivar.js';

export const CONTRATO_DA_RODA = JSON.parse(readFileSync(new URL('./familia.json', import.meta.url), 'utf8'));

export const criarRodaDeProva = ({ contrato = CONTRATO_DA_RODA, defeito = {} } = {}) => definirFamilia({
  contrato, composicoes: COMPOSICOES, derivar: criarDerivar(defeito),
});

export const RODA_COM_ESBOCO = criarRodaDeProva();
