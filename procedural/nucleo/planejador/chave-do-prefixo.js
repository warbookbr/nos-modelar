/* chave-do-prefixo.js — a chave encadeada do prefixo de passos, para o cache por prefixo (plano do cache por passo, fatia 3).
 *
 * `chaves[k]` vale para o contexto e os passos 0 a k: um hash encadeado, na ordem, da serialização exata de cada um. A serialização é a
 * de `chaveExata` (`memoria-de-pura.js`): o zero negativo, o NaN, o infinito e o valor indefinido saem distintos, o BURACO de uma lista
 * (`[0, , 0]`) sai diferente do valor indefinido (`[0, undefined, 0]`), porque o núcleo trata os dois de jeitos diferentes (o buraco é
 * pulado, o indefinido é recusado), e dado que não é simples, ou lista com propriedade fora dos índices, desliga a chave. Devolve null
 * quando o contexto ou um passo não se serializa. */
import { sha256Hex } from '../sha256.js';
import { chaveExata } from '../memoria-de-pura.js';

/** A serialização exata de um valor, ou null quando ele não é dado simples (é a de `chaveExata`, que distingue o buraco). */
export function chaveExataDoPasso(valor) { return chaveExata(valor); }

/** As chaves encadeadas dos prefixos: `chaves[k]` vale para os passos 0 a k. Devolve null se o contexto ou um passo não se serializa. */
export function chavesDosPrefixos(contexto, passos) {
  const base = chaveExataDoPasso(contexto);
  if (base === null || base === undefined) return null;
  let cadeia = sha256Hex(base);
  const chaves = new Array(passos.length);
  for (let k = 0; k < passos.length; k += 1) {
    const texto = chaveExataDoPasso(passos[k]);
    if (texto === null || texto === undefined) return null;
    cadeia = sha256Hex(`${cadeia}\n${texto}`);
    chaves[k] = cadeia;
  }
  return chaves;
}
