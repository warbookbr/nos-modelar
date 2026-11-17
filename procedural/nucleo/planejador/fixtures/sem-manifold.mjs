/* sem-manifold.mjs — carregado com `node --import`, faz o processo rodar sem a biblioteca Manifold, como um ambiente em que o WebAssembly
 * não carrega: a importação de `manifold-3d` lança, e o núcleo carrega com as booleanas gritando. Serve à prova do cache por prefixo
 * entre processos de ambientes diferentes (`cache-por-prefixo.test.mjs`). */
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`export async function resolve(especificador, contexto, proximo) {
  if (especificador === 'manifold-3d') return { url: 'data:text/javascript,throw new Error("Manifold bloqueada pela prova")', shortCircuit: true };
  return proximo(especificador, contexto);
}`));
