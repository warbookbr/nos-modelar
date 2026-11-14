/* ondulacao-saliencia-declarada.test.mjs — `PLANO.saliencias` na régua de ondulação, sobre a chapa neutra de `tools/fixtures/saliencia-declarada/`: a lombada de 60 mm
 * desenhada de propósito passa quando declarada e reprova sem a declaração (3 falhas, a maior de mais de 4 mm, contra o limiar de 0,3 mm); o rebaixo de 60 mm passa
 * do mesmo jeito; a ondulação somada a ela dentro da região reprova, e a mesma ondulação fora da região também; a declaração de sentido contrário ou de amplitude
 * menor que a da feição não a esconde. */
import { describe, expect, it } from 'vitest';
import { ondulacaoDaReceita } from './ondulacao-da-superficie.mjs';
import { receitaDeProva, regiaoDaFeicao } from '../fixtures/saliencia-declarada/receita.js';

const ler = (opcoes) => ondulacaoDaReceita(receitaDeProva(opcoes));
const ONDA = { p7_5: 3, p8_5: -3 };

describe('saliência declarada na régua de ondulação', () => {
  it('a lombada de 60 mm sem declaração reprova como calombo de mais de 4 mm; declarada, passa e a saída traz o desvio medido contra a feição', () => {
    const sem = ler({ amplitudeMm: 60 });
    expect(sem.falhas).toBe(3);
    expect(sem.superficies[0].falhas[0]).toMatchObject({ tipo: 'calombo', sentido: 'fora' });
    expect(sem.superficies[0].falhas[0].amplitudeMm).toBeGreaterThan(4);
    const com = ler({ amplitudeMm: 60, declarar: true });
    expect(com.falhas).toBe(0);
    const [s] = com.superficies[0].saliencias;
    expect(s).toMatchObject({ sentido: 'fora', amplitudeMm: 60, toleradoMm: 4.5 });
    expect(s.desvioMaximoMm).toBeGreaterThan(4);
    expect(s.desvioMaximoMm).toBeLessThanOrEqual(s.toleradoMm);
    expect(com.leitura.some((l) => /saliência declarada de 60 mm para fora/.test(l))).toBe(true);
  });

  it('o rebaixo de 60 mm declarado para dentro passa, e sem a declaração reprova', () => {
    expect(ler({ amplitudeMm: -60 }).falhas).toBe(3);
    const com = ler({ amplitudeMm: -60, declarar: true });
    expect(com.falhas).toBe(0);
    expect(com.superficies[0].saliencias[0].sentido).toBe('dentro');
  });

  it('a ondulação de 3 mm somada à lombada declarada reprova; a de 1 mm sobre ela também é acusada', () => {
    const r = ler({ amplitudeMm: 60, declarar: true, ondular: ONDA });
    expect(r.falhas).toBe(1);
    expect(r.superficies[0].falhas[0].amplitudeMm).toBeGreaterThan(2);
    expect(Math.abs(r.superficies[0].falhas[0].posicaoMm[0] - 700)).toBeLessThanOrEqual(100);
    expect(ler({ amplitudeMm: 60, declarar: true, ondular: { p7_5: 1, p8_5: -1 } }).falhas).toBe(1);
  });

  it('a ondulação fora da região declarada continua acusada, com a feição declarada', () => {
    const r = ler({ amplitudeMm: 60, declarar: true, ondular: { p16_8: 1, p17_8: -1 } });
    expect(r.falhas).toBe(1);
    expect(r.superficies[0].falhas[0].posicaoMm[0]).toBeGreaterThan(1500);
  });

  it('declarar o sentido contrário, metade da amplitude ou uma região que não cobre a feição não a esconde', () => {
    const receita = receitaDeProva({ amplitudeMm: 60, declarar: true });
    const com = (mudanca) => ondulacaoDaReceita({ ...receita, PLANO: { ...receita.PLANO, saliencias: [{ ...receita.PLANO.saliencias[0], ...mudanca }] } }).falhas;
    expect(com({ sentido: 'dentro' })).toBeGreaterThan(0);
    expect(com({ amplitudeMm: 30 })).toBeGreaterThan(0);
    expect(com({ regiao: { ...regiaoDaFeicao(60), max: [650, 70, 800] } })).toBeGreaterThan(0);
  });

  it('sem o campo a saída é a de antes, e a mesma receita dá a mesma saída', () => {
    const a = ler({ amplitudeMm: 60 }); const b = ler({ amplitudeMm: 60 });
    expect(a.superficies[0].saliencias).toBeUndefined();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
