/* triangulos-da-receita.mjs — os triângulos de uma receita em milímetro, com a parte de cada um, pela mesma triangulação que a cena usa (`adaptarThree`).

   Serve às ferramentas que comparam a receita com uma fonte de referência (`comparar-silhueta`, `folha-comparativa`, `vistas-da-receita`): todas medem e
   desenham os MESMOS triângulos. Unidade de saída: milímetro; referencial do acervo (y para cima, frente em +z). */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

/** Importa a receita de um arquivo `.js` (export default ou o próprio módulo). */
export async function importarReceita(arquivo) {
  const mod = await import(pathToFileURL(resolve(arquivo)).href);
  return mod.default ?? mod;
}

/** Executa a receita e devolve `{ tris, partes, nome }`: `tris` é uma lista de `{ p: [[x,y,z]*3], parte }` em milímetro; `partes` os nomes das partes na ordem de aparição. */
export function triangulosDaReceita(receita) {
  const { neutro } = executarReceita(receita);
  const { raiz } = adaptarThree(neutro);
  const tris = [];
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    const parte = o.userData?.identidadeParte ?? o.name;
    const pos = o.geometry.attributes.position;
    for (let k = 0; k + 2 < pos.count; k += 3) tris.push({ p: [0, 1, 2].map((j) => [pos.getX(k + j) * 1000, pos.getY(k + j) * 1000, pos.getZ(k + j) * 1000]), parte });
  });
  const partes = [...new Set(tris.map((t) => t.parte))];
  const vs = [...neutro.V.values()].map((p) => p.map((x) => x * 1000));
  return { tris, partes, nome: receita.meta?.nome ?? 'receita', vertices: vs };
}
