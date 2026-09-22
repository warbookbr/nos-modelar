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
export function registrarRodada({ peca, numero, veredito, medidas, partes, atrito = [] }) {
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
    /* A CONFERÊNCIA PARTE POR PARTE, do modelador. O contrato dele manda gerar
       as vistas e responder, por parte, se a forma e a técnica entregues são as
       que o `PLANO` promete. A instrução existia e nada conferia que alguém
       tinha olhado: entregar sem ter olhado produzia uma rodada idêntica à de
       quem olhou. Instrumento que nenhum gate exercita volta a ser conselho, e
       conselho cede sob pressão de terminar.

       Lista com uma entrada por parte declarada. `confere` falso é resposta
       legítima e pede `observacao` dizendo onde a entrega difere da promessa. */
    partes: normalizarConferenciaDePartes(partes),
    /* O ATRITO DA RODADA: operação que faltou no motor, coisa que só saiu
       porque alguém fez à mão, medida que não existia, documento errado. A
       skill do laço mandava registrar isso e não havia campo onde cair, então
       a lista vivia na conversa e morria com ela. Lista de frases curtas, e
       vazia quando a rodada não doeu em nada. */
    atrito: normalizarAtrito(atrito),
  };
}

const LIMITE_OBSERVACAO_DE_PARTE = 240;

function normalizarConferenciaDePartes(valor) {
  if (valor === undefined || valor === null) {
    falhar("a rodada precisa trazer 'partes': uma entrada por parte declarada, dizendo se a forma"
      + ' e a técnica entregues são as que o PLANO promete. Rode `npm run vistas:critica` e olhe'
      + ' antes de responder.');
  }
  if (!Array.isArray(valor)) falhar("'partes' precisa ser lista.");
  if (valor.length === 0) falhar("'partes' vazia não é conferência; a peça tem partes declaradas.");
  return Object.freeze(valor.map((item, indice) => {
    if (!item || typeof item !== 'object') falhar(`'partes[${indice}]' precisa ser objeto.`);
    const nome = String(item.nome ?? '').trim();
    if (nome === '') falhar(`'partes[${indice}].nome' precisa nomear a parte do PLANO.`);
    if (typeof item.confere !== 'boolean') {
      falhar(`'partes[${indice}].confere' precisa ser booleano: a entrega bate com a promessa ou não.`);
    }
    const observacao = String(item.observacao ?? '').trim();
    if (!item.confere && observacao === '') {
      falhar(`'partes[${indice}]' não confere e não diz onde: escreva a diferença em 'observacao'.`);
    }
    if (observacao.length > LIMITE_OBSERVACAO_DE_PARTE) {
      falhar(`'partes[${indice}].observacao' não passa de ${LIMITE_OBSERVACAO_DE_PARTE} caracteres.`);
    }
    return Object.freeze({ nome, confere: item.confere, observacao });
  }));
}

const LIMITE_ATRITO = 16;
const LIMITE_FRASE_DE_ATRITO = 240;

function normalizarAtrito(valor) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) falhar("'atrito' precisa ser lista de frases.");
  if (valor.length > LIMITE_ATRITO) falhar(`'atrito' não passa de ${LIMITE_ATRITO} itens.`);
  return valor.map((item, i) => {
    if (typeof item !== 'string' || item.trim() === '') falhar(`'atrito[${i}]' precisa ser texto não vazio.`);
    const limpo = item.trim();
    if (limpo.length > LIMITE_FRASE_DE_ATRITO) falhar(`'atrito[${i}]' excede ${LIMITE_FRASE_DE_ATRITO} caracteres.`);
    return limpo;
  });
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
