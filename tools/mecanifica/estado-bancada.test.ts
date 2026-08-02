/* estado-bancada.test.ts — contrato headless das vistas, seleção, contexto e URL da bancada. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo novo em JavaScript, exercitado pela API pública.
import * as estadoBancada from '../../src/bancada/estado-bancada.js';

const {
  alternarSelecao,
  alvosDeEnquadramento,
  calcularVetoresExplosao,
  escreverCameraLivreNaUrl,
  escreverEstadoNaUrl,
  estadoVisualDasPartes,
  lerEstadoDaUrl,
  lerCameraLivreDaUrl,
  normalizarCameraLivre,
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
      pinca: 'normal',
      pastilha: 'oculto',
    });
  });

  it('separa enquadrar a montagem de focar seleção e preserva contexto', () => {
    const raiz = { nome: 'montagem' };
    const disco = { nome: 'disco' };
    expect(alvosDeEnquadramento({ raiz, selecionados: [disco], alvo: 'montagem' })).toEqual([raiz]);
    expect(alvosDeEnquadramento({ raiz, selecionados: [disco], modo: 'todas' })).toEqual([disco]);
    expect(alvosDeEnquadramento({ raiz, selecionados: [disco], modo: 'contexto' })).toEqual([raiz, disco]);
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
      cameraLivre: null,
    });
  });

  it('serializa a órbita livre com precisão fixa e a restaura sem runtime', () => {
    const camera = {
      posicao: [2.123456, 1.4, -3.1],
      alvo: [0.25, 0.8, 0],
      acima: [0, 1, 0],
      zoom: 1.25,
    };
    expect(escreverCameraLivreNaUrl(camera)).toBe(
      '2.12346,1.40000,-3.10000,0.25000,0.80000,0.00000,0.00000,1.00000,0.00000,1.25000',
    );
    expect(lerCameraLivreDaUrl(escreverCameraLivreNaUrl(camera))).toEqual({
      posicao: [2.12346, 1.4, -3.1],
      alvo: [0.25, 0.8, 0],
      acima: [0, 1, 0],
      zoom: 1.25,
    });
    const query = escreverEstadoNaUrl({
      vista: 'livre', cameraLivre: camera, projecao: 'ortografica',
    });
    expect(query).toBe(
      'vista=livre&camera=2.12346%2C1.40000%2C-3.10000%2C0.25000%2C0.80000%2C0.00000%2C0.00000%2C1.00000%2C0.00000%2C1.25000&projecao=ortografica',
    );
    expect(lerEstadoDaUrl(new URLSearchParams(query), [])).toMatchObject({
      vista: 'livre',
      projecao: 'ortografica',
      cameraLivre: lerCameraLivreDaUrl(escreverCameraLivreNaUrl(camera)),
    });
  });

  it('recusa câmera inválida e conserva a URL canônica literal', () => {
    expect(normalizarCameraLivre({
      posicao: [0, 0, 0], alvo: [0, 0, 0], acima: [0, 1, 0], zoom: 1,
    })).toBeNull();
    expect(lerEstadoDaUrl(new URLSearchParams('vista=livre&camera=NaN'), [])).toMatchObject({
      vista: 'isometrica', cameraLivre: null,
    });
    expect(escreverEstadoNaUrl({ vista: 'direita', projecao: 'ortografica' }))
      .toBe('vista=direita&projecao=ortografica');
  });
});
