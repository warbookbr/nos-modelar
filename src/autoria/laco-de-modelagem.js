/* laco-de-modelagem.js — quem decide se a modelagem continua, e por quê.
 *
 * A decisão de parar não pode ser de quem modelou. Enquanto ela for, "está bom"
 * é a resposta mais barata disponível no fim de uma tarefa longa, e foi assim
 * que uma prancha torta virou "está reta, seguindo a linha corretamente". Aqui
 * a decisão sai de três números: quantos defeitos o revisor apontou, qual nota
 * ele deu, e quantas rodadas já se passaram.
 *
 * A REGRA DA NÃO CONVERGÊNCIA existe porque laço que não fecha é pior do que
 * laço que reprova. Se o número de defeitos não cai por três rodadas seguidas,
 * o problema deixou de ser a geometria: ou o plano pede algo que a técnica
 * escolhida não faz, ou o revisor está apontando coisas diferentes a cada vez.
 * Continuar aí gasta rodada e ensina que o veredito é ruído.
 *
 * O REGISTRO É PARTE DO RESULTADO, e não um relatório. Cada rodada guarda o
 * veredito que a motivou e as medidas que rodaram, para que a pergunta "por que
 * esta peça está assim" tenha resposta depois que todo mundo esqueceu. */

import { normalizarVeredito, rodadaFechou } from './veredito-de-forma.js';

export const FORMATO_RODADA = 'mecanifica.rodada-de-modelagem';
export const VERSAO_RODADA = 1;

export const LIMITE_DE_RODADAS = 6;
export const RODADAS_SEM_PROGRESSO = 3;

export const ACOES = Object.freeze([
  'modelar', 'revisar', 'parar-fechou', 'parar-limite', 'parar-sem-convergencia',
]);

function falhar(mensagem) { throw new TypeError(`laço de modelagem: ${mensagem}`); }

/**
 * Uma rodada registrada: o que o revisor apontou e o que as medidas disseram.
 * `medidas` é o resultado objetivo — a guarda do acervo passou ou não —, e ele
 * vem antes do veredito de propósito: peça que nem cumpre o plano não merece
 * olho humano nem de agente.
 */
export function registrarRodada({ peca, numero, veredito, medidas }) {
  if (typeof peca !== 'string' || peca.trim() === '') falhar('a rodada precisa dizer de que peça é.');
  if (!Number.isInteger(numero) || numero < 1) falhar('o número da rodada começa em 1.');
  if (!medidas || typeof medidas !== 'object') falhar("a rodada precisa trazer 'medidas'.");
  if (typeof medidas.passou !== 'boolean') falhar("'medidas.passou' precisa ser booleano.");

  return {
    formato: FORMATO_RODADA,
    versao: VERSAO_RODADA,
    peca: peca.trim(),
    numero,
    medidas: { passou: medidas.passou, relatorio: String(medidas.relatorio ?? '').trim() },
    /* Sem veredito quando as medidas reprovaram: não se gasta revisão em peça
       que já falhou no que é contável. */
    veredito: veredito ? normalizarVeredito(veredito) : null,
  };
}

/**
 * O que fazer agora, dada a história da peça. Devolve a ação e o motivo em
 * texto, porque parada sem motivo escrito vira "achei que estava bom".
 */
export function proximaAcao(rodadas, { limite = LIMITE_DE_RODADAS, notaMinima = 8 } = {}) {
  if (!Array.isArray(rodadas)) falhar('a história da peça é uma lista de rodadas.');
  if (rodadas.length === 0) return { acao: 'modelar', motivo: 'nenhuma rodada ainda: a peça não existe.' };

  const ultima = rodadas[rodadas.length - 1];
  if (!ultima.medidas.passou) {
    return {
      acao: 'modelar',
      motivo: `as medidas reprovaram na rodada ${ultima.numero}; revisar antes de cumprir o plano é gastar rodada.`,
    };
  }
  if (!ultima.veredito) {
    return { acao: 'revisar', motivo: `a rodada ${ultima.numero} passou nas medidas e ainda não foi julgada.` };
  }

  const { fechou, nota, defeitos } = rodadaFechou(ultima.veredito, { notaMinima });
  if (fechou) {
    return { acao: 'parar-fechou', motivo: `sem defeitos apontados e nota ${nota} na rodada ${ultima.numero}.` };
  }

  const julgadas = rodadas.filter((r) => r.veredito);
  if (julgadas.length >= RODADAS_SEM_PROGRESSO) {
    const ultimas = julgadas.slice(-RODADAS_SEM_PROGRESSO).map((r) => r.veredito.defeitos.length);
    const caiuAlgumaVez = ultimas.some((quantos, i) => i > 0 && quantos < ultimas[i - 1]);
    if (!caiuAlgumaVez) {
      return {
        acao: 'parar-sem-convergencia',
        motivo: `os defeitos não caíram em ${RODADAS_SEM_PROGRESSO} rodadas julgadas (${ultimas.join(', ')}); `
          + 'ou o plano pede o que a técnica não faz, ou o revisor está apontando outra coisa a cada vez.',
      };
    }
  }

  if (rodadas.length >= limite) {
    return {
      acao: 'parar-limite',
      motivo: `${rodadas.length} rodadas com ${defeitos} defeito(s) em aberto; o limite combinado é ${limite}.`,
    };
  }

  return { acao: 'modelar', motivo: `${defeitos} defeito(s) apontado(s) na rodada ${ultima.numero}.` };
}

/** Os defeitos que a rodada seguinte precisa corrigir, e nada além disso. */
export function defeitosAbertos(rodadas) {
  const julgadas = (rodadas ?? []).filter((r) => r.veredito);
  return julgadas.length ? julgadas[julgadas.length - 1].veredito.defeitos : [];
}
