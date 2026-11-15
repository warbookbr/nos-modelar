/* arredondar-costura-no.test.ts — o `arredondarCostura` no nó de tubos (plano da costura em nó de tubos, 2026-11-15).
   Medido na fatia 1: a malha fecha com dois tubos, retos ou oblíquos, com dois tubos sozinhos a 22° e com três tubos cujas
   costuras no receptor não se tocam. Recusa no ponto triplo, onde as costuras de dois tubos sobre um terceiro se encostam (os
   dois estais sobre o tubo do selim): ali a superfície se fecha em cunha e o círculo tangente não cabe. A recusa é registrada
   como órfão do passo, e este teste a guarda como linha de base; a fatia 2 o inverte. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo herdado em JavaScript.
import { nucleo } from '../entrada.js';
// @ts-expect-error — fixture em JavaScript.
import { passosDoNo } from '../fixtures/no-de-tubos.js';
import { arestasSemPar, vinculosNaoManifold } from '../../../tools/oficina/conferir-malha';

describe('arredondarCostura no nó de tubos', () => {
  for (const caso of ['T reto 17/8', 'obliquo 35 17/8', 'obliquo 60 17/16', 'no de 3 tubos afastados', 'estais sozinhos 22']) {
    it(`${caso}: arredonda e fecha a malha com raio de 3 e de 5 mm`, () => {
      for (const raio of [3, 5]) {
        const n = nucleo(passosDoNo(caso, raio));
        expect(n.orfaos).toEqual([]);
        expect(arestasSemPar(n)).toEqual([]);
        expect(vinculosNaoManifold(n)).toEqual([]);
      }
    });
  }

  for (const caso of ['tubo e dois estais', 'no de 4 tubos']) {
    it(`${caso}: hoje recusa no ponto triplo, com e sem raioMinimo`, () => {
      for (const extra of [{}, { raioMinimo: 0.001 }]) {
        const n = nucleo(passosDoNo(caso, 3, extra));
        expect(n.orfaos).toHaveLength(1);
        expect(n.orfaos[0]).toMatchObject({ op: 'arredondarCostura' });
      }
    });
  }
});
