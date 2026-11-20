/* Testes de prancha-coerencia.mjs: conjunto coerente de quatro pranchas parciais
   e detecção de divergências injetadas em envelope, landmark, camada e medida M. */
import { describe, expect, it } from 'vitest';
import { conferirCoerencia } from './prancha-coerencia.mjs';

const AUTORIA = {
  versao: 'mecanifica.prancha-autoria@1',
  estado: 'pronta',
  modo: 'parcial',
  confianca: 'alta',
  intencao: 'fixture sintética de caixa para teste de coerência entre vistas',
  procedencias: [{ id: 'f', tipo: 'medidas-declaradas', evidencia: 'fixture sintética 2000 x 1000 x 800 mm' }],
  incertezas: [],
};

function criarQuatroVistas({
  alturaFrontal = 800,
  zVidroPlanta = [300, 600],
  xVidroFrontal = 350,
  yTetoTraseira = 800,
  medidaLarguraTraseira = 1000,
} = {}) {
  const lim = { zMin: -1000, zMax: 1000, yMax: Math.max(800, alturaFrontal, yTetoTraseira), xMax: 500 };

  const lateral = {
    arquivo: 'lateral.prancha.mjs',
    medidas: { comprimento: 2000, largura: 1000, altura: 800 },
    spec: {
      titulo: 'lateral', subtitulo: 'fixture', escala: 0.3,
      tela: { largura: 900, altura: 500 }, limites: lim,
      vistas: { lateral: { x: 80, y: 80, leitura: 'projecao' } },
      envelope: { comprimento: 2000, altura: 800 },
      autoria: AUTORIA,
      camadas: [
        { vista: 'lateral', contorno: true, nome: 'corpo', tipo: 'poli', fechado: true, pts: [[-1000, 0], [1000, 0], [1000, 800], [-1000, 800]] },
        { vista: 'lateral', classe: 'vidro', nome: 'paraBrisa', tipo: 'poli', fechado: true, pts: [[300, 500], [600, 500], [600, 750], [300, 750]] },
      ],
      landmarks: [{ id: 'teto', vista: 'lateral', em: [0, 800], sobre: 'corpo' }],
    },
  };

  const frontal = {
    arquivo: 'frontal.prancha.mjs',
    medidas: { comprimento: 2000, largura: 1000, altura: 800 },
    spec: {
      titulo: 'frontal', subtitulo: 'fixture', escala: 0.3,
      tela: { largura: 600, altura: 500 }, limites: lim,
      vistas: { frontal: { x: 80, y: 80, leitura: 'projecao' } },
      envelope: { largura: 1000, altura: alturaFrontal },
      autoria: AUTORIA,
      camadas: [
        { vista: 'frontal', contorno: true, nome: 'silhueta', tipo: 'poli', fechado: true, pts: [[-500, 0], [500, 0], [500, alturaFrontal], [-500, alturaFrontal]] },
        { vista: 'frontal', classe: 'vidro', nome: 'paraBrisa', tipo: 'poli', fechado: true, pts: [[-xVidroFrontal, 500], [xVidroFrontal, 500], [xVidroFrontal, 750], [-xVidroFrontal, 750]] },
      ],
      landmarks: [{ id: 'teto', vista: 'frontal', em: [0, alturaFrontal], sobre: 'silhueta' }],
    },
  };

  const traseira = {
    arquivo: 'traseira.prancha.mjs',
    medidas: { comprimento: 2000, largura: medidaLarguraTraseira, altura: 800 },
    spec: {
      titulo: 'traseira', subtitulo: 'fixture', escala: 0.3,
      tela: { largura: 600, altura: 500 }, limites: lim,
      vistas: { traseira: { x: 80, y: 80, leitura: 'projecao' } },
      envelope: { largura: 1000, altura: yTetoTraseira },
      autoria: AUTORIA,
      camadas: [
        { vista: 'traseira', contorno: true, nome: 'silhueta', tipo: 'poli', fechado: true, pts: [[-500, 0], [500, 0], [500, yTetoTraseira], [-500, yTetoTraseira]] },
      ],
      landmarks: [{ id: 'teto', vista: 'traseira', em: [0, yTetoTraseira], sobre: 'silhueta' }],
    },
  };

  const planta = {
    arquivo: 'superior.prancha.mjs',
    medidas: { comprimento: 2000, largura: 1000, altura: 800 },
    spec: {
      titulo: 'planta', subtitulo: 'fixture', escala: 0.3,
      tela: { largura: 900, altura: 500 }, limites: lim,
      vistas: { planta: { x: 80, y: 80, leitura: 'projecao' } },
      envelope: { comprimento: 2000, largura: 1000 },
      autoria: AUTORIA,
      camadas: [
        { vista: 'planta', contorno: true, nome: 'silhueta', tipo: 'poli', fechado: true, pts: [[-1000, -500], [1000, -500], [1000, 500], [-1000, 500]] },
        { vista: 'planta', classe: 'vidro', nome: 'paraBrisa', tipo: 'poli', fechado: true, pts: [[zVidroPlanta[0], -350], [zVidroPlanta[1], -350], [zVidroPlanta[1], 350], [zVidroPlanta[0], 350]] },
      ],
      landmarks: [],
    },
  };

  return [lateral, frontal, traseira, planta];
}

describe('prancha-coerencia', () => {
  it('aprova conjunto coerente de quatro vistas sem divergências', () => {
    const res = conferirCoerencia(criarQuatroVistas());
    expect(res.ok).toBe(true);
    expect(res.divergencias).toEqual([]);
    expect(res.vistas).toEqual(['lateral', 'frontal', 'traseira', 'planta']);
  });

  it('acusa divergência de envelope e landmark quando frontal tem altura diferente', () => {
    const res = conferirCoerencia(criarQuatroVistas({ alturaFrontal: 840 }));
    expect(res.ok).toBe(false);
    expect(res.divergencias.some((d) => d.includes('envelope eixo y') && d.includes('40 mm'))).toBe(true);
    expect(res.divergencias.some((d) => d.includes('landmark "teto"') && d.includes('40 mm'))).toBe(true);
  });

  it('acusa divergência longitudinal (z) em camada compartilhada entre lateral e planta', () => {
    const res = conferirCoerencia(criarQuatroVistas({ zVidroPlanta: [360, 660] }));
    expect(res.ok).toBe(false);
    expect(res.divergencias.some((d) => d.includes('camada "paraBrisa" no eixo z') && d.includes('60 mm'))).toBe(true);
  });

  it('acusa divergência transversal (x) em camada compartilhada entre frontal e planta', () => {
    const res = conferirCoerencia(criarQuatroVistas({ xVidroFrontal: 420 }));
    expect(res.ok).toBe(false);
    expect(res.divergencias.some((d) => d.includes('camada "paraBrisa" no eixo x') && d.includes('70 mm'))).toBe(true);
  });

  it('acusa divergência de medida rígida M entre pranchas', () => {
    const res = conferirCoerencia(criarQuatroVistas({ medidaLarguraTraseira: 1050 }));
    expect(res.ok).toBe(false);
    expect(res.divergencias.some((d) => d.includes('M.largura'))).toBe(true);
  });
});
