/* gaiola-por-rede-marcas.test.mjs — a opção `marcarCurvas` da `gaiolaPorRede` (fatia 5 do plano das ferramentas de correção de superfície):
 * as curvas vão ao passo, um trecho usado por entrada, com a continuidade declarada; sem a opção o passo é o de sempre. */
import { describe, expect, it } from 'vitest';
import { gaiolaPorRede } from './gaiola-por-rede.js';

const definicao = (extra = {}) => ({
  passo: 50, fora: [0, 1, 0],
  nos: { A: [0, 0, 0], B: [200, 0, 0], C: [400, 0, 0], D: [0, 0, 200], E: [200, 0, 200], F: [400, 0, 200] },
  curvas: [
    { nome: 'baixo', pontos: ['A', 'B', 'C'] }, { nome: 'cima', pontos: ['D', 'E', 'F'] },
    { nome: 'esquerda', pontos: ['A', 'D'] }, { nome: 'meio', pontos: ['B', [200, 10, 100], 'E'], continuidade: 'G1' }, { nome: 'direita', pontos: ['C', 'F'] },
  ],
  retalhos: [{ nome: 'r1', borda: [{ curva: 'baixo', de: 'A', ate: 'B' }, 'meio', { curva: 'cima', de: 'E', ate: 'D' }, 'esquerda'] },
    { nome: 'r2', borda: [{ curva: 'baixo', de: 'B', ate: 'C' }, 'direita', { curva: 'cima', de: 'F', ate: 'E' }, 'meio'] }],
  ...extra,
});

describe('gaiolaPorRede: marcarCurvas', () => {
  it('cada curva vai ao passo com os nomes de ponto ao longo dela e a continuidade, e sem a opção o passo não muda', () => {
    const sem = gaiolaPorRede(definicao()); const com = gaiolaPorRede(definicao({ marcarCurvas: true }));
    expect(sem.passo.curvas).toBeUndefined();
    const { curvas, ...resto } = com.passo;
    expect(resto).toEqual(sem.passo);
    expect(curvas.map((c) => c.nome)).toEqual(['baixo', 'cima', 'esquerda', 'meio', 'direita']);
    expect(curvas.find((c) => c.nome === 'meio')).toEqual({ nome: 'meio', pontos: com.linhas.meio, continuidade: 'G1' });
    expect(curvas.find((c) => c.nome === 'baixo').pontos).toEqual(com.linhas.baixo);
  });

  it('marcarCurvas só aceita true ou false', () => {
    expect(() => gaiolaPorRede(definicao({ marcarCurvas: 'sim' }))).toThrow(/marcarCurvas é "sim"; precisa ser true/);
  });
});
