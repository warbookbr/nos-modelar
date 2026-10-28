/* memoria-de-pura.js — guarda o resultado das últimas chamadas de uma função pura, para a mesma chamada não ser refeita.
 *
 * A leitura da superfície de uma receita roda o passo `subdivisao` duas vezes com os mesmos argumentos: uma no núcleo, que entrega a
 * malha, e outra em `superficiesDaReceita`, que precisa da gaiola e da malha de volta. Cada vez refaz o ajuste das medidas (uma
 * fatoração e centenas de resoluções) e o refino. Como as duas funções são puras, a segunda chamada com os mesmos argumentos tem de
 * devolver o mesmo valor, e devolvê-lo da memória poupa a conta.
 *
 * O ARGUMENTO É A CHAVE, BIT A BIT. A chave é a serialização exata dos argumentos: o zero negativo, o NaN, o infinito e o
 * valor indefinido (que o JSON apagaria) saem distintos, e um argumento que não é dado simples (função, Map, Set, classe) desliga a memória para aquela chamada, que roda
 * como sempre. O resultado sai COPIADO (`structuredClone`), de modo que quem o recebe pode alterá-lo sem alterar o guardado, e o
 * erro lançado pela função não é guardado. */

const NAO_SERIALIZAVEL = Symbol('nao-serializavel');

function chaveExata(argumentos) {
  try {
    return JSON.stringify(argumentos, function substituir(chave, valor) {
      if (valor === undefined) return '\u0000u';
      if (typeof valor === 'number') {
        if (Object.is(valor, -0)) return '\u0000n:-0';
        if (!Number.isFinite(valor)) return `\u0000n:${valor}`;
        return valor;
      }
      if (typeof valor === 'function' || typeof valor === 'symbol' || typeof valor === 'bigint') throw NAO_SERIALIZAVEL;
      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        const proto = Object.getPrototypeOf(valor);
        if ((proto !== Object.prototype && proto !== null) || typeof valor.toJSON === 'function') throw NAO_SERIALIZAVEL;
      }
      if (typeof valor === 'string' && valor.startsWith('\u0000')) throw NAO_SERIALIZAVEL;
      return valor;
    });
  } catch (erro) {
    if (erro === NAO_SERIALIZAVEL) return null;
    throw erro;
  }
}

/* `quando(...argumentos)` diz se a chamada entra na memória; a que não entra roda direto, sem o custo da chave e da cópia.
   `copiar: false` devolve o MESMO objeto guardado em vez de uma cópia: serve a resultado que tem objetos de classe (que a cópia
   perderia) e a chamadores que só o leem, ou só o alteram do mesmo jeito sempre. */
export function memoizarPura(funcao, { tamanho = 4, quando = () => true, copiar = true } = {}) {
  const guardados = new Map();
  return function memoizada(...argumentos) {
    if (!quando(...argumentos)) return funcao(...argumentos);
    const chave = chaveExata(argumentos);
    if (chave === null || chave === undefined) return funcao(...argumentos);
    if (guardados.has(chave)) {
      const valor = guardados.get(chave);
      guardados.delete(chave); guardados.set(chave, valor);
      return copiar ? structuredClone(valor) : valor;
    }
    const resultado = funcao(...argumentos);
    let copia = resultado;
    if (copiar) { try { copia = structuredClone(resultado); } catch { return resultado; } }
    guardados.set(chave, copia);
    if (guardados.size > tamanho) guardados.delete(guardados.keys().next().value);
    return resultado;
  };
}
