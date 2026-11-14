/* memoria-de-execucao.js — guarda o estado do núcleo depois de certos passos, para a receita que muda só um passo adiante não
 * refazer os que vêm antes.
 *
 * Medido em 2026-11-13: a carroceria do sedã leva 171 s, com 15 aparos entre os passos 119 e 218, e um ajuste depois deles
 * refazia tudo. O estado depois do passo k depende só dos passos 0 a k e do que o rodeia (PARAMS, TOPO, MATERIAIS, ESQUELETO,
 * ALIASES, o registro de operações, o modo do retrato e as declarações de origem, que o núcleo lê da lista inteira). A chave de
 * cada ponto é um hash encadeado, na ordem, da serialização EXATA (a mesma de `memoria-de-pura.js`: o zero negativo, o NaN e o
 * valor indefinido saem distintos) do contexto e de cada passo; um passo mudado muda a chave dele e a de todos os seguintes, e
 * nenhuma outra. Dado que não se serializa (função, Map, classe) desliga a memória para a execução, que roda como sempre.
 *
 * A memória nunca muda o resultado: o estado guardado é uma CÓPIA (`structuredClone`, que preserva a ordem dos Maps, o zero
 * negativo e o NaN) e sai copiado de novo na restauração, de modo que o passo seguinte não altera o guardado. A prova é a
 * comparação bit a bit do neutro de uma execução com memória contra a de uma sem memória. Estado que a cópia não aguenta
 * (função, símbolo) também desliga a memória para aquela execução. Um passo que gritou não vira ponto. */
import { sha256Hex } from './sha256.js';
import { chaveExata } from './memoria-de-pura.js';

/** A memória de uma ou mais execuções: no máximo `maximo` pontos, os mais recentemente guardados ou usados. */
export function criarMemoriaDeExecucao({ maximo = 4 } = {}) {
  const pontos = new Map();   // chave do prefixo -> { passo, estado }
  const estatisticas = { guardados: 0, restaurados: 0, recusados: 0 };
  return {
    estatisticas,
    /** As chaves dos prefixos da execução anterior: o núcleo as compara com as da atual para achar onde divergem. */
    ultimaCadeia: null,
    get tamanho() { return pontos.size; },
    limpar() { pontos.clear(); },
    /** @returns {{ passo: number, estado: object } | null} o ponto guardado para a chave, ou null. */
    buscar(chave) {
      const ponto = pontos.get(chave);
      if (!ponto) return null;
      pontos.delete(chave); pontos.set(chave, ponto);
      return ponto;
    },
    guardar(chave, passo, estado) {
      pontos.delete(chave);
      pontos.set(chave, { passo, estado });
      estatisticas.guardados += 1;
      while (pontos.size > maximo) pontos.delete(pontos.keys().next().value);
    },
  };
}

/** As chaves encadeadas dos prefixos: `chaves[k]` vale para os passos 0 a k. Devolve null se o contexto ou um passo não se serializa. */
export function chavesDosPrefixos(contexto, passos) {
  const base = chaveExata(contexto);
  if (base === null || base === undefined) return null;
  let cadeia = sha256Hex(base);
  const chaves = new Array(passos.length);
  for (let k = 0; k < passos.length; k += 1) {
    const texto = chaveExata(passos[k]);
    if (texto === null || texto === undefined) return null;
    cadeia = sha256Hex(`${cadeia}\n${texto}`);
    chaves[k] = cadeia;
  }
  return chaves;
}

/** O estado do passo como cópia independente, ou null quando não se copia. */
export function copiarEstado(estado) {
  try { return structuredClone(estado); } catch { return null; }
}
