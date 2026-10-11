/* Configuração explícita do registro de composições da fixture: é o que
   `--composicoes=tools/fixtures/composicao-parametrica/configuracao.mjs` aponta. */
import {
  REGISTRO_OPERACOES,
  criarRegistroComposicoes,
} from '../../../procedural/nucleo/entrada.js';
import { COMPOSICOES } from './composicoes.js';

export function criarConfiguracao() {
  return {
    registroOperacoes: REGISTRO_OPERACOES,
    registroComposicoes: criarRegistroComposicoes({
      composicoes: COMPOSICOES,
      resolverOperacao: REGISTRO_OPERACOES.resolver,
    }),
  };
}

export default criarConfiguracao;
