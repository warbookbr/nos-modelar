/* guarda-tempo-do-descrever.test.mjs — o veredito da guarda de tempo reprova com o número medido e o orçamento, e a medida
   só vale para uma peça do tamanho que o orçamento supõe. A medição de verdade roda no CI (`npm run guarda:tempo`). */
import { describe, expect, it } from 'vitest';
import { FACES_MINIMAS, ORCAMENTO_EM_SEGUNDOS, PECA_DA_MEDIDA, conferirTempo } from './guarda-tempo-do-descrever.mjs';

describe('guarda de tempo do descrever', () => {
  it('passa dentro do orçamento e diz o tempo', () => {
    const v = conferirTempo({ segundos: ORCAMENTO_EM_SEGUNDOS / 2, faces: FACES_MINIMAS + 1 });
    expect(v.ok).toBe(true);
    expect(v.mensagem).toContain(PECA_DA_MEDIDA);
  });

  it('reprova acima do orçamento com o tempo medido e o orçamento', () => {
    const v = conferirTempo({ segundos: ORCAMENTO_EM_SEGUNDOS + 12.34, faces: FACES_MINIMAS + 1 });
    expect(v.ok).toBe(false);
    expect(v.mensagem).toContain(`${(ORCAMENTO_EM_SEGUNDOS + 12.34).toFixed(1)} s`);
    expect(v.mensagem).toContain(`orçamento é ${ORCAMENTO_EM_SEGUNDOS} s`);
  });

  it('reprova a peça que encolheu, em vez de passar com o tempo de uma peça pequena', () => {
    const v = conferirTempo({ segundos: 1, faces: FACES_MINIMAS - 1 });
    expect(v.ok).toBe(false);
    expect(v.mensagem).toContain('encolheu');
  });

  it('reprova a medida que não saiu', () => {
    expect(conferirTempo({ segundos: Number.NaN, faces: FACES_MINIMAS }).ok).toBe(false);
    expect(conferirTempo({ segundos: 5, faces: undefined }).ok).toBe(false);
  });

  it('o orçamento é positivo e finito', () => {
    expect(ORCAMENTO_EM_SEGUNDOS).toBeGreaterThan(0);
    expect(Number.isFinite(ORCAMENTO_EM_SEGUNDOS)).toBe(true);
  });
});
