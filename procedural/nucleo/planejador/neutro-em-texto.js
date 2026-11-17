/* neutro-em-texto.js — o neutro do núcleo em texto e de volta (plano do cache por passo, fatia 4), para a ativação da bancada gravá-lo ao
 * lado da sessão e a página lê-lo em vez de executar a receita de novo. Puro: serve ao Node e ao navegador.
 *
 * O texto é o JSON do neutro com o que o JSON perderia escrito à parte: Map e Set como listas marcadas, na ordem de inserção, o zero
 * negativo, o NaN, o infinito e o valor indefinido distintos, o texto que começa pelo caractere nulo escapado, e cada campo próprio do
 * neutro com a descrição dele (os que o núcleo deixa fora da enumeração, como `origens` e `chapas`, voltam fora dela). Ida e volta
 * dão o mesmo neutro, campo a campo (`src/bancada/sessao/neutro-em-texto.test.js`). */
export const FORMATO_DO_NEUTRO_EM_TEXTO = 'mecanifica.neutro-em-texto@1';
const MARCA = '\u0000';

function codificar(chave, valor) {
  /* o valor de antes do `toJSON` (a data, por exemplo, chega aqui já em texto): objeto de classe não se escreve */
  const original = this?.[chave];
  if (original && typeof original === 'object' && !(original instanceof Map) && !(original instanceof Set) && !Array.isArray(original)) {
    const proto = Object.getPrototypeOf(original);
    if ((proto !== Object.prototype && proto !== null) || typeof original.toJSON === 'function') throw new TypeError(`neutro em texto: objeto de classe em '${chave}'`);
  }
  if (valor === undefined) return `${MARCA}u`;
  if (typeof valor === 'number') {
    if (Object.is(valor, -0)) return `${MARCA}n:-0`;
    if (!Number.isFinite(valor)) return `${MARCA}n:${valor}`;
    return valor;
  }
  if (typeof valor === 'string') return valor.startsWith(MARCA) ? `${MARCA}s:${valor}` : valor;
  if (valor instanceof Map) return { [`${MARCA}Map`]: [...Map.prototype.entries.call(valor)] };
  if (valor instanceof Set) return { [`${MARCA}Set`]: [...Set.prototype.values.call(valor)] };
  if (typeof valor === 'function' || typeof valor === 'symbol' || typeof valor === 'bigint') throw new TypeError(`neutro em texto: valor que não se escreve (${typeof valor}) em '${chave}'`);
  if (Array.isArray(valor)) {
    for (let k = 0; k < valor.length; k += 1) if (!Object.hasOwn(valor, k)) throw new TypeError(`neutro em texto: lista com buraco em '${chave}'`);
    return valor;
  }
  return valor;
}

function decodificar(valor) {
  if (typeof valor === 'string') {
    if (!valor.startsWith(MARCA)) return valor;
    if (valor === `${MARCA}u`) return undefined;
    if (valor === `${MARCA}n:-0`) return -0;
    if (valor.startsWith(`${MARCA}n:`)) return Number(valor.slice(3));
    if (valor.startsWith(`${MARCA}s:`)) return valor.slice(3);
    throw new TypeError(`neutro em texto: marca desconhecida ${JSON.stringify(valor.slice(0, 8))}`);
  }
  if (Array.isArray(valor)) { for (let k = 0; k < valor.length; k += 1) valor[k] = decodificar(valor[k]); return valor; }
  if (valor && typeof valor === 'object') {
    const chaves = Object.keys(valor);
    if (chaves.length === 1 && chaves[0] === `${MARCA}Map`) return new Map(valor[chaves[0]].map(([k, v]) => [decodificar(k), decodificar(v)]));
    if (chaves.length === 1 && chaves[0] === `${MARCA}Set`) return new Set(valor[chaves[0]].map(decodificar));
    for (const k of chaves) valor[k] = decodificar(valor[k]);
  }
  return valor;
}

/** O neutro em texto, para gravar ao lado da sessão. */
export function neutroEmTexto(neutro) {
  const campos = Reflect.ownKeys(neutro).filter((k) => typeof k === 'string').map((nome) => {
    const d = Object.getOwnPropertyDescriptor(neutro, nome);
    return [nome, d.value, { enumerable: d.enumerable, writable: d.writable, configurable: d.configurable }];
  });
  return JSON.stringify({ formato: FORMATO_DO_NEUTRO_EM_TEXTO, campos }, codificar);
}

/** O neutro de volta, com cada campo como o núcleo o descreveu. */
export function neutroDoTexto(texto) {
  const lido = JSON.parse(texto);
  if (lido?.formato !== FORMATO_DO_NEUTRO_EM_TEXTO || !Array.isArray(lido.campos)) throw new TypeError('neutro em texto: formato desconhecido');
  const neutro = {};
  for (const [nome, valor, descricao] of lido.campos) Object.defineProperty(neutro, nome, { ...descricao, value: decodificar(valor) });
  return neutro;
}

