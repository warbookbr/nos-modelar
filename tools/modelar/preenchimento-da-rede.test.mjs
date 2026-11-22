/* preenchimento-da-rede.test.mjs — o diagnóstico do preenchimento pelas curvas vizinhas, medido nas chapas de prova e pela linha de comando. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { preenchimentoDaReceita, tabelaDoPreenchimento } from './preenchimento-da-rede.mjs';
import { receitaDeProva } from '../fixtures/correcao-de-superficie/chapas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

describe('o diagnóstico do preenchimento de uma receita', () => {
  it('na chapa de prova sem ruído, liga a opção só para medir e diz o retalho de n lados ao lado', () => {
    const [r] = preenchimentoDaReceita(() => receitaDeProva('rede-sem-ruido'));
    expect(r.rede).toBe(0);
    expect(r.preenchimento).toMatchObject({ retalhos: 3, lados: 12, porMotivo: { vizinho: 4, borda: 6, nLados: 2 } });
    expect(r.preenchimento.porRetalho.B[2]).toEqual({ curva: 'meio', motivo: 'nLados' });
    const tabela = tabelaDoPreenchimento([r], 'rede-sem-ruido', { retalhos: true });
    expect(tabela).toMatch(/3 retalhos de quatro lados, 12 lados/);
    expect(tabela).toMatch(/2 {2}retalho de n lados ao lado/);
    expect(tabela).toMatch(/B: baixo borda \| direita borda \| meio nLados \| centro vizinho/);
  });

  it('na chapa simétrica, a borda em x = 0 conta como plano de simetria', () => {
    const [r] = preenchimentoDaReceita(() => receitaDeProva('chapa-simetrica'));
    expect(r.preenchimento.porMotivo).toMatchObject({ vizinho: 8, borda: 6, simetria: 2 });
    expect(r.preenchimento.porRetalho.altoFrente[0]).toEqual({ curva: 'crista', motivo: 'simetria' });
  });

  it('recusa a receita que não monta gaiola ao ler PASSOS', () => {
    expect(() => preenchimentoDaReceita({ PASSOS: [] })).toThrow(/nenhuma gaiola foi montada ao ler PASSOS/);
  });

  it('pela linha de comando, responde a --ajuda e recusa a onda que não é comprimento', () => {
    const rodar = (...a) => spawnSync(process.execPath, [join(AQUI, 'preenchimento-da-rede.mjs'), ...a], { encoding: 'utf8' });
    expect(rodar('--ajuda').status).toBe(0);
    const ruim = rodar('rede-sem-ruido', '--onda=-3');
    expect(ruim.status).toBe(2);
    expect(ruim.stderr).toMatch(/--onda espera um comprimento em mm maior que zero, e veio '-3'/);
    const boa = rodar('chapa-simetrica');
    expect(boa.status).toBe(0);
    expect(JSON.parse(boa.stdout).redes[0].preenchimento.lados).toBe(16);
  });
});
