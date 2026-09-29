/* booleanas-sem-manifold.test.ts — o executor é síncrono e a Manifold carrega
   de forma assíncrona. Quem executa sem chamar `carregarManifold()` recebe o
   grito com o conserto, e o passo não muda a malha. Arquivo próprio porque o
   vitest isola os módulos por arquivo: aqui a Manifold nunca foi carregada. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';

describe('booleana sem a Manifold carregada', () => {
  it('grita dizendo para chamar carregarManifold e não muda nada', () => {
    const base = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0.5, 0.5] }]];
    for (const op of ['unir', 'subtrair', 'intersectar']) {
      const r = nucleo([...base, [op, { origemId: 9, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }]]);
      expect(r.orfaos).toHaveLength(1);
      expect(r.orfaos[0].motivo).toMatch(/carregarManifold/);
      expect(r.F.size).toBe(12);
    }
  });
});
