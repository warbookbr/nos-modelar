/* subdivisao-ponto-repetido.test.mjs — a recusa geral do ponto que dois passos `subdivisao` gravam sem declaração (ciclo 5 do sedã,
   atrito 2). O nome de ponto vale uma posição só no dicionário da peça: duas gaiolas com o mesmo nome de ponto em lugares diferentes
   leem a mesma posição, e a última a gravar levava a primeira junto, sem recusa, até um espinho de 1,5 m. Agora o segundo passo para,
   com a mensagem nomeando os dois, e `compartilha` declara o ponto que a gaiola divide de propósito. */
import { describe, expect, it } from 'vitest';
import { nucleo } from './entrada.js';
import { gaiolaPorLacos } from './gaiola-por-lacos.js';

const CAIXA = (p) => ({
  vertices: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((n) => `${p}${n}`),
  faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].map((f) => f.map((k) => `${p}${'abcdefgh'[k]}`)),
});
const pontosDa = (p, dz) => Object.fromEntries([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]].map((q, k) => [`${p}${'abcdefgh'[k]}`, [q[0], q[1], q[2] + dz]]));
const passo = (id, p, extra = {}) => ['subdivisao', { origemId: id, ...CAIXA(p), niveis: 0, ...extra }];

describe('subdivisao: o ponto que dois passos gravam', () => {
  it('nomes diferentes: as duas gaiolas montam', () => {
    const st = nucleo([passo(1, 'x'), passo(2, 'y')], {}, { ...pontosDa('x', 0), ...pontosDa('y', 5) });
    expect(st.orfaos).toEqual([]);
  });

  it('o mesmo nome em dois passos, sem declaração, recusa o segundo e nomeia os dois', () => {
    const st = nucleo([passo(1, 'x'), passo(2, 'x')], {}, pontosDa('x', 0));
    expect(st.orfaos).toHaveLength(1);
    expect(st.orfaos[0]).toMatchObject({ passo: 1, op: 'subdivisao', ref: 'vertices' });
    expect(st.orfaos[0].motivo).toMatch(/o ponto 'xa' já é vértice do passo 0 \(subdivisao, origem 1\) e volta no passo 1 \(origem 2\)/);
    expect(st.orfaos[0].motivo).toMatch(/compartilha: \['xa'\]/);
  });

  it('compartilha declara o ponto que a gaiola divide de propósito, e só vale para ponto dela', () => {
    const todos = ['xa', 'xb', 'xc', 'xd', 'xe', 'xf', 'xg', 'xh'];
    expect(nucleo([passo(1, 'x'), passo(2, 'x', { compartilha: todos })], {}, pontosDa('x', 0)).orfaos).toEqual([]);
    const parcial = nucleo([passo(1, 'x'), passo(2, 'x', { compartilha: ['xa'] })], {}, pontosDa('x', 0));
    expect(parcial.orfaos[0].motivo).toMatch(/o ponto 'xb' já é vértice/);
    const alheio = nucleo([passo(1, 'x'), passo(2, 'y', { compartilha: ['xa'] })], {}, { ...pontosDa('x', 0), ...pontosDa('y', 5) });
    expect(alheio.orfaos[0].motivo).toMatch(/compartilha cita o ponto 'xa', que não é vértice deste passo/);
  });

  it('duas gaiolas por laços com o mesmo nome de gaiola colidem em todo ponto, e a recusa diz qual', () => {
    const barra = (em) => gaiolaPorLacos({ nome: 'barra', eixo: 'x', tampa: { de: 'baixo', ate: 'cima' },
      trechos: [{ nome: 'baixo', pontos: 2 }, { nome: 'frente', pontos: 3 }, { nome: 'cima', pontos: 2 }, { nome: 'tras', pontos: 3 }],
      lacos: [em, em + 50, em + 100].map((x) => ({ em: x, trechos: { baixo: [[0, 0], [0, 40]], frente: [[0, 40], [30, 40]], cima: [[30, 40], [30, 0]], tras: [[30, 0], [0, 0]] } })) });
    const a = barra(0); const b = barra(500);
    const st = nucleo([['subdivisao', { origemId: 1, ...a.passo, niveis: 0 }], ['subdivisao', { origemId: 2, ...b.passo, niveis: 0 }]], {}, { ...a.pontos, ...b.pontos });
    expect(st.orfaos).toHaveLength(1);
    expect(st.orfaos[0].motivo).toMatch(/já é vértice do passo 0 \(subdivisao, origem 1\) e volta no passo 1 \(origem 2\)/);
  });
});
