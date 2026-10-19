/* tolerancia.test.js — tolerância de triângulo degenerado e regressão de saída sem texturas. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ErroExportacaoObj, exportarObj } from '../src/index.js';

const pontosCubo = [
  [0, 0, 0], [0.02, 0, 0], [0.02, 0.03, 0], [0, 0.03, 0],
  [0, 0, 0.04], [0.02, 0, 0.04], [0.02, 0.03, 0.04], [0, 0.03, 0.04],
];
const triangulosCubo = [
  [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
  [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5],
];

/* Leque de um canto arredondado: centro na origem e arco de raio 3 mm em 12 passos de 7,5 graus. Cada triângulo do leque
   tem cerca de 0,59 mm², abaixo do limite de 1 mm² que a comparação de área com tolerância ao quadrado impunha. */
function neutroCantoArredondado() {
  const raio = 0.003;
  const passos = 12;
  const V = new Map([[0, [0, 0, 0]]]);
  for (let i = 0; i <= passos; i++) {
    const angulo = (Math.PI / 2) * i / passos;
    V.set(i + 1, [raio * Math.cos(angulo), raio * Math.sin(angulo), 0]);
  }
  const F = new Map();
  for (let i = 0; i < passos; i++) {
    F.set(i, { id: i, vs: [0, i + 1, i + 2], parte: 'canto' });
  }
  return { V, F };
}

describe('tolerância do exportador OBJ', () => {
  it('exporta o canto arredondado com o padrão de 1 mm, sem baixar a tolerância', async () => {
    const out = await exportarObj({ nome: 'canto', neutro: neutroCantoArredondado(), unidade: 'mm' });

    expect(out.diagnostico.tolerancia).toBe(0.001);
    expect(out.diagnostico.totalTriangulos).toBe(12);
  });

  it('continua recusando um triângulo degenerado de verdade, com três pontos colineares', async () => {
    const V = new Map([[0, [0, 0, 0]], [1, [0.001, 0, 0]], [2, [0.002, 0, 0]]]);
    const F = new Map([[0, { id: 0, vs: [0, 1, 2], parte: 'reta' }]]);

    await expect(exportarObj({ nome: 'reta', neutro: { V, F }, unidade: 'm' }))
      .rejects.toMatchObject({ codigo: 'face-degenerada' });
  });

  it('recusa um triângulo degenerado mesmo com tolerância muito pequena', async () => {
    const V = new Map([[0, [0, 0, 0]], [1, [0.5, 0, 0]], [2, [1, 0, 0]]]);
    const F = new Map([[0, { id: 0, vs: [0, 1, 2], parte: 'reta' }]]);

    await expect(exportarObj({ nome: 'reta', neutro: { V, F }, unidade: 'm', tolerancia: 1e-9 }))
      .rejects.toBeInstanceOf(ErroExportacaoObj);
  });

  it('mantém a saída de uma malha com material e sem texturas igual à de antes (hash de regressão)', async () => {
    const V = new Map(pontosCubo.map((p, i) => [i, p]));
    const F = new Map(triangulosCubo.map((t, i) => [i, { id: i, vs: t, parte: 'cubo', material: i < 6 ? 'madeira' : 'metal' }]));

    const out = await exportarObj({ nome: 'cubo', neutro: { V, F }, unidade: 'mm', escala: 1000 });

    expect(createHash('sha256').update(out.texto).digest('hex'))
      .toBe('cce718b4b49946931ba4bbe1c354ef75e7482ff31139cac6fdabbf796f31275d');
    expect(out.mtl).toBeNull();
    expect(out.texto).not.toMatch(/mtllib|usemtl|vt /);
  });
});
