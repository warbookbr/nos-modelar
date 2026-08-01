// enquadramento-bancada.test.ts — prova pura do gate visual da bancada.
import { describe, expect, it } from 'vitest';
// @ts-expect-error — módulo da bancada ainda é JavaScript.
import { enquadramentoUtil, meiaAlturaParaVista } from '../../src/bancada/criar-ambiente.js';

describe('gate de enquadramento da bancada', () => {
  it('aceita uma peça alongada, porém legível, em vista ortogonal', () => {
    expect(enquadramentoUtil({ largura: 0.137, altura: 0.41 })).toBe(true);
  });

  it('aceita a vista superior real do caixote, sem afrouxar o limite de área', () => {
    expect(enquadramentoUtil({ largura: 0.275, altura: 0.367 })).toBe(true);
  });

  it('reprova uma peça minúscula mesmo inteiramente no quadro', () => {
    expect(enquadramentoUtil({ largura: 0.12, altura: 0.22 })).toBe(false);
  });

  it('reprova qualquer silhueta cortada, mesmo grande', () => {
    expect(enquadramentoUtil({ largura: 0.72, altura: 0.64, cortado: true })).toBe(false);
  });

  it('enquadra cada vista pelo envelope projetado, não pelo raio 3D da montagem', () => {
    const meiaAltura = meiaAlturaParaVista({
      larguraProjetada: 1.2,
      alturaProjetada: 0.08,
      aspecto: 16 / 9,
    });
    const larguraNaTela = 1.2 / (2 * meiaAltura * (16 / 9));
    const alturaNaTela = 0.08 / (2 * meiaAltura);
    expect(larguraNaTela).toBeCloseTo(0.48, 6);
    expect(alturaNaTela).toBeGreaterThan(0);
  });

  it('mantém margem vertical e não amplia uma vista por eixo invisível', () => {
    const meiaAltura = meiaAlturaParaVista({
      larguraProjetada: 0.03,
      alturaProjetada: 1.2,
      aspecto: 16 / 9,
    });
    expect(1.2 / (2 * meiaAltura)).toBeCloseTo(0.62, 6);
  });
});
