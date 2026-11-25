/* index.js — a família `atuador-de-junta`: o atuador cilíndrico de junta de robô (carcaça com motor e redutor como volume,
   flange de fixação atrás, flange de saída que gira na frente, furações e saída do cabo), por diâmetro, na forma 1; e o
   atuador de caixa (o servo, com orelhas de fixação e horn), na forma 2. `parametrosDoAtuador` (em `tabela.js`) dá os
   parâmetros pelo diâmetro, e `parametrosDoServo` (em `servo.js`) pelo tamanho do servo. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { COMPOSICOES } from './composicoes.js';
import { derivar } from './derivar.js';

export const ATUADOR_DE_JUNTA = definirFamilia({ contrato: contratoJson, composicoes: COMPOSICOES, derivar });
