/* configuracao-composicoes.mjs — o registro de composições que um comando recebe.
 *
 * Uma receita que compõe por `CHAMADAS_COMPOSICOES` só executa com um registro
 * de composições explícito (`procedural/nucleo/composicoes.js`). Os comandos
 * `descrever`, `varrer` e `esboco --envelope` o recebem por `--composicoes=<módulo>`,
 * e a API deles por `registroComposicoes` (mais `registroOperacoes` e
 * `orcamentoComposicoes`, quando a configuração os traz). Nenhum registro é
 * descoberto por varredura de pastas: quem chama aponta o módulo.
 *
 * O módulo de configuração exporta, em `default` ou em `configuracao`, um objeto
 * ou uma função (síncrona ou assíncrona, sem argumentos) que devolve
 * `{ registroComposicoes, registroOperacoes?, orcamentoComposicoes? }`. O mesmo
 * formato das configurações dos estudos de `tools/fixtures/`. */
import { importarReceita } from './importar-receita.mjs';
import { REPO, resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const OPCAO_COMPOSICOES = 'composicoes';

export class ErroDeConfiguracao extends Error {}

function ehRegistro(valor) {
  return valor && typeof valor === 'object' && typeof valor.resolver === 'function';
}

/** Valida o que uma configuração entrega e devolve só os campos conhecidos. */
export function validarConfiguracao(configuracao, rotulo = 'a configuração') {
  if (!configuracao || typeof configuracao !== 'object' || Array.isArray(configuracao)) {
    throw new ErroDeConfiguracao(`${rotulo} precisa devolver um objeto { registroComposicoes, registroOperacoes?, orcamentoComposicoes? }.`);
  }
  const { registroComposicoes, registroOperacoes, orcamentoComposicoes } = configuracao;
  if (!ehRegistro(registroComposicoes) || typeof registroComposicoes.assinatura !== 'string') {
    throw new ErroDeConfiguracao(`${rotulo} não traz registroComposicoes (o que criarRegistroComposicoes devolve).`);
  }
  if (registroOperacoes !== undefined && registroOperacoes !== null && !ehRegistro(registroOperacoes)) {
    throw new ErroDeConfiguracao(`${rotulo} traz registroOperacoes que não é um registro de operações.`);
  }
  const limpa = { registroComposicoes };
  if (registroOperacoes) limpa.registroOperacoes = registroOperacoes;
  if (orcamentoComposicoes) limpa.orcamentoComposicoes = orcamentoComposicoes;
  return limpa;
}

/** Carrega o módulo de configuração apontado por `alvo` (confinado ao repositório). */
export async function carregarConfiguracaoDeComposicoes(alvo) {
  if (typeof alvo !== 'string' || !alvo.trim()) {
    throw new ErroDeConfiguracao(`--${OPCAO_COMPOSICOES} veio vazio; aponte o módulo que exporta o registro de composições.`);
  }
  let caminho;
  try {
    caminho = resolverCaminhoReceita(alvo, { raiz: REPO });
  } catch (erro) {
    throw new ErroDeConfiguracao(`configuração de composições '${alvo}': ${erro.message}`);
  }
  let modulo;
  try {
    modulo = await importarReceita(caminho);
  } catch (erro) {
    throw new ErroDeConfiguracao(`configuração de composições '${alvo}' não carregou: ${erro.message}`);
  }
  const exportada = modulo.default ?? modulo.configuracao;
  if (exportada === undefined) {
    throw new ErroDeConfiguracao(`o módulo '${alvo}' não exporta a configuração (export default ou export const configuracao).`);
  }
  let configuracao;
  try {
    configuracao = typeof exportada === 'function' ? await exportada() : exportada;
  } catch (erro) {
    throw new ErroDeConfiguracao(`a configuração de composições '${alvo}' falhou ao montar o registro: ${erro.message}`);
  }
  return validarConfiguracao(configuracao, `a configuração '${alvo}'`);
}

/** Texto do que falta quando a receita compõe e nenhum registro foi entregue; `null` quando nada falta. */
export function faltaRegistroDeComposicoes(receita, registroComposicoes, quem = 'a receita') {
  if (!Array.isArray(receita?.CHAMADAS_COMPOSICOES) || registroComposicoes) return null;
  return `${quem} compõe por CHAMADAS_COMPOSICOES e falta o registro de composições.`
    + `\n  linha de comando: --${OPCAO_COMPOSICOES}=<módulo que exporta { registroComposicoes }>`
    + '\n  API: a opção registroComposicoes (e registroOperacoes, se as composições usam operações de extensão).';
}
