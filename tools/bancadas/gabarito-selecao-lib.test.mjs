/* gabarito-selecao-lib.test.mjs — protege a exceção estreita para peça nova:
 * `--novas` aceita presença nova, mas nunca esconde hash, remoção ou erro de nome. */
import { describe, expect, it } from 'vitest';
import { compararGabarito, hashDePecas, nomesNovos } from './gabarito-selecao-lib.mjs';

const peca = (hash, vertices = 8, faces = 6) => ({ hash, vertices, faces });
const gravado = (pecas) => ({ hashTotal: hashDePecas(pecas), pecas });

describe('gabarito:selecao --novas', () => {
  it('aceita somente a peça nova declarada e preserva o hash das gravadas', () => {
    const antigas = { caixa: peca('caixa') };
    const resultado = compararGabarito({ ...antigas, flange: peca('flange', 120, 228) }, gravado(antigas), new Set(['flange']));
    expect(resultado.erros).toEqual([]);
    expect(resultado.gravadasConformes).toBe(1);
    expect(resultado.novasAceitas).toEqual(['flange']);
  });

  it('não deixa --novas esconder regressão, remoção ou nome incorreto', () => {
    const antigas = { caixa: peca('caixa') };
    const mudou = compararGabarito({ caixa: peca('mudou'), flange: peca('flange') }, gravado(antigas), new Set(['flange']));
    expect(mudou.erros).toContain('caixa: HASH DIVERGE do gabarito — mudança não é aditiva (V=8 vs 8, F=6 vs 6)');

    const sumiu = compararGabarito({}, gravado(antigas), new Set());
    expect(sumiu.erros).toContain('caixa: peça SUMIU desde o gabarito (existia, não existe mais ou perdeu PASSOS)');

    const nomeErrado = compararGabarito(antigas, gravado(antigas), new Set(['flange']));
    expect(nomeErrado.erros).toContain('flange: declarada em --novas, mas não foi medida como peça nova');

    const antigaDeclarada = compararGabarito(antigas, gravado(antigas), new Set(['caixa']));
    expect(antigaDeclarada.erros).toContain('caixa: --novas só aceita peça ausente do gabarito gravado');
  });

  it('recusa sintaxe vazia, repetida ou ambígua para --novas', () => {
    expect([...nomesNovos(['--novas=flange, suporte'])]).toEqual(['flange', 'suporte']);
    expect(() => nomesNovos(['--novas'])).toThrow(/use --novas=/);
    expect(() => nomesNovos(['--novas=flange,flange'])).toThrow(/peças distintas/);
  });
});
