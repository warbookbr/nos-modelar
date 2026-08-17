/* catalogo-pecas.js — contrato explícito da lista que uma aplicação pode
 * publicar. O catálogo é dado de aplicação; o núcleo e os validadores recebem
 * receitas diretamente e nunca consultam este módulo.
 */

function entradaValida(entrada, indice) {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    throw new TypeError(`catálogo: entrada ${indice} precisa ser objeto.`);
  }
  if (typeof entrada.id !== 'string' || !entrada.id.trim()) {
    throw new TypeError(`catálogo: entrada ${indice} precisa de id não vazio.`);
  }
  if (typeof entrada.carregar !== 'function') {
    throw new TypeError(`catálogo: '${entrada.id}' precisa de carregador explícito.`);
  }
  return Object.freeze({ id: entrada.id, carregar: entrada.carregar });
}

export function validarCatalogo(entradas) {
  if (!Array.isArray(entradas)) throw new TypeError('catálogo: entradas precisa ser lista.');
  const ids = new Set();
  const catalogo = entradas.map((entrada, indice) => {
    const validada = entradaValida(entrada, indice);
    if (ids.has(validada.id)) throw new TypeError(`catálogo: id duplicado '${validada.id}'.`);
    ids.add(validada.id);
    return validada;
  });
  return Object.freeze(catalogo);
}

export function idsDoCatalogo(catalogo) {
  return validarCatalogo(catalogo).map((entrada) => entrada.id).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function entradaDoCatalogo(catalogo, id) {
  const entrada = validarCatalogo(catalogo).find((candidata) => candidata.id === id);
  if (!entrada) throw new Error(`catálogo: peça '${id}' não está publicada.`);
  return entrada;
}

/* A bancada publicada começa vazia. Uma futura homologação adiciona uma
 * entrada explícita aqui; ter arquivo de receita não a publica por acidente.
 */
export const CATALOGO_HOMOLOGADO = validarCatalogo([]);
