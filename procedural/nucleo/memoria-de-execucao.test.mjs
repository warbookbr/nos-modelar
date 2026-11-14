/* memoria-de-execucao.test.mjs — a memória de execução nunca muda o resultado: o neutro com memória é igual, bit a bit, ao sem memória. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, criarMemoriaDeExecucao, neutroCanonico, nucleo } from './entrada.js';
import { sha256Hex } from './sha256.js';

const CALOTA = { vertices: [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.4, 1, -0.4], [0.4, 1, -0.4], [0.4, 1, 0.4], [-0.4, 1, 0.4]],
  faces: [[0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0], [4, 7, 6, 5]], niveis: 2 };
const receita = (larguraDoCubo = 0.3, corFinal = '#112233') => [
  ['subdivisao', { origemId: 1, ...CALOTA }],
  ['parte', { nome: 'chapa', sel: { origem: { op: 'subdivisao', id: 1 } } }],
  ['cubo', { origemId: 2, larg: 1.2, alt: 0.9, prof: 1.2, em: [0, -0.2, 0] }],
  ['aparar', { origemId: 3, solido: { origem: { op: 'cubo', id: 2 } }, chapa: { op: 'subdivisao', id: 1 }, folga: 0.05, fecha: { eixo: 'y', em: 0.7 } }],
  ['parte', { nome: 'aparado', sel: { origem: { op: 'aparar', id: 3 } } }],
  ['cubo', { origemId: 4, larg: larguraDoCubo, alt: 0.2, prof: 0.2, em: [2, 0, 0] }],
  ['pincel', { modo: 'face', sel: { origem: { op: 'cubo', id: 4 } }, cor: corFinal }],
];
/* tudo o que o neutro carrega, inclusive o que fica fora da enumeração */
const impressao = (n) => sha256Hex(JSON.stringify({
  canonico: neutroCanonico(n), V: [...n.V], F: [...n.F], procedencia: n.procedencia, avisos: n.avisos, chapas: n.chapas, aberturas: n.aberturas,
  frisos: n.frisos, portas: n.facesDasPortas ? [...n.facesDasPortas] : null, partes: n.partes, origens: [...n.origens],
}));
const sem = (passos) => nucleo(passos, {}, {});
const com = (passos, memoria) => nucleo(passos, {}, {}, {}, null, [], { memoria });

describe('memória de execução', () => {
  it('a primeira execução guarda o ponto e dá o mesmo neutro que a execução sem memória', () => {
    const memoria = criarMemoriaDeExecucao();
    const referencia = impressao(sem(receita()));
    expect(impressao(com(receita(), memoria))).toBe(referencia);
    expect(memoria.estatisticas).toMatchObject({ guardados: 1, restaurados: 0 });
  });

  it('a mesma receita restaura do ponto e dá o mesmo neutro, bit a bit', () => {
    const memoria = criarMemoriaDeExecucao();
    com(receita(), memoria);
    const restaurada = com(receita(), memoria);
    expect(memoria.estatisticas.restaurados).toBe(1);
    expect(impressao(restaurada)).toBe(impressao(sem(receita())));
  });

  it('um passo mudado depois do ponto restaura do ponto e dá o mesmo neutro que a execução sem memória', () => {
    const memoria = criarMemoriaDeExecucao();
    com(receita(0.3, '#112233'), memoria);
    const mudada = com(receita(0.4, '#445566'), memoria);
    expect(memoria.estatisticas.restaurados).toBe(1);
    expect(impressao(mudada)).toBe(impressao(sem(receita(0.4, '#445566'))));
    expect(impressao(mudada)).not.toBe(impressao(sem(receita(0.3, '#112233'))));
  });

  it('um passo mudado antes do ponto não restaura', () => {
    const memoria = criarMemoriaDeExecucao();
    com(receita(), memoria);
    const passos = receita();
    passos[2][1].larg = 1.3;
    const mudada = com(passos, memoria);
    expect(memoria.estatisticas.restaurados).toBe(0);
    expect(impressao(mudada)).toBe(impressao(sem(passos)));
  });

  it('o parâmetro mudado invalida o ponto', () => {
    const memoria = criarMemoriaDeExecucao();
    const passos = receita(); passos[3][1].folga = 'f';
    nucleo(passos, { f: 0.05 }, {}, {}, null, [], { memoria });
    const outro = nucleo(passos, { f: 0.04 }, {}, {}, null, [], { memoria });
    expect(memoria.estatisticas.restaurados).toBe(0);
    expect(impressao(outro)).toBe(impressao(nucleo(passos, { f: 0.04 }, {})));
  });

  it('o estado guardado não é alterado pela execução que o restaurou', () => {
    const memoria = criarMemoriaDeExecucao();
    com(receita(0.3), memoria);
    com(receita(0.4), memoria);
    expect(impressao(com(receita(0.3), memoria))).toBe(impressao(sem(receita(0.3))));
    expect(memoria.estatisticas.restaurados).toBe(2);
  });

  it('a execução que diverge guarda também o ponto da última operação cara antes de divergir', () => {
    const comUniao = (cor) => [
      ...receita(0.3, cor).slice(0, 5),
      ['cubo', { origemId: 5, larg: 0.5, alt: 0.5, prof: 0.5, em: [4, 0, 0] }],
      ['cubo', { origemId: 6, larg: 0.5, alt: 0.5, prof: 0.5, em: [4.25, 0, 0] }],
      ['unir', { origemId: 7, solidos: [{ origem: { op: 'cubo', id: 5 } }, { origem: { op: 'cubo', id: 6 } }] }],
      ['pincel', { modo: 'face', sel: { origem: { op: 'unir', id: 7 } }, cor }],
    ];
    const memoria = criarMemoriaDeExecucao();
    com(comUniao('#111111'), memoria);
    expect(memoria.estatisticas.guardados).toBe(1);
    com(comUniao('#222222'), memoria);
    expect(memoria.estatisticas.guardados).toBe(2);
    const terceira = com(comUniao('#333333'), memoria);
    expect(memoria.estatisticas.restaurados).toBeGreaterThanOrEqual(2);
    expect(impressao(terceira)).toBe(impressao(sem(comUniao('#333333'))));
  });

  it('guarda no máximo `maximo` pontos', () => {
    const memoria = criarMemoriaDeExecucao({ maximo: 1 });
    com(receita(), memoria);
    const passos = receita(); passos[2][1].larg = 1.3;
    com(passos, memoria);
    expect(memoria.tamanho).toBe(1);
  });

  it('registro de operações próprio desliga a memória', () => {
    const memoria = criarMemoriaDeExecucao();
    nucleo(receita(), {}, {}, {}, null, [], { memoria, registroOperacoes: REGISTRO_OPERACOES });
    expect(memoria.tamanho).toBe(0);
  });
});
