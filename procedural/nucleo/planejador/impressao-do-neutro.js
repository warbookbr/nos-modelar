/* impressao-do-neutro.js — o neutro que o núcleo devolve, escrito campo a campo num texto que distingue tudo o que o distingue, para a
 * comparação bit a bit do cache por passo (plano do cache por passo, fatia 3): a execução que recomeçou de um estado guardado tem de
 * devolver o mesmo neutro que a execução inteira.
 *
 * Entram todos os campos próprios do neutro, os enumeráveis e os que o núcleo deixa fora da enumeração (`facesDasPortas`, `avisos`,
 * `origens`, `frisos`, `chapas`, `aberturas`), na ordem do objeto. O texto é o de `JSON.stringify` com uma troca: Map e Set saem como
 * listas marcadas, na ordem de inserção (a ordem de um mapa é parte do resultado), o zero negativo, o NaN, o infinito e o valor
 * indefinido saem distintos, como em `memoria-de-pura.js`, e a lista tipada sai com o tipo. Puro e determinístico. */

function substituir(chave, valor) {
  if (valor === undefined) return '\u0000u';
  if (typeof valor === 'number') {
    if (Object.is(valor, -0)) return '\u0000n:-0';
    if (!Number.isFinite(valor)) return `\u0000n:${valor}`;
    return valor;
  }
  if (typeof valor === 'bigint') return `\u0000b:${valor}`;
  if (typeof valor === 'function' || typeof valor === 'symbol') return `\u0000${typeof valor}`;
  if (valor instanceof Map) return { '\u0000Map': [...Map.prototype.entries.call(valor)] };
  if (valor instanceof Set) return { '\u0000Set': [...Set.prototype.values.call(valor)] };
  if (ArrayBuffer.isView(valor)) return { [`\u0000${valor.constructor.name}`]: Array.from(valor) };
  return valor;
}

/** O neutro como lista de `[campo, texto]`, um por campo próprio, na ordem do objeto. */
export function impressaoDoNeutro(neutro) {
  return Reflect.ownKeys(neutro).filter((k) => typeof k === 'string').map((campo) => [campo, JSON.stringify(neutro[campo], substituir) ?? '\u0000u']);
}

/** null quando os dois neutros têm a mesma impressão, ou o primeiro campo que difere (ou falta num deles). */
export function divergenciaDaImpressao(a, b) {
  const ia = impressaoDoNeutro(a), ib = impressaoDoNeutro(b);
  const campos = [...new Set([...ia.map(([c]) => c), ...ib.map(([c]) => c)])];
  const ma = new Map(ia), mb = new Map(ib);
  if (ia.map(([c]) => c).join('\n') !== ib.map(([c]) => c).join('\n')) return `os campos diferem: ${ia.map(([c]) => c).join(', ')} contra ${ib.map(([c]) => c).join(', ')}`;
  for (const campo of campos) if (ma.get(campo) !== mb.get(campo)) return `o campo '${campo}' difere`;
  return null;
}
