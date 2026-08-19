/* Testes do motor de prancha: filete, âncora proporcional e métrica. O que se
   prova aqui é o que o plano 2026-08-19-motor-de-prancha-medida pediu — que o
   desenho pare de abaular sozinho e que o defeito seja pego por número. */
import { describe, expect, it } from 'vitest';
import * as G from './prancha-geometria.mjs';
import { criarAncoras, prancha } from './prancha.mjs';

const RAMPA = [[0, 0], [1000, 600, 300], [3000, 400]];

describe('filete', () => {
  it('mantém reta a rampa com um único filete, onde a spline abaulava', () => {
    const comFilete = G.filete(RAMPA);
    const comSpline = G.suave([[0, 0], [1000, 600], [3000, 400]]);
    expect(G.retidao(comFilete)).toBeGreaterThan(0.85);
    expect(G.retidao(comSpline)).toBeLessThan(0.5);
    expect(G.inversoes(comFilete)).toBe(0);
    /* O discriminador real: giro concentrado num raio curto contra giro
       espalhado pela linha inteira. */
    expect(G.concentracaoDoGiro(comFilete)).toBeLessThan(0.15);
    expect(G.concentracaoDoGiro(comSpline)).toBeGreaterThan(0.35);
  });

  it('honra o raio pedido no vértice', () => {
    expect(G.raioMinimo(G.filete(RAMPA))).toBeCloseTo(300, 0);
  });

  it('trata raio zero como canto vivo', () => {
    const vivo = G.filete([[0, 0], [1000, 600], [3000, 400]]);
    expect(vivo).toHaveLength(3);
  });

  it('limita o filete a metade do menor segmento vizinho', () => {
    const apertado = G.filete([[0, 0], [100, 0, 5000], [100, 100]]);
    expect(G.raioMinimo(apertado)).toBeLessThan(5000);
    expect(Number.isFinite(G.raioMinimo(apertado))).toBe(true);
  });

  it('fecha o anel quando pedido', () => {
    const q = G.filete([[0, 0], [100, 0, 20], [100, 100, 20], [0, 100, 20]], { fechado: true });
    expect(q[0]).toEqual(q[q.length - 1]);
  });
});

describe('âncoras proporcionais', () => {
  it('resolve fração de entre-eixos, altura e meia largura', () => {
    const a = criarAncoras({ entreEixos: 2650, altura: 1190, meiaLargura: 1000 });
    expect(a.fz(0)).toBe(-1325);
    expect(a.fz(1)).toBe(1325);
    expect(a.fz(0.5)).toBe(0);
    expect(a.fy(0.5)).toBe(595);
    expect(a.fx(0.5)).toBe(500);
  });

  it('reposiciona o ponto ancorado quando o entre-eixos muda', () => {
    const curto = criarAncoras({ entreEixos: 2400, altura: 1190, meiaLargura: 1000 });
    const longo = criarAncoras({ entreEixos: 2900, altura: 1190, meiaLargura: 1000 });
    expect(longo.fz(0.75)).toBeGreaterThan(curto.fz(0.75));
  });
});

const base = (camadas) => ({
  titulo: 't',
  subtitulo: 's',
  escala: 0.1,
  tela: { largura: 400, altura: 300 },
  limites: { zMin: -100, zMax: 100, yMax: 100, xMax: 100 },
  vistas: { lateral: { x: 10, y: 10 } },
  camadas,
});

describe('métrica', () => {
  it('acusa contorno aberto', () => {
    const { relatorio } = prancha(base([
      { vista: 'lateral', contorno: true, tipo: 'poli', pts: [[-100, 0], [100, 0]] },
      { vista: 'lateral', contorno: true, tipo: 'poli', pts: [[-100, 80], [100, 80]] },
    ]));
    expect(relatorio.porVista.lateral.contornoFechado).toBe(false);
    expect(relatorio.alertas.join(' ')).toMatch(/não fecha/);
  });

  it('aceita contorno que fecha nas pontas', () => {
    const { relatorio } = prancha(base([
      { vista: 'lateral', contorno: true, tipo: 'poli', fechado: true, pts: [[-100, 0], [100, 0], [100, 80], [-100, 80]] },
    ]));
    expect(relatorio.porVista.lateral.contornoFechado).toBe(true);
    expect(relatorio.alertas).toHaveLength(0);
  });

  it('acusa detalhe que escapou do contorno', () => {
    const { relatorio } = prancha(base([
      { vista: 'lateral', contorno: true, tipo: 'poli', fechado: true, pts: [[-100, 0], [100, 0], [100, 80], [-100, 80]] },
      { vista: 'lateral', classe: 'painel', tipo: 'poli', pts: [[-140, 40], [140, 40]] },
    ]));
    expect(relatorio.porVista.lateral.pontosForaDoContorno).toBeGreaterThan(0);
    expect(relatorio.alertas.join(' ')).toMatch(/fora do contorno/);
  });

  it('reprova cúpula onde a especificação declarou rampa', () => {
    const { relatorio } = prancha(base([{
      vista: 'lateral', nome: 'teto', tipo: 'suave',
      pts: [[-100, 40], [0, 90], [100, 60]],
      esperado: { concentracaoMax: 0.3 },
    }]));
    expect(relatorio.alertas.join(' ')).toMatch(/abaulou/);
  });

  it('aprova a mesma linha traçada com filete', () => {
    const { relatorio } = prancha(base([{
      vista: 'lateral', nome: 'teto', pts: [[-100, 40], [0, 90, 30], [100, 60]],
      esperado: { concentracaoMax: 0.3, inversoesMax: 0 },
    }]));
    expect(relatorio.alertas).toHaveLength(0);
    expect(relatorio.porCamada.teto.inversoes).toBe(0);
  });
});

describe('curvatura medida por janela de arco', () => {
  it('não confunde densidade de amostragem com forma', () => {
    /* Um círculo tem giro perfeitamente espalhado. A medida por vértice dizia o
       contrário porque o giro fica preso nos vértices originais da polilinha. */
    expect(G.concentracaoDoGiro(G.circulo([0, 0], 500))).toBeGreaterThan(0.8);
    expect(G.concentracaoDoGiro(G.circulo([0, 0], 500, { lados: 360 }))).toBeGreaterThan(0.8);
    expect(G.retidao(G.circulo([0, 0], 500))).toBeLessThan(0.1);
  });

  it('dá reta perfeita para uma reta e detecta o S', () => {
    expect(G.retidao(G.poli([[0, 0], [1000, 0]]))).toBe(1);
    expect(G.inversoes(G.suave([[0, 0], [500, 300], [1000, 0], [1500, -300]]))).toBeGreaterThan(0);
  });
});

describe('determinismo', () => {
  it('produz o mesmo SVG em execuções repetidas', () => {
    const spec = base([{ vista: 'lateral', pts: [[-100, 0], [0, 60, 25], [100, 20]] }]);
    expect(prancha(spec).svg).toBe(prancha(spec).svg);
  });
});
