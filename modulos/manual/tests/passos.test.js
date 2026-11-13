/* passos.test.js — o agrupamento de etapas seguidas, o texto por passo e os nomes de exibição, sobre montagens mínimas. */
import { describe, expect, it } from 'vitest';
import { comNomesExibidos, nomeDeExibicao, parametrosEmTexto } from '../src/lista-de-pecas.js';
import { montagemDoPasso, passosDaMontagem } from '../src/passos.js';

const malha = () => ({ V: new Map([[1, [0, 0, 0]], [2, [0.1, 0.1, 0.1]]]), F: new Map([[1, { vs: [1, 2], cor: '#336699' }]]), materiais: {} });
const peca = (id, ref, parametros) => ({ id, caminho: [id], alvo: { tipo: 'peca', ref }, definicao: { parametros, neutro: malha() } });
const montagem = (instancias) => ({ id: 'm', instancias });
const ids = ['a1', 'a2', 'b1', 'a3'];
const m = montagem([peca('a1', 'x/grampo-ponta-30', { comprimento: 500 }), peca('a2', 'x/grampo-ponta-30', { comprimento: 500 }), peca('b1', 'x/grampo-ponta-30', { comprimento: 400 }), peca('a3', 'x/grampo-ponta-30', { comprimento: 500 })]);

describe('passos agrupados', () => {
  it('junta só etapas seguidas com a mesma peça e os mesmos parâmetros, sem reordenar', () => {
    const { passos } = passosDaMontagem(m, ids);
    expect(passos.map((p) => p.etapas)).toEqual([['a1', 'a2'], ['b1'], ['a3']]);
    expect(passos.map((p) => p.quantidade)).toEqual([2, 1, 1]);
    expect(passos[0].lista.pecas[0].quantidade).toBe(2);
  });
  it('--sem-agrupar mantém um passo por etapa', () => {
    expect(passosDaMontagem(m, ids, { agrupar: false }).passos.map((p) => p.etapas)).toEqual([['a1'], ['a2'], ['b1'], ['a3']]);
  });
  it('o destaque do passo cobre todas as instâncias do grupo e as anteriores ficam esmaecidas', () => {
    const { passos } = passosDaMontagem(m, ids);
    const cores = (mont) => mont.instancias.map((i) => [...i.definicao.neutro.F.values()][0].cor);
    const ultimoDoGrupo = montagemDoPasso(m, passos, 0);
    expect(cores(ultimoDoGrupo)).toEqual(['#e8590c', '#e8590c']);
    const segundo = cores(montagemDoPasso(m, passos, 1));
    expect(segundo[2]).toBe('#e8590c');
    expect(segundo[0]).not.toBe('#e8590c');
  });
});

describe('texto por passo', () => {
  it('instruções iguais saem uma vez, diferentes saem todas na ordem, e a etapa sem texto sai sem o campo', () => {
    const textos = { a1: { instrucao: 'Encaixe.', avisos: ['Confira.'] }, a2: { instrucao: 'Encaixe.', avisos: ['Confira.', 'Aperte.'] }, b1: { instrucao: 'Outra.' } };
    const { passos } = passosDaMontagem(m, ids, { textos });
    expect(passos[0].instrucoes).toEqual(['Encaixe.']);
    expect(passos[0].avisos).toEqual(['Confira.', 'Aperte.']);
    expect(passos[1].instrucoes).toEqual(['Outra.']);
    expect(Object.hasOwn(passos[1], 'avisos')).toBe(false);
    expect(Object.hasOwn(passos[2], 'instrucoes')).toBe(false);
    const diferentes = passosDaMontagem(m, ids, { textos: { a1: { instrucao: 'Um.' }, a2: { instrucao: 'Dois.' } } }).passos[0];
    expect(diferentes.instrucoes).toEqual(['Um.', 'Dois.']);
  });
});

describe('nomes de exibição', () => {
  it('usa o declarado e, na falta dele, o último trecho do caminho legível', () => {
    expect(nomeDeExibicao('instalacao-solar/perfil')).toBe('Perfil');
    expect(nomeDeExibicao('instalacao-solar/grampo-ponta-30')).toBe('Grampo ponta 30');
    expect(nomeDeExibicao('instalacao-solar/suporte-l', { 'instalacao-solar/suporte-l': 'Suporte em L' })).toBe('Suporte em L');
    expect(comNomesExibidos({ pecas: [{ nome: 'x/y-z' }] }).pecas[0].nomeExibido).toBe('Y z');
  });
  it('escreve os parâmetros com nome legível e em milímetro', () => {
    expect(parametrosEmTexto({ comprimento: 500, posicaoDoSuporte: 151.5 })).toBe('comprimento 500 mm, posicao do suporte 151,5 mm');
  });
});

describe('detalhe do passo agrupado', () => {
  it('só a primeira instância do grupo fica em destaque no detalhe', () => {
    const { passos } = passosDaMontagem(m, ids);
    const cor = (mont) => mont.instancias.map((i) => [...i.definicao.neutro.F.values()][0].cor);
    const detalhe = montagemDoPasso(m, passos, 0, new Map(), { detalhe: true });
    expect(cor(detalhe)[0]).toBe('#e8590c');
    expect(cor(detalhe)[1]).not.toBe('#e8590c');
    expect(detalhe.instancias[0].caminho[0]).toBe('passo-em-destaque');
  });
  it('o nome de parâmetro declarado vale sobre o derivado', () => {
    expect(parametrosEmTexto({ posicaoDoSuporte: 151 }, { posicaoDoSuporte: 'posição do suporte' })).toBe('posição do suporte 151 mm');
  });
});
