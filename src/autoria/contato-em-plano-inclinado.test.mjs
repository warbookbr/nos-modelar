/* contato-em-plano-inclinado.test.mjs — o vidro sobre face inclinada fecha por vértice novo de booleana ou de interseção de perfis, e esse vértice volta a
 * poucos nanômetros do plano (a grade de 1e-8 de `perfil2d.js`), do tamanho da tolerância global de 1e-9. O caso medido é o trator copiado com
 * `vidro_encaixe: 0`: o vértice do para-brisa fica a 3,35e-9 do plano do miolo, e os três contatos declarados do para-brisa deixam de acontecer.
 *
 * A saída é a tolerância declarada POR CONTATO (de 1e-9 a 1e-7, com o motivo), e a global continua em 1e-9. Estes testes provam as quatro pontas: sem a
 * tolerância reprova; com ela passa; o valor fora da faixa é recusado; e a mensagem do contato que não acontece diz que fecharia e aponta a grade. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { executarReceita } from './executar-receita.js';
import {
  TOLERANCIA_CONTATO_DE_PECA,
  TOLERANCIA_PROPRIA_MAXIMA,
  TOLERANCIA_PROPRIA_MINIMA,
  contatosDaPeca,
  lerContatosDeclarados,
} from './contatos-da-peca.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* O trator do acervo com o encaixe de 1 mm dos vidros tirado. Nenhum arquivo do acervo é tocado: a cópia vai para um diretório temporário. */
async function tratorSemEncaixe() {
  const original = readFileSync(join(REPO, 'procedural/pecas/trator/receita.js'), 'utf8');
  const copia = original.replace('vidro_encaixe: 1,', 'vidro_encaixe: 0,');
  expect(copia, 'o trator mudou: a cópia de ensaio não achou o encaixe').not.toBe(original);
  const pasta = mkdtempSync(join(tmpdir(), 'trator-sem-encaixe-'));
  const arquivo = join(pasta, 'receita.mjs');
  writeFileSync(arquivo, copia);
  const receita = (await import(/* @vite-ignore */ pathToFileURL(arquivo).href)).default;
  return { receita, neutro: executarReceita(receita).neutro };
}

const doParabrisa = (c) => c.par.includes('parabrisa');
const comTolerancia = (receita, toleranciaNumerica) => ({
  ...receita,
  contatos: receita.contatos.map((c) => (doParabrisa(c) ? { ...c, toleranciaNumerica } : c)),
});

