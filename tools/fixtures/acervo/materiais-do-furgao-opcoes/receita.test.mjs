/* receita.test.mjs — a peça de prova das opções de material do furgão passa pelo normalizador, entrega as partes de cada grupo e opção e abre na bancada como ensaio. */
import { describe, expect, it } from 'vitest';
import receita, { GRUPOS, MATERIAIS, OPCOES, PARTES_DO_GRUPO, nomeDaParte } from './receita.js';
import { executarReceita } from '../../../../src/autoria/executar-receita.js';
import { descreverPeca } from '../../../../src/autoria/descrever-partes.js';
import { normalizarMateriais } from '../../../../src/autoria/material-da-receita.js';
import { listarAcervo, listarParaBancada } from '../../../../src/bancada/acervo-receitas.js';

describe('opções de material do furgão', () => {
  it('todos os materiais passam pelo normalizador', () => {
    expect(() => normalizarMateriais(MATERIAIS)).not.toThrow();
  });

  it('cada grupo entrega as partes de cada opção, sem órfão nem face sem parte', () => {
    const descricao = descreverPeca(executarReceita(receita).neutro);
    const esperadas = GRUPOS.flatMap((g) => OPCOES.flatMap((o) => PARTES_DO_GRUPO[g].map((p) => nomeDaParte(g, o, p))));
    expect(descricao.partes.map((p) => p.nome).sort()).toEqual(esperadas.sort());
    expect(descricao.totais.facesSemParte).toBe(0);
  });

  it('a bancada a lista como ensaio, fora do acervo', () => {
    const entrada = listarParaBancada().find((e) => e.id === 'materiais-do-furgao-opcoes');
    expect(entrada?.ensaio).toBe(true);
    expect(listarAcervo().some((e) => e.id === 'materiais-do-furgao-opcoes')).toBe(false);
  });
});
