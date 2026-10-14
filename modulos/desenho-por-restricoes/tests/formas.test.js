/* formas.test.js — as outras relações e partes do formato (arco, círculo, barra, polígono, paralela, perpendicular, igual, ângulo,
   sobre um círculo e tangência entre círculos) resolvem na geometria conhecida, e a tangência pelo lado errado reprova. */
import { describe, expect, it } from 'vitest';
import { desenhar } from '../src/index.js';
import { chapa, duasRodas, meiaLua } from './formas.js';

describe('a chapa com furo e trava', () => {
  it('resolve num retângulo de 200 por 100, com o furo a 50 do chão e a trava a 45 graus', async () => {
    const { relatorio, contornos } = await desenhar(chapa());
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.grausDeLiberdade).toBe(0);
    expect(relatorio.avisos).toEqual([]);
    const p = relatorio.medidas.pontos;
    expect(p.A).toEqual([0, 0]); expect(p.B).toEqual([200, 0]); expect(p.C).toEqual([200, 100]); expect(p.D).toEqual([0, 100]);
    expect(p.F).toEqual([100, 50]);
    expect(p.Z[0]).toBeCloseTo(100 + 20 * Math.SQRT1_2, 3); expect(p.Z[1]).toBeCloseTo(50 + 20 * Math.SQRT1_2, 3);
    expect(relatorio.medidas.partes.trava.comprimentoMm).toBe(20);
    expect(relatorio.medidas.partes.trava.anguloGraus).toBe(45);
    expect(contornos.regioes.chapa.contornoMm).toEqual([[0, 0], [200, 0], [200, 100], [0, 100]]);
  });

  it('a região de uma parte escondida é o que sobra dela: a chapa menos o furo e a trava, que ficam à frente', async () => {
    const { contornos } = await desenhar(chapa());
    const poligono = 0.5 * 64 * 400 * Math.sin((2 * Math.PI) / 64);
    expect(contornos.regioes.furo.areaMm2).toBeCloseTo(poligono - 20 * 4 * 0.97, -1);
    /* O contorno externo da chapa é o retângulo inteiro; a área desconta o furo, como a de uma região da imagem. */
    expect(contornos.regioes.chapa.areaMm2).toBeLessThan(20000 - 1100);
    expect(contornos.regioes.chapa.areaMm2).toBeGreaterThan(20000 - poligono - 5);
    expect(contornos.silhueta.contornoMm).toEqual([[0, 0], [200, 0], [200, 100], [0, 100]]);
    expect(contornos.silhueta.pedacos).toHaveLength(1);
  });

  it('sem a ordem de profundidade, avisa as sobreposições em vez de esconder uma parte atrás da outra', async () => {
    const d = chapa();
    delete d.frenteParaFundo;
    const { relatorio, contornos } = await desenhar(d);
    expect(relatorio.sobrepostas.map((s) => [s.a, s.b])).toEqual([['chapa', 'furo'], ['chapa', 'trava'], ['furo', 'trava']]);
    expect(relatorio.avisos.join('\n')).toMatch(/as partes "chapa" e "furo" se sobrepõem em \d+ mm² e o desenho não declara "frenteParaFundo"/);
    expect(contornos.regioes.chapa.areaMm2).toBe(20000);
  });
});

describe('o arco', () => {
  it('uma meia-lua de raio 50 no sentido anti-horário fica na metade de cima, fechada pela corda', async () => {
    const { relatorio, contornos } = await desenhar(meiaLua());
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.medidas.pontos.S).toEqual([50, 100]);
    expect(relatorio.medidas.pontos.E).toEqual([-50, 100]);
    expect(relatorio.medidas.partes.lua).toMatchObject({ tipo: 'arco', raioMm: 50, hMin: -50, hMax: 50, vMin: 100, vMax: 150 });
    expect(contornos.regioes.lua.areaMm2).toBeCloseTo(16 * 2500 * Math.sin(Math.PI / 32), 0);
    /* 16 segmentos por quarto de volta: 33 pontos no meio círculo, e a corda fecha. */
    expect(contornos.regioes.lua.contornoMm).toHaveLength(33);
  });

  it('com "fecha": "centro" o setor leva o centro como vértice', async () => {
    const d = meiaLua();
    d.partes.lua.fecha = 'centro';
    const { contornos } = await desenhar(d);
    expect(contornos.regioes.lua.contornoMm).toHaveLength(34);
    expect(contornos.regioes.lua.contornoMm).toContainEqual([0, 100]);
  });
});

describe('a tangência entre círculos', () => {
  it('por fora com o chute afastado: o centro da pequena fica a 65 do centro da grande', async () => {
    const { relatorio } = await desenhar(duasRodas([100, 100], 'fora'));
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.medidas.pontos.Q).toEqual([65, 100]);
  });

  it('por dentro com o chute próximo: a distância dos centros é a diferença dos raios', async () => {
    const { relatorio } = await desenhar(duasRodas([10, 100], 'dentro'));
    expect(relatorio.estado).toBe('resolvido');
    expect(relatorio.medidas.pontos.Q).toEqual([15, 100]);
  });

  it('o toque pelo lado errado reprova dizendo o que a relação pediu e o que saiu', async () => {
    for (const [chute, pedido, ficou] of [[[10, 100], 'fora', 'dentro'], [[100, 100], 'dentro', 'fora']]) {
      const { relatorio, texto } = await desenhar(duasRodas(chute, pedido));
      expect(relatorio.estado).toBe('lado trocado');
      expect(relatorio.ladosTrocados).toEqual([expect.objectContaining({ relacao: 'se tocam', pedido, ficou })]);
      expect(texto).toMatch(new RegExp(`pede os círculos "grande" e "pequena" tangentes por ${pedido}, e eles ficaram tangentes por ${ficou}`));
    }
  });
});

describe('o raio solto', () => {
  it('um círculo sem relação de raio e com chute fica solto, e o relatório diz o raio', async () => {
    const d = duasRodas();
    d.relacoes = d.relacoes.filter((r) => r.nome !== 'raio da pequena' && r.nome !== 'se tocam');
    d.partes.pequena.circulo.chute = 25;
    d.relacoes.push({ nome: 'Q no eixo', sobre: ['Q', 'eixo'] });
    const { relatorio, texto } = await desenhar(d);
    expect(relatorio.estado).toBe('solto');
    expect(relatorio.soltas.raios).toEqual(['pequena']);
    expect(texto).toMatch(/soltos: .*o raio de "pequena"/);
  });
});