describe('contato declarado em plano inclinado', () => {
  it('sem tolerância própria os três contatos do para-brisa não acontecem, e o vão é de grade, não de forma', async () => {
    const { receita, neutro } = await tratorSemEncaixe();
    const r = contatosDaPeca(neutro, receita);
    expect(r.toleranciaNumerica).toBe(TOLERANCIA_CONTATO_DE_PECA);
    expect(r.toleranciaNumerica).toBe(1e-9);
    expect(r.declaradosSemContato.map((d) => d.par.join(' ')).sort()).toEqual([
      'cabineAsaDir parabrisa', 'cabineAsaEsq parabrisa', 'cabineMiolo parabrisa',
    ]);
    /* a causa fica na saída: com o teto de 1e-7 eles encostam. */
    expect(r.declaradosSemContato.every((d) => d.fechaComTolerancia === TOLERANCIA_PROPRIA_MAXIMA)).toBe(true);
    expect(r.naoDeclarados).toEqual([]);
  });

  it('com toleranciaNumerica: 2e-8 no contato do para-brisa, os três passam e os outros pares seguem na global', async () => {
    const { receita, neutro } = await tratorSemEncaixe();
    const r = contatosDaPeca(neutro, comTolerancia(receita, 2e-8));
    expect(r.declaradosSemContato).toEqual([]);
    expect(r.naoDeclarados).toEqual([]);
    expect(r.toleranciaNumerica).toBe(1e-9);
    const proprios = r.paresEmContato.filter((p) => p.toleranciaNumerica !== undefined);
    expect(proprios.map((p) => p.par.join(' ')).sort()).toEqual([
      'cabineAsaDir parabrisa', 'cabineAsaEsq parabrisa', 'cabineMiolo parabrisa',
    ]);
    expect(proprios.every((p) => p.toleranciaNumerica === 2e-8 && p.declarado)).toBe(true);
    /* nenhum outro par ganhou contato por isso: o mesmo conjunto de pares, só que agora com os três */
    const semAjuste = contatosDaPeca(neutro, receita);
    expect(r.paresEmContato).toHaveLength(semAjuste.paresEmContato.length + 3);
  });

  it('a tolerância própria só vale para o par que a declara: o mesmo valor em outro contato não o salva', async () => {
    const { receita, neutro } = await tratorSemEncaixe();
    const soOutro = {
      ...receita,
      contatos: receita.contatos.map((c) => (c.par.includes('teto') && c.par.includes('cabineMiolo') ? { ...c, toleranciaNumerica: 2e-8 } : c)),
    };
    expect(contatosDaPeca(neutro, soOutro).declaradosSemContato).toHaveLength(3);
  });

  it('o descrever mostra a tolerância usada, e a do par que não acontece cita a grade de 1e-8', async () => {
    const { receita } = await tratorSemEncaixe();
    const { descreverPecaReutilizavel } = await import('../../tools/modelar/descrever-peca.mjs');
    const sem = await descreverPecaReutilizavel({ peca: 'trator-sem-encaixe', modulo: receita });
    expect(sem.resultado.contatos.declaradosSemContato).toHaveLength(3);
    expect(sem.codigo).toBe(1);
    expect(sem.stderr).toContain('CONTATO(S) DECLARADO(S) QUE NÃO ACONTECEM');
    expect(sem.stderr).toContain('grade de 1e-8');
    expect(sem.stderr).toContain('toleranciaNumerica');

    const com = await descreverPecaReutilizavel({ peca: 'trator-sem-encaixe', modulo: comTolerancia(receita, 2e-8) });
    expect(com.resultado.contatos.declaradosSemContato).toEqual([]);
    expect(com.stderr).not.toContain('QUE NÃO ACONTECEM');
    expect(com.stdout).toContain('TOLERÂNCIA DE CONTATO — global 1e-9; 3 contato(s) declarado(s) com tolerância própria');
    expect(com.stdout).toContain('parabrisa: 2e-8');
  });
});

describe('a faixa da tolerância declarada', () => {
  const partes = ['a', 'b'];
  const motivo = 'as duas placas se encostam na face inclinada comum';
  const unico = (mapa) => [...mapa.values()][0];
  const ler = (toleranciaNumerica) => lerContatosDeclarados({ contatos: [{ par: ['a', 'b'], motivo, toleranciaNumerica }] }, partes);

  it('aceita de 1e-9 a 1e-7, inclusive', () => {
    expect(TOLERANCIA_PROPRIA_MINIMA).toBe(1e-9);
    expect(TOLERANCIA_PROPRIA_MAXIMA).toBe(1e-7);
    for (const valor of [1e-9, 2e-8, 1e-7]) expect(unico(ler(valor)).toleranciaNumerica).toBe(valor);
  });

  it('recusa acima de 1e-7 e diz que a correção é na receita', () => {
    expect(() => ler(1.01e-7)).toThrow(/de 1e-9 a 1e-7/);
    expect(() => ler(1e-6)).toThrow(/a correção é na receita/);
  });

  it('recusa abaixo de 1e-9, zero, negativo e o que não é número finito', () => {
    for (const valor of [0, 5e-10, -1e-8, Number.NaN, Infinity, '2e-8', null]) expect(() => ler(valor), String(valor)).toThrow(/toleranciaNumerica/);
  });

  it('a tolerância não dispensa o motivo, que é obrigatório em todo contato', () => {
    expect(() => lerContatosDeclarados({ contatos: [{ par: ['a', 'b'], toleranciaNumerica: 2e-8 }] }, partes)).toThrow(/motivo/);
    expect(() => lerContatosDeclarados({ contatos: [{ par: ['a', 'b'], motivo: 'curto', toleranciaNumerica: 2e-8 }] }, partes)).toThrow(/pelo menos/);
  });

  it('o contato sem o campo continua como era: nada de tolerância no registro', () => {
    expect('toleranciaNumerica' in unico(lerContatosDeclarados({ contatos: [{ par: ['a', 'b'], motivo }] }, partes))).toBe(false);
  });
});
