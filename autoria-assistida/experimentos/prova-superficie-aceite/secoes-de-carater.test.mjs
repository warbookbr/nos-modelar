import { describe, expect, it } from 'vitest';
import { ESTACOES_DE_CARATER, avaliarSecao, assinaturaDasSecoes, construirPeleDianteira } from './secoes-de-carater.mjs';

describe('prova R2 por seções de caráter', () => {
  it('declara estações semânticas antes de gerar a pele', () => {
    expect(ESTACOES_DE_CARATER.map((s) => s.nome)).toEqual(['nariz', 'frente', 'inicio-do-arco', 'eixo-da-roda', 'fim-do-arco', 'cowl']);
    expect(assinaturaDasSecoes()).toContain('eixo-da-roda@1325:ombro=965,900');
  });

  it('mantém o bojo do capô acima da corda e uma quebra de ombro lida por nome', () => {
    for (const estacao of ESTACOES_DE_CARATER) {
      const pontos = avaliarSecao(estacao);
      expect(pontos[1][1]).toBeGreaterThan(estacao.eixoDoCapo);
      expect(pontos[2]).toEqual(estacao.quebraDeOmbro);
      expect(pontos[3][0]).toBeGreaterThan(pontos[2][0]);
    }
  });

  it('gera somente quads e preserva as três regiões da mesma pele', () => {
    const pele = construirPeleDianteira();
    expect(pele.F.size).toBe(42);
    expect([...pele.F.values()].every((f) => f.vs.length === 4)).toBe(true);
    expect(new Set([...pele.F.values()].map((f) => f.parte))).toEqual(new Set(['capo', 'quebraDeOmbro', 'flanco', 'arcoDeRoda', 'gradeLocalDoArco', 'gradeLocalDoFarol']));
  });

  it('deixa o centro do arco e o retalho do farol fora da pele', () => {
    const pele = construirPeleDianteira();
    expect(pele.aberturas.arcoDeRoda.loop).toHaveLength(11);
    expect(pele.aberturas.farol.removida).toBe(true);
    expect(pele.aberturas.farol.loop).toHaveLength(4);
  });
});
