/* chave-do-prefixo.js — a chave encadeada do prefixo de passos, para o cache por prefixo (plano do cache por passo, fatia 3).
 *
 * `chaves[k]` vale para o contexto e os passos 0 a k: um hash encadeado, na ordem, da serialização exata de cada um. A serialização é a
 * de `chaveExata` (`memoria-de-pura.js`: o zero negativo, o NaN, o infinito e o valor indefinido saem distintos, e dado que não é simples
 * desliga a chave) com mais uma distinção: o BURACO de uma lista (`[0, , 0]`) sai diferente do valor indefinido (`[0, undefined, 0]`),
 * porque o núcleo trata os dois de jeitos diferentes (o buraco é pulado, o indefinido é recusado), e a lista com propriedade fora dos
 * índices desliga a chave. Devolve null quando o contexto ou um passo não se serializa. */
import { sha256Hex } from '../sha256.js';

const NAO_SERIALIZAVEL = Symbol('nao-serializavel');
/* o lugar do buraco na cópia da lista; o substituto o escreve como '\u0000h', que nenhum texto da receita pode ser */
const BURACO = Object.freeze({});

function substituir(chave, valor) {
  if (valor === BURACO) return '\u0000h';
  if (valor === undefined) return '\u0000u';
  if (typeof valor === 'number') {
    if (Object.is(valor, -0)) return '\u0000n:-0';
    if (!Number.isFinite(valor)) return `\u0000n:${valor}`;
    return valor;
  }
  if (typeof valor === 'function' || typeof valor === 'symbol' || typeof valor === 'bigint') throw NAO_SERIALIZAVEL;
  if (typeof valor === 'string' && valor.startsWith('\u0000')) throw NAO_SERIALIZAVEL;
  if (Array.isArray(valor)) {
    const proprias = Reflect.ownKeys(valor);
    if (proprias.length !== valor.length + 1) {
      /* um buraco faz faltar um índice; uma propriedade fora dos índices (ou um símbolo) sobra */
      if (proprias.some((k) => k !== 'length' && !(typeof k === 'string' && String(Number(k)) === k && Number(k) < valor.length))) throw NAO_SERIALIZAVEL;
      return Array.from({ length: valor.length }, (_, k) => (Object.hasOwn(valor, k) ? valor[k] : BURACO));
    }
    return valor;
  }
  if (valor && typeof valor === 'object') {
    const proto = Object.getPrototypeOf(valor);
    if ((proto !== Object.prototype && proto !== null) || typeof valor.toJSON === 'function') throw NAO_SERIALIZAVEL;
  }
  return valor;
}

/** A serialização exata de um valor, ou null quando ele não é dado simples. */
export function chaveExataDoPasso(valor) {
  try { return JSON.stringify(valor, substituir); } catch (erro) { if (erro === NAO_SERIALIZAVEL) return null; throw erro; }
}

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
