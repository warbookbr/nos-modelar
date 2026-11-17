/* descrever-recomeco.test.mjs — o `descrever` que recomeça de um ponto guardado pelo cache por prefixo (plano do cache por passo, fatia 4)
   informa o passo da receita, e não a contagem das consultas que sobraram, e não perde os tempos por passo. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel, registroCronometrado } from './descrever-peca.mjs';
import { REGISTRO_OPERACOES } from '../../procedural/nucleo/entrada.js';

const pasta = mkdtempSync(join(tmpdir(), 'recomeco-'));
afterAll(() => rmSync(pasta, { recursive: true, force: true }));

const receita = (ladoDoPasso4) => ({
  meta: { nome: 'recomeco' }, PARAMS: {}, MATERIAIS: {},
  PASSOS: [1, 2, 3, 4, ladoDoPasso4, 6].map((lado, k) => ['cubo', { lado, id: k + 1 }]),
});

describe('o cronômetro depois de um recomeço', () => {
  it('conta o passo da receita pelo deslocamento e não descarta os tempos', () => {
    const tempos = new Map(); const batidas = [];
    const { registro, fechar } = registroCronometrado(REGISTRO_OPERACOES, { total: 4, tempos, aoPasso: (i, total, op) => batidas.push([i, total, op]), deslocamento: () => 2 });
    registro.resolver('cubo'); registro.resolver('parte');
    fechar([['a', {}], ['b', {}], ['cubo', {}], ['parte', {}]]);
    expect([...tempos.keys()]).toEqual([2, 3]);
    expect(batidas).toEqual([[2, 4, 'cubo'], [3, 4, 'parte']]);
    fechar([['a', {}], ['cubo', {}], ['parte', {}]]);
    expect(tempos.size).toBe(0);
  });
});

describe('o descrever que recomeça do estado guardado', () => {
  it('informa o passo da receita no progresso', async () => {
    const rodar = async (lado) => {
      const linhas = [];
      await descreverPecaReutilizavel({ peca: 'tools/fixtures/recomeco/receita', modulo: receita(lado), cachePorPrefixo: true, pastaDoCachePorPrefixo: pasta, aoProgredir: (l) => linhas.push(l), intervaloDoProgressoMs: 1e-6 });
      return linhas;
    };
    await rodar(5);
    await rodar(50);
    const linhas = await rodar(500);
    expect(linhas.some((l) => l.includes('cache por prefixo: recomeçou'))).toBe(true);
    const passos = linhas.map((l) => /no passo (\d+) de 6/.exec(l)?.[1]).filter(Boolean).map(Number);
    expect(passos.length).toBeGreaterThan(0);
    expect(Math.min(...passos)).toBeGreaterThanOrEqual(5);
  });
});
