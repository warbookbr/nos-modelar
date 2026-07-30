/* estado-bancada.test.ts — contrato headless das vistas, seleção, contexto e URL da bancada. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo novo em JavaScript, exercitado pela API pública.
import * as estadoBancada from '../../src/bancada/estado-bancada.js';

const {
  alternarSelecao,
  calcularVetoresExplosao,
  escreverEstadoNaUrl,
  estadoVisualDasPartes,
  lerEstadoDaUrl,
  normalizarSelecao,
  VISTAS_BANCADA,
} = estadoBancada;

describe('estado da bancada', () => {
  it('publica as seis vistas ortogonais e a isométrica com direções unitizáveis', () => {
    expect(Object.keys(VISTAS_BANCADA)).toEqual([
      'isometrica',
      'frontal',
      'traseira',
      'direita',
      'esquerda',
      'superior',
      'inferior',
    ]);
    for (const vista of Object.values(VISTAS_BANCADA) as any[]) {
      expect(vista.direcao).toHaveLength(3);
      expect(Math.hypot(...vista.direcao)).toBeGreaterThan(0);
    }
  });

  it('normaliza seleção e alterna uma peça sem introduzir nomes inexistentes', () => {
    const nomes = new Set(['disco', 'pinca', 'pastilha']);
    expect(normalizarSelecao(['pinca', 'inexistente', 'disco', 'pinca'], nomes))
      .toEqual(['disco', 'pinca']);
    expect(alternarSelecao(['disco'], 'pinca', true)).toEqual(['disco', 'pinca']);
    expect(alternarSelecao(['disco', 'pinca'], 'disco', true)).toEqual(['pinca']);
    expect(alternarSelecao(['disco'], 'pastilha', false)).toEqual(['pastilha']);
  });

  it('distingue montagem, contexto fantasma e isolamento', () => {
    const partes = ['disco', 'pinca', 'pastilha'];
    expect(estadoVisualDasPartes(partes, ['pinca'], 'todas')).toEqual({
      disco: 'normal',
      pinca: 'destaque',
      pastilha: 'normal',
    });
    expect(estadoVisualDasPartes(partes, ['pinca'], 'contexto')).toEqual({
      disco: 'fantasma',
      pinca: 'destaque',
      pastilha: 'fantasma',
    });
    expect(estadoVisualDasPartes(partes, ['pinca'], 'isolar')).toEqual({
      disco: 'oculto',
      pinca: 'destaque',
      pastilha: 'oculto',
    });
  });

  it('gera vetores de explosão determinísticos, inclusive no centro da montagem', () => {
    const partes = [
      { nome: 'direita', centro: [2, 0, 0] },
      { nome: 'esquerda', centro: [-2, 0, 0] },
      { nome: 'centro', centro: [0, 0, 0] },
    ];
    const a = calcularVetoresExplosao(partes);
    const b = calcularVetoresExplosao([...partes].reverse());
    expect(a).toEqual(b);
    expect(a.direita).toEqual([1, 0, 0]);
    expect(a.esquerda).toEqual([-1, 0, 0]);
    expect(Math.hypot(...a.centro)).toBeCloseTo(1);
  });

  it('faz ida e volta do estado reproduzível pela URL', () => {
    const query = escreverEstadoNaUrl({
      selecionadas: ['pinca', 'disco'],
      vista: 'direita',
      projecao: 'ortografica',
      modo: 'contexto',
      explosao: 0.42,
    });
    expect(lerEstadoDaUrl(new URLSearchParams(query), ['disco', 'pinca'])).toEqual({
      selecionadas: ['disco', 'pinca'],
      vista: 'direita',
      projecao: 'ortografica',
      modo: 'contexto',
      explosao: 0.42,
    });
  });
});
