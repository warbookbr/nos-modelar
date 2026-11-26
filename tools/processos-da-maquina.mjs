/* processos-da-maquina.mjs — quantas execuções as ferramentas que percorrem o acervo (a guarda do acervo, a aprovação da família e as
 * baterias de teste) rodam ao mesmo tempo. Antes era um teto fixo de quatro, o da máquina de desenvolvimento e do CI (quatro núcleos e
 * 16 GB), e uma máquina maior ficava com os núcleos parados. Agora é o menor entre os núcleos e a memória total dividida pelo pico de uma
 * execução pesada: a lataria do carro passa de 3 GB (banco de provas da execução paralela, 2026-11-26), e a máquina já reiniciou por falta
 * de memória com duas execuções pesadas lado a lado. Com quatro núcleos e 16 GB (15,7 GiB informados) o resultado continua quatro.
 *
 * `MODELAR_PROCESSOS=<n>` no ambiente escolhe o número à mão, para mais ou para menos; o valor que não é inteiro positivo é recusado
 * com a causa. */
import { availableParallelism, totalmem } from 'node:os';
import { doAmbiente } from './ambiente.mjs';

/** O pico de memória de uma execução pesada que a conta reserva por processo, em GiB: os 3 GB da lataria do carro com folga, e abaixo
 *  de 4 porque a máquina de 16 GB informa 15,7 GiB ao sistema, e com 4 a conta dava três processos. */
export const MEMORIA_POR_PROCESSO_GB = 3.5;

/** O número de processos: o pedido em `MODELAR_PROCESSOS` ou o menor entre núcleos e memória, nunca abaixo de um. */
export function processosDaMaquina({ ambiente = process.env, nucleos = availableParallelism(), memoriaBytes = totalmem(), memoriaPorProcessoGB = MEMORIA_POR_PROCESSO_GB } = {}) {
  const pedido = doAmbiente('PROCESSOS', ambiente);
  if (pedido !== undefined && pedido !== '') {
    const n = Number(pedido);
    if (!Number.isInteger(n) || n < 1) throw new Error(`MODELAR_PROCESSOS='${pedido}' não é um número inteiro de processos; esperado um inteiro maior que zero, como MODELAR_PROCESSOS=4, ou a variável vazia para a conta pelos núcleos e pela memória da máquina.`);
    return n;
  }
  const pelaMemoria = Math.floor(memoriaBytes / (memoriaPorProcessoGB * 1024 ** 3));
  return Math.max(1, Math.min(nucleos, pelaMemoria));
}
