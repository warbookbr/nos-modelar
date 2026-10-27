/* citacoes.test.mjs — o nome do que saiu só aparece em documento vivo numa frase que diz que saiu, e o repositório passa. */
import { describe, expect, it } from 'vitest';
import { conferirCitacoes, nomesRemovidosCitados } from './citacoes.mjs';

describe('nomes do que saiu', () => {
  it('acusa a frase que cita uma área removida como se existisse, e aceita a que diz que ela saiu', () => {
    expect(nomesRemovidosCitados('Buraco reprova no preparo para micropolígono.').map((a) => a.nome)).toEqual(['micropolígono']);
    expect(nomesRemovidosCitados('O visor legado mantém o import map.\n\nO grafo de capacidades\nexplica o motor.').map((a) => a.nome))
      .toEqual(['visor legado', 'grafo de capacidades']);
    expect(nomesRemovidosCitados('O preparo para micropolígono saiu em 2026-10-25.')).toEqual([]);
    expect(nomesRemovidosCitados('Os importadores de STEP foram removidos; o histórico guarda como recriá-los.')).toEqual([]);
  });

  it('o repositório de hoje passa', () => {
    expect(conferirCitacoes().problemas).toEqual([]);
  });
});
