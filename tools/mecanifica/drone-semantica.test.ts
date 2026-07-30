/* drone-semantica.test.ts — regressão do cilindro da lente e do trem de pouso do drone. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo e fixture legados em JavaScript.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — fixture legada em JavaScript.
import * as drone from '../../prototipos/fps/v3/pecas/drone-inspecao.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';

describe('semântica do drone de inspeção', () => {
  it('não mistura lente e pouso e não deixa faces sem identidade', () => {
    const neutro = nucleo(
      drone.PASSOS,
      drone.PARAMS,
      drone.TOPO,
      {},
      null,
      drone.ALIASES,
    );
    const contagem = new Map<string, number>();
    for (const face of neutro.F.values()) {
      contagem.set(face.parte, (contagem.get(face.parte) ?? 0) + 1);
    }

    expect(neutro.orfaos).toHaveLength(0);
    expect(contagem.get(undefined as any)).toBeUndefined();
    expect(contagem.get('lente')).toBe(14);
    expect(contagem.get('pousoDireito')).toBe(18);
    expect(contagem.get('pousoEsquerdo')).toBe(18);
    expect(contagem.has('pouso')).toBe(false);

    const convertido = adaptarThree(neutro, { nome: drone.meta.nome });
    expect(convertido.diagnosticos).toEqual({
      facesSemParte: [],
      semanticaIntegra: true,
    });
    expect(convertido.partes.has('estrutura-sem-nome')).toBe(false);
    expect(convertido.estatisticas).toMatchObject({
      partes: 23,
      facesSemParte: 0,
    });
  });
});
