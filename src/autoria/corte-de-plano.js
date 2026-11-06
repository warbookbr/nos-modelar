/* corte-de-plano.js — a vista de corte da bancada: um plano perpendicular a um eixo (x, y ou z), numa posição em milímetro
 * do referencial da peça. O lado escolhido fica translúcido e o outro lado fica normal e inteiro, para ler pela vista o
 * que está dentro e na frente. Sem Three: a CLI e a interface usam as mesmas regras de leitura e as mesmas mensagens. */

export const EIXOS_DO_CORTE = Object.freeze(['x', 'y', 'z']);
export const LADOS_DO_CORTE = Object.freeze(['mais', 'menos']);
export const OPACIDADE_DO_CORTE = 0.15;

/** Lê `eixo:posição` (por exemplo `z:0` ou `x:-120.5`) e devolve `{ eixo, posicao }`; recusa com uma Error de mensagem clara. */
export function lerCorte(texto) {
  const bruto = String(texto ?? '').trim();
  const casa = /^([^:]*):(.*)$/.exec(bruto);
  if (!casa) throw new Error(`--corte pede <eixo>:<posição em mm>, por exemplo z:0; veio "${bruto}".`);
  const eixo = casa[1].trim().toLowerCase();
  if (!EIXOS_DO_CORTE.includes(eixo)) throw new Error(`--corte: o eixo "${casa[1].trim()}" não existe; use ${EIXOS_DO_CORTE.join(', ')}.`);
  const numero = casa[2].trim();
  const posicao = numero === '' ? Number.NaN : Number(numero);
  if (!Number.isFinite(posicao)) throw new Error(`--corte: a posição "${numero}" não é um número em milímetros.`);
  return { eixo, posicao };
}

/** Confere o lado translúcido (`mais` ou `menos` do eixo); sem valor, é `mais`. */
export function lerLadoDoCorte(texto) {
  if (texto === undefined || texto === null || texto === '') return 'mais';
  const lado = String(texto).trim().toLowerCase();
  if (!LADOS_DO_CORTE.includes(lado)) throw new Error(`--corte-lado: "${texto}" não vale; use ${LADOS_DO_CORTE.join(' ou ')} (o lado do eixo que fica translúcido).`);
  return lado;
}

/** Normaliza o pedido de corte da ponte e da interface: `null` desliga. */
export function normalizarCorte(corte) {
  if (corte === null || corte === undefined || corte === false) return null;
  const { eixo, posicao } = lerCorte(`${corte.eixo}:${corte.posicao}`);
  return { eixo, posicao, lado: lerLadoDoCorte(corte.lado) };
}
