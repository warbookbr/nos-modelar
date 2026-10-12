/* O que um `arranja` repete: uma forma ou um grupo de formas. Puro. */
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

/* As formas-fonte de um arranjo: `forma` é um id ou uma lista de ids (um grupo repetido junto, como a pá e o colar de cada pá da hélice do avião,
   que levavam dois arranjos com `total`, `eixo` e `centro` escritos duas vezes). */
export function fontesDoArranjo(a) {
  return Array.isArray(a?.forma) ? a.forma : [a?.forma];
}

/* Os nomes das cópias de cada fonte de um arranjo, na ordem das cópias 1 a `total - 1`: os de `nomes` (uma lista para uma só fonte; para um grupo, um
   objeto `{ "<fonte>": [nomes] }` em que a fonte omitida usa o nome padrão `<id><k>`) ou `<id><k>`. */
export function nomesDasCopias(a) {
  const grupo = Array.isArray(a?.forma);
  return fontesDoArranjo(a).map((fonte) => {
    const dados = grupo ? (objeto(a.nomes) ? a.nomes[fonte] : undefined) : a.nomes;
    return { fonte, nomes: Array.isArray(dados) ? dados : Array.from({ length: a.total - 1 }, (_, k) => `${fonte}${k + 1}`) };
  });
}
