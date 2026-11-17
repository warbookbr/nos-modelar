/* categorias-de-objeto.js — a lista fechada de categorias com que a janela Abrir da bancada separa o acervo.
 *
 * A categoria é uma declaração do objeto: `PLANO.categoria` na receita da peça e `categoria` na montagem em dados. Ela é
 * só rótulo de navegação, e não escolhe critério nem pergunta do crítico, que é o que `PLANO.familia` faz; por isso é um
 * campo à parte, com valores próprios. O objeto que não declara nada cai em `outros`. */
export const CATEGORIAS_DE_OBJETO = Object.freeze([
  { id: 'veiculos', rotulo: 'Veículos' },
  { id: 'moveis', rotulo: 'Móveis e eletrodomésticos' },
  { id: 'robotica', rotulo: 'Robótica' },
  { id: 'eletronica', rotulo: 'Eletrônica' },
  { id: 'utensilios', rotulo: 'Ferramentas e utensílios' },
  { id: 'outros', rotulo: 'Outros' },
]);

export const IDS_DE_CATEGORIA = Object.freeze(CATEGORIAS_DE_OBJETO.map((c) => c.id));

export function ehCategoriaDeObjeto(valor) {
  return IDS_DE_CATEGORIA.includes(valor);
}
