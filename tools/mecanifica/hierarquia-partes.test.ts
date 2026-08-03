/* hierarquia-partes.test.ts — árvore semântica sem Three.js ou geometria. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo neutro em JavaScript, exercitado pela API pública.
import { nomesDaSubarvore } from '../../src/autoria/hierarquia-partes.js';

const HIERARQUIA = [
  { nome: 'pastilhaExterna', pai: 'pinca' },
  { nome: 'disco', pai: null },
  { nome: 'pistao', pai: 'pinca' },
  { nome: 'vedacao', pai: 'pistao' },
  { nome: 'pinca', pai: null },
  { nome: 'pastilhaInterna', pai: 'pinca' },
];

describe('nomesDaSubarvore', () => {
  it('inclui raiz e descendentes em ordem estável, mesmo com entrada embaralhada', () => {
    expect(nomesDaSubarvore(HIERARQUIA, 'pinca')).toEqual([
      'pinca', 'pastilhaExterna', 'pastilhaInterna', 'pistao', 'vedacao',
    ]);
  });

  it('não confunde uma folha com a árvore inteira', () => {
    expect(nomesDaSubarvore(HIERARQUIA, 'vedacao')).toEqual(['vedacao']);
  });

  it('recusa raiz, pai, duplicidade e ciclo inválidos em vez de selecionar parcialmente', () => {
    expect(() => nomesDaSubarvore(HIERARQUIA, 'inexistente')).toThrow(/não existe parte/);
    expect(() => nomesDaSubarvore([{ nome: 'filho', pai: 'ausente' }], 'filho')).toThrow(/pai inexistente/);
    expect(() => nomesDaSubarvore([{ nome: 'a', pai: null }, { nome: 'a', pai: null }], 'a')).toThrow(/mais de uma vez/);
    expect(() => nomesDaSubarvore([{ nome: 'a', pai: 'b' }, { nome: 'b', pai: 'a' }], 'a')).toThrow(/ciclo de hierarquia/);
    expect(() => nomesDaSubarvore([
      { nome: 'raizValida', pai: null }, { nome: 'a', pai: 'b' }, { nome: 'b', pai: 'a' },
    ], 'raizValida')).toThrow(/ciclo de hierarquia/);
  });
});
