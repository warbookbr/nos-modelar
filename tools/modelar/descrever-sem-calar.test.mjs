/* descrever-sem-calar.test.mjs — o `descrever` e a `guarda:acervo` dizendo o que calavam (fatia 5 do plano de ferramentas de conferência e de vista):
   o órfão de cada passo, a abertura que cai na booleana da chapa inteira com o motivo e o tempo, e o progresso na saída de erro. */
import { describe, expect, it } from 'vitest';
import { avisosDaChapaInteira, descreverPecaReutilizavel, linhasDeOrfaos } from './descrever-peca.mjs';
import { conferirAcervo } from './guardas/guarda-acervo.mjs';
import orfao from '../fixtures/descrever-sem-calar/orfao/receita.js';
import chapaInteira from '../fixtures/descrever-sem-calar/chapa-inteira/receita.js';

const PASTA = 'tools/fixtures/descrever-sem-calar';

describe('o órfão de um passo', () => {
  it('sai com o passo e o motivo, a causa antes do eco, e reprova', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/orfao/receita`, modulo: orfao });
    expect(r.ok).toBe(false);
    expect(r.stderr).toMatch(/4 ÓRFÃO\(S\)/);
    expect(r.stderr).toMatch(/passo 1 \(aberturaPorContorno\): o ponto \[1500, 1500\] mm do contorno fica fora da chapa/);
    const linhas = r.stderr.split('\n').filter((l) => /^ {2}passo \d+ \(/.test(l));
    expect(linhas[0]).toContain('passo 1 (aberturaPorContorno)');
    expect(linhas.slice(1).every((l) => l.includes('(parte)'))).toBe(true);
    expect(r.stderr).toMatch(/1 causa\(s\) e 3 eco\(s\)/);
  });

  it('passa as causas à frente e conta o que o corte deixou de fora', () => {
    const eco = (passo) => ({ passo, op: 'parte', ref: 'sel', motivo: 'seleção vazia: nenhum alvo válido foi encontrado' });
    const neutro = { orfaos: [{ passo: 3, op: 'aberturaPorContorno', ref: 'contorno', motivo: 'o contorno se cruza' }, ...[4, 5, 6, 7].map(eco), { passo: 9, op: 'furo', ref: 'sel', motivo: 'furo sem alvo' }] };
    const linhas = linhasDeOrfaos(neutro, { limite: 3 });
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toContain('passo 3 (aberturaPorContorno)');
    expect(linhas[1]).toContain('passo 9 (furo)');
    expect(linhas[3]).toMatch(/e mais 3 órfão\(s\)/);
  });

  it('segue dito quando uma etapa seguinte recusa a peça por parte ausente (razões inválidas)', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/orfao/receita`, modulo: { ...orfao, RAZOES: 'inválido' } });
    expect(r.ok).toBe(false);
    expect(r.stderr).toMatch(/RAZÕES DECLARADAS INVÁLIDAS/);
    expect(r.stderr).toMatch(/4 ÓRFÃO\(S\), que costumam ser a causa/);
    expect(r.stderr).toMatch(/passo 1 \(aberturaPorContorno\)/);
  });

  it('reprova na guarda do acervo, com o órfão no motivo', async () => {
    const { reprovadas } = await conferirAcervo([`${PASTA}/orfao/receita`]);
    expect(reprovadas).toHaveLength(1);
    expect(reprovadas[0].motivo).toMatch(/passo 1 \(aberturaPorContorno\): o ponto \[1500, 1500\] mm/);
  });
});

describe('a abertura que cai na booleana da chapa inteira', () => {
  it('avisa com o motivo do registro e o tempo do passo, e não reprova', async () => {
    const r = await descreverPecaReutilizavel({ peca: `${PASTA}/chapa-inteira/receita`, modulo: chapaInteira, semVeredito: true });
    expect(r.ok).toBe(true);
    expect(r.stdout).toMatch(/1 ABERTURA\(S\) NA BOOLEANA DA CHAPA INTEIRA \(aviso; não reprova\)/);
    expect(r.stdout).toMatch(/passo 1 \(aberturaPorContorno\): a booleana viu a chapa inteira, de 5616 faces, e o passo levou \d+(,\d)? s: a vizinhança do vão tem 4232 das 5616 faces da chapa, mais que 50%/);
    expect(r.stderr).toMatch(/AVISO: 1 abertura\(s\) na booleana da chapa inteira/);
  });

  it('não avisa de chapa pequena, que não recorta de propósito, nem de vão que recortou', () => {
    const pequena = { aberturas: [{ passo: 1, vizinhanca: { recortada: false, daChapa: 2176, motivo: 'a chapa tem 2176 faces' } }, { passo: 2, vizinhanca: { recortada: true, daChapa: 9000, via: 'direto' } }] };
    expect(avisosDaChapaInteira(pequena)).toEqual([]);
  });

  it('diz sem tempo quando o passo não foi cronometrado', () => {
    const grande = { aberturas: [{ passo: 4, vizinhanca: { recortada: false, daChapa: 8000, motivo: 'o motivo' } }] };
    expect(avisosDaChapaInteira(grande)).toEqual(['passo 4 (aberturaPorContorno): a booleana viu a chapa inteira, de 8000 faces: o motivo']);
  });
});

describe('o progresso', () => {
  it('entra na saída de erro por etapa e não muda a saída padrão', async () => {
    const linhas = [];
    const comProgresso = await descreverPecaReutilizavel({ peca: `${PASTA}/chapa-inteira/receita`, modulo: chapaInteira, aoProgredir: (l) => linhas.push(l) });
    const semProgresso = await descreverPecaReutilizavel({ peca: `${PASTA}/chapa-inteira/receita`, modulo: chapaInteira });
    expect(linhas.some((l) => /executando a receita \(3 passos\)/.test(l))).toBe(true);
    for (const etapa of ['medindo as partes', 'medindo os contatos', 'conferindo os vãos']) expect(linhas.some((l) => l.includes(etapa)), etapa).toBe(true);
    expect(linhas.every((l) => l.startsWith('descrever: ') && / s desde o começo$/.test(l))).toBe(true);
    const semTempo = (t) => t.replace(/levou \d+(,\d)? s/g, 'levou X s');
    expect(semTempo(comProgresso.stdout)).toBe(semTempo(semProgresso.stdout));
    expect(comProgresso.stderr).toBe(semProgresso.stderr);
  });

  it('bate no intervalo enquanto os passos rodam', async () => {
    const linhas = [];
    await descreverPecaReutilizavel({ peca: `${PASTA}/chapa-inteira/receita`, modulo: chapaInteira, semVeredito: true, aoProgredir: (l) => linhas.push(l), intervaloDoProgressoMs: 1 });
    expect(linhas.some((l) => /ainda executando a receita, no passo \d+ de 3/.test(l))).toBe(true);
  });
});
