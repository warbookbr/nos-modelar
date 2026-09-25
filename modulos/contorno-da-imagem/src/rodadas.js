/* rodadas.js — a conversa entre o desenhador e o crítico, com limite.
 *
 * O desenhador põe as sementes e gera o pacote; o crítico, sem saber como as
 * sementes foram postas, compara o pacote com a imagem e dá nota de 0 a 10.
 * Nota 9 ou mais fecha. Abaixo disso os defeitos voltam ao desenhador, até
 * três rodadas; depois da terceira sem nota 9 a decisão é da pessoa. Cada
 * rodada guarda as sementes que foram julgadas, para a seguinte não repetir
 * tentativa. */
export const NOTA_MINIMA = 9;
export const LIMITE_DE_RODADAS = 3;

export function validarRodada(rodada) {
  if (!rodada || typeof rodada !== 'object') throw new Error('a rodada é um objeto.');
  if (!Number.isInteger(rodada.numero) || rodada.numero < 1) throw new Error("'numero' é inteiro a partir de 1.");
  if (!rodada.regioes || typeof rodada.regioes !== 'object') throw new Error("'regioes' guarda as sementes julgadas.");
  const { veredito } = rodada;
  if (!veredito || typeof veredito.nota !== 'number' || veredito.nota < 0 || veredito.nota > 10) throw new Error("'veredito.nota' é número de 0 a 10.");
  if (!Array.isArray(veredito.defeitos)) throw new Error("'veredito.defeitos' é lista, vazia quando não há defeito.");
  if (veredito.nota < NOTA_MINIMA && !veredito.defeitos.length) throw new Error(`nota abaixo de ${NOTA_MINIMA} sem defeito apontado não diz ao desenhador o que corrigir.`);
  return rodada;
}

export function proximaAcao(rodadas) {
  if (!rodadas.length) return { acao: 'desenhar', motivo: 'nenhuma rodada ainda.' };
  const ultima = rodadas.at(-1);
  if (ultima.veredito.nota >= NOTA_MINIMA) return { acao: 'fechou', motivo: `nota ${ultima.veredito.nota} na rodada ${ultima.numero}.` };
  if (rodadas.length >= LIMITE_DE_RODADAS) return { acao: 'humano', motivo: `${rodadas.length} rodadas sem nota ${NOTA_MINIMA}; a decisão é da pessoa.` };
  return { acao: 'desenhar', motivo: `nota ${ultima.veredito.nota} na rodada ${ultima.numero}.`, defeitos: ultima.veredito.defeitos };
}
