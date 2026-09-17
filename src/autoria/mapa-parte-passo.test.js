/* mapa-parte-passo.test.js — o mapa acha o passo que constrói cada parte. */
import { describe, it, expect } from 'vitest';
import { mapearParteParaPasso } from './mapa-parte-passo.js';
import receitaDaBicicleta from '../../prototipos/procedural/v3/pecas/bicicleta-quadro/receita.js';

describe('mapearParteParaPasso', () => {
  it('liga a parte ao passo que criou a geometria que ela seleciona', () => {
    const mapa = mapearParteParaPasso({
      PASSOS: [
        ['cilindro', { origemId: 'haste', raio: 1 }],
        ['parte', { nome: 'haste', sel: { origem: { op: 'cilindro', id: 'haste' } } }],
      ],
    });
    expect(mapa.partes).toHaveLength(1);
    expect(mapa.partes[0].parte).toBe('haste');
    expect(mapa.partes[0].posicaoDoPasso).toBe(1);
    expect(mapa.partes[0].construtores).toEqual([{ posicao: 0, op: 'cilindro' }]);
  });

  it('segue o alias até todas as origens que ele une', () => {
    const mapa = mapearParteParaPasso({
      PASSOS: [
        ['cilindro', { origemId: 'tubo' }],
        ['disco', { origemId: 'tampa' }],
        ['parte', { nome: 'corpo', sel: { alias: 'tudo' } }],
      ],
      ALIASES: [['tudo', { unir: [
        { origem: { op: 'cilindro', id: 'tubo' } },
        { origem: { op: 'disco', id: 'tampa' } },
      ] }]],
    });
    expect(mapa.partes[0].alias).toBe('tudo');
    expect(mapa.partes[0].construtores.map((c) => c.op)).toEqual(['cilindro', 'disco']);
  });

  it('parte que seleciona origem que nenhum passo cria é apontada', () => {
    const mapa = mapearParteParaPasso({
      PASSOS: [['parte', { nome: 'fantasma', sel: { origem: { op: 'loft', id: 'nada' } } }]],
    });
    expect(mapa.semConstrutor).toEqual(['fantasma']);
  });

  it('na bicicleta, toda parte nomeada tem passo que a constrói', () => {
    const mapa = mapearParteParaPasso(receitaDaBicicleta);
    expect(mapa.partes.length).toBeGreaterThan(5);
    expect(mapa.semConstrutor).toEqual([]);
  });
});
