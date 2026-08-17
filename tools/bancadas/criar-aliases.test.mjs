/* criar-aliases.test.mjs — impede que a bancada criar volte a diagnosticar
   como órfã uma peça válida por esquecer o sexto campo do envelope: ALIASES. */
import { describe, expect, it } from 'vitest';
import { nucleo, neutroCanonico } from '../../prototipos/procedural/v3/motor/oficina.js';
import { executarNucleoDaPeca } from './estado-peca.mjs';

const fixture = {
  PASSOS: [
    ['cubo', { origemId: 1, lado: 0.1 }],
    ['transladar', { d: [0.2, 0, 0], sel: { alias: 'blocoInteiro' } }],
  ],
  PARAMS: {}, TOPO: {}, MATERIAIS: {}, ESQUELETO: null,
  ALIASES: [['blocoInteiro', { origem: { op: 'cubo', id: 1 } }]],
};

describe('envelope da bancada criar', () => {
  it('encaminha ALIASES e não acusa a fixture válida como órfã', () => {
    const comEnvelope = neutroCanonico(executarNucleoDaPeca(nucleo, fixture));
    const semAliases = neutroCanonico(nucleo(
      fixture.PASSOS, fixture.PARAMS, fixture.TOPO, fixture.MATERIAIS, fixture.ESQUELETO,
    ));

    expect(comEnvelope.orfaos).toHaveLength(0);
    expect(comEnvelope.V.length).toBeGreaterThan(0);
    expect(semAliases.orfaos.length).toBeGreaterThan(0);
    expect(semAliases.orfaos[0].motivo).toContain("alias 'blocoInteiro' inexistente");
  });
});
