import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { receitaDeProva } from '../fixtures/correcao-de-superficie/chapas.mjs';
import { nomesDasFaixas, persistencia, zebraNumerica } from './zebra-numerica.mjs';

const chapaDe = (nome) => {
  const receita = receitaDeProva(nome);
  return executarReceita({ ...receita, PASSOS: receita.PASSOS.filter(([op]) => op === 'subdivisao'), vaos: undefined }).neutro.chapas[0];
};
const sem = chapaDe('rede-sem-ruido');
const com = chapaDe('rede-com-ruido');

describe('persistencia', () => {
  it('uma fileira com a borda nas pontas: o pico alto morre na borda e o baixo na sela entre os dois', () => {
    const valores = [0, 3, 1, 2, 0];
    const vizinhos = [[1], [0, 2], [1, 3], [2, 4], [3]];
    const pares = persistencia(valores, vizinhos, [1, 0, 0, 0, 1]);
    expect(pares.map((p) => [p.pico, p.sela, p.persistencia]).sort((a, b) => a[0] - b[0])).toEqual([[1, 0, 3], [3, 2, 1]]);
  });
  it('um platô não dá extremo com persistência', () => {
    const pares = persistencia([1, 1, 1], [[1], [0, 2], [1]], [1, 0, 1]);
    expect(pares.every((p) => p.persistencia === 0)).toBe(true);
  });
});

describe('zebraNumerica', () => {
  it('as faixas ganham nome', () => {
    expect(nomesDasFaixas([100, 200, 500])).toEqual(['<100', '100-200', '200-500', '>=500']);
  });

  it('a chapa de controle não tem laço fechado e a com ruído tem, a taxa de base da medida', () => {
    const a = zebraNumerica(sem, { passoMm: 25 }); const b = zebraNumerica(com, { passoMm: 25 });
    expect(a.regioes[0].lacos).toBe(0);
    expect(b.regioes[0].lacos).toBeGreaterThanOrEqual(2);
    expect(b.regioes[0].lacos).toBeGreaterThan(a.regioes[0].lacos);
  });

  it('o número varia menos que o ruído de ±5 extremos entre densidades de pontos', () => {
    const lidos = [40, 25, 15].map((p) => zebraNumerica(com, { passoMm: p }).regioes[0]);
    expect(lidos[2].pontos).toBeGreaterThan(lidos[0].pontos * 3);
    const ext = lidos.map((r) => r.extremos); const lac = lidos.map((r) => r.lacos);
    expect(Math.max(...ext) - Math.min(...ext)).toBeLessThanOrEqual(1);
    expect(Math.max(...lac) - Math.min(...lac)).toBeLessThanOrEqual(1);
    const esp = lidos.map((r) => r.lacosEsperados);
    expect((Math.max(...esp) - Math.min(...esp)) / Math.max(...esp)).toBeLessThan(0.15);
  });

  it('é determinística e a caixa vazia é recusada com o que foi recebido', () => {
    expect(zebraNumerica(com, { passoMm: 40 })).toEqual(zebraNumerica(com, { passoMm: 40 }));
    expect(() => zebraNumerica(com, { caixas: { fora: { x: [1e6, 2e6] } } })).toThrow(/região 'fora' não tem face/);
    expect(() => zebraNumerica(com, { passoMm: 0 })).toThrow(/--passo espera/);
    expect(() => zebraNumerica(com, { faixas: [200, 100] })).toThrow(/--faixas espera/);
    expect(() => zebraNumerica(com, { olhar: 'w' })).toThrow(/olhar espera/);
  });

  it('o olhar pedido troca as direções lidas', () => {
    const r = zebraNumerica(com, { olhar: '+x' }).regioes[0];
    expect(r.olhar).toBe('+x');
    expect(r.direcoes.map((d) => d.eixo)).toEqual(['y', 'z']);
  });

  it('responde a --ajuda e recusa opção desconhecida', () => {
    const ajuda = spawnSync('node', ['tools/modelar/zebra-numerica.mjs', '--ajuda'], { encoding: 'utf8' });
    expect(ajuda.status).toBe(0);
    expect(ajuda.stderr).toMatch(/uso: node tools\/modelar\/zebra-numerica.mjs/);
    const ruim = spawnSync('node', ['tools/modelar/zebra-numerica.mjs', 'rede-sem-ruido', '--foo=1'], { encoding: 'utf8' });
    expect(ruim.status).toBe(2);
  });
});
