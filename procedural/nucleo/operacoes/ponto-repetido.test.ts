/* ponto-repetido.test.ts — a recusa do contorno que não é polígono simples diz qual ponto se repete ou quais arestas se cruzam.

   O ATRITO. O contorno com ponto repetido nunca sumiu em silêncio: `montarPerfil` gritava, `descrever-peca` saía com 1. Mas a
   mensagem dizia só "área nula, ponto repetido ou arestas que se cruzam", sem o índice, e seis receitas copiaram um limpador
   (`limpar`) para fugir de um erro que não apontava o conserto. `diagnosticarContorno`, irmão de `ehSimples`, devolve o motivo e
   os índices; `montarPerfil` os põe na mensagem, com a dica do espelhamento sobre o eixo, e `limparContorno` é a saída que a
   receita chama quando quer (o núcleo nunca deduplica sozinho: renumeraria as laterais, que são endereço salvo). */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../entrada.js';
// @ts-expect-error — módulo JavaScript sem tipos.
import { diagnosticarContorno, ehSimples } from '../contorno.js';

type Malha = { F: Map<number, any>; orfaos: any[] };
const extrudar = (perfil: unknown) => nucleo([['extrusao', { origemId: 1, perfil, altura: 0.5 }]], {}) as Malha;

/* meio perfil de revolução espelhado sobre o eixo: o ponto [0, 1] entra nas duas metades */
const ESPELHADO = [[0, 0], [0.5, 0.2], [0.4, 0.8], [0, 1], [0, 1], [-0.4, 0.8], [-0.5, 0.2]];
/* dois triângulos que se tocam no ponto [1, 1], que aparece duas vezes sem ser vizinho de si mesmo */
const GRAVATA = [[0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [1, 1]];
const CRUZADO = [[0, 0], [1, 1], [1, 0], [0, 1]];

describe('diagnosticarContorno', () => {
  it('devolve null para o polígono simples, convexo ou côncavo', () => {
    expect(diagnosticarContorno([[0, 0], [10, 0], [10, 10], [0, 10]])).toBeNull();
    expect(diagnosticarContorno([[0, 0], [60, 0], [60, 10], [10, 10], [10, 40], [0, 40]])).toBeNull();
  });

  it('diz os dois índices do ponto repetido em seguida e do que não é vizinho', () => {
    const seguido = diagnosticarContorno(ESPELHADO);
    expect(seguido.motivo).toBe('ponto-repetido');
    expect(seguido.indices).toEqual([3, 4]);
    expect(seguido.mensagem).toMatch(/o ponto 3 e o ponto 4 são o mesmo ponto \[0, 1\] e estão em seguida/);
    const afastado = diagnosticarContorno(GRAVATA);
    expect(afastado.motivo).toBe('ponto-repetido');
    expect(afastado.indices).toEqual([2, 5]);
    expect(afastado.mensagem).not.toMatch(/em seguida/);
  });

  it('o último ponto igual ao primeiro conta como repetido, com os índices 0 e n-1', () => {
    const d = diagnosticarContorno([[0, 0], [1, 0], [1, 1], [0, 0]]);
    expect(d.motivo).toBe('ponto-repetido');
    expect(d.indices).toEqual([0, 3]);
  });

  it('diz as duas arestas que se cruzam, e a área nula e a falta de pontos', () => {
    const d = diagnosticarContorno(CRUZADO);
    expect(d.motivo).toBe('arestas-se-cruzam');
    expect(d.indices).toEqual([0, 2]);
    expect(d.mensagem).toMatch(/a aresta 0 .* cruza ou toca a aresta 2/);
    expect(diagnosticarContorno([[0, 0], [1, 0], [2, 0]]).motivo).toBe('area-nula');
    expect(diagnosticarContorno([[0, 0], [1, 0]]).motivo).toBe('poucos-pontos');
  });

  it('concorda com ehSimples em milhares de polígonos pequenos, com pontos repetidos de propósito', () => {
    let semente = 12345;
    const sorteio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
    let simples = 0, naoSimples = 0;
    for (let k = 0; k < 4000; k++) {
      const n = 3 + Math.floor(sorteio() * 5);
      const pontos: number[][] = [];
      for (let q = 0; q < n; q++) {
        if (q > 0 && sorteio() < 0.15) pontos.push([...pontos[Math.floor(sorteio() * pontos.length)]]);
        else pontos.push([Math.floor(sorteio() * 4), Math.floor(sorteio() * 4)]);
      }
      const d = diagnosticarContorno(pontos);
      expect(d === null).toBe(ehSimples(pontos));
      if (d === null) simples += 1; else naoSimples += 1;
    }
    expect(simples).toBeGreaterThan(50);
    expect(naoSimples).toBeGreaterThan(50);
  });
});

describe('montarPerfil na extrusao e no lathe: a mensagem aponta o ponto', () => {
  it('extrusao com o contorno espelhado nomeia os pontos 3 e 4 e a causa do espelhamento', () => {
    const m = extrudar(ESPELHADO);
    expect(m.orfaos).toHaveLength(1);
    expect(m.orfaos[0].ref).toBe('perfil');
    const motivo = m.orfaos[0].motivo as string;
    expect(motivo).toMatch(/não é um polígono simples/);
    expect(motivo).toMatch(/o ponto 3 e o ponto 4 são o mesmo ponto \[0, 1\]/);
    expect(motivo).toMatch(/espelhado sobre um eixo/);
    expect(motivo).toMatch(/limparContorno/);
    expect(m.F.size).toBe(0);
  });

  it('extrusao com arestas que se cruzam nomeia as duas arestas', () => {
    const m = extrudar(CRUZADO);
    expect(m.orfaos[0].motivo).toMatch(/a aresta 0 .* cruza ou toca a aresta 2/);
  });

  it('o furo repetido leva o índice do furo no campo e o ponto na mensagem', () => {
    const m = nucleo([['extrusao', { origemId: 1, perfil: { retangulo: { largura: 4, profundidade: 4 } }, furos: [[[0, 0], [1, 0], [1, 0], [1, 1]]], altura: 0.5 }]], {}) as Malha;
    expect(m.orfaos[0].ref).toBe('furos[0]');
    expect(m.orfaos[0].motivo).toMatch(/o contorno do furo não é um polígono simples: o ponto 1 e o ponto 2 são o mesmo ponto \[1, 0\]/);
  });

  it('o lathe com perfil espelhado sobre o eixo e furos: [] nomeia o ponto repetido no campo perfil', () => {
    const m = nucleo([['lathe', { origemId: 1, lados: 8, perfil: [[0, 0], [0.5, 0], [0.5, 1], [0, 1], [0, 1]], furos: [] }]], {}) as Malha;
    expect(m.orfaos[0].ref).toBe('perfil');
    expect(m.orfaos[0].motivo).toMatch(/o ponto 3 e o ponto 4 são o mesmo ponto \[0, 1\]/);
  });
});
