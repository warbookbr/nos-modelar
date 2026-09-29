/* booleanas-carga.test.ts — fatia 5 do plano "União de sólidos". O núcleo
   carrega a Manifold sozinho, por await no topo de `manifold.js`: quem só
   importa a fachada e executa, sem chamar nada, já recebe a booleana pronta.
   Arquivo próprio porque o vitest isola os módulos por arquivo, e aqui nada
   chama `carregarManifold()`. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { manifoldCarregada, nucleo } from '../entrada.js';

describe('carga da Manifold', () => {
  it('importar o núcleo basta: unir, subtrair e intersectar rodam sem chamada de carga', () => {
    expect(manifoldCarregada()).not.toBeNull();
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }]];
    for (const op of ['unir', 'subtrair', 'intersectar']) {
      const r = nucleo([...base, [op, { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }]]);
      expect(r.orfaos).toEqual([]);
    }
  });
});
