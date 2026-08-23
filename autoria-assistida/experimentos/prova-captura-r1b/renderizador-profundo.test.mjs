/* Provas R1B: o PNG é derivado, mas a oclusão é conferida no z-buffer. */
import { describe, expect, it } from 'vitest';
import { CAMERAS, capturar, capturarVistas, mascaraDaSilhueta, pngsDaCaptura, validarCaptura, validarPacoteDeVistas } from './renderizador-profundo.mjs';

const quadrado = (z, parte) => ({ vs: [`${parte}-0`, `${parte}-1`, `${parte}-2`, `${parte}-3`], parte, z });
function duasPlacas({ frente = 2, tras = 1, inverter = false } = {}) {
  const faces = [quadrado(frente, 'frente'), quadrado(tras, 'tras')];
  if (inverter) faces.reverse();
  const V = new Map();
  for (const face of faces) {
    const pontos = [[-1, -1, face.z], [1, -1, face.z], [1, 1, face.z], [-1, 1, face.z]];
    face.vs.forEach((id, indice) => V.set(id, pontos[indice]));
  }
  return { V, F: new Map(faces.map((face, indice) => [indice, face])) };
}
function caixa() {
  const V = new Map([
    ['a', [-1, -1, -1]], ['b', [1, -1, -1]], ['c', [1, 1, -1]], ['d', [-1, 1, -1]],
    ['e', [-1, -1, 1]], ['f', [1, -1, 1]], ['g', [1, 1, 1]], ['h', [-1, 1, 1]],
  ]);
  const F = new Map([
    [0, { vs: ['a', 'b', 'c', 'd'], parte: 'traseira' }], [1, { vs: ['e', 'h', 'g', 'f'], parte: 'frente' }],
    [2, { vs: ['a', 'e', 'f', 'b'], parte: 'inferior' }], [3, { vs: ['d', 'c', 'g', 'h'], parte: 'superior' }],
    [4, { vs: ['a', 'd', 'h', 'e'], parte: 'esquerda' }], [5, { vs: ['b', 'f', 'g', 'c'], parte: 'direita' }],
  ]);
  return { V, F };
}
const centro = (captura, nome) => captura[nome].slice(((captura.altura >> 1) * captura.largura + (captura.largura >> 1)) * 3, ((captura.altura >> 1) * captura.largura + (captura.largura >> 1)) * 3 + 3);
const QUADRO = { minU: -1.2, maxU: 1.2, minV: -1.2, maxV: 1.2 };

describe('R1B — renderizador profundo', () => {
  it('a face mais próxima vence mesmo quando é criada antes', () => {
    const a = capturar(duasPlacas({ inverter: false }), { camera: CAMERAS.frontal, largura: 96, altura: 96 });
    const b = capturar(duasPlacas({ inverter: true }), { camera: CAMERAS.frontal, largura: 96, altura: 96 });
    expect([...centro(a, 'identidade')]).toEqual([...centro(b, 'identidade')]);
    expect(a.facesVisiveis).toHaveLength(1);
    expect(validarCaptura(a, { exigirDeclaracao: false, exigirCameraCalibrada: false })).toBe(true);
  });

  it('trocar a profundidade troca a face exposta', () => {
    const primeira = capturar(duasPlacas({ frente: 2, tras: 1 }), { camera: CAMERAS.frontal, largura: 96, altura: 96 });
    const segunda = capturar(duasPlacas({ frente: 1, tras: 2 }), { camera: CAMERAS.frontal, largura: 96, altura: 96 });
    expect([...centro(primeira, 'identidade')]).not.toEqual([...centro(segunda, 'identidade')]);
  });

  it('emite modalidades separadas e PNGs não vazios', () => {
    const captura = capturar(duasPlacas(), { camera: CAMERAS.frontal, largura: 96, altura: 96, quadro: QUADRO, geometria: 'inteira' });
    const pngs = pngsDaCaptura(captura);
    expect(Object.keys(pngs).sort()).toEqual(['identidade', 'normais', 'profundidade', 'silhueta', 'superficie', 'wireframe']);
    for (const png of Object.values(pngs)) expect(png.length).toBeGreaterThan(100);
  });

  it('deriva a máscara exclusivamente dos pixels com profundidade visível', () => {
    const captura = capturar(duasPlacas(), { camera: CAMERAS.frontal, largura: 96, altura: 96, quadro: QUADRO });
    const mascara = mascaraDaSilhueta(captura);
    expect(mascara).toHaveLength(captura.largura * captura.altura);
    expect([...mascara].filter(Boolean)).toHaveLength([...captura.profundidade].filter((z) => z > -Infinity).length);
    expect(mascaraDaSilhueta({ largura: 96, altura: 96, profundidade: new Float64Array(96 * 96).fill(-Infinity) })).toEqual(new Uint8Array(96 * 96));
  });

  it('mantém a captura válida em resolução de medição', () => {
    const captura = capturar(duasPlacas(), { camera: CAMERAS.frontal, largura: 1024, altura: 768, quadro: QUADRO, geometria: 'inteira' });
    expect(captura.cobertura).toBeGreaterThan(0.45);
    expect(validarCaptura(captura)).toBe(true);
  });

  it('assina três vistas ortográficas da mesma malha', () => {
    const vistas = capturarVistas(caixa(), { largura: 96, altura: 96, quadro: QUADRO, geometria: 'inteira', finalidade: 'conjunto' });
    expect(Object.keys(vistas)).toEqual(['frontal', 'lateral', 'superior']);
    expect(new Set(Object.values(vistas).map((captura) => captura.assinaturaMalha)).size).toBe(1);
    expect(new Set(Object.values(vistas).map((captura) => captura.camera.assinatura)).size).toBe(3);
    for (const captura of Object.values(vistas)) expect(validarCaptura(captura)).toBe(true);
    expect(validarPacoteDeVistas(vistas)).toBe(true);
  });

  it('recusa meia peça não espelhada quando ela tenta provar o conjunto', () => {
    const vistas = capturarVistas(caixa(), { largura: 96, altura: 96, quadro: QUADRO, geometria: 'meia-peca', finalidade: 'conjunto' });
    expect(() => validarPacoteDeVistas(vistas)).toThrow(/cobertura parcial/);
    const espelhadas = capturarVistas(caixa(), { largura: 96, altura: 96, quadro: QUADRO, geometria: 'meia-peca', espelhada: true, finalidade: 'conjunto' });
    expect(validarPacoteDeVistas(espelhadas)).toBe(true);
  });

  it('recusa projeção sem área e captura sem cobertura', () => {
    const V = new Map([['a', [0, 0, 0]], ['b', [0, 0, 0]], ['c', [0, 0, 0]]]);
    expect(() => capturar({ V, F: new Map([[0, { vs: ['a', 'b', 'c'], parte: 'nula' }]]) }, { camera: CAMERAS.frontal })).toThrow(/degenerad|vetor/);
    expect(() => validarCaptura({ cobertura: 0, facesVisiveis: [], profundidade: new Float64Array() })).toThrow(/cobertura/);
  });

  it('recusa captura de aceite que reenquadra automaticamente a forma', () => {
    const captura = capturar(duasPlacas(), { camera: CAMERAS.frontal, largura: 96, altura: 96, geometria: 'inteira' });
    expect(() => validarCaptura(captura)).toThrow(/quadro ortográfico calibrado/);
  });
});
