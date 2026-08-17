/* criar-aliases.test.mjs — impede que a bancada criar volte a diagnosticar
   como órfã uma peça válida por esquecer o sexto campo do envelope: ALIASES. */
import { describe, expect, it } from 'vitest';
import { nucleo, neutroCanonico } from '../../prototipos/procedural/v3/motor/oficina.js';
import * as freio from '../../prototipos/procedural/v3/pecas/freio-disco.js';
import { executarNucleoDaPeca } from './estado-peca.mjs';

describe('envelope da bancada criar', () => {
  it('encaminha ALIASES e não acusa o freio a disco válido como órfão', () => {
    const comEnvelope = neutroCanonico(executarNucleoDaPeca(nucleo, freio));
    const semAliases = neutroCanonico(nucleo(
      freio.PASSOS, freio.PARAMS, freio.TOPO, freio.MATERIAIS, freio.ESQUELETO ?? null,
    ));

    expect(comEnvelope.orfaos).toHaveLength(0);
    expect([...new Set(comEnvelope.F.map((face) => face[6]))]).toEqual(expect.arrayContaining([
      'cubo', 'disco', 'pinca', 'pastilhaInterna', 'pastilhaExterna',
    ]));
    expect(semAliases.orfaos.length).toBeGreaterThan(0);
    expect(semAliases.orfaos[0].motivo).toContain("alias 'discoPistaInteira' inexistente");
  });
});
